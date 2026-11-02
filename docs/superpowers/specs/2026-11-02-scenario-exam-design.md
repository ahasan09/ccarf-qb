# Scenario Exam Mode — Design

Date: 2026-11-02
Status: Approved

## Why

The real CCAR-F exam is not a flat list of 60 questions. The user sat it on
2026-11-02 (passed, 865/1000) and found every question tied to a scenario:
**4 scenarios, 15 questions each**. The current app's mock exam draws
questions by domain weight, and most questions either repeat the whole
scenario text inline or have no scenario. So it doesn't practise what the real
exam feels like: holding one scenario in mind while answering 15 long
questions about it.

The goal is a mode that feels as close to the real exam as possible, so
anyone preparing can rehearse it properly. Questions that don't fit a
scenario stay in the app as a separate general bank.

A second problem to fix: explanations for many bank questions are one block of
text that discusses all options together. Some refer to options by letter and
no longer match the option shown. Every scenario question must have a
**separate note for each option** that talks only about that option.

## Goals

- A new **Scenario exam** mode on the home screen, next to the existing Mock
  exam (which stays unchanged).
- A **Practice by scenario** mode: untimed, feedback after each answer.
- A **scenario question bank**: existing questions reused and rewritten where
  they fit a scenario, plus new questions where a scenario runs short.
- Per-option notes on every scenario question.
- Results page modelled on the real score report: score and pass/fail, then
  percentage correct per objective.

## Non-goals

- Changing the existing Mock exam, Supplementary mock, Custom quiz, Drill,
  imported exams, or sync behaviour.
- Select-two questions in the scenario bank. The real exam had one correct
  answer per question. The 51 existing select-two questions stay in the
  general bank.
- Rewriting the general (non-scenario) bank's explanations. That can come
  later.

## Anti-goals (would make this a failure even if it works)

- An option note that discusses a different option, or that refers to
  options by letter ("B is wrong because…").
- Questions on the right that repeat the scenario intro. The scenario text
  belongs on the left only.
- Short one-line questions. Real exam questions are 3–5 sentences: their own
  situation (what happened, what was tried, what went wrong), then the ask.
- The same question appearing twice in one attempt.

## The six scenarios

The official scenarios (text taken from the existing imported exams, which
already carry it):

1. Customer Support Resolution Agent
2. Code Generation with Claude Code
3. Multi-Agent Research System
4. Developer Productivity with Claude
5. Claude Code for Continuous Integration
6. Structured Data Extraction

Each scenario has one fixed background paragraph shown on the left for all of
its questions.

## Exam format (decided with the user)

- 60 questions: 4 scenarios × 15, scenarios picked at random from the six
  for each attempt; 15 questions drawn at random from that scenario's pool.
- Exactly one correct answer out of four options.
- 120-minute timer for the whole exam; auto-submit at zero.
- Free navigation with Previous and Next for the whole exam, across scenario
  boundaries.
- Scored out of 1000, pass at 720, using the app's existing scoring.
- Exit mid-exam and resume later, like the existing mock exam.

## Exam screen (mockup approved)

- **Top bar:** exam name, "Scenario n of 4", "Question n of 60", timer,
  **Comment** button, **Flag** button (toggles).
- **Left panel (~40%):** scenario name and background text, fixed for all 15
  questions of that scenario. Scrolls on its own if long.
- **Right panel:** question text and four options. Click to select.
  **Right-click an option** opens a small menu with "Strike through" (and
  "Remove strike-through" if already struck). A struck option is shown greyed
  with a line through it. It can still be selected.
- **Bottom bar:** Previous, answered and flagged counts, "Review all", Next.
  On the last question, Next leads to the review screen.
- **Comment:** a free-text note attached to the question, saved with the
  attempt and shown in the post-exam review.
- No explanations or correctness shown during the exam.

## Review screen (before submit; mockup approved)

- Questions grouped by scenario, each shown as a numbered tile with status:
  answered, unanswered, flagged, has comment.
- Filters: All, Flagged, Unanswered.
- Click a tile to jump to that question. The timer keeps running, and the user
  can return to the review screen at any time.
- **Submit exam** button. Confirm if any are unanswered.

## Results and post-exam review

- Score /1000, pass/fail.
- **Percentage correct per objective**, weakest first, like the real score
  report. Objectives are the 30 exam-guide task statements already used as
  `subdomain` (e.g. "4.5 Design efficient batch processing strategies").
  Every scenario question must carry one.
- Per-scenario score too.
- Full review grouped by scenario, with the scenario text on the left as
  during the exam. For each question: the user's answer, the correct answer,
  **the note under every option**, the overall explanation, and the user's
  comment if any.
- Attempt saved to score history like other exams.

## Practice by scenario

- Home screen lists the six scenarios with a question count each.
- Same two-panel layout, untimed. After each answer: correct or wrong, then
  the per-option notes and the overall explanation.
- Strike-through and flag also available.

## Question data

A new set of files, separate from the general bank, e.g. `scenarios/`:

```js
window.SCENARIOS = [
  { id: "support", name: "Customer Support Resolution Agent", text: "…" }, …
];
window.SCENARIO_BANK = [
  {
    id: "sc-support-001",
    scenario: "support",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows …",   // required
    question: "…3–5 sentences, no scenario intro…",
    options: ["…", "…", "…", "…"],                         // exactly 4
    answer: 2,                                             // single index
    optionNotes: ["…", "…", "…", "…"],                     // required, one per option
    explanation: "…",                                      // overall rationale
    source: "d1-q87"                                       // id it was adapted from, if any
  }
];
```

- Options keep a fixed order (no shuffling), so notes always line up.
- No option note or explanation refers to an option by letter or position.
- Validation (extend `test/validate-bank.mjs`): exactly 4 options, a single
  integer answer, 4 non-empty option notes, known scenario and subdomain,
  unique ids, no question text starting with the scenario intro, and a
  minimum question length.

## Building the bank

1. Collect candidates: about 300 questions already tied to a scenario. 120
   carry a `scenario` field (`mock1.js`, `purcell.js`; purcell covers only 4
   scenarios), and the rest have the scenario written inline at the start of
   the question text (other imported exams, some bank files). Add bank
   questions whose content clearly fits one scenario.
2. Rewrite each: remove the repeated scenario intro, keep the question's own
   situation (3–5 sentences), write a note per option, confirm the subdomain.
3. Drop near-duplicates within a scenario.
4. Write new questions where a scenario has fewer than the target. Prioritise
   objectives the user scored low on in the real exam: stop_reason and
   agentic loop termination; settings/hooks vs CLAUDE.md enforcement;
   Batches API vs synchronous; extraction feedback loops; schema nullable and
   enum design; tool description disambiguation; human review routing; MCP
   server integration.
5. Copies are made: the imported exams and general bank keep their original
   questions untouched.

**Target pool size (builder's call):** at least 60 questions per scenario
(360 total), so four attempts at a scenario can avoid repeats. Within a
scenario, cover the subdomains that naturally belong to it.

## Build order and rollout (builder's call, marked)

- Build the engine and UI first against a small seed of rewritten questions,
  then fill the bank one scenario at a time.
- **Content review gate (decided with the user):** after each scenario's
  questions are written, the user skims and approves them before the next
  scenario starts. Answers and notes are checked against the official Claude
  docs while writing.
- The Scenario exam goes live as soon as every scenario has at least 15
  questions. The pool grows over later commits toward the target.

## Relationship to existing features (builder's call, marked)

- Scenario questions stay separate from the general bank. They don't feed the
  existing weak set, Drill, Saved questions, or the Progress coverage,
  accuracy and mastery numbers, so those screens and their denominators are
  unchanged.
- Scenario attempts appear in Score history and reopen in the two-panel
  review.
- **Draw avoids repeats:** within each scenario, the exam draw prefers
  questions not used in earlier scenario attempts, falling back to random
  once all have been used. "Used" comes from the stored attempts, which
  already hold their questions, so no new synced state is needed.
- **One session at a time**, like today: starting a scenario exam while
  another session is in progress asks before replacing it.

## Constraints

- Same stack as today: plain `index.html` + `app.js`, no build step, no
  dependencies, works from `file://` and as the existing PWA (update `sw.js`
  cache list for new files).
- Pure logic (drawing, scoring, per-objective breakdown) exported for Node
  tests like the existing engine.
- Existing progress and sync format must keep working. New attempt data adds
  fields (scenario ids, strikes, comments) without breaking old attempts.
- Keyboard: keep existing shortcuts. Strike-through also via keyboard is
  nice-to-have.
- Works on phone width: panels stack (scenario on top, collapsible).

## Left to the builder

- Exact file split for scenario data.
- Visual styling, within the existing app's theme and dark mode.
- How strikes and comments are stored in session state.
- Whether practice mode prefers questions not yet seen.
