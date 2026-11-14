/* Every keyboard shortcut in one list: press ? anywhere, or use the link
 * beside the hints on a question screen. Keep in step with onKeyDown in
 * core/controller.js. */
import { Modal, Table, Text } from "@mantine/core";
import { S, setShortcutsOpen } from "../core/controller.js";
import { Kbd } from "./common.jsx";

const GROUPS = [
  ["On a question", [
    [["1", "–", "5"], "Pick an answer (or A–E)"],
    [["←"], "Previous question (not in practice, which only goes forward)"],
    [["→"], "Next question"],
    [["Enter"], "Next question, when no button has focus"],
    [["F"], "Flag for review (exams and drills)"],
    [["Right-click"], "Strike an option through, or undo (touch: press and hold)"],
  ]],
  ["Anywhere", [
    [["/"], "Search questions (not during a quiz)"],
    [["?"], "This list"],
    [["Esc"], "Close a menu or dialog"],
  ]],
];

export function ShortcutsDialog() {
  return (
    <Modal
      opened={S.shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
      title={<Text fw={700} ff="heading" size="lg">Keyboard shortcuts</Text>}
      centered
      radius="lg"
      size="lg"
      data-shortcuts
    >
      {GROUPS.map(([title, rows]) => (
        <div key={title}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed" lts={1} mt="sm" mb={4}>{title}</Text>
          <Table verticalSpacing={6} className="shortcuts">
            <Table.Tbody>
              {rows.map(([keys, what]) => (
                <Table.Tr key={what}>
                  <Table.Td w={130} style={{ whiteSpace: "nowrap" }}>
                    {keys.map((k, i) => (k === "–" ? <span key={i}> – </span> : <Kbd key={i}>{k}</Kbd>))}
                  </Table.Td>
                  <Table.Td><Text size="sm">{what}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      ))}
    </Modal>
  );
}
