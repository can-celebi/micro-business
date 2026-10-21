// L06 quizzes (Can, 21.10): three in-class quizzes that only Can can open. Filiz (Slide master), reviewed by Ali (Coder).
// - Gate: Can (teacher mode) taps [open] / [close] → submit('L06-gate-qN', 'open-<tag>' | 'closed-<tag>'), where tag is
//   derived from the teacher code. A student page accepts a gate answer only if sha256('micro-gate-check:' + tag)
//   matches the hash below, so no other device can open a quiz. Students check on load, on focus and with [check]
//   (10 s cooldown, no timer polling). Backup: a 4-digit board code (00_admin/keys/L06-quiz-board-codes.txt).
// - Answers: ONE submit per student (Ali, 21.10: one write each, results() reads all in one call):
//   q1/q2 = one letter per question ('a'…'d', '-' = skipped), e.g. 'bcacbd';
//   q3 = 'b' + two digits per line (v = round(99·x / x-intercept): 00 = all on y, 99 = all on x).
// - Teacher view: [open] [close] + [refresh] = progress only (submitted of signed in, answered per question; Can, R40).
//   No answers or shares here: the results are on the slide after each quiz (quizres.js; quiz 3: garp.js on L06-F3).
(function () {
  const Q = window.QUIZ, P = window.MicroPoll;
  const GATE_CHECK = {
    q1: { open: 'c1adb4e2fc1bb14cc6fb655548af8b6add7e529765a0b8691594bcf978e1c85a', closed: 'ac14ca852cc74f21d84829e01f3ebcef5c0816553e5bff5b37e9a5852f6a8221' },
    q2: { open: '763380a8a8e07e1041733f48d55aab47494669d546cab64738eaad9fdacf7de6', closed: 'a0152530b95bd78a917eed74c191d98136de61fb6b381db90b279bee27f4f55b' },
    q3: { open: '3ea429423ae401b4aee584b3343d3acacd0ba9726c000537001b044222e38c5e', closed: '861bafe4207838fea0354aae6cacb7d1c79be6c88059149a0ad8f0a6a86bca12' } };
  const BOARD = {
    q1: 'e0bc31c0f8e0c165692593335439f23a8e571b0e23ac01510ebb4e0c725bf0de',
    q2: '5cb10a0574d2ea62bc7a24939cd52b3de8c9cd837fed3f2628d350bb9fc130d9',
    q3: '9fc88bd2049362329b1d2dbff5fa70fdd99f841705df64577f63c0e227b2a04d' };

  // ---------- figures (SVG) ----------
  const ax = (inner, w, h) => `<svg viewBox="0 0 ${w || 260} ${h || 220}" class="fig"><line x1="30" y1="10" x2="30" y2="190" stroke="#222" stroke-width="1.5"/><line x1="30" y1="190" x2="250" y2="190" stroke="#222" stroke-width="1.5"/><text x="12" y="20" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif">y</text><text x="240" y="208" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif">x</text>${inner}</svg>`;
  const FIG = {
    up: ax('<path d="M45 175 Q 120 150 230 40" fill="none" stroke="#0062C4" stroke-width="3.5"/><circle cx="95" cy="152" r="5" fill="#222"/><text x="100" y="170" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif">A</text><circle cx="183" cy="84" r="5" fill="#222"/><text x="189" y="100" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif">B</text>'),
    cross: ax('<path d="M45 30 Q 80 150 235 175" fill="none" stroke="#0062C4" stroke-width="3.5"/><path d="M50 95 Q 110 140 235 150" fill="none" stroke="#D9480F" stroke-width="3.5" stroke-dasharray="9 6"/><text x="150" y="185" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif" fill="#0062C4">I₁</text><text x="212" y="140" font-size="15" font-style="italic" font-family="STIX Two Text, Georgia, serif" fill="#D9480F">I₂</text>')
  };

  // ---------- the quizzes ----------
  const QUIZZES = {
    q1: { title: 'quiz 1 · the budget line', setup: [['x', 'coffees · <span class="m"><i>p</i><sub>x</sub> = €4</span>'], ['y', 'everything else (composite good, in €) · <span class="m"><i>p</i><sub>y</sub> = 1</span>'], ['B', '<span class="m bud"><i>B</i> = €80</span>']],
      qs: [
        { t: 'How many coffees can you buy at most?', o: ['16', '20', '80', '320'], k: 'b' },
        { t: 'How much can you spend on everything else at most?', o: ['€4', '€20', '€80', '€76'], k: 'c' },
        { t: 'Your budget rises to €100, prices stay the same. The budget line …', o: ['shifts out, parallel', 'rotates out, the end on the y-axis stays', 'rotates out, the end on the x-axis stays', 'does not move'], k: 'a' },
        { t: 'Back to €80. The price of a coffee rises to €5. The budget line …', o: ['shifts in, parallel', 'rotates in, the end on the x-axis stays', 'rotates in, the end on the y-axis stays', 'shifts out, parallel'], k: 'c' },
        { t: '<span class="m"><i>y</i></span> is a composite good with <span class="m"><i>p</i><sub>y</sub> = 1</span>. One unit of y is …', o: ['one other product', '€1 spent on everything else', 'one coffee', 'nothing: y is only a label'], k: 'b' },
        { t: 'At <span class="m"><i>p</i><sub>x</sub> = €4</span>: one more coffee costs you how much of everything else?', o: ['€1', '€20', '€80', '€4'], k: 'd' }
      ] },
    q2: { title: 'quiz 2 · preferences and indifference curves', setup: [['transitive', 'a relation is transitive if, whenever A is related to B and B to C, A is related to C'], ['goods', 'x and y are both goods: more of each is better']],
      qs: [
        { t: 'Your friend\'s friend: if A is a friend of B, and B is a friend of C, is A always a friend of C? So, is the relation "is a friend of" transitive?', o: ['yes, it is transitive', 'no, it is not transitive'], k: 'b' },
        { t: 'Is the relation "is older than" transitive? (A is older than B, B is older than C …)', o: ['yes, it is transitive', 'no, it is not transitive'], k: 'a' },
        { t: 'Is the relation "beats" in rock–paper–scissors transitive? (rock beats scissors, scissors beat paper …)', o: ['yes, it is transitive', 'no, it is not transitive'], k: 'b' },
        { t: 'Can an indifference curve look like this?', fig: 'up', o: ['yes', 'no: it breaks completeness', 'no: it breaks more is better', 'no: it breaks convexity'], k: 'c' },
        { t: 'Can two indifference curves cross like this?', fig: 'cross', o: ['no: with more is better, it breaks transitivity', 'no: it breaks convexity', 'no: it breaks completeness', 'yes, curves can cross'], k: 'a' },
        { t: 'Three bundles A, B, C. You are indifferent between A and B (<span class="m"><i>A</i> ∼ <i>B</i></span>), and you strictly prefer B to C (<span class="m"><i>B</i> ≻ <i>C</i></span>). Your preferences are transitive. How do A and C compare?', o: ['<span class="m"><i>A</i> ∼ <i>C</i></span>', '<span class="m"><i>C</i> ≻ <i>A</i></span>', '<span class="m"><i>A</i> ≻ <i>C</i></span>', "can't tell"], k: 'c' },
        { t: 'You are indifferent between <span class="m"><i>X</i> = (20, 0)</span> and <span class="m"><i>Y</i> = (0, 20)</span> (apples, bananas). Your preferences are convex. The half-half mix <span class="m"><i>M</i> = (10, 10)</span> is …', o: ['worse than X and Y', 'at least as good as X and Y', "can't tell without knowing your tastes"], k: 'b' },
        { t: 'Sam strictly prefers bundle A to B, B to C, and C to A. Sam has C and pays €1 for every swap to a bundle Sam prefers. You offer C → B → A → C. How much has Sam paid when Sam holds C again?', o: ['€0', '€1', '€3', '€6'], k: 'c' }
      ] },
    q3: { title: 'quiz 3 · your choices on budget lines', budget: true,
      setup: [['story', 'each round you get a new budget for two goods you like, x and y'], ['task', 'tap the bundle you like best on each line (any point, also the ends)']],
      lines: (window.L06_LINES || []) }
  };
  const QZ = QUIZZES[Q];
  // back to the slide AFTER this quiz (Can, 21.10), in the whole window (the quiz may sit in a frame on the slide)
  const NEXT = { q1: 'L06-B1', q2: 'L06-C9', q3: 'L06-F2' }[Q];
  const BACK = `<a href="../../../lectures/L06/index.html#/${NEXT}" target="_top">→ back to the slides</a>`;

  // ---------- helpers ----------
  const $ = id => document.getElementById(id);
  async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, SS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const POLL = 'L06-' + Q, GATE = 'L06-gate-' + Q;
  const setupHTML = () => '<div class="setup' + (QZ.budget ? ' small' : '') + '">' + QZ.setup.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('') + '</div>';

  // gate: latest valid answer decides
  async function gateState() {
    // Ali/Murat (21.10): a separate tag per action; any valid 'closed' wins, else any valid 'open', else locked
    const r = await P.results(GATE); let open = false, closed = false;
    for (const x of r.responses) {
      const m = /^(open|closed)-([0-9a-f]{8})$/.exec(String(x.value));
      if (m && await sha('micro-gate-check:' + m[2]) === GATE_CHECK[Q][m[1]]) { if (m[1] === 'open') open = true; else closed = true; }
    }
    return closed ? 'closed' : open ? 'open' : 'locked';
  }

  // ---------- student view ----------
  let lastCheck = 0, built = false;
  function waiting(msg) {
    $('app').innerHTML = `<h1>${QZ.title}</h1><div class="lock"><p><b>not open yet.</b> The lecturer opens this quiz in class.</p>
      <p class="s">${msg || ''}</p><button class="go" id="chk" type="button">[ check if open ]</button>
      <p class="s" style="margin-top:1.4rem">code on the board? <input id="code" inputmode="numeric" maxlength="4" size="5"> <button class="opt" id="codego" type="button">open</button></p></div>`;
    $('chk').onclick = () => check(true);
    $('codego').onclick = async () => { if (await sha('micro-board:' + $('code').value.trim() + ':L06-' + Q) === BOARD[Q]) { SS('micro-l06-board-' + Q, '1'); build(); } else $('code').value = ''; };
  }
  async function check(manual) {
    if (built) return;
    if (LS('micro-l06-board-' + Q) === '1') return build();
    const now = Date.now();
    if (now - lastCheck < 10000) { if (manual) { const s = document.querySelector('.lock .s'); if (s) s.textContent = 'checked a few seconds ago: try again in a moment'; } return; }
    lastCheck = now;
    try { const s = await gateState(); if (s === 'open') build(); else waiting(s === 'closed' ? 'this quiz is closed.' : 'checked just now: still closed.'); }
    catch (e) { waiting('could not check (offline?). try again.'); }
  }
  function build() {
    built = true;
    const done = LS('micro-l06-done-' + P.session + '-' + Q);
    let h = `<h1>${QZ.title}</h1>` + setupHTML();
    if (done) { $('app').innerHTML = h + '<p class="msg">saved, thank you! Wait for the discussion. <br>' + BACK + '</p>'; return; }
    if (QZ.budget) return buildBudget(h);
    QZ.qs.forEach((q, i) => {
      h += `<div class="q" id="q${i}"><div class="t"><b>${i + 1}.</b> ${q.t}</div>${q.fig ? FIG[q.fig] : ''}<div class="opts">` +
        q.o.map((o, j) => `<button type="button" class="opt" data-q="${i}" data-a="${'abcd'[j]}">${'abcd'[j]}) ${o}</button>`).join('') + '</div></div>';
    });
    h += '<button class="go" id="go" type="button">[ submit ]</button><div class="msg" id="msg"></div>';
    $('app').innerHTML = h;
    const ans = QZ.qs.map(() => '-');
    document.querySelectorAll('.opt[data-q]').forEach(b => b.onclick = () => { const i = +b.dataset.q; ans[i] = b.dataset.a; document.querySelectorAll(`.opt[data-q="${i}"]`).forEach(x => x.classList.toggle('on', x === b)); });
    $('go').onclick = () => send(ans.join(''), ans.filter(a => a === '-').length);
  }
  async function send(value, skipped) {
    const msg = $('msg'), go = $('go');
    if (skipped && !go.dataset.warned) { go.dataset.warned = 1; msg.textContent = skipped + ' not answered: tap [ submit ] again to send anyway'; return; }
    if (go.disabled) return; go.disabled = true; msg.textContent = 'saving…';
    try {
      await P.submit(POLL, value, n => msg.textContent = 'busy, retry ' + n + '…');
      SS('micro-l06-done-' + P.session + '-' + Q, value);
      msg.innerHTML = 'saved, thank you! Wait for the discussion. <br>' + BACK;
      go.style.display = 'none';
    } catch (e) { msg.textContent = 'not saved (offline?). please try again'; go.disabled = false; }
  }

  // budget task: one line at a time, tap snaps to the line
  function buildBudget(h) {
    const L = QZ.lines, pick = L.map(() => null);
    let k = 0;
    $('app').innerHTML = h + '<div id="bt"></div>';
    const W = 300, M = 34, S = (W - M - 10) / 100;   // 0…100 on both axes
    const px = v => M + v * S, py = v => W - M - v * S;
    function draw() {
      const [Ix, Iy] = L[k], p = pick[k];
      let s = `<div class="round">round ${k + 1} of ${L.length}</div><svg id="bs" viewBox="0 0 ${W} ${W}" class="fig budget">`;
      for (let g = 20; g <= 100; g += 20) s += `<line x1="${px(g)}" y1="${py(0)}" x2="${px(g)}" y2="${py(100)}" stroke="#eee"/><line x1="${px(0)}" y1="${py(g)}" x2="${px(100)}" y2="${py(g)}" stroke="#eee"/><text x="${px(g)}" y="${py(0) + 15}" font-size="10" text-anchor="middle">${g}</text><text x="${px(0) - 5}" y="${py(g) + 3}" font-size="10" text-anchor="end">${g}</text>`;
      s += `<line x1="${px(0)}" y1="${py(0)}" x2="${px(100)}" y2="${py(0)}" stroke="#222"/><line x1="${px(0)}" y1="${py(0)}" x2="${px(0)}" y2="${py(100)}" stroke="#222"/>`;
      s += `<text x="${px(100)}" y="${py(0) + 28}" font-size="11" text-anchor="end">x</text><text x="${px(0) + 26}" y="${py(100) + 10}" font-size="11">y</text>`;
      s += `<line x1="${px(Ix)}" y1="${py(0)}" x2="${px(0)}" y2="${py(Iy)}" stroke="#0062C4" stroke-width="4" stroke-linecap="round"/>`;
      s += `<line id="hit" x1="${px(Ix)}" y1="${py(0)}" x2="${px(0)}" y2="${py(Iy)}" stroke="transparent" stroke-width="40"/>`;
      if (p != null) { const x = p * Ix, y = (1 - p) * Iy; s += `<circle cx="${px(x)}" cy="${py(y)}" r="8" fill="#D9480F"/>`; }
      s += '</svg>';
      const cur = p == null ? 'tap the line' : `your bundle: ${(p * Ix).toFixed(1)} of x, ${((1 - p) * Iy).toFixed(1)} of y`;
      s += `<div class="cur">${cur}</div><div class="nav">${k ? '<button class="opt" id="prev" type="button">← back</button>' : ''}` +
        (k < L.length - 1 ? `<button class="go" id="next" type="button" ${p == null ? 'disabled' : ''}>[ next line ]</button>` : `<button class="go" id="go" type="button" ${p == null ? 'disabled' : ''}>[ submit all ${L.length} ]</button>`) + '</div><div class="msg" id="msg"></div>';
      $('bt').innerHTML = s;
      const svg = $('bs');
      svg.onclick = ev => {
        const r = svg.getBoundingClientRect(), sx = (ev.clientX - r.left) / r.width * W, sy = (ev.clientY - r.top) / r.height * W;
        const x = (sx - M) / S, y = (W - M - sy) / S;
        // nearest point on the segment from (Ix, 0) to (0, Iy): t = share on x
        const dx = -Ix, dy = Iy, t0 = ((x - Ix) * dx + y * dy) / (dx * dx + dy * dy);
        const t = Math.max(0, Math.min(1, t0));   // t = 0 → (Ix, 0); t = 1 → (0, Iy)
        pick[k] = Math.round((1 - t) * 99) / 99; draw();
      };
      if ($('prev')) $('prev').onclick = () => { k--; draw(); };
      if ($('next')) $('next').onclick = () => { k++; draw(); };
      if ($('go')) $('go').onclick = () => send('b' + pick.map(p => String(Math.round(p * 99)).padStart(2, '0')).join(''), 0);
    }
    draw();
  }

  // ---------- teacher view ----------
  async function teacher() {
    const code = LS('micro-teacher-code') || '';
    const tag = async a => (await sha('micro-gate:' + code.trim() + ':L06-' + Q + ':' + a)).slice(0, 8);
    $('app').innerHTML = `<h1>${QZ.title} · lecturer</h1><p class="s">state: <b id="st">…</b></p>
      <div class="opts"><button class="go" id="op" type="button">[ open ]</button><button class="opt" id="cl" type="button">[ close ]</button><button class="opt" id="rf" type="button">[ refresh ]</button></div>
      <div id="res" class="res"></div>`;
    const setState = async v => { $('st').textContent = 'saving…'; try { await P.submit(GATE, v + '-' + await tag(v)); $('st').textContent = v; } catch (e) { $('st').textContent = 'not saved, tap again'; } };
    $('op').onclick = () => setState('open'); $('cl').onclick = () => { if ($('cl').dataset.sure) setState('closed'); else { $('cl').dataset.sure = 1; $('st').textContent = 'tap [ close ] again: closing is final for this quiz'; } };
    async function refresh() {
      $('res').textContent = 'loading…';
      try {
        $('st').textContent = await gateState();
        const r = await P.results(POLL), vals = r.responses.map(x => String(x.value));
        let signed = null; try { const wm = await P.whereMap('L06'); signed = Object.keys(wm || {}).length; } catch (e) {}
        let h = `<p class="big">${r.n} answered${signed ? ` <span class="s">of ${signed} signed in today</span>` : ''}</p>`;
        if (QZ.budget) {
          // progress only during the quiz (Can, R40); the consistency results are on slide L06-F3 afterwards
          const all = vals.filter(v => /^b\d+$/.test(v) && v.length === 1 + 2 * QZ.lines.length).length, pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
          if (signed) h += `<div class="bar"><span class="lab">submitted</span><span class="fill" style="width:${100 * r.n / signed}%"></span><span class="num">${pc(r.n, signed)} (${r.n} of ${signed})</span></div>`;
          h += `<p class="s" style="margin-top:1rem">all ${QZ.lines.length} lines answered: ${all} of ${r.n}</p><p class="s">the results come on the slide "how consistent were you?"</p>`;
        }
        else {
          // progress only, no answers (Can, 21.10): how many answered each question, and how complete the submissions are
          const n = QZ.qs.length, per = QZ.qs.map((q, k) => vals.filter(v => (v[k] || '-') !== '-').length);
          const done = vals.map(v => [...v].filter(a => a !== '-').length), all = done.filter(d => d === n).length;
          const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '–';
          if (signed) h += `<div class="bar"><span class="lab">submitted</span><span class="fill" style="width:${100 * r.n / signed}%"></span><span class="num">${pc(r.n, signed)} (${r.n} of ${signed})</span></div>`;
          h += `<p class="s" style="margin-top:1rem">answered per question (of ${r.n} submitted)</p>` + per.map((c, k) => `<div class="bar"><span class="lab">question ${k + 1}</span><span class="fill" style="width:${r.n ? 100 * c / r.n : 0}%"></span><span class="num">${pc(c, r.n)} (${c})</span></div>`).join('');
          h += `<p class="s" style="margin-top:1rem">all ${n} questions answered: ${all} of ${r.n}</p><p class="s">the results come on the next slide</p>`;
        }
        $('res').innerHTML = h;
      } catch (e) { $('res').textContent = 'could not load: tap [ refresh ] again'; }
    }
    $('rf').onclick = refresh; refresh();
  }

  if (P.teacher) teacher();
  else { waiting(''); check(false); window.addEventListener('focus', () => check(false)); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(false); }); }
})();
