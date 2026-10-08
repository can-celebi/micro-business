// "your answers": live summary of the opening survey, on the slide right after the survey QR (Can, 07.10).
// Markup comes from tools/build_deck.js: <section class="sv-live" data-poll="L02-survey"> with bar rows
//   .bar-row[data-mean="l1"]          → average of that 1–5 answer (bar = average / 5)
//   .bar-row[data-share="ps"][data-v="0"] → share of respondents who picked that option
// Only the teacher screen loads all the records (press T + teacher code): all student devices share one GitHub token,
// and 90 devices × one read per answer would use up its hourly limit and stop the polls. Students see a note instead.
// Students (Can, 08.10, via Emre): they see the same bars, read from ONE summary record that the teacher screen
// writes when it loads the slide (text poll sum-<poll>: counts only, no ids, no texts). Cost per student: 2 calls.
(function () {
  const MP = window.MicroPoll;
  const secs = [...document.querySelectorAll('section.sv-live')];
  if (!MP || !secs.length) return;
  const CACHE = {};
  const hm = ts => new Date(ts || Date.now()).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  // the numbers behind the bars: {n, mean: {key: [sum, count]}, share: {key: {value: count}}}
  function summarise(sec, A) {
    const S = { n: A.length, mean: {}, share: {} };
    sec.querySelectorAll('.bar-row[data-mean]').forEach(row => {
      const v = A.map(a => Number(a[row.dataset.mean])).filter(x => x >= 1 && x <= 5);
      S.mean[row.dataset.mean] = [v.reduce((x, y) => x + y, 0), v.length];
    });
    sec.querySelectorAll('.bar-row[data-share]').forEach(row => {
      const k = row.dataset.share, c = A.filter(a => String(a[k]) === row.dataset.v).length;
      (S.share[k] = S.share[k] || {})[row.dataset.v] = c;
    });
    // compare boxes (Can, 08.10): the same rows for each survey in data-cmp (e.g. Wednesday | today)
    S.cmp = S.cmp || {};
    return S;
  }
  function summariseCmp(sec, poll, A) {
    const C = { n: A.length, mean: {}, share: {}, tried: {} };
    sec.querySelectorAll('.bar-row[data-cmean]').forEach(row => {
      const k = row.dataset.cmean, v = A.map(a => Number(a[k])).filter(x => x >= 1 && x <= 5);
      C.mean[k] = [v.reduce((x, y) => x + y, 0), v.length];
      if (row.dataset.tried) C.tried[k] = A.filter(a => a[row.dataset.tried]).length;
    });
    sec.querySelectorAll('.bar-row[data-cshare]').forEach(row => {
      const k = row.dataset.cshare; (C.share[k] = C.share[k] || {})[row.dataset.v] = A.filter(a => String(a[k]) === row.dataset.v).length;
    });
    return C;
  }
  function paintCmp(sec, S) {
    sec.querySelectorAll('.cmp-box').forEach(box => {
      const polls = box.dataset.cmp.split(',');
      polls.forEach((p, i) => { const C = (S.cmp || {})[p]; const h = box.querySelector('.cmp-n[data-i="' + i + '"]'); if (h) h.textContent = C ? '· n = ' + C.n : ''; });
      box.querySelectorAll('.bar-row[data-cmean]').forEach(row => polls.forEach((p, i) => {
        const C = (S.cmp || {})[p], [sum, cnt] = (C && C.mean[row.dataset.cmean]) || [0, 0], m = cnt ? sum / cnt : 0, t = C && C.tried[row.dataset.cmean];
        row.querySelectorAll('.bar-fill')[i].style.width = (100 * m / 5) + '%';
        row.querySelector('.bar-n[data-i="' + i + '"]').textContent = (cnt ? m.toFixed(1) : '–') + (t != null ? ' · ' + t : '');
      }));
      box.querySelectorAll('.bar-row[data-cshare]').forEach(row => polls.forEach((p, i) => {
        const C = (S.cmp || {})[p], c = (C && (C.share[row.dataset.cshare] || {})[row.dataset.v]) || 0, pct = C && C.n ? 100 * c / C.n : 0;
        row.querySelectorAll('.bar-fill')[i].style.width = pct + '%';
        row.querySelector('.bar-n[data-i="' + i + '"]').textContent = Math.round(pct) + '% (' + c + ')';
      }));
    });
  }
  function paint(sec, S) {
    paintCmp(sec, S);
    sec.querySelectorAll('.bar-row[data-mean]').forEach(row => {
      const [sum, cnt] = S.mean[row.dataset.mean] || [0, 0], m = cnt ? sum / cnt : 0;
      row.querySelector('.bar-fill').style.width = (100 * m / 5) + '%';
      row.querySelector('.bar-n').textContent = cnt ? m.toFixed(1) : '–';
    });
    sec.querySelectorAll('.bar-row[data-share]').forEach(row => {
      const c = ((S.share[row.dataset.share] || {})[row.dataset.v]) || 0, pct = S.n ? 100 * c / S.n : 0;
      row.querySelector('.bar-fill').style.width = pct + '%';
      row.querySelector('.bar-n').textContent = Math.round(pct) + '% (' + c + ')';
    });
  }

  // teacher screen: read every record, draw, and save the summary for the students when n has changed
  async function draw(sec) {
    const st = sec.querySelector('.svl-n');
    st.textContent = 'loading…';
    try {
      const recs = (await MP.textResults(sec.dataset.poll + '/')).filter(r => r.poll === sec.dataset.poll);
      const S = summarise(sec, recs.map(r => r.answers || {}));
      // compare surveys: this one again, and the earlier ones read once per page load (they are finished)
      const others = [...new Set([...sec.querySelectorAll('.cmp-box')].flatMap(b => b.dataset.cmp.split(',')))];
      for (const p of others) {
        let A;
        if (p === sec.dataset.poll) A = recs.map(r => r.answers || {});
        else { if (!CACHE[p]) CACHE[p] = (await MP.textResults(p + '/')).filter(r => r.poll === p).map(r => r.answers || {}); A = CACHE[p]; }
        S.cmp[p] = summariseCmp(sec, p, A);
      }
      paint(sec, S);
      st.textContent = 'n = ' + S.n + ' · ' + hm();
      const k = 'micro-sum-' + MP.session + '-' + sec.dataset.poll;
      if (S.n && ls.get(k) !== String(S.n)) { await MP.submitText('sum-' + sec.dataset.poll, { summary: S }); ls.set(k, String(S.n)); }
    } catch (e) { st.textContent = 'could not load (offline?)'; }
  }
  // students: the latest summary only
  async function drawSummary(sec) {
    const st = sec.querySelector('.svl-n'), grid = sec.querySelector('.svl-grid');
    try {
      const refs = await MP.tagRefs('sum-' + sec.dataset.poll + '/');
      if (!refs.length) return;
      const last = refs.sort((a, b) => b.ts - a.ts)[0], rec = await MP.blob(last.sha);
      if (!rec || !rec.summary) return;
      paint(sec, rec.summary);
      grid.style.display = ''; st.classList.remove('teacher-only');
      st.textContent = 'n = ' + rec.summary.n + ' · as of ' + hm(rec.ts);
    } catch (e) { /* keep the note */ }
  }

  const teacher = MP.teacher && MP.hasToken;
  secs.forEach(sec => {
    const btn = sec.querySelector('.svl-refresh');
    if (!teacher) {
      sec.querySelector('.svl-grid').style.display = 'none'; btn.style.display = 'none';
      const n = sec.querySelector('.svl-n'); n.textContent = '📺 the results are on the lecturer\'s screen'; n.classList.add('teacher-only');
      return;
    }
    btn.onclick = () => draw(sec);
  });
  // load when the slide opens: teacher = all records ([refresh] for late answers); students = the summary, once per page load
  const seen = new Set();
  const open = s => {
    if (!s || !s.classList.contains('sv-live')) return;
    if (teacher) draw(s);
    else if (MP.hasToken && !seen.has(s)) { seen.add(s); drawSummary(s); }
  };
  if (window.Reveal) { Reveal.on('slidechanged', e => open(e.currentSlide)); Reveal.on('ready', e => open(e.currentSlide)); }
  // a page opened directly on this slide (a reload): the ready event can come before this script listens
  let tries = 0, opened = false;
  const first = () => { const cur = window.Reveal && Reveal.isReady && Reveal.isReady() && Reveal.getCurrentSlide(); if (cur) { if (!opened && cur.classList.contains('sv-live') && !(teacher && cur.dataset.drawn)) { opened = true; cur.dataset.drawn = '1'; open(cur); } } else if (tries++ < 20) setTimeout(first, 300); };
  setTimeout(first, 300);
})();
