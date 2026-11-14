// Fun module f1: one progress graph on every topic tile of the practice home (Can 14.11: "i also want some graph in each of their
// topc cards showing the progress with one graph"). The graph is the student's learning curve in that topic: one step to the right
// per answered question, one step up when it was right at the first try (MicroFun.curve in core.js; the /midterm/ page draws the
// same graph from the same records). Slot "cat" in each tile. The line draws itself when it has grown since the last visit.
(function () {
  'use strict';
  const F = window.MicroFun;
  if (!F) return;

  F.on('screen', d => {
    if (d.name !== 'home' || d.tutorial) return;   // the tiles are redrawn by the home screen only; a box over it changes nothing
    const slots = F.slots('cat'), A = F.api();
    if (!slots.length || !A || !A.user || !A.user()) return;
    const done = A.done() || {}, got = A.get('f1'), seen = got && typeof got === 'object' && !Array.isArray(got) ? got : {};
    let changed = false;
    slots.forEach(el => {
      const topic = el.dataset.topic, tile = el.parentElement, items = A.items(topic) || [];
      if (!tile || !items.length) return;
      const flags = F.flags(items.map(it => it.id), done);
      F.tile(tile, flags, { animate: flags.length > (seen[topic] || 0) });
      if (seen[topic] !== flags.length) { seen[topic] = flags.length; changed = true; }
    });
    if (changed) A.set('f1', seen);
  });
})();
