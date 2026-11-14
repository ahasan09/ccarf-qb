/* In-app dialogs in place of alert(), confirm() and prompt(): one Mantine
 * modal fed by the controller's ui.ask / ui.notify / ui.askValue, each of
 * which resolves when the dialog closes. Escape, the close button and a
 * click outside all count as cancel. */
import { useEffect, useRef, useState } from "react";
import { Button, Group, Modal, Text, TextInput, Textarea } from "@mantine/core";
import { ui } from "../core/controller.js";

export function DialogHost() {
  const [dlg, setDlg] = useState(null); // { spec, resolve, kind }
  const [value, setValue] = useState("");
  const current = useRef(null);
  current.current = dlg;

  useEffect(() => {
    const open = (kind, spec) => new Promise((resolve) => {
      if (current.current) current.current.resolve(kind === "value" ? null : false);
      setValue(spec.input ? spec.input.value || "" : "");
      setDlg({ kind, spec, resolve });
    });
    ui.ask = (spec) => open("ask", spec);
    ui.notify = (text, title) => open("notify", { text, title, ok: "OK" }).then(() => undefined);
    ui.askValue = (spec) => open("value", spec);
    ui.dialogOpen = () => !!current.current;
    ui.closeDialogs = () => close(false);
  }, []);

  function close(ok) {
    const d = current.current;
    if (!d) return;
    current.current = null;
    setDlg(null);
    d.resolve(d.kind === "value" ? (ok ? value : null) : ok);
  }

  const spec = dlg ? dlg.spec : {};
  const input = spec.input;
  const cancel = dlg && dlg.kind !== "notify" ? spec.cancel || "Cancel" : null;

  return (
    <Modal
      opened={!!dlg}
      onClose={() => close(false)}
      title={spec.title ? <Text fw={700} ff="heading" size="lg">{spec.title}</Text> : null}
      centered
      radius="lg"
      id="app-dialog"
      data-open={dlg ? "true" : "false"}
      withCloseButton={!!spec.title}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); close(true); }}
      >
        {spec.text ? <Text mb="md">{spec.text}</Text> : null}
        {input && input.type === "textarea" ? (
          <Textarea
            label={input.label}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            autosize minRows={4}
            data-autofocus
            id="dlg-input"
            mb="md"
          />
        ) : input ? (
          <TextInput
            type={input.type || "text"}
            label={input.label}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            data-autofocus
            id="dlg-input"
            mb="md"
          />
        ) : null}
        <Group justify="flex-end" gap="sm">
          {cancel ? (
            <Button variant="default" onClick={() => close(false)} data-dlg="cancel" data-autofocus={spec.danger ? true : undefined}>
              {cancel}
            </Button>
          ) : null}
          <Button type="submit" color={spec.danger ? "red" : undefined} data-dlg="ok"
            data-autofocus={!input && !spec.danger ? true : undefined}>
            {spec.ok || "OK"}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
