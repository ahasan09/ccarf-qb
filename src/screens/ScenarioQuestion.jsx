/* The real exam's layout: the scenario stays put on the left while its
 * questions change on the right. On a phone the scenario sits above the
 * question, open on a scenario's first question and folded after that. */
import { Box, Button, Card, Collapse, Grid, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowRight, IconChevronDown, IconMessage } from "@tabler/icons-react";
import {
  S, sessionTitle, toggleFlag, goNext, askSubmit, scenarioBlockOf, editComment, showScenarioReview, setBriefOpen,
} from "../core/controller.js";
import { L, byId, scenarioById, answeredCount } from "../core/env.js";
import { ActionButton, KbdHint, ReportLink } from "../components/common.jsx";
import {
  BottomBar, CommentButton, ExitButton, Feedback, FlagButton, Option, PrevButton, Tally, TopBar, WhereLine,
  useFocusNextWhenGraded, StrikeHint,
} from "../components/quiz.jsx";

export function ScenarioPanel({ scn, open, onToggle }) {
  return (
    <Card className="scn-panel" p="md">
      <UnstyledButton onClick={onToggle} aria-expanded={open} w="100%" data-action="toggle-brief">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={700} ff="heading">{scn.name}</Text>
          <IconChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        <Text size="sm" mt="sm" className="scn-text" style={{ whiteSpace: "pre-wrap" }}>{scn.text}</Text>
      </Collapse>
    </Card>
  );
}

export function ScenarioQuestion() {
  const s = S.session;
  const sq = s.questions[s.current];
  const q = byId[sq.id];
  const total = s.questions.length;
  const isPractice = s.mode === "scenario-practice";
  const block = scenarioBlockOf(s, s.current);
  const scn = scenarioById[q.scenario] || { name: "Scenario", text: "" };
  const chosen = L.chosenIndices(s.answers[q.id]);
  const correct = L.correctIndices(q);
  const multi = correct.length > 1;
  const struck = s.strikes[q.id] || [];
  const showFeedback = isPractice && s.feedback === q.id;
  const comment = s.comments[q.id];
  const right = showFeedback && L.sameChoice(s.answers[q.id], correct);
  const nextRef = useFocusNextWhenGraded(showFeedback);
  const flaggedCount = Object.keys(s.flagged).filter((k) => s.flagged[k]).length;
  const answered = answeredCount(s);

  const where = isPractice
    ? "Question " + (s.current + 1) + " of " + total
    : "Scenario " + (block + 1) + " of " + s.scenarioIds.length + " · Question " + (s.current + 1) + " of " + total;
  const shortWhere = (isPractice ? "" : "S" + (block + 1) + " · ") + (s.current + 1) + " / " + total;

  return (
    <Box className="q-screen scn-screen">
      <TopBar right={
        <>
          {isPractice ? <Tally tally={s.tally} /> : <CommentButton has={!!comment} onClick={editComment} />}
          <FlagButton on={!!s.flagged[q.id]} onClick={toggleFlag} />
          <ExitButton />
        </>
      }>
        <WhereLine title={sessionTitle()} long={where} short={shortWhere} />
      </TopBar>

      <Box px={{ base: "sm", sm: "lg" }} py="md" maw={1200} mx="auto" className="q-main">
        <Grid gutter="lg">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box className="scn-aside">
              <ScenarioPanel scn={scn} open={S.briefOpen} onToggle={() => setBriefOpen(!S.briefOpen)} />
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card className="scn-question" p={{ base: "md", sm: "xl" }}>
              {q.subdomain ? <Text size="xs" c="dimmed">§ {q.subdomain}</Text> : null}
              <Text className="q-text" size="lg" fw={500} mt={4} style={{ whiteSpace: "pre-wrap" }}>{q.question}</Text>
              {multi ? <Text size="sm" c="var(--mantine-primary-color-filled)" fw={600} mt="xs">Select {correct.length} answers.</Text> : null}
              <Stack gap="xs" mt="lg" role={multi ? "group" : "radiogroup"} className="options">
                {sq.order.map((optIdx, pos) => (
                  <Option
                    key={optIdx} q={q} optIdx={optIdx} position={pos} multi={multi}
                    picked={chosen.indexOf(optIdx) !== -1}
                    struck={struck.indexOf(optIdx) !== -1}
                    feedback={showFeedback}
                    correct={correct.indexOf(optIdx) !== -1}
                    note={showFeedback && q.optionNotes ? q.optionNotes[optIdx] : null}
                  />
                ))}
              </Stack>
              {showFeedback ? (
                <>
                  <Feedback right={right}><Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{q.explanation}</Text></Feedback>
                  <Box mt="xs"><ReportLink q={q} /></Box>
                </>
              ) : null}
              {comment ? (
                <Group gap={6} mt="md" className="scn-comment" wrap="nowrap" align="flex-start">
                  <IconMessage size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text size="sm" c="dimmed">{comment}</Text>
                </Group>
              ) : null}
              <StrikeHint />
            </Card>
          </Grid.Col>
        </Grid>
      </Box>

      <BottomBar>
        {isPractice ? <span /> : <PrevButton />}
        {isPractice ? (
          showFeedback ? null : (
            <Group gap="md" wrap="nowrap">
              <Text size="sm" c="dimmed">Pick an answer to see the notes</Text>
              <KbdHint optionCount={sq.order.length} canGoBack={false} canFlag />
            </Group>
          )
        ) : (
          <Group gap="md" wrap="nowrap">
            <Text size="sm" c="dimmed">
              <Text span inherit visibleFrom="sm">Answered {answered} of {total} · Flagged {flaggedCount}</Text>
              <Text span inherit hiddenFrom="sm">{answered}/{total}{flaggedCount ? " · ⚑" + flaggedCount : ""}</Text>
            </Text>
            <KbdHint optionCount={sq.order.length} canGoBack canFlag />
          </Group>
        )}
        {isPractice ? (
          showFeedback ? (
            s.current + 1 < total
              ? <Button ref={nextRef} data-action="next" onClick={goNext} rightSection={<IconArrowRight size={16} />}>Next</Button>
              : <ActionButton ref={nextRef} action="submit" slow onClick={askSubmit}>Finish</ActionButton>
          ) : <span />
        ) : (
          <Group gap="xs" wrap="nowrap">
            <ActionButton action="review-all" slow variant="default" onClick={showScenarioReview}>
              <Text span inherit visibleFrom="sm">Review all</Text>
              <Text span inherit hiddenFrom="sm">Review</Text>
            </ActionButton>
            <Button data-action="next" onClick={goNext} rightSection={<IconArrowRight size={16} />}>
              {s.current + 1 >= total ? (
                <>
                  <Text span inherit visibleFrom="sm">Review &amp; submit</Text>
                  <Text span inherit hiddenFrom="sm">Submit</Text>
                </>
              ) : "Next"}
            </Button>
          </Group>
        )}
      </BottomBar>
    </Box>
  );
}
