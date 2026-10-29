// Ink on the slide itself (Can, 28.10: "instead of a board can we make the slide the board itself and have the board button
// to pick color … and i can make the pen active or not … more sensitivity to touch and also thinner lines";
// "I want to be able to draw on the slide anywhere i want … pen on or off instead of the board button").
// Lecturer only (teacher mode, T + code). A [ ✎ pen ] button bottom-left: pen ON = a transparent sheet over the whole
// slide takes the pointer (draw anywhere, over text, graphs and widgets); pen OFF = the sheet lets every click through,
// so slides, widgets and polls work as before; the ink stays visible. Toolbar while on: 4 colours, thin / medium,
// eraser (wipes ink, never the slide), undo, clear this slide.
// Input: Pointer Events with getCoalescedEvents() (every sample the screen delivers, so fast strokes keep their shape),
// pen pressure when the device reports it, no smoothing (each segment is drawn at once), a tap leaves a dot.
// touch-action: none only while the pen is on. Ink is kept per slide (h/v index) in slide coordinates, so it stays put when
// the window or the slide scale changes; saved on this device only (localStorage, per lecture); nothing is sent anywhere.
// Keys: none of its own (arrow keys and the clicker keep moving the slides, also with the pen on).
// Test on localhost without the code: ?ink.
(function () {
  if (/print-pdf/.test(location.search)) return;
  const P = window.MicroPoll || {};
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (!P.teacher && !(LOCAL && /[?&]ink\b/.test(location.search))) return;
  const LEC = (document.body && document.body.dataset.lecture) || 'deck';
  const KEY = 'micro-ink-' + LEC;
  const COLS = { black: '#222', blue: '#0062C4', red: '#C92A2A', green: '#1B7F3B' };
  const WIDTH = { thin: 1.6, medium: 3.2 };   // px on a 1280-wide slide; scaled with the slide

  const css = document.createElement('style');
  css.textContent = `
  .ink-sheet { position: fixed; inset: 0; z-index: 55; pointer-events: none; }
  .ink-sheet.on { pointer-events: auto; touch-action: none; cursor: crosshair; }
  .ink-btn { position: fixed; left: 104px; bottom: 10px; z-index: 62; font: 13px "IBM Plex Mono", ui-monospace, monospace; background: #fff; color: #333; border: 1px solid #c9cfd8; border-radius: 4px; padding: 3px 10px; cursor: pointer; }
  .ink-btn.on { background: #FFF9D0; border-color: #222; }
  .ink-bar { position: fixed; left: 214px; bottom: 8px; z-index: 62; display: none; gap: 5px; align-items: center; font: 13px "IBM Plex Mono", ui-monospace, monospace; background: rgba(255,255,255,.94); padding: 3px 5px; border: 1px solid #d9dde3; border-radius: 6px; }
  .ink-bar.on { display: flex; }
  .ink-bar button { font: inherit; background: #fff; color: #333; border: 1px solid #c9cfd8; border-radius: 4px; padding: 2px 8px; cursor: pointer; }
  .ink-bar button.on { border-color: #222; background: #FFF9D0; }
  .ink-bar .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: -1px; }
  .ink-bar .sep { width: 1px; height: 18px; background: #ddd; margin: 0 2px; }
  html.l06-dark .ink-btn, html.l06-dark .ink-bar { display: none !important; }`;
  document.head.appendChild(css);

  const sheet = document.createElement('canvas'); sheet.className = 'ink-sheet';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ink-btn'; btn.textContent = '[ ✎ pen ]'; btn.title = 'pen on / off';
  const bar = document.createElement('div'); bar.className = 'ink-bar';
  bar.innerHTML = Object.keys(COLS).map(k => `<button type="button" data-c="${k}" title="${k}"><span class="dot" style="background:${COLS[k]}"></span></button>`).join('') +
    '<span class="sep"></span><button type="button" data-w="thin">thin</button><button type="button" data-w="medium">medium</button>' +
    '<span class="sep"></span><button type="button" data-a="erase">eraser</button><button type="button" data-a="undo">undo</button><button type="button" data-a="clear">clear slide</button>';
  document.body.appendChild(sheet); document.body.appendChild(btn); document.body.appendChild(bar);
  const cx = sheet.getContext('2d');

  let on = false, colour = 'blue', width = 'thin', erasing = false, cur = null;
  let store = {}; try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const slideKey = () => { const i = window.Reveal && Reveal.getIndices ? Reveal.getIndices() : { h: 0, v: 0 }; return i.h + '.' + (i.v || 0); };
  const strokes = () => (store[slideKey()] = store[slideKey()] || []);
  // slide coordinates: the .slides box (reveal scales it), 0…1 on both axes
  const box = () => (document.querySelector('.reveal .slides') || document.body).getBoundingClientRect();
  const toSlide = (x, y) => { const b = box(); return [(x - b.left) / b.width, (y - b.top) / b.height]; };
  const toScreen = (u, v) => { const b = box(); return [b.left + u * b.width, b.top + v * b.height]; };
  const scale = () => box().width / 1280;

  function size() {
    const d = window.devicePixelRatio || 1;
    sheet.width = Math.round(innerWidth * d); sheet.height = Math.round(innerHeight * d);
    cx.setTransform(d, 0, 0, d, 0, 0); redraw();
  }
  function seg(st, a, b) {
    const [x1, y1] = toScreen(a[0], a[1]), [x2, y2] = toScreen(b[0], b[1]);
    cx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
    cx.strokeStyle = COLS[st.c] || '#222'; cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.lineWidth = (st.e ? 22 : WIDTH[st.w] * (0.6 + 0.8 * (b[2] == null ? 0.5 : b[2]))) * scale();
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2 + (x1 === x2 && y1 === y2 ? 0.01 : 0), y2); cx.stroke();
  }
  function drawStroke(st) { const p = st.p; if (p.length === 1) seg(st, p[0], p[0]); for (let i = 1; i < p.length; i++) seg(st, p[i - 1], p[i]); }
  function redraw() { cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, innerWidth, innerHeight); (store[slideKey()] || []).forEach(drawStroke); cx.globalCompositeOperation = 'source-over'; }

  const pt = e => { const [u, v] = toSlide(e.clientX, e.clientY), pr = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : null; return [+u.toFixed(5), +v.toFixed(5), pr == null ? null : +pr.toFixed(2)]; };
  sheet.addEventListener('pointerdown', e => {
    if (!on) return;
    e.preventDefault(); e.stopPropagation(); try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the stroke still draws */ }
    cur = { c: colour, w: width, e: erasing, p: [pt(e)] }; strokes().push(cur); seg(cur, cur.p[0], cur.p[0]);
  });
  sheet.addEventListener('pointermove', e => {
    if (!cur) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (list.length ? list : [e]).forEach(ev => { const b = pt(ev), a = cur.p[cur.p.length - 1]; cur.p.push(b); seg(cur, a, b); });
  });
  const end = () => { if (cur) { cur = null; save(); } };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end); sheet.addEventListener('lostpointercapture', end);
  ['touchstart', 'touchmove', 'mousedown', 'wheel'].forEach(ev => sheet.addEventListener(ev, e => { if (on) e.stopPropagation(); }, { passive: true }));

  function marks() {
    btn.classList.toggle('on', on); btn.textContent = on ? '[ ✎ pen on ]' : '[ ✎ pen ]';
    sheet.classList.toggle('on', on); bar.classList.toggle('on', on);
    bar.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', !erasing && b.dataset.c === colour));
    bar.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === width));
    bar.querySelector('[data-a="erase"]').classList.toggle('on', erasing);
  }
  btn.onclick = () => { on = !on; btn.blur(); marks(); };
  bar.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { colour = b.dataset.c; erasing = false; b.blur(); marks(); });
  bar.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { width = b.dataset.w; b.blur(); marks(); });
  bar.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; b.blur();
    if (a === 'erase') erasing = !erasing;
    if (a === 'undo') { strokes().pop(); save(); redraw(); }
    if (a === 'clear') { store[slideKey()] = []; save(); redraw(); }
    marks();
  });
  ['pointerdown', 'mousedown', 'touchstart'].forEach(ev => [btn, bar].forEach(x => x.addEventListener(ev, e => e.stopPropagation(), { passive: true })));

  function hook() {
    if (!window.Reveal || !Reveal.on) return setTimeout(hook, 200);
    ['slidechanged', 'resize', 'ready', 'overviewshown', 'overviewhidden'].forEach(ev => Reveal.on(ev, () => setTimeout(redraw, 0)));
    size();
  }
  window.addEventListener('resize', size);
  marks(); hook();
  window.MicroInk = { redraw: redraw, clearAll: () => { store = {}; save(); redraw(); } };
})();
