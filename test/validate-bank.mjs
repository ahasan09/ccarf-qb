/* Loads the browser question files in a sandbox and validates the bank.
 * Run: node test/validate-bank.mjs */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { validateBank, EXAM_DRAW_COUNTS, EXPECTED_BANK_SIZE } = require("../app.js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "questions");
const ctx = { window: {} };
vm.createContext(ctx);

for (const file of readdirSync(dir).filter((f) => f.endsWith(".js")).sort()) {
  new vm.Script(readFileSync(join(dir, file), "utf8"), { filename: file }).runInContext(ctx);
}

const bank = ctx.window.QUESTION_BANK || [];
const expected = { 1: 199, 2: 140, 3: 171, 4: 162, 5: 165 };
const errors = validateBank(bank);

const perDomain = {};
for (const q of bank) perDomain[q.domain] = (perDomain[q.domain] || 0) + 1;
for (const [d, want] of Object.entries(expected)) {
  if ((perDomain[d] || 0) !== want)
    errors.push(`domain ${d}: expected ${want} questions, found ${perDomain[d] || 0}`);
  if ((perDomain[d] || 0) < EXAM_DRAW_COUNTS[d])
    errors.push(`domain ${d}: fewer questions than the exam draw needs (${EXAM_DRAW_COUNTS[d]})`);
}

if (bank.length !== EXPECTED_BANK_SIZE)
  errors.push(`app.js EXPECTED_BANK_SIZE is ${EXPECTED_BANK_SIZE} but bank has ${bank.length} — update the constant`);

console.log(`Bank: ${bank.length} questions`, perDomain);
if (errors.length) {
  console.error(`✖ ${errors.length} validation error(s):`);
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log("✔ Question bank is valid");
