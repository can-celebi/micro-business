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
      { id: 'lagr', t: 'Have you seen the Lagrange method (the Lagrangian, λ) before?', kind: 'choice', o: [['no', 'no'], ['name', 'heard the name only'], ['math', 'yes, in a maths course'], ['econ', 'yes, in an economics course']] },
      { head: 'right now' }, ...selfItems(),
      { head: 'one question' },
      { id: 'check', t: m('<i>u</i> = <i>x</i> · <i>y</i>') + '. Prices: ' + m('<i>p</i><sub>x</sub> = 2') + ', ' + m('<i>p</i><sub>y</sub> = 1') + '. Budget: €40. Which is the best feasible bundle? (all four cost exactly €40)', kind: 'choice', letters: true,
        o: ['(20, 0)', '(10, 20)', '(5, 30)', '(15, 10)'] }
    ] },
    s2: { title: 'halfway', sub: 'anonymous · 4 taps · microeconomics · lecture 9', items: [
      { id: 'rightangle', t: 'At the best feasible bundle, the utility arrow (the mountain climb) stands at a right angle to the budget line. Did the pictures make it clear why?', kind: 'lik', lo: 'not at all', hi: 'I could explain it' },
      { id: 'pic', t: 'Which picture helped you most so far? (one tap)', kind: 'choice', col: true, o: [['walk', 'walking along the budget line'], ['price', 'the price arrow at a right angle'], ['climb', 'the utility arrow (the mountain climb)'], ['split', 'split the arrow into two pieces'], ['stretch', 'the utility arrow is the price arrow stretched'], ['none', 'none of them yet']] },
      Object.assign({ t: 'Did you move a slider yourself?' }, SLIDER), PACE
    ] },
    s3: { title: 'before you go', sub: 'anonymous · about 2 minutes · microeconomics · lecture 9', items: [
      { head: 'right now' }, ...selfItems(),
      { head: 'one question' },
      { id: 'check', t: m('<i>u</i> = <i>x</i> · <i>y</i>') + '. Prices: ' + m('<i>p</i><sub>x</sub> = 1') + ', ' + m('<i>p</i><sub>y</sub> = 4') + '. Budget: €40. Which is the best feasible bundle? (all four cost exactly €40)', kind: 'choice', letters: true,
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
})();
