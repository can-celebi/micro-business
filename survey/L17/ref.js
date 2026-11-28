// L17 "Same money, different story" (Thu 03.12): the reference point, one tap, one anonymous record per student.
// Spec: Carpenter, 10_experiments/frozen/280ff033bf0c/L16-L17_games_proposal.md (Ulutin PASS a590e0d10859).
// Hypothetical money: nobody is paid. No names, no IDs, no keys in this file. Same engine and house rules as /S14.
//   student:  each device gets ONE story at random (gain: given €100; loss: given €180), kept on the device so a reload shows
//             the same story; one tap (sure or coin, no default); the record {v,f,r,t[,again]} is saved right away (poll L17-ref).
//   ?preview: the game, nothing is sent (?preview&story=G|L picks the story).
//   ?results: the "sure" share per story in the phase the lecturer has set (0 closed, 1 open). Teacher mode sets the phase.
//   ?results&big=1: the lecturer frame in the deck (large type).
// The loss-aversion coin (tap 2) is an in-deck choice poll, not on this page.
(function () {
  const POLL = 'L17-ref', PHASE_POLL = 'L17-ref-phase', LEC = 'L17', NPH = 1;
  const P = window.MicroPoll, app = document.getElementById('app'), $ = id => document.getElementById(id);
  const PREVIEW = /[?&]preview\b/.test(location.search), RESULTS = /[?&]results\b/.test(location.search);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ======================================================================================================
  // The reading
  // ======================================================================================================
  function valid(r) {
    try {
      if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
      if (r.v !== 1 || !/^[GL]$/.test(r.f) || !/^[SC]$/.test(r.r)) return false;
      if (r.t !== undefined && r.t !== null && r.t !== '' && !/^[0-9]{1,5}$/.test(String(r.t))) return false;
      return true;
    } catch (e) { return false; }
  }
  function latestPerDevice(records) {   // [[device, ts, record]]
    const last = {};
    records.forEach(([d, ts, r]) => { if (!(d in last) || ts > last[d][0]) last[d] = [ts, r]; });
    return Object.values(last).map(x => x[1]);
  }
  function classView(records) {
    const kept = latestPerDevice(records), ok = kept.filter(valid), by = {};
    ['G', 'L'].forEach(f => { const g = ok.filter(r => r.f === f); by[f] = { n: g.length, sure: g.filter(r => r.r === 'S').length }; });
    return { n: ok.length, by,
      counts: { devices: kept.length, records: records.length, again: records.filter(([, , r]) => r && typeof r === 'object' && r.again).length, invalid: kept.length - ok.length } };
  }
  window.L17Reading = { valid, latestPerDevice, classView };

  // ======================================================================================================
  // The student side
  // ======================================================================================================
  const STORY = {
    G: { start: 'You are given €100.', sure: '+€40 for sure', coin: 'a coin flip: +€80 or +€0' },
    L: { start: 'You are given €180.', sure: '−€40 for sure', coin: 'a coin flip: −€80 or −€0' } };
  // one story per device, at random, kept on the device (a reload must not show the other story)
  function pickStory() {
    const forced = (/[?&]story=([GL])(&|$)/.exec(location.search) || [])[1];
    if (PREVIEW && forced) return forced;
    let f = null; try { f = localStorage.getItem('micro-l17-story'); } catch (e) {}
    if (f === 'G' || f === 'L') return f;
    const a = new Uint8Array(1); crypto.getRandomValues(a); f = a[0] & 1 ? 'L' : 'G';
    try { localStorage.setItem('micro-l17-story', f); } catch (e) {}
    return f;
  }
  // Utku B1 (L14): taps are ignored for 400 ms after a screen is drawn
  let drawnAt = 0;
  const fresh = () => { drawnAt = performance.now(); };
  app.addEventListener('click', e => { if (performance.now() - drawnAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
  function frame(title, body) {
    fresh();
    app.innerHTML = '<h1>Same money, different story</h1><p class="s">Anonymous · about 1 minute · Microeconomics · Lecture 17</p><h2>' + title + '</h2>' + body +
      '<div class="msg" id="msg">' + (PREVIEW ? 'Preview: nothing is sent.' : '') + '</div>';
    window.scrollTo(0, 0);
  }
  const say = h => { $('msg').innerHTML = h; if (/<button/.test(h)) fresh(); };

  function opening() {
    frame('Before you start', '<p>One quick choice about money and chance. The money is imaginary: nobody is paid. Choose what you would really choose. There are no right answers.</p>' +
      '<button class="go" id="nx" type="button">Start</button>');
    $('nx').onclick = () => choice(pickStory(), performance.now());
  }
  function choice(f, t0) {
    const S = STORY[f];
    frame('Your choice', '<p>' + esc(S.start) + ' Now choose one:</p><div class="game opts col">' +
      '<button class="opt" type="button" data-v="S">' + esc(S.sure) + '</button><button class="opt" type="button" data-v="C">' + esc(S.coin) + '</button></div>');
    let used = false;   // one answer, whatever happens to the buttons
    app.querySelectorAll('.game .opt').forEach(b => b.onclick = () => !used && (used = true) && save({ v: 1, f, r: b.dataset.v, t: String(Math.round((performance.now() - t0) / 1000)) }));
  }
  function save(out) {
    frame('Thank you', '<p>That was the choice.</p>');
    let again = false; try { again = localStorage.getItem('micro-l17-ref-saved') === '1'; } catch (e) {}
    if (again) out.again = 1;
    if (PREVIEW) { say('Preview: nothing is sent. The record would be ' + esc(JSON.stringify(out))); return; }
    let busy = false;
    const go = async () => {
      if (busy) return; busy = true;
      say('Saving…');
      try {
        await P.submitText(POLL, { answers: out }, n => say('Busy, retrying ' + n + '…'));
        try { localStorage.setItem('micro-l17-ref-saved', '1'); } catch (e) {}
        say('Saved. The class results come later in the lecture.');
      } catch (e) {
        busy = false; say('Not saved (are you offline?). <button class="go" id="again" type="button">save again</button>');
        $('again').onclick = go;
      }
    };
    go();
  }

  // ======================================================================================================
  // ?results: the phase (shared, set by the lecturer) and the table
  // ======================================================================================================
  // Phase tags as in L14 (Utku B2): tag = first 8 hex of sha256('micro-gate:<teacher code>:L17-ref-phase:<session>:<p>'),
  // made only on the lecturer's device; students see the HIGHEST valid phase; tags before class − 30 min or more than
  // 2 minutes in the future are ignored. Hashes made by a local script that reads the key file and prints only the hashes.
  const PHASE_CHECK = {
    ws26: { 1: '2e9183511558f224271300ad79b19bf0c745ecea13e43eafd8dea68212c4926d' },
    test: { 1: 'e32e2afee66ab3fc2ef9fbda5ad8ed26eccfccf97ca04378c8f0cd36980bd699' } };
  async function sha(x) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const classWin = () => { const w = P.classWindow && P.classWindow(LEC); return w ? [w[0] - 30 * 60000, w[1]] : null; };   // null in the test session
  async function sharedPhase() {
    const all = (await P.allAnswers(PHASE_POLL + '/'))[PHASE_POLL] || [], chk = PHASE_CHECK[P.session] || {}, w = classWin(), late = Date.now() + 2 * 60000;
    let best = 0;
    for (const a of all) {
      const m = new RegExp('^([1-' + NPH + '])-([0-9a-f]{8})$').exec(String(a.value));
      if (!m || +m[1] <= best || a.ts > late || (w && a.ts < w[0])) continue;
      if (await sha('micro-gate-check:' + m[2]) === chk[m[1]]) best = +m[1];
    }
    return best;
  }
  async function loadRecords() {
    const w = classWin(), all = (await P.tagRefs(POLL + '/')).filter(x => x.poll === POLL);
    const refs = all.filter(x => !w || x.ts >= w[0]), rows = [];
    for (let i = 0; i < refs.length; i += 8) {
      rows.push(...await Promise.all(refs.slice(i, i + 8).map(async x => {
        let r = null; try { const j = await P.blob(x.sha); r = j && j.answers; } catch (e) {}
        return [x.client, x.ts, r];
      })));
    }
    return { rows, early: all.length - refs.length, after: w ? refs.filter(x => x.ts > w[1]).length : 0 };
  }

  // ?results&demo on this computer only: made-up records and local phase buttons, nothing is read or written
  const DEMO = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]demo\b/.test(location.search);
  function demoRecords(n) {
    const rows = []; let seed = 13; const rn = k => { seed = (seed * 16807) % 2147483647; return seed % k; };
    for (let i = 0; i < n; i++) { const f = rn(2) ? 'L' : 'G'; rows.push(['dev' + i, 1000 + i, { v: 1, f, r: rn(10) < (f === 'G' ? 7 : 4) ? 'S' : 'C', t: String(3 + rn(20)) }]); }
    rows.push(['dev0', 5, { f: 'junk' }], ['devX', 9, { v: 1, f: 'G', r: 'X' }]);
    return rows;
  }

  const BIGV = /[?&]big=1(&|$)/.test(location.search);
  const BIG_CSS = 'main{max-width:none;padding:2px 14px 6px}h1{display:none}#rn{font-size:18px;margin:0}' +
    '.phases{margin:2px 0}.phases .opt,.opts .opt{font-size:16px;padding:2px 8px}.opts{display:inline-flex;margin:0}#res h2{font-size:30px;margin:.2rem 0 0;border-top:0;padding-top:0}' +
    '.tab th,.tab td{font-size:28px;padding:8px 18px}.tab td small{font-size:20px}.meta{font-size:26px;color:#111;margin:.2rem 0}.reading{font-size:30px;line-height:1.22;border-left-width:6px;margin:.3rem 0}.msg{font-size:28px}';
  const pct = (k, n) => n ? Math.round(100 * k / n) : 0;

  async function resultsView() {
    if (BIGV) { const st = document.createElement('style'); st.textContent = BIG_CSS; document.head.appendChild(st); }
    const T = DEMO || !!(P && P.teacher);
    app.innerHTML = '<h1>Same money, different story · class results</h1><p class="meta" id="rn">loading…</p>' +
      (T ? '<div class="phases" id="ph"></div>' : '') + '<div class="opts"><button class="opt" id="rf" type="button">Refresh</button></div><div id="res"></div>';
    const LKEY = 'micro-l17-phase-' + (P && P.session);
    const LGET = () => { try { return Number(localStorage.getItem(LKEY)) || 0; } catch (e) { return 0; } };
    let phase = T && !DEMO ? Math.min(NPH, LGET()) : 0, shared = 0, armed = null;
    const PH = ['0 · closed', '1 · open'];
    function phaseButtons() {
      if (!T) return;
      $('ph').innerHTML = PH.map((l, j) => '<button class="opt' + (j === phase ? ' on' : '') + '" type="button" data-p="' + j + '">' + l + '</button>').join('') +
        (DEMO ? '' : '<span class="meta" style="align-self:center">students see phase ' + shared + '</span>');
      $('ph').querySelectorAll('.opt').forEach(b => b.onclick = async () => {
        const v = +b.dataset.p;
        if (DEMO) { phase = v; phaseButtons(); draw(); return; }
        if (v > shared && armed !== v) { armed = v; $('rn').textContent = 'tap "' + PH[v] + '" again to open it for everyone (it cannot be closed again)'; return; }
        armed = null; phase = v; try { localStorage.setItem(LKEY, String(v)); } catch (e) {}
        if (v > shared) {
          const code = (() => { try { return localStorage.getItem('micro-teacher-code') || ''; } catch (e) { return ''; } })();
          const tag = (await sha('micro-gate:' + code.trim() + ':' + PHASE_POLL + ':' + P.session + ':' + v)).slice(0, 8);
          $('rn').textContent = 'saving phase ' + v + '…';
          try { await P.submit(PHASE_POLL, v + '-' + tag); shared = v; } catch (e) { $('rn').textContent = 'phase not saved: tap again'; return; }
        }
        phaseButtons(); if (phase >= 1 && !cv) await loadData(); else draw();
      });
    }
    let cv = null, extra = { early: 0, after: 0 }, lastData = 0, dataPhase = -1;
    async function loadData() {
      if (DEMO) { cv = classView(demoRecords(Number((/[?&]demo=([0-9]+)/.exec(location.search) || [])[1] || 50))); draw(); return; }
      const r = await loadRecords(); cv = classView(r.rows); extra = r; lastData = Date.now(); dataPhase = phase; draw();
    }
    // Utku B3 (L14): students read the phase every 2 minutes and the records only once open; the lecturer every 30 s
    async function load(manual) {
      if (!T && manual && Date.now() - lastData < 60000) { $('rn').textContent = 'Refreshed a moment ago. Try again in a minute.'; return; }
      $('rn').textContent = 'loading…';
      try {
        if (!DEMO) shared = await sharedPhase();
        if (!T) phase = shared;
        if (T || (phase >= 1 && (manual || phase !== dataPhase))) await loadData(); else draw();
      } catch (e) { $('rn').textContent = 'could not load: tap Refresh again'; return; }
      phaseButtons();
    }
    function draw() {
      const res = $('res');
      if (phase === 0 || !cv) { res.innerHTML = phase === 0 ? '<p class="msg">Results open soon.</p>' : ''; $('rn').textContent = 'phase ' + phase + ' · ' + new Date().toLocaleTimeString(); if (phase === 0 && !T) return; if (!cv) return; }
      const C = cv.counts;
      $('rn').textContent = C.devices + ' devices · ' + C.records + ' records' + (C.again ? ' (' + C.again + ' again)' : '') + (C.invalid ? ' · not read: invalid, ' + C.invalid : '') +
        (extra.early ? ' · ' + extra.early + ' before class, not counted' : '') + (extra.after ? ' · ' + extra.after + ' after Thursday\'s class' : '') + ' · phase ' + phase + ' · ' + new Date().toLocaleTimeString();
      if (phase === 0) return;
      const G = cv.by.G, L = cv.by.L;
      if (cv.n < 10) { res.innerHTML = '<h2>Sure or coin?</h2><p class="meta">waiting for answers, n = ' + cv.n + '</p>'; return; }
      const row = (lab, s, x) => '<tr><th>' + lab + '</th><td>' + s.n + '</td><td class="dg">' + x.sure + '<small> · ' + pct(x.sure, x.n) + '%</small></td><td>' + (x.n - x.sure) + '<small> · ' + pct(x.n - x.sure, x.n) + '%</small></td></tr>';
      res.innerHTML = '<h2>Sure or coin?</h2><table class="tab"><tr><th>story</th><th>students</th><th>sure</th><th>coin</th></tr>' +
        row('gain story: given €100, +€40 sure or coin +€80 / +€0', G, G) + row('loss story: given €180, −€40 sure or coin −€80 / −€0', L, L) + '</table>' +
        '<p class="meta">n = ' + cv.n + ' students · each device saw one story, picked at random</p>' +
        '<p class="reading">"sure": gain story ' + pct(G.sure, G.n) + '% · loss story ' + pct(L.sure, L.n) + '%</p>';
    }
    $('rf').onclick = () => load(true);
    await load(false);
    if (!DEMO) setInterval(() => { if (!document.hidden) load(false); }, T ? 30000 : 120000);
  }

  if (RESULTS) resultsView(); else opening();
})();
