// L06 · B5c "a map of curves, like altitude" (Can, 21.10): the utility mountain in 3D, a plane cutting it,
// the cuts dropping to the floor as indifference curves, then the view from above = a hiking map.
// Click steps follow the slide's rows (1 hill · 2 slices · 3 from above · 4 only the order); between steps
// the lecturer can drag to turn the mountain, move the cutting plane and keep extra curves.
// Plain canvas 2D, no library. Markup: <div class="l06-hill"></div> inside the slide.
(function () {
  const box = document.querySelector('.l06-hill');
  if (!box) return;
  const section = box.closest('section');
  box.innerHTML = `<canvas></canvas>
    <div class="h3-bar">
      <label>cut at height <input type="range" min="0.6" max="9.4" step="0.1" value="4"> <b class="h3-h">4.0</b></label>
      <button class="h3-b" data-a="keep" type="button">keep this curve</button>
      <button class="h3-b" data-a="view" type="button">3D</button>
      <button class="h3-b" data-a="play" type="button">play</button>
      <button class="h3-b" data-a="reset" type="button">reset</button>
    </div>`;
  const cv = box.querySelector('canvas'), cx = cv.getContext('2d');
  const PRINT = /print-pdf/.test(location.search), W = 900, H = 370, DPR = PRINT ? 3 : Math.min(2, window.devicePixelRatio || 1);
  cv.width = W * DPR; cv.height = H * DPR; cx.scale(DPR, DPR);
  const slider = box.querySelector('input'), hOut = box.querySelector('.h3-h');
  const FONT = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const COLS = ['#7fa6d6', '#0062C4', '#003f80', '#7A3DB8', '#1B7F3B', '#C2410C'];

  // ---- state (animated values ease towards targets) ----
  const st = {
    th: 0, ph: Math.PI / 2,           // camera: turn and tilt (radians); tilt π/2 = straight down
    grow: 0,                       // 0 = flat floor, 1 = full hill
    shape: 0,                      // 0 = the hill u, 1 = a different hill with the same map
    cut: null,                     // height of the cutting plane, or null
    curves: [],                    // kept cuts: {c, drop: 0…1}
    note: '', note2: ''
  };
  const tgt = { th: 0, ph: Math.PI / 2, grow: 0, shape: 0 };
  let seq = null;                  // running scripted animation
  let step = -1;

  const U = (x, y) => Math.sqrt(x * y);                       // utility 0…10 on the square 0…10
  const Z = u => { const a = u, b = 10 * Math.pow(u / 10, 2.2); return st.grow * ((1 - st.shape) * a + st.shape * b) * 0.62; };

  // ---- projection ----
  function P(x, y, z) {
    const X = x - 5, Y = y - 5, c = Math.cos(st.th), s = Math.sin(st.th), cp = Math.cos(st.ph), sp = Math.sin(st.ph);
    const xr = X * c - Y * s, yr = X * s + Y * c, zz = z - 2.4;
    const S = 28 + 3 * cp;  // the whole square fits when seen from above (and moves left, away from the notes)
    return { x: W / 2 - 10 - 130 * (1 - cp) + xr * S, y: H / 2 + 5 - 10 * cp - (yr * sp + zz * cp) * S, d: yr * cp - zz * sp };
  }
  // hiking-map tints by height: pale green (low) → cream → light brown (high)
  const TINT = [[0, [226, 240, 218]], [4, [240, 240, 205]], [7, [236, 220, 192]], [10, [221, 196, 168]]];
  function tint(u, light) {
    let i = 0; while (i < TINT.length - 2 && u > TINT[i + 1][0]) i++;
    const [u0, a] = TINT[i], [u1, b] = TINT[i + 1], t = Math.max(0, Math.min(1, (u - u0) / (u1 - u0)));
    return 'rgb(' + a.map((v, k) => Math.round((v + (b[k] - v) * t) * light)).join(',') + ')';
  }

  // ---- drawing ----
  const N = 20, G = 10 / N;
  function draw() {
    cx.clearRect(0, 0, W, H);
    // floor square and axes
    poly([P(0, 0, 0), P(10, 0, 0), P(10, 10, 0), P(0, 10, 0)], '#fafaf7', '#c9cfd8');
    line(P(0, 0, 0), P(10.8, 0, 0), '#222', 1.5); line(P(0, 0, 0), P(0, 10.8, 0), '#222', 1.5);
    // kept curves on the floor (the map)
    st.curves.forEach((k, i) => { if (k.drop > 0.02) curve(k.c, 0, COLS[i % COLS.length], 3.2, k.drop); });
    // the mountain: quads far → near; the plane drawn between the parts below and above it
    const quads = [];
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x0 = i * G, y0 = j * G, x1 = x0 + G, y1 = y0 + G, um = U(x0 + G / 2, y0 + G / 2);
      const p = [P(x0, y0, Z(U(x0, y0))), P(x1, y0, Z(U(x1, y0))), P(x1, y1, Z(U(x1, y1))), P(x0, y1, Z(U(x0, y1)))];
      // light from the front left: steeper faces a bit darker
      const dzx = Z(U(x1, y0 + G / 2)) - Z(U(x0, y0 + G / 2)), dzy = Z(U(x0 + G / 2, y1)) - Z(U(x0 + G / 2, y0));
      const light = 1 - Math.min(0.16, 0.12 * Math.hypot(dzx, dzy) / G);
      quads.push({ p, d: (p[0].d + p[1].d + p[2].d + p[3].d) / 4, z: Z(um), um, light });
    }
    quads.sort((a, b) => b.d - a.d);
    const pz = st.cut == null ? null : Z(st.cut);
    const showHill = st.grow > 0.01;
    if (showHill) quads.forEach(q => { if (pz == null || q.z < pz) quad(q); });
    if (pz != null && showHill) {
      poly([P(0, 0, pz), P(10, 0, pz), P(10, 10, pz), P(0, 10, pz)], 'rgba(255, 196, 80, 0.30)', 'rgba(217, 72, 15, 0.7)');
    }
    if (showHill) quads.forEach(q => { if (pz != null && q.z >= pz) quad(q); });
    // kept curves on the mountain, at their own height, with a drop line to the floor
    st.curves.forEach((k, i) => {
      if (!showHill) return;
      curve(k.c, Z(k.c), COLS[i % COLS.length], 3.6, 1);
      if (k.drop > 0 && k.drop < 1) {           // the copy falling to the floor
        curve(k.c, Z(k.c) * (1 - k.drop), COLS[i % COLS.length], 2, 1, [6, 5]);
      }
    });
    // the current cut: red on the mountain, its shadow on the floor
    if (pz != null && showHill) { curve(st.cut, pz, '#D9480F', 4, 1); curve(st.cut, 0, '#D9480F', 1.6, 1, [5, 5]); }
    // axis names on top of everything
    text(P(11.3, 0, 0), 'x', 21, '#222', 'italic'); text(P(0, 11.3, 0), 'y', 21, '#222', 'italic');
    // z axis: utility
    if (st.ph < 1.25) { line(P(0, 0, 0), P(0, 0, 7.4), '#333', 1.5); text(P(0, 0, 7.9), 'utility u', 20, '#222', '', 'start'); }
    // labels u₁, u₂, … at the end of each floor curve
    st.curves.forEach((k, i) => { if (k.drop > 0.95) { const lx = Math.min(10, k.c * k.c / 1.6), e = P(lx, k.c * k.c / lx, 0); sub(e.x + 10, e.y - 4, i + 1, COLS[i % COLS.length]); } });
    if (st.note) { cx.font = '20px ' + FONT; cx.fillStyle = '#0062C4'; cx.textAlign = 'right'; cx.fillText(st.note, W - 12, 28); }
    if (st.note2) { cx.font = '18px ' + FONT; cx.fillStyle = '#1B7F3B'; cx.textAlign = 'right'; cx.fillText(st.note2, W - 12, 54); }
  }
  function quad(q) {
    cx.beginPath(); q.p.forEach((p, k) => k ? cx.lineTo(p.x, p.y) : cx.moveTo(p.x, p.y)); cx.closePath();
    cx.fillStyle = tint(q.um, q.light); cx.fill();
    cx.strokeStyle = 'rgba(107, 123, 144, 0.55)'; cx.lineWidth = 0.8; cx.stroke();
  }
  function poly(ps, fill, stroke) { cx.beginPath(); ps.forEach((p, k) => k ? cx.lineTo(p.x, p.y) : cx.moveTo(p.x, p.y)); cx.closePath(); if (fill) { cx.fillStyle = fill; cx.fill(); } if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 1.2; cx.stroke(); } }
  function line(a, b, col, w) { cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.strokeStyle = col; cx.lineWidth = w; cx.setLineDash([]); cx.stroke(); }
  function curve(c, z, col, w, alpha, dash) {          // the indifference curve x·y = c² at height z
    cx.beginPath(); let first = true;
    for (let x = c * c / 10; x <= 10.0001; x += 0.05) { const p = P(x, c * c / x, z); first ? cx.moveTo(p.x, p.y) : cx.lineTo(p.x, p.y); first = false; }
    cx.globalAlpha = alpha; cx.strokeStyle = col; cx.lineWidth = w; cx.setLineDash(dash || []); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
  }
  function text(p, t, size, col, style, align) { cx.font = (style || '') + ' ' + size + 'px ' + FONT; cx.fillStyle = col; cx.textAlign = align || 'center'; cx.lineWidth = 5; cx.strokeStyle = 'rgba(255,255,255,0.9)'; cx.strokeText(t, p.x, p.y); cx.fillText(t, p.x, p.y); }
  function sub(x, y, n, col) {
    cx.textAlign = 'left'; cx.fillStyle = col; cx.lineWidth = 5; cx.strokeStyle = '#fff';
    cx.font = 'italic 22px ' + FONT; cx.strokeText('u', x, y); cx.fillText('u', x, y);
    cx.font = '18px ' + FONT; cx.strokeText(String(n), x + 11, y + 6); cx.fillText(String(n), x + 11, y + 6);
  }

  // ---- animation loop ----
  let last = 0, running = false;
  function tick(t) {
    const dt = Math.min(0.1, (t - (last || t)) / 1000); last = t;
    const k = 1 - Math.pow(0.02, dt);                      // smooth ease towards the targets
    ['th', 'ph', 'grow', 'shape'].forEach(a => { st[a] += (tgt[a] - st[a]) * k; });
    st.curves.forEach(c => { if (c.falling) { c.drop = Math.min(1, c.drop + dt * 1.1); if (c.drop >= 1) c.falling = false; } });
    if (seq) seq(dt);
    draw();
    const busy = drag || seq || st.curves.some(c => c.falling) || ['th', 'ph', 'grow', 'shape'].some(a => Math.abs(tgt[a] - st[a]) > 1e-3);
    if (running && busy) requestAnimationFrame(tick); else running = false;
  }
  function start() { if (!running) { running = true; last = 0; requestAnimationFrame(tick); } }
  function stop() { running = false; }

  // a scripted sweep: the plane rises and keeps a curve at each height in `stops`
  function sweep(stops, done) {
    let h = 0.6, i = 0; st.cut = h;
    seq = dt => {
      if (i >= stops.length) { st.cut = null; seq = null; if (done) done(); return; }
      h = Math.min(stops[i], h + dt * 3); st.cut = h; slider.value = h; hOut.textContent = h.toFixed(1);
      if (h >= stops[i]) { keep(stops[i]); i++; pause(0.7); }
    };
    let wait = 0; const inner = seq;
    function pause(s) { wait = s; }
    seq = dt => { if (wait > 0) { wait -= dt; return; } inner(dt); };
  }
  function keep(c) {
    if (st.curves.some(k => Math.abs(k.c - c) < 0.15)) return;
    st.curves.push({ c, drop: 0, falling: true });
  }
  const look3D = () => { tgt.th = -0.78; tgt.ph = 0.42; };
  const lookDown = () => { tgt.th = 0; tgt.ph = Math.PI / 2; };
  // Can (21.10): start fresh, seen from above; the button turns it into 3D (its label always names the other view)
  const setView = down => { down ? lookDown() : look3D(); const vb = box.querySelector('[data-a="view"]'); if (vb) vb.textContent = down ? '3D' : 'from above'; };
  function fresh() { seq = null; st.cut = null; st.curves = []; Object.assign(tgt, { grow: 1, shape: 0 }); st.note = ''; st.note2 = ''; slider.value = 4; hOut.textContent = '4.0'; setView(true); }

  // ---- the click steps (rows of the slide) ----
  function setStep(n) {
    if (n === step) return; step = n; seq = null;
    if (n <= 0) fresh();
    if (n === 1) { tgt.grow = 1; tgt.shape = 0; st.cut = null; st.curves = []; st.note = 'higher = you like the bundle more'; st.note2 = ''; }
    if (n === 2) { tgt.grow = 1; tgt.shape = 0; setView(false); st.curves = []; st.note = 'cut the mountain at one height'; st.note2 = 'each cut = one indifference curve'; sweep([3, 5, 7]); }
    if (n === 3) {
      tgt.grow = 1; tgt.shape = 0; st.cut = null; [3, 5, 7].forEach(keep); st.curves.forEach(c => { c.drop = 1; c.falling = false; });
      setView(true); st.note = 'from above: a hiking map'; st.note2 = 'each line joins points of the same height';
    }
    if (n >= 4) {
      tgt.grow = 1; st.cut = null; if (!st.curves.length) [3, 5, 7].forEach(keep); st.curves.forEach(c => { c.drop = 1; c.falling = false; });
      setView(false); tgt.shape = 1; st.note = 'a different mountain, the same map'; st.note2 = 'only the order u₁ < u₂ < u₃ matters';
    }
    start();
  }
  function stepNow() {
    const vis = new Set([...section.querySelectorAll('.rows .fragment.visible')].map(f => f.dataset.fragmentIndex));
    return vis.size;
  }

  // ---- lecturer controls ----
  slider.addEventListener('input', () => { seq = null; st.note = ''; st.note2 = ''; tgt.grow = 1; st.cut = +slider.value; hOut.textContent = (+slider.value).toFixed(1); start(); });
  box.querySelectorAll('.h3-b').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); b.blur(); const a = b.dataset.a; tgt.grow = 1; start(); if (a !== 'keep') { st.note = ''; st.note2 = ''; }
    if (a === 'keep') { keep(st.cut == null ? +slider.value : st.cut); }
    if (a === 'view') setView(tgt.ph < 1.2);
    if (a === 'play') { tgt.shape = 0; setView(false); st.curves = []; sweep([3, 5, 7]); }
    if (a === 'reset') fresh();
  }));
  // drag to turn and tilt the mountain
  let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: tgt.th, ph: tgt.ph }; cv.setPointerCapture(e.pointerId); e.stopPropagation(); start(); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; start(); const r = cv.getBoundingClientRect(), s = W / r.width;
    tgt.th = drag.th - (e.clientX - drag.x) * s * 0.008;
    tgt.ph = Math.max(0.12, Math.min(Math.PI / 2, drag.ph + (e.clientY - drag.y) * s * 0.006));
  });
  ['pointerup', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { drag = null; }));
  ['mousedown', 'touchstart', 'touchmove'].forEach(ev => box.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
  slider.addEventListener('keydown', e => e.stopPropagation());   // arrow keys move the cut, not the slide
  slider.addEventListener('pointerup', () => slider.blur());       // after a mouse drag the clicker moves the slides again
  box.setAttribute('data-prevent-swipe', '');

  // ---- follow the deck ----
  function sync() {
    const here = window.Reveal && Reveal.getCurrentSlide && Reveal.getCurrentSlide() === section;
    if (here) { setStep(stepNow()); start(); } else { stop(); }
  }
  function hook() {
    if (!window.Reveal || !Reveal.on) return setTimeout(hook, 200);
    ['slidechanged', 'fragmentshown', 'fragmenthidden', 'ready'].forEach(ev => Reveal.on(ev, () => setTimeout(sync, 0)));
    sync();
  }
  // print / PDF: the final picture, all curves, tilted view
  if (/print-pdf/.test(location.search)) {
    Object.assign(st, { grow: 1, shape: 0, th: -0.78, ph: 0.42 }); [3, 5, 7].forEach(keep); st.curves.forEach(c => { c.drop = 1; c.falling = false; });
    st.note = 'each cut = one indifference curve'; draw(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  } else { draw(); hook(); }
})();
