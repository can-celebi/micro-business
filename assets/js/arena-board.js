// A small read-only bridge for pages outside the arena (Can 14.11: the leaderboard visible on /midterm/ too). It offers the part of
// window.MicroPractice.fun that Oyun's strip (assets/js/fun/f9-strip.js) needs: user(), topics(), score(), board(), go().
// Load after assets/js/config.js and practice/meta.js; then core.js and f9-strip.js; the page needs <span class="fun" data-fun="strip">.
// It writes nothing. Same session rule as the arena: ?test or a local host = the test session. Written by Ali (Main coder).
(function () {
  'use strict';
  // ArenaBoard.mount(el, {top, tab, full}): the open leaderboard (top N, tabs Total + topics, "You (nick): rank n of N · points").
  // It reads window.MicroPractice.fun at call time, so it works in the arena (its own bridge) and on other pages (the bridge below).
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  window.ArenaBoard = { mount(el, opt) {
    opt = opt || {}; const top = opt.top || 5; let tab = opt.tab || 'all';
    const B = () => (window.MicroPractice && window.MicroPractice.fun) || null;
    el.classList.add('lbx');
    el.innerHTML = '<div class="lbh">Leaderboard</div><div class="tabs"></div><div class="lbb msg">Loading…</div><div class="you"></div>' + (opt.full ? '<div class="full"><a href="#" class="lbfull">Full leaderboard</a></div>' : '');
    let rows = null;
    const draw = () => {
      const b = B(); if (!b) return;
      const tabs = [['all', 'Total']].concat(b.topics().map(t => [t.id, t.name]));
      const tb = el.querySelector('.tabs'); tb.innerHTML = '';
      tabs.forEach(([v, l]) => { const x = document.createElement('button'); x.type = 'button'; x.textContent = l; x.className = v === tab ? 'on' : ''; x.onclick = () => { tab = v; draw(); }; tb.appendChild(x); });
      if (!rows) return;
      const pts = r => tab === 'all' ? r.total : ((r.topics || {})[tab] || 0), u = b.user();
      const list = rows.filter(r => pts(r) > 0).sort((p, q) => pts(q) - pts(p) || (p.ts || 0) - (q.ts || 0));
      const body = el.querySelector('.lbb'); body.className = 'lbb' + (list.length ? '' : ' msg');
      body.innerHTML = list.length ? '<ol>' + list.slice(0, top).map((r, i) => '<li' + (u && r.key === u.key ? ' class="me"' : '') + '><span class="rk">' + (i + 1) + '</span><span>' + escH(r.nick) + '</span><span class="pt">' + fmt(pts(r)) + '</span></li>').join('') + '</ol>' : 'No points yet: be the first.';
      const you = el.querySelector('.you');
      if (u) { const i = list.findIndex(r => r.key === u.key); you.textContent = i >= 0 ? 'You (' + u.nick + '): rank ' + (i + 1) + ' of ' + list.length + ' · ' + fmt(pts(list[i])) + ' points' : 'You (' + u.nick + '): no points here yet'; }
      else you.textContent = '';
    };
    const f = el.querySelector('.lbfull'); if (f) f.onclick = e => { e.preventDefault(); const b = B(); if (b && b.go) b.go('leaderboard'); };
    draw();
    const b = B(); if (b && b.board) b.board().then(r => { rows = r; draw(); }).catch(e => { const body = el.querySelector('.lbb'); body.className = 'lbb msg'; body.textContent = 'The leaderboard could not be loaded (' + ((e && e.message) || 'offline') + '). Reload in a minute.'; });
  } };
  if (window.MicroPractice && window.MicroPractice.fun) return;   // inside the arena the real bridge is there
  const CFG = window.MICRO_CONFIG || {}, GH = CFG.github || {}, P = window.PRACTICE || { topics: [] };
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const SESSION = /[?&]test\b/.test(location.search) || LOCAL ? 'test' : (CFG.session || 'default');
  const T = SESSION === 'test' ? '-test' : '';
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo, BOARD = 'heads/v/' + SESSION + '/arena/';
  const load = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const login = () => load('micro-arena-login' + T);
  const me = () => { const l = login(); return (l && load('micro-arena-prog' + T + '-' + l.key)) || { done: {} }; };
  const ids = window.PRACTICE_IDS || {};
  let cache = null;
  window.MicroPractice = window.MicroPractice || {};
  window.MicroPractice.fun = { v: 1, readOnly: true,
    user: () => { const l = login(); return l ? { nick: l.nick, key: l.key } : null; },
    topics: () => (P.topics || []).map(t => ({ id: t.id, name: t.name })),
    score: topic => { const d = me().done || {}, list = topic ? (ids[topic] || []) : Object.keys(d); return list.reduce((a, id) => a + ((d[id] && d[id].p) || 0), 0); },
    board: () => {
      if (cache && Date.now() - cache.t < 60000) return Promise.resolve(cache.rows);
      if (!TOKEN) return Promise.reject(new Error('no token'));
      return fetch(API + '/git/matching-refs/' + BOARD, { headers: { Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error('GitHub answered ' + r.status); return r.json(); })
        .then(list => { const latest = {};
          list.forEach(x => { const m = x.ref.slice(('refs/' + BOARD).length).match(/^(\d+)--([a-z0-9_-]{2,16})--([A-Za-z0-9_-]{2,16})--(\d{1,7})--([\w.]*)$/); if (!m) return;
            const row = { ts: +m[1], key: m[2], nick: m[3], total: +m[4], topics: Object.fromEntries(m[5].split('_').filter(Boolean).map(p => p.split('.')).map(([c, v]) => [c, +v])) };
            if (!latest[row.key] || latest[row.key].ts < row.ts) latest[row.key] = row; });
          const rows = Object.values(latest).map(r => ({ ts: r.ts, key: r.key, nick: r.nick, total: r.total, topics: r.topics })); cache = { t: Date.now(), rows }; return rows; });   // rows keep ts: a tie goes to the earlier (Utku round 8)
    },
    go: where => { location.href = '../practice/' + (where === 'leaderboard' ? '?board' : '') + (T ? (where === 'leaderboard' ? '&test' : '?test') : ''); }
  };
})();
