// Slide menu: a [ menu ] button on every slide; lists all slides by title, click to jump.
// Lives outside .reveal so it is not scaled; full-screen list on phones.
(function () {
  function build() {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.textContent = 'menu';
    const panel = document.createElement('nav');
    panel.className = 'menu-panel';

    const home = document.createElement('a');
    home.href = '../../index.html';
    home.className = 'menu-home';
    home.textContent = '← all lectures';
    panel.appendChild(home);

    const links = [];
    Reveal.getSlides().forEach((sec, i) => {
      const h = sec.querySelector('h2');
      let label = h ? h.textContent.trim() : (i === 0 ? 'qr · link' : 'title');
      if (sec.querySelector('.poll, table.step-table')) label += '  · try it';
      const a = document.createElement('a');
      a.href = '#';
      a.innerHTML = '<span class="menu-n">' + (i + 1) + '</span>' + label.replace(/</g, '&lt;');
      a.onclick = e => {
        e.preventDefault();
        const idx = Reveal.getIndices(sec);
        Reveal.slide(idx.h, idx.v);
        panel.classList.remove('open');
      };
      panel.appendChild(a);
      links.push([sec, a]);
    });

    function mark() {
      const cur = Reveal.getCurrentSlide();
      links.forEach(([sec, a]) => a.classList.toggle('current', sec === cur));
    }
    btn.onclick = e => {
      e.stopPropagation();
      const open = panel.classList.toggle('open');
      if (open) {
        mark();
        const c = panel.querySelector('a.current');
        if (c) c.scrollIntoView({ block: 'center' });
      }
      btn.blur();
    };
    document.addEventListener('click', e => {
      if (!panel.contains(e.target) && e.target !== btn) panel.classList.remove('open');
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
    Reveal.on('slidechanged', mark);

    // bottom-left bar: [ menu ] always; [ ← ] [ → ] shown on phones (CSS)
    const bar = document.createElement('div');
    bar.className = 'nav-bar';
    const prev = document.createElement('button');
    prev.className = 'nav-btn'; prev.textContent = '←';
    prev.onclick = e => { e.stopPropagation(); Reveal.prev(); prev.blur(); };
    const next = document.createElement('button');
    next.className = 'nav-btn'; next.textContent = '→';
    next.onclick = e => { e.stopPropagation(); Reveal.next(); next.blur(); };
    bar.appendChild(btn); bar.appendChild(prev); bar.appendChild(next);
    document.body.appendChild(bar);
    document.body.appendChild(panel);
  }
  Reveal.on('ready', build);
})();
