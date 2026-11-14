/* The standard question screen: mock, custom, retry, weak drill, practice and
 * imported exams. Practice shows the answer after each pick; the others
 * have a navigator, flags and a submit. */
import { useEffect } from "react";
import { Alert, Box, Button, Card, Container, Group, Progress, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import {
  S, sessionTitle, toggleFlag, toggleSavedQuestion, goNext, jumpTo, askSubmit, canStrike,
} from "../core/controller.js";
import { L, byId, Store, answeredCount } from "../core/env.js";
import { ActionButton, KbdHint, QuestionMeta, ReportLink } from "../components/common.jsx";
import {
  BottomBar, ExitButton, Feedback, FlagButton, Option, PrevButton, SaveButton, Tally, TopBar, WhereLine,
  useFocusNextWhenGraded, StrikeHint,
} from "../components/quiz.jsx";

function Navigator() {
  const s = S.session;
  useEffect(() => {
    const cur = document.querySelector(".nav-cell[data-current]");
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ inline: "center", block: "nearest" });
  }, [s.current]);
  return (
    <Box className="navigator" role="navigation" aria-label="Questions">
      {s.questions.map((sq, i) => {
        const answered = s.answers[sq.id] !== null && s.answers[sq.id] !== undefined;
        const flagged = !!s.flagged[sq.id];
        return (
          <UnstyledButton
            key={sq.id}
            className="nav-cell"
            data-action="jump"
            data-index={i}
            data-answered={answered || undefined}
            data-flagged={flagged || undefined}
            data-current={i === s.current || undefined}
            aria-current={i === s.current ? "step" : undefined}
            aria-label={"Question " + (i + 1) + ", " + (answered ? "answered" : "not answered") + (flagged ? ", flagged" : "")}
            onClick={() => jumpTo(i)}
          >
            {i + 1}
          </UnstyledButton>
        );
      })}
    </Box>
  );
}

export function QuestionScreen() {
  const s = S.session;
  const sq = s.questions[s.current];
  const q = byId[sq.id];
  const total = s.questions.length;
  const answered = s.answers[q.id];
  const correct = L.correctIndices(q);
  const multi = correct.length > 1;
  const chosen = L.chosenIndices(answered);
  const isPractice = s.mode === "practice";
  const showFeedback = isPractice && s.feedback === q.id;
  const answeredSoFar = answeredCount(s);
  const strikeOn = canStrike(s.mode);
  const struck = (s.strikes && s.strikes[q.id]) || [];
  const saved = Store.snapshot().saved.indexOf(q.id) !== -1;
  const right = showFeedback && L.sameChoice(answered, correct);
  const nextRef = useFocusNextWhenGraded(showFeedback);
  const allAnswered = answeredSoFar >= total;

  return (
    <Box className="q-screen quiz-screen">
      <TopBar right={
        <>
          {isPractice ? <Tally tally={s.tally} /> : <FlagButton on={!!s.flagged[q.id]} onClick={toggleFlag} />}
          <SaveButton on={saved} onClick={toggleSavedQuestion} />
          <ExitButton />
        </>
      }>
        <WhereLine title={sessionTitle()} long={"Question " + (s.current + 1) + " of " + total} short={(s.current + 1) + " / " + total} />
      </TopBar>
      <Progress value={(answeredSoFar / total) * 100} size={3} radius={0} aria-hidden="true" />

      <Container size="md" px={{ base: "sm", sm: "lg" }} py="md" className="q-main">
        <Stack gap="md">
          {!isPractice ? <Navigator /> : null}
          {!isPractice && allAnswered ? (
            <Alert color="teal" variant="light" role="status" className="all-answered">
              All {total} answered — finish to grade this {s.mode === "exam" ? "exam" : "round"}.
            </Alert>
          ) : null}
          <Card className="question-card" p={{ base: "md", sm: "xl" }}>
            <QuestionMeta q={q} />
            <Text className="q-text" size="lg" fw={500} mt="sm" style={{ whiteSpace: "pre-wrap" }}>{q.question}</Text>
            {multi ? <Text size="sm" c="var(--mantine-primary-color-filled)" fw={600} mt="xs">Select {correct.length} answers.</Text> : null}
            <Stack gap="xs" mt="lg" role={multi ? "group" : "radiogroup"} className="options">
              {sq.order.map((optIdx, pos) => (
                <Option
                  key={optIdx} q={q} optIdx={optIdx} position={pos} multi={multi}
                  picked={chosen.indexOf(optIdx) !== -1}
                  struck={strikeOn && struck.indexOf(optIdx) !== -1}
                  feedback={showFeedback}
                  correct={correct.indexOf(optIdx) !== -1}
                />
              ))}
            </Stack>
            {strikeOn ? <StrikeHint /> : null}
            {showFeedback ? (
              <>
                <Feedback right={right}>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>{q.explanation}</Text>
                  {q.optionNotes ? chosen.filter((i) => correct.indexOf(i) === -1 && q.optionNotes[i]).map((i) => (
                    <Text key={i} size="sm" mt="xs" className="opt-note">
                      Your pick ({String.fromCharCode(65 + sq.order.indexOf(i))}): {q.optionNotes[i]}
                    </Text>
                  )) : null}
                </Feedback>
                <Box mt="xs"><ReportLink q={q} /></Box>
              </>
            ) : null}
          </Card>
        </Stack>
      </Container>

      <BottomBar>
        {isPractice ? <span /> : <PrevButton />}
        <KbdHint optionCount={sq.order.length} canGoBack={!isPractice} canFlag={!isPractice} />
        <Group gap="xs" wrap="nowrap">
          {isPractice ? (
            showFeedback ? (
              s.current + 1 < total
                ? <Button ref={nextRef} data-action="next" onClick={goNext} rightSection={<IconArrowRight size={16} />}>Next</Button>
                : <ActionButton ref={nextRef} action="submit" slow onClick={askSubmit}>Finish</ActionButton>
            ) : <Text size="sm" c="dimmed">Pick an answer to see the explanation</Text>
          ) : (
            <>
              <ActionButton action="submit" slow variant={allAnswered ? "filled" : "light"} onClick={askSubmit}>
                <Text span visibleFrom="sm" inherit>{allAnswered ? "Finish & see results" : s.mode === "exam" ? "Submit exam" : "Submit answers"}</Text>
                <Text span hiddenFrom="sm" inherit>{allAnswered ? "Finish" : "Submit"}</Text>
              </ActionButton>
              <Button data-action="next" variant={allAnswered ? "default" : "filled"} onClick={goNext} disabled={s.current + 1 >= total}
                rightSection={<IconArrowRight size={16} />}>
                Next
              </Button>
            </>
          )}
        </Group>
      </BottomBar>
    </Box>
  );
}
