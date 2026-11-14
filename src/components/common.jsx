/* Small pieces every screen uses. Buttons carry data-action names (the same
 * names the old app used) so the browser test can find them. */
import { forwardRef, useSyncExternalStore } from "react";
import { Anchor, Badge, Button, Group, Progress, Text, Tooltip } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import {
  S, runSlow, subscribeTick, getTick, paceText,
} from "../core/controller.js";
import {
  L, DOMAIN_NAMES, examById, REPORT_ISSUE_URL, resourceById, fmtTime,
} from "../core/env.js";
import { DOMAIN_COLORS } from "../theme.js";

/* A button for an action. `slow` actions show a spinner and block other
 * clicks until they finish. */
export const ActionButton = forwardRef(function ActionButton({ action, slow, onClick, children, disabled, ...rest }, ref) {
  const busy = !!S.busy;
  const mine = S.busy === action;
  return (
    <Button
      ref={ref}
      data-action={action}
      loading={mine}
      disabled={disabled || (busy && !mine)}
      onClick={(e) => {
        if (S.busy) return;
        if (slow) runSlow(action, onClick);
        else onClick && onClick(e);
      }}
      {...rest}
    >
      {children}
    </Button>
  );
});

export function DomainBadge({ d, size = "sm" }) {
  return (
    <Badge color={DOMAIN_COLORS[d] || "gray"} variant="light" size={size} radius="sm" ff="monospace">
      D{d}
    </Badge>
  );
}

/* Domain, objective and scenario tags above a question. Imported questions
 * have no domain, so they are labelled by their exam. */
export function QuestionMeta({ q }) {
  return (
    <Group gap={6} wrap="wrap" className="q-meta">
      {DOMAIN_NAMES[q.domain] ? (
        <>
          <DomainBadge d={q.domain} />
          <Text size="xs" c="dimmed">{DOMAIN_NAMES[q.domain]}</Text>
        </>
      ) : q.exam && examById[q.exam] ? (
        <Text size="xs" c="dimmed">{examById[q.exam].name}</Text>
      ) : null}
      {q.subdomain ? <Text size="xs" c="dimmed">§ {q.subdomain}</Text> : null}
      {q.scenario ? <Badge size="xs" variant="outline" color="gray">{q.scenario}</Badge> : null}
    </Group>
  );
}

export function ReportLink({ q }) {
  const url = L.reportIssueUrl(q, REPORT_ISSUE_URL);
  if (!url) return null;
  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer" size="xs" c="dimmed" className="report-link">
      Report a problem with this question ↗
    </Anchor>
  );
}

export function ExternalLink({ href, children, ...rest }) {
  return (
    <Anchor href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </Anchor>
  );
}

export function ExamGuideLink() {
  const guide = resourceById("exam-guide");
  if (!guide) return null;
  return (
    <ExternalLink href={guide.url} size="sm">
      What each objective covers: exam guide <IconExternalLink size={12} style={{ verticalAlign: "-1px" }} />
    </ExternalLink>
  );
}

/* Colour backed by words: each bar says weak, close or on track. */
export function meterStatus(pct) { return pct >= 72 ? "on track" : pct >= 50 ? "close" : "weak"; }
export function Meter({ pct, source, few, w = 90 }) {
  if (pct === null || pct === undefined) {
    return <Progress value={0} w={w} size="md" aria-label="No answers yet" role="img" />;
  }
  if (few) {
    return (
      <Tooltip label="Too few answers to tell">
        <Progress value={pct} w={w} size="md" color="gray.5" aria-label="Too few answers to tell" role="img" />
      </Tooltip>
    );
  }
  const color = pct >= 72 ? "teal" : pct >= 50 ? "yellow" : "red";
  const label = pct + "% right" + (source ? " " + source : "") + ", " + meterStatus(pct);
  return (
    <Tooltip label={label}>
      <Progress value={pct} w={w} size="md" color={color} aria-label={label} role="img" />
    </Tooltip>
  );
}

/* The exam clock and pace hint; only this redraws every second. */
export function Timer() {
  useSyncExternalStore(subscribeTick, getTick);
  const s = S.session;
  if (!s || !s.deadline) return null;
  const left = s.deadline - Date.now();
  const budget = fmtTime((s.deadline - s.startedAt) / s.questions.length);
  const pace = paceText();
  return (
    <Group gap={6} wrap="nowrap">
      <Badge
        id="timer"
        role="timer"
        size="lg"
        variant={left < 10 * 60 * 1000 ? "filled" : "light"}
        color={left < 10 * 60 * 1000 ? "red" : "gray"}
        ff="monospace"
        radius="sm"
      >
        {fmtTime(left)}
      </Badge>
      {pace ? (
        <Tooltip label={"Aim for about " + budget + " per question"}>
          <Text id="pace" size="xs" c="orange" visibleFrom="sm">⏱ {pace}</Text>
        </Tooltip>
      ) : null}
    </Group>
  );
}

export function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>;
}

/* The keyboard shortcuts on a question screen (hidden on phones). */
export function KbdHint({ optionCount, canGoBack, canFlag }) {
  const last = Math.min(optionCount, 5);
  return (
    <Text size="xs" c="dimmed" visibleFrom="md" className="kbd-hint">
      <Kbd>1</Kbd>–<Kbd>{last}</Kbd> answer ·{" "}
      {canGoBack ? <><Kbd>←</Kbd>/<Kbd>→</Kbd> navigate</> : <><Kbd>→</Kbd> next</>}
      {canFlag ? <> · <Kbd>F</Kbd> flag</> : null}
    </Text>
  );
}

export function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
      <rect width="128" height="128" rx="28" fill="var(--mantine-primary-color-filled)" />
      <circle cx="64" cy="64" r="34" fill="none" stroke="var(--mantine-color-body)" strokeWidth="7" />
      <circle cx="64" cy="64" r="19" fill="var(--mantine-color-body)" />
    </svg>
  );
}
