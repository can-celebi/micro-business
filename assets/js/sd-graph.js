// Interactive demand / supply line with two sliders, for the slides (Can, 07.10: "demand is Q = a − bP,
// one slider for a and one for b; each equation version on its own line").
// Markup: <div class="sd-slider" data-kind="demand" data-a="120" data-b="4" data-amin="40" data-amax="200"
//          data-bmin="1" data-bmax="10" data-qmax="200" data-pmax="60"></div>
// demand: Q = a − b·P  → inverse P = a/b − Q/b ;  supply: Q = c + d·P (c usually negative) → inverse P = −c/d + Q/d
(function () {
  const r1 = x => Math.round(x * 10) / 10;
  function draw(box) {
    const v = k => +box.querySelector('[data-k="' + k + '"]').value, a = v('a'), b = v('b');
    const qm = +box.dataset.qmax, pm = +box.dataset.pmax, isD = box.dataset.kind === 'demand';
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
      (isD && a <= qm ? '<circle cx="' + x(a) + '" cy="' + (T + ph) + '" r="5" fill="' + c + '"/><text x="' + x(a) + '" y="' + (T + ph - 10) + '" text-anchor="middle" fill="#555">Q = ' + a + '</text>' : '');
    box.querySelector('[data-o="a"]').textContent = a;
    box.querySelector('[data-o="b"]').textContent = b;
    const s = a < 0 ? '− ' + (-a) : '+ ' + a;
    box.querySelector('.ro').innerHTML = isD
      ? '<div>demand: <b>Q = ' + a + ' − ' + b + '·P</b></div><div>inverse demand: <b>P = ' + r1(a / b) + ' − Q/' + b + '</b></div><div class="dim">nobody buys above €' + r1(a / b) + ' · at a price of 0, ' + a + ' would be bought</div>'
      : '<div>supply: <b>Q = ' + b + '·P ' + s + '</b></div><div>inverse supply: <b>P = ' + r1(-a / b) + ' + Q/' + b + '</b></div><div class="dim">nobody sells below €' + r1(-a / b) + '</div>';
  }
  function init(box) {
    const d = box.dataset, isD = d.kind === 'demand';
    const la = isD ? 'a' : 'c', lb = isD ? 'b' : 'd';
    box.innerHTML = '<svg viewBox="0 0 520 300" font-family="IBM Plex Mono,monospace" font-size="13"></svg>' +
      '<label><span>' + la + '</span><input type="range" data-k="a" min="' + d.amin + '" max="' + d.amax + '" step="' + (d.astep || 1) + '" value="' + d.a + '"><b data-o="a"></b></label>' +
      '<label><span>' + lb + '</span><input type="range" data-k="b" min="' + d.bmin + '" max="' + d.bmax + '" step="1" value="' + d.b + '"><b data-o="b"></b></label><div class="ro"></div>';
    box.querySelectorAll('input').forEach(i => { i.oninput = () => draw(box); i.addEventListener('keydown', e => e.stopPropagation()); });
    draw(box);
  }
  function go() { document.querySelectorAll('.sd-slider').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
