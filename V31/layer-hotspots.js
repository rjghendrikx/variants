
import { rivulet } from './layer-rain.js';

export const CAPTIONS = [
  ['c64', { kicker: 'Where it started', title: 'Commodore 64',
    body: 'His first programs, in BASIC. The room you are looking at is a program too: Python driving Blender, one module per object.' }],
  ['c64_disks', { kicker: 'Where it started', title: 'Commodore 64',
    body: 'His first programs, in BASIC. The room you are looking at is a program too: Python driving Blender, one module per object. Its disks are in the box beside it.' }],
  ['ti83', { kicker: 'Then', title: 'TI-83',
    body: 'The graphing calculator he learned to program on, one 96 × 64 pixel screen at a time.' }],
  ['optics', { kicker: 'The lab years', title: 'Quantum eraser, classical version',
    body: 'Crossed polarizers on the two slits mark the path, so no fringes. Drop the polarizer into the beam at 45° and they come back. The quantum version needs entangled photons; this one is plain polarization optics.',
    more: { href: 'https://doi.org/10.1038/srep20834', label: 'His 2D spectroscopy paper' } }],
  ['cloud_chamber', { kicker: 'Cosmic rays · live', title: 'Cloud chamber',
    body: 'Dry ice, isopropanol, a cold black plate. At sea level a cosmic-ray muon crosses each square centimetre about once a minute: several a second through this plate. The vapour shows the ones it catches: steep ones as short stubs, shallow ones as long lines, the odd fat alpha and a curling beta. The flux is real, the tracks are simulated.' }],
  ['geiger', { kicker: 'Background · live', title: 'Geiger counter',
    body: 'An SBM-20 tube at background: about 20 counts a minute, Poisson-timed. The rate is real, the counts are simulated. Flip the toggle to hear it.' }],
  ['scope', { kicker: 'Pulses · live', title: 'Oscilloscope',
    body: 'Its probe is hooked onto the Geiger counter’s test point. Each count is one 0.5 ms sweep at 50 µs/div: a negative spike that recovers in ~50 µs, a P31 glow gone in ~50 ms. One instrument reads the other.' }],
  ['pr_notebook', { kicker: 'How sure', title: 'Lab notebook',
    body: 'Every line ends in one of three labels: tested, preference, hypothesis. Two 12 V adapters on a handheld scope, on battery, no load: 8 to 13 mV peak to peak, the stock one a little lower. Tested. A fault that felt intermittent happened on every cold open after an album ran out; the gap was in what he had watched.' }],
  ['projector', { kicker: 'An object shows its own measurement', title: 'Structured light',
    body: 'Gray-code stripes label every point with a projector column and row; the camera beside the lens reads each label and triangulates the depth. Then the scanned object becomes its own point cloud.' }],
  ['amp', { kicker: 'Listening corner', title: 'Luxman L-308',
    body: 'His own amplifier, the last box in a chain he can name from library to cone: Roon holds the files, HQPlayer upsamples them to DSD256, a streamer hands them to the NEO iDSD 2, the Luxman drives the B&Ws. The real one has no meters, so neither does this one.' }],
  ['pr_records', { kicker: 'Listening corner', title: 'The records',
    body: 'The library end of the chain. Know a chain well enough and you stop hearing it; then there is only the music.' }],
  ['pr_records_sleeves', 'pr_records'],
  ['pr_xdj', { kicker: 'Listening corner', title: 'The decks',
    body: 'Two decks and a two-channel mixer. Press play and the facades across the water play along: the left fader drives the offices, the right the canal houses, the crossfader balances the two, and a low cut drops them into a breakdown. What you hear is a house loop synthesised in the browser at 122 BPM.' }],
  ['pr_djm450', 'pr_xdj'],
  ['pr_dm603', { kicker: 'Listening corner', title: 'B&W DM603',
    body: 'Three-way floorstanders with the yellow Kevlar midrange B&W is known for. Around 90 dB sensitive: an easy load for the Luxman.' }],
  ['pr_ifi', { kicker: 'Listening corner', title: 'iFi NEO iDSD 2',
    body: 'The DAC. Music reaches it upsampled to DSD256, and the display reads 11M when it locks.' }],
  ['pr_hd660', { kicker: 'Listening corner', title: 'Sennheiser HD 660S2',
    body: 'Open-back, 300 Ω, driven straight from the NEO iDSD 2. The quiet half of the chain.' }],
  ['bookshelf', { kicker: 'Reading', title: 'The shelf',
    body: 'McGilchrist, Abram, Koch, Kastrup, Faggin, Hoffman, Bohm, Lane, Feynman, Hawking, Wolfram, Hertog. His definition: consciousness turns raw information into felt, meaningful experience, not reducible to syntax. AI trains on the last, most compressed layer. The map is not the territory.' }],
  ['cz_bookcase', 'bookshelf'],
  ['pr_brain', { kicker: 'Reading', title: 'Two hemispheres',
    body: 'McGilchrist’s claim is not left-logic, right-creativity: both halves do everything, and what differs is the attention. The narrow look takes a thing apart, and it only means something once it is back in the whole; that is how this room moves. Agents are the emissary, brilliant and fast on the most compressed layer. The human stays the master and holds the strategy.' }],
  ['pr_ledmatrix', { kicker: 'Light', title: 'LED matrix',
    body: 'A grid of squares, each with a live alpha: the core of his Metal visuals engine, the successor to an old Quartz Composer workflow for TVs and LED walls.' }],
  ['ledmatrix_rule30', { kicker: 'Light', title: 'LED matrix',
    body: 'A grid of squares, each with a live alpha: the core of his Metal visuals engine, the successor to an old Quartz Composer workflow for TVs and LED walls. Tonight it shows rule 30: one simple rule, and no shortcut to what comes next.' }],
  ['pr_tape', { kicker: 'Running', title: 'Rule 30, row by row',
    body: 'Rule 30, drawn as it is computed: each row from the row above, nothing else. One black cell to start, one row a step since you came in. No formula skips ahead: to see row n, the rows before it have to be drawn. The red lines mark the only past the newest middle cell can depend on.' }],
  ['pr_midi', { kicker: 'Creative corner', title: 'Pads and faders',
    body: 'What his hands are on when the visuals run.' }],
  ['pr_mapkit', { kicker: 'Creative corner', title: 'Mapping kit',
    body: 'A small projector and a card model of a house front: where a show for a building starts.' }],
  ['shelf_titles', { kicker: 'Reading', title: 'The books',
    body: 'The books on the cabinet under the window, and one open on the desk: McGilchrist, Abram, Koch, Kastrup, Faggin, Hoffman, Bohm, Lane, Feynman, Hawking, Wolfram, Hertog. His definition: consciousness turns raw information into felt, meaningful experience, not reducible to syntax. AI trains on the last, most compressed layer. The map is not the territory.' }],
  ['pr_books', 'shelf_titles'],
  ['pr_planaria', { kicker: 'Specimen', title: 'Planarian, two heads',
    body: 'Michael Levin’s lab briefly disturbed a cut flatworm’s bioelectric signalling, and it regrew with two heads. Cut again, untreated, it grew two heads again.' }],
  ['pr_mobius', { kicker: 'Specimen', title: 'Möbius band',
    body: 'One side, one edge: inside and outside are one surface.' }],
  ['pr_flask', { kicker: 'Specimen', title: 'Light-harvesting complex',
    body: 'Photosynthesis under glass. At the Vrije Universiteit he built the software for a 2D electronic spectroscopy setup that revealed quantum effects in photosynthetic systems: dark states in the light-harvesting complex LH2 (Scientific Reports, 2016).' }],
  ['pr_1541', { kicker: 'On the desk', title: 'Disk drive',
    body: 'The C64 reads the disks through this slot. Type LOAD"$",8 and then LIST.' }],
  ['pr_floppybox', { kicker: 'The archive', title: 'Twelve disks',
    body: 'His working life on twelve disks, oldest at the back: physics first, then data science, then agents. The C64 lists them: LOAD"$",8.' }],
  ['pr_nr200', { kicker: 'On the desk', title: 'The small PC',
    body: 'His own build: a small case with the graphics card standing behind its open side. The local models run here.' }],
  ['pr_3090', { kicker: 'His own · local inference', title: 'RTX 3090',
    body: 'A 27-billion-parameter model on one 24 GB card, driving an agent harness. Speculative decoding: +44%, 30.0 to 43.2 tokens a second, measured before believed.' }],
  ['pr_terminal', { kicker: 'Agents · the human still pedals', title: 'The laptop',
    body: 'Measured on his own setup over 16 weeks: the model was at work for 29 of the 89 hours a session was live. The rest of the time was his.' }],
  ['pr_poster_action', { kicker: 'How the intro flew', title: 'The principle of least action',
    body: 'Every path between two points gets one number, the action S = ∫L dt with L = T − V. Vary the path, q → q + εη with η zero at both ends, and ask that S does not change to first order, δS = 0. Integrate by parts: the boundary term vanishes and the Euler–Lagrange equation is left, d/dt ∂L/∂q̇ − ∂L/∂q = 0, which for L = ½mq̇² − V is F = ma. With p = ∂L/∂q̇ and H = Σ pq̇ − L, write S = ∫(Σ pq̇ − H) dt and vary q and p independently: integrating the p δq̇ term by parts gives Hamilton\'s equations, q̇ = ∂H/∂p and ṗ = −∂H/∂q. Why stationary? Feynman: every path counts, with a phase e^{iS/ħ}; near δS = 0 the phases agree and add up, elsewhere they cancel. The camera that brought you in rode such a path: a bead on a wire along its route, through an invented landscape. After a lecture by Erik Verlinde. Sources: Goldstein, Poole & Safko, Classical Mechanics, 3rd ed., ch. 2 and §8.5; Feynman Lectures on Physics, Vol. II, ch. 19; Thornton & Marion, Classical Dynamics, 5th ed., ch. 7; Cline, Variational Principles in Classical Mechanics, ch. 9.',
    more: { href: 'https://arxiv.org/abs/1001.0785', label: 'Verlinde: F = ma from entropy' } }],
  ['raindrop', { kicker: 'At the window', title: 'A drop on the glass',
    body: 'Watch a drop run down the glass. David Abram, in a talk on sensing: “We cannot even predict just how that drop is going to fall”; science calls it chaotic, but “a much better word for what they mean is wild.” An unpublished essay of Ruud\'s own opens on this drop; it lies in print on the sill. The thinking behind it is done outside, on long walks through forests and along the water.' }],
  ['pr_manuscript', 'raindrop'],
];

const TAP_PX = 6, TAP_MS = 600;
const HIDE_MS = 160;

const CSS = `
/* the nav itself is not clipped: the card moves into it on keyboard open and must stay visible */
.hs-nav { position: fixed; left: 0; top: 0; width: 0; height: 0; }
.hs-nav ul { list-style: none; margin: 0; padding: 0; }
.hs-sr, .hs-nav button { position: absolute; padding: 0; margin: -1px; border: 0; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.hs-dot { position: fixed; left: 0; top: 0; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%;
  border: 1.5px solid var(--accent, #e3a35b); background: rgba(227, 163, 91, .18); pointer-events: none;
  box-shadow: 0 0 0 3px rgba(20, 17, 15, .35); opacity: 0; transition: opacity .14s ease; z-index: 3; }
.hs-dot.on { opacity: 1; }
.hs-dot.key { width: 22px; height: 22px; margin: -11px 0 0 -11px; border-width: 2px; }
.hs-card { position: fixed; left: 0; top: 0; z-index: 4; box-sizing: border-box; width: max-content; max-width: min(288px, calc(100vw - 32px));
  padding: 11px 14px 12px; border-radius: 10px; color: var(--ink, #efe6da);
  background: rgba(20, 17, 15, .82); border: 1px solid rgba(239, 230, 218, .14);
  -webkit-backdrop-filter: blur(10px) saturate(1.2); backdrop-filter: blur(10px) saturate(1.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35); opacity: 0; transform: translateY(3px);
  transition: opacity .14s ease, transform .14s ease; pointer-events: none; }
.hs-card.on { opacity: 1; transform: none; }
.hs-card.on.pin { pointer-events: auto; }   /* a hover card never blocks the pointer; a pinned one takes clicks */
.hs-card[hidden], .hs-card [hidden] { display: none; }
.hs-kicker { margin: 0 0 3px; font-size: 10.5px; line-height: 1.2; letter-spacing: .12em; text-transform: uppercase;
  color: var(--accent, #e3a35b); font-weight: 600; }
.hs-title { margin: 0; font: 600 15px/1.25 "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  letter-spacing: .005em; font-feature-settings: "kern", "liga", "onum"; }
.hs-body { margin: 5px 0 0; font-size: 13px; line-height: 1.45; color: var(--muted, #b9ab98); text-wrap: pretty;
  hanging-punctuation: first; font-feature-settings: "kern"; }
.hs-more { display: inline-block; margin-top: 7px; font-size: 12.5px; color: var(--ink, #efe6da); text-decoration: none;
  border-bottom: 1px solid rgba(227, 163, 91, .55); padding-bottom: 1px; }
.hs-more:hover { border-bottom-color: var(--accent, #e3a35b); }
.hs-more::after { content: " \\2197"; color: var(--accent, #e3a35b); }
.hs-more:focus-visible { outline: 2px solid var(--accent, #e3a35b); outline-offset: 2px; border-radius: 2px; }
.hs-card.peek .hs-body, .hs-card.peek .hs-more { display: none; }
.hs-card.peek { padding: 7px 11px 8px; }
.gate .hs-card, .gate .hs-dot { display: none; }
@media (prefers-reduced-motion: reduce) { .hs-card, .hs-dot { transition: none; transform: none; } }
`;

export default function mount(live) {
  const { THREE, camera, renderer, byName, scene } = live;
  if (live.gate) return null;
  const canvas = renderer.domElement;
  const isBaked = (o) => o.isMesh && o.raycast === THREE.Mesh.prototype.raycast && !o.material?.isShaderMaterial;

  const table = new Map(CAPTIONS);
  const spots = [];
  const owner = new Map();
  const glass = byName('cz_canal_night');
  function rainSpot(text) {
    if (!glass || !live.heroTarget) return null;
    glass.updateWorldMatrix(true, false);
    const rv = rivulet(glass.userData, glass.worldToLocal(live.heroTarget.clone()));
    if (!rv) return null;
    const h = rv.y1 - rv.y0;
    const box = new THREE.Box3(new THREE.Vector3(rv.x - 0.11, rv.y0 + h / 3, rv.z - 0.02), new THREE.Vector3(rv.x + 0.11, rv.y1 - h / 3, rv.z + 0.02))
      .applyMatrix4(glass.matrixWorld);
    const size = box.getSize(new THREE.Vector3());
    return { name: 'raindrop', ...text, node: null, meshes: [], box, volume: size.x * size.y * size.z,
      anchor: new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2) };
  }
  for (const [name, entry] of CAPTIONS) {
    if (name === 'raindrop') { const s = rainSpot(entry); if (s) spots.push(s); continue; }
    const node = byName(name);
    if (!node) continue;
    const own = node.userData?.card;
    const pick = own && table.has(own) ? table.get(own) : entry;
    const text = typeof pick === 'string' ? table.get(pick) : pick;
    const meshes = [];
    node.traverse((o) => { if (isBaked(o)) meshes.push(o); });
    if (!meshes.length) continue;
    node.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    for (const m of meshes) {
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));
    }
    const size = box.getSize(new THREE.Vector3());
    const spot = { name, ...text, alias: typeof entry === 'string' ? entry : null, node, meshes, box, volume: size.x * size.y * size.z,
      anchor: new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2) };
    for (const m of meshes) owner.set(m, spot);
    spots.push(spot);
  }
  if (!spots.length) return null;

  document.querySelector('.hs-static')?.remove();
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const nav = document.createElement('nav');
  nav.className = 'hs-nav';
  nav.setAttribute('aria-label', 'Objects in the room');
  const ul = document.createElement('ul');
  nav.appendChild(ul);
  const card = document.createElement('div');
  card.className = 'hs-card';
  card.id = 'hs-card';
  card.hidden = true;
  card.setAttribute('role', 'group');
  card.innerHTML = '<p class="hs-kicker"></p><h2 class="hs-title" id="hs-card-title"></h2><p class="hs-body"></p><a class="hs-more" target="_blank" rel="noopener"></a>';
  card.setAttribute('aria-labelledby', 'hs-card-title');
  const [kickerEl, titleEl, bodyEl, moreEl] = card.children;
  const dot = document.createElement('div');
  dot.className = 'hs-dot';
  dot.setAttribute('aria-hidden', 'true');
  for (const s of spots) {
    if (s.alias && spots.some((o) => o.name === s.alias)) continue;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.title;
    b.dataset.hotspot = s.name;
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'hs-card');
    const d = document.createElement('span');
    d.className = 'hs-sr';
    d.id = `hs-desc-${s.name}`;
    d.textContent = s.body + (s.more ? ` Link: ${s.more.label}.` : '');
    b.setAttribute('aria-describedby', d.id);
    li.append(b, d);
    ul.appendChild(li);
    s.button = b;
    s.li = li;
  }
  for (const s of spots) if (!s.button) { const o = spots.find((x) => x.name === s.alias); s.button = o.button; s.li = o.li; }
  document.body.append(nav, dot, card);

  let open = null, mode = null, hideAt = 0, fadeIn = null, frameNo = 0;
  const last = { x: NaN, y: NaN, vis: null };
  const v = new THREE.Vector3();

  function show(spot, how) {
    hideAt = 0;
    if (open && open !== spot) open.button.setAttribute('aria-expanded', 'false');
    const changed = open !== spot;
    open = spot; mode = how;
    if (changed) {
      kickerEl.textContent = spot.kicker ?? '';
      kickerEl.hidden = !spot.kicker;
      titleEl.textContent = spot.title;
      bodyEl.textContent = spot.body;
      moreEl.hidden = !spot.more;
      if (spot.more) { moreEl.href = spot.more.href; moreEl.textContent = spot.more.label; }
    }
    card.classList.toggle('peek', how === 'peek');
    card.classList.toggle('pin', how === 'pinned' || how === 'key');
    dot.classList.toggle('key', how === 'peek' || how === 'key');
    spot.button.setAttribute('aria-expanded', String(how !== 'peek'));
    if (how === 'key' || how === 'peek') { if (card.parentNode !== spot.li) spot.li.appendChild(card); }
    else if (card.parentNode !== document.body) document.body.appendChild(card);
    card.hidden = false;
    if (how === 'pinned' || how === 'key') dispatchEvent(new CustomEvent('room:pick', { detail: spot.name }));
    last.x = NaN;
    fadeIn = { spot, at: frameNo };
  }

  function hide() {
    hideAt = 0;
    if (!open) return;
    open.button.setAttribute('aria-expanded', 'false');
    open = null; mode = null;
    card.classList.remove('on');
    dot.classList.remove('on', 'key');
    card.hidden = true;
  }
  const hideSoon = () => { hideAt = performance.now() + HIDE_MS; };

  let CR = null, RB = null;
  addEventListener('resize', () => { CR = null; });
  const canvasBox = () => (CR ??= canvas.getBoundingClientRect());
  const boxes = () => ({ cap: document.querySelector('.caption')?.getBoundingClientRect(),
    views: document.querySelector('.views')?.getBoundingClientRect(), w: card.offsetWidth, h: card.offsetHeight,
    kase: document.querySelector('.case:not(:empty)')?.getBoundingClientRect() });
  const rc = new THREE.Vector3();
  function rectOf(box, from = 0) {
    const r = canvasBox(), out = [Infinity, Infinity, -Infinity, -Infinity];
    const y0 = box.min.y + from * (box.max.y - box.min.y);
    for (let i = 0; i < 8; i++) {
      rc.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : y0, i & 4 ? box.max.z : box.min.z).project(camera);
      if (rc.z > 1) return null;
      const x = r.left + (rc.x + 1) / 2 * r.width, y = r.top + (1 - rc.y) / 2 * r.height;
      out[0] = Math.min(out[0], x); out[1] = Math.min(out[1], y); out[2] = Math.max(out[2], x); out[3] = Math.max(out[3], y);
    }
    return [Math.max(out[0], 0), Math.max(out[1], 0), Math.min(out[2], innerWidth), Math.min(out[3], innerHeight)];
  }
  const LUM_DIV = 8, LUM_MS = 400;
  let lum = null;
  function lumAt() {
    const key = camera.matrixWorld.elements.map((e) => e.toFixed(3)).join() + innerWidth + 'x' + innerHeight;
    if (lum && (lum.key === key || performance.now() - lum.t < LUM_MS)) return lum;
    const w = Math.max(1, Math.round(innerWidth / LUM_DIV)), h = Math.max(1, Math.round(innerHeight / LUM_DIV));
    const rt = new THREE.WebGLRenderTarget(w, h), px = new Uint8Array(w * h * 4);
    renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null);
    renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    rt.dispose();
    const sum = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = 4 * ((h - 1 - y) * w + x), l = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
      sum[(y + 1) * (w + 1) + x + 1] = l + sum[y * (w + 1) + x + 1] + sum[(y + 1) * (w + 1) + x] - sum[y * (w + 1) + x];
    }
    lum = { key, w, h, sum, t: performance.now() };
    return lum;
  }
  function lumOf(L, [a, b, c, d]) {
    const cl = (v, n) => Math.min(n, Math.max(0, Math.round(v / LUM_DIV)));
    const x0 = cl(a, L.w), x1 = cl(c, L.w), y0 = cl(b, L.h), y1 = cl(d, L.h), W1 = L.w + 1;
    const n = (x1 - x0) * (y1 - y0);
    return n > 0 ? (L.sum[y1 * W1 + x1] - L.sum[y0 * W1 + x1] - L.sum[y1 * W1 + x0] + L.sum[y0 * W1 + x0]) / n : 0;
  }
  function position() {
    if (!open) return;
    const r = canvasBox();
    v.copy(open.anchor).project(camera);
    const behind = v.z > 1;
    let x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
    const vis = !behind && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (Math.abs(x - last.x) < 0.5 && Math.abs(y - last.y) < 0.5 && vis === last.vis) return;
    last.x = x; last.y = y; last.vis = vis;
    const W = innerWidth, H = innerHeight, g = 16;
    let top = g, bottom = H - g;
    const { cap, views, w, h, kase } = RB ?? boxes();
    RB = null;
    if (cap && cap.top < H / 2) top = Math.max(top, cap.bottom + 8);
    if (views && views.height) bottom = Math.min(bottom, views.top - 8);
    const R0 = rectOf(open.box), inFrame = R0 && R0[2] - R0[0] >= 8 && R0[3] - R0[1] >= 8;
    if (!vis) { x = inFrame ? (R0[0] + R0[2]) / 2 : W / 2; y = inFrame ? R0[1] : bottom; }
    const fit = ([cx, cy]) => [Math.min(Math.max(cx, g), W - g - w), Math.min(Math.max(cy, top), Math.max(top, bottom - h))];
    let [cx, cy] = fit([x - w / 2, y - 14 - h < top ? y + 14 : y - 14 - h]);
    const docked = !live.inRoom?.();
    if (inFrame || docked) {
      const R = R0 ?? [x, y, x, y], L = lumAt(), my = (R[1] + R[3]) / 2;
      const ov = ([a, b], q) => q ? Math.max(0, Math.min(a + w, q[2]) - Math.max(a, q[0])) * Math.max(0, Math.min(b + h, q[3]) - Math.max(b, q[1])) / (w * h) : 0;
      const K = kase && [kase.left - 8, kase.top - 8, kase.right + 8, kase.bottom + 8];
      const over = (f) => ov(f, R);
      const others = docked ? spots.filter((t) => t !== open).map((t) => rectOf(t.box)).filter((q) => q && q[2] - q[0] >= 8 && q[3] - q[1] >= 8) : [];
      const crowd = (f) => others.reduce((m, q) => Math.max(m, ov(f, q)), 0);
      let best = null, least = Infinity;
      const cands = docked ? [[g, top], [g, bottom - h], [W - g - w, top], [W - g - w, bottom - h]]
        : [[x - w / 2, R[1] - 14 - h], [x - w / 2, R[3] + 14], [R[2] + 14, my - h / 2], [R[0] - 14 - w, my - h / 2]];
      if (!vis && !docked) cands.push([W / 2 - w / 2, bottom - h]);
      for (const c of cands) {
        const f = fit(c), score = 2 * over(f) + 4 * ov(f, K) + crowd(f) + lumOf(L, [f[0], f[1], f[0] + w, f[1] + h]);
        if (score < least) { least = score; best = f; }
      }
      [cx, cy] = best;
    }
    card.style.transform = '';
    card.style.left = `${Math.round(cx)}px`;
    card.style.top = `${Math.round(cy)}px`;
    dot.style.display = vis ? '' : 'none';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
  }

  const hitPt = new THREE.Vector3();
  function spotOf({ hit, ray }) {
    for (let o = hit?.object; o; o = o.parent) if (owner.has(o)) return owner.get(o);
    const cands = spots.filter((s) => ray.intersectBox(s.box, hitPt) && (!hit || ray.origin.distanceTo(hitPt) < hit.distance));
    return cands.length ? cands.reduce((a, b) => (b.volume < a.volume ? b : a)) : null;
  }
  const spotAt = (clientX, clientY) => spotOf(live.resolveAt(clientX, clientY));

  const leads = (s) => { const id = live.hot?.(s.node); return !!id && (id !== live.view() || live.cardOf?.(id) === s.name); };
  let down = null;
  function hover(it, x, y, r) {
    if (mode === 'pinned' || mode === 'key') return;
    const s = spotOf(r);
    if (s && !leads(s)) show(s, 'hover'); else if (mode === 'hover') hideSoon();
  }
  canvas.addEventListener('pointerleave', () => { if (mode === 'hover') hideSoon(); });
  canvas.addEventListener('pointerdown', (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (ev) => {
    if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > TAP_PX || performance.now() - down.t > TAP_MS) { down = null; return; }
    down = null;
    const go = window.__room?.intent?.(ev.clientX, ev.clientY, ev.pointerType === 'touch')?.kind;
    if (go === 'go' || go === 'back') { hide(); return; }
    const s = spotAt(ev.clientX, ev.clientY);
    if (s && !leads(s)) show(s, 'pinned'); else hide();
  });
  card.addEventListener('click', (ev) => { if (mode === 'pinned' && !ev.target.closest('a')) hide(); });

  ul.addEventListener('focusin', (ev) => {
    const name = ev.target.dataset?.hotspot;
    const s = name && spots.find((x) => x.name === name);
    if (s && !(open === s && mode === 'key')) show(s, 'peek');
  });
  ul.addEventListener('focusout', (ev) => {
    if (!nav.contains(ev.relatedTarget) && (mode === 'peek' || mode === 'key')) hide();
  });
  ul.addEventListener('click', (ev) => {
    const name = ev.target.closest('button')?.dataset.hotspot;
    const s = name && spots.find((x) => x.name === name);
    if (!s) return;
    const to = live.hot?.(s.node);
    if (to && leads(s)) { hide(); live.go?.(to); return; }
    if (open === s && mode === 'key') show(s, 'peek'); else show(s, 'key');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !open) return;
    const s = open;
    if (mode === 'key' && document.activeElement && nav.contains(document.activeElement)) {
      s.button.focus();
      show(s, 'peek');
    } else hide();
  });
  addEventListener('resize', () => { last.x = NaN; position(); });

  return {
    name: 'hotspots',
    hover,
    read() { RB = open ? boxes() : null; },
    update() {
      frameNo++;
      if (hideAt && performance.now() >= hideAt) hide();
      if (fadeIn && frameNo > fadeIn.at) { if (open === fadeIn.spot) { card.classList.add('on'); dot.classList.add('on'); } fadeIn = null; }
      if (open) position();
      return false;
    },
    onView() { if (mode === 'hover') hide(); },
    api: {
      list: () => spots.map((s) => s.name),
      caption: (name) => { const s = spots.find((x) => x.name === name); return s && { kicker: s.kicker, title: s.title, body: s.body, more: s.more }; },
      open: (name) => { const s = spots.find((x) => x.name === name); if (s) show(s, 'pinned'); return !!s; },
      close: hide,
      placed: () => !!open && !Number.isNaN(last.x) && !fadeIn,
      state: () => ({ open: open?.name ?? null, mode }),
      hoverable: (name) => { const s = spots.find((x) => x.name === name); return !!s && !leads(s); },
      anchors: () => {
        const r = canvas.getBoundingClientRect();
        const px = (p) => { v.copy(p).project(camera); return v.z > 1 ? null
          : { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; };
        return Object.fromEntries(spots.map((s) => [s.name, { anchor: px(s.anchor), center: px(s.box.getCenter(new THREE.Vector3())) }]));
      },
      boxes: () => Object.fromEntries(spots.map((s) => [s.name, s.box.getSize(new THREE.Vector3()).toArray().map((n) => +n.toFixed(3))])),
      rect: (name) => {
        const s = spots.find((x) => x.name === name), r = canvas.getBoundingClientRect();
        if (!s) return null;
        const out = [Infinity, Infinity, -Infinity, -Infinity];
        for (let i = 0; i < 8; i++) {
          v.set(i & 1 ? s.box.max.x : s.box.min.x, i & 2 ? s.box.max.y : s.box.min.y, i & 4 ? s.box.max.z : s.box.min.z).project(camera);
          if (v.z > 1) return null;
          const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
          out[0] = Math.min(out[0], x); out[1] = Math.min(out[1], y); out[2] = Math.max(out[2], x); out[3] = Math.max(out[3], y);
        }
        return out.map(Math.round);
      },
    },
  };
}
