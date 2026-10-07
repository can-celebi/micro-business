// Interactive demand / supply line with two sliders, for the slides (Can, 07.10: "demand is Q = a − bP,
// one slider for a and one for b; each equation version on its own line").
// Markup: <div class="sd-slider" data-kind="demand" data-a="120" data-b="4" data-amin="40" data-amax="200"
//          data-bmin="1" data-bmax="10" data-qmax="200" data-pmax="60"></div>
// demand: Q = a − b·P (sliders a, b) ;  supply: Q = c + d·P (c usually negative)
// invdemand (Can, 07.10: the inverse version gets its own slider slide): P = c − d·Q, sliders c and d, plus a
//   quantity slider: 'to sell this many, the price must be …' (data-q, data-bstep for d's step)
(function () {
  const r1 = x => Math.round(x * 10) / 10;
  function draw(box) {
    const v = k => +box.querySelector('[data-k="' + k + '"]').value;
    const qm = +box.dataset.qmax, pm = +box.dataset.pmax, isInv = box.dataset.kind === 'invdemand', isD = box.dataset.kind === 'demand' || isInv;
    const r2 = x => Math.round(x * 100) / 100;
    // inverse P = c − d·Q is the same line as Q = c/d − P/d
    const a = isInv ? v('a') / v('b') : v('a'), b = isInv ? 1 / v('b') : v('b');
    const W = 520, H = 300, L = 56, B = 34, T = 10, R = 14, pw = W - L - R, ph = H - T - B;
    const x = q => L + Math.max(0, Math.min(q, qm)) / qm * pw, y = p => T + ph - Math.max(0, Math.min(p, pm)) / pm * ph;
    // endpoints of the line inside the box
    let p0, q0, p1, q1;
    if (isD) { // Q = a − bP: P from 0 to a/b
      p0 = Math.min(a / b, pm); q0 = a - b * p0; p1 = 0; q1 = a;
      if (q1 > qm) { q1 = qm; p1 = (a - qm) / b; }
    } else {   // Q = a + bP (a ≤ 0): starts at P = −a/b
      p0 = -a / b; q0 = 0; p1 = pm; q1 = a + b * pm;
      if (q1 > qm) { q1 = qm; p1 = (qm - a) / b; }
    }
    const c = isD ? '#0074D9' : '#eb6834', ch = isD ? a / b : -a / b;
    box.querySelector('svg').innerHTML =
      '<line x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (T + ph) + '" stroke="#222"/><line x1="' + L + '" y1="' + (T + ph) + '" x2="' + (L + pw) + '" y2="' + (T + ph) + '" stroke="#222"/>' +
      '<text x="' + (L - 8) + '" y="' + (T + 12) + '" text-anchor="end" fill="#777">P</text><text x="' + (L + pw) + '" y="' + (T + ph + 18) + '" text-anchor="end" fill="#777">Q</text>' +
      '<line x1="' + x(q0) + '" y1="' + y(p0) + '" x2="' + x(q1) + '" y2="' + y(p1) + '" stroke="' + c + '" stroke-width="3"/>' +
      (ch <= pm ? '<circle cx="' + L + '" cy="' + y(ch) + '" r="5" fill="' + c + '"/><text x="' + (L + 8) + '" y="' + (y(ch) - 6) + '" fill="#555">P = ' + r1(ch) + '</text>' : '') +
      (isD && !isInv && a <= qm ? '<circle cx="' + x(a) + '" cy="' + (T + ph) + '" r="5" fill="' + c + '"/><text x="' + x(a) + '" y="' + (T + ph - 10) + '" text-anchor="middle" fill="#555">Q = ' + r1(a) + '</text>' : '') +
      (isInv ? (() => { const q = v('q'), p = Math.max(0, v('a') - v('b') * q);
        return '<line x1="' + x(q) + '" y1="' + (T + ph) + '" x2="' + x(q) + '" y2="' + y(p) + '" stroke="#999" stroke-dasharray="4 4"/><line x1="' + L + '" y1="' + y(p) + '" x2="' + x(q) + '" y2="' + y(p) + '" stroke="#999" stroke-dasharray="4 4"/>' +
          '<circle cx="' + x(q) + '" cy="' + y(p) + '" r="6" fill="#222"/><text x="' + (x(q) + 9) + '" y="' + (y(p) - 8) + '" fill="#222">Q = ' + q + ' → P = ' + r2(p) + '</text>'; })() : '');
    box.querySelector('[data-o="a"]').textContent = v('a');
    box.querySelector('[data-o="b"]').textContent = v('b');
    if (isInv) {
      box.querySelector('[data-o="q"]').textContent = v('q');
      const q = v('q'), p = Math.max(0, v('a') - v('b') * q);
      box.querySelector('.ro').innerHTML = '<div>inverse demand: <b>P = ' + v('a') + ' − ' + v('b') + '·Q</b></div>' +
        '<div>for a quantity of <b>' + q + '</b>, consumers are willing to pay <b>' + r2(p) + '</b></div>' +
        '<div class="dim">at ' + v('a') + ' or more, nobody buys · each extra unit: the price ' + v('b') + ' lower</div>';
      return;
    }
    const s = a < 0 ? '− ' + (-a) : '+ ' + a;
    box.querySelector('.ro').innerHTML = isD
      ? '<div>demand: <b>Q = ' + a + ' − ' + b + '·P</b></div><div class="dim">if it were free (P = 0): ' + a + ' would be bought · each €1 more: ' + b + ' fewer · at ' + r1(a / b) + ' or more: nobody</div>'
      : '<div>supply: <b>Q = ' + b + '·P ' + s + '</b></div><div>inverse supply: <b>P = ' + r1(-a / b) + ' + Q/' + b + '</b></div><div class="dim">nobody sells below €' + r1(-a / b) + '</div>';
  }
  function init(box) {
    const d = box.dataset, isD = d.kind === 'demand', isInv = d.kind === 'invdemand';
    const la = isD ? 'a' : 'c', lb = isD ? 'b' : 'd';
    box.innerHTML = '<svg viewBox="0 0 520 300" font-family="IBM Plex Mono,monospace" font-size="13"></svg>' +
      '<label><span>' + la + '</span><input type="range" data-k="a" min="' + d.amin + '" max="' + d.amax + '" step="' + (d.astep || 1) + '" value="' + d.a + '"><b data-o="a"></b></label>' +
      '<label><span>' + lb + '</span><input type="range" data-k="b" min="' + d.bmin + '" max="' + d.bmax + '" step="' + (d.bstep || 1) + '" value="' + d.b + '"><b data-o="b"></b></label>' +
      (isInv ? '<label><span>Q</span><input type="range" data-k="q" min="0" max="' + d.qmax + '" step="1" value="' + (d.q || 40) + '"><b data-o="q"></b></label>' : '') + '<div class="ro"></div>';
    box.querySelectorAll('input').forEach(i => { i.oninput = () => draw(box); i.addEventListener('keydown', e => e.stopPropagation()); });
    draw(box);
  }
  function go() { document.querySelectorAll('.sd-slider').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
