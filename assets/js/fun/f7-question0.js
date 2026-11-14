// Fun module f7: the tutorial is Question 0 (Oyun, 14.11.2026; specs: practice/fun-test/SPECS.md, section 7).
// Welcome box (slot tut-after): one line that points to Question 0. Home screen (slot home-top): a card with one question
// about the points rule, until it is answered right. The numbers and the right option are computed from the bridge
// (ladder, afterWrong), so no key is stored. The points are given once, by award('Q0'); get('f7').done remembers it.
(function () {
  'use strict';
  const F = window.MicroFun; if (!F) return;
  const OWN = '[data-f="f7"]';
  F.style('f7', OWN + '{display:block;margin:0 0 14px;max-width:100%}' + OWN + ' .f7-say{margin:10px 0 0;font-weight:600;overflow-wrap:anywhere}' +
    OWN + ' .f7-say.ok{color:var(--ok)}' + OWN + ' .f7-say.no{color:var(--no)}p' + OWN + '{margin:.6rem 0}');

  // the bridge, or null when Question 0 must not show: no bridge, logged out, no award, already answered right
  const ready = () => {
    const A = F.api();
    if (!A || typeof A.award !== 'function' || typeof A.ladder !== 'function' || typeof A.afterWrong !== 'function' ||
        typeof A.get !== 'function' || typeof A.set !== 'function' || typeof A.user !== 'function' || !A.user()) return null;
    return (A.get('f7') || {}).done ? null : A;
  };
  // the numbers of the question: base, its half, the right value, the nearest whole number to the half, the four options (ascending)
  const numbers = A => {
    const base = A.ladder('hard', 1), right = A.afterWrong(base, 1), half = base / 2;
    if (![base, right].every(Number.isInteger) || !F.isPrime(right)) return null;
    let up = right + 1, down = right - 1, near = Math.floor(half), odd = near;   // near: the whole number next to the half, on the side of the half-point
    while (!F.isPrime(up)) up++;
    while (down > 1 && !F.isPrime(down)) down--;
    if (F.isPrime(odd)) do odd++; while (F.isPrime(odd));                        // the fourth option is never prime
    const opts = [right, up, down, odd].sort((a, b) => a - b);
    return down < 2 || odd < 2 || new Set(opts).size < 4 ? null : { base, right, half, near, opts };
  };
  // a composite number as a × b with the two factors as close as possible (153 = 9 × 17)
  const product = n => { let a = Math.floor(Math.sqrt(n)); while (n % a) a--; return n + ' = ' + a + ' × ' + n / a; };

  const own = (slot, tag, html) => {                    // one element of ours per slot: replaced, never duplicated; the slot itself is not cleared
    const old = slot.querySelector(OWN); if (old) old.remove();
    if (html === null) return null;
    slot.insertAdjacentHTML('beforeend', '<' + tag + ' data-f="f7"' + html + '</' + tag + '>');
    return slot.querySelector(OWN);
  };

  const pick = (card, btn, N) => {
    const A = ready(), say = card.querySelector('.f7-say');
    if (!A || btn.disabled) return;
    btn.disabled = true;
    if (Number(btn.value) !== N.right) {
      btn.classList.add('wrong'); say.className = 'f7-say no';
      say.textContent = 'Incorrect. Try again: Question 0 always gives 2 points.';
      return;
    }
    card.querySelectorAll('.opt').forEach(b => { b.disabled = true; });
    btn.classList.add('right'); say.className = 'f7-say ok';
    say.textContent = 'Correct: +2 points. ' + N.base + ' ÷ 2 = ' + N.half + '; the closest prime number is ' + N.right +
      (F.isPrime(N.near) || N.near < 4 ? '' : ' (' + product(N.near) + ' is not prime)') + '.';
    A.award('Q0'); A.set('f7', { done: true });
  };

  F.on('screen', d => {
    const A = ready(), home = F.slot('home-top'), tut = F.slot('tut-after');
    if (tut && (d.tutorial || !A)) own(tut, 'p', A ? ' class="fun-dim">Then try Question 0. It is about the points and gives 2 points, the smallest prime number.' : null);
    if (!home) return;
    const N = A && d.name === 'home' ? numbers(A) : null;
    if (!N) { if (!A || d.name === 'home') own(home, 'div', null); return; }     // answered right, logged out, no award: the card goes
    const card = own(home, 'div', ' class="card"><div class="qmeta"><span>Question 0 · 2 points</span></div>' +
      '<p class="qtext">A hard question is worth ' + N.base + ' points. Each wrong try halves the points to the closest prime number. ' +
      'How many points is the question worth after one wrong try?</p><div class="opts">' +
      N.opts.map((v, i) => '<button class="opt" type="button" value="' + v + '"><span class="l">' + 'abcd'[i] + ')</span> ' + v + '</button>').join('') +
      '</div><p class="f7-say" role="status" aria-live="polite"></p>');
    card.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => { try { pick(card, b, N); } catch (e) { if (window.console) console.warn('fun module f7', e); } }));
  });
})();
