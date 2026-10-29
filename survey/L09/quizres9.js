// L09 quiz results on the slide after the quiz (Can, 29.10: "the next page should be the answer results to those questions
// and the questions itself, and then i should click on a button and reveal the answer"). For each question: its text, its
// options, the share who chose each (thin bars, poll-clean look). The answers are NOT in this file or the deck (Kamuran
// R50, Can's "no keys in public code"): in teacher mode a [ reveal answer ] button per question lets the lecturer tap the
// right option, which is then marked dark with ✓ (remembered on that device only). Loads only on [ refresh ] (one results()
// call). Needs survey/L09/quizzes.js (questions and options). Markup:
//   <div class="q9-res" data-poll="L09-q1" data-quiz="q1"></div>
(function () {
  const P = window.MicroPoll; if (!P) return;
  const css = document.createElement('style');
  css.textContent = `
  .q9-res { font-family: "Inter", "Segoe UI", system-ui, sans-serif; font-size: 18px; text-align: left; }
  .q9-top { display: flex; gap: 12px; align-items: baseline; margin: 4px 0 10px; color: #5B6670; }
  .q9-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; }
  .q9-q .t { color: #1F1F1F; line-height: 1.35; margin-bottom: 6px; } .q9-q .t b { margin-right: .3em; }
  .q9-q .m { font-family: "STIX Two Math", "STIX Two Text", "Cambria Math", serif; font-size: 1.05em; white-space: nowrap; } .q9-q .m i { font-style: italic; } .q9-q .m sub { font-size: .65em; vertical-align: -.25em; }
  .q9-row { display: grid; grid-template-columns: minmax(0, 1fr) 140px 74px; gap: 8px; align-items: center; margin: 3px 0; color: #1F1F1F; }
  .q9-row .lab { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .q9-row .track { height: 9px; background: #EEF1F4; border-radius: 3px; overflow: hidden; } .q9-row .fill { display: block; height: 100%; background: #7F98B2; }
  .q9-row .num { color: #5B6670; text-align: right; font-variant-numeric: tabular-nums; font-size: .92em; }
  .q9-row.right .lab { font-weight: 600; } .q9-row.right .fill { background: #22384F; } .q9-row.right .lab::before { content: "✓ "; color: #22384F; }
  .q9-row.pick { cursor: pointer; outline: 1px dashed #9AA3AE; outline-offset: 2px; border-radius: 4px; }
  .q9-res .q9-btn { font: 14px "Inter", system-ui, sans-serif; color: #5B6670; background: none; border: none; padding: 2px 4px; text-decoration: underline; text-decoration-color: #C9CDD3; text-underline-offset: 3px; cursor: pointer; }
  .q9-res .q9-btn:hover { color: #1F1F1F; }
  html.mobile .q9-grid { grid-template-columns: 1fr; } html.mobile .q9-row { grid-template-columns: minmax(0, 1fr) 90px 64px; }`;
  document.head.appendChild(css);
  const pc = (a, b) => b ? Math.round(100 * a / b) : 0;
  const store = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} };
  const load = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  function init(box) {
    const poll = box.dataset.poll, QZ = ((window.L09_QUIZZES || {})[box.dataset.quiz || 'q1']) || { qs: [] }, n = QZ.qs.length;
    let vals = null, picking = -1;
    const markKey = i => 'micro-' + poll + '-right-' + i;
    box.setAttribute('data-prevent-swipe', '');
    function draw() {
      const m = vals ? vals.length : 0;
      let h = '<div class="q9-top"><button class="q9-btn q9-refresh" type="button">refresh</button><span>' + (vals ? m + ' submitted' : 'tap refresh to load the results') + '</span></div><div class="q9-grid">';
      QZ.qs.forEach((q, i) => {
        const right = load(markKey(i));
        h += '<div class="q9-q"><div class="t"><b>' + (i + 1) + '.</b>' + q.t + '</div>';
        q.o.forEach((o, k) => {
          const L = 'abcd'[k], c = vals ? vals.filter(v => v[i] === L).length : 0;
          h += '<div class="q9-row' + (right === L ? ' right' : '') + (picking === i ? ' pick' : '') + '" data-q="' + i + '" data-l="' + L + '"><span class="lab">' + o + '</span><span class="track"><span class="fill" style="width:' + pc(c, m) + '%"></span></span><span class="num">' + (vals ? pc(c, m) + '% (' + c + ')' : '–') + '</span></div>';
        });
        if (P.teacher) h += '<button class="q9-btn q9-reveal" type="button" data-q="' + i + '">' + (picking === i ? 'tap the right option' : right ? 'change the answer' : 'reveal answer') + '</button>';
        h += '</div>';
      });
      box.innerHTML = h + '</div>';
      box.querySelector('.q9-refresh').onclick = async e => {
        e.stopPropagation(); e.currentTarget.blur(); box.querySelector('.q9-top span').textContent = 'loading…';
        try { const r = await P.results(poll); vals = r.responses.map(x => String(x.value)).filter(v => v.length === n); draw(); }
        catch (err) { box.querySelector('.q9-top span').textContent = 'could not load: tap refresh again'; }
      };
      box.querySelectorAll('.q9-reveal').forEach(b => b.onclick = e => { e.stopPropagation(); b.blur(); const i = +b.dataset.q; picking = picking === i ? -1 : i; draw(); });
      box.querySelectorAll('.q9-row.pick').forEach(r => r.onclick = e => { e.stopPropagation(); store(markKey(+r.dataset.q), r.dataset.l); picking = -1; draw(); });
    }
    draw();
  }
  function go() { document.querySelectorAll('.q9-res').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
