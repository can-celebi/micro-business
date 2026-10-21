// L06 · a whiteboard for the lecturer (Can, 21.10): a [ board ] button (or the W key) opens a white page to write on,
// full screen, or on the right half or the bottom half next to the slides (the slides shrink to the other half).
// Pen, mouse or touch; pen pressure makes the line thicker. The drawing stays while you close and reopen the board
// (until the page is reloaded or you press clear). Only in lecturer mode (press T in the deck), so students never see the button.
(function () {
  if (/print-pdf/.test(location.search)) return;
  const P = window.MicroPoll;
  if (!P || !P.teacher) return;

  const css = document.createElement('style');
  css.textContent = `
  .wb-open { position: fixed; left: 10px; top: 10px; z-index: 61; font: 13px "IBM Plex Mono", ui-monospace, monospace; background: #fff; color: #333; border: 1px solid #c9cfd8; border-radius: 4px; padding: 3px 10px; cursor: pointer; }
  .wb { position: fixed; z-index: 70; background: #fff; display: none; box-shadow: 0 0 0 1px #d9dde3; }
  .wb.on { display: block; }
  .wb.grid { background-image: linear-gradient(#e9edf2 1px, transparent 1px), linear-gradient(90deg, #e9edf2 1px, transparent 1px); background-size: 40px 40px; }
  .wb.nopen canvas { pointer-events: none; cursor: default; }
  .wb canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  .wb-bar { position: absolute; left: 10px; top: 10px; z-index: 2; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; font: 13px "IBM Plex Mono", ui-monospace, monospace; background: rgba(255,255,255,.92); padding: 4px; border-radius: 6px; }
  .wb-bar button { font: inherit; background: #fff; color: #333; border: 1px solid #c9cfd8; border-radius: 4px; padding: 3px 9px; cursor: pointer; }
  .wb-bar button.on { border-color: #222; background: #FFF9D0; }
  .wb-bar .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: -1px; }
  .wb-bar .sep { width: 1px; height: 20px; background: #ddd; margin: 0 4px; }`;
  document.head.appendChild(css);

  const open = document.createElement('button');
  open.className = 'wb-open'; open.type = 'button'; open.textContent = '[ board ]'; open.title = 'whiteboard (W)';
  document.body.appendChild(open);

  const wb = document.createElement('div'); wb.className = 'wb grid';   // faded grid lines by default (Can, 21.10)
  const COLS = { black: '#222', blue: '#0062C4', red: '#D9480F', green: '#1B7F3B' };
  wb.innerHTML = '<canvas></canvas><div class="wb-bar">' +
    Object.keys(COLS).map(k => `<button type="button" data-c="${k}" title="${k}"><span class="dot" style="background:${COLS[k]}"></span></button>`).join('') +
    '<button type="button" data-a="erase">eraser</button><button type="button" data-a="undo">undo</button><button type="button" data-a="clear">clear</button><span class="sep"></span>' +
    '<button type="button" data-a="pen" class="on">pen on</button><button type="button" data-a="grid" class="on">grid</button><span class="sep"></span>' +
    '<button type="button" data-m="full">full</button><button type="button" data-m="right">right half</button><button type="button" data-m="bottom">bottom half</button><span class="sep"></span>' +
    '<button type="button" data-a="close">close ✕</button></div>';
  document.body.appendChild(wb);
  const cv = wb.querySelector('canvas'), cx = cv.getContext('2d');
  const reveal = document.querySelector('.reveal');

  let mode = 'right', colour = 'black', erasing = false, cur = null;
  const strokes = [];   // {c, erase, pts: [[x, y, w]]} in screen pixels from the board's top-left corner, so a mode change keeps the drawing where it was

  function place() {
    const s = wb.style; s.left = s.top = s.right = s.bottom = ''; s.width = s.height = '';
    if (!wb.classList.contains('on')) { reveal.style.width = ''; reveal.style.height = ''; }
    else if (mode === 'full') { Object.assign(s, { left: '0', top: '0', width: '100vw', height: '100vh' }); reveal.style.width = ''; reveal.style.height = ''; }
    else if (mode === 'right') { Object.assign(s, { left: '50vw', top: '0', width: '50vw', height: '100vh' }); reveal.style.width = '50vw'; reveal.style.height = ''; }
    else { Object.assign(s, { left: '0', top: '50vh', width: '100vw', height: '50vh' }); reveal.style.height = '50vh'; reveal.style.width = ''; }
    wb.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
    if (window.Reveal && Reveal.layout) setTimeout(() => Reveal.layout(), 30);
    setTimeout(size, 40);
  }
  function size() {
    const r = wb.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (!r.width) return;
    cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
    cx.setTransform(d, 0, 0, d, 0, 0); redraw();
  }
  function seg(st, a, b, W) {
    cx.strokeStyle = st.erase ? '#fff' : COLS[st.c]; cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.lineWidth = (st.erase ? 28 : b[2]); cx.globalCompositeOperation = st.erase ? 'destination-out' : 'source-over';   // the eraser removes ink and keeps the grid
    cx.beginPath(); cx.moveTo(a[0] * W, a[1] * W); cx.lineTo(b[0] * W, b[1] * W); cx.stroke(); cx.globalCompositeOperation = 'source-over';
  }
  function redraw() {
    const W = 1; cx.clearRect(0, 0, cv.width, cv.height);
    strokes.forEach(st => { for (let i = 1; i < st.pts.length; i++) seg(st, st.pts[i - 1], st.pts[i], W); if (st.pts.length === 1) seg(st, st.pts[0], st.pts[0], W); });
  }
  const pt = e => { const r = wb.getBoundingClientRect(), p = e.pressure && e.pointerType === 'pen' ? e.pressure : 0.5; return [e.clientX - r.left, e.clientY - r.top, 1.5 + 4 * p]; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cv.setPointerCapture(e.pointerId); cur = { c: colour, erase: erasing, pts: [pt(e)] }; strokes.push(cur); redraw(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; const W = 1, a = cur.pts[cur.pts.length - 1], b = pt(e); cur.pts.push(b); seg(cur, a, b, W); });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { cur = null; }));
  ['mousedown', 'touchstart', 'touchmove', 'wheel'].forEach(ev => wb.addEventListener(ev, e => e.stopPropagation(), { passive: true }));

  wb.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { colour = b.dataset.c; erasing = false; marks(); b.blur(); });
  wb.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; place(); b.blur(); });
  wb.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; b.blur();
    if (a === 'erase') { erasing = !erasing; marks(); }
    if (a === 'undo') { strokes.pop(); redraw(); }
    if (a === 'clear') { strokes.length = 0; redraw(); }
    if (a === 'close') toggle(false);
    // Can (21.10): a plain white board without drawing (e.g. for the iPad app), and the grid on or off
    if (a === 'pen') { const off = wb.classList.toggle('nopen'); b.classList.toggle('on', !off); b.textContent = off ? 'pen off' : 'pen on'; }
    if (a === 'grid') { b.classList.toggle('on', wb.classList.toggle('grid')); }
  });
  function marks() {
    wb.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', !erasing && b.dataset.c === colour));
    wb.querySelector('[data-a="erase"]').classList.toggle('on', erasing);
  }
  function toggle(on) { wb.classList.toggle('on', on); open.textContent = on ? '[ close board ]' : '[ board ]'; place(); }
  open.onclick = () => { toggle(!wb.classList.contains('on')); open.blur(); };
  document.addEventListener('keydown', e => {
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (!typing && (e.key === 'w' || e.key === 'W') && !e.ctrlKey && !e.metaKey && !e.altKey) { toggle(!wb.classList.contains('on')); e.preventDefault(); }
  }, true);
  window.addEventListener('resize', () => { if (wb.classList.contains('on')) size(); });
  marks();
})();
