# CCAR-F Question Bank

Exam prep for the Claude Certified Architect (Foundations) certification —
780 multiple-choice questions across the five exam domains, with
realistic timed mock exams, scoring, review, and retry-failed drilling.

## Use

Open `index.html` in any browser. No server, build step, or dependencies.
Progress, score history, and your weak-question set are stored in the
browser's localStorage.

Modes:

- **Mock exam** — 60 questions drawn by real domain weights (D1 16, D2 11,
  D3 12, D4 12, D5 9), 120-minute timer, flag-for-review, navigator grid.
  Scored out of 1000; pass at 720 (44+ correct), with per-domain breakdown
  and full answer review with explanations. Exit mid-exam and resume later.
- **Retry failed** — after any session, re-quiz only the questions you got
  wrong, repeatable until none remain.
- **Drill weak questions** — every question you have ever missed collects
  into a persistent set; answer it correctly anywhere to clear it.
- **Practice by domain** — untimed, instant feedback and explanation after
  each answer.
- **Custom quiz** — pick domains, length (10/20/30/60), timed or untimed.
- **Score history** — all exam attempts with per-domain results.
- **Mastery view** — per-domain share of the bank you've ever answered
  correctly, on the home screen.

Keyboard shortcuts during a session: `1`–`4` (or `A`–`D`) answer, `←`/`→`
navigate, `F` flag, `Enter` next.

## Development

- `app.js` — quiz engine; pure logic functions are exported for tests
- `questions/domain1.js` … `domain5.js` — original question sets (49/32/36/36/27)
- `questions/domain1-set2.js` … `domain5-set2.js` — harder expansion sets
  (32/22/24/24/18)
- `questions/imported-shikhorroy.js` — 480 additional questions (tagged with
  `subdomain`). Totals per domain: 193/134/156/156/141.
- `node --test test/logic.test.mjs` — engine tests
- `node test/validate-bank.mjs` — structural validation of the question bank

Design spec: `docs/superpowers/specs/2026-10-23-ccarf-question-bank-design.md`
