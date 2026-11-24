import { noPick, seedFrom } from './layer-common.js';
import { BARS, BPM, SECTIONS, features } from './layer-deck.js';
import { makeFacade, resolve } from './facade-life.js';

const FACADE = await fetch(new URL('./facade.json', import.meta.url)).then((r) => r.json())
  .catch((e) => { console.warn('stage: facade.json unreadable, the built-in defaults play', e); return null; });

const T_IN = 3.0, T_OUT = 2.5;
const T_STILL = 6.0;
const NEAR = 1.3, FAR = 1.6;
const SIDE = 2.6;
const OUTWARD = 0.3;
const PROUD = 0.12;
const RIM = [0.45, 0.4], EDGE = 0.06;
const SKIRT = { side: 0.35, end: 0.8, down: 1.0, up: 0.8 };
const WALL = [0.031, 0.024, 0.024], PANE = [0.026, 0.025, 0.028];
const TAU_UP = 0.1, TAU_DOWN = 0.45;
const BLOCK = [6, 4];
const H_PHRASE = 32;
const GOVERN = { gain: 1.5, thresh: 0.1, area: 0.25, flashes: 3, keep: 0.2, back: 3 };
const VIEWS = new Set(['window', 'canal', 'university']);
const DARK = [0.008, 0.010, 0.015];
const RAMPS = {
  tube: [[0, [0.06, 0.05, 0.035]], [0.45, [0.62, 0.52, 0.40]], [0.8, [0.92, 0.80, 0.64]], [1, [1.0, 0.91, 0.78]]],
  home: [[0, [0.05, 0.033, 0.017]], [0.45, [0.6, 0.41, 0.22]], [0.8, [0.9, 0.62, 0.34]], [1, [1.0, 0.70, 0.40]]],
};
const OFFICE_RAMP = { intro: 'office', build: 'office', drop: 'office', breakdown: 'office', outro: 'office' };
const HOUSE_RAMP = { intro: 'home', build: 'home', drop: 'home', breakdown: 'home', outro: 'home' };
const HOUSE_STATES = [[0.80, 0.4], [0.42, 0.25], [0.04, 0.2], [0.22, 0.15]];

const fract = (x) => x - Math.floor(x);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ad = (ph, a, d, curve) => clamp(ph < a ? ph / a : 1 - (ph - a) / d) ** curve;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (i, s) => fract(Math.sin(i * 12.9898 + s * 78.233) * 43758.5453);

const VS = `attribute float aLevel; attribute vec4 aTone; attribute vec4 aRect; attribute vec4 aQuad; attribute vec2 aInfo; attribute float aCover;
  uniform vec3 uDark; uniform vec3 uPane; uniform float uK; uniform float uProud; uniform vec4 uO[4]; uniform vec4 uH[4];
  varying vec3 vC; varying float vA; varying vec2 vP; varying vec2 vR; varying vec4 vQ; varying float vCov;
  vec3 ramp(vec4 s[4], float a) { vec3 c = s[0].yzw; for (int i = 1; i < 4; i++) c = mix(c, s[i].yzw, smoothstep(s[i - 1].x, s[i].x, a)); return c; }
  void main() {
    bool office = aInfo.x < 0.5;
    vec3 c = office ? ramp(uO, aLevel) : ramp(uH, aLevel);
    c = mix(c, c * aTone.rgb, 0.35);   // a little of each window's own tone (the bake's bulb or tube)
    vC = mix(office ? uPane : uDark, c, clamp(aLevel * 2.5, 0.0, 1.0)); vA = uK * max(aTone.a, clamp(aLevel * 6.0, 0.0, 1.0));
    vR = mix(aRect.zw, aRect.xy, smoothstep(0.04, 0.25, aLevel)); vQ = aQuad; vCov = uK * aCover;
    vP = vec2(mix(aQuad.x, aQuad.y, position.x + 0.5), mix(aQuad.z, aQuad.w, position.y + 0.5));
    // on the baked pane's plane, then PROUD toward the eye along the view ray: in front for the depth test, and no
    // parallax against the bake (offset along the normal, a cover slid ~0.25 m off its pane at the University's angles)
    vec4 wp = modelMatrix * instanceMatrix * vec4(vP, 0.0, 1.0);
    vec3 nw = normalize(mat3(modelMatrix * instanceMatrix) * vec3(0.0, 0.0, 1.0)), e = cameraPosition - wp.xyz;
    wp.xyz += e * (uProud / max(dot(e, nw), 1e-3));
    gl_Position = projectionMatrix * viewMatrix * wp; }`;
const FS = `uniform vec3 uWall; varying vec3 vC; varying float vA; varying vec2 vP; varying vec2 vR; varying vec4 vQ; varying float vCov;
  void main() {
    vec2 d = abs(vP) - vR;
    if (max(d.x, d.y) <= 0.0) { gl_FragColor = vec4(vC, vA); return; }
    if (vCov <= 0.0) discard;
    float ex = (vP.x > 0.0 ? vQ.y : -vQ.x) - vR.x, ey = (vP.y > 0.0 ? vQ.w : -vQ.z) - vR.y;
    float t = max(max(d.x, 0.0) / ex, max(d.y, 0.0) / ey);
    gl_FragColor = vec4(uWall, vCov * (1.0 - smoothstep(0.45, 1.0, t))); }`;
const TUBE = [1.0, 0.90, 0.78];
const WARM = [[1.0, 0.55, 0.22], [1.0, 0.62, 0.32], [1.0, 0.70, 0.42], [1.0, 0.77, 0.55]];

const STYLE = `.stage-toggle { font: inherit; font-size: 12px; line-height: 1; color: var(--muted, #b9ab98); background: rgba(20, 17, 15, .55); cursor: pointer;
  border: 1px solid rgba(239, 230, 218, .16); border-radius: 999px; padding: 6px 10px; transition: color .2s, border-color .2s; }
.stage-toggle:hover { color: var(--ink, #efe6da); }
.stage-toggle[aria-pressed="true"] { color: var(--ink, #efe6da); border-color: #c9dcf0; }
.stage-toggle:focus-visible { outline: 2px solid var(--accent, #e3a35b); outline-offset: 2px; }
.stage-toggle[hidden] { display: none; }
.gate .stage-toggle { display: none; }`;
const SEEN_KEY = 'room.stage';

export default function mount(live) {
  const { THREE, scene, camera, byName, params } = live;
  const far = byName('cz_canal_far'), night = byName('cz_canal_night');
  const raw = far?.userData?.show_windows, rp = night?.userData?.rain_panes;
  if (!raw?.length || !rp?.length) return null;

  night.updateMatrixWorld(true); far.updateMatrixWorld(true);
  const winC = new THREE.Vector3();
  for (let k = 0; k + 4 < rp.length; k += 5) winC.add(new THREE.Vector3(rp[k], rp[k + 1], rp[k + 2]).applyMatrix4(night.matrixWorld));
  winC.divideScalar(Math.floor(rp.length / 5));
  const paneZ = winC.z;
  const outward = new THREE.Vector3(0, 0, -1);

  const N = Math.floor(raw.length / 9);
  const mesh = noPick(new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), null, N));
  const panels = [];
  const m = new THREE.Matrix4(), c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const tone = new Float32Array(N * 4), rect = new Float32Array(N * 4), quad = new Float32Array(N * 4), cover = new Float32Array(N), infoA = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const [x, y, z, nx, nz, w, h, kind, tn] = raw.slice(9 * i, 9 * i + 9);
    c.set(x, y, z).applyMatrix4(far.matrixWorld);
    n.set(nx, 0, nz).normalize();
    t.crossVectors(up, n);
    m.makeBasis(t, up, n).setPosition(c);
    c.addScaledVector(n, PROUD);
    const cov = kind === 0 && tn === 1, lw = (w + EDGE) / 2, lh = (h + EDGE) / 2;
    rect.set(cov ? [lw, lh, lw, lh] : [lw, lh, (w + RIM[0]) / 2, (h + RIM[1]) / 2], 4 * i);
    quad.set(cov ? [-w / 2 - SKIRT.side, w / 2 + SKIRT.side, -h / 2 - SKIRT.down, h / 2 + SKIRT.up] : [-(w + RIM[0]) / 2, (w + RIM[0]) / 2, -(h + RIM[1]) / 2, (h + RIM[1]) / 2], 4 * i);
    cover[i] = cov ? 1 : 0;
    mesh.setMatrixAt(i, m);
    tone.set([...(kind === 0 ? TUBE : WARM[tn]), kind === 1 || tn === 1 ? 1 : 0], 4 * i);
    const d = c.clone().sub(winC);
    panels.push({ pos: c.clone(), kind, az: Math.atan2(d.x, -d.z), el: Math.atan2(d.y, Math.hypot(d.x, d.z)), y: c.y,
      u: 0, v: 0, r: 0, f: 0, c: 0, g: 0, both: false, t: t.clone(), w });
  }
  const at = new Map(), key = (p) => `${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.z)}`;
  panels.forEach((p, i) => { if (p.kind === 0) { const k = key(p.pos); at.set(k, [...(at.get(k) || []), i]); } });
  const nextTo = (p, sgn) => { const q = p.pos.clone().addScaledVector(p.t, sgn * (p.w + 0.4));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++)
      for (const j of at.get(`${Math.round(q.x) + dx},${Math.round(q.y) + dy},${Math.round(q.z) + dz}`) || []) if (panels[j].pos.distanceTo(q) < 0.3) return true;
    return false; };
  panels.forEach((p, i) => { if (!cover[i]) return;
    if (!nextTo(p, -1)) quad[4 * i] = -p.w / 2 - SKIRT.end;
    if (!nextTo(p, 1)) quad[4 * i + 1] = p.w / 2 + SKIRT.end; });
  const G = { cols: 1, rows: 1 };
  for (const kind of [0, 1]) {
    const ps = panels.filter((p) => p.kind === kind);
    if (!ps.length) continue;
    const lo = (k) => Math.min(...ps.map((p) => p[k])), hi = (k) => Math.max(...ps.map((p) => p[k]));
    const [a0, a1, e0, e1, y0] = [lo('az'), hi('az'), lo('el'), hi('el'), lo('y')];
    const step = (a1 - a0) / Math.max(1, Math.round(Math.sqrt(ps.length) * 1.5));
    for (const p of ps) {
      p.u = (p.az - a0) / (a1 - a0 || 1);
      p.v = (p.el - e0) / (e1 - e0 || 1);
      p.f = Math.round((p.y - y0) / 3.8);
      p.c = Math.floor((p.az - a0) / (step || 1));
      if (kind === 0) { G.rows = Math.max(G.rows, p.f + 1); G.cols = Math.max(G.cols, p.c + 1); }
    }
  }
  panels.forEach((p, i) => { const hs = hash(i, 1); p.g = Math.floor(hs * 3); p.both = fract(hs * 7.31) < 0.33; infoA.set([p.kind, p.u], 2 * i); });
  const offices = panels.map((p, i) => (p.kind === 0 ? i : -1)).filter((i) => i >= 0);
  const houses = panels.map((p, i) => (p.kind === 1 ? i : -1)).filter((i) => i >= 0);

  const NC = G.cols, NF = G.rows, NCELL = NC * NF;
  const cellOf = new Int32Array(N).fill(-1);
  for (const i of offices) cellOf[i] = panels[i].f * NC + panels[i].c;
  const colN = new Float32Array(NCELL), rowN = new Float32Array(NCELL), rN = new Float32Array(NCELL), theta = new Float32Array(NCELL);
  for (let k = 0; k < NCELL; k++) {
    colN[k] = (k % NC) / Math.max(NC - 1, 1); rowN[k] = Math.floor(k / NC) / Math.max(NF - 1, 1);
    const dx = colN[k] - 0.5, dy = (rowN[k] - 0.5) * (NF / NC) * 2;
    rN[k] = Math.hypot(dx, dy); theta[k] = Math.atan2(dy, dx);
  }
  const rMax = Math.max(...rN);
  for (let k = 0; k < NCELL; k++) rN[k] /= rMax;
  const ORIGINS = ['center', 'bottom', 'left', 'right', 'edge', 'top'];
  const dist = {};
  for (const o of ORIGINS) dist[o] = Float32Array.from({ length: NCELL }, (_, k) => ({ center: rN[k], edge: 1 - rN[k], left: colN[k], right: 1 - colN[k], bottom: rowN[k], top: 1 - rowN[k] })[o]);
  const NBX = Math.ceil(NC / BLOCK[0]);
  const blockOf = Int32Array.from({ length: NCELL }, (_, k) => Math.floor((k % NC) / BLOCK[0]) + Math.floor(Math.floor(k / NC) / BLOCK[1]) * NBX);
  const NBLK = NBX * Math.ceil(NF / BLOCK[1]);
  const preset = resolve(FACADE, params.get('facade'));
  const classic = params.has('classic') || preset.mode === 'classic';
  const life = classic ? null : makeFacade({ W: NC, H: NF, seed: seedFrom(params, 606), bpm: BPM, sections: SECTIONS, preset });
  RAMPS.office = RAMPS.tube.map(([st, c], j) => [st, c.map((v, q) => v + (RAMPS.home[j][1][q] - v) * clamp(preset.warmth || 0))]);
  const houseBias = life ? Float32Array.from({ length: BARS * 4 + 64 }, (_, i) => life.houseBias(i)) : null;
  let stillF = null, gOs = 1, inView = true;
  const sphere = new THREE.Sphere().setFromPoints(offices.map((i) => panels[i].pos));
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4();
  function facadeInView() {
    camera.updateMatrixWorld();
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    return frustum.setFromProjectionMatrix(pv).intersectsSphere(sphere);
  }

  const F = new Float32Array(NCELL);
  const put = (k, v) => { if (v > F[k]) F[k] = v; };
  function front(B, origin, beats, gain, width = 0.14) {
    const u = fract(B / beats), d = dist[origin];
    for (let k = 0; k < NCELL; k++) { const band = 1 - Math.abs(d[k] - u) / width; if (band > 0) put(k, gain * Math.min(1, band * 1.6)); }
  }
  function blocks(B, p, gain, div = 1, seed = 0) {
    const x = B * div, st = Math.floor(x), frac = x - st, r0 = rng(st * 7919 + seed), r1 = rng((st - 1) * 7919 + seed);
    const on = new Uint8Array(NBLK);
    for (let b = 0; b < NBLK; b++) { const a = r0(), pr = r1(); on[b] = a < p && !(pr < p) ? 1 : 0; }
    const e = gain * ad(frac, 0.15, 0.7, 2);
    for (let k = 0; k < NCELL; k++) if (on[blockOf[k]]) put(k, e);
  }
  function splat(cx, cf, a, sigma) {
    const R = Math.ceil(sigma * 2.5);
    for (let f = Math.max(0, Math.round(cf) - R); f <= Math.min(NF - 1, Math.round(cf) + R); f++)
      for (let c2 = Math.max(0, Math.round(cx) - R); c2 <= Math.min(NC - 1, Math.round(cx) + R); c2++) {
        const d2 = ((c2 - cx) ** 2 + ((f - cf) * 2) ** 2) / (sigma * sigma);
        put(f * NC + c2, a * Math.exp(-0.5 * d2));
      }
  }
  const KU = (() => { const r = rng(1234), n = 24;
    return { n, step: -1, x: Array.from({ length: n }, () => r() * (NC - 1)), f: Array.from({ length: n }, () => r() * (NF - 1)),
      th: Array.from({ length: n }, () => r() * 2 * Math.PI), w: Array.from({ length: n }, () => (2 * Math.PI * 0.25) / (0.6 + 0.8 * r())), fired: [], K: 0, r }; })();
  function kuramoto(B, gain, kmax = 1.2) {
    const st = Math.floor(B * 4), frac = B * 4 - st;
    if (st < KU.step || st - KU.step > 256) KU.step = st - 1;
    while (KU.step < st) {
      KU.step++;
      const K = kmax * (0.5 - 0.5 * Math.cos((2 * Math.PI * KU.step) / (8 * 4 * 4)));
      const nt = KU.th.map((a, i) => a + KU.w[i] + (K / KU.n) * KU.th.reduce((s, b) => s + Math.sin(b - a), 0));
      KU.fired = nt.map((a) => a >= 2 * Math.PI);
      KU.th = nt.map((a) => a % (2 * Math.PI)); KU.K = K;
      for (let i = 0; i < KU.n; i++) { KU.x[i] = clamp(KU.x[i] + (KU.r() - 0.5) * 0.4, 0, NC - 1); KU.f[i] = clamp(KU.f[i] + (KU.r() - 0.5) * 0.1, 0, NF - 1); }
    }
    const sig = Math.max(1.5, NC / 30), glow = 0.08 + (0.08 * KU.K) / kmax, fl = ad(frac, 0.1, 0.9, 2);
    for (let i = 0; i < KU.n; i++) splat(KU.x[i], KU.f[i], gain * (KU.fired[i] ? Math.max(glow, fl) : glow), sig);
  }
  function sweepCloud(t, gain, { turnBars = 8, width = 0.28, wobble = 0.35 } = {}) {
    const turn = (turnBars * 4 * 60) / BPM;
    const sweep = 2 * Math.PI * (t / turn + wobble * Math.sin((2 * Math.PI * t) / (3.1 * turn)));
    const breathe = 0.55 + 0.45 * Math.sin((2 * Math.PI * t) / ((8 * 4 * 60) / BPM));
    for (let k = 0; k < NCELL; k++) {
      const d = Math.abs(((theta[k] - sweep + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) / Math.PI;
      put(k, gain * breathe * Math.exp(-((d / width) ** 2)));
    }
  }

  const smoothE = { e: 0 };
  function program(B, tSec, f, mix) {
    F.fill(0);
    const kind = f.kind, sb = f.secBeat, e = smoothE.e;
    if (mix.low < 0.5 && (kind === 'drop' || kind === 'build')) kuramoto(B, 0.7);
    else if (kind === 'intro') {
      if (Math.floor(sb / 32) % 2 === 0) kuramoto(B, 1); else sweepCloud(tSec, 0.95, { turnBars: 4 });
    } else if (kind === 'build') {
      const k = f.secLen - sb, u = clamp(1 - k / 32);
      front(B, 'bottom', k > 32 ? 8 : 4, 0.75 + 0.25 * e, 0.16); kuramoto(B, 0.5 + 0.5 * u);
    } else if (kind === 'drop') {
      blocks(B, 0.22, 1, 0.5, 11 + Math.floor(sb / 64));
      front(B, ORIGINS[Math.floor(sb / 64) % 4], 8, 1, 0.22);
      sweepCloud(tSec, 0.7, { turnBars: 4 });
    } else if (kind === 'breakdown') front(B, 'top', 8, 0.8, 0.2);
    else { blocks(B, 0.3 * (1 - f.u) + 0.05, 0.85, 0.5, 21); kuramoto(B, 0.7 * (1 - f.u) + 0.2); }
  }
  function houseLevel(p, B, f) {
    const ph = Math.floor(B / H_PHRASE + p.u);
    let r = hash(ph, 31 + 997 * p.u), lv = HOUSE_STATES[HOUSE_STATES.length - 1][0];
    if (houseBias) r = clamp(r + houseBias[clamp(Math.floor((ph - p.u) * H_PHRASE), 0, houseBias.length - 1)], 0, 0.999);
    for (const [l, share] of HOUSE_STATES) { if (r < share) { lv = l; break; } r -= share; }
    return lv * (0.75 + 0.25 * f.fade);
  }

  const level = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  level.setUsage(THREE.DynamicDrawUsage);
  mesh.geometry.setAttribute('aLevel', level);
  mesh.geometry.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 4));
  mesh.geometry.setAttribute('aRect', new THREE.InstancedBufferAttribute(rect, 4));
  mesh.geometry.setAttribute('aQuad', new THREE.InstancedBufferAttribute(quad, 4));
  mesh.geometry.setAttribute('aCover', new THREE.InstancedBufferAttribute(cover, 1));
  mesh.geometry.setAttribute('aInfo', new THREE.InstancedBufferAttribute(infoA, 2));
  const stops = (name) => RAMPS[name].map(([s, [r, g, b]]) => new THREE.Vector4(s, r, g, b));
  const U = { uK: { value: 0 }, uProud: { value: PROUD }, uDark: { value: new THREE.Vector3(...DARK) }, uPane: { value: new THREE.Vector3(...PANE) }, uWall: { value: new THREE.Vector3(...WALL) }, uO: { value: stops('office') }, uH: { value: stops('home') } };
  mesh.material = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
  mesh.name = 'stage_windows';
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  let rampO = 'office', rampH = 'home';
  const setRamp = (u, name, cur) => { if (name !== cur) U[u].value = stops(name); return name; };

  const keepMask = Uint8Array.from({ length: N }, (_, i) => (hash(i, 99) < GOVERN.keep ? 1 : 0));
  const gov = { 0: { events: [], held: 0 }, 1: { events: [], held: 0 } };
  const prev = new Float32Array(N);
  const hist = Array.from({ length: GOVERN.back }, () => new Float32Array(N));
  let histI = 0;
  function govern(idx, bank, now) {
    const arr = level.array, gs = gov[bank];
    let upN = 0, dnN = 0;
    const old = hist[histI];
    for (const i of idx) { const d = (arr[i] - old[i]) * GOVERN.gain; if (d >= GOVERN.thresh) upN++; else if (d <= -GOVERN.thresh) dnN++; }
    const big = Math.max(upN, dnN) / Math.max(1, idx.length) >= GOVERN.area;
    gs.events = gs.events.filter((x) => now - x < 1);
    if (big && gs.events.length >= 2 * GOVERN.flashes) { for (const i of idx) if (!keepMask[i]) arr[i] = prev[i]; gs.held++; }
    else if (big) gs.events.push(now);
  }

  const reduce = () => live.reduceMotion.matches;
  let near = false, forced = params.has('stage'), k = 0, b = 0, settled = true, cost = 0, frames = 0, seen = false, clock = 0, lastF = null;
  const fwd = new THREE.Vector3();
  const deck = () => live.show;
  function atWindow() {
    if (VIEWS.has(live.view())) return true;
    if (!live.inRoom?.()) return false;
    const p = camera.position, d = p.z - paneZ;
    camera.getWorldDirection(fwd);
    const lim = near ? FAR : NEAR;
    return d > -0.2 && d < lim && Math.abs(p.x - winC.x) < SIDE && fwd.dot(outward) > OUTWARD;
  }

  const button = document.createElement('button');
  try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch {   }
  if (!live.gate) {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);
    button.type = 'button';
    button.className = 'stage-toggle';
    button.textContent = 'Light show';
    button.title = 'The light show on the facades opposite';
    button.setAttribute('aria-pressed', String(forced));
    button.setAttribute('aria-label', 'Light show: the University windows opposite as a stage');
    button.hidden = !seen;
    button.addEventListener('click', () => { if (deck()?.playing || forced) { deck()?.stop?.(); set(false); } else set(true); sync(); });
    (document.querySelector('.controls') ?? document.body).appendChild(button);
  }
  function discover() {
    if (seen) return;
    seen = true;
    button.hidden = false;
    dispatchEvent(new Event('resize'));
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {   }
  }
  let uniOnly = false;
  let shown = '';
  function sync(playing = !!deck()?.playing) {
    const on = forced || playing, key = `${on}|${playing}`;
    if (key === shown || live.gate) return;
    shown = key;
    button.textContent = on ? 'Stop the show' : 'Light show';
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? (playing ? 'Stop the show and the track' : 'Stop the light show on the windows opposite') : 'Light show: the University windows opposite as a stage');
  }
  addEventListener('room:deck', () => { sync(); live.render(); });
  sync();
  function set(v) { forced = !!v; uniOnly = false; settled = false; sync(); live.render(); return forced; }
  function cue({ beat = 0, university = false } = {}) { set(true); uniOnly = !!university; b = Math.max(0, beat); clock = 0; return forced; }

  function timed(dt) { const t0 = performance.now(), r = step(dt); cost += performance.now() - t0; frames++; return r; }
  function step(dt) {
    near = atWindow();
    const playing = !!deck()?.playing, want = forced || playing;
    sync(playing);
    if (near && !live.gate) discover();
    if (playing) uniOnly = false;
    if (settled && !want && k === 0) return false;
    if (want) { settled = false; if (k === 0 && !playing && !uniOnly) b = 0; if (!live.gate) discover(); }
    const still = reduce(), k0 = k;
    k = clamp(k + (want ? dt / (still ? T_STILL : playing ? 0.6 : T_IN) : -dt / (still ? T_STILL : T_OUT)));
    clock += dt;
    if (!still && !playing) b = (b + (dt * BPM) / 60) % (BARS * 4);
    const was = mesh.visible;
    mesh.visible = k > 0;
    if (k === 0) { if (!want) settled = true; return was; }
    if (still && k === k0 && was) return false;
    U.uK.value = k * k * (3 - 2 * k);
    if (life && !want && !still && was) return true;
    const mix = playing ? { xf: deck().xf, ch: deck().ch, low: deck().low } : { xf: 0.5, ch: [1, 1], low: 1 };
    const B = still ? 4 * 40 + 1.5 : playing ? deck().beat : b;
    const f = features(B, mix.low);
    lastF = f;
    smoothE.e = still ? f.energy : smoothE.e + (f.energy - smoothE.e) * (1 - Math.exp(-dt / 0.4));
    if (!life) program(B, (B * 60) / BPM, f, mix);
    rampO = setRamp('uO', OFFICE_RAMP[f.kind], rampO);
    rampH = setRamp('uH', HOUSE_RAMP[f.kind], rampH);
    const gO = mix.ch[0] * Math.min(1, 2 * (1 - mix.xf)), gH = uniOnly ? 0 : mix.ch[1] * Math.min(1, 2 * mix.xf);
    const scaleO = 0.8 + 0.2 * smoothE.e;
    const arr = level.array, ka = still ? 1 : 1 - Math.exp(-dt / TAU_UP), kd = still ? 1 : 1 - Math.exp(-dt / TAU_DOWN);
    prev.set(arr);
    if (life && still) {
      stillF = stillF || life.still();
      for (const i of offices) arr[i] = gO * (0.03 + 0.97 * stillF[cellOf[i]]);
    } else if (life) {
      inView = facadeInView();
      gOs += (gO - gOs) * ka;
      if (inView && want) {
        const L = life.frame(dt, B, mix.low);
        for (const i of offices) arr[i] = gOs * (0.03 + 0.97 * Math.min(1, L[cellOf[i]] * scaleO));
      } else life.jump();
    } else for (const i of offices) {
      const target = gO * (0.03 + 0.97 * Math.min(1, F[cellOf[i]] * scaleO));
      const cur = arr[i];
      arr[i] = cur + (target - cur) * (target > cur ? ka : kd);
    }
    for (const i of houses) {
      const target = gH * (still ? 0.6 : houseLevel(panels[i], B, f));
      const cur = arr[i];
      arr[i] = still ? target : cur + (target - cur) * (target > cur ? ka * 0.5 : kd * 0.4);
    }
    if (!still) { if (!life) govern(offices, 0, clock); govern(houses, 1, clock);
      hist[histI].set(arr); histI = (histI + 1) % GOVERN.back; }
    level.needsUpdate = true;
    return true;
  }

  return {
    name: 'stage',
    update(dt) { return live.gate ? false : timed(dt); },
    onView() { settled = false; },
    api: {
      set, cue, toggle: () => set(!forced),
      advance(sec, h = 1 / 60) { let s = Math.round(sec / h); while (s-- > 0) { live.deckStep?.(h); timed(h); } live.render(); return k; },
      at(beat, h = 1 / 60) { b = Math.max(0, beat - 16); let s = Math.round((16 * 60) / BPM / h);
        while (s-- > 0) timed(h); live.render(); return +b.toFixed(3); },
      screen(i) {
        const q = panels[i].pos.clone().project(camera);
        if (q.z > 1) return null;
        const r = live.renderer.domElement.getBoundingClientRect();
        return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height];
      },
      values: () => Array.from(level.array, (v) => +v.toFixed(4)),
      aim(fov = 50, out = 0.6) { if (!live.gate) return false;
        const eye = winC.clone().addScaledVector(outward, out), c = new THREE.Vector3(); let n = 0;
        for (const i of offices) { const d = panels[i].pos.clone().sub(eye); if (d.normalize().dot(outward) > Math.cos(0.87)) { c.add(panels[i].pos); n++; } }
        camera.position.copy(eye); camera.lookAt(n ? c.divideScalar(n) : sphere.center); camera.fov = fov; camera.updateProjectionMatrix(); live.render(); return n; },
      houseColours: () => { const out = []; for (const name of new Set(Object.values(HOUSE_RAMP))) for (const [, c] of RAMPS[name]) for (const i of houses) {
        const t = [tone[4 * i], tone[4 * i + 1], tone[4 * i + 2]]; out.push(c.map((v, j) => v * (0.65 + 0.35 * t[j]))); } return out; },
      kinds: () => panels.map((p) => p.kind),
      grid: () => ({ cols: NC, rows: NF, cells: panels.map((p) => (p.kind === 0 ? [p.c, p.f] : null)) }),
      cost() { const r = { ms: frames ? +(cost / frames).toFixed(4) : 0, frames }; cost = 0; frames = 0; return r; },
      info: () => ({ on: forced || !!deck()?.playing, near, forced, uniOnly, deck: !!deck()?.playing, k: +k.toFixed(3), beat: +(deck()?.playing ? deck().beat : b).toFixed(2),
        visible: mesh.visible, settled, seen, panels: N, university: offices.length, houses: houses.length, cols: NC, floors: NF,
        pattern: lastF ? `${lastF.kind} ${lastF.secBeat.toFixed(1)}/${lastF.secLen}` : 'none', ramps: [rampO, rampH],
        held: [gov[0].held, gov[1].held], mode: life ? 'life' : 'classic', preset: classic ? 'classic' : preset.name, inView,
        life: life ? { ...life.stats, E: +life.stats.E.toFixed(3), hum: +life.stats.hum.toFixed(4), mean: +life.stats.mean.toFixed(4) } : null }),
    },
  };
}
