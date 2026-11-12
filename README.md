# CCAR-F Question Bank

Exam prep for the Claude Certified Architect (Foundations) certification —
577 questions mapped to the exam guide's objectives (including 40 select-two
items) across the five exam domains, with
realistic timed mock exams, scoring, review, and retry-failed drilling — plus a
separate 383-question **scenario bank** and a **Scenario exam** that mirrors the
real exam's format (see [Scenario exam](#scenario-exam)).

## Use

Open `index.html` in any browser. No server, build step, or dependencies.
Progress, score history, and your weak-question set are stored in the
browser's localStorage.

### Home page

The home page has four tabs: a row under the header on wide screens and a
bar at the bottom on phones. The open tab is remembered in this browser, and
the Practice tab shows how many questions are due. The header holds
**Search questions** (press `/` from any screen except a running quiz),
the Account & sync chip and the theme button, which names the current theme.

Every tab and screen has its own address (`#/practice`, `#/exams`,
`#/search`, `#/quiz`, `#/results` …; Today is the plain page), so the
browser's Back and Forward move between screens and a tab can be
bookmarked. Back during a quiz asks before leaving, and a finished quiz is
skipped. Questions and warnings (exit, submit, discard, the exam date) open
in an in-app dialog rather than the browser's own boxes.

**Today**

- **First visit** — a 20-question **diagnostic** (2 scenarios × 10, 40 min,
  in the real exam's layout), an optional exam date, and the two starting
  resources.
- **Your readiness** — a predicted score (the last five exams, newest weighted
  most: 5,4,3,2,1) with a verdict (**Likely pass** ≥ 760, **Borderline**
  680–759, **Not yet** below), the countdown to your exam date with a daily
  target ("About 24 new questions a day covers the rest of the bank"), a
  trend chart of recent scores against the 720 line, and a link to review
  your last attempt. Without a score yet, it points at the diagnostic.
- **One main action** — a single main button, chosen by where you are:
  **Continue** an unfinished session, **Start diagnostic** on a first visit,
  **Review N due questions**, **Practise your weakest objective**, or
  otherwise **Start scenario exam**. **All exams →** opens the Exams tab.
- **Next best step** — your three weakest exam-guide objectives (at least
  three answered), each with **Practise**: up to 8 scenario questions on that
  objective with a note on every option, then the objective's bank questions
  are offered from the results screen.
- **Your week** — once you have answered something: the last seven days as a
  shaded strip, today's and the week's counts, and your streak of days in a
  row.

**Practice**

- **By objective** — accuracy for each domain and each of the 30 task
  statements: from your exams when you have taken some, otherwise from
  practice, with both given under each name ("Exams 64% · Practice 80%").
  One **Practise** button per objective and **Practice all** per domain.
  Above it: how many bank questions you have answered and the percent right.
- **Practice** (learn mode) — **Due for review**, Saved questions and missed
  questions, each shown once it has something in it, then Custom quiz,
  **Search questions**, and the six scenarios with your best score in each.

**Exams** — the scenario exam, the diagnostic and the mock exam, then
imported practice tests, then score history.

**Resources** — links to the exam guide, courses, study guides and practice
material outside the app (open in a new tab, need a connection).

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
  After any exam, **Practise your weak spots** lists up to three objectives
  below 72%, each one click from a practice set.
- **Scenario exam** — the real exam's format: four scenarios × 15 questions,
  120 minutes, pass at 720. Details below.
- **Practice by scenario** — untimed practice on one scenario, with a note
  for every option after each answer.
- **Unmapped questions** — the 300 questions not mapped to an exam-guide
  subdomain are kept in `questions/unmapped/`. They are not loaded with the
  page and not used anywhere in the app (practice, exams, search, review
  lists or coverage figures); the app fetches them only to reopen an old
  attempt or finish a session that used them.
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

Theme: use the toggle in the header (Auto / Light / Dark).

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
   Supabase's built-in mailer is only for testing: it sends a handful of
   e-mails per hour for the whole project, after which sign-in shows
   "Too many sign-in e-mails were sent recently". Custom SMTP lifts that;
   a free option needing no domain of your own is a Gmail account with
   2-step verification and an app password (`smtp.gmail.com`, port 587).
   Then raise **Authentication → Rate Limits → emails per hour**.
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

## Visitor stats (optional)

With sync set up, the app can show you, and only you, how many people use it:
active now, and unique visitors over the last 24 hours, 7 days, 30 days and
all time, each split into anonymous and signed in, plus the number of
registered accounts. It appears as a **Visitors** card on the Today tab
when you sign in with an admin e-mail.

Each browser keeps a random ID (`ccarf.visitor` in localStorage) and, while
the page is visible, checks in about once a minute. A check-in records only
that ID, the signed-in account if any, and the time; no IP address, e-mail or
progress. "Active now" means a check-in in the last 3 minutes. Anonymous
counts browsers; signed in counts accounts, each by its sign-in state at its
latest check-in.

In the Supabase **SQL editor**, run the following, with your own e-mail on the
`insert` line (keep real addresses out of this repo: the README is public):

```sql
create table public.visits (
  visitor_id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index visits_last_seen on public.visits (last_seen);
-- RLS with no policies: the table is reachable only through the functions below.
alter table public.visits enable row level security;

create table public.admins (email text primary key);
alter table public.admins enable row level security;
insert into public.admins (email) values ('you@example.com');

-- Anyone may check in. The account comes from the caller's session, never
-- from the request, and rapid repeats are ignored.
create or replace function public.record_visit(p_visitor uuid)
returns void language sql security definer set search_path = public as $$
  insert into visits (visitor_id, user_id) values (p_visitor, auth.uid())
  on conflict (visitor_id) do update
    set user_id = excluded.user_id, last_seen = now()
    where visits.last_seen < now() - interval '30 seconds'
       or visits.user_id is distinct from excluded.user_id;
$$;

-- Only signed-in admins may read the counts.
create or replace function public.visit_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (
    select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email')
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  return (
    with w(key, since) as (values
      ('now',   now() - interval '3 minutes'),
      ('day',   now() - interval '24 hours'),
      ('week',  now() - interval '7 days'),
      ('month', now() - interval '30 days'),
      ('all',   '-infinity'::timestamptz))
    select json_build_object(
      'windows', (select json_object_agg(w.key, json_build_object(
        'anonymous', (select count(*) from visits v
                      where v.last_seen >= w.since and v.user_id is null),
        'signedIn',  (select count(distinct v.user_id) from visits v
                      where v.last_seen >= w.since and v.user_id is not null)))
        from w),
      'registered', (select count(*) from auth.users),
      'at', now())
  );
end $$;
revoke execute on function public.visit_stats() from public, anon;
grant execute on function public.visit_stats() to authenticated;
```

Add more admins with another `insert into public.admins`. To turn the
check-ins off, set `countVisits: false` in `config.js`. Until the SQL has been
run, check-ins fail quietly and nobody sees the card.

## Development

- `js/logic.js` — pure logic: drawing, grading, progress, readiness, spaced
  review, bank and scenario validation (no DOM)
- `resources.js` — the study-resource links on the home page (`id`, `group`,
  `title`, `url`, optional `note`, `star`, `start`, `exam`). Only `https`
  links in a known group render; keep tracking parameters out of URLs
- `js/store.js` — the progress store and the cross-device sync engine (no DOM)
- `js/app/` — the DOM app, in load order: `state.js` (banks, storage, shared
  state, helpers), `dialog.js` (in-app alert/confirm/prompt), `home.js`, `sessions.js`, `question.js`, `results.js`,
  `events.js` (input handling and boot; actions listed in `SLOW_ACTIONS`
  show a spinner on the clicked control and block other clicks and
  shortcuts until they finish). These are classic scripts sharing
  globals, not ES modules, so `index.html` still opens from `file://`; keep
  the order in `index.html`, `sw.js` and `test/engine.mjs` in step.
- `questions/unmapped/domain1.js` … `domain5.js` and `domain1-set2.js` …
  `domain5-set2.js` — the original and expansion sets (300 questions), none
  mapped to an exam-guide objective; not loaded with the page.
  `test/validate-bank.mjs` checks every question in `questions/` has a
  subdomain and every one here has none.
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
- **`npm run e2e`** — the main flows in headless Chrome at phone and desktop
  width: tabs, Back/Forward, search, the dialogs, a mock exam, a scenario
  exam through results and review, score history and the custom quiz. It
  fails on a page error, a broken step or a screen that scrolls sideways on
  a phone. No dependencies: Node serves the app and drives Chrome over the
  DevTools protocol (set `CHROME_PATH` if Chrome is not found). CI runs it
  after `npm test`, before deploying.
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
