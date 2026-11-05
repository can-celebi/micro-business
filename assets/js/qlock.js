// Questions the lecturer unlocks one by one (Can, 05.11: "each questions unlock button should be on their page and just say unlock and it should unlock that question").
// lectures/Lxx/locked.json (tools/build_qlock.js) holds everything encrypted: each question under its own random key, and for the lecturer the
// question keys, solutions and pictures under a key made from the lecturer code. The file is public, so nothing locked is readable from it.
// Every question starts locked, in any order. Unlocking question n writes a ref into the data repo whose value IS that question's key, so a forged
// ref can't decrypt anything and is ignored. Every device reads those refs every few seconds with an ETag (a 304 is free).
(function () {
  const MP = window.MicroPoll, CFG = window.MICRO_CONFIG || {}, GH = CFG.github || {};
  if (!MP || !document.querySelector('.reveal') || /print-pdf/.test(location.search)) return;
  const LEC = document.body.dataset.lecture;
  const TOKEN = (GH.tokenParts || []).length ? atob(GH.tokenParts.join('')) : '';
  const API = 'https://api.github.com/repos/' + GH.owner + '/' + GH.repo;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // a rehearsal can start clean: ?lockrun=x, only in the test session, keeps its unlocks apart
  const runM = MP.session === 'test' && location.search.match(/[?&]lockrun=([A-Za-z0-9]+)/);
  const POLL = LEC + '-unlock' + (runM ? '-' + runM[1] : '') + '-q';
  const PREFIX = 'heads/v/' + MP.session + '/' + POLL;
  // All students share one token, and GitHub has a per-minute limit on it that a lockout would also take sign-in down with (Utku 05.11).
  const STUDENT_EVERY = 12000, TEACHER_EVERY = 6000, LOCKOUT = 60000;
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const enc = s => new TextEncoder().encode(s), dec = b => new TextDecoder().decode(b);
  const hexToBytes = h => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16)));
  const bytesToHex = u => [...u].map(x => x.toString(16).padStart(2, '0')).join('');
  const aes = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const open = async (key, box) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));

  const startHash = location.hash;   // read now: Reveal resets a hash whose slide isn't there yet
  let data = null, teacherKey = null, etag = null, failures = 0, pauseUntil = 0;
  const qs = [];   // per question: {n, section, teacher, keyHex}
  const unlocked = new Set();   // questions confirmed open for students

  const css = document.createElement('style');
  css.textContent = `
  /* only the slide on screen may paint: a question just added must not show over it (Can, 05.11) */
  .reveal:not(.overview) .slides > section[data-q]:not(.present) { display: none !important; }
  .lq-parts { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5em 1.2em; margin-top: 0.5em; align-items: start; }
  .lq-part { margin: 0; padding: 0.3em 0.6em; border-left: 3px solid #bbb; font-size: 0.72em; line-height: 1.45; text-align: left; }
  .lq-n { font-weight: 600; font-size: 0.8em; color: #555; }
  .lq-u, .lq-b { margin: 0.1em 0; }
  .lq-u math, .lq-b math { font-size: 1.1em; }
  .lq-t { display: inline-flex; gap: 6px; margin-left: 0.8em; vertical-align: middle; }
  .lq-btn { font: 13px "Inter", system-ui, sans-serif; background: #fff; color: #333; border: 1.5px solid #bbb; border-radius: 4px; padding: 3px 9px; cursor: pointer; }
  .lq-btn:hover { border-color: #333; }
  .lq-unlock { position: absolute; left: 34%; top: 0.3em; font-size: 15px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; z-index: 5; }
  .lq-unlock .lq-btn { font-size: 16px; padding: 6px 16px; background: #FFF9D0; border-color: #333; }
  .lq-unlock .lq-btn[disabled] { background: #eee; border-color: #ccc; color: #777; cursor: default; }
  #lq-wait { margin-top: 1em; font: 18px "Inter", system-ui, sans-serif; color: #555; }
  .lq-st { font-family: "Inter", system-ui, sans-serif; color: #333; }
  .lq-st.bad { color: #B71C1C; font-weight: 600; }
  #lq-note { position: fixed; left: 50%; transform: translateX(-50%); bottom: 12px; z-index: 70; background: #FFF9D0; color: #111; border: 1.5px solid #333; border-radius: 5px; padding: 6px 14px; font: 15px "Inter", system-ui, sans-serif; display: none; max-width: 90vw; }
  #lq-note.bad { background: #fff; border-color: #B71C1C; color: #B71C1C; font-weight: 600; }
  #lq-view { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; padding: 12px; box-sizing: border-box; }
  #lq-box { background: #fff; color: #111; max-width: min(1000px, 96vw); max-height: 92vh; overflow: auto; border-radius: 6px; padding: 16px 20px; font: 17px/1.5 "Inter", system-ui, sans-serif; text-align: left; position: relative; box-sizing: border-box; }
  #lq-box svg { max-width: 100%; height: auto; max-height: 76vh; display: block; margin: 0 auto; }
  #lq-box h4 { margin: 0.7em 0 0.2em; font-size: 1em; }
  #lq-close { position: sticky; top: 0; float: right; font: 15px "Inter", system-ui, sans-serif; background: #fff; color: #111; border: 1.5px solid #333; border-radius: 4px; padding: 3px 12px; cursor: pointer; z-index: 2; }
  .lq-part math, #lq-box math { font-family: "STIX Two Math", "Cambria Math", serif; }
  html.mobile .reveal .lq-part.fragment:not(.visible) { display: none !important; }   /* the phone layout shows all steps at once; parts come one at a time here too */
  /* phone (Can, 05.11): one part on screen at a time, so nothing runs off the bottom of a page that doesn't scroll; large math; the title clear of the tools */
  html.mobile .reveal .lq-part.fragment.visible:not(.current-fragment) { display: none !important; }
  html.mobile .reveal .slides > section[data-q] > h2, html.mobile .reveal .slides > section[id$="-signin"] > h2 { margin-top: 34px !important; }
  html.mobile .reveal .slides > section[data-q] > h2 { display: inline-block; margin-bottom: 0.2em; }
  html.mobile .lq-parts { display: block; margin-top: 0.8em; }
  html.mobile .lq-parts::after { display: block; font: 19px "Inter", system-ui, sans-serif; color: #555; }
  html.mobile section[data-q]:not(:has(.lq-part.visible)) .lq-parts::after { content: "tap → for Part 1"; }
  html.mobile .lq-part { font-size: 1em; margin: 0; padding: 0.3em 0 0.3em 0.7em; border-left-width: 4px; }
  html.mobile .lq-n { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; color: #333; }
  html.mobile .lq-t { display: flex; margin: 0; gap: 8px; }
  html.mobile .lq-t .lq-btn { font-size: 16px; font-weight: 400; padding: 7px 14px; min-height: 40px; }
  html.mobile .lq-u, html.mobile .lq-b { font-size: min(26px, 6.6vw); line-height: 1.5; margin: 0.35em 0; white-space: nowrap; }
  html.mobile .lq-unlock { position: static; display: inline-flex; margin: 0 0 0.2em 14px; vertical-align: middle; }
  html.mobile .lq-unlock .lq-btn { font-size: 18px; padding: 8px 22px; min-height: 44px; }
  html.mobile .lq-unlock .lq-st { flex-basis: 100%; font-size: 16px; }
  html.mobile #lq-box { padding: 12px 14px; font-size: 16px; }
  html.mobile .ink-btn { bottom: 60px; }   /* off the menu button */
  @media (max-height: 500px) {
    html.mobile .reveal .slides > section[data-q] > h2, html.mobile .reveal .slides > section[id$="-signin"] > h2 { margin-top: 2px !important; }
    html.mobile .lq-parts { margin-top: 0.3em; }
    html.mobile .lq-u, html.mobile .lq-b { font-size: 21px; margin: 0.15em 0; }
    html.mobile .ink-btn { left: 114px; bottom: 10px; }
    html.mobile .qr-slide img { max-height: 58vh; width: auto; }   /* the whole code on a sideways phone */
  }`;
  document.head.appendChild(css);
  const note = document.createElement('div'); note.id = 'lq-note'; document.body.appendChild(note);
  let noteT = null;
  function say(text, bad, stay) {
    clearTimeout(noteT);
    note.textContent = text; note.className = bad ? 'bad' : ''; note.style.display = text ? 'block' : 'none';
    if (text && !stay) noteT = setTimeout(() => { note.style.display = 'none'; }, 6000);
  }

  function place(sec) {
    const slides = document.querySelector('.reveal .slides');
    const n = +sec.dataset.q;
    const after = [...slides.querySelectorAll(':scope > section[data-q]')].find(s => +s.dataset.q > n);
    slides.insertBefore(sec, after || null);
  }
  function buildSection(q) {
    const sec = document.createElement('section');
    sec.id = LEC + '-q' + q.n; sec.dataset.sid = sec.id; sec.dataset.q = q.n;
    sec.className = 'future'; sec.setAttribute('aria-hidden', 'true'); sec.hidden = false;
    const h = document.createElement('h2'); h.textContent = 'Question ' + q.n; sec.appendChild(h);
    const wrap = document.createElement('div'); wrap.className = 'lq-parts'; sec.appendChild(wrap);
    q.student.parts.forEach(p => {
      const d = document.createElement('div'); d.className = 'lq-part fragment'; d.dataset.part = p.n;
      d.innerHTML = '<div class="lq-n">Part ' + p.n + '</div><div class="lq-u">' + p.utility + '</div><div class="lq-b">' + p.budget + '</div>';
      wrap.appendChild(d);
    });
    return sec;
  }
  // Add sections without moving anyone: the same slide and the same part afterwards.
  function sync(cur, f) {
    try {
      Reveal.sync();
      if (cur) { const i = Reveal.getIndices(cur); Reveal.slide(i.h, i.v || 0, f); }
    } catch (e) {}
  }

  async function reveal(n, keyBytes, quiet) {
    const q = qs[n - 1];
    if (!q || q.section) return true;
    let text;
    try { text = dec(await open(await aes(keyBytes), data.questions[n - 1].student)); } catch (e) { return false; }   // a forged key: ignored
    q.student = JSON.parse(text); q.keyHex = bytesToHex(keyBytes);
    q.section = buildSection(q);
    const cur = Reveal.getCurrentSlide(), f = Reveal.getIndices().f;
    const wait = document.getElementById('lq-wait'); if (wait) wait.remove();
    place(q.section);
    if (teacherKey) addTeacherTools(q);
    sync(cur, f);
    if (!quiet) say('Question ' + n + ' is open.');
    return true;
  }

  function view(html) {
    closeView();
    const v = document.createElement('div'); v.id = 'lq-view';
    const b = document.createElement('div'); b.id = 'lq-box';
    b.innerHTML = '<button type="button" id="lq-close">close</button>' + html;
    v.appendChild(b); document.body.appendChild(v);
    b.querySelector('#lq-close').addEventListener('click', e => { e.stopPropagation(); closeView(); });
    v.addEventListener('click', e => { e.stopPropagation(); if (e.target === v) closeView(); });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(t => v.addEventListener(t, e => e.stopPropagation()));
    document.addEventListener('keydown', viewKeys, true);
  }
  function closeView() { const v = document.getElementById('lq-view'); if (v) { v.remove(); document.removeEventListener('keydown', viewKeys, true); } }
  function viewKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeView(); return; }
    if (e.key === 't' || e.key === 'T') { closeView(); return; }   // T is the lecturer login: it passes
    if (/^(Arrow|Page|Home$|End$| $)/.test(e.key)) { e.preventDefault(); e.stopPropagation(); }
  }

  function addTeacherTools(q) {
    q.section.querySelectorAll('.lq-part').forEach(d => {
      const p = q.teacher.parts.find(x => x.n === +d.dataset.part);
      const t = document.createElement('span'); t.className = 'lq-t';
      const mk = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lq-btn'; b.textContent = label; b.addEventListener('click', e => { e.stopPropagation(); b.blur(); fn(); }); ['pointerdown', 'mousedown', 'touchstart'].forEach(x => b.addEventListener(x, ev => ev.stopPropagation())); t.appendChild(b); };
      mk('solution', () => view((p.caption ? '<p>' + p.caption + '</p>' : '') + p.solution));
      mk('image', () => view(p.picture + (p.picture_note ? '<p>' + p.picture_note + '</p>' : '')));
      d.querySelector('.lq-n').appendChild(t);
    });
    const box = document.createElement('div'); box.className = 'lq-unlock';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lq-btn';
    const st = document.createElement('span'); st.className = 'lq-st';
    box.append(b, st);
    q.btn = b; q.st = st;
    ['pointerdown', 'mousedown', 'touchstart'].forEach(x => b.addEventListener(x, ev => ev.stopPropagation()));
    b.addEventListener('click', e => { e.stopPropagation(); b.blur(); unlock(q); });
    q.section.insertBefore(box, q.section.querySelector('.lq-parts'));
    paintButtons();
  }
  function paintButtons() {
    qs.forEach(q => {
      if (!q.btn || q.busy) return;
      const done = unlocked.has(q.n);
      q.btn.disabled = done;
      q.btn.textContent = done ? 'unlocked' : 'unlock';
      if (done) { q.st.textContent = ''; q.st.className = 'lq-st'; }
    });
  }

  const heads = extra => Object.assign({ Authorization: 'Bearer ' + TOKEN, Accept: 'application/vnd.github+json' }, extra || {});
  async function readRefs(fresh) {
    const h = heads();
    if (etag && !fresh) h['If-None-Match'] = etag;
    const r = await fetch(API + '/git/matching-refs/' + PREFIX, { headers: h, cache: 'no-store' });
    if (r.status === 304) return null;
    if (r.status === 403 || r.status === 429) {   // over a limit: stop asking for a while
      const wait = parseInt(r.headers.get('Retry-After'), 10);
      pauseUntil = Date.now() + (wait > 0 ? wait * 1000 : LOCKOUT);
    }
    if (!r.ok) throw new Error('GitHub answered ' + r.status);
    etag = r.headers.get('ETag');
    return r.json();
  }
  async function applyRefs(list, quiet) {
    if (!list) return;
    const pre = 'refs/' + PREFIX;
    for (const item of list) {
      if (!item.ref.startsWith(pre)) continue;
      const m = item.ref.slice(pre.length).match(/^(\d+)\/.*--([0-9a-f]{32})$/);
      if (!m) continue;
      const n = +m[1];
      if (n < 1 || n > qs.length || unlocked.has(n)) continue;
      if (qs[n - 1].section && qs[n - 1].keyHex) {   // the lecturer knows the key: only the right key counts as unlocked
        if (qs[n - 1].keyHex === m[2]) unlocked.add(n);
        continue;
      }
      if (await reveal(n, hexToBytes(m[2]), quiet)) unlocked.add(n);
    }
    paintButtons();
  }
  async function tick(quiet) {
    if ((document.hidden && !quiet) || Date.now() < pauseUntil) return;
    try {
      await applyRefs(await readRefs(false), quiet);
      if (failures >= 2) say('');
      failures = 0;
    } catch (e) {
      failures++;
      if (failures >= 2) say(teacherKey ? 'Can\'t reach GitHub, so unlocks may not reach students: ' + e.message : 'Having trouble reaching the server: retrying.', !!teacherKey, true);
    }
  }

  async function unlock(q) {
    if (!q.keyHex || q.busy) return;
    q.busy = true; q.btn.disabled = true; q.btn.textContent = 'unlocking…';
    q.st.textContent = ''; q.st.className = 'lq-st';
    const fail = why => { q.busy = false; paintButtons(); q.st.textContent = 'NOT unlocked: ' + why + '. Press again.'; q.st.className = 'lq-st bad'; };
    try {
      const head = await fetch(API + '/git/ref/heads/main', { headers: heads(), cache: 'no-store' });
      if (!head.ok) return fail('GitHub answered ' + head.status);
      const sha = (await head.json()).object.sha;
      const name = 'refs/' + PREFIX + q.n + '/' + Date.now() + '--t--' + q.keyHex;
      const w = await fetch(API + '/git/refs', { method: 'POST', headers: heads(), body: JSON.stringify({ ref: name, sha }) });
      if (!w.ok && w.status !== 422) return fail('GitHub answered ' + w.status);
      // read it back: a 422 can mean it worked or it didn't, and only what's really there counts
      for (let i = 0; i < 4; i++) {
        const list = await readRefs(true);
        if (list && list.some(x => x.ref === name)) {
          unlocked.add(q.n); q.busy = false; paintButtons();
          return;
        }
        await new Promise(r => setTimeout(r, 800));
      }
      fail('it could not be read back');
    } catch (e) { fail(e.message || 'no connection'); }
  }

  function goToHash() {   // a reload lands on the slide it was on once the questions are in
    const m = startHash.match(/^#\/([^/]+)/);
    if (!m) return;
    const sec = /^\d+$/.test(m[1]) ? null : document.getElementById(decodeURIComponent(m[1]));
    try {
      if (sec) Reveal.slide(Reveal.getIndices(sec).h, 0);
      else if (/^\d+$/.test(m[1])) Reveal.slide(+m[1], 0);
    } catch (e) {}
  }

  async function start() {
    const r = await fetch('locked.json', { cache: 'no-cache' });
    if (!r.ok) { say('The questions could not be loaded (' + r.status + '). Please reload.', true, true); return; }
    data = await r.json();
    data.questions.forEach((_, i) => qs.push({ n: i + 1, section: null }));
    if (MP.teacher) {
      let code = null; try { code = localStorage.getItem('micro-teacher-code'); } catch (e) {}
      try {
        const base = await crypto.subtle.importKey('raw', enc(String(code || '').trim()), 'PBKDF2', false, ['deriveKey']);
        teacherKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(data.salt), iterations: data.iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        for (let i = 0; i < qs.length; i++) {
          const q = qs[i], src = data.questions[i];
          const key = new Uint8Array(await open(teacherKey, src.keyForTeacher));
          q.teacher = JSON.parse(dec(await open(teacherKey, src.teacher)));
          await reveal(q.n, key, true);
        }
      } catch (e) {
        teacherKey = null;
        say('Lecturer view: the solutions could not be opened with this code. Press T and enter the code again.', true, true);
      }
    }
    await tick(true);
    goToHash();
    paintButtons();
    if (!teacherKey && !qs.some(q => q.section)) {   // nothing open yet: students wait on the sign-in slide
      const si = document.getElementById(LEC + '-signin');
      if (si) { const w = document.createElement('div'); w.id = 'lq-wait'; w.textContent = 'Waiting for the lecturer to unlock the first question.'; si.appendChild(w); }
    }
    const every = teacherKey ? TEACHER_EVERY : STUDENT_EVERY;
    const again = () => setTimeout(() => tick(false).finally(again), every + Math.random() * 2000);
    setTimeout(() => tick(false).finally(again), Math.random() * every);   // a random start, so that a room of phones doesn't ask at the same moment
  }
  if (!TOKEN) { say('Polling is off on this page.', true, true); }
  const go = () => start().catch(e => say('The questions could not be loaded: ' + (e.message || e) + '. Please reload.', true, true));
  if (Reveal.isReady && Reveal.isReady()) go(); else Reveal.on('ready', go);
  window.MicroQLock = { unlocked, version: 3 };
})();
