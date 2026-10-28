// L09 quiz contents (Sinan, 29.10: corners, the kink and λ): questions and options only. The keys are NOT in this file
// (Kamuran R50: assume some students cheat); the results slide gets them separately. Options keep the order below for
// every student (answers are stored as one letter per question: a = first option …), so the key positions vary.
(function () {
  const m = s => '<span class="m">' + s + '</span>';
  const fr = (a, b) => '<span class="fr"><span>' + a + '</span><span>' + b + '</span></span>';
  window.L09_QUIZZES = {
    q1: { title: 'quiz · corners, the kink and λ',
      setup: [['x, y', 'two goods'], ['MRS', 'how much y you would give up for one more x and feel exactly as good'],
              ['price ratio', m(fr('<i>p<sub>x</sub></i>', '<i>p<sub>y</sub></i>')) + ' = how much y one more x costs']],
      qs: [
        { t: m('<i>u</i> = 5<i>x</i> + <i>y</i>') + ' (perfect substitutes: one x is as good as 5 y). Prices: ' + m('<i>p<sub>x</sub></i> = 4') + ', ' + m('<i>p<sub>y</sub></i> = 1') + '. Where is the best bundle?',
          o: ['spend everything on y', 'spend everything on x', 'spend half on each', 'it can\'t be told'] },
        { t: 'The same person, ' + m('<i>u</i> = 5<i>x</i> + <i>y</i>') + ', but now ' + m('<i>p<sub>x</sub></i> = 6') + ', ' + m('<i>p<sub>y</sub></i> = 1') + '. Where is the best bundle?',
          o: ['spend everything on x', 'spend half on each', 'spend everything on y'] },
        { t: m('<i>u</i> = min{<i>x</i>, 3<i>y</i>}') + ' (perfect complements: x and y are used 3 to 1). Prices ' + m('<i>p<sub>x</sub></i> = 1') + ', ' + m('<i>p<sub>y</sub></i> = 3') + ', budget ' + m('<i>B</i> = 60') + '. The best bundle is …',
          o: [m('(30, 10)'), m('(60, 0)'), m('(0, 20)'), m('(15, 15)')] },
        { t: 'At the best bundle, ' + m('λ = 0.05') + '. The budget rises by €1. Utility rises by about …',
          o: [m('1'), m('0.05'), m('20'), m('0')] }
      ] }
  };
  window.L09_NEXT = { q1: 'L09-N1' };   // the slide after the quiz slide (Filiz)
})();
