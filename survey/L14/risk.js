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
  function frame(title, body) {
    app.innerHTML = '<h1>Risk Games</h1><p class="s">Anonymous · about 8 minutes · Microeconomics · Lecture 14</p><h2>' + title + '</h2>' + body +
      '<div class="msg" id="msg">' + (PREVIEW ? 'Preview: nothing is sent.' : '') + '</div>';
    window.scrollTo(0, 0);
  }
  const say = h => { $('msg').innerHTML = h; };

  function opening() {
    frame('Before you start', '<p>Four short games about money and chance. The money is imaginary: nobody is paid. Choose what you would really choose. There are no right answers.</p>' +
      '<button class="go" id="nx" type="button">Start</button>');
    $('nx').onclick = () => { startClock(); balloonScreen(); };
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
    frame('Game 2 · Bomb box', '<p>12 boxes. 11 hold €3 each, one holds a bomb. Choose how many boxes to open (0 to 12). If the bomb is in one of your boxes, you get €0. Otherwise you get €3 for each box.</p>' +
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
    frame('Game 3 · Ten choices', '<p>Ten choices. In each row pick A or B. A ten-sided die decides the prize.</p>' +
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
      rec.h = ch.join(''); stopClock(2); startClock(); stairScreen();
    };
  }

  function stairScreen() {
    const i = rec.s.length, X = offerAt(rec.s);
    frame('Game 4 · Coin flip (' + (i + 1) + ' of 3)', '<p>A fair coin: heads €100, tails €0. Would you rather have the coin flip, or this sure amount?</p>' +
      '<div class="game opts col"><button class="opt" id="ss" type="button">€' + X + ' for sure</button><button class="opt" id="sf" type="button">the coin flip</button></div>');
    const pick = a => { rec.s += a; if (rec.s.length < 3) stairScreen(); else { stopClock(3); saveScreen(); } };
    $('ss').onclick = () => pick('S'); $('sf').onclick = () => pick('F');
  }

  function saveScreen() {
    frame('Save', '<p>That was all four games. Tap save to send your answers (anonymous).</p><button class="go" id="save" type="button">save</button>');
    let busy = false;
    $('save').onclick = async () => {
      if (busy) return; busy = true; $('save').disabled = true;   // a double tap gives one record
      const out = { v: 1, b: rec.b.join('.'), x: rec.x, h: rec.h, s: rec.s, t: secs.join('.') };
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

  // ======================================================================================================
  // ?results: the phase (shared, set by the lecturer) and the charts
  // ======================================================================================================
  // check hashes of the phase tags; a tag is the first 8 hex of sha256('micro-gate:<teacher code>:L14-risk-phase:<phase>'),
  // made only on the lecturer's device (the code is never in the site). The latest valid tag sets the phase.
  const PHASE_CHECK = {
    0: '760a736bf9ff72f6c401b18484d65c8e88d67109f71643361990ccc1b115b8e7',
    1: '23c3263f0487f1c3833f02ce57c9ff952fde1bfe071c691ca3afe41bea542438',
    2: 'ac69aee1cf0a684259969d06cf4c3d1f511f1cb48d09656e929591bb193242d0',
    3: '32d4943cdbb33a57be8603eacf26ef2ffebd23fbb6ea55e28ebad3fd2e1580c8' };
  async function sha(x) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  async function sharedPhase() {
    const all = (await P.allAnswers(PHASE_POLL + '/'))[PHASE_POLL] || [];
    let best = null;
    for (const a of all) {
      const m = /^([0-3])-([0-9a-f]{8})$/.exec(String(a.value));
      if (m && await sha('micro-gate-check:' + m[2]) === PHASE_CHECK[m[1]] && (!best || a.ts > best.ts)) best = { ts: a.ts, phase: +m[1] };
    }
    return best ? best.phase : 0;
  }
  // class start (config.js L14, Vienna) minus 30 minutes: earlier records are previews. The test session counts all.
  function fromTs() { const w = P.classWindow && P.classWindow('L14'); return w ? w[0] - 30 * 60000 : 0; }
  async function loadRecords() {   // every record, as [device, ts, record]; the reading then takes the latest per device, then validates
    const refs = (await P.tagRefs(POLL + '/')).filter(x => x.poll === POLL && x.ts >= fromTs()), out = [];
    for (let i = 0; i < refs.length; i += 8) {
      out.push(...await Promise.all(refs.slice(i, i + 8).map(async x => {
        let r = null; try { const j = await P.blob(x.sha); r = j && j.answers; } catch (e) {}
        return [x.client, x.ts, r];
      })));
    }
    return out;
  }

  // a risk-premium range as in Hande's lines: €20–30, −€10–0, −€50–−20
  const rpLab = (lo, hi) => lo >= 0 ? '€' + lo + '–' + hi : '−€' + (-lo) + '–' + (hi < 0 ? '−' + (-hi) : hi);
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, j) => a + j);
  const lowerMedian = xs => { const s = xs.slice().sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
  // one vertical bar chart: bins [{lab, n, rp?}], an optional grey off-scale bar, a dashed line at bin index `at` (+.5 = between two bins)
  function chart(id, bins, opt) {
    const grey = opt.grey, all = bins.map(b => b.n).concat(grey ? [grey.n] : []), max = Math.max(1, ...all), tot = opt.total;
    const col = (b, cls) => '<div class="col' + (cls || '') + '" data-tip="' + esc(b.lab) + ': ' + b.n + ' student' + (b.n === 1 ? '' : 's') + ' · ' + (tot ? Math.round(100 * b.n / tot) : 0) + '%"><div class="bb" style="height:' + (100 * b.n / max).toFixed(1) + '%"></div></div>';
    // the dashed line is placed after drawing, on the real bar positions (placeLines): at a bar's centre, or between two bars (.5)
    let h = '<div class="chart" id="' + id + '" data-at="' + opt.at + '"><div class="plot">' + bins.map(b => col(b)).join('') + (grey ? '<div class="gap"></div>' + col(grey, ' grey') : '') +
      '<div class="vline"><span>' + esc(opt.lineLab) + '</span></div></div>' +
      '<div class="xl">' + bins.map(b => '<span>' + esc(b.lab) + '</span>').join('') + (grey ? '<span class="gap"></span><span class="gl">' + esc(grey.lab) + '</span>' : '') + '</div>';
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
      v.style.left = (at % 1 ? (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2 : a.offsetLeft + a.offsetWidth / 2) + 'px';
    });
  }
  window.addEventListener('resize', () => { const r = $('res'); if (r) placeLines(r); });
  async function resultsView() {
    const T = DEMO || !!(P && P.teacher);
    app.innerHTML = '<h1>Risk Games · class results</h1><p class="meta" id="rn">loading…</p>' +
      (T ? '<div class="phases" id="ph"></div>' : '') + '<div class="opts"><button class="opt" id="rf" type="button">Refresh</button></div><div id="res"></div>';
    let phase = 0;
    const PH = ['0 · closed', '1 · counts', '2 · attitudes', '3 · staircase CE'];
    function phaseButtons() {
      if (!T) return;
      $('ph').innerHTML = PH.map((l, j) => '<button class="opt' + (j === phase ? ' on' : '') + '" type="button" data-p="' + j + '">' + l + '</button>').join('');
      $('ph').querySelectorAll('.opt').forEach(b => b.onclick = async () => {
        if (DEMO) { phase = +b.dataset.p; phaseButtons(); draw(); return; }
        const v = String(b.dataset.p), code = (() => { try { return localStorage.getItem('micro-teacher-code') || ''; } catch (e) { return ''; } })();
        const tag = (await sha('micro-gate:' + code.trim() + ':L14-risk-phase:' + v)).slice(0, 8);
        $('rn').textContent = 'saving phase ' + v + '…';
        try { await P.submit(PHASE_POLL, v + '-' + tag); phase = +v; phaseButtons(); draw(); } catch (e) { $('rn').textContent = 'phase not saved: tap again'; }
      });
    }
    let cv = null, nRec = 0;
    async function load() {
      $('rn').textContent = 'loading…';
      try { if (DEMO) { cv = classView(demoRecords(Number((/[?&]demo=([0-9]+)/.exec(location.search) || [])[1] || 60))); } else { phase = await sharedPhase(); const recs = await loadRecords(); nRec = recs.length; cv = classView(recs); } }
      catch (e) { $('rn').textContent = 'could not load: tap Refresh again'; return; }
      phaseButtons(); draw();
    }
    function draw() {
      const res = $('res');
      if (!cv) return;
      const C = cv.counts;
      $('rn').textContent = C.devices + ' devices · ' + C.records + ' records' + (C.again ? ' (' + C.again + ' again)' : '') + (C.invalid ? ' · not read: invalid, ' + C.invalid : '') + ' · phase ' + phase + ' · ' + new Date().toLocaleTimeString();
      if (phase === 0) { res.innerHTML = '<p class="msg">Results open soon.</p>'; return; }
      const ok = cv._ok, n = ok.length, p2 = phase >= 2, p3 = phase >= 3;
      const fastTxt = (g, k) => k ? '<p class="meta">' + k + ' answered in under ' + FAST[g] + ' s</p>' : '';
      const wait = (title, m) => '<h2>' + title + '</h2><p class="meta">waiting for answers, n = ' + m + '</p>';
      let h = '';
      // balloon: bins 0–11 by whole part; grey "all 5 popped"
      const bs = ok.map(x => x.balloon), scored = bs.filter(b => !b.popped_all);
      if (n < 10) h += wait('Game 1 · Balloon', n);
      else {
        const bins = range(0, 11).map(k => ({ lab: String(k), n: scored.filter(b => Math.floor(b.score) === k).length }));
        const md = lowerMedian(scored.map(b => b.score));
        h += '<h2>Game 1 · Balloon</h2>' + chart('cb', bins, { total: n, grey: { lab: 'all 5 popped', n: bs.length - scored.length }, at: 6, lineLab: p2 ? 'risk neutral (6)' : 'most expected money (6)',
          axis: 'pumps on collected balloons (average)', sides: p2 ? ['risk averse', 'risk seeking'] : null }) +
          '<p class="meta">n = ' + n + (md !== null ? ' · median ' + md + ' pumps' : '') + '</p>' + fastTxt('balloon', cv.balloon.fast) + (p2 ? '<p class="reading">' + esc(cv.balloon.line) + '</p>' : '');
      }
      // bomb box: 0–12
      if (n < 10) h += wait('Game 2 · Bomb box', n);
      else {
        const xs = ok.map(x => x.bomb.score);
        h += '<h2>Game 2 · Bomb box</h2>' + chart('cx', range(0, 12).map(k => ({ lab: String(k), n: xs.filter(v => v === k).length })), { total: n, at: 6, lineLab: p2 ? 'risk neutral (6)' : 'most expected money (6)',
          axis: 'boxes opened', sides: p2 ? ['risk averse', 'risk seeking'] : null }) +
          '<p class="meta">n = ' + n + ' · median ' + lowerMedian(xs) + ' boxes</p>' + fastTxt('bomb', cv.bomb.fast) + (p2 ? '<p class="reading">' + esc(cv.bomb.line) + '</p>' : '');
      }
      // Holt–Laury: 0–10 A's of single switchers; grey "switched more than once"; row-10 A counted next to the chart
      if (n < 10) h += wait('Game 3 · Ten choices', n);
      else {
        const hs = ok.map(x => x.hl), one = hs.filter(x => !x.switches_back);
        h += '<h2>Game 3 · Ten choices</h2>' + chart('ch', range(0, 10).map(k => ({ lab: String(k), n: one.filter(x => x.score === k).length })), { total: n, grey: { lab: 'switched more than once', n: hs.length - one.length }, at: 4,
          lineLab: p2 ? 'risk neutral (4)' : 'most expected money (4)', axis: 'times you chose A', sides: p2 ? ['risk seeking', 'risk averse'] : null }) +
          '<p class="meta">n = ' + n + (one.length ? ' · median ' + lowerMedian(one.map(x => x.score)) + ' A\'s' : '') + (cv.hl.row10_A ? ' · ' + cv.hl.row10_A + ' chose A in row 10' : '') + '</p>' +
          fastTxt('hl', cv.hl.fast) + (p2 ? '<p class="reading">' + esc(cv.hl.line) + '</p>' : '');
      }
      // staircase: 8 CE bins; line between €40–50 and €50–60; phase 3: risk-premium row, side labels, reading + median
      if (n < 10) h += wait('Game 4 · Coin flip', n);
      else {
        const R = [[0, 10], [10, 20], [20, 30], [30, 40], [40, 50], [50, 60], [60, 70], [70, 100]], ss = ok.map(x => x.staircase);
        const bins = R.map(([lo, hi]) => ({ lab: '€' + lo + '–' + hi, n: ss.filter(s => s.ce[0] === lo && s.ce[1] === hi).length, rp: rpLab(50 - hi, 50 - lo) }));
        h += '<h2>Game 4 · Coin flip</h2>' + chart('cs', bins, { total: n, at: 4.5, lineLab: p3 ? 'risk neutral (€50)' : 'most expected money (€50)', axis: 'your sure-amount range (€)', rp: p3,
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
      placeLines(res);
      res.querySelectorAll('.col').forEach(c => { const show = () => { const t = $(c.closest('.chart').id + '-tip'); if (t) t.textContent = c.dataset.tip; }; c.onclick = show; c.onmouseenter = show; });
    }
    $('rf').onclick = load;
    await load();
    setInterval(() => { if (!document.hidden) load(); }, 30000);
  }

  if (RESULTS) resultsView(); else opening();
})();
