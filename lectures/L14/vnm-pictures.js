/* vnm-pictures.js: five interactive pictures for the L14 vNM slides, ported from the vNM bridge page (Wieland, 25.11.2026).
   Use: <div class="vnm-pic" data-vnm="ranking"></div>  kinds: ranking | rule | dial | swap | three | changes
   Self-contained: no network, no storage, no globals, no ids. Local only: nothing is sent or stored. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var GREEN = '#4f8a3c', SAND = '#e6b877', GREY = '#d3d3d0', INK = '#1d1d1f', DIM = '#6b6b70', ORANGE = '#c2410c';
  function el(tag, attrs, txt) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (txt !== undefined) e.textContent = txt; return e; }
  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function num(x) { return String(Math.round(x * 1000) / 1000); }
  function text(s, x, y, t, o) { o = o || {}; s.appendChild(el('text', { x: x, y: y, 'font-size': o.size || 20, 'text-anchor': o.anchor || 'start', fill: o.fill || INK, 'font-weight': o.bold ? 600 : 400 }, t)); }
  function bar(s, x, y, w, parts) {                       // parts: [share, colour, label]
    var cx = x;
    parts.forEach(function (p) {
      var pw = w * p[0]; if (pw <= 0) return;
      s.appendChild(el('rect', { x: cx, y: y, width: pw, height: 40, fill: p[1] }));
      var lab = p[2];
      if (pw < lab.length * 11 + 8) lab = lab.split(' ')[0];
      if (pw >= lab.length * 11 + 8) text(s, cx + pw / 2, y + 27, lab, { anchor: 'middle', fill: p[1] === GREEN ? '#fff' : INK });
      cx += pw;
    });
    s.appendChild(el('rect', { x: x, y: y, width: w, height: 40, fill: 'none', stroke: INK, 'stroke-width': 1 }));
  }
  function frame(box, hgt, label) {
    var s = el('svg', { viewBox: '0 0 640 ' + hgt, role: 'img', 'aria-label': label });
    s.style.cssText = 'display:block;width:100%;max-width:820px;margin:0 auto;font-family:inherit';
    box.appendChild(s); return s;
  }
  function out(box) { var o = h('div', 'vnm-out'); o.setAttribute('aria-live', 'polite'); box.appendChild(o); return o; }
  function slider(box, lab, min, max, step, val, fn) {
    var w = h('label', 'vnm-ctl'), t = h('span', '', lab), r = h('input');
    r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
    var v = h('b'); w.appendChild(t); w.appendChild(r); w.appendChild(v); box.appendChild(w);
    function go() { fn(+r.value, v); }
    r.addEventListener('input', go);
    r.addEventListener('change', function () { r.blur(); });          // reveal ignores the arrow keys while an input has the focus
    go(); return r;
  }
  function buttons(box, list, pick) {
    var w = h('div', 'vnm-btns'), bs = [];
    list.forEach(function (n, i) { var b = h('button', '', n); b.type = 'button'; b.addEventListener('click', function () { pick(i); b.blur(); }); w.appendChild(b); bs.push(b); });
    box.appendChild(w);
    return function (i) { bs.forEach(function (b, k) { b.className = k === i ? 'on' : ''; b.setAttribute('aria-pressed', k === i); }); };
  }
  function ladder(s, hv, ticket) {
    while (s.firstChild) s.removeChild(s.firstChild);
    function y(v) { return 225 - v * 19; }
    s.appendChild(el('line', { x1: 170, y1: y(0), x2: 170, y2: y(10), stroke: GREY, 'stroke-width': 4 }));
    [[10, 'S', GREEN], [hv, 'H', SAND], [0, 'C', GREY]].forEach(function (p) {
      s.appendChild(el('circle', { cx: 170, cy: y(p[0]), r: 13, fill: p[2], stroke: INK, 'stroke-width': 1 }));
      text(s, 145, y(p[0]) + 7, num(p[0]), { anchor: 'end', bold: true });
      text(s, 195, y(p[0]) + 7, p[1], { bold: true });
    });
    if (ticket) {
      s.appendChild(el('line', { x1: 130, y1: y(5), x2: 600, y2: y(5), stroke: ORANGE, 'stroke-width': 3, 'stroke-dasharray': '8 6' }));
      text(s, 420, y(5) - 10, 'the ticket: 5', { fill: ORANGE, bold: true });
    }
  }
  var KINDS = {
    ranking: function (box) {
      var s = frame(box, 250, 'numbers for S, H and C on a scale'), o;
      slider(box, 'number for H', 1, 9, 1, 6, function (v, b) { b.textContent = v; ladder(s, v, false); if (o) o.textContent = 'S ≻ H ≻ C: the same ranking'; });
      o = out(box); o.textContent = 'S ≻ H ≻ C: the same ranking';
    },
    rule: function (box) {
      var s = frame(box, 250, 'numbers for S, H and C and the ticket at 5'), o = null, set = null, r;
      function show(v, b) {
        if (b) b.textContent = v;
        ladder(s, v, true);
        if (set) set(v === 8 ? 0 : v === 3 ? 1 : -1);
        if (o) { o.innerHTML = ''; o.appendChild(h('div', '', 'ranking: S ≻ H ≻ C, always')); o.appendChild(h('div', 'big ' + (v > 5 ? 'k' : v < 5 ? 't' : ''), v > 5 ? 'H: ' + v + ' > 5 → keep H' : v < 5 ? 'H: ' + v + ' < 5 → take the ticket' : 'H: 5 = 5 → indifferent')); }
      }
      set = buttons(box, ['H = 8', 'H = 3'], function (i) { r.value = i === 0 ? 8 : 3; r.dispatchEvent(new Event('input')); });
      r = slider(box, 'number for H', 1, 9, 1, 8, show);
      o = out(box); show(+r.value, null);
    },
    dial: function (box) {
      var s = frame(box, 235, 'the ticket with chance p of S, and H on the scale from 0 to 1'), o = null;
      function show(p, b) {
        b.textContent = p + '%';
        while (s.firstChild) s.removeChild(s.firstChild);
        text(s, 20, 37, 'ticket', { bold: true });
        bar(s, 110, 12, 500, [[p / 100, GREEN, 'S ' + p + '%'], [1 - p / 100, GREY, 'C ' + (100 - p) + '%']]);
        text(s, 20, 97, '∼  H', { bold: true });
        s.appendChild(el('rect', { x: 110, y: 72, width: 500, height: 40, fill: SAND, stroke: INK }));
        text(s, 360, 99, 'H for sure', { anchor: 'middle' });
        function X(v) { return 110 + 460 * v; }
        s.appendChild(el('line', { x1: X(0), y1: 170, x2: X(1), y2: 170, stroke: GREY, 'stroke-width': 4 }));
        [[0, GREY], [1, GREEN], [p / 100, SAND]].forEach(function (d) { s.appendChild(el('circle', { cx: X(d[0]), cy: 170, r: 12, fill: d[1], stroke: INK })); });
        text(s, X(0), 212, 'u(C) = 0', { anchor: 'middle' }); text(s, X(1), 212, 'u(S) = 1', { anchor: 'middle' });
        if (o) o.textContent = 'indifferent: H ∼ (S ' + p + '%, C ' + (100 - p) + '%), so u(H) = ' + num(p / 100);
      }
      var r = slider(box, 'I am indifferent at p =', 1, 99, 1, 60, show);
      o = out(box); r.dispatchEvent(new Event('input'));
    },
    swap: function (box) {
      var s = frame(box, 250, 'lottery 1, H replaced by its ticket, compared with lottery 2'), o = null;
      function show(q, b) {
        b.textContent = q + '%';
        var S10 = q * 6, sS = S10 / 1000, pS = S10 / 10;
        while (s.firstChild) s.removeChild(s.firstChild);
        function row(y, t, parts) { text(s, 10, y + 27, t); bar(s, 170, y, 460, parts); }
        row(8, 'lottery 1', [[q / 100, SAND, 'H ' + q + '%'], [1 - q / 100, GREY, 'C ' + (100 - q) + '%']]);
        row(68, 'replace H', [[sS, GREEN, 'S ' + num(pS) + '%'], [q / 100 - sS, GREY, 'C ' + num(q - pS) + '%'], [1 - q / 100, GREY, 'C ' + (100 - q) + '%']]);
        row(128, '= ticket', [[sS, GREEN, 'S ' + num(pS) + '%'], [1 - sS, GREY, 'C ' + num(100 - pS) + '%']]);
        row(200, 'lottery 2', [[0.2, GREEN, 'S 20%'], [0.8, GREY, 'C 80%']]);
        if (o) o.textContent = S10 > 200 ? 'S: ' + num(pS) + '% > 20%, so lottery 1 ≻ lottery 2' : 'S: ' + num(pS) + '% < 20%, so lottery 2 ≻ lottery 1';
      }
      var r = slider(box, 'chance of H in lottery 1', 5, 100, 5, 40, show);
      o = out(box); r.dispatchEvent(new Event('input'));
    },
    three: function (box) {
      var L = [[0, 40, 60], [20, 0, 80], [20, 30, 50]], U = L.map(function (l) { return l[0] + l[1] * 0.6; });
      var s = frame(box, 345, 'lotteries 1, 2 and 3 as tickets between S and C'), set, o;
      function show(i) {
        var l = L[i];
        function row(y, t, parts, on) { text(s, 10, y + 27, t, { bold: on }); bar(s, 150, y, 480, parts); }
        while (s.firstChild) s.removeChild(s.firstChild);
        row(6, 'lottery ' + (i + 1), [[l[0] / 100, GREEN, 'S ' + l[0] + '%'], [l[1] / 100, SAND, 'H ' + l[1] + '%'], [l[2] / 100, GREY, 'C ' + l[2] + '%']], true);
        row(62, l[1] ? 'replace H' : 'no H', [[l[0] / 100, GREEN, 'S ' + l[0] + '%'], [l[1] * 0.006, GREEN, 'S ' + num(l[1] * 0.6) + '%'], [l[1] * 0.004, GREY, 'C ' + num(l[1] * 0.4) + '%'], [l[2] / 100, GREY, 'C ' + l[2] + '%']]);
        text(s, 10, 150, 'as tickets between S and C:', { fill: DIM });
        [2, 0, 1].forEach(function (k, r) { row(164 + r * 58, 'lottery ' + (k + 1), [[U[k] / 100, GREEN, 'S ' + num(U[k]) + '%'], [1 - U[k] / 100, GREY, 'C ' + num(100 - U[k]) + '%']], k === i); });
        set(i);
        o.textContent = 'lottery ' + (i + 1) + ' is a ' + num(U[i]) + '% chance of S. Order: lottery 3 ≻ lottery 1 ≻ lottery 2';
      }
      set = buttons(box, ['lottery 1', 'lottery 2', 'lottery 3'], show);
      o = out(box); show(2);
    },
    changes: function (box) {
      var C = [['u', function (u) { return u; }], ['10 + 20 · u', function (u) { return 10 + 20 * u; }], ['u²', function (u) { return u * u; }]];
      var s = frame(box, 170, 'the prizes on the chosen scale'), set, o;
      function show(i) {
        var f = C[i][1], lo = f(0), hi = f(1), X = function (v) { return 80 + 480 * (v - lo) / (hi - lo); };
        while (s.firstChild) s.removeChild(s.firstChild);
        s.appendChild(el('line', { x1: 80, y1: 75, x2: 560, y2: 75, stroke: GREY, 'stroke-width': 4 }));
        [[0, 'C', GREY], [0.6, 'H', SAND], [1, 'S', GREEN]].forEach(function (p) {
          s.appendChild(el('circle', { cx: X(f(p[0])), cy: 75, r: 13, fill: p[2], stroke: INK }));
          text(s, X(f(p[0])), 45, p[1], { anchor: 'middle', bold: true }); text(s, X(f(p[0])), 115, num(f(p[0])), { anchor: 'middle' });
        });
        var L1 = 0.4 * f(0.6) + 0.6 * f(0), L2 = 0.2 * f(1) + 0.8 * f(0), ok = L1 > L2;
        set(i); o.innerHTML = '';
        o.appendChild(h('div', '', 'lottery 1 (H 40%, C 60%): ' + num(L1) + '    lottery 2 (S 20%, C 80%): ' + num(L2)));
        o.appendChild(h('div', 'big ' + (ok ? 'k' : 't'), ok ? 'lottery 1 ≻ lottery 2' + (i ? ': the same order' : '') : 'lottery 2 ≻ lottery 1: the order has changed'));
      }
      set = buttons(box, C.map(function (c) { return c[0]; }), show);
      o = out(box); show(0);
    }
  };
  var CSS = '.vnm-pic{max-width:860px;margin:.3em auto;font-size:22px;line-height:1.35}' +
    '.vnm-pic svg text{font-family:inherit}' +
    '.vnm-ctl{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin:.35em 0}' +
    '.vnm-ctl input{flex:1 1 220px;max-width:420px;min-height:32px;accent-color:' + GREEN + '}' +
    '.vnm-ctl b{min-width:2.6em;text-align:left}' +
    '.vnm-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:.35em 0}' +
    '.vnm-btns button{font:inherit;padding:.2em .8em;min-height:36px;border:1px solid #bdbdb9;border-radius:6px;background:#fff;color:' + INK + ';cursor:pointer}' +
    '.vnm-btns button.on{border-color:' + GREEN + ';background:#eaf3e6;font-weight:600}' +
    '.vnm-out{text-align:center;min-height:1.4em;margin-top:.2em}.vnm-out .big{font-size:1.25em;font-weight:600}.vnm-out .k{color:' + GREEN + '}.vnm-out .t{color:' + ORANGE + '}';
  function mount() {
    if (!document.querySelector('style[data-vnm-css]')) { var st = document.createElement('style'); st.setAttribute('data-vnm-css', ''); st.textContent = CSS; document.head.appendChild(st); }
    Array.prototype.forEach.call(document.querySelectorAll('.vnm-pic[data-vnm]'), function (box) {
      if (box.getAttribute('data-vnm-ready')) return;
      var k = KINDS[box.getAttribute('data-vnm')]; if (!k) return;
      box.setAttribute('data-vnm-ready', '1'); box.setAttribute('data-prevent-swipe', '');
      k(box);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
