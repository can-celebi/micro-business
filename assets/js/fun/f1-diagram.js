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

  // {m: mastered types, n: types, step: 0…3} of one topic
  const progress = (items, done) => {
    const types = {}; let f = 0;
    items.forEach(it => {
      const t = types[it.type] = types[it.type] || { all: 0, first: 0 }, d = done[it.id];
      t.all++;
      if (d && d.p > 0 && d.w === 0) { t.first++; f++; }
    });
    const list = Object.values(types), n = list.length, m = list.filter(t => t.first >= Math.min(2, t.all)).length;
    return { m, n, step: f === 0 ? 0 : m === n ? 3 : m / n >= 0.5 ? 2 : 1 };
  };

  F.on('screen', () => {
    const slots = F.slots('cat');
    slots.forEach(el => { el.innerHTML = ''; if (el.parentElement) el.parentElement.classList.remove('fun-f1-card'); });
    const A = F.api();
    if (!slots.length || !A || !A.user()) return;
    const done = A.done() || {}, seen = A.get('f1') || {};
    let changed = false;
    slots.forEach(el => {
      const topic = el.dataset.topic, card = el.parentElement, p = progress(A.items(topic) || [], done);
      const svg = p.n && card ? F.diagram(topic, p.step, { size: 44, animate: p.step > (seen[topic] || 0), label: 'Progress picture: step ' + p.step + ' of 3' }) : '';
      if (!svg) return;
      el.innerHTML = '<span class="fun-dim fun-f1-line">' + p.m + ' of ' + p.n + ' question types mastered</span>' +
        '<span class="fun-f1-pic" style="grid-row-end:span ' + card.children.length + '">' + svg + '</span>';   // the picture spans all rows of the card
      card.classList.add('fun-f1-card');
      if (seen[topic] !== p.step) { seen[topic] = p.step; changed = true; }
    });
    if (changed) A.set('f1', seen);
  });
})();
