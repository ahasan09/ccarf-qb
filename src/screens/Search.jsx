/* Search the question bank and the scenario questions by keyword; practise
 * the matches. Results follow as the user types. */
import { useEffect, useRef } from "react";
import { Box, Button, Card, Container, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { S, setSearchQuery, searchHits, startSearchPractice, goHome, SEARCH_SHOWN } from "../core/controller.js";
import { ActionButton, QuestionMeta } from "../components/common.jsx";

function Group_({ title, list, pool }) {
  if (!list.length) return null;
  return (
    <Card>
      <Group justify="space-between" mb="md" wrap="wrap">
        <Title order={2} size="h4">{title} <Text span c="dimmed" fw={400}>({list.length})</Text></Title>
        <ActionButton action="practice-search" data-pool={pool} slow size="xs" onClick={() => startSearchPractice(pool)}>
          Practice {list.length === 1 ? "this one" : "these " + list.length}
        </ActionButton>
      </Group>
      <Stack gap="md" component="ol" className="search-list" p={0} m={0} style={{ listStyle: "none" }}>
        {list.slice(0, SEARCH_SHOWN).map((q) => {
          let text = String(q.question);
          if (text.length > 220) text = text.slice(0, 220) + "…";
          return (
            <Box component="li" key={q.id} pb="sm" style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}>
              <QuestionMeta q={q} />
              <Text size="sm" mt={4}>{text}</Text>
            </Box>
          );
        })}
      </Stack>
      {list.length > SEARCH_SHOWN ? (
        <Text size="sm" c="dimmed" mt="sm">… and {list.length - SEARCH_SHOWN} more. Add a word to narrow it down.</Text>
      ) : null}
    </Card>
  );
}

export function Search() {
  const input = useRef(null);
  useEffect(() => {
    const el = input.current;
    if (el) { el.focus(); el.setSelectionRange(S.searchQuery.length, S.searchQuery.length); }
  }, []);
  const query = S.searchQuery;
  const active = query.replace(/\s/g, "").length >= 2;
  const hits = active ? searchHits() : { bank: [], scenario: [] };
  return (
    <Container size="md" py="lg" px={{ base: "md", sm: "lg" }}>
      <Group justify="space-between" mb="md">
        <Title order={1} size="h3">Search questions</Title>
        <Button variant="subtle" data-action="home" onClick={goHome} leftSection={<IconArrowLeft size={16} />}>Home</Button>
      </Group>
      <Card mb="lg">
        <TextInput
          ref={input}
          id="search-q"
          type="search"
          autoComplete="off"
          size="md"
          leftSection={<IconSearch size={18} />}
          label={<>Find questions by keyword — e.g. <i>tool_choice</i>, <i>hooks</i>, <i>CLAUDE.md</i></>}
          value={query}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed" mt="xs">
          Searches the question bank and the scenario questions (text, options, explanations and objectives). Imported exams are not included.
        </Text>
      </Card>
      <Stack gap="lg" id="search-results" aria-live="polite">
        {active && !hits.bank.length && !hits.scenario.length ? (
          <Card><Text c="dimmed">No questions match “{query}”.</Text></Card>
        ) : null}
        <Group_ title="Question bank" list={hits.bank} pool="bank" />
        <Group_ title="Scenario questions" list={hits.scenario} pool="scenario" />
      </Stack>
    </Container>
  );
}
