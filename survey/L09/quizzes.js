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
    // q2 (PA1–PA3) and q3 (E1–E3): Sinan 29.10 (Can: "whatever we are doing on the slides, solving stuff, we also do those in
    // the quiz"), options in Sinan's order (final), the 5th option "no idea"; keys only on Raif's phone page (R50)
    q2: { title: 'quiz 2 · the exercises PA1–PA3',
      setup: [['bundles', m('(<i>x</i>, <i>y</i>)')], ['budget line', m('<i>p<sub>x</sub></i><i>x</i> + <i>p<sub>y</sub></i><i>y</i> = <i>B</i>')]],
      qs: [
        { t: m('<i>u</i> = 5<i>x</i> + <i>y</i>') + '; ' + PX(3) + ', ' + PY(1) + ', ' + m('<i>B</i> = 60') + ', budget line ' + m('3<i>x</i> + <i>y</i> = 60') + '. Bundles are (x, y). What is the best bundle?',
          o: [m('(0, 60)'), m('(10, 30)'), m('(20, 0)'), m('(15, 15)'), 'no idea'] },
        { t: m('<i>u</i> = min{2<i>x</i>, 5<i>y</i>}') + '; ' + PX(1) + ', ' + PY(1) + ', ' + m('<i>B</i> = 14') + ', budget line ' + m('<i>x</i> + <i>y</i> = 14') + '. Bundles are (x, y). What is the best bundle?',
          o: [m('(10, 4)'), m('(7, 7)'), m('(14, 0)'), m('(4, 10)'), 'no idea'] },
        { t: m('<i>u</i> = <i>x</i>²·<i>y</i>') + '; ' + PX(2) + ', ' + PY(1) + ', ' + m('<i>B</i> = 30') + ', budget line ' + m('2<i>x</i> + <i>y</i> = 30') + '. Bundles are (x, y). What is the best bundle?',
          o: [m('(5, 20)'), m('(10, 10)'), m('(7.5, 15)'), m('(15, 0)'), 'no idea'] }
      ] },
    q3: { title: 'quiz 3 · the exercises E1–E3',
      setup: [['bundles', m('(<i>x</i>, <i>y</i>)')], ['budget line', m('<i>p<sub>x</sub></i><i>x</i> + <i>p<sub>y</sub></i><i>y</i> = <i>B</i>')]],
      qs: [
        { t: 'Climbing (x) and cinema (y); ' + m('<i>u</i> = <i>x</i>·<i>y</i>²') + '; ' + PX(6) + ', ' + PY(12) + ', ' + m('<i>B</i> = 72') + ', budget line ' + m('6<i>x</i> + 12<i>y</i> = 72') + '. Bundles are (x, y). Where is your best bundle?',
          o: [m('(8, 2)') + ': two thirds of the money on climbing', m('(6, 3)') + ': half the money on each', m('(4, 4)') + ': one third of the money on climbing', m('(0, 6)') + ': everything on cinema', 'no idea'] },
        { t: 'The same person, but climbing gets cheaper: ' + PX(4) + ', ' + PY(12) + ', ' + m('<i>B</i> = 72') + '. How many cinema tickets do you buy now?',
          o: ['3 (fewer)', '4 (the same)', '5 (more)', '6 (all the money on cinema)', 'no idea'] },
        { t: 'Swims (x) and everything else (y, in euros); ' + m('<i>u</i> = 12 ln <i>x</i> + <i>y</i>') + '; ' + PX(3) + ', ' + PY(1) + ', ' + m('<i>B</i> = 30') + '. How many swims do you buy?',
          o: ['2', '4', '6', '10 (all the money)', 'no idea'] },
        { t: 'The same person with less money: ' + PX(3) + ', ' + PY(1) + ', ' + m('<i>B</i> = 9') + '. How much money is left for everything else?',
          o: ['€0', '€3', '€6', '€9', 'no idea'] },
        { t: 'Bracelets: big beads (x), small beads (y); ' + m('<i>u</i> = min{<i>x</i>/2, <i>y</i>/3}') + '; ' + PX(2) + ', ' + PY(1) + ', ' + m('<i>B</i> = 35') + '. Bundles are (x, y); all cost €35. Which bundle makes the most bracelets?',
          o: [m('(14, 7)'), m('(10, 15)'), m('(5, 25)'), m('(12, 11)'), 'no idea'] },
        { t: 'A friend buys ' + m('(8, 19)') + ' for €35. How many bracelets?',
          o: ['4', '5', '6', '8', 'no idea'] }
      ] }
  };
  window.L09_NEXT = { q1: 'L09-N1', q2: 'L09-PA1', q3: 'L09-E1b' };   // the slide after the quiz slide (Filiz)
})();
