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
  btn.className = 'pulse-btn'; btn.textContent = '◐ pulse'; btn.title = 'tell me how you are doing (anonymous)';
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
  document.body.appendChild(btn); document.body.appendChild(panel);
})();
