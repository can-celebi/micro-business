/* vnm-intuition.js: four pictures for Thursday's opening, from ordinal to cardinal (Wieland, 25.11.2026).
   Use: <div class="vnm-int" data-int="problem"></div>  kinds: problem | ruler | cardinal | test
   Self-contained: no network, no storage, no globals, no ids. Local only: nothing is sent or stored. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var GREEN = '#4f8a3c', SAND = '#e6b877', GREY = '#d3d3d0', INK = '#1d1d1f', DIM = '#6b6b70', ORANGE = '#c2410c';
  function el(tag, a, t) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (t !== undefined) e.textContent = t; return e; }
  function h(tag, cls, t) { var e = document.createElement(tag); if (cls) e.className = cls; if (t !== undefined) e.textContent = t; return e; }
  function text(s, x, y, t, o) { o = o || {}; s.appendChild(el('text', { x: x, y: y, 'font-size': o.size || 20, 'text-anchor': o.anchor || 'start', fill: o.fill || INK, 'font-weight': o.bold ? 600 : 400, opacity: o.op || 1 }, t)); }
  function clear(s) { while (s.firstChild) s.removeChild(s.firstChild); }
  var WIDE = !(window.matchMedia && window.matchMedia('(max-width: 760px)').matches) && !document.documentElement.classList.contains('mobile');
  function frame(box, hgt, label, w) { var s = el('svg', { viewBox: '0 0 ' + (w || 640) + ' ' + hgt, role: 'img', 'aria-label': label }); s.style.cssText = 'display:block;width:100%;max-width:' + (w ? 1240 : 880) + 'px;margin:0 auto;font-family:inherit'; box.appendChild(s); return s; }
  function num(x) { return String(Math.round(x * 1000) / 1000); }
  function dot(s, x, y, c, r) { s.appendChild(el('circle', { cx: x, cy: y, r: r || 12, fill: c, stroke: INK, 'stroke-width': 1 })); }
  function line(s, x1, y1, x2, y2, c, w) { s.appendChild(el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: c || GREY, 'stroke-width': w || 5 })); }
  function out(box) { var o = h('div', 'vi-out'); o.setAttribute('aria-live', 'polite'); box.appendChild(o); return o; }
  function say(o, cls, t, t2) { o.textContent = ''; o.appendChild(h('div', 'big ' + cls, t)); if (t2) o.appendChild(h('div', '', t2)); }
  function buttons(box, list, pick) {
    var w = h('div', 'vi-btns'), bs = [];
    list.forEach(function (n, i) { var b = h('button', '', n); b.type = 'button'; b.addEventListener('click', function () { pick(i); b.blur(); }); w.appendChild(b); bs.push(b); });
    box.appendChild(w);
    return function (i) { bs.forEach(function (b, k) { b.className = k === i ? 'on' : ''; b.setAttribute('aria-pressed', k === i); }); };
  }
  var PRINT = /print-pdf/.test(location.search);
  var KINDS = {
    problem: function (box) {
      var N = [[1, 2, 3], [1, 2, 100], [0, 9, 10]], V = ['a tie', 'take the lottery ticket', 'keep H'];
      var rh = WIDE ? 100 : 150, x0 = WIDE ? 60 : 50, x1 = WIDE ? 640 : 590;
      var s = frame(box, rh * 3, 'the same order C, H, S with three sets of numbers and three different answers', WIDE ? 1000 : 640), set, o;
      function row(k) {
        var n = N[k], y = k * rh + 46, X = function (v) { return x0 + (x1 - x0) * (v - n[0]) / (n[2] - n[0]); }, t = (n[0] + n[2]) / 2;
        line(s, x0, y, x1, y);
        line(s, X(t), y - 16, X(t), y + 16, ORANGE, 4);
        dot(s, X(n[0]), y, GREY); dot(s, X(n[2]), y, GREEN); dot(s, X(n[1]), y, SAND);
        text(s, X(n[0]), y - 22, 'C = ' + n[0], { anchor: 'middle', size: 22 }); text(s, X(n[2]), y - 22, 'S = ' + n[2], { anchor: 'middle', size: 22 });
        text(s, X(t), y - 24, 'lottery ticket: ' + num(t), { anchor: 'middle', fill: ORANGE, size: 22 });
        text(s, Math.max(X(n[1]), x0), y + 38, 'H = ' + n[1], { anchor: 'middle', bold: true, size: 22 });
        text(s, WIDE ? 705 : x0 + 270, WIDE ? y + 8 : y + 76, V[k], { anchor: WIDE ? 'start' : 'middle', bold: true, size: 26, fill: [INK, ORANGE, GREEN][k] });
      }
      function show(i) {
        clear(s); for (var k = 0; k <= i; k++) row(k);
        set(i);
        if (i < 2) say(o, '', 'order: S ≻ H ≻ C');
        else say(o, 't', 'same ranking, three different answers', 'A lottery asks how far apart the outcomes are, and a ranking does not know.');
      }
      set = buttons(box, ['1, 2, 3', '1, 2, 100', '0, 9, 10'], show);
      o = out(box); show(PRINT ? 2 : 0);
    },
    ruler: function (box) {
      var P = [['Ada', 90], ['Eli', 60], ['Cleo', 20]], w = WIDE ? 1000 : 640, x0 = 50, x1 = w - 50;
      var s = frame(box, 190, 'a ruler from the worst outcome C, 0 percent, to the best outcome S, 100 percent', w), o, r, v;
      function X(p) { return x0 + (x1 - x0) * p / 100; }
      function show() {
        var p = +r.value; v.textContent = p + '%'; clear(s);
        P.forEach(function (q) { var on = q[1] === p; text(s, X(q[1]), 26, q[0] + ' ' + q[1] + '%', { anchor: 'middle', size: 22, bold: on, fill: on ? GREEN : DIM }); line(s, X(q[1]), 36, X(q[1]), 70, on ? GREEN : GREY, 3); });
        line(s, x0, 92, x1, 92, GREY, 8); line(s, x0, 92, X(p), 92, SAND, 8);
        for (var k = 0; k <= 10; k++) line(s, X(k * 10), 84, X(k * 10), 100, INK, k % 5 ? 1 : 2.5);
        dot(s, X(0), 92, GREY, 15); dot(s, X(100), 92, GREEN, 15); dot(s, X(p), 92, SAND, 17);
        text(s, X(0), 142, 'C', { anchor: 'middle', bold: true, size: 24 }); text(s, X(100), 142, 'S', { anchor: 'middle', bold: true, size: 24 }); if (p > 4 && p < 96) text(s, X(p), 142, 'H', { anchor: 'middle', bold: true, size: 24 });
        text(s, X(0), 174, '0%', { anchor: 'middle', size: 22 }); text(s, X(100), 174, '100%', { anchor: 'middle', size: 22 });
        var who = P.filter(function (q) { return q[1] === p; }).map(function (q) { return q[0] + ': '; })[0] || '';
        say(o, '', who + 'H ∼ (S ' + p + '%, C ' + (100 - p) + '%)', p >= 85 ? 'H is almost as good as S.' : p <= 25 ? 'H is much closer to C than to S.' : 'H is ' + p + '% of the way from C to S.');
      }
      var w2 = h('label', 'vi-ctl'); w2.appendChild(h('span', '', 'indifferent at p =')); r = h('input'); r.type = 'range'; r.min = 1; r.max = 99; r.step = 1; r.value = 60; v = h('b'); w2.appendChild(r); w2.appendChild(v); box.appendChild(w2);
      r.addEventListener('input', show); r.addEventListener('change', function () { r.blur(); }); r.addEventListener('pointerup', function () { r.blur(); });
      o = out(box); show();
    },
    cardinal: function (box) {
      var C = [['u', function (u) { return u; }], ['10 + 20 · u', function (u) { return 10 + 20 * u; }], ['u²', function (u) { return u * u; }]];
      var w = WIDE ? 1000 : 640, x0 = 60, x1 = w - 60, s = frame(box, 190, 'the two steps C to H and H to S on the chosen scale', w), set, o;
      function brace(a, b, c, t) { line(s, a + 4, 62, b - 4, 62, c, 4); line(s, a + 4, 62, a + 4, 78, c, 4); line(s, b - 4, 62, b - 4, 78, c, 4); text(s, (a + b) / 2, 46, t, { anchor: 'middle', bold: true, size: 26, fill: c }); }
      function show(i) {
        var f = C[i][1], lo = f(0), hi = f(1), X = function (u) { return x0 + (x1 - x0) * (f(u) - lo) / (hi - lo); }, g1 = f(0.6) - lo, g2 = hi - f(0.6), ok = i < 2;
        clear(s);
        brace(X(0), X(0.6), ok ? GREEN : ORANGE, num(g1)); brace(X(0.6), X(1), ok ? GREEN : ORANGE, num(g2));
        line(s, x0, 108, x1, 108, GREY, 8);
        [[0, 'C', GREY], [0.6, 'H', SAND], [1, 'S', GREEN]].forEach(function (p) { dot(s, X(p[0]), 108, p[2], 15); text(s, X(p[0]), 150, p[1], { anchor: 'middle', bold: true, size: 24 }); text(s, X(p[0]), 180, num(f(p[0])), { anchor: 'middle', size: 22 }); });
        set(i);
        if (ok) say(o, 'k', num(g1) + ' : ' + num(g2) + ' = 1.5', i ? 'another zero and unit, like °C and °F: the ratio of the two steps stays 1.5' : 'for Eli the step from C to H is 1.5 times the step from H to S');
        else say(o, 't', num(g1) + ' : ' + num(g2) + ' = 0.5625', 'not allowed: the ratio of the two steps has changed, and with it the ranking of some lotteries');
      }
      set = buttons(box, C.map(function (c) { return c[0]; }), show);
      o = out(box); show(0);
    },
    test: function (box) {
      var w = WIDE ? 1000 : 640, x0 = WIDE ? 190 : 130, x1 = w - 50, fs = WIDE ? 24 : 20, y0 = 108, dy = 62;
      var s = frame(box, 230, 'u(H) on the line from 0 to 1, and lotteries A and B ranked by their expected utility', w), top = el('g', {}), rows = [], o, r, v;
      s.appendChild(top);
      ['1st', '2nd'].forEach(function (t, k) { text(s, 4, y0 + k * dy + 32, t, { fill: DIM, size: fs }); });
      [['A', 'H 40%, C 60%', SAND], ['B', 'S 30%, C 70%', GREEN]].forEach(function (l) {
        var g = el('g', { 'class': 'vi-row' }), b = el('rect', { x: x0, y: y0, width: 1, height: 46, fill: l[2], 'class': 'vi-bar' }), t = el('text', { x: x0, y: y0 + 32, 'font-size': fs, 'font-weight': 600, fill: INK });
        g.appendChild(b); text(g, WIDE ? 60 : 50, y0 + 32, WIDE ? 'lottery ' + l[0] : l[0], { bold: true, size: fs }); g.appendChild(t);
        text(g, WIDE ? 640 : 425, y0 + 32, l[1], { fill: DIM, size: WIDE ? 24 : 19 });
        s.appendChild(g); rows.push([g, b, t]);
      });
      function X(u) { return x0 + (x1 - x0) * u / 100; }
      function show() {
        var u = +r.value, E = [u * 0.4, 30], first = u > 75 ? 0 : 1;
        v.textContent = num(u / 100); clear(top);
        line(top, x0, 42, x1, 42, GREY, 6);
        [[0, 'C', GREY], [u, 'H', SAND], [100, 'S', GREEN]].forEach(function (p) { dot(top, X(p[0]), 42, p[2], 12); text(top, X(p[0]), 23, p[1], { anchor: 'middle', bold: true, size: fs }); text(top, X(p[0]), 82, num(p[0] / 100), { anchor: 'middle', size: fs }); });
        rows.forEach(function (R, k) {
          R[0].style.transform = 'translate(0px,' + (k === first ? 0 : dy) + 'px)'; R[0].setAttribute('data-rank', k === first ? 1 : 2);
          R[1].setAttribute('width', X(E[k]) - x0); R[2].setAttribute('x', X(E[k]) + 10); R[2].textContent = num(E[k] / 100);
        });
        say(o, u === 75 ? '' : 'k', u < 75 ? 'B ≻ A: 0.3 > ' + num(E[0] / 100) : u > 75 ? 'A ≻ B: ' + num(E[0] / 100) + ' > 0.3' : 'A ∼ B: 0.3 = 0.3', 'The order is always S ≻ H ≻ C, but the choice depends on the size of u(H).');
      }
      var c = h('label', 'vi-ctl'); c.appendChild(h('span', '', 'u(H) =')); r = h('input'); r.type = 'range'; r.min = 5; r.max = 95; r.step = 5; r.value = 60; v = h('b'); c.appendChild(r); c.appendChild(v); box.appendChild(c);
      r.addEventListener('input', show); r.addEventListener('change', function () { r.blur(); }); r.addEventListener('pointerup', function () { r.blur(); });
      o = out(box); show();
    }
  };
  var CSS = '.vi-row{transition:transform .7s ease}.vi-bar{transition:width .3s ease}@media (prefers-reduced-motion:reduce){.vi-row,.vi-bar{transition:none}}@media print{.vi-row,.vi-bar{transition:none}}.vnm-int{max-width:1240px;margin:.3em auto;font-size:22px;line-height:1.35}' +
    '.vi-ctl{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin:.35em 0}' +
    ':where(.vi-ctl) input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:40px;flex:1 1 240px;max-width:460px;margin:0;cursor:pointer}' +
    ':where(.vi-ctl) input[type=range]:focus{outline:none}:where(.vi-ctl) input[type=range]:focus-visible{outline:2px solid #8fb27f;outline-offset:2px;border-radius:20px}' +
    ':where(.vi-ctl) input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:#e3e3df}' +
    ':where(.vi-ctl) input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-10px;border-radius:50%;background:' + GREEN + ';border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3)}' +
    ':where(.vi-ctl) input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:#e3e3df}' +
    ':where(.vi-ctl) input[type=range]::-moz-range-progress{height:8px;border-radius:4px;background:#b7d0aa}' +
    ':where(.vi-ctl) input[type=range]::-moz-range-thumb{box-sizing:border-box;width:28px;height:28px;border-radius:50%;background:' + GREEN + ';border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3)}' +
    '.vi-ctl b{min-width:2.4em;text-align:left;font-size:1.25em}' +
    '.vi-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:.35em 0}' +
    '.vi-btns button{font:inherit;padding:.2em .8em;min-height:36px;border:1px solid #bdbdb9;border-radius:6px;background:#fff;color:' + INK + ';cursor:pointer}' +
    '.vi-btns button.on{border-color:' + GREEN + ';background:#eaf3e6;font-weight:600}' +
    '.vi-out{text-align:center;min-height:2.9em;margin-top:.2em}.vi-out .big{font-size:1.2em;font-weight:600}.vi-out .k{color:' + GREEN + '}.vi-out .t{color:' + ORANGE + '}';
  function mount() {
    if (!document.querySelector('style[data-vi-css]')) { var st = document.createElement('style'); st.setAttribute('data-vi-css', ''); st.textContent = CSS; document.head.appendChild(st); }
    Array.prototype.forEach.call(document.querySelectorAll('.vnm-int[data-int]'), function (box) {
      if (box.getAttribute('data-vi-ready')) return;
      var k = KINDS[box.getAttribute('data-int')]; if (!k) return;
      box.setAttribute('data-vi-ready', '1'); box.setAttribute('data-prevent-swipe', '');
      k(box);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
