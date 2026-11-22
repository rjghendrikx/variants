import { inView, noPick } from './layer-common.js';
import { C as CONTENT } from './content.js';
import { createWalker, gammaOf, kappaOf, j0, P } from './walker-model.js';
import { HOLD_S, RAMP_S, STOPS, ME_MIN, ME_MAX, OMEGA_NARROW, OMEGA_WIDE, OMEGA_START } from './walker-presets.js';

const SLOPE_GAIN = 9.0;
const DROP_R = 0.0014;
const BOUNCE_H = 0.0012;
const DETUNE_HZ = 0.6;
const MAX_UPLOAD_HZ = 30;
const NEAR_M = 1.6;
const TITLE = (CONTENT.cards.find(([n]) => n === 'pr_walker')?.[1]?.title) ?? 'A walking droplet';
const SEED = 27;
const GRID_HALF = 5 * P.lambdaF;
const TRAIL_S = 6;
const MON_GAIN = 0.11;
const meOfPos = (q) => { const i = Math.min(1, Math.floor(q)), f = q - i; return STOPS[i].Me + (STOPS[i + 1].Me - STOPS[i].Me) * f; };
const posOfMe = (Me) => (Me <= STOPS[1].Me ? (Me - STOPS[0].Me) / (STOPS[1].Me - STOPS[0].Me) : 1 + (Me - STOPS[1].Me) / (STOPS[2].Me - STOPS[1].Me));

export default function mount(live) {
  const { THREE, byName } = live;
  const node = byName('pr_walker');
  const d = node?.userData;
  if (!d?.walker_bath_center) return null;
  const R = d.walker_bath_r;
  const C = new THREE.Vector3().fromArray(d.walker_bath_center);
  const toPlane = (v) => new THREE.Vector3(v.x - C.x, -(v.z - C.z), v.y - C.y);
  const led = toPlane(new THREE.Vector3().fromArray(d.walker_led_head));

  const G = GRID_HALF;
  const TBL = 4096, RMAX = P.kF * G * 2.9;
  const J0T = new Float32Array(TBL + 1);
  for (let i = 0; i <= TBL; i++) J0T[i] = j0(RMAX * i / TBL);
  const A_UM = P.A * 1e6;

  let N = 0, field = null, trail = null, half = null, tex = null, mat = null, mon = null;
  let px0 = 0, py0 = 0;
  let sim = 0;
  let dirty = true, lastUp = 0, lastT = null, lastLine = 0, strobe = 0, acc = 0;
  function grid(n) {
    if (n === N) return;
    const old = field, oN = N;
    const oldT = trail;
    field = new Float32Array(n * n); trail = new Float32Array(n * n);
    if (old) {
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const oi = Math.min(oN - 1, Math.floor((i + 0.5) * oN / n)), oj = Math.min(oN - 1, Math.floor((j + 0.5) * oN / n));
        field[j * n + i] = old[oj * oN + oi]; trail[j * n + i] = oldT[oj * oN + oi];
      }
    }
    N = n;
    half = new Uint16Array(2 * n * n);
    tex?.dispose();
    tex = new THREE.DataTexture(half, n, n, THREE.RGFormat, THREE.HalfFloatType);
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    for (const m of [mat, mon?.material]) if (m) { m.uniforms.uField.value = tex; m.uniforms.uTexel.value = 1 / n; }
    dirty = true;
  }
  function stamp(x, y, q, scale = 1) {
    const s = 2 * G / N, k = P.kF * TBL / RMAX, a = A_UM * scale;
    for (let j = 0; j < N; j++) {
      const yy = -G + (j + 0.5) * s - y, row = j * N;
      for (let i = 0; i < N; i++) {
        const xx = -G + (i + 0.5) * s - x;
        const t = Math.sqrt(xx * xx + yy * yy) * k, ti = t | 0;
        const jv = ti < TBL ? J0T[ti] + (J0T[ti + 1] - J0T[ti]) * (t - ti) : 0;
        field[row + i] = field[row + i] * q + a * jv;
      }
    }
    dirty = true;
  }
  const qT = Math.exp(-P.TF / TRAIL_S);
  function streak(x0, y0, x1, y1) {
    for (let i = 0; i < trail.length; i++) trail[i] *= qT;
    const s = 2 * G / N, w = 1.5 * s;
    const i0 = Math.max(0, Math.floor((Math.min(x0, x1) - w + G) / s)), i1 = Math.min(N - 1, Math.ceil((Math.max(x0, x1) + w + G) / s));
    const j0 = Math.max(0, Math.floor((Math.min(y0, y1) - w + G) / s)), j1 = Math.min(N - 1, Math.ceil((Math.max(y0, y1) + w + G) / s));
    const dx = x1 - x0, dy = y1 - y0, l2 = Math.max(1e-18, dx * dx + dy * dy);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const qx = -G + (i + 0.5) * s - x0, qy = -G + (j + 0.5) * s - y0;
      const t = Math.min(1, Math.max(0, (qx * dx + qy * dy) / l2)), ex = qx - t * dx, ey = qy - t * dy;
      const v = Math.exp(-(ex * ex + ey * ey) / (w * w)), o = j * N + i;
      if (v > trail[o]) trail[o] = v;
    }
  }

  mat = new THREE.ShaderMaterial({
    uniforms: {
      uField: { value: null }, uTexel: { value: 1 / 128 }, uR: { value: G }, uRim: { value: R }, uLambda: { value: P.lambdaF },
      uGain: { value: SLOPE_GAIN * 1e-6 }, uLed: { value: led }, uCam: { value: new THREE.Vector3() },
      uDrop: { value: new THREE.Vector2() }, uLift: { value: 0 }, uDropR: { value: DROP_R },
    },
    vertexShader:  `
      varying vec2 vUv; varying vec2 vP;
      void main() { vUv = uv; vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader:  `
      uniform sampler2D uField; uniform float uTexel, uR, uRim, uLambda, uGain, uLift, uDropR;
      uniform vec3 uLed, uCam; uniform vec2 uDrop;
      varying vec2 vUv; varying vec2 vP;
      float h(vec2 uv) { return texture2D(uField, uv).r; }
      void main() {
        vec2 fUv = vP / (2.0 * uR) + 0.5;                            // the field's window (+-uR) over the trap's axis
        vec2 du = vec2(uTexel, 0.0);
        float step2 = 2.0 * uTexel * 2.0 * uR;                       // metres across two texels
        vec2 slope = vec2(h(fUv + du.xy) - h(fUv - du.xy), h(fUv + du.yx) - h(fUv - du.yx)) / step2 * uGain;
        slope *= 1.0 - smoothstep(0.6 * uR, 0.95 * uR, length(vP));
        vec2 fw = abs(dFdx(fUv)) + abs(dFdy(fUv));
        float px = (uLambda / (2.0 * uR)) / max(max(fw.x, fw.y), 1e-7);   // px a Faraday wavelength spans here
        slope *= smoothstep(4.0, 8.0, px);
        vec3 n = normalize(vec3(-slope, 1.0));
        vec3 P = vec3(vP, 0.0);
        vec3 L = normalize(uLed - P), V = normalize(uCam - P), H = normalize(L + V);
        vec3 led = vec3(1.0, 0.78, 0.50);
        float rake = max(dot(n, L), 0.0);
        float ndh = max(dot(n, H), 0.0);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
        vec3 col = vec3(0.0008, 0.0008, 0.001) + led * (0.12 * rake * rake * 4.0 + 0.25 * pow(ndh, 24.0) + 1.2 * pow(ndh, 400.0)) + vec3(0.006, 0.0055, 0.006) * fres;
        // the drop: seen where the eye's ray through it meets the bath; its shadow where the LED's does
        vec2 seen = uDrop - (V.xy / max(V.z, 0.05)) * uLift;
        vec2 shadow = uDrop - (L.xy / max(L.z, 0.05)) * uLift;
        float ds = length(vP - shadow) / (uDropR * 1.1);
        col *= mix(0.25, 1.0, smoothstep(0.6, 1.0, ds));
        vec2 q = (vP - seen) / uDropR;
        float r2 = dot(q, q);
        if (r2 < 1.0) {
          vec3 sn = normalize(vec3(q, sqrt(1.0 - r2)));
          float lit = max(dot(sn, L), 0.0), sp = pow(max(dot(sn, normalize(L + V)), 0.0), 60.0);
          col = mix(col, vec3(0.03, 0.028, 0.026) + led * (0.6 * lit + 2.0 * sp), smoothstep(1.0, 0.8, r2));
        }
        gl_FragColor = vec4(pow(col, vec3(1.0 / 2.2)), 1.0);
      }`,
  });
  N = 0; grid(128);
  const quad = noPick(new THREE.Mesh(new THREE.CircleGeometry(R, 96), mat));
  quad.name = 'walker_bath';
  quad.rotation.x = -Math.PI / 2;
  quad.position.copy(C).add(new THREE.Vector3(0, 0.0006, 0));
  node.add(quad);

  if (d.walker_monitor_center) {
    const [mw, mh] = d.walker_monitor_size;
    const MON_ZOOM = 0.55;
    mon = noPick(new THREE.Mesh(new THREE.PlaneGeometry(mw, mh), new THREE.ShaderMaterial({
      uniforms: { uField: { value: tex }, uTexel: { value: 1 / N }, uAspect: { value: mw / mh }, uZoom: { value: MON_ZOOM },
        uGain: { value: MON_GAIN }, uDrop: { value: new THREE.Vector2() }, uG: { value: G } },
      vertexShader:  `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader:  `
        uniform sampler2D uField; uniform float uTexel, uAspect, uZoom, uGain, uG; uniform vec2 uDrop; varying vec2 vUv;
        void main() {
          vec2 f = 0.5 + (vUv - 0.5) * vec2(uAspect, 1.0) * uZoom;
          vec2 s = texture2D(uField, f).rg;
          float inside = step(0.0, f.x) * step(f.x, 1.0);
          // a camera's grey: the field's height (under raking light: its x slope) plus the long exposure in white
          float hx = texture2D(uField, f + vec2(uTexel, 0.0)).r - texture2D(uField, f - vec2(uTexel, 0.0)).r;
          float g = 0.22 + uGain * s.r * 0.35 + uGain * 4.0 * hx;
          float dr = length((f - 0.5) * 2.0 * uG - uDrop) / (0.025 * uG);
          vec3 col = vec3(clamp(g, 0.04, 0.8)) * vec3(0.92, 0.97, 1.0) * inside + vec3(0.95, 0.98, 1.0) * s.g * 1.4;
          col = mix(col, vec3(1.0), smoothstep(1.0, 0.6, dr));
          gl_FragColor = vec4(col * 0.9, 1.0);
        }`,
    })));
    mon.name = 'walker_monitor';
    const mn = new THREE.Vector3().fromArray(d.walker_monitor_normal).normalize();
    mon.position.fromArray(d.walker_monitor_center).addScaledVector(mn, 0.0015);
    mon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mn);
    node.add(mon);
  }

  const model = createWalker({ seed: SEED, gamma: gammaOf(STOPS[0].Me), kappa: kappaOf(OMEGA_START) });
  let manual = false;
  let MeSet = STOPS[0].Me, omega = OMEGA_START;
  const MeAt = (t) => (t < HOLD_S ? STOPS[0].Me : t < HOLD_S + RAMP_S ? STOPS[0].Me + (STOPS[2].Me - STOPS[0].Me) * (t - HOLD_S) / RAMP_S : STOPS[2].Me);
  const setMe = (Me) => { MeSet = Math.min(ME_MAX, Math.max(ME_MIN, Me)); model.setGamma(gammaOf(MeSet)); };
  const setOmega = (o) => { omega = Math.min(OMEGA_NARROW, Math.max(OMEGA_WIDE, o)); model.setKappa(kappaOf(omega)); };

  function restart() {
    sim = 0; manual = false;
    setMe(STOPS[0].Me); setOmega(OMEGA_START);
    model.reset(SEED);
    field.fill(0); trail.fill(0);
    stamp(0, 0, 0, 1 / (1 - Math.exp(-1 / model.Me)));
    [px0, py0] = model.pos;
    syncUi();
  }
  function period() {
    if (!manual) setMe(MeAt(sim));
    model.step();
    sim += P.TF;
    const [x, y] = model.pos;
    stamp(x, y, Math.exp(-1 / model.Me));
    streak(px0, py0, x, y); px0 = x; py0 = y;
  }
  const rHist = new Float64Array(160); let rI = 0, rN = 0;
  function orbit() {
    let m = 0; for (let i = 0; i < rN; i++) m += rHist[i]; m /= Math.max(1, rN);
    let v = 0; for (let i = 0; i < rN; i++) v += (rHist[i] - m) ** 2;
    return { R: m, spread: rN ? Math.sqrt(v / rN) / Math.max(1e-12, m) : 1 };
  }
  const camL = new THREE.Vector3();
  function sync(now) {
    const [x, y] = model.pos;
    mat.uniforms.uDrop.value.set(x, y);
    if (mon) mon.material.uniforms.uDrop.value.set(x, y);
    mat.uniforms.uLift.value = BOUNCE_H * Math.abs(Math.sin(Math.PI * strobe));
    node.worldToLocal(camL.copy(live.camera.position));
    mat.uniforms.uCam.value.copy(toPlane(camL));
    if (dirty && now - lastUp >= 1000 / MAX_UPLOAD_HZ) {
      const toH = THREE.DataUtils.toHalfFloat;
      for (let i = 0, n = field.length; i < n; i++) { half[2 * i] = toH(field[i]); half[2 * i + 1] = toH(trail[i]); }
      tex.needsUpdate = true; dirty = false; lastUp = now;
    }
  }

  const css = document.createElement('style');
  css.textContent = `.walker-ctl{margin:8px 0 0;display:grid;gap:2px}.walker-ctl label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.walker-ctl input{-webkit-appearance:none;appearance:none;width:100%;height:44px;margin:0;background:transparent;touch-action:pan-y;cursor:pointer}
.walker-ctl input::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:color-mix(in srgb,var(--muted) 45%,transparent)}
.walker-ctl input::-moz-range-track{height:4px;border-radius:2px;background:color-mix(in srgb,var(--muted) 45%,transparent)}
.walker-ctl input::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:44px;height:44px;margin-top:-20px;border:0;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 9px,color-mix(in srgb,var(--accent) 18%,transparent) 10px 21px,transparent 22px)}
.walker-ctl input::-moz-range-thumb{width:44px;height:44px;border:0;border-radius:50%;background:radial-gradient(circle,var(--accent) 0 9px,color-mix(in srgb,var(--accent) 18%,transparent) 10px 21px,transparent 22px)}
.walker-ctl input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.walker-ctl .stops{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin:-6px 0 4px}`;
  document.head.append(css);
  let ui = null;
  function buildUi(card) {
    const box = document.createElement('div');
    box.className = 'walker-ctl';
    box.innerHTML = `<label for="walker-me">Memory</label>
<input id="walker-me" type="range" min="0" max="2" step="0.02" aria-valuetext="">
<div class="stops" aria-hidden="true">${STOPS.map((s) => `<span>${s.label}</span>`).join('')}</div>
<label for="walker-mag">Magnet</label>
<input id="walker-mag" type="range" min="0" max="1" step="0.01">
<div class="stops" aria-hidden="true"><span>Close</span><span>Raised</span></div>`;
    const me = box.querySelector('#walker-me'), mag = box.querySelector('#walker-mag');
    me.addEventListener('input', () => { manual = true; setMe(meOfPos(+me.value)); syncUi(); });
    mag.addEventListener('input', () => { setOmega(OMEGA_NARROW + (OMEGA_WIDE - OMEGA_NARROW) * +mag.value); syncUi(); });
    card.querySelector('p.walker-live')?.after(box);
    return { box, me, mag };
  }
  function syncUi() {
    if (!ui?.box.isConnected) return;
    if (document.activeElement !== ui.me) ui.me.value = posOfMe(MeSet).toFixed(2);
    ui.me.setAttribute('aria-valuetext', `memory ${MeSet.toFixed(1)}`);
    if (document.activeElement !== ui.mag) ui.mag.value = ((omega - OMEGA_NARROW) / (OMEGA_WIDE - OMEGA_NARROW)).toFixed(2);
  }
  function liveLine(now) {
    if (now - lastLine < 250) return;
    lastLine = now;
    const card = document.querySelector('.case');
    if (!card || card.querySelector('h2')?.textContent !== TITLE) return;
    let p = card.querySelector('.walker-live');
    if (!p) { p = document.createElement('p'); p.className = 'k walker-live'; card.querySelector('p.b')?.after(p); }
    if (!still && !ui?.box.isConnected) ui = buildUi(card);
    syncUi();
    const o = orbit(), walking = model.Me > P.MeW;
    const what = !walking ? 'bouncing in place' : o.spread < 0.05 ? `circling, radius ${(o.R / P.lambdaF).toFixed(2)} wavelengths` : 'walking';
    p.textContent = `Memory ${model.Me.toFixed(1)} · ${what}`;
  }

  restart();
  let still = !!live.gate;
  if (!live.gate && live.reduceMotion.matches) {
    while (sim < HOLD_S + RAMP_S + 20) period();
    still = true;
  }
  sync(performance.now());
  addEventListener('room:arrive', (e) => { if (e.detail === 'droplet' && !still) restart(); });

  function fieldMax() {
    let b = 0, bi = 0;
    for (let i = 0; i < field.length; i++) if (field[i] > b) { b = field[i]; bi = i; }
    const s = 2 * G / N;
    return [-G + ((bi % N) + 0.5) * s, -G + (Math.floor(bi / N) + 0.5) * s, b];
  }
  const worldOf = (x, y) => node.localToWorld(new THREE.Vector3(C.x + x, C.y, C.z - y));
  let cost = 0, frames = 0;

  return {
    name: 'walker',
    update(dt) {
      const now = performance.now();
      if (!inView(live.camera, quad)) { lastT = null; return false; }
      grid(live.camera.position.distanceTo(node.localToWorld(C.clone())) < NEAR_M ? 256 : 128);
      liveLine(now);
      if (still) { sync(now); return dirty; }
      const step = lastT === null ? 0 : Math.min(0.1, (now - lastT) / 1000);
      lastT = now;
      strobe += step * DETUNE_HZ;
      acc += step;
      while (acc >= P.TF) {
        period(); acc -= P.TF;
        rHist[rI] = Math.hypot(...model.pos); rI = (rI + 1) % rHist.length; rN = Math.min(rN + 1, rHist.length);
      }
      sync(now);
      const c = performance.now() - now;
      cost = frames++ ? cost + (c - cost) / 60 : c;
      return true;
    },
    api: {
      restart() { restart(); sync(performance.now()); live.render(); return this.info(); },
      advance(n = 1) {
        for (let i = 0; i < n; i++) { period(); rHist[rI] = Math.hypot(...model.pos); rI = (rI + 1) % rHist.length; rN = Math.min(rN + 1, rHist.length); }
        dirty = true; lastUp = 0; sync(performance.now()); live.render(); return this.info();
      },
      monitorRect() {
        if (!mon) return null;
        const { w, h } = { w: mon.geometry.parameters.width / 2, h: mon.geometry.parameters.height / 2 };
        const xs = [], ys = [];
        for (const [a, b] of [[-w, -h], [w, -h], [w, h], [-w, h]]) {
          const v = mon.localToWorld(new THREE.Vector3(a, b, 0)).project(live.camera);
          xs.push((v.x + 1) / 2 * innerWidth); ys.push((1 - v.y) / 2 * innerHeight);
        }
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      },
      setMemory(Me) { manual = true; setMe(Me); syncUi(); return this.info(); },
      setMagnet(q) { setOmega(OMEGA_NARROW + (OMEGA_WIDE - OMEGA_NARROW) * q); syncUi(); return this.info(); },
      info: () => {
        const [x, y] = model.pos, [fx, fy, fh] = fieldMax(), o = orbit();
        return { t: sim, impacts: model.impacts, gamma: model.gamma, Me: model.Me, MeW: P.MeW, walking: model.Me > P.MeW,
          pos: [x, y], speed: model.speed, travel: model.travel, omega, orbitR: o.R / P.lambdaF, orbitSpread: o.spread,
          lambdaF: P.lambdaF, R, window: G, grid: N, fieldMax: [fx, fy, fh], cost, manual,
          monitor: !!mon, sameTexture: !!mon && mon.material.uniforms.uField.value === mat.uniforms.uField.value,
          world: { drop: worldOf(x, y).toArray(), fieldMax: worldOf(fx, fy).toArray(), lambdaEnd: worldOf(x + P.lambdaF, y).toArray(),
            monitor: mon ? mon.getWorldPosition(new THREE.Vector3()).toArray() : null },
          inView: inView(live.camera, quad) };
      },
    },
  };
}
