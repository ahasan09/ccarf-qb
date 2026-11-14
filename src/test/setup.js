/* Vitest setup: load the classic logic scripts into the jsdom window, as
 * index.html does, and add the browser APIs Mantine expects. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { afterEach } from "vitest";

/* Node 25 has a global localStorage of its own that hides jsdom's and fails
 * without a backing file; tests use a plain in-memory one. */
class MemoryStorage {
  constructor() { this.m = new Map(); }
  get length() { return this.m.size; }
  key(i) { return [...this.m.keys()][i] ?? null; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(String(k), String(v)); }
  removeItem(k) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
for (const name of ["localStorage", "sessionStorage"]) {
  Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true });
  if (typeof window !== "undefined" && window !== globalThis) {
    Object.defineProperty(window, name, { value: globalThis[name], configurable: true, writable: true });
  }
}

for (const file of ["js/logic.js", "js/store.js"]) {
  /* Run as a script in the global context, so `var` and function
   * declarations become globals, as with a <script> tag. */
  vm.runInThisContext(readFileSync(join(process.cwd(), file), "utf8"), { filename: file });
}
if (window !== globalThis) {
  for (const k of ["createStore", "Mutations", "normalizeProgress"]) if (!(k in window)) window[k] = globalThis[k];
}

window.matchMedia = window.matchMedia || ((query) => ({
  matches: false, media: query, onchange: null,
  addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
}));
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};

const sr = document.createElement("div");
sr.id = "sr-live";
document.body.appendChild(sr);

afterEach(() => {
  localStorage.clear();
});
