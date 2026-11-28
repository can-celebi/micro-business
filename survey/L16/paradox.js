// L16 "Two lotteries, two urns" (Wed 02.12): Allais + Ellsberg, four taps, one anonymous record per student.
// Spec: Carpenter, 10_experiments/frozen/280ff033bf0c/L16-L17_games_proposal.md (Ulutin PASS a590e0d10859).
// Hypothetical money: nobody is paid. No names, no IDs, no keys in this file. Same engine and house rules as /S14.
//   student:  opening, then one tap per screen in this order: Allais 1, Ellsberg 1, Allais 2, Ellsberg 2 (no going back,
//             no default answer; urn K/U button order random per device); the record {v,a1,e1,a2,e2,eo,t[,again]} is saved right after the 4th tap (poll L16-paradox).
//   ?preview: the full game, nothing is sent.
//   ?results: the class tables in the phase the lecturer has set (0 closed, 1 Allais, 2 + Ellsberg). Teacher mode sets the phase.
//   ?results&big=1[&only=allais|ellsberg]: the lecturer frame in the deck (large type, one table).
(function () {
  const POLL = 'L16-paradox', PHASE_POLL = 'L16-paradox-phase', LEC = 'L16', NPH = 2;
  const P = window.MicroPoll, app = document.getElementById('app'), $ = id => document.getElementById(id);
  const PREVIEW = /[?&]preview\b/.test(location.search), RESULTS = /[?&]results\b/.test(location.search);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ======================================================================================================
  // The reading
  // ======================================================================================================
  // a record is read only if every field is possible; otherwise it counts as "not read: invalid"
  function valid(r) {
    try {
      if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
      if (r.v !== 1 || !/^(KU|UK)$/.test(r.eo)) return false;
      if (!/^[AB]$/.test(r.a1) || !/^[CD]$/.test(r.a2) || !/^[KUN]$/.test(r.e1) || !/^[KUN]$/.test(r.e2)) return false;
      if (r.t !== undefined && r.t !== null && r.t !== '' && !/^[0-9]{1,5}(\.[0-9]{1,5}){3}$/.test(String(r.t))) return false;
      return true;
    } catch (e) { return false; }
  }
  function latestPerDevice(records) {   // [[device, ts, record]]
    const last = {};
    records.forEach(([d, ts, r]) => { if (!(d in last) || ts > last[d][0]) last[d] = [ts, r]; });
    return Object.values(last).map(x => x[1]);
  }
  // Allais: 2×2 (A|B) × (C|D); Ellsberg: 3×3 (K|U|N) × (K|U|N). Blind tapping: 25% per Allais cell, 1/9 per Ellsberg cell.
  function classView(records) {
    const kept = latestPerDevice(records), ok = kept.filter(valid);
    const allais = {}, ells = {};
    ['A', 'B'].forEach(a => ['C', 'D'].forEach(b => { allais[a + b] = ok.filter(r => r.a1 === a && r.a2 === b).length; }));
    'KUN'.split('').forEach(a => 'KUN'.split('').forEach(b => { ells[a + b] = ok.filter(r => r.e1 === a && r.e2 === b).length; }));
    return { n: ok.length, allais, ells,
      counts: { devices: kept.length, records: records.length, again: records.filter(([, , r]) => r && typeof r === 'object' && r.again).length, invalid: kept.length - ok.length } };
  }
  window.L16Reading = { valid, latestPerDevice, classView };

  // ======================================================================================================
  // The student side
  // ======================================================================================================
  const rec = { v: 1 }, secs = [];
  let t0 = 0;
  // Utku B1 (L14): a quick double tap must not answer the next screen: taps are ignored for 400 ms after a screen is drawn
  let drawnAt = 0;
  const fresh = () => { drawnAt = performance.now(); };
  app.addEventListener('click', e => { if (performance.now() - drawnAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
  function frame(title, body) {
    fresh();
    app.innerHTML = '<h1>Two lotteries, two urns</h1><p class="s">Anonymous · about 3 minutes · Microeconomics · Lecture 16</p><h2>' + title + '</h2>' + body +
      '<div class="msg" id="msg">' + (PREVIEW ? 'Preview: nothing is sent.' : '') + '</div>';
    window.scrollTo(0, 0);
  }
  const say = h => { $('msg').innerHTML = h; if (/<button/.test(h)) fresh(); };

  // the four screens, in the order of the spec; each option is one button, tapping it answers and moves on
  const URNS = '<p>Urn K has 50 red and 50 black balls. Urn U has 100 red and black balls, mix unknown. You win €100 if you draw the colour named.</p>';
  // Carpenter 28.11: a top-button habit must not look like K + K. The K/U order is drawn once per device (kept on the device,
  // the same for both bets; 'no preference' stays last) and saved in the record as eo.
  function urnOrder() {
    let o = null; try { o = localStorage.getItem('micro-l16-urn-order'); } catch (e) {}
    if (o === 'KU' || o === 'UK') return o;
    const a = new Uint8Array(1); crypto.getRandomValues(a); o = a[0] & 1 ? 'UK' : 'KU';
    try { localStorage.setItem('micro-l16-urn-order', o); } catch (e) {}
    return o;
  }
  const EO = urnOrder(), URN = { K: ['K', 'urn K'], U: ['U', 'urn U'] };
  const WHICH = [URN[EO[0]], URN[EO[1]], ['N', 'no preference']];
  const SCREENS = [
    { key: 'a1', title: 'Choice 1 of 4', body: '<p>Which lottery do you choose?</p>', opts: [['A', 'A: €3,000 for sure'], ['B', 'B: 8% €5,000, 90% €3,000, 2% €0']] },
    { key: 'e1', title: 'Choice 2 of 4', body: URNS + '<p><b>Bet 1: red.</b> Which urn do you draw from?</p>', opts: WHICH },
    { key: 'a2', title: 'Choice 3 of 4', body: '<p>Which lottery do you choose?</p>', opts: [['C', 'C: 10% €3,000, otherwise €0'], ['D', 'D: 8% €5,000, otherwise €0']] },
    { key: 'e2', title: 'Choice 4 of 4', body: URNS + '<p><b>Bet 2: black.</b> Which urn do you draw from?</p>', opts: WHICH },
  ];

  function opening() {
    frame('Before you start', '<p>Four quick choices about money and chance. The money is imaginary: nobody is paid. Choose what you would really choose. There are no right answers.</p>' +
      '<button class="go" id="nx" type="button">Start</button>');
    $('nx').onclick = () => { t0 = performance.now(); screen(0); };
  }
  function screen(i) {
    const S = SCREENS[i];
    frame(S.title, S.body + '<div class="game opts col">' + S.opts.map(([v, l]) => '<button class="opt" type="button" data-v="' + v + '">' + esc(l) + '</button>').join('') + '</div>');
    let used = false;   // one answer per screen, whatever happens to the buttons
    app.querySelectorAll('.game .opt').forEach(b => b.onclick = () => {
      if (used) return; used = true;
      rec[S.key] = b.dataset.v; secs.push(Math.round((performance.now() - t0) / 1000)); t0 = performance.now();
      if (i + 1 < SCREENS.length) screen(i + 1); else save();
    });
  }
  async function save() {
    frame('Thank you', '<p>That was all four choices.</p>');
    const out = { v: 1, a1: rec.a1, e1: rec.e1, a2: rec.a2, e2: rec.e2, eo: EO, t: secs.join('.') };
    let again = false; try { again = localStorage.getItem('micro-l16-paradox-saved') === '1'; } catch (e) {}
    if (again) out.again = 1;
    if (PREVIEW) { say('Preview: nothing is sent. The record would be ' + esc(JSON.stringify(out))); return; }
    let busy = false;
    const go = async () => {
      if (busy) return; busy = true;
      say('Saving…');
      try {
        await P.submitText(POLL, { answers: out }, n => say('Busy, retrying ' + n + '…'));
        try { localStorage.setItem('micro-l16-paradox-saved', '1'); } catch (e) {}
        say('Saved. The class results come later in the lecture.');
      } catch (e) {
        busy = false; say('Not saved (are you offline?). <button class="go" id="again" type="button">save again</button>');
        $('again').onclick = go;
      }
    };
    go();
  }

  // ======================================================================================================
  // ?results: the phase (shared, set by the lecturer) and the tables
  // ======================================================================================================
  // Phase tags as in L14 (Utku B2): tag = first 8 hex of sha256('micro-gate:<teacher code>:L16-paradox-phase:<session>:<p>'),
  // made only on the lecturer's device; students see the HIGHEST valid phase; tags before class − 30 min or more than
  // 2 minutes in the future are ignored. Hashes made by a local script that reads the key file and prints only the hashes.
  const PHASE_CHECK = {
    ws26: { 1: '8be4439ac6bafed0fcb60be9e3de45dbe3422eed685415436b04bfcfe9882bd4', 2: '5756084100c2e5f49f6602da429649171a40ba7ddc8424817cb9a948e63c8570' },
    test: { 1: '7c0c3bfc36ffa956b3e6241e870b9d69de0b4f764762db0fc3eff7b9502ccbad', 2: '508b700c68c72e18dacd016c009a9915380c5d75ceb56b51bdd91e3d1d732c4b' } };
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
  // records from class start − 30 min on (earlier ones are previews: counted, not read); later ones are read and counted apart
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
    const rows = []; let seed = 11; const rn = k => { seed = (seed * 16807) % 2147483647; return seed % k; };
    for (let i = 0; i < n; i++) {
      const a1 = rn(10) < 7 ? 'A' : 'B', a2 = rn(10) < (a1 === 'A' ? 6 : 3) ? 'D' : 'C';
      const e1 = 'KKKKUN'[rn(6)], e2 = rn(10) < 7 ? e1 : 'KUN'[rn(3)];
      rows.push(['dev' + i, 1000 + i, { v: 1, a1, e1, a2, e2, eo: rn(2) ? 'UK' : 'KU', t: [3 + rn(20), 3 + rn(20), 3 + rn(20), 2 + rn(10)].join('.') }]);
    }
    rows.push(['dev0', 5, { a1: 'junk' }], ['devX', 9, { v: 1, a1: 'A', e1: 'K', a2: 'X', e2: 'K', eo: 'KU' }]);
    return rows;
  }

  const BIGV = /[?&]big=1(&|$)/.test(location.search), ONLY = (/[?&]only=(allais|ellsberg)(&|$)/.exec(location.search) || [])[1] || null;
  const BIG_CSS = 'main{max-width:none;padding:2px 14px 6px}h1{display:none}#rn{font-size:18px;margin:0}' +
    '.phases{margin:2px 0}.phases .opt,.opts .opt{font-size:16px;padding:2px 8px}.opts{display:inline-flex;margin:0}#res h2{font-size:30px;margin:.2rem 0 0;border-top:0;padding-top:0}' +
    '.tab th,.tab td{font-size:28px;padding:8px 18px}.tab td small{font-size:20px}.meta{font-size:26px;color:#111;margin:.2rem 0}.reading{font-size:30px;line-height:1.22;border-left-width:6px;margin:.3rem 0}.msg{font-size:28px}';
  const pct = (k, n) => n ? Math.round(100 * k / n) : 0;
  const cell = (k, n, mark) => '<td class="' + (mark ? 'dg' : '') + '">' + k + '<small> · ' + pct(k, n) + '%</small></td>';

  async function resultsView() {
    if (BIGV) { const st = document.createElement('style'); st.textContent = BIG_CSS; document.head.appendChild(st); }
    const T = DEMO || !!(P && P.teacher);
    app.innerHTML = '<h1>Two lotteries, two urns · class results</h1><p class="meta" id="rn">loading…</p>' +
      (T ? '<div class="phases" id="ph"></div>' : '') + '<div class="opts"><button class="opt" id="rf" type="button">Refresh</button></div><div id="res"></div>';
    // the lecturer's device keeps the phase it tapped (Utku B2), so a replayed tag never moves the projector
    const LKEY = 'micro-l16-phase-' + (P && P.session);
    const LGET = () => { try { return Number(localStorage.getItem(LKEY)) || 0; } catch (e) { return 0; } };
    let phase = T && !DEMO ? Math.min(NPH, LGET()) : 0, shared = 0, armed = null;
    const PH = ['0 · closed', '1 · Allais', '2 · + Ellsberg'];
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
      if (DEMO) { cv = classView(demoRecords(Number((/[?&]demo=([0-9]+)/.exec(location.search) || [])[1] || 60))); draw(); return; }
      const r = await loadRecords(); cv = classView(r.rows); extra = r; lastData = Date.now(); dataPhase = phase; draw();
    }
    // Utku B3 (L14, the shared token's rate limit): a student's device reads only the phase every 2 minutes and the records
    // only from phase 1 on, when the phase changes or on Refresh (at most once a minute); the lecturer's device every 30 s
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
        (extra.early ? ' · ' + extra.early + ' before class, not counted' : '') + (extra.after ? ' · ' + extra.after + ' after Wednesday\'s class' : '') + ' · phase ' + phase + ' · ' + new Date().toLocaleTimeString();
      if (phase === 0) return;
      const n = cv.n, A = cv.allais, E = cv.ells;
      let h = '';
      if (!ONLY || ONLY === 'allais') {
        if (n < 10) h += '<h2>Allais · two lotteries</h2><p class="meta">waiting for answers, n = ' + n + '</p>';
        else h += '<h2>Allais · two lotteries</h2><table class="tab"><tr><th>choice 1 ↓ · choice 3 →</th><th>C</th><th>D</th></tr>' +
          '<tr><th>A</th>' + cell(A.AC, n) + cell(A.AD, n, true) + '</tr><tr><th>B</th>' + cell(A.BC, n, true) + cell(A.BD, n) + '</tr></table>' +
          '<p class="meta">n = ' + n + ' students · blind tapping: 25% in each cell</p>' +
          '<p class="reading">A + D: ' + pct(A.AD, n) + '% (blind tapping 25%) · A + D or B + C: ' + pct(A.AD + A.BC, n) + '% (blind tapping 50%)</p>';
      }
      if (phase >= 2 && (!ONLY || ONLY === 'ellsberg')) {
        const L = [['K', 'K'], ['U', 'U'], ['N', 'no pref.']];
        if (n < 10) h += '<h2>Ellsberg · two urns</h2><p class="meta">waiting for answers, n = ' + n + '</p>';
        else h += '<h2>Ellsberg · two urns</h2><table class="tab"><tr><th>bet 1 red ↓ · bet 2 black →</th>' + L.map(x => '<th>' + x[1] + '</th>').join('') + '</tr>' +
          L.map(a => '<tr><th>' + a[1] + '</th>' + L.map(b => cell(E[a[0] + b[0]], n, a[0] === 'K' && b[0] === 'K')).join('') + '</tr>').join('') + '</table>' +
          '<p class="meta">n = ' + n + ' students · blind tapping: 11% in each cell</p>' +
          '<p class="reading">K + K: ' + pct(E.KK, n) + '% (blind tapping 11%)</p>';
      }
      res.innerHTML = h;
    }
    $('rf').onclick = () => load(true);
    await load(false);
    if (!DEMO) setInterval(() => { if (!document.hidden) load(false); }, T ? 30000 : 120000);
  }

  if (RESULTS) resultsView(); else opening();
})();
