// Fun module f2 (verdict picture): after an answer, the topic's own diagram appears in the answer bar, left of the verdict.
// Right answer: the diagram completes itself (step 3). Wrong answer: the last element misses (the topic's "miss" mark).
// The picture is the same for every question of a topic, so it tells nothing about the answer. No text, no points.
// Slot: abar. Events: arena:answer (draw), arena:screen (empty again). Needs core.js (MicroFun).
(function () {
  'use strict';
  const F = window.MicroFun;
  if (!F) return;
  // the picture stands left of the verdict and takes no line of its own: the bar gets room on its left, the picture sits in it
  const css = () => F.style('f2', '.fun-f2-bar{position:relative;padding-left:50px;min-height:40px}' +
    '.fun-f2-bar [data-fun="abar"] .fun-dg{position:absolute;left:0;top:0;width:40px;height:40px}' +
    '@media (max-width:419px){.fun-f2-bar{padding-left:40px;min-height:32px}.fun-f2-bar [data-fun="abar"] .fun-dg{width:32px;height:32px}}');
  const room = (slot, on) => { if (slot.parentElement) slot.parentElement.classList.toggle('fun-f2-bar', on); };

  F.on('answer', d => {
    const slot = F.slot('abar'), api = F.api(), topic = d.item && d.item.topic;
    if (!slot) return;
    if (!api || !api.user() || !topic) { slot.innerHTML = ''; room(slot, false); return; }
    css();
    // innerHTML replaces the earlier picture, so a second try never leaves two
    slot.innerHTML = d.ok ? F.diagram(topic, 3, { size: 40, animate: true })
      : F.diagram(topic, 2, { size: 40, miss: true, animate: true });
    room(slot, !!slot.innerHTML);
  });

  // a new screen starts without a picture (the arena redraws the slot; this covers a slot it kept)
  F.on('screen', d => { if (d.name === 'how') return; const slot = F.slot('abar'); if (slot) { slot.innerHTML = ''; room(slot, false); } });   // "How points work" opens over the question: the picture stays
})();
