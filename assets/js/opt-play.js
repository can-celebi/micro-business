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
  // colours by role (Can 29.10): indifference curves blue, budget orange, ∇u dark blue, p dark orange
  const BUDGET = '#D9480F', IC = '#0062C4', ALONG = '#2F7D4F', GRAD = '#0B3D91', GREY = '#888', P_ARROW = '#A63E00';
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
      h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += ic(A, q.a, q.b, u, IC, 3);
      h += '</g>' + axisLines(A, q.xn, q.yn);
      const sx = X(p.x), sy = Y(p.y), gl = Math.hypot(g[0], g[1]);
      h += arrow(sx, sy, 72 * g[0] / gl, -72 * g[1] / gl, GRAD, 3);                       // ∇u, fixed length
      h += arrow(sx, sy, 72 * d[0] / dn, -72 * d[1] / dn, GREY, 2.5);                       // budget direction
      const ox = 16 * q.px / Math.hypot(q.px, q.py), oy = -16 * q.py / Math.hypot(q.px, q.py);   // 16 units off the line
      h += arrow(sx + ox, sy + oy, 84 * s / pmax * d[0] / dn, -84 * s / pmax * d[1] / dn, ALONG, 3.5); // projection along the line
      h += '<circle cx="' + sx + '" cy="' + sy + '" r="8" fill="#222" stroke="#fff" stroke-width="2"/>';
      const here = [['A', PTS[0] / xi], ['C', PTS[1] / xi], ['E', opt.x / xi]].find(([, tt]) => Math.abs(tt - t) <= 0.04);
      if (here) h += '<text x="' + (sx - 12) + '" y="' + (sy + 6) + '" text-anchor="end" font-size="20" fill="#222" ' + halo + '>' + here[0] + '</text>';
      h += '<text x="' + (sx + 72 * g[0] / gl + 6) + '" y="' + (sy - 72 * g[1] / gl - 6) + '" font-size="21" fill="' + GRAD + '" ' + halo + '>∇' + it('u') + '</text>';
      h += '<text x="' + (sx + 72 * d[0] / dn + 10) + '" y="' + (sy - 72 * d[1] / dn + 20) + '" font-size="21" fill="' + GREY + '" ' + halo + '>' + it('d') + '</text>';
      [['A', PTS[0] / xi], ['C', PTS[1] / xi], ['E', opt.x / xi]].forEach(([n, tt]) => { const pp = at(tt); if (tt > 0 && tt < 1 && Math.abs(tt - t) > 0.04) h += '<circle cx="' + X(pp.x) + '" cy="' + Y(pp.y) + '" r="3.5" fill="#555"/><text x="' + (X(pp.x) - 10) + '" y="' + (Y(pp.y) + 6) + '" text-anchor="end" font-size="20" fill="#555" ' + halo + '>' + n + '</text>'; });
      f.svg.innerHTML = h;
      const mrs = g[0] / g[1];
      f.eq.innerHTML = '<div class="op-disp">' + m('∇<i>u</i> = (' + MUX + ', ' + MUY + ') = (' + r2(g[0]) + ', ' + r2(g[1]) + ')') + '</div>' +
        '<div class="op-sub">' + m('MRS = ' + fr(MUX, MUY) + ' = ' + r2(mrs)) + ' &nbsp; vs &nbsp; ' + m(fr(PX, PY) + ' = ' + r2(q.px / q.py)) + '</div>';
      const near = Math.abs(s) < pmax * 0.02;
      f.status.innerHTML = '<div>at ' + m('(' + r2(p.x) + ', ' + r2(p.y) + ')') + ': <b style="color:' + ALONG + '">' + m('∇<i>u</i> · <i>d</i> = ' + sg(s)) + '</b> &nbsp; <span class="dim">' + m('<i>d</i> = (' + PY + ', −' + PX + ') = (' + q.py + ', −' + q.px + ')') + '</span></div>' +
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
      h += '<line x1="' + X(0) + '" y1="' + Y(q.B / q.py) + '" x2="' + X(q.B / q.px) + '" y2="' + Y(0) + '" stroke="' + BUDGET + '" stroke-width="' + (dB ? 2 : 3.5) + '" opacity="' + (dB ? 0.4 : 1) + '"/>';
      h += ic(A, q.a, q.b, u0, IC, dB ? 2 : 3, dB ? ' opacity="0.4"' : '');
      if (dB) { h += '<line x1="' + X(0) + '" y1="' + Y(Bk / q.py) + '" x2="' + X(Bk / q.px) + '" y2="' + Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>'; h += ic(A, q.a, q.b, uk, IC, 3); }
      h += '</g>' + axisLines(A, q.xn, q.yn);
      h += '<circle cx="' + X(o0.x) + '" cy="' + Y(o0.y) + '" r="7" fill="#222"/>';
      if (dB) h += '<circle cx="' + X(ok.x) + '" cy="' + Y(ok.y) + '" r="8" fill="' + GRAD + '" stroke="#fff" stroke-width="2"/>';
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
      h += '<polygon points="' + X(0) + ',' + Y(0) + ' ' + X(0) + ',' + Y(yi) + ' ' + X(xi) + ',' + Y(0) + '" fill="#FDE3CF" opacity="0.7"/>';
      h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      let bx = null, by = null, line = false, say;
      if (kind === 'subs') {
        // u = a·x + b·y: straight indifference lines (slope −a/b); the best one touches the budget at a corner
        const ub = Math.max(ax * xi, ay * yi);      // utility at the best corner
        [0.45, 0.72].forEach(c => { const v = ub * c; h += '<line x1="' + X(0) + '" y1="' + Y(v / ay) + '" x2="' + X(v / ax) + '" y2="' + Y(0) + '" stroke="' + IC + '" stroke-width="2" opacity="0.4"/>'; });
        h += '<line x1="' + X(0) + '" y1="' + Y(ub / ay) + '" x2="' + X(ub / ax) + '" y2="' + Y(0) + '" stroke="' + IC + '" stroke-width="3"/>';
        const mrs = ax / ay, pr = px / py;
        if (Math.abs(pr - mrs) < 1e-9) { line = true; say = m('MRS = ' + r2(mrs) + ' = ' + fr(PX, PY)) + ': every bundle on the budget line is best'; }
        else if (pr < mrs) { bx = xi; by = 0; say = m('MRS = ' + r2(mrs) + ' > ' + r2(pr) + ' = ' + fr(PX, PY)) + ': only x, at ' + m('(' + r2(xi) + ', 0)'); }
        else { bx = 0; by = yi; say = m('MRS = ' + r2(mrs) + ' < ' + r2(pr) + ' = ' + fr(PX, PY)) + ': only y, at ' + m('(0, ' + r2(yi) + ')'); }
      } else {
        // u = min{x, y}: L-shaped curves, kink on y = x; the best bundle is the kink on the budget line
        const k = B / (px + py);
        [0.5, 0.75].forEach(c => { const v = k * c; h += '<polyline points="' + X(v) + ',' + Y(A.ymax) + ' ' + X(v) + ',' + Y(v) + ' ' + X(A.xmax) + ',' + Y(v) + '" fill="none" stroke="' + IC + '" stroke-width="2" opacity="0.4"/>'; });
        h += '<polyline points="' + X(k) + ',' + Y(A.ymax) + ' ' + X(k) + ',' + Y(k) + ' ' + X(A.xmax) + ',' + Y(k) + '" fill="none" stroke="' + IC + '" stroke-width="3"/>';
        h += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(Math.min(A.xmax, A.ymax)) + '" y2="' + Y(Math.min(A.xmax, A.ymax)) + '" stroke="' + GREY + '" stroke-width="1.5" stroke-dasharray="5 5"/>';
        bx = k; by = k; say = 'the kink on ' + m('<i>y</i> = <i>x</i>') + ': ' + m('<i>x</i> = <i>y</i> = ' + fr('<i>B</i>', PX + ' + ' + PY) + ' = ' + r2(k)) + ' (the price only moves the kink)';
      }
      h += '</g>' + axisLines(A, xn, yn);
      if (line) h += '<line x1="' + X(0) + '" y1="' + Y(yi) + '" x2="' + X(xi) + '" y2="' + Y(0) + '" stroke="' + GRAD + '" stroke-width="7" opacity="0.55"/>';
      else h += '<circle cx="' + X(bx) + '" cy="' + Y(by) + '" r="10" fill="' + GRAD + '" stroke="#fff" stroke-width="2"/>';
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="op-disp">' + (kind === 'subs' ? m('<i>u</i> = ' + (ax === 1 ? '' : ax) + '<i>x</i> + ' + (ay === 1 ? '' : ay) + '<i>y</i>') : m('<i>u</i> = min{<i>x</i>, <i>y</i>}')) + '</div>' +
        '<div class="op-sub">budget ' + m((px === 1 ? '' : r2(px) + '&#8202;') + '<i>x</i> + ' + (py === 1 ? '' : py) + '<i>y</i> = ' + B) + '</div>';
      f.status.innerHTML = '<div>' + say + '</div>';
    }
    const inp = slider(f.ctl, 'price of x', 1, +box.dataset.pxmax || 3, 0.1, px, (v, o) => { px = Math.round(v * 10) / 10; o.innerHTML = '€' + r2(px); draw(); });
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
  // colours by role (Can 29.10): indifference curves blue, budget orange, ∇u dark blue, p dark orange
  const BUDGET = '#D9480F', IC = '#0062C4', ALONG = '#2F7D4F', GRAD = '#0B3D91', GREY = '#888', P_ARROW = '#A63E00';
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
    ql: { name: 'quasi-linear', eq: '<i>u</i> = <i>x</i> + 2√<i>y</i>', note: 'x always counts the same, y less and less',
      U: (x, y) => x + 2 * Math.sqrt(y), curve: u => { const p = [], ye = Math.pow(u / 2, 2); for (let i = 0; i <= 240; i++) { const y = Math.min(ye, 0.3 * i); p.push([u - 2 * Math.sqrt(y), y]); if (y >= ye) break; } return p; }, how: 'the curve just touches the line' }
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
    const minis = el('div', 'vp-minis'), mx = document.createElementNS(NS, 'svg'), my = document.createElementNS(NS, 'svg');
    [[mx, 'x'], [my, 'y']].forEach(([v, n]) => { v.setAttribute('viewBox', '0 0 260 180'); v.setAttribute('class', 'vp-mini'); const c = el('div', 'vp-minic'); c.appendChild(v); c.appendChild(el('div', 'vp-sub', m('<i>u</i>') + ' along the budget line, against ' + m('<i>' + n + '</i>'))); minis.appendChild(c); });
    f.side.insertBefore(minis, f.ctl);
    // u along the budget line, drawn against x (k = 0) or against y (k = 1)
    function mini(svgEl, k, F, b, tNow) {
      const ML = 48, MB = 34, MT = 12, MR = 10, w = 260 - ML - MR, hh = 180 - MT - MB, top = Math.max(b.u, 1e-9) * 1.18;
      const coord = tt => k ? (1 - tt) * yi : tt * xi, span = k ? yi : xi;
      const PX_ = v => ML + v / span * w, PY_ = u => MT + hh - u / top * hh;
      const pts = []; for (let i = 0; i <= 200; i++) { const tt = i / 200, [xx, yy] = at(tt); pts.push(PX_(coord(tt)).toFixed(1) + ',' + PY_(F.U(xx, yy)).toFixed(1)); }
      const [xn, yn] = at(tNow), un = F.U(xn, yn), cb = coord(b.t), cn = coord(tNow);
      let g = '<line x1="' + ML + '" y1="' + MT + '" x2="' + ML + '" y2="' + (MT + hh) + '" stroke="#222"/><line x1="' + ML + '" y1="' + (MT + hh) + '" x2="' + (ML + w) + '" y2="' + (MT + hh) + '" stroke="#222"/>';
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ALONG + '" stroke-width="2.5"/>';
      g += '<line x1="' + PX_(cb) + '" y1="' + PY_(b.u) + '" x2="' + PX_(cb) + '" y2="' + (MT + hh) + '" stroke="' + GRAD + '" stroke-width="1.6" stroke-dasharray="4 4"/>';
      g += label(PX_(cb), MT + hh + 24, r2(cb), GRAD, 'middle', 17) + label(ML - 6, PY_(b.u) + 6, r2(b.u), GRAD, 'end', 17);
      g += dot(PX_(cn), PY_(un), 6) + label(ML - 8, MT + 12, it('u'), '#555', 'end', 18);
      svgEl.innerHTML = g;
    }
    function draw() {
      const F = FORMS[key], [x, y] = at(t), u = F.U(x, y), b = bestOnLine(F, xi, yi), [bx, by] = at(b.t);
      let h = defs(f.id) + clipOpen(f.id);
      // (2) the budget set, shaded, and the names on the graph
      h += '<polygon points="' + A.X(0) + ',' + A.Y(0) + ' ' + A.X(0) + ',' + A.Y(yi) + ' ' + A.X(xi) + ',' + A.Y(0) + '" fill="#FDE3CF" opacity="0.75"/>';
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      [0.35, 0.7, 1.4].forEach(c => { h += poly(A, F.curve(b.u * c), IC, 1.8, ' opacity="0.35"'); });   // a few curves of the map
      if (shown) h += poly(A, F.curve(b.u), GRAD, 3);
      h += poly(A, F.curve(u), IC, 3);
      h += '</g>' + axisLines();
      const ang = Math.atan2(A.Y(0) - A.Y(yi), A.X(xi) - A.X(0)) * 180 / Math.PI, n = Math.hypot(q.px, q.py), nx = q.px / n, ny = q.py / n;
      const mxp = (A.X(0) + A.X(xi)) / 2, myp = (A.Y(yi) + A.Y(0)) / 2;
      const rot = (cx, cy, txt, col) => '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" transform="rotate(' + ang.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')" text-anchor="middle" font-size="18" fill="' + col + '" ' + halo + '>' + txt + '</text>';
      h += rot(mxp - 22 * nx, myp + 22 * ny + 6, 'budget set', '#B04A12') + rot(mxp + 16 * nx, myp - 16 * ny, 'budget line', BUDGET);
      const dense = c => c.flatMap((pt, i) => i ? Array.from({ length: 20 }, (_, j) => [c[i - 1][0] + (pt[0] - c[i - 1][0]) * (j + 1) / 20, c[i - 1][1] + (pt[1] - c[i - 1][1]) * (j + 1) / 20]) : [pt]);
      const cand = dense(F.curve(b.u * 1.4).map(([a, c]) => [a, Math.min(c, A.ymax * 2)])).filter(([cx, cy]) => cx < A.xmax * 0.92 && cy < A.ymax * 0.9 && cy > A.ymax * 0.12);
      if (cand.length) { const [cx, cy] = cand.reduce((a, c) => c[0] > a[0] ? c : a); h += label(A.X(cx) - 6, A.Y(cy) - 10, 'indifference curves', IC, 'end', 18); }
      if (shown) h += dot(A.X(bx), A.Y(by), 7, GRAD);
      h += dot(A.X(x), A.Y(y), 9);
      h += label(A.X(x) + 14, A.Y(y) - 12, it('u') + ' = ' + r2(u), '#222');
      f.svg.innerHTML = h;
      mini(mx, 0, F, b, t); mini(my, 1, F, b, t);
      f.eq.innerHTML = '<div class="vp-disp">' + m(F.eq) + '</div><div class="vp-sub">' + F.name + ': ' + F.note + '</div><div class="vp-sub">budget ' + m(q.px + '<i>x</i> + <i>y</i> = ' + q.B) + '</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m('<i>u</i> = ' + r2(u)) + '</div>' +
        (shown ? '<div><b style="color:' + GRAD + '">best feasible bundle ' + vec(bx, by) + ', ' + m('<i>u</i> = ' + r2(b.u)) + '</b>: ' + F.how + '</div>' : '<div class="dim">drag the dot along the line: where is ' + m('<i>u</i>') + ' highest?</div>');
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
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += poly(A, F.curve(u), IC, 3);
      h += '</g>' + axisLines() + dot(A.X(x), A.Y(y), 9);
      f.svg.innerHTML = h;
      // the hill: u along the line, against x
      const pts = []; for (let k = 0; k <= 120; k++) { const tt = k / 120, [xx, yy] = at(tt); pts.push(hX(xx).toFixed(1) + ',' + hY(F.U(xx, yy)).toFixed(1)); }
      let g = '<line x1="' + HL + '" y1="' + HT + '" x2="' + HL + '" y2="' + (HT + hh) + '" stroke="#222"/><line x1="' + HL + '" y1="' + (HT + hh) + '" x2="' + (HL + hw) + '" y2="' + (HT + hh) + '" stroke="#222"/>';
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + IC + '" stroke-width="2.5" opacity="0.55"/>';
      if (seen) g += '<line x1="' + HL + '" y1="' + hY(b.u) + '" x2="' + (HL + hw) + '" y2="' + hY(b.u) + '" stroke="' + GRAD + '" stroke-dasharray="5 5"/>' + label(HL - 6, hY(b.u) + 6, r2(b.u), GRAD, 'end', 18);
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
      [0.5, 1.5].forEach(c => { h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi * c) + '" x2="' + A.X(xi * c) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="1.6" opacity="0.35"/>'; });
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += '</g>' + axisLines();
      h += label(A.X(xi * 0.5) - 10, A.Y(yi * 0.5) + 26, '€' + q.B / 2, BUDGET, 'end', 18) + label(A.X(xi * 1.5 * 0.82) + 10, A.Y(yi * 1.5 * 0.18) - 8, '€' + q.B * 1.5, BUDGET, null, 18);
      const dl = 3.2 / Math.hypot(d[0], d[1]);
      h += arrow(f.id, sx, sy, d[0] * dl, d[1] * dl, K, GREY, 2.5) + label(sx + d[0] * dl * K + 10, sy - d[1] * dl * K + 22, it('d'), GREY, null, 21);
      h += rightAngle(sx, sy, d, [px, py]);
      h += arrow(f.id, sx, sy, px, py, K, P_ARROW, 4) + label(sx + px * K + 8, sy - py * K - 8, it('p'), P_ARROW, null, 22);
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
      shade += '<rect x="' + (L + i * cw).toFixed(1) + '" y="' + (T + ph - (j + 1) * chh).toFixed(1) + '" width="' + (cw + 0.5).toFixed(1) + '" height="' + (chh + 0.5).toFixed(1) + '" fill="#1C5FB0" opacity="' + Math.min(0.3, 0.3 * Math.sqrt(u / 2400)).toFixed(3) + '"/>';
    }
    function draw() {
      const [x, y] = P, g = [y, x], u = x * y, sx = A.X(x), sy = A.Y(y), gl = Math.hypot(g[0], g[1]), k = Math.min(K, 120 / gl);
      let h = defs(f.id) + clipOpen(f.id) + shade;
      LEVELS.forEach(v => { h += poly(A, FORMS.cd.curve(v), IC, 1.6, ' opacity="0.45"'); });
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="2" opacity="0.5"/>';
      h += poly(A, FORMS.cd.curve(u), IC, 3);
      if (trail.length > 1) h += poly(A, trail, GRAD, 2.5, ' stroke-dasharray="6 4"');
      h += '</g>' + axisLines();
      LEVELS.forEach(v => { const lx = A.xmax * 0.93, ly = v / lx; if (ly < A.ymax * 0.95) h += label(A.X(lx), A.Y(ly) - 6, it('u') + ' = ' + v, IC, 'end', 18); });
      h += rightAngle(sx, sy, [x, -y], g, '#222');
      h += arrow(f.id, sx, sy, g[0], g[1], k, GRAD, 4) + label(sx + g[0] * k + 8, sy - g[1] * k - 8, '∇' + it('u'), GRAD, null, 22);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = (' + MUX + ', ' + MUY + ') = (<i>y</i>, <i>x</i>)') + '</div><div class="vp-sub">' + m('<i>u</i> = <i>x</i> · <i>y</i>') + ': the darker, the higher the hill</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m(GU + ' = ' + vec(g[0], g[1])) + ', ' + m('<i>u</i> = ' + r2(u)) + '</div>' +
        '<div class="dim">steepest way up · square to the indifference curve</div>';
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
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += poly(A, FORMS.cd.curve(x * y), IC, 2.5, ' opacity="0.7"');
      h += '</g>' + axisLines();
      // the box: ∇u is the diagonal, the two pieces are its sides
      const ex = sx + al[0] * K, ey = sy - al[1] * K, cx = sx + ac[0] * K, cy = sy - ac[1] * K;
      if (Math.abs(a) > 0.05) h += '<path d="M' + ex + ',' + ey + ' L' + (sx + g[0] * K) + ',' + (sy - g[1] * K) + ' L' + cx + ',' + cy + '" fill="none" stroke="' + GREY + '" stroke-width="1.4" stroke-dasharray="5 4"/>' + rightAngle(sx, sy, d, p, '#222');
      h += arrow(f.id, sx, sy, ac[0], ac[1], K, P_ARROW, 3.5) + arrow(f.id, sx, sy, al[0], al[1], K, ALONG, 4.5) + arrow(f.id, sx, sy, g[0], g[1], K, GRAD, 3);
      h += label(sx + g[0] * K + 8, sy - g[1] * K - 8, '∇' + it('u'), GRAD, null, 22);
      if (Math.abs(a) > 0.05) h += label(ex + (a > 0 ? 12 : -12), ey + (a > 0 ? 8 : -2), 'gain', ALONG, a > 0 ? null : 'end', 20);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = ' + vec(g[0], g[1])) + '</div><div class="vp-sub">' + m('= <b style="color:' + ALONG + '">' + vec(al[0], al[1]) + '</b> + <b style="color:' + P_ARROW + '">' + vec(ac[0], ac[1]) + '</b>') + '</div>';
      f.status.innerHTML = '<div><b style="color:' + ALONG + '">along the line</b> ' + m(vec(al[0], al[1])) + ': you gain</div>' +
        '<div><b style="color:' + P_ARROW + '">along ' + m('<i>p</i>') + '</b> ' + m(vec(ac[0], ac[1]) + ' = ' + r2(c) + ' · ' + vec(p[0], p[1])) + ': costs money</div>' +
        '<div class="dim">' + (Math.abs(a) < 0.05 ? 'gain 0 · ' + m(GU) + ' parallel to ' + m('<i>p</i>') + ' · best feasible bundle' : 'gain ≠ 0 · walk ' + (a > 0 ? 'towards more x' : 'towards more y')) + '</div>';
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
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5" opacity="0.6"/>';
      h += poly(A, FORMS.cd.curve(x * y), IC, 2.5, ' opacity="0.7"');
      h += '</g>' + axisLines();
      h += arrow(f.id, sx, sy, g[0], g[1], K, GRAD, hit ? 9 : 4, null) + label(sx + g[0] * K + 10, sy - g[1] * K - 10, '∇' + it('u'), GRAD, null, 22);
      h += arrow(f.id, sx, sy, lp[0], lp[1], K, P_ARROW, 3.5, hit ? null : '7 4') + label(sx + lp[0] * K + 8, sy - lp[1] * K + 26, 'λ' + it('p'), P_ARROW, null, 22);
      h += dot(sx, sy, 8) + label(sx - 14, sy + 6, at, '#222', 'end', 20);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m(GU + ' = λ · <i>p</i>') + '</div><div class="vp-sub">same direction, different length: λ says how many times longer ' + m(GU) + ' is than ' + m('<i>p</i>') + '</div>';
      const parallel = Math.abs(g[0] * q.py - g[1] * q.px) < 1e-6;
      f.status.innerHTML = '<div>at ' + at + ' ' + vec(x, y) + ': ' + m(GU + ' = ' + vec(g[0], g[1])) + ', &nbsp; ' + m('λ<i>p</i> = ' + r2(lam) + ' · ' + vec(q.px, q.py) + ' = ' + vec(lp[0], lp[1])) + '</div>' +
        '<div class="dim">' + (hit ? '<b style="color:' + GRAD + '">λ = ' + r2(lam) + ': the stretched price arrow covers ' + m(GU) + ' exactly.</b> One more euro is worth ' + r2(lam) + ' more utility.'
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


  // ---------- (g) a step of fixed length turns around A: how much does it climb? (walkthrough 4–5) ----------
  //   <div class="op-step" data-surface="roof|hill"></div>   roof: rise 3·dx + 1·dy (exact, flat roof); hill: 45·dx + 5·dy at A (small steps)
  function step(box) {
    const q = params(box), f = frame(box), hill = box.dataset.surface === 'hill', xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08);
    const P = [q.xa, q.B - q.px * q.xa], g = hill ? [P[1], P[0]] : [q.px, q.py], along = hill ? [1, -P[1] / P[0]] : [q.py, -q.px];
    const gl = Math.hypot(g[0], g[1]), thLine = Math.atan2(along[1], along[0]) * 180 / Math.PI, thMax = Math.atan2(g[1], g[0]) * 180 / Math.PI;
    let th = thLine, stop = () => {};
    const LEN = 80;                                          // the step arrow, pixels
    function draw() {
      const c = Math.cos(th * Math.PI / 180), s = Math.sin(th * Math.PI / 180), rise = g[0] * c + g[1] * s, sx = A.X(P[0]), sy = A.Y(P[1]);
      let h = defs(f.id) + clipOpen(f.id);
      if (hill) { [150, 300, 400].forEach(v => { h += poly(A, FORMS.cd.curve(v), IC, 1.6, ' opacity="0.4"'); }); h += poly(A, FORMS.cd.curve(P[0] * P[1]), IC, 3); }
      else { [40, 80].forEach(v => { h += '<line x1="' + A.X(0) + '" y1="' + A.Y(v / q.py) + '" x2="' + A.X(v / q.px) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="1.6" opacity="0.4"/>'; }); h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3"/>'; }
      h += '</g>' + axisLines();
      // ghost marks: along the height line (rise 0) and straight across (largest)
      const gh = (t, col) => { const cc = Math.cos(t * Math.PI / 180), ss = Math.sin(t * Math.PI / 180); return '<line x1="' + sx + '" y1="' + sy + '" x2="' + (sx + LEN * cc) + '" y2="' + (sy - LEN * ss) + '" stroke="' + col + '" stroke-width="2" stroke-dasharray="4 4" opacity="0.7"/>'; };
      h += gh(thLine, GREY) + gh(thMax, hill ? GRAD : P_ARROW);
      h += label(sx + (LEN + 8) * Math.cos(thMax * Math.PI / 180), sy - (LEN + 8) * Math.sin(thMax * Math.PI / 180) - 4, 'largest', hill ? GRAD : P_ARROW, null, 18);
      h += label(sx + (LEN + 6) * Math.cos(thLine * Math.PI / 180) + 6, sy - (LEN + 6) * Math.sin(thLine * Math.PI / 180) + 6, '0', GREY, null, 18);
      h += '<line x1="' + sx + '" y1="' + sy + '" x2="' + (sx + LEN * c) + '" y2="' + (sy - LEN * s) + '" stroke="' + ALONG + '" stroke-width="4" marker-end="url(#' + f.id + 'a)"/>';
      h += dot(sx, sy, 8) + label(sx - 12, sy + 6, 'A', '#222', 'end');
      // the bar: how much this step climbs
      const bw = 150, bx = W - R - bw - 6, by = T + 10, frac = rise / gl;
      h += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="16" fill="#eee"/><line x1="' + (bx + bw / 2) + '" y1="' + (by - 3) + '" x2="' + (bx + bw / 2) + '" y2="' + (by + 19) + '" stroke="#222"/>';
      h += '<rect x="' + (frac >= 0 ? bx + bw / 2 : bx + bw / 2 + frac * bw / 2) + '" y="' + by + '" width="' + Math.abs(frac) * bw / 2 + '" height="16" fill="' + ALONG + '"/>';
      h += label(bx + bw / 2, by + 40, 'rise ' + r2(rise), ALONG, 'middle', 19);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m((hill ? 'rise = ' + r2(g[0]) + '·<i>dx</i> + ' + r2(g[1]) + '·<i>dy</i>' : 'rise = 3·<i>dx</i> + 1·<i>dy</i>')) + '</div><div class="vp-sub">' + (hill ? 'on the utility hill at A, for small steps' : 'on the spending roof (flat, so exact)') + '</div>';
      f.status.innerHTML = '<div>step ' + m('(<i>dx</i>, <i>dy</i>) = ' + vec(c, s)) + ' (length 1): rise ' + m(r2(rise)) + '</div>' +
        '<div class="dim">' + (Math.abs(rise) < 0.02 * gl ? 'along the height line: it climbs nothing' : Math.abs(rise - gl) < 0.002 * gl ? 'straight across the height line: the largest rise, ' + r2(gl) + (hill ? ', along ' + m(GU + ' = ' + vec(g[0], g[1])) : ', along ' + m('<i>p</i> = (3, 1)')) : 'turn the step: where is the rise 0, where is it largest?') + '</div>';
    }
    const snap = v => Math.abs(v - thLine) < 0.6 ? thLine : Math.abs(v - thMax) < 0.6 ? thMax : v;   // the two special directions exactly
    const inp = slider(f.ctl, 'turn', -180, 180, 1, Math.round(th), (v, o, first) => { if (!first) th = snap(v); o.innerHTML = Math.round(th) + '°'; if (!first) { stop(); draw(); } });
    const go = to => { stop(); stop = tween(() => th, v => { th = v; inp.value = Math.round(v); inp.nextSibling.innerHTML = Math.round(v) + '°'; draw(); }, to, 1200); };
    button(f.ctl, 'along the height line', () => go(thLine));
    button(f.ctl, 'quarter turn', () => go(thMax));
    button(f.ctl, 'reset', () => { stop(); inp.set(Math.round(thLine)); th = thLine; inp.nextSibling.innerHTML = Math.round(th) + '°'; draw(); });
    draw();
  }

  // ---------- (h) two arrows along the budget line, with the angle between them (walkthrough 6) ----------
  function two(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px, yi = q.B / q.py, A = axes(xi * 1.1, yi * 1.08);
    let t = q.xa / xi, stop = () => {};
    function draw() {
      const x = t * xi, y = (1 - t) * yi, g = [y, x], p = [q.px, q.py], sx = A.X(x), sy = A.Y(y);
      const ang = Math.abs(Math.atan2(g[1], g[0]) - Math.atan2(p[1], p[0])) * 180 / Math.PI;
      const un = (v, L0) => { const l = Math.hypot(v[0], v[1]); return [v[0] / l * L0, v[1] / l * L0]; }, gu = un(g, 1), pu = un(p, 1);
      let h = defs(f.id) + clipOpen(f.id);
      h += '<line x1="' + A.X(0) + '" y1="' + A.Y(yi) + '" x2="' + A.X(xi) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += poly(A, FORMS.cd.curve(x * y), IC, 3);
      h += '</g>' + axisLines();
      h += rightAngle(sx, sy, [1, -y / x], g, IC) + rightAngle(sx, sy, [q.py, -q.px], p, BUDGET);
      h += arrow(f.id, sx, sy, pu[0], pu[1], 70, P_ARROW, 4) + label(sx + pu[0] * 70 + 8, sy - pu[1] * 70 + 22, it('p'), P_ARROW, null, 22);
      h += arrow(f.id, sx, sy, gu[0], gu[1], 100, GRAD, 4) + label(sx + gu[0] * 100 + 8, sy - gu[1] * 100 - 8, '∇' + it('u'), GRAD, null, 22);
      h += dot(sx, sy, 8);
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">angle between ' + m(GU) + ' and ' + m('<i>p</i>') + ': ' + m(ang < 0.05 ? '0°' : r2(Math.round(ang * 10) / 10) + '°') + '</div><div class="vp-sub">only the directions are drawn here</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ': ' + m(GU + ' = ' + vec(g[0], g[1])) + ', ' + m('<i>p</i> = ' + vec(p[0], p[1])) + '</div>' +
        '<div class="dim">' + (ang < 0.05 ? 'the two height lines touch here, so the two arrows point the same way' : 'each arrow stands at a right angle to its own height line; here the lines cross, so the arrows point different ways') + '</div>';
    }
    const inp = slider(f.ctl, 'along the line', 0.03, 0.97, 0.005, t, (v, o, first) => { t = v; o.innerHTML = ''; if (!first) { stop(); draw(); } });
    [['A', q.xa / xi], ['E', 0.5], ['C', q.xc / xi]].forEach(([nm, tt]) => button(f.ctl, nm, () => { stop(); stop = tween(() => t, v => { t = v; inp.value = v; draw(); }, tt, 900); }));
    draggable(f, A, (x, y) => { stop(); t = Math.max(0.03, Math.min(0.97, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); inp.value = t; draw(); });
    draw();
  }

  // a small profile graph: u along the budget line against x (for the fence screens)
  function profile(svgEl, xs, fn, opts) {
    const HL = 56, HB = 40, HT = 16, HR = 16, Wp = 500, Hp = 340, pw2 = Wp - HL - HR, ph2 = Hp - HT - HB;
    const [x0, x1] = xs, u0 = opts.umin || 0, u1 = opts.umax, X = x => HL + (x - x0) / (x1 - x0) * pw2, Y = u => HT + ph2 - (u - u0) / (u1 - u0) * ph2;
    svgEl.setAttribute('viewBox', '0 0 ' + Wp + ' ' + Hp);
    let g = '<line x1="' + HL + '" y1="' + HT + '" x2="' + HL + '" y2="' + (HT + ph2) + '" stroke="#222"/><line x1="' + HL + '" y1="' + (HT + ph2) + '" x2="' + (HL + pw2) + '" y2="' + (HT + ph2) + '" stroke="#222"/>';
    const pts = []; for (let k = 0; k <= 160; k++) { const x = x0 + (x1 - x0) * k / 160; pts.push(X(x).toFixed(1) + ',' + Y(fn(x)).toFixed(1)); }
    g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ALONG + '" stroke-width="3"/>';
    g += label(HL - 8, HT + 14, it(opts.yl || 'u'), '#555', 'end', 20) + label(HL + pw2, HT + ph2 + 30, it(opts.xl || 'x'), '#555', 'end', 20);
    return { g, X, Y, HL, HT, pw2, ph2 };
  }

  // ---------- (i) gain minus loss along the fence (walkthrough 8a) ----------
  function gainloss(box) {
    const q = params(box), f = frame(box), xi = q.B / q.px;
    let x = q.xa, stop = () => {};
    const U = x => x * (q.B - q.px * x);
    function draw() {
      const y = q.B - q.px * x, gain = y, loss = q.px * x, net = gain - loss, P = profile(f.svg, [0, xi], U, { umax: 330 });
      let h = defs(f.id) + P.g;
      [5, 10, 15].forEach(v => { h += label(P.X(v), P.HT + P.ph2 + 24, String(v), '#555', 'middle', 18); });
      h += '<line x1="' + P.X(x) + '" y1="' + P.Y(U(x)) + '" x2="' + P.X(x) + '" y2="' + (P.HT + P.ph2) + '" stroke="' + GREY + '" stroke-dasharray="4 4"/>' + dot(P.X(x), P.Y(U(x)), 8);
      h += label(P.X(x) + 12, P.Y(U(x)) - 12, it('u') + ' = ' + r2(U(x)), '#222');
      f.svg.innerHTML = h;
      const mx = q.B, bar = (v, col) => '<span class="vp-bar" style="width:' + (Math.abs(v) / mx * 12) + 'em;background:' + col + '"></span>';
      f.eq.innerHTML = '<div class="vp-disp">one step along the line: ' + m('<i>d</i> = (1, −3)') + '</div><div class="vp-sub">one more x, three fewer y</div>';
      f.status.innerHTML = '<div>at ' + vec(x, y) + ':</div>' +
        '<div class="vp-row"><span>gain ' + m(MUX + ' = <i>y</i> = ' + r2(gain)) + '</span>' + bar(gain, GRAD) + '</div>' +
        '<div class="vp-row"><span>loss ' + m('3 · ' + MUY + ' = 3<i>x</i> = ' + r2(loss)) + '</span>' + bar(loss, IC) + '</div>' +
        '<div><b>net ' + m(r2(gain) + ' − ' + r2(loss) + ' = ' + r2(net)) + '</b>: ' + (Math.abs(net) < 1e-9 ? 'the top of the fence' : net > 0 ? 'keep going (more x)' : 'go back (more y)') + '</div>';
    }
    const inp = slider(f.ctl, 'x', 0.5, xi - 0.5, 0.5, x, (v, o, first) => { x = v; o.innerHTML = r2(v); if (!first) { stop(); draw(); } });
    [['A', q.xa], ['E', xi / 2], ['C', q.xc]].forEach(([nm, v]) => button(f.ctl, nm, () => inp.set(v)));
    draw();
  }

  // ---------- (j) the exact check: shrinking steps from A (walkthrough 8b) ----------
  function exact(box) {
    const q = params(box), f = frame(box), P0 = [q.xa, q.B - q.px * q.xa], d = [1, -q.px];
    const F = t => (P0[0] + t * d[0]) * (P0[1] + t * d[1]), u0 = F(0), rate = P0[1] * d[0] + P0[0] * d[1];
    let s = 0; const tried = [];
    function draw() {
      const tmax = s ? s * 1.6 : 1.6, P = profile(f.svg, [0, tmax], t => F(t), { umin: u0 - (F(tmax) - u0) * 0.15, umax: F(tmax) + (F(tmax) - u0) * 0.1, xl: 't', yl: 'u' });
      let h = defs(f.id) + P.g;
      h += '<line x1="' + P.X(0) + '" y1="' + P.Y(u0) + '" x2="' + P.X(tmax) + '" y2="' + P.Y(u0 + rate * tmax) + '" stroke="' + GRAD + '" stroke-width="2" stroke-dasharray="6 5"/>';
      h += label(P.X(tmax) - 4, P.Y(u0 + rate * tmax) - 10, 'slope ' + rate, GRAD, 'end', 18);
      h += dot(P.X(0), P.Y(u0), 7) + label(P.X(0) + 10, P.Y(u0) + 26, 'A', '#222');
      if (s) { h += '<line x1="' + P.X(0) + '" y1="' + P.Y(u0) + '" x2="' + P.X(s) + '" y2="' + P.Y(F(s)) + '" stroke="' + ALONG + '" stroke-width="3"/>' + dot(P.X(s), P.Y(F(s)), 7, ALONG); }
      f.svg.innerHTML = h;
      f.eq.innerHTML = '<div class="vp-disp">' + m('<i>u</i>(<i>t</i>) = 225 + 30<i>t</i> − 3<i>t</i>²') + '</div><div class="vp-sub">the fence height, walking ' + m('<i>t</i>') + ' steps of ' + m('<i>d</i> = (1, −3)') + ' from A</div>';
      f.status.innerHTML = tried.length ? tried.map(([t, v]) => '<div>step ' + m('<i>t</i> = ' + t) + ': gain per unit of step ' + m(String(+v.toFixed(5))) + '</div>').join('') + (tried.some(([t]) => t === 0.01) ? '<div><b>it settles at 30 = gain minus loss</b></div>' : '') : '<div class="dim">pick a step size</div>';
    }
    [1, 0.1, 0.01].forEach(t => button(f.ctl, 'step ' + t, () => { s = t; if (!tried.some(([x]) => x === t)) tried.push([t, (F(t) - u0) / t]); tried.sort((a, b) => b[0] - a[0]); draw(); }));
    button(f.ctl, 'reset', () => { s = 0; tried.length = 0; draw(); });
    draw();
  }

  // ---------- (k) op-param: one function, its parameters on sliders (Can 29.10: "sliders on parameters for each function …
  //   another button to make a copy of that on the graph with dash … so that we can compare") ----------
  //   <div class="op-param" data-form="subs|comp|cd|ql"></div>   subs u = ax + by; comp u = min{ax, by}; cd u = x^α y^β;
  //   ql u = αx + y^β (β < 1). Three blue indifference curves at fixed u levels, the formula with the current numbers, the
  //   MRS at a marked point; [keep a copy] (up to 3, dashed), [clear copies], [show budget] (3x + y = 60 and the best point).
  const PFORMS = {
    subs: { ps: [['a', 0.5, 5, 0.1, 2], ['b', 0.5, 5, 0.1, 1]], name: 'perfect substitutes',
      eq: v => m('<i>u</i> = ' + nb(v.a) + '<i>x</i> + ' + nb(v.b) + '<i>y</i>'), U: (v, x, y) => v.a * x + v.b * y,
      curve: (v, u) => [[0, u / v.b], [u / v.a, 0]], pt: (v, u) => [u / (2 * v.a), u / (2 * v.b)],
      mrs: (v) => m('MRS = ' + fr('<i>a</i>', '<i>b</i>') + ' = ' + r2(v.a / v.b)) + ' (the same everywhere)',
      best: (v, px, py, B) => { const r = v.a / v.b, q = px / py; return Math.abs(r - q) < 1e-9 ? null : r > q ? [B / px, 0] : [0, B / py]; } },
    comp: { ps: [['a', 0.5, 5, 0.1, 1], ['b', 0.5, 5, 0.1, 1]], name: 'perfect complements (Leontief)',
      eq: v => m('<i>u</i> = min{' + nb(v.a) + '<i>x</i>, ' + nb(v.b) + '<i>y</i>}'), U: (v, x, y) => Math.min(v.a * x, v.b * y),
      curve: (v, u) => [[u / v.a, 999], [u / v.a, u / v.b], [999, u / v.b]], pt: (v, u) => [u / v.a, u / v.b],
      mrs: () => 'at the kink the MRS is not defined (∞ above it, 0 to the right)',
      kink: v => v.a / v.b,
      best: (v, px, py, B) => { const k = v.a / v.b, x = B / (px + py * k); return [x, k * x]; } },
    cd: { ps: [['α', 0.2, 2, 0.05, 1], ['β', 0.2, 2, 0.05, 1]], name: 'Cobb-Douglas',
      eq: v => m('<i>u</i> = <i>x</i><sup>' + nb(v['α'], 1) + '</sup> <i>y</i><sup>' + nb(v['β'], 1) + '</sup>'), U: (v, x, y) => Math.pow(x, v['α']) * Math.pow(y, v['β']),
      curve: (v, u) => { const p = []; for (let i = 1; i <= 240; i++) { const x = 0.4 * i; p.push([x, Math.pow(u / Math.pow(x, v['α']), 1 / v['β'])]); } return p; },
      pt: (v, u) => [10, Math.pow(u / Math.pow(10, v['α']), 1 / v['β'])],
      mrs: (v, x, y) => m('MRS = ' + fr('α', 'β') + ' · ' + fr('<i>y</i>', '<i>x</i>') + ' = ' + r2(v['α'] / v['β'] * y / x)),
      best: (v, px, py, B) => { const s = v['α'] + v['β']; return [v['α'] / s * B / px, v['β'] / s * B / py]; } },
    ql: { ps: [['α', 0.5, 5, 0.1, 2], ['β', 0.2, 0.9, 0.05, 0.5]], name: 'quasi-linear',
      eq: v => m('<i>u</i> = ' + nb(v['α']) + '<i>x</i> + <i>y</i><sup>' + r2(v['β']) + '</sup>'), U: (v, x, y) => v['α'] * x + Math.pow(y, v['β']),
      curve: (v, u) => { const p = []; for (let i = 0; i <= 240; i++) { const y = 0.3 * i, x = (u - Math.pow(y, v['β'])) / v['α']; if (x < 0) break; p.push([x, y]); } return p; },
      pt: (v, u) => [(u - Math.pow(20, v['β'])) / v['α'], 20],
      mrs: (v, x, y) => m('MRS = ' + fr('α', 'β <i>y</i><sup>β−1</sup>') + ' = ' + r2(v['α'] / (v['β'] * Math.pow(y, v['β'] - 1)))) + ' (depends on y only: the curves are sideways shifts)',
      best: (v, px, py, B) => { const y = Math.pow(v['β'] * px / (v['α'] * py), 1 / (1 - v['β'])); return y * py >= B ? [0, B / py] : [(B - py * y) / px, y]; } }
  };
  function nb(v, keep1) { const s = r2(v); return !keep1 && s === '1' ? '' : s; }
  function param(box) {
    const key = PFORMS[box.dataset.form] ? box.dataset.form : 'cd', F = PFORMS[key], f = frame(box), PX0 = 3, PY0 = 1, B0 = 60;
    const A = axes(B0 / PX0 * 1.4, B0 / PY0 * 1.08);
    const v = {}; F.ps.forEach(([k, , , , d]) => { v[k] = d; });
    const start = Object.assign({}, v), b0 = F.best(start, PX0, PY0, B0) || [B0 / PX0 / 2, B0 / PY0 / 2];
    const u0 = F.U(start, b0[0], b0[1]), LV = [0.55, 1, 1.6].map(c => u0 * c);   // fixed u levels (from the starting numbers)
    let copies = [], budget = false;
    const fEq = el('div', 'vp-formula');
    f.side.insertBefore(fEq, f.eq);
    const parTxt = w => F.ps.map(([k]) => k + ' = ' + r2(w[k])).join(', ');
    function curves(w, col, wid, extra, labels) {
      let h = '';
      LV.forEach((u, i) => {
        const pts = F.curve(w, u).map(([x, y]) => [x, Math.min(y, A.ymax * 1.6)]);
        h += poly(A, pts, col, wid, extra);
        if (labels) { const end = pts.filter(([x, y]) => x <= A.xmax * 0.95 && y <= A.ymax * 0.9 && y >= A.ymax * 0.06).pop(); if (end) h += label(A.X(end[0]) + 6, A.Y(end[1]) - 6, it('u') + ' = ' + r2(u), IC, null, 17); }
      });
      return h;
    }
    function draw() {
      let h = defs(f.id) + clipOpen(f.id);
      copies.forEach(c => { h += curves(c, '#8FB3DA', 2, ' stroke-dasharray="7 5"', false); });
      if (F.kink) h += '<line x1="' + A.X(0) + '" y1="' + A.Y(0) + '" x2="' + A.X(A.xmax) + '" y2="' + A.Y(A.xmax * F.kink(v)) + '" stroke="' + GREY + '" stroke-width="1.5" stroke-dasharray="5 5"/>';
      if (budget) h += '<polygon points="' + A.X(0) + ',' + A.Y(0) + ' ' + A.X(0) + ',' + A.Y(B0 / PY0) + ' ' + A.X(B0 / PX0) + ',' + A.Y(0) + '" fill="#FDE3CF" opacity="0.6"/>' +
        '<line x1="' + A.X(0) + '" y1="' + A.Y(B0 / PY0) + '" x2="' + A.X(B0 / PX0) + '" y2="' + A.Y(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      h += curves(v, IC, 3, '', true);
      h += '</g>' + axisLines();
      copies.forEach(c => { const pts = F.curve(c, LV[1]).filter(([x, y]) => x <= A.xmax * 0.85 && y <= A.ymax * 0.85 && y >= A.ymax * 0.15); const e = pts[Math.floor(pts.length * 0.75)] || pts.pop(); if (e) h += label(A.X(e[0]) + 8, A.Y(e[1]) + 18, parTxt(c), '#6F8FB3', null, 17); });
      if (F.kink) h += label(A.X(A.xmax * 0.6) + 6, A.Y(Math.min(A.ymax * 0.9, A.xmax * 0.6 * F.kink(v))) - 8, it('y') + ' = ' + nb(F.kink(v)) + it('x'), GREY, null, 17);
      const P = F.pt(v, LV[1]);
      if (P[0] >= 0 && P[0] <= A.xmax && P[1] <= A.ymax) h += dot(A.X(P[0]), A.Y(P[1]), 7);
      let bestTxt = '';
      if (budget) { const b = F.best(v, PX0, PY0, B0); if (b) { h += dot(A.X(b[0]), A.Y(b[1]), 8, GRAD); bestTxt = '<div>best feasible bundle on ' + m('3<i>x</i> + <i>y</i> = 60') + ': ' + vec(b[0], b[1]) + '</div>'; } else bestTxt = '<div>every bundle on ' + m('3<i>x</i> + <i>y</i> = 60') + ' is best (MRS = price ratio)</div>'; }
      f.svg.innerHTML = h;
      fEq.innerHTML = F.eq(v);
      f.eq.innerHTML = '<div class="vp-sub">' + F.name + (copies.length ? ' · dashed: ' + copies.map(parTxt).join(' | ') : '') + '</div>';
      f.status.innerHTML = '<div>at the dot ' + vec(P[0], P[1]) + ': ' + F.mrs(v, P[0], P[1]) + '</div>' + bestTxt;
    }
    const ins = F.ps.map(([k, lo, hi, st, d]) => slider(f.ctl, k, lo, hi, st, d, (val, o, first) => { v[k] = val; o.innerHTML = r2(val); if (!first) draw(); }));
    f.ctl.appendChild(el('div', 'vp-break'));
    button(f.ctl, 'keep a copy', () => { if (copies.length >= 3) copies.shift(); copies.push(Object.assign({}, v)); draw(); });
    button(f.ctl, 'clear copies', () => { copies = []; draw(); });
    const bb = button(f.ctl, 'show budget', () => { budget = !budget; bb.classList.toggle('on', budget); draw(); });
    button(f.ctl, 'reset', () => { copies = []; budget = false; bb.classList.remove('on'); F.ps.forEach(([k, , , , d], i) => ins[i].set(d)); draw(); });
    draw();
  }

  const CSS = '.vp-formula{font-family:"STIX Two Math","STIX Two Text","Cambria Math",serif;font-size:1.5em;color:#1F1F1F;background:#F6F7F9;border-radius:10px;padding:.25em .8em;margin:.1em 0 .5em;display:inline-block}.vp-formula i{font-style:italic}.vp-formula sup{font-size:.62em}' +
    '.op-param .vp-ctl input[type=range]{height:2em}.op-param .vp-ctl input[type=range]::-webkit-slider-thumb{width:26px;height:26px}.op-param .vp-ctl input[type=range]::-moz-range-thumb{width:24px;height:24px}' +
    '.vp-bar{display:inline-block;height:.8em;vertical-align:middle;margin-left:.6em;border-radius:2px}.vp-row{display:flex;align-items:center;gap:.2em}' +
    '.vp{font-size:.6em;text-align:left;margin-top:.3em;display:grid;grid-template-columns:auto minmax(0,1fr);gap:1.2em;align-items:start}' +
    '.vp-svg{height:440px;width:auto;max-width:100%;display:block;touch-action:none;user-select:none;cursor:grab}' +
    '.vp-svg text,.vp-hill text{font-family:"STIX Two Text","Cambria Math",Georgia,serif}' +
    '.vp-hill{width:100%;max-width:380px;height:auto;display:block;margin:.3em 0}' +
    '.vp-minis{display:flex;gap:.6em;margin:.3em 0}.vp-minic{width:50%;max-width:260px}.vp-mini{width:100%;height:auto;display:block}.vp-minic .vp-sub{font-size:.85em}.vp-mini text{font-family:"STIX Two Text","Cambria Math",Georgia,serif}' +
    'html.mobile .vp{display:block;font-size:.9em}html.mobile .vp-svg{height:auto;width:100%}' +
    '.vp-side{font-size:1.15em}.vp-eq{line-height:1.5;margin-bottom:.3em}.vp-disp{font-size:1.25em}' +
    '.vp-m{font-family:"STIX Two Text","Cambria Math",Georgia,serif;font-size:1.12em;white-space:nowrap}.vp-m i{font-style:italic}.vp-m sub{font-size:.65em;vertical-align:-.25em}' +
    '.vp-fr{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .12em;line-height:1.05;font-size:.9em}.vp-fr>span:first-child{border-bottom:1px solid currentColor;padding:0 .15em}' +
    '.vp-ctl{display:flex;flex-wrap:wrap;gap:.5em;align-items:center;margin:.3em 0}.vp-break{flex-basis:100%;height:0}' +
    '.vp-ctl label{display:grid;grid-template-columns:6.5em 1fr 3em;gap:.6em;align-items:center;min-width:22em}' +
    '.vp-ctl input[type=range]{accent-color:#0062C4;width:100%}.vp-ctl .btn.on{background:var(--p-green,#E3F2E6)}.vp-v{font-weight:600;text-align:right}.vp-hint{font-size:.95em}' +
    '.vp-status{line-height:1.55}.vp-status>div{margin:.15em 0}';
  window.__vpCSS = CSS;   // the 3D views use the same look
  const KINDS = { 'op-forms': forms, 'op-walk': walk, 'op-price': price, 'op-grad': grad, 'op-split': split, 'op-stretch': stretch, 'op-step': step, 'op-two': two, 'op-gainloss': gainloss, 'op-exact': exact, 'op-param': param };   // names from Filiz's slide order
  function init() {
    const sel = Object.keys(KINDS).map(k => '.' + k).join(','); if (!document.querySelector(sel)) return;
    if (!document.getElementById('vp-css')) { const st = document.createElement('style'); st.id = 'vp-css'; st.textContent = CSS; document.head.appendChild(st); }
    Object.entries(KINDS).forEach(([k, fn]) => document.querySelectorAll('.' + k).forEach(fn));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

// L09 3D views (Can, 29.10: "maybe you need to go to 3d and show what is going on there"). Own small SVG renderer, no
// library, works offline. Drag to rotate; [ top view ] looks straight down (then it is the 2D graph: equal scales).
//   <div class="op-3d" data-mode="hill"></div>    the utility hill u = x·y, its height lines (the indifference curves) on it
//        and on the floor like a hiking map; sliders move the point; the mountain-climb arrow ∇u = (y, x) on the floor
//   <div class="op-3d" data-mode="roof"></div>    the spending roof S = 3x + y, a tilted flat plane; its height lines on the
//        floor are the budget lines for €40, €60, €80; the price arrow p = (3, 1) is its steepest way up
//   <div class="op-3d" data-mode="fence"></div>   a wall on the budget line 3x + y = 60 cuts the hill; the cut is a path over
//        the hill, highest at E (10, 30), u = 300; [ top view ]: the height line through E just touches the fence line
//   <div class="op-3d" data-mode="top"></div>     at E from above: ∇u = (30, 10) and p = (3, 1), same direction, same
//        arrow scale; λ = 10 = how many times longer ∇u is
(function () {
  const NS = 'http://www.w3.org/2000/svg', W = 560, H = 430;
  // colours by role (Can 29.10): indifference curves blue, budget orange, ∇u dark blue, p dark orange
  const BUDGET = '#D9480F', IC = '#0062C4', ALONG = '#2F7D4F', GRAD = '#0B3D91', GREY = '#888', P_ARROW = '#A63E00';
  const MATH = '"STIX Two Text", "Cambria Math", Georgia, serif';
  const halo = 'paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round"';
  const r2 = v => String(Math.round(v * 100) / 100);
  const m = s => '<span class="vp-m">' + s + '</span>';
  const it = v => '<tspan font-family=\'' + MATH + '\' font-style="italic">' + v + '</tspan>';
  const XM = 30, YM = 64, ZH = 26, UCAP = 900;           // floor 0..30 × 0..64 (same units); the hill is drawn up to u = 900
  const SMAX = 3 * XM + YM;
  const zu = u => Math.min(u, UCAP) / UCAP * ZH, zs = s => s / SMAX * ZH;
  const LEVELS = [100, 200, 300, 450, 700];
  let NID = 0;
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function button(ctl, label, on) { const b = el('button', 'btn ghost', label); b.type = 'button'; b.onclick = e => { e.stopPropagation(); b.blur(); on(b); }; ctl.appendChild(b); return b; }
  function slider(ctl, label, mn, mx, step, val, on) {
    const l = el('label', null, '<b>' + label + '</b><input type="range" min="' + mn + '" max="' + mx + '" step="' + step + '" value="' + val + '"><span class="vp-v"></span>');
    const inp = l.querySelector('input'), v = l.querySelector('.vp-v');
    inp.addEventListener('input', () => on(+inp.value, v)); inp.addEventListener('keydown', e => e.stopPropagation()); inp.addEventListener('pointerup', () => inp.blur());
    ctl.appendChild(l); on(+inp.value, v, true); inp.set = x => { inp.value = x; on(+inp.value, v); }; return inp;
  }

  function view3d(box) {
    const mode = (box.dataset.mode === 'fence' ? 'trail' : box.dataset.mode) || 'hill', id = 'v3' + (++NID);
    const CAP = mode === 'plane' ? 1300 : UCAP, zu = u => Math.min(u, CAP) / CAP * ZH;   // the plane view climbs to u = 1200
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', ''); box.classList.add('vp');
    const svg = document.createElementNS(NS, 'svg'), side = el('div', 'vp-side'), eq = el('div', 'vp-eq'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('class', 'vp-svg op-3d-svg');
    box.appendChild(svg); box.appendChild(side); side.appendChild(eq); side.appendChild(ctl); side.appendChild(status);
    const prof = (mode === 'trail' || mode === 'plane') ? document.createElementNS(NS, 'svg') : null;
    if (prof) { prof.setAttribute('viewBox', '0 0 320 200'); prof.setAttribute('class', 'vp-hill'); side.insertBefore(prof, status); }
    function profile2(fn, x1, umax, xNow, xl, tops2, tangent) {   // a small 2D graph: fn on [0, x1]
      const ML = 52, MB = 34, MT = 12, MR = 12, w = 320 - ML - MR, hh = 200 - MT - MB, X = v => ML + v / x1 * w, Y = u => MT + hh - u / umax * hh;
      let g = '<line x1="' + ML + '" y1="' + MT + '" x2="' + ML + '" y2="' + (MT + hh) + '" stroke="#222"/><line x1="' + ML + '" y1="' + (MT + hh) + '" x2="' + (ML + w) + '" y2="' + (MT + hh) + '" stroke="#222"/>';
      const pts = []; for (let i = 0; i <= 120; i++) { const v = x1 * i / 120; pts.push(X(v).toFixed(1) + ',' + Y(fn(v)).toFixed(1)); }
      g += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + BUDGET + '" stroke-width="3"/>';
      if (tangent) { const [s0, half] = tangent, u0 = fn(xNow); g += '<line x1="' + X(xNow - half) + '" y1="' + Y(u0 - s0 * half) + '" x2="' + X(xNow + half) + '" y2="' + Y(u0 + s0 * half) + '" stroke="' + GRAD + '" stroke-width="2.2" stroke-dasharray="6 4"/>'; }
      (tops2 || []).forEach(([v, lab]) => { g += '<line x1="' + X(v) + '" y1="' + Y(fn(v)) + '" x2="' + X(v) + '" y2="' + (MT + hh) + '" stroke="' + GRAD + '" stroke-dasharray="4 4"/>' + '<text x="' + X(v) + '" y="' + (MT + hh + 24) + '" text-anchor="middle" font-size="17" fill="' + GRAD + '">' + lab + '</text>'; });
      g += '<circle cx="' + X(xNow) + '" cy="' + Y(fn(xNow)) + '" r="7" fill="#222" stroke="#fff" stroke-width="2"/>';
      g += '<text x="' + (ML - 8) + '" y="' + (MT + 14) + '" text-anchor="end" font-size="18" fill="#555">' + it(mode === 'plane' ? 'u*' : 'u') + '</text><text x="' + (ML + w) + '" y="' + (MT + hh + 24) + '" text-anchor="end" font-size="18" fill="#555">' + it(xl) + '</text>';
      prof.innerHTML = g;
    }
    const Y0 = { hill: 32, roof: 32, trail: 32, plane: 30, top: 90 }[mode] || 32, YAW0 = +box.dataset.yaw || 40;
    let FX = 5, BB = 60, showPlane = false, tops = [60], yaw = mode === 'top' ? 0 : YAW0, elev = Y0, P = mode === 'hill' ? [5, 45] : mode === 'roof' ? [10, 30] : [10, 30], stop = () => {};
    const K = 5.6;                                         // pixels per unit
    // world → screen: centre the floor, turn by yaw, tilt by elev (90 = straight down, then x right and y up)
    function pr(x, y, z) {
      const a = yaw * Math.PI / 180, e = elev * Math.PI / 180, X = x - XM / 2, Y = y - YM / 2;
      const X1 = X * Math.cos(a) - Y * Math.sin(a), Y1 = X * Math.sin(a) + Y * Math.cos(a);
      return [W / 2 + X1 * K, H / 2 + 40 * Math.cos(e) - (Y1 * Math.sin(e) + (z - ZH / 3) * Math.cos(e)) * K, -Y1 * Math.cos(e) + z * Math.sin(e)];
    }
    const pt = (x, y, z) => { const p = pr(x, y, z); return p[0].toFixed(1) + ',' + p[1].toFixed(1); };
    const line3 = (pts, col, w, extra) => '<polyline points="' + pts.map(p => pt(p[0], p[1], p[2])).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (extra || '') + '/>';
    const label = (x, y, z, txt, col, dx, dy, anchor) => { const p = pr(x, y, z); return '<text x="' + (p[0] + (dx || 0)) + '" y="' + (p[1] + (dy || 0)) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' font-size="19" fill="' + (col || '#555') + '" ' + halo + '>' + txt + '</text>'; };
    function arrow3(x0, y0, vx, vy, col, w) {             // an arrow on the floor
      const a = pr(x0, y0, 0), b = pr(x0 + vx, y0 + vy, 0);
      return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'a)"/>';
    }
    function rightAngle3(x0, y0, u, v) {
      const n = a => { const l = Math.hypot(a[0], a[1]); return [a[0] / l * 2.2, a[1] / l * 2.2]; }, a = n(u), b = n(v);
      return line3([[x0 + a[0], y0 + a[1], 0], [x0 + a[0] + b[0], y0 + a[1] + b[1], 0], [x0 + b[0], y0 + b[1], 0]], '#222', 1.5);
    }
    const hillCurve = (u, z) => { const p = []; for (let i = 0; i <= 80; i++) { const x = u / YM + (XM - u / YM) * i / 80, y = u / x; if (y <= YM && x <= XM) p.push([x, y, z]); } return p; };
    // surface patches, sorted far → near (painter)
    function surface(f, fill, cap) {
      const n = 20, mm = 32, out = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < mm; j++) {
        const xs = [i * XM / n, (i + 1) * XM / n], ys = [j * YM / mm, (j + 1) * YM / mm];
        const c = [[xs[0], ys[0]], [xs[1], ys[0]], [xs[1], ys[1]], [xs[0], ys[1]]].map(([x, y]) => pr(x, y, f(x, y)));
        const d = (c[0][2] + c[1][2] + c[2][2] + c[3][2]) / 4, hz = f((xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2) / ZH;
        if (cap && cap(xs[0], ys[0])) continue;   // the hill ends at its u = 900 height line
        out.push([d, '<polygon points="' + c.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '" fill="' + fill(hz) + '" stroke="#fff" stroke-width="0.5" opacity="0.92"/>']);
      }
      return out;
    }
    const hillFill = hz => 'hsl(' + (210 + 10 * hz) + ',' + (50 + 20 * hz) + '%,' + (90 - 30 * hz) + '%)';
    const roofFill = hz => 'hsl(26,' + (70 + 15 * hz) + '%,' + (90 - 22 * hz) + '%)';
    function draw() {
      let h = '<defs><marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
      // the floor and its axes
      h += '<polygon points="' + [pt(0, 0, 0), pt(XM, 0, 0), pt(XM, YM, 0), pt(0, YM, 0)].join(' ') + '" fill="#F4F4F0" stroke="#bbb"/>';
      h += line3([[0, 0, 0], [XM, 0, 0]], '#222', 1.5) + line3([[0, 0, 0], [0, YM, 0]], '#222', 1.5);
      h += label(XM, 0, 0, it('x'), '#555', 8, 6) + label(0, YM, 0, it('y'), '#555', -10, -6, 'end');
      const parts = [];
      if (mode === 'hill' || mode === 'trail' || mode === 'top') {
        LEVELS.forEach(u => { h += line3(hillCurve(u, 0), IC, u === 300 ? 2.6 : 1.4, u === 300 ? '' : ' opacity="0.6"'); });   // the hiking map on the floor
        if (elev < 88) surface((x, y) => zu(x * y), hillFill, (x, y) => x * y >= CAP).forEach(p => parts.push(p));
      }
      if (mode === 'roof') {
        [40, 60, 80].forEach(s => { const yi = Math.min(YM, s), xi = s / 3; h += line3([[(s - Math.min(YM, s)) / 3, Math.min(YM, s), 0], [xi, 0, 0]], BUDGET, s === 60 ? 3 : 1.6, s === 60 ? '' : ' opacity="0.6"'); });
        if (elev < 88) surface((x, y) => zs(3 * x + y), roofFill).forEach(p => parts.push(p));
      }
      if (mode === 'trail' || mode === 'top') h += line3([[0, 60, 0], [20, 0, 0]], BUDGET, 3.5);
      if (mode === 'plane') {
        [20, 40, 60, 80, 100, 120].forEach(b => { const y0 = Math.min(YM, b); h += line3([[(b - y0) / 3, y0, 0], [Math.min(XM, b / 3), b - 3 * Math.min(XM, b / 3), 0]], BUDGET, 1.4, ' opacity="0.55"'); });
        const yb = Math.min(YM, BB); h += line3([[(BB - yb) / 3, yb, 0], [Math.min(XM, BB / 3), BB - 3 * Math.min(XM, BB / 3), 0]], BUDGET, 3.5);
        h += line3(hillCurve(BB * BB / 12, 0), IC, 2.6);                                  // the height line that touches this budget line
        h += line3([[0, 0, 0], [20, 60, 0]], GRAD, 2, ' stroke-dasharray="6 5" opacity="' + (tops.length > 1 ? 0.9 : 0) + '"');   // the path of best bundles, y = 3x
        if (elev < 88) surface((x, y) => zu(x * y), hillFill, (x, y) => x * y >= CAP).forEach(p => parts.push(p));
        if (elev < 88 && showPlane) surface((x, y) => zs(3 * x + y), roofFill).forEach(p => parts.push(p));
      }
      parts.sort((a, b) => a[0] - b[0]);
      h += parts.map(p => p[1]).join('');
      if (elev < 88 && (mode === 'hill' || mode === 'trail')) LEVELS.forEach(u => { h += line3(hillCurve(u, zu(u)), IC, u === 300 && mode === 'trail' ? 3 : 2); });   // height lines on the hill
      if (elev < 88 && mode === 'plane') [75, 300, 675, 1200].forEach(u => { h += line3(hillCurve(u, zu(u)), IC, 1.8, ' opacity="0.8"'); });
      if (elev < 88 && mode === 'roof') [40, 60, 80].forEach(s => { h += line3([[(s - Math.min(YM, s)) / 3, Math.min(YM, s), zs(s)], [s / 3, 0, zs(s)]], BUDGET, s === 60 ? 3 : 2); });
      let say = '';
      if (mode === 'hill') {
        const [x, y] = P, u = x * y, g = [y, x], k = 0.25;
        h += line3([[x, y, 0], [x, y, zu(u)]], GREY, 1.5, ' stroke-dasharray="4 4"');
        const s = pr(x, y, zu(u)), f = pr(x, y, 0);
        h += '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="7" fill="#222" stroke="#fff" stroke-width="2"/>';
        h += arrow3(x, y, g[0] * k, g[1] * k, GRAD, 4) + label(x + g[0] * k, y + g[1] * k, 0, '∇' + it('u'), GRAD, 8, -6);
        h += '<circle cx="' + f[0] + '" cy="' + f[1] + '" r="5" fill="' + GRAD + '"/>';
        eq.innerHTML = '<div class="vp-disp">' + m('<i>u</i> = <i>x</i> · <i>y</i>') + '</div><div class="vp-sub">the utility hill: height = utility</div>';
        say = '<div>at ' + m('(' + r2(x) + ', ' + r2(y) + ')') + ': height ' + m('<i>u</i> = ' + r2(u)) + ', ' + m('∇<i>u</i> = (' + r2(g[0]) + ', ' + r2(g[1]) + ')') + '</div>' +
          '<div class="dim">blue lines = height lines = indifference curves · arrow = steepest way up</div>';
      }
      if (mode === 'roof') {
        const [x, y] = P, k = 2.2;
        const s = pr(x, y, zs(3 * x + y));
        h += line3([[x, y, 0], [x, y, zs(3 * x + y)]], GREY, 1.5, ' stroke-dasharray="4 4"') + '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="7" fill="#222" stroke="#fff" stroke-width="2"/>';
        h += rightAngle3(x, y, [1, -3], [3, 1]) + arrow3(x, y, 3 * k, 1 * k, P_ARROW, 4) + label(x + 3 * k, y + k, 0, it('p'), P_ARROW, 8, -4);
        [40, 60, 80].forEach(v => { const yy = Math.min(v, YM - 2); h += label((v - yy) / 3, yy, 0, '€' + v, BUDGET, -8, -6, 'end'); });
        eq.innerHTML = '<div class="vp-disp">' + m('<i>S</i> = 3<i>x</i> + <i>y</i>') + '</div><div class="vp-sub">the spending roof: height = money spent</div>';
        say = '<div>flat roof: the same steepest way up everywhere, ' + m('<i>p</i> = (3, 1)') + '</div>' +
          '<div class="dim">height lines = budget lines €40, €60, €80 · p square to them</div>';
      }
      if (mode === 'trail') {
        const trail = []; for (let i = 0; i <= 80; i++) { const x = 20 * i / 80, y = 60 - 3 * x; trail.push([x, y, elev < 88 ? zu(x * y) : 0]); }
        h += line3(trail, BUDGET, 5.5);                                                     // the budget line drawn ON the hill: the trail
        const fy = 60 - 3 * FX, e = pr(10, 30, elev < 88 ? zu(300) : 0), fp = pr(FX, fy, elev < 88 ? zu(FX * fy) : 0);
        h += '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="8" fill="' + GRAD + '" stroke="#fff" stroke-width="2"/>' + label(10, 30, elev < 88 ? zu(300) : 0, 'E', '#222', 12, -10);
        h += '<circle cx="' + fp[0] + '" cy="' + fp[1] + '" r="8" fill="#222" stroke="#fff" stroke-width="2.5"/>';
        eq.innerHTML = '<div class="vp-disp">the hiking trail</div><div class="vp-sub">budget line = the trail · highest point on the trail = best bundle</div>';
        say = '<div>walker at ' + m('(' + r2(FX) + ', ' + r2(fy) + ')') + ': height ' + m('<i>u</i> = ' + r2(FX * fy)) + '</div>' +
          (elev < 88 ? '<div class="dim">top of the trail: ' + m('E = (10, 30)') + ', ' + m('<i>u</i> = 300') + '</div>' : '<div class="dim">from above: the height line ' + m('<i>u</i> = 300') + ' just touches the trail at E</div>');
        profile2(x => x * (60 - 3 * x), 20, 330, FX, 'x', [[10, '10']]);
      }
      if (mode === 'plane') {
        const xb = BB / 6, yb = BB / 2, ub = BB * BB / 12, lam = BB / 6;
        const trail = []; for (let i = 0; i <= 80; i++) { const x = (BB / 3) * i / 80, y = BB - 3 * x; if (y <= YM && x <= XM) trail.push([x, y, elev < 88 ? zu(x * y) : 0]); }
        h += line3(trail, BUDGET, 5);
        const tp = tops.slice().sort((a, b) => a - b).map(b => [b / 6, b / 2, elev < 88 ? zu(b * b / 12) : 0]);
        if (tp.length > 1) h += line3(tp, GRAD, 3.5);                                        // the tops of the trails: the path
        tops.forEach(b => { const q = pr(b / 6, b / 2, elev < 88 ? zu(b * b / 12) : 0); h += '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="4.5" fill="' + GRAD + '"/>'; });
        if (elev < 88 && showPlane) h += line3([[(BB - Math.min(YM, BB)) / 3, Math.min(YM, BB), zs(BB)], [Math.min(XM, BB / 3), BB - 3 * Math.min(XM, BB / 3), zs(BB)]], BUDGET, 2.5, ' stroke-dasharray="6 4"');
        const e = pr(xb, yb, elev < 88 ? zu(ub) : 0);
        h += '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="8" fill="' + GRAD + '" stroke="#fff" stroke-width="2"/>' + label(xb, yb, elev < 88 ? zu(ub) : 0, 'E(' + BB + ')', '#222', 12, -10);
        eq.innerHTML = '<div class="vp-disp">' + m('3<i>x</i> + <i>y</i> = <i>B</i>') + '</div><div class="vp-sub">one trail per budget · the tops form the path</div>';
        say = '<div>' + m('<i>B</i> = ' + BB) + ': best feasible bundle ' + m('(' + r2(xb) + ', ' + r2(yb) + ')') + ', ' + m('<i>u</i>* = ' + r2(ub)) + ', ' + m('λ = ' + r2(lam)) + '</div>' +
          '<div class="dim">the tops lie on the ray ' + m('<i>y</i> = 3<i>x</i>') + ': the income-consumption curve</div>';
        profile2(b => b * b / 12, 120, 1300, BB, 'B', [[BB, String(BB)]], [lam, 24]);
      }
      if (mode === 'top') {
        const k = 0.9;   // the same arrow scale for both (Murat)
        h += arrow3(10, 30, 30 * k, 10 * k, GRAD, 4) + label(10 + 30 * k, 30 + 10 * k, 0, '∇' + it('u') + ' = (30, 10)', GRAD, 8, -8);
        h += arrow3(10, 30, 3 * k, 1 * k, P_ARROW, 5) + label(10 + 3 * k, 30 + k, 0, it('p'), P_ARROW, 10, 24);
        const e = pr(10, 30, 0); h += '<circle cx="' + e[0] + '" cy="' + e[1] + '" r="5" fill="#222" stroke="#fff" stroke-width="2"/>' + label(10, 30, 0, 'E', '#222', -12, 6, 'end');
        eq.innerHTML = '<div class="vp-disp">' + m('∇<i>u</i> = 10 · <i>p</i>') + '</div><div class="vp-sub">at E, seen from above, the same scale for both arrows</div>';
        say = '<div>' + m('∇<i>u</i> = (30, 10)') + ' and ' + m('<i>p</i> = (3, 1)') + ' point the same way: straight across the budget line.</div><div class="dim">∇u is 10 times as long as p: λ = 10. The hill climbs 10 times as fast as the roof.</div>';
      }
      svg.innerHTML = h; status.innerHTML = say;
    }
    // drag to rotate
    let drag = null;
    svg.addEventListener('pointerdown', ev => { stop(); drag = [ev.clientX, ev.clientY, yaw, elev]; try { svg.setPointerCapture(ev.pointerId); } catch (e) {} ev.stopPropagation(); ev.preventDefault(); });
    svg.addEventListener('pointermove', ev => { if (!drag) return; yaw = drag[2] - (ev.clientX - drag[0]) * 0.45; elev = Math.max(5, Math.min(90, drag[3] + (ev.clientY - drag[1]) * 0.35)); draw(); });
    svg.addEventListener('pointerup', () => { drag = null; });
    svg.addEventListener('click', ev => ev.stopPropagation());
    const turnTo = (y1, e1) => { stop(); const y0 = yaw, e0 = elev, s0 = performance.now(); let rid = 0;
      const step = now => { const k = Math.min(1, (now - s0) / 1000), q = 1 - Math.pow(1 - k, 3); yaw = y0 + (y1 - y0) * q; elev = e0 + (e1 - e0) * q; draw(); if (k < 1) rid = requestAnimationFrame(step); };
      rid = requestAnimationFrame(step); stop = () => cancelAnimationFrame(rid); };
    if (mode === 'hill') {
      slider(ctl, 'x', 1, 22, 0.5, P[0], (v, o, first) => { P = [v, P[1]]; o.innerHTML = r2(v); if (!first) draw(); });
      slider(ctl, 'y', 2, 62, 0.5, P[1], (v, o, first) => { P = [P[0], v]; o.innerHTML = r2(v); if (!first) draw(); });
    }
    if (mode === 'roof') slider(ctl, 'point', 2, 18, 0.5, P[0], (v, o, first) => { P = [v, 60 - 3 * v]; o.innerHTML = ''; if (!first) draw(); });
    let walkInp = null, bInp = null;
    if (mode === 'trail') {
      walkInp = slider(ctl, 'x', 0, 20, 0.25, FX, (v, o, first) => { FX = v; o.innerHTML = r2(v); if (!first) draw(); });
      button(ctl, 'walk', () => { stop(); const s0 = performance.now(); let rid = 0;   // 0 → 20 in 6 s, up then down
        const step = now => { const k = Math.min(1, (now - s0) / 6000); FX = Math.round(20 * k * 4) / 4; walkInp.value = FX; walkInp.nextSibling.innerHTML = r2(FX); draw(); if (k < 1) rid = requestAnimationFrame(step); };
        rid = requestAnimationFrame(step); stop = () => cancelAnimationFrame(rid); });
    }
    if (mode === 'plane') {
      bInp = slider(ctl, 'budget B', 20, 120, 10, BB, (v, o, first) => { BB = v; o.innerHTML = '€' + v; if (!tops.includes(v)) tops.push(v); if (!first) draw(); });
      const bp = button(ctl, 'show the spending plane', () => { showPlane = !showPlane; bp.classList.toggle('on', showPlane); draw(); });
    }
    button(ctl, mode === 'trail' ? 'view from above' : 'top view', () => turnTo(0, 90));
    button(ctl, '3D view', () => turnTo(YAW0, 32));
    button(ctl, 'reset', () => { turnTo(mode === 'top' ? 0 : YAW0, Y0); if (mode === 'hill') { ctl.querySelectorAll('input').forEach((i, k) => i.set([5, 45][k])); } if (mode === 'roof') ctl.querySelector('input').set(10); if (mode === 'trail') walkInp.set(5); if (mode === 'plane') { tops = [60]; bInp.set(60); }; });
    ctl.appendChild(el('span', 'dim vp-hint', 'drag the picture to turn it'));
    draw();
  }
  function init3d() {
    const all = document.querySelectorAll('.op-3d'); if (!all.length) return;
    if (!document.getElementById('vp-css') && window.__vpCSS) { const st = document.createElement('style'); st.id = 'vp-css'; st.textContent = window.__vpCSS; document.head.appendChild(st); }
    all.forEach(view3d);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init3d); else init3d();
})();
