/* Pieces shared by the question screens: the slim top and bottom bars, an
 * answer option (with strike-through), and the graded feedback. */
import { useEffect, useRef } from "react";
import {
  ActionIcon, Alert, Badge, Box, Button, Group, Paper, Text, Tooltip, UnstyledButton,
} from "@mantine/core";
import {
  IconArrowLeft, IconCheck, IconDoorExit, IconFlag, IconFlagFilled, IconMessage, IconSlash, IconStar,
  IconStarFilled, IconX,
} from "@tabler/icons-react";
import { S, quit, toggleStrike, selectOption, canStrike, goPrev } from "../core/controller.js";
import { Timer } from "./common.jsx";

/* Icon on phones, icon and words on wider screens; aria-label always. */
export function BarButton({ action, icon, label, onClick, active, color }) {
  return (
    <Tooltip label={label}>
      <Button
        variant={active ? "light" : "subtle"}
        color={active ? color || undefined : "gray"}
        size="compact-md"
        data-action={action}
        aria-label={label}
        aria-pressed={active === undefined ? undefined : !!active}
        onClick={onClick}
        leftSection={icon}
        px={6}
      >
        <Text span size="sm" visibleFrom="md">{label}</Text>
      </Button>
    </Tooltip>
  );
}

export function FlagButton({ on, onClick }) {
  return (
    <BarButton action="toggle-flag" label={on ? "Flagged" : "Flag for review"} active={on} color="orange"
      icon={on ? <IconFlagFilled size={18} /> : <IconFlag size={18} />} onClick={onClick} />
  );
}

export function SaveButton({ on, onClick }) {
  return (
    <BarButton action="toggle-saved" label={on ? "Saved" : "Save"} active={on} color="yellow"
      icon={on ? <IconStarFilled size={18} /> : <IconStar size={18} />} onClick={onClick} />
  );
}

export function CommentButton({ has, onClick }) {
  return <BarButton action="comment" label={has ? "Edit comment" : "Comment"} active={has} icon={<IconMessage size={18} />} onClick={onClick} />;
}

export function ExitButton() {
  return (
    <Tooltip label="Exit">
      <Button variant="default" size="compact-md" data-action="quit" aria-label="Exit" onClick={quit}
        leftSection={<IconDoorExit size={18} />} px={8}>
        <Text span size="sm" visibleFrom="md">Exit</Text>
      </Button>
    </Tooltip>
  );
}

export function Tally({ tally }) {
  return (
    <Group gap={4} wrap="nowrap" className="tally">
      <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />} aria-label={tally.correct + " right"}>{tally.correct}</Badge>
      <Badge color="red" variant="light" leftSection={<IconX size={12} />} aria-label={tally.wrong + " wrong"}>{tally.wrong}</Badge>
    </Group>
  );
}

/* Long title on wide screens, a short counter on phones. */
export function WhereLine({ title, long, short }) {
  return (
    <div className="q-where">
      <Text span fw={700} visibleFrom="sm">{title}</Text>
      <Text span c="dimmed" size="sm" visibleFrom="sm"> · {long}</Text>
      <Text span fw={700} size="sm" hiddenFrom="sm">{short}</Text>
    </div>
  );
}

export function TopBar({ children, right }) {
  return (
    <Paper component="header" className="q-top" radius={0} px={{ base: "sm", sm: "lg" }} py="xs">
      <Group justify="space-between" wrap="nowrap" gap="xs" maw={1200} mx="auto">
        <Box style={{ minWidth: 0 }}>{children}</Box>
        <Group gap={4} wrap="nowrap"><Timer />{right}</Group>
      </Group>
    </Paper>
  );
}

export function BottomBar({ children }) {
  return (
    <Paper component="footer" className="q-bottom" radius={0} px={{ base: "sm", sm: "lg" }} py="xs">
      <Group justify="space-between" wrap="nowrap" gap="xs" maw={1200} mx="auto">{children}</Group>
    </Paper>
  );
}

export function PrevButton() {
  const s = S.session;
  return (
    <Button variant="default" data-action="prev" aria-label="Previous question" disabled={s.current === 0} onClick={goPrev}
      leftSection={<IconArrowLeft size={16} />} px="sm">
      <Text span size="sm" visibleFrom="sm">Previous</Text>
    </Button>
  );
}

const LETTERS = "ABCDEFGH";

/* One answer option. Right-click (or the ⊘ button on touch screens) strikes
 * it through; that is only a visual aid and keeps any answer. */
export function Option({ q, optIdx, position, picked, struck, feedback, correct, multi, note, readOnly }) {
  const s = S.session;
  const strikeOn = !readOnly && s && canStrike(s.mode);
  const state = feedback || readOnly
    ? (correct ? "correct" : picked ? "wrong" : "plain")
    : picked ? "selected" : "plain";
  const tags = (feedback || readOnly) ? (
    <>
      {correct ? <Badge size="xs" color="teal" variant="light" ml={6}>correct answer</Badge> : null}
      {picked && (readOnly || !correct) ? <Badge size="xs" color={correct ? "teal" : "red"} variant="light" ml={6}>your answer</Badge> : null}
    </>
  ) : null;
  const body = (
    <Group wrap="nowrap" align="flex-start" gap="sm">
      <span className="opt-letter" aria-hidden="true">{LETTERS[position]}</span>
      <Text span className="opt-text" style={{ flex: 1 }}>
        {q.options[optIdx]}
        {tags}
        {struck ? <span className="sr-only"> (struck through)</span> : null}
      </Text>
    </Group>
  );
  return (
    <div className="opt-wrap">
      <Group wrap="nowrap" gap={6} align="stretch">
        {readOnly ? (
          <Box className="option" data-state={state} style={{ flex: 1 }}>{body}</Box>
        ) : (
          <UnstyledButton
            className="option"
            data-state={state}
            data-struck={struck || undefined}
            data-action="select"
            data-opt={optIdx}
            role={multi ? "checkbox" : "radio"}
            aria-checked={picked}
            disabled={!!feedback}
            onClick={() => !S.busy && selectOption(optIdx)}
            onContextMenu={(e) => {
              if (!strikeOn) return;
              e.preventDefault();
              if (!S.busy) toggleStrike(optIdx);
            }}
            style={{ flex: 1 }}
          >
            {body}
          </UnstyledButton>
        )}
        {strikeOn ? (
          <Tooltip label={struck ? "Undo strike-through" : "Strike through"}>
            <ActionIcon
              variant={struck ? "light" : "subtle"} color="gray" size="lg" className="strike-btn"
              data-action="strike" data-opt={optIdx} aria-pressed={!!struck}
              aria-label={"Strike through option " + (position + 1)}
              onClick={() => toggleStrike(optIdx)}
            >
              <IconSlash size={18} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </Group>
      {note ? <Text size="sm" className="opt-note" data-ok={correct || undefined}>{note}</Text> : null}
    </div>
  );
}

export function Feedback({ right, children }) {
  return (
    <Alert className="feedback" color={right ? "teal" : "red"} variant="light" mt="md"
      title={right ? "Correct." : "Incorrect."} icon={right ? <IconCheck /> : <IconX />}>
      {children}
    </Alert>
  );
}

/* Once graded the options are disabled, so the clicked one loses focus;
 * move it to the way on so keyboard users keep their place. */
export function useFocusNextWhenGraded(graded) {
  const ref = useRef(null);
  useEffect(() => {
    if (graded && ref.current && document.activeElement && document.activeElement.closest &&
        (document.activeElement === document.body || document.activeElement.closest(".option"))) {
      ref.current.focus({ preventScroll: true });
    }
  }, [graded]);
  return ref;
}

