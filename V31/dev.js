const INTRO_KEY = 'room.intro.v1';

export default function mount({ params, state }) {
  const box = document.createElement('div');
  box.className = 'dev-panel';
  box.setAttribute('aria-label', 'Developer tools');
  box.style.cssText = 'position:fixed;z-index:30;left:max(12px, env(safe-area-inset-left, 0px));top:50%;transform:translateY(-50%);'
    + 'display:flex;flex-direction:column;gap:6px;padding:8px;border-radius:10px;background:rgba(12,10,8,.78);'
    + 'border:1px solid rgba(239,230,218,.18);font:12px/1.3 ui-monospace,Menlo,monospace;color:#efe6da';
  const reload = (mut) => { const q = new URLSearchParams(params); mut(q); location.search = q.toString().replace(/=(&|$)/g, '$1'); };
  const btn = (label, run) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
    b.style.cssText = 'font:inherit;color:inherit;background:rgba(239,230,218,.08);border:1px solid rgba(239,230,218,.25);'
      + 'border-radius:6px;padding:6px 9px;cursor:pointer;text-align:left';
    b.addEventListener('click', run);
    box.appendChild(b);
    return b;
  };
  btn('Restart flight', () => {
    try { localStorage.removeItem(INTRO_KEY); } catch {   }
    reload((q) => { q.set('intro', ''); q.delete('nointro'); q.delete('nolive'); });
  });
  const flip = (k) => reload((q) => (q.has(k) ? q.delete(k) : q.set(k, '')));
  btn(params.has('nolive') ? 'Live layers on' : 'Bake only', () => flip('nolive'));
  btn(params.has('noglass') ? 'Glass on' : 'No glass', () => flip('noglass'));
  const out = document.createElement('output');
  out.style.cssText = 'white-space:pre;opacity:.8';
  box.appendChild(out);
  document.body.appendChild(box);
  const tick = () => {
    if (!state.ready || state.mode !== 'webgl') return;
    const c = state.camera();
    const i = state.info();
    out.textContent = `view ${c.view}\n${i.calls} calls\n${(i.triangles / 1000).toFixed(1)}k tris`;
  };
  tick();
  setInterval(tick, 1000);
}
