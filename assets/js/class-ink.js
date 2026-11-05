// Class ink (Can, 05.11: "impose the pen data into the slides and maybe have a button that toggles showing the pen data"):
// the lecturer's writing from class, shown on its own slides for everyone, from a small published file ink/<Lxx>.json (tools/export_ink.py).
// Off by default (Celebi's spec; Gozde reads Can as wanting it on: one word below, ON_AT_START). One button, only on slides that have class ink.
// While it's on, the slide shows all its steps (fragments), because Can wrote on the slide with its steps showing. No keys of its own.
// It draws on its own layer, under the lecturer's live pen, so it never mixes with new drawing and never reads or writes this device's storage.
// The drawing below matches assets/js/ink.js, so the ink looks and sits exactly as it did in class.
(function () {
  if (/print-pdf/.test(location.search) || !document.querySelector('.reveal') || document.getElementById('class-ink-btn')) return;
  const m = location.pathname.match(/lectures\/([^/]+)/);
  if (!m) return;
  const me = document.currentScript && document.currentScript.src;
  const url = new URL('../../ink/' + m[1].replace(/[^A-Za-z0-9-]/g, '') + '.json', me || location.href);
  const COLS = { black: '#222', blue: '#0062C4', red: '#C92A2A', green: '#1B7F3B' };   // as in ink.js
  const WIDTH = { thin: 1.6, medium: 3.2 }, OLD_ERASER = 22;
  const ON_AT_START = false;
  let slides = null, on = ON_AT_START;

  fetch(url, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).then(d => {
    if (!d || typeof d.slides !== 'object' || !d.slides) return;
    slides = d.slides;
    build();
  }).catch(() => {});

  let sheet, cx, btn;
  function build() {
    const css = document.createElement('style');
    css.textContent = `
    .class-ink { position: fixed; left: 0; top: 0; width: 100%; height: 100%; z-index: 54; pointer-events: none; display: none; }
    #class-ink-btn { position: fixed; left: 104px; bottom: 10px; z-index: 61; display: none; font: 13px "Inter", system-ui, sans-serif; background: #fff; color: #333; border: 1.5px solid #bbb; border-radius: 4px; padding: 4px 9px; cursor: pointer; }
    #class-ink-btn:hover { border-color: #333; }
    #class-ink-btn.on { background: #FFF9D0; border-color: #222; }
    html:has(.ink-btn) #class-ink-btn { left: 12px; bottom: 44px; }   /* the lecturer's pen button has this spot */
    html.print-pdf #class-ink-btn, html.print-pdf .class-ink { display: none !important; }`;
    document.head.appendChild(css);
    sheet = document.createElement('canvas'); sheet.className = 'class-ink'; sheet.setAttribute('aria-hidden', 'true');
    btn = document.createElement('button'); btn.type = 'button'; btn.id = 'class-ink-btn';
    btn.title = "What the lecturer wrote on this slide in class";
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => btn.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    btn.addEventListener('click', e => { e.stopPropagation(); btn.blur(); on = !on; refresh(); });
    document.body.appendChild(sheet); document.body.appendChild(btn);
    cx = sheet.getContext('2d');
    hook();
  }
  function hook() {
    if (!window.Reveal || !Reveal.on) return setTimeout(hook, 200);
    ['slidechanged', 'resize', 'ready', 'overviewshown', 'overviewhidden'].forEach(ev => Reveal.on(ev, () => setTimeout(refresh, 0)));
    window.addEventListener('resize', refresh);
    refresh();
  }

  const current = () => {
    try {
      const c = Reveal.getCurrentSlide();
      return c && (c.dataset.sid || (c.closest('section[data-sid]') || { dataset: {} }).dataset.sid || c.id) || '';
    } catch (e) { return ''; }
  };
  const box = () => (document.querySelector('.reveal .slides') || document.body).getBoundingClientRect();
  function refresh() {
    const list = slides && slides[current()];
    // On a phone the deck re-flows each slide into a tall column, so writing made on the 16:9 slide can't land on what it marked: not shown there.
    const phone = document.documentElement.classList.contains('mobile');
    const has = !phone && !!(list && list.some(s => !s.e));
    btn.style.display = has ? 'block' : 'none';
    btn.textContent = on ? 'hide class writing' : 'show class writing';
    btn.classList.toggle('on', on);
    const show = has && on && !(Reveal.isOverview && Reveal.isOverview());
    sheet.style.display = show ? 'block' : 'none';
    if (show) { allSteps(); draw(list); }
  }
  // Show every step of this slide, so the writing lands on what it marked (it was written with the steps showing).
  function allSteps() {
    try {
      const c = Reveal.getCurrentSlide(), i = Reveal.getIndices();
      const f = [...c.querySelectorAll('.fragment')].map(x => +x.getAttribute('data-fragment-index')).filter(n => !isNaN(n));
      if (!c.querySelector('.fragment')) return;
      const last = f.length ? Math.max(...f) : c.querySelectorAll('.fragment').length - 1;
      if ((i.f == null ? -1 : i.f) < last) Reveal.slide(i.h, i.v || 0, last);
    } catch (e) {}
  }

  function draw(list) {
    const d = window.devicePixelRatio || 1;
    sheet.width = Math.round(innerWidth * d); sheet.height = Math.round(innerHeight * d);
    cx.setTransform(d, 0, 0, d, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    const b = box(), scale = b.width / 1280;
    const S = q => [b.left + q[0] * b.width, b.top + q[1] * b.height], mid = (a, c) => [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    function style(st) {
      cx.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
      cx.strokeStyle = COLS[st.c] || '#222'; cx.lineCap = 'round'; cx.lineJoin = 'round';
      cx.lineWidth = (st.e ? (st.es || OLD_ERASER) : WIDTH[st.w] * 1.0) * scale;   // ink.js: × (0.6 + 0.8 × 0.5) when there is no pressure
    }
    list.forEach(st => {
      const p = st.p;
      style(st);
      if (st.t === 'line' && p.length > 1) { const a = S(p[0]), c = S(p[p.length - 1]); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(c[0], c[1]); cx.stroke(); return; }
      if (st.t === 'curve' && st.k && st.k.length > 2) {
        const q = st.k.map(S); cx.beginPath(); cx.moveTo(q[0][0], q[0][1]);
        for (let i = 0; i < q.length - 1; i++) {
          const p0 = q[Math.max(0, i - 1)], p1 = q[i], p2 = q[i + 1], p3 = q[Math.min(q.length - 1, i + 2)];
          cx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
        }
        cx.stroke(); return;
      }
      for (let n = 1; n <= p.length; n++) {   // as ink.js piece(): midpoint to midpoint, bent through each point
        cx.beginPath();
        if (n === 1) { const [x, y] = S(p[0]); cx.moveTo(x, y); cx.lineTo(x + 0.01, y); }
        else if (n === 2) { const a = S(p[0]), c = S(mid(p[0], p[1])); cx.moveTo(a[0], a[1]); cx.lineTo(c[0], c[1]); }
        else { const a = S(mid(p[n - 3], p[n - 2])), k = S(p[n - 2]), c = S(mid(p[n - 2], p[n - 1])); cx.moveTo(a[0], a[1]); cx.quadraticCurveTo(k[0], k[1], c[0], c[1]); }
        cx.stroke();
      }
      if (p.length > 1) { const a = S(mid(p[p.length - 2], p[p.length - 1])), c = S(p[p.length - 1]); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(c[0], c[1]); cx.stroke(); }
    });
    cx.globalCompositeOperation = 'source-over';
  }
})();
