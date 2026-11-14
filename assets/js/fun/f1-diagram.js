// Fun module f1: the topic's own diagram is its progress (spec: practice/fun-test/SPECS.md, section 1).
// Home screen, slot "cat" of each topic card: the topic's diagram at the right edge of the card, drawn up to step 0…3,
// and one more grey line under the card's own one: "2 of 5 question types mastered".
// Only questions answered right at the first try count. The newest step draws itself the first time it is seen (kept in set('f1')).
(function () {
  'use strict';
  const F = window.MicroFun;
  if (!F) return;
  F.style('f1', '.fun-f1-card{grid-template-columns:minmax(0,1fr) auto;column-gap:12px}.fun-f1-card>*{grid-column:1}' +
    '.fun-f1-line{grid-column:1}.fun-f1-pic{grid-column:2;grid-row-start:1;align-self:center}');

  F.on('screen', d => {
    if (d.name !== 'home' || d.tutorial) return;   // the cards are redrawn by the home screen only; a box over it changes nothing
    const slots = F.slots('cat');
    slots.forEach(el => { el.innerHTML = ''; if (el.parentElement) el.parentElement.classList.remove('fun-f1-card'); });
    const A = F.api();
    if (!slots.length || !A || !A.user()) return;
    const got = A.get('f1'), seen = got && typeof got === 'object' && !Array.isArray(got) ? got : {};
    let changed = false;
    slots.forEach(el => {
      const topic = el.dataset.topic, card = el.parentElement, p = F.mastery(A, topic);   // the same definition as in My progress
      const svg = p.n && card ? F.diagram(topic, p.step, { size: 44, ghost: true, animate: p.step > (seen[topic] || 0), label: 'Progress picture: step ' + p.step + ' of 3' }) : '';
      if (!svg) return;
      el.innerHTML = '<span class="fun-dim fun-f1-line">' + p.m + ' of ' + p.n + (p.n === 1 ? ' question type' : ' question types') + ' mastered</span>' +
        '<span class="fun-f1-pic" style="grid-row-end:span ' + card.children.length + '">' + svg + '</span>';   // the picture spans all rows of the card
      card.classList.add('fun-f1-card');
      if (seen[topic] !== p.step) { seen[topic] = p.step; changed = true; }
    });
    if (changed) A.set('f1', seen);
  });
})();
