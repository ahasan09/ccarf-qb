/* DOM app — in-app dialogs in place of the browser's alert(), confirm()
 * and prompt(). They use the page's <dialog id="app-dialog">, which gives a
 * modal backdrop, Escape to cancel and focus kept inside for free. Answers
 * arrive through callbacks. Where no such element exists (the Node tests),
 * each falls back to the browser's own box, which answers at once. */

"use strict";

function dialogEl() {
  var d = document.getElementById("app-dialog");
  return d && typeof d.showModal === "function" ? d : null;
}

function dialogOpen() {
  var d = dialogEl();
  return !!(d && d.open);
}

/* spec: { title, text, ok, cancel, danger, input: { type, value, label, placeholder } }
 * done(ok, value) runs once the dialog closes. Returns false when there is
 * no dialog element to show it in. */
function openDialog(spec, done) {
  var d = dialogEl();
  if (!d) return false;
  if (d.open) d.close("");
  var input = spec.input;
  var field = "";
  if (input) {
    var attrs = ' id="dlg-input" class="input dlg-input"' + (input.placeholder ? ' placeholder="' + esc(input.placeholder) + '"' : "");
    field = '<label class="dlg-label" for="dlg-input">' + esc(input.label || "") + "</label>" +
      (input.type === "textarea"
        ? "<textarea" + attrs + ' rows="4">' + esc(input.value || "") + "</textarea>"
        : '<input type="' + esc(input.type || "text") + '"' + attrs + ' value="' + esc(input.value || "") + '">');
  }
  d.innerHTML = '<form method="dialog" class="dlg">' +
    (spec.title ? '<h2 class="dlg-title" id="dlg-title">' + esc(spec.title) + "</h2>" : "") +
    (spec.text ? '<p class="dlg-text">' + esc(spec.text) + "</p>" : "") + field +
    '<div class="dlg-actions">' +
    (spec.cancel ? '<button type="button" class="btn" data-dlg-cancel>' + esc(spec.cancel) + "</button>" : "") +
    '<button type="submit" value="ok" class="btn ' + (spec.danger ? "danger" : "primary") + '">' + esc(spec.ok || "OK") + "</button>" +
    "</div></form>";
  if (spec.title) d.setAttribute("aria-labelledby", "dlg-title"); else d.removeAttribute("aria-labelledby");
  var back = document.activeElement;
  d.returnValue = "";
  d.onclick = function (ev) {
    /* A click on the backdrop lands on the <dialog> itself. */
    if (ev.target === d || (ev.target.closest && ev.target.closest("[data-dlg-cancel]"))) d.close("");
  };
  d.onclose = function () {
    d.onclose = null;
    d.onclick = null;
    var box = d.querySelector("#dlg-input");
    var ok = d.returnValue === "ok";
    var value = box ? box.value : null;
    if (back && back.isConnected && back.focus) back.focus({ preventScroll: true });
    done(ok, value);
  };
  d.showModal();
  var first = d.querySelector(input ? "#dlg-input" : spec.danger ? "[data-dlg-cancel]" : 'button[type="submit"]');
  if (first && first.focus) first.focus();
  return true;
}

/* An alert: one button. */
function notify(text, title) {
  if (openDialog({ title: title || "", text: text, ok: "OK" }, function () {})) return;
  alert(text);
}

/* A yes/no question. onYes runs only on yes; onNo (optional) otherwise. */
function ask(spec, onYes, onNo) {
  var shown = openDialog({ title: spec.title, text: spec.text, ok: spec.ok || "OK", cancel: spec.cancel || "Cancel", danger: spec.danger },
    function (ok) { if (ok) onYes(); else if (onNo) onNo(); });
  if (shown) return;
  if (confirm(spec.text)) onYes(); else if (onNo) onNo();
}

/* A question with one field. done(value) gets the text, or null if cancelled.
 * spec.text is the browser-prompt wording; the dialog shows the field's
 * label instead, plus spec.note if given. */
function askValue(spec, done) {
  var shown = openDialog({ title: spec.title, text: spec.note || "", ok: spec.ok || "Save", cancel: "Cancel", input: spec.input },
    function (ok, value) { done(ok ? value : null); });
  if (shown) return;
  done(prompt(spec.text || spec.title, spec.input.value || ""));
}
