// Pulse menu: a side button on every slide ("◐ pulse") that opens a small panel where students
// say, any time, how they are doing. One tap = an answer; they can change it as often as they like
// (the latest answer per browser counts). Can sees the results on teacher/?l=Lxx (refresh button).
// Needs interactive.js (window.MicroPoll) and <body data-lecture="L02">.
(function () {
  const LEC = document.body.dataset.lecture;
  if (!LEC || /print-pdf/.test(location.search) || !window.MicroPoll) return;
  const ITEMS = [
    { id: 'understand', q: 'how well do you understand today\'s concepts?', lo: 'lost', hi: 'got it', o: ['1', '2', '3', '4', '5'] },
    { id: 'tired', q: 'how tired are you?', lo: 'fresh', hi: 'exhausted', o: ['1', '2', '3', '4', '5'] },
    { id: 'pace', q: 'the pace is …', lo: 'too slow', hi: 'too fast', o: ['1', '2', '3', '4', '5'] },
    { id: 'finish', q: 'when should we finish today?', o: ['now', '+10 min', '+20 min', 'full time'] },
  ];
  const KEY = 'micro-pulse-' + LEC;
  let mine = {};
  try { mine = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}

  const btn = document.createElement('button');
  let bar = document.querySelector('.side-btns');
  if (!bar) { bar = document.createElement('div'); bar.className = 'side-btns'; document.body.appendChild(bar); }
  btn.className = 'side-btn pulse-btn'; btn.textContent = '◐ pulse'; btn.title = 'tell me how you are doing (anonymous)';
  // teacher (?teacher in the URL): the same button shows the class pulse instead of asking
  if (window.MicroPoll.teacher) {
    const tp = document.createElement('div'); tp.className = 'pulse-panel'; tp.hidden = true;
    const body = document.createElement('div'); const rf = document.createElement('button');
    rf.className = 'btn ghost'; rf.textContent = 'refresh';
    tp.innerHTML = '<h3>&gt; class pulse</h3>'; tp.appendChild(body); tp.appendChild(rf);
    const draw = async () => {
      body.innerHTML = '<div class="dim">loading…</div>';
      try {
        const all = await window.MicroPoll.allResults(LEC + '-pulse-');
        body.innerHTML = ITEMS.map(it => {
          const rows = all[LEC + '-pulse-' + it.id] || [];
          if (!rows.length) return '<div class="q">' + it.q + ' <span class="dim">· no answers yet</span></div>';
          const nums = rows.map(r => Number(r.value)).filter(isFinite);
          if (nums.length) {
            const m = nums.reduce((a, b) => a + b, 0) / nums.length;
            return '<div class="q">' + it.q + '</div><div><b>' + m.toFixed(1) + '</b> <span class="dim">of 5 · ' + it.lo + ' 1 … 5 ' + it.hi + ' · n = ' + rows.length + '</span></div>';
          }
          const c = {}; rows.forEach(r => c[r.value] = (c[r.value] || 0) + 1);
          return '<div class="q">' + it.q + '</div><div>' + it.o.map(o => o + ': <b>' + (c[String(o).replace(/[^A-Za-z0-9.-]/g, '_')] || 0) + '</b>').join(' · ') + '</div>';
        }).join('') + '<div class="dim" style="font-size:11px;margin-top:6px">latest answer per student · whole lecture so far</div>';
      } catch (e) { body.innerHTML = '<div class="dim">could not load</div>'; }
    };
    rf.onclick = draw;
    btn.title = 'class pulse (teacher view)';
    btn.onclick = () => { tp.hidden = !tp.hidden; if (!tp.hidden) draw(); };
    bar.prepend(btn); document.body.appendChild(tp);
    return;
  }
  const panel = document.createElement('div');
  panel.className = 'pulse-panel'; panel.hidden = true;
  panel.innerHTML = '<h3>&gt; how are you doing?</h3><div class="dim" style="font-size:11px">anonymous · tap any time · you can change your answer</div>';
  ITEMS.forEach(it => {
    const q = document.createElement('div'); q.className = 'q'; q.textContent = it.q; panel.appendChild(q);
    const sc = document.createElement('div'); sc.className = 'scale';
    it.o.forEach(v => {
      const b = document.createElement('button'); b.textContent = v; if (mine[it.id] === v) b.classList.add('on');
      b.onclick = async () => {
        sc.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        st.textContent = 'saving…';
        try {
          await window.MicroPoll.submit(LEC + '-pulse-' + it.id, v);
          mine[it.id] = v; try { localStorage.setItem(KEY, JSON.stringify(mine)); } catch (e) {}
          st.textContent = 'saved_ thank you';
        } catch (e) { st.textContent = 'not saved (offline?)'; }
      };
      sc.appendChild(b);
    });
    panel.appendChild(sc);
    if (it.lo) { const e = document.createElement('div'); e.className = 'ends'; e.innerHTML = '<span>1 · ' + it.lo + '</span><span>5 · ' + it.hi + '</span>'; panel.appendChild(e); }
  });
  const st = document.createElement('div'); st.className = 'st'; panel.appendChild(st);
  // keys pressed in the panel must not move the slides
  panel.addEventListener('keydown', e => e.stopPropagation());
  btn.onclick = () => { panel.hidden = !panel.hidden; };
  bar.prepend(btn); document.body.appendChild(panel);
})();
