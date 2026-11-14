// f9 · the leaderboard strip (Oyun, 14.11.2026; Can's Additions 15 and 16).
// Slot `strip`, directly under the top bar on every screen: the top three and "you: rank N" in one line.
// A tap opens a small panel: tabs (Total, the six topics), the top 10 and the student's own row.
// Reads the bridge only inside handlers; total and topic points come from board() and score(), nothing is computed here.
// Offline, rejected board, missing slot or bridge: nothing is shown and nothing is thrown.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  let rows = null;                                   // the last rows board() gave
  let cur = { slot: null, q: false }, open = false, tab = 'all', turn = 0;

  F.style('f9', '.fun-strip{display:flex;align-items:center;gap:10px;width:100%;height:36px;padding:0;border:0;border-bottom:1px solid var(--line);' +
    'border-radius:0;background:none;color:var(--ink);font-size:.85rem;text-align:left;white-space:nowrap;overflow:hidden;margin-bottom:8px}' +
    '.fun-strip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}' +
    '.fun-strip i{font-style:normal;font-weight:400;color:var(--dim);flex:none}' +
    '.fun-strip-top,.fun-strip-e{display:flex;gap:.35em;min-width:0}.fun-strip-top{flex:1;overflow:hidden}' +
    '.fun-strip-n{min-width:0;max-width:16ch;overflow:hidden;text-overflow:ellipsis}.fun-strip-n.first{font-weight:600}' +
    '.fun-strip-you{flex:none;margin-left:auto;font-weight:600}' +
    '.fun-strip-none{margin:0;padding:7px 0;min-height:36px;border-bottom:1px solid var(--line);margin-bottom:8px}' +
    '.fun-strip-panel{max-height:50vh;overflow-y:auto;background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 8px;font-size:.85rem}' +
    '.fun-strip-panel .tabs{overflow-x:auto}.fun-strip-panel .tabs button{flex:none;padding:4px 10px;white-space:nowrap}' +
    '.fun-strip-panel table.lb{font-size:inherit}.fun-strip-panel table.lb td{padding:2px 6px;overflow-wrap:anywhere}.fun-strip-panel table.lb td.p{white-space:nowrap}' +
    '.fun-strip-panel p{margin:6px 0}.fun-strip-full{display:block;margin-top:8px;color:var(--accent);text-decoration:underline}' +
    '@media (max-width:559px){.fun-strip-n{max-width:9ch}}@media (max-width:479px){.fun-strip-p{display:none}}');

  // everyone with points in a tab ('all' or a topic id), best first; the student's own row counts max(row, score())
  function ranked(api, t) {
    const me = api.user && api.user();
    const list = rows.map(r => ({ key: r.key, nick: r.nick, p: +(t === 'all' ? r.total : (r.topics || {})[t]) || 0 }));
    if (me) {
      let mine = list.find(r => r.key === me.key);
      if (!mine) list.push(mine = { key: me.key, nick: me.nick, p: 0 });
      mine.mine = true; mine.p = Math.max(mine.p, +(t === 'all' ? api.score() : api.score(t)) || 0);
    }
    return list.filter(r => r.p > 0).sort((a, b) => b.p - a.p);
  }

  function panel(api) {
    const list = ranked(api, tab), at = list.findIndex(r => r.mine);
    const tr = (r, i) => '<tr' + (r.mine ? ' class="mine"' : '') + '><td>' + (i + 1) + '</td><td>' + F.esc(r.nick) + '</td><td class="p">' + F.esc(r.p) + '</td></tr>';
    const tabs = [{ id: 'all', name: 'Total' }].concat(api.topics() || []).map(t =>
      '<button type="button" data-tab="' + F.esc(t.id) + '"' + (t.id === tab ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + F.esc(t.name) + '</button>').join('');
    return '<div class="tabs">' + tabs + '</div>' +
      (list.length ? '<table class="lb">' + list.slice(0, 10).map(tr).join('') + (at >= 10 ? '<tr><td colspan="3">…</td></tr>' + tr(list[at], at) : '') + '</table>'
        : '<p class="fun-dim">No points in this topic yet.</p>') +
      (typeof api.go === 'function' ? '<button type="button" class="link fun-strip-full">Full leaderboard</button>' : '');
  }

  // draws the strip (and the panel when it is open) into the current slot
  function draw() {
    const api = F.api(), s = cur.slot;
    if (!api || !s || !s.isConnected || !rows) return;
    const all = ranked(api, 'all'), me = api.user && api.user(), at = all.findIndex(r => r.mine);
    if (!all.length) { s.innerHTML = '<p class="fun-dim fun-strip-none">No one is on the board yet. The first right answer takes rank 1.</p>'; return; }
    const top = cur.q ? '' : '<span class="fun-strip-top">' + all.slice(0, 3).map((r, i) => '<span class="fun-strip-e"><i>' + (i + 1) + '</i> <span class="fun-strip-n' + (i ? '' : ' first') + '">' +
      F.esc(r.nick) + '</span> <i class="fun-strip-p">' + F.esc(r.p) + '</i></span>').join('<i> · </i>') + '</span> ';
    const focused = s.contains(document.activeElement);
    s.innerHTML = '<button type="button" class="fun-strip" aria-expanded="' + open + '">' + top +
      '<span class="fun-strip-you">' + (me ? 'you: ' + (at < 0 ? 'not ranked yet' : 'rank ' + (at + 1)) + ' ' : '') + '<i aria-hidden="true">' + (open ? '▴' : '▾') + '</i></span></button>' +
      (open ? '<div class="fun-strip-panel">' + panel(api) + '</div>' : '');
    if (focused) { const b = s.querySelector('.tabs .on') || s.querySelector('.fun-strip'); if (b) b.focus(); }
    s.onclick = click;
  }

  function click(e) {
    try {
      const b = e.target.closest('button'), api = F.api(); if (!b || !api) return;
      if (b.classList.contains('fun-strip')) { open = !open; tab = 'all'; draw(); cur.slot.querySelector('.fun-strip').focus(); }
      else if (b.dataset.tab) { tab = b.dataset.tab; draw(); const on = cur.slot.querySelector('.tabs .on'); if (on) on.focus(); }
      else if (b.classList.contains('fun-strip-full') && typeof api.go === 'function') api.go('leaderboard');
    } catch (err) { if (window.console) console.warn('fun module f9', err); }
  }

  F.on('screen', d => {
    const my = ++turn, api = F.api(), s = F.slot('strip');
    open = false; tab = 'all'; cur = { slot: s, q: d.name === 'question' };
    if (s) { s.innerHTML = ''; s.onclick = null; }
    if (!api || !s || d.name === 'login') return;
    draw();                                          // the rows from before, at once: the strip does not jump in later
    if (cur.q && rows) return;                       // on a question: no new call when there are rows
    Promise.resolve().then(() => api.board()).then(got => {
      if (!Array.isArray(got)) throw new Error('no rows');
      rows = got; draw();                            // draw() writes only into the current screen's slot, and only while it is in the document
    }).catch(() => { if (my !== turn) return; rows = null; if (s.isConnected) s.innerHTML = ''; });   // a late rejection never touches a newer screen
  });
})();
