/* vnm-conditions.js: one interactive picture per vNM condition, over lotteries (Wieland, 25.11.2026).
   Use: <div class="vnm-cond" data-cond="complete"></div>  kinds: complete | cycle | cont | indep
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
  function card(s, x, y, w, title, rows, o) {
    o = o || {}; var hgt = 34 + rows.length * 30;
    s.appendChild(el('rect', { x: x, y: y, width: w, height: hgt, rx: 8, fill: o.fill || '#fff', stroke: o.stroke || INK, 'stroke-width': o.sw || 1.5, opacity: o.op || 1 }));
    text(s, x + w / 2, y + 25, title, { anchor: 'middle', bold: true, op: o.op, size: o.size });
    rows.forEach(function (r, i) { text(s, x + 14, y + 53 + i * 30, r[0], { op: o.op, size: o.size }); text(s, x + w - 14, y + 53 + i * 30, r[1], { anchor: 'end', op: o.op, size: o.size }); });
    return hgt;
  }
  function out(box) { var o = h('div', 'vc-out'); o.setAttribute('aria-live', 'polite'); box.appendChild(o); return o; }
  function say(o, cls, t, t2) { o.textContent = ''; o.appendChild(h('div', 'big ' + cls, t)); if (t2) o.appendChild(h('div', '', t2)); }
  function buttons(box, list, pick) {
    var w = h('div', 'vc-btns'), bs = [];
    list.forEach(function (n, i) { var b = h('button', '', n); b.type = 'button'; b.addEventListener('click', function () { pick(i); b.blur(); }); w.appendChild(b); bs.push(b); });
    box.appendChild(w);
    return function (i) { bs.forEach(function (b, k) { b.className = k === i ? 'on' : ''; b.setAttribute('aria-pressed', k === i); }); };
  }
  function arrow(s, x1, y1, x2, y2, col, w) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 14;
    s.appendChild(el('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: col, 'stroke-width': w || 4 }));
    s.appendChild(el('path', { d: 'M' + x2 + ',' + y2 + ' L' + (x2 - L * Math.cos(a - 0.45)) + ',' + (y2 - L * Math.sin(a - 0.45)) + ' L' + (x2 - L * Math.cos(a + 0.45)) + ',' + (y2 - L * Math.sin(a + 0.45)) + ' z', fill: col }));
  }
  var KINDS = {
    complete: function (box) {
      var s = frame(box, 120, 'lottery 1: H for sure; lottery 2: S 50 percent, C 50 percent'), set, o;
      card(s, 60, 12, 220, 'lottery 1', [['H', '100%'], ['', '']]); card(s, 360, 12, 220, 'lottery 2', [['S', '50%'], ['C', '50%']]);
      set = buttons(box, ['1 ≻ 2', '2 ≻ 1', '1 ∼ 2', 'I can’t say'], function (i) {
        set(i);
        if (i < 3) say(o, 'k', 'complete', ['I strictly prefer lottery 1.', 'I strictly prefer lottery 2.', 'I am indifferent.'][i]);
        else say(o, 't', 'violation', '“I can’t say which, and I am not indifferent either.”');
      });
      o = out(box); say(o, '', 'one of the first three is true for every two lotteries');
    },
    cycle: function (box) {
      var s = WIDE ? frame(box, 236, 'three lotteries and the arrows between them', 1000) : frame(box, 292, 'three lotteries and the arrows between them'), set, o;
      var T = WIDE ? [[390, 4, 'lottery 1', '€28', '40%'], [720, 136, 'lottery 2', '€24', '45%'], [60, 136, 'lottery 3', '€20', '50%']]
        : [[235, 6, 'lottery 1', '€28', '40%'], [450, 190, 'lottery 2', '€24', '45%'], [20, 190, 'lottery 3', '€20', '50%']];
      var A = WIDE ? [[618, 66, 760, 130], [712, 184, 290, 184], [240, 130, 382, 66]] : [[385, 108, 480, 184], [444, 238, 200, 238], [160, 184, 255, 108]];
      var R = ['1 ≻ 2: “almost the same chance, so the larger prize”', '2 ≻ 3: “almost the same chance, so the larger prize”', '3 ≻ 1: “50% against 40% is a real difference, so the safer one”'];
      function show(n) {
        clear(s);
        for (var i = 0; i <= n; i++) arrow(s, A[i][0], A[i][1], A[i][2], A[i][3], n === 2 ? ORANGE : GREEN);
        T.forEach(function (c) { card(s, c[0], c[1], WIDE ? 220 : 170, c[2], [[c[3], c[4]], ['€0', (100 - parseInt(c[4], 10)) + '%']], { size: WIDE ? 23 : 20 }); });
        set(n);
        if (n < 0) say(o, '', 'compare them two at a time');
        else if (n < 2) say(o, 'k', R[n]);
        else say(o, 't', 'violation: 1 ≻ 2 ≻ 3 ≻ 1', R[2]);
      }
      set = buttons(box, ['1 and 2', '2 and 3', '3 and 1'], show);
      o = out(box); show(-1);
    },
    cont: function (box) {
      var s = frame(box, 190, 'the lottery ticket with chance p of S against H for sure; the choice on the line from 0 to 100 percent'), set, o, r, v, mode = 0;
      function X(p) { return 50 + 5.4 * p; }
      function show() {
        var p = +r.value, at = mode ? 100 : 60;
        v.textContent = p + '%'; clear(s);
        s.appendChild(el('rect', { x: X(0), y: 12, width: 540 * p / 100, height: 40, fill: GREEN })); s.appendChild(el('rect', { x: X(p), y: 12, width: 540 * (100 - p) / 100, height: 40, fill: GREY }));
        s.appendChild(el('rect', { x: X(0), y: 12, width: 540, height: 40, fill: 'none', stroke: INK }));
        if (p >= 16) text(s, X(p / 2), 39, 'S ' + p + '%', { anchor: 'middle', fill: '#fff' });
        if (p <= 84) text(s, X(50 + p / 2), 39, 'C ' + (100 - p) + '%', { anchor: 'middle' });
        text(s, X(0), 92, 'what you choose at each p:', { fill: DIM });
        s.appendChild(el('rect', { x: X(0), y: 104, width: 540 * at / 100 - (mode ? 4 : 0), height: 30, fill: SAND }));
        if (mode) s.appendChild(el('rect', { x: X(100) - 4, y: 104, width: 4, height: 30, fill: GREEN }));
        if (at < 100) s.appendChild(el('rect', { x: X(at), y: 104, width: 540 * (100 - at) / 100, height: 30, fill: GREEN }));
        text(s, X(at / 2), 126, 'H', { anchor: 'middle', bold: true }); if (at < 100) text(s, X(80), 126, 'the lottery ticket', { anchor: 'middle', fill: '#fff', bold: true });
        s.appendChild(el('line', { x1: X(p), y1: 98, x2: X(p), y2: 140, stroke: INK, 'stroke-width': 4 }));
        [0, 100].concat(at < 100 ? [60] : []).forEach(function (q) { text(s, X(q), 168, q + '%', { anchor: 'middle' }); });
        set(mode);
        if (p < at) say(o, 'h', 'H ≻ the lottery ticket', mode ? 'However small the chance of C: “I keep H.”' : '');
        else if (p > at) say(o, 'k', 'the lottery ticket ≻ H');
        else if (mode) say(o, 't', 'violation: no p is the point of indifference', 'At 100% it is S for sure, and S ≻ H. Below 100%: always H.');
        else say(o, 'k', 'indifferent: H ∼ (S 60%, C 40%)');
      }
      set = buttons(box, ['continuity', 'violation'], function (i) { mode = i; show(); });
      var w = h('label', 'vc-ctl'); w.appendChild(h('span', '', 'chance p of S')); r = h('input'); r.type = 'range'; r.min = 0; r.max = 100; r.step = 1; r.value = 30; v = h('b'); w.appendChild(r); w.appendChild(v); box.appendChild(w);
      r.addEventListener('input', show); r.addEventListener('change', function () { r.blur(); }); r.addEventListener('pointerup', function () { r.blur(); });
      o = out(box); show();
    },
    indep: function (box) {
      var s = WIDE ? frame(box, 218, 'two trees with the same coin; tails gives a coffee in both', 1000) : frame(box, 270, 'two trees with the same coin; tails gives a coffee in both'), set, o;
      var G = WIDE ? { cx: 38, cy: 112, r: 34, bx: 200, bw: 250, hy: 34, ty: 146, fs: 24, name: 325 } : { cx: 22, cy: 138, r: 21, bx: 124, bw: 150, hy: 44, ty: 186, fs: 18, name: 135 };
      function tree(x, name, title, rows, cover) {
        var op = cover ? 0.15 : 1, ex = x + G.bx - 8, sx = x + G.cx + G.r * 0.8;
        text(s, x + G.name, 26, name, { anchor: 'middle', bold: true, size: G.fs });
        arrow(s, sx, G.cy - G.r * 0.6, ex, G.hy + 46, INK, 2.5);
        s.appendChild(el('line', { x1: sx, y1: G.cy + G.r * 0.6, x2: ex, y2: G.ty + 30, stroke: INK, 'stroke-width': 2.5, opacity: op }));
        s.appendChild(el('circle', { cx: x + G.cx, cy: G.cy, r: G.r, fill: '#fff', stroke: INK, 'stroke-width': 1.5 })); text(s, x + G.cx, G.cy + 7, 'coin', { anchor: 'middle', size: WIDE ? 24 : 18 });
        text(s, x + (WIDE ? 72 : 30), WIDE ? 70 : 92, 'heads', { size: G.fs }); text(s, x + (WIDE ? 72 : 28), WIDE ? 180 : 206, 'tails', { size: G.fs, op: op });
        card(s, x + G.bx, G.hy, G.bw, title, rows, { size: WIDE ? 24 : 20 });
        card(s, x + G.bx, G.ty, G.bw, 'C', [['coffee', '']], { op: op, fill: '#f4f4f2', size: WIDE ? 24 : 20 });
      }
      function show(i) {
        clear(s);
        var c = i >= 1;
        tree(WIDE ? 20 : 10, 'choice A', 'H', [['H', '100%'], ['', '']], c); tree(WIDE ? 530 : 340, 'choice B', 'lottery ticket', [['S', '50%'], ['C', '50%']], c);
        set(i);
        if (i === 0) say(o, '', 'the tails branch is the same in both', 'Without the coin you said: H ≻ the lottery ticket.');
        else if (i === 1) say(o, 'k', 'A ≻ B', 'Cover the same branch: what is left is H or the lottery ticket, your first choice.');
        else say(o, 't', 'violation: B ≻ A', 'Without the coin: H. With the coin: “I probably get a coffee anyway, so now the lottery ticket.”');
      }
      set = buttons(box, ['both trees', 'cover the same branch', 'violation'], show);
      o = out(box); show(0);
    }
  };
  var CSS = '.vnm-cond{max-width:1240px;margin:.3em auto;font-size:22px;line-height:1.35}' +
    '.vc-ctl{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin:.35em 0}' +
    ':where(.vc-ctl) input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;height:40px;flex:1 1 240px;max-width:460px;margin:0;cursor:pointer}' +
    ':where(.vc-ctl) input[type=range]:focus{outline:none}:where(.vc-ctl) input[type=range]:focus-visible{outline:2px solid #8fb27f;outline-offset:2px;border-radius:20px}' +
    ':where(.vc-ctl) input[type=range]::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:#e3e3df}' +
    ':where(.vc-ctl) input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:28px;height:28px;margin-top:-10px;border-radius:50%;background:' + GREEN + ';border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3)}' +
    ':where(.vc-ctl) input[type=range]::-moz-range-track{height:8px;border-radius:4px;background:#e3e3df}' +
    ':where(.vc-ctl) input[type=range]::-moz-range-progress{height:8px;border-radius:4px;background:#b7d0aa}' +
    ':where(.vc-ctl) input[type=range]::-moz-range-thumb{box-sizing:border-box;width:28px;height:28px;border-radius:50%;background:' + GREEN + ';border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.3)}' +
    '.vc-ctl b{min-width:2.4em;text-align:left;font-size:1.25em}' +
    '.vc-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:.35em 0}' +
    '.vc-btns button{font:inherit;padding:.2em .8em;min-height:36px;border:1px solid #bdbdb9;border-radius:6px;background:#fff;color:' + INK + ';cursor:pointer}' +
    '.vc-btns button.on{border-color:' + GREEN + ';background:#eaf3e6;font-weight:600}' +
    '.vc-out{text-align:center;min-height:2.9em;margin-top:.2em}.vc-out .big{font-size:1.2em;font-weight:600}.vc-out .k{color:' + GREEN + '}.vc-out .t{color:' + ORANGE + '}';
  function mount() {
    if (!document.querySelector('style[data-vc-css]')) { var st = document.createElement('style'); st.setAttribute('data-vc-css', ''); st.textContent = CSS; document.head.appendChild(st); }
    Array.prototype.forEach.call(document.querySelectorAll('.vnm-cond[data-cond]'), function (box) {
      if (box.getAttribute('data-vc-ready')) return;
      var k = KINDS[box.getAttribute('data-cond')]; if (!k) return;
      box.setAttribute('data-vc-ready', '1'); box.setAttribute('data-prevent-swipe', '');
      k(box);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
