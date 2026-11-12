/* Loads the pure logic scripts (js/logic.js, js/store.js) for Node tests.
 * They are classic browser scripts that share globals, so they run in this
 * realm's global scope (keeping deepStrictEqual's prototype checks happy)
 * and their functions are read back off globalThis. */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const LOGIC_SCRIPTS = ["js/logic.js", "js/store.js"];
export const APP_SCRIPTS = [
  ...LOGIC_SCRIPTS,
  "js/app/state.js",
  "js/app/dialog.js",
  "js/app/home.js",
  "js/app/sessions.js",
  "js/app/question.js",
  "js/app/results.js",
  "js/app/events.js",
];

/* Runs each script, in order, in the given vm context. */
export function runScripts(files, ctx) {
  for (const file of files) {
    new vm.Script(readFileSync(join(root, file), "utf8"), { filename: file }).runInContext(ctx);
  }
}

if (typeof globalThis.createStore !== "function") {
  for (const file of LOGIC_SCRIPTS) {
    vm.runInThisContext(readFileSync(join(root, file), "utf8"), { filename: file });
  }
}

export default globalThis;
