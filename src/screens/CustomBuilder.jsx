/* Custom quiz: pick domains (optionally narrowed to subdomains), a length,
 * and timed or untimed. */
import {
  Button, Card, Checkbox, Collapse, Container, Group, Paper, SegmentedControl, Stack, Switch, Text, Title,
} from "@mantine/core";
import { IconArrowLeft, IconChevronDown } from "@tabler/icons-react";
import { S, setCustom, customPoolSize, startCustom, goHome } from "../core/controller.js";
import { L, BANK, Store, DOMAIN_NAMES, plural } from "../core/env.js";
import { ActionButton, DomainBadge } from "../components/common.jsx";

export function CustomBuilder() {
  const c = S.customState;
  const p = Store.snapshot();
  const pool = customPoolSize();
  const n = c.count === "all" ? pool : Math.min(Number(c.count), pool);
  return (
    <Container size="md" py="lg" px={{ base: "md", sm: "lg" }}>
      <Group justify="space-between" mb="md">
        <Title order={1} size="h3">Custom quiz</Title>
        <Button variant="subtle" data-action="home" onClick={goHome} leftSection={<IconArrowLeft size={16} />}>Home</Button>
      </Group>
      <Stack gap="lg">
        <Card>
          <Title order={2} size="h4">Domains</Title>
          <Text size="sm" c="dimmed" mt={4} mb="md">Tick a domain to include it. Open one to narrow it to particular subdomains.</Text>
          <Stack gap="xs">
            {[1, 2, 3, 4, 5].map((d) => {
              const count = BANK.filter((q) => q.domain === d).length;
              const on = !!c.domains[d];
              const open = c.openDomain === d;
              const chosen = Object.keys(c.subs).filter((k) => c.subs[k] && k.indexOf(d + "|") === 0).length;
              return (
                <Paper key={d} withBorder radius="md" p="sm" className="builder-domain">
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Checkbox
                      data-action="cq-domain" data-domain={d}
                      checked={on}
                      onChange={(e) => setCustom({ domain: d, on: e.currentTarget.checked })}
                      label={
                        <Group gap={8} wrap="nowrap">
                          <DomainBadge d={d} />
                          <Text size="sm">{DOMAIN_NAMES[d]}</Text>
                        </Group>
                      }
                      description={chosen ? plural(chosen, "subdomain") : count + " questions"}
                    />
                    <Button
                      size="compact-sm" variant="subtle" data-action="cq-open-subs" data-domain={d}
                      aria-expanded={open && on} disabled={!on} aria-label={"Subdomains of D" + d}
                      onClick={() => setCustom({ openDomain: d })}
                      rightSection={<IconChevronDown size={14} style={{ transform: open && on ? "rotate(180deg)" : "none" }} />}
                    >
                      <Text span inherit visibleFrom="xs">Subdomains</Text>
                    </Button>
                  </Group>
                  <Collapse in={on && open}>
                    <Stack gap={6} mt="sm" pl="xl" className="practice-subs">
                      {L.masteryBySubdomain(BANK, p.correctEver, d, p.attempted).map((row) => {
                        const key = d + "|" + row.key;
                        return (
                          <Checkbox
                            key={key}
                            size="sm"
                            data-action="cq-sub" data-key={key}
                            checked={!!c.subs[key]}
                            onChange={(e) => setCustom({ sub: key, on: e.currentTarget.checked })}
                            label={
                              <Group gap={6} wrap="nowrap" justify="space-between">
                                <Text size="sm">{row.key === "general" ? "" : <b>{row.key} </b>}{row.title}</Text>
                                <Text size="xs" c="dimmed">{row.total}</Text>
                              </Group>
                            }
                          />
                        );
                      })}
                      <Text size="xs" c="dimmed">
                        {chosen ? "Only the ticked subdomains are included." : "None ticked — the whole domain is included."}
                      </Text>
                    </Stack>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        </Card>

        <Card>
          <Title order={2} size="h4" mb="md">Length</Title>
          <SegmentedControl
            fullWidth
            aria-label="Number of questions"
            value={c.count}
            onChange={(v) => setCustom({ count: v })}
            data={["10", "20", "30", "60"].map((v) => ({ value: v, label: v })).concat([{ value: "all", label: "All (" + pool + ")" }])}
          />
          <Text size="sm" c="dimmed" mt="md" className="builder-summary">
            {plural(n, "question")} from your selected domains{c.timed ? " · timed: " + n * 2 + " min" : " · untimed"}
          </Text>
          <Group justify="space-between" mt="md">
            <Switch
              data-action="cq-timed"
              checked={c.timed}
              onChange={(e) => setCustom({ timed: e.currentTarget.checked })}
              label="Timed (2 min per question)"
            />
            <ActionButton action="start-custom" slow disabled={!pool} onClick={startCustom} size="md">Start quiz</ActionButton>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
}
