
export const P = (() => {
  const g = 9.81, rho = 950, sigma = 0.0206, f = 80, TF = 2 / f, Td = 0.0174, RD = 0.4e-3, gammaW = 0.806, H = 0.004;
  const muA = 1.8e-5, rhoA = 1.2;
  let k = 1000;
  for (let i = 0; i < 50; i++) {
    const th = Math.tanh(k * H), w2 = (g * k + sigma * k ** 3 / rho) * th;
    const dw = (g + 3 * sigma * k * k / rho) * th + (g * k + sigma * k ** 3 / rho) * H * (1 - th * th);
    k -= (w2 - (Math.PI * f) ** 2) / dw;
  }
  const kF = k, lambdaF = 2 * Math.PI / kF;
  const m = rho * 4 / 3 * Math.PI * RD ** 3;
  const D = 0.17 * m * g * Math.sqrt(rho * RD / sigma) + 6 * Math.PI * muA * RD * (1 + rhoA * g * RD / (12 * muA * f));
  const MeW = Td / (TF * (1 - gammaW));
  const F = 2 * D / (kF * TF * MeW * MeW);
  const A = F / (m * g * kF);
  return { g, rho, sigma, f, TF, Td, RD, gammaW, H, kF, lambdaF, m, D, MeW, F, A };
})();

export const memory = (gamma) => P.Td / (P.TF * (1 - gamma));
export const gammaOf = (Me) => 1 - P.Td / (P.TF * Me);
export function speedTheory(Me) {
  const beta = P.F * P.kF * P.TF * Me * Me / P.D;
  const s = (-1 + Math.sqrt(1 + 4 * beta)) / 2;
  return s > 1 ? Math.sqrt(s * s - 1) / (P.kF * P.TF * Me) : 0;
}

export function j0(x) {
  const ax = Math.abs(x);
  if (ax <= 3) {
    const y = (x / 3) ** 2;
    return 1 + y * (-2.2499997 + y * (1.2656208 + y * (-0.3163866 + y * (0.0444479 + y * (-0.0039444 + y * 0.00021)))));
  }
  const y = 3 / ax;
  const f0 = 0.79788456 + y * (-0.00000077 + y * (-0.0055274 + y * (-0.00009512 + y * (0.00137237 + y * (-0.00072805 + y * 0.00014476)))));
  const t0 = ax - 0.78539816 + y * (-0.04166397 + y * (-0.00003954 + y * (0.00262573 + y * (-0.00054125 + y * (-0.00029333 + y * 0.00013558)))));
  return f0 * Math.cos(t0) / Math.sqrt(ax);
}
export function j1(x) {
  const ax = Math.abs(x);
  let r;
  if (ax <= 3) {
    const y = (x / 3) ** 2;
    return x * (0.5 + y * (-0.56249985 + y * (0.21093573 + y * (-0.03954289 + y * (0.00443319 + y * (-0.00031761 + y * 0.00001109))))));
  }
  const y = 3 / ax;
  const f1 = 0.79788456 + y * (0.00000156 + y * (0.01659667 + y * (0.00017105 + y * (-0.00249511 + y * (0.00113653 + y * -0.00020033)))));
  const t1 = ax - 2.35619449 + y * (0.12499612 + y * (0.0000565 + y * (-0.00637879 + y * (0.00074348 + y * (0.00079824 + y * -0.00029166)))));
  r = f1 * Math.cos(t1) / Math.sqrt(ax);
  return x < 0 ? -r : r;
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUBSTEPS = 8;
const CUT = 0.01;
const WALL_FROM = 0.85;

export const kappaOf = (omega) => P.m * omega * omega;
export function createWalker({ seed = 1, wall = 0, gamma = 0.7, kappa = 0 } = {}) {
  const cap = 1024;
  const px = new Float64Array(cap), py = new Float64Array(cap), pw = new Float64Array(cap);
  let n = 0;
  let x = 0, y = 0, vx = 0, vy = 0, k = 0, travel = 0;
  let G = gamma, K = kappa;
  let rnd = mulberry32(seed);
  const JITTER = 1e-6 * P.lambdaF;
  const wallF = 4 * P.D * 0.02;

  function reset(newSeed = seed) {
    rnd = mulberry32(newSeed);
    const th = 2 * Math.PI * rnd();
    n = 0;
    const q = Math.exp(-1 / memory(G));
    for (let w = 1; w >= CUT && n < cap; w *= q) { px[n] = 0; py[n] = 0; pw[n] = w; n++; }
    for (let i = 0, j = n - 1; i < j; i++, j--) { const t = pw[i]; pw[i] = pw[j]; pw[j] = t; }
    x = 1e-6 * P.lambdaF * Math.cos(th); y = 1e-6 * P.lambdaF * Math.sin(th); vx = 0; vy = 0; k = 0; travel = 0;
  }

  function force(tau, Me, out) {
    const e = Math.exp(-tau / (P.TF * Me));
    let fx = 0, fy = 0;
    for (let i = 0; i < n; i++) {
      const dx = x - px[i], dy = y - py[i], r = Math.hypot(dx, dy);
      if (r < 1e-12) continue;
      const s = pw[i] * j1(P.kF * r) / r;
      fx += s * dx; fy += s * dy;
    }
    fx *= P.F * e; fy *= P.F * e;
    if (K) { fx -= K * x; fy -= K * y; }
    if (wall) {
      const r = Math.hypot(x, y), r0 = WALL_FROM * wall;
      if (r > r0) { const s = -wallF * ((r - r0) / (wall - r0)) ** 2 / r; fx += s * x; fy += s * y; }
    }
    out[0] = fx; out[1] = fy;
  }

  const fo = [0, 0];
  function step() {
    const Me = memory(G), dt = P.TF / SUBSTEPS, ed = Math.exp(-P.D * dt / P.m);
    for (let s = 0; s < SUBSTEPS; s++) {
      force(s * dt, Me, fo);
      vx = vx * ed + fo[0] / P.D * (1 - ed);
      vy = vy * ed + fo[1] / P.D * (1 - ed);
      x += vx * dt; y += vy * dt;
      travel += Math.hypot(vx, vy) * dt;
    }
    const q = Math.exp(-1 / Me);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const w = pw[i] * q;
      if (w >= CUT) { px[j] = px[i]; py[j] = py[i]; pw[j] = w; j++; }
    }
    n = j;
    if (n === cap) { px.copyWithin(0, 1); py.copyWithin(0, 1); pw.copyWithin(0, 1); n--; }
    x += JITTER * (2 * rnd() - 1); y += JITTER * (2 * rnd() - 1);
    px[n] = x; py[n] = y; pw[n] = 1; n++;
    k++;
    return k;
  }

  reset(seed);
  return {
    step, reset,
    setGamma(g) { G = Math.min(0.999, Math.max(0, g)); },
    setKappa(k) { K = k; },
    get vel() { return [vx, vy]; },
    get gamma() { return G; },
    get Me() { return memory(G); },
    get impacts() { return k; },
    get pos() { return [x, y]; },
    get speed() { return Math.hypot(vx, vy); },
    get travel() { return travel; },
    get kappa() { return K; },
  };
}
