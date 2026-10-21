// L06 · a small pie of a two-option poll (Can, 21.10: "A and B buttons and a pie chart result on slide 12").
// Markup: <div class="l06-pie" data-poll="L06-B1-pick" data-options="A,B"></div>. Lecturer only, and it loads only on
// [ refresh ] (one results() call), so the student decks cost nothing.
(function () {
  // colours: A blue, B orange, indifferent purple (Can, 21.10); the indifferent button is purple for everyone
  const COLS = ['#0062C4', '#D9480F', '#7A3DB8', '#1B7F3B'];
  const tint = () => document.querySelectorAll('.l06-pick .poll button').forEach(b => { if (/indifferent/.test(b.textContent)) { b.style.color = '#7A3DB8'; b.style.borderColor = '#7A3DB8'; } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(tint, 300)); else setTimeout(tint, 300);
  setTimeout(tint, 1500);
  const P = window.MicroPoll;
  if (!P || !P.teacher) return;
  function pie(counts, labels) {
    const n = counts.reduce((a, b) => a + b, 0), R = 46, c = 52;
    if (!n) return '<div class="dim">no answers yet</div>';
    let a0 = -Math.PI / 2, s = `<svg viewBox="0 0 104 104" width="104" height="104">`;
    counts.forEach((k, i) => {
      if (!k) return;
      if (k === n) { s += `<circle cx="${c}" cy="${c}" r="${R}" fill="${COLS[i]}"/>`; return; }
      const a1 = a0 + 2 * Math.PI * k / n, big = a1 - a0 > Math.PI ? 1 : 0;
      s += `<path d="M${c},${c} L${c + R * Math.cos(a0)},${c + R * Math.sin(a0)} A${R},${R} 0 ${big} 1 ${c + R * Math.cos(a1)},${c + R * Math.sin(a1)} Z" fill="${COLS[i]}"/>`;
      a0 = a1;
    });
    s += '</svg><div class="pie-leg">' + labels.map((l, i) => `<span style="color:${COLS[i]}">● ${l}: ${Math.round(100 * counts[i] / n)}% (${counts[i]})</span>`).join('') + `<span class="dim">${n} answers</span></div>`;
    return s;
  }
  document.querySelectorAll('.l06-pie').forEach(box => {
    const labels = (box.dataset.options || 'A,B').split(',');
    box.innerHTML = '<button class="btn ghost pie-ref" type="button">refresh</button><div class="pie-out"></div>';
    const out = box.querySelector('.pie-out');
    box.querySelector('.pie-ref').onclick = async e => {
      e.currentTarget.blur(); out.textContent = 'loading…';
      try {
        const r = await P.results(box.dataset.poll), vals = r.responses.map(x => String(x.value));
        out.innerHTML = pie(labels.map(l => vals.filter(v => v === l).length), labels);
      } catch (err) { out.textContent = 'could not load: tap refresh again'; }
    };
  });
})();
