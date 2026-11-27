import { noPick, splitPart } from './layer-common.js';
import { C } from './content.js';

const NODE = 'pr_pipe', VIEW = 'pipe';
const TURN_S = 48;
const FPS = 30;
const HOME_MS = 900;
const INK = '#17120e';
const HAND = '"Kalam", "Segoe Print", "Bradley Hand", cursive';
const PX_M = 6000;
const FAR = 3.6, NEAR = 2.6;

export default function mount(live) {
  const { THREE, byName } = live;
  const node = byName(NODE), U = node?.userData;
  if (!U?.pipe_pivot || !U.pipe_box || !U.pipe_open_center) return null;
  let mesh = null;
  node.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
  if (!mesh) return null;
  const card = new Map(C.cards).get(NODE);
  const line = String(card?.title ?? '').trim();

  node.updateMatrixWorld(true);
  const toNode = new THREE.Matrix4().copy(node.matrixWorld).invert().multiply(mesh.matrixWorld);
  const toMesh = toNode.clone().invert();
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

  const box = new THREE.Box3(V(U.pipe_box[0]), V(U.pipe_box[1])), q = new THREE.Vector3();
  const inBox = (v) => box.containsPoint(q.copy(v).applyMatrix4(toNode));
  let pipe = null, part = null, whole = null, kept = null;
  const noTurn = () => !!live.gate || !!live.reduceMotion?.matches;
  function split() {
    if (pipe || noTurn()) return;
    if (!part) {
      whole = mesh.geometry.index;
      part = splitPart(mesh, (a, b, c) => inBox(a) && inBox(b) && inBox(c), V(U.pipe_pivot).applyMatrix4(toMesh), 'pr_pipe_pipe');
      if (!part) return;
      noPick(part);
      kept = mesh.geometry.index;
    } else { mesh.geometry.setIndex(kept); mesh.add(part); }
    pipe = part;
  }
  function join() {
    if (!pipe) return;
    pipe.rotation.y = 0;
    mesh.remove(pipe);
    mesh.geometry.setIndex(whole);
    pipe = null;
  }

  const n = V(U.pipe_open_normal).normalize();
  const face = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const opening = new THREE.Mesh(new THREE.PlaneGeometry(U.pipe_open_size[0], U.pipe_open_size[1]), mesh.material);
  opening.name = 'pr_pipe_opening';
  opening.visible = false;
  opening.quaternion.copy(face);
  opening.position.copy(V(U.pipe_open_center));
  node.add(opening);

  const [tw, th] = U.pipe_text_size;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(tw * PX_M); canvas.height = Math.round(th * PX_M);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = Math.min(4, live.renderer.capabilities.getMaxAnisotropy());
  const text = noPick(new THREE.Mesh(new THREE.PlaneGeometry(tw, th), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })));
  text.name = 'pr_pipe_line';
  text.quaternion.copy(face);
  text.position.copy(V(U.pipe_text_center));
  text.visible = false;
  node.add(text);
  let font = 'pending', drawn = '';
  function draw() {
    const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    let px = H * 0.62;
    g.font = `${px}px ${HAND}`;
    px *= Math.min(1, (W * 0.96) / g.measureText(line).width);
    g.font = `${px}px ${HAND}`;
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(line, W / 2, H * 0.5 + px * 0.30);
    tex.needsUpdate = true;
    drawn = line;
    fade();
    live.render();
  }
  let at = null;
  function fade() {
    const d = live.camera.position.distanceTo(at ??= text.getWorldPosition(new THREE.Vector3()));
    const o = drawn ? Math.min(1, Math.max(0, (FAR - d) / (FAR - NEAR))) : 0;
    text.material.opacity = o;
    text.visible = o > 0;
  }
  const hand = new FontFace('Kalam', `url(${new URL('./kalam-tags.woff2', import.meta.url)})`);
  document.fonts.add(hand);
  hand.load().then(() => { font = 'loaded'; draw(); }, () => { font = 'fallback'; draw(); });

  const TAU = 2 * Math.PI, RATE = TAU / TURN_S;
  let angle = 0, last = 0, home = null;
  const set = (a) => { angle = a; pipe.rotation.y = a; };
  const rest = () => { home = null; angle = 0; join(); };
  addEventListener('room:move', (ev) => {
    if (ev.detail === VIEW) { split(); last = performance.now(); return; }
    if (!pipe) return;
    if (!angle) { rest(); return; }
    const a = ((angle % TAU) + TAU) % TAU;
    home = { from: a > Math.PI ? a - TAU : a, t0: performance.now() };
  });
  live.reduceMotion?.addEventListener?.('change', () => { if (noTurn() && pipe) { rest(); live.render(); } });

  return {
    name: 'pipe',
    update() {
      fade();
      const here = live.view() === VIEW, now = performance.now();
      if (here && !pipe && !noTurn()) { split(); last = now; }
      if (!pipe || noTurn()) return false;
      if (now - last < 1000 / FPS) return false;
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (here) { home = null; set(angle + RATE * dt); return true; }
      if (!home) { rest(); return true; }
      const k = Math.min(1, (now - home.t0) / HOME_MS), e = 1 - (1 - k) * (1 - k);
      if (k >= 1) rest(); else set(home.from * (1 - e));
      return true;
    },
    api: {
      info: () => ({ angle, t: performance.now(), turning: !!pipe && !noTurn() && live.view() === VIEW, split: !!pipe, draws: 1 + (pipe ? 1 : 0) + (text.visible ? 1 : 0), opacity: text.material.opacity, font, text: drawn, shown: text.visible,
        fontOk: document.fonts.check('40px Kalam'), period: TURN_S,
        inked: (() => { const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; let c = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 128) c++; return c; })() }),
    },
  };
}
