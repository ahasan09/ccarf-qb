# CCAR-F Question Bank — Design Spec

Date: 2026-10-23
Status: Approved

## Purpose

A self-contained MCQ question bank for preparing for the CCAR-F (Claude
Certified Architect – Foundations) exam. The user takes realistic timed mock
exams, sees a Pearson-style scaled score, reviews mistakes with explanations,
and can re-quiz only the questions they got wrong.

## Real exam parameters (mirrored by the app)

- 60 multiple-choice questions, 120 minutes
- Scaled score out of 1000; passing score 720 (= 44+ correct of 60)
- 5 domains with weights:
  - D1 Agentic Architecture & Orchestration — 27%
  - D2 Tool Design & MCP Integration — 18%
  - D3 Claude Code Configuration & Workflows — 20%
  - D4 Prompt Engineering & Structured Output — 20%
  - D5 Context Management & Reliability — 15%

## Architecture

No build step, no server, no dependencies. Open `index.html` from `file://`.

Files:

- `index.html` — markup and styles for all screens
- `app.js` — quiz engine. Pure logic functions (exam drawing, scoring,
  retry filtering) exported for Node tests via a `module.exports` guard,
  plus DOM wiring.
- `questions/domain1.js` … `questions/domain5.js` — question data, one file
  per domain. Each file pushes onto a global `QUESTION_BANK` array.
- `test/logic.test.mjs` — Node tests for the pure logic
- `test/validate-bank.mjs` — structural validation of the question bank

## Question data model

```js
{
  id: "d3-q07",          // unique, domain-prefixed
  domain: 3,              // 1..5
  question: "…",
  options: ["…", "…", "…", "…"],  // exactly 4
  answer: 2,              // index into options
  explanation: "…"        // why the correct answer is right
}
```

Bank size: 180 questions, split by exam weight:
D1 49, D2 32, D3 36, D4 36, D5 27.

## Modes

### Mock exam
- Draw 60 questions: 16/11/12/12/9 from D1–D5, randomly without replacement;
  shuffle question order and option order per session.
- 120-minute countdown; auto-submit at zero.
- One question per screen, Previous/Next, flag-for-review, navigator grid
  (answered / flagged / current states), jump to any question.
- Submit → results: scaled score `round(correct/60*1000)`, pass/fail vs 720,
  per-domain breakdown (correct/total + bar).
- Review screen: every question with the user's answer, correct answer,
  explanation; filter to wrong-only.

### Retry failed
- From results: restart with only that session's wrong questions (untimed,
  exam-style UI), repeatable until the failed set is empty.
- Cumulative "weak questions" set persisted across sessions; home screen
  offers "Drill weak questions" whenever it is non-empty. Answering a weak
  question correctly in any mode removes it from the set.

### Practice by domain
- Pick one domain; untimed; instant right/wrong + explanation after each
  answer; running tally; summary at the end.

### Score history
- Every completed mock exam appended to history: date, score, pass/fail,
  per-domain correct counts. Listed on the home screen, newest first.

## Persistence (localStorage)

- `ccarf.history` — array of exam results
- `ccarf.weak` — array of question ids answered wrong and not yet redeemed
- `ccarf.session` — serialized in-progress exam (resume on reload)

## Scoring

`scaled = Math.round(correct / total * 1000)`, pass when `scaled >= 720`.
Scaled score is shown only for full 60-question mock exams; practice and
retry sessions show plain correct/total.

## Error handling

- Corrupt/missing localStorage values are discarded and reset to defaults.
- Bank validation failures (bad answer index, ≠4 options, duplicate ids) are
  caught in `test/validate-bank.mjs`, run in development, not at runtime.
- Timer uses an absolute deadline timestamp so reload/resume keeps real time.

## Testing

Node tests (`node --test test/`) covering:
- exam drawing: counts per domain, no duplicates, respects bank
- scoring: scaled score and pass threshold edge cases (43/44 correct)
- retry filtering and weak-set redemption logic
- bank validation: structure, counts per domain, unique ids
