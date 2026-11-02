# Scenario Exam Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Scenario exam (4 scenarios × 15 questions, two-panel layout, flag, comment, strike-through, review-before-submit, per-objective results) and Practice by scenario, backed by a separate scenario question bank with per-option notes.

**Architecture:** Pure logic (validation, drawing, grading breakdowns) goes into `app.js` beside the existing engine and is exported for Node tests. The scenario bank lives in new `scenarios/*.js` files that push onto `window.SCENARIOS` / `window.SCENARIO_BANK`. The UI reuses the existing session, store, mutation and history machinery. New session modes are `"scenario"` and `"scenario-practice"`, and both are marked `separate` so they never touch the weak set or bank progress.

**Tech Stack:** Plain HTML/CSS/JS, no build step; Node `node:test` for tests.

**Spec:** `docs/superpowers/specs/2026-11-02-scenario-exam-design.md`

## Global Constraints

- No build step, no dependencies. Must work from `file://` and as the PWA. Add every new file to `index.html` script tags and the `CORE` list in `sw.js`, and bump `VERSION` in `sw.js`.
- Existing modes (Mock exam, Supplementary, Custom, Drill, Retry, Saved, imported exams), the general bank, and the sync format stay unchanged. Old history entries and sessions must still load.
- Scenario exam: 60 questions = 4 scenarios × 15, scenarios random from 6, 120 minutes (`EXAM_DURATION_MS`), score out of 1000, pass at `PASS_SCORE` (720).
- Scenario questions: exactly 4 options, a single integer `answer`, 4 non-empty `optionNotes`, required `subdomain` matching one of the 30 exam-guide task statements, and a fixed option order (never shuffled).
- No option note or explanation refers to an option by letter or position.
- A question's text never starts with or repeats the scenario intro. Each question is 3–5 sentences: its own situation, then the ask.
- Scenario questions never feed the weak set, Drill, Saved questions or Progress metrics.
- One session at a time. Starting a scenario exam over a saved session uses the existing `okToReplaceSaved()` prompt.
- Imported exams and general-bank questions are copied, never edited.

## Review Focus

1. **Resuming a scenario exam after reload or sync:** strikes, comments, flags and the scenario grouping must survive. Test: Task 3 `resume keeps strikes, comments and scenario order`.
2. **A pool with fewer than 15 questions in some scenario:** the exam must not draw that scenario, and must be unavailable when fewer than 4 scenarios qualify. Test: Task 2 `drawScenarioExam skips thin scenarios` / `returns null when fewer than 4 qualify`.
3. **Timer expires while on the review screen:** the exam auto-submits, and unanswered questions count as wrong. Test: Task 5 `deadline on review screen submits`.
4. **Old history entries without `kind`:** these must still review as before. Test: Task 6 `legacy history entry still reviews`.
5. **Strike-through on the selected option:** the option stays selected and gradable, and striking it again removes the strike. Test: Task 3 `toggleStrike keeps answer`.

---

## File Structure

- `scenarios/index.js`: `window.SCENARIOS` (6 scenario definitions with id, name and background text).
- `scenarios/support.js`, `codegen.js`, `research.js`, `devprod.js`, `ci.js`, `extraction.js`: one file per scenario, each pushing onto `window.SCENARIO_BANK`.
- `app.js`: new pure functions plus scenario UI (sections near the existing session/render code).
- `index.html`: two-panel exam styles and script tags.
- `test/scenario.test.mjs`: pure-logic tests.
- `test/ui.test.mjs`: extended with scenario-flow tests (uses the existing `launch()` harness, so add `SCENARIOS`/`SCENARIO_BANK` to its `win`).
- `test/validate-scenarios.mjs`: loads `scenarios/*.js` and runs `validateScenarioBank`.
- `scripts/scenario-candidates.mjs`: dev helper that lists reuse candidates per scenario.

---

### Task 1: Scenario definitions and bank validation

**Files:**
- Create: `scenarios/index.js`, `test/validate-scenarios.mjs`, `test/scenario.test.mjs`
- Modify: `app.js` (pure section and exports), `index.html` (script tag after `exams/index.js`), `sw.js` (CORE + VERSION), `README.md` (Development: mention the new files and command)

**Interfaces:**
- Produces: `window.SCENARIOS: Array<{id, name, text}>` with ids `support`, `codegen`, `research`, `devprod`, `ci`, `extraction`. Also `SUBDOMAINS: string[]` (the 30 task-statement strings exactly as they appear in the general bank's `subdomain` values). Also `validateScenarioBank(scenarios, bank) -> string[]` (error messages). Also `SCENARIO_MIN_WORDS = 40`.

- [ ] **Step 1: Write failing tests** in `test/scenario.test.mjs`, all on `validateScenarioBank`:
  - valid question → `[]`
  - 3 options → error containing `"4 options"`
  - `answer: [0,1]` → error containing `"single answer"`
  - `optionNotes` length 3, or an empty note → error containing `"optionNotes"`
  - unknown `scenario` → error containing `"unknown scenario"`
  - `subdomain` not in `SUBDOMAINS` → error containing `"subdomain"`
  - duplicate id → error containing `"duplicate"`
  - question starting with the first 60 characters of its scenario's `text`, or starting with `"Scenario:"` → error containing `"scenario intro"`
  - question under 40 words → error containing `"too short"`
  - an option note or explanation matching `/\b(option|answer|choice)\s+[A-D]\b|\(\s*[A-D]\s*\)|^[A-D][.)]\s/` → error containing `"letter reference"`
- [ ] **Step 2: Run** `node --test test/scenario.test.mjs`. Expected: FAIL (`validateScenarioBank is not a function`).
- [ ] **Step 3: Implement `validateScenarioBank`, `SUBDOMAINS` and `SCENARIO_MIN_WORDS` in `app.js` and export them.** Write `scenarios/index.js`. Take each scenario's `text` from the inline `"Scenario: <Name> <background>"` prefix used in the `exams/pt*.js` questions. Use the background up to the first sentence that is specific to one question, keeping the shared part only.
- [ ] **Step 4: Write `test/validate-scenarios.mjs`.** It loads `scenarios/index.js` and then every other `scenarios/*.js` in a vm context, the same way `validate-bank.mjs` does. It prints a count per scenario and exits 1 on any error. An empty bank is valid.
- [ ] **Step 5: Run** `node --test test/scenario.test.mjs && node test/validate-scenarios.mjs`. Expected: PASS, and 6 scenarios listed with 0 questions each.
- [ ] **Step 6: Commit** with the message "Add scenario definitions and scenario bank validation".

### Task 2: Drawing and grading logic

**Files:**
- Modify: `app.js` (pure section and exports)
- Test: `test/scenario.test.mjs`

**Interfaces:**
- Consumes: `shuffle(arr, rng)`, `gradeSession(questions, answers)`.
- Produces:
  - `SCENARIO_BLOCK = 15` and `SCENARIO_COUNT = 4`.
  - `eligibleScenarios(scenarios, bank) -> string[]`: ids with ≥ 15 questions.
  - `usedScenarioQuestionIds(history) -> Set<string>`: ids from `items` of entries with `kind === "scenario"`.
  - `drawScenarioExam(scenarios, bank, usedIds, rng) -> {scenarioIds: string[], questions: object[]} | null`. Pick 4 eligible scenarios at random. For each, take unused questions first (shuffled), then fill from used ones (shuffled), 15 per scenario. Questions are grouped by scenario in the chosen scenario order. Returns null if fewer than 4 are eligible.
  - `breakdownBy(questions, answers, keyFn) -> Array<{key, correct, total, pct}>`, sorted by pct ascending, then key.

- [ ] **Step 1: Write failing tests**:
  - `drawScenarioExam` on a bank of 6×20 returns 60 questions with 4 distinct scenarios, 15 each, contiguous blocks, and no duplicate ids.
  - `drawScenarioExam skips thin scenarios`: with 2 scenarios at 10 questions and 4 at 20, the result only uses the 4.
  - `returns null when fewer than 4 qualify`.
  - With 20 per scenario and 15 of a scenario's ids in `usedIds`, that scenario's block contains all 5 unused ids.
  - `usedScenarioQuestionIds` ignores entries without `kind: "scenario"`.
  - `breakdownBy(q => q.subdomain)` gives `{key:"4.5 …", correct:1, total:2, pct:50}` for a 2-question case, and sorting puts 0% before 100%.
- [ ] **Step 2: Run** `node --test test/scenario.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement the five exports** with the signatures above.
- [ ] **Step 4: Run** `node --test test/scenario.test.mjs`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Draw and grade scenario exams".

### Task 3: Scenario session state (start, strike, comment, resume, submit)

**Files:**
- Modify: `app.js` (`newSession`, `loadSavedSession`, `submitSession`, `attemptToFinished`, `MODE_NAMES`, click and keydown handlers)
- Test: `test/ui.test.mjs` (add `SCENARIOS` and `SCENARIO_BANK` to `win`, plus a `scenarioBank()` fixture of 6×16)

**Interfaces:**
- Consumes: Task 2 functions; `window.SCENARIOS` and `window.SCENARIO_BANK`. Scenario questions are added to the `byId` lookup but not to `QUESTION_BANK`.
- Produces:
  - Session fields for mode `"scenario"`: `scenarioIds: string[]`, `strikes: {[qid]: number[]}`, `comments: {[qid]: string}`, `separate: true`, and `order` = natural order for every question.
  - Actions: `start-scenario-exam`, `strike` (`data-opt`, toggles), `comment` (prompts for text with `prompt()`, defaulting to the existing comment; an empty string removes it). The existing `toggleFlag` is reused.
  - `toggleStrike(optIdx)` and `setComment(text)`, both inside the UI closure. Both call `persistSession()`.
  - A history entry for a scenario exam adds `kind: "scenario"`, `scenarioIds`, and per-item `comment` (only when one exists). It sets `examName: "Scenario exam"` and is recorded with `{separate: true}`.
  - `attemptToFinished` maps `kind: "scenario"` to `mode: "scenario"` and carries `scenarioIds` and comments.

- [ ] **Step 1: Write failing UI tests**:
  - Clicking `start-scenario-exam` gives a session with 60 questions and 4 `scenarioIds`.
  - `toggleStrike keeps answer`: select option 2, strike option 2, and the answer stays 2 with `strikes[id]` equal to `[2]`. Striking it again gives `[]`.
  - `resume keeps strikes, comments and scenario order`: strike, comment and flag, then relaunch with the same storage and resume. All are present and the question order is unchanged.
  - After submit, the weak set and `attempted` are unchanged, and the history has one entry with `kind: "scenario"` and the comment on its item.
  - Starting with fewer than 4 eligible scenarios shows an alert and no session.
- [ ] **Step 2: Run** `node --test test/ui.test.mjs`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the fields, actions and history entry above. `loadSavedSession` defaults missing `strikes` and `comments` to `{}`.
- [ ] **Step 4: Run** `node --test test/logic.test.mjs test/sync.test.mjs test/ui.test.mjs test/scenario.test.mjs`. Expected: all PASS, including the existing tests.
- [ ] **Step 5: Commit** with the message "Add scenario exam sessions with strike-through and comments".

### Task 4: Two-panel exam screen

**Files:**
- Modify: `app.js` (`renderQuestion` branches to `renderScenarioQuestion()` when `session.mode` starts with `"scenario"`), `index.html` (styles)
- Test: `test/ui.test.mjs`

**Interfaces:**
- Consumes: Task 3 session fields.
- Produces: the markup contract that later tasks rely on:
  - Top bar: title, `Scenario n of 4`, `Question n of 60`, timer, comment button `data-action="comment"`, flag button `data-action="flag"`.
  - Left `<aside class="scn-panel">`: scenario name and text.
  - Right `<section class="scn-question">`: the question, then options as `button.option[data-action="answer"][data-opt=i]`, with class `struck` when struck and `selected` when chosen.
  - Bottom bar: `prev`, `next`, and `review-all` actions, with answered and flagged counts.
  - Right-click on an option (a `contextmenu` listener on `#app`) shows a small menu with a `data-action="strike"` item reading "Strike through" or "Remove strike-through". `S` + option number is a nice-to-have shortcut; skip it if it conflicts.

- [ ] **Step 1: Write failing UI tests**:
  - The rendered HTML contains `scn-panel` with the scenario's text and the `Scenario 1 of 4` label.
  - The question text appears once and does not appear inside `scn-panel`.
  - A struck option renders with class `struck`.
  - On question 16, the label reads `Scenario 2 of 4`.
  - On question 60, Next goes to the review screen (`view === "scenario-review"`).
- [ ] **Step 2: Run the UI tests.** Expected: FAIL.
- [ ] **Step 3: Implement the render and styles.** The left panel is about 40% wide and scrolls on its own. `.struck` uses `text-decoration: line-through` at reduced opacity. At ≤ 680px the panels stack and the scenario panel becomes a collapsible `<details open>`. Use existing theme tokens so dark mode works.
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Check manually:** open `index.html`, inject a temporary 6×15 fixture via the console, and check the layout, right-click strike, comment and flag in light, dark and phone widths.
- [ ] **Step 6: Commit** with the message "Render scenario exams in a two-panel layout".

### Task 5: Review-before-submit screen

**Files:**
- Modify: `app.js` (`renderScenarioReview()` and actions `review-all`, `review-filter` with `data-filter` in `all`/`flagged`/`unanswered`, `jump` with `data-index`, and `submit-scenario`), `index.html` (tile styles)
- Test: `test/ui.test.mjs`

**Interfaces:**
- Consumes: Task 4 markup and the Task 3 session.
- Produces: `view = "scenario-review"`. Tiles are grouped under scenario names and numbered 1–60, with status classes `answered`, `unanswered`, `flagged` and `commented`. The timer keeps running here. `submit-scenario` calls `confirm()` when unanswered > 0, then `submitSession()`.

- [ ] **Step 1: Write failing tests**:
  - The `flagged` filter shows only flagged tiles.
  - `jump` with index 17 renders question 18.
  - Submit with 2 unanswered calls `confirm`.
  - `deadline on review screen submits`: set `session.deadline` in the past, fire the timer tick, and the results render with unanswered questions counted wrong.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.** The existing `startTimer` tick must work for both views, so check `inQuestionScreen()` or extend it to include `scenario-review`.
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add review-before-submit screen for scenario exams".

### Task 6: Results and post-exam review

**Files:**
- Modify: `app.js` (`renderResults` and `renderReview` branch on `mode === "scenario"`; Score history shows "Scenario exam")
- Test: `test/ui.test.mjs`

**Interfaces:**
- Consumes: `breakdownBy`, `scaledScore`, and the history entry from Task 3.
- Produces: The results page shows the score out of 1000 and pass or fail, then a "By objective" table (`breakdownBy(q => q.subdomain)`, weakest first, percentages), then a "By scenario" table. The review is grouped by scenario with the scenario text on the left. For each question it shows the given answer, the correct answer, a note under every option, the explanation, and the user's comment under the heading "Your comment".

- [ ] **Step 1: Write failing tests**:
  - The results HTML contains "By objective", with the first row the lowest percentage.
  - The review HTML for a question contains all 4 `optionNotes`, each inside the same element as its option text.
  - A comment from the attempt appears in the review.
  - Reopening the attempt from Score history renders the same review.
  - `legacy history entry still reviews`: an entry with no `kind` still opens the existing one-panel review.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests.** Expected: PASS.
- [ ] **Step 5: Commit** with the message "Show per-objective results and two-panel review for scenario exams".

### Task 7: Home cards and Practice by scenario

**Files:**
- Modify: `app.js` (`renderHome`, `startScenarioPractice(scenarioId)`, practice feedback branch in `renderScenarioQuestion`), `README.md` (Modes list)
- Test: `test/ui.test.mjs`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces:
  - A home card "Scenario exam" placed right after the existing "Mock exam" card. It shows the 4×15 / 120-minute description and a `start-scenario-exam` button, which is disabled with the text "Available once every scenario has 15 questions" until all 6 are eligible.
  - A "Practice by scenario" card listing the 6 scenarios with counts and `data-action="practice-scenario" data-scenario=id` buttons, each disabled at 0 questions.
  - The practice session uses mode `"scenario-practice"`, `separate: true`, no deadline, and all questions of that scenario, preferring unseen ones first and otherwise shuffled. After answering, it marks correct or wrong and shows the per-option notes and explanation. Strike and flag work; Comment is hidden.

- [ ] **Step 1: Write failing tests**:
  - The home page shows both cards.
  - The exam button is disabled when one scenario has 10 questions.
  - A practice answer shows all 4 notes.
  - The practice session doesn't change the weak set.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run all tests and** `node test/validate-bank.mjs && node test/validate-scenarios.mjs`. Expected: PASS.
- [ ] **Step 5: Check manually** in the browser: a full flow with the temporary fixture (start, answer, strike, comment, flag, review, submit, results, review, reopen from history).
- [ ] **Step 6: Commit** with the message "Add scenario exam and practice-by-scenario to the home screen".

### Task 8: Candidate finder for reuse

**Files:**
- Create: `scripts/scenario-candidates.mjs`

**Interfaces:**
- Produces: `node scripts/scenario-candidates.mjs <scenarioId>` prints a JSON array of candidate source questions: `{sourceId, origin: "exam"|"bank", subdomain, question, options, answer, optionNotes?, explanation}`. Candidates are imported-exam questions whose `scenario` field or inline `"Scenario: <Name>"` prefix matches, excluding select-two questions. It also prints a per-subdomain count. Plain helper with no tests; sanity-check it by running it for each id and confirming it finds about 45–75 candidates for support, ci and research.

- [ ] **Step 1: Write the script.** It loads files with `vm`, like `validate-bank.mjs`.
- [ ] **Step 2: Run it for all 6 ids** and record the counts in the commit message.
- [ ] **Step 3: Commit** with the message "Add helper that lists reuse candidates per scenario".

### Tasks 9–14: Fill the bank, one scenario per task, with a user sign-off after each

Order (most existing material first): **9 support, 10 ci, 11 research, 12 extraction, 13 codegen, 14 devprod.**

**Files (per task):** Create `scenarios/<id>.js`. Modify `index.html` and `sw.js` (CORE + VERSION bump).

**Rules for every question** (these are the acceptance criteria and are checked by `validate-scenarios.mjs` where possible):
- Target **60** questions. The minimum before moving on is 15.
- Reused question: drop the scenario intro and keep the question's own 3–5 sentence situation and ask. Keep the options' meaning, rewording only to remove letter references. Set `source` to the original id.
- Every option gets its own note. The note says why *this* option is right or wrong, in terms of what this option proposes, and never mentions other options by letter.
- Drop near-duplicates (same ask with the same correct idea) within the scenario.
- Spread across the subdomains that belong to the scenario. Write new questions first for the user's weak objectives where they fit this scenario: 1.1 agentic loop and `stop_reason`; 3.1/3.2 settings permissions and hooks vs CLAUDE.md; 4.5 Batches API vs synchronous; 4.4 feedback loops on extraction errors; 4.3 nullable fields and enums in schemas; 2.1 tool description disambiguation; 5.5 human review routing; 2.4 MCP server integration.
- Check every correct answer and every claim in a note against current official docs (Claude API docs, Claude Code docs, Agent SDK docs via context7 or the docs site). Rewrite or drop anything that can't be confirmed.
- Distractors must be plausible and of similar length to the correct answer. The correct option must not be noticeably the longest.

**Steps (per task):**
- [ ] **Step 1:** Run `node scripts/scenario-candidates.mjs <id>` and pick the candidates.
- [ ] **Step 2:** Write `scenarios/<id>.js` following the rules above.
- [ ] **Step 3:** Run `node test/validate-scenarios.mjs`. Expected: no errors, and `<id>` count ≥ 15 (target 60).
- [ ] **Step 4:** Check the length bias: the script's output should show the correct option is the longest in ≤ 40% of questions. Add this check to `validate-scenarios.mjs` in Task 9.
- [ ] **Step 5:** Commit with the message "Add <Scenario name> scenario questions (<n>)".
- [ ] **Step 6: USER GATE.** Tell the user the scenario is ready to skim: the count, the subdomain spread, and how to open it in Practice by scenario. Do not start the next scenario until they approve. Apply their corrections and commit them before moving on.

After Task 14, the Scenario exam button enables itself. Run the full test suite and `node test/validate-scenarios.mjs` once more, then use superpowers:finishing-a-development-branch.
