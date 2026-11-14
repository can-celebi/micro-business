// Fun module f3: the leaderboard as a curve of the whole class (Oyun's spec 3, 14.11.2026).
// On arena:board it draws one step per student (points, highest first) into the slot `lb-top`, marks the student's own
// step in orange and writes one caption line. It shows no nicknames, reads no question and computes no point value.
// It owns one element in the slot, <div data-f="f3">, placed first and replaced on a redraw (f4 and f7 share the slot).
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  const YOU = '#D9480F', X0 = 14, W = 298, BASE = 84, H = 72;
  const r2 = n => Math.round(n * 100) / 100;
  let drawn = false;                                   // the staircase draws itself once per visit of the leaderboard

  F.style('f3', '.fun-f3{margin:0 0 10px}.fun-f3 svg{display:block;width:100%;max-width:420px;height:auto}' +
    '.fun-f3 text{font-size:9px;fill:var(--ink,#1d1d1f)}.fun-f3 text.you{fill:' + YOU + '}' +
    '.fun-f3 .st{stroke:var(--ink,#1d1d1f)}.fun-f3 p{margin:2px 0 0}');

  F.on('screen', d => { if (d.name !== 'leaderboard' && d.name !== 'how') drawn = false; });

  F.on('board', d => {
    const slot = F.slot('lb-top'); if (!slot) return;
    const old = slot.querySelector('[data-f="f3"]');
    const html = picture(d);
    if (old && html) old.outerHTML = html;
    else if (old) old.remove();
    else if (html) slot.insertAdjacentHTML('afterbegin', html);
  });

  function picture(d) {
    const api = F.api(), me = api && api.user && api.user();
    if (!me || !Array.isArray(d.rows)) return '';
    const tab = d.tab || 'all';
    const rows = d.rows.filter(Boolean).map(r => ({ key: r.key, p: +(tab === 'all' ? r.total : (r.topics || {})[tab]) || 0 }))
      .filter(r => r.p > 0 && isFinite(r.p)).sort((a, b) => b.p - a.p);
    const N = rows.length; if (N < 3) return '';
    const x = i => r2(X0 + i * W / N), y = i => r2(BASE - H * rows[i].p / rows[0].p);
    let path = 'M' + X0 + ' ' + y(0);
    for (let i = 0; i < N; i++) path += 'H' + x(i + 1) + (i + 1 < N ? 'V' + y(i + 1) : '');
    const mine = rows.findIndex(r => r.key === me.key);
    let you = '';
    if (mine >= 0) {
      const mid = Math.max(X0 + 9, Math.min(X0 + W - 9, (x(mine) + x(mine + 1)) / 2));
      const near = mine > 0 && mid < x(1) + 64 && y(mine) < y(0) + 22;   // next to the "price maker" label: "you" goes under its own step
      you = '<path d="M' + x(mine) + ' ' + y(mine) + 'H' + x(mine + 1) + '" fill="none" stroke="' + YOU + '" stroke-width="4"/>' +
        '<text class="you" x="' + r2(mid) + '" y="' + r2(near ? y(mine) + 11 : Math.max(8, y(mine) - 5)) + '" text-anchor="middle">you</text>';
    }
    const anim = !drawn && !F.still(); drawn = true;
    const label = 'The points of all ' + N + ' students, from the highest to the lowest.';
    return '<div data-f="f3" class="fun-f3"><svg viewBox="0 0 320 96" role="img" aria-label="' + F.esc(label) + '">' +
      '<path d="M14 8V84H312" fill="none" stroke="#9aa0a8" stroke-width="1"/>' +
      '<path class="st' + (anim ? ' fun-draw' : '') + '" d="' + path + '" fill="none" stroke-width="1.6" pathLength="1"/>' + you +
      '<text x="' + r2(x(1) + 4) + '" y="' + r2(mine === 0 ? y(0) + 16 : y(0) + 6) + '">price maker</text></svg>' +
      '<p class="fun-dim">1 price maker · ' + (N - 1) + ' price takers</p></div>';
  }
})();
