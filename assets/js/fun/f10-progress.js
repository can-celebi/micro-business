// Fun module f10: "My progress" (Oyun, 14.11.2026; Can's Addition 15). Spec: practice/fun-test/SPECS.md, section 10.
// Entry points: a row in slot `menu-top` and a text link in slot `home-top` (one own element in each, marked data-f="f10").
// The view is a box over the page (.modal + .card): three figures, one row per topic, one next step.
// It only reads the bridge (topics, items, done) through MicroFun.mastery and MicroFun.history: no points, no ranks,
// no clock, nothing is stored or sent. Nothing moves, so reduced motion needs no special case.
(function () {
  'use strict';
  const F = window.MicroFun;
  if (!F) return;
  const DASH = '–';

  F.style('f10',
    '.f10-link{border:0;background:none;padding:0;color:var(--accent);text-decoration:underline;font-size:.9rem}' +
    'p[data-f="f10"]{margin:0 0 .8rem}' +
    '.f10-card{position:relative}.f10-card h2{margin:0 2.2rem .7rem 0}' +
    '.f10-x{position:absolute;top:6px;right:6px;border:0;background:none;color:var(--dim);font-size:1.3rem;line-height:1;padding:6px 10px}' +
    '.f10-figs{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:0 0 1rem}' +
    '.f10-figs b{display:block;font-size:1.4rem;font-weight:600;line-height:1.3;font-variant-numeric:tabular-nums}' +
    '.f10-row{display:flex;align-items:center;gap:12px;padding:8px 0}.f10-row+.f10-row{border-top:1px solid var(--line)}' +
    '.f10-mid{flex:1;min-width:0}.f10-mid b{display:block;font-weight:600}' +
    '.f10-imp{flex:none;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.f10-up{color:var(--ok)}' +
    '.f10-note{margin:.8rem 0 0}' +
    '@media (max-width:419px){.f10-figs{grid-template-columns:1fr;gap:6px}}');

  // ---------- the numbers ----------
  const longest = list => { let best = 0, cur = 0; list.forEach(h => { cur = h.first ? cur + 1 : 0; if (cur > best) best = cur; }); return best; };
  const share = list => Math.round(100 * list.filter(h => h.first).length / list.length);   // whole per cent; list is never empty here
  const stats = api => {
    const hist = F.history(api);
    const rows = (api.topics() || []).map(t => {
      const own = hist.filter(h => h.topic === t.id), k = F.mastery(api, t.id), half = Math.floor(own.length / 2);
      const halves = own.length >= 6 ? [share(own.slice(0, half)), share(own.slice(half))] : null;   // the middle one goes to the second half
      return { id: t.id, name: t.name, answered: own.length, m: k.m, n: k.n, step: k.step, run: longest(own), halves };
    });
    return { rows, answered: hist.length, share: hist.length ? share(hist) + '%' : DASH, run: longest(hist),
      m: rows.reduce((a, r) => a + r.m, 0), n: rows.reduce((a, r) => a + r.n, 0) };
  };
  const nextStep = s => {
    if (!s.answered) return 'Next step: pick a topic and answer your first question.';
    if (s.n && s.m === s.n) return 'All question types mastered.';
    let top = null;                                                     // the started topic with the most unmastered types; ties: the arena's order
    s.rows.forEach(r => { if (r.answered && r.n - r.m > 0 && (!top || r.n - r.m > top.n - top.m)) top = r; });
    if (!top) return '';                                                // every started topic is mastered, others are not started: the spec has no sentence
    const left = top.n - top.m;
    return 'Next step: ' + F.esc(top.name) + ' has ' + left + (left === 1 ? ' question type' : ' question types') + ' you have not mastered yet.';
  };

  // ---------- the box ----------
  const html = s => {
    const fig = (v, label) => '<div><b>' + v + '</b><span class="fun-dim">' + label + '</span></div>';
    const row = r => '<div class="f10-row" data-topic="' + F.esc(r.id) + '">' + F.diagram(r.id, r.answered ? r.step : 0, { size: 36 }) +
      '<div class="f10-mid"><b>' + F.esc(r.name) + '</b><span class="fun-dim">' +
      (r.answered ? r.m + ' of ' + r.n + ' types mastered · longest run ' + r.run : 'not started') + '</span></div>' +
      '<div class="f10-imp fun-dim">' + (r.halves ? r.halves[0] + '% → ' + r.halves[1] + '%' + (r.halves[1] > r.halves[0] ? ' <span class="f10-up">▲</span>' : '') : DASH) + '</div></div>';
    const next = nextStep(s);
    return '<div class="card f10-card" role="dialog" aria-modal="true" aria-labelledby="f10-title">' +
      '<button type="button" class="f10-x" aria-label="Close">×</button><h2 id="f10-title">My progress</h2>' +
      '<div class="f10-figs">' + fig(s.share, 'first tries right') + fig(s.run, 'longest run of first tries right') +
      fig(s.m + ' of ' + s.n, 'question types mastered') + '</div>' +
      '<div class="f10-rows">' + s.rows.map(row).join('') + '</div>' +
      '<p class="fun-dim f10-note">The two percentages are your first tries right in the first and in the second half of your answers.</p>' +
      (next ? '<p class="fun-dim f10-note f10-next">' + next + '</p>' : '') + '</div>';
  };
  const open = opener => {
    const api = F.api();
    if (!api || !api.user() || document.getElementById('f10-box')) return;      // never two boxes at once
    const box = document.createElement('div');
    box.className = 'modal'; box.id = 'f10-box';
    box.innerHTML = html(stats(api));
    const close = () => {
      document.removeEventListener('keydown', onKey);
      box.remove();
      if (opener && opener.isConnected && !opener.closest('.menu')) opener.focus({ preventScroll: true });   // not the menu row: focus would reopen the menu
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('.f10-x')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
    box.querySelector('.f10-x').focus({ preventScroll: true });
  };

  // ---------- the two entry points: one own element per slot, replaced on every redraw ----------
  const place = (name, markup) => {
    F.slots(name).forEach(slot => {
      slot.querySelectorAll('[data-f="f10"]').forEach(el => el.remove());
      if (markup) slot.insertAdjacentHTML('beforeend', markup);
    });
  };
  F.on('screen', () => {
    const api = F.api(), user = !!(api && api.user());
    place('menu-top', user && '<button type="button" data-f="f10" class="f10-open">My progress</button>');
    place('home-top', user && '<p data-f="f10"><button type="button" class="f10-link f10-open">My progress</button></p>');
  });
  document.addEventListener('click', e => {
    try { const b = e.target && e.target.closest && e.target.closest('.f10-open'); if (b) open(b); }
    catch (err) { if (window.console) console.warn('fun module f10', err); }
  });
})();
