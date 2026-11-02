/* Lists existing single-answer questions that belong to one scenario, as raw
 * material for writing scenarios/<id>.js. Imported exams tag the scenario
 * either in a `scenario` field or as an inline "Scenario: <Name> ..." prefix;
 * the prefix (shared background) is stripped so only the question's own
 * situation remains.
 *
 * Run: node scripts/scenario-candidates.mjs <scenarioId> [--json] */
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { window: {} };
vm.createContext(ctx);
const load = (dir, files) => {
  for (const f of files) new vm.Script(readFileSync(join(root, dir, f), "utf8"), { filename: f }).runInContext(ctx);
};
load("scenarios", ["index.js"]);
load("questions", readdirSync(join(root, "questions")).filter((f) => f.endsWith(".js")).sort());
load("exams", readdirSync(join(root, "exams")).filter((f) => f.endsWith(".js") && f !== "index.js").sort());

const scenarios = ctx.window.SCENARIOS;
const wanted = process.argv[2];
const asJson = process.argv.includes("--json");
const scn = scenarios.find((s) => s.id === wanted);
if (!scn) {
  console.error(`Usage: node scripts/scenario-candidates.mjs <${scenarios.map((s) => s.id).join("|")}> [--json]`);
  process.exit(1);
}

const nameOf = (tag) => String(tag || "").replace(/^Scenario \d+:\s*/, "").trim();

function stripIntro(text) {
  let t = String(text).trim();
  const prefix = `Scenario: ${scn.name}`;
  if (t.startsWith(prefix)) t = t.slice(prefix.length).trim();
  if (t.startsWith(scn.text)) t = t.slice(scn.text.length).trim();
  return t;
}

const exams = ctx.window.MOCK_EXAMS || [];
const bank = ctx.window.QUESTION_BANK || [];
const out = [];
for (const [origin, list] of [["exam", exams.flatMap((e) => e.questions)], ["bank", bank]]) {
  for (const q of list) {
    if (Array.isArray(q.answers)) continue; // select-two stays in the general bank
    const tagged = nameOf(q.scenario) === scn.name || String(q.question).startsWith(`Scenario: ${scn.name}`);
    if (!tagged) continue;
    out.push({
      sourceId: q.id,
      origin,
      domain: q.domain || null,
      subdomain: q.subdomain || null,
      question: stripIntro(q.question),
      options: q.options,
      answer: q.answer,
      optionNotes: q.optionNotes || null,
      explanation: q.explanation,
    });
  }
}

if (asJson) {
  console.log(JSON.stringify(out, null, 1));
} else {
  const bySub = {};
  for (const c of out) bySub[c.subdomain || "(none)"] = (bySub[c.subdomain || "(none)"] || 0) + 1;
  console.log(`${scn.name}: ${out.length} candidates (${out.filter((c) => c.optionNotes).length} with option notes)`);
  for (const [k, v] of Object.entries(bySub).sort()) console.log(`  ${v}\t${k}`);
}
