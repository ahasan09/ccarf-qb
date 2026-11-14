/* Today: readiness (or the first-visit welcome) with one main action, the
 * next best step, the week's activity, and the admin's visitor card. */
import {
  Alert, Badge, Box, Button, Card, Collapse, Group, Paper, SimpleGrid, Stack, Table, Text, Title, Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconArrowRight, IconChevronDown, IconFlame } from "@tabler/icons-react";
import {
  setTab, editExamDate, startScenarioExam, startReview, drillObjective, resumeSession,
  finishSavedSession, discardSession, reviewAttempt, scenarioExamReady, diagnosticReady, MODE_NAMES,
} from "../../core/controller.js";
import {
  L, BANK, byId, bankIds, Store, isListed, countsAsStudy, isUsableSession, answeredCount, RESOURCES,
  PASS_SCORE, plural,
} from "../../core/env.js";
import { ActionButton, ExamGuideLink, ExternalLink, Meter } from "../../components/common.jsx";
import { isAdminUser } from "../../components/AccountMenu.jsx";

/* Objective figures come from the bank and the scenario bank only. */
export const lookup = (id) => {
  const q = byId[id];
  return q && (bankIds[id] || q.scenario) ? q : undefined;
};

export function isFirstVisit(p, saved) {
  return !p.history.length && !saved && !p.saved.length && !p.weak.length &&
    !p.attempted.length && !Object.keys(p.review || {}).length;
}

function bankLeft(p) {
  const seen = {};
  p.attempted.concat(p.correctEver, p.weak || []).forEach((id) => { seen[id] = true; });
  return BANK.filter((q) => !seen[q.id]).length;
}

function savedName(saved) {
  return (saved.scope === "unmapped" ? "Supplementary mock"
    : saved.diagnostic ? "Diagnostic"
      : Object.prototype.hasOwnProperty.call(MODE_NAMES, saved.mode) ? MODE_NAMES[saved.mode] : "Session") +
    (saved.examName ? " — " + saved.examName : "");
}

export function ScenarioExamNote() {
  return scenarioExamReady() ? null : (
    <Text size="sm" c="dimmed">The scenario exam is available once every scenario has {L.SCENARIO_BLOCK} questions.</Text>
  );
}

function AllExamsLink() {
  return (
    <Button variant="subtle" data-action="tab" data-tab="exams" onClick={() => setTab("exams")}
      rightSection={<IconArrowRight size={16} />}>
      All exams
    </Button>
  );
}

/* One main button, picked by where the user is: an unfinished session, a
 * first visit, questions due, the weakest objective, else the full exam. */
function HeroCta({ p, saved, acc, now, firstVisit }) {
  let note = null;
  let main = null;
  let rest = null;
  const examBtn = (variant, label, extra) => (
    <ActionButton action="start-scenario-exam" slow onClick={() => startScenarioExam()} disabled={!scenarioExamReady()}
      variant={variant} {...extra}>
      {label}
    </ActionButton>
  );
  if (saved) {
    const answered = answeredCount(saved);
    const total = saved.questions.length;
    const done = answered >= total;
    note = <><b>{savedName(saved)}{done ? " ready to grade" : " in progress"}</b> · {answered}/{total} answered{done ? " — finish to see your score" : ""}</>;
    main = done ? (
      <>
        <ActionButton action="finish-saved" slow size="md" onClick={finishSavedSession}>Finish &amp; see results</ActionButton>
        <ActionButton action="resume" slow size="md" variant="light" onClick={resumeSession}>Review answers</ActionButton>
      </>
    ) : (
      <ActionButton action="resume" slow size="md" onClick={resumeSession}>Continue · {answered}/{total}</ActionButton>
    );
    rest = <Button variant="subtle" color="gray" data-action="discard" onClick={discardSession}>Discard</Button>;
  } else if (firstVisit) {
    main = (
      <ActionButton action="start-diagnostic" slow size="md" disabled={!diagnosticReady()} onClick={() => startScenarioExam(true)}>
        Start diagnostic
      </ActionButton>
    );
    rest = examBtn("subtle", "or take the full scenario exam");
  } else {
    const due = L.dueReviewIds(p.review, now).filter(isListed).length;
    const weak = L.weakestObjectives(acc, 1)[0];
    if (due) {
      main = <ActionButton action="start-review" slow size="md" onClick={startReview}>Review {plural(due, "due question")}</ActionButton>;
      note = "Spaced review: questions come back just before you would forget them.";
    } else if (weak) {
      main = (
        <ActionButton action="drill-objective" slow size="md" onClick={() => drillObjective(weak.key)}>
          Practise your weakest objective
        </ActionButton>
      );
      note = <><b>{weak.key}</b> · {weak.correct} of {weak.total} right in your exams</>;
    }
    rest = main ? <>{examBtn("light", "Scenario exam")}<AllExamsLink /></>
      : <><AllExamsLink /><Text size="sm" c="dimmed">4 scenarios × 15 · 120 min</Text></>;
    if (!main) main = examBtn("filled", "Start scenario exam", { size: "md" });
  }
  return (
    <Stack gap="sm" mt="md">
      {note ? <Text size="sm">{note}</Text> : null}
      <Group gap="sm">{main}{rest}</Group>
      <ScenarioExamNote />
    </Stack>
  );
}

function Sparkline({ attempts }) {
  const pts = attempts.slice(-6);
  if (pts.length < 2) return null;
  const vals = pts.map((a) => a.score).concat([PASS_SCORE]);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 40) / 50) * 50);
  const hi = Math.min(1000, Math.ceil((Math.max(...vals) + 40) / 50) * 50);
  const w = 300, h = 90;
  const y = (v) => Math.round(h - 8 - ((v - lo) / (hi - lo)) * (h - 18));
  const step = (w - 20) / (pts.length - 1);
  const coords = pts.map((a, i) => [Math.round(10 + i * step), y(a.score)]);
  return (
    <div>
      <svg className="h-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Last ${pts.length} exam scores`} width="100%">
        <line x1="0" x2={w} y1={y(PASS_SCORE)} y2={y(PASS_SCORE)} stroke="var(--mantine-color-teal-6)" strokeDasharray="4 4" strokeWidth="1.5" />
        <text x="4" y={y(PASS_SCORE) - 5} fontSize="10" fill="var(--mantine-color-teal-6)">pass {PASS_SCORE}</text>
        <polyline fill="none" stroke="var(--mantine-primary-color-filled)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          points={coords.map((c) => c.join(",")).join(" ")} />
        {coords.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="4" fill="var(--mantine-primary-color-filled)" />)}
      </svg>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">Last {pts.length} exams</Text>
        <Text size="xs" fw={700}>{pts[pts.length - 1].score}</Text>
      </Group>
    </div>
  );
}

const VERDICTS = { pass: ["Likely pass", "teal"], borderline: ["Borderline", "yellow"], "not-yet": ["Not yet", "red"] };

function ExamDateLine({ p, now }) {
  const days = L.daysUntil(p.examDate, now);
  const plan = L.studyPlan(days, bankLeft(p));
  const showDate = days !== null && days >= 0;
  return (
    <Text size="sm" c="dimmed">
      {showDate ? (
        <>Exam on <b>{new Date(p.examDate + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}</b> · <b>{plural(days, "day")} left</b> · </>
      ) : null}
      <UnstyledButton component="span" className="link" data-action="edit-exam-date" onClick={editExamDate}>
        {p.examDate ? "change exam date" : "set exam date"}
      </UnstyledButton>
      {plan ? <><br /><Text span size="sm" c="var(--mantine-color-text)">{plan}</Text></> : null}
    </Text>
  );
}

function Readiness({ p, now, cta }) {
  const attempts = L.examAttempts(p.history);
  const pred = L.predictedScore(p.history);
  let last = null;
  p.history.forEach((h) => { if (Array.isArray(h.items) && typeof h.score === "number") last = h; });
  return (
    <Card className="h-ready" p="xl">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        <div>
          <Title order={1} size="xs" tt="uppercase" c="dimmed" fw={700} lts={1}>Your readiness</Title>
          {pred ? (
            <>
              <Group align="baseline" gap={6} mt={6}>
                <Text fz={56} fw={800} ff="heading" lh={1}>{pred.score}</Text>
                <Text c="dimmed" size="sm">/ 1000 predicted</Text>
              </Group>
              <Tooltip label={"Based on your last " + plural(pred.count, "exam") + ", newest weighted most"}>
                <Badge mt="xs" size="lg" variant="light" color={VERDICTS[pred.verdict][1]}>
                  {VERDICTS[pred.verdict][0]} · {PASS_SCORE} needed
                </Badge>
              </Tooltip>
            </>
          ) : (
            <Text size="sm" mt="xs">
              No predicted score yet.{" "}
              <UnstyledButton component="span" className="link" data-action="start-diagnostic" onClick={() => startScenarioExam(true)}>
                Start with the 20-question diagnostic
              </UnstyledButton>{" "}
              to get your predicted score and weakest objectives.
            </Text>
          )}
          <Stack mt="sm" gap={4}><ExamDateLine p={p} now={now} /></Stack>
          {cta}
        </div>
        <Stack gap="sm" justify="center">
          <Sparkline attempts={attempts} />
          {last ? (
            <Paper withBorder p="sm" radius="md">
              <UnstyledButton w="100%" data-action="review-attempt" onClick={() => reviewAttempt(last.date)}>
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm">
                    Last attempt · {last.examName || "Mock exam"} ·{" "}
                    {new Date(last.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </Text>
                  <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{last.score} · Review →</Text>
                </Group>
              </UnstyledButton>
            </Paper>
          ) : null}
        </Stack>
      </SimpleGrid>
    </Card>
  );
}

function FirstVisit({ p, cta }) {
  const start = RESOURCES.filter((r) => r.start);
  return (
    <Card className="h-ready h-first" p="xl">
      <Title order={1} size="xs" tt="uppercase" c="dimmed" fw={700} lts={1}>Welcome</Title>
      <Title order={2} mt={6} fz={{ base: 28, sm: 36 }}>Find your starting point</Title>
      <Text mt="xs" c="dimmed">
        A 20-question diagnostic in the real exam&apos;s layout (40 min) gives you a predicted score and your weakest objectives.
      </Text>
      {cta}
      <Text size="sm" c="dimmed" mt="md">
        {p.examDate ? <>Exam date <b>{p.examDate}</b> · </> : "Optional: set your exam date for a countdown and a daily target · "}
        <UnstyledButton component="span" className="link" data-action="edit-exam-date" onClick={editExamDate}>
          {p.examDate ? "change" : "set date"}
        </UnstyledButton>
      </Text>
      {start.length ? (
        <Text size="sm" c="dimmed" mt={4}>
          New to the exam? Start with{" "}
          {start.map((r, i) => (
            <span key={r.id}>
              {i ? " and " : ""}
              <ExternalLink href={r.url}>{r.title} ↗</ExternalLink>
            </span>
          ))}.
        </Text>
      ) : null}
    </Card>
  );
}

function NextStep({ acc }) {
  const weak = L.weakestObjectives(acc);
  if (!weak.length) return null;
  return (
    <Card className="h-next">
      <Title order={3} size="h4">Next best step</Title>
      <Text size="sm" c="dimmed" mt={4} mb="md">
        Your weakest objectives across your exams — each practice set is up to 8 questions with a note on every option.{" "}
        <ExamGuideLink />
      </Text>
      <Stack gap="sm">
        {weak.map((w) => (
          <Group key={w.key} justify="space-between" wrap="nowrap" gap="sm" className="h-weak">
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm">{w.key}</Text>
              <Text size="xs" c="dimmed">{w.correct} of {w.total} right</Text>
            </div>
            <Box visibleFrom="sm"><Meter pct={w.pct} /></Box>
            <Text size="sm" fw={700} w={40} ta="right">{w.pct}%</Text>
            <ActionButton action="drill-objective" slow size="xs" variant="light" onClick={() => drillObjective(w.key)}>
              Practise →
            </ActionButton>
          </Group>
        ))}
      </Stack>
    </Card>
  );
}

function Week({ p, now }) {
  const a = L.activitySummary(p.activity, now, countsAsStudy);
  if (!a.any) return null;
  const top = Math.max(...a.week.map((w) => w.count), 1);
  return (
    <Card className="h-week" id="h-week">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={3} size="h4">Your week</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {a.streak ? <><b>{a.streak}-day streak</b>{a.today ? "" : " · answer a question today to keep it"}</>
              : "No streak yet · answer a question today to start one"} · {a.today} today · {a.weekTotal} this week
          </Text>
        </div>
        {a.streak ? <Badge size="lg" variant="light" color="orange" leftSection={<IconFlame size={14} />}>{a.streak}</Badge> : null}
      </Group>
      <ol className="h-days">
        {a.week.map((w, i) => {
          const d = new Date(w.day + "T12:00:00");
          const name = d.toLocaleDateString(undefined, { weekday: "short" });
          const full = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
          const level = w.count ? Math.max(1, Math.ceil((4 * w.count) / top)) : 0;
          return (
            <li key={w.day} className={"h-day lvl" + level + (i === 6 ? " today" : "")} title={full + ": " + w.count + " answered"}>
              <span className="h-day-box" aria-hidden="true">{w.count || ""}</span>
              <span className="h-day-name" aria-hidden="true">{name}</span>
              <span className="sr-only">{full}: {w.count} questions answered</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const VISITOR_WINDOWS = [
  ["now", "Active now"], ["day", "Last 24 hours"], ["week", "Last 7 days"], ["month", "Last 30 days"], ["all", "All time"],
];

function VisitorCard({ Sync }) {
  const [open, setOpen] = useLocalStorage({ key: "ccarf.visitorsOpen", defaultValue: true });
  const stats = Sync.visitorStats ? Sync.visitorStats() : null;
  const windows = (stats && stats.windows) || {};
  const count = (w, k) => Number((windows[w] || {})[k]) || 0;
  const activeNow = count("now", "anonymous") + count("now", "signedIn");
  return (
    <Card id="h-visitors">
      <UnstyledButton onClick={() => setOpen(!open)} aria-expanded={open} w="100%">
        <Group justify="space-between">
          <Group gap="xs"><Text fw={700}>Visitors</Text><Text size="sm" c="dimmed">admin · {activeNow} active now</Text></Group>
          <IconChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        {!stats ? <Text size="sm" c="dimmed" mt="sm">Loading…</Text> : (
          <>
            <Table mt="sm" striped withTableBorder>
              <Table.Thead><Table.Tr><Table.Th /><Table.Th>Anonymous</Table.Th><Table.Th>Signed in</Table.Th><Table.Th>Total</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>
                {VISITOR_WINDOWS.map(([k, label]) => (
                  <Table.Tr key={k}>
                    <Table.Td>{label}</Table.Td><Table.Td>{count(k, "anonymous")}</Table.Td><Table.Td>{count(k, "signedIn")}</Table.Td>
                    <Table.Td fw={700}>{count(k, "anonymous") + count(k, "signedIn")}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed" mt="xs">
              {plural(Number(stats.registered) || 0, "registered account")}. Anonymous counts browsers; signed in counts accounts,
              by each visitor&apos;s sign-in state at their last visit. Active now means seen in the last 3 minutes.
            </Text>
          </>
        )}
        {Sync.statsError && Sync.statsError() ? <Alert color="red" mt="xs" p="xs">Could not refresh: {Sync.statsError()}</Alert> : null}
        <Button size="xs" variant="subtle" mt="xs" data-action="refresh-visitors" onClick={() => Sync.refreshStats && Sync.refreshStats()}>
          Refresh
        </Button>
      </Collapse>
    </Card>
  );
}

export function Today() {
  const p = Store.snapshot();
  const saved = isUsableSession(p.session) ? p.session : null;
  const now = Date.now();
  const firstVisit = isFirstVisit(p, saved);
  const acc = L.objectiveAccuracy(p.history, lookup);
  const cta = <HeroCta p={p} saved={saved} acc={acc} now={now} firstVisit={firstVisit} />;
  const Sync = L.CCARF_SYNC;
  return (
    <Stack gap="lg">
      {firstVisit ? <FirstVisit p={p} cta={cta} /> : <Readiness p={p} now={now} cta={cta} />}
      <NextStep acc={acc} />
      <Week p={p} now={now} />
      {isAdminUser(Sync) ? <VisitorCard Sync={Sync} /> : null}
    </Stack>
  );
}
