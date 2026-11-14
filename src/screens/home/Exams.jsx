/* Exams: every exam in one place, then imported tests and score history. */
import {
  Anchor, Badge, Button, Card, Group, Paper, Stack, Table, Text, Title, UnstyledButton,
} from "@mantine/core";
import { IconArrowRight, IconExternalLink } from "@tabler/icons-react";
import {
  S, startScenarioExam, startExam, startImportedPractice, startImportedExam, reviewAttempt,
  clearHistory, scenarioExamReady, diagnosticReady, runSlow,
} from "../../core/controller.js";
import {
  EXAMS, RESOURCES, Store, isUsableSession, bestAttemptFor, PASS_SCORE, plural,
} from "../../core/env.js";
import { ActionButton } from "../../components/common.jsx";
import { isFirstVisit, ScenarioExamNote } from "./Today.jsx";

function ExamRow({ action, title, detail, disabled, primary, onClick }) {
  return (
    <UnstyledButton
      className="h-exam" data-action={action} disabled={disabled} data-primary={primary || undefined}
      onClick={() => !S.busy && !disabled && runSlow(action, onClick)}
      aria-busy={S.busy === action || undefined}
    >
      <Paper withBorder p="md" radius="md" className="h-exam-card" data-primary={primary || undefined} data-disabled={disabled || undefined}>
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text fw={700}>{title}</Text>
            <Text size="sm" c="dimmed">{detail}</Text>
          </div>
          <Group gap={4} wrap="nowrap" c={primary ? "var(--mantine-primary-color-filled)" : "dimmed"}>
            <Text size="sm" fw={600}>Start</Text><IconArrowRight size={16} />
          </Group>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

function PassBadge({ pass, size = "sm" }) {
  return <Badge color={pass ? "teal" : "red"} variant="light" size={size}>{pass ? "PASS" : "FAIL"}</Badge>;
}

function History({ history }) {
  let best = 0;
  history.forEach((h) => { if (h.score > best) best = h.score; });
  const rows = history.slice().reverse();
  return (
    <Card id="h-history">
      <Title order={3} size="h4">Score history</Title>
      <Text size="sm" c="dimmed" mt={4} mb="md">
        {history.length ? plural(history.length, "attempt") + " · best " + best : "No exams yet."}
      </Text>
      {!history.length ? (
        <Text size="sm" c="dimmed">No exams taken yet. Your attempts will appear here.</Text>
      ) : (
        <>
          <Table.ScrollContainer minWidth={720} visibleFrom="sm">
            <Table striped highlightOnHover verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  {["Date", "Score", "Result", "Correct", "D1", "D2", "D3", "D4", "D5", ""].map((h) => <Table.Th key={h}>{h}</Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((h) => (
                  <Table.Tr key={h.date}>
                    <Table.Td>
                      <Text size="sm">{new Date(h.date).toLocaleString()}</Text>
                      {h.examName ? <Text size="xs" c="dimmed">{h.examName}</Text> : null}
                    </Table.Td>
                    <Table.Td fw={700}>{h.score}</Table.Td>
                    <Table.Td><PassBadge pass={h.pass} /></Table.Td>
                    <Table.Td>{h.correct}/{h.total}</Table.Td>
                    {[1, 2, 3, 4, 5].map((d) => {
                      const pd = h.perDomain && h.perDomain[d];
                      return <Table.Td key={d}>{pd ? pd.correct + "/" + pd.total : "–"}</Table.Td>;
                    })}
                    <Table.Td>
                      {Array.isArray(h.items) ? (
                        <ActionButton action="review-attempt" slow size="compact-sm" variant="subtle" onClick={() => reviewAttempt(h.date)}>
                          Review
                        </ActionButton>
                      ) : null}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          {/* Phones: one card per attempt instead of the 10-column table. */}
          <Stack gap="xs" hiddenFrom="sm" component="ol" className="history-cards">
            {rows.map((h) => {
              const doms = [1, 2, 3, 4, 5].map((d) => {
                const pd = h.perDomain && h.perDomain[d];
                return pd ? "D" + d + " " + pd.correct + "/" + pd.total : null;
              }).filter(Boolean);
              return (
                <Paper key={h.date} component="li" withBorder p="sm" radius="md">
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <div>
                      <Text fw={700} size="sm">{h.examName || "Mock exam"}</Text>
                      <Text size="xs" c="dimmed">
                        {new Date(h.date).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </div>
                    <Group gap={6}><Text fw={800}>{h.score}</Text><PassBadge pass={h.pass} /></Group>
                  </Group>
                  <Text size="xs" c="dimmed" mt={4}>{h.correct}/{h.total} correct{doms.length ? " · " + doms.join(" · ") : ""}</Text>
                  {Array.isArray(h.items) ? (
                    <ActionButton action="review-attempt" slow size="compact-sm" variant="subtle" mt={4} onClick={() => reviewAttempt(h.date)}>
                      Review
                    </ActionButton>
                  ) : null}
                </Paper>
              );
            })}
          </Stack>
          <Button size="xs" variant="subtle" color="red" mt="md" data-action="clear-history" onClick={clearHistory}>Clear history</Button>
        </>
      )}
    </Card>
  );
}

export function ExamsTab() {
  const p = Store.snapshot();
  const saved = isUsableSession(p.session) ? p.session : null;
  const firstVisit = isFirstVisit(p, saved);
  const taken = EXAMS.filter((e) => bestAttemptFor(e.id, p.history)).length;
  return (
    <Stack gap="lg">
      <Card id="h-exams">
        <Title order={3} size="h4">Exams</Title>
        <Text size="sm" c="dimmed" mt={4} mb="md">
          Timed and scored out of 1000, pass at {PASS_SCORE}. Leave at any time and resume from Today.
        </Text>
        <Stack gap="sm">
          <ExamRow action="start-scenario-exam" title="Scenario exam" detail="The real exam's format · 4 scenarios × 15 · 120 min"
            disabled={!scenarioExamReady()} primary={!firstVisit} onClick={() => startScenarioExam()} />
          <ExamRow action="start-diagnostic" title="Diagnostic" detail="A short start · 2 scenarios × 10 · 40 min"
            disabled={!diagnosticReady()} primary={firstVisit} onClick={() => startScenarioExam(true)} />
          <ExamRow action="start-exam" title="Mock exam" detail="60 question-bank questions by domain weight · 120 min" onClick={startExam} />
        </Stack>
        <ScenarioExamNote />
      </Card>

      {EXAMS.length ? (
        <Card id="h-imported">
          <Title order={3} size="h4">Imported practice tests</Title>
          <Text size="sm" c="dimmed" mt={4} mb="md">
            {EXAMS.length} tests · {taken} taken. Full exams from your own files, scored separately; they do not feed the
            question bank or the missed questions.
          </Text>
          <Stack gap="xs">
            {EXAMS.map((e) => {
              const attempt = bestAttemptFor(e.id, p.history);
              const source = RESOURCES.find((r) => r.exam === e.id);
              return (
                <Paper key={e.id} withBorder p="sm" radius="md" className="exam-row">
                  <Group justify="space-between" wrap="wrap" gap="xs">
                    <div style={{ minWidth: 0 }}>
                      <Group gap={6}>
                        <Text fw={600} size="sm">{e.name}</Text>
                        {source ? (
                          <Anchor href={source.url} target="_blank" rel="noopener noreferrer" size="xs" title={source.title}>
                            source <IconExternalLink size={11} />
                          </Anchor>
                        ) : null}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {(e.count || (e.questions ? e.questions.length : 0))} questions
                        {attempt ? " · best " + attempt.score + (attempt.pass ? " · passed" : "") : ""}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <ActionButton action="practice-imported" slow size="xs" variant="default" onClick={() => startImportedPractice(e.id)}>
                        Practice
                      </ActionButton>
                      <ActionButton action="start-imported" slow size="xs" onClick={() => startImportedExam(e.id)}>
                        {attempt ? "Retake mock" : "Take mock"}
                      </ActionButton>
                    </Group>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        </Card>
      ) : null}

      <History history={p.history} />
    </Stack>
  );
}
