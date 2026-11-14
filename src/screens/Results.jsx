/* After a session: the score, weak spots, breakdowns by objective, scenario
 * and domain, time per question, and the ways on. */
import {
  Badge, Button, Card, Container, Group, List, Progress, RingProgress, Stack, Text, Title,
} from "@mantine/core";
import { IconConfetti } from "@tabler/icons-react";
import {
  S, isScenarioMode, startRetry, startScenarioPractice, drillObjective, startPractice, showReview, goHome,
} from "../core/controller.js";
import {
  L, BANK, byId, scenarioById, DOMAIN_NAMES, SUBDOMAINS, PASS_SCORE, fmtTime, plural,
} from "../core/env.js";
import { ActionButton, DomainBadge } from "../components/common.jsx";

function sessionResultLabel(mode) {
  switch (mode) {
    case "retry": return "Retry session — keep going until everything is green";
    case "weak": return "Missed questions";
    case "practice": return "Practice session complete";
    case "custom": return "Custom quiz complete";
    case "scenario-practice": return "Scenario practice complete";
    default: return "";
  }
}

function ScoreCard({ finished }) {
  const grade = finished.grade;
  const isExam = finished.mode === "exam" || finished.mode === "scenario";
  const frac = isExam ? finished.score / 1000 : grade.total ? grade.correct / grade.total : 0;
  const good = isExam ? finished.score >= PASS_SCORE : frac >= 0.72;
  return (
    <Card className="score-card" p="xl">
      <Group gap="xl" wrap="wrap">
        <RingProgress
          size={160}
          thickness={14}
          roundCaps
          sections={[{ value: Math.max(0, Math.min(1, frac)) * 100, color: good ? "teal" : "red" }]}
          label={
            <Stack gap={0} align="center">
              <Text fz={34} fw={800} ff="heading" lh={1}>{isExam ? finished.score : grade.correct}</Text>
              <Text size="sm" c="dimmed">/ {isExam ? 1000 : grade.total}</Text>
            </Stack>
          }
        />
        <Stack gap="xs">
          {isExam ? (
            <>
              <Badge size="xl" color={good ? "teal" : "red"} variant="filled">{good ? "PASS" : "FAIL"}</Badge>
              <Text c="dimmed">Passing score {PASS_SCORE} · you answered {grade.correct} of {grade.total} correctly</Text>
            </>
          ) : (
            <>
              <Title order={2} size="h3">{Math.round(frac * 100)}% right</Title>
              <Text c="dimmed">{sessionResultLabel(finished.mode)}</Text>
            </>
          )}
        </Stack>
      </Group>
    </Card>
  );
}

/* Up to three objectives under 72% in this exam, each a click from practice. */
function WeakSpots({ finished }) {
  const qs = finished.questions.map((s) => byId[s.id]).filter((q) => q && SUBDOMAINS.indexOf(q.subdomain) >= 0);
  if (!qs.length) return null;
  const weak = L.breakdownBy(qs, finished.answers, (q) => q.subdomain).filter((r) => r.pct < 72).slice(0, 3);
  return (
    <Card className="weak-spots">
      <Title order={3} size="h4">Practise your weak spots</Title>
      {!weak.length ? (
        <Text size="sm" c="dimmed" mt={4}>Every objective in this exam was at 72% or above. Keep it up with a full scenario exam.</Text>
      ) : (
        <>
          <Text size="sm" c="dimmed" mt={4} mb="md">
            The objectives you scored lowest on in this exam. Each practice set is up to 8 questions with a note on every option.
          </Text>
          <Stack gap="sm">
            {weak.map((r) => (
              <Group key={r.key} justify="space-between" wrap="nowrap" className="weak-spot">
                <div>
                  <Text size="sm">{r.key}</Text>
                  <Text size="xs" c="dimmed">{r.correct} of {r.total} right · {r.pct}%</Text>
                </div>
                <ActionButton action="drill-objective" slow size="xs" onClick={() => drillObjective(r.key)}>Practise →</ActionButton>
              </Group>
            ))}
          </Stack>
        </>
      )}
    </Card>
  );
}

function Bar({ label, row, badge }) {
  return (
    <div>
      <Group justify="space-between" wrap="nowrap" gap="xs" mb={4}>
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>{badge}<Text size="sm" truncate="end">{label}</Text></Group>
        <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>{row.pct}% · {row.correct}/{row.total}</Text>
      </Group>
      <Progress value={row.pct} color={row.pct >= 72 ? "teal" : "red"} size="md" />
    </div>
  );
}

function PaceCard({ finished }) {
  if (!finished.timed) return null;
  const qs = finished.questions.map((s) => byId[s.id]).filter(Boolean);
  const pace = L.paceSummary(qs, finished.timeSpent);
  if (!pace) return null;
  return (
    <Card className="pace-card">
      <Title order={3} size="h4">Time</Title>
      <Text mt={4}>
        Average <b>{fmtTime(pace.avgMs)}</b> per question
        <Text span c="dimmed"> · the real exam allows about {fmtTime(L.EXAM_DURATION_MS / 60)}</Text>
      </Text>
      {pace.slowest.length ? (
        <>
          <Text size="sm" c="dimmed" mt="sm">Slowest objectives:</Text>
          <List size="sm" mt={4}>
            {pace.slowest.map((g) => (
              <List.Item key={g.key}>{g.key} <Text span c="dimmed" size="sm">· {fmtTime(g.avgMs)} avg over {g.n}</Text></List.Item>
            ))}
          </List>
        </>
      ) : null}
    </Card>
  );
}

export function Results() {
  const finished = S.lastFinished;
  const grade = finished.grade;
  const isExam = finished.mode === "exam" || finished.mode === "scenario";
  const isScenario = isScenarioMode(finished.mode);
  const finishedQs = finished.questions.map((s) => byId[s.id]).filter(Boolean);
  const gradedDomains = isScenario ? [] : Object.keys(grade.perDomain).filter((d) => !!DOMAIN_NAMES[d]).sort();
  const objective = finished.objective;
  const objCode = objective ? objective.split(" ")[0] : null;
  const objDomain = objCode ? Number(objCode.split(".")[0]) : 0;
  const objCount = objCode ? L.filterBySubKey(BANK, objDomain, objCode).length : 0;

  return (
    <Container size="md" py="xl" px={{ base: "md", sm: "lg" }}>
      <Stack gap="lg">
        <ScoreCard finished={finished} />
        {isExam ? <WeakSpots finished={finished} /> : null}

        {isScenario ? (
          <>
            <Card>
              <Title order={3} size="h4">By objective</Title>
              <Text size="sm" c="dimmed" mt={4} mb="md">Percent correct per exam-guide task statement, weakest first — like the real score report.</Text>
              <Stack gap="sm">
                {L.breakdownBy(finishedQs, finished.answers, (q) => q.subdomain).map((row) => (
                  <Bar key={row.key} label={row.key} row={row} />
                ))}
              </Stack>
            </Card>
            <Card>
              <Title order={3} size="h4" mb="md">By scenario</Title>
              <Stack gap="sm">
                {L.breakdownBy(finishedQs, finished.answers, (q) => q.scenario).map((row) => (
                  <Bar key={row.key} label={(scenarioById[row.key] || {}).name || row.key} row={row} />
                ))}
              </Stack>
            </Card>
          </>
        ) : null}

        <PaceCard finished={finished} />

        {gradedDomains.length ? (
          <Card>
            <Title order={3} size="h4" mb="md">By domain</Title>
            <Stack gap="sm">
              {gradedDomains.map((d) => {
                const pd = grade.perDomain[d];
                const pct = pd.total ? Math.round((pd.correct / pd.total) * 100) : 0;
                return <Bar key={d} label={DOMAIN_NAMES[d]} badge={<DomainBadge d={d} />} row={{ pct, correct: pd.correct, total: pd.total }} />;
              })}
            </Stack>
          </Card>
        ) : null}

        <Group gap="sm" className="actions">
          {isScenario ? (
            grade.wrongIds.length ? (
              <ActionButton action="practice-missed" slow onClick={() => startScenarioPractice(null, grade.wrongIds)}>
                Practise the {grade.wrongIds.length} you missed
              </ActionButton>
            ) : null
          ) : grade.wrongIds.length ? (
            <ActionButton action="retry-failed" slow onClick={() => startRetry(grade.wrongIds)}>
              Retry {plural(grade.wrongIds.length, "failed question")}
            </ActionButton>
          ) : (
            <Badge size="xl" color="teal" variant="light" leftSection={<IconConfetti size={16} />}>All correct — nothing to retry</Badge>
          )}
          {objCount ? (
            <ActionButton action="practice" slow variant="light" onClick={() => startPractice(objDomain, objCode)}>
              More on {objCode} · {plural(objCount, "question")}
            </ActionButton>
          ) : null}
          <ActionButton action="show-review" slow variant="default" onClick={showReview}>Review answers</ActionButton>
          <Button variant="subtle" data-action="home" onClick={goHome}>Home</Button>
        </Group>
      </Stack>
    </Container>
  );
}
