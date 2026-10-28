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
