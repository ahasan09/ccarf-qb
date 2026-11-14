import { lazy, Suspense, useSyncExternalStore } from "react";
import { Box, Center, Loader } from "@mantine/core";
import { S, subscribe, getVersion, isScenarioMode } from "./core/controller.js";
import { BANK } from "./core/env.js";
import { DialogHost } from "./components/DialogHost.jsx";
import { ShortcutsDialog } from "./components/ShortcutsDialog.jsx";
import { ThemeColorSync } from "./components/ThemeColorSync.jsx";
import { Home, TAB_LOADERS } from "./screens/Home.jsx";
import { EmptyBank } from "./screens/EmptyBank.jsx";

/* Home ships in the main bundle; every other screen is its own file,
 * fetched when first opened (and prefetched once the page is idle, see
 * prefetchScreens). */
const SCREENS = {
  question: () => import("./screens/QuestionScreen.jsx").then((m) => ({ default: m.QuestionScreen })),
  scenario: () => import("./screens/ScenarioQuestion.jsx").then((m) => ({ default: m.ScenarioQuestion })),
  scenarioReview: () => import("./screens/ScenarioReview.jsx").then((m) => ({ default: m.ScenarioReview })),
  results: () => import("./screens/Results.jsx").then((m) => ({ default: m.Results })),
  review: () => import("./screens/Review.jsx").then((m) => ({ default: m.Review })),
  search: () => import("./screens/Search.jsx").then((m) => ({ default: m.Search })),
  custom: () => import("./screens/CustomBuilder.jsx").then((m) => ({ default: m.CustomBuilder })),
};
const QuestionScreen = lazy(SCREENS.question);
const ScenarioQuestion = lazy(SCREENS.scenario);
const ScenarioReview = lazy(SCREENS.scenarioReview);
const Results = lazy(SCREENS.results);
const Review = lazy(SCREENS.review);
const Search = lazy(SCREENS.search);
const CustomBuilder = lazy(SCREENS.custom);

/* Fetch every screen in the background, so the service worker caches them
 * and the app works offline after one visit. */
export function prefetchScreens() {
  return Promise.all(Object.values(SCREENS).concat(Object.values(TAB_LOADERS)).map((load) => load().catch(() => {})));
}

/* Redraw whenever the controller changes something. */
export function useApp() {
  return useSyncExternalStore(subscribe, getVersion);
}

function Screen() {
  useApp();
  if (!BANK.length) return <EmptyBank />;
  switch (S.view) {
    case "quiz":
      if (!S.session) return <Home />;
      return isScenarioMode(S.session.mode) ? <ScenarioQuestion /> : <QuestionScreen />;
    case "scenario-review": return S.session ? <ScenarioReview /> : <Home />;
    case "results": return S.lastFinished ? <Results /> : <Home />;
    case "review": return S.lastFinished ? <Review /> : <Home />;
    case "search": return <Search />;
    case "custom": return <CustomBuilder />;
    default: return <Home />;
  }
}

function Loading() {
  return <Center h="60vh"><Loader aria-label="Loading" /></Center>;
}

export function App() {
  useApp();
  return (
    <Box id="app" data-view={S.view} data-busy={S.busy ? "true" : undefined}>
      <Suspense fallback={<Loading />}>
        <Screen />
      </Suspense>
      <DialogHost />
      <ShortcutsDialog />
      <ThemeColorSync />
    </Box>
  );
}
