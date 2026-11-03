/* How many questions each exam-guide objective (task statement) has, in the
 * question bank and in the scenario bank, with the thin ones marked.
 * Run: npm run coverage   (or: node scripts/coverage.mjs [--min 10]) */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const at = process.argv.indexOf("--min");
const MIN = at > 0 ? Number(process.argv[at + 1]) : 10;

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(root, "js/logic.js"), "utf8"), ctx);
for (const dir of ["questions", "scenarios"]) {
  const files = readdirSync(join(root, dir)).filter((f) => f.endsWith(".js")).sort((a, b) =>
    a === "index.js" ? -1 : b === "index.js" ? 1 : a.localeCompare(b));
  for (const f of files) vm.runInContext(readFileSync(join(root, dir, f), "utf8"), ctx);
}

const bank = ctx.window.QUESTION_BANK || [];
const scenarioBank = ctx.window.SCENARIO_BANK || [];
const count = (list, sub) => list.filter((q) => q.subdomain === sub).length;

console.log(`Objective${" ".repeat(52)}Bank  Scenario`);
let thin = 0;
for (const sub of vm.runInContext("SUBDOMAINS", ctx)) {
  const b = count(bank, sub);
  const s = count(scenarioBank, sub);
  const flag = b < MIN || s < MIN ? "  ← under " + MIN : "";
  if (flag) thin++;
  const label = sub.length > 58 ? sub.slice(0, 57) + "…" : sub;
  console.log(`${label.padEnd(60)} ${String(b).padStart(4)}  ${String(s).padStart(8)}${flag}`);
}
const untagged = bank.filter((q) => !q.subdomain).length;
console.log(`\n${bank.length} bank questions (${untagged} without an objective, used by the supplementary mock),` +
  ` ${scenarioBank.length} scenario questions. ${thin} objective(s) under ${MIN}.`);
