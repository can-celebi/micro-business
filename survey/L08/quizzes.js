// L08 quiz contents (Sinan, 28.10 v3 + Murat's bike stem 17:4x, checked by Murat): questions and options only. The keys are NOT in this file
// (Kamuran R50: assume some students cheat); the results slide gets them separately. Options keep the order below for
// every student (answers are stored as one letter per question: a = first option …), so the key positions vary.
(function () {
  const m = s => '<span class="m">' + s + '</span>';
  const u = s => m('<i>u</i> = ' + s);
  window.L08_QUIZZES = {
    q1: { title: 'quiz 1 · the MRS',
      setup: [['x', 'smoothies'], ['y', 'cookies'], ['MRS', 'how many cookies you would give up for one more smoothie and feel exactly as good']],
      qs: [
        { t: 'You would give up 3 cookies for one more smoothie and feel exactly as good. Your MRS is …', o: ['1', '2', '3', '4'] },
        { t: 'Along one indifference curve, you get more and more smoothies. The number of cookies you would give up for one more smoothie usually …', o: ['falls', 'rises', 'stays the same'] },
        { t: 'Your MRS is 4 cookies per smoothie; your friend\'s is 1. Who values one more smoothie more, measured in cookies?', o: ['your friend', 'you', 'the same'] },
        { t: 'At bundle P the indifference curve is steep; at bundle Q it is flat. Where is the MRS higher?', o: ['at Q', 'the same', 'at P'] }
      ] },
    q2: { title: 'quiz 2 · guess the utility function',
      setup: [['x, y', 'amounts of two goods'], ['u', 'a utility that ranks bundles the way the person does']],
      qs: [
        { t: 'Two brands of bottled water that you like exactly the same: one bottle of A is as good as one bottle of B. Which utility fits? (x = bottles of A, y = bottles of B)',
          o: [u('min{<i>x</i>, <i>y</i>}'), u('<i>x</i> · <i>y</i>'), u('<i>x</i> + <i>y</i>'), u('<i>x</i> − <i>y</i>')] },
        { t: 'Hot dogs: you only enjoy a sausage together with a bun, one each. Which utility fits? (x = sausages, y = buns)',
          o: [u('<i>x</i> + <i>y</i>'), u('min{<i>x</i>, <i>y</i>}'), u('<i>x</i> · <i>y</i>'), u('<i>x</i> − <i>y</i>')] },
        { t: 'A bike needs 1 frame and 2 wheels, and more bikes is better. Which utility ranks bundles of frames and wheels the way you do? (x = frames, y = wheels)',
          o: [u('min{<i>x</i>, <i>y</i>}'), u('min{3<i>x</i>, <i>y</i>}'), u('<i>x</i> + <i>y</i>'), u('min{2<i>x</i>, <i>y</i>}')] },
        { t: 'A family pizza is exactly as good to you as 4 slices. Which utility fits? (x = family pizzas, y = slices)',
          o: [u('4<i>x</i> + <i>y</i>'), u('<i>x</i> + 4<i>y</i>'), u('min{<i>x</i>, <i>y</i>}'), u('<i>x</i> · <i>y</i>')] }
      ] }
  };
})();
