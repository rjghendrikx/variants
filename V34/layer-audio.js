import { expWait, rng, seedFrom } from './layer-common.js';

const STORE_KEY = 'room.sound';
const MASTER = 0.6;
const FADE_IN = 0.9, FADE_OUT = 0.35;
const GLASS = 0.35;
const DUCK = 0.6;
const AMB = {
  level: 0.55,
  width: 0.08,
  hiss: { level: 0.55, rate: 1800, noise: 0.22, tilt: 2200, hp: 320, dip: 3300, lp: 5000, am: 0.12, amHz: 18 },
  patter: { rate: 260, level: 0.4, lp: 700 },
  ticks: { level: 0.17, rate: 8 },
  drops: { level: 0.3, rate: 1.0, sill: 0.4 },
  trickle: { level: 0.12, pan: 0.45, lp: 1800, drip: 3.2 },
  city: { level: 0.05, hp: 70, lp: 420 },
  pan: 0.35,
};
const BOAT = { fire: 36, level: 0.35, ref: 8, lpNear: 320, lpFar: 110, procS: 20, procGap: [70, 200] };
const CLICK = { level: 1.2, hp: 1800, ms: 6, tau: 0.0007 };
const C_SOUND = 343;

const TAU = 2 * Math.PI;
function waveOf(sr, sec, fn) { const n = Math.max(1, Math.ceil(sr * sec)), w = new Float32Array(n); for (let i = 0; i < n; i++) w[i] = fn(i / sr, i); return w; }
function glassDrop(sr, rand) {
  const f = 1100 + rand() * 1900, tau = 0.002 + rand() * 0.005, tc = 0.0006 + rand() * 0.0008, ta = 0.0003 + rand() * 0.0005, ph = rand() * TAU;
  let lp = 0;
  return waveOf(sr, tau * 5, (t) => { lp += 0.25 * ((rand() * 2 - 1) - lp);
    return (1 - Math.exp(-t / ta)) * (lp * 0.9 * Math.exp(-t / tc)
      + Math.exp(-t / tau) * (Math.sin(TAU * f * t + ph) * 0.5 + Math.sin(TAU * f * 2.31 * t) * 0.12 * Math.exp(-t / tau))); });
}
function sillDrop(sr, rand) {
  const f = 300 + rand() * 500, tau = 0.008 + rand() * 0.016, tc = 0.001 + rand() * 0.001, ta = 0.0008 + rand() * 0.0008;
  let ph = 0, lp = 0;
  return waveOf(sr, tau * 6, (t) => { ph += TAU * f * (1 - 0.15 * Math.min(1, t / tau / 3)) / sr; lp += 0.12 * ((rand() * 2 - 1) - lp);
    return (1 - Math.exp(-t / ta)) * (lp * 1.6 * Math.exp(-t / tc) + Math.sin(ph) * 0.7 * Math.exp(-t / tau)); });
}
function plink(sr, rand, f0 = 900 + rand() * 1500, tau = 0.01 + rand() * 0.03) {
  let ph = 0, e = 1;
  const k = Math.exp(-1 / (tau * sr));
  const ra = Math.max(8, Math.round(sr * 0.0015));
  return waveOf(sr, tau * 6, (t, i) => { ph += TAU * f0 * (1 + 0.9 * t / (tau * 6)) / sr; e *= k; return Math.sin(ph) * e * Math.min(1, i / ra); });
}
function texture(ctx, sec, fill) {
  const sr = ctx.sampleRate, n = Math.floor(sr * sec), buf = ctx.createBuffer(2, n, sr);
  fill(buf.getChannelData(0), buf.getChannelData(1), n, sr);
  return buf;
}
function put(L, R, n, at, w, amp, pan) {
  const gl = Math.cos((pan + 1) * Math.PI / 4) * amp, gr = Math.sin((pan + 1) * Math.PI / 4) * amp;
  for (let i = 0; i < w.length; i++) { const k = (at + i) % n; L[k] += w[i] * gl; R[k] += w[i] * gr; }
}
function poisson(rand, sec, rate, fn) { for (let t = expWait(rand, rate); t < sec; t += expWait(rand, rate)) fn(t); }

export function ambience(ctx, out, rand, job = (f) => f()) {
  const sr = ctx.sampleRate, A = AMB;
  const filt = (type, f, q = 0.707, g = 0) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = g; return b; };
  const gain = (v) => { const x = ctx.createGain(); x.gain.value = v; return x; };
  const loop = (buf, dest, rate = 1) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.connect(dest); s.start(0, rand() * buf.duration); return s; };
  const sum = gain(1), pan = ctx.createStereoPanner(), level = gain(A.level), duck = gain(1);
  sum.connect(pan).connect(level).connect(duck).connect(out);

  const H = A.hiss, Pt = A.patter;
  const onePoleWrap = (ch, n, fc) => { const k = 1 - Math.exp(-TAU * fc / sr); let y = 0;
    for (let i = 0; i < n; i++) y += k * (ch[i] - y);
    for (let i = 0; i < n; i++) { y += k * (ch[i] - y); ch[i] = y; } };
  const NT = 8192, nt = Float32Array.from({ length: NT }, () => rand() * 2 - 1);
  const micro = (L, R, n) => {
    const tmp = new Float32Array(n);
    for (const ch of [L, R]) {
      for (let i = 0; i < n; i++) ch[i] = (rand() * 2 - 1) * H.noise;
      poisson(rand, n / sr, H.rate, (t) => {
        const tc = 0.00005 + rand() * 0.00035, a = rand() ** 3 * 1.6, at = Math.floor(t * sr), m = Math.ceil(tc * 4 * sr);
        const k = Math.exp(-1 / (tc * sr));
        const o = Math.floor(rand() * (NT - m));
        for (let i = 0, e = a; i < m; i++, e *= k) ch[(at + i) % n] += nt[o + i] * e;
      });
      tmp.fill(0);
      poisson(rand, n / sr, Pt.rate, (t) => {
        const tc = 0.0008 + rand() * 0.0017, a = (0.5 + 0.5 * rand() ** 2) * Pt.level, at = Math.floor(t * sr), m = Math.ceil(tc * 3 * sr);
        const k = Math.exp(-1 / (tc * sr)), ra = Math.ceil(sr * 0.0004);
        const o = Math.floor(rand() * (NT - m));
        for (let i = 0, e = a; i < m; i++, e *= k) tmp[(at + i) % n] += nt[o + i] * (i < ra ? e * i / ra : e);
      });
      onePoleWrap(tmp, n, Pt.lp);
      for (let i = 0; i < n; i++) ch[i] += tmp[i];
      onePoleWrap(ch, n, H.tilt);
    }
    for (let i = 0; i < n; i++) { const l = L[i], r = R[i]; L[i] = l + A.width * r; R[i] = r + A.width * l; }
  };
  const hissIn = gain(1), hissAm = gain(1);
  for (const [sec, rate] of [[11.3, 1], [13.9, 0.985]]) job(() => loop(texture(ctx, sec, micro), hissIn, rate));
  hissIn.connect(filt('highpass', H.hp)).connect(filt('peaking', H.dip, 0.9, -4))
    .connect(filt('lowpass', H.lp)).connect(hissAm).connect(gain(H.level)).connect(sum);
  const amDepth = gain(H.am);
  amDepth.connect(hissAm.gain);
  job(() => { const amBuf = ctx.createBuffer(1, Math.floor(sr * 7.7), sr), am = amBuf.getChannelData(0); const k = 1 - Math.exp(-TAU * H.amHz / sr); let y = 0, pk = 0;
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < am.length; i++) { y += k * ((rand() * 2 - 1) - y); if (pass) { am[i] = y; pk = Math.max(pk, Math.abs(y)); } }
    for (let i = 0; i < am.length; i++) am[i] /= pk || 1;
    loop(amBuf, amDepth); });
  const T = A.ticks;
  const tickTex = (L, R, n) => poisson(rand, n / sr, T.rate, (t) => put(L, R, n, Math.floor(t * sr), glassDrop(sr, rand), 0.25 + rand() ** 2 * 0.5, (rand() * 2 - 1) * 0.9));
  const tickIn = gain(T.level);
  tickIn.connect(sum);
  for (const sec of [17.3, 19.1]) job(() => loop(texture(ctx, sec, tickTex), tickIn));
  const D = A.drops, one = (w) => { const b = ctx.createBuffer(1, w.length, sr); b.copyToChannel(w, 0); return b; };
  let glass = [], sill = [], drips = [];
  job(() => { glass = Array.from({ length: 16 }, () => one(glassDrop(sr, rand))); sill = Array.from({ length: 8 }, () => one(sillDrop(sr, rand)));
    drips = Array.from({ length: 8 }, () => one(plink(sr, rand, 650 + rand() * 600, 0.03 + rand() * 0.025))); });
  const dropBus = gain(D.level);
  dropBus.connect(sum);
  const strips = Array.from({ length: 8 }, () => { const gn = gain(0), p = ctx.createStereoPanner(); gn.connect(p).connect(dropBus); return { gn, p }; });
  const C = A.trickle;
  const trickleTex = (L, R, n) => {
    let lp = 0; for (let i = 0; i < n; i++) { lp += 0.05 * ((rand() * 2 - 1) - lp); L[i] = lp * 0.5; R[i] = lp * 0.4; }
    poisson(rand, n / sr, 28, (t) => put(L, R, n, Math.floor(t * sr), plink(sr, rand, 600 + rand() * 1400, 0.004 + rand() * 0.012), 0.1 + rand() ** 2 * 0.4, (rand() * 2 - 1) * 0.5));
  };
  const trickle = gain(1), tricklePan = ctx.createStereoPanner();
  tricklePan.pan.value = C.pan;
  trickle.connect(filt('highpass', 150)).connect(filt('lowpass', C.lp)).connect(gain(C.level)).connect(tricklePan).connect(sum);
  job(() => loop(texture(ctx, 23.1, trickleTex), trickle));
  const dripStrip = gain(0);
  dripStrip.connect(trickle);
  const pinkTex = (L, R, n) => { for (const ch of [L, R]) { let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) { const w = rand() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; ch[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12; } } };
  const cityIn = filt('highpass', A.city.hp);
  cityIn.connect(filt('lowpass', A.city.lp)).connect(gain(A.city.level)).connect(sum);
  job(() => loop(texture(ctx, 9.7, pinkTex), cityIn));

  let nextDrop = 0, nextDrip = 0.4, strip = 0, intensity = 1;
  function schedule(t0, t1) {
    if (!drips.length) return;
    if (nextDrop < t0) nextDrop = t0 + expWait(rand, D.rate);
    while (nextDrop < t1) {
      intensity = Math.min(1.4, Math.max(0.6, intensity + (rand() - 0.5) * 0.08));
      const s = ctx.createBufferSource(), st = strips[strip++ % strips.length], onSill = rand() < D.sill;
      s.buffer = onSill ? sill[Math.floor(rand() * sill.length)] : glass[Math.floor(rand() * glass.length)];
      s.playbackRate.value = 0.85 + rand() * 0.3;
      st.gn.gain.setValueAtTime((onSill ? 0.45 : 0.3) + rand() ** 2 * 0.3, nextDrop);
      st.p.pan.setValueAtTime((rand() * 2 - 1) * (onSill ? 0.5 : 0.9), nextDrop);
      s.connect(st.gn); s.start(nextDrop);
      nextDrop += expWait(rand, D.rate * intensity);
    }
    if (nextDrip < t0) nextDrip = t0 + C.drip * (0.5 + rand());
    while (nextDrip < t1) {
      const s = ctx.createBufferSource();
      s.buffer = drips[Math.floor(rand() * drips.length)];
      s.playbackRate.value = 0.9 + rand() * 0.2;
      dripStrip.gain.setValueAtTime(0.4 + rand() * 0.3, nextDrip);
      s.connect(dripStrip); s.start(nextDrip);
      nextDrip += C.drip * (0.5 + rand());
    }
  }
  return {
    out: duck, schedule,
    duck(on, t = ctx.currentTime) { duck.gain.cancelScheduledValues(t); duck.gain.setTargetAtTime(on ? DUCK : 1, t, 0.33); },
    pan(v, t = ctx.currentTime) { pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, v)) * A.pan, t, 0.3); },
  };
}

export function masterChain(ctx) {
  const fade = ctx.createGain(), lim = ctx.createDynamicsCompressor(), trim = ctx.createGain();
  fade.gain.value = 0;
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  trim.gain.value = 0.8;
  fade.connect(lim).connect(trim).connect(ctx.destination);
  return { fade, lim, out: trim };
}

export async function renderAmbience(sec = 20, seed = 505, sr = 48000) {
  const ctx = new OfflineAudioContext(2, Math.floor(sec * sr), sr), rand = rng(seed);
  const m = masterChain(ctx);
  m.fade.gain.value = MASTER;
  const a = ambience(ctx, m.fade, rand);
  a.schedule(0, sec);
  return ctx.startRendering();
}

export default function mount(live) {
  const { THREE, byName, camera } = live;
  const rand = rng(seedFrom(live.params, 505));
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;

  const world = (name, local) => {
    const o = byName(name);
    if (!o) return null;
    o.updateMatrixWorld(true);
    return local ? o.localToWorld(new THREE.Vector3(...local)) : o.getWorldPosition(new THREE.Vector3());
  };
  const night = byName('cz_canal_night')?.userData;
  const panes = [];
  if (night?.rain_panes) {
    for (let k = 0; k < night.rain_panes.length; k += 5) {
      const [cx, cy, cz, w, h] = night.rain_panes.slice(k, k + 5);
      panes.push({ p: world('cz_canal_night', [cx, cy, cz]), w, h });
    }
  }
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  if (!panes.length) {
    for (const sx of [-1, 1]) panes.push({ p: new THREE.Vector3(sx * 1.2, 1.9, camPos.z - 4), w: 1.4, h: 2.4 });
  }
  const winC = panes.reduce((a, q) => a.add(q.p), new THREE.Vector3()).divideScalar(panes.length);
  const gd = byName('geiger')?.userData;
  const geigerPos = world('geiger', gd?.geiger_grille ?? null);
  const boatNode = byName('cz_boat');

  let ctx = null, g = null, on = false, wanted = false;
  const button = setupButton();

  function noiseBuffer(sec) {
    const n = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
    let br = 0;
    for (let i = 0; i < n; i++) { br = (br + 0.02 * (rand() * 2 - 1)) / 1.02; ch[i] = br * 3.5; }
    const f = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < f; i++) { const k = Math.sqrt(i / f); ch[i] = ch[i] * k + ch[n - f + i] * Math.sqrt(1 - k * k); }
    return buf;
  }
  function loop(buf, rate = 1) {
    const s = ctx.createBufferSource();
    s.buffer = buf; s.loop = true; s.playbackRate.value = rate;
    s.loopStart = 0; s.loopEnd = buf.duration - 0.05;
    s.start(0, rand() * buf.duration * 0.9);
    return s;
  }
  function panner(pos, ref, rolloff = 1) {
    const p = ctx.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse'; p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = 10000;
    setPos(p, pos);
    return p;
  }
  function setPos(p, v) {
    if (p.positionX) { p.positionX.value = v.x; p.positionY.value = v.y; p.positionZ.value = v.z; }
    else p.setPosition(v.x, v.y, v.z);
  }
  const filt = (type, f, q = 0.707) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gain = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };

  let buildMs = 0, jobMs = 0;
  function build() {
    const t0 = performance.now();
    ctx = new AC({ latencyHint: 'playback' });
    const m = masterChain(ctx), analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    m.out.connect(analyser);
    const master = gain(1);
    master.connect(m.fade);
    const outside = gain(GLASS);
    outside.connect(master);
    const meter = (node) => { const a = ctx.createAnalyser(); a.fftSize = 2048; node.connect(a); return a; };
    const q = [], run = () => { const t = performance.now(); q.shift()?.(); jobMs = Math.max(jobMs, performance.now() - t); if (q.length) setTimeout(run, 0); };
    const amb = ambience(ctx, master, rand, (f) => { q.push(f); if (q.length === 1) setTimeout(run, 0); });
    const track = gain(1);
    track.connect(master);
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = BOAT.fire;
    const sub = ctx.createOscillator(); sub.type = 'sine'; sub.frequency.value = BOAT.fire / 2;
    const chug = ctx.createOscillator(); chug.type = 'sine'; chug.frequency.value = BOAT.fire / 4;
    const chugDepth = gain(0.35), body = gain(0.65);
    chug.connect(chugDepth).connect(body.gain);
    const burble = loop(noiseBuffer(2.3));
    const boatLp = filt('lowpass', BOAT.lpFar, 0.9);
    saw.connect(gain(0.5)).connect(body); sub.connect(gain(0.8)).connect(body);
    burble.connect(filt('bandpass', 90, 0.8)).connect(gain(1.2)).connect(body);
    const boatLevel = gain(0);
    const boatPan = panner(winC.clone().add(new THREE.Vector3(60, -6, -20)), BOAT.ref, 1);
    body.connect(boatLp).connect(boatLevel).connect(boatPan).connect(outside);
    for (const o of [saw, sub, chug]) o.start();

    const geigerPan = geigerPos ? panner(geigerPos, 0.6, 1) : null;
    geigerPan?.connect(master);

    const meters = { rain: meter(amb.out), outside: meter(outside), track: meter(track), ...(geigerPan ? { geiger: meter(geigerPan) } : {}) };
    g = { fade: m.fade, lim: m.lim, analyser, master, meters, amb, track, saw, sub, chug, burble, boatLp, boatLevel, boatPan, geigerPan,
      lastBoat: null, procBoat: null, procAt: ctx.currentTime + 15 + rand() * 30, counts: null, clicks: 0, ducked: false,
      buf: new Float32Array(analyser.fftSize) };
    buildMs = performance.now() - t0;
  }

  function playClick(when) {
    if (!g.geigerPan) return;
    const n = Math.floor(ctx.sampleRate * CLICK.ms / 1000), b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (rand() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * CLICK.tau));
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(filt('highpass', CLICK.hp)).connect(gain(CLICK.level)).connect(g.geigerPan);
    s.start(when);
    g.clicks++;
  }

  function setSound(next, remember = true) {
    wanted = next;
    if (remember) { try { localStorage.setItem(STORE_KEY, next ? 'on' : 'off'); } catch {   } }
    button.setAttribute('aria-pressed', String(next));
    if (next && !ctx) build();
    if (!ctx) return Promise.resolve();
    const now = ctx.currentTime, m = g.fade.gain;
    m.cancelScheduledValues(now); m.setValueAtTime(m.value, now);
    if (next && !document.hidden) {
      return ctx.resume().then(() => {
        if (!wanted || ctx.state !== 'running') return;
        on = true;
        duck();
        const t = ctx.currentTime; m.cancelScheduledValues(t); m.setValueAtTime(m.value, t); m.linearRampToValueAtTime(MASTER, t + FADE_IN);
      }).catch(() => {});
    }
    on = false;
    g.counts = null;
    m.linearRampToValueAtTime(0, now + FADE_OUT);
    return new Promise((r) => setTimeout(r, FADE_OUT * 1000 + 30)).then(() => { if (!on) return ctx.suspend(); }).catch(() => {});
  }
  function duck() { const d = !!live.show?.playing && on; if (g && d !== g.ducked) { g.ducked = d; g.amb.duck(d); } }
  addEventListener('room:deck', () => duck());

  function setupButton() {
    let b = document.querySelector('.sound');
    if (b) {
      const nb = b.cloneNode(true);
      b.replaceWith(nb); b = nb;
    } else {
      b = document.createElement('button');
      b.className = 'sound'; b.type = 'button';
      Object.assign(b.style, { position: 'fixed', top: '16px', right: '16px', zIndex: 5, font: 'inherit',
        background: 'transparent', color: 'inherit', border: '1px solid currentColor', borderRadius: '999px', padding: '4px 12px', opacity: 0.8 });
      document.body.appendChild(b);
    }
    b.textContent = 'Sound';
    b.setAttribute('aria-label', geigerPos ? 'Room sound: rain, the canal and the Geiger counter' : 'Room sound: rain and the canal');
    b.setAttribute('aria-pressed', 'false');
    b.title = 'Room sound';
    b.hidden = !!live.gate;
    b.addEventListener('click', () => setSound(!wanted));
    return b;
  }
  let remembered = null;
  try { remembered = localStorage.getItem(STORE_KEY); } catch {   }
  if (remembered !== 'off' && !live.gate) {
    button.setAttribute('aria-pressed', 'true');
    wanted = true;
    const evs = ['pointerdown', 'pointerup', 'touchend', 'keydown'];
    const disarm = () => evs.forEach((e) => removeEventListener(e, arm, true));
    const arm = (ev) => {
      if (button.contains(ev.target)) return;
      if (!wanted || (on && ctx?.state === 'running')) { disarm(); return; }
      setSound(true, false);
    };
    evs.forEach((e) => addEventListener(e, arm, true));
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !wanted) return;
    if (document.hidden) { on = false; ctx.suspend().catch(() => {}); }
    else if (navigator.userActivation?.hasBeenActive !== false) setSound(true, false);
  });

  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), tmp = new THREE.Vector3(), lastCam = new THREE.Matrix4();
  function listener() {
    camera.updateMatrixWorld();
    if (lastCam.equals(camera.matrixWorld)) return;
    lastCam.copy(camera.matrixWorld);
    const L = ctx.listener;
    camera.getWorldPosition(tmp);
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
    up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (L.positionX) {
      L.positionX.value = tmp.x; L.positionY.value = tmp.y; L.positionZ.value = tmp.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
      L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z;
    } else { L.setPosition(tmp.x, tmp.y, tmp.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
  }

  const winDir = new THREE.Vector3(), right = new THREE.Vector3();
  function rain(now) {
    g.amb.schedule(now, now + 0.25);
    camera.getWorldPosition(tmp);
    winDir.copy(winC).sub(tmp).normalize();
    right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    g.amb.pan(winDir.dot(right), now);
  }

  const boatPos = new THREE.Vector3();
  function boatNow(now) {
    if (boatNode) {
      if (!boatNode.visible) return null;
      return boatNode.getWorldPosition(boatPos);
    }
    if (!g.procBoat && now > g.procAt) g.procBoat = { t0: now, dir: rand() < 0.5 ? -1 : 1 };
    if (!g.procBoat) return null;
    const k = (now - g.procBoat.t0) / BOAT.procS;
    if (k > 1) { g.procBoat = null; g.procAt = now + BOAT.procGap[0] + rand() * (BOAT.procGap[1] - BOAT.procGap[0]); return null; }
    return boatPos.set(winC.x + g.procBoat.dir * (k - 0.5) * 60, winC.y - 6, winC.z - 21);
  }
  function boat(now, dt) {
    const p = boatNow(now);
    if (!p) { g.boatLevel.gain.setTargetAtTime(0, now, 0.8); g.lastBoat = null; return; }
    camera.getWorldPosition(tmp);
    const d = p.distanceTo(tmp);
    setPos(g.boatPan, p);
    if (g.lastBoat && dt > 0) {
      const vr = (d - g.lastBoat) / dt;
      const k = C_SOUND / (C_SOUND + Math.max(-30, Math.min(30, vr)));
      g.saw.frequency.setTargetAtTime(BOAT.fire * k, now, 0.3);
      g.sub.frequency.setTargetAtTime(BOAT.fire / 2 * k, now, 0.3);
      g.chug.frequency.setTargetAtTime(BOAT.fire / 4 * k, now, 0.3);
    }
    g.lastBoat = d;
    const near = Math.max(0, Math.min(1, (60 - d) / 45));
    g.boatLp.frequency.setTargetAtTime(BOAT.lpFar + (BOAT.lpNear - BOAT.lpFar) * near, now, 0.5);
    g.boatLevel.gain.setTargetAtTime(BOAT.level, now, 1.5);
  }

  function geiger(now) {
    const gl = window.__room?.layers?.geiger;
    if (!gl) return;
    const i = gl.info();
    if (g.counts === null || i.soundOn) { g.counts = i.counts; return; }
    for (let n = Math.min(5, i.counts - g.counts); n > 0; n--) playClick(now + 0.005);
    g.counts = i.counts;
  }

  let agentDone = 0;
  document.addEventListener('room:agent-done', () => {
    if (!on || !ctx || ctx.state !== 'running' || !g) return;
    const t = ctx.currentTime + 0.005;
    playClick(t); playClick(t + 0.075);
    agentDone++;
  });

  const DRIVE = { hum: 0.10, humHz: 50, humS: 1.9, clack: 0.9, steps: 9, stepGap: 0.11, step: 0.5 };
  const drivePos = world('pr_1541', null);
  let drivePlays = 0;
  addEventListener('room:drive', () => {
    if (!on || !ctx || ctx.state !== 'running' || !g || !drivePos) return;
    const t = ctx.currentTime + 0.01, out = panner(drivePos, 0.6, 1);
    out.connect(g.master);
    const burst = (when, level, hp, ms) => {
      const n = Math.floor(ctx.sampleRate * ms / 1000), b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = (rand() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * ms / 4000));
      const src = ctx.createBufferSource(); src.buffer = b;
      src.connect(filt('highpass', hp)).connect(gain(level)).connect(out); src.start(when);
    };
    burst(t, DRIVE.clack, 600, 18);
    const o = ctx.createOscillator(), og = gain(0);
    o.type = 'sawtooth'; o.frequency.value = DRIVE.humHz;
    o.connect(filt('lowpass', 240)).connect(og).connect(out);
    og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(DRIVE.hum, t + 0.25);
    og.gain.setValueAtTime(DRIVE.hum, t + DRIVE.humS - 0.3); og.gain.linearRampToValueAtTime(0, t + DRIVE.humS);
    o.start(t); o.stop(t + DRIVE.humS + 0.05);
    for (let k = 0; k < DRIVE.steps; k++) burst(t + 0.7 + k * DRIVE.stepGap * (0.8 + 0.4 * rand()), DRIVE.step, 1200, 6);
    drivePlays++;
  });

  let lastNow = 0;
  return {
    name: 'audio',
    update() {
      if (!on || !ctx || ctx.state !== 'running') return false;
      const now = ctx.currentTime, dt = now - lastNow;
      lastNow = now;
      listener();
      rain(now);
      boat(now, dt);
      geiger(now);
      return false;
    },
    api: {
      on: () => setSound(true, false),
      off: () => setSound(false, false),
      trackInput: () => (g ? { ctx, input: g.track } : null),
      peak() { if (!g) return 0; g.analyser.getFloatTimeDomainData(g.buf); let p = 0; for (const v of g.buf) p = Math.max(p, Math.abs(v)); return p; },
      rms(bus) {
        const a = bus ? g?.meters[bus] : g?.analyser;
        if (!a) return 0;
        a.getFloatTimeDomainData(g.buf);
        let s = 0; for (const v of g.buf) s += v * v;
        return Math.sqrt(s / g.buf.length);
      },
      info: () => ({ state: ctx?.state ?? 'none', on, wanted, panes: panes.length, geiger: !!geigerPos,
        boat: boatNode ? 'cz_boat' : 'procedural', clicks: g?.clicks ?? 0, ducked: !!g?.ducked, buildMs: Math.round(buildMs), jobMs: Math.round(jobMs), limDb: g ? +g.lim.reduction.toFixed(2) : 0,
        boatGain: g ? +g.boatLevel.gain.value.toFixed(3) : 0, agentDone, drivePlays }),
    },
  };
}
