// L09 surveys (Can 29.10: "survey question at the beginning as well as … one in the middle and one at the end"), Sinan's
// v2.1 (Murat PASS), Hande's ids. Three short pages s1 (start), s2 (middle), s3 (end), like S08: tap answers, one optional
// comment, anonymous. ONE record per device and page: poll "L09-s1" | "L09-s2" | "L09-s3" (submitText: {answers, comments}).
// Repeated items keep their id (can-graph, can-tangency, can-cornerkink, check in s1 and s3; slider, pace in s2 and s3).
// The check questions store the option letter (a = first option …); the keys are NOT in this file (R50), the results
// slide has them. The page is chosen by window.S09 = 's1' | 's2' | 's3' (set in each index.html).
(function () {
  const m = s => '<span class="m">' + s + '</span>';
  const SELF = [['can-graph', 'I could find the best feasible bundle on a budget line by looking at a graph.'],
    ['can-tangency', 'I could say why the best feasible bundle is where an indifference curve just touches the budget line.'],
    ['can-cornerkink', 'I could find the best feasible bundle for perfect substitutes or perfect complements.']];
  const selfItems = () => SELF.map(([id, t]) => ({ id, t, kind: 'lik', lo: 'not at all', hi: 'yes, right now' }));
  const SLIDER = { id: 'slider', kind: 'choice', o: [['yes', 'yes'], ['no', 'no'], ['nodev', 'no device']] };
  const PACE = { id: 'pace', t: 'The pace is …', kind: 'lik', lo: 'too slow', hi: 'too fast' };
  const PAGES = {
    s1: { title: 'before we start', sub: 'anonymous · about 2 minutes · microeconomics · lecture 9', items: [
      { head: 'what you bring' },
      { id: 'vec', t: 'A vector, like ' + m('(3, 1)') + ', drawn as an arrow. How familiar is it to you?', kind: 'lik', lo: 'never seen it', hi: 'I could explain it' },
      { id: 'deriv', t: 'Taking a derivative, e.g. of ' + m('<i>x</i>²') + ' or of ' + m('√<i>x</i>') + '. How easy is it for you?', kind: 'lik', lo: 'never done it', hi: 'easy' },
      { id: 'cf-deriv', t: 'How comfortable are you with derivatives (e.g. of ' + m('<i>x</i>²') + ' or ' + m('√<i>x</i>') + ')?', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'lagr', t: 'Have you seen the Lagrange method (the Lagrangian, λ) before?', kind: 'choice', o: [['no', 'no'], ['name', 'heard the name only'], ['math', 'yes, in a maths course'], ['econ', 'yes, in an economics course']] },
      { head: 'how comfortable are you with …' },
      { id: 'cf-partial', t: 'partial derivatives (e.g. of ' + m('<i>x</i> · <i>y</i>') + ' with respect to x)', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-grad', t: 'the gradient (the vector of partial derivatives)', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-pvec', t: 'the price vector ' + m('(<i>p</i><sub>x</sub>, <i>p</i><sub>y</sub>)') + '', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-lagr', t: 'the Lagrangian', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-cd', t: 'Cobb-Douglas utility (e.g. ' + m('<i>u</i> = <i>x</i> · <i>y</i>') + ')', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-corner', t: 'interior vs corner solutions', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { head: 'right now' }, ...selfItems(),
      { head: 'one question' },
      { id: 'check', t: m('<i>u</i> = <i>x</i> · <i>y</i>') + '. ' + m('<i>p</i><sub>x</sub> = 2') + ', ' + m('<i>p</i><sub>y</sub> = 1') + ', ' + m('<i>B</i> = 40') + ', so the budget line is ' + m('2<i>x</i> + <i>y</i> = 40') + '. Which is the best feasible bundle? (all four cost exactly €40)', kind: 'choice', letters: true,
        o: ['(20, 0)', '(10, 20)', '(5, 30)', '(15, 10)'] }
    ] },
    s2: { title: 'halfway', sub: 'anonymous · 4 taps · microeconomics · lecture 9', items: [
      { id: 'rightangle', t: 'At the best feasible bundle, the utility arrow (the mountain climb) stands at a right angle to the budget line. Did the pictures make it clear why?', kind: 'lik', lo: 'not at all', hi: 'I could explain it' },
      { id: 'pic', t: 'Which picture helped you most so far? (one tap)', kind: 'choice', col: true, o: [['walk', 'walking along the budget line'], ['price', 'the price arrow at a right angle'], ['climb', 'the utility arrow (the mountain climb)'], ['split', 'split the arrow into two pieces'], ['stretch', 'the utility arrow is the price arrow stretched'], ['none', 'none of them yet']] },
      Object.assign({ t: 'Did you move a slider yourself?' }, SLIDER), PACE
    ] },
    s3: { title: 'before you go', sub: 'anonymous · about 2 minutes · microeconomics · lecture 9', items: [
      { head: 'how comfortable are you with …' },
      { id: 'cf-grad', t: 'the gradient (the vector of partial derivatives)', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-pvec', t: 'the price vector ' + m('(<i>p</i><sub>x</sub>, <i>p</i><sub>y</sub>)') + '', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-lagr', t: 'the Lagrangian', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { id: 'cf-corner', t: 'interior vs corner solutions', kind: 'lik', lo: 'not at all', hi: 'very comfortable' },
      { head: 'right now' }, ...selfItems(),
      { head: 'one question' },
      { id: 'check', t: m('<i>u</i> = <i>x</i> · <i>y</i>') + '. ' + m('<i>p</i><sub>x</sub> = 1') + ', ' + m('<i>p</i><sub>y</sub> = 4') + ', ' + m('<i>B</i> = 40') + ', so the budget line is ' + m('<i>x</i> + 4<i>y</i> = 40') + '. Which is the best feasible bundle? (all four cost exactly €40)', kind: 'choice', letters: true,
        o: ['(40, 0)', '(8, 8)', '(20, 5)', '(10, 7.5)'] },
      { head: 'today' },
      Object.assign({ t: 'Did you move a slider yourself today?' }, SLIDER),
      { id: 'helped', t: 'What helped you most today? (one tap)', kind: 'choice', col: true, o: [['pic', 'the pictures'], ['slider', 'a slider I moved myself'], ['can', 'Can\'s explanation'], ['formula', 'the formulas']] },
      { id: 'lost', t: 'Where did you lose the thread? (one tap)', kind: 'choice', col: true, o: [['forms', 'the four kinds of preferences (functional forms)'], ['walk', 'walking along the budget line'], ['price', 'the price arrow at a right angle'], ['climb', 'the utility arrow (the mountain climb)'], ['split', 'split the arrow into two pieces'], ['stretch', 'the utility arrow is the price arrow stretched'], ['lagr', 'the Lagrangian'], ['corner', 'corners and kinks'], ['ex', 'the exercises'], ['none', 'nowhere']] },
      { head: 'how you are' },
      { id: 'tired', t: 'How tired are you?', kind: 'lik', lo: 'fresh', hi: 'exhausted' }, PACE,
      { id: 'c_end', t: 'Anything you want to tell us about today? (Please don\'t write your name.)', kind: 'text' }
    ] }
  };
  const S = window.S09 || 's1', PG = PAGES[S], POLL = 'L09-' + S, ans = {}, txt = {};
  const app = document.getElementById('app');

  // ---------- the gate (Can, 29.10: surveys closed until the lecturer opens them, like the L08 quizzes) ----------
  // Same engine and hashes as survey/L08/quiz.js: open/close tags from the teacher code on the lecturer's device, the
  // L06 salts (s1 → 'q1', s2 → 'q2', s3 → 'q3'), so Can's board codes for quiz 1/2/3 also open survey 1/2/3. A valid
  // 'closed' wins. Gate polls: L09-gate-s1 | s2 | s3. Nothing about the answers changes.
  const GATE_CHECK = {
    q1: { open: 'c1adb4e2fc1bb14cc6fb655548af8b6add7e529765a0b8691594bcf978e1c85a', closed: 'ac14ca852cc74f21d84829e01f3ebcef5c0816553e5bff5b37e9a5852f6a8221' },
    q2: { open: '763380a8a8e07e1041733f48d55aab47494669d546cab64738eaad9fdacf7de6', closed: 'a0152530b95bd78a917eed74c191d98136de61fb6b381db90b279bee27f4f55b' },
    q3: { open: '3ea429423ae401b4aee584b3343d3acacd0ba9726c000537001b044222e38c5e', closed: '861bafe4207838fea0354aae6cacb7d1c79be6c88059149a0ad8f0a6a86bca12' } };
  const BOARD = {
    q1: 'e0bc31c0f8e0c165692593335439f23a8e571b0e23ac01510ebb4e0c725bf0de',
    q2: '5cb10a0574d2ea62bc7a24939cd52b3de8c9cd837fed3f2628d350bb9fc130d9',
    q3: '9fc88bd2049362329b1d2dbff5fa70fdd99f841705df64577f63c0e227b2a04d' };

  const P = window.MicroPoll, SALT = 'L06-', GQ = { s1: 'q1', s2: 'q2', s3: 'q3' }[S], GATE = 'L09-gate-' + S;
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
    $('codego').onclick = async () => { if (await sha('micro-board:' + $('code').value.trim() + ':' + SALT + GQ) === BOARD[GQ]) { SS('micro-l09-board-' + S, '1'); buildSurvey(); } else $('code').value = ''; };
  }
  async function check(manual) {
    if (built) return;
    if (LS('micro-l09-board-' + S) === '1') return buildSurvey();
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
      if (missing.length) { msg.textContent = 'please answer every question (' + missing.length + ' missing, in red)' + (S === 's3' ? '; the comment is optional' : ''); return; }
      const go = document.getElementById('go'); if (go.disabled) return; go.disabled = true;   // no double records from a double tap
      msg.textContent = 'saving…';
      const comments = {}; Object.keys(txt).forEach(k => { const v = (txt[k] || '').trim(); if (v) comments[k] = v; });
      try {
        await window.MicroPoll.submitText(POLL, { answers: ans, comments: comments }, n => msg.textContent = 'busy, retry ' + n + '…');
        msg.innerHTML = 'saved, thank you! <br><a href="../../../lectures/L09/index.html" target="_top">→ back to the slides</a>';
        go.style.display = 'none';
      } catch (e) { msg.textContent = 'not saved (offline?). please try again'; go.disabled = false; }
    }
    document.getElementById('go').onclick = submit;
  }
  if (P && P.teacher) teacher();
  else { waiting(''); check(false); window.addEventListener('focus', () => check(false)); document.addEventListener('visibilitychange', () => { if (!document.hidden) check(false); }); }
})();
