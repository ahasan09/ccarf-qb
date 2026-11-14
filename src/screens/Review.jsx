/* Every question of a finished session (or a stored attempt) with the right
 * answer, the one given, and the explanation. Scenario reviews group the
 * cards under their scenario and show each option's note. */
import { Fragment } from "react";
import {
  Badge, Box, Button, Card, Chip, Container, Grid, Group, Paper, Select, Stack, Text, Title,
} from "@mantine/core";
import { IconArrowLeft, IconMessage } from "@tabler/icons-react";
import {
  S, isScenarioMode, setReviewWrongOnly, setReviewDomain, backToResults, goHome,
} from "../core/controller.js";
import { L, byId, scenarioById, DOMAIN_NAMES } from "../core/env.js";
import { QuestionMeta, ReportLink } from "../components/common.jsx";
import { Option } from "../components/quiz.jsx";
import { ScenarioPanel } from "./ScenarioQuestion.jsx";

function ReviewCard({ s, i, finished, scenario }) {
  const q = byId[s.id];
  const given = finished.answers[q.id];
  const correct = L.correctIndices(q);
  const right = L.sameChoice(given, correct);
  const picked = L.chosenIndices(given);
  const comment = finished.comments && finished.comments[q.id];
  return (
    <Card className="review-card" data-right={right || undefined} p={{ base: "md", sm: "lg" }}
      style={{ borderLeft: "4px solid var(--mantine-color-" + (right ? "teal" : "red") + "-6)" }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" mb="xs">
        <Group gap={8} wrap="wrap" style={{ minWidth: 0 }}>
          <Text fw={800} ff="heading">Q{i + 1}</Text>
          {scenario ? <Text size="xs" c="dimmed">{q.subdomain || ""}</Text> : <QuestionMeta q={q} />}
        </Group>
        <Badge color={right ? "teal" : "red"} variant="light">
          {right ? "Correct" : !picked.length ? "Unanswered" : "Wrong"}
        </Badge>
      </Group>
      <Text className="q-text" fw={500} style={{ whiteSpace: "pre-wrap" }}>{q.question}</Text>
      <Stack gap="xs" mt="md">
        {s.order.map((optIdx, pos) => (
          <Option
            key={optIdx} q={q} optIdx={optIdx} position={pos} readOnly
            picked={picked.indexOf(optIdx) !== -1}
            correct={correct.indexOf(optIdx) !== -1}
            note={q.optionNotes ? q.optionNotes[optIdx] : null}
          />
        ))}
      </Stack>
      <Paper mt="md" p="sm" radius="md" bg="var(--mantine-color-default-hover)">
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{q.explanation}</Text>
      </Paper>
      {comment ? (
        <Group gap={6} mt="sm" wrap="nowrap" align="flex-start">
          <IconMessage size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <Text size="sm"><b>Your comment:</b> {comment}</Text>
        </Group>
      ) : null}
      <Box mt="xs"><ReportLink q={q} /></Box>
    </Card>
  );
}

function Header({ finished, withDomain }) {
  return (
    <Paper className="q-top" radius={0} px={{ base: "sm", sm: "lg" }} py="xs">
      <Group justify="space-between" wrap="wrap" gap="xs" maw={1200} mx="auto">
        <div>
          <Text span fw={700}>Review</Text>
          {finished.fromHistory ? (
            <Text span c="dimmed" size="sm"> · {finished.examName || (withDomain ? "Mock exam" : "Scenario exam")}, {new Date(finished.date).toLocaleString()}</Text>
          ) : null}
        </div>
        <Group gap="xs" wrap="nowrap">
          {withDomain ? (
            <Select
              id="review-domain"
              aria-label="Domain"
              size="xs"
              w={190}
              value={String(S.reviewDomain)}
              onChange={(v) => setReviewDomain(Number(v || 0))}
              allowDeselect={false}
              data={[{ value: "0", label: "All domains" }].concat([1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: "D" + d + " — " + DOMAIN_NAMES[d] })))}
              comboboxProps={{ width: 300, position: "bottom-end" }}
            />
          ) : null}
          <Chip checked={S.reviewWrongOnly} onChange={setReviewWrongOnly} data-action="toggle-wrong-only" size="sm" color="red" variant="light">
            Wrong only
          </Chip>
          {finished.fromHistory ? (
            <Button size="xs" variant="subtle" data-action="home" onClick={goHome} leftSection={<IconArrowLeft size={14} />}>Home</Button>
          ) : (
            <Button size="xs" variant="subtle" data-action="back-results" onClick={backToResults} leftSection={<IconArrowLeft size={14} />}>Results</Button>
          )}
        </Group>
      </Group>
    </Paper>
  );
}

function Nothing() {
  return <Card><Text c="dimmed">Nothing matches this filter.</Text></Card>;
}

function ScenarioReviewAfter({ finished }) {
  const groups = [];
  finished.questions.forEach((s, i) => {
    const q = byId[s.id];
    let last = groups[groups.length - 1];
    if (!last || last.scenario !== q.scenario) groups.push(last = { scenario: q.scenario, items: [] });
    if (S.reviewWrongOnly && L.sameChoice(finished.answers[q.id], L.correctIndices(q))) return;
    last.items.push({ s, i });
  });
  const shown = groups.some((g) => g.items.length);
  return (
    <Box>
      <Header finished={finished} />
      <Box px={{ base: "sm", sm: "lg" }} py="md" maw={1200} mx="auto">
        <Stack gap="xl">
          {groups.filter((g) => g.items.length).map((g, gi) => {
            const scn = scenarioById[g.scenario] || { name: g.scenario, text: "" };
            return (
              <Grid key={gi} gutter="lg">
                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Box className="scn-aside"><ScenarioStatic scn={scn} /></Box>
                </Grid.Col>
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Stack gap="md">
                    {g.items.map(({ s, i }) => <ReviewCard key={s.id} s={s} i={i} finished={finished} scenario />)}
                  </Stack>
                </Grid.Col>
              </Grid>
            );
          })}
          {!shown ? <Nothing /> : null}
        </Stack>
      </Box>
    </Box>
  );
}

function ScenarioStatic({ scn }) {
  return <ScenarioPanel scn={scn} open onToggle={() => {}} />;
}

export function Review() {
  const finished = S.lastFinished;
  if (isScenarioMode(finished.mode)) return <ScenarioReviewAfter finished={finished} />;
  const items = finished.questions.map((s, i) => ({ s, i })).filter(({ s }) => {
    const q = byId[s.id];
    if (S.reviewWrongOnly && L.sameChoice(finished.answers[q.id], L.correctIndices(q))) return false;
    if (S.reviewDomain && q.domain !== S.reviewDomain) return false;
    return true;
  });
  return (
    <Box>
      <Header finished={finished} withDomain />
      <Container size="md" py="md" px={{ base: "sm", sm: "lg" }}>
        <Title order={1} className="sr-only">Review answers</Title>
        <Stack gap="md">
          {items.map(({ s, i }) => <Fragment key={s.id}><ReviewCard s={s} i={i} finished={finished} /></Fragment>)}
          {!items.length ? <Nothing /> : null}
        </Stack>
      </Container>
    </Box>
  );
}
