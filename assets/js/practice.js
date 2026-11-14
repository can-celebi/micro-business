// Midterm practice arena (Can 14.11, specs/Practice-arena.md Additions 5 and 6), on the engine of 12.11 (PR 25).
// Accounts: a nickname and a password the student picks. Only a salted PBKDF2-SHA256 hash (100 000 rounds) is stored, one record per
// account: a blob under refs/tags/acct/<session>/<nickname in lower case> in the data repo; creating it fails when the name is taken.
// The device stays logged in (localStorage) until "log out"; on another device the nickname and password log in again.
// Progress per account: a blob under refs/tags/prog/<session>/<name>, {done: {id: {p, w, at}}, wrong: {id: n}}, read at login and merged.
// Topics: the six midterm topics (practice/topics/<id>.js). A topic shows all its question cards, each with its difficulty and the points
// it gives now; the student picks the question and the order, and answers one at a time.
// Points (practice/meta.js "points", from practice_points.json): big primes; the k-th right answer within one question type earns the
// largest prime <= base[level] * rate^(k-1), never below floor * base; each wrong attempt on that question first steps down to the next
// lower prime. A wrong answer does not show the solution; the student tries again, or opens the solution for 0 points.
// Leaderboard: one ref per account, refs/heads/v/<session>/arena/<ts>--<name>--<nickname>--<total>--<topic.points_…>; total by default,
// one per topic.
// Honest limits ("light security", Can): the data token is in the page, so a determined student can write any record or score, and the
// stored hash of a weak password can be guessed offline. The page says so: no real names, a password used nowhere else.
// Time per answer (Hande's format, Addition 3) stays: one record per attempt, sent in batches as before.
(function () {
  'use strict';
  const P = window.PRACTICE, TOP = window.PRACTICE_TOPICS || {}, CFG = window.MICRO_CONFIG || {}, GH = CFG.github || {};
  const app = document.getElementById('app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (!P || !Array.isArray(P.topics)) { app.innerHTML = '<h1>Midterm practice</h1><p class="bad">The questions could not be loaded. Please reload.</p>'; return; }
  const ITEMS = P.topics.flatMap(t => Array.isArray(TOP[t.id]) ? TOP[t.id] : []);
  const byId = Object.fromEntries(ITEMS.map(it => [it.id, it]));
  const topicName = id => (P.topics.find(t => t.id === id) || {}).name || id;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const SESSION = /[?&]test\b/.test(location.search) || LOCAL ? 'test' : (CFG.session || 'default');
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;
  const BOARD = 'heads/v/' + SESSION + '/arena/', ACCT = 'tags/acct/' + SESSION + '/', PROG = 'tags/prog/' + SESSION + '/';
  const T = SESSION === 'test' ? '-test' : '';
  const KEY_LOGIN = 'micro-arena-login' + T, KEY_DEV = 'micro-arena-device' + T;
  const WRITE_EVERY = 120000, CAP = 900, ITER = 100000;
  const NICK_RE = /^[A-Za-z0-9_-]{2,16}$/;

  // ---------- points: big primes, concave within a question type, one prime lower per wrong attempt ----------
  const PT = P.points || { base: { easy: 101, medium: 211, hard: 307 }, rate: 0.85, floor: 0.25 };
  const isPrime = n => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
  const primeLE = x => { let n = Math.max(2, Math.floor(x)); while (n > 2 && !isPrime(n)) n--; return n; };
  const primeBelow = p => { let n = p - 1; while (n > 2 && !isPrime(n)) n--; return Math.max(2, n); };
  const baseOf = it => PT.base[it.level] || PT.base.easy;
  const floorOf = it => primeLE(baseOf(it) * PT.floor);
  function ladder(it, k) { return primeLE(Math.max(baseOf(it) * Math.pow(PT.rate, k - 1), baseOf(it) * PT.floor)); }
  // wrong tries (Can 14.11): each halves the current value to the closest prime (a tie takes the higher); after the third, 0
  const WR = PT.wrong || { rule: 'half', zero_after: 3 };
  const primeNear = x => { let lo = Math.floor(x), hi = Math.ceil(x); while (lo > 2 && !isPrime(lo)) lo--; while (!isPrime(hi)) hi++; return (x - lo) < (hi - x) ? lo : hi; };
  function stepDown(it, p, w) { if (w >= (WR.zero_after || 3)) return 0; for (let i = 0; i < w; i++) p = primeNear(p / 2); return p; }
  const typeOf = it => it.type || it.cat;
  const rightInType = (type, except) => Object.entries(me.done).filter(([id, d]) => id !== except && d.p > 0 && byId[id] && typeOf(byId[id]) === type).length;
  function pointsNow(it) { return stepDown(it, ladder(it, rightInType(typeOf(it), it.id) + 1), me.wrong[it.id] || 0); }
  const AWARDS = {};   // awards counted in the total (Question 0 removed by Can 14.11: none now)
  const awardsTotal = () => Object.keys((me.fun && me.fun.awards) || {}).reduce((a, k) => a + (AWARDS[k] || 0), 0);
  const score = topic => Object.entries(me.done).reduce((a, [id, d]) => a + (byId[id] && (!topic || byId[id].topic === topic) ? (d.p || 0) : 0), 0) + (topic ? 0 : awardsTotal());

  // ---------- who is logged in on this device, and their progress ----------
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const dev = load(KEY_DEV, {}); if (!dev.cid) { dev.cid = Math.random().toString(36).slice(2, 10); save(KEY_DEV, dev); }
  let login = load(KEY_LOGIN, null);   // {nick, key}
  let me = { done: {}, wrong: {}, pending: [] };
  const progKey = () => 'micro-arena-prog' + T + '-' + login.key;
  function loadMe() { me = load(progKey(), {}); me.done = me.done || {}; me.wrong = me.wrong || {}; me.pending = me.pending || []; }
  const keep = () => { if (login) save(progKey(), me); };
  if (login) loadMe();
  let lecturer = false; try { lecturer = !!localStorage.getItem('micro-teacher-code'); } catch (e) {}
  let RUNID = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  // ---------- maths: variants carry $…$ (KaTeX); template items are plain text, shown with italic letters in the maths font ----------
  function tex(s) {
    const parts = String(s == null ? '' : s).split(/(\$[^$]+\$)/);
    if (parts.length === 1) return plainMath(esc(s));
    return parts.map(x => /^\$[^$]+\$$/.test(x) && window.katex ? katex.renderToString(x.slice(1, -1), { throwOnError: false, trust: false, strict: 'ignore' }) : esc(x)).join('');
  }
  // equations in plain text ("2x + y = 58 for x ≤ 5, and x + y = 53 for x ≥ 5"): each equation one unbreakable unit in the maths font,
  // the letters x, y, u, M italic, the words for/and/all in the text font; x and y in prose italic too; bundles like (6, 36) in the maths font
  const V = '(?<![A-Za-z])[xyuM](?![A-Za-z])';
  const RUN = new RegExp('(?:[(\\d€.,]|' + V + '|[ +−\\-=≤≥·×/()]|\\bfor\\b|\\band\\b|\\ball\\b)+', 'g');
  const isEq = s => new RegExp(V).test(s) && /[=≤≥]/.test(s);
  const proseVars = s => s.replace(/(?<![A-Za-z])([xy])(?![A-Za-z])/g, '<span class="m"><i>$1</i></span>')
    .replace(/\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?\)/g, '<span class="m">$&</span>');
  const eq = s => '<span class="m">' + s.replace(new RegExp(V, 'g'), '<i>$&</i>').replace(/\b(for|and|all)\b/g, '<span class="w">$1</span>') + '</span>';
  const plainMath = h => h.replace(RUN, m => {
    if (!isEq(m)) return proseVars(m);
    const lead = m.match(/^\s*/)[0], trail = m.match(/[\s,.]*$/)[0], core = m.slice(lead.length, m.length - trail.length);
    return lead + core.split(/(,\s*and\s+|,\s+)/).map((p, i) => i % 2 ? p : (isEq(p) ? eq(p) : proseVars(p))).join('') + trail;
  });

  // figures: one inline SVG (solution "figure", question "stem_figure"), cleaned to drawing elements and plain colours (Utku's rules)
  const SVG_OK = new Set(['svg', 'g', 'line', 'polyline', 'polygon', 'path', 'circle', 'ellipse', 'text', 'tspan', 'rect', 'title']);
  const ATTR_OK = new Set(['xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'd', 'dx', 'dy', 'fill', 'stroke',
    'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'fill-opacity', 'stroke-opacity', 'opacity', 'font-size', 'font-family', 'font-style',
    'font-weight', 'text-anchor', 'dominant-baseline', 'transform', 'role', 'aria-label']);
  const COLOUR = /^(none|currentColor|[a-zA-Z]{3,20}|#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\))$/;
  function cleanSvg(src) {
    try {
      const doc = new DOMParser().parseFromString(String(src), 'image/svg+xml'), root = doc.documentElement;
      if (!root || root.nodeName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
      const walk = el => { [...el.children].forEach(c => { if (!SVG_OK.has(c.nodeName)) c.remove(); else walk(c); });
        [...el.attributes].forEach(a => { if (!ATTR_OK.has(a.name) || /url\s*\(|javascript:|expression\s*\(|\\|&/i.test(a.value) || ((a.name === 'fill' || a.name === 'stroke') && !COLOUR.test(a.value.trim()))) el.removeAttribute(a.name); }); };
      walk(root); root.removeAttribute('width'); root.removeAttribute('height'); root.setAttribute('class', 'figsvg');
      return document.importNode(root, true);
    } catch (e) { return null; }
  }
  function putFig(box, src) { if (!box) return; const f = cleanSvg(src); if (f) box.appendChild(f); else box.remove(); }

  // the clock (as survey 2): runs only while the page is on screen
  const clock = { t0: 0, acc: 0, away: true };
  const clockStart = () => { clock.acc = 0; clock.away = document.hidden; clock.t0 = performance.now(); };
  const clockStop = () => { if (!clock.away) clock.acc += performance.now() - clock.t0; clock.away = true; return Math.round(clock.acc / 1000); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !clock.away) { clock.acc += performance.now() - clock.t0; clock.away = true; }
    else if (!document.hidden && clock.away && clock.t0) { clock.away = false; clock.t0 = performance.now(); }
  });

  async function sha(text) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }


  // ---------- passwords: PBKDF2-SHA256, 100 000 rounds, a random 16-byte salt per account ----------
  const hex = b => [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  async function pbkdf2(pw, saltHex, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, k, 256));
  }

  // ---------- the data repo ----------
  const H = () => ({ Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' });
  const b64json = s => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0))));
  async function getRefObj(ref) {   // the object a ref points to, or null if there is no such ref
    const r = await fetch(API + '/git/ref/' + ref, { headers: H(), cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('GitHub answered ' + r.status);
    const j = await r.json(); return Array.isArray(j) ? null : j.object.sha;   // a prefix match returns a list: not this ref
  }
  async function readBlob(sha) { const r = await fetch(API + '/git/blobs/' + sha, { headers: H(), cache: 'no-store' }); if (!r.ok) throw new Error('GitHub answered ' + r.status); return b64json((await r.json()).content); }
  async function newBlob(obj, keepalive) {
    const r = await fetch(API + '/git/blobs', { method: 'POST', headers: H(), body: JSON.stringify({ content: JSON.stringify(obj), encoding: 'utf-8' }), keepalive: !!keepalive });
    if (r.status !== 201) throw new Error('GitHub answered ' + r.status); return (await r.json()).sha;
  }
  async function createAccount(nick, pw) {
    const key = nick.toLowerCase();
    if (await getRefObj(ACCT + key)) return 'taken';
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const rec = { v: 1, nick, salt, iter: ITER, hash: await pbkdf2(pw, salt, ITER), created: new Date().toISOString() };
    const blob = await newBlob(rec);
    const r = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: 'refs/' + ACCT + key, sha: blob }) });
    if (r.status === 201) return 'ok';
    if (r.status === 422) return (await getRefObj(ACCT + key)) === blob ? 'ok' : 'taken';   // 422: already there, or GitHub's false alarm
    throw new Error('GitHub answered ' + r.status);
  }
  async function checkLogin(nick, pw) {
    const sha = await getRefObj(ACCT + nick.toLowerCase());
    if (!sha) return null;
    const rec = await readBlob(sha);
    const it = rec && Number.isInteger(rec.iter) && rec.iter >= 1000 && rec.iter <= 1000000 ? rec.iter : ITER;   // a forged huge count must not freeze the page (Utku)
    return rec && rec.hash && /^[0-9a-f]{32}$/.test(rec.salt || '') && (await pbkdf2(pw, rec.salt, it)) === rec.hash ? rec : false;
  }
  // progress: the newer/first right answer per question is kept, never lost; wrong counts take the larger
  function merge(remote) {
    if (!remote || typeof remote !== 'object') return;
    Object.entries(remote.done || {}).forEach(([id, d]) => { const l = me.done[id]; if (d && typeof d.p === 'number' && (!l || (d.at && l.at && d.at < l.at))) me.done[id] = d; });
    Object.entries(remote.wrong || {}).forEach(([id, n]) => { if (typeof n === 'number' && n > (me.wrong[id] || 0)) me.wrong[id] = n; });
    if (remote.tut) me.tut = 1;   // the tutorial was seen on another device
    if (remote.fun && typeof remote.fun === 'object') { me.fun = me.fun || {}; Object.entries(remote.fun).forEach(([k, v]) => { if (k === 'awards') me.fun.awards = Object.assign({}, v, me.fun.awards); else if (!(k in me.fun)) me.fun[k] = v; }); }
    if (remote.arena && typeof remote.arena === 'object') { me.arena = me.arena || {}; Object.entries(remote.arena).forEach(([t, a]) => { if (!me.arena[t] && a && LV.includes(a.level)) me.arena[t] = a; }); }
  }
  async function pullProgress() { const sha = await getRefObj(PROG + login.key); if (sha) { merge(await readBlob(sha)); keep(); } }
  let lastWrite = 0, inflight = null, mainSha = null, etag = null, board = null;
  async function sendTimes(force) {
    if (!me.pending.length) return;
    const batch = me.pending.slice(0, 200);
    const blob = await newBlob({ v: 1, session: SESSION, client: dev.cid, records: batch }, force);
    const r = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: 'refs/tags/t/' + SESSION + '/practice-times/' + Date.now() + '--' + dev.cid, sha: blob }), keepalive: !!force });
    if (r.ok || r.status === 422) { me.pending = me.pending.slice(batch.length); keep(); }
  }
  async function writeAll(force) {   // one at a time; a forced write waits for the one in flight, then writes what is new
    if (inflight) { await inflight.catch(() => {}); if (!force) return; }
    inflight = writeOnce(force); try { await inflight; } finally { inflight = null; }
  }
  async function writeOnce(force) {
    if (!TOKEN || !login) return;
    const total = score(), ts = P.topics.map(t => t.id + '.' + score(t.id)).join('_'), sig = total + '|' + ts + '|' + JSON.stringify(me.wrong).length + '|' + (me.tut ? 1 : 0) + '|' + JSON.stringify(me.arena || {}) + '|' + JSON.stringify(me.fun || {});
    if (sig === me.wrote && !me.pending.length) return;
    if (!force && Date.now() - lastWrite < WRITE_EVERY) return;
    lastWrite = Date.now();
    try {
      try { await sendTimes(force); } catch (e) {}
      if (sig === me.wrote) return;
      const blob = await newBlob({ v: 1, nick: login.nick, done: me.done, wrong: me.wrong, tut: me.tut ? 1 : 0, arena: me.arena || {}, fun: me.fun || {}, ts: new Date().toISOString() }, force);
      const pr = 'refs/' + PROG + login.key;
      let w = await fetch(API + '/git/' + pr, { method: 'PATCH', headers: H(), body: JSON.stringify({ sha: blob, force: true }), keepalive: !!force });
      if (w.status === 422 || w.status === 404) w = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: pr, sha: blob }), keepalive: !!force });
      if (!mainSha) { const r = await fetch(API + '/git/ref/heads/main', { headers: H(), cache: 'no-store' }); if (!r.ok) throw 0; mainSha = (await r.json()).object.sha; }
      const name = 'refs/' + BOARD + Date.now() + '--' + login.key + '--' + login.nick + '--' + total + '--' + ts;
      const b = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: name, sha: mainSha }), keepalive: !!force });
      if (b.ok || b.status === 422) {
        const old = me.ref; me.ref = name; me.wrote = sig; keep();
        if (old && old !== name) fetch(API + '/git/' + old, { method: 'DELETE', headers: H(), keepalive: true }).catch(() => {});
      }
    } catch (e) { /* next time */ }
  }
  async function readBoard() {
    if (!TOKEN) return [];
    const h = H(); if (etag) h['If-None-Match'] = etag;
    const r = await fetch(API + '/git/matching-refs/' + BOARD, { headers: h, cache: 'no-store' });
    if (r.status === 304 && board) return board;
    if (!r.ok) throw new Error('GitHub answered ' + r.status);
    etag = r.headers.get('ETag');
    const latest = {};
    (await r.json()).forEach(x => {
      const m = x.ref.slice(('refs/' + BOARD).length).match(/^(\d+)--([a-z0-9_-]{2,16})--([A-Za-z0-9_-]{2,16})--(\d{1,7})--([\w.]*)$/);
      if (!m) return;
      const row = { ts: +m[1], key: m[2], nick: m[3], total: +m[4], topics: Object.fromEntries(m[5].split('_').filter(Boolean).map(p => p.split('.')).map(([c, v]) => [c, +v])) };
      if (!latest[row.key] || latest[row.key].ts < row.ts) latest[row.key] = row;
    });
    board = Object.values(latest); return board;
  }

  // ---------- the fun bridge (Oyun's modules, contract 14.11) ----------
  const fire = (name, detail) => { try { document.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };
  let lastTotal = null;
  const totalChanged = () => { const t = score(); if (lastTotal !== null && t !== lastTotal) fire('arena:total', { from: lastTotal, to: t }); lastTotal = t; };
  const pub = it => it && { id: it.id, type: typeOf(it), level: it.level, topic: it.topic };
  // ---------- screens ----------
  // student texts: Hafize (Student service), passed by Ulutin and Gozde (20_student-desk/frozen/b81e365f4d94/…; How points work: frozen/364fcecf89e3/…, the halving rule)
  const TX = {
    how: ['Every question gives a prime number of points. The base depends on the difficulty: an easy question gives 101 points, a medium question 211 points and a hard question 307 points.',
      'Each question belongs to a question type. Your first right answer of a type gives the full base. Each further right answer of the same type gives a little less: about 15% less each time, always rounded down to a prime number, and never less than about a quarter of the base.',
      'If you answer a question wrongly, you can try again, but each wrong try halves the points the question gives, rounded to the closest prime number. After the third wrong try, the question gives no points. If you open the solution before you have found the right answer, the question also gives no points.',
      '<b>Example.</b> Your first easy question of a type gives 101 points if you answer it right at the first try. Your second easy question of the same type gives 83 points. If you answer the first one wrongly once and then right, it gives 53 points instead of 101; after two wrong tries it gives 29 points.',
      'Each card shows the points it gives you now, so you always see what a question is worth before you open it.'],
    dir: { words: 'Read a short story about prices and a budget, and choose the equations that describe the budget line.',
      opt: 'Find the optimal bundle a consumer can afford, on straight and kinked budget lines and for different utility functions.',
      sd: 'Decide how demand or supply shifts after a change in the market, and find the new equilibrium price and quantity.',
      pc: 'Decide whether a market has the features of perfect competition.',
      pref: 'Check which properties a relation or a preference has, match utility functions to the shapes of their indifference curves, and work out the result of a majority vote.',
      rc: 'Check whether a person\'s choices on different budgets can come from rational preferences, and how far choices that are not rational are from rational (the index e).' },
    tut: [['Your account.', 'Make an account with a nickname and a password. Please use this one nickname every time and on every device, so that all your points and your progress stay together.'],
      ['Choose a topic.', 'Pick one of the six topics. Your points for each topic and in total appear on the leaderboards.'],
      ['Choose a question.', 'Each card shows the difficulty of the question and the points it gives you now. You decide which question to answer and in which order.'],
      ['Answer.', 'After your answer you see whether it is right and how many points you have earned. You can then open the full solution if you want to.']]
  };
  // Addition 9: speed bonus (settings; "on": false switches it off) and the arena's one-line rule
  const SP = PT.speed || { on: false };
  const speedOn = !!SP.on;
  const limitOf = it => (SP.limit || {})[it.level] || 0, bonusOf = it => (SP.bonus || {})[it.level] || 0;
  const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const ARENA_RULE = 'You start with easy questions; two right answers in a row' + (speedOn ? ' (a fast one counts as two)' : '') + ' move you up a level; after a wrong answer you get another question of the same kind.';
  const params = new URLSearchParams(location.search);
  const TQ = SESSION === 'test' && !LOCAL ? '?test' : '';
  const LEVEL = { easy: 'easy', medium: 'medium', hard: 'hard' }, LV = ['easy', 'medium', 'hard'];
  let MODE = load('micro-arena-mode' + T, 'arena') === 'select' ? 'select' : 'arena';
  // one line: where you are (Midterm practice › topic › mode), and who you are
  // one sticky top bar on every screen (Oyun's spec, Can's orientation requests): crumbs on the left, each a link (the topic crumb opens
  // the list of topics), "nickname · points ▾" on the right with How points work, Leaderboard, Log out. The crumb is the one way back.
  let crumbTopic = null, crumbMode = null;
  function header(topicId, mode) {
    crumbTopic = topicId || null; crumbMode = mode || null;
    const mid = '<a class="c-mid" href="../midterm/' + TQ + '">Midterm practice</a>';
    const tc = topicId ? '<button type="button" class="crumb" id="tsw">' + esc(topicName(topicId)) + ' ▾</button>' : '<button type="button" class="crumb" id="tsw">Topics ▾</button>';
    const mc = topicId && mode ? '<span class="sep">›</span><span class="c-mode">' + (mode === 'arena' ? 'Arena' : 'Selection') + '</span>' : '';
    const me_ = login ? '<button type="button" class="crumb mebtn" id="meb">' + esc(login.nick) + ' · <span id="tot">' + score() + '</span><span class="fun" data-fun="tot-mark"></span> ▾</button>' : '<button type="button" class="crumb mebtn" id="meb">menu ▾</button>';
    return '<div class="bar"><nav class="crumbs">' + mid + '<span class="sep c-mid">›</span>' + tc + mc + '</nav>' + me_ + '</div><span class="fun" data-fun="strip"></span>';
  }
  function closeMenus() { document.querySelectorAll('.menu').forEach(m => m.remove()); }
  function menu(anchor, rows) {   // a small list under a bar button; rows: [label, action] (null action = a link row)
    const open = document.querySelector('.menu[data-for="' + anchor.id + '"]'); closeMenus(); if (open) return;
    const m = document.createElement('div'); m.className = 'menu'; m.dataset.for = anchor.id;
    rows.forEach(([label, act, cls]) => { if (act === null) { const d = document.createElement('div'); d.className = cls || ''; d.innerHTML = label; m.appendChild(d); return; } const b = document.createElement(typeof act === 'string' ? 'a' : 'button'); if (typeof act === 'string') { b.href = act; b.onclick = () => { leaveQuestion(); writeAll(true); }; } else { b.type = 'button'; b.onclick = () => { closeMenus(); act(); }; }
      b.innerHTML = label; if (cls) b.className = cls; m.appendChild(b); });
    const r = anchor.getBoundingClientRect(); m.style.top = (r.bottom + window.scrollY + 4) + 'px';
    if (anchor.classList.contains('mebtn')) m.style.right = Math.max(8, document.documentElement.clientWidth - r.right) + 'px'; else m.style.left = Math.max(8, r.left) + 'px';
    document.body.appendChild(m);
    fire('arena:menu', { name: anchor.id === 'meb' ? 'account' : 'topics' });
  }
  document.addEventListener('click', e => { if (!e.target.closest('.menu') && !e.target.closest('.crumb')) closeMenus(); });
  function wire(topicId) {
    const ml = document.querySelector('.crumbs a.c-mid'); if (ml) ml.onclick = () => { leaveQuestion(); writeAll(true); };   // leaving for /midterm/ records a skip too
    const t = document.getElementById('tsw');
    if (t) t.onclick = () => menu(t, [['← Midterm practice', '../midterm/' + TQ, 'mrow-mid']].concat(P.topics.filter(x => (TOP[x.id] || []).length).map(x => [esc(x.name) + (x.id === crumbTopic ? ' ✓' : ''), () => { leaveQuestion(); topic(x.id); }]), [['All topics', () => { leaveQuestion(); home(); }]]));
    const m = document.getElementById('meb');
    if (m) m.onclick = () => menu(m, [['<span class="fun" data-fun="menu-top"></span>', null, 'mrow-fun'], ['How points work', howPoints]].concat(login ? [['Leaderboard', () => { leaveQuestion(); leaderboard(); }], ['Log out', () => { leaveQuestion(); logout(); }]] : []));
  }
  // a question left before it was answered: one "skipped" record with its time (Hande's timing data keeps every visit), no points
  let current = null;
  function leaveQuestion() {
    if (!current) return;
    const c = current; current = null; clearInterval(ticker);
    if (keyH) { document.removeEventListener('keydown', keyH); keyH = null; }
    if (me.done[c.it.id]) return;
    const secs = clockStop();
    me.pending.push({ ts: new Date().toISOString(), client: dev.cid, nick: login && login.nick, run: RUNID, item: c.it.id, template: c.it.cat, slot: c.it.slot || null, mirrors: null, topic: c.it.topic,
      type: typeOf(c.it), level: c.it.level, mode: c.mode, points: 0, bonus: 0, attempt: (me.wrong[c.it.id] || 0) + 1, seconds: Math.min(CAP, secs), capped: secs >= CAP, correct: null, skipped: true, fast: false, lecturer });
    keep();
  }
  function howPoints() {   // the table first, then the five paragraphs; × / Esc / a tap outside closes it
    const rows = LV.map(l => { const it = { level: l }; return '<tr><td>' + l + '</td>' + [1, 2, 3, 4, 5].map(k => '<td class="p">' + ladder(it, k) + '</td>').join('') + '<td class="p">' + floorOf(it) + '</td></tr>'; }).join('');
    const box = document.createElement('div'); box.className = 'modal'; box.id = 'how';
    box.innerHTML = '<div class="card"><button type="button" class="x" id="howX" aria-label="close">×</button><h2>How points work</h2>' +
      '<span class="fun" data-fun="how-top"></span><table class="lb"><tr><th></th><th class="p">1st</th><th class="p">2nd</th><th class="p">3rd</th><th class="p">4th</th><th class="p">5th</th><th class="p">lowest</th></tr>' + rows + '</table>' +
      '<p class="fine">Points for the 1st, 2nd, … right answer of one question type, at the first try.</p>' +
      (speedOn ? '<p class="fine">Fast bonus: ' + LV.map(l => l + ' +' + bonusOf({ level: l }) + ' within ' + mmss(limitOf({ level: l }))).join(', ') + ' (right at the first try; only the time the page is on screen counts).</p>' : '') +
      TX.how.map(p => '<p>' + p + '</p>').join('') + '</div>';
    const close = () => { box.remove(); document.removeEventListener('keydown', esc_); };
    const esc_ = e => { if (e.key === 'Escape') close(); };
    document.body.appendChild(box); box.onclick = e => { if (e.target === box) close(); };
    document.getElementById('howX').onclick = close; document.addEventListener('keydown', esc_);
    fire('arena:screen', { name: 'how', topic: crumbTopic, mode: crumbMode, item: current ? pub(current.it) : null });
  }
  function tutorial() {   // once per account (Addition 8), dismissable
    if (!login || me.tut) return;
    const box = document.createElement('div'); box.className = 'modal'; box.id = 'tut';
    box.innerHTML = '<div class="card"><h2>Welcome to the midterm practice</h2><ol class="tut">' + TX.tut.map(([a, b]) => '<li><b>' + a + '</b> ' + b + '</li>').join('') +
      '</ol><span class="fun" data-fun="tut-after"></span><p><button class="go" type="button" id="tutX">Got it</button></p></div>';
    document.body.appendChild(box);
    document.getElementById('tutX').onclick = () => { me.tut = 1; keep(); box.remove(); writeAll(false); };
  }
  const WARN = '<p class="warn"><b>One nickname per student.</b> Make one account and keep it: log in with the same nickname and password on every device. A second nickname splits your progress. Do not use your real name, and pick a password you use nowhere else (this page is for practice, its security is light).</p>';
  function loginScreen(msg) {
    app.innerHTML = header() + '<p class="sub">Practice questions for the midterm. Log in, or make your account once.</p>' + WARN +
      '<div class="forms"><form class="card" id="fin"><h2>Log in</h2><label>nickname <input type="text" id="n1" maxlength="16" autocomplete="username" required></label>' +
      '<label>password <input type="password" id="p1" autocomplete="current-password" required></label><button class="go" type="submit">Log in</button></form>' +
      '<form class="card" id="fnew"><h2>New account</h2><label>nickname <input type="text" id="n2" maxlength="16" autocomplete="username" required></label>' +
      '<label>password <input type="password" id="p2" autocomplete="new-password" required></label><label>password again <input type="password" id="p3" autocomplete="new-password" required></label>' +
      '<button type="submit">Make my account</button></form></div><p class="msg" id="lm">' + (msg || 'Nickname: 2 to 16 letters, digits, - or _. Password: at least 6 characters.') + '</p>';
    fire('arena:screen', { name: 'login', topic: null, mode: null, item: null });
    const say = (t, bad) => { document.getElementById('lm').innerHTML = bad ? '<span class="bad">' + esc(t) + '</span>' : esc(t); };
    const busy = on => app.querySelectorAll('form button').forEach(b => b.disabled = on);
    document.getElementById('fin').onsubmit = async e => {
      e.preventDefault(); const nick = document.getElementById('n1').value.trim(), pw = document.getElementById('p1').value;
      if (!NICK_RE.test(nick)) return say('That is not a nickname this page makes (2 to 16 letters, digits, - or _).', true);
      busy(true); say('Checking…');
      try { const rec = await checkLogin(nick, pw); if (!rec) { busy(false); return say(rec === null ? 'No account with that nickname. Make one on the right.' : 'Wrong password for ' + nick + '.', true); }
        if (rec.must_change) return newPassword(rec, nick.toLowerCase());   // a reset by the lecturer (practice_reset.py): choose your own now
        login = { nick: rec.nick, key: nick.toLowerCase() }; save(KEY_LOGIN, login); loadMe(); try { await pullProgress(); } catch (e2) {} start();
      } catch (err) { busy(false); say('Could not reach the server (' + (err.message || 'offline') + '). Try again in a minute.', true); }
    };
    document.getElementById('fnew').onsubmit = async e => {
      e.preventDefault(); const nick = document.getElementById('n2').value.trim(), pw = document.getElementById('p2').value, pw2 = document.getElementById('p3').value;
      if (!NICK_RE.test(nick)) return say('Nickname: 2 to 16 letters, digits, - or _ only.', true);
      if (pw.length < 6) return say('Password: at least 6 characters.', true);
      if (pw !== pw2) return say('The two passwords are not the same.', true);
      busy(true); say('Making your account…');
      try { const r = await createAccount(nick, pw); if (r === 'taken') { busy(false); return say('The nickname ' + nick + ' is taken. If it is yours, log in on the left; otherwise pick another.', true); }
        login = { nick, key: nick.toLowerCase() }; save(KEY_LOGIN, login); loadMe(); start();
      } catch (err) { busy(false); say('Could not reach the server (' + (err.message || 'offline') + '). Try again in a minute.', true); }
    };
  }
  // after a password reset: the temporary password worked; the student picks a new one, progress stays as it is
  function newPassword(rec, key) {
    app.innerHTML = header() + '<h2>Choose a new password</h2><p class="sub">Your password was reset. Pick a new one for ' + esc(rec.nick) + ' (at least 6 characters, used nowhere else). Your progress and points are kept.</p>' +
      '<form class="card" id="fpw"><label>new password <input type="password" id="q1" autocomplete="new-password" required></label><label>new password again <input type="password" id="q2" autocomplete="new-password" required></label>' +
      '<button class="go" type="submit">Save my new password</button></form><p class="msg" id="lm"></p>';
    document.getElementById('fpw').onsubmit = async e => {
      e.preventDefault(); const a = document.getElementById('q1').value, b = document.getElementById('q2').value, m = document.getElementById('lm');
      if (a.length < 6) { m.innerHTML = '<span class="bad">At least 6 characters.</span>'; return; }
      if (a !== b) { m.innerHTML = '<span class="bad">The two passwords are not the same.</span>'; return; }
      app.querySelector('#fpw button').disabled = true; m.textContent = 'Saving…';
      try {
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        const blob = await newBlob({ v: 1, nick: rec.nick, salt, iter: ITER, hash: await pbkdf2(a, salt, ITER), created: rec.created || '' });
        const r = await fetch(API + '/git/refs/' + ACCT + key, { method: 'PATCH', headers: H(), body: JSON.stringify({ sha: blob, force: true }) });
        if (!r.ok) throw new Error('GitHub answered ' + r.status);
        login = { nick: rec.nick, key }; save(KEY_LOGIN, login); loadMe(); try { await pullProgress(); } catch (e2) {} start();
      } catch (err) { app.querySelector('#fpw button').disabled = false; m.innerHTML = '<span class="bad">Could not save (' + esc(err.message || 'offline') + '). Try again in a minute.</span>'; }
    };
  }
  async function logout() { await writeAll(true); login = null; try { localStorage.removeItem(KEY_LOGIN); } catch (e) {} me = { done: {}, wrong: {}, pending: [] }; loginScreen('You are logged out on this device.'); }
  function home() {
    leaveQuestion();
    if (!login) return loginScreen();
    history.replaceState(null, '', location.pathname + TQ);
    app.innerHTML = header() + '<p class="sub">Pick a topic. Play it in the arena (one question after another, harder as you go) or pick the questions yourself.</p><span class="fun" data-fun="home-top"></span><div class="cats" id="cats"></div>' +
      '<p class="fine">For practice only: nothing here counts towards your grade. The leaderboard is just for fun; only your nickname and scores are stored. Time per question is recorded anonymously to improve the course.</p>';
    const box = document.getElementById('cats');
    P.topics.forEach(t => {
      const all = TOP[t.id] || [], done = all.filter(it => me.done[it.id]).length;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cat'; b.disabled = !all.length;
      b.innerHTML = '<span class="n">' + esc(t.name) + '</span><span class="d">' + (all.length ? done + ' of ' + all.length + ' done · ' + score(t.id) + ' points' : 'questions coming soon') + '</span><span class="fun" data-fun="cat" data-topic="' + t.id + '"></span>';
      b.onclick = () => topic(t.id); box.appendChild(b);
    });
    wire(); tutorial();
    fire('arena:screen', { name: 'home', topic: null, mode: null, item: null }); totalChanged();
  }
  // ---------- a topic: Arena or Selection (Addition 9) ----------
  let sel = load('micro-arena-sel' + T, { sort: 'num', f: {} });
  // subsections (Addition 18): only topics whose meta entry has "subs"; the choice is kept per topic on this device
  const subsOf = id => ((P.topics.find(t => t.id === id) || {}).subs || []).filter(x => x.count > 0);
  let subSel = load('micro-arena-sub' + T, {});
  const topicItems = id => { const sub = subSel[id], all = TOP[id] || []; return sub && subsOf(id).some(x => x.id === sub) ? all.filter(it => it.sub === sub) : all; };
  function topic(id, mode) {
    leaveQuestion();
    if (!login) return loginScreen();
    mode = mode || MODE; MODE = mode; save('micro-arena-mode' + T, mode);
    const all = topicItems(id), nDone = all.filter(it => me.done[it.id]).length, subs = subsOf(id);
    history.replaceState(null, '', location.pathname + '?topic=' + encodeURIComponent(id) + (TQ ? '&test' : ''));
    window.scrollTo(0, 0);
    app.innerHTML = header(id, mode) + '<h2>' + esc(topicName(id)) + '</h2><p class="sub">' + esc(TX.dir[id] || '') + '</p>' +
      '<div class="tabs modes"><button type="button" id="mA" class="' + (mode === 'arena' ? 'on' : '') + '">Arena</button><button type="button" id="mS" class="' + (mode === 'select' ? 'on' : '') + '">Selection</button>' +
      (mode === 'select' ? '<select id="srt" aria-label="sort"><option value="num">by number</option><option value="pts">by points</option><option value="lvl">by difficulty</option></select>' : '') + '</div><div id="tb"></div>';
    document.getElementById('mA').onclick = () => topic(id, 'arena'); document.getElementById('mS').onclick = () => topic(id, 'select');
    if (subs.length > 1) {   // All · Equations only · With words
      const row = document.createElement('div'); row.className = 'subs'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'subsection');
      [['', 'All']].concat(subs.map(x => [x.id, x.name])).forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pill' + ((subSel[id] || '') === v ? ' on' : ''); b.dataset.sub = v; b.textContent = l;
        b.onclick = () => { if (v) subSel[id] = v; else delete subSel[id]; save('micro-arena-sub' + T, subSel); topic(id, mode); }; row.appendChild(b); });
      document.querySelector('.modes').after(row);
    }
    wire(id); tutorial();
    const tb = document.getElementById('tb');
    if (mode === 'arena') {   // Start first (Oyun): the button, a grey status line, the rule as small grey text
      const a = arenaState(id), open = all.length - nDone, started = Object.keys(me.done).some(k => byId[k] && byId[k].topic === id);
      tb.innerHTML = '<span class="fun" data-fun="arena-top"></span>' + (open ? '<p class="startrow"><button class="go big" type="button" id="go">' + (started ? 'Continue' : 'Start') + '</button>' : '<p>You have answered every question here. Well done.</p><p class="startrow">') +
        '<span class="sub">Level: ' + a.level + ' · ' + nDone + ' of ' + all.length + ' done · ' + score(id) + ' points</span></p><p class="fine">' + esc(ARENA_RULE) + '</p>';
      const g = document.getElementById('go'); if (g) g.onclick = () => { const it = arenaNext(id); if (it) ask(it, 'arena'); else topic(id, 'arena'); };
      fire('arena:screen', { name: 'topic', topic: id, mode, item: null, level: a.level });
      return;
    }
    const F = sel.f || {};
    tb.innerHTML = '<div class="filters">' + [['ans', 'answered'], ['open', 'not answered']].concat(speedOn ? [['fast', 'done fast']] : []).concat(LV.map(l => [l, l]))
        .map(([k, l]) => '<button type="button" class="pill' + (F[k] ? ' on' : '') + '" data-f="' + k + '" aria-pressed="' + (F[k] ? 'true' : 'false') + '">' + l + '</button>').join('') +
      '</div>' +
      '<p class="fine">The number under each question is the points it gives you now.</p><div id="qg"></div><p class="msg" id="none" hidden>No questions match these filters.</p>';
    const srt = document.getElementById('srt'); srt.value = sel.sort || 'num';
    const DOTS = { easy: '●', medium: '●●', hard: '●●●' };
    const card = (it, i) => {
      const d = me.done[it.id], w = me.wrong[it.id] || 0;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'qc' + (d ? (d.gave ? ' seen' : ' done') : ''); b.dataset.id = it.id;
      b.innerHTML = '<span class="qn">' + (i + 1) + '</span><span class="qp">' + (d ? (d.gave ? '–' : '✓ ' + d.p + (d.fast ? ' ⚡' : '')) : pointsNow(it)) + '</span>' + (!d && w ? '<span class="qw" title="' + w + ' wrong"></span>' : '');
      b.onclick = () => ask(it, 'select'); return b;
    };
    const draw = () => {
      const lv = LV.filter(l => F[l]), st = [F.ans && 'ans', F.open && 'open', F.fast && 'fast'].filter(Boolean);
      let list = all.map((it, i) => ({ it, i })).filter(({ it }) => {
        const d = me.done[it.id];
        if (lv.length && !lv.includes(it.level)) return false;
        if (st.length && !st.some(s => s === 'ans' ? !!d : s === 'open' ? !d : !!(d && d.fast))) return false;
        return true;
      });
      const g = document.getElementById('qg'); g.innerHTML = '';
      if (sel.sort === 'pts') {   // sorted by points: one grid, no headings
        list.sort((a, b) => pointsNow(b.it) - pointsNow(a.it) || a.i - b.i);
        const grid = document.createElement('div'); grid.className = 'qgrid'; list.forEach(({ it, i }) => grid.appendChild(card(it, i))); g.appendChild(grid);
      } else LV.forEach(l => {   // grouped: Easy, Medium, Hard
        const part = list.filter(({ it }) => it.level === l); if (!part.length) return;
        const h = document.createElement('h3'); h.className = 'lvh'; h.textContent = DOTS[l] + ' ' + l[0].toUpperCase() + l.slice(1); g.appendChild(h);
        const grid = document.createElement('div'); grid.className = 'qgrid'; part.forEach(({ it, i }) => grid.appendChild(card(it, i))); g.appendChild(grid);
      });
      document.getElementById('none').hidden = list.length > 0;
    };
    srt.onchange = () => { sel.sort = srt.value; save('micro-arena-sel' + T, sel); draw(); };
    tb.querySelectorAll('.pill').forEach(c => c.onclick = () => { F[c.dataset.f] = !F[c.dataset.f]; c.classList.toggle('on', F[c.dataset.f]); c.setAttribute('aria-pressed', F[c.dataset.f] ? 'true' : 'false'); sel.f = F; save('micro-arena-sel' + T, sel); draw(); });
    draw();
    fire('arena:screen', { name: 'topic', topic: id, mode, item: null });
  }
  // the arena's next question: the current level, then the question type where the student is weakest (fewest right, then slowest);
  // after a wrong answer the same type again; a level that has run out gives the next level up, else down
  function arenaState(id) { me.arena = me.arena || {}; return me.arena[id] = me.arena[id] || { level: 'easy', streak: 0, retry: null }; }
  function arenaNext(id) {
    const a = arenaState(id), open = topicItems(id).filter(it => !me.done[it.id]);
    if (!open.length) return null;
    const order = [a.level].concat(LV.slice(LV.indexOf(a.level) + 1), LV.slice(0, LV.indexOf(a.level)).reverse());
    let pool = [];
    for (const l of order) { pool = open.filter(it => it.level === l); if (pool.length) break; }
    if (a.retry) { const same = pool.filter(it => typeOf(it) === a.retry); if (same.length) pool = same; }
    const stat = t => { const ds = Object.entries(me.done).filter(([k, d]) => byId[k] && typeOf(byId[k]) === t && d.p > 0); return [ds.length, ds.filter(([, d]) => d.fast).length]; };
    const types = [...new Set(pool.map(typeOf))].map(t => [t, ...stat(t)]).sort((x, y) => x[1] - y[1] || x[2] - y[2]);
    const weakest = types[0][0], cands = pool.filter(it => typeOf(it) === weakest);
    return cands[Math.floor(Math.random() * cands.length)];
  }
  function arenaAfter(it, right, fast, firstTry) {
    const a = arenaState(it.topic);
    if (!right) { a.retry = typeOf(it); a.streak = 0; keep(); return; }
    if (!firstTry) { keep(); return; }   // right after a wrong try: the same kind comes next (Utku round 3: the rule says so)
    a.retry = null; a.streak += speedOn && fast ? 2 : 1;
    if (a.streak >= 2 && a.level !== 'hard') { a.level = LV[LV.indexOf(a.level) + 1]; a.streak = 0; }
    keep();
  }
  // ---------- one question ----------
  // the answer bar (Oyun): pinned to the bottom, shown only after an answer: the verdict left, [Show solution] and [Next question] right
  // (Next rightmost; in Selection [Back to the questions]); the solution opens in place under the options (Show/Hide); a new question
  // starts at the top (scrollTo 0, instant); nothing else moves the page. Keys: 1–5 or a–e choose, Enter or → = Next, s = solution.
  let ticker = null, keyH = null;
  const DOTS = { easy: '●', medium: '●●', hard: '●●●' };
  function ask(it, mode) {
    leaveQuestion(); clearInterval(ticker);
    if (keyH) document.removeEventListener('keydown', keyH);
    const L = 'abcde', d = me.done[it.id];
    window.scrollTo(0, 0);
    app.innerHTML = header(it.topic, mode) + '<div class="card" data-id="' + esc(it.id) + '"><div class="qmeta"><span class="lvl">' + (DOTS[it.level] || '') + ' ' + esc(LEVEL[it.level] || it.level) + '</span><span id="pn" class="pts">' +
      (d ? (d.gave ? 'solution seen' : 'done: ' + d.p + ' points') : pointsNow(it) + ' points') + '</span>' +
      (!d && speedOn && !(me.wrong[it.id] > 0) ? '<span id="fb">fast bonus +' + bonusOf(it) + ' within ' + mmss(limitOf(it)) + ' · <span id="clk">0:00</span></span>' : '') + '<span class="fun" data-fun="qmeta"></span></div>' +
      '<p class="qtext">' + tex(it.text) + '</p>' + (it.stem_figure ? '<div class="fig" id="sfig"></div>' : '') +
      (it.statements ? '<ul class="stmts">' + it.statements.map((s, i) => '<li><span class="r">' + ['I.', 'II.', 'III.', 'IV.', 'V.'][i] + '</span>' + tex(s) + '</li>').join('') + '</ul>' : '') +
      (it.question ? '<p class="qtext">' + tex(it.question) + '</p>' : '') +
      '<div class="opts">' + it.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '"><span class="l">' + L[i] + ')</span><span>' + tex(o) + '</span></button>').join('') + '</div>' +
      '<div id="solbox"></div></div><div class="abar" id="abar" hidden><div class="abar-in"><span class="fun" data-fun="abar"></span><span id="verdict" class="verdict"></span><span class="abtn" id="abtn"></span></div></div>';
    wire(it.topic);
    putFig(document.getElementById('sfig'), it.stem_figure);
    const btns = [...app.querySelectorAll('.opt')], bar = document.getElementById('abar'), verdict = document.getElementById('verdict'), abtn = document.getElementById('abtn');
    let right = -1, solOpen = false;
    Promise.all(it.options.map(o => sha(P.salt + it.id + '\n' + o))).then(hs => { right = hs.indexOf(it.h); if (d) done(true); });
    const solution = () => '<div class="sol"><div class="solh">Solution</div>' + (Array.isArray(it.solution) && it.solution.length ? '<ol class="steps">' + it.solution.map(s => '<li>' + tex(s) + '</li>').join('') + '</ol>'
      : it.solution ? tex(it.solution) : '') + (it.figure ? '<div class="fig" id="solfig"></div>' : '') + (it.explanation ? '<p class="expl">' + tex(it.explanation) + '</p>' : '') +
      '<p class="ans">The answer is ' + L[right] + ') ' + tex(it.options[right]) + '.</p></div>';
    const goNext = () => { if (mode === 'arena') { const n = arenaNext(it.topic); n ? ask(n, 'arena') : topic(it.topic, 'arena'); } else { writeAll(false); topic(it.topic, mode); } };
    function toggleSol() {
      const sb = document.getElementById('solbox'), ss = document.getElementById('ss');
      solOpen = !solOpen;
      if (solOpen) { sb.innerHTML = solution(); putFig(document.getElementById('solfig'), it.figure); } else sb.innerHTML = '';   // the solution figure marks the answer: only after the answer (Ulutin)
      if (ss) ss.textContent = solOpen ? 'Hide solution' : 'Show solution';
    }
    function done(again) {
      clearInterval(ticker);
      btns.forEach(x => { x.disabled = true; if (x.classList.contains('wrong')) { x.classList.remove('wrong'); x.classList.add('wasw'); } });   // one green row stands out
      if (btns[right]) btns[right].classList.add('right');
      const dd = me.done[it.id];
      // after the right answer: by "gave" (the solution was opened), not by the points: three wrong tries leave p = 0 with a right answer (Utku round 5)
      verdict.className = 'verdict ' + (dd.gave ? 'no' : 'ok');
      verdict.textContent = dd.gave ? (again ? 'Solution seen.' : 'Solution opened: no points for this one.')
        : again ? 'Done: ' + dd.p + ' points.'
        : dd.p ? 'Correct: +' + dd.p + ' points' + (dd.fast ? ' (with the fast bonus +' + dd.b + ')' : '') + '.'
        : 'Correct, but after three wrong tries this question gives no points.';
      abtn.innerHTML = '<button type="button" id="ss">Show solution</button>' + (mode === 'arena' ? '<button class="go" type="button" id="nx">Next question</button>' : '<button class="go" type="button" id="nx">Back to the questions</button>');
      bar.hidden = false;
      document.getElementById('ss').onclick = toggleSol; document.getElementById('nx').onclick = goNext;
      if (dd.gave && !solOpen) toggleSol();
      const tt = document.getElementById('tot'); if (tt) tt.textContent = score();
      if (!again) { fire('arena:answer', { item: pub(it), ok: !dd.gave, attempt: (dd.w || 0) + 1, points: dd.p, worthNow: 0, mode }); totalChanged(); }
    }
    keyH = e => {
      if (!document.body.contains(bar)) { document.removeEventListener('keydown', keyH); return; }   // only on its own question (Utku round 4)
      if (e.target.closest && e.target.closest('input, textarea, select') || document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase(), i = '12345'.indexOf(k) >= 0 ? '12345'.indexOf(k) : 'abcde'.indexOf(k);
      const nx = !bar.hidden && document.getElementById('nx'), ss = !bar.hidden && document.getElementById('ss');
      if (i >= 0 && k.length === 1 && btns[i] && !btns[i].disabled) { e.preventDefault(); btns[i].click(); }
      else if ((k === 'enter' || k === 'arrowright') && nx) { e.preventDefault(); nx.click(); }
      else if (k === 's' && ss) { e.preventDefault(); ss.click(); }
    };
    document.addEventListener('keydown', keyH);
    fire('arena:screen', { name: 'question', topic: it.topic, mode, item: pub(it), level: mode === 'arena' ? arenaState(it.topic).level : undefined });
    if (d) return;
    clockStart(); current = { it, mode };   // visible time only; the running clock stays (Celebi 14.11: Can asked for the time limit), in grey
    const clk = document.getElementById('clk');
    if (clk) ticker = setInterval(() => { const s = Math.round((clock.acc + (clock.away ? 0 : performance.now() - clock.t0)) / 1000); clk.textContent = mmss(s); if (s > limitOf(it)) { const fb = document.getElementById('fb'); if (fb) fb.classList.add('late'); } }, 1000);
    btns.forEach(b => b.onclick = async () => {
      if (right < 0) return;
      const chosen = +b.dataset.i, ok = chosen === right, secs = clockStop(), w0 = me.wrong[it.id] || 0, worth = pointsNow(it);
      const fast = ok && speedOn && w0 === 0 && secs <= limitOf(it), bonus = fast ? bonusOf(it) : 0;
      me.pending.push({ ts: new Date().toISOString(), client: dev.cid, nick: login.nick, run: RUNID, item: it.id, template: it.cat, slot: it.slot || null, mirrors: null, topic: it.topic, type: typeOf(it),
        level: it.level, mode, points: ok ? worth + bonus : 0, bonus, attempt: w0 + 1, seconds: Math.min(CAP, secs), capped: secs >= CAP, correct: ok, fast, lecturer });
      if (mode === 'arena' && (ok || w0 === 0)) arenaAfter(it, ok, fast, w0 === 0);
      if (ok) { current = null; me.done[it.id] = { p: worth + bonus, b: bonus, fast, w: w0, at: new Date().toISOString() }; keep(); done(false); writeAll(false); return; }
      me.wrong[it.id] = w0 + 1; keep();
      clearInterval(ticker); const fb = document.getElementById('fb'); if (fb) fb.remove();
      b.classList.add('wrong'); b.disabled = true;
      document.getElementById('pn').textContent = pointsNow(it) + ' points';
      verdict.className = 'verdict no'; verdict.textContent = 'Incorrect. Now worth ' + pointsNow(it) + ' points.';
      abtn.innerHTML = '<button class="link" type="button" id="give">show the solution (0 points)</button>'; bar.hidden = false;
      fire('arena:answer', { item: pub(it), ok: false, attempt: w0 + 1, points: 0, worthNow: pointsNow(it), mode });
      document.getElementById('give').onclick = () => { current = null; me.done[it.id] = { p: 0, b: 0, w: me.wrong[it.id] || 0, at: new Date().toISOString(), gave: true }; keep(); done(false); writeAll(false); };
      clockStart(); writeAll(false);
    });
  }
  async function leaderboard(tab) {
    tab = tab || 'all';
    app.innerHTML = header() + '<h2>Leaderboard</h2><div class="tabs" id="tabs"></div><div id="lb" class="msg">Loading…</div><p><button type="button" id="rf">Refresh</button></p>';
    wire();
    const tabs = document.getElementById('tabs');
    [['all', 'Total']].concat(P.topics.map(t => [t.id, t.name])).forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.className = v === tab ? 'on' : ''; b.onclick = () => leaderboard(v); tabs.appendChild(b); });
    document.getElementById('rf').onclick = () => { etag = null; leaderboard(tab); };
    fire('arena:screen', { name: 'leaderboard', topic: null, mode: null, item: null, tab });
    if (login) await writeAll(true);
    try {
      const allRows = (await readBoard()).map(r => ({ ...r, p: tab === 'all' ? r.total : (r.topics[tab] || 0) })).filter(r => r.p > 0).sort((a, b) => b.p - a.p || a.ts - b.ts), rows = allRows.slice(0, 50);
      document.getElementById('lb').innerHTML = '<span class="fun" data-fun="lb-top"></span>' + (rows.length ? '<table class="lb"><tr><th>#</th><th>nickname</th><th class="p">points</th></tr>' + rows.map((r, i) => '<tr' + (login && r.key === login.key ? ' class="mine"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.nick) + '</td><td class="p">' + r.p + '</td></tr>').join('') + '</table>' : 'No scores yet.');
      fire('arena:board', { tab, rows: allRows });   // every row with points (the staircase draws the whole class); the table shows 50
    } catch (e) { document.getElementById('lb').innerHTML = '<span class="bad">Could not load the leaderboard (' + esc(e.message || 'offline') + '). Try again in a minute.</span>'; }
  }
  function start() {
    const t = params.get('topic');
    if (!login) return loginScreen();
    if (t && P.topics.some(x => x.id === t)) { params.delete('topic'); return topic(t); }
    home();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeAll(true); });
  window.addEventListener('pagehide', () => writeAll(true));
  if (login) pullProgress().then(() => { const tt = document.getElementById('tot'); if (tt) tt.textContent = score(); }).catch(() => {});
  start();
  let boardCache = null;
  window.MicroPractice = { version: 2, session: SESSION, score, pointsNow: id => byId[id] && pointsNow(byId[id]), ladder: (id, k) => byId[id] && ladder(byId[id], k),
    fun: { v: 1,
      user: () => login ? { nick: login.nick, key: login.key } : null,
      topics: () => P.topics.map(t => ({ id: t.id, name: t.name })),
      items: id => (TOP[id] || []).map(pub),
      done: () => JSON.parse(JSON.stringify(me.done || {})), wrong: () => JSON.parse(JSON.stringify(me.wrong || {})),
      score, pointsNow: id => byId[id] ? pointsNow(byId[id]) : 0,
      ladder: (level, k) => ladder({ level }, k), afterWrong: (value, w) => stepDown({}, value, w), floor: level => floorOf({ level }),
      board: () => { if (boardCache && Date.now() - boardCache.t < 60000) return Promise.resolve(boardCache.rows);
        return readBoard().then(rows => { const r = rows.map(x => ({ key: x.key, nick: x.nick, total: x.total, topics: Object.assign({}, x.topics) })); boardCache = { t: Date.now(), rows: r }; return r; }); },
      get: name => ((me.fun || {})[name]), set: (name, value) => { if (!login || name === 'awards') return; me.fun = me.fun || {}; me.fun[name] = value; keep(); writeAll(false); },
      award: name => { if (!login || !AWARDS[name]) return; me.fun = me.fun || {}; me.fun.awards = me.fun.awards || {}; if (me.fun.awards[name]) return;
        me.fun.awards[name] = new Date().toISOString(); keep(); const tt = document.getElementById('tot'); if (tt) tt.textContent = score(); totalChanged(); writeAll(false); },
      go: where => { leaveQuestion(); closeMenus(); where === 'leaderboard' ? leaderboard() : home(); } } };
})();
