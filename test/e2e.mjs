/* End-to-end check in a real browser: `npm run e2e`.
 *
 * The unit tests drive the app against a stub DOM, which cannot catch
 * real-browser differences (a button that only exists on another screen, a
 * layout that overflows a phone, a native <dialog>). This serves the app
 * with Node's own HTTP server, starts headless Chrome and drives it over
 * the DevTools protocol — no dependencies. It walks the main flows at
 * phone and desktop width and fails on a page error, a broken step, or a
 * screen that scrolls sideways on a phone.
 *
 * Chrome is found at CHROME_PATH, or the usual macOS/Linux locations. */
import { spawn } from "node:child_process";
import http from "node:http";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------ server */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^\/+/, "") || "index.html";
  if (path.startsWith("..")) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(join(root, path));
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

/* Declared before Chrome starts: finish() reads it, and an early exit
 * (Chrome not reachable) calls finish() before the checks run. */
let failures = 0;

/* ------------------------------------------------------------ chrome */
const chromePath = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
].find((p) => p && existsSync(p));
if (!chromePath) { console.error("Chrome not found; set CHROME_PATH."); process.exit(1); }

const profile = mkdtempSync(join(tmpdir(), "ccarf-e2e-"));
const port = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, [
  "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu",
  ...(process.env.CI ? ["--no-sandbox"] : []), "about:blank",
], { stdio: "ignore" });

let ws;
// Up to 30 s: a cold CI runner can take well over 15 s to start Chrome.
for (let i = 0; i < 200 && !ws; i++) {
  try {
    const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(150);
}
if (!ws) {
  console.error("Could not connect to Chrome.");
  finish(1);
  await new Promise(() => {}); // finish() exits shortly; go no further
}
await new Promise((r) => ws.addEventListener("open", r));

let msgId = 0;
const pending = {};
const pageErrors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    pageErrors.push((d.exception && d.exception.description) || d.text);
  }
  if (pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++msgId; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
async function js(expr) {
  const m = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (m.result.exceptionDetails) throw new Error("Script failed: " + expr.slice(0, 80) + " — " + m.result.exceptionDetails.text);
  return m.result.result.value;
}

/* ------------------------------------------------------------ helpers */
let step = "";
function check(label, ok, detail) {
  console.log((ok ? "  ✔ " : "  ✖ ") + label + (ok || !detail ? "" : " — " + detail));
  if (!ok) failures++;
}
async function until(expr, label, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await js(`!!(${expr})`)) return true;
    await sleep(60);
  }
  check(`${step}: waited for ${label}`, false, "timed out");
  return false;
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
async function click(sel) {
  if (!(await until(q(sel), sel))) return false;
  await js(`${q(sel)}.click(), true`);
  await sleep(80);
  return true;
}
const dialogOpen = () => js(`document.getElementById("app-dialog").open`);
const answerDialog = (ok) => click(ok ? '#app-dialog button[type="submit"]' : "#app-dialog [data-dlg-cancel]");
const currentTab = () => js(`(${q('[aria-current="page"]')} || { dataset: {} }).dataset.tab`);
async function noSidewaysScroll(where) {
  const extra = await js("document.documentElement.scrollWidth - innerWidth");
  check(`${where}: no sideways scrolling`, extra <= 1, `page is ${extra}px wider than the screen`);
}
async function open(width, progress) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 860, deviceScaleFactor: 1, mobile: width < 700 });
  await send("Page.navigate", { url: BASE + "icon.svg" }); // same origin, to seed storage
  await until("document.readyState === 'complete'", "seed page");
  await js(`localStorage.clear(); ${progress ? `localStorage.setItem("ccarf.progress", ${JSON.stringify(JSON.stringify(progress))});` : ""} true`);
  await send("Page.navigate", { url: BASE + "index.html" });
  await until(q(".h-tabs"), "the home screen");
}

/* ------------------------------------------------------------ flows */
await send("Page.enable");
await send("Runtime.enable");

const ids = ["d1-q82", "d1-q83", "d1-q84", "d1-q85", "d1-q86"];
const RETURNING = { attempted: ids, correctEver: ids.slice(0, 3), saved: ["d1-q82"] };

for (const width of [390, 1280]) {
  const where = width < 700 ? "phone" : "desktop";
  console.log(`\n${where} (${width}px)`);

  step = "first visit";
  await open(width, null);
  check("first visit: the loading screen is replaced", !(await js(`!!${q(".boot")}`)));
  check("first visit: welcome card with the diagnostic", await js(`!!${q('.h-first [data-action="start-diagnostic"]')}`));
  await noSidewaysScroll(`${where} welcome`);

  step = "tabs";
  await open(width, RETURNING);
  for (const t of ["practice", "exams", "resources", "today"]) {
    await click(`[data-action="tab"][data-tab="${t}"]`);
    check(`tab ${t} opens`, (await currentTab()) === t);
    await noSidewaysScroll(`${where} ${t} tab`);
  }

  step = "back and forward";
  await click('[data-tab="practice"]');
  await click('[data-tab="exams"]');
  check("address follows the tab", (await js("location.hash")) === "#/exams");
  await js("history.back(), true");
  await until(`(${q('[aria-current="page"]')} || {dataset:{}}).dataset.tab === "practice"`, "Back to Practice");
  await js("history.forward(), true");
  await until(`(${q('[aria-current="page"]')} || {dataset:{}}).dataset.tab === "exams"`, "Forward to Exams");

  step = "search";
  await js(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true })), true`);
  await until(q("#search-q"), "the search screen from /");
  await js(`(() => { const i = ${q("#search-q")}; i.value = "hooks"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
  await until(q('[data-action="practice-search"]'), "search results");
  await noSidewaysScroll(`${where} search`);
  await js("history.back(), true");
  await until(q(".h-tabs"), "home after Back from search");

  step = "learn mode with a keyboard and screen reader";
  await click('[data-tab="practice"]');
  await click('[data-action="start-saved"]');
  await until(q('[data-action="select"]'), "a saved question");
  check("the new question is announced", (await js(`document.getElementById("sr-live").textContent`)).startsWith("Question 1 of"));
  await click('[data-action="select"]');
  check("the grade is announced", /^(Correct|Incorrect)\./.test(await js(`document.getElementById("sr-live").textContent`)));
  check("focus moves to the way on", ["next", "submit"].includes(await js(`(document.activeElement && document.activeElement.dataset.action) || ""`)));
  check("options say which was right", await js(`!!${q(".option .tag")}`));
  await click('[data-action="quit"]');
  await answerDialog(true);
  await until(q(".h-tabs"), "home after Exit");

  step = "exam date dialog";
  await click('[data-tab="today"]');
  await click('[data-action="edit-exam-date"]');
  check("the exam date opens an in-app dialog", await dialogOpen());
  check("with a date picker", (await js(`(${q("#dlg-input")} || {}).type`)) === "date");
  await answerDialog(false);

  step = "mock exam";
  await click('[data-tab="exams"]');
  await click('[data-action="start-exam"]');
  await until(q("#app-dialog[open]") + " || " + q('[data-action="select"]'), "the replace dialog or a mock question");
  if (await dialogOpen()) await answerDialog(true); // replaces the unfinished practice
  await until(q('[data-action="select"]'), "a mock question");
  check("a quiz has its own address", (await js("location.hash")) === "#/quiz");
  await noSidewaysScroll(`${where} mock question`);
  await js("history.back(), true");
  await until(`document.getElementById("app-dialog").open`, "the Exit dialog on Back");
  await answerDialog(false);
  check("staying keeps the quiz", (await js("location.hash")) === "#/quiz" && (await js(`!!${q('[data-action="select"]')}`)));
  await click('[data-action="quit"]');
  await answerDialog(true);
  await until(q(".h-tabs"), "home after Exit");
  check("Exit returns to the tab the quiz started from", (await currentTab()) === "exams");
  await click('[data-tab="today"]');
  await until(q('.h-cta-main[data-action="resume"]'), "Continue on Today");

  step = "scenario exam to results";
  await click('[data-tab="exams"]');
  await click('[data-action="start-scenario-exam"]');
  await until(q("#app-dialog[open]") + " || " + q(".scn-screen"), "the replace dialog or the exam");
  if (await dialogOpen()) await answerDialog(true); // replaces the unfinished mock
  await until(q(".scn-screen"), "the scenario exam");
  await noSidewaysScroll(`${where} scenario question`);
  await click('[data-action="select"]');
  await click('[data-action="review-all"]');
  await click('[data-action="submit"]');
  await answerDialog(true);
  await until(q(".weak-spots"), "results with weak spots");
  check("results offer the weak spots", await js(`!!${q('.weak-spot [data-action="drill-objective"]')}`));
  await noSidewaysScroll(`${where} results`);
  await click('[data-action="show-review"]');
  await until(q(".review-card"), "the answer review");
  await noSidewaysScroll(`${where} review`);

  step = "score history and custom quiz";
  await js("renderHome(), true");
  await click('[data-tab="exams"]');
  await until(q("#h-history .history-card, #h-history table"), "score history");
  await noSidewaysScroll(`${where} score history`);
  await click('[data-tab="practice"]');
  await click('[data-action="custom-builder"]');
  await until(q(".builder-domain"), "the custom quiz builder");
  await noSidewaysScroll(`${where} custom quiz`);
}

check("no page errors", pageErrors.length === 0, pageErrors.join("\n"));
finish(failures ? 1 : 0);

function finish(code) {
  console.log(!code ? "\nAll end-to-end checks passed."
    : failures ? `\n${failures} check(s) failed.` : "\nEnd-to-end run stopped before any checks.");
  try { ws && ws.close(); } catch {}
  chrome.kill();
  server.close();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }, 300);
}
