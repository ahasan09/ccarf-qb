/* The home screen in four tabs: Today, Practice, Exams and Resources. A row
 * of tabs under the header on wide screens, a bar at the bottom on phones. */
import {
  Alert, Box, Button, Container, Group, Indicator, Kbd, Text, Tooltip, UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBook2, IconClipboardList, IconHome, IconMoon, IconSearch, IconSun, IconSunMoon, IconTarget,
} from "@tabler/icons-react";
import { S, setTab, openSearch, dueCount, hardReload } from "../core/controller.js";
import { FULL_BANK, L } from "../core/env.js";
import { BrandMark } from "../components/common.jsx";
import { AccountMenu } from "../components/AccountMenu.jsx";
import { Today } from "./home/Today.jsx";
import { PracticeTab } from "./home/Practice.jsx";
import { ExamsTab } from "./home/Exams.jsx";
import { ResourcesTab } from "./home/Resources.jsx";

const TABS = [
  ["today", "Today", IconHome],
  ["practice", "Practice", IconTarget],
  ["exams", "Exams", IconClipboardList],
  ["resources", "Resources", IconBook2],
];

const THEME_NEXT = { auto: "light", light: "dark", dark: "auto" };
const THEME_LABEL = { auto: "Auto", light: "Light", dark: "Dark" };
const THEME_ICON = { auto: IconSunMoon, light: IconSun, dark: IconMoon };

function ThemeButton() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const Icon = THEME_ICON[colorScheme] || IconSunMoon;
  const title = "Theme: " + THEME_LABEL[colorScheme] + " (click for " + THEME_LABEL[THEME_NEXT[colorScheme]] + ")";
  return (
    <Tooltip label={title}>
      <Button
        variant="default"
        size="sm"
        px="xs"
        data-action="cycle-theme"
        aria-label={title}
        onClick={() => setColorScheme(THEME_NEXT[colorScheme])}
        leftSection={<Icon size={18} />}
      >
        <Text span size="sm" visibleFrom="sm">{THEME_LABEL[colorScheme]}</Text>
      </Button>
    </Tooltip>
  );
}

export function HomeHeader() {
  return (
    <Group justify="space-between" py="md" gap="sm" wrap="nowrap" className="h-top">
      <Group gap={10} wrap="nowrap">
        <BrandMark />
        <Text fw={800} ff="heading" size="lg" visibleFrom="xs">CCAR-F Prep</Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <Button
          variant="default"
          data-action="search"
          aria-label="Search questions"
          aria-keyshortcuts="/"
          onClick={openSearch}
          leftSection={<IconSearch size={16} />}
          rightSection={<Kbd size="xs" visibleFrom="sm">/</Kbd>}
          px="sm"
        >
          <Text span size="sm" c="dimmed" visibleFrom="sm">Search questions</Text>
        </Button>
        <AccountMenu />
        <ThemeButton />
      </Group>
    </Group>
  );
}

function TabBar({ due }) {
  return (
    <Box component="nav" aria-label="Sections" className="h-tabs">
      {TABS.map(([id, label, Icon]) => {
        const on = S.tab === id;
        const badge = id === "practice" && due ? due : 0;
        return (
          <UnstyledButton
            key={id}
            className="h-tab"
            data-action="tab"
            data-tab={id}
            data-active={on || undefined}
            aria-current={on ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            <Indicator disabled={!badge} label={badge} size={16} color="red" offset={2}>
              <Icon size={22} stroke={1.8} />
            </Indicator>
            <span>{label}</span>
            {badge ? <span className="sr-only">{badge} due</span> : null}
          </UnstyledButton>
        );
      })}
    </Box>
  );
}

export function Home() {
  const due = dueCount();
  return (
    <Container size="lg" px={{ base: "md", sm: "lg" }} pb={96} className="home">
      {FULL_BANK.length !== L.EXPECTED_BANK_SIZE ? (
        <Alert color="orange" title="Part of the bank failed to download" mt="md" role="alert">
          Only {FULL_BANK.length} of {L.EXPECTED_BANK_SIZE} questions loaded.{" "}
          <Button size="xs" variant="light" data-action="hard-reload" onClick={hardReload}>Reload the bank</Button>
        </Alert>
      ) : null}
      <HomeHeader />
      <TabBar due={due} />
      <Box id="h-page" data-tab={S.tab} mt="lg">
        {S.tab === "practice" ? <PracticeTab /> :
          S.tab === "exams" ? <ExamsTab /> :
            S.tab === "resources" ? <ResourcesTab /> : <Today />}
      </Box>
      <Text component="footer" size="xs" c="dimmed" ta="center" mt={48}>
        Practice material for personal study. Not affiliated with Anthropic or Pearson VUE.
      </Text>
    </Container>
  );
}

