# Home Redesign — Design

Date: 2026-11-02
Status: Approved (mockup approved by the user: `.superpowers/brainstorm/44403-1793630386/content/home-redesign.html`)

## Why

The home page lists the app's inventory (877 questions, 577 mapped, 300
supplementary) and ten equal-weight sections. It never answers the two things a
candidate wants: *am I ready?* and *what should I do next?* Four exam types
compete for the first click, the most realistic one (Scenario exam) is not the
primary action, progress ignores scenario and mock exam results, the domain list
appears twice, and a first-time visitor sees greyed-out cards and three "0%"
tiles.

Goal: turn the first screen into "here is where you stand, do this next",
following the approved mockup.

## Goals

- Readiness panel: predicted score, pass verdict, exam countdown, review-due
  count, score trend, primary **Start scenario exam**, **Other exams ▾** menu,
  link to review the last attempt.
- Next best step: the three weakest objectives, each with a "Drill 8 →".
- By objective: one list (replaces "Progress" + "Practice by domain"); domains
  expand to their task statements, each with accuracy and a Drill button.
- Practice column: Due for review (spaced repetition), Saved questions, Custom
  quiz, the six scenarios with best score.
- Collapsed (single-line `<details>`) Score history, Imported practice tests,
  Account & sync.
- First visit: 20-question diagnostic, optional exam-date picker, three steps,
  what's inside.

## Non-goals

- No change to exam/practice screens, scoring, the scenario bank, or sync
  transport.
- No removal of existing modes: Mock exam, Supplementary mock, Drill weak
  questions, Practice by domain/subdomain, imported tests all remain reachable.

## Anti-goals

- A prediction that looks authoritative without data. With no exam attempts the
  readiness panel must not show a number.
- Breaking existing progress or sync: old stored progress must load unchanged.

## Definitions (builder must implement exactly)

- **Exam attempt**: a history entry from a Mock exam, Supplementary mock,
  Scenario exam, Diagnostic or imported mock (all already stored with `items`).
- **Predicted score**: recency-weighted mean of the last up-to-5 exam attempts'
  `score`, weights 5,4,3,2,1 newest first (diagnostic counts). Hidden when there
  are no attempts. Verdict: **Likely pass** ≥ 760, **Borderline** 680–759,
  **Not yet** < 680. Caption: "Based on your last N exams."
- **Objective accuracy**: for each of the 30 task statements, correct/answered
  over every question in exam attempts whose question (looked up by id) has that
  `subdomain`. Questions not loaded or without a subdomain are skipped. Shown as
  "—" when nothing answered. Domain accuracy = same over all its subdomains.
- **Weakest objectives** (Next best step): lowest accuracy among objectives with
  ≥ 3 answered, ties by fewer answered; up to three. Hidden until one qualifies.
- **Objective drill**: up to 8 scenario-bank questions with that subdomain,
  unseen-in-exams first, as a scenario-practice session (two-panel, notes after
  each answer). If the scenario bank has none for that subdomain, fall back to
  the existing bank practice for that subdomain.
- **Spaced review**: new synced state
  `review: {[questionId]: {due: ms, step: 0..3, updatedAt: ms, done?: true}}`.
  - When answers count: practice answers immediately (in `selectOption`); exam
    answers at submit, where an unanswered question counts as wrong.
  - A wrong answer in any graded session or practice (bank, scenario, imported)
    sets `{step: 0, due: now + 1 day}`.
  - A correct answer to a question already in `review` whose `due ≤ now`
    advances `step` and sets `due = now + [3, 7, 14] days[step-1]`; a correct
    answer at step 3 marks it `done: true` (a tombstone, kept so a merge cannot
    bring it back; done entries are never due). Every write stamps `updatedAt`.
  - "Due for review" = entries with `due ≤ now` whose question is loaded; the
    session is a practice run over them (scenario questions in two-panel, bank
    questions one-panel — the builder may split into two buttons if mixing is
    impractical).
  - The weak set (`weak`) and Drill weak questions keep working unchanged.
- **Exam date**: new synced `examDate: "YYYY-MM-DD" | null`; set from the
  first-visit picker or an "edit" link in the readiness panel. Countdown "N days
  left"; past dates show nothing.
- **Diagnostic**: a scenario exam of 2 scenarios × 10 questions, 40 minutes,
  same screens; history entry `kind: "scenario"`, `diagnostic: true`,
  `examName: "Diagnostic"`. Scored on the 1000 scale like other exams.
- The diagnostic is an exam attempt everywhere: it counts toward the predicted
  score, Score history, each scenario's best score, and "unseen first".
- Objective drills and Due for review may mix scenarios in one session; the
  existing scenario-practice screen already shows each question's own scenario
  on the left.
- Imported practice tests have no subdomains, so they add to the predicted
  score and Score history only, not to objective accuracy.
- **First visit** = no history entries and no saved session. Otherwise the
  returning layout.

## Sync

- `emptyProgress`/`normalizeProgress` gain `review` (object, default `{}`) and
  `examDate` (string or null). Unknown/missing fields default; old data loads.
- New mutations: `recordReview(updates)` (merge per id; `null` removes) and
  `setExamDate(date)`. `finishSession` and practice answer paths emit
  `recordReview`. `mergeProgress` merges `review` per id keeping the entry with
  the later `updatedAt` (so resets and tombstones win when newer), and keeps a
  non-null `examDate` (prefer `b`).

## Layout (from the approved mockup)

Order: top bar → Readiness → Next best step → two columns (By objective |
Practice) → collapsed Score history, Imported practice tests, Account & sync.
Columns stack below 760px. Existing theme tokens; light and dark. The resume
card (session in progress) stays directly under the readiness panel.

"Other exams ▾" (a `<details>` menu): Mock exam, Supplementary mock, Imported
practice tests (scrolls to/opens that section). The bank coverage/accuracy/
mastery figures move into the By objective header as one small line
("Bank: coverage x% · accuracy y% · mastery z%") so they remain available.
Practice column also lists "Drill missed questions (n)" when the weak set is
non-empty, and "Practice by domain" stays reachable from each domain row
("Practice all").

## Left to the builder

- Markup details, exact copy, chart drawing (inline SVG polyline, no library).
- Whether "Due for review" is one mixed session or split by source.
