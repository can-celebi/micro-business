// L10 labs (Can, 04.11): drag a point on a 2D graph, a 3D graph next to it shows where you are.
//   <div class="op-lab" data-mode="u"></div>    utility only: curves, ∇u, the mountain; sliders α, β
//   <div class="op-lab" data-mode="b"></div>    budget line only, 2D: p = (p_x, 0) + (0, p_y), green arrow along the line
//   <div class="op-lab" data-mode="p"></div>    the same with sliders p_x, p_y and the spending roof in 3D, ending at its rim
//   <div class="op-lab" data-mode="lam"></div>  2D only: ∇u and ∇c at one scale, the point on the budget line, slider λ stretches ∇c
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
  const L = 54, T = 12, PW = 490, PH = 384, YMAX = 70, S2 = PH / YMAX, XMAX = PW / S2;
  const X2 = v => L + v * S2, Y2 = v => T + PH - v * S2;
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
      'html.mobile .lab-two{display:block}.lab-lam{margin-top:.1em;font-size:.6em;text-align:left}.lab-lam label{min-width:20em;display:grid;grid-template-columns:1.6em 1fr 2.6em;gap:.6em;align-items:center}.lab-lam input[type=range]{accent-color:#0062C4;width:100%}.lab-lam .vp-v{font-weight:600;text-align:right}';
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
  const marker = id => '<defs><clipPath id="' + id + 'c"><rect x="' + L + '" y="' + T + '" width="' + PW + '" height="' + PH + '"/></clipPath><marker id="' + id + 'a" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  // an arrow from screen point (x0, y0) by the data vector (vx, vy) at k pixels per unit
  const arrow2 = (id, x0, y0, vx, vy, k, col, w) => '<line x1="' + x0.toFixed(1) + '" y1="' + y0.toFixed(1) + '" x2="' + (x0 + vx * k).toFixed(1) + '" y2="' + (y0 - vy * k).toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'a)"/>';

  function lab(box) {
    css();
    const mode = box.dataset.mode || 'u', id = 'lab' + (++NID);
    const isL = mode === 'lam', hasU = mode === 'u' || mode === 'all' || isL, hasB = mode !== 'u', has3 = mode !== 'b' && !isL, movesP = mode === 'p' || mode === 'all', movesU = hasU && !isL;
    const D0 = { al: 1, be: 1, px: 3, py: 1, B: 60, P: isL ? [5, 45] : [10, 30], yaw: 40, elev: 30, lam: 1 };
    let lam = D0.lam, al = D0.al, be = D0.be, px = D0.px, py = D0.py, B = D0.B, P = D0.P.slice(), yaw = D0.yaw, elev = D0.elev;
    box.innerHTML = ''; box.setAttribute('data-prevent-swipe', '');
    const two = el('div', 'lab-two'), s2 = document.createElementNS(NS, 'svg'), low = el('div', 'lab-low'), ctl = el('div', 'vp-ctl'), status = el('div', 'vp-status');
    s2.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s2.setAttribute('class', 'lab-2d'); two.appendChild(s2);
    let s3 = null, side = null;
    if (has3) { s3 = document.createElementNS(NS, 'svg'); s3.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s3.setAttribute('class', 'lab-3d'); two.appendChild(s3); }
    else if (isL) { two.style.gridTemplateColumns = 'minmax(0,1fr)'; }
    else { side = el('div', 'lab-side'); two.appendChild(side); }
    box.appendChild(two); box.appendChild(low); low.appendChild(ctl); (side || low).appendChild(status);

    // the 3D floor. Utility alone: a smaller floor, so the mountain near the point has real height
    const XM = mode === 'u' ? 30 : 50, YM = mode === 'u' ? 60 : 70, K3 = mode === 'u' ? 5.4 : 4.9;
    const ZCAP = mode === 'u' ? ZH * 1.4 : ZH * 1.1;
    const U = (x, y) => Math.pow(x, al) * Math.pow(y, be);
    const grad = (x, y) => [al * Math.pow(x, al - 1) * Math.pow(y, be), be * Math.pow(x, al) * Math.pow(y, be - 1)];
    const Sp = (x, y) => px * x + py * y;
    const gRef = () => { const g = grad(20, 30); return Math.hypot(g[0], g[1]) || 1; };   // sets the arrow scale for the current α, β
    const best = () => { const t = al + be; return [al / t * B / px, be / t * B / py]; };
    const uStar = () => { const b = best(); return U(b[0], b[1]); };
    // the indifference curve u = c, as points, inside a box
    function curve(c, xm, ym, z) {
      const p = []; for (let i = 1; i <= 240; i++) { const x = xm * Math.pow(i / 240, 1.5), y = Math.pow(c / Math.pow(x, al), 1 / be); if (y <= ym * 1.02) p.push(z === undefined ? [x, y] : [x, Math.min(y, ym), z]); } return p;
    }
    const U0 = () => U(20, 30);                            // sets the height scale in mode "u"
    const levels = () => mode === 'all' || isL ? [0.25, 0.5, 1, 1.5, 2].map(t => uStar() * t) : [0.25, 0.5, 1, 1.5, 2].map(t => U0() * t);
    // the budget line inside a box: [[x, y], [x, y]]
    function rim(xm, ym) {
      let a = [0, B / py], b = [B / px, 0];
      if (a[1] > ym) a = [(B - py * ym) / px, ym];
      if (b[0] > xm) b = [xm, (B - px * xm) / py];
      return [a, b];
    }
    function clampP(x, y) {
      if (isL) { const xi = B / px, yi = B / py, t = Math.max(0.03, Math.min(0.97, (x * xi + (yi - y) * yi) / (xi * xi + yi * yi))); return [t * xi, (1 - t) * yi]; }
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
      let h = marker(id) + '<g clip-path="url(#' + id + 'c)">';
      if (mode === 'u') h += '<rect x="' + X2(0) + '" y="' + Y2(YM) + '" width="' + (X2(XM) - X2(0)) + '" height="' + (Y2(0) - Y2(YM)) + '" fill="#F4F4F0"/>';   // the same floor as in 3D
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
      h += '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + PH) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + PH) + '" x2="' + (L + PW) + '" y2="' + (T + PH) + '" stroke="#222"/>';
      [10, 20, 30, 40, 50, 60].forEach(v => { h += '<text x="' + (L - 7) + '" y="' + (Y2(v) + 5) + '" text-anchor="end" font-size="15" fill="#555">' + v + '</text>'; });
      [10, 20, 30, 40, 50, 60, 70, 80].forEach(v => { h += '<text x="' + X2(v) + '" y="' + (T + PH + 18) + '" text-anchor="middle" font-size="15" fill="#555">' + v + '</text>'; });
      h += label(L - 8, T + 14, it('y'), '#555', 'end') + label(L + PW, T + PH + 34, it('x'), '#555', 'end');
      if (isL) {   // one scale for both arrows, so λ∇c lies on ∇u exactly when they are equal
        const K = 4, g = grad(x, y);
        if (lam !== 1) h += arrow2(id, sx, sy, px * lam, py * lam, K, '#E8955F', 7) + label(sx + px * lam * K + 8, sy - py * lam * K + 24, 'λ∇' + it('c'), BUDGET, null, 22);
        h += arrow2(id, sx, sy, g[0], g[1], K, GRAD, 3.5) + label(sx + g[0] * K + 8, sy - g[1] * K - 8, '∇' + it('u'), GRAD, null, 22);
        h += arrow2(id, sx, sy, px, py, K, P_ARROW, 4.5) + label(sx + px * K + 2, sy + 22, '∇' + it('c'), P_ARROW, null, 22);
      }
      if (hasB && !isL) {
        const K = 24, d = [py, -px], dn = Math.hypot(d[0], d[1]), dl = 3.4 / dn;
        // green: along the budget line, at a right angle to p
        h += arrow2(id, sx, sy, d[0] * dl, d[1] * dl, K, GREEN, 3.5) + label(sx + d[0] * dl * K + 8, sy - d[1] * dl * K + 18, 'along the line', GREEN, null, 17);
        // one more x + one more y = p
        if (mode !== 'all') h += arrow2(id, sx, sy, px, 0, K, '#777', 2.5) + arrow2(id, sx + px * K, sy, 0, py, K, '#777', 2.5) + label(sx + px * K / 2, sy + 20, r2(px), '#555', 'middle', 16) + label(sx + px * K + 7, sy - py * K / 2 + 5, r2(py), '#555', null, 16);
        h += arrow2(id, sx, sy, px, py, K, P_ARROW, 4) + label(sx + px * K + (mode === 'all' ? 0 : 8), sy - py * K + (mode === 'all' ? 24 : -8), it('p'), P_ARROW, null, 22);
      }
      if (hasU && !isL) {
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
    const hillFill = hz => 'hsl(' + (210 + 10 * hz) + ',' + (50 + 20 * hz) + '%,' + (90 - 30 * hz) + '%)';
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
          out.push([d, '<polygon points="' + c.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') + '" fill="' + fill(zc / ZH) + '" stroke="#fff" stroke-width="0.4" opacity="' + o + '"/>']);
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
        if (hasU) surface((a, b) => zu(U(a, b)), hillFill, 0.92, 0.16, parts);
        if (hasB) surface((a, b) => zs(Sp(a, b)), () => roofFill, mode === 'all' ? 0.22 : 0.95, mode === 'all' ? 0 : 0.12, parts);
      }
      parts.sort((a, b) => a[0] - b[0]); h += parts.map(p => p[1]).join('');
      if (elev < 88 && hasU) { h += line3(curve(U(x, y), XM, YM, zu(U(x, y))).filter(q => q[2] <= ZCAP && (mode !== 'all' || inSet(q[0], q[1]))), IC, 2.4); }
      if (elev < 88 && hasB) {
        // where the budget set ends: the rim of the roof, and a wall from the rim down to the budget line
        const q = rim(XM, YM), A0 = q[0], A1 = q[1];
        h += '<polygon points="' + [pt(A0[0], A0[1], 0), pt(A1[0], A1[1], 0), pt(A1[0], A1[1], zB), pt(A0[0], A0[1], zB)].join(' ') + '" fill="' + BUDGET + '" opacity="0.14"/>';
        h += line3([[A0[0], A0[1], zB], [A1[0], A1[1], zB]], BUDGET, 4);
        h += line3([[A0[0], A0[1], 0], [A0[0], A0[1], zB]], BUDGET, 1.6) + line3([[A1[0], A1[1], 0], [A1[0], A1[1], zB]], BUDGET, 1.6);
      }
      // where you are
      const zNow = mode === 'p' ? zs(Sp(x, y)) : zu(U(x, y)), zShow = elev < 88 ? Math.min(zNow, ZCAP) : 0;
      h += line3([[x, y, 0], [x, y, zShow]], '#555', 1.4, ' stroke-dasharray="4 4"');
      const arrow3 = (vx, vy, col, w) => { const a = pr(x, y, 0), b = pr(x + vx, y + vy, 0); return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#' + id + 'b)"/>'; };
      if (hasB) h += arrow3(px * 2.5, py * 2.5, P_ARROW, 3.5);
      if (hasU) { const g = grad(x, y), gl = Math.hypot(g[0], g[1]) || 1, k = Math.min(16 / gRef(), 24 / gl); h += arrow3(g[0] * k, g[1] * k, GRAD, 3.5); }
      const a0 = pr(x, y, 0), a1 = pr(x, y, zShow);
      h += dot(a0[0], a0[1], 5) + dot(a1[0], a1[1], 8);
      s3.innerHTML = h;
    }
    function text() {
      if (isL) return;   // Can 04.11: graph only, no read-outs
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
    const inputs = [];
    const refit = () => { P = clampP(P[0], P[1]); };
    if (movesP) {
      inputs.push(slider(ctl, '<i>p<sub>x</sub></i>', 1, 6, 0.5, px, (v, o, first) => { px = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
      inputs.push(slider(ctl, '<i>p<sub>y</sub></i>', 1, 4, 0.5, py, (v, o, first) => { py = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
    }
    if (movesU) {
      inputs.push(slider(ctl, 'α', 0.2, 2, 0.05, al, (v, o, first) => { al = v; o.innerHTML = r2(v); if (!first) draw(); }));
      inputs.push(slider(ctl, 'β', 0.2, 2, 0.05, be, (v, o, first) => { be = v; o.innerHTML = r2(v); if (!first) draw(); }));
    }
    if (isL) { const here = (box.parentElement && box.parentElement.querySelector('.lab-lam')) || ctl; here.classList.add('vp-ctl'); inputs.push(slider(here, 'λ', 0, 30, 0.5, lam, (v, o, first) => { lam = v; o.innerHTML = r2(v); if (!first) draw2(); })); }
    if (mode === 'all') inputs.push(slider(ctl, '<i>B</i>', 20, 100, 5, B, (v, o, first) => { B = v; o.innerHTML = '€' + r2(v); if (!first) { refit(); draw(); } }));
    if (s3) button(ctl, 'from above', () => { elev = elev >= 88 ? D0.elev : 90; draw3(); });
    button(ctl, 'reset', () => {
      [al, be, px, py, B, yaw, elev, lam] = [D0.al, D0.be, D0.px, D0.py, D0.B, D0.yaw, D0.elev, D0.lam]; P = D0.P.slice();
      const vals = (movesP ? [px, py] : []).concat(movesU ? [al, be] : []).concat(mode === 'all' ? [B] : []).concat(isL ? [lam] : []);
      inputs.forEach((inp, k) => inp.set(vals[k])); draw();
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
  function init() { document.querySelectorAll('.op-lab').forEach(b => (b.dataset.mode === 'f' ? fun : lab)(b)); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
