// "your answers": live summary of the opening survey, on the slide right after the survey QR (Can, 07.10).
// Markup comes from tools/build_deck.js: <section class="sv-live" data-poll="L02-survey"> with bar rows
//   .bar-row[data-mean="l1"]          → average of that 1–5 answer (bar = average / 5)
//   .bar-row[data-share="ps"][data-v="0"] → share of respondents who picked that option
// Only the teacher screen loads the records (press T + teacher code): all student devices share one GitHub token,
// and 90 devices × one read per answer would use up its hourly limit and stop the polls. Students see a note instead.
(function () {
  const MP = window.MicroPoll;
  const secs = [...document.querySelectorAll('section.sv-live')];
  if (!MP || !secs.length) return;
  const hm = () => new Date().toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });

  async function draw(sec) {
    const st = sec.querySelector('.svl-n');
    st.textContent = 'loading…';
    try {
      const recs = (await MP.textResults(sec.dataset.poll + '/')).filter(r => r.poll === sec.dataset.poll);
      const A = recs.map(r => r.answers || {}), n = A.length;
      st.textContent = 'n = ' + n + ' · ' + hm();
      sec.querySelectorAll('.bar-row[data-mean]').forEach(row => {
        const v = A.map(a => Number(a[row.dataset.mean])).filter(x => x >= 1 && x <= 5);
        const m = v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
        row.querySelector('.bar-fill').style.width = (100 * m / 5) + '%';
        row.querySelector('.bar-n').textContent = v.length ? m.toFixed(1) : '–';
      });
      sec.querySelectorAll('.bar-row[data-share]').forEach(row => {
        const c = A.filter(a => String(a[row.dataset.share]) === row.dataset.v).length, pct = n ? 100 * c / n : 0;
        row.querySelector('.bar-fill').style.width = pct + '%';
        row.querySelector('.bar-n').textContent = Math.round(pct) + '% (' + c + ')';
      });
    } catch (e) { st.textContent = 'could not load (offline?)'; }
  }

  secs.forEach(sec => {
    const btn = sec.querySelector('.svl-refresh');
    if (!MP.teacher || !MP.hasToken) {
      sec.querySelector('.svl-grid').style.display = 'none'; btn.style.display = 'none';
      const n = sec.querySelector('.svl-n'); n.textContent = '📺 the results are on the lecturer\'s screen'; n.classList.add('teacher-only');
      return;
    }
    btn.onclick = () => draw(sec);
  });
  // load when the slide opens (teacher screen only); [refresh] for late answers
  const open = s => { if (s && s.classList.contains('sv-live') && MP.teacher && MP.hasToken) draw(s); };
  if (window.Reveal) { Reveal.on('slidechanged', e => open(e.currentSlide)); Reveal.on('ready', e => open(e.currentSlide)); }
})();
