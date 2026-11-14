// Fun module f2 (verdict picture): after an answer, the topic's own diagram appears in the answer bar, left of the verdict.
// Right answer: the diagram completes itself (step 3). Wrong answer: the last element misses (the topic's "miss" mark).
// The picture is the same for every question of a topic, so it tells nothing about the answer. No text, no points.
// Slot: abar. Events: arena:answer (draw), arena:screen (empty again). Needs core.js (MicroFun).
(function () {
  'use strict';
  const F = window.MicroFun;
  if (!F) return;
  const css = () => F.style('f2', '[data-fun="abar"] .fun-dg{width:40px;height:40px}' +
    '@media (max-width:419px){[data-fun="abar"] .fun-dg{width:32px;height:32px}}');

  F.on('answer', d => {
    const slot = F.slot('abar'), api = F.api(), topic = d.item && d.item.topic;
    if (!slot) return;
    if (!api || !api.user() || !topic) { slot.innerHTML = ''; return; }
    css();
    // innerHTML replaces the earlier picture, so a second try never leaves two
    slot.innerHTML = d.ok ? F.diagram(topic, 3, { size: 40, animate: true })
      : F.diagram(topic, 2, { size: 40, miss: true, animate: true });
  });

  // a new screen starts without a picture (the arena redraws the slot; this covers a slot it kept)
  F.on('screen', d => { if (d.name === 'how') return; const slot = F.slot('abar'); if (slot) slot.innerHTML = ''; });   // "How points work" opens over the question: the picture stays
})();
