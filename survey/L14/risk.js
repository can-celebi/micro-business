// L14 risk games (Wed 25.11; Risk.md Addition 10, Celebi's job 2): the four games as one anonymous live survey.
// Spec: Carpenter, 10_experiments/frozen/85add7e2e90c (Ulutin PASS). The ?results reading: Hande, 18_class-review/frozen/fed688fc04ac
// (Ulutin PASS); the reading functions below are a one-to-one port of her risk_games_reading.py (a66bc85335af).
// Hypothetical money: nobody is paid. No names, no IDs, no keys in this file.
//   student:  one game per screen, no going back; one record {v,b,x,h,s,t[,again]} saved at the end (poll L14-risk-games).
//   ?preview: the full games, nothing is sent.
//   ?results: the class charts in the phase the lecturer has set (0 closed, 1 counts, 2 + attitudes, 3 + staircase CE).
//             The lecturer sets the phase in teacher mode; a phase is written as a tag only the teacher code can make.
(function () {
  const POLL = 'L14-risk-games', PHASE_POLL = 'L14-risk-phase';
  // THE SWITCHES (Risk.md Additions 12-13, Can 25.11: "we can cancel balloon", staircase only once the CE is taught).
  // BALLOON false: the balloon is only shown in class: the games start at the bomb box, the record has no b, ?results has no
  // balloon chart. STAIR false: no coin-flip screens, the record has no s, ?results has no staircase chart. Nothing else changes.
  const BALLOON = false;
  const STAIR = false;
  const G = BALLOON ? 0 : 1;   // games are numbered from 1 either way
  const NG = 2 + (BALLOON ? 1 : 0) + (STAIR ? 1 : 0), NW = ['', 'one', 'two', 'three', 'four'][NG];   // how many games
  const MIN = 5 + (BALLOON ? 2 : 0) + (STAIR ? 1 : 0);   // minutes (Carpenter's timing: balloon 2, staircase 1, the rest 5)
  const P = window.MicroPoll, app = document.getElementById('app'), $ = id => document.getElementById(id);
  const PREVIEW = /[?&]preview\b/.test(location.search), RESULTS = /[?&]results\b/.test(location.search);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rnd12 = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + a[0] % 12; };   // uniform 1..12 (2^32 mod 12 = 4: bias < 1e-9)

  // ======================================================================================================
  // The reading (Hande's risk_games_reading.py, ported one to one; same names, same rules, same sentences)
  // ======================================================================================================
  const N_BOX = 12, HL_NEUTRAL_SAFE = 4, FLIP_EV = 50;
  const FAST = { balloon: 10, bomb: 3, hl: 15, staircase: 4 };
  const lab3 = (s, mid) => s < mid ? 'averse' : s === mid ? 'neutral' : 'seeking';
  function bomb(k) { k = Number(k); return { score: k, label: lab3(k, N_BOX / 2) }; }
  function balloon(balloons) {   // [[pumps, popped]]
    const kept = balloons.filter(b => !b[1]).map(b => b[0]);
    if (!kept.length) return { score: null, label: null, popped_all: true, at_least: Math.max(...balloons.map(b => b[0])) };
    const s = kept.reduce((a, b) => a + b, 0) / kept.length;
    return { score: Math.round(s * 100) / 100, label: lab3(s, N_BOX / 2), popped_all: false };
  }
  function holtLaury(choices) {
    const c = choices.toUpperCase(), safe = c.split('').filter(x => x === 'A').length;
    const single = c === 'A'.repeat(safe) + 'B'.repeat(10 - safe);
    if (!single) return { score: safe, label: null, switches_back: true, dominated: c[9] === 'A' };
    return { score: safe, label: safe > HL_NEUTRAL_SAFE ? 'averse' : safe === HL_NEUTRAL_SAFE ? 'neutral' : 'seeking', switches_back: false, dominated: c[9] === 'A' };
  }
  function staircase(answers) {
    const a = answers.toUpperCase(); let lo = 0, hi = 100, offer = 40;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === 'S') hi = offer; else lo = offer;
      if (i === 0) offer = a[i] === 'S' ? 20 : 60; else if (i === 1) offer = a[i] === 'S' ? offer - 10 : offer + 10;
    }
    return { ce: [lo, hi], risk_premium: [FLIP_EV - hi, FLIP_EV - lo], label: hi <= 40 ? 'averse' : lo >= 60 ? 'seeking' : 'near neutral' };
  }
  // the offer shown at step i (0, 1, 2) after the earlier answers: the same rule as staircase()
  function offerAt(prev) { let offer = 40; for (let i = 0; i < prev.length; i++) { if (i === 0) offer = prev[i] === 'S' ? 20 : 60; else if (i === 1) offer = prev[i] === 'S' ? offer - 10 : offer + 10; } return offer; }
  // Utku B1/S1: a record is read only if every field is possible; otherwise it counts as "not read: invalid"
  function valid(r) {
    try {
      if (!r || typeof r !== 'object') return false;
      const b = String(r.b).split('.');
      if (r.b === undefined || b.length !== 5) return false;
      for (const x of b) {
        const m = /^([0-9]{1,2})([cp])$/.exec(x); if (!m) return false;
        const k = Number(m[1]);
        if ((m[2] === 'c' && !(k >= 0 && k <= 11)) || (m[2] === 'p' && !(k >= 1 && k <= 12))) return false;
      }
      if (!/^[0-9]{1,2}$/.test(String(r.x)) || !(Number(r.x) >= 0 && Number(r.x) <= 12)) return false;
      if (!/^[AB]{10}$/.test(String(r.h)) || !/^[SF]{3}$/.test(String(r.s))) return false;
      if (r.t !== undefined && r.t !== null && r.t !== '' && !/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(String(r.t))) return false;
      return true;
    } catch (e) { return false; }
  }
  function readRecord(r) {
    if (!valid(r)) return null;
    const t = r.t ? String(r.t).split('.').map(Number) : [null, null, null, null];
    const out = { balloon: balloon(r.b.split('.').map(x => [Number(x.slice(0, -1)), x.slice(-1) === 'p'])), bomb: bomb(r.x), hl: holtLaury(r.h), staircase: staircase(r.s) };
    ['balloon', 'bomb', 'hl', 'staircase'].forEach((g, j) => { out[g].fast = t[j] !== null && t[j] < FAST[g]; });
    return out;
  }
  function latestPerDevice(records) {   // [[device, ts, record]]
    const last = {};
    records.forEach(([d, ts, r]) => { if (!(d in last) || ts > last[d][0]) last[d] = [ts, r]; });
    return Object.values(last).map(x => x[1]);
  }
  function medianRange(scored) {
    const rs = scored.map(s => s.ce).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return rs.length ? rs[Math.floor((rs.length - 1) / 2)] : null;
  }
  function summary(game, scored) {
    const n = scored.length, read = scored.filter(s => s.label !== null);
    const c = {}; ['averse', 'neutral', 'near neutral', 'seeking'].forEach(k => { c[k] = read.filter(s => s.label === k).length; });
    const counts = {}; Object.keys(c).forEach(k => { if (c[k] || k !== 'near neutral') counts[k] = c[k]; });
    const out = { n, read: read.length, counts, fast: scored.filter(s => s.fast).length };
    if (game === 'bomb') {
      out.line = `${c.averse} of ${n} opened fewer than 6 boxes: they gave up expected money for safety (risk averse). ` +
        `${c.neutral} opened exactly 6, the most expected money (risk neutral); ${c.seeking} opened more (risk seeking).`;
    } else if (game === 'balloon') {
      const miss = n - read.length;
      out.line = `${c.averse} of ${read.length} stopped, on average, before 6 pumps (risk averse); ${c.neutral} at 6 (risk neutral); ` +
        `${c.seeking} after 6 (risk seeking).` + (miss ? ` ${miss} lost every balloon and have no score: they pumped at least as far as the pop.` : '');
    } else if (game === 'hl') {
      const back = scored.filter(s => s.switches_back).length;
      out.line = `${c.averse} of ${read.length} chose the safe list A more than 4 times (risk averse); ${c.neutral} exactly 4 (risk neutral); ` +
        `${c.seeking} fewer (risk seeking).` + (back ? ` ${back} switched back and forth and are not read.` : '');
    } else if (game === 'staircase') {
      out.line = `${c.averse} of ${n} would take a sure amount of €40 or less instead of a flip worth €50 on average (risk averse: they pay a risk premium); ` +
        `${c['near neutral']} are between €40 and €60 (close to risk neutral); ${c.seeking} want more than €60 (risk seeking).`;
      const m = medianRange(scored);
      if (m) {
        out.median_ce = m;
        const lo = FLIP_EV - m[1], hi = FLIP_EV - m[0];
        const prem = lo >= 0 ? `their risk premium is €${lo}–${hi}` : hi <= 0 ? `their risk premium is negative: they value the flip €${-hi}–${-lo} above its expected value` : `their risk premium is between −€${-lo} and €${hi}`;
        out.line += ` The middle student's CE is €${m[0]}–${m[1]}, so ${prem}.`;
      }
    }
    return out;
  }
  function classView(records) {
    const kept = latestPerDevice(records), readings = kept.map(readRecord), ok = readings.filter(x => x !== null);
    const out = {}; ['balloon', 'bomb', 'hl', 'staircase'].forEach(g => { out[g] = summary(g, ok.map(x => x[g])); });
    out.hl.row10_A = ok.filter(x => x.hl.dominated).length;
    out.counts = { devices: kept.length, records: records.length, again: records.filter(([, , r]) => r && typeof r === 'object' && r.again).length, invalid: readings.length - ok.length };
    out._ok = ok;   // the per-student readings, for the charts (not in Hande's script)
    return out;
  }
  window.L14Reading = { bomb, balloon, holtLaury, staircase, offerAt, valid, readRecord, latestPerDevice, medianRange, summary, classView, FAST };

  // ======================================================================================================
  // The student side: opening, balloon, bomb box, Holt–Laury, staircase, save. One screen each, no going back.
  // ======================================================================================================
  const rec = { v: 1, b: [], x: null, h: '', s: '' }, secs = [0, 0, 0, 0];
  let gameStart = 0;
  const startClock = () => { gameStart = performance.now(); };
  const stopClock = j => { secs[j] = Math.round((performance.now() - gameStart) / 1000); };
  // Utku B1: a quick double tap must not answer the next screen. Taps are ignored for 400 ms after a screen (or new buttons)
  // is drawn; the guard sits on #app in the capture phase, so it runs before any button's own handler.
  let drawnAt = 0;
  const fresh = () => { drawnAt = performance.now(); };
  app.addEventListener('click', e => { if (performance.now() - drawnAt < 400) { e.stopPropagation(); e.preventDefault(); } }, true);
  function frame(title, body) {
    fresh();
    app.innerHTML = '<h1>Risk Games</h1><p class="s">Anonymous · about ' + MIN + ' minutes · Microeconomics · Lecture 14</p><h2>' + title + '</h2>' + body +
      '<div class="msg" id="msg">' + (PREVIEW ? 'Preview: nothing is sent.' : '') + '</div>';
    window.scrollTo(0, 0);
  }
  const say = h => { $('msg').innerHTML = h; if (/<button/.test(h)) fresh(); };

  function opening() {
    frame('Before you start', '<p>' + NW[0].toUpperCase() + NW.slice(1) + ' short games about money and chance. The money is imaginary: nobody is paid. Choose what you would really choose. There are no right answers.</p>' +
      '<button class="go" id="nx" type="button">Start</button>');
    $('nx').onclick = () => { startClock(); if (BALLOON) balloonScreen(); else bombScreen(); };
  }

  function balloonScreen() {
    const i = rec.b.length, X = rnd12(); let k = 0;
    const total = () => rec.b.reduce((a, x) => a + (/c$/.test(x) ? 3 * parseInt(x, 10) : 0), 0);
    frame('Game 1 · Balloon', '<p>Pump the balloon. Each pump adds €3 to this balloon\'s pot. The balloon pops at a random pump between 1 and 12 (each pump number equally likely). If it pops, this balloon\'s pot is lost. Press \'collect\' to keep the pot and go to the next balloon.</p>' +
      '<div class="game"><div class="s" style="margin:0">balloon ' + (i + 1) + ' of 5 · collected so far: €<span id="tot">' + total() + '</span></div>' +
      '<svg viewBox="0 0 200 200" width="150" height="150" aria-hidden="true"><circle id="bc" cx="100" cy="100" r="24" fill="#FDE4E6" stroke="#333" stroke-width="2"/></svg>' +
      '<div class="pot">pot: <b id="pot">€0</b> · pumps: <span id="k">0</span></div>' +
      '<div class="opts"><button class="go" id="pump" type="button" style="margin-top:0">pump</button><button class="opt" id="coll" type="button">collect</button></div></div>');
    const end = (code, html) => {
      rec.b.push(code); $('pump').disabled = $('coll').disabled = true; $('tot').textContent = total();
      const last = rec.b.length === 5;
      say(html + ' <button class="go" id="nx" type="button">' + (last ? 'next game' : 'next balloon') + '</button>');
      $('nx').onclick = () => { if (last) { stopClock(0); startClock(); bombScreen(); } else balloonScreen(); };
    };
    $('pump').onclick = () => {
      k++; $('k').textContent = k; $('bc').setAttribute('r', 24 + 6 * k);
      if (k >= X) { $('bc').setAttribute('fill', '#fff'); $('bc').setAttribute('stroke-dasharray', '4 6'); $('pot').textContent = '€0'; end(k + 'p', '<b>popped: €0 from this balloon.</b>'); }
      else $('pot').textContent = '€' + 3 * k;
    };
    $('coll').onclick = () => end(k + 'c', 'collected: €' + 3 * k + '.');
  }

  function bombScreen() {
    let k = null;
    let boxes = ''; for (let j = 1; j <= 12; j++) boxes += '<div class="box" id="bx' + j + '">' + j + '</div>';
    let nums = ''; for (let j = 0; j <= 12; j++) nums += '<button class="num" type="button" data-k="' + j + '">' + j + '</button>';
    frame('Game ' + (2 - G) + ' · Bomb box', '<p>12 boxes. 11 hold €3 each, one holds a bomb. Choose how many boxes to open (0 to 12). If the bomb is in one of your boxes, you get €0. Otherwise you get €3 for each box.</p>' +
      '<div class="game"><div class="boxes">' + boxes + '</div><div class="nums">' + nums + '</div>' +
      '<button class="go" id="open" type="button">open</button></div>');
    app.querySelectorAll('.num').forEach(b => b.onclick = () => {
      k = +b.dataset.k; say('');
      app.querySelectorAll('.num').forEach(x => x.classList.toggle('on', x === b));
      for (let j = 1; j <= 12; j++) $('bx' + j).classList.toggle('on', j <= k);
    });
    $('open').onclick = () => {
      if (k === null) { say('Please choose how many boxes to open (0 to 12).'); return; }
      const B = rnd12(); rec.x = k;
      app.querySelectorAll('.num').forEach(x => { x.disabled = true; }); $('open').disabled = true;
      $('bx' + B).classList.add('bomb'); $('bx' + B).textContent = 'bomb';
      say('The bomb was in box ' + B + '. ' + (B <= k ? 'It was in one of your boxes: you get <b>€0</b>.' : 'You get <b>€' + 3 * k + '</b>.') + ' <button class="go" id="nx" type="button">next game</button>');
      $('nx').onclick = () => { stopClock(1); startClock(); hlScreen(); };
    };
  }

  function hlScreen() {
    let rows = '';
    for (let r = 1; r <= 10; r++) {
      const die = r === 1 ? 'the die shows 1' : 'the die shows 1…' + r;
      const a = r === 10 ? '€40 for sure' : '€40 if ' + die + ', otherwise €32', b = r === 10 ? '€77 for sure' : '€77 if ' + die + ', otherwise €2';
      rows += '<tr id="hr' + r + '"><td>' + r + '</td><td><button class="opt" type="button" data-r="' + r + '" data-v="A">A: ' + a + '</button></td><td><button class="opt" type="button" data-r="' + r + '" data-v="B">B: ' + b + '</button></td></tr>';
    }
    frame('Game ' + (3 - G) + ' · Ten choices', '<p>Ten choices. In each row pick A or B. A ten-sided die decides the prize.</p>' +
      '<div class="game"><table class="hl">' + rows + '</table></div><button class="go" id="nx" type="button">next game</button>');
    const ch = Array(10).fill(null);
    app.querySelectorAll('.hl .opt').forEach(b => b.onclick = () => {
      const r = +b.dataset.r; ch[r - 1] = b.dataset.v; $('hr' + r).classList.remove('missing');
      $('hr' + r).querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
    });
    $('nx').onclick = () => {
      const miss = []; ch.forEach((v, j) => { if (!v) miss.push(j + 1); });
      miss.forEach(r => $('hr' + r).classList.add('missing'));
      if (miss.length) { say('Please pick A or B in every row (' + miss.length + ' missing, marked in red).'); return; }
      rec.h = ch.join(''); stopClock(2); startClock(); if (STAIR) stairScreen(); else saveScreen();
    };
  }

  function stairScreen() {
    const i = rec.s.length, X = offerAt(rec.s);
    frame('Game ' + (4 - G) + ' · Coin flip (' + (i + 1) + ' of 3)', '<p>A fair coin: heads €100, tails €0. Would you rather have the coin flip, or this sure amount?</p>' +
      '<div class="game opts col"><button class="opt" id="ss" type="button">€' + X + ' for sure</button><button class="opt" id="sf" type="button">the coin flip</button></div>');
    const pick = a => { rec.s += a; if (rec.s.length < 3) stairScreen(); else { stopClock(3); saveScreen(); } };
    $('ss').onclick = () => pick('S'); $('sf').onclick = () => pick('F');
  }

  function saveScreen() {
    frame('Save', '<p>That was ' + (NG === 2 ? 'both' : 'all ' + NW) + ' games. Tap save to send your answers (anonymous).</p><button class="go" id="save" type="button">save</button>');
    let busy = false;
    $('save').onclick = async () => {
      if (busy) return; busy = true; $('save').disabled = true;   // a double tap gives one record
      const out = { v: 1 }; if (BALLOON) out.b = rec.b.join('.'); out.x = rec.x; out.h = rec.h; if (STAIR) out.s = rec.s; out.t = secs.join('.');
      let again = false; try { again = localStorage.getItem('micro-l14-risk-saved') === '1'; } catch (e) {}
      if (again) out.again = 1;
      if (PREVIEW) { say('Preview: nothing is sent. The record would be ' + esc(JSON.stringify(out))); return; }
      say('Saving…');
      try {
        await P.submitText(POLL, { answers: out }, n => say('Busy, retrying ' + n + '…'));
        try { localStorage.setItem('micro-l14-risk-saved', '1'); } catch (e) {}
        $('save').style.display = 'none';
        say('Saved. Thank you! The class results come later in the lecture.');
      } catch (e) { busy = false; $('save').disabled = false; say('Not saved (are you offline?). Please tap save again.'); }
    };
  }

  // balloon off: every record object gets the same placeholder b ('0c.0c.0c.0c.0c'), so Hande's valid() checks only x, h, s and t.
  // Whatever b a record carries (none, forged, or a real one from before the switch) is never read, and the balloon reading
  // (score, fast flag) is never shown. t stays 4 numbers, the balloon's 0. With the balloon on, records go to classView unchanged.
  const adapt = rows => BALLOON && STAIR ? rows : rows.map(([d, ts, r]) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return [d, ts, r];
    const f = Object.assign({}, r); if (!BALLOON) f.b = '0c.0c.0c.0c.0c'; if (!STAIR) f.s = 'FSS'; return [d, ts, f];
  });
  window.L14Reading.adapt = adapt; window.L14Reading.BALLOON = BALLOON; window.L14Reading.STAIR = STAIR;   // for the tests
  // ======================================================================================================
  // ?results: the phase (shared, set by the lecturer) and the charts
  // ======================================================================================================
  // The phase tags (Utku B2). A tag is the first 8 hex of sha256('micro-gate:<teacher code>:L14-risk-phase:<session>:<p>'),
  // made only on the lecturer's device (the code is never in the site); the session is in the tag, so a tag from a test run
  // cannot be replayed into the class session. Students see the HIGHEST valid phase ever set: replaying an old tag cannot take
  // the view back. Tags dated before class (− 30 min) or more than 2 minutes in the future are ignored.
  const PHASE_CHECK = {
    ws26: { 1: 'b51dec083f6ef076abe74ffd524bc3385d06bd297e27be766cc72982b5350822', 2: '12ee9914c4a1952261e0f08d66db78f05118d56ea4386edb8dddf08e7b038336', 3: 'db446d81278879db970b7cb860118c062efc566c4c533224af48d3e01516246c' },
    test: { 1: '650167762e0a9deb33cf353320a8126ee55755c1dc3c4eb3f4671a3a7ca6f22c', 2: '69180475a26f540b68ed461a4afda9ed5c4e3efe913360467cf8031f1147af8f', 3: '26df8e50cfcad20954cbe2bb3cd21fbd7feb62df108473f096caafa08fcd0a4d' } };
  async function sha(x) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const window14 = () => { const w = P.classWindow && P.classWindow('L14'); return w ? [w[0] - 30 * 60000, w[1]] : null; };   // null in the test session
  async function sharedPhase() {
    const all = (await P.allAnswers(PHASE_POLL + '/'))[PHASE_POLL] || [], chk = PHASE_CHECK[P.session] || {}, w = window14(), late = Date.now() + 2 * 60000;
    let best = 0;
    for (const a of all) {
      const m = /^([1-3])-([0-9a-f]{8})$/.exec(String(a.value));
      if (!m || +m[1] <= best || a.ts > late || (w && a.ts < w[0])) continue;
      if (await sha('micro-gate-check:' + m[2]) === chk[m[1]]) best = +m[1];
    }
    return best;
  }
  // records: from class start − 30 min on (earlier ones are previews: counted, not read). Later ones are read and counted apart.
  async function loadRecords() {   // {rows: [device, ts, record], early, after}; the reading then takes the latest per device, then validates
    const w = window14(), all = (await P.tagRefs(POLL + '/')).filter(x => x.poll === POLL);
    const refs = all.filter(x => !w || x.ts >= w[0]), rows = [];
    for (let i = 0; i < refs.length; i += 8) {
      rows.push(...await Promise.all(refs.slice(i, i + 8).map(async x => {
        let r = null; try { const j = await P.blob(x.sha); r = j && j.answers; } catch (e) {}
        return [x.client, x.ts, r];
      })));
    }
    return { rows, early: all.length - refs.length, after: w ? refs.filter(x => x.ts > w[1]).length : 0 };
  }

  // a risk-premium range as in Hande's lines: €20–30, −€10–0, −€50–−20
  const rpLab = (lo, hi) => lo >= 0 ? '€' + lo + '–' + hi : '−€' + (-lo) + '–' + (hi < 0 ? '−' + (-hi) : hi);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, j) => a + j);
  const lowerMedian = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  // one vertical bar chart: bins [{lab, n, rp?}], an optional grey off-scale bar, a dashed line at bin index `at` (+.5 = between two bins)
  function chart(id, bins, opt) {
    const grey = opt.grey, all = bins.map(b => b.n).concat(grey ? [grey.n] : []), max = Math.max(1, ...all), tot = opt.total;
    const col = (b, cls) => '<div class="col' + (cls || '') + '" data-tip="' + esc(b.lab) + ': ' + esc(b.tip || (b.n + ' student' + (b.n === 1 ? '' : 's') + ' · ' + (tot ? Math.round(100 * b.n / tot) : 0) + '%')) + '">' +
      (BIGV && b.n ? '<span class="cn" style="bottom:calc(' + (100 * b.n / max).toFixed(1) + '% + 2px)">' + b.n + (tot ? '<small>' + Math.round(100 * b.n / tot) + '%</small>' : '') + '</span>' : '') +
      '<div class="bb" style="height:' + (100 * b.n / max).toFixed(1) + '%"></div></div>';
    const xlab = l => esc(l).replace(/–/g, '–<wbr>');   // a range label may wrap after its dash at 390 px
    // the dashed line is placed after drawing, on the real bar positions (placeLines): at a bar's centre, or between two bars (.5)
    let h = '<div class="chart" id="' + id + '" data-at="' + opt.at + '"><div class="plot">' + bins.map(b => col(b)).join('') + (grey ? '<div class="gap"></div>' + col(grey, ' grey') : '') +
      '<div class="vline"><span>' + esc(opt.lineLab) + '</span></div></div>' +
      '<div class="xl">' + bins.map(b => '<span>' + xlab(b.lab) + '</span>').join('') + (grey ? '<span class="gap"></span><span class="gl">' + esc(grey.lab) + '</span>' : '') + '</div>';
    if (opt.rp) h += '<div class="xl rp">' + bins.map(b => '<span>' + esc(b.rp) + '</span>').join('') + '</div><div class="axis">second row: risk premium (€50 − CE)</div>';
    h += '<div class="axis">' + esc(opt.axis) + '</div>';
    if (opt.sides) h += '<div class="sides"><span>← ' + esc(opt.sides[0]) + '</span><span>' + esc(opt.sides[1]) + ' →</span></div>';
    return h + '<div class="tip" id="' + id + '-tip"></div></div>';
  }

  // ?results&demo on this computer only: made-up records and local phase buttons, nothing is read or written (for the chart checks)
  const DEMO = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && /[?&]demo\b/.test(location.search);
  function demoRecords(n) {
    const rows = []; let seed = 7; const rn = k => { seed = (seed * 16807) % 2147483647; return seed % k; };
    for (let i = 0; i < n; i++) {
      const aim = 2 + rn(9), b = []; for (let j = 0; j < 5; j++) { const X = 1 + rn(12); b.push(aim >= X ? X + 'p' : aim + 'c'); }
      const sw = 2 + rn(6), h = rn(10) ? 'A'.repeat(sw) + 'B'.repeat(10 - sw) : 'ABABBABBBB';
      rows.push(['dev' + i, 1000 + i, { v: 1, b: b.join('.'), x: 2 + rn(9), h, s: ['SSF', 'SFS', 'SFF', 'FSS', 'FSF', 'FFS', 'FFF'][rn(7)], t: [8 + rn(60), 2 + rn(20), 10 + rn(90), 3 + rn(20)].join('.') }]);
    }
    rows.push(['dev0', 5, { b: 'junk' }], ['devX', 9, { b: '99c.1c.1c.1c.1c', x: 3, h: 'AAAABBBBBB', s: 'SFS' }]);
    return rows;
  }
  function placeLines(root) {
    root.querySelectorAll('.chart').forEach(c => {
      const at = Number(c.dataset.at), cols = c.querySelectorAll('.plot .col:not(.grey)'), v = c.querySelector('.vline');
      const a = cols[Math.floor(at)], b = cols[Math.ceil(at)];
      if (!a || !b || !v) return;
      const x = at % 1 ? (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2 : a.offsetLeft + a.offsetWidth / 2, sp = v.querySelector('span');
      v.style.left = x + 'px';
      if (sp) { const right = x > c.querySelector('.plot').offsetWidth / 2; sp.style.left = right ? 'auto' : '4px'; sp.style.right = right ? '4px' : 'auto'; }
    });
  }
  window.addEventListener('resize', () => { const r = $('res'); if (r) placeLines(r); });
  // ?results&big=1 (Can 26.11): the lecturer frame in the deck. The count (and %) above every bar, large type, and with
  // only=bomb|list|stair|balloon|same just that one chart. Opt-in: without big=1 nothing here runs.
  const BIGV = /[?&]big=1(&|$)/.test(location.search), ONLY = (/[?&]only=(bomb|list|stair|balloon|same)(&|$)/.exec(location.search) || [])[1] || null;
  const BIG_CSS = 'main{max-width:none;padding:2px 14px 6px}h1{display:none}#rn{font-size:18px;margin:0}' +
    '.phases{margin:2px 0}.phases .opt,.opts .opt{font-size:16px;padding:2px 8px}.opts{display:inline-flex;margin:0}#res h2{font-size:30px;margin:.2rem 0 0;border-top:0;padding-top:0}' +
    '.chart{margin:0}.plot{height:120px;margin-top:54px;gap:6px}.col{position:relative}.col .cn{position:absolute;left:-6px;right:-6px;text-align:center;font-size:30px;font-weight:700;line-height:1;color:#111}' +
    '.col .cn small{display:block;font-size:20px;font-weight:600;color:#444}.xl{font-size:26px;color:#111;gap:6px;margin-top:0}.xl .gap,.plot .gap{width:16px}' +
    '.vline span{font-size:24px;top:-56px;font-weight:600}.axis{font-size:22px;color:#333;margin:0}.sides{font-size:26px;font-weight:600;margin:0}' +
    '.meta{font-size:32px;color:#111;font-weight:600;margin:.1rem 0}.reading{font-size:32px;line-height:1.22;border-left-width:6px;margin:.2rem 0 .4rem}.tip{font-size:24px;min-height:0}' +
    '.same th,.same td{font-size:26px;padding:6px 14px}.msg{font-size:28px}';
  // only=…: after drawing, hide every element that belongs to another game (a game starts at its <h2>)
  function onlyOne(res) {
    if (!ONLY) return;
    const KEY = { bomb: 'Bomb box', list: 'Ten choices', stair: 'Coin flip', balloon: 'Balloon', same: 'Same person' };
    let keep = true;   // anything before the first game heading (e.g. 'Results open soon') stays
    [...res.children].forEach(e => { if (e.tagName === 'H2') keep = e.textContent.indexOf(KEY[ONLY]) >= 0; e.style.display = keep ? '' : 'none'; });
  }
  async function resultsView() {
    if (BIGV) { const st = document.createElement('style'); st.textContent = BIG_CSS; document.head.appendChild(st); }
    const T = DEMO || !!(P && P.teacher);
    app.innerHTML = '<h1>Risk Games · class results</h1><p class="meta" id="rn">loading…</p>' +
      (T ? '<div class="phases" id="ph"></div>' : '') + '<div class="opts"><button class="opt" id="rf" type="button">Refresh</button></div><div id="res"></div>';
    // the lecturer's device keeps the phase it tapped (Utku B2), so a replayed tag never moves the projector
    const LKEY = 'micro-l14-phase-' + (P && P.session);
    const LGET = () => { try { return Number(localStorage.getItem(LKEY)) || 0; } catch (e) { return 0; } };
    let phase = T && !DEMO ? LGET() : 0, shared = 0, armed = null;
    const PH = ['0 · closed', '1 · counts', '2 · attitudes', STAIR ? '3 · staircase CE' : '3 · same person'];
    function phaseButtons() {
      if (!T) return;
      $('ph').innerHTML = PH.map((l, j) => '<button class="opt' + (j === phase ? ' on' : '') + '" type="button" data-p="' + j + '">' + l + '</button>').join('') +
        (DEMO ? '' : '<span class="meta" style="align-self:center">students see phase ' + shared + '</span>');
      $('ph').querySelectorAll('.opt').forEach(b => b.onclick = async () => {
        const v = +b.dataset.p;
        if (DEMO) { phase = v; phaseButtons(); draw(); return; }
        // this device shows any phase; only a phase above the students' one is written, and that cannot be undone: tap twice
        if (v > shared && armed !== v) { armed = v; $('rn').textContent = 'tap "' + PH[v] + '" again to open it for everyone (it cannot be closed again)'; return; }
        armed = null; phase = v; try { localStorage.setItem(LKEY, String(v)); } catch (e) {}
        if (v > shared) {
          const code = (() => { try { return localStorage.getItem('micro-teacher-code') || ''; } catch (e) { return ''; } })();
          const tag = (await sha('micro-gate:' + code.trim() + ':L14-risk-phase:' + P.session + ':' + v)).slice(0, 8);
          $('rn').textContent = 'saving phase ' + v + '…';
          try { await P.submit(PHASE_POLL, v + '-' + tag); shared = v; } catch (e) { $('rn').textContent = 'phase not saved: tap again'; return; }
        }
        phaseButtons(); if (phase >= 1 && !cv) await loadData(); else draw();
      });
    }
    let cv = null, extra = { early: 0, after: 0 }, lastData = 0, dataPhase = -1;
    async function loadData() {
      if (DEMO) { cv = classView(adapt(demoRecords(Number((/[?&]demo=([0-9]+)/.exec(location.search) || [])[1] || 60)))); draw(); return; }
      const r = await loadRecords(); cv = classView(adapt(r.rows)); extra = r; lastData = Date.now(); dataPhase = phase; draw();
    }
    // Utku B3 (one shared token, ~5000 calls an hour): a student's device reads only the phase, every 2 minutes, and downloads
    // the records only from phase 1 on, when the phase changes or on Refresh (at most once a minute). The lecturer's device
    // reads everything every 30 s (each record is downloaded once and then cached on the device).
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
      const ok = cv._ok, n = ok.length, p2 = phase >= 2, p3 = phase >= 3;
      const fastTxt = (g, k) => k ? '<p class="meta">' + k + ' answered in under ' + FAST[g] + ' s</p>' : '';
      const wait = (title, m) => '<h2>' + title + '</h2><p class="meta">waiting for answers, n = ' + m + '</p>';
      let h = '';
      // balloon: bins 0–11 by whole part; grey "all 5 popped"
      const bs = ok.map(x => x.balloon), scored = bs.filter(b => !b.popped_all);
      if (!BALLOON) { /* the balloon is only shown in class: no chart */ }
      else if (n < 10) h += wait('Game 1 · Balloon', n);
      else {
        const bins = range(0, 11).map(k => {
          const inBin = scored.filter(b => Math.floor(b.score) === k), bin = { lab: k + '–' + k + '.9', n: inBin.length };
          if (k === 6) bin.tip = inBin.length + ' student' + (inBin.length === 1 ? '' : 's') + ' · of which exactly 6: ' + inBin.filter(b => b.score === 6).length + ' (risk neutral)';
          return bin;
        });
        const md = lowerMedian(scored.map(b => b.score));
        h += '<h2>Game 1 · Balloon</h2>' + chart('cb', bins, { total: n, grey: { lab: 'all 5 popped', n: bs.length - scored.length }, at: 5.5, lineLab: p2 ? 'risk neutral (6)' : 'most expected money (6)',
          axis: 'pumps on collected balloons (average)', sides: p2 ? ['risk averse', 'risk seeking'] : null }) +
          '<p class="meta">n = ' + n + (md !== null ? ' · median ' + md + ' pumps' : '') + '</p>' + fastTxt('balloon', cv.balloon.fast) + (p2 ? '<p class="reading">' + esc(cv.balloon.line) + '</p>' : '');
      }
      // bomb box: 0–12
      if (n < 10) h += wait('Game ' + (2 - G) + ' · Bomb box', n);
      else {
        const xs = ok.map(x => x.bomb.score);
        h += '<h2>Game ' + (2 - G) + ' · Bomb box</h2>' + chart('cx', range(0, 12).map(k => ({ lab: String(k), n: xs.filter(v => v === k).length })), { total: n, at: 6, lineLab: p2 ? 'risk neutral (6)' : 'most expected money (6)',
          axis: 'boxes opened', sides: p2 ? ['risk averse', 'risk seeking'] : null }) +
          '<p class="meta">n = ' + n + ' · median ' + lowerMedian(xs) + ' boxes</p>' + fastTxt('bomb', cv.bomb.fast) + (p2 ? '<p class="reading">' + esc(cv.bomb.line) + '</p>' : '');
      }
      // Holt–Laury: 0–10 A's of single switchers; grey "switched more than once"; row-10 A counted next to the chart
      if (n < 10) h += wait('Game ' + (3 - G) + ' · Ten choices', n);
      else {
        const hs = ok.map(x => x.hl), one = hs.filter(x => !x.switches_back);
        h += '<h2>Game ' + (3 - G) + ' · Ten choices</h2>' + chart('ch', range(0, 10).map(k => ({ lab: String(k), n: one.filter(x => x.score === k).length })), { total: n, grey: { lab: 'switched more than once', n: hs.length - one.length }, at: 4,
          lineLab: p2 ? 'risk neutral (4)' : 'most expected money (4)', axis: 'times you chose A', sides: p2 ? ['risk seeking', 'risk averse'] : null }) +
          '<p class="meta">n = ' + n + (one.length ? ' · median ' + lowerMedian(one.map(x => x.score)) + ' A\'s' : '') + (cv.hl.row10_A ? ' · ' + cv.hl.row10_A + ' chose A in row 10' : '') + '</p>' +
          fastTxt('hl', cv.hl.fast) + (p2 ? '<p class="reading">' + esc(cv.hl.line) + '</p>' : '');
      }
      // staircase: 8 CE bins; line between €40–50 and €50–60; phase 3: risk-premium row, side labels, reading + median
      if (!STAIR) { /* the staircase is its own survey on Thursday (L15): no chart */ }
      else if (n < 10) h += wait('Game ' + (4 - G) + ' · Coin flip', n);
      else {
        const R = [[0, 10], [10, 20], [20, 30], [30, 40], [40, 50], [50, 60], [60, 70], [70, 100]], ss = ok.map(x => x.staircase);
        const bins = R.map(([lo, hi]) => ({ lab: '€' + lo + '–' + hi, n: ss.filter(s => s.ce[0] === lo && s.ce[1] === hi).length, rp: rpLab(50 - hi, 50 - lo) }));
        h += '<h2>Game ' + (4 - G) + ' · Coin flip</h2>' + chart('cs', bins, { total: n, at: 4.5, lineLab: p3 ? 'risk neutral (€50)' : 'most expected money (€50)', axis: 'your sure-amount range (€)', rp: p3,
          sides: p3 ? ['risk averse', 'risk seeking'] : null }) + '<p class="meta">n = ' + n + '</p>' + fastTxt('staircase', cv.staircase.fast) + (p3 ? '<p class="reading">' + esc(cv.staircase.line) + '</p>' : '');
      }
      // phase 3, optional: same person, same answer? bomb-box label against Holt–Laury label, counts only, hidden under 10
      if (p3) {
        const both = ok.filter(x => x.hl.label !== null), L = ['averse', 'neutral', 'seeking'];
        if (both.length >= 10) {
          const same = both.filter(x => x.bomb.label === x.hl.label).length;
          h += '<h2>Same person, same answer?</h2><table class="same"><tr><th>bomb box ↓ · ten choices →</th>' + L.map(l => '<th>' + l + '</th>').join('') + '</tr>' +
            L.map(a => '<tr><th>' + a + '</th>' + L.map(b => '<td class="' + (a === b ? 'dg' : '') + '">' + both.filter(x => x.bomb.label === a && x.hl.label === b).length + '</td>').join('') + '</tr>').join('') + '</table>' +
            '<p class="reading">' + same + ' of ' + both.length + ' got the same label in both games.</p>';
        }
      }
      res.innerHTML = h;
      onlyOne(res);
      if (BIGV) res.querySelectorAll('.chart').forEach(c => {   // big: the dashed line's label goes into the axis caption, off the counts
        const sp = c.querySelector('.vline span'), ax = c.querySelector('.axis:last-of-type');
        if (sp && ax) { ax.textContent += ' · dashed line: ' + sp.textContent; sp.remove(); }
      });
      placeLines(res);
      res.querySelectorAll('.col').forEach(c => { const show = () => { const t = $(c.closest('.chart').id + '-tip'); if (t) t.textContent = c.dataset.tip; }; c.onclick = show; c.onmouseenter = show; });
    }
    $('rf').onclick = () => load(true);
    await load(false);
    if (!DEMO) setInterval(() => { if (!document.hidden) load(false); }, T ? 30000 : 120000);
  }

  if (RESULTS) resultsView(); else opening();
})();
