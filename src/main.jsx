import "@mantine/core/styles.css";
import "./app.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { theme, colorSchemeManager } from "./theme.js";
import { App } from "./App.jsx";
import { Store, loadReferencedExams, FULL_BANK, L } from "./core/env.js";
import { boot, emit } from "./core/controller.js";

const bankErrors = L.validateBank(FULL_BANK);
if (bankErrors.length) console.warn("Question bank validation issues:", bankErrors);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} colorSchemeManager={colorSchemeManager} defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);

boot();
if (window.performance && performance.mark) performance.mark("app-ready");
loadReferencedExams(Store.snapshot()).then(() => emit());

/* Sync is a module that reads window.CCARF_STORE (set by core/env.js), so it
 * is added once the store exists. Kept out of the bundle: it is the same
 * file as before and imports its client from a CDN only when configured. */
const sync = document.createElement("script");
sync.type = "module";
sync.src = "sync.js";
document.body.appendChild(sync);

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
