// A stand-in for practice.js, for building and testing the fun modules without accounts or the network (Oyun, 14.11.2026).
// It offers the same bridge (window.MicroPractice.fun), fires the same events and renders the same ten slots as the arena.
// Not part of the arena: nothing here is loaded by practice/index.html.
(function () {
  'use strict';
  const TOPICS = [['sd', 'Supply and demand shifts', 2], ['pc', 'Perfect competition', 1], ['pref', 'Preferences', 5], ['rc', 'Rational choices and e', 2], ['words', 'Words to equations', 1], ['opt', 'Optimal consumption', 3]]
    .map(([id, name, types]) => ({ id, name, types }));
  const LV = ['easy', 'medium', 'hard'], BASE = { easy: 101, medium: 211, hard: 307 }, RATE = 0.85, FLOOR = 0.25;
  const ITEMS = {}; TOPICS.forEach(t => { ITEMS[t.id] = []; for (let i = 0; i < 24; i++) ITEMS[t.id].push({ id: t.id + '-' + (i + 1), type: t.id + '-T' + (i % t.types + 1), level: LV[Math.floor(i / 8)], topic: t.id }); });
  const byId = {}; Object.values(ITEMS).flat().forEach(it => byId[it.id] = it);
  const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  const primeLE = x => { let n = Math.max(2, Math.floor(x)); while (n > 2 && !isPrime(n)) n--; return n; };
  const closestPrime = x => { for (let k = 0; ; k++) { if (isPrime(Math.ceil(x) + k) && (Math.ceil(x) + k - x) <= (x - (Math.floor(x) - k)) || !isPrime(Math.floor(x) - k) && isPrime(Math.ceil(x) + k)) return Math.ceil(x) + k; if (isPrime(Math.floor(x) - k)) return Math.floor(x) - k; } };
  const ladder = (level, k) => primeLE(Math.max(BASE[level] * Math.pow(RATE, k - 1), BASE[level] * FLOOR));
  const afterWrong = (v, w) => { if (w >= 3) return 0; for (let i = 0; i < w; i++) v = closestPrime(v / 2); return v; };
  const me = { done: {}, wrong: {}, fun: {}, awards: {} };
  let user = { nick: 'tester-1', key: 'tester-1' }, screen = { name: 'home' }, offline = false;
  let BOARD = Array.from({ length: 37 }, (_, i) => ({ key: 'n' + i, nick: 'nick_' + i, total: Math.round(4200 * Math.exp(-i / 9)) + 23, topics: {} }));
  const rightInType = (type, except) => Object.entries(me.done).filter(([id, d]) => id !== except && d.p > 0 && byId[id].type === type).length;
  const pointsNow = id => { const it = byId[id]; return it ? afterWrong(ladder(it.level, rightInType(it.type, id) + 1), me.wrong[id] || 0) : 0; };
  const score = topic => Object.entries(me.done).reduce((a, [id, d]) => a + (!topic || byId[id].topic === topic ? d.p || 0 : 0), 0) + (topic ? 0 : Object.values(me.awards).reduce((a, b) => a + b, 0));
  const board = () => { const rows = BOARD.filter(r => r.key !== user.key).concat(score() > 0 ? [{ key: user.key, nick: user.nick, total: score(), topics: Object.fromEntries(TOPICS.map(t => [t.id, score(t.id)])) }] : []); return offline ? Promise.reject(new Error('offline')) : Promise.resolve(rows); };
  window.MicroPractice = { version: 2, session: 'mock', fun: {
    v: 1, user: () => user && { ...user }, topics: () => TOPICS.map(t => ({ id: t.id, name: t.name })), items: t => (ITEMS[t] || []).map(({ id, type, level }) => ({ id, type, level })),
    done: () => JSON.parse(JSON.stringify(me.done)), wrong: () => ({ ...me.wrong }), score, pointsNow, ladder, afterWrong, floor: level => primeLE(BASE[level] * FLOOR),
    board, get: n => me.fun[n] === undefined ? undefined : JSON.parse(JSON.stringify(me.fun[n])), set: (n, v) => { me.fun[n] = JSON.parse(JSON.stringify(v)); },
    go: n => { if (n === 'leaderboard') Mock.leaderboard(); else if (n === 'home') Mock.home(); },
    award: n => { if (n !== 'Q0' || me.awards.Q0) return; const from = score(); me.awards.Q0 = 2; fire('total', { from, to: score() }); drawTot(); } } };
  const fire = (n, d) => document.dispatchEvent(new CustomEvent('arena:' + n, { detail: d }));
  const S = (n, topic) => '<span class="fun" data-fun="' + n + '"' + (topic ? ' data-topic="' + topic + '"' : '') + '></span>';
  const app = () => document.getElementById('app');
  const drawTot = () => { const t = document.getElementById('tot'); if (t) t.textContent = score(); };
  const header = (topic, mode) => '<div class="bar"><nav class="crumbs">Midterm practice › ' + (topic ? TOPICS.find(t => t.id === topic).name + (mode ? ' › ' + mode : '') : 'Topics') + '</nav>' +
    '<span class="menuwrap"><button class="link mebtn" id="meb" type="button">' + user.nick + ' · <span id="tot">' + score() + '</span>' + S('tot-mark') + ' ▾</button>' +
    '<div class="menu" id="mem">' + S('menu-top') + '<button type="button" onclick="Mock.how()">How points work</button><button type="button" onclick="Mock.leaderboard()">Leaderboard</button></div></span></div>' + S('strip');
  let cur = null;
  const Mock = window.Mock = {
    me, byId, TOPICS, pointsNow,
    home() { screen = { name: 'home' }; app().innerHTML = header() + '<p class="sub">Pick a topic.</p>' + S('home-top') + '<div class="cats">' + TOPICS.map(t => { const all = ITEMS[t.id], done = all.filter(it => me.done[it.id]).length;
      return '<button type="button" class="cat" data-topic="' + t.id + '" onclick="Mock.topic(\'' + t.id + '\')"><span class="n">' + t.name + '</span><span class="d">' + done + ' of ' + all.length + ' done · ' + score(t.id) + ' points</span>' + S('cat', t.id) + '</button>'; }).join('') + '</div>';
      fire('screen', { name: 'home', topic: null, mode: null, item: null }); },
    welcome() { Mock.home(); const b = document.createElement('div'); b.className = 'modal'; b.id = 'tut'; b.innerHTML = '<div class="card"><h2>Welcome to the midterm practice</h2><ol class="tut"><li><b>Your account.</b> …</li><li><b>Choose a topic.</b> …</li><li><b>Choose a question.</b> …</li><li><b>Answer.</b> …</li></ol>' + S('tut-after') + '<p><button class="go" type="button" id="tutX" onclick="this.closest(\'.modal\').remove()">Got it</button></p></div>'; document.body.appendChild(b); fire('screen', { name: 'home', topic: null, mode: null, item: null, tutorial: true }); },
    topic(id, mode) { mode = mode || 'arena'; screen = { name: 'topic', topic: id, mode }; app().innerHTML = header(id, mode) + '<h2>' + TOPICS.find(t => t.id === id).name + '</h2><div class="tabs modes"><button class="on">Arena</button><button>Selection</button></div>' + S('arena-top') +
      '<div class="startrow"><button class="go big" type="button" onclick="Mock.ask()">Start</button><span class="sub">Level: easy</span></div>'; fire('screen', { name: 'topic', topic: id, mode, item: null }); },
    ask(id) { const t = screen.topic || 'sd'; const it = id ? byId[id] : ITEMS[t].find(x => !me.done[x.id]); if (!it) return Mock.topic(t); cur = it; screen = { name: 'question', topic: it.topic, mode: 'arena' };
      app().innerHTML = header(it.topic, 'Arena') + '<div class="card"><div class="qmeta"><span class="lvl">' + it.level + '</span><span class="pts" id="pn">' + pointsNow(it.id) + ' points</span>' + S('qmeta') + '</div><p class="qtext">(question ' + it.id + ', type ' + it.type + ')</p>' +
        '<div class="opts"><button class="opt" type="button" onclick="Mock.answer(true)">a) the right option</button><button class="opt" type="button" onclick="Mock.answer(false)">b) a wrong option</button></div></div><div class="abar" id="abar" hidden><div class="abar-in">' + S('abar') + '<span class="verdict" id="verdict"></span><span class="abtn" id="abtn"></span></div></div>';
      fire('screen', { name: 'question', topic: it.topic, mode: 'arena', item: { id: it.id, type: it.type, level: it.level } }); },
    answer(ok) { const it = cur; if (!it || me.done[it.id]) return; const w0 = me.wrong[it.id] || 0, worth = pointsNow(it.id), from = score(); const bar = document.getElementById('abar'), v = document.getElementById('verdict'); bar.hidden = false;
      if (ok) { me.done[it.id] = { p: worth, w: w0, at: new Date().toISOString() }; v.className = 'verdict ok'; v.textContent = worth ? 'Correct: +' + worth + ' points.' : 'Correct. No points after three wrong tries.'; document.getElementById('abtn').innerHTML = '<button type="button">Show solution</button><button class="go" type="button" onclick="Mock.ask()">Next question</button>'; }
      else { me.wrong[it.id] = w0 + 1; v.className = 'verdict no'; v.textContent = 'Incorrect. Now worth ' + pointsNow(it.id) + ' points.'; document.getElementById('pn').textContent = pointsNow(it.id) + ' points'; }
      drawTot(); fire('answer', { item: { id: it.id, type: it.type, level: it.level, topic: it.topic }, ok, attempt: w0 + 1, points: ok ? worth : 0, worthNow: ok ? worth : pointsNow(it.id), mode: 'arena' });
      if (ok && score() !== from) fire('total', { from, to: score() }); },
    leaderboard(tab) { tab = tab || 'all'; screen = { name: 'leaderboard' }; app().innerHTML = header() + '<h2>Leaderboard</h2>' + S('lb-top') + '<div id="lb">Loading…</div>';
      fire('screen', { name: 'leaderboard', topic: null, mode: null, item: null, tab });
      board().then(all => { const rows = all.map(r => ({ ...r, p: tab === 'all' ? r.total : r.topics[tab] || 0 })).filter(r => r.p > 0).sort((a, b) => b.p - a.p).slice(0, 50);
        document.getElementById('lb').innerHTML = '<table class="lb"><tr><th>#</th><th>nickname</th><th class="p">points</th></tr>' + rows.map((r, i) => '<tr' + (r.key === user.key ? ' class="mine"' : '') + '><td>' + (i + 1) + '</td><td>' + r.nick + '</td><td class="p">' + r.p + '</td></tr>').join('') + '</table>';
        fire('board', { tab, rows: all }); }).catch(() => { document.getElementById('lb').textContent = 'Could not load the leaderboard.'; }); },
    how() { const b = document.createElement('div'); b.className = 'modal'; b.id = 'how'; b.innerHTML = '<div class="card"><h2>How points work</h2>' + S('how-top') + '<table class="lb"><tr><th></th><th>1st</th><th>2nd</th><th>3rd</th></tr>' + LV.map(l => '<tr><td>' + l + '</td>' + [1, 2, 3].map(k => '<td class="p">' + ladder(l, k) + '</td>').join('') + '</tr>').join('') + '</table><p>(the five paragraphs)</p><p><button class="go" type="button" onclick="this.closest(\'.modal\').remove()">Close</button></p></div>';
      document.body.appendChild(b); fire('screen', { name: 'how', topic: screen.topic || null, mode: null, item: cur && screen.name === 'question' ? { id: cur.id, type: cur.type, level: cur.level } : null }); },
    // test helpers
    solve(topic, n, firstTry) { ITEMS[topic].filter(it => !me.done[it.id]).slice(0, n).forEach(it => { if (!firstTry) me.wrong[it.id] = 1; me.done[it.id] = { p: pointsNow(it.id), w: firstTry ? 0 : 1, at: new Date(Date.now() + (Mock._t = (Mock._t || 0) + 1000)).toISOString() }; }); },
    offline(v) { offline = !!v; }, logout() { user = null; }, setBoard(rows) { BOARD = rows; }, reset() { me.done = {}; me.wrong = {}; me.fun = {}; me.awards = {}; }
  };
  document.addEventListener('DOMContentLoaded', () => Mock.home());
})();
