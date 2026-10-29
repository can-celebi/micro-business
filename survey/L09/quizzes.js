// L09 quiz contents (Sinan v2.6, 29.10, Murat PASS: Block B = corners and the kink, Block C = λ): questions and options
// only. The keys are NOT in this file (Kamuran R50: assume some students cheat); on the results slide the lecturer marks
// the right option by hand (quizres9.js). Options keep the order below for every student (answers are stored as one
// letter per question: a = first option …), in the order of Sinan's file.
(function () {
  const m = s => '<span class="m">' + s + '</span>';
  const fr = (a, b) => '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>';
  const PX = (v) => m('<i>p<sub>x</sub></i> = ' + v), PY = (v) => m('<i>p<sub>y</sub></i> = ' + v);
  window.L09_QUIZZES = {
    q1: { title: 'quiz · corners, the kink and λ',
      setup: [['x, y', 'two goods'], ['MRS', 'how much y you would give up for one more x and feel exactly as good'],
              ['price ratio', m(fr('<i>p<sub>x</sub></i>', '<i>p<sub>y</sub></i>')) + ' = how much y one more x costs']],
      qs: [
        { t: m('<i>u</i> = 4<i>x</i> + 3<i>y</i>') + ' (perfect substitutes: 3 units of x are as good as 4 units of y). ' + PX(1) + ', ' + PY(1) + '. Where is the best bundle?',
          o: ['spend everything on y', 'spend half on each', 'spend everything on x', 'it can\'t be told'] },
        { t: 'The same person, ' + m('<i>u</i> = 4<i>x</i> + 3<i>y</i>') + ', but now ' + PX(2) + ', ' + PY(1) + '. Where is the best bundle?',
          o: ['spend everything on x', 'spend everything on y', 'spend half on each'] },
        { t: m('<i>u</i> = min{3<i>x</i>, 4<i>y</i>}') + '. ' + PX(3) + ', ' + PY(2) + ', ' + m('<i>B</i> = 72') + ', so the budget line is ' + m('3<i>x</i> + 2<i>y</i> = 72') + '. The best bundle is …',
          o: [m('(24, 0)'), m('(0, 36)'), m('(12, 18)'), m('(16, 12)')] },
        { t: 'At the best bundle, ' + m('λ = 0.05') + '. The budget rises by €1. Utility rises by about …',
          o: [m('1'), m('0.05'), m('20'), m('0')] }
      ] }
,
    // q2 (PA1–PA3) and q3 (E1–E3): Sinan's items go here (Can 29.10: the slide exercises as in-class quizzes); until then
    // the pages exist (closed by the gate) so the deck's slots can be built
    q2: { title: 'quiz 2 · the exercises PA1–PA3', setup: [['x, y', 'two goods']], qs: [] },
    q3: { title: 'quiz 3 · the exercises E1–E3', setup: [['x, y', 'two goods']], qs: [] }
  };
  window.L09_NEXT = { q1: 'L09-N1', q2: 'L09-PA1', q3: 'L09-E1b' };   // the slide after the quiz slide (Filiz)
})();
