import { useSyncExternalStore } from "react";
import { Box } from "@mantine/core";
import { S, subscribe, getVersion } from "./core/controller.js";
import { BANK } from "./core/env.js";
import { DialogHost } from "./components/DialogHost.jsx";
import { Home } from "./screens/Home.jsx";
import { QuestionScreen } from "./screens/QuestionScreen.jsx";
import { ScenarioQuestion } from "./screens/ScenarioQuestion.jsx";
import { ScenarioReview } from "./screens/ScenarioReview.jsx";
import { Results } from "./screens/Results.jsx";
import { Review } from "./screens/Review.jsx";
import { Search } from "./screens/Search.jsx";
import { CustomBuilder } from "./screens/CustomBuilder.jsx";
import { isScenarioMode } from "./core/controller.js";
import { EmptyBank } from "./screens/EmptyBank.jsx";

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

export function App() {
  useApp();
  return (
    <Box id="app" data-view={S.view} data-busy={S.busy ? "true" : undefined}>
      <Screen />
      <DialogHost />
    </Box>
  );
}
