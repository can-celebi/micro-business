// Fun module f4: the price of the next rank (Oyun, specs section 4).
// One grey line: on the home screen "The next rank costs 41 points." (the strip above already says the rank), on the leaderboard's
// Total tab "Rank 12 · the next rank costs 41 points."; first place reads "Rank 1 · price maker.".
// It only compares totals from the board with the student's own score(); it computes no point value and adds none.
// It owns one element, <p data-f="f4">, at the end of the slots home-top and lb-top, which other modules share.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  F.style('f4', 'p[data-f="f4"]{margin:0 0 .6rem}');

  // the line for this student, or '' when there is nothing to say
  function line(api, rows, withRank) {
    const me = api.user && api.user(); if (!me || !Array.isArray(rows)) return '';
    const mine = rows.find(r => r && r.key === me.key);
    const own = Math.max(+api.score() || 0, mine ? +mine.total || 0 : 0);
    if (!own) return withRank ? 'Not ranked yet · your first right answer puts you on the board.' : 'Your first right answer puts you on the board.';
    // everyone else with at least as many points stands above (a tie goes to whoever was there first)
    const above = rows.filter(r => r && r.key !== me.key).map(r => +r.total).filter(t => isFinite(t) && t >= own);
    if (!above.length) return 'Rank 1 · price maker.';
    const cost = Math.min.apply(null, above) - own + 1;
    return (withRank ? 'Rank ' + (above.length + 1) + ' · the' : 'The') + ' next rank costs ' + cost + (cost === 1 ? ' point.' : ' points.');
  }
  // put the line into the slot as this module's own element, or take it out
  function place(slot, text) {
    if (!slot || !slot.isConnected) return;
    const old = slot.querySelector('[data-f="f4"]'); if (old) old.remove();
    if (text) slot.insertAdjacentHTML('beforeend', '<p data-f="f4" class="fun-dim">' + F.esc(text) + '</p>');
  }

  F.on('screen', d => {
    if (d.name !== 'home' || d.tutorial) return;
    const slot = F.slot('home-top'), api = F.api();
    if (!slot || !api || !api.board || !api.user || !api.user()) return place(slot, '');
    let p; try { p = api.board(); } catch (e) { return place(slot, ''); }
    Promise.resolve(p).then(rows => place(slot, line(api, rows, false)), () => place(slot, ''));   // a late answer finds its slot gone and does nothing
  });

  F.on('board', d => {
    const slot = F.slot('lb-top'), api = F.api();
    place(slot, api && (d.tab || 'all') === 'all' ? line(api, d.rows, true) : '');
  });
})();
