// L09 playgrounds (Can, 28.10: "lots of animation i want them to understand optimization … we do many ways of showing it").
// Utility u = x^a · y^b (Cobb-Douglas; default a = b = 1, u = x·y), budget p_x·x + p_y·y = B. Both axes use the SAME scale,
// so "perpendicular" on screen is perpendicular in the maths. No data, no API calls. Labels ≥ 18 px on a slide.
//
//   <div class="op-slide" data-px="2" data-py="1" data-b="20"></div>   (Fatih's example: 2x + y = 20, A (2, 16), C (8, 4), E (5, 10))
//       drag the bundle along the budget line: the indifference curve through it, the gradient ∇u = (MU_x, MU_y)
//       (points to "better"), the budget direction, and the projection of ∇u on the budget line, which is 0 at the optimum
//       (no move along the line makes you better off); [ go to the best bundle ] slides there.
//   <div class="op-lambda" data-px="2" data-py="1" data-b="20"></div>
//       steps ΔB = 1, 0.1, 0.01: the budget line shifts outwards, the best bundle moves, and Δu*/ΔB settles at λ (Kamuran
//       R41: no "≈" formula; the number settles, like the L06/L08 MRS zoom).
//   <div class="op-corner" data-b="10" data-ax="2"></div>
//       slide the price of x (p_y = 1): perfect substitutes u = 2x + y jump between the two corners (p_x = 1 → (10, 0);
//       3 → (0, 10); 2 → the whole line); [ perfect complements ] shows u = min{x, y} staying at the kink on y = x.
// Options for all: data-a, data-ub (the exponents a and b), data-xname, data-yname.
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 500, H = 340, L = 50, BOT = 40, T = 16, R = 20, pw = W - L - R, ph = H - T - BOT;
  const BLUE = '#0062C4', ORANGE = '#D9480F', PURPLE = '#7A3DB8', GREEN = '#1B7F3B', GREY = '#888';
  const MATH = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const halo = 'paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"';
  const r2 = v => String(Math.round(v * 100) / 100), r3 = v => String(Math.round(v * 1000) / 1000);
  const sg = v => (v < 0 ? '−' : '') + r2(Math.abs(v));
  const m = s => '<span class="op-m">' + s + '</span>';
  const fr = (a, b) => '<span class="op-fr"><span>' + a + '</span><span>' + b + '</span></span>';
  const it = v => '<tspan font-family=\'' + MATH + '\' font-style="italic">' + v + '</tspan>';
  const IX = '<i>x</i>', IY = '<i>y</i>', PX = '<i>p</i><sub>x</sub>', PY = '<i>p</i><sub>y</sub>', MUX = 'MU<sub>x</sub>', MUY = 'MU<sub>y</sub>';

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function frame(box) {
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const eq = el('div', 'op-eq'), svg = document.createElementNS(NS, 'svg'), ctl = el('div', 'op-ctl'), status = el('div', 'op-status');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'op-svg');
    const side = el('div', 'op-side');
    box.appendChild(svg); box.appendChild(side); side.appendChild(eq); side.appendChild(ctl); side.appendChild(status);
    return { eq, svg, ctl, status };
  }
  function button(ctl, label, on) { const b = el('button', 'btn ghost', label); b.type = 'button'; b.onclick = e => { e.stopPropagation(); b.blur(); on(b); }; ctl.appendChild(b); return b; }
  function slider(ctl, label, mn, mx, step, val, on) {
    const l = el('label', null, '<b>' + label + '</b><input type="range" min="' + mn + '" max="' + mx + '" step="' + step + '" value="' + val + '"><span class="op-v"></span>');
    const inp = l.querySelector('input'), v = l.querySelector('.op-v');
    inp.addEventListener('input', () => on(+inp.value, v));
    inp.addEventListener('keydown', e => e.stopPropagation());
    inp.addEventListener('pointerup', () => inp.blur());   // after a drag the clicker moves the slides again
    ctl.appendChild(l); on(+inp.value, v, true); return inp;
  }
  // one scale for both axes (so angles are true): fits [0, xmax] × [0, ymax] into the plot
  function axes(xmax, ymax) {
    ymax = Math.max(ymax, xmax * ph / pw); xmax = ymax * pw / ph;   // same units per pixel on both axes, plot filled
    const s = Math.min(pw / xmax, ph / ymax), X = v => L + v * s, Y = v => T + ph - v * s;
    return { s, X, Y, xmax: xmax, ymax: ph / s, ix: p => (p - L) / s, iy: p => (T + ph - p) / s };
  }
  function axisLines(A, xn, yn) {
    return '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="#222"/>' +
      '<text x="' + (L - 8) + '" y="' + (T + 14) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + (yn ? yn + ' ' : '') + it('y') + '</text>' +   // left of the axis: never under a line
      '<text x="' + (L + pw) + '" y="' + (T + ph - 8) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + xn + ' ' + it('x') + '</text>';
  }
  const clip = id => '<defs><clipPath id="' + id + '"><rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '"/></clipPath>' +
    '<marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  let NID = 0;
  // the indifference curve x^a y^b = u inside the plot, as a polyline
  function ic(A, a, b, u, col, w, extra) {
    const pts = [];
    for (let i = 1; i <= 200; i++) {
      const x = A.xmax * i / 200, y = Math.pow(u / Math.pow(x, a), 1 / b);
      if (!isFinite(y) || y > A.ymax * 1.5) continue;
      pts.push(A.X(x).toFixed(1) + ',' + Math.max(T - 4, A.Y(y)).toFixed(1));
    }
    return pts.length > 1 ? '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (extra || '') + '/>' : '';
  }
  function params(box) {
    return { px: +box.dataset.px || 3, py: +box.dataset.py || 1, B: +box.dataset.b || 60, a: +box.dataset.a || 1, b: +box.dataset.ub || 1,
      xn: box.dataset.xname || '', yn: box.dataset.yname || '' };
  }
  const U = (a, b, x, y) => Math.pow(x, a) * Math.pow(y, b);
  const best = (q, B) => ({ x: q.a / (q.a + q.b) * B / q.px, y: q.b / (q.a + q.b) * B / q.py });

  // ---------- (i) slide along the budget line: gradient, budget direction, projection ----------
  function slide(box) {
    const q = params(box), f = frame(box), id = 'op' + (++NID);
    const xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08), opt = best(q, q.B);
    const PTS = String(box.dataset.pts || '5,15').split(',').map(Number);   // x of A and of C
    const T0 = Math.min(0.9, Math.max(0.05, PTS[0] / xi)); let t = T0, anim = null;   // starts at A                         // t = share of the way from the y-axis end to the x-axis end
    const at = t => ({ x: t * xi, y: (1 - t) * yi });
    const grad = (x, y) => { const u = U(q.a, q.b, x, y); return [q.a * u / x, q.b * u / y]; };
    const d = [q.py, -q.px], dn = Math.hypot(d[0], d[1]);   // budget direction d = (p_y, −p_x): towards more x (Fatih)
    const proj = (x, y) => { const g = grad(x, y); return g[0] * d[0] + g[1] * d[1]; };
    let pmax = 0; for (let k = 1; k < 20; k++) { const p = at(0.05 + 0.9 * k / 20); pmax = Math.max(pmax, Math.abs(proj(p.x, p.y))); }
    function arrow(x0, y0, dx, dy, col, w) {     // dx, dy in screen pixels
      if (Math.hypot(dx, dy) < 2) return '';
      return '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + (x0 + dx) + '" y2="' + (y0 + dy) + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'a)"/>';
    }
    function draw() {
      const p = at(t), u = U(q.a, q.b, p.x, p.y), g = grad(p.x, p.y), s = proj(p.x, p.y), X = A.X, Y = A.Y;
      let h = clip(id) + '<g clip-path="url(#' + id + ')">';
      h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      h += ic(A, q.a, q.b, u, ORANGE, 3);
      h += '</g>' + axisLines(A, q.xn, q.yn);
      const sx = X(p.x), sy = Y(p.y), gl = Math.hypot(g[0], g[1]);
      h += arrow(sx, sy, 72 * g[0] / gl, -72 * g[1] / gl, GREEN, 3);                       // ∇u, fixed length
      h += arrow(sx, sy, 72 * d[0] / dn, -72 * d[1] / dn, GREY, 2.5);                       // budget direction
      const ox = 16 * q.px / Math.hypot(q.px, q.py), oy = -16 * q.py / Math.hypot(q.px, q.py);   // 16 units off the line
      h += arrow(sx + ox, sy + oy, 84 * s / pmax * d[0] / dn, -84 * s / pmax * d[1] / dn, PURPLE, 3.5); // projection along the line
      h += '<circle cx="' + sx + '" cy="' + sy + '" r="8" fill="#222" stroke="#fff" stroke-width="2"/>';
      const here = [['A', PTS[0] / xi], ['C', PTS[1] / xi], ['E', opt.x / xi]].find(([, tt]) => Math.abs(tt - t) <= 0.04);
      if (here) h += '<text x="' + (sx - 12) + '" y="' + (sy + 6) + '" text-anchor="end" font-size="20" fill="#222" ' + halo + '>' + here[0] + '</text>';
      h += '<text x="' + (sx + 72 * g[0] / gl + 6) + '" y="' + (sy - 72 * g[1] / gl - 6) + '" font-size="21" fill="' + GREEN + '" ' + halo + '>∇' + it('u') + '</text>';
      h += '<text x="' + (sx + 72 * d[0] / dn + 10) + '" y="' + (sy - 72 * d[1] / dn + 20) + '" font-size="21" fill="' + GREY + '" ' + halo + '>' + it('d') + '</text>';
      [['A', PTS[0] / xi], ['C', PTS[1] / xi], ['E', opt.x / xi]].forEach(([n, tt]) => { const pp = at(tt); if (tt > 0 && tt < 1 && Math.abs(tt - t) > 0.04) h += '<circle cx="' + X(pp.x) + '" cy="' + Y(pp.y) + '" r="3.5" fill="#555"/><text x="' + (X(pp.x) - 10) + '" y="' + (Y(pp.y) + 6) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + n + '</text>'; });
      f.svg.innerHTML = h;
      const mrs = g[0] / g[1];
      f.eq.innerHTML = '<div class="op-disp">' + m('∇<i>u</i> = (' + MUX + ', ' + MUY + ') = (' + r2(g[0]) + ', ' + r2(g[1]) + ')') + '</div>' +
        '<div class="op-sub">' + m('MRS = ' + fr(MUX, MUY) + ' = ' + r2(mrs)) + ' &nbsp; vs &nbsp; ' + m(fr(PX, PY) + ' = ' + r2(q.px / q.py)) + '</div>';
      const near = Math.abs(s) < pmax * 0.02;
      f.status.innerHTML = '<div>at ' + m('(' + r2(p.x) + ', ' + r2(p.y) + ')') + ': <b style="color:' + PURPLE + '">' + m('∇<i>u</i> · <i>d</i> = ' + sg(s)) + '</b> &nbsp; <span class="dim">' + m('<i>d</i> = (' + PY + ', −' + PX + ') = (' + q.py + ', −' + q.px + ')') + '</span></div>' +
        '<div class="dim">' + (near ? 'zero: no step along the line makes you better off. This is the best feasible bundle: ∇u is perpendicular to the line.'
          : s > 0 ? 'positive: moving along the line towards more x makes you better off' : 'negative: moving along the line towards more y makes you better off') + '</div>';
    }
    // drag the bundle: the nearest point on the budget line
    let drag = false;
    const toT = ev => { const r = f.svg.getBoundingClientRect(), x = A.ix((ev.clientX - r.left) / r.width * W), y = A.iy((ev.clientY - r.top) / r.height * H);
      const tt = ((x) * xi + (yi - y) * yi) / (xi * xi + yi * yi); t = Math.max(0.02, Math.min(0.98, tt)); draw(); };
    f.svg.addEventListener('pointerdown', ev => { cancelAnimationFrame(anim); drag = true; try { f.svg.setPointerCapture(ev.pointerId); } catch (e) {} toT(ev); ev.stopPropagation(); ev.preventDefault(); });
    f.svg.addEventListener('pointermove', ev => { if (drag) toT(ev); });
    f.svg.addEventListener('pointerup', () => { drag = false; });
    f.svg.addEventListener('click', ev => ev.stopPropagation());
    const tOpt = opt.x / xi;
    button(f.ctl, 'go to the best feasible bundle', () => {
      cancelAnimationFrame(anim); const t0 = t, s0 = performance.now();
      const step = now => { const k = Math.min(1, (now - s0) / 1200), e = 1 - Math.pow(1 - k, 3); t = t0 + (tOpt - t0) * e; draw(); if (k < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    });
    [['A', PTS[0] / xi], ['C', PTS[1] / xi]].forEach(([n, tt]) => { if (tt > 0 && tt < 1) button(f.ctl, n, () => { cancelAnimationFrame(anim); t = tt; draw(); }); });
    button(f.ctl, 'reset', () => { cancelAnimationFrame(anim); t = T0; draw(); });
    f.ctl.appendChild(el('span', 'dim op-hint', 'drag the dot along the line'));
    draw();
  }

  // ---------- (ii) λ: the value of one more euro, as Δu*/ΔB over smaller and smaller steps ----------
  function lambda(box) {
    const q = params(box), f = frame(box), id = 'op' + (++NID);
    const xi = (q.B + 1) / q.px, yi = (q.B + 1) / q.py, A = axes(xi * 1.1, yi * 1.08);
    const o0 = best(q, q.B), u0 = U(q.a, q.b, o0.x, o0.y), lam = q.a * u0 / o0.x / q.px;
    const ustar = B => { const o = best(q, B); return U(q.a, q.b, o.x, o.y); };
    let dB = 0;                                        // 0 = start (budget B only)
    const tried = [];
    const fmt = v => String(+v.toFixed(6));
    function draw() {
      const Bk = q.B + dB, ok = best(q, Bk), uk = ustar(Bk), X = A.X, Y = A.Y;
      let h = clip(id) + '<g clip-path="url(#' + id + ')">';
      h += '<line x1="' + X(0) + '" y1="' + Y(q.B / q.py) + '" x2="' + X(q.B / q.px) + '" y2="' + Y(0) + '" stroke="' + BLUE + '" stroke-width="' + (dB ? 2 : 3.5) + '" opacity="' + (dB ? 0.4 : 1) + '"/>';
      h += ic(A, q.a, q.b, u0, ORANGE, dB ? 2 : 3, dB ? ' opacity="0.4"' : '');
      if (dB) { h += '<line x1="' + X(0) + '" y1="' + Y(Bk / q.py) + '" x2="' + X(Bk / q.px) + '" y2="' + Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>'; h += ic(A, q.a, q.b, uk, ORANGE, 3); }
      h += '</g>' + axisLines(A, q.xn, q.yn);
      h += '<circle cx="' + X(o0.x) + '" cy="' + Y(o0.y) + '" r="7" fill="#222"/>';
      if (dB) h += '<circle cx="' + X(ok.x) + '" cy="' + Y(ok.y) + '" r="8" fill="' + GREEN + '" stroke="#fff" stroke-width="2"/>';
      h += '<text x="' + (X(o0.x) - 12) + '" y="' + (Y(o0.y) - 10) + '" text-anchor="end" font-size="20" fill="#222" ' + halo + '>' + it('u') + '* = ' + r2(u0) + '</text>';
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="op-disp">' + m(fr('Δ<i>u</i>*', 'Δ<i>B</i>')) + '</div><div class="op-sub">extra utility per extra euro, at the best feasible bundle (' + m('<i>B</i> = ' + q.B) + ')</div>';
      let st = dB ? '<div>budget shifts outwards: ' + m('<i>B</i> = ' + q.B + ' → ' + fmt(Bk)) + ', ' + m('<i>u</i>* = ' + r2(u0) + ' → ' + fmt(uk)) + '</div>' : '<div class="dim">pick a step: the budget line shifts outwards by ΔB</div>';
      if (tried.length) st += '<div>' + tried.map(([d, v]) => m('Δ<i>B</i> = ' + d + ': ' + fr('Δ<i>u</i>*', 'Δ<i>B</i>') + ' = ' + String(+v.toFixed(5)))).join(' &nbsp;·&nbsp; ') + '</div>';
      if (tried.some(([d]) => d === 0.01)) st += '<div><b>the steps settle at λ = ' + r2(lam) + '</b> <span class="dim">(= ' + m(fr(MUX, PX)) + ' at the best feasible bundle)</span></div>';
      f.status.innerHTML = st;
    }
    [1, 0.1, 0.01].forEach(d => button(f.ctl, 'ΔB = ' + d, () => { dB = d; const v = (ustar(q.B + d) - u0) / d; if (!tried.some(([x]) => x === d)) tried.push([d, v]); tried.sort((a, b) => b[0] - a[0]); draw(); }));
    button(f.ctl, 'reset', () => { dB = 0; tried.length = 0; draw(); });
    draw();
  }

  // ---------- (iii) corners: perfect substitutes jump, perfect complements stay at the kink ----------
  function corner(box) {
    const B = +box.dataset.b || 12, ax = +box.dataset.ax || 2, ay = +box.dataset.ay || 3, PY0 = +box.dataset.py || 3, f = frame(box), id = 'op' + (++NID);
    const xn = box.dataset.xname || '', yn = box.dataset.yname || '';
    const PX0 = 1;
    let px = PX0, kind = 'subs';                      // p_y = 1
    const A = axes(B / 1 * 1.08, B / PY0 * 1.6);
    function draw() {
      const py = PY0, xi = B / px, yi = B / py, X = A.X, Y = A.Y;
      let h = clip(id) + '<g clip-path="url(#' + id + ')">';
      h += '<polygon points="' + X(0) + ',' + Y(0) + ' ' + X(0) + ',' + Y(yi) + ' ' + X(xi) + ',' + Y(0) + '" fill="#DCE9F8" opacity="0.7"/>';
      h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      let bx = null, by = null, line = false, say;
      if (kind === 'subs') {
        // u = a·x + b·y: straight indifference lines (slope −a/b); the best one touches the budget at a corner
        const ub = Math.max(ax * xi, ay * yi);      // utility at the best corner
        [0.45, 0.72].forEach(c => { const v = ub * c; h += '<line x1="' + X(0) + '" y1="' + Y(v / ay) + '" x2="' + X(v / ax) + '" y2="' + Y(0) + '" stroke="' + ORANGE + '" stroke-width="2" opacity="0.4"/>'; });
        h += '<line x1="' + X(0) + '" y1="' + Y(ub / ay) + '" x2="' + X(ub / ax) + '" y2="' + Y(0) + '" stroke="' + ORANGE + '" stroke-width="3"/>';
        const mrs = ax / ay, pr = px / py;
        if (Math.abs(pr - mrs) < 1e-9) { line = true; say = m('MRS = ' + r2(mrs) + ' = ' + fr(PX, PY)) + ': every bundle on the budget line is best'; }
        else if (pr < mrs) { bx = xi; by = 0; say = m('MRS = ' + r2(mrs) + ' > ' + r2(pr) + ' = ' + fr(PX, PY)) + ': only x, at ' + m('(' + r2(xi) + ', 0)'); }
        else { bx = 0; by = yi; say = m('MRS = ' + r2(mrs) + ' < ' + r2(pr) + ' = ' + fr(PX, PY)) + ': only y, at ' + m('(0, ' + r2(yi) + ')'); }
      } else {
        // u = min{x, y}: L-shaped curves, kink on y = x; the best bundle is the kink on the budget line
        const k = B / (px + py);
        [0.5, 0.75].forEach(c => { const v = k * c; h += '<polyline points="' + X(v) + ',' + Y(A.ymax) + ' ' + X(v) + ',' + Y(v) + ' ' + X(A.xmax) + ',' + Y(v) + '" fill="none" stroke="' + ORANGE + '" stroke-width="2" opacity="0.4"/>'; });
        h += '<polyline points="' + X(k) + ',' + Y(A.ymax) + ' ' + X(k) + ',' + Y(k) + ' ' + X(A.xmax) + ',' + Y(k) + '" fill="none" stroke="' + ORANGE + '" stroke-width="3"/>';
        h += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(Math.min(A.xmax, A.ymax)) + '" y2="' + Y(Math.min(A.xmax, A.ymax)) + '" stroke="' + GREY + '" stroke-width="1.5" stroke-dasharray="5 5"/>';
        bx = k; by = k; say = 'the kink on ' + m('<i>y</i> = <i>x</i>') + ': ' + m('<i>x</i> = <i>y</i> = ' + fr('<i>B</i>', PX + ' + ' + PY) + ' = ' + r2(k)) + ' (the price only moves the kink)';
      }
      h += '</g>' + axisLines(A, xn, yn);
      if (line) h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + GREEN + '" stroke-width="7" opacity="0.55"/>';
      else h += '<circle cx="' + X(bx) + '" cy="' + Y(by) + '" r="10" fill="' + GREEN + '" stroke="#fff" stroke-width="2"/>';
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="op-disp">' + (kind === 'subs' ? m('<i>u</i> = ' + (ax === 1 ? '' : ax) + '<i>x</i> + ' + (ay === 1 ? '' : ay) + '<i>y</i>') : m('<i>u</i> = min{<i>x</i>, <i>y</i>}')) + '</div>' +
        '<div class="op-sub">budget ' + m((px === 1 ? '' : r2(px) + '&#8202;') + '<i>x</i> + ' + (py === 1 ? '' : py) + '<i>y</i> = ' + B) + '</div>';
      f.status.innerHTML = '<div>' + say + '</div>';
    }
    const inp = slider(f.ctl, 'price of x', 1, 3, 0.1, px, (v, o) => { px = Math.round(v * 10) / 10; o.innerHTML = '€' + r2(px); draw(); });
    const bs = button(f.ctl, 'perfect substitutes', () => { kind = 'subs'; mark(); draw(); });
    const bc = button(f.ctl, 'perfect complements', () => { kind = 'comp'; mark(); draw(); });
    button(f.ctl, 'reset', () => { kind = 'subs'; px = PX0; inp.value = PX0; inp.dispatchEvent(new Event('input')); mark(); draw(); });
    const mark = () => { bs.classList.toggle('on', kind === 'subs'); bc.classList.toggle('on', kind === 'comp'); };
    mark(); draw();
  }

  const CSS = '.op-slide,.op-lambda,.op-corner{font-size:.6em;text-align:left;margin-top:.3em}' +
    '.op-slide,.op-lambda,.op-corner{display:grid;grid-template-columns:auto minmax(0,1fr);gap:1.2em;align-items:start}' +
    '.op-svg{height:440px;width:auto;max-width:100%;display:block;touch-action:none;user-select:none}' +
    'html.mobile .op-slide,html.mobile .op-lambda,html.mobile .op-corner{display:block}html.mobile .op-svg{height:auto;width:100%}' +
    '.op-svg text{font-family:"STIX Two Text","Cambria Math",Georgia,serif}.op-slide .op-svg{cursor:grab}' +
    '.op-eq{line-height:1.5;margin-bottom:.3em}.op-disp{font-size:1.25em}.op-side{font-size:1.15em}' +
    '.op-m{font-family:"STIX Two Text","Cambria Math",Georgia,serif;font-size:1.12em;white-space:nowrap}.op-m i{font-style:italic}.op-m sub{font-size:.65em;vertical-align:-.25em}' +
    '.op-fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .12em;line-height:1.05;font-size:.9em}.op-fr>span:first-child{border-bottom:1px solid currentColor;padding:0 .15em}' +
    '.op-ctl{display:flex;flex-wrap:wrap;gap:.5em;align-items:center;margin:.3em 0}.op-ctl label{display:grid;grid-template-columns:auto 1fr 3em;gap:.6em;align-items:center;min-width:22em}' +
    '.op-ctl input[type=range]{accent-color:#0062C4;width:100%}.op-ctl .btn.on{background:var(--p-green,#E3F2E6)}.op-v{font-weight:600;text-align:right}.op-hint{font-size:.95em}' +
    '.op-status{line-height:1.55}html.mobile .op-slide,html.mobile .op-lambda,html.mobile .op-corner{font-size:.9em}';
  function init() {
    const all = document.querySelectorAll('.op-slide,.op-lambda,.op-corner'); if (!all.length) return;
    if (!document.getElementById('op-css')) { const st = document.createElement('style'); st.id = 'op-css'; st.textContent = CSS; document.head.appendChild(st); }
    document.querySelectorAll('.op-slide').forEach(slide); document.querySelectorAll('.op-lambda').forEach(lambda); document.querySelectorAll('.op-corner').forEach(corner);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// L09 vector playgrounds (Can, 29.10: "graphs and animations and sliders to understand how these vector price and utility
// gradient are changing and being shaped"; the gradient as an "arrow … towards better utilities like a path of mountain
// climb"; projecting the gradient on the budget line "hands on"). Same look as opt-play.js. Both axes use the SAME scale,
// so a right angle on screen is a right angle in the maths. No data, no API calls. Labels ≥ 18 px on a slide.
// Running example (L08/L09): u = x·y, budget 3x + y = 60, A (5, 45), C (15, 15), best feasible bundle E (10, 30), λ = 10.
//
//   <div class="op-forms" data-forms="subs,comp,cd,ql"></div>   (a) pick a form of preferences, drag the bundle along the
//        budget line, read u; [ show the best ] slides to it (corner, kink or tangency shows up by itself)
//   <div class="op-walk" data-form="cd"></div>                  (b) walk along the budget line: the utility hill beside it
//   <div class="op-price"></div>                                (c) the price arrow p = (p_x, p_y) stands at a right angle
//        to the budget line; sliders for p_x, p_y and the point; p · d = 0 with the numbers
//   <div class="op-grad"></div>                                 (d) the mountain climb: ∇u at any point (drag), the
//        steepest way up the utility hill, at a right angle to the indifference curve; [ climb ] follows the arrows
//   <div class="op-split"></div>                                (e) split ∇u into the piece along the budget line (walk
//        this way and you gain) and the piece along p (costs money); the first shrinks to 0 at E
//   <div class="op-stretch"></div>                               (f) stretch p by λ until it covers ∇u: λ = 10 at E;
//        at A or C no stretch works
// Options: data-px, data-py, data-b (default 3, 1, 60), data-pts (x of A and C, default "5,15").
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 500, H = 340, L = 50, BOT = 40, T = 16, R = 20, pw = W - L - R, ph = H - T - BOT;
  const BLUE = '#0062C4', ORANGE = '#D9480F', PURPLE = '#7A3DB8', GREEN = '#1B7F3B', GREY = '#888';
  const MATH = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const halo = 'paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"';
  const r2 = v => String(Math.round(v * 100) / 100).replace('-', '−');
  const m = s => '<span class="vp-m">' + s + '</span>';
  const fr = (a, b) => '<span class="vp-fr"><span>' + a + '</span><span>' + b + '</span></span>';
  const it = v => '<tspan font-family=\'' + MATH + '\' font-style="italic">' + v + '</tspan>';
  const PX = '<i>p</i><sub>x</sub>', PY = '<i>p</i><sub>y</sub>', MUX = 'MU<sub>x</sub>', MUY = 'MU<sub>y</sub>', GU = '∇<i>u</i>';
  const vec = (a, b) => m('(' + r2(a) + ', ' + r2(b) + ')');
  let NID = 0;

  // ---------- shared frame: graph left, words right ----------
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function frame(box) {
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', ''); box.classList.add('vp');
    const svg = document.createElementNS(NS, 'svg'), side = el('div', 'vp-side'), eq = el('div', 'vp-eq'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'vp-svg');
    box.appendChild(svg); box.appendChild(side); side.appendChild(eq); side.appendChild(ctl); side.appendChild(status);
    box.addEventListener('keydown', () => {}, false);   // never swallow the clicker's keys
    return { svg, side, eq, ctl, status, id: 'vp' + (++NID) };
  }
  function button(ctl, label, on) { const b = el('button', 'btn ghost', label); b.type = 'button'; b.onclick = e => { e.stopPropagation(); b.blur(); on(b); }; ctl.appendChild(b); return b; }
  function slider(ctl, label, mn, mx, step, val, on) {
    const l = el('label', null, '<b>' + label + '</b><input type="range" min="' + mn + '" max="' + mx + '" step="' + step + '" value="' + val + '"><span class="vp-v"></span>');
    const inp = l.querySelector('input'), v = l.querySelector('.vp-v');
    inp.addEventListener('input', () => on(+inp.value, v));
    inp.addEventListener('keydown', e => e.stopPropagation());
    inp.addEventListener('pointerup', () => inp.blur());   // after a drag the clicker moves the slides again
    ctl.appendChild(l); on(+inp.value, v, true);
    inp.set = x => { inp.value = x; on(+inp.value, v); };
    return inp;
  }
  // one scale for both axes, plot filled
  function axes(xmax, ymax) {
    ymax = Math.max(ymax, xmax * ph / pw); xmax = ymax * pw / ph;
    const s = ph / ymax, X = v => L + v * s, Y = v => T + ph - v * s;
    return { s, X, Y, xmax, ymax, ix: p => (p - L) / s, iy: p => (T + ph - p) / s };
  }
  const axisLines = () => '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="#222"/>' +
    '<text x="' + (L - 8) + '" y="' + (T + 14) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + it('y') + '</text>' +
    '<text x="' + (L + pw) + '" y="' + (T + ph - 8) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + it('x') + '</text>';
  const defs = id => '<defs><clipPath id="' + id + 'c"><rect x="' + L + '" y="' + T + '" width="' + pw + '" height="' + ph + '"/></clipPath>' +
    '<marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  const clipOpen = id => '<g clip-path="url(#' + id + 'c)">';
  // an arrow from screen point (x0, y0) by the DATA vector (vx, vy) times k pixels per unit
  function arrow(id, x0, y0, vx, vy, k, col, w, dash) {
    const dx = vx * k, dy = -vy * k; if (Math.hypot(dx, dy) < 3) return '';
    return '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + (x0 + dx) + '" y2="' + (y0 + dy) + '" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' marker-end="url(#' + id + 'a)"/>';
  }
  // the right-angle mark at (x0, y0) between DATA directions u and v
  function rightAngle(x0, y0, u, v, col) {
    const n = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l * 13, -a[1] / l * 13]; }, a = n(u), b = n(v);
    return '<path d="M' + (x0 + a[0]) + ',' + (y0 + a[1]) + ' L' + (x0 + a[0] + b[0]) + ',' + (y0 + a[1] + b[1]) + ' L' + (x0 + b[0]) + ',' + (y0 + b[1]) + '" fill="none" stroke="' + (col || '#222') + '" stroke-width="1.6"/>';
  }
  const label = (x, y, txt, col, anchor, size) => '<text x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' font-size="' + (size || 20) + '" fill="' + (col || '#555') + '" ' + halo + '>' + txt + '</text>';
  const poly = (A, pts, col, w, extra) => pts.length > 1 ? '<polyline points="' + pts.map(([x, y]) => A.X(x).toFixed(1) + ',' + A.Y(Math.min(y, A.ymax * 1.5)).toFixed(1)).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (extra || '') + '/>' : '';
  const dot = (x, y, r, col) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (col || '#222') + '" stroke="#fff" stroke-width="2"/>';

  // drag in the svg: calls on(x, y) in data units
  function draggable(f, A, on) {
    let drag = false;
    const at = ev => { const r = f.svg.getBoundingClientRect(); on(A.ix((ev.clientX - r.left) / r.width * W), A.iy((ev.clientY - r.top) / r.height * H)); };
    f.svg.addEventListener('pointerdown', ev => { drag = true; try { f.svg.setPointerCapture(ev.pointerId); } catch (e) {} at(ev); ev.stopPropagation(); ev.preventDefault(); });
    f.svg.addEventListener('pointermove', ev => { if (drag) at(ev); });
    f.svg.addEventListener('pointerup', () => { drag = false; });
    f.svg.addEventListener('click', ev => ev.stopPropagation());
  }
  // a smooth move of a number from its value to a target
  function tween(get, set, to, ms) {
    let id = 0; const a = get(), s0 = performance.now();
    const step = now => { const k = Math.min(1, (now - s0) / (ms || 1100)), e = 1 - Math.pow(1 - k, 3); set(a + (to - a) * e); if (k < 1) id = requestAnimationFrame(step); };
    id = requestAnimationFrame(step); return () => cancelAnimationFrame(id);
  }
  function params(box) {
    const p = String(box.dataset.pts || '5,15').split(',').map(Number);
    return { px: +box.dataset.px || 3, py: +box.dataset.py || 1, B: +box.dataset.b || 60, xa: p[0], xc: p[1] };
  }

  // ---------- the forms of preferences ----------
  const FORMS = {
    subs: { name: 'perfect substitutes', eq: '<i>u</i> = <i>x</i> + <i>y</i>', note: 'one x is as good as one y',
      U: (x, y) => x + y, curve: u => [[0, u], [u, 0]], how: 'a corner: only y (x costs 3, y costs 1, and they are equally good)' },
    comp: { name: 'perfect complements (Leontief)', eq: '<i>u</i> = min{<i>x</i>, <i>y</i>}', note: 'x and y are used 1 to 1',
      U: (x, y) => Math.min(x, y), curve: u => [[u, 999], [u, u], [999, u]], how: 'the kink, where x = y' },
    cd: { name: 'Cobb-Douglas', eq: '<i>u</i> = <i>x</i> · <i>y</i>', note: 'more of both is better, a bit of each is best',
      U: (x, y) => x * y, curve: u => { const p = []; for (let i = 1; i <= 240; i++) { const x = 0.4 * i; p.push([x, u / x]); } return p; }, how: 'the curve just touches the line' },
    ql: { name: 'quasi-linear', eq: '<i>u</i> = 12√<i>x</i> + <i>y</i>', note: 'x matters less and less, y always the same',
      U: (x, y) => 12 * Math.sqrt(x) + y, curve: u => { const p = [], xe = Math.pow(u / 12, 2); for (let i = 0; i <= 200; i++) { const x = Math.min(xe, 0.5 * i); p.push([x, u - 12 * Math.sqrt(x)]); if (x >= xe) break; } return p; }, how: 'the curve just touches the line' }
  };
  function bestOnLine(F, xi, yi) {   // scan the budget line: t = share of the way from the y-axis end to the x-axis end
    let bt = 0, bu = -1; for (let k = 0; k <= 2000; k++) { const t = k / 2000, u = F.U(t * xi, (1 - t) * yi); if (u > bu + 1e-9) { bu = u; bt = t; } }
    return { t: bt, u: bu };
  }

  // ---------- (a) functional-form explorer ----------
  function forms(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08);
    const keys = String(box.dataset.forms || 'subs,comp,cd,ql').split(',').filter(k => FORMS[k]);
    let key = keys[0], t = 0.15, shown = false, stop = () => {};
    const at = t => [t * xi, (1 - t) * yi];
    function draw() {
      const F = FORMS[key], [x, y] = at(t), u = F.U(x, y), b = bestOnLine(F, xi, yi), [bx, by] = at(b.t);
      let h = defs(f.id) + clipOpen(f.id);
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      [0.35, 0.7, 1.4].forEach(c => { h += poly(A, F.curve(b.u * c), ORANGE, 1.8, ' opacity="0.35"'); });   // a few curves of the map
      if (shown) h += poly(A, F.curve(b.u), GREEN, 3);
      h += poly(A, F.curve(u), ORANGE, 3);
      h += '</g>' + axisLines();
      if (shown) h += dot(A.X(bx), A.Y(by), 7, GREEN);
      h += dot(A.X(x), A.Y(y), 9);
      h += label(A.X(x) + 14, A.Y(y) - 12, it('u') + ' = ' + r2(u), '#222');
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(F.eq) + '</div><div class="vp-sub">' + F.name + ': ' + F.note + '</div><div class="vp-sub">budget ' + m(q.px + '<i>x</i> + <i>y</i> = ' + q.B) + '</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m('<i>u</i> = ' + r2(u)) + '</div>' +
        (shown ? '<div><b style="color:' + GREEN + '">best feasible bundle ' + vec(bx, by) + ', ' + m('<i>u</i> = ' + r2(b.u)) + '</b>: ' + F.how + '</div>' : '<div class="dim">drag the dot along the line: where is ' + m('<i>u</i>') + ' highest?</div>');
    }
    draggable(f, A, (x, y) => { stop(); t = Math.max(0, Math.min(1, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); draw(); });
    const bs = {};
    if (keys.length > 1) keys.forEach(k => { bs[k] = button(f.ctl, FORMS[k].name.replace(' (Leontief)', ''), () => { stop(); key = k; shown = false; mark(); draw(); }); });
    f.ctl.appendChild(el('div', 'vp-break'));
    button(f.ctl, 'show the best', () => { shown = true; const b = bestOnLine(FORMS[key], xi, yi); stop = tween(() => t, v => { t = v; draw(); }, b.t); });
    button(f.ctl, 'reset', () => { stop(); key = keys[0]; t = 0.15; shown = false; mark(); draw(); });
    const mark = () => keys.forEach(k => bs[k] && bs[k].classList.toggle('on', k === key));
    mark(); draw();
  }

  // ---------- (b) walk along the budget line, the utility hill beside it ----------
  function walk(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08);
    const F = FORMS[box.dataset.form || 'cd'], b = bestOnLine(F, xi, yi);
    const hill = document.createElementNS(NS, 'svg'); hill.setAttribute('viewBox', '0 0 380 210'); hill.setAttribute('class', 'vp-hill');
    f.side.insertBefore(hill, f.status);
    const HL = 56, HB = 36, HT = 14, HR = 16, hw = 380 - HL - HR, hh = 210 - HT - HB, umax = b.u * 1.15;
    const hX = x => HL + x / xi * hw, hY = u => HT + hh - u / umax * hh;
    let t = Math.max(0.02, q.xa / xi), stop = () => {}, seen = false;
    const at = t => [t * xi, (1 - t) * yi];
    function draw() {
      const [x, y] = at(t), u = F.U(x, y);
      if (Math.abs(t - b.t) < 0.004) seen = true;
      let h = defs(f.id) + clipOpen(f.id);
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      h += poly(A, F.curve(u), ORANGE, 3);
      h += '</g>' + axisLines() + dot(A.X(x), A.Y(y), 9);
      f.svg.innerHTML = h;
      // the hill: u along the line, against x
      const pts = []; for (let k = 0; k <= 120; k++) { const tt = k / 120, [xx, yy] = at(tt); pts.push(hX(xx).toFixed(1) + ',' + hY(F.U(xx, yy)).toFixed(1)); }
      let g = '<line x1="' + HL + '" y1="' + HT + '" x2="' + HL + '" y2="' + (HT + hh) + '" stroke="#222"/><line x1="' + HL + '" y1="' + (HT + hh) + '" x2="' + (HL + hw) + '" y2="' + (HT + hh) + '" stroke="#222"/>';
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ORANGE + '" stroke-width="2.5" opacity="0.55"/>';
      if (seen) g += '<line x1="' + HL + '" y1="' + hY(b.u) + '" x2="' + (HL + hw) + '" y2="' + hY(b.u) + '" stroke="' + GREEN + '" stroke-dasharray="5 5"/>' + label(HL - 6, hY(b.u) + 6, r2(b.u), GREEN, 'end', 18);
      g += '<line x1="' + hX(x) + '" y1="' + hY(u) + '" x2="' + hX(x) + '" y2="' + (HT + hh) + '" stroke="' + GREY + '" stroke-dasharray="4 4"/>' + dot(hX(x), hY(u), 7);
      g += label(HL - 8, HT + 14, it('u'), '#555', 'end', 19) + label(HL + hw, HT + hh + 26, it('x') + ' along the budget line', '#555', 'end', 18);
      hill.innerHTML = g;
      f.eq.innerHTML = '<div class="vp-disp">' + m(F.eq) + '</div><div class="vp-sub">walk along ' + m(q.px + '<i>x</i> + <i>y</i> = ' + q.B) + ': utility goes up, then down</div>';
      const slope = F.U(...at(Math.min(1, t + 0.002))) - u;
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m('<i>u</i> = ' + r2(u)) + '</div><div class="dim">' +
        (Math.abs(t - b.t) < 0.004 ? 'the top of the hill: the best feasible bundle; here the curve just touches the line' : slope > 0 ? 'uphill: more x (and less y) makes you better off' : 'downhill: less x (and more y) makes you better off') + '</div>';
    }
    const inp = slider(f.ctl, 'walk', 0.02, 0.98, 0.002, t, (v, o, first) => { t = v; o.innerHTML = ''; if (!first) { stop(); draw(); } });
    draggable(f, A, (x, y) => { stop(); t = Math.max(0.02, Math.min(0.98, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); inp.value = t; draw(); });
    button(f.ctl, 'walk to the top', () => { stop = tween(() => t, v => { t = v; inp.value = v; draw(); }, b.t, 1600); });
    button(f.ctl, 'reset', () => { stop(); seen = false; t = Math.max(0.02, q.xa / xi); inp.value = t; draw(); });
    draw();
  }

  // ---------- (c) the price arrow stands at a right angle to the budget line ----------
  function price(box) {
    const q = params(box), f = frame(box), A = axes(q.B * 1.04, q.B * 1.08), K = 15;   // K pixels per unit of the price arrow
    let px = q.px, py = q.py, t = 0.5;
    function draw() {
      const xi = q.B / px, yi = q.B / py, x = t * xi, y = (1 - t) * yi, sx = A.X(x), sy = A.Y(y), d = [py, -px];
      let h = defs(f.id) + clipOpen(f.id);
      [0.5, 1.5].forEach(c => { h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi * c) + '" x2="' + A.X(xi * c) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="1.6" opacity="0.35"/>'; });
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      h += '</g>' + axisLines();
      h += label(A.X(xi * 0.5) - 10, A.Y(yi * 0.5) + 26, '€' + q.B / 2, BLUE, 'end', 18) + label(A.X(xi * 1.5 * 0.82) + 10, A.Y(yi * 1.5 * 0.18) - 8, '€' + q.B * 1.5, BLUE, null, 18);
      const dl = 3.2 / Math.hypot(d[0], d[1]);
      h += arrow(f.id, sx, sy, d[0] * dl, d[1] * dl, K, GREY, 2.5) + label(sx + d[0] * dl * K + 10, sy - d[1] * dl * K + 22, it('d'), GREY, null, 21);
      h += rightAngle(sx, sy, d, [px, py]);
      h += arrow(f.id, sx, sy, px, py, K, BLUE, 4) + label(sx + px * K + 8, sy - py * K - 8, it('p'), BLUE, null, 22);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m('<i>p</i> = (' + PX + ', ' + PY + ') = ' + vec(px, py)) + '</div><div class="vp-sub">budget ' + m(r2(px) + '<i>x</i> + ' + r2(py) + '<i>y</i> = ' + q.B) + '</div>';
      f.status.innerHTML = '<div>a step along the line: ' + m('<i>d</i> = (' + PY + ', −' + PX + ') = ' + vec(d[0], d[1])) + '</div>' +
        '<div>its cost: ' + m('<i>p</i> · <i>d</i> = ' + r2(px) + '·' + r2(py) + ' + ' + r2(py) + '·(−' + r2(px) + ') = 0') + '</div>' +
        '<div class="dim">a step along the line costs nothing extra, so the price arrow ' + m('<i>p</i>') + ' stands at a right angle to the line and points to the bundles that cost more (€' + q.B * 1.5 + ')</div>';
    }
    slider(f.ctl, 'price of x', 1, 5, 0.5, px, (v, o, first) => { px = v; o.innerHTML = '€' + r2(v); if (!first) draw(); });
    slider(f.ctl, 'price of y', 1, 4, 0.5, py, (v, o, first) => { py = v; o.innerHTML = '€' + r2(v); if (!first) draw(); });
    const pt = slider(f.ctl, 'point', 0.1, 0.9, 0.01, t, (v, o, first) => { t = v; o.innerHTML = ''; if (!first) draw(); });
    draggable(f, A, (x, y) => { const xi = q.B / px, yi = q.B / py; t = Math.max(0.1, Math.min(0.9, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); pt.value = t; draw(); });
    button(f.ctl, 'reset', () => { px = q.px; py = q.py; t = 0.5; f.ctl.querySelectorAll('input').forEach((i, k) => i.set([q.px, q.py, 0.5][k])); draw(); });
    draw();
  }

  // ---------- (d) the mountain climb: ∇u points the steepest way up the utility hill ----------
  function grad(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08), K = 2;
    const LEVELS = [100, 200, 300, 450, 650, 900];
    let P = [q.xa, q.B - q.px * q.xa], trail = [], stop = () => {};
    // the hill as shading: darker = higher utility (computed once)
    let shade = ''; const n = 34, cw = pw / n, chh = cw;
    for (let i = 0; i < n; i++) for (let j = 0; j * chh < ph; j++) {
      const x = A.ix(L + (i + 0.5) * cw), y = A.iy(T + ph - (j + 0.5) * chh), u = x * y;
      shade += '<rect x="' + (L + i * cw).toFixed(1) + '" y="' + (T + ph - (j + 1) * chh).toFixed(1) + '" width="' + (cw + 0.5).toFixed(1) + '" height="' + (chh + 0.5).toFixed(1) + '" fill="#2E7D32" opacity="' + Math.min(0.3, 0.3 * Math.sqrt(u / 2400)).toFixed(3) + '"/>';
    }
    function draw() {
      const [x, y] = P, g = [y, x], u = x * y, sx = A.X(x), sy = A.Y(y), gl = Math.hypot(g[0], g[1]), k = Math.min(K, 120 / gl);
      let h = defs(f.id) + clipOpen(f.id) + shade;
      LEVELS.forEach(v => { h += poly(A, FORMS.cd.curve(v), ORANGE, 1.6, ' opacity="0.45"'); });
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="2" opacity="0.5"/>';
      h += poly(A, FORMS.cd.curve(u), ORANGE, 3);
      if (trail.length > 1) h += poly(A, trail, GREEN, 2.5, ' stroke-dasharray="6 4"');
      h += '</g>' + axisLines();
      LEVELS.forEach(v => { const lx = A.xmax * 0.93, ly = v / lx; if (ly < A.ymax * 0.95) h += label(A.X(lx), A.Y(ly) - 6, it('u') + ' = ' + v, ORANGE, 'end', 18); });
      h += rightAngle(sx, sy, [x, -y], g, '#222');
      h += arrow(f.id, sx, sy, g[0], g[1], k, GREEN, 4) + label(sx + g[0] * k + 8, sy - g[1] * k - 8, '∇' + it('u'), GREEN, null, 22);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = (' + MUX + ', ' + MUY + ') = (<i>y</i>, <i>x</i>)') + '</div><div class="vp-sub">' + m('<i>u</i> = <i>x</i> · <i>y</i>') + ': the darker, the higher the hill</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m(GU + ' = ' + vec(g[0], g[1])) + ', ' + m('<i>u</i> = ' + r2(u)) + '</div>' +
        '<div class="dim">the mountain-climb arrow points the steepest way up the hill, at a right angle to the indifference curve through the dot; the longer the arrow, the steeper the climb</div>';
    }
    draggable(f, A, (x, y) => { stop(); trail = []; P = [Math.max(0.5, Math.min(A.xmax * 0.97, x)), Math.max(0.5, Math.min(A.ymax * 0.97, y))]; draw(); });
    button(f.ctl, 'climb', () => {
      stop(); trail = [P.slice()]; let id = 0;
      const step = () => { for (let r = 0; r < 3; r++) { const g = [P[1], P[0]], l = Math.hypot(g[0], g[1]) || 1; P = [P[0] + 0.25 * g[0] / l, P[1] + 0.25 * g[1] / l]; }
        trail.push(P.slice()); draw(); if (P[0] < A.xmax * 0.95 && P[1] < A.ymax * 0.95) id = requestAnimationFrame(step); };
      id = requestAnimationFrame(step); stop = () => cancelAnimationFrame(id);
    });
    [['A', q.xa], ['E', q.B / q.px / 2], ['C', q.xc]].forEach(([nm, x0]) => button(f.ctl, nm, () => { stop(); trail = []; P = [x0, q.B - q.px * x0]; draw(); }));
    button(f.ctl, 'reset', () => { stop(); trail = []; P = [q.xa, q.B - q.px * q.xa]; draw(); });
    f.ctl.appendChild(el('span', 'dim vp-hint', 'drag the dot anywhere'));
    draw();
  }

  // ---------- (e) split ∇u: along the budget line (walk this way and gain) + along p (costs money) ----------
  function split(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08), K = 2.4;
    const p = [q.px, q.py], d = [q.py, -q.px], dd = d[0] * d[0] + d[1] * d[1], pp = p[0] * p[0] + p[1] * p[1], tE = 0.5;
    let t = q.xa / xi, stop = () => {};
    function draw() {
      const x = t * xi, y = (1 - t) * yi, g = [y, x], sx = A.X(x), sy = A.Y(y);
      const a = (g[0] * d[0] + g[1] * d[1]) / dd, c = (g[0] * p[0] + g[1] * p[1]) / pp, al = [a * d[0], a * d[1]], ac = [c * p[0], c * p[1]];
      let h = defs(f.id) + clipOpen(f.id);
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5"/>';
      h += poly(A, FORMS.cd.curve(x * y), ORANGE, 2.5, ' opacity="0.7"');
      h += '</g>' + axisLines();
      // the box: ∇u is the diagonal, the two pieces are its sides
      const ex = sx + al[0] * K, ey = sy - al[1] * K, cx = sx + ac[0] * K, cy = sy - ac[1] * K;
      if (Math.abs(a) > 0.05) h += '<path d="M' + ex + ',' + ey + ' L' + (sx + g[0] * K) + ',' + (sy - g[1] * K) + ' L' + cx + ',' + cy + '" fill="none" stroke="' + GREY + '" stroke-width="1.4" stroke-dasharray="5 4"/>' + rightAngle(sx, sy, d, p, '#222');
      h += arrow(f.id, sx, sy, ac[0], ac[1], K, BLUE, 3.5) + arrow(f.id, sx, sy, al[0], al[1], K, PURPLE, 4.5) + arrow(f.id, sx, sy, g[0], g[1], K, GREEN, 3);
      h += label(sx + g[0] * K + 8, sy - g[1] * K - 8, '∇' + it('u'), GREEN, null, 22);
      if (Math.abs(a) > 0.05) h += label(ex + (a > 0 ? 12 : -12), ey + (a > 0 ? 8 : -2), 'gain', PURPLE, a > 0 ? null : 'end', 20);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = ' + vec(g[0], g[1])) + '</div><div class="vp-sub">' + m('= <b style="color:' + PURPLE + '">' + vec(al[0], al[1]) + '</b> + <b style="color:' + BLUE + '">' + vec(ac[0], ac[1]) + '</b>') + '</div>';
      f.status.innerHTML = '<div><b style="color:' + PURPLE + '">along the line</b> ' + m(vec(al[0], al[1])) + ': walk this way and you gain</div>' +
        '<div><b style="color:' + BLUE + '">along ' + m('<i>p</i>') + '</b> ' + m(vec(ac[0], ac[1]) + ' = ' + r2(c) + ' · ' + vec(p[0], p[1])) + ': you can’t use it, it costs money</div>' +
        '<div class="dim">' + (Math.abs(a) < 0.05 ? 'nothing left to gain along the line: ' + m(GU) + ' points the same way as ' + m('<i>p</i>') + '. This is the best feasible bundle.' : 'at ' + vec(x, y) + ' the purple piece is not 0: walking ' + (a > 0 ? 'towards more x' : 'towards more y') + ' makes you better off') + '</div>';
    }
    draggable(f, A, (x, y) => { stop(); t = Math.max(0.03, Math.min(0.97, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); draw(); });
    button(f.ctl, 'walk to the best feasible bundle', () => { stop(); stop = tween(() => t, v => { t = v; draw(); }, tE, 2200); });
    [['A', q.xa / xi], ['C', q.xc / xi]].forEach(([nm, tt]) => button(f.ctl, nm, () => { stop(); t = tt; draw(); }));
    button(f.ctl, 'reset', () => { stop(); t = q.xa / xi; draw(); });
    f.ctl.appendChild(el('span', 'dim vp-hint', 'drag the dot along the line'));
    draw();
  }

  // ---------- (f) stretch p by λ until it covers ∇u ----------
  function stretch(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08), K = 3.6;
    const xE = xi / 2, pts = { E: xE, A: q.xa, C: q.xc };
    let at = 'E', lam = 1, stop = () => {};
    function draw() {
      const x = pts[at], y = q.B - q.px * x, g = [y, x], sx = A.X(x), sy = A.Y(y), lp = [lam * q.px, lam * q.py];
      const hit = Math.hypot(g[0] - lp[0], g[1] - lp[1]) < 0.3;
      let h = defs(f.id) + clipOpen(f.id);
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BLUE + '" stroke-width="3.5" opacity="0.6"/>';
      h += poly(A, FORMS.cd.curve(x * y), ORANGE, 2.5, ' opacity="0.7"');
      h += '</g>' + axisLines();
      h += arrow(f.id, sx, sy, g[0], g[1], K, GREEN, hit ? 9 : 4, null) + label(sx + g[0] * K + 10, sy - g[1] * K - 10, '∇' + it('u'), GREEN, null, 22);
      h += arrow(f.id, sx, sy, lp[0], lp[1], K, BLUE, 3.5, hit ? null : '7 4') + label(sx + lp[0] * K + 8, sy - lp[1] * K + 26, 'λ' + it('p'), BLUE, null, 22);
      h += dot(sx, sy, 8) + label(sx - 14, sy + 6, at, '#222', 'end', 20);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = λ · <i>p</i>') + '</div><div class="vp-sub">same direction, different length: λ says how many times longer ' + m(GU) + ' is than ' + m('<i>p</i>') + '</div>';
      const parallel = Math.abs(g[0] * q.py - g[1] * q.px) < 1e-6;
      f.status.innerHTML = '<div>at ' + at + ' ' + vec(x, y) + ': ' + m(GU + ' = ' + vec(g[0], g[1])) + ', &nbsp; ' + m('λ<i>p</i> = ' + r2(lam) + ' · ' + vec(q.px, q.py) + ' = ' + vec(lp[0], lp[1])) + '</div>' +
        '<div class="dim">' + (hit ? '<b style="color:' + GREEN + '">λ = ' + r2(lam) + ': the stretched price arrow covers ' + m(GU) + ' exactly.</b> One more euro is worth ' + r2(lam) + ' more utility.'
          : parallel ? 'stretch ' + m('<i>p</i>') + ' until it covers ' + m(GU)
          : 'at ' + at + ' no stretch works: ' + m(GU) + ' and ' + m('<i>p</i>') + ' point different ways, so ' + at + ' is not the best feasible bundle') + '</div>';
    }
    const inp = slider(f.ctl, 'λ', 0, 16, 0.5, lam, (v, o, first) => { lam = v; o.innerHTML = r2(v); if (!first) { stop(); draw(); } });
    const target = () => { const x = pts[at], y = q.B - q.px * x; return Math.abs(y * q.py - x * q.px) < 1e-6 ? y / q.px : null; };
    button(f.ctl, 'stretch', () => { stop(); const tg = target() || 16; stop = tween(() => lam, v => { lam = Math.round(v * 2) / 2; inp.value = lam; inp.nextSibling.innerHTML = r2(lam); draw(); }, tg, 1800); });
    ['E', 'A', 'C'].forEach(nm => button(f.ctl, nm, () => { stop(); at = nm; draw(); }));
    button(f.ctl, 'reset', () => { stop(); at = 'E'; inp.set(1); draw(); });
    draw();
  }

  const CSS = '.vp{font-size:.6em;text-align:left;margin-top:.3em;display:grid;grid-template-columns:auto minmax(0,1fr);gap:1.2em;align-items:start}' +
    '.vp-svg{height:440px;width:auto;max-width:100%;display:block;touch-action:none;user-select:none;cursor:grab}' +
    '.vp-svg text,.vp-hill text{font-family:"STIX Two Text","Cambria Math",Georgia,serif}' +
    '.vp-hill{width:100%;max-width:380px;height:auto;display:block;margin:.3em 0}' +
    'html.mobile .vp{display:block;font-size:.9em}html.mobile .vp-svg{height:auto;width:100%}' +
    '.vp-side{font-size:1.15em}.vp-eq{line-height:1.5;margin-bottom:.3em}.vp-disp{font-size:1.25em}' +
    '.vp-m{font-family:"STIX Two Text","Cambria Math",Georgia,serif;font-size:1.12em;white-space:nowrap}.vp-m i{font-style:italic}.vp-m sub{font-size:.65em;vertical-align:-.25em}' +
    '.vp-fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .12em;line-height:1.05;font-size:.9em}.vp-fr>span:first-child{border-bottom:1px solid currentColor;padding:0 .15em}' +
    '.vp-ctl{display:flex;flex-wrap:wrap;gap:.5em;align-items:center;margin:.3em 0}.vp-break{flex-basis:100%;height:0}' +
    '.vp-ctl label{display:grid;grid-template-columns:6.5em 1fr 3em;gap:.6em;align-items:center;min-width:22em}' +
    '.vp-ctl input[type=range]{accent-color:#0062C4;width:100%}.vp-ctl .btn.on{background:var(--p-green,#E3F2E6)}.vp-v{font-weight:600;text-align:right}.vp-hint{font-size:.95em}' +
    '.vp-status{line-height:1.55}.vp-status>div{margin:.15em 0}';
  const KINDS = { 'op-forms': forms, 'op-walk': walk, 'op-price': price, 'op-grad': grad, 'op-split': split, 'op-stretch': stretch };   // names from Filiz's slide order
  function init() {
    const sel = Object.keys(KINDS).map(k => '.' + k).join(','); if (!document.querySelector(sel)) return;
    if (!document.getElementById('vp-css')) { const st = document.createElement('style'); st.id = 'vp-css'; st.textContent = CSS; document.head.appendChild(st); }
    Object.entries(KINDS).forEach(([k, fn]) => document.querySelectorAll('.' + k).forEach(fn));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
