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
  function stepDown(it, p, w) { const f = floorOf(it); for (let i = 0; i < w && p > f; i++) p = primeBelow(p); return Math.max(p, f); }
  const typeOf = it => it.type || it.cat;
  const rightInType = (type, except) => Object.entries(me.done).filter(([id, d]) => id !== except && d.p > 0 && byId[id] && typeOf(byId[id]) === type).length;
  function pointsNow(it) { return stepDown(it, ladder(it, rightInType(typeOf(it), it.id) + 1), me.wrong[it.id] || 0); }
  const score = topic => Object.entries(me.done).reduce((a, [id, d]) => a + (byId[id] && (!topic || byId[id].topic === topic) ? (d.p || 0) : 0), 0);

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
    const total = score(), ts = P.topics.map(t => t.id + '.' + score(t.id)).join('_'), sig = total + '|' + ts + '|' + JSON.stringify(me.wrong).length;
    if (sig === me.wrote && !me.pending.length) return;
    if (!force && Date.now() - lastWrite < WRITE_EVERY) return;
    lastWrite = Date.now();
    try {
      try { await sendTimes(force); } catch (e) {}
      if (sig === me.wrote) return;
      const blob = await newBlob({ v: 1, nick: login.nick, done: me.done, wrong: me.wrong, ts: new Date().toISOString() }, force);
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

  // ---------- screens ----------
  const params = new URLSearchParams(location.search);
  const header = () => '<div class="bar"><h1><a href="./' + (SESSION === 'test' && !LOCAL ? '?test' : '') + '" id="homeL">Midterm practice</a></h1>' + (login ? '<span class="me">logged in as <b>' + esc(login.nick) + '</b> · <span id="tot">' + score() + '</span> points · <button class="link" id="lbl" type="button">leaderboard</button> · <button class="link" id="out" type="button">log out</button></span>' : '') + '</div>';
  function wire() {
    const l = document.getElementById('lbl'); if (l) l.onclick = () => leaderboard();
    const o = document.getElementById('out'); if (o) o.onclick = logout;
    const h = document.getElementById('homeL'); if (h) h.onclick = e => { e.preventDefault(); home(); };
  }
  const WARN = '<p class="warn"><b>One nickname per student.</b> Make one account and keep it: log in with the same nickname and password on every device. A second nickname splits your progress. Do not use your real name, and pick a password you use nowhere else (this page is for practice, its security is light).</p>';
  function loginScreen(msg) {
    app.innerHTML = header() + '<p class="sub">Practice questions for the midterm. Log in, or make your account once.</p>' + WARN +
      '<div class="forms"><form class="card" id="fin"><h2>Log in</h2><label>nickname <input type="text" id="n1" maxlength="16" autocomplete="username" required></label>' +
      '<label>password <input type="password" id="p1" autocomplete="current-password" required></label><button class="go" type="submit">Log in</button></form>' +
      '<form class="card" id="fnew"><h2>New account</h2><label>nickname <input type="text" id="n2" maxlength="16" autocomplete="username" required></label>' +
      '<label>password <input type="password" id="p2" autocomplete="new-password" required></label><label>password again <input type="password" id="p3" autocomplete="new-password" required></label>' +
      '<button type="submit">Make my account</button></form></div><p class="msg" id="lm">' + (msg || 'Nickname: 2 to 16 letters, digits, - or _. Password: at least 6 characters.') + '</p>';
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
    if (!login) return loginScreen();
    history.replaceState(null, '', location.pathname + (SESSION === 'test' && !LOCAL ? '?test' : ''));
    app.innerHTML = header() + '<p class="sub">Pick a topic. In a topic you see all its questions with the points each gives now; answer them in any order.</p><div class="cats" id="cats"></div>' +
      '<p class="fine">For practice only: nothing here counts towards your grade. The leaderboard is just for fun; only your nickname and scores are stored. Time per question is recorded anonymously to improve the course.</p>';
    const box = document.getElementById('cats');
    P.topics.forEach(t => {
      const all = TOP[t.id] || [], done = all.filter(it => me.done[it.id]).length;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cat'; b.disabled = !all.length;
      b.innerHTML = '<span class="n">' + esc(t.name) + '</span><span class="d">' + (all.length ? done + ' of ' + all.length + ' done · ' + score(t.id) + ' points' : 'questions coming soon') + '</span>';
      b.onclick = () => topic(t.id); box.appendChild(b);
    });
    wire();
  }
  const LEVEL = { easy: 'easy', medium: 'medium', hard: 'hard' };
  function topic(id) {
    if (!login) return loginScreen();
    const all = TOP[id] || [];
    history.replaceState(null, '', location.pathname + '?topic=' + encodeURIComponent(id) + (SESSION === 'test' && !LOCAL ? '&test' : ''));
    app.innerHTML = header() + '<h2>' + esc(topicName(id)) + '</h2><p class="sub">' + all.filter(it => me.done[it.id]).length + ' of ' + all.length + ' done · ' + score(id) +
      ' points. Each card shows the points it gives now: the first right answers of a kind give the most, and each wrong try costs a little.</p><div class="qgrid" id="qg"></div><p><button type="button" id="back">All topics</button></p>';
    const g = document.getElementById('qg');
    all.forEach((it, i) => {
      const d = me.done[it.id], w = me.wrong[it.id] || 0;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'qc ' + (it.level || '') + (d ? ' done' : '');
      b.innerHTML = '<span class="qn">' + (i + 1) + '</span><span class="ql">' + esc(LEVEL[it.level] || it.level || '') + '</span><span class="qp">' +
        (d ? (d.p ? '✓ ' + d.p : 'solution seen') : pointsNow(it) + ' points') + '</span>' + (!d && w ? '<span class="qw">' + w + ' wrong ' + (w === 1 ? 'try' : 'tries') + '</span>' : '');
      b.onclick = () => ask(it); g.appendChild(b);
    });
    document.getElementById('back').onclick = home; wire();
  }
  function ask(it) {
    const L = 'abcde', d = me.done[it.id];
    app.innerHTML = header() + '<h2>' + esc(topicName(it.topic)) + '</h2><div class="card"><div class="qmeta"><span>' + esc(LEVEL[it.level] || it.level) + '</span><span id="pn">' +
      (d ? (d.p ? 'done: ' + d.p + ' points' : 'solution seen') : 'worth ' + pointsNow(it) + ' points now') + '</span></div>' +
      '<p class="qtext">' + tex(it.text) + '</p>' + (it.stem_figure ? '<div class="fig" id="sfig"></div>' : '') +
      (it.statements ? '<ul class="stmts">' + it.statements.map((s, i) => '<li><span class="r">' + ['I.', 'II.', 'III.', 'IV.', 'V.'][i] + '</span>' + tex(s) + '</li>').join('') + '</ul>' : '') +
      (it.question ? '<p class="qtext">' + tex(it.question) + '</p>' : '') +
      '<div class="opts">' + it.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '"><span class="l">' + L[i] + ')</span><span>' + tex(o) + '</span></button>').join('') + '</div>' +
      '<div id="after"></div></div><p><button type="button" id="back">Back to the questions</button></p>';
    document.getElementById('back').onclick = () => { writeAll(false); topic(it.topic); }; wire();
    putFig(document.getElementById('sfig'), it.stem_figure);
    const btns = [...app.querySelectorAll('.opt')], after = document.getElementById('after');
    let right = -1;
    Promise.all(it.options.map(o => sha(P.salt + it.id + '\n' + o))).then(hs => { right = hs.indexOf(it.h); if (d) reveal(true); });
    function reveal(again) {
      btns.forEach(x => x.disabled = true); if (btns[right]) btns[right].classList.add('right');
      const dd = me.done[it.id];
      after.innerHTML = (again ? '' : '<p class="verdict ' + (dd.p ? 'ok' : 'no') + '">' + (dd.p ? 'Correct: +' + dd.p + ' points.' : 'Solution opened: no points for this one.') + '</p>') +
        '<div class="sol"><div class="solh">Solution</div>' + (Array.isArray(it.solution) && it.solution.length ? '<ol class="steps">' + it.solution.map(s => '<li>' + tex(s) + '</li>').join('') + '</ol>'
          : it.solution ? tex(it.solution) : '') + (it.figure ? '<div class="fig" id="solfig"></div>' : '') + (it.explanation ? '<p class="expl">' + tex(it.explanation) + '</p>' : '') +
        '<p class="ans">The answer is ' + L[right] + ') ' + tex(it.options[right]) + '.</p></div>' +
        '<div class="next"><button class="go" type="button" id="nx">Back to the questions</button></div>';
      putFig(document.getElementById('solfig'), it.figure);   // the solution figure marks the answer: only after the right answer (Ulutin)
      const nx = document.getElementById('nx'); nx.onclick = () => topic(it.topic); nx.focus();
      const tt = document.getElementById('tot'); if (tt) tt.textContent = score();
    }
    if (d) return;
    clockStart();
    btns.forEach(b => b.onclick = async () => {
      if (right < 0) return;
      const chosen = +b.dataset.i, ok = chosen === right, secs = clockStop(), worth = pointsNow(it);
      me.pending.push({ ts: new Date().toISOString(), client: dev.cid, nick: login.nick, run: RUNID, item: it.id, template: it.cat, slot: it.slot || null, mirrors: null, topic: it.topic, type: typeOf(it),
        level: it.level, points: ok ? worth : 0, attempt: (me.wrong[it.id] || 0) + 1, seconds: Math.min(CAP, secs), capped: secs >= CAP, correct: ok, lecturer });
      if (ok) { me.done[it.id] = { p: worth, w: me.wrong[it.id] || 0, at: new Date().toISOString() }; keep(); reveal(false); writeAll(false); return; }
      me.wrong[it.id] = (me.wrong[it.id] || 0) + 1; keep();
      b.classList.add('wrong'); b.disabled = true;
      document.getElementById('pn').textContent = 'worth ' + pointsNow(it) + ' points now';
      after.innerHTML = '<p class="verdict no">Not this one. Try again: now worth ' + pointsNow(it) + ' points.</p><div class="next"><button class="link" type="button" id="give">show the solution (0 points)</button></div>';
      document.getElementById('give').onclick = () => { me.done[it.id] = { p: 0, w: me.wrong[it.id] || 0, at: new Date().toISOString(), gave: true }; keep(); reveal(false); writeAll(false); };
      clockStart(); writeAll(false);
    });
  }
  async function leaderboard(tab) {
    tab = tab || 'all';
    app.innerHTML = header() + '<h2>Leaderboard</h2><div class="tabs" id="tabs"></div><div id="lb" class="msg">Loading…</div><p><button type="button" id="back">Back to the questions</button> <button type="button" id="rf">Refresh</button></p>';
    document.getElementById('back').onclick = home; wire();
    const tabs = document.getElementById('tabs');
    [['all', 'Total']].concat(P.topics.map(t => [t.id, t.name])).forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.className = v === tab ? 'on' : ''; b.onclick = () => leaderboard(v); tabs.appendChild(b); });
    document.getElementById('rf').onclick = () => { etag = null; leaderboard(tab); };
    if (login) await writeAll(true);
    try {
      const rows = (await readBoard()).map(r => ({ ...r, p: tab === 'all' ? r.total : (r.topics[tab] || 0) })).filter(r => r.p > 0).sort((a, b) => b.p - a.p || a.ts - b.ts).slice(0, 50);
      document.getElementById('lb').innerHTML = rows.length ? '<table class="lb"><tr><th>#</th><th>nickname</th><th class="p">points</th></tr>' + rows.map((r, i) => '<tr' + (login && r.key === login.key ? ' class="mine"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.nick) + '</td><td class="p">' + r.p + '</td></tr>').join('') + '</table>' : 'No scores yet.';
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
  window.MicroPractice = { version: 2, session: SESSION, score, pointsNow: id => byId[id] && pointsNow(byId[id]), ladder: (id, k) => byId[id] && ladder(byId[id], k) };
})();
