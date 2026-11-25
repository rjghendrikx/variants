import { noPick } from './layer-common.js';
import { C, FACES } from './content.js';

export const BPM = 122;
export const SECTIONS = [['intro', 16], ['build', 16], ['drop', 32], ['breakdown', 16], ['build', 16], ['drop', 32], ['outro', 16]];
export const BARS = SECTIONS.reduce((a, s) => a + s[1], 0);
export const LENGTH = (BARS * 4 * 60) / BPM;
const SEC_START = SECTIONS.reduce((a, s, i) => (a.push(i ? a[i - 1] + SECTIONS[i - 1][1] : 0), a), []);
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]];
const ROOTS = [33, 29, 36, 31];
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

export function barInfo(bar) {
  let s = SECTIONS.length - 1;
  while (s > 0 && bar < SEC_START[s]) s--;
  const [kind, len] = SECTIONS[s], j = bar - SEC_START[s], u = j / len;
  const b = { kind, sec: s, j, len, u, kick: 1, bass: 0, hat: 0.4, pad: 0, riser: 0, roll: 0, vac: 0, clap: 0 };
  if (kind === 'intro') Object.assign(b, { bass: u < 0.5 ? 0 : 0.35, hat: u < 0.25 ? 0.2 : 0.45, pad: 0.15 });
  else if (kind === 'build') {
    Object.assign(b, { bass: 0.6, hat: 0.45 + 0.5 * u, clap: 1, riser: Math.max(0, (u - 0.5) * 2) ** 1.5, pad: 0.2 });
    const k = len - j;
    b.roll = k > 8 ? 0 : k > 4 ? 1 : k > 2 ? 2 : 4;
    if (k === 8) b.vac = -2;
    if (k === 1) b.vac = 1;
  } else if (kind === 'drop') Object.assign(b, { bass: 1, hat: 1, pad: 0.45, clap: 1 });
  else if (kind === 'breakdown') Object.assign(b, { kick: 0, bass: 0.12, hat: 0.12, pad: 1 });
  else Object.assign(b, { bass: 0.5 * (1 - u), hat: 0.5 * (1 - u) + 0.1, kick: u < 0.75 ? 1 : 0, pad: 0.2 * (1 - u) });
  return b;
}
const LOW = new Float32Array(BARS * 4), HAT = new Float32Array(BARS * 4), PAD = new Float32Array(BARS * 4);
for (let bar = 0; bar < BARS; bar++) {
  const b = barInfo(bar);
  for (let q = 0; q < 4; q++) {
    const silent = (b.vac > 0 && q >= 4 - b.vac) || (b.vac < 0 && q < -b.vac);
    LOW[bar * 4 + q] = silent ? 0 : 0.6 * b.kick + 0.4 * b.bass;
    HAT[bar * 4 + q] = silent ? 0 : b.hat;
    PAD[bar * 4 + q] = b.pad;
  }
}
const mean = (arr, b0, b1) => { let s = 0, n = 0; for (let i = Math.max(0, Math.floor(b0)); i <= Math.min(arr.length - 1, Math.floor(b1)); i++) { s += arr[i]; n++; } return n ? s / n : 0; };
export function features(beat, low = 1) {
  const bb = Math.max(0, Math.min(BARS * 4 - 1e-6, beat)), bar = Math.floor(bb / 4), b = barInfo(bar);
  const energy = mean(LOW, bb - 6, bb) * low;
  const fade = (mean(LOW, bb - 32, bb) * low + mean(PAD, bb - 32, bb)) / 1.4;
  return { beat: bb, bar, kind: b.kind, sec: b.sec, u: b.u + (bb / 4 - bar) / b.len, secBeat: (bar - SEC_START[b.sec]) * 4 + (bb % 4),
    secLen: b.len * 4, phase: bb % 1, energy, sparkle: HAT[Math.floor(bb)], fade: Math.min(1, fade), roll: b.roll, vac: b.vac, low };
}

const LOOK = 0.25;
const LEVEL = 0.65;
const LIFT = 0.0012;
const CAP = [0.018, 0.010, 0.011];
const CANVAS = [512, 576];
const DRAW_HZ = 15;
const FILT_OPEN = [12, 22000];
const FILT_ANGLE = 2.36;
export const filterHz = (f) => [f > 0 ? FILT_OPEN[0] * (6000 / FILT_OPEN[0]) ** f : FILT_OPEN[0], f < 0 ? FILT_OPEN[1] * (180 / FILT_OPEN[1]) ** -f : FILT_OPEN[1]];

const STYLE = `.deck-keys { position: fixed; left: 50%; transform: translateX(-50%); bottom: 64px; font: 12px/1.3 inherit; color: var(--muted, #b9ab98);
  background: rgba(20, 17, 15, .6); border-radius: 8px; padding: 6px 10px; pointer-events: none; transition: opacity .3s; }
.deck-keys[hidden] { display: none; } .gate .deck-keys { display: none; }`;

export default function mount(live) {
  const { THREE, scene, byName, params, camera } = live;
  const dk = byName('pr_xdj'), mx = byName('pr_djm450');
  const D = dk?.userData, M = mx?.userData;
  if (!D?.xdj_screen_center || !M?.djm450_xf_center) return null;
  dk.updateMatrixWorld(true); mx.updateMatrixWorld(true);
  const { title, artist, tag, empty, browse } = C.deck;
  const V = (a) => new THREE.Vector3(...a);
  const wDk = (v) => V(v).applyMatrix4(dk.matrixWorld), wMx = (v) => V(v).applyMatrix4(mx.matrixWorld);
  const axisOf = (node, a) => V(a).transformDirection(node.matrixWorld);
  const ex = axisOf(dk, [1, 0, 0]), ez = axisOf(dk, [0, 0, 1]), ey = axisOf(dk, [0, 1, 0]);
  const mxX = axisOf(mx, [1, 0, 0]), mxZ = axisOf(mx, [0, 0, 1]);

  const pos = [], uv = [], kind = [];
  const quad = (c, ax, ay, k, u0 = 0, v0 = 0, u1 = 1, v1 = 1) => {
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) {
      pos.push(...c.clone().addScaledVector(ax, sx).addScaledVector(ay, sy).toArray());
      uv.push(sx < 0 ? u0 : u1, sy < 0 ? v0 : v1); kind.push(k);
    }
  };
  const [sw, sh] = D.xdj_screen_size, sc = D.xdj_screen_center;
  D.xdj_deck_x.forEach((dx, i) => {
    const c = wDk([sc[0] + dx, sc[1] + LIFT, sc[2]]);
    quad(c, ex.clone().multiplyScalar(sw / 2), ez.clone().multiplyScalar(-sh / 2), i, 0, i ? 0 : 0.5, 1, i ? 0.5 : 1);
  });
  const box = (c, a, b, k) => {
    const h = ey.clone().multiplyScalar(CAP[2] / 2), cc = c.clone().add(h);
    quad(cc.clone().add(h), a, b, k);
    quad(cc.clone().add(b), a, h, k, 0, 0, 0, 0); quad(cc.clone().sub(b), a, h, k, 0, 0, 0, 0);
    quad(cc.clone().add(a), b, h, k, 0, 0, 0, 0); quad(cc.clone().sub(a), b, h, k, 0, 0, 0, 0);
  };
  const top = M.djm450_top_z;
  const chC = M.djm450_ch_centers.map((p) => wMx(p)), xfC = wMx(M.djm450_xf_center), lowC = M.djm450_low_knobs.map((p) => wMx(p));
  chC.forEach((c, i) => box(c, mxX.clone().multiplyScalar(CAP[0] / 2), mxZ.clone().multiplyScalar(CAP[1] / 2), 2 + i));
  box(xfC, mxX.clone().multiplyScalar(CAP[1] / 2), mxZ.clone().multiplyScalar(CAP[0] / 2), 4);
  const kr = M.djm450_knob_r;
  lowC.forEach((c, i) => quad(c.clone().addScaledVector(ey, 0.0152), mxX.clone().multiplyScalar(kr * 1.3), mxZ.clone().multiplyScalar(kr * 1.3), 5 + i));
  const fr = M.djm450_filter_r ?? kr, filtC = (M.djm450_filter_knobs ?? []).map((p) => wMx(p));
  filtC.forEach((c, i) => quad(c.clone().addScaledVector(ey, 0.0141), mxX.clone().multiplyScalar(fr * 0.72), mxZ.clone().multiplyScalar(fr * 0.72), 7 + i));
  const jc = D.xdj_jog_center, JD = 0.0228;
  const jogC = D.xdj_deck_x.map((dx) => wDk([jc[0] + dx, jc[1] + 0.0009, jc[2]]));
  jogC.forEach((c, i) => quad(c, ex.clone().multiplyScalar(JD), ez.clone().multiplyScalar(JD), 9 + i));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));

  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = CANVAS;
  const g2 = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  const U = { uTex: { value: tex }, uOff: { value: [0, 0, 0, 0, 0, 0, 0] }, uCh: { value: new THREE.Vector3() }, uXf: { value: new THREE.Vector3() },
    uChAxis: { value: mxZ.clone().multiplyScalar(-1) }, uXfAxis: { value: mxX.clone() }, uKr: { value: kr }, uLow: { value: new THREE.Vector2() },
    uKnobX: { value: mxX.clone() }, uKnobZ: { value: mxZ.clone() }, uLit: { value: 0.75 }, uFilt: { value: new THREE.Vector2() }, uJog: { value: new THREE.Vector2() } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, side: THREE.DoubleSide, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    vertexShader: `attribute float aKind; uniform float uOff[7]; uniform vec3 uChAxis, uXfAxis; varying vec2 vUv; varying float vK;
      void main() { vUv = uv; vK = aKind; vec3 p = position; int k = int(aKind + 0.5);
        if (k == 2 || k == 3) p += uChAxis * uOff[k]; if (k == 4) p += uXfAxis * uOff[4];
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `uniform sampler2D uTex; uniform vec2 uLow, uFilt, uJog; uniform float uLit; varying vec2 vUv; varying float vK;
      // a pale line from r0 to r1 (uv: 0.5 = the rim) at angle a, clockwise from the back (-v), 0 elsewhere
      float hand(float a, float r0, float r1, float w) { vec2 p = vUv - 0.5, d = vec2(sin(a), -cos(a)); float t = dot(p, d);
        return step(r0, t) * step(t, r1) * (1.0 - smoothstep(w * 0.6, w, abs(p.x * d.y - p.y * d.x))); }
      void main() { int k = int(vK + 0.5);
        if (k <= 1) { gl_FragColor = vec4(texture2D(uTex, vUv).rgb * uLit, 1.0); return; }
        // v34 step 3: a long-throw cap, satin black with a pale line across its middle (the crossfader's runs along its travel's normal)
        if (k <= 4) { float e = step(0.84, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0), l = 1.0 - smoothstep(0.05, 0.08, abs((k == 4 ? vUv.x : vUv.y) - 0.5));
          gl_FragColor = vec4(mix(mix(vec3(0.11, 0.11, 0.115), vec3(0.04), e), vec3(0.58, 0.57, 0.55), l) * uLit, 1.0); return; }
        if (k == 7 || k == 8) { float a = hand(k == 7 ? uFilt.x : uFilt.y, 0.08, 0.47, 0.05); gl_FragColor = vec4(vec3(0.82, 0.81, 0.78) * uLit, a); return; }
        if (k >= 9) { float a = hand(k == 9 ? uJog.x : uJog.y, 0.27, 0.41, 0.05); gl_FragColor = vec4(vec3(1.0, 0.62, 0.3) * 0.55 * uLit, a); return; }
        // a low knob's mark: an amber ring at the knob's rim while it cuts
        float r = length(vUv - 0.5) * 2.0, on = k == 5 ? uLow.x : uLow.y;
        float ring = smoothstep(0.62, 0.7, r) * (1.0 - smoothstep(0.86, 0.94, r));
        gl_FragColor = vec4(vec3(1.0, 0.58, 0.2) * uLit, ring * on); }`,
  });
  const mesh = noPick(new THREE.Mesh(geo, mat));
  mesh.name = 'deck_overlay';
  mesh.frustumCulled = false;
  scene.add(mesh);

  const reduce = () => live.reduceMotion.matches;
  const S = { playing: false, t: 0, xf: 0.5, ch: [1, 1], low: [false, false], lowK: 1, filt: [0, 0], jog: [0, 0] };
  const JOG_REV = 1.8;
  let ctx = null, bus = null, anchor = 0, nextStep = 0, noise = null, drawT = 0, cost = 0, frames = 0;
  live.show = { get playing() { return S.playing; }, get beat() { return (S.t * BPM) / 60; }, get xf() { return S.xf; },
    get ch() { return S.ch; }, get low() { return S.lowK; }, stop: () => play(false) };

  function soundOn() { return !live.gate && !!window.__room?.layers?.audio?.info?.().on; }
  let own = false;
  function audioUp() {
    if (ctx) return ctx;
    const shared = window.__room?.layers?.audio?.trackInput?.();
    let dest;
    if (shared) { ctx = shared.ctx; dest = shared.input; }
    else {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: 'playback' }); dest = ctx.destination; own = true;
    }
    const out = ctx.createGain(), shelf = ctx.createBiquadFilter(), ch = ctx.createGain(), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter();
    shelf.type = 'lowshelf'; shelf.frequency.value = 220; shelf.gain.value = 0;
    hp.type = 'highpass'; hp.frequency.value = FILT_OPEN[0]; hp.Q.value = 0.9;
    lp.type = 'lowpass'; lp.frequency.value = FILT_OPEN[1]; lp.Q.value = 0.9;
    out.gain.value = 0;
    ch.connect(shelf).connect(hp).connect(lp).connect(out).connect(dest);
    bus = { out, shelf, ch, hp, lp };
    const n = ctx.sampleRate, buf = ctx.createBuffer(1, n, n), d = buf.getChannelData(0);
    let s = 22222; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
    noise = buf;
    return ctx;
  }
  function voice(step, at) {
    const bar = Math.floor(step / 16), q = step % 16, b = barInfo(bar), beat = Math.floor(q / 4), sp = 60 / BPM / 4;
    const silent = (b.vac > 0 && beat >= 4 - b.vac) || (b.vac < 0 && beat < -b.vac);
    const env = (node, a, peak, d) => { node.gain.setValueAtTime(0, at); node.gain.linearRampToValueAtTime(peak, at + a); node.gain.exponentialRampToValueAtTime(0.0008, at + a + d); };
    const osc = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
    const g = () => ctx.createGain();
    const filt = (type, f, Q = 0.7) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = Q; return x; };
    const hit = (src, node, end) => { src.connect(node); node.connect(bus.ch); src.start(at); src.stop(end); };
    const noiseHit = (f, Q, type, peak, d) => {
      const s = ctx.createBufferSource(), fl = filt(type, f, Q), a = g();
      s.buffer = noise; env(a, 0.001, peak, d);
      s.connect(fl).connect(a).connect(bus.ch); s.start(at, (step % 97) / 97 * 0.8); s.stop(at + d + 0.05);
    };
    if (silent) return;
    if (b.kick && q % 4 === 0) {
      const o = osc('sine', 120), a = g();
      o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(46, at + 0.12);
      env(a, 0.002, 0.95, 0.32); hit(o, a, at + 0.4);
    }
    if (b.hat > 0.7 || (b.hat > 0.3 && q % 2 === 0) || (b.hat > 0 && q % 4 === 2)) noiseHit(8000, 0.8, 'highpass', (q % 4 === 2 ? 0.22 : 0.09) * b.hat, q % 4 === 2 ? 0.12 : 0.035);
    const rollOn = b.roll && (q % (4 / b.roll) === 0);
    if ((b.clap && (q === 4 || q === 12) && !b.roll) || rollOn) noiseHit(1500, 1.2, 'bandpass', b.roll ? 0.18 + 0.1 * b.roll : 0.3, 0.12);
    if (b.bass && [2, 6, 10, 14, 11].includes(q)) {
      const o = osc('sawtooth', midi(ROOTS[bar % 4] + (q === 11 ? 12 : 0))), f = filt('lowpass', 260 + 340 * b.bass, 3), a = g();
      o.connect(f); env(a, 0.004, 0.32 * b.bass, sp * 1.6); f.connect(a); a.connect(bus.ch); o.start(at); o.stop(at + sp * 2);
    }
    if (b.pad && q === 0) {
      const a = g(), f = filt('lowpass', 500 + 1400 * b.pad, 0.8), end = at + sp * 16;
      a.gain.setValueAtTime(0, at); a.gain.linearRampToValueAtTime(0.05 * b.pad, at + sp * 4); a.gain.linearRampToValueAtTime(0, end);
      f.connect(a); a.connect(bus.ch);
      for (const n of CHORDS[bar % 4]) for (const det of [-6, 6]) { const o = osc('sawtooth', midi(n)); o.detune.value = det; o.connect(f); o.start(at); o.stop(end + 0.05); }
    }
    if (b.riser && q === 0) {
      const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
      const f = filt('bandpass', 400, 2), a = g(), end = at + sp * 16;
      f.frequency.setValueAtTime(300 + 4000 * b.riser, at); f.frequency.exponentialRampToValueAtTime(600 + 6000 * b.riser, end);
      a.gain.setValueAtTime(0.02 + 0.08 * b.riser, at); a.gain.linearRampToValueAtTime(0.03 + 0.12 * b.riser, end);
      s.connect(f).connect(a).connect(bus.ch); s.start(at); s.stop(end);
    }
  }
  function mixAudio() {
    if (!bus) return;
    const t = ctx.currentTime;
    const xf = S.xf <= 0.5 ? 1 : Math.cos((S.xf - 0.5) * Math.PI);
    bus.ch.gain.setTargetAtTime(S.ch[0] ** 2 * xf, t, 0.03);
    bus.shelf.gain.setTargetAtTime(S.lowK < 0.5 ? -30 : 0, t, 0.03);
    const [fhp, flp] = filterHz(S.filt[0]);
    bus.hp.frequency.setTargetAtTime(fhp, t, 0.02);
    bus.lp.frequency.setTargetAtTime(flp, t, 0.02);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const sp = 60 / BPM / 4, until = S.t + LOOK;
    while (nextStep * sp < until && nextStep < BARS * 16) { const at = anchor + nextStep * sp; if (at >= ctx.currentTime) voice(nextStep, at); nextStep++; }
  }
  function syncAudio() {
    const want = S.playing && soundOn();
    if (want) {
      if (!audioUp()) return;
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      if (!bus.live) { bus.live = true; anchor = ctx.currentTime + 0.05 - S.t; nextStep = Math.ceil((S.t * BPM * 4) / 60); bus.out.gain.setTargetAtTime(LEVEL, ctx.currentTime, 0.05); mixAudio(); }
    } else if (ctx && bus?.live) {
      bus.live = false;
      bus.out.gain.setTargetAtTime(0, ctx.currentTime, 0.04);
      if (own) setTimeout(() => { if (!bus.live && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 300);
    }
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function draw() {
    const [w] = CANVAS, h = CANVAS[1] / 2, ink = '#ecd6ba', mute = '#968068', amber = '#e69646';
    g2.fillStyle = '#100b08'; g2.fillRect(0, 0, w, CANVAS[1]);
    g2.textBaseline = 'top';
    const F = (px, bold = false) => `${bold ? '700 ' : ''}${px}px ${FACES.narrow}`;
    g2.font = F(38, true); g2.fillStyle = ink; g2.fillText(title, 16, 12, w - 140);
    g2.font = F(24); g2.fillStyle = mute; g2.fillText(artist, 16, 54, w - 250);
    g2.font = F(38, true); g2.fillStyle = ink; g2.fillText(BPM.toFixed(1), w - 110, 12);
    g2.font = F(24); g2.fillStyle = mute; g2.fillText('BPM', w - 110, 54);
    g2.fillText(`-${fmt(LENGTH - S.t)}`, w - 110, 84);
    g2.fillStyle = '#e3a35b'; g2.fillText(tag, w - 230, 54); g2.fillStyle = mute;
    const f = features((S.t * BPM) / 60, S.lowK);
    g2.fillStyle = S.playing ? '#9fd27a' : amber;
    g2.fillText(S.playing ? `PLAY  ${f.bar + 1}.${Math.floor(f.beat % 4) + 1}  ${f.kind.toUpperCase()}` : 'CUE', 16, 84);
    const y0 = 124, y1 = 222, mid = (y0 + y1) / 2, beats = 8, B = (S.t * BPM) / 60;
    for (let x = 0; x < w; x += 2) {
      const bt = B + ((x - w / 2) / w) * 2 * beats;
      if (bt < 0 || bt >= BARS * 4) continue;
      const i = Math.floor(bt), ph = bt - i, kick = LOW[i] > 0.3 ? Math.exp(-ph * 6) : 0;
      const lo = (0.5 * kick + 0.25 * LOW[i]) * (S.lowK), hi = HAT[i] * (0.4 + 0.6 * Math.abs(Math.sin(ph * Math.PI * 4))) * 0.35;
      g2.fillStyle = '#b8642a'; g2.fillRect(x, mid - lo * 48, 2, lo * 96);
      g2.fillStyle = '#f0c8a0'; g2.fillRect(x, mid - (PAD[i] * 0.3) * 48, 2, PAD[i] * 0.3 * 96);
      g2.fillStyle = '#fff4e6'; g2.fillRect(x, mid - hi * 48, 2, hi * 96);
    }
    g2.fillStyle = amber; g2.fillRect(w / 2 - 1, y0 - 4, 3, y1 - y0 + 8);
    const o0 = 238, o1 = 278;
    for (let x = 16; x < w - 16; x++) {
      const i = Math.floor(((x - 16) / (w - 32)) * BARS * 4), e = LOW[i] * 0.7 + PAD[i] * 0.2 + HAT[i] * 0.1;
      g2.fillStyle = i < B ? '#5a3a24' : '#c87837'; g2.fillRect(x, (o0 + o1) / 2 - e * 18, 1, e * 36 + 1);
    }
    g2.fillStyle = ink; g2.fillRect(16 + (B / (BARS * 4)) * (w - 32), o0 - 2, 2, o1 - o0 + 4);
    g2.font = F(38, true); g2.fillStyle = mute; g2.fillText(empty, 16, h + 12);
    g2.font = F(24); g2.fillStyle = '#6e5c4a'; g2.fillText(browse, 16, h + 54);
    tex.needsUpdate = true;
  }
  function controls() {
    U.uOff.value[2] = (S.ch[0] - 0.5) * M.djm450_ch_len;
    U.uOff.value[3] = (S.ch[1] - 0.5) * M.djm450_ch_len;
    U.uOff.value[4] = (S.xf - 0.5) * M.djm450_xf_len;
    U.uLow.value.set(S.low[0] ? 1 : 0, S.low[1] ? 1 : 0);
    U.uFilt.value.set(S.filt[0] * FILT_ANGLE, S.filt[1] * FILT_ANGLE);
    U.uJog.value.set(S.jog[0] + (S.t / JOG_REV) * 2 * Math.PI, S.jog[1]);
  }
  draw(); controls();

  function play(v = !S.playing) {
    S.playing = !!v;
    if (S.playing && S.t >= LENGTH - 0.05) S.t = 0;
    status(S.playing ? `Deck 1 playing a synthesised house loop at ${BPM} BPM; the facades opposite play with it` : `Stopped ${title} at ${fmt(S.t)}`);
    syncAudio(); draw(); live.render();
    dispatchEvent(new CustomEvent('room:deck', { detail: { playing: S.playing } }));
    return S.playing;
  }
  function set(k, v) {
    if (k === 'xf') S.xf = Math.min(1, Math.max(0, v));
    else if (k === 'ch1' || k === 'ch2') S.ch[k === 'ch1' ? 0 : 1] = Math.min(1, Math.max(0, v));
    else if (k === 'low') { S.low = [!!v, !!v]; }
    else if (k === 'f1' || k === 'f2') S.filt[k === 'f1' ? 0 : 1] = Math.min(1, Math.max(-1, Math.abs(v) < 0.04 ? 0 : v));
    S.lowK = S.low[0] || S.low[1] ? 0 : 1;
    controls(); mixAudio(); live.render();
  }
  const live_ = document.querySelector('[role="status"]');
  const status = (s) => { if (live_ && !live.gate) live_.textContent = s; };

  let lastHit = null;
  live.picks.push({ object: dk, accept: (p) => dk.worldToLocal(p.clone()).y > D.xdj_top - 0.02, onPick: () => play() });
  live.picks.push({ object: mx, accept: (p) => { lastHit = mx.worldToLocal(p.clone()); return !!control(lastHit); }, onPick: () => { const c = control(lastHit); if (c) c(); } });
  function control(l) {
    if (!l || l.y < top - 0.006) return null;
    const near = (c, ax, len) => Math.abs(l.x - c[0]) < (ax === 'x' ? len / 2 + 0.01 : 0.014) && Math.abs(l.z - c[2]) < (ax === 'z' ? len / 2 + 0.01 : 0.014);
    const xf = M.djm450_xf_center, L = M.djm450_xf_len;
    if (near(xf, 'x', L)) return () => set('xf', (l.x - xf[0]) / L + 0.5);
    for (let i = 0; i < 2; i++) {
      const c = M.djm450_ch_centers[i];
      if (near(c, 'z', M.djm450_ch_len)) return () => set(`ch${i + 1}`, 0.5 - (l.z - c[2]) / M.djm450_ch_len);
      const k = M.djm450_low_knobs[i];
      if (Math.hypot(l.x - k[0], l.z - k[2]) < M.djm450_knob_r * 1.6) return () => set('low', !S.low[i]);
    }
    return null;
  }
  if (!live.gate) {
    const style = document.createElement('style'); style.textContent = STYLE; document.head.appendChild(style);
    addEventListener('keydown', (ev) => {
      if (live.view() !== 'decks' || ev.defaultPrevented || ev.target?.closest?.('input, textarea, [contenteditable]')) return;
      if (ev.code === 'Space') { ev.preventDefault(); play(); } else if (ev.code === 'BracketLeft') set('xf', S.xf - 0.1);
      else if (ev.code === 'BracketRight') set('xf', S.xf + 0.1); else if (ev.code === 'KeyL') set('low', !(S.low[0] || S.low[1]));
    });
  }
  const JOG_S = 0.12;
  const targets = () => [
    ...filtC.map((c, i) => ({ kind: 'f', i, c, r: fr * 1.35 })),
    ...jogC.map((c, i) => ({ kind: 'jog', i, c, r: D.xdj_jog_r })),
  ];
  function grabAt(cx, cy) {
    if (live.view() !== 'decks' || live.moving?.()) return null;
    const r = live.renderer.domElement.getBoundingClientRect();
    const px = (p) => { const q = p.clone().project(camera); return [r.left + ((q.x + 1) / 2) * r.width, r.top + ((1 - q.y) / 2) * r.height]; };
    for (const t of targets()) {
      const [x, y] = px(t.c), [x1, y1] = px(t.c.clone().addScaledVector(ex, t.r));
      if (Math.hypot(cx - x, cy - y) < Math.hypot(x1 - x, y1 - y)) return { ...t, x, y };
    }
    return null;
  }
  function turn(g, d) {
    if (g.kind === 'f') { set(`f${g.i + 1}`, S.filt[g.i] + d); return; }
    S.jog[g.i] += d;
    if (g.i === 0 && S.playing) {
      S.t = Math.min(LENGTH - 0.1, Math.max(0, S.t + d * JOG_S));
      if (ctx && bus?.live) anchor = ctx.currentTime - S.t;
    }
    controls(); live.render();
  }
  if (!live.gate) {
    const canvas_ = live.renderer.domElement;
    let held = null;
    addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'mouse' || ev.button !== 0 || ev.target !== canvas_) return;
      const g = grabAt(ev.clientX, ev.clientY);
      if (!g) return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      held = { ...g, id: ev.pointerId, lastY: ev.clientY, lastA: Math.atan2(ev.clientX - g.x, g.y - ev.clientY) };
      canvas_.style.cursor = g.kind === 'f' ? 'ns-resize' : 'grabbing';
    }, true);
    addEventListener('pointermove', (ev) => {
      if (!held || ev.pointerId !== held.id) return;
      ev.stopImmediatePropagation();
      if (held.kind === 'f') { turn(held, (held.lastY - ev.clientY) / 160); held.lastY = ev.clientY; return; }
      const a = Math.atan2(ev.clientX - held.x, held.y - ev.clientY);
      let d = a - held.lastA;
      d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      held.lastA = a;
      turn(held, d);
    }, true);
    const drop = (ev) => { if (!held || ev.pointerId !== held.id) return; ev.stopImmediatePropagation(); held = null; canvas_.style.cursor = ''; };
    addEventListener('pointerup', drop, true);
    addEventListener('pointercancel', drop, true);
    addEventListener('wheel', (ev) => {
      if (ev.target !== canvas_) return;
      const g = grabAt(ev.clientX, ev.clientY);
      if (!g) return;
      ev.stopImmediatePropagation(); ev.preventDefault();
      turn(g, g.kind === 'f' ? -Math.sign(ev.deltaY) * 0.08 : -Math.sign(ev.deltaY) * 0.25);
    }, { capture: true, passive: false });
  }
  if (params.has('deck') && !live.gate) play(true);
  live.deckStep = (h) => { if (S.playing) timed(h); };

  function step(dt) {
    syncAudio();
    if (!S.playing) return false;
    if (ctx && bus?.live && ctx.state === 'running') S.t = ctx.currentTime - anchor;
    else S.t += dt;
    if (S.t >= LENGTH) { S.t = LENGTH; play(false); S.t = 0; draw(); return true; }
    schedule();
    U.uJog.value.x = S.jog[0] + (S.t / JOG_REV) * 2 * Math.PI;
    drawT += dt;
    if (drawT >= 1 / DRAW_HZ && (!reduce() || drawT >= 1)) { drawT = 0; draw(); }
    return true;
  }
  function timed(dt) { const t0 = performance.now(), r = step(dt); cost += performance.now() - t0; frames++; return r; }

  let backWas = null;
  function backPill(view = live.view()) {
    const el = document.querySelector('.back');
    if (!el || live.gate) return;
    backWas ??= el.innerHTML;
    el.innerHTML = view === 'decks' && S.playing ? 'Back to the room · the track keeps playing<span class="esc"> · Esc</span>' : backWas;
  }
  addEventListener('room:deck', () => backPill());

  return {
    name: 'deck',
    onView: (id) => backPill(id),
    update(dt) { return live.gate ? false : timed(dt); },
    api: {
      play: (v) => play(v ?? true), stop: () => play(false), toggle: () => play(), set,
      seek(beat) { S.t = Math.max(0, (beat * 60) / BPM); nextStep = Math.ceil((S.t * BPM * 4) / 60); if (ctx) anchor = ctx.currentTime + 0.05 - S.t; draw(); live.render(); return S.t; },
      advance(sec, h = 1 / 60) { let s = Math.round(sec / h); while (s-- > 0) timed(h); live.render(); return +S.t.toFixed(3); },
      features: (beat) => features(beat ?? (S.t * BPM) / 60, S.lowK),
      screen(what) {
        const p = what.startsWith('deck') ? wDk([D.xdj_deck_x[+what[4]], D.xdj_top, D.xdj_jog_center[2]])
          : what === 'xf' ? xfC.clone().addScaledVector(mxX, (S.xf - 0.5) * M.djm450_xf_len) : what.startsWith('ch') ? chC[+what[2] - 1].clone() : lowC[+what[3] - 1].clone();
        const q = p.project(camera), r = live.renderer.domElement.getBoundingClientRect();
        return q.z > 1 ? null : [r.left + ((q.x + 1) / 2) * r.width, r.top + ((1 - q.y) / 2) * r.height];
      },
      grabAt: (x, y) => { const g = grabAt(x, y); return g && { kind: g.kind, i: g.i, x: g.x, y: g.y }; },
      cost() { const r = { ms: frames ? +(cost / frames).toFixed(4) : 0, frames }; cost = 0; frames = 0; return r; },
      info: () => ({ playing: S.playing, t: +S.t.toFixed(2), beat: +((S.t * BPM) / 60).toFixed(2), bpm: BPM, length: +LENGTH.toFixed(1), title, artist,
        xf: S.xf, ch: [...S.ch], low: S.lowK < 0.5, filter: [...S.filt], filterHz: bus ? [bus.hp.frequency.value, bus.lp.frequency.value] : null, audio: ctx?.state ?? 'none', sounding: !!bus?.live && ctx?.state === 'running' }),
    },
  };
}
