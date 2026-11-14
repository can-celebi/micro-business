// Fun module f5: prime totals wear a prime mark (Oyun, specs v1, section 5).
// - arena:total  the header total (#tot) runs through up to 5 prime numbers between from and to (70 ms each), then shows the total
// - arena:screen the mark ′ beside a prime total (slot tot-mark) and the factor row in the account menu (slot menu-top)
// - arena:board  ′ after every prime number of points in the leaderboard table
// Only listens and fills slots; the total is always the bridge's score(), no point value is computed here.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  F.style('f5', '.fun-prime{color:var(--ink)}.f5-row{padding:8px 14px;cursor:default}td.p .fun-prime{position:absolute}');   // in a table the mark hangs beside the number, the column stays flush
  const MARK = '′', STEP = 70, FRAMES = 5;
  const me = () => { const a = F.api(); return a && a.user && a.user() ? a : null; };   // the bridge, only with a signed-in student
  const tot = () => document.getElementById('tot');
  const fill = (name, html) => { const s = F.slot(name); if (s) s.innerHTML = html; };
  // menu-top is shared with other modules: f5 owns one element there, first in the slot, and replaces only that
  const own = (name, html) => { const s = F.slot(name); if (!s) return; const old = s.querySelector('[data-f="f5"]'); if (old) old.remove(); if (html) s.insertAdjacentHTML('afterbegin', html); };
  let run = null;   // the running count-up: { el, to, shown, timer }

  // the mark beside the total and the row in the menu, from the real total
  function marks() {
    const a = me(), n = a && tot() ? a.score() : 0, prime = F.isPrime(n);
    fill('tot-mark', prime ? '<span class="fun-prime" title="This total is a prime number.">' + MARK + '</span>' : '');
    own('menu-top', n < 2 ? '' : '<div class="fun-dim f5-row" data-f="f5">' + F.num(n) +
      (prime ? MARK + ' is a prime number.' : ' = ' + F.factors(n).map(F.num).join(' × ')) + '</div>');
  }

  // stop the count-up: if a frame is still standing in the same #tot, it gives way to the exact total
  function end() {
    if (run) {
      clearTimeout(run.timer);
      const a = me(), t = tot();
      if (run.shown && t && t === run.el) t.textContent = a ? a.score() : run.to;
      run = null;
    }
    marks();
  }

  function step() {
    try {
      if (!run) return;
      if (run.shown >= run.frames.length || tot() !== run.el) return end();   // done, or the arena redrew the header
      run.el.textContent = run.frames[run.shown++];
      run.timer = setTimeout(step, STEP);
    } catch (e) { run = null; }
  }

  F.on('total', d => {
    end();
    const t = tot(); if (!me() || !t) return;
    const primes = [];
    if (d.to > d.from && !F.still()) for (let n = Math.max(2, Math.floor(d.from) + 1); n < d.to; n++) if (F.isPrime(n)) primes.push(n);
    const L = primes.length;   // at most FRAMES of them, evenly spread
    const frames = L <= FRAMES ? primes : Array.from({ length: FRAMES }, (_, i) => primes[Math.round(i * (L - 1) / (FRAMES - 1))]);
    run = { el: t, to: d.to, shown: 0, timer: 0, frames };
    step();
  });

  F.on('screen', end);
  F.on('menu', marks);   // the account menu is built when it opens

  F.on('board', () => {
    if (!me()) return;
    document.querySelectorAll('#lb table.lb td.p, [data-fun="strip"] table.lb td.p').forEach(td => {   // the leaderboards only, not the points table in "How points work"
      if (td.querySelector('.fun-prime')) return;
      const txt = td.textContent.replace(/[\s.,]/g, '');
      if (/^\d+$/.test(txt) && F.isPrime(Number(txt))) td.insertAdjacentHTML('beforeend', '<span class="fun-prime">' + MARK + '</span>');
    });
  });
})();
