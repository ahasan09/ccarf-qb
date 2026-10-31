# CCAR-F Question Bank

Exam prep for the Claude Certified Architect (Foundations) certification —
837 multiple-choice questions across the five exam domains, with
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
- **Imported mock exams** — eight complete exams loaded from `exams/`, listed
  separately on the home screen. Each offers **Practice** (untimed, explanation
  after every answer) and **Take mock** (120-minute timer, scored attempt).
  Supports select-two questions.
- **Score history** — all exam attempts with per-domain results.
- **Mastery view** — per-domain share of the bank you've ever answered
  correctly, on the home screen.

Keyboard shortcuts during a session: `1`–`4` (or `A`–`D`) answer, `←`/`→`
navigate, `F` flag, `Enter` next.

Theme: use the toggle on the home screen (Auto / Light / Dark).

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

3. In **Authentication → Email Templates → Magic Link**, add the one-time
   code to the template so the 6-digit code login works, e.g.
   `<p>Your login code: {{ .Token }}</p>` (the magic link also works as is).
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

- `app.js` — quiz engine; pure logic functions are exported for tests
- `questions/domain1.js` … `domain5.js` — original question sets (49/32/36/36/27)
- `questions/domain1-set2.js` … `domain5-set2.js` — harder expansion sets
  (32/22/24/24/18)
- `questions/extra-set.js` — 480 additional questions (tagged with
  `subdomain`)
- `questions/domain1-gap.js` … `domain5-gap.js` — 57 targeted questions
  filling subdomain gaps found by the coverage audit (6/6/15/6/24).
  Totals per domain: 199/140/171/162/165.
- `exams/*.js` — eight imported mock exams (480 questions), kept out of the
  practice bank: they never feed practice pools, custom quizzes, mastery or the
  weak drill, and are scored as standalone attempts
- `node --test test/logic.test.mjs test/sync.test.mjs test/ui.test.mjs` — engine,
  cross-device sync, and screen-flow tests
- `node test/validate-bank.mjs` — structural validation of the question bank

Design spec: `docs/superpowers/specs/2026-10-23-ccarf-question-bank-design.md`
