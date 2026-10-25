// Domain 3: Claude Code Configuration & Workflows — set 2, 24 questions (harder)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d3-q37",
    domain: 3,
    question: "A developer's .claude/settings.local.json pins \"model\" to a cheaper model for a project. For one session they launch Claude Code with --model to select a more capable model. No enterprise managed settings are deployed. Which model is used, and why?",
    options: [
      "The cheaper model, because settings.local.json is the highest-precedence source a developer controls",
      "The model from the --model flag, because command-line arguments rank above local, project, and user settings in the precedence order",
      "The cheaper model, because model selection can only be changed mid-session with /model, not at launch",
      "Claude Code warns about the conflict and falls back to the user-level settings model"
    ],
    answer: 1,
    explanation: "The settings precedence order is: enterprise managed settings, then command-line arguments, then local project settings, then shared project settings, then user settings. With no managed policy in play, the --model CLI argument outranks the value in settings.local.json."
  },
  {
    id: "d3-q38",
    domain: 3,
    question: "A repository's committed .claude/settings.json sets \"cleanupPeriodDays\": 30. A developer's untracked .claude/settings.local.json in the same project sets \"cleanupPeriodDays\": 5. What value applies for that developer?",
    options: [
      "30, because committed team settings override personal files to keep the team consistent",
      "30, because settings.local.json may only contain permission rules, not general settings",
      "The two files are merged and the larger value wins for retention-style settings",
      "5, because local project settings take precedence over shared project settings"
    ],
    answer: 3,
    explanation: "Within a project, .claude/settings.local.json overrides the shared .claude/settings.json; that is exactly what the local file is for — personal overrides of team defaults. Only enterprise managed settings and command-line arguments outrank it."
  },
  {
    id: "d3-q39",
    domain: 3,
    question: "A project's permissions contain Bash(git push:*) in the allow list, while the user's own settings contain Bash(git push:*) in the ask list. When Claude attempts git push origin main, what happens?",
    options: [
      "The user is prompted, because ask rules take precedence over allow rules regardless of which settings file they come from",
      "The push runs without prompting, because allow rules in project settings outrank ask rules in user settings",
      "The push is blocked entirely, because conflicting rule types are treated as a deny",
      "The rule defined in the higher-precedence settings file wins, so the project allow rule applies"
    ],
    answer: 0,
    explanation: "Permission rules are evaluated by rule type, not by settings-file precedence: deny rules are checked first, then ask rules, then allow rules. Because an ask rule matches, the user is prompted even though an allow rule also matches."
  },
  {
    id: "d3-q40",
    domain: 3,
    question: "A security engineer adds Bash(curl:*) to the deny list and concludes that Claude Code can now never fetch remote URLs via the shell. Why is this conclusion wrong?",
    options: [
      "Deny rules only apply in interactive mode, so headless runs ignore them",
      "Bash deny rules expire at the end of each session unless stored in managed settings",
      "Bash permission rules use simple prefix matching without full shell parsing, so variants like /usr/bin/curl or commands that invoke curl indirectly may not match the denied prefix; stronger guarantees need hooks or sandboxing",
      "The :* suffix inverts the rule, turning it into an allow rule for all curl subcommands"
    ],
    answer: 2,
    explanation: "Bash rules match on command prefixes and Claude Code does not fully interpret shell semantics, so a denied prefix like curl can be sidestepped by full paths, variables, or indirection through other commands. The documentation recommends treating Bash deny rules as guardrails, with PreToolUse hooks or OS-level sandboxing for hard enforcement."
  },
  {
    id: "d3-q41",
    domain: 3,
    question: "A team adds Read(/secrets/**) to the deny list in the repository's .claude/settings.json, intending to block reads of the /secrets directory at the filesystem root. What does this rule actually match?",
    options: [
      "Any path containing a segment named secrets anywhere on the filesystem",
      "Paths under the secrets directory relative to the settings file's location — a single leading slash is not an absolute path; absolute paths require the // prefix",
      "Nothing, because Read rules only accept the ~/ and ./ prefixes",
      "Exactly the absolute path /secrets/** as intended"
    ],
    answer: 1,
    explanation: "Read and Edit rules follow gitignore-style patterns with four forms: //path is absolute from the filesystem root, ~/path is relative to the home directory, /path is relative to the settings file, and path or ./path is relative to the current directory. A single leading slash therefore scopes the rule to the project, not the filesystem root."
  },
  {
    id: "d3-q42",
    domain: 3,
    question: "A team wants to pre-approve every tool exposed by their github MCP server. They add mcp__github__* to the allow list, but tools from the server still trigger prompts. What is the problem?",
    options: [
      "MCP tools cannot be pre-approved; each call always prompts for security reasons",
      "The rule must also name the transport, e.g. mcp__github__sse__*",
      "MCP servers must be allowed in .mcp.json rather than in permission rules",
      "MCP permission rules do not support wildcard suffixes; use mcp__github to approve all tools from that server, or mcp__github__toolname for a single tool"
    ],
    answer: 3,
    explanation: "Unlike Bash rules, MCP permission rules do not support a * or :* wildcard on the tool name. Approving an entire server is done with the bare mcp__servername rule, and individual tools with mcp__servername__toolname."
  },
  {
    id: "d3-q43",
    domain: 3,
    question: "A PostToolUse hook runs a type checker after every Edit and exits with code 2 (with errors on stderr) when the check fails. What effect does the exit code 2 have for this event?",
    options: [
      "The stderr output is fed back to Claude as feedback, but the edit itself is not undone — PostToolUse fires after the tool has already run, so nothing can be blocked",
      "The edit is automatically rolled back and Claude is asked to try again",
      "The session terminates immediately with the hook's stderr as the final error",
      "Exit code 2 is ignored for PostToolUse; only PreToolUse interprets it"
    ],
    answer: 0,
    explanation: "Exit code 2 semantics differ per hook event. For PreToolUse it blocks the pending tool call, but for PostToolUse the tool has already executed, so exit 2 only surfaces the stderr to Claude as feedback for its next step — it cannot undo the change."
  },
  {
    id: "d3-q44",
    domain: 3,
    question: "A UserPromptSubmit hook detects a hardcoded credential in the user's prompt and exits with code 2, writing a notice to stderr. What happens next?",
    options: [
      "The prompt is sent to Claude together with the stderr text so it can respond cautiously",
      "The prompt is processed normally; UserPromptSubmit cannot block, only annotate",
      "Prompt processing is blocked and the prompt is erased; the stderr message is shown to the user, not to Claude",
      "Claude receives the stderr text as a replacement for the original prompt"
    ],
    answer: 2,
    explanation: "For UserPromptSubmit, exit code 2 blocks processing of the submitted prompt and erases it, and the hook's stderr is shown to the user only. This differs from PreToolUse and Stop, where exit 2 feeds stderr back to Claude."
  },
  {
    id: "d3-q45",
    domain: 3,
    question: "A team writes a Stop hook that exits with code 2 whenever the test suite is failing, forcing Claude to keep working. They worry Claude could get stuck forever if the tests can never pass. What does the documentation recommend the hook script check?",
    options: [
      "A retry_count field in the JSON input, aborting after three attempts",
      "The stop_hook_active field in the hook's JSON input, which is true when Claude is already continuing because of a Stop hook — the script should not block again in that case, to avoid infinite loops",
      "The elapsed session time via the CLAUDE_SESSION_DURATION environment variable",
      "Nothing; Claude Code automatically disables a Stop hook after it blocks once"
    ],
    answer: 1,
    explanation: "The Stop hook's stdin JSON includes stop_hook_active, which indicates Claude is already continuing as a result of a Stop hook. Checking this flag (or other termination conditions) before exiting 2 again is the documented way to prevent the hook from blocking stoppage indefinitely."
  },
  {
    id: "d3-q46",
    domain: 3,
    question: "A platform team wants a PreToolUse hook to silently auto-approve Bash commands that their internal policy engine classifies as safe, so developers are not prompted for them, while leaving all other commands to the normal permission flow. How should the hook signal approval?",
    options: [
      "Exit with code 0, which always auto-approves the pending tool call",
      "Exit with code 2 and print APPROVED to stderr",
      "Write the command to the allow list in settings.json and exit 0",
      "Print JSON to stdout with hookSpecificOutput.permissionDecision set to \"allow\" (plus a permissionDecisionReason), which bypasses the permission prompt for that call"
    ],
    answer: 3,
    explanation: "PreToolUse hooks can return structured JSON on stdout; setting hookSpecificOutput.permissionDecision to \"allow\" approves the call and skips the prompt, \"deny\" blocks it, and \"ask\" forces a prompt. A plain exit 0 just means the hook succeeded — it does not approve anything by itself."
  },
  {
    id: "d3-q47",
    domain: 3,
    question: "A team wants the current sprint ticket details injected into Claude's context automatically every time the developer submits a prompt. They write a script that fetches the ticket and prints it to stdout. How should it be wired up?",
    options: [
      "As a UserPromptSubmit hook exiting 0 — for this event (and SessionStart), stdout is added to Claude's context rather than just shown to the user",
      "As a PreToolUse hook on the Task tool, since context injection requires a tool event",
      "As a PostToolUse hook with matcher \"*\", because it fires closest to model inference",
      "It cannot be done with hooks; stdout from hooks is never visible to the model"
    ],
    answer: 0,
    explanation: "UserPromptSubmit and SessionStart are special cases: when the hook exits 0, its stdout is added as context for Claude. For most other hook events, stdout is shown to the user (e.g., in transcript mode) but is not injected into the model's context."
  },
  {
    id: "d3-q48",
    domain: 3,
    question: "A repository configures three PreToolUse hook commands that all match the Bash tool. One of them occasionally hangs. Which statement correctly describes execution and timeout behavior?",
    options: [
      "Hooks run sequentially in file order, and a hanging hook blocks the rest indefinitely",
      "Hooks run sequentially, and the first non-zero exit short-circuits the remaining hooks",
      "All matching hooks run in parallel; each command has a default 60-second timeout, configurable per command, and one command timing out does not cancel the others",
      "Only the most specific matcher runs; the other two hooks are skipped"
    ],
    answer: 2,
    explanation: "All hook commands whose matcher fits the event run in parallel (with identical commands deduplicated). Each command is subject to a default 60-second execution limit that can be customized per command via the timeout field, and an individual timeout does not abort the other hook commands."
  },
  {
    id: "d3-q49",
    domain: 3,
    question: "In a monorepo, a developer always launches Claude Code from packages/api/. There is a CLAUDE.md at the monorepo root, one in packages/api/, and one in packages/api/src/legacy/. Which memory files are loaded, and when?",
    options: [
      "Only packages/api/CLAUDE.md, because memory lookup is limited to the exact working directory",
      "The root and packages/api/ files are both loaded at launch (lookup recurses upward from the working directory), while the legacy/ one is loaded on demand when Claude reads files in that subtree",
      "All three load at launch, since all CLAUDE.md files in the repo are discovered eagerly",
      "Only the root CLAUDE.md loads, because the highest-level memory file shadows nested ones"
    ],
    answer: 1,
    explanation: "Claude Code discovers memory by recursing upward from the current working directory toward the filesystem root, loading each CLAUDE.md it finds, so parent/monorepo-root memories apply. CLAUDE.md files in subdirectories below cwd are not loaded at launch; they are pulled in when Claude works with files in those subtrees."
  },
  {
    id: "d3-q50",
    domain: 3,
    question: "A CLAUDE.md includes the line: \"Install the CLI with `npm install -g @anthropic-ai/claude-code`.\" A developer worries this will be treated as an import of a file named anthropic-ai/claude-code. What actually happens?",
    options: [
      "The import is attempted and fails, aborting memory loading for the whole file",
      "The import is attempted; failed imports are silently skipped, so nothing visible happens",
      "Claude Code escapes @ characters everywhere, so real imports also need a backslash prefix",
      "Nothing — @-imports are not evaluated inside code spans or code blocks, so the backticked text is left as ordinary content"
    ],
    answer: 3,
    explanation: "CLAUDE.md import syntax (@path) is deliberately not evaluated inside Markdown code spans and code blocks, precisely to avoid collisions with things like scoped npm package names. Outside code formatting, @path would be treated as an import."
  },
  {
    id: "d3-q51",
    domain: 3,
    question: "A developer has a personal subagent named code-reviewer in ~/.claude/agents/, and the repository they join also ships .claude/agents/code-reviewer.md with different instructions. Which subagent is used when the name is invoked?",
    options: [
      "The project-level subagent; when names conflict, project subagents take precedence over user-level subagents",
      "The user-level subagent, since personal configuration always outranks repository files",
      "Both run and their outputs are merged into one report",
      "Neither; Claude Code refuses to load duplicate subagent names until one is renamed"
    ],
    answer: 0,
    explanation: "When a project subagent and a user subagent share a name, the project-level definition in .claude/agents/ wins. This lets repositories standardize team subagents even if developers have personal ones with the same name."
  },
  {
    id: "d3-q52",
    domain: 3,
    question: "A team defines a debugging subagent and wants it to always run on whatever model the main conversation is currently using, even when developers switch models mid-session. What should the subagent's frontmatter contain?",
    options: [
      "model: main — the keyword that aliases the top-level conversation model",
      "No model field, because omitting it always uses the main conversation's model",
      "model: inherit — which makes the subagent use the main conversation's model; omitting the field instead applies the configured default subagent model",
      "A models list with fallbacks, since single-model pinning is not supported"
    ],
    answer: 2,
    explanation: "The subagent frontmatter model field accepts specific model aliases (e.g., sonnet, opus, haiku) or inherit, which ties the subagent to the main conversation's current model. Leaving the field out does not inherit; it falls back to the configured default model for subagents."
  },
  {
    id: "d3-q53",
    domain: 3,
    question: "A developer has an MCP server named tracker configured in user scope, and the repository's committed .mcp.json also defines a server named tracker pointing at a different endpoint. The developer then runs claude mcp add tracker (local scope) with a third endpoint. Which configuration wins in this project?",
    options: [
      "The user-scope server, because user configuration is evaluated last and overwrites earlier scopes",
      "The local-scope server; for name collisions, local scope takes precedence over project scope, which takes precedence over user scope",
      "The project-scope server, because committed team configuration outranks personal configuration",
      "Claude Code disables the server entirely until the name collision is resolved"
    ],
    answer: 1,
    explanation: "When MCP servers in different scopes share a name, precedence is local, then project, then user. This lets an individual temporarily shadow a team server (e.g., to point at a staging instance) without editing the committed .mcp.json."
  },
  {
    id: "d3-q54",
    domain: 3,
    question: "A team wants to commit .mcp.json with a server that needs an API token, without committing the token itself. What does the documented approach look like?",
    options: [
      "Reference the token with environment variable expansion such as \"API_KEY\": \"${TRACKER_TOKEN}\" (optionally ${TRACKER_TOKEN:-default}); each developer exports the variable locally and expansion happens when the server starts",
      "Store the token in .claude/settings.local.json under an mcpSecrets key that .mcp.json reads at runtime",
      "Commit the token but restrict the file with a Read deny rule so Claude cannot see it",
      "Tokens cannot be externalized; servers needing credentials must be added in user scope only"
    ],
    answer: 0,
    explanation: ".mcp.json supports ${VAR} and ${VAR:-default} expansion in fields like command, args, env, url, and headers. This lets teams share server definitions in source control while each developer supplies secrets through their own environment."
  },
  {
    id: "d3-q55",
    domain: 3,
    question: "An internal tool runs claude -p inside a service where no terminal is attached, but the team does not want to pre-approve everything: they want permission requests routed to their own approval service at runtime. Which supported mechanism does this?",
    options: [
      "--permission-mode delegate, which forwards prompts over HTTP to a configured endpoint",
      "Setting \"permissionWebhook\" in managed settings to the approval service URL",
      "A Notification hook that pauses the session until an operator responds",
      "The --permission-prompt-tool flag, which names an MCP tool that Claude Code calls to decide each permission request in non-interactive mode"
    ],
    answer: 3,
    explanation: "In headless mode, --permission-prompt-tool designates an MCP tool to handle permission prompts programmatically: the tool receives the request and returns an allow or deny decision. There is no delegate mode or permissionWebhook setting."
  },
  {
    id: "d3-q56",
    domain: 3,
    question: "A CI pipeline runs claude -p in one job to analyze a failure, then a later job must continue the same conversation with follow-up instructions. How should this be scripted reliably?",
    options: [
      "Pass --continue in the second job, which always resumes the correct conversation on shared runners",
      "Export CLAUDE_SESSION_ID in the first job; the second job reuses it automatically",
      "Run the first job with --output-format json, capture the session_id from the structured result, and run the second job with claude -p --resume <session_id>",
      "Sessions cannot span processes; the second job must replay the full first prompt"
    ],
    answer: 2,
    explanation: "Headless JSON output includes metadata such as the session_id, and --resume <id> continues that specific conversation in a later invocation. --continue resumes only the most recent conversation in that directory, which is fragile in CI where multiple jobs may interleave."
  },
  {
    id: "d3-q57",
    domain: 3,
    question: "A nightly automation uses claude -p to fix lint errors, but one run looped for a long time on an impossible task and burned significant budget. Which flag directly caps how long a single headless run can keep iterating?",
    options: [
      "--max-turns, which limits the number of agentic turns before the run stops",
      "--budget-usd, which aborts the run at a dollar threshold",
      "--output-format stream-json, which forces incremental output and early exit",
      "--permission-mode plan, which converts the run to read-only after a limit"
    ],
    answer: 0,
    explanation: "--max-turns bounds the number of agentic turns in non-interactive mode, providing a hard stop for runaway automation. There is no --budget-usd flag, and output format or plan mode do not limit iteration."
  },
  {
    id: "d3-q58",
    domain: 3,
    question: "An enterprise's policy requires all model traffic to flow through their AWS account rather than directly to the Anthropic API. Can they still adopt the official claude-code-action in GitHub Actions?",
    options: [
      "No; the action is hard-wired to the Anthropic API and an ANTHROPIC_API_KEY secret",
      "Yes; the action supports Amazon Bedrock (and Google Vertex AI) — the workflow authenticates with cloud credentials, typically via OIDC, and enables the provider instead of supplying an Anthropic API key",
      "Only by self-hosting a fork of the action that rewrites its API endpoints",
      "Yes, but only for read-only code review; Bedrock-backed runs cannot push commits"
    ],
    answer: 1,
    explanation: "The official GitHub Action supports third-party providers: with Amazon Bedrock or Google Vertex AI, the workflow uses cloud authentication (commonly OIDC role assumption) and provider configuration instead of an Anthropic API key. Functionality is not limited to read-only use."
  },
  {
    id: "d3-q59",
    domain: 3,
    question: "An engineering organization wants centralized dashboards of Claude Code usage — token counts, cost, sessions, lines of code changed — across hundreds of developers, feeding their existing Datadog/Grafana stack. What is the supported approach?",
    options: [
      "Parse each developer's /cost output from shell history with a scheduled script",
      "Enable usage-report mode in .mcp.json so an MCP server aggregates spend",
      "Have every developer run claude -p '/cost' weekly and upload the results",
      "Enable Claude Code's OpenTelemetry support (e.g., CLAUDE_CODE_ENABLE_TELEMETRY=1 with OTel exporter settings), typically rolled out via managed settings, and ship metrics to their existing observability backend"
    ],
    answer: 3,
    explanation: "Claude Code has built-in OpenTelemetry support: enabling telemetry and configuring OTel metrics/logs exporters emits usage metrics such as tokens, cost, and session activity to standard observability backends. Administrators can standardize this fleet-wide through managed settings."
  },
  {
    id: "d3-q60",
    domain: 3,
    question: "A team standardizes on a large model for all Claude Code work, yet their usage reports still show calls to a small Haiku-class model. What is the most likely explanation?",
    options: [
      "Developers are silently downgraded when they near their rate limit",
      "Claude Code uses a small, fast model for background functionality (such as generating Bash command descriptions and other auxiliary tasks); this model is separate from the main conversation model and can be changed via ANTHROPIC_SMALL_FAST_MODEL",
      "The /compact command always runs on Haiku and cannot be reconfigured",
      "Subagents default to Haiku unless every agent file sets a model explicitly"
    ],
    answer: 1,
    explanation: "Independent of the main model, Claude Code offloads lightweight background work to a small fast Haiku-class model, which shows up in usage data. The ANTHROPIC_SMALL_FAST_MODEL environment variable controls which model handles these background tasks."
  }
);
