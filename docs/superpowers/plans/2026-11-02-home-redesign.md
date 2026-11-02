# Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inventory-style home page with the approved readiness-first layout (readiness, next best step, by objective, practice, collapsed sections, first-visit diagnostic), backed by spaced review and exam-date state.

**Architecture:** New pure functions in `app.js` (exported, tested in `test/home.test.mjs`) compute the predicted score, objective accuracy, weakest objectives, drill picks and review scheduling. Two new synced fields (`review`, `examDate`) go through `emptyProgress`/`normalizeProgress`/`mergeProgress` and two new mutations. `renderHome` is rewritten around those; existing modes stay reachable.

**Tech Stack:** Plain JS/HTML/CSS, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-02-home-redesign-design.md`

## Global Constraints

- Old stored progress (no `review`, no `examDate`) loads unchanged; sync tests stay green.
- No change to exam/practice screens, scoring, scenario bank, or sync transport.
- No number in the readiness panel without at least one exam attempt.
- Every existing mode stays reachable: Mock, Supplementary, Drill weak, Practice by domain/subdomain, Custom, Saved, imported tests, Score history, account.
- Bump `VERSION` in `sw.js`.

## Review Focus

1. A sync merge must not resurrect a finished review entry or undo a newer reset — Task 1 `mergeProgress keeps the newer review entry`.
2. Imported questions not yet loaded (lazy exams) must not crash objective accuracy — Task 2 `objectiveAccuracy skips unknown ids`.
3. An exam submitted with unanswered questions schedules them for review — Task 3 `unanswered exam questions are scheduled`.
4. A returning user with only imported attempts sees a predicted score but no weak objectives — Task 5 `imported-only history shows a score but no next step`.
5. Exam date in the past shows no countdown — Task 5 `past exam date hides the countdown`.

---

### Task 1: Review and exam-date state

**Files:** Modify `app.js` (progress state, Mutations, exports). Create `test/home.test.mjs`.

**Interfaces — Produces:**
- `REVIEW_STEPS_DAYS = [1, 3, 7, 14]`, `DAY_MS = 86400000`.
- `reviewAfterAnswer(entry | undefined, correct, now) -> entry | null` — wrong: `{step:0, due: now+1d, updatedAt: now}`; correct with entry due (`due<=now`, not done): step+1 with `due = now + REVIEW_STEPS_DAYS[step]` days, or `{...,done:true}` after step 3; correct otherwise: `null` (no change).
- `dueReviewIds(review, now) -> string[]` (not done, `due <= now`).
- `Mutations.recordReview(updates: {[id]: entry})`, `Mutations.setExamDate(date|null)`.
- `emptyProgress()` gains `review: {}`, `examDate: null`; `normalizeProgress` validates both; `mergeProgress` merges `review` per id by later `updatedAt`, `examDate` = `b.examDate || a.examDate`.

- [ ] **Step 1:** Tests: wrong → step 0 due +1d; correct on due step 0 → step 1 due +3d; correct on not-yet-due → null; correct on due step 3 → done; `dueReviewIds` excludes done and future; normalize defaults on old data; `mergeProgress keeps the newer review entry` (newer reset beats older later-due; newer done beats older live); mutations apply.
- [ ] **Step 2:** Run `node --test test/home.test.mjs` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run all tests (`node --test test/*.test.mjs`) → PASS.
- [ ] **Step 5:** Commit "Add spaced-review and exam-date state".

### Task 2: Readiness analytics

**Files:** `app.js`, `test/home.test.mjs`.

**Interfaces — Produces:**
- `examAttempts(history) -> entries` (entries with numeric `score`; all exam kinds).
- `predictedScore(history) -> {score, count, verdict: "pass"|"borderline"|"not-yet"} | null` — last ≤5 newest-first weights 5..1, rounded; ≥760 pass, ≥680 borderline.
- `objectiveAccuracy(history, lookup) -> {[subdomain]: {correct, total}}` — over `items` of exam attempts; `lookup(id)` returns the question or undefined; skip missing/no subdomain.
- `weakestObjectives(acc, limit=3, minAnswered=3) -> [{key, correct, total, pct}]` — lowest pct, ties fewer answered first.
- `objectiveDrillIds(scenarioBank, subdomain, usedIds, n=8) -> ids` — unused first, then used, both shuffled.
- `bestScenarioScores(history, lookup) -> {[scenarioId]: pct}` from scenario attempts' items.

- [ ] **Step 1:** Tests incl. `objectiveAccuracy skips unknown ids`, weights example (scores [600,700,800] newest last → (800·5+700·4+600·3)/12 = 717 → borderline), null on empty, tie rule, drill unseen first.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS all. **Step 5:** Commit "Compute readiness, objective accuracy and drills".

### Task 3: Record review from answers

**Files:** `app.js` (`selectOption` practice branch, `submitSession`), `test/ui.test.mjs`.

- Practice (bank `practice`, `scenario-practice`, imported practice): after grading an answer, `Store.mutate(Mutations.recordReview({[id]: entry}))` when `reviewAfterAnswer` returns non-null.
- Exam submit (`exam`, `imported`, `scenario` incl. diagnostic, `custom`, `retry`, `weak` graded at submit): one `recordReview` with an update for every question (unanswered = wrong), skipping nulls. Practice modes graded at submit already recorded per answer — don't double-count.
- [ ] Tests: wrong practice answer → `review[id].step === 0`; `unanswered exam questions are scheduled`; correct answer to a not-due question leaves review unchanged; start-review action runs a session over due ids. Then implement, PASS all, commit "Schedule missed questions for spaced review".

### Task 4: Diagnostic and drills/review sessions

**Files:** `app.js` (`drawScenarioExam` gains optional `{scenarios, perScenario}`; `startDiagnostic`; actions `start-diagnostic`, `drill-objective` (`data-sub`), `start-review`), `test/ui.test.mjs`, `test/scenario.test.mjs`.

- Diagnostic: 2 scenarios × 10, `deadline = 40 min`, mode `scenario`, `session.diagnostic = true`; history entry `diagnostic: true`, `examName: "Diagnostic"`. Review screen and block labels already follow `scenarioIds`.
- `drill-objective`: scenario-practice over `objectiveDrillIds`; if empty, `startPractice(domain, subKey)` with the subdomain's code.
- `start-review`: due ids split by source — scenario ids → scenario-practice session; bank/imported ids → `practice`-mode session (`savedDrill`-style title "Due for review"). If both exist, scenario first is fine; the home shows one button with the total and starts scenario ones first (ruling allowed by spec).
- [ ] Tests: diagnostic draws 20 from 2 scenarios with 40-min deadline and records `diagnostic: true`; drill-objective session has ≤8 questions all with that subdomain; review session contains exactly due ids. Implement, PASS, commit "Add diagnostic, objective drills and review sessions".

### Task 5: Returning-user home

**Files:** `app.js` (`renderHome` rewrite), `index.html` (styles), `test/ui.test.mjs` (update home assertions that referenced removed markup; keep behaviour).

Layout per spec/mockup. Actions: `start-scenario-exam` (primary), `<details class="other-exams">` with `start-exam` mapped/unmapped and a link to imported section, `review-attempt` for last attempt, `edit-exam-date` (prompt `YYYY-MM-DD`, empty clears), `drill-objective`, `toggle-objective` (`data-domain`), `practice` (domain "Practice all"), `start-review`, `start-saved`, `start-weak` (shown only when weak non-empty, "Drill missed questions (n)"), `custom-builder`, `practice-scenario`. Collapsed `<details>`: Score history (existing table), Imported practice tests (existing rows), Account & sync (existing `accountCard`). Bank line with Coverage / Accuracy / Mastery words. Resume card under readiness. Sparkline: inline SVG of last ≤6 exam scores, 0–1000 scale, dashed 720 line.
- [ ] Tests: readiness shows predicted score after attempts; no number with none; verdict text; `imported-only history shows a score but no next step`; `past exam date hides the countdown`; future date shows "N days left"; next step lists ≤3 with Drill buttons; by objective renders 5 domains and expands; practice column shows due count; collapsed sections present; all old actions still in markup (`start-exam` mapped+unmapped, `custom-builder`, `practice-scenario`). Implement, PASS, commit "Redesign the home page around readiness and next steps".

### Task 6: First-visit home

- No history and no saved session → hero with `start-diagnostic`, "Skip — full scenario exam" (`start-scenario-exam`), date input (`set-exam-date` on change via `edit-exam-date`-style prompt button is acceptable), three steps, what's inside (scenario rows + Other exams menu). Collapsed sections still present below.
- [ ] Tests: fresh launch shows diagnostic button and no readiness number; after one attempt the returning layout appears. Implement, PASS, commit "Add a first-visit home with a diagnostic".

### Task 7: Polish, docs, browser check

- Headless screenshots (desktop/600px, light/dark, first-visit and seeded returning state via localStorage injection); fix layout issues. README "Use" section: describe the home page (readiness, next step, review, diagnostic, exam date). `sw.js` VERSION bump. Commit "Document the new home page".
