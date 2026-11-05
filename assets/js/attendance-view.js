// Attendance on the lecturer's slide (Can, 05.11: "a link on the login page ... open the projector and show them and call some name"). Temporary: remove after the class.
// Lecturer only. The file attendance.enc.json is encrypted under a passphrase that isn't derived from anything public; it's asked for on the page, kept in memory
// until a reload, and never stored. Students get no link and don't fetch the file.
(function () {
  const MP = window.MicroPoll;
  if (!MP || !MP.teacher || /print-pdf/.test(location.search)) return;
  const slide = document.getElementById(document.body.dataset.lecture + '-signin');
  if (!slide) return;
  const css = document.createElement('style');
  css.textContent = `
  #att-link { margin-top: 1em; font: 16px "Inter", system-ui, sans-serif; background: #fff; color: #333; border: 1.5px solid #bbb; border-radius: 4px; padding: 5px 14px; cursor: pointer; }
  #att-link:hover { border-color: #333; }
  #att-view { position: fixed; inset: 0; z-index: 90; background: #fff; color: #111; overflow: auto; font: 18px/1.4 "Inter", system-ui, sans-serif; padding: 18px 28px 60px; box-sizing: border-box; text-align: left; }
  #att-view h2 { font-size: 1.3em; margin: 0 0 .1em; text-transform: none; }
  #att-view h3 { font-size: 1.05em; margin: 1.2em 0 .4em; }
  #att-close { position: fixed; right: 26px; top: 14px; font: 16px "Inter", system-ui, sans-serif; background: #fff; border: 1.5px solid #333; border-radius: 4px; padding: 5px 14px; cursor: pointer; z-index: 91; }
  #att-view .note { color: #555; font-size: .85em; margin: 0 0 .6em; }
  #att-ask input { font: 18px "Inter", system-ui, sans-serif; padding: 6px 10px; border: 1.5px solid #888; border-radius: 4px; }
  #att-ask button { font: 18px "Inter", system-ui, sans-serif; margin-left: 8px; padding: 6px 14px; border: 1.5px solid #333; border-radius: 4px; background: #FFF9D0; cursor: pointer; }
  #att-msg { margin-top: .6em; }
  #att-msg.bad { color: #B71C1C; font-weight: 600; }
  #att-view table { border-collapse: collapse; margin: .3em 0 1em; }
  #att-view td, #att-view th { border-bottom: 1px solid #ddd; padding: 4px 8px; text-align: left; }
  #att-view th { background: #f4f4f1; font-weight: 600; position: sticky; top: 0; }
  #att-view .nm { font-weight: 600; white-space: nowrap; }
  #att-view .m { text-align: center; width: 2.2em; }
  #att-view td.c { background: #2f7d6b; color: #fff; } #att-view td.o { background: #a9d8cb; } #att-view td.p { background: #e4e4df; }
  #att-view .n { text-align: right; font-weight: 600; }
  #att-view .row { display: grid; grid-template-columns: 90px minmax(120px, 1fr) minmax(250px, auto); gap: 10px; align-items: center; margin: .25rem 0; font-size: .8em; }
  #att-view .row small { color: #5b5b5b; }
  #att-view .tr { display: flex; gap: 2px; height: 7px; background: #eeeeea; border-radius: 3px; overflow: hidden; }
  #att-view .tr i { display: block; height: 7px; }
  #att-view .bc { background: #3a3a3a; } #att-view .bo { background: #8f8f88; } #att-view .bn { background: #cfcfc8; }
  html.mobile #att-link { padding: 10px 20px; min-height: 44px; font-size: 18px; }
  html.mobile #att-view { padding: 10px 8px 60px; font-size: 14px; }
  html.mobile #att-close { right: 10px; top: 8px; padding: 8px 16px; }
  html.mobile #att-view .note { margin-top: 16px; }
  html.mobile #att-view table { width: 100%; }
  html.mobile #att-view td, html.mobile #att-view th { padding: 3px 1px; font-size: 12px; }
  html.mobile #att-view th { font-size: 10px; }
  html.mobile #att-view .nm { white-space: normal; overflow-wrap: anywhere; font-size: 13px; padding-right: 4px; }
  html.mobile #att-view .m { width: auto; min-width: 21px; }
  html.mobile #att-view .row { grid-template-columns: 70px 1fr; gap: 2px 8px; margin-bottom: 0.6em; }
  html.mobile #att-view .row .v { grid-column: 1 / -1; }`;
  document.head.appendChild(css);

  const link = document.createElement('button'); link.type = 'button'; link.id = 'att-link'; link.textContent = 'attendance';
  ['pointerdown', 'mousedown', 'touchstart'].forEach(t => link.addEventListener(t, e => e.stopPropagation()));
  slide.appendChild(document.createElement('div')).appendChild(link);

  let opened = null;   // the page, kept in memory until a reload, so the phrase is asked for once
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let view = null;
  function keys(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (view && view.querySelector('input') && e.target && /input/i.test(e.target.tagName)) { e.stopPropagation(); return; }   // typing the phrase must not move the deck or open the login
    if (/^(Arrow|Page|Home$|End$| $)/.test(e.key)) e.stopPropagation();   // these scroll this page, and leave the slide where it was
  }
  function close() { if (view) { view.remove(); view = null; document.removeEventListener('keydown', keys, true); } }
  function show(inner) {
    close();
    view = document.createElement('div'); view.id = 'att-view';
    view.innerHTML = '<button type="button" id="att-close">close</button>' + inner;
    document.body.appendChild(view);
    view.querySelector('#att-close').addEventListener('click', e => { e.stopPropagation(); close(); });
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'wheel'].forEach(t => view.addEventListener(t, e => e.stopPropagation()));
    document.addEventListener('keydown', keys, true);
  }
  function page(d) {
    const head = '<tr><th>name</th>' + d.lectures.map(l => '<th class="m">' + esc(l) + '</th>').join('') + '<th>attended</th></tr>';
    const cls = { C: 'c', O: 'o', '•': 'p' };
    const rows = d.rows.map(r => '<tr><td class="nm">' + esc(r.n) + '</td>' + r.m.map(x => '<td class="m ' + (cls[x] || '') + '">' + esc(x) + '</td>').join('') + '<td class="n">' + esc(r.a) + '</td></tr>').join('');
    return '<h2>attendance</h2><p class="note">' + esc(d.note) + ' · C in class · O online · • took part, did not say</p><table>' + head + rows + '</table><h3>by lecture</h3>' + d.chart;
  }
  async function open_(phrase, msg) {
    msg.className = ''; msg.textContent = 'opening…';
    await new Promise(r => setTimeout(r, 30));   // let "opening…" show before the slow part
    let box;
    try {
      const r = await fetch('attendance.enc.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('status ' + r.status);
      box = await r.json();
    } catch (e) { msg.className = 'bad'; msg.textContent = 'The attendance file could not be loaded (' + e.message + ').'; return; }
    try {
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(box.salt), iterations: box.iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(box.iv) }, key, b64(box.ct));
      opened = page(JSON.parse(new TextDecoder().decode(buf)));
      show(opened);
    } catch (e) { msg.className = 'bad'; msg.textContent = 'Wrong password. Please try again.'; }
  }
  link.addEventListener('click', e => {
    e.stopPropagation(); link.blur();
    if (opened) { show(opened); return; }
    show('<h2>attendance</h2><form id="att-ask" autocomplete="off"><input type="password" id="att-in" placeholder="password" autocomplete="off"><button type="submit">open</button></form><div id="att-msg"></div>');
    const input = view.querySelector('#att-in');
    input.focus();
    view.querySelector('#att-ask').addEventListener('submit', ev => { ev.preventDefault(); ev.stopPropagation(); open_(input.value.trim(), view.querySelector('#att-msg')); });
  });
})();
