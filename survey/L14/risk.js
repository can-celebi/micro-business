// L14 risk games (Risk.md Addition 10, Celebi's job 2, 23.11): four games as one anonymous survey, played live in class.
// Balloon, bomb box, Holt–Laury list, staircase. Hypothetical money: nothing is paid.
// One code per student: every answer is packed into ONE value of the choice poll "L14-risk" (one ref, one API call, the
// load-tested path); the latest code of a device counts. No names, no IDs, no keys in this file.
// ?preview: the full games, nothing is sent. ?results: the class distributions, lecturer only (teacher mode on that device);
// the reading (reference lines + one plain line per game) stays hidden until the lecturer taps "Reveal the reading".
// SKELETON: the numbers below are Carpenter's checked block (10_experiments frozen e65e3850f71c). His survey spec
// (Tue 24.11) can change them here only; the code below reads everything from GAMES.
(function () {
  const GAMES = {
    balloon: { n: 3, max: 12, euro: 3 },                       // each pump +€3; pops at a random pump 1..12, all equally likely
    box: { n: 12, euro: 3 },                                    // 12 boxes, €3 each, one hidden bomb
    hl: { A: [400, 320], B: [770, 20], rows: 10 },              // row k: the high prize with chance k/10 (points)
    stair: { win: 100, start: 40, steps: [20, 10] }             // a coin flip €100 or €0 against a sure amount
  };
  // the reading lines for the lecturer view: Hande's spec (Tue 18:00). Empty until then; never PS5 answers (Carpenter's hard rule).
  const READING = { balloon: '', box: '', hl: '', stair: '' };
  const MARK = { box: 6, stair: 50 };                           // the reference lines, shown only after "Reveal the reading"
  const POLL = 'L14-risk', VERSION = '1';
  // class start (Vienna): only codes from then on count in ?results; earlier taps are previews. The test session counts all.
  const FROM = Date.parse('2026-11-25T18:00:00+01:00');

  const P = window.MicroPoll, app = document.getElementById('app'), $ = id => document.getElementById(id);
  const PREVIEW = /[?&]preview\b/.test(location.search), RESULTS = /[?&]results\b/.test(location.search);
  const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };   // 0..n-1
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const out = { balloon: [], box: null, hl: [], stair: [] };

  // ---------- the code: "1.<pumps per balloon, p = popped>.<boxes>.<A/B per row>.<S sure / F flip per step>" ----------
  // e.g. 1.4-7p-5.6.AAAABBBBBB.SFS (≤ 40 characters, only letters, digits, '.', '-', so the poll engine keeps it unchanged)
  function encode() {
    return [VERSION, out.balloon.map(b => b.k + (b.pop ? 'p' : '')).join('-'), out.box, out.hl.join(''), out.stair.map(s => s.sure ? 'S' : 'F').join('')].join('.');
  }
  function decode(v) {
    const m = /^1\.((?:\d{1,2}p?-?)+)\.(\d{1,2})\.([AB]+)\.([SF]+)$/.exec(String(v));
    if (!m) return null;
    const balloon = m[1].split('-').filter(Boolean).map(x => ({ k: parseInt(x, 10), pop: /p$/.test(x) }));
    const box = Number(m[2]), hl = m[3], st = m[4];
    if (balloon.length !== GAMES.balloon.n || balloon.some(b => b.k > GAMES.balloon.max) || box > GAMES.box.n || hl.length !== GAMES.hl.rows || st.length !== GAMES.stair.steps.length + 1) return null;
    return { balloon, box, hl, st };
  }
  // the staircase: the offers a sequence of answers produces, and the CE range it traps
  function stairPath(st) {
    const G = GAMES.stair; let x = G.start, lo = 0, hi = G.win; const offers = [];
    for (let i = 0; i < st.length; i++) {
      offers.push(x);
      if (st[i] === 'S') { hi = Math.min(hi, x); x -= G.steps[i] || 0; } else { lo = Math.max(lo, x); x += G.steps[i] || 0; }
    }
    return { offers, lo, hi, next: x };
  }

  // ---------- the student side: one game per screen ----------
  const SCREENS = ['intro', 'balloon', 'box', 'hl', 'stair', 'done'];
  let screen = 0;
  function frame(title, body) {
    app.innerHTML = '<h1>Risk Games</h1><p class="s">Anonymous · 4 short games · about 8 minutes · Microeconomics · Lecture 14</p>' +
      '<h2>' + title + '</h2>' + body + '<div class="msg" id="msg">' + (PREVIEW ? 'Preview: nothing is sent.' : '') + '</div>';
  }
  function next() { screen++; show(); }
  function show() {
    window.scrollTo(0, 0);
    ({ intro, balloon, box, hl, stair, done })[SCREENS[screen]]();
  }
  function intro() {
    frame('Before you start', '<p>Four short games about money and chance. <b>Imagine the money is real</b>; nothing is paid. There are no right or wrong answers: choose what you would really do.</p>' +
      '<p class="s">Game ' + 1 + ' to 4, one per screen. Your answers are anonymous.</p><button class="go" id="nx" type="button">Start</button>');
    $('nx').onclick = next;
  }

  // 1 · balloon: pump or stop; the pop pump is drawn on this device (uniform 1..max)
  function balloon() {
    const G = GAMES.balloon, i = out.balloon.length;
    if (i >= G.n) return next();
    const popAt = 1 + rnd(G.max); let k = 0;
    frame('Game 1 · The balloon (' + (i + 1) + ' of ' + G.n + ')',
      '<p>Each pump adds <b>€' + G.euro + '</b> to the pot. Stop whenever you like and keep the pot. If the balloon pops, the pot is lost. It can pop at any pump up to ' + G.max + '.</p>' +
      '<div class="game"><svg id="bal" viewBox="0 0 200 200" width="160" height="160" aria-hidden="true"><circle id="bc" cx="100" cy="100" r="30" fill="#FDE4E6" stroke="#333" stroke-width="2"/></svg>' +
      '<div class="pot">Pot: <b id="pot">€0</b> · pumps: <span id="k">0</span></div>' +
      '<div class="opts"><button class="go" id="pump" type="button" style="margin-top:0">Pump</button><button class="opt" id="stop" type="button">Stop and keep the pot</button></div></div>');
    const upd = () => { $('pot').textContent = '€' + k * G.euro; $('k').textContent = k; $('bc').setAttribute('r', 30 + k * 5.5); };
    const finish = pop => {
      out.balloon.push({ k, pop });
      $('pump').disabled = $('stop').disabled = true;
      $('msg').innerHTML = (pop ? '<b>Pop!</b> The pot is lost.' : 'You keep <b>€' + k * G.euro + '</b>.') + ' <button class="go" id="nx" type="button">' + (out.balloon.length < G.n ? 'Next balloon' : 'Next game') + '</button>';
      if (pop) { $('bc').setAttribute('fill', '#fff'); $('bc').setAttribute('stroke-dasharray', '4 6'); }
      $('nx').onclick = () => balloon();
    };
    $('pump').onclick = () => { k++; upd(); if (k >= popAt) finish(true); };
    $('stop').onclick = () => finish(false);
  }

  // 2 · bomb box: how many of the 12 boxes to open (tap box k = open boxes 1..k; tap it again = open none)
  function box() {
    const G = GAMES.box; let n = null;
    frame('Game 2 · The bomb box', '<p>There are ' + G.n + ' boxes. Each box holds <b>€' + G.euro + '</b>, and one box, chosen at random, holds a bomb. Choose how many boxes to open. If the bomb is in one of them, you lose everything.</p>' +
      '<div class="game"><div class="boxes" id="bx"></div><div class="pot">Open <b id="bn">–</b> boxes · <span id="bv"></span></div>' +
      '<button class="opt" id="b0" type="button">Open none</button></div><button class="go" id="nx" type="button">Next game</button>');
    const bx = $('bx');
    for (let j = 1; j <= G.n; j++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'box'; b.textContent = j; b.onclick = () => set(n === j ? 0 : j); bx.appendChild(b); }
    const set = v => { n = v; [...bx.children].forEach((b, j) => b.classList.toggle('on', j < v)); $('bn').textContent = v; $('bv').textContent = v ? '€' + v * G.euro + ' if the bomb is not among them' : 'you keep €0'; $('msg').textContent = ''; };
    $('b0').onclick = () => set(0);
    $('nx').onclick = () => { if (n === null) { $('msg').textContent = 'Please choose how many boxes to open (or "Open none").'; return; } out.box = n; next(); };
  }

  // 3 · Holt–Laury: one A/B choice per row; raw choices kept (switching back and forth is data)
  function hl() {
    const G = GAMES.hl, R = G.rows;
    let rows = '';
    for (let r = 1; r <= R; r++) {
      const a = r === R ? G.A[0] + ' for sure' : G.A[0] + ' or ' + G.A[1], b = r === R ? G.B[0] + ' for sure' : G.B[0] + ' or ' + G.B[1];
      rows += '<tr id="hr' + r + '"><td>' + r + ' in ' + R + '</td><td><button class="opt" type="button" data-r="' + r + '" data-v="A">A: ' + a + '</button></td><td><button class="opt" type="button" data-r="' + r + '" data-v="B">B: ' + b + '</button></td></tr>';
    }
    frame('Game 3 · The lottery list', '<p>In every row, choose lottery A or lottery B. The first prize of each lottery comes with the chance in the left column, the second prize with the rest. Prizes are in points.</p>' +
      '<p class="s">Example, row 3: A pays ' + G.A[0] + ' with chance 3 in 10, otherwise ' + G.A[1] + '. B pays ' + G.B[0] + ' with chance 3 in 10, otherwise ' + G.B[1] + '.</p>' +
      '<div class="game"><table class="hl"><tr><td class="s">chance</td><td class="s">safe</td><td class="s">risky</td></tr>' + rows + '</table></div><button class="go" id="nx" type="button">Next game</button>');
    const ch = Array(R).fill(null);
    app.querySelectorAll('.hl .opt').forEach(b => b.onclick = () => {
      const r = +b.dataset.r; ch[r - 1] = b.dataset.v;
      $('hr' + r).classList.remove('missing');
      $('hr' + r).querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
    });
    $('nx').onclick = () => {
      const miss = ch.map((v, j) => v ? 0 : j + 1).filter(Boolean);
      miss.forEach(r => $('hr' + r).classList.add('missing'));
      if (miss.length) { $('msg').textContent = 'Please choose A or B in every row (' + miss.length + ' missing, marked in red).'; return; }
      out.hl = ch; next();
    };
  }

  // 4 · staircase: the sure amount moves after each answer (start 40, then ±20, then ±10)
  function stair() {
    const G = GAMES.stair, i = out.stair.length;
    if (i > G.steps.length) return next();
    const x = stairPath(out.stair.map(s => s.sure ? 'S' : 'F')).next;
    frame('Game 4 · The coin flip (' + (i + 1) + ' of ' + (G.steps.length + 1) + ')',
      '<p>A fair coin is flipped: heads you get <b>€' + G.win + '</b>, tails you get <b>€0</b>. Or you take a sure amount instead. Which do you choose?</p>' +
      '<div class="game opts col"><button class="opt" id="sf" type="button">The coin flip: €' + G.win + ' or €0</button><button class="opt" id="ss" type="button">€' + x + ' for sure</button></div>');
    const pick = sure => { out.stair.push({ x, sure }); stair(); };
    $('ss').onclick = () => pick(true); $('sf').onclick = () => pick(false);
  }

  async function done() {
    const code = encode();
    frame('Thank you', '<p>That was all four games. Your answers are being saved.</p>');
    if (PREVIEW) { $('msg').textContent = 'Preview: nothing is sent. Your code would be ' + code; return; }
    const msg = $('msg'); msg.textContent = 'Saving…';
    try {
      await P.submit(POLL, code, n => msg.textContent = 'Busy, retrying ' + n + '…');
      msg.innerHTML = 'Saved. Thank you!<br><span class="s">Keep this page open or go back to the slides. The class results come later in the lecture.</span>';
      try { localStorage.setItem('micro-l14-risk-done', '1'); } catch (e) {}
    } catch (e) {
      msg.innerHTML = 'Not saved (are you offline?). <button class="go" id="again" type="button">Try again</button>';
      $('again').onclick = done;
    }
  }

  // ---------- the lecturer side: ?results ----------
  function bars(rows, mark) {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return '<div class="bars">' + rows.map(([l, c, key]) => '<div class="bar' + (mark !== undefined && key === mark ? ' mark' : '') + '"><span class="l">' + esc(l) + '</span><span class="b" style="width:' + (c / max * 60).toFixed(1) + '%"></span><span class="n">' + c + '</span></div>').join('') + '</div>';
  }
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, j) => a + j);
  async function results() {
    app.innerHTML = '<h1>Risk Games · class results</h1><p class="s" id="rn">loading…</p>' +
      '<div class="opts"><button class="opt" id="rf" type="button">Refresh</button><button class="go" id="rv" type="button" style="margin-top:0">Reveal the reading</button></div><div id="res"></div>';
    if (!P || !P.teacher) { $('rn').textContent = 'The class results are for the lecturer only.'; $('rf').remove(); $('rv').remove(); return; }
    let shown = false;
    $('rv').onclick = () => { shown = !shown; $('res').classList.toggle('revealed', shown); $('rv').textContent = shown ? 'Hide the reading' : 'Reveal the reading'; };
    const load = async () => {
      $('rn').textContent = 'loading…';
      let r; try { r = await P.results(POLL); } catch (e) { $('rn').textContent = 'could not load: tap Refresh again'; return; }
      const all = (r.responses || []).filter(x => P.session === 'test' || Date.parse(x.time) >= FROM).map(x => decode(x.value)).filter(Boolean);
      const N = all.length, cnt = (vals, keys) => keys.map(k => vals.filter(v => v === k).length);
      // balloon: adjusted average pumps (mean over balloons that did not pop), rounded; all-popped students counted apart
      const adj = all.map(s => { const ok = s.balloon.filter(b => !b.pop); return ok.length ? Math.round(ok.reduce((a, b) => a + b.k, 0) / ok.length) : null; });
      const K = range(0, GAMES.balloon.max), allPop = adj.filter(v => v === null).length;
      const balloonRows = K.map(k => [k + (k === 1 ? ' pump' : ' pumps'), adj.filter(v => v === k).length, k]);
      const boxRows = range(0, GAMES.box.n).map(k => [k + (k === 1 ? ' box' : ' boxes'), all.filter(s => s.box === k).length, k]);
      // Holt–Laury: number of safe (A) choices; switching back and forth counted apart
      const safe = all.map(s => s.hl.split('').filter(c => c === 'A').length);
      const multi = all.filter(s => (s.hl.match(/AB|BA/g) || []).length > 1).length;
      const hlRows = range(0, GAMES.hl.rows).map(k => [k + ' safe', safe.filter(v => v === k).length, k]);
      // staircase: the CE range trapped by the answers
      const ces = all.map(s => stairPath(s.st)), labs = [...new Set(ces.map(c => c.lo + '|' + c.hi))].sort((a, b) => +a.split('|')[0] - +b.split('|')[0]);
      const stRows = labs.map(k => { const [lo, hi] = k.split('|').map(Number); return ['€' + lo + '–' + hi, ces.filter(c => c.lo === lo && c.hi === hi).length, lo < MARK.stair && MARK.stair <= hi ? MARK.stair : -1]; });
      $('rn').textContent = N + ' answered' + (r.n > N ? ' (' + (r.n - N) + ' left out: before class or not readable)' : '') + ' · ' + new Date().toLocaleTimeString();
      const rd = k => '<p class="reading">' + esc(READING[k] || '(reading line to come)') + '</p>';
      $('res').innerHTML =
        '<h2>Game 1 · The balloon</h2><p class="s">Average pumps on balloons that did not pop, per student. ' + allPop + ' with every balloon popped are not in the chart.</p>' + bars(balloonRows) + rd('balloon') +
        '<h2>Game 2 · The bomb box</h2><p class="s">Boxes opened.</p>' + bars(boxRows, MARK.box) + rd('box') +
        '<h2>Game 3 · The lottery list</h2><p class="s">Number of safe choices (A). ' + multi + ' switched back and forth more than once.</p>' + bars(hlRows) + rd('hl') +
        '<h2>Game 4 · The coin flip</h2><p class="s">The range of the sure amount that is worth the same as the flip, from the answers.</p>' + bars(stRows, MARK.stair) + rd('stair');
      $('res').classList.toggle('revealed', shown);
    };
    $('rf').onclick = load; load();
  }

  window.L14Risk = { encode, decode, stairPath, GAMES, out };   // for the tests (Utku) and the bring-back slides
  if (RESULTS) results(); else show();
})();
