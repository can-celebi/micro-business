// L06 quiz results on the slide after each quiz (Can, 21.10): a histogram of the overall score and the share correct
// per question. Markup: <div class="l06-qres" data-poll="L06-q1" data-key="bcacbd" data-labels="ends x|ends y|…"></div>
// Loads only on [ refresh ] (one results() call), so 90 student decks cost nothing until the lecturer taps it.
(function () {
  const P = window.MicroPoll;
  if (!P) return;
  const pc = (a, b) => b ? Math.round(100 * a / b) : 0;
  function bar(lab, n, tot, cls) {
    return `<div class="qr-row"><span class="qr-lab">${lab}</span><span class="qr-track"><span class="qr-fill ${cls || ''}" style="width:${pc(n, tot)}%"></span></span><span class="qr-num">${pc(n, tot)}% (${n})</span></div>`;
  }
  function init(box) {
    const key = box.dataset.key, labels = (box.dataset.labels || '').split('|'), n = key.length;
    box.innerHTML = '<button class="btn ghost qr-refresh">refresh</button><div class="qr-out dim">tap refresh to load the results</div>';
    const out = box.querySelector('.qr-out');
    box.querySelector('.qr-refresh').onclick = async () => {
      out.textContent = 'loading…';
      try {
        const r = await P.results(box.dataset.poll), vals = r.responses.map(x => String(x.value)).filter(v => v.length === n);
        const m = vals.length;
        if (!m) { out.textContent = 'no answers yet'; return; }
        const scores = vals.map(v => [...v].filter((a, i) => a === key[i]).length);
        let h = `<div class="qr-cols"><div><div class="qr-h">overall score · ${m} students</div>`;
        for (let s = n; s >= 0; s--) h += bar(`${s} of ${n} right`, scores.filter(x => x === s).length, m, s === n ? 'ok' : '');
        h += `<div class="qr-mean">average: ${(scores.reduce((a, b) => a + b, 0) / m).toFixed(1)} of ${n}</div></div><div><div class="qr-h">correct per question</div>`;
        for (let i = 0; i < n; i++) h += bar(`${i + 1} · ${labels[i] || ''}`, vals.filter(v => v[i] === key[i]).length, m, 'ok');
        out.innerHTML = h + '</div></div>';
        out.classList.remove('dim');
      } catch (e) { out.textContent = 'could not load: tap refresh again'; }
    };
  }
  const go = () => document.querySelectorAll('.l06-qres').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
