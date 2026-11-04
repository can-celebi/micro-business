// L10 labs (Can, 04.11): drag a point on a 2D graph, a 3D graph next to it shows where you are.
//   <div class="op-lab" data-mode="u"></div>    utility only: curves, ∇u, the mountain; sliders α, β
//   <div class="op-lab" data-mode="b"></div>    budget line only, 2D: p = (p_x, 0) + (0, p_y), green arrow along the line
//   <div class="op-lab" data-mode="p"></div>    the same with sliders p_x, p_y and the spending roof in 3D, ending at its rim
//   <div class="op-lab" data-mode="lam"></div>  2D only: ∇u and ∇c at one scale, the point on the budget line, slider λ stretches ∇c
//     data-tan="1" shows the tangent at the point; data-wait="1" shows the arrows only once the λ slider's fragment is on; data-plain="1" no slider, more curves
//   <div class="op-lab" data-mode="sub"></div>  perfect substitutes u = x + y, the point on the line, ∇u and ∇c never parallel; slider p_x in the fragment .lab-lam
//   <div class="op-lab" data-mode="f"></div>    one variable: a concave f(x), drag a point, its tangent's slope goes to 0 at the top
//   <div class="op-lab" data-mode="all"></div>  both: curves, ∇u, p, the mountain and the roof; sliders p_x, p_y, α, β, B
// u = x^α y^β. Both axes of the 2D graph use one scale, so right angles are right angles.
// Heights in 3D: the mountain is u, the roof is spending. They have different units, so in "all" the roof is scaled to
// put its rim (spending = B) at the best utility u*. Only the rim and the wall under it are the constraint.
(function () {
  if (/print-pdf/.test(location.search) && !document.querySelector('.op-lab')) return;
  const NS = 'http://www.w3.org/2000/svg', W = 560, H = 440;
  const BUDGET = '#D9480F', IC = '#0062C4', GRAD = '#0B3D91', P_ARROW = '#A63E00', GREEN = '#2F7D4F', GREY = '#888';
  const MATH = 'STIX Two Text, Cambria Math, Georgia, serif';
  const it = v => "<tspan font-family='" + MATH + "' font-style=\"italic\">" + v + '</tspan>';
  const halo = 'stroke="#fff" stroke-width="4" stroke-linejoin="round" paint-order="stroke"';
  const r2 = v => String(Math.round(v * 100) / 100);
  const mv = s => '<span class="vp-m">' + s + '</span>';
  const vec = (a, b) => mv('(' + r2(a) + ', ' + r2(b) + ')');
  // the 2D plot
  const L = 54, T = 12, PW = 490, PH = 384;
  const ZH = 40;
  let NID = 0;

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function css() {
    if (document.getElementById('lab-css')) return;
    if (!document.getElementById('vp-css') && window.__vpCSS) { const v = el('style'); v.id = 'vp-css'; v.textContent = window.__vpCSS; document.head.appendChild(v); }
    const st = el('style'); st.id = 'lab-css';
    st.textContent = '.op-lab{font-size:.6em;text-align:left;margin-top:.2em}.lab-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:.8em;align-items:start}' +
      '.lab-two svg{width:100%;height:auto;max-height:440px;display:block;user-select:none;touch-action:none}.lab-two svg.lab-2d{cursor:grab}.lab-two svg.lab-3d{cursor:move}' +
      '.lab-two svg text{font-family:"STIX Two Text","Cambria Math",Georgia,serif}.op-lab .lab-low{display:flex;flex-wrap:wrap;gap:.3em 1.4em;align-items:center;margin-top:.2em}' +
      '.op-lab .vp-ctl{margin:0;gap:.3em 1em}.op-lab .vp-ctl label{min-width:13em;grid-template-columns:2.6em 1fr 2.6em}.op-lab .vp-status{font-size:1.1em}.op-lab .lab-side{font-size:1.15em}.op-lab sub{vertical-align:-.25em;font-size:.7em}' +
      '.op-lab .lab-tr{position:absolute;top:0;right:0;display:block;font-size:.85em;background:rgba(255,255,255,.8)}.op-lab .lab-tr label{min-width:11em;grid-template-columns:4.6em 1fr 0;gap:.4em}.lab-tr .vp-v{display:none}' +
      'html.mobile .lab-two{display:block}.lab-lam{margin-top:.1em;font-size:.6em;text-align:left}.lab-lam label{min-width:20em;display:grid;grid-template-columns:1.6em 1fr 2.6em;gap:.6em;align-items:center}.lab-lam input[type=range]{accent-color:#0062C4;width:100%}.lab-lam .vp-v{font-weight:600;text-align:right}.lab-lam sub{vertical-align:-.25em;font-size:.7em}';
    document.head.appendChild(st);
  }
  function button(ctl, label, on) { const b = el('button', 'btn ghost', label); b.type = 'button'; b.onclick = e => { e.stopPropagation(); b.blur(); on(b); }; ctl.appendChild(b); return b; }
  function slider(ctl, label, mn, mx, step, val, on) {
    const l = el('label', null, '<b>' + label + '</b><input type="range" min="' + mn + '" max="' + mx + '" step="' + step + '" value="' + val + '"><span class="vp-v"></span>');
    const inp = l.querySelector('input'), v = l.querySelector('.vp-v');
    inp.addEventListener('input', () => on(+inp.value, v)); inp.addEventListener('keydown', e => e.stopPropagation()); inp.addEventListener('pointerup', () => inp.blur());
    ctl.appendChild(l); on(+inp.value, v, true); inp.set = x => { inp.value = x; on(+inp.value, v); }; return inp;
  }
  const label = (x, y, txt, col, anchor, size) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' font-size="' + (size || 20) + '" fill="' + (col || '#555') + '" ' + halo + '>' + txt + '</text>';
  const dot = (x, y, r) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r || 8) + '" fill="#222" stroke="#fff" stroke-width="2"/>';
  const marker = (id, pw) => '<defs><clipPath id="' + id + 'c"><rect x="' + L + '" y="' + T + '" width="' + (pw || PW) + '" height="' + PH + '"/></clipPath><marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  // an arrow from screen point (x0, y0) by the data vector (vx, vy) at k pixels per unit
  const arrow2 = (id, x0, y0, vx, vy, k, col, w) => '<line x1="' + x0.toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + (x0 + vx * k).toFixed(1) + '" y2="' + (y0 - vy * k).toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'a)"/>';

  function lab(box) {
    css();
    const mode = box.dataset.mode || 'u', id = 'lab' + (++NID);
    const isL = mode === 'lam', isS = mode === 'sub', onLine = isL || isS, hasU = mode === 'u' || mode === 'all' || onLine, hasB = mode !== 'u', has3 = mode !== 'b' && !onLine, movesP = mode === 'p' || mode === 'all', movesU = hasU && !onLine;
    const D0 = { al: 1, be: 1, px: 3, py: 1, B: 60, P: box.dataset.x ? [+box.dataset.x, +box.dataset.y] : isL ? [5, 45] : [10, 30], yaw: 40, elev: 30, lam: 1 };
    let showD = mode === 'all', showBest = false, roofOp = 0.5, mtOp = 0.92, lam = D0.lam, al = D0.al, be = D0.be, px = D0.px, py = D0.py, B = D0.B, P = D0.P.slice(), yaw = D0.yaw, elev = D0.elev;
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const two = el('div', 'lab-two'), s2 = document.createElementNS(NS, 'svg'), low = el('div', 'lab-low'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status');
    s2.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s2.setAttribute('class', 'lab-2d'); two.appendChild(s2);
    let s3 = null, side = null;
    const col3 = el('div'); col3.style.position = 'relative';
    if (has3) { s3 = document.createElementNS(NS, 'svg'); s3.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s3.setAttribute('class', 'lab-3d'); col3.appendChild(s3); two.appendChild(col3); }
    else if (onLine) { two.style.gridTemplateColumns = 'minmax(0,1fr)'; }
    else { side = el('div', 'lab-side'); two.appendChild(side); }
    box.appendChild(two); box.appendChild(low); low.appendChild(ctl); (side || low).appendChild(status);
    const here = onLine && box.parentElement ? box.parentElement.querySelector('.lab-lam') : null;
    if (here) here.classList.add('vp-ctl');
    if (box.dataset.wait) { const rv = document.querySelector('.reveal'); if (rv) ['fragmentshown', 'fragmenthidden'].forEach(n => rv.addEventListener(n, () => draw2())); }

    // the 3D floor. Utility alone: a smaller floor, so the mountain near the point has real height
    const XM = mode === 'u' ? 40 : 50, YM = mode === 'u' ? 60 : 70, K3 = mode === 'u' ? 5.2 : 4.9;
    // the 2D plot, one scale for both axes. Utility alone: the plot is exactly the floor, so the point can go everywhere on it
    const S2 = isS ? PW / 155 : PH / (mode === 'u' ? YM : 70), YMAX = PH / S2, PWL = mode === 'u' ? XM * S2 : PW, XMAX = PWL / S2;
    const X2 = v => L + v * S2, Y2 = v => T + PH - v * S2;
    const ZCAP = mode === 'u' ? ZH * 1.4 : ZH * 1.1;
    const U = (x, y) => isS ? x + y : Math.pow(x, al) * Math.pow(y, be);
    const grad = (x, y) => isS ? [1, 1] : [al * Math.pow(x, al - 1) * Math.pow(y, be), be * Math.pow(x, al) * Math.pow(y, be - 1)];
    const Sp = (x, y) => px * x + py * y;
    const gRef = () => { const g = grad(20, 30); return Math.hypot(g[0], g[1]) || 1; };   // sets the arrow scale for the current α, β
    const best = () => { const t = al + be; return [al / t * B / px, be / t * B / py]; };
    const uStar = () => { const b = best(); return U(b[0], b[1]); };
    // the indifference curve u = c, as points, inside a box
    function curve(c, xm, ym, z) {
      if (isS) return [[0, c], [c, 0]];
      const p = []; for (let i = 1; i <= 240; i++) { const x = xm * Math.pow(i / 240, 1.5), y = Math.pow(c / Math.pow(x, al), 1 / be); if (y <= ym * 1.02) p.push(z === undefined ? [x, y] : [x, Math.min(y, ym), z]); } return p;
    }
    const U0 = () => U(20, 30);                            // sets the height scale in mode "u"
    const levels = () => isS ? [30, 60, 90, 120, 150, 180, 210] : box.dataset.plain ? [0.15, 0.25, 0.4, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.6].map(t => uStar() * t) : mode === 'all' || isL ? [0.25, 0.5, 1, 1.5, 2].map(t => uStar() * t) : [0.25, 0.5, 1, 1.5, 2].map(t => U0() * t);
    // the budget line inside a box: [[x, y], [x, y]]
    function rim(xm, ym) {
      let a = [0, B / py], b = [B / px, 0];
      if (a[1] > ym) a = [(B - py * ym) / px, ym];
      if (b[0] > xm) b = [xm, (B - px * xm) / py];
      return [a, b];
    }
    function clampP(x, y) {
      if (onLine) { const xi = B / px, yi = B / py, t = Math.max(0.03, Math.min(0.97, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); return [t * xi, (1 - t) * yi]; }
      x = Math.max(0.3, Math.min(XM, x)); y = Math.max(0.3, Math.min(YM, y));
      if (hasB && Sp(x, y) > B) {   // stay in the budget set: the nearest point of the line
        const n = px * px + py * py, e = (Sp(x, y) - B) / n; x -= e * px; y -= e * py;
        if (x < 0.3) { x = 0.3; y = (B - px * x) / py; } if (y < 0.3) { y = 0.3; x = (B - py * y) / px; }
        x = Math.min(x, XM); y = Math.min(y, YM);
      }
      return [x, y];
    }

    function draw2() {
      const [x, y] = P, sx = X2(x), sy = Y2(y);
      let h = marker(id, PWL) + '<g clip-path="url(#' + id + 'c)">';
      if (hasB) {
        const yi = B / py, xi = B / px;
        h += '<polygon points="' + X2(0) + ',' + Y2(0) + ' ' + X2(0) + ',' + Y2(yi) + ' ' + X2(xi) + ',' + Y2(0) + '" fill="#FDE3CF" opacity="0.75"/>';
        h += '<line x1="' + X2(0) + '" y1="' + Y2(yi) + '" x2="' + X2(xi) + '" y2="' + Y2(0) + '" stroke="' + BUDGET + '" stroke-width="3.5"/>';
      }
      if (hasU) {
        const poly = (pts, w, o) => '<polyline points="' + pts.map(q => X2(q[0]).toFixed(1) + ',' + Y2(q[1]).toFixed(1)).join(' ') + '" fill="none" stroke="' + IC + '" stroke-width="' + w + '"' + (o ? ' opacity="' + o + '"' : '') + '/>';
        levels().forEach(c => { h += poly(curve(c, XMAX, YMAX), 1.8, 0.35); });
        h += poly(curve(U(x, y), XMAX, YMAX), 3);
      }
      h += '</g>';
      h += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + PH) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + PH) + '" x2="' + (L + PWL) + '" y2="' + (T + PH) + '" stroke="#222"/>';
      (isS ? [20, 40, 60, 80, 100] : [10, 20, 30, 40, 50, 60]).filter(v => v < YMAX).forEach(v => { h += '<text x="' + (L - 7) + '" y="' + (Y2(v) + 5) + '" text-anchor="end" font-size="15" fill="#555">' + v + '</text>'; });
      (isS ? [20, 40, 60, 80, 100, 120, 140] : [10, 20, 30, 40, 50, 60, 70, 80]).filter(v => v < XMAX).forEach(v => { h += '<text x="' + X2(v) + '" y="' + (T + PH + 18) + '" text-anchor="middle" font-size="15" fill="#555">' + v + '</text>'; });
      h += label(L - 8, T + 14, it('y'), '#555', 'end') + label(L + PWL, T + PH + 34, it('x'), '#555', 'end');
      if (isS) {
        const K = 46, g = grad(x, y);
        if (showBest) {
          if (px === py) h += '<line x1="' + X2(0) + '" y1="' + Y2(B / py) + '" x2="' + X2(B / px) + '" y2="' + Y2(0) + '" stroke="' + GRAD + '" stroke-width="6"/>';
          else { const c = px > py ? [0, B / py] : [B / px, 0]; h += dot(X2(c[0]), Y2(c[1]), 9) + label(X2(c[0]) + (px > py ? 14 : -6), Y2(c[1]) + (px > py ? 6 : -14), 'best', GRAD, px > py ? null : 'end', 20); }
        }
        h += arrow2(id, sx, sy, px, py, K, P_ARROW, 4.5) + (px < py ? label(sx + px * K - 8, sy - py * K - 4, '∇' + it('c'), P_ARROW, 'end', 22) : label(sx + px * K + 8, sy - py * K + 22, '∇' + it('c'), P_ARROW, null, 22));
        h += arrow2(id, sx, sy, g[0], g[1], K, GRAD, 4) + label(sx + g[0] * K + 6, sy - g[1] * K - 8, '∇' + it('u'), GRAD, null, 22);
      }
      if (isL) {
        const g = grad(x, y), gn = Math.hypot(g[0], g[1]) || 1, tx = g[1] / gn, ty = -g[0] / gn, arrows = !box.dataset.wait || !here || here.classList.contains('visible');
        if (box.dataset.tan) h += '<line x1="' + (sx - tx * 90).toFixed(1) + '" y1="' + (sy + ty * 90).toFixed(1) + '" x2="' + (sx + tx * 90).toFixed(1) + '" y2="' + (sy - ty * 90).toFixed(1) + '" stroke="#fff" stroke-width="5"/><line x1="' + (sx - tx * 90).toFixed(1) + '" y1="' + (sy + ty * 90).toFixed(1) + '" x2="' + (sx + tx * 90).toFixed(1) + '" y2="' + (sy - ty * 90).toFixed(1) + '" stroke="#111" stroke-width="3" stroke-dasharray="8 5"/>' + label(sx + tx * 90 + 8, sy - ty * 90 + 6, 'tangent', '#111', null, 18);
        if (box.dataset.tan && arrows) { const a = 13, nx = g[0] / gn, ny = g[1] / gn; h += '<polyline points="' + (sx + tx * a).toFixed(1) + ',' + (sy - ty * a).toFixed(1) + ' ' + (sx + (tx + nx) * a).toFixed(1) + ',' + (sy - (ty + ny) * a).toFixed(1) + ' ' + (sx + nx * a).toFixed(1) + ',' + (sy - ny * a).toFixed(1) + '" fill="none" stroke="#222" stroke-width="1.6"/>'; }
      }
      if (isL && (!box.dataset.wait || !here || here.classList.contains('visible'))) {   // one scale for both arrows, so λ∇c lies on ∇u exactly when they are equal
        const K = 4, g = grad(x, y);
        if (lam !== 1) h += arrow2(id, sx, sy, px * lam, py * lam, K, '#E8955F', 7) + label(sx + px * lam * K + 8, sy - py * lam * K + 24, 'λ∇' + it('c'), BUDGET, null, 22);
        const Kc = box.dataset.plain ? 15 : K;   // slide 24: ∇c drawn larger than ∇u, same direction; nothing compares their lengths there
        h += arrow2(id, sx, sy, g[0], g[1], K, GRAD, 3.5) + label(sx + g[0] * K + 8, sy - g[1] * K - 8, '∇' + it('u'), GRAD, null, 22);
        h += arrow2(id, sx, sy, px, py, Kc, P_ARROW, box.dataset.plain ? 5.5 : 4.5) + label(sx + px * Kc + 4, sy - py * Kc + 24, '∇' + it('c'), P_ARROW, null, 22);
      }
      if (hasB && !onLine) {
        const K = 24, d = [py, -px], dn = Math.hypot(d[0], d[1]), dl = 3.4 / dn;
        // green: along the budget line, at a right angle to p
        if (showD) h += arrow2(id, sx, sy, d[0] * dl, d[1] * dl, K, GREEN, 3.5) + label(sx + d[0] * dl * K + 8, sy - d[1] * dl * K + 18, 'along the line', GREEN, null, 17);
        // one more x + one more y = p
        if (mode !== 'all') h += arrow2(id, sx, sy, px, 0, K, '#777', 2.5) + arrow2(id, sx + px * K, sy, 0, py, K, '#777', 2.5) + label(sx + px * K / 2, sy + 20, r2(px), '#555', 'middle', 16) + label(sx + px * K + 7, sy - py * K / 2 + 5, r2(py), '#555', null, 16);
        h += arrow2(id, sx, sy, px, py, K, P_ARROW, 4) + label(sx + px * K + (mode === 'all' ? 0 : 8), sy - py * K + (mode === 'all' ? 24 : -8), it('p'), P_ARROW, null, 22);
      }
      if (hasU && !onLine) {
        const g = grad(x, y), gl = Math.hypot(g[0], g[1]) || 1, kk = Math.min(130 / gRef(), 170 / gl);
        h += arrow2(id, sx, sy, g[0], g[1], kk, GRAD, 4) + label(sx + g[0] * kk + 8, sy - g[1] * kk - 8, '∇' + it('u'), GRAD, null, 22);
      }
      h += dot(sx, sy);
      s2.innerHTML = h;
    }

    function pr(x, y, z) {
      const a = yaw * Math.PI / 180, e = elev * Math.PI / 180, X = x - XM / 2, Y = y - YM / 2;
      const X1 = X * Math.cos(a) - Y * Math.sin(a), Y1 = X * Math.sin(a) + Y * Math.cos(a);
      return [W / 2 + X1 * K3, H / 2 + 56 * Math.cos(e) - (Y1 * Math.sin(e) + (z - ZH / 3) * Math.cos(e)) * K3, -Y1 * Math.cos(e) + z * Math.sin(e)];
    }
    const pt = (x, y, z) => { const p = pr(x, y, z); return p[0].toFixed(1) + ',' + p[1].toFixed(1); };
    const line3 = (pts, col, w, extra) => '<polyline points="' + pts.map(p => pt(p[0], p[1], p[2])).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (extra || '') + '/>';
    const hillFill = hz => 'hsl(' + (120 * (1 - Math.min(1, hz))).toFixed(0) + ',68%,56%)';   // like a map: green low, red high
    const roofFill = 'hsl(26,80%,76%)';
    // a cell cut exactly along the budget line, so the wall has a clean edge
    function half(poly, inner) {
      const out = [];
      poly.forEach((q, i) => {
        const r = poly[(i + 1) % poly.length], a = Sp(q[0], q[1]) - B, c = Sp(r[0], r[1]) - B;
        if (inner ? a <= 0 : a >= 0) out.push(q);
        if (a * c < 0) { const t = a / (a - c); out.push([q[0] + t * (r[0] - q[0]), q[1] + t * (r[1] - q[1])]); }
      });
      return out;
    }
    function surface(f, fill, inOp, outOp, out) {
      const n = 18, mm = 26;
      for (let i = 0; i < n; i++) for (let j = 0; j < mm; j++) {
        const xs = [Math.max(i * XM / n, 0.05), (i + 1) * XM / n], ys = [Math.max(j * YM / mm, 0.05), (j + 1) * YM / mm], xc = (xs[0] + xs[1]) / 2, yc = (ys[0] + ys[1]) / 2;
        const zc = Math.min(f(xc, yc), ZCAP), raw = [[xs[0], ys[0]], [xs[1], ys[0]], [xs[1], ys[1]], [xs[0], ys[1]]];
        if (raw.every(([x, y]) => f(x, y) >= ZCAP)) continue;
        (hasB ? [[half(raw, true), inOp], [half(raw, false), outOp]] : [[raw, inOp]]).forEach(([poly, o]) => {
          if (poly.length < 3 || o <= 0) return;
          const c = poly.map(([x, y]) => pr(x, y, Math.min(f(x, y), ZCAP))), d = c.reduce((t, q) => t + q[2], 0) / c.length;
          out.push([d, '<polygon points="' + c.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" fill="' + fill(zc / ZCAP) + '" stroke="#fff" stroke-width="0.4" opacity="' + o + '"/>']);
        });
      }
    }
    function draw3() {
      if (!s3) return;
      const [x, y] = P, zB = ZH * 0.62;
      const us = hasB && hasU ? uStar() : 0;
      const zu = u => mode === 'all' ? u / us * zB : u / U(XM, YM) * ZH * 1.2, zs = s => s / B * zB;
      let h = '<defs><marker id="' + id + 'b" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
      h += '<polygon points="' + [pt(0, 0, 0), pt(XM, 0, 0), pt(XM, YM, 0), pt(0, YM, 0)].join(' ') + '" fill="#F4F4F0" stroke="#bbb"/>';
      h += line3([[0, 0, 0], [XM, 0, 0]], '#222', 1.5) + line3([[0, 0, 0], [0, YM, 0]], '#222', 1.5);
      const lab3 = (a, b, c, txt, col, dx, dy, anc) => { const p = pr(a, b, c); return label(p[0] + (dx || 0), p[1] + (dy || 0), txt, col, anc, 19); };
      h += lab3(XM, 0, 0, it('x'), '#555', 8, 6) + lab3(0, YM, 0, it('y'), '#555', -10, -6, 'end');
      if (hasB) { const q = rim(XM, YM); h += '<polygon points="' + [pt(0, 0, 0), pt(q[0][0], q[0][1], 0), pt(q[1][0], q[1][1], 0)].join(' ') + (q[0][0] > 0 ? ' ' : '') + '" fill="#FDE3CF" opacity="0.6"/>'; h += line3([[q[0][0], q[0][1], 0], [q[1][0], q[1][1], 0]], BUDGET, 3.5); }
      if (hasU) { levels().forEach(c => { h += line3(curve(c, XM, YM, 0), IC, 1.3, ' opacity="0.55"'); }); h += line3(curve(U(x, y), XM, YM, 0), IC, 2.6); }
      const parts = [], inSet = (a, b) => !hasB || Sp(a, b) <= B;
      if (elev < 88) {
        if (hasU) surface((a, b) => zu(U(a, b)), hillFill, mode === 'all' ? mtOp : 0.92, Math.min(0.16, mtOp), parts);
        if (hasB) surface((a, b) => zs(Sp(a, b)), () => roofFill, mode === 'all' ? roofOp : 0.95, mode === 'all' ? 0 : 0.12, parts);
      }
      parts.sort((a, b) => a[0] - b[0]); h += parts.map(p => p[1]).join('');
      if (elev < 88 && hasU) { h += line3(curve(U(x, y), XM, YM, zu(U(x, y))).filter(q => q[2] <= ZCAP && (mode !== 'all' || inSet(q[0], q[1]))), IC, 2.4); }
      if (elev < 88 && hasB) {
        // where the budget set ends: the rim of the roof, and a wall from the rim down to the budget line
        const q = rim(XM, YM), A0 = q[0], A1 = q[1];
        h += '<polygon points="' + [pt(A0[0], A0[1], 0), pt(A1[0], A1[1], 0), pt(A1[0], A1[1], zB), pt(A0[0], A0[1], zB)].join(' ') + '" fill="' + BUDGET + '" opacity="' + (mode === 'all' ? (roofOp * 0.35).toFixed(2) : 0.14) + '"/>';
        h += line3([[A0[0], A0[1], zB], [A1[0], A1[1], zB]], BUDGET, 4);
        h += line3([[A0[0], A0[1], 0], [A0[0], A0[1], zB]], BUDGET, 1.6) + line3([[A1[0], A1[1], 0], [A1[0], A1[1], zB]], BUDGET, 1.6);
      }
      // the height line at u*: at the rim's height, it touches the rim at the best bundle
      if (elev < 88 && mode === 'all') { const b = best(); h += line3(curve(us, XM, YM, zB), '#0B3D91', 2.6); const q = pr(b[0], b[1], zB); h += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7" fill="none" stroke="#0B3D91" stroke-width="2.6"/>'; }
      // where you are
      const zNow = mode === 'p' ? zs(Sp(x, y)) : zu(U(x, y)), zShow = elev < 88 ? Math.min(zNow, ZCAP) : 0;
      h += line3([[x, y, 0], [x, y, zShow]], '#555', 1.4, ' stroke-dasharray="4 4"');
      const arrow3 = (vx, vy, col, w) => { const a = pr(x, y, 0), b = pr(x + vx, y + vy, 0); return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'b)"/>'; };
      if (hasB) h += arrow3(px * 2.5, py * 2.5, P_ARROW, 3.5);
      if (hasU) { const g = grad(x, y), gl = Math.hypot(g[0], g[1]) || 1, k = Math.min(16 / gRef(), 24 / gl); h += arrow3(g[0] * k, g[1] * k, GRAD, 3.5); }
      const a0 = pr(x, y, 0), a1 = pr(x, y, zShow);
      h += dot(a0[0], a0[1], 5) + dot(a1[0], a1[1], 8);
      if (hasU) {   // the legend
        const gid = id + 'g', lx = 14, ly = H - 22, lw = 150;
        h += '<defs><linearGradient id="' + gid + '"><stop offset="0" stop-color="hsl(120,68%,56%)"/><stop offset="0.5" stop-color="hsl(60,68%,56%)"/><stop offset="1" stop-color="hsl(0,68%,56%)"/></linearGradient></defs>';
        h += '<rect x="' + lx + '" y="' + ly + '" width="' + lw + '" height="12" fill="url(#' + gid + ')"/>' + label(lx, ly - 5, 'low ' + it('u'), '#333', null, 16) + label(lx + lw, ly - 5, 'high ' + it('u'), '#333', 'end', 16);
      }
      s3.innerHTML = h;
    }
    function text() {
      if (isL) return;   // Can 04.11: graph only, no read-outs
      if (isS) { status.innerHTML = '<div>' + mv('<i>u</i> = <i>x</i> + <i>y</i>') + ', budget ' + mv(r2(px) + '<i>x</i> + <i>y</i> = ' + B) + '</div>'; return; }
      const [x, y] = P;
      let t = '<div>at ' + vec(x, y);
      if (hasU) { const g = grad(x, y); t += ': ' + mv('<i>u</i> = ' + r2(U(x, y))) + ', ' + mv('∇<i>u</i> = ') + vec(g[0], g[1]); }
      if (hasB) t += (hasU ? ', ' : ': ') + mv('<i>p</i> = ') + vec(px, py) + ', spending ' + mv('€' + r2(Sp(x, y))) + ' of ' + mv('€' + r2(B));
      t += '</div>';
      if (mode === 'all') t += '<div>mountain = ' + mv('<i>u</i>') + ', roof = spending, its rim drawn at ' + mv('<i>u</i>* = ' + r2(uStar())) + ': the rim and the wall are the constraint</div>';
      status.innerHTML = t;
    }
    function draw() { draw2(); draw3(); text(); }

    // drag the point in 2D
    let drag2 = false;
    const at2 = ev => { const r = s2.getBoundingClientRect(), px_ = (ev.clientX - r.left) / r.width * W, py_ = (ev.clientY - r.top) / r.height * H; P = clampP((px_ - L) / S2, (T + PH - py_) / S2); draw(); };
    s2.addEventListener('pointerdown', ev => { drag2 = true; try { s2.setPointerCapture(ev.pointerId); } catch (e) {} at2(ev); ev.stopPropagation(); ev.preventDefault(); });
    s2.addEventListener('pointermove', ev => { if (drag2) at2(ev); });
    ['pointerup', 'pointercancel'].forEach(n => s2.addEventListener(n, () => { drag2 = false; }));
    s2.addEventListener('click', ev => ev.stopPropagation());
    // turn the 3D view
    if (s3) {
      let d3 = null;
      s3.addEventListener('pointerdown', ev => { d3 = [ev.clientX, ev.clientY, yaw, elev]; try { s3.setPointerCapture(ev.pointerId); } catch (e) {} ev.stopPropagation(); ev.preventDefault(); });
      s3.addEventListener('pointermove', ev => { if (!d3) return; yaw = d3[2] + (ev.clientX - d3[0]) * 0.5; elev = Math.max(6, Math.min(90, d3[3] + (ev.clientY - d3[1]) * 0.35)); draw3(); });
      ['pointerup', 'pointercancel'].forEach(n => s3.addEventListener(n, () => { d3 = null; }));
      s3.addEventListener('click', ev => ev.stopPropagation());
    }
    // sliders
    const inputs = [], opInputs = []; let lineBtn = null, bestBtn = null;
    const refit = () => { P = clampP(P[0], P[1]); };
    if (movesP) {
      inputs.push(slider(ctl, '<i>p<sub>x</sub></i>', 1, 6, 0.5, px, (v, o, first) => { px = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
      inputs.push(slider(ctl, '<i>p<sub>y</sub></i>', 1, 4, 0.5, py, (v, o, first) => { py = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
    }
    if (movesU) {
      inputs.push(slider(ctl, 'α', 0.2, 2, 0.05, al, (v, o, first) => { al = v; o.innerHTML = r2(v); if (!first) draw(); }));
      inputs.push(slider(ctl, 'β', 0.2, 2, 0.05, be, (v, o, first) => { be = v; o.innerHTML = r2(v); if (!first) draw(); }));
    }
    if (isL && !box.dataset.plain) inputs.push(slider(here || ctl, 'λ', 0, 30, 0.5, lam, (v, o, first) => { lam = v; o.innerHTML = r2(v); if (!first) draw2(); }));
    if (isS) inputs.push(slider(here || ctl, '<i>p<sub>x</sub></i>', 0.4, 4, 0.1, px, (v, o, first) => { px = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
    if (mode === 'p' || mode === 'all') inputs.push(slider(ctl, '<i>B</i>', 20, 100, 5, B, (v, o, first) => { B = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
    if (mode === 'p') { const b = button(ctl, 'along the line', () => { showD = !showD; b.classList.toggle('on', showD); draw2(); }); lineBtn = b; }
    if (isS) { const b = button(ctl, 'show the best', () => { showBest = !showBest; b.classList.toggle('on', showBest); draw2(); }); bestBtn = b; }
    if (mode === 'all') {   // how see-through the roof and the mountain are
      const tr = el('div', 'vp-ctl lab-tr'); col3.appendChild(tr);
      opInputs.push(slider(tr, 'roof', 0, 1, 0.05, roofOp, (v, o, first) => { roofOp = v; if (!first) draw3(); }));
      opInputs.push(slider(tr, 'mountain', 0.1, 1, 0.05, mtOp, (v, o, first) => { mtOp = v; if (!first) draw3(); }));
    }
    if (s3) button(ctl, 'from above', () => { elev = elev >= 88 ? D0.elev : 90; draw3(); });
    button(ctl, 'reset', () => {
      [al, be, px, py, B, yaw, elev, lam] = [D0.al, D0.be, D0.px, D0.py, D0.B, D0.yaw, D0.elev, D0.lam]; P = D0.P.slice();
      const vals = (movesP ? [px, py] : []).concat(movesU ? [al, be] : []).concat(isL ? [lam] : []).concat(isS ? [px] : []).concat(mode === 'p' || mode === 'all' ? [B] : []);
      inputs.forEach((inp, k) => inp.set(vals[k])); opInputs.forEach((inp, k) => inp.set([0.5, 0.92][k]));
      showD = mode === 'all'; showBest = false; if (lineBtn) lineBtn.classList.remove('on'); if (bestBtn) bestBtn.classList.remove('on'); draw();
    });
    draw();
  }
  // one variable: f(x) = 10x − x², a point with its tangent; the slope goes to 0 at the top
  function fun(box) {
    css();
    const id = 'lab' + (++NID), f = x => 10 * x - x * x, fp = x => 10 - 2 * x, XM1 = 11, YM1 = 30, X1 = 1.5;
    const X = v => L + v / XM1 * PW, Y = v => T + PH - v / YM1 * PH;
    let x = X1, raf = 0;
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const two = el('div', 'lab-two'), s2 = document.createElementNS(NS, 'svg'), low = el('div', 'lab-low'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status');
    two.style.gridTemplateColumns = 'minmax(0,1fr)'; s2.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s2.setAttribute('class', 'lab-2d'); two.appendChild(s2);
    box.appendChild(two); box.appendChild(low); low.appendChild(ctl); low.appendChild(status);
    function draw() {
      const pts = []; for (let i = 0; i <= 200; i++) { const v = 10 * i / 200; pts.push(X(v).toFixed(1) + ',' + Y(f(v)).toFixed(1)); }
      const s = fp(x), a = x - 1.8, b = x + 1.8, sx = X(x), sy = Y(f(x)), top = Math.abs(s) < 0.005;
      let h = marker(id) + '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + PH) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + PH) + '" x2="' + (L + PW) + '" y2="' + (T + PH) + '" stroke="#222"/>';
      [2, 4, 6, 8, 10].forEach(v => { h += '<text x="' + X(v) + '" y="' + (T + PH + 18) + '" text-anchor="middle" font-size="15" fill="#555">' + v + '</text>'; });
      [5, 10, 15, 20, 25].forEach(v => { h += '<text x="' + (L - 7) + '" y="' + (Y(v) + 5) + '" text-anchor="end" font-size="15" fill="#555">' + v + '</text>'; });
      h += label(L - 8, T + 14, it('f'), '#555', 'end') + label(L + PW, T + PH + 34, it('x'), '#555', 'end');
      h += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + IC + '" stroke-width="3.2"/>';
      h += '<line x1="' + X(a) + '" y1="' + Y(f(x) + s * (a - x)) + '" x2="' + X(b) + '" y2="' + Y(f(x) + s * (b - x)) + '" stroke="' + GREEN + '" stroke-width="3" stroke-dasharray="7 5"/>';
      h += dot(sx, sy) + label(sx + (x > 5 ? 14 : -14), sy - 16, 'slope = ' + r2(s), GREEN, x > 5 ? 'start' : 'end', 20);
      s2.innerHTML = h;
      status.innerHTML = mv("<i>f</i>′(<i>x</i>) = " + r2(s)) + (top ? ': the change stops' : '');
    }
    let d = false;
    const at = ev => { const r = s2.getBoundingClientRect(); x = Math.max(0.1, Math.min(9.9, ((ev.clientX - r.left) / r.width * W - L) / PW * XM1)); if (Math.abs(x - 5) < 0.06) x = 5; draw(); };
    s2.addEventListener('pointerdown', ev => { cancelAnimationFrame(raf); d = true; try { s2.setPointerCapture(ev.pointerId); } catch (e) {} at(ev); ev.stopPropagation(); ev.preventDefault(); });
    s2.addEventListener('pointermove', ev => { if (d) at(ev); });
    ['pointerup', 'pointercancel'].forEach(n => s2.addEventListener(n, () => { d = false; }));
    s2.addEventListener('click', ev => ev.stopPropagation());
    button(ctl, 'walk to the top', () => { cancelAnimationFrame(raf); const x0 = x, t0 = performance.now(); const go = t => { const k = Math.min(1, (t - t0) / 1800); x = x0 + (5 - x0) * k; draw(); if (k < 1) raf = requestAnimationFrame(go); }; raf = requestAnimationFrame(go); });
    button(ctl, 'reset', () => { cancelAnimationFrame(raf); x = X1; draw(); });
    draw();
  }
  // one budget, two graphs: drag along u(x) on top; below, the same bundle on the budget line with its indifference curve. u = xy, 3x + y = 60
  function twoG(box) {
    css();
    const id = 'lab' + (++NID), u = x => 60 * x - 3 * x * x, up = x => 60 - 6 * x, H1 = 300, H2 = 250;
    let x = 3, raf = 0;
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const a = document.createElementNS(NS, 'svg'), b = document.createElementNS(NS, 'svg'), low = el('div', 'lab-low'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status'), col = el('div', 'lab-two');
    col.style.gridTemplateColumns = 'minmax(0,1fr)'; col.style.gap = '.1em';
    a.setAttribute('viewBox', '0 0 ' + W + ' ' + H1); a.setAttribute('class', 'lab-2d'); b.setAttribute('viewBox', '0 0 ' + W + ' ' + H2);
    col.appendChild(a); col.appendChild(b); box.appendChild(col); box.appendChild(low); low.appendChild(ctl); low.appendChild(status);
    const AL = 58, AW = 470, Ax = v => AL + v / 22 * AW, Ay = v => H1 - 34 - v / 340 * (H1 - 50), By = v => H2 - 34 - v / 66 * (H2 - 46);
    const axes = (hh, top, xl, yl, ys) => '<line x1="' + AL + '" y1="' + top + '" x2="' + AL + '" y2="' + (hh - 34) + '" stroke="#222"/><line x1="' + AL + '" y1="' + (hh - 34) + '" x2="' + (AL + AW) + '" y2="' + (hh - 34) + '" stroke="#222"/>' +
      [5, 10, 15, 20].map(v => '<text x="' + Ax(v) + '" y="' + (hh - 16) + '" text-anchor="middle" font-size="16" fill="#555">' + v + '</text>').join('') + ys + label(AL - 8, top + 14, it(yl), '#555', 'end', 18) + label(AL + AW, hh - 12, it(xl), '#555', 'end', 18);
    function draw() {
      const pts = []; for (let i = 0; i <= 120; i++) { const v = 20 * i / 120; pts.push(Ax(v).toFixed(1) + ',' + Ay(u(v)).toFixed(1)); }
      const s = up(x), xa = x - 3, xb = x + 3;
      let h = '<defs><clipPath id="' + id + 'c"><rect x="' + AL + '" y="6" width="' + AW + '" height="' + (H1 - 40) + '"/></clipPath></defs>' + axes(H1, 8, 'x', 'u', [100, 200, 300].map(v => '<text x="' + (AL - 7) + '" y="' + (Ay(v) + 5) + '" text-anchor="end" font-size="16" fill="#555">' + v + '</text>').join(''));
      h += '<g clip-path="url(#' + id + 'c)"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + GREEN + '" stroke-width="3.2"/><line x1="' + Ax(xa) + '" y1="' + Ay(u(x) + s * (xa - x)) + '" x2="' + Ax(xb) + '" y2="' + Ay(u(x) + s * (xb - x)) + '" stroke="#111" stroke-width="2.4" stroke-dasharray="7 5"/></g>';
      h += dot(Ax(x), Ay(u(x))) + label(Ax(x) + (x > 10 ? 12 : -12), Ay(u(x)) - 12, it('u') + '′ = ' + r2(s), '#111', x > 10 ? 'start' : 'end', 19);
      a.innerHTML = h;
      const y = 60 - 3 * x, uu = x * y, c = []; for (let i = 0; i <= 160; i++) { const v = 0.4 + 23.6 * i / 160, w = uu / v; if (w <= 66) c.push(Ax(v).toFixed(1) + ',' + By(w).toFixed(1)); }
      let g = '<defs><clipPath id="' + id + 'd"><rect x="' + AL + '" y="6" width="' + AW + '" height="' + (H2 - 40) + '"/></clipPath></defs>' + axes(H2, 8, 'x', 'y', [30, 60].map(v => '<text x="' + (AL - 7) + '" y="' + (By(v) + 5) + '" text-anchor="end" font-size="16" fill="#555">' + v + '</text>').join(''));
      g += '<g clip-path="url(#' + id + 'd)"><line x1="' + Ax(0) + '" y1="' + By(60) + '" x2="' + Ax(20) + '" y2="' + By(0) + '" stroke="' + BUDGET + '" stroke-width="3"/><polyline points="' + c.join(' ') + '" fill="none" stroke="' + IC + '" stroke-width="3"/></g>';
      g += dot(Ax(x), By(y)) + label(Ax(x) + 12, By(y) - 10, vec2(x, y), '#111', null, 17);
      b.innerHTML = g;
      status.innerHTML = mv('<i>u</i>′(' + r2(x) + ') = 60 − 6 · ' + r2(x) + ' = ' + r2(s)) + ', ' + mv('<i>u</i> = ' + r2(u(x)));
    }
    const vec2 = (p, q) => '(' + r2(p) + ', ' + r2(q) + ')';
    let d = false;
    const at = ev => { const r = a.getBoundingClientRect(); x = Math.max(0.2, Math.min(19.8, ((ev.clientX - r.left) / r.width * W - AL) / AW * 22)); if (Math.abs(x - 10) < 0.12) x = 10; draw(); };
    a.style.cursor = 'grab'; a.style.touchAction = 'none';
    a.addEventListener('pointerdown', ev => { d = true; try { a.setPointerCapture(ev.pointerId); } catch (e) {} at(ev); ev.stopPropagation(); ev.preventDefault(); });
    a.addEventListener('pointermove', ev => { if (d) at(ev); });
    ['pointerup', 'pointercancel'].forEach(n => a.addEventListener(n, () => { d = false; }));
    a.addEventListener('click', ev => ev.stopPropagation());
    draw();
  }
  function init() { document.querySelectorAll('.op-lab').forEach(b => (b.dataset.mode === 'f' ? fun : b.dataset.mode === 'two' ? twoG : lab)(b)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
