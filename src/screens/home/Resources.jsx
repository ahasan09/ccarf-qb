/* Resources: links to study material outside the app, by group. */
import { Card, Group, NavLink, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconExternalLink, IconStarFilled } from "@tabler/icons-react";
import { L, RESOURCES } from "../../core/env.js";

export function ResourcesTab() {
  return (
    <Card id="h-resources">
      <Title order={3} size="h4">Study resources</Title>
      {!RESOURCES.length ? (
        <Text size="sm" c="dimmed" mt={4}>No study links are configured.</Text>
      ) : (
        <>
          <Text size="sm" c="dimmed" mt={4}>
            The exam guide, courses and practice outside this app. Links open in a new tab and need an internet connection.
          </Text>
          <Stack gap="lg" mt="lg">
            {L.RESOURCE_GROUPS.map((g) => {
              const items = RESOURCES.filter((r) => r.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className="h-res-group">
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={1} mb={4}>{g}</Text>
                  <Stack gap={2}>
                    {items.map((r) => (
                      <NavLink
                        key={r.id}
                        component="a"
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-res"
                        label={
                          <Group gap={6} wrap="nowrap">
                            {r.star ? (
                              <Tooltip label="Must-read">
                                <IconStarFilled size={14} color="var(--mantine-color-yellow-6)" aria-label="Must-read" />
                              </Tooltip>
                            ) : null}
                            <span>{r.title}</span>
                          </Group>
                        }
                        description={r.note || undefined}
                        rightSection={
                          <Group gap={4} wrap="nowrap">
                            {r.start ? <Text size="xs" c="dimmed">start here</Text> : null}
                            <IconExternalLink size={14} />
                          </Group>
                        }
                      />
                    ))}
                  </Stack>
                </div>
              );
            })}
          </Stack>
        </>
      )}
    </Card>
  );
}
