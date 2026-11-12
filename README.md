# micro-business

Course site for **040184 UK Microeconomics** (English group, University of Vienna, WS 2026/27), taught by Can Çelebi.
Served via GitHub Pages; the link is posted on Moodle. Problem sets and quizzes live on Moodle.

- `index.html`: landing page (list of lectures)
- `lectures/Lxx/index.html`: reveal.js slide decks (press `s` for speaker notes, `?print-pdf` to export)
- `assets/css/console-light.css`: shared theme (minimal, monospace, light)
- `vendor/reveal/`: reveal.js 5.2.1 (MIT), vendored so slides work offline

## Before pushing: the content guard (house rule 5.14)

`tools/hooks/pre-push` refuses a push that brings exam item wording, a private data file, the lecturer code, or a practice item sharing a budget with an exam item into this public repo. It reads the private sources next to this repo (`MICRO-CAN/05_exams`, `23_leonardo`, `24_quiz-builder`) and refuses when it cannot find them. Install it once per clone (all worktrees share it):

    git config core.hooksPath tools/hooks

Do not push with `--no-verify`; if the guard blocks something that must go out, ask Celebi.
