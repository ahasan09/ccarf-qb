/* Loads the browser question files in a sandbox and validates the bank.
 * Run: node test/validate-bank.mjs */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import app from "./engine.mjs";

const { validateBank, EXAM_DRAW_COUNTS, EXPECTED_BANK_SIZE } = app;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* questions/*.js load with the page; questions/unmapped/*.js (no exam-guide
 * objective) are only fetched for old attempts that used them. */
function load(dir) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".js")).sort()) {
    new vm.Script(readFileSync(join(dir, file), "utf8"), { filename: file }).runInContext(ctx);
  }
  return ctx.window.QUESTION_BANK || [];
}
const bank = load(join(root, "questions"));
const archive = load(join(root, "questions", "unmapped"));
const expected = { 1: 129, 2: 93, 3: 119, 4: 110, 5: 126 };
const errors = validateBank(bank);
for (const e of validateBank(archive)) errors.push("unmapped/: " + e);

const perDomain = {};
for (const q of bank) perDomain[q.domain] = (perDomain[q.domain] || 0) + 1;
for (const [d, want] of Object.entries(expected)) {
  if ((perDomain[d] || 0) !== want)
    errors.push(`domain ${d}: expected ${want} questions, found ${perDomain[d] || 0}`);
  if ((perDomain[d] || 0) < EXAM_DRAW_COUNTS[d])
    errors.push(`domain ${d}: fewer questions than the exam draw needs (${EXAM_DRAW_COUNTS[d]})`);
}

if (bank.length !== EXPECTED_BANK_SIZE)
  errors.push(`js/logic.js EXPECTED_BANK_SIZE is ${EXPECTED_BANK_SIZE} but bank has ${bank.length} — update the constant`);
/* The page hides questions without an objective, so they belong in
 * questions/unmapped/, where they cost no download. */
for (const q of bank) if (!q.subdomain) errors.push(`${q.id} has no subdomain: move it to questions/unmapped/`);
for (const q of archive) if (q.subdomain) errors.push(`unmapped/${q.id} has a subdomain: move it to questions/`);
if (archive.length !== 300) errors.push(`questions/unmapped/ should hold 300 questions, found ${archive.length}`);
const ids = new Set(bank.map((q) => q.id));
for (const q of archive) if (ids.has(q.id)) errors.push(`${q.id} is in both questions/ and questions/unmapped/`);

console.log(`Bank: ${bank.length} questions`, perDomain, `· unmapped archive: ${archive.length}`);
if (errors.length) {
  console.error(`✖ ${errors.length} validation error(s):`);
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}
console.log("✔ Question bank is valid");
