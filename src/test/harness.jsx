/* Starts a fresh copy of the app in jsdom for each test: a small fake bank,
 * then the real controller and React screens. Helpers click by data-action
 * (as the browser test does) and answer the in-app dialog. */
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";

export function bank() {
  const qs = [];
  for (let d = 1; d <= 5; d++) {
    for (let i = 1; i <= 20; i++) {
      qs.push({
        id: `d${d}-q${i}`, domain: d, subdomain: `${d}.1 Sample subdomain`,
        question: `Question ${d}-${i}?`, options: ["A", "B", "C", "D"], answer: 0, explanation: "Because.",
      });
    }
  }
  return qs;
}

export const SCENARIOS = ["support", "codegen", "research", "devprod", "ci", "extraction"].map((id) => ({
  id, name: `Scenario ${id}`, text: `Background text for ${id}.`,
}));

export function scenarioBank(perScenario = 16) {
  const qs = [];
  for (const s of SCENARIOS) {
    const n = typeof perScenario === "number" ? perScenario : perScenario[s.id] || 0;
    for (let i = 1; i <= n; i++) {
      qs.push({
        id: `sc-${s.id}-${i}`, scenario: s.id, domain: 1,
        subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
        question: `Scenario question ${s.id} ${i}?`, options: ["Opt one", "Opt two", "Opt three", "Opt four"],
        answer: 0, optionNotes: ["Note one", "Note two", "Note three", "Note four"], explanation: "Because.",
      });
    }
  }
  return qs;
}

let current = null;

export async function launch(opts = {}) {
  if (current) await current.close();
  localStorage.clear();
  Object.entries(opts.storage || {}).forEach(([k, v]) => localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)));
  window.history.replaceState(null, "", "/" + (opts.hash || ""));
  Object.assign(window, {
    QUESTION_BANK: opts.bank || bank(),
    MOCK_EXAMS: opts.exams || [],
    MOCK_EXAM_INDEX: opts.examIndex,
    STUDY_RESOURCES: opts.resources,
    SCENARIOS: opts.scenarios || SCENARIOS,
    SCENARIO_BANK: opts.scenarioBank || scenarioBank(),
    CCARF_SYNC: opts.sync,
    CCARF_CONFIG: opts.config,
  });
  globalThis.requestAnimationFrame = window.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  vi.resetModules();
  const C = await import("../core/controller.js");
  const env = await import("../core/env.js");
  const { App } = await import("../App.jsx");
  const { MantineProvider } = await import("@mantine/core");
  const { theme } = await import("../theme.js");
  const { mergeThemeOverrides } = await import("@mantine/core");
  /* No animations: dialogs and folds open at once. */
  const testTheme = mergeThemeOverrides(theme, {
    components: {
      Modal: { defaultProps: { transitionProps: { duration: 0 } } },
      Popover: { defaultProps: { transitionProps: { duration: 0 } } },
      Collapse: { defaultProps: { transitionDuration: 0 } },
    },
  });

  let view;
  await act(async () => {
    view = render(<MantineProvider theme={testTheme}><App /></MantineProvider>);
    C.boot();
  });

  /* Long enough for a slow action's two frames, a dialog opening, and the
   * promise chains behind them. */
  const flush = () => act(async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setTimeout(r, 0)); });

  const find = (action, data = {}) => {
    const sel = `[data-action="${action}"]` + Object.entries(data).map(([k, v]) => `[data-${k}="${v}"]`).join("");
    return document.querySelector(sel);
  };

  const app = {
    C, env, view,
    store: () => env.Store.snapshot(),
    html: () => document.getElementById("app").innerHTML,
    text: () => document.getElementById("app").textContent,
    has: (action, data) => !!find(action, data),
    find,
    flush,
    async click(action, data) {
      const el = find(action, data);
      if (!el) throw new Error(`No [data-action="${action}"]${data ? " " + JSON.stringify(data) : ""} on screen`);
      fireEvent.click(el);
      await flush();
      return el;
    },
    async rightClick(opt) {
      fireEvent.contextMenu(find("select", { opt }));
      await flush();
    },
    async key(key) {
      fireEvent.keyDown(document.body, { key });
      await flush();
    },
    dialogOpen: () => !!document.querySelector("[data-dlg]"),
    dialogText: () => {
      const btn = document.querySelector("[data-dlg]");
      const box = btn && btn.closest('[role="dialog"]');
      return box ? box.textContent : "";
    },
    async answer(ok = true) {
      const btn = document.querySelector(`[data-dlg="${ok ? "ok" : "cancel"}"]`);
      if (!btn) throw new Error("No dialog open");
      fireEvent.click(btn);
      await flush();
    },
    async tab(name) { await app.click("tab", { tab: name }); return app.text(); },
    async close() {
      C.shutdown();
      cleanup();
      current = null;
    },
  };
  current = app;
  return app;
}

/* Answer every question in the current session and finish it. */
export async function completeSession(app, { correct = true } = {}) {
  for (let i = 0; i < 500; i++) {
    const s = app.C.S.session;
    if (!s) break;
    const sq = s.questions[s.current];
    const q = app.env.byId[sq.id];
    const want = app.env.L.correctIndices(q);
    const pick = correct ? want : [q.options.findIndex((_, k) => !want.includes(k))];
    for (const opt of pick) await app.click("select", { opt });
    const last = s.current + 1 >= s.questions.length;
    if (last) {
      if (app.C.S.view === "quiz" && app.has("submit")) {
        await app.click("submit");
      } else {
        await app.click("next"); // scenario exam: opens the review screen
        await app.click("submit");
      }
      if (app.dialogOpen()) await app.answer(true);
      break;
    }
    await app.click("next");
  }
}
