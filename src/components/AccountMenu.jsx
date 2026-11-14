/* Account & sync, in a popover on the header chip: sign-in, sync status,
 * the backup file, restoring this device's backup copy, and Start over. */
import { useRef, useState } from "react";
import {
  Alert, Badge, Button, Code, Divider, Group, Popover, Stack, Text, TextInput, Title, UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconCloud, IconUser } from "@tabler/icons-react";
import {
  S, setAcctOpen, sendSignIn, verifySignIn, signOut, exportProgress, importProgressText,
  restoreBackup, resetProgress, backupExtra, setTab, ui,
} from "../core/controller.js";
import { L, timeAgo, plural } from "../core/env.js";

export function isAdminUser(Sync = L.CCARF_SYNC) {
  return !!(Sync && Sync.enabled && Sync.user() && Sync.isAdmin && Sync.isAdmin());
}

function statusLabel(Sync) {
  const st = Sync.status();
  const waiting = Sync.pendingCount ? Sync.pendingCount() : 0;
  return st === "syncing" ? "syncing…"
    : st === "offline" ? "offline — changes will sync when you reconnect"
      : st === "error" ? "sync failed"
        : waiting ? plural(waiting, "change") + " waiting to sync"
          : st === "synced" ? "progress synced" : "sync ready";
}

function SignIn() {
  const [email, setEmail] = useState(S.pendingEmail || "");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const emailCode = !!(L.CCARF_CONFIG && L.CCARF_CONFIG.emailCode);
  const send = async () => { setSending(true); try { await sendSignIn(email); } finally { setSending(false); } };
  return (
    <Stack gap="xs">
      {S.authNotice ? <Alert color="red" role="alert" p="xs">{S.authNotice}</Alert> : null}
      <Text size="sm" c="dimmed">Sign in with your e-mail to back up progress and resume from any device.</Text>
      <form onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Group gap="xs" align="flex-start">
          <TextInput
            id="auth-email" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.currentTarget.value)} style={{ flex: "1 1 190px" }}
            aria-label="E-mail address"
          />
          <Button type="submit" data-action="auth-send" loading={sending} style={{ flex: "1 0 auto" }}>
            {S.pendingEmail ? "Resend" : emailCode ? "Email me a code" : "Email me a link"}
          </Button>
        </Group>
      </form>
      {S.pendingEmail ? (
        <Alert color="blue" variant="light" p="xs">
          <Text size="sm">We sent a sign-in e-mail to <b>{S.pendingEmail}</b>.</Text>
          <Text size="xs" c="dimmed" mt={4}>
            {emailCode
              ? <><b>Enter the code</b> from it below to sign in here. Or <b>click the link</b> in it instead — that only signs in the browser where you click it. </>
              : <><b>Open the link</b> in it in this browser to sign in here. The link only signs in the browser where you click it, so if your mail opens it on another device, sign in there or forward the e-mail to this one. </>}
            Nothing there? Check spam, or resend.
          </Text>
        </Alert>
      ) : null}
      {S.pendingEmail && emailCode ? (
        <form onSubmit={(e) => { e.preventDefault(); verifySignIn(code); }}>
          <Group gap="xs">
            <TextInput id="auth-code" inputMode="numeric" autoComplete="one-time-code" placeholder="Code from the e-mail"
              value={code} onChange={(e) => setCode(e.currentTarget.value)} style={{ flex: "1 1 160px" }} aria-label="Code from the e-mail" />
            <Button type="submit" variant="light" data-action="auth-verify">Verify &amp; sign in</Button>
          </Group>
        </form>
      ) : null}
    </Stack>
  );
}

function SignedIn({ Sync }) {
  const st = Sync.status();
  const syncedAt = Sync.syncedAt ? Sync.syncedAt() : 0;
  return (
    <Stack gap="xs">
      <Text size="sm">
        Signed in as <b>{Sync.user().email || "account"}</b>{" "}
        <Text span c="dimmed" size="sm">· {statusLabel(Sync)}</Text>
      </Text>
      {st === "error" && Sync.error && Sync.error() ? <Text size="xs" c="red">{Sync.error()}</Text> : null}
      {syncedAt ? (
        <Text size="xs" c="dimmed">
          Last synced {timeAgo(syncedAt)}. Your progress is kept on the server, so any signed-in device shows the latest.
        </Text>
      ) : null}
      <Group gap="xs">
        <Button size="xs" variant="light" data-action="sync-now" loading={st === "syncing"} onClick={() => Sync.syncNow()}>
          Sync now
        </Button>
        <Button size="xs" variant="subtle" color="gray" data-action="auth-signout" onClick={signOut}>Sign out</Button>
      </Group>
    </Stack>
  );
}

export function AccountCard() {
  const Sync = L.CCARF_SYNC;
  const file = useRef(null);
  const extra = backupExtra();
  return (
    <Stack gap="sm" id="acct">
      <Title order={4}>Account &amp; sync</Title>
      {!Sync || !Sync.enabled ? (
        <Text size="sm" c="dimmed">
          Progress is stored in this browser. To sign in and sync across devices, enable sync in <Code>config.js</Code> (see the README).
        </Text>
      ) : Sync.unavailable ? (
        <Text size="sm" c="dimmed">{Sync.error()}</Text>
      ) : Sync.user() ? <SignedIn Sync={Sync} /> : <SignIn />}
      {Sync && Sync.enabled && !Sync.unavailable && !(L.CCARF_CONFIG && L.CCARF_CONFIG.countVisits === false) ? (
        <Text size="xs" c="dimmed">
          Visits are counted with a random ID kept in this browser. No IP address or other personal details are recorded.
        </Text>
      ) : null}

      <Divider />
      <Text fw={700} size="sm">Backup file</Text>
      <Text size="xs" c="dimmed">
        Save your progress to a file, or add one back — useful without an account, or before clearing browser data.
        Importing only adds: nothing here is removed.
      </Text>
      <Group gap="xs">
        <Button size="xs" variant="light" data-action="export-progress" onClick={exportProgress}>Download progress</Button>
        <Button size="xs" variant="subtle" data-action="import-progress" onClick={() => file.current && file.current.click()}>
          Import from file…
        </Button>
        <input
          ref={file} type="file" id="import-file" accept=".json,application/json" hidden
          onChange={(e) => {
            const f = e.currentTarget.files && e.currentTarget.files[0];
            e.currentTarget.value = ""; // picking the same file again still fires
            if (f) f.text().then(importProgressText, () => ui.notify("That file could not be read."));
          }}
        />
      </Group>
      {extra > 0 ? (
        <>
          <Text size="xs" c="dimmed">
            This device has a backup copy with {plural(extra, "more item")} than your current progress.
          </Text>
          <Button size="xs" variant="light" data-action="restore-backup" onClick={restoreBackup} w="fit-content">Restore backup</Button>
        </>
      ) : null}

      <Divider />
      <Text fw={700} size="sm">Start over</Text>
      <Text size="xs" c="dimmed">Delete all your progress, on every device you are signed in on.</Text>
      <Button size="xs" color="red" variant="light" data-action="reset-progress" onClick={resetProgress} w="fit-content">
        Reset all progress
      </Button>
    </Stack>
  );
}

export function AccountMenu() {
  const Sync = L.CCARF_SYNC;
  const user = Sync && Sync.enabled && Sync.user();
  return (
    <Popover
      opened={S.acctOpen}
      onChange={setAcctOpen}
      position="bottom-end"
      width={360}
      shadow="lg"
      radius="lg"
      trapFocus={false}
      closeOnEscape
    >
      <Popover.Target>
        <UnstyledButton
          className="acct-chip"
          data-action="account"
          title="Account & sync"
          aria-expanded={S.acctOpen}
          onClick={() => setAcctOpen(!S.acctOpen)}
        >
          {user ? (
            <Badge
              size="lg" variant="light" color="teal" radius="xl" tt="none"
              leftSection={<IconCloud size={14} />} rightSection={<IconChevronDown size={14} />}
              maw={200}
            >
              <Text span size="sm" truncate="end" maw={120} display="inline-block" style={{ verticalAlign: "bottom" }}>
                {user.email || "signed in"}
              </Text>
            </Badge>
          ) : (
            <Badge
              size="lg" variant="default" radius="xl" tt="none" fw={500}
              leftSection={<IconUser size={14} />} rightSection={<IconChevronDown size={14} />}
            >
              {Sync && Sync.enabled ? "Sign in" : "Backup"}
            </Badge>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown p="lg" maw="calc(100vw - 32px)" className="acct-pop">
        <AccountCard />
        {isAdminUser(Sync) ? (
          <Button
            mt="md" size="xs" variant="subtle" data-action="open-section"
            onClick={() => {
              setTab("today");
              setTimeout(() => {
                const el = document.getElementById("h-visitors");
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
          >
            Visitor stats ↓
          </Button>
        ) : null}
      </Popover.Dropdown>
    </Popover>
  );
}
