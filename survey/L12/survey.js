// L12 survey (Can 11.11): one survey before the questions, on problem set 4 (how you worked with the LLM, how hard, words to equations).
// The engine of survey/L10/survey.js: anonymous, one record per device, poll "L12-s1" (submitText), the same gate and board code
// as L10's s1 (quiz 1). New here: kind 'one', a column of answer buttons. The page is chosen by window.S09.
(function () {
  const lik = (id, t, lo, hi) => ({ id, t, kind: 'lik', lo: lo || 'not at all', hi: hi || 'very comfortable' });
  const one = (id, t, o) => ({ id, t, kind: 'one', col: true, o });
  const PAGES = {
    s1: { title: 'before we start', sub: 'anonymous · about 3 minutes · microeconomics · lecture 12', items: [
      { head: 'problem set 4 · how you worked' },
      one('way', 'The problem set suggested: Problem 1 with your LLM, then Problem 2 on your own. Did you work this way?',
        [['y', 'yes'], ['p', 'partly'], ['n', 'no, I worked another way']]),
      one('und', 'If you went over an LLM\'s solution of Problem 1: did you understand it?',
        [['y', 'yes, every step'], ['m', 'most of it'], ['l', 'only a little'], ['x', 'I did not use an LLM for Problem 1']]),
      one('p2', 'Then Problem 2: were you able to solve it?',
        [['own', 'yes, on my own'], ['back', 'yes, after going back to the solution of Problem 1'], ['llm', 'only with help from the LLM'], ['no', 'no, I could not solve it'], ['skip', 'I did not try Problem 2']]),
      { head: 'problem set 4 · how hard, how long' },
      lik('p2d', 'Problem 2 · Kinked budget lines and a square root: how hard was it?', 'very easy', 'very hard'), { id: 'p2m', t: 'Problem 2 · Kinked budget lines and a square root: how many minutes did it take?', kind: 'num' },
      lik('p3d', 'Problem 3 · From words to equations: how hard was it?', 'very easy', 'very hard'), { id: 'p3m', t: 'Problem 3 · From words to equations: how many minutes did it take?', kind: 'num' },
      { id: 'ps-m', t: 'The whole problem set: how many minutes in total?', kind: 'num' },
      lik('ps-d', 'The whole problem set: how hard was it?', 'very easy', 'very hard'),
      { head: 'from words to equations' },
      lik('w-sub', 'Problem 3, Part A: from a story to the utility function of <b>perfect substitutes</b> (for example, two brands of pasta). How comfortable do you feel?'),
      lik('w-leo', 'Problem 3, Part B: from a story to a utility function of <b>perfect complements</b>, Leontief, with min (for example, hot dogs). How comfortable do you feel?'),
      lik('w-bud', 'Problem 3, Part C: from a story to the budget line, kinked ones included (for example, gym visits). How comfortable do you feel?'),
      one('cake', 'In the quiz, the hardest part was Problem 3, Part B (c): the cake with 3 eggs and 5 spoons of sugar. What made it hard for you?',
        [['ok', 'nothing, I got it right'], ['num', 'which number goes with which good'], ['two', 'that two different functions can describe the same preferences'], ['g', 'I was not sure and guessed']])
    ] },
    // survey 2 (Can 11.11, ~16:00): the three hardest non-calculation parts of the PS4 quiz again, a slight variation each. Answers a–e;
    // the key is not in this file (it sits encrypted under the teacher code in s2-key.json, read by the deck's results slide).
    // survey 3 (Can 11.11, Addition 7): every type of question so far (survey/L12/types.js); per type, understand 1–5 and want more practice yes/no
    s3: { title: 'what to practise', sub: 'anonymous · about 5 minutes · microeconomics · lecture 12', items: [
      { head: 'every type of question so far' },
      { note: 'For each line: how well do you understand it (1 not at all … 5 very well), and do you want more practice on it?' },
      ...(window.L12_TYPES || []).map(([id, , t]) => ({ id, t, kind: 'type' })),
      { head: 'anything else' },
      { id: 'more', t: 'Anything else you want to practise before the midterm?', kind: 'text' }
    ] },
    s2: { title: 'did it stick?', sub: 'anonymous · 3 questions · microeconomics · lecture 12', items: [
      one('k1', 'A salad requires 4 tomatoes and 3 cucumbers, always in that ratio. Let <span class="m"><i>x</i></span> denote the number of tomatoes and <span class="m"><i>y</i></span> the number of cucumbers. The consumer cares only about the number of salads. Consider these utility functions.<br>I. <span class="m"><i>u</i> = min{4<i>x</i>, 3<i>y</i>}</span><br>II. <span class="m"><i>u</i> = min{<span class="fr"><span><i>x</i></span><span>4</span></span>, <span class="fr"><span><i>y</i></span><span>3</span></span>}</span><br>III. <span class="m"><i>u</i> = min{3<i>x</i>, 4<i>y</i>}</span><br>Which of the utility functions above represent these preferences?',
        [['a', 'only II'], ['b', 'only III'], ['c', 'I and II'], ['d', 'II and III'], ['e', 'I, II and III']]),
      one('k2', 'A consumer has the utility function <span class="m"><i>u</i>(<i>x</i>, <i>y</i>) = <i>x</i><sup>2</sup><i>y</i></span>. Both prices are €1 and the income is €8, so the budget line is <span class="m"><i>x</i> + <i>y</i> = 8</span>. Consider the bundles P = (2, 6) and Q = (4, 4). The MRS is different at P and at Q. Consider these statements.<br>I. The exponent 2 in the utility function is different at P and at Q.<br>II. The ratio <span class="m"><span class="fr"><span><i>y</i></span><span><i>x</i></span></span></span> is different at P and at Q.<br>III. The marginal utility of <span class="m"><i>x</i></span> depends on both <span class="m"><i>x</i></span> and <span class="m"><i>y</i></span>.<br>Which of the statements above give the reason?',
        [['a', 'only I'], ['b', 'only II'], ['c', 'I and II'], ['d', 'II and III'], ['e', 'I, II and III']]),
      one('k3', 'A student has €30 a month. The first 4 washes in the dormitory laundry are free, and each further wash costs €3. The student can book at most 8 washes a month. All other goods cost €1 per unit. Let <span class="m"><i>x</i></span> denote the number of washes and <span class="m"><i>y</i></span> the quantity of all other goods. Which equations describe the student\'s budget line?',
        [['a', '<span class="m">3<i>x</i> + <i>y</i> = 30</span> for <span class="m"><i>x</i> ≤ 8</span>'], ['b', '<span class="m"><i>y</i> = 30</span> for <span class="m"><i>x</i> ≤ 4</span>, and <span class="m">3<i>x</i> + <i>y</i> = 30</span> for <span class="m">4 ≤ <i>x</i> ≤ 8</span>'], ['c', '<span class="m"><i>y</i> = 30</span> for <span class="m"><i>x</i> ≤ 4</span>, and <span class="m">3<i>x</i> + <i>y</i> = 42</span> for <span class="m">4 ≤ <i>x</i> ≤ 8</span>'], ['d', '<span class="m"><i>y</i> = 30</span> for <span class="m"><i>x</i> ≤ 4</span>, and <span class="m">3<i>x</i> + <i>y</i> = 34</span> for <span class="m">4 ≤ <i>x</i> ≤ 8</span>'], ['e', '<span class="m"><i>y</i> = 30</span> for <span class="m"><i>x</i> ≤ 4</span>, and <span class="m">3<i>x</i> + <i>y</i> = 42</span> for <span class="m"><i>x</i> ≥ 4</span>, with no limit on the number of washes']])
    ] }
  };
  const S = window.S09 || 's1', PG = PAGES[S], POLL = 'L12-' + S, ans = {}, txt = {};
  const app = document.getElementById('app');

  // ---------- the gate (Can, 29.10: surveys closed until the lecturer opens them, like the L08 quizzes) ----------
  // Same engine and hashes as survey/L08/quiz.js: open/close tags from the teacher code on the lecturer's device, the
  // L06 salts (s1 → 'q1', s2 → 'q2', s3 → 'q3'), so Can's board codes for quiz 1/2/3 also open survey 1/2/3. A valid
  // 'closed' wins. Gate poll: L12-gate-s1. Nothing about the answers changes.
  const GATE_CHECK = {
    q1: { open: 'c1adb4e2fc1bb14cc6fb655548af8b6add7e529765a0b8691594bcf978e1c85a', closed: 'ac14ca852cc74f21d84829e01f3ebcef5c0816553e5bff5b37e9a5852f6a8221' },
    q2: { open: '763380a8a8e07e1041733f48d55aab47494669d546cab64738eaad9fdacf7de6', closed: 'a0152530b95bd78a917eed74c191d98136de61fb6b381db90b279bee27f4f55b' },
    q3: { open: '3ea429423ae401b4aee584b3343d3acacd0ba9726c000537001b044222e38c5e', closed: '861bafe4207838fea0354aae6cacb7d1c79be6c88059149a0ad8f0a6a86bca12'  },
    'L12-q2': { open: '6a7ae4e3dee5411a46025cf95d284d7ea46a89f343b8ef22e9212aad2c9713c9', closed: '042fb3c9c3e824509247854a35fe05a6e187d0d10e8c065b6d1d0eeb94641ea1' },
    'L12-q3': { open: 'ee1a8ba52aa92e336d6e16c9ad46af8823b4b4195ae9ca3a5d5e3285df13f54c', closed: 'f2c7d9d4de9b31a2c1fc7f78dd3249d2308eef51f9f439b597a2f9bd511c9e8e' } };
  const BOARD = {
    q1: 'e0bc31c0f8e0c165692593335439f23a8e571b0e23ac01510ebb4e0c725bf0de',
    q2: '5cb10a0574d2ea62bc7a24939cd52b3de8c9cd837fed3f2628d350bb9fc130d9',
    q3: '9fc88bd2049362329b1d2dbff5fa70fdd99f841705df64577f63c0e227b2a04d',
    'L12-q2': '092991596ea53f7c634f511877f914be168317acd63f7d902c9424c551a08334',
    'L12-q3': '54071965c96b8fba871aac7a3eb3ef24e94e614006766f0de98b7e08bd27a0bc' };

  // s2 and s3 have their own salt (L12-), so no open/closed tag from an earlier survey can be replayed on it (Utku); their board codes are the quiz-2 and quiz-3 codes.
  const P = window.MicroPoll, SALT = S === 's1' ? 'L06-' : 'L12-', GQ = { s1: 'q1', s2: 'q2', s3: 'q3' }[S], GK = S === 's1' ? GQ : 'L12-' + GQ, GATE = 'L12-gate-' + S;
  const $ = id => document.getElementById(id);
  async function sha(x) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, SS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  async function gateState() {
    const r = await P.results(GATE); let open = false, closed = false;
    for (const x of r.responses) {
      const mm = /^(open|closed)-([0-9a-f]{8})$/.exec(String(x.value));
      if (mm && await sha('micro-gate-check:' + mm[2]) === GATE_CHECK[GK][mm[1]]) { if (mm[1] === 'open') open = true; else closed = true; }
    }
    return closed ? 'closed' : open ? 'open' : 'locked';
  }
  let lastCheck = 0, built = false;
  function waiting(msg) {
    app.innerHTML = '<h1>&gt; ' + PG.title + '<span class="cursor"></span></h1><p class="s">' + PG.sub + '</p><div class="q"><p><b>not open yet.</b> The lecturer opens this survey in class.</p><p class="s">' + (msg || '') + '</p>' +
      '<button class="go" id="chk" type="button">[ check if open ]</button><p class="s" style="margin-top:1.2rem">code on the board? <input id="code" inputmode="numeric" maxlength="4" size="5"> <button class="opt" id="codego" type="button">open</button></p></div>';
    $('chk').onclick = () => check(true);
    $('codego').onclick = async () => { if (await sha('micro-board:' + $('code').value.trim() + ':' + SALT + GQ) === BOARD[GK]) { SS('micro-l12-board-' + S, '1'); buildSurvey(); } else $('code').value = ''; };
  }
  async function check(manual) {
    if (built) return;
    if (LS('micro-l12-board-' + S) === '1') return buildSurvey();
    const now = Date.now();
    if (now - lastCheck < 10000) { if (manual) { const x = document.querySelector('.q .s'); if (x) x.textContent = 'checked a few seconds ago: try again in a moment'; } return; }
    lastCheck = now;
    try { const st = await gateState(); if (st === 'open') buildSurvey(); else waiting(st === 'closed' ? 'this survey is closed.' : 'checked just now: still closed.'); }
    catch (e) { waiting('could not check (offline?). try again.'); }
  }
  async function teacher() {
    const code = LS('micro-teacher-code') || '';
    const tag = async v => (await sha('micro-gate:' + code.trim() + ':' + SALT + GQ + ':' + v)).slice(0, 8);
    app.innerHTML = '<h1>&gt; ' + PG.title + ' · lecturer</h1><p class="s">state: <b id="st">…</b></p>' +
      '<div class="opts"><button class="go" id="op" type="button">[ open ]</button> <button class="opt" id="cl" type="button">[ close ]</button> <button class="opt" id="rf" type="button">[ refresh ]</button></div><div id="res" class="msg"></div>';
    const setState = async v => { $('st').textContent = 'saving…'; try { await P.submit(GATE, v + '-' + await tag(v)); $('st').textContent = v; } catch (e) { $('st').textContent = 'not saved, tap again'; } };
    $('op').onclick = () => setState('open');
    $('cl').onclick = () => { if ($('cl').dataset.sure) setState('closed'); else { $('cl').dataset.sure = 1; $('st').textContent = 'tap [ close ] again: closing is final for this survey'; } };
    async function refresh() {
      $('res').textContent = 'loading…';
      try { $('st').textContent = await gateState(); const r = await P.textResults(POLL).catch(() => []); const n = new Set((r || []).filter(x => x.poll === POLL).map(x => x.client)).size; $('res').innerHTML = '<b>' + n + ' answered</b> <span class="s">· the results are on the next slide</span>'; }
      catch (e) { $('res').textContent = 'could not load: tap [ refresh ] again'; }
    }
    $('rf').onclick = refresh; refresh();
  }
  function buildSurvey() {
    built = true;
    app.innerHTML = '<h1>&gt; ' + PG.title + '<span class="cursor"></span></h1><p class="s">' + PG.sub + '</p><div id="f"></div><button class="go" id="go" type="button">[ submit ]</button><div class="msg" id="msg"></div>';
    const f = document.getElementById('f');
    const pick = (box, b) => box.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b));
    PG.items.forEach(q => {
      if (q.head) { f.insertAdjacentHTML('beforeend', '<h2>' + q.head + '</h2>'); return; }
      if (q.note) { f.insertAdjacentHTML('beforeend', '<p class="s">' + q.note + '</p>'); return; }
      if (q.kind === 'type') {   // one line, two answers: understand 1–5 (u-<id>) and more practice yes/no (p-<id>)
        const d = document.createElement('div'); d.className = 'q likert typ'; d.id = 'q-' + q.id;
        d.innerHTML = '<div class="t">' + q.t + '</div>';
        const row = document.createElement('div'); row.className = 'opts';
        const u = document.createElement('div'); u.className = 'opts'; const pr = document.createElement('div'); pr.className = 'opts';
        ['1', '2', '3', '4', '5'].forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = v; b.onclick = () => { ans['u-' + q.id] = v; pick(u, b); }; u.appendChild(b); });
        [['y', 'more practice'], ['n', 'no']].forEach(([v, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = l; b.onclick = () => { ans['p-' + q.id] = v; pick(pr, b); }; pr.appendChild(b); });
        u.insertAdjacentHTML('afterbegin', '<span class="opt-note" style="align-self:center">understand</span>'); pr.insertAdjacentHTML('afterbegin', '<span class="opt-note" style="align-self:center">practice?</span>');
        row.style.cssText = 'gap:14px;align-items:center'; row.appendChild(u); row.appendChild(pr); d.appendChild(row); f.appendChild(d); return;
      }
      const d = document.createElement('div'); d.className = 'q' + (q.kind === 'lik' ? ' likert' : ''); d.id = 'q-' + q.id;
      d.innerHTML = '<div class="t">' + q.t + '</div>';
      if (q.kind === 'text') { const t = document.createElement('textarea'); t.maxLength = 400; t.rows = 2; t.oninput = () => { txt[q.id] = t.value; }; d.insertAdjacentHTML('beforeend', '<div class="opt-note">optional</div>'); d.appendChild(t); f.appendChild(d); return; }
      if (q.kind === 'num') { const n = document.createElement('input'); n.type = 'number'; n.min = 0; n.max = 600; n.step = 1; n.inputMode = 'numeric'; n.style.cssText = 'font:inherit;width:6em;padding:6px;border:1.5px solid #bbb;border-radius:2px'; n.oninput = () => { const v = Math.round(Number(n.value)); if (n.value !== '' && v >= 0 && v <= 600) ans[q.id] = String(v); else delete ans[q.id]; }; d.appendChild(n); d.insertAdjacentHTML('beforeend', ' <span class="opt-note">minutes</span>'); f.appendChild(d); return; }
      const box = document.createElement('div'); box.className = 'opts' + (q.col ? ' col' : '');
      const opts = q.kind === 'lik' ? ['1', '2', '3', '4', '5'].map(v => [v, v]) : q.letters ? q.o.map((l, k) => ['abcd'[k], l]) : q.o;
      opts.forEach(([c, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = q.letters ? '<span class="m">' + l + '</span>' : l; b.onclick = () => { ans[q.id] = c; pick(box, b); }; box.appendChild(b); });
      d.appendChild(box);
      if (q.kind === 'lik') d.insertAdjacentHTML('beforeend', '<div class="scale"><span>1 · ' + q.lo + '</span><span>5 · ' + q.hi + '</span></div>');
      f.appendChild(d);
    });
    async function submit() {
      const msg = document.getElementById('msg'), need = PG.items.filter(q => q.id && q.kind !== 'text').flatMap(q => q.kind === 'type' ? ['u-' + q.id, 'p-' + q.id] : [q.id]), missing = need.filter(id => !ans[id]);
      document.querySelectorAll('.q').forEach(d => d.classList.remove('missing'));
      missing.forEach(id => { const d = document.getElementById('q-' + id.replace(/^[up]-(t\d+)$/, '$1')); if (d) d.classList.add('missing'); });
      if (missing.length) { msg.textContent = 'please answer every question (' + missing.length + ' missing, in red)' + ''; return; }
      const go = document.getElementById('go'); if (go.disabled) return; go.disabled = true;   // no double records from a double tap
      msg.textContent = 'saving…';
      const comments = {}; Object.keys(txt).forEach(k => { const v = (txt[k] || '').trim(); if (v) comments[k] = v; });
      try {
        await window.MicroPoll.submitText(POLL, { answers: ans, comments: comments }, n => msg.textContent = 'busy, retry ' + n + '…');
        msg.innerHTML = 'saved, thank you! <br><a href="../../../lectures/L12/index.html" target="_top">→ back to the slides</a>';
        go.style.display = 'none';
      } catch (e) { msg.textContent = 'not saved (offline?). please try again'; go.disabled = false; }
    }
    document.getElementById('go').onclick = submit;
  }
  if (P && P.teacher) teacher();
  else { waiting(''); check(false); window.addEventListener('focus', () => check(false)); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(false); }); }
})();
