// Three small playgrounds for L06 (Can, 21.10, via Filiz: "add some graphs here … with animations … below the text").
// Simple goods: x = coffees, y = euros spent on everything else (p_y = 1). Formulas in the math font, fractions stacked.
// No data, no API calls. Colours: curve / budget line #0062C4, tangent #7A3DB8, your bundle #1B7F3B; no arrows.
//
//   <div class="pp-budget" data-b="80" data-px="4"></div>
//       sliders for B and p_x; the line p_x·x + y = B, both ends (B/p_x and B), the slope −p_x/p_y, the set shaded,
//       a faint copy of the starting line, so shifts and rotations stay visible.
//   <div class="pp-map" data-a="4,30"></div>
//       a bundle A you drag; better (up-right) and worse (down-left) regions, the indifference curve through A;
//       [show the map] adds a worse and a better curve; [show MRS] draws the tangent at A with its slope.
//   <div class="pp-zoom" data-a="4,30"></div>
//       zoom slider: the curve around A until it looks straight (it hugs the tangent); step slider Δx: the curve's
//       real Δy against the tangent's −MRS·Δx, and the error, which grows with the step.
// Options: data-xmax, data-ymax (axis ends), data-xname ("coffees"), data-xone ("coffee"); pp-map: data-mrs="off" hides [show MRS].
// The curves are the indifference curves of x·y (MRS = y/x); the formula is not shown (utility comes tomorrow).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 600, H = 360, L = 58, BOT = 40, T = 16, R = 20, pw = W - L - R, ph = H - T - BOT;
  const BLUE = '#0062C4', PURPLE = '#7A3DB8', GREEN = '#1B7F3B';
  const MATH = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const halo = 'paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"';
  const r1 = v => String(Math.round(v * 10) / 10), r2 = v => String(Math.round(v * 100) / 100), r3 = v => String(Math.round(v * 1000) / 1000);
  const fr = (a, b) => '<span class="pp-fr"><span>' + a + '</span><span>' + b + '</span></span>';
  const m = s => '<span class="pp-m">' + s + '</span>';
  const iv = v => '<tspan font-family=\'' + MATH + '\' font-style="italic" font-size="17">' + v + '</tspan>';
  const ITX = '<i>x</i>', ITY = '<i>y</i>', PX = '<i>p</i><sub>x</sub>', PY = '<i>p</i><sub>y</sub>', BB = '<i>B</i>';

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function frame(box) {
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const eq = el('div', 'pp-eq'), svg = document.createElementNS(NS, 'svg'), ctl = el('div', 'pp-ctl'), status = el('div', 'pp-status');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'pp-svg');
    box.appendChild(eq); box.appendChild(svg); box.appendChild(ctl); box.appendChild(status);
    return { eq, svg, ctl, status };
  }
  function slider(ctl, label, mn, mx, step, val, on) {
    const l = el('label', null, '<b>' + label + '</b><input type="range" min="' + mn + '" max="' + mx + '" step="' + step + '" value="' + val + '"><span class="pp-v"></span>');
    const inp = l.querySelector('input'), v = l.querySelector('.pp-v');
    inp.addEventListener('input', () => on(+inp.value, v));
    inp.addEventListener('keydown', e => e.stopPropagation());
    ctl.appendChild(l); on(+inp.value, v, true);
    return inp;
  }
  function toggle(bar, label, on) {
    const b = el('button', 'btn ghost', label); b.type = 'button';
    b.onclick = e => { e.stopPropagation(); b.classList.toggle('on'); on(b.classList.contains('on')); };
    bar.appendChild(b); return b;
  }
  // a coordinate system: box [x0, x1] × [y0, y1] → svg
  function axes(x0, x1, y0, y1) {
    const X = v => L + (v - x0) / (x1 - x0) * pw, Y = v => T + ph - (v - y0) / (y1 - y0) * ph;
    return { X, Y, ix: p => x0 + (p - L) / pw * (x1 - x0), iy: p => y0 + (T + ph - p) / ph * (y1 - y0), x0, x1, y0, y1 };
  }
  function axisLines(A, xl, yl) {
    let s = '';
    const ox = A.x0 <= 0 && A.x1 >= 0 ? A.X(0) : L, oy = A.y0 <= 0 && A.y1 >= 0 ? A.Y(0) : T + ph;
    s += '<line x1="' + ox + '" y1="' + T + '" x2="' + ox + '" y2="' + (T + ph) + '" stroke="#222"/><line x1="' + L + '" y1="' + oy + '" x2="' + (L + pw) + '" y2="' + oy + '" stroke="#222"/>';
    s += '<text x="' + (ox + 8) + '" y="' + (T + 12) + '" fill="#555" font-size="16" ' + halo + '>' + yl + '</text>';
    s += '<text x="' + (L + pw) + '" y="' + (oy - 8) + '" text-anchor="end" fill="#555" font-size="16" ' + halo + '>' + xl + '</text>';
    return s;
  }
  // the clipped polyline of y = k / x inside the box
  function curve(A, k, col, w, extra) {
    const pts = [], N = 160;
    for (let i = 0; i <= N; i++) {
      const xx = A.x0 + (A.x1 - A.x0) * i / N; if (xx <= 0) continue;
      const yy = typeof k === 'function' ? k(xx) : k / xx; if (!isFinite(yy)) continue; if (yy < A.y0 - (A.y1 - A.y0) || yy > A.y1 + (A.y1 - A.y0)) continue;
      pts.push(A.X(xx).toFixed(1) + ',' + A.Y(yy).toFixed(1));
    }
    return pts.length > 1 ? '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (extra || '') + '/>' : '';
  }
  const clip = (id) => '<defs><clipPath id="' + id + '"><rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '"/></clipPath></defs>';
  let NID = 0;
  function readA(box, d) { const a = String(box.dataset.a || d).split(',').map(Number); return a.length === 2 && a[0] > 0 && a[1] > 0 ? a : d.split(',').map(Number); }
  function drag(svg, A, set) {
    let on = false;
    const at = ev => { const r = svg.getBoundingClientRect(); set(A().ix((ev.clientX - r.left) / r.width * W), A().iy((ev.clientY - r.top) / r.height * H)); };
    svg.addEventListener('pointerdown', ev => { on = true; svg.setPointerCapture(ev.pointerId); at(ev); ev.stopPropagation(); ev.preventDefault(); });
    svg.addEventListener('pointermove', ev => { if (on) at(ev); });
    svg.addEventListener('pointerup', () => { on = false; });
    svg.addEventListener('click', ev => ev.stopPropagation());
  }

  // ---------- 1. the budget line ----------
  function budget(box) {
    const B0 = +box.dataset.b || 80, P0 = +box.dataset.px || 4;
    const xmax = +box.dataset.xmax || Math.ceil(2 * B0 / P0 / 10) * 10, ymax = +box.dataset.ymax || Math.ceil(1.6 * B0 / 20) * 20;
    const xname = box.dataset.xname || 'coffees', xone = box.dataset.xone || 'coffee';
    const f = frame(box), A = axes(0, xmax, 0, ymax), st = { B: B0, px: P0 }, id = 'ppc' + (++NID);
    const seg = (B, px, col, w, op) => {
      const xa = Math.max(0, (B - ymax) / px), xb = Math.min(B / px, xmax); if (B <= 0 || xa >= xb) return '';
      return '<line x1="' + A.X(xa) + '" y1="' + A.Y(B - px * xa) + '" x2="' + A.X(xb) + '" y2="' + A.Y(B - px * xb) + '" stroke="' + col + '" stroke-width="' + w + '"' + (op ? ' opacity="' + op + '"' : '') + ' stroke-linecap="round"/>';
    };
    function draw() {
      const xi = st.B / st.px, yi = st.B;
      const xe = Math.min(xi, xmax), pts = [[0, 0], [0, Math.min(yi, ymax)]];
      if (yi > ymax) pts.push([(st.B - ymax) / st.px, ymax]);
      pts.push([xe, Math.max(0, st.B - st.px * xe)], [xe, 0]);
      let s = clip(id) + '<polygon points="' + pts.map(p => A.X(p[0]) + ',' + A.Y(p[1])).join(' ') + '" fill="#DCE9F8" opacity="0.8"/>';
      s += axisLines(A, xname + ' ' + iv('x'), '€ on everything else ' + iv('y'));
      if (st.B !== B0 || st.px !== P0) s += seg(B0, P0, BLUE, 3, 0.22);
      s += seg(st.B, st.px, BLUE, 4);
      if (yi <= ymax) s += '<circle cx="' + L + '" cy="' + A.Y(yi) + '" r="6" fill="' + BLUE + '"/><text x="' + (L - 8) + '" y="' + (A.Y(yi) + 5) + '" text-anchor="end" fill="' + BLUE + '" font-weight="600">' + r1(yi) + '</text>';
      if (xi <= xmax) s += '<circle cx="' + A.X(xi) + '" cy="' + (T + ph) + '" r="6" fill="' + BLUE + '"/><text x="' + A.X(xi) + '" y="' + (T + ph + 20) + '" text-anchor="middle" fill="' + BLUE + '" font-weight="600">' + r1(xi) + '</text>';
      f.svg.innerHTML = s;
      f.eq.innerHTML = '<div class="pp-disp">' + m(r2(st.px) + '&#8202;' + ITX + ' + ' + ITY + ' = ' + r2(st.B)) + '</div>' +
        '<div>ends: ' + m(fr(BB, PX) + ' = ' + fr(r2(st.B), r2(st.px)) + ' = ' + r1(xi)) + ' ' + xname + ', ' + m(fr(BB, PY) + ' = €' + r2(st.B)) +
        ' &nbsp; slope: ' + m('−' + fr(PX, PY) + ' = −' + r2(st.px)) + '</div>';
      const moved = st.B !== B0 && st.px === P0 ? 'income ' + (st.B > B0 ? 'up: the line moved out' : 'down: the line moved in') + ', parallel' : st.px !== P0 && st.B === B0 ? 'the price of a ' + xone + ' changed: the line turned around its end on the y-axis' : st.px !== P0 ? 'both changed' : '';
      f.status.innerHTML = '<div>one more ' + xone + ' costs €' + r2(st.px) + ' of everything else</div>' + (moved ? '<div><b>' + moved + '</b> <span class="dim">(faint line: where you started)</span></div>' : '');
    }
    slider(f.ctl, BB, 0, Math.max(160, 2 * B0), 5, B0, (v, o) => { st.B = v; o.innerHTML = '€' + v; draw(); });
    slider(f.ctl, PX, 0.5, Math.max(10, 2 * P0), 0.5, P0, (v, o) => { st.px = v; o.innerHTML = '€' + r2(v); draw(); });
    const bar = el('div', 'pp-bar'); f.ctl.appendChild(bar);
    const back = el('button', 'btn ghost', 'back to start'); back.type = 'button';
    back.onclick = e => { e.stopPropagation(); st.B = B0; st.px = P0; const ins = f.ctl.querySelectorAll('input'); ins[0].value = B0; ins[1].value = P0; ins[0].dispatchEvent(new Event('input')); ins[1].dispatchEvent(new Event('input')); };
    bar.appendChild(back);
    draw();
  }

  // ---------- 2. the indifference map ----------
  function map(box) {
    const a0 = readA(box, '4,30'), xmax = +box.dataset.xmax || 12, ymax = +box.dataset.ymax || 60;
    const xname = box.dataset.xname || 'coffees', xone = box.dataset.xone || 'coffee';
    const f = frame(box), Ax = axes(0, xmax, 0, ymax), st = { a: a0.slice(), map: false, mrs: false }, id = 'ppc' + (++NID);
    function draw() {
      const [xa, ya] = st.a, k = xa * ya, X = Ax.X, Y = Ax.Y, mrs = ya / xa;
      let s = clip(id);
      s += '<rect x="' + X(xa) + '" y="' + T + '" width="' + (L + pw - X(xa)) + '" height="' + (Y(ya) - T) + '" fill="#E3F2E6"/>';
      s += '<rect x="' + L + '" y="' + Y(ya) + '" width="' + (X(xa) - L) + '" height="' + (T + ph - Y(ya)) + '" fill="#FBE7E2"/>';
      s += '<text x="' + (X(xa) + (L + pw - X(xa)) / 2) + '" y="' + (T + (Y(ya) - T) / 2 + 5) + '" text-anchor="middle" fill="' + GREEN + '" font-size="16" font-weight="600" ' + halo + '>better than A</text>';
      s += '<text x="' + (L + (X(xa) - L) / 2) + '" y="' + (Y(ya) + (T + ph - Y(ya)) / 2 + 5) + '" text-anchor="middle" fill="#C2410C" font-size="16" font-weight="600" ' + halo + '>worse than A</text>';
      s += '<g clip-path="url(#' + id + ')">';
      if (st.map) [0.45, 2.1].forEach(c => { s += curve(Ax, k * c, BLUE, 2.2, ' opacity="0.45"'); });
      s += curve(Ax, k, BLUE, 4);
      if (st.mrs) { const dx = xmax; s += '<line x1="' + X(xa - dx) + '" y1="' + Y(ya + mrs * dx) + '" x2="' + X(xa + dx) + '" y2="' + Y(ya - mrs * dx) + '" stroke="' + PURPLE + '" stroke-width="2.5"/>'; }
      s += '</g>';
      s += axisLines(Ax, xname + ' ' + iv('x'), '€ on everything else ' + iv('y'));
      if (st.map) {
        const lab = (c, t) => { const xx = xmax * 0.98, yy = k * c / xx; if (yy < ymax * 0.95) s += '<text x="' + X(xx) + '" y="' + (Y(yy) - 8) + '" text-anchor="end" fill="' + BLUE + '" font-size="16" opacity="0.85" ' + halo + '>' + t + '</text>'; };
        lab(0.45, 'worse curve'); lab(2.1, 'better curve');
      }
      s += '<line x1="' + X(xa) + '" y1="' + Y(ya) + '" x2="' + X(xa) + '" y2="' + (T + ph) + '" stroke="' + GREEN + '" opacity="0.45"/><line x1="' + L + '" y1="' + Y(ya) + '" x2="' + X(xa) + '" y2="' + Y(ya) + '" stroke="' + GREEN + '" opacity="0.45"/>';
      s += '<circle cx="' + X(xa) + '" cy="' + Y(ya) + '" r="9" fill="' + GREEN + '" stroke="#fff" stroke-width="2"/><text x="' + (xa > 0.7 * xmax ? X(xa) - 13 : X(xa) + 13) + '" y="' + (Y(ya) - 12) + '"' + (xa > 0.7 * xmax ? ' text-anchor="end"' : '') + ' fill="' + GREEN + '" font-weight="700" ' + halo + '>A (' + r1(xa) + ', €' + r1(ya) + ')</text>';
      f.svg.innerHTML = s;
      f.eq.innerHTML = /^(0|off|no)$/.test(box.dataset.hint || '') ? '' : '<span class="dim">drag A</span>';   // data-hint="off": the slide already says it
      f.status.innerHTML = st.mrs ? '<div><span style="color:' + PURPLE + '"><b>MRS at A = ' + r1(mrs) + '</b></span>: you would give about €' + r1(mrs) + ' for one more ' + xone + '</div><div class="dim">drag A to the right: the curve flattens, the MRS falls</div>' : '';
    }
    drag(f.svg, () => Ax, (x, y) => { st.a = [Math.max(0.5, Math.min(xmax - 0.5, Math.round(x * 4) / 4)), Math.max(2, Math.min(ymax - 2, Math.round(y)))]; draw(); });
    const bar = el('div', 'pp-bar'); f.ctl.appendChild(bar);
    toggle(bar, 'show the map', v => { st.map = v; draw(); });
    if (!/^(0|off|no)$/.test(box.dataset.mrs || '')) toggle(bar, 'show MRS', v => { st.mrs = v; draw(); });   // data-mrs="0": before the MRS is taught (Kamuran R15)
    const back = el('button', 'btn ghost', 'back to start'); back.type = 'button'; back.onclick = e => { e.stopPropagation(); st.a = a0.slice(); draw(); }; bar.appendChild(back);
    draw();
  }

  // ---------- 3. zoom: a curve looks straight ----------
  function zoom(box) {
    const a0 = readA(box, '4,30'), xmax = +box.dataset.xmax || 12, ymax = +box.dataset.ymax || 60;
    const xname = box.dataset.xname || 'coffees', xone = box.dataset.xone || 'coffee';
    const f = frame(box), st = { z: 1, dx: 1 }, id = 'ppc' + (++NID);
    const [xa, ya] = a0, SQ = box.dataset.curve === 'sqrt', c = Math.sqrt(xa) + Math.sqrt(ya);
    // data-curve="sqrt" (Murat, 21.10: slide D2 uses √x + √y = 6): y = (c − √x)², MRS = √(y/x); default x·y = k, MRS = y/x
    const k = SQ ? (x => x <= c * c ? Math.pow(c - Math.sqrt(x), 2) : NaN) : xa * ya, yOf = SQ ? k : (x => xa * ya / x), mrs = SQ ? Math.sqrt(ya / xa) : ya / xa;
    function draw() {
      // the view: the whole box at 1×, then centred on A and shrinking around it
      const t = Math.min(1, (st.z - 1) / 1.5), cx = xmax / 2 + (xa - xmax / 2) * t, cy = ymax / 2 + (ya - ymax / 2) * t;
      const hw = xmax / 2 / st.z, hh = ymax / 2 / st.z, Ax = axes(cx - hw, cx + hw, cy - hh, cy + hh), X = Ax.X, Y = Ax.Y;
      let s = clip(id) + '<g clip-path="url(#' + id + ')">';
      s += curve(Ax, k, BLUE, 4);
      s += '<line x1="' + X(xa - 3 * hw) + '" y1="' + Y(ya + mrs * 3 * hw) + '" x2="' + X(xa + 3 * hw) + '" y2="' + Y(ya - mrs * 3 * hw) + '" stroke="' + PURPLE + '" stroke-width="2.5" stroke-dasharray="10 6"/>';
      // the step: along the curve and along the tangent
      const x2 = xa + st.dx, yc = yOf(x2), yt = ya - mrs * st.dx;
      s += '<line x1="' + X(xa) + '" y1="' + Y(ya) + '" x2="' + X(x2) + '" y2="' + Y(ya) + '" stroke="#555" stroke-width="1.5"/>';
      s += '<line x1="' + X(x2) + '" y1="' + Y(ya) + '" x2="' + X(x2) + '" y2="' + Y(Math.min(yc, yt)) + '" stroke="#555" stroke-width="1" stroke-dasharray="3 4"/>';
      s += '<line x1="' + X(x2) + '" y1="' + Y(yc) + '" x2="' + X(x2) + '" y2="' + Y(yt) + '" stroke="#C2410C" stroke-width="5" opacity="0.75"/>';
      s += '<circle cx="' + X(x2) + '" cy="' + Y(yc) + '" r="6" fill="' + BLUE + '"/><circle cx="' + X(x2) + '" cy="' + Y(yt) + '" r="6" fill="' + PURPLE + '"/>';
      s += '</g>';
      s += '<rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '" fill="none" stroke="#ccc"/>';
      s += '<circle cx="' + X(xa) + '" cy="' + Y(ya) + '" r="8" fill="' + GREEN + '" stroke="#fff" stroke-width="2"/><text x="' + (X(xa) + 12) + '" y="' + (Y(ya) - 12) + '" fill="' + GREEN + '" font-weight="700" ' + halo + '>A</text>';
      s += '<text x="' + (L + 8) + '" y="' + (T + 18) + '" fill="#555" font-size="16" ' + halo + '>zoom ' + r1(st.z) + '× · window ' + r2(2 * hw) + ' ' + xname + ' wide</text>';
      f.svg.innerHTML = s;
      const dyc = yc - ya, dyt = -mrs * st.dx;
      f.eq.innerHTML = '<div class="pp-disp">' + m('Δ' + ITY + ' ≈ −MRS · Δ' + ITX) + '</div><div class="pp-disp-sub">' + m('MRS = ' + r1(mrs)) + ' at A</div>';
      const mi = v => (v < 0 ? '−' : '') + r3(Math.abs(v));
      f.status.innerHTML = '<div>step ' + m('Δ' + ITX + ' = ' + r2(st.dx)) + ': along the curve ' + m('Δ' + ITY + ' = ' + mi(dyc)) + ' euros, the tangent says ' + m('−' + r1(mrs) + ' · ' + r2(st.dx) + ' = ' + mi(dyt)) + '</div>' +
        '<div><b style="color:#C2410C">off by €' + r3(Math.abs(dyc - dyt)) + '</b> (' + (Math.abs(dyt) > 0 ? Math.round(100 * Math.abs(dyc - dyt) / Math.abs(dyt)) : 0) + '% of the tangent’s answer)</div>';
    }
    slider(f.ctl, 'zoom', 0, 5, 0.05, 0, (v, o) => { st.z = Math.pow(2, v); o.innerHTML = r1(st.z) + '×'; draw(); });
    slider(f.ctl, 'step Δ' + ITX, 0.05, Math.min(+box.dataset.stepmax || (SQ ? 8 : 4), xmax - xa, SQ ? c * c - xa : Infinity), 0.05, 1, (v, o) => { st.dx = v; o.innerHTML = r2(v); draw(); });
    draw();
  }

  function init() {
    document.querySelectorAll('.pp-budget').forEach(budget);
    document.querySelectorAll('.pp-map').forEach(map);
    document.querySelectorAll('.pp-zoom').forEach(zoom);
  }
  window.PrefPlay = { budget, map, zoom };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
