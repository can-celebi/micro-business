# micro-business

Course site for **040184 UK Microeconomics** (English group, University of Vienna, WS 2026/27), taught by Can Çelebi.
Served via GitHub Pages; the link is posted on Moodle. Problem sets and quizzes live on Moodle.

- `index.html`: landing page (list of lectures)
- `lectures/Lxx/index.html`: reveal.js slide decks (press `s` for speaker notes, `?print-pdf` to export)
- `assets/css/console-light.css`: shared theme (minimal, monospace, light)
- `vendor/reveal/`: reveal.js 5.2.1 (MIT), vendored so slides work offline

## Before pushing: the content guard (house rule 5.14)

The guard refuses a push that brings into this public repo: exam item wording (also inside PDFs), a private data file, the lecturer code, an unreadable binary, or a practice item that leaks an exam item (a shared budget line, the same answer, an exam answer printed in it). It refuses too when the pushed range cannot be read (run `git fetch`) or the private sources are missing.

It lives OUTSIDE this repo, at one absolute path next to the private sources it reads (`MICRO-CAN/24_quiz-builder/hooks/pre-push`), so a checkout or worktree on any branch runs it. Install it once in the main checkout (all worktrees share the config):

    git config core.hooksPath "<absolute path to MICRO-CAN>/24_quiz-builder/hooks"

Do not push with `--no-verify`; if the guard blocks something that must go out, ask Celebi.
