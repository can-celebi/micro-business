// f6-curve.js: "How points work" as one picture (Oyun, 14.11.2026; spec: practice/fun-test/SPECS.md, section 6).
// Slot how-top (screen "how"): the first eight values of one question type as points, the student's next one hollow,
// and below it the three wrong tries. Slot qmeta (a question): one note when the type is at its lowest value.
// Every number drawn comes from the bridge (ladder, afterWrong, floor); none is typed here. No animation.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  F.style('f6', '.f6{display:block;width:100%;max-width:420px;height:auto;margin:.4rem 0 .2rem}' +
    '.f6 text{font-size:9px;fill:var(--ink)}.f6 .f6w{fill:var(--no)}.f6c{margin:.25rem 0}');
  const L1 = 'Each further right answer of one question type gives fewer points: diminishing marginal points.',
    CORNER = ' You are at the lowest value for this type: a corner solution. Try another type.',
    L2 = 'Each wrong try halves the points to the closest prime number; after the third wrong try the question gives no points.',
    NOTE = 'corner solution: try another type';

  // per question type: its levels and the student's right answers (an open question does not count itself, as in pointsNow)
  const tally = (A, except) => {
    const done = A.done() || {}, T = {};
    A.topics().forEach(t => A.items(t.id).forEach(it => {
      const y = T[it.type] = T[it.type] || { r: 0, levels: [] };
      y.levels.push(it.level);
      if (it.id !== except && done[it.id] && done[it.id].p > 0) y.r++;
    }));
    return T;
  };
  // which type and level the picture shows: the open question's, else the type with the most right answers
  const pick = (A, item) => {
    const T = tally(A, item && item.id);
    if (item) return { level: item.level, r: (T[item.type] || { r: 0 }).r };
    const best = Object.values(T).sort((a, b) => b.r - a.r)[0];
    if (!best || !best.r) return { level: 'hard', r: 0 };
    return { level: best.levels.reduce((a, b) => A.ladder(b, 1) > A.ladder(a, 1) ? b : a), r: best.r };
  };
  const corner = (A, p) => A.ladder(p.level, p.r + 1) === A.floor(p.level);

  const picture = (A, p) => {
    const top = A.ladder(p.level, 1); if (!(top > 0)) return '';
    const X = k => 44 + (k - 1) * 36, Y = v => 104 - 88 * v / top, n = p.r + 1, INK = 'var(--ink)', NO = 'var(--no)';
    const txt = (x, y, s, anchor, cls) => '<text x="' + x + '" y="' + y.toFixed(1) + '" text-anchor="' + (anchor || 'middle') + '"' + (cls ? ' class="' + cls + '"' : '') + '>' + F.esc(s) + '</text>';
    let dots = '', tries = '', dropLast = false;
    const o = Math.max(0, n - 8);   // after many right answers the eight points move along, so the next one is always in the picture
    for (let j = 1; j <= 8; j++) {
      const k = j + o, v = A.ladder(p.level, k), x = X(j), y = Y(v);
      if (k !== n) { dots += '<circle cx="' + x + '" cy="' + y.toFixed(1) + '" r="3" fill="' + INK + '"' + (k > n ? ' opacity=".22"' : '') + '/>'; continue; }
      // the next one: hollow, with the three wrong tries straight below it
      const w = [1, 2, 3].map(i => A.afterWrong(v, i)), base = []; let b = 110;
      for (let i = 2; i >= 0; i--) base[i] = b = Math.min(Y(w[i]) + 3, b - 9);        // the red numbers keep clear of each other and of the axis
      dropLast = j === 7 && base.some(q => Math.abs(q - (Y(A.ladder(p.level, 8 + o)) - 7)) < 9);
      tries = '<path d="M' + x + ' ' + (y + 3).toFixed(1) + 'V104" stroke="' + NO + '" stroke-width="1" stroke-dasharray="2 2"/>' +
        w.map((q, i) => '<rect x="' + (x - 2.5) + '" y="' + (Y(q) - 2.5).toFixed(1) + '" width="5" height="5" fill="none" stroke="' + NO + '"/>' + txt(x + 6, base[i], q, 'start', 'f6w')).join('') +
        '<circle cx="' + x + '" cy="' + y.toFixed(1) + '" r="3" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/>' +
        (j === 1 ? txt(x - 8, y - 7, 'next: ' + v, 'start') : j === 8 ? txt(x + 18, y - 7, 'next: ' + v, 'end') : txt(x, y - 7, 'next: ' + v));
    }
    const num = j => { const v = A.ladder(p.level, j + o); return txt(X(j), Y(v) - 7, v); };
    return '<svg class="f6" viewBox="0 0 320 132" aria-hidden="true"><path d="M26 8V104H312" fill="none" stroke="#9aa0a8" stroke-width="1"/>' +
      dots + (n !== 1 + o ? num(1) : '') + (n !== 8 + o && !dropLast ? num(8) : '') + tries + '</svg>';
  };

  F.on('screen', d => {
    const A = F.api(), ok = !!(A && A.user()), item = d.item || null;
    let how = '', note = '';
    if (ok && item && corner(A, pick(A, item))) note = '<span class="fun-dim">' + NOTE + '</span>';
    if (ok && d.name === 'how') {
      const p = pick(A, item), svg = picture(A, p);
      if (svg) how = svg + '<p class="fun-dim f6c">' + L1 + (corner(A, p) ? CORNER : '') + '</p><p class="fun-dim f6c">' + L2 + '</p>';
    }
    if (d.name !== 'how') F.slots('qmeta').forEach(s => { s.innerHTML = note; });   // "How points work" opens over the question: its note stays
    if (d.name === 'how') F.slots('how-top').forEach(s => { s.innerHTML = how; });
  });
})();
