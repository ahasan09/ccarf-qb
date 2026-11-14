/* The home screen in four tabs: Today, Practice, Exams and Resources. A row
 * of tabs under the header on wide screens, a bar at the bottom on phones. */
import { lazy, Suspense } from "react";
import {
  Alert, Box, Button, Center, Container, Loader, Group, Indicator, Kbd, Text, Tooltip, UnstyledButton,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconBook2, IconClipboardList, IconHome, IconMoon, IconSearch, IconSun, IconSunMoon, IconTarget,
} from "@tabler/icons-react";
import { S, setTab, openSearch, dueCount, hardReload } from "../core/controller.js";
import { FULL_BANK, L } from "../core/env.js";
import { BrandMark, ShortcutsLink } from "../components/common.jsx";
import { AccountMenu } from "../components/AccountMenu.jsx";
import { Today } from "./home/Today.jsx";

/* Today is in the main bundle; the other tabs load when first opened (and
 * are prefetched once the page is idle, with the other screens). */
export const TAB_LOADERS = {
  practice: () => import("./home/Practice.jsx").then((m) => ({ default: m.PracticeTab })),
  exams: () => import("./home/Exams.jsx").then((m) => ({ default: m.ExamsTab })),
  resources: () => import("./home/Resources.jsx").then((m) => ({ default: m.ResourcesTab })),
};
const PracticeTab = lazy(TAB_LOADERS.practice);
const ExamsTab = lazy(TAB_LOADERS.exams);
const ResourcesTab = lazy(TAB_LOADERS.resources);

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
        <Suspense fallback={<Center h={240}><Loader size="sm" aria-label="Loading" /></Center>}>
          {S.tab === "practice" ? <PracticeTab /> :
            S.tab === "exams" ? <ExamsTab /> :
              S.tab === "resources" ? <ResourcesTab /> : <Today />}
        </Suspense>
      </Box>
      <Text component="footer" size="xs" c="dimmed" ta="center" mt={48}>
        Practice material for personal study. Not affiliated with Anthropic or Pearson VUE.
        <Text span inherit visibleFrom="sm"> · <ShortcutsLink>Keyboard shortcuts</ShortcutsLink></Text>
      </Text>
    </Container>
  );
}

