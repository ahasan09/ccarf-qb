# CCAR-F Question Bank

Exam prep for the Claude Certified Architect (Foundations) certification —
877 questions (including 40 select-two items) across the five exam domains, with
realistic timed mock exams, scoring, review, and retry-failed drilling — plus a
separate 383-question **scenario bank** and a **Scenario exam** that mirrors the
real exam's format (see [Scenario exam](#scenario-exam)).

## Use

Open `index.html` in any browser. No server, build step, or dependencies.
Progress, score history, and your weak-question set are stored in the
browser's localStorage.

### Home page

- **First visit** — a 20-question **diagnostic** (2 scenarios × 10, 40 min,
  in the real exam's layout) and an optional exam date.
- **Your readiness** — a predicted score (the last five exams, newest weighted
  most: 5,4,3,2,1) with a verdict (**Likely pass** ≥ 760, **Borderline**
  680–759, **Not yet** below), the countdown to your exam date, how many
  questions are due for review, a trend chart of recent scores against the
  720 line, and a link to review your last attempt. **Start scenario exam** is
  the main action; the mock, supplementary and imported exams are under
  **Other exams**.
- **Next best step** — your three weakest exam-guide objectives (at least
  three answered), each with a **Drill**: up to 8 scenario questions on that
  objective with a note on every option.
- **By objective** — accuracy in your exams for each domain and each of the
  30 task statements, with a Drill per objective and **Practice all** for the
  question bank. Bank coverage, accuracy and mastery are shown above it.
- **Practice** — **Due for review**, Saved questions, missed questions,
  Custom quiz, **Search questions**, and the six scenarios with your best
  score in each.
- **Study resources**, score history, imported mock exams and account/sync are
  folded away below. Study resources links to the exam guide, courses, study
  guides and practice material outside the app (opens in a new tab, needs a
  connection); the first visit also points at the two starting resources.

**Spaced review:** every question you miss (in practice, or unanswered or
wrong in an exam) comes back after 1 day; each time you get it right when due
it waits 3, 7, then 14 days, and after that it is done. The schedule and your
exam date sync with the rest of your progress.

Modes:

- **Mock exam** — 60 questions drawn by real domain weights (D1 16, D2 11,
  D3 12, D4 12, D5 9) from the 577 questions mapped to an exam-guide
  subdomain, 120-minute timer, flag-for-review, navigator grid.
  Scored out of 1000; pass at 720 (44+ correct), with per-domain breakdown
  and full answer review with explanations. Exit mid-exam and resume later.
- **Scenario exam** — the real exam's format: four scenarios × 15 questions,
  120 minutes, pass at 720. Details below.
- **Practice by scenario** — untimed practice on one scenario, with a note
  for every option after each answer.
- **Supplementary mock exam** — the same format drawn from the 300 questions
  not mapped to a subdomain, so the main mock stays exam-guide aligned.
- **Retry failed** — after any session, re-quiz only the questions you got
  wrong, repeatable until none remain.
- **Drill weak questions** — every question you have ever missed collects
  into a persistent set; answer it correctly anywhere to clear it.
- **Practice by domain** — untimed, instant feedback and explanation after
  each answer.
- **Custom quiz** — pick domains (and optionally narrow any of them to chosen
  subdomains), length (10/20/30/60/all), timed or untimed.
- **Saved questions** — star any question while answering to keep it; study the
  saved list from the home screen.
- **Imported mock exams** — eight complete exams loaded from `exams/`, listed
  separately on the home screen. Each offers **Practice** (untimed, explanation
  after every answer) and **Take mock** (120-minute timer, scored attempt).
  Supports select-two questions.
- **Score history** — all exam attempts with per-domain results.
- **Progress** — coverage (how much of the bank you have tried), accuracy
  (how much of that you got right) and mastery (correct share of the whole
  bank), overall and per domain/subdomain.
- **Attempt review** — every exam attempt stores its questions and answers, so
  any past attempt can be reopened and reviewed from score history.

- **Search questions** — find questions by keyword (every word must appear in
  the text, options, explanation, objective or id) across the bank and the
  scenario questions, then **Practice these** to drill just the matches.
- **Time per question** — timed sessions record how long each question took.
  Results show your average against the real exam's 2:00 per question and
  your slowest objectives. While the clock runs, the top bar shows
  **⏱ N behind pace** once you are 3 or more questions behind an even pace.
  Closing or reloading the tab mid-exam asks first (the clock keeps running).
- **Report a problem** — after answering in practice, and on every review
  card, a link opens a pre-filled GitHub issue for that question (never
  shown during an exam).
- **Backup file** — Account & sync → **Download progress** saves everything
  to a `.json` file; **Import from file…** adds one back. Importing only adds
  (nothing is removed; the newer review schedule wins per question), so it
  is safe on any device, signed in or not.

- **Strike through** — in mock, imported, custom, retry and weak-drill
  sessions (and the scenario exam), right-click an option you have ruled out
  to cross it out; right-click again to undo. Touch: tap ⊘. Not in plain
  practice, where the answer shows on the first click.

Keyboard shortcuts during a session: `1`–`5` (or `A`–`E`) answer, `←`/`→`
navigate, `F` flag, `Enter` next. The bottom bar of every question screen
lists the ones that work there (practice runs only go forward, and plain
practice has no flag); the list comes from `kbdHint()` in
`js/app/question.js` — keep it in step with the keydown handler in
`js/app/events.js`. After each click, keyboard focus stays on
the control you used.

Theme: use the toggle on the home screen (Auto / Light / Dark).

## Scenario exam

The real CCAR-F exam is scenario-based: it picks four of six official
scenarios and asks 15 questions about each. Every question has exactly one
correct answer out of four. The Scenario exam reproduces that.

**The six scenarios** (60 questions each in the scenario bank):

| Scenario | File |
|---|---|
| Customer Support Resolution Agent | `scenarios/support.js` |
| Code Generation with Claude Code | `scenarios/codegen.js` |
| Multi-Agent Research System | `scenarios/research.js` |
| Developer Productivity with Claude | `scenarios/devprod.js` |
| Claude Code for Continuous Integration | `scenarios/ci.js` |
| Structured Data Extraction | `scenarios/extraction.js` |

**During the exam**

- The scenario's background text stays fixed on the left for all 15 of its
  questions; the question (its own 3–5 sentence situation and the ask) is on
  the right.
- Top bar: scenario and question position, the 120-minute timer,
  **💬 Comment** (a note kept with the attempt) and **⚑ Flag for review**.
- **Strike through** an option you have ruled out: right-click it, and
  right-click again to undo — no menu, as in the real exam. On a touch screen
  tap ⊘ beside it; with the keyboard, Tab to ⊘ and press Enter. A struck
  option can still be selected.
- Bottom bar: **Previous**, answered/flagged counts, **Review all**, **Next**.
  You can move freely back and forth for the whole exam.
- After the last question, the review screen shows every question as a tile
  grouped by scenario, filterable by **All / Flagged / Unanswered**. Click a
  tile to go back to it — the clock keeps running — then **Submit exam**.
  Time running out submits automatically; unanswered questions count wrong.
- Exit at any point and resume later from the home screen.

**After submitting**

- Score out of 1000 and pass/fail (720).
- **By objective**: percent correct per exam-guide task statement, weakest
  first, like the official score report. **By scenario** as well.
- A review grouped by scenario, with the scenario text on the left, your
  answer, the correct answer, a note under every option explaining why that
  option is right or wrong, the overall explanation, and your comment.
- **Practise the N you missed** starts an untimed scenario practice on them.
- The attempt is kept in Score history and can be reopened.

Each new exam prefers questions you have not met in earlier scenario exams.
Scenario questions are kept apart from the rest of the app: they never enter
Drill weak questions, Saved questions or the Progress figures.

## Progress sync setup (optional)

By default progress lives in the browser's localStorage. To sign in and sync
across devices:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project's **SQL editor**, run:

   ```sql
   create table public.progress (
     user_id uuid primary key references auth.users(id) on delete cascade,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table public.progress enable row level security;
   create policy "own row select" on public.progress
     for select using (auth.uid() = user_id);
   create policy "own row insert" on public.progress
     for insert with check (auth.uid() = user_id);
   create policy "own row update" on public.progress
     for update using (auth.uid() = user_id);
   ```

3. Sign-in is by the e-mailed **magic link** out of the box. To also offer a
   code box (handy when mail opens on a different device), the e-mail must
   contain the code: set up custom SMTP (**Authentication → Emails → SMTP
   Settings**; the built-in mailer can't use edited templates), add
   `<p>Your login code: <strong>{{ .Token }}</strong></p>` to the
   **Magic link or OTP** template, keep the `{{ .ConfirmationURL }}` link,
   then set `emailCode: true` in `config.js`.
4. In **Authentication → URL Configuration**, set the Site URL to where the
   app is hosted (e.g. `https://<you>.github.io/ccarf-qb/`).
5. Copy the **Project URL** and **anon public key** from Project Settings →
   API into `config.js`, uncomment the block, and deploy.

While signed in, the server row is the source of truth. Every sync reads the
row, replays whatever this device has not written yet on top, and writes the
result back with a compare-and-swap on `updated_at`; a write that loses the
race re-reads and replays instead of overwriting. Changes are recorded as
mutations rather than whole-blob writes, so removals (a finished session, a
redeemed weak question) are never resurrected by a later sync.

Syncs run on sign-in, on page load, when the window regains focus or
visibility, when another tab writes, when connectivity returns, debounced
after each change (and at least every 15 seconds during continuous activity),
and once more before the page is hidden or closed. `localStorage` holds only a
cache so the app keeps working offline and before the first fetch; signing out
clears it, and progress cached for one account is never folded into another.

## Development

- `js/logic.js` — pure logic: drawing, grading, progress, readiness, spaced
  review, bank and scenario validation (no DOM)
- `resources.js` — the study-resource links on the home page (`id`, `group`,
  `title`, `url`, optional `note`, `star`, `start`, `exam`). Only `https`
  links in a known group render; keep tracking parameters out of URLs
- `js/store.js` — the progress store and the cross-device sync engine (no DOM)
- `js/app/` — the DOM app, in load order: `state.js` (banks, storage, shared
  state, helpers), `home.js`, `sessions.js`, `question.js`, `results.js`,
  `events.js` (input handling and boot; actions listed in `SLOW_ACTIONS`
  show a spinner on the clicked control and block other clicks and
  shortcuts until they finish). These are classic scripts sharing
  globals, not ES modules, so `index.html` still opens from `file://`; keep
  the order in `index.html`, `sw.js` and `test/engine.mjs` in step.
- `questions/domain1.js` … `domain5.js` — original question sets (49/32/36/36/27)
- `questions/domain1-set2.js` … `domain5-set2.js` — harder expansion sets
  (32/22/24/24/18)
- `questions/extra-set.js` — 480 additional questions (tagged with
  `subdomain`)
- `questions/domain1-gap.js` … `domain5-gap.js` — 57 targeted questions
  filling subdomain gaps found by the coverage audit (6/6/15/6/24)
- `questions/domain1-multi.js` … `domain5-multi.js` — 40 multiple-response
  "select two" questions (11/7/8/8/6), the format the real exam also uses.
  Totals per domain: 210/147/179/170/171.
- `exams/index.js` + `exams/*.js` — eight imported mock exams (480 questions).
  Only the manifest loads with the page; each exam's questions are fetched the
  first time they are opened. Kept out of the practice bank: they never feed practice pools, custom quizzes, mastery or the
  weak drill, and are scored as standalone attempts
- `scenarios/index.js` + `scenarios/<id>.js` — the scenario bank: the six
  official scenarios (`window.SCENARIOS`) and 60–68 single-answer questions per
  scenario (`window.SCENARIO_BANK`). Each question carries `scenario`,
  `domain`, `subdomain` (one of the 30 exam-guide task statements), four
  `options`, one `answer` index, four `optionNotes`, an `explanation`, and
  `source` when adapted from an imported exam. Options are never shuffled, so
  notes always line up.
- `scripts/scenario-candidates.mjs <scenarioId> [--json]` — lists existing
  imported-exam questions that belong to a scenario, as raw material for new
  scenario questions
- **`npm test`** — runs everything: all `test/*.test.mjs` (engine, sync,
  screens, scenarios, home, pace, search, backup, report link) and both
  validators below. Nothing to install; needs Node 20+. GitHub runs the same
  on every push and pull request (`.github/workflows/test-and-deploy.yml`),
  and **publishes the site only when they pass**: a push to `main` that
  breaks a test shows a red ✖ and the live site stays on the last good
  version until a fix passes. To re-publish by hand: Actions → Test and
  deploy → Run workflow.
- **`npm run coverage`** — questions per exam-guide objective in the bank and
  the scenario bank, marking any under 10 (`--min N` to change). Run it
  before writing new questions to see where they are needed.
- Where things live, for common changes: a new screen action → a `case` in
  `handleAction` (`js/app/events.js`); pure rules (grading, pace, search,
  backup file) → `js/logic.js` with a test in `test/`; the "Report a
  problem" target → `REPORT_ISSUE_URL` in `js/app/state.js`. Screens draw
  through `paint(html)`, which keeps keyboard focus.
- `node test/validate-bank.mjs` — structural validation of the question bank
- `node test/validate-scenarios.mjs` — validation of the scenario bank. It
  rejects a question that repeats the scenario intro, is under 40 words, has
  other than four options and four non-empty notes, has an unknown scenario or
  subdomain, or whose notes/explanation refer to options by letter ("option
  B", "(C)"); it also fails if the correct option is the longest in more than
  40% of questions. Add any new `scenarios/*.js` file to `index.html` and to
  `CORE` in `sw.js` (and bump `VERSION`).

Design spec: `docs/superpowers/specs/2026-10-23-ccarf-question-bank-design.md`
(scenario exam: `docs/superpowers/specs/2026-11-02-scenario-exam-design.md`;
home page: `docs/superpowers/specs/2026-11-02-home-redesign-design.md`)
