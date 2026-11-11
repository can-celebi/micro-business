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
    q3: { open: '3ea429423ae401b4aee584b3343d3acacd0ba9726c000537001b044222e38c5e', closed: '861bafe4207838fea0354aae6cacb7d1c79be6c88059149a0ad8f0a6a86bca12' } };
  const BOARD = {
    q1: 'e0bc31c0f8e0c165692593335439f23a8e571b0e23ac01510ebb4e0c725bf0de',
    q2: '5cb10a0574d2ea62bc7a24939cd52b3de8c9cd837fed3f2628d350bb9fc130d9',
    q3: '9fc88bd2049362329b1d2dbff5fa70fdd99f841705df64577f63c0e227b2a04d' };

  const P = window.MicroPoll, SALT = 'L06-', GQ = { s1: 'q1', s2: 'q2', s3: 'q3' }[S], GATE = 'L12-gate-' + S;
  const $ = id => document.getElementById(id);
  async function sha(x) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(x)); return [...new Uint8Array(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const LS = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, SS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  async function gateState() {
    const r = await P.results(GATE); let open = false, closed = false;
    for (const x of r.responses) {
      const mm = /^(open|closed)-([0-9a-f]{8})$/.exec(String(x.value));
      if (mm && await sha('micro-gate-check:' + mm[2]) === GATE_CHECK[GQ][mm[1]]) { if (mm[1] === 'open') open = true; else closed = true; }
    }
    return closed ? 'closed' : open ? 'open' : 'locked';
  }
  let lastCheck = 0, built = false;
  function waiting(msg) {
    app.innerHTML = '<h1>&gt; ' + PG.title + '<span class="cursor"></span></h1><p class="s">' + PG.sub + '</p><div class="q"><p><b>not open yet.</b> The lecturer opens this survey in class.</p><p class="s">' + (msg || '') + '</p>' +
      '<button class="go" id="chk" type="button">[ check if open ]</button><p class="s" style="margin-top:1.2rem">code on the board? <input id="code" inputmode="numeric" maxlength="4" size="5"> <button class="opt" id="codego" type="button">open</button></p></div>';
    $('chk').onclick = () => check(true);
    $('codego').onclick = async () => { if (await sha('micro-board:' + $('code').value.trim() + ':' + SALT + GQ) === BOARD[GQ]) { SS('micro-l12-board-' + S, '1'); buildSurvey(); } else $('code').value = ''; };
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
      const msg = document.getElementById('msg'), need = PG.items.filter(q => q.id && q.kind !== 'text').map(q => q.id), missing = need.filter(id => !ans[id]);
      document.querySelectorAll('.q').forEach(d => d.classList.remove('missing'));
      missing.forEach(id => { const d = document.getElementById('q-' + id); if (d) d.classList.add('missing'); });
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
