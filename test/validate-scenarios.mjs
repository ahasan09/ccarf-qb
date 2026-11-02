/* Loads the scenario files in a sandbox and validates the scenario bank.
 * Run: node test/validate-scenarios.mjs */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import app from "./engine.mjs";

const { validateScenarioBank } = app;

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "scenarios");
const ctx = { window: {} };
vm.createContext(ctx);
const files = ["index.js"].concat(
  readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "index.js").sort()
);
for (const file of files) {
  new vm.Script(readFileSync(join(dir, file), "utf8"), { filename: file }).runInContext(ctx);
}

const scenarios = ctx.window.SCENARIOS || [];
const bank = ctx.window.SCENARIO_BANK || [];
const errors = validateScenarioBank(scenarios, bank);

const counts = {};
for (const s of scenarios) counts[s.id] = 0;
for (const q of bank) counts[q.scenario] = (counts[q.scenario] || 0) + 1;

/* The correct option should not stand out as the longest. */
let longestIsCorrect = 0;
for (const q of bank) {
  const lens = q.options.map((o) => String(o).length);
  if (lens[q.answer] === Math.max(...lens)) longestIsCorrect++;
}
const share = bank.length ? Math.round((100 * longestIsCorrect) / bank.length) : 0;

console.log(`Scenario bank: ${bank.length} questions`, counts);
console.log(`Correct option is the longest in ${share}% of questions (keep at or under 40%)`);
if (bank.length >= 15 && share > 40) errors.push(`length bias: correct option is longest in ${share}% of questions`);

if (scenarios.length !== 6) errors.push(`expected 6 scenarios, found ${scenarios.length}`);
if (errors.length) {
  console.error(`✖ ${errors.length} validation error(s):`);
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log("✔ Scenario bank is valid");
