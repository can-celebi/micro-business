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
// v2 (Can, 29.10: "more reactive … when i write in cursive … gets all my minimal touches … a bit self-corrects my lines and
// my curves"): pointerrawupdate where the browser has it, coalesced events, a predicted-points preview to cut the lag,
// a desynchronized canvas, no minimum distance, every tap leaves a mark; strokes are drawn through midpoints with
// quadratic curves (light smoothing, always on); [ tidy ] (off by default): hold the pen still ~0.4 s at the end of a
// stroke and a nearly straight stroke becomes a clean line, a curve a clean smooth curve. The raw points are always kept.
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
  html.l06-dark .ink-btn, html.l06-dark .ink-bar { display: none !important; }
  @media (max-width: 760px) { .ink-btn { left: 8px; bottom: 8px; } .ink-bar { left: 8px; right: 8px; bottom: 44px; flex-wrap: wrap; } }`;
  document.head.appendChild(css);

  const sheet = document.createElement('canvas'); sheet.className = 'ink-sheet';
  const pred = document.createElement('canvas'); pred.className = 'ink-sheet ink-pred'; pred.style.pointerEvents = 'none';
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ink-btn'; btn.textContent = '[ ✎ pen ]'; btn.title = 'pen on / off';
  const bar = document.createElement('div'); bar.className = 'ink-bar';
  bar.innerHTML = Object.keys(COLS).map(k => `<button type="button" data-c="${k}" title="${k}"><span class="dot" style="background:${COLS[k]}"></span></button>`).join('') +
    '<span class="sep"></span><button type="button" data-w="thin">thin</button><button type="button" data-w="medium">medium</button>' +
    '<span class="sep"></span><button type="button" data-a="tidy" title="hold the pen still at the end of a stroke: straight lines and curves get tidied">tidy</button><button type="button" data-a="erase">eraser</button><button type="button" data-a="undo">undo</button><button type="button" data-a="clear">clear slide</button>';
  document.body.appendChild(sheet); document.body.appendChild(pred); document.body.appendChild(btn); document.body.appendChild(bar);
  const ctx2d = c => { try { return c.getContext('2d', { desynchronized: true }) || c.getContext('2d'); } catch (e) { return c.getContext('2d'); } };
  const cx = ctx2d(sheet), px = ctx2d(pred);

  let on = false, colour = 'blue', width = 'thin', erasing = false, cur = null, tidy = false, lastMove = 0;
  let store = {}; try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  const slideKey = () => {
    const R = window.Reveal, cur = R && R.getCurrentSlide ? R.getCurrentSlide() : null;
    if (cur && (cur.dataset.sid || cur.id)) return 'sid:' + (cur.dataset.sid || cur.id);   // the slide's own id: stays with the slide if slides are added
    const i = R && R.getIndices ? R.getIndices() : { h: 0, v: 0 }; return i.h + '.' + (i.v || 0);
  };
  const strokes = () => (store[slideKey()] = store[slideKey()] || []);
  // slide coordinates: the .slides box (reveal scales it), 0…1 on both axes
  const box = () => (document.querySelector('.reveal .slides') || document.body).getBoundingClientRect();
  const toSlide = (x, y) => { const b = box(); return [(x - b.left) / b.width, (y - b.top) / b.height]; };
  const toScreen = (u, v) => { const b = box(); return [b.left + u * b.width, b.top + v * b.height]; };
  const scale = () => box().width / 1280;

  function size() {
    const d = window.devicePixelRatio || 1;
    [sheet, pred].forEach(c => { c.width = Math.round(innerWidth * d); c.height = Math.round(innerHeight * d); });
    cx.setTransform(d, 0, 0, d, 0, 0); px.setTransform(d, 0, 0, d, 0, 0); redraw();
  }
  function style(c, st, pr) {
    c.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
    c.strokeStyle = COLS[st.c] || '#222'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = (st.e ? 22 : WIDTH[st.w] * (0.6 + 0.8 * (pr == null ? 0.5 : pr))) * scale();
  }
  const S = q => toScreen(q[0], q[1]), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // one piece of a live stroke: from the midpoint of (p[n-3], p[n-2]) to the midpoint of (p[n-2], p[n-1]), bent through p[n-2]
  function piece(c, st, n) {
    const p = st.p;
    style(c, st, p[n - 1][2]);
    c.beginPath();
    if (n === 1) { const [x, y] = S(p[0]); c.moveTo(x, y); c.lineTo(x + 0.01, y); }
    else if (n === 2) { const a = S(p[0]), b = S(mid(p[0], p[1])); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
    else { const a = S(mid(p[n - 3], p[n - 2])), k = S(p[n - 2]), b = S(mid(p[n - 2], p[n - 1])); c.moveTo(a[0], a[1]); c.quadraticCurveTo(k[0], k[1], b[0], b[1]); }
    c.stroke();
  }
  function tail(c, st) { const p = st.p, n = p.length; if (n < 2) return; style(c, st, p[n - 1][2]); const a = S(mid(p[n - 2], p[n - 1])), b = S(p[n - 1]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  function drawStroke(st) {
    const p = st.p;
    if (st.t === 'line' && p.length > 1) { style(cx, st, null); const a = S(p[0]), b = S(p[p.length - 1]); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke(); return; }
    if (st.t === 'curve' && st.k && st.k.length > 2) {   // Catmull-Rom through the simplified points
      style(cx, st, null); const q = st.k.map(S); cx.beginPath(); cx.moveTo(q[0][0], q[0][1]);
      for (let i = 0; i < q.length - 1; i++) { const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
        cx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
      cx.stroke(); return;
    }
    for (let n = 1; n <= p.length; n++) piece(cx, st, n);
    tail(cx, st);
  }
  // tidy: a nearly straight stroke → its chord; else a simplified point list (Ramer–Douglas–Peucker) drawn as a smooth curve
  function tidyUp(st) {
    const p = st.p; if (p.length < 4) return;
    const scr = p.map(S), a = scr[0], b = scr[scr.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dev = q => L ? Math.abs((b[0] - a[0]) * (a[1] - q[1]) - (a[0] - q[0]) * (b[1] - a[1])) / L : Math.hypot(q[0] - a[0], q[1] - a[1]);
    const maxDev = Math.max(...scr.map(dev));
    if (L > 20 && maxDev < Math.max(4, 0.04 * L)) { st.t = 'line'; return; }
    const eps = 2.5 * scale();
    function rdp(lo, hi, keep) { let mx = 0, at = -1; const A0 = scr[lo], B0 = scr[hi], LL = Math.hypot(B0[0] - A0[0], B0[1] - A0[1]) || 1;
      for (let i = lo + 1; i < hi; i++) { const q = scr[i], dd = Math.abs((B0[0] - A0[0]) * (A0[1] - q[1]) - (A0[0] - q[0]) * (B0[1] - A0[1])) / LL; if (dd > mx) { mx = dd; at = i; } }
      if (mx > eps && at > 0) { rdp(lo, at, keep); keep.push(at); rdp(at, hi, keep); } }
    const keep = [0]; rdp(0, p.length - 1, keep); keep.push(p.length - 1);
    st.t = 'curve'; st.k = keep.sort((x, y) => x - y).map(i => [p[i][0], p[i][1]]);
  }
  function redraw() { cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, innerWidth, innerHeight); (store[slideKey()] || []).forEach(drawStroke); cx.globalCompositeOperation = 'source-over'; }

  const pt = e => { const [u, v] = toSlide(e.clientX, e.clientY), pr = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : null; return [+u.toFixed(5), +v.toFixed(5), pr == null ? null : +pr.toFixed(2)]; };
  sheet.addEventListener('pointerdown', e => {
    if (!on) return;
    e.preventDefault(); e.stopPropagation(); try { sheet.setPointerCapture(e.pointerId); } catch (err) { /* no capture: the stroke still draws */ }
    cur = { c: colour, w: width, e: erasing, p: [pt(e)] }; strokes().push(cur); piece(cx, cur, 1); lastMove = performance.now();
  });
  const MOVE = 'onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove';   // raw updates: every sample, as early as possible
  sheet.addEventListener(MOVE, e => {
    if (!cur) return;
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    (list.length ? list : [e]).forEach(ev => { const b = pt(ev), a = cur.p[cur.p.length - 1]; if (b[0] === a[0] && b[1] === a[1]) return; cur.p.push(b); piece(cx, cur, cur.p.length); lastMove = performance.now(); });
    // the predicted next points, drawn on the preview sheet only (cleared on every update), so the line keeps up with the pen
    px.clearRect(0, 0, innerWidth, innerHeight);
    const pr = e.getPredictedEvents ? e.getPredictedEvents() : [];
    if (pr.length && !cur.e) { style(px, cur, null); px.beginPath(); const s0 = S(cur.p[cur.p.length - 1]); px.moveTo(s0[0], s0[1]); pr.forEach(ev => px.lineTo(ev.clientX, ev.clientY)); px.stroke(); }
  });
  const end = () => {
    if (!cur) return;
    px.clearRect(0, 0, innerWidth, innerHeight);
    tail(cx, cur);
    if (tidy && !cur.e && performance.now() - lastMove >= 400) { tidyUp(cur); if (cur.t) redraw(); }   // held still at the end: tidy
    cur = null; save();
  };
  sheet.addEventListener('pointerup', end); sheet.addEventListener('pointercancel', end); sheet.addEventListener('lostpointercapture', end);
  ['touchstart', 'touchmove', 'mousedown', 'wheel'].forEach(ev => sheet.addEventListener(ev, e => { if (on) e.stopPropagation(); }, { passive: true }));

  function marks() {
    btn.classList.toggle('on', on); btn.textContent = on ? '[ ✎ pen on ]' : '[ ✎ pen ]';
    sheet.classList.toggle('on', on); bar.classList.toggle('on', on);
    bar.querySelectorAll('[data-c]').forEach(b => b.classList.toggle('on', !erasing && b.dataset.c === colour));
    bar.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === width));
    bar.querySelector('[data-a="erase"]').classList.toggle('on', erasing);
    bar.querySelector('[data-a="tidy"]').classList.toggle('on', tidy);
  }
  btn.onclick = () => { on = !on; btn.blur(); marks(); };
  bar.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { colour = b.dataset.c; erasing = false; b.blur(); marks(); });
  bar.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { width = b.dataset.w; b.blur(); marks(); });
  bar.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; b.blur();
    if (a === 'erase') erasing = !erasing;
    if (a === 'tidy') tidy = !tidy;
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
