// Midterm practice (Can 12.11, specs/Practice-arena.md): nickname → category → one question at a time → right or wrong at once, the short
// solution, next. Points by level, once per question and only for a right first answer. A leaderboard by nickname, overall and per category.
// Questions come from practice/items.js (24_quiz-builder/practice_build.py): variants of exam items and the signed template items, never
// an exam item itself.
// Honest limits (assume cheating): each answer is checked in this page against sha256(salt + id + "\n" + option). That keeps keys out of
// plain view only: trying the 4–5 options takes seconds, and the solution shown after an answer gives the key away. Scores are written
// with the public data token, so anyone can write any score. The leaderboard is for fun, not for grades.
// Leaderboard storage, like the polls: one git ref per player in the data repo,
//   refs/heads/v/<session>/practice/<ts>--<cid>--<nick>--<total>--<CAT.points_CAT.points>
// A new score writes a new ref and then deletes the player's previous one, so one API call reads the whole board.
// Time per answer (Can 12.11, Addition 3; Hande's format): one record per answer {ts, client, nick, run, item, template, slot, mirrors,
// level, points, attempt, seconds, capped, correct, lecturer}; seconds = visible time only, capped at 900. Records wait on the device
// and go as one batch: a blob + a tag ref t/<session>/practice-times/<ts>--<cid>, exported by tools/export_practice.py.
// Writes are throttled (one shared token): scores and times together at most every 5 minutes, and when the page is hidden or left.
(function () {
  'use strict';
  const D = window.PRACTICE, CFG = window.MICRO_CONFIG || {}, GH = CFG.github || {};
  const app = document.getElementById('app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (!D || !Array.isArray(D.items)) { app.innerHTML = '<h1>Midterm practice</h1><p class="bad">The questions could not be loaded. Please reload.</p>'; return; }
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const SESSION = /[?&]test\b/.test(location.search) || LOCAL ? 'test' : (CFG.session || 'default');
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;
  const PREFIX = 'heads/v/' + SESSION + '/practice/';
  const KEY = 'micro-practice-v1' + (SESSION === 'test' ? '-test' : '');
  const WRITE_EVERY = 300000, CAP = 900;
  const cats = D.categories, byCat = id => D.items.filter(it => it.cat === id);

  // ---------- this device's progress: {nick, cid, done: {id: 1 right first time | 0 wrong}, ref, wrote} ----------
  let me = {};
  try { me = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { me = {}; }
  if (!me.cid) me.cid = Math.random().toString(36).slice(2, 10);
  me.done = me.done || {}; me.attempts = me.attempts || {}; me.pending = me.pending || [];
  let lecturer = false; try { lecturer = !!localStorage.getItem('micro-teacher-code'); } catch (e) {}
  let RUNID = '';
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(me)); } catch (e) {} };
  keep();
  const pointsOf = id => { const it = D.items.find(x => x.id === id); return it ? it.points : 0; };
  function score(cat) { let s = 0; for (const [id, ok] of Object.entries(me.done)) { if (ok !== 1) continue; const it = D.items.find(x => x.id === id); if (it && (!cat || it.cat === cat)) s += it.points; } return s; }

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

  // ---------- GitHub refs ----------
  const H = () => ({ Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' });
  let mainSha = null, lastWrite = 0, writing = false, etag = null, board = null;
  async function sendTimes(force) {
    if (!me.pending.length) return;
    const batch = me.pending.slice(0, 200);
    const b = await fetch(API + '/git/blobs', { method: 'POST', headers: H(), body: JSON.stringify({ content: JSON.stringify({ v: 1, session: SESSION, client: me.cid, records: batch }), encoding: 'utf-8' }), keepalive: !!force });
    if (b.status !== 201) return;
    const blob = (await b.json()).sha;
    const r = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: 'refs/tags/t/' + SESSION + '/practice-times/' + Date.now() + '--' + me.cid, sha: blob }), keepalive: !!force });
    if (r.ok || r.status === 422) { me.pending = me.pending.slice(batch.length); keep(); }
  }
  async function writeScore(force) {
    if (!TOKEN || !me.nick || writing) return;
    const total = score(), cs = cats.map(c => c.id + '.' + score(c.id)).join('_');
    const sig = total + '|' + cs + '|' + me.nick;
    if (sig === me.wrote && !me.pending.length) return;
    if (!force && Date.now() - lastWrite < WRITE_EVERY) return;
    writing = true; lastWrite = Date.now();
    try {
      try { await sendTimes(force); } catch (e) {}
      if (sig === me.wrote) return;
      if (!mainSha) { const r = await fetch(API + '/git/ref/heads/main', { headers: H(), cache: 'no-store' }); if (!r.ok) throw 0; mainSha = (await r.json()).object.sha; }
      const name = 'refs/' + PREFIX + Date.now() + '--' + me.cid + '--' + me.nick + '--' + total + '--' + cs;
      const w = await fetch(API + '/git/refs', { method: 'POST', headers: H(), body: JSON.stringify({ ref: name, sha: mainSha }), keepalive: !!force });
      if (w.ok || w.status === 422) {
        const old = me.ref; me.ref = name; me.wrote = sig; keep();
        if (old && old !== name) fetch(API + '/git/' + old, { method: 'DELETE', headers: H(), keepalive: true }).catch(() => {});
      }
    } catch (e) { /* next time */ } finally { writing = false; }
  }
  async function readBoard() {
    if (!TOKEN) return [];
    const h = H(); if (etag) h['If-None-Match'] = etag;
    const r = await fetch(API + '/git/matching-refs/' + PREFIX, { headers: h, cache: 'no-store' });
    if (r.status === 304 && board) return board;
    if (!r.ok) throw new Error('GitHub answered ' + r.status);
    etag = r.headers.get('ETag');
    const latest = {};
    (await r.json()).forEach(x => {
      const m = x.ref.slice(('refs/' + PREFIX).length).match(/^(\d+)--([a-z0-9]{4,12})--([A-Za-z0-9_-]{2,16})--(\d{1,6})--([\w.]*)$/);
      if (!m) return;
      const row = { ts: +m[1], cid: m[2], nick: m[3], total: +m[4], cats: Object.fromEntries(m[5].split('_').filter(Boolean).map(p => p.split('.')).map(([c, v]) => [c, +v])) };
      if (!latest[row.cid] || latest[row.cid].ts < row.ts) latest[row.cid] = row;
    });
    board = Object.values(latest); return board;
  }

  // ---------- screens ----------
  const header = () => '<div class="bar"><h1>Midterm practice</h1>' + (me.nick ? '<span class="me"><b>' + esc(me.nick) + '</b> · ' + score() + ' points · <button class="link" id="lbl" type="button">leaderboard</button> · <button class="link" id="nick" type="button">change name</button></span>' : '') + '</div>';
  function wire() {
    const l = document.getElementById('lbl'); if (l) l.onclick = () => leaderboard();
    const n = document.getElementById('nick'); if (n) n.onclick = () => askNick();
  }
  function askNick(msg) {
    app.innerHTML = header() + '<p class="sub">Practice questions for the midterm, one at a time. Pick a nickname: it is the only name on the leaderboard. Do not use your real name.</p>' +
      '<p><input type="text" id="nk" maxlength="16" autocomplete="off" placeholder="nickname" value="' + esc(me.nick || '') + '"> <button class="go" id="ok" type="button">Start</button></p>' +
      '<p class="msg" id="nm">' + (msg || '2 to 16 characters: letters, digits, - and _.') + '</p>';
    const f = document.getElementById('nk'), go = () => {
      const v = f.value.trim();
      if (!/^[A-Za-z0-9_-]{2,16}$/.test(v)) { document.getElementById('nm').innerHTML = '<span class="bad">2 to 16 characters: letters, digits, - and _ only.</span>'; return; }
      const changed = me.nick && me.nick !== v; me.nick = v; keep(); if (changed) writeScore(true); home();
    };
    document.getElementById('ok').onclick = go; f.onkeydown = e => { if (e.key === 'Enter') go(); }; f.focus();
  }
  function home() {
    if (!me.nick) return askNick();
    app.innerHTML = header() + '<p class="sub">Choose a category. Each question gives its points once, for a right first answer.</p><div class="cats" id="cats"></div>' +
      '<p class="fine">For practice only. Answers are checked in your browser, and nothing here counts towards your grade. The leaderboard is just for fun; only your nickname and scores are stored. Time per question is recorded anonymously to improve the course.</p>';
    const box = document.getElementById('cats');
    cats.forEach(c => {
      const all = byCat(c.id), done = all.filter(it => it.id in me.done).length;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cat';
      b.innerHTML = '<span class="n">' + esc(c.name) + '</span><span class="d">' + done + ' of ' + all.length + ' done · ' + score(c.id) + ' points</span>';
      b.onclick = () => { RUNID = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); ask(c.id); }; box.appendChild(b);
    });
    wire();
  }
  function pick(cat) {
    const open = byCat(cat).filter(it => !(it.id in me.done));
    return open.length ? open[Math.floor(Math.random() * open.length)] : null;
  }
  function ask(cat, it) {
    it = it || pick(cat);
    const c = cats.find(x => x.id === cat);
    if (!it) { app.innerHTML = header() + '<h2>' + esc(c.name) + '</h2><p>You have done every question here. Well done.</p><p><button type="button" id="back">Other categories</button></p>'; document.getElementById('back').onclick = home; wire(); return; }
    const L = 'abcde';
    app.innerHTML = header() + '<h2>' + esc(c.name) + '</h2><div class="card"><div class="qmeta"><span>' + it.points + ' points</span><span>' + byCat(cat).filter(x => x.id in me.done).length + ' of ' + byCat(cat).length + ' done</span></div>' +
      '<p class="qtext">' + tex(it.text) + '</p>' +
      (it.stem_figure ? '<div class="fig" id="sfig"></div>' : '') +
      (it.statements ? '<ul class="stmts">' + it.statements.map((s, i) => '<li><span class="r">' + ['I.', 'II.', 'III.', 'IV.', 'V.'][i] + '</span>' + tex(s) + '</li>').join('') + '</ul>' : '') +
      (it.question ? '<p class="qtext">' + tex(it.question) + '</p>' : '') +
      '<div class="opts">' + it.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '"><span class="l">' + L[i] + ')</span><span>' + tex(o) + '</span></button>').join('') + '</div>' +
      '<div id="after"></div></div><p><button class="link" type="button" id="back">other categories</button></p>';
    document.getElementById('back').onclick = () => { writeScore(true); home(); }; wire();
    putFig(document.getElementById('sfig'), it.stem_figure);
    clockStart();
    const btns = [...app.querySelectorAll('.opt')];
    btns.forEach(b => b.onclick = async () => {
      btns.forEach(x => x.disabled = true);
      const secs = clockStop();
      const hs = await Promise.all(it.options.map(o => sha(D.salt + it.id + '\n' + o)));
      const right = hs.indexOf(it.h), chosen = +b.dataset.i, ok = chosen === right;
      if (!(it.id in me.done)) me.done[it.id] = ok ? 1 : 0;
      me.attempts[it.id] = (me.attempts[it.id] || 0) + 1;
      me.pending.push({ ts: new Date().toISOString(), client: me.cid, nick: me.nick, run: RUNID, item: it.id, template: it.cat, slot: it.slot || null, mirrors: it.mirrors || null,
        level: it.level, points: it.points, attempt: me.attempts[it.id], seconds: Math.min(CAP, secs), capped: secs >= CAP, correct: ok, lecturer });
      keep();
      btns[right] && btns[right].classList.add('right'); if (!ok) b.classList.add('wrong');
      document.getElementById('after').innerHTML = '<p class="verdict ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'Correct: +' + it.points + ' points.' : 'Incorrect.') + '</p>' +
        // the solution, step by step with the numbers (Can, via Celebi 12.11): a list of steps, open at once; a single line still works
        '<div class="sol"><div class="solh">Solution</div>' + (Array.isArray(it.solution) && it.solution.length ? '<ol class="steps">' + it.solution.map(s => '<li>' + tex(s) + '</li>').join('') + '</ol>'
          : it.solution ? tex(it.solution) : '') + (it.figure ? '<div class="fig" id="solfig"></div>' : '') + (it.explanation ? '<p class="expl">' + tex(it.explanation) + '</p>' : '') +
        '<p class="ans">The answer is ' + L[right] + ') ' + tex(it.options[right]) + '.</p></div>' +
        '<div class="next"><button class="go" type="button" id="nx">Next question</button></div>';
      putFig(document.getElementById('solfig'), it.figure);   // the solution figure marks the answer: only after answering (Ulutin)
      const nx = document.getElementById('nx'); nx.onclick = () => ask(cat); nx.focus();
      app.querySelector('.me') && (app.querySelector('.me').firstElementChild.nextSibling.textContent = ' · ' + score() + ' points · ');
      writeScore(false);
    });
  }
  async function leaderboard(tab) {
    tab = tab || 'all';
    app.innerHTML = header() + '<h2>Leaderboard</h2><div class="tabs" id="tabs"></div><div id="lb" class="msg">Loading…</div><p><button type="button" id="back">Back to the questions</button> <button type="button" id="rf">Refresh</button></p>';
    document.getElementById('back').onclick = home; wire();
    const tabs = document.getElementById('tabs');
    [['all', 'Overall']].concat(cats.map(c => [c.id, c.name])).forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.className = v === tab ? 'on' : ''; b.onclick = () => leaderboard(v); tabs.appendChild(b); });
    document.getElementById('rf').onclick = () => { etag = null; leaderboard(tab); };
    await writeScore(true);
    try {
      const rows = (await readBoard()).map(r => ({ ...r, p: tab === 'all' ? r.total : (r.cats[tab] || 0) })).filter(r => r.p > 0).sort((a, b) => b.p - a.p || a.ts - b.ts).slice(0, 50);
      document.getElementById('lb').innerHTML = rows.length ? '<table class="lb"><tr><th>#</th><th>nickname</th><th class="p">points</th></tr>' + rows.map((r, i) => '<tr' + (r.cid === me.cid ? ' class="mine"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(r.nick) + '</td><td class="p">' + r.p + '</td></tr>').join('') + '</table>' : 'No scores yet.';
    } catch (e) { document.getElementById('lb').innerHTML = '<span class="bad">Could not load the leaderboard (' + esc(e.message || 'offline') + '). Try again in a minute.</span>'; }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeScore(true); });
  window.addEventListener('pagehide', () => writeScore(true));
  home();
  window.MicroPractice = { version: 1, session: SESSION, score };
})();
