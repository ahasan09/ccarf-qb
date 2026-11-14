/* Practice: accuracy by domain and objective (each one click from a
 * practice set), the review / saved / missed lists, custom quiz and the
 * scenarios. */
import { Badge, Box, Card, Collapse, Group, NavLink, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import {
  IconChevronDown, IconChevronRight, IconCircleX, IconListCheck, IconRefresh, IconStar,
} from "@tabler/icons-react";
import {
  S, toggleMastery, startPractice, drillObjective, startReview, startSaved, startWeak,
  openCustomBuilder, startScenarioPractice, dueCount, runSlow,
} from "../../core/controller.js";
import {
  L, BANK, Store, isListed, DOMAIN_NAMES, SUBDOMAINS, SCENARIOS, SCENARIO_BANK,
} from "../../core/env.js";
import { ActionButton, DomainBadge, Meter } from "../../components/common.jsx";
import { lookup } from "./Today.jsx";

/* The line under each name: each source with its size, first-try accuracy
 * once there are enough first answers. */
function scoreLine(ex, pr, first) {
  const pc = (r) => Math.round((100 * r.correct) / r.total);
  const score = L.objectiveScore(ex, pr);
  const bits = [];
  if (ex && ex.total) bits.push("Exams " + pc(ex) + "% of " + ex.total);
  if (pr && pr.total) bits.push("Practice " + pc(pr) + "% of " + pr.total);
  if (first && first.total >= L.MIN_ANSWERS) bits.push("first try " + pc(first) + "%");
  if (score.few) bits.push("too few to tell");
  return { pct: score.pct, few: score.few, source: score.source, line: bits.length ? bits.join(" · ") : "No answers yet" };
}

/* On phones the bar is dropped for room, so the number carries the colour. */
function Pct({ s }) {
  const none = s.pct === null || s.few;
  const color = none ? undefined : s.pct >= 72 ? "teal" : s.pct >= 50 ? "yellow.8" : "red";
  return <Text size="sm" fw={700} w={44} ta="right" c={color}>{none ? "—" : s.pct + "%"}</Text>;
}

function Objectives({ p, acc }) {
  const mastery = L.masteryByDomain(BANK, p.correctEver, p.attempted, p.weak);
  const prac = L.practiceAccuracy(BANK, p.correctEver, p.attempted, p.weak);
  const first = L.firstTryAccuracy(BANK, p.results);
  let seenAll = 0, rightAll = 0, totalAll = 0;
  for (let d = 1; d <= 5; d++) {
    const row = mastery[d] || { correct: 0, attempted: 0, total: 0 };
    seenAll += row.attempted; rightAll += row.correct; totalAll += row.total;
  }
  const sum = (map, d) => {
    const r = { correct: 0, total: 0 };
    SUBDOMAINS.forEach((sub) => { if (sub.indexOf(d + ".") === 0 && map[sub]) { r.correct += map[sub].correct; r.total += map[sub].total; } });
    return r;
  };
  return (
    <Card id="h-objectives">
      <Title order={3} size="h4">By objective</Title>
      <Text size="sm" c="dimmed" mt={4}>
        Accuracy from exams once you have {L.MIN_ANSWERS} exam answers, from practice until then. Green is on track (72%+, the
        pass level), amber is close, red is weak, grey is too few answers to tell.
      </Text>
      <Text size="sm" mt="sm" fw={500}>
        Question bank: {seenAll} of {totalAll} answered
        {seenAll ? " · " + Math.round((rightAll / seenAll) * 100) + "% right on your last try" : ""}
      </Text>
      <Stack gap={4} mt="md">
        {[1, 2, 3, 4, 5].map((d) => {
          const s = scoreLine(sum(acc, d), sum(prac, d), sum(first, d));
          const m = mastery[d] || { total: 0 };
          const open = S.expandedMastery === d;
          return (
            <div key={d} className="h-dom">
              <UnstyledButton
                className="h-dom-head" data-action="toggle-mastery" data-domain={d} aria-expanded={open}
                onClick={() => toggleMastery(d)} w="100%" p="xs"
              >
                <Group wrap="nowrap" gap="sm">
                  <DomainBadge d={d} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600}>{DOMAIN_NAMES[d]}</Text>
                    <Text size="xs" c="dimmed">{s.line}</Text>
                  </div>
                  <Box visibleFrom="sm"><Meter pct={s.pct} source={s.source} few={s.few} w={70} /></Box>
                  <Pct s={s} />
                  <IconChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                </Group>
              </UnstyledButton>
              <Collapse in={open}>
                <Stack gap={6} pl={{ base: 0, sm: "xl" }} py="xs">
                  <NavLink
                    component="button" data-action="practice" data-domain={d}
                    label={"Practice all of D" + d} description={m.total + " questions"}
                    rightSection={<IconChevronRight size={16} />}
                    onClick={() => runSlow("practice", () => startPractice(d, null))}
                    variant="light" active
                  />
                  {SUBDOMAINS.filter((sub) => sub.indexOf(d + ".") === 0).map((sub) => {
                    const o = scoreLine(acc[sub], prac[sub], first[sub]);
                    return (
                      <Group key={sub} wrap="nowrap" gap="sm" className="h-obj">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm">{sub}</Text>
                          <Text size="xs" c="dimmed">{o.line}</Text>
                        </div>
                        <Box visibleFrom="sm"><Meter pct={o.pct} source={o.source} few={o.few} w={60} /></Box>
                        <Pct s={o} />
                        <ActionButton action="drill-objective" slow size="compact-sm" variant="light" onClick={() => drillObjective(sub)}>
                          Practise
                        </ActionButton>
                      </Group>
                    );
                  })}
                </Stack>
              </Collapse>
            </div>
          );
        })}
      </Stack>
    </Card>
  );
}

function Row({ action, icon, label, right, onClick, disabled, highlight }) {
  return (
    <NavLink
      component="button"
      data-action={action}
      label={label}
      leftSection={icon}
      rightSection={<Group gap={6} wrap="nowrap"><Text size="sm" c="dimmed">{right}</Text><IconChevronRight size={16} /></Group>}
      onClick={() => !S.busy && runSlow(action, onClick)}
      disabled={disabled}
      active={highlight}
      variant="light"
      className="h-row"
    />
  );
}

function PracticeLists({ p, now }) {
  const due = dueCount(p, now);
  const savedIds = p.saved.filter(isListed);
  const weakIds = p.weak.filter(isListed);
  const best = L.bestScenarioScores(p.history, lookup);
  return (
    <Card id="h-practice">
      <Title order={3} size="h4">Practice</Title>
      <Text size="sm" c="dimmed" mt={4} mb="sm">Learn mode: untimed, with the answer and explanation after each question.</Text>
      <Stack gap={2}>
        {due ? <Row action="start-review" icon={<IconRefresh size={18} />} label="Due for review" right={due + " today"} onClick={startReview} highlight /> : null}
        {savedIds.length ? <Row action="start-saved" icon={<IconStar size={18} />} label="Saved questions" right={savedIds.length} onClick={startSaved} /> : null}
        {weakIds.length ? <Row action="start-weak" icon={<IconCircleX size={18} />} label="Missed questions" right={weakIds.length} onClick={startWeak} /> : null}
        {!due && !savedIds.length && !weakIds.length ? (
          <Text size="sm" c="dimmed" fs="italic" py="xs">Questions you save, miss, or that come back for review will be listed here.</Text>
        ) : null}
        <Row action="custom-builder" icon={<IconListCheck size={18} />} label="Custom quiz" right="build" onClick={openCustomBuilder} />
      </Stack>
      <Title order={3} size="h4" mt="xl" mb="sm">By scenario</Title>
      <Stack gap={2}>
        {SCENARIOS.map((sc) => {
          const n = SCENARIO_BANK.filter((q) => q.scenario === sc.id).length;
          return (
            <NavLink
              key={sc.id}
              component="button"
              data-action="practice-scenario"
              data-scenario={sc.id}
              disabled={!n}
              label={sc.name}
              rightSection={
                <Group gap={6} wrap="nowrap">
                  {best[sc.id] !== undefined
                    ? <Badge variant="light" color={best[sc.id] >= 72 ? "teal" : "gray"}>best {best[sc.id]}%</Badge>
                    : <Text size="sm" c="dimmed">{n} questions</Text>}
                  <IconChevronRight size={16} />
                </Group>
              }
              onClick={() => !S.busy && runSlow("practice-scenario", () => startScenarioPractice(sc.id))}
            />
          );
        })}
      </Stack>
    </Card>
  );
}

export function PracticeTab() {
  const p = Store.snapshot();
  const acc = L.objectiveAccuracy(p.history, lookup);
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" className="h-cols">
      <Objectives p={p} acc={acc} />
      <PracticeLists p={p} now={Date.now()} />
    </SimpleGrid>
  );
}
