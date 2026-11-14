/* Before submitting a scenario exam: every question as a tile, grouped by
 * scenario, so flagged and unanswered ones are easy to revisit. The clock
 * keeps going. */
import { Box, Button, Card, Container, Group, SegmentedControl, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { S, jumpTo, askSubmit, setReviewFilter } from "../core/controller.js";
import { byId, scenarioById } from "../core/env.js";
import { ActionButton } from "../components/common.jsx";
import { BottomBar, ExitButton, TopBar } from "../components/quiz.jsx";

export function ScenarioReview() {
  const s = S.session;
  const total = s.questions.length;
  const isAnswered = (id) => s.answers[id] !== null && s.answers[id] !== undefined;
  const unanswered = s.questions.filter((q) => !isAnswered(q.id)).length;
  const flagged = s.questions.filter((q) => s.flagged[q.id]).length;
  return (
    <Box className="q-screen scn-screen">
      <TopBar right={<ExitButton />}>
        <Text span fw={700}>Review your answers</Text>
        <Text span c="dimmed" size="sm"> · {total - unanswered} of {total} answered</Text>
      </TopBar>
      <Container size="md" py="md" px={{ base: "sm", sm: "lg" }} className="q-main">
        <SegmentedControl
          fullWidth
          value={S.reviewFilter}
          onChange={setReviewFilter}
          data={[
            { value: "all", label: "All (" + total + ")" },
            { value: "flagged", label: "⚑ Flagged (" + flagged + ")" },
            { value: "unanswered", label: "Unanswered (" + unanswered + ")" },
          ]}
          className="review-filters"
          mb="lg"
        />
        <Stack gap="md">
          {s.scenarioIds.map((sid, b) => {
            const tiles = s.questions.map((q, i) => ({ q, i })).filter(({ q }) => {
              if ((byId[q.id] || {}).scenario !== sid) return false;
              if (S.reviewFilter === "flagged" && !s.flagged[q.id]) return false;
              if (S.reviewFilter === "unanswered" && isAnswered(q.id)) return false;
              return true;
            });
            return (
              <Card key={sid} p="md">
                <Title order={3} size="h5" mb="sm" className="review-scn">
                  Scenario {b + 1}: {(scenarioById[sid] || {}).name || sid}
                </Title>
                {tiles.length ? (
                  <SimpleGrid cols={{ base: 5, xs: 8, sm: 10 }} spacing={6} className="tiles">
                    {tiles.map(({ q, i }) => {
                      const ans = isAnswered(q.id);
                      const fl = !!s.flagged[q.id];
                      const cm = !!(s.comments && s.comments[q.id]);
                      return (
                        <UnstyledButton
                          key={q.id}
                          className="tile"
                          data-action="jump"
                          data-index={i}
                          data-answered={ans || undefined}
                          data-flagged={fl || undefined}
                          aria-label={"Question " + (i + 1) + (ans ? ", answered" : ", not answered") + (fl ? ", flagged" : "")}
                          onClick={() => jumpTo(i)}
                        >
                          {i + 1}{fl ? " ⚑" : ""}{cm ? " 💬" : ""}
                        </UnstyledButton>
                      );
                    })}
                  </SimpleGrid>
                ) : <Text size="sm" c="dimmed">Nothing here.</Text>}
              </Card>
            );
          })}
        </Stack>
      </Container>
      <BottomBar>
        <Button variant="default" data-action="jump" data-index={s.current} onClick={() => jumpTo(s.current)}
          leftSection={<IconArrowLeft size={16} />}>
          Back to question {s.current + 1}
        </Button>
        <Group><ActionButton action="submit" slow onClick={askSubmit}>Submit exam</ActionButton></Group>
      </BottomBar>
    </Box>
  );
}
