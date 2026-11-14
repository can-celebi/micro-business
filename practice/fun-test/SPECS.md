# The fun modules: exact specs, v2 (the eight ideas, plus the leaderboard strip, My progress and the Arena level)

Oyun (Game-feel designer), Sat 14.11.2026. Can picked all eight (14.11, 17:02): "you know i liked all of your ideas go ahead (refering to oyuns fun shortlist ideas)". The ideas as Can saw them: `02_overview-html/fun-shortlist.html` (f948958072e0). Build order = this order. North star, Can: "a fun experience for the students that is mbile and browser friendly and makes student get hooked on the game and therefore learn so much".

## 0 · Rules for all eight
1. **Files.** `assets/js/fun/core.js` (shared helpers, the six diagrams) and one file per idea, `assets/js/fun/fN-name.js`. Each module injects its own CSS with `MicroFun.style(id, css)`. No edit to any existing file. Script tags stand before `practice.js`.
2. **Bridge and slots** (agreed with Ali, 14.11): a module only listens to `arena:screen`, `arena:answer`, `arena:total`, `arena:board` (through `MicroFun.on`) and fills slots `<span class="fun" data-fun="NAME">` (through `MicroFun.slot`). It reads `window.MicroPractice.fun` inside its handlers, never at load time. Mock of all of it: `practice/fun-test/` (`mock.js`, `index.html`). Added in v2: an 11th slot `strip` (directly under the top bar on every screen) and `go('leaderboard' | 'home')` on the bridge; shared definitions `MicroFun.mastery` and `MicroFun.history` in `core.js` (f1 and f10 use the same mastery).
3. **Points.** No module computes a point value itself: `ladder(level, k)`, `afterWrong(value, w)`, `pointsNow(id)`, `floor(level)`, `score()` only. No module adds points, except f7's single `award('Q0')`.
4. **Answers.** A module never reads a question's text, options or key, and shows nothing before the verdict.
5. **Motion.** At most 500 ms, once, never looping; none under `prefers-reduced-motion: reduce` (the final state is shown at once; `MicroFun.still()`). No sound.
6. **Look.** Inter (inherited), the page's tokens (`--ink`, `--dim`, `--line`, `--accent`, `--ok`, `--no`), blue `#0062C4` for indifference curves and demand, orange `#D9480F` for budget lines and for "you". Grey text `.fun-dim` (.85rem). Nothing wider than its slot; nothing causes sideways scrolling at 360 px.
7. **Wording.** Formal, full sentences where there is a sentence (R115). The exact strings are given below; no other text.
8. **Robust.** A missing slot, a missing bridge, an empty board or an offline board means the module shows nothing and throws nothing. A slot is refilled on every `arena:screen` (the arena re-renders).
9. **Not removed or changed:** every text, button and number the arena shows today stays (R78.2). The modules add.

## 1 · f1-diagram.js: the topic's own diagram is its progress
- **Where:** slot `cat` in each topic card on the home screen (`data-topic`).
- **What:** `MicroFun.diagram(topic, step, { size: 44, animate, label })` at the right edge of the card (the card becomes a two-column grid: text | diagram, diagram vertically centred), and under the card's existing grey line one more grey line: "2 of 5 question types mastered".
- **Mastered:** a question type of the topic is mastered when the student has 2 questions of that type answered right at the first try (`done[id].p > 0 && done[id].w === 0`); a type with only one question needs 1. m = mastered types, n = types of the topic (from `items(topic)`).
- **Step:** let f = the number of the topic's questions answered right at the first try. Step 0 if f = 0; step 3 if m = n; otherwise step 2 if m / n ≥ 0.5; otherwise step 1. (So the first first-try right answer always draws the first line, and only full mastery draws the last element.)
- **Animation:** the newest step draws itself only the first time the student sees it: keep the last shown step per topic in `set('f1', {sd: 2, …})`; animate when the step is higher than the stored one, then store it.
- **Label for screen readers:** "Progress picture: step 2 of 3".
- **Clicking through does not draw it:** answers after a wrong try and opened solutions count for nothing here.

## 2 · f2-verdict.js: a right answer completes the diagram, a wrong one misses
- **Where:** slot `abar` (first thing in the answer bar, left of the verdict), on `arena:answer`.
- **Right** (`ok`): `MicroFun.diagram(item.topic, 3, { size: 40, animate: true })`: the last element draws itself (450 ms), the dot fades in.
- **Wrong:** `MicroFun.diagram(item.topic, 2, { size: 40, miss: true, animate: true })`: the topic's "miss" mark (a hollow dot beside the crossing, the curve short of the line).
- The arena's verdict text and buttons are untouched. On a new `arena:screen` the slot is empty again (the arena redraws it). The picture is the same for every question of a topic, so it tells nothing about the answer.
- Under 420 px the picture is 32 px.

## 3 · f3-staircase.js: the leaderboard as a curve of the whole class
- **Where:** slot `lb-top`, on `arena:board` (rows = every account; use the tab's points: `tab === 'all' ? row.total : row.topics[tab] || 0`; drop rows with 0; sort by points, highest first).
- **Shown only with 3 or more rows.**
- **Picture:** inline SVG, `width: 100%`, `viewBox 0 0 320 96`, no fixed pixel width. Axes `M14 8V84H312` in `#9aa0a8`, 1 px. One step per student: step i (0-based, N rows) spans x from `14 + i * 298 / N` to `14 + (i + 1) * 298 / N` at height `y = 84 − 72 * p_i / p_0`; one path with `H` and `V` moves, ink, 1.6 px, no fill. With more than 149 rows the path still has one step per student (no sampling).
- **You:** the student's own step drawn again in `#D9480F`, 4 px, with "you" (9 px, orange) above its middle, kept inside the box. Not on the board: no orange step.
- **Labels:** "price maker" (9 px, ink) just right of the top of step 0; nothing else on the axes.
- **Caption** under the picture, `.fun-dim`: "1 price maker · 36 price takers" (N − 1; "1 price taker" when N = 2 does not occur because of the minimum of 3).
- **Animation:** the staircase path draws itself once per visit of the leaderboard (450 ms), not on every tab change or refresh.
- Screen reader label: "The points of all 37 students, from the highest to the lowest."

## 4 · f4-next-rank.js: the price of the next rank
- **Where:** slot `home-top` on the home screen (on `arena:screen` name `home`, using `board()`), and slot `lb-top` on the leaderboard (on `arena:board`). f4 adds its own `<p data-f="f4">` to the slot with `insertAdjacentHTML('beforeend', …)` and replaces only that element on a redraw, so f3, f4 and f7 can share a slot in any load order (f3 and f7 do the same with their own element; f3 uses `'afterbegin'`).
- **Text**, `.fun-dim`, one line, total board only (on the leaderboard: only when `tab === 'all'`):
  - ranked, not first: "Rank 12 · the next rank costs 41 points."
  - first: "Rank 1 · price maker."
  - no points yet (`score() === 0`): "Not ranked yet · your first right answer puts you on the board."
- **Rank:** position of the student's own row (matched by `user().key`) among rows sorted by total, highest first; the student's own total is `score()` (the board row may be older: use `max(row.total, score())` and re-sort).
- **Cost:** (total of the row one rank above) − (own total) + 1.
- Offline, logged out or the board rejected: nothing. `board()` is called once per screen event; no timer, no auto-refresh.

## 5 · f5-primes.js: prime totals wear a prime mark
- **Count-up:** on `arena:total {from, to}` with `to > from`, the text of `#tot` runs through up to 5 prime numbers between `from` and `to` (evenly spread among the primes in that range), 70 ms each, then shows `to`. The last frame is always the exact total. Under reduced motion: no frames. If `#tot` is missing: nothing. If a second `arena:total` arrives while one runs, the first stops and the new one ends on the new `to`.
- **Prime mark:** whenever the total in `#tot` is a prime number, slot `tot-mark` holds `′` (U+2032) in ink; otherwise it is empty. Checked on `arena:screen` and at the end of each count-up. The mark has `title="This total is a prime number."`.
- **Factors:** slot `menu-top` (first row of the account menu), `.fun-dim`, not clickable, padding as the menu rows:
  - prime: "1 487′ is a prime number."
  - composite: "1 491 = 3 × 7 × 71"
  - 0 or 1: nothing.
  Numbers with a narrow space for thousands (`MicroFun.num`) in this row only; `#tot` keeps the arena's own format.
- **Leaderboard:** on `arena:board`, each `table.lb td.p` whose number is prime gets `′` appended in a `<span class="fun-prime">` (once; check before appending). Nothing else in the table changes.
- "Prime mark" is our pun on the word; nowhere do we say it is mathematical notation for prime numbers.

## 6 · f6-curve.js: "How points work" as one picture
- **Where:** slot `how-top`, on `arena:screen` name `how`; and one short note in slot `qmeta` on a question (below).
- **Which type:** if the event has an `item`: that question's type and level. Otherwise the type in which the student has the most right answers (ties: any), with the level of its hardest question; no right answers yet: level "hard", nothing done.
- **Picture:** inline SVG, `width: 100%`, `max-width: 420px`, `viewBox 0 0 320 132`. Axes `M26 8V104H312`. Eight points k = 1…8 at `x = 44 + (k − 1) * 36`, `y = 104 − 88 * ladder(level, k) / ladder(level, 1)`. With r = right answers the student has in that type: points 1…r filled ink (r = 3 px); point r + 1 hollow (white fill, ink stroke 1.4): "the next one"; later points filled at 22% opacity. Numbers (9 px) above the first point, the hollow point (as "next: 181") and the last point; no other numbers, no grid.
- **The wrong-try rule in the same picture:** from the hollow point, three small squares (5 px, stroke `--no`, no fill) straight below it at `y` of `afterWrong(v, 1)`, `afterWrong(v, 2)` and at the axis for 0, joined by a dashed 1 px line in `--no`; to their right (9 px, `--no`): the three values, e.g. "151", "73", "0".
- **Caption** under the picture, `.fun-dim`, two lines:
  - "Each further right answer of one question type gives fewer points: diminishing marginal points."
  - "Each wrong try halves the points to the closest prime number; after the third wrong try the question gives no points."
- **At the lowest value:** when the student's next value in a type equals `floor(level)`, the caption's first line is followed by " You are at the lowest value for this type: a corner solution. Try another type." And in slot `qmeta` of a question whose first-try value `ladder(level, r + 1)` equals `floor(level)`: `.fun-dim` "corner solution: try another type".
- No animation.

## 7 · f7-question0.js: the tutorial is Question 0
- **Where:** slot `tut-after` in the welcome box (first visit), and slot `home-top` while Question 0 is not yet answered right.
- **Welcome box:** under the list, one line `.fun-dim`: "Then try Question 0. It is about the points and gives 2 points, the smallest prime number." The box and its "Got it" button stay as they are.
- **On the home screen** (until answered right; `get('f7')` holds `{ done: true }` afterwards): a card (`.card`) above the topics:
  - meta line: "Question 0 · 2 points"
  - text: "A hard question is worth 307 points. Each wrong try halves the points to the closest prime number. How many points is the question worth after one wrong try?" The two numbers come from the bridge: `ladder('hard', 1)` and the right option `afterWrong(ladder('hard', 1), 1)`.
  - four options as `.opt` buttons, in this fixed order relative to v = `afterWrong(…)` and h = `ladder('hard', 1) / 2`: the right value v; the next prime above v; the next prime below v; `Math.round(h)` if that is not prime, otherwise `Math.round(h) + 1` made composite by adding 1 until it is not prime. Sorted ascending on screen, labelled a) to d). With today's settings: 149, 151, 153, 157; right: 151.
  - a wrong option: it turns to the arena's wrong style and is disabled; line under the options in `--no`: "Incorrect. Try again: Question 0 always gives 2 points."
  - the right option: it turns to the arena's right style, all options disabled; line in `--ok`: "Correct: +2 points. 307 ÷ 2 = 153.5; the closest prime number is 151 (153 = 9 × 17 is not prime)." (numbers computed, the bracket only when the rounded half is composite: its smallest factorisation `a × b`), then `award('Q0')`, `set('f7', { done: true })`; the card stays until the next screen change.
- The right option is found by computing it from the bridge, so no key is stored; Question 0 is about the rule, not a graded item.
- Logged out: nothing. If `award` is missing: nothing is shown at all.

## 8 · f8-run.js: the Arena draws your run
- **Data:** on `arena:answer` with `mode === 'arena'` and `attempt === 1`: append 1 (right) or 0 (wrong) to today's run of that topic: `get('f8')` = `{ sd: [ { d: '2026-11-14', a: [1, 0, 1] }, … ] }`, the day from the device's local date, at most the last 2 runs per topic and the last 60 answers per run; `set('f8', …)`.
- **Where:** slot `arena-top` on the topic page in Arena mode, only when the topic has a run with at least 1 answer.
- **Picture:** inline SVG, `width: 100%`, `max-width: 420px`, `height: 44px`, `viewBox 0 0 320 44`: the latest run's last 24 answers; the path starts at (6, 38); each answer moves 12 to the right; a right answer first rises by s = min(5, 30 / R), where R is the number of right answers among those shown; a wrong one stays flat. One path, ink, 1.8 px; an orange dot (r = 3, `#D9480F`) at its end; a baseline `M6 38H314` in `--line`.
- **Line under it,** `.fun-dim`:
  - one run: "First tries right: 4 of 6 today."
  - with an earlier run: "First tries right: 4 of 6 today, 2 of 6 last time."
  - if the latest run is not from today: "First tries right: 4 of 6 last time."
- **Animation:** the path draws itself once when the page opens (450 ms).
- Screen reader label: "Your run: 4 of 6 first tries right."

## 9 · f9-strip.js: the leaderboard is always visible (Can's Additions 15 and 16)
Can: "leaderboard shold be visble as this is like a nudge for others to play or play more as well you know maybe the top 3 players nick names are also provided"; "total leaderboard and all topis leader board as alternative tabs with defauld on total leaderboard in a small fashion above topic … can be poened like an accordion but not so big".
- **Where:** slot `strip`, which the arena renders directly under the top bar on every screen (new slot, 11th). On `arena:screen` of any name except `login`.
- **Data:** `board()`; total points only for the strip. The module keeps the last rows it got; on a `question` screen it uses them without a new call (it calls only when it has none); on other screens it calls `board()` once per screen event. The student's own total is `max(row.total, score())`.
- **The strip:** one `<button type="button" class="fun-strip" aria-expanded="false">`, full width, one line, 36 px high, `.85rem`, a 1 px bottom line in `--line`, no box:
  - left: the top three, each as rank (grey), nickname (ink, weight 600 for rank 1 only), points (grey): "1 nick_a 4223 · 2 nick_b 3790 · 3 nick_c 3401". Nicknames cut with an ellipsis (`max-width: 9ch` under 560 px, `16ch` above); under 480 px the points are not shown.
  - right, never cut, weight 600: "you: rank 12", or "you: not ranked yet" with 0 points; then "▾" (grey). Logged out: no "you" part.
  - on a `question` screen: only the right part ("you: rank 12 ▾"), right-aligned, so the question keeps the screen.
  - no rows at all: "No one is on the board yet. The first right answer takes rank 1." (grey, not a button).
  - offline or the board rejected: nothing.
- **Opened** (tap or Enter; "▾" turns to "▴"; a second tap closes; closed again on every new screen): a panel directly under the strip, in the page flow, `max-height: 50vh; overflow-y: auto`, white, 1 px `--line` border, radius 10 px:
  - tabs in one row that scrolls sideways: "Total" (default) and the six topic names (from `topics()`); class `.tabs` buttons, `.on` for the current one.
  - a table (class `lb`) with the top 10 of that tab: rank, nickname, points; the student's own row has class `mine`; if the student is ranked below 10, one more row "…" and then the student's own row with its true rank.
  - under the table, when the bridge has `go`: a text link "Full leaderboard" calling `go('leaderboard')`.
  - a tab with no points yet: "No points in this topic yet."
- Nicknames always through `MicroFun.esc`. No animation. The strip never moves the page except when the student opens it.
- **With f4:** on the home screen f4's line then reads only "The next rank costs 41 points." (no "Rank 12 ·", the strip says it); on the leaderboard page f4 keeps the full line. (Fix-up of f4 after f9.)

## 10 · f10-progress.js: My progress (Can's Addition 15)
Can: "we will now have some personlize progress stuff as well that will be super fun so i let oyun to figure all these out".
- **Entry:** a row "My progress" in slot `menu-top` (a `<button type="button">` styled as the menu's rows, under f5's factor line), and a text link "My progress" in slot `home-top` (own element `<p data-f="f10">`, 'beforeend').
- **View:** a box over the page, built by the module with the arena's classes `.modal` and `.card` (as "How points work"): "×" top right, `Esc` and a tap outside close it; focus goes to "×" (`preventScroll`). Title `<h2>`: "My progress".
- **Line 1, three figures** in one row (three columns; stacked under 420 px), each a big number (1.4rem, weight 600, tabular) over a grey label:
  - "68%" · "first tries right" (questions right at the first try ÷ questions answered; "–" with none)
  - "7" · "longest run of first tries right" (the longest unbroken run in `MicroFun.history(api)`)
  - "6 of 14" · "question types mastered" (sum over topics of `MicroFun.mastery`)
- **Then one row per topic** (the arena's order), separated by 1 px lines:
  - left: `MicroFun.diagram(topic, step, { size: 36 })` (no animation here);
  - middle: the topic name (weight 600); under it grey: "3 of 5 types mastered · longest run 4";
  - right, grey, right-aligned: the improvement "40% → 75%" = first tries right in the first half and in the second half of the student's answered questions of that topic in time order (the middle one of an odd number goes to the second half); shown from 6 answered questions on, otherwise "–". When the second number is higher, a small "▲" in `--ok` follows; no mark otherwise (never a red mark).
  - a topic with nothing answered: name and "not started" in grey; no diagram step (step 0 axes).
- **Last line,** `.fun-dim`, one of:
  - "Next step: Preferences has 2 question types you have not mastered yet." (the started topic with the most unmastered types; ties: the arena's order; singular "1 question type")
  - nothing started: "Next step: pick a topic and answer your first question."
  - all mastered: "All question types mastered."
- Above the three figures, a grey caption for the improvement column is not needed; under the topic rows one grey note: "The two percentages are your first tries right in the first and in the second half of your answers."
- No points, no ranks and no clock in this view (the strip and f4 have the ranks); nothing here is sent anywhere.

## 11 · For Ali, in practice.js: the Arena level is seen and can be asked for (Can's Addition 17)
Can: "it doesnt feel like the questions are adjusting dynamically to my level. In adition i sohuld always be able to in arena also request harder question etc somehow".
1. **Rule.** Up one level after 2 right first tries in a row, or after 1 right first try within the fast limit (as now). New: **down one level after 2 wrong first tries in a row** (a wrong first try no longer only repeats the type). The streaks are reset by every level change.
2. **Always seen, Arena only,** at the right end of the question's meta line and next to "Level: easy" on the topic page: `Level` then three small squares (8 px, 2 px apart; filled ink up to the level, the rest `--line`) and two quiet buttons "Easier ↓" and "Harder ↑" (class `link`, `.85rem`, at least 44 px tap height on touch screens; the one that cannot apply is disabled and grey).
3. **Asking:** "Harder ↑" / "Easier ↓" set the level for the **next** question (the open question stays; its points do not change) and reset the streaks. Right under the meta line, grey: "The next question will be medium." (easy / hard). The same line appears on the topic page.
4. **Telling:** when an answer changes the level, the answer bar shows after the verdict, in grey, on its own line: "Level up: medium." or "Level down: easy." (hard / medium accordingly). Nothing flashes.
5. **Event:** `arena:answer` carries `level` (the level after this answer) and `levelChange` (`'up'`, `'down'` or `null`); `arena:screen` carries `level` on topic and question screens in Arena.
6. A level with no open questions left: as now (the next level up, else down), and the line says so: "No easy questions left: the next question will be medium."

## Checks before hand-over (each module)
1. Runs on `practice/fun-test/index.html` with only `core.js` and itself loaded, and with all eight loaded.
2. Every string above appears exactly; no other student-visible text.
3. No value of points typed in the code (no 101, 211, 307, 151 …).
4. Logged out, offline board, empty board, missing slot, missing bridge: no error in the console, nothing shown.
5. At 360 px wide: no sideways scrolling.
6. With reduced motion: no animation, the final state at once.
