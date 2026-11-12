// Domain 3: Claude Code Configuration & Workflows — 36 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d3-q01",
    domain: 3,
    question: "A security team deploys an enterprise managed settings file that denies the Bash(curl:*) permission. A developer adds an allow rule for the same pattern to their project's .claude/settings.local.json. What happens when Claude Code tries to run a curl command in that project?",
    options: [
      "The command is allowed, because local project settings have the highest precedence",
      "Claude Code refuses to start because of the conflicting rules",
      "The command is denied, because enterprise managed settings take precedence over all user and project settings",
      "The command triggers an interactive prompt so the developer can decide"
    ],
    answer: 2,
    explanation: "Enterprise managed settings sit at the top of the settings precedence hierarchy and cannot be overridden by command-line arguments, local project settings, shared project settings, or user settings. The deny rule therefore wins."
  },
  {
    id: "d3-q02",
    domain: 3,
    question: "A team wants a shared set of permission rules and environment variables to apply to everyone who clones their repository and uses Claude Code. Where should these settings be placed?",
    options: [
      ".claude/settings.json in the repository, committed to source control",
      ".claude/settings.local.json in the repository, committed to source control",
      "~/.claude/settings.json on each developer's machine",
      "A managed-settings.json file at the repository root"
    ],
    answer: 0,
    explanation: ".claude/settings.json is the shared project settings file designed to be checked into source control so the whole team gets the same configuration. settings.local.json is for personal, untracked overrides, and managed-settings.json is a system-level enterprise file, not a repo file."
  },
  {
    id: "d3-q03",
    domain: 3,
    question: "What is the intended purpose of the .claude/settings.local.json file in a project?",
    options: [
      "It stores enterprise policies that lock down the project for all contributors",
      "It caches session state such as conversation history between runs",
      "It mirrors settings.json and must be kept identical for settings to take effect",
      "It holds personal, per-developer settings that are not checked into source control; Claude Code configures git to ignore it when it is created"
    ],
    answer: 3,
    explanation: "settings.local.json exists for personal preferences and experimentation within a project. Claude Code sets it up to be ignored by git, so individual overrides do not leak into the shared repository."
  },
  {
    id: "d3-q04",
    domain: 3,
    question: "An IT administrator wants to enforce organization-wide Claude Code policies on managed macOS devices so that individual users cannot override them. Which file should the administrator deploy?",
    options: [
      "~/.claude/settings.json on each user account",
      "/Library/Application Support/ClaudeCode/managed-settings.json",
      ".claude/settings.json pushed into every repository",
      "/etc/claude/enterprise.json"
    ],
    answer: 1,
    explanation: "Enterprise managed policy settings on macOS live in /Library/Application Support/ClaudeCode/managed-settings.json (with an equivalent system path on Linux and Windows). This file takes precedence over all user and project settings."
  },
  {
    id: "d3-q05",
    domain: 3,
    question: "A team lead wants every developer's Claude Code session to automatically know the project's build commands, code style conventions, and branch naming rules without anyone re-typing them. What is the recommended approach?",
    options: [
      "Add the information to each developer's ~/.claude/settings.json under a notes key",
      "Create a custom slash command that developers must run at the start of every session",
      "Commit a CLAUDE.md file at the repository root containing this guidance",
      "Configure a SessionStart hook that prints the conventions to the terminal"
    ],
    answer: 2,
    explanation: "CLAUDE.md is the project memory file: Claude Code automatically pulls it into context at the start of a session, making it the standard place for shared build commands, conventions, and workflow guidance. Committing it to the repo shares it with the whole team."
  },
  {
    id: "d3-q06",
    domain: 3,
    question: "A project's CLAUDE.md is getting long, and the team wants to pull in additional instruction files such as a separate style guide. How do CLAUDE.md imports work?",
    options: [
      "Use @path/to/file syntax (relative or absolute paths); imports can be nested up to a maximum depth of 5 hops",
      "Use an [include] section in .claude/settings.json listing extra memory files",
      "Use standard Markdown links; any linked .md file is automatically loaded into context",
      "Imports are not supported; all memory content must live in a single CLAUDE.md file"
    ],
    answer: 0,
    explanation: "CLAUDE.md supports imports with the @path syntax, accepting both relative and absolute paths, and imported files can recursively import others up to a maximum depth of 5 hops. Plain Markdown links do not trigger loading."
  },
  {
    id: "d3-q07",
    domain: 3,
    question: "A developer wants certain personal preferences, such as preferred shell idioms and a personal coding style, to apply in every project they open with Claude Code. Where should these instructions go?",
    options: [
      "In a CLAUDE.md committed to each repository they work in",
      "In the user memory file at ~/.claude/CLAUDE.md",
      "In the enterprise managed settings file",
      "In .claude/settings.local.json of their most-used project"
    ],
    answer: 1,
    explanation: "~/.claude/CLAUDE.md is the user-level memory file, loaded for all of that user's projects. Project CLAUDE.md files are shared with teammates and scoped to one repo, so they are the wrong place for personal, cross-project preferences."
  },
  {
    id: "d3-q08",
    domain: 3,
    question: "During an interactive session, a developer realizes Claude keeps forgetting that the project uses pnpm instead of npm and wants to record this quickly as a memory. What is the fastest built-in way to do this?",
    options: [
      "Run claude --remember \"use pnpm\" from another terminal",
      "Edit .claude/settings.json and add the note under a memory key",
      "Restart the session with the --append-system-prompt flag",
      "Start the input with the # character; Claude Code will prompt for which memory file to store the note in"
    ],
    answer: 3,
    explanation: "Beginning a message with # is the built-in shortcut for adding a memory: Claude Code asks which memory file (such as project or user memory) should store it. The /memory command can then be used to review or edit memory files."
  },
  {
    id: "d3-q09",
    domain: 3,
    question: "A developer has just opened Claude Code in a repository that has no CLAUDE.md yet. Which built-in command will analyze the codebase and bootstrap an initial CLAUDE.md?",
    options: [
      "/init",
      "/memory --create",
      "/setup",
      "/config claude-md"
    ],
    answer: 0,
    explanation: "The /init command inspects the project and generates a starter CLAUDE.md documenting things like build commands and code structure. /memory edits existing memory files but does not analyze the codebase to create one."
  },
  {
    id: "d3-q10",
    domain: 3,
    question: "A project's settings contain the permission rule Bash(npm run test:*) in the allow list. Which statement correctly describes what this rule permits?",
    options: [
      "Any Bash command that contains the word test anywhere in it",
      "Only the exact command npm run test with no arguments",
      "Bash commands beginning with npm run test, such as npm run test:unit, without prompting",
      "All npm commands, because the rule is evaluated per package manager"
    ],
    answer: 2,
    explanation: "In Bash permission rules, the :* suffix makes the rule a prefix match, so any command starting with npm run test is covered. Without :*, the rule would match only the exact command."
  },
  {
    id: "d3-q11",
    domain: 3,
    question: "A settings file contains both an allow rule and a deny rule that match the same tool call. How does Claude Code resolve the conflict?",
    options: [
      "The allow rule wins because allow rules are evaluated first",
      "The deny rule wins; deny rules take precedence over allow rules",
      "The rule defined later in the file wins",
      "Claude Code falls back to asking the user interactively"
    ],
    answer: 1,
    explanation: "Deny rules always take precedence over allow rules in Claude Code's permission evaluation. This makes deny lists reliable as guardrails even when broad allow rules exist."
  },
  {
    id: "d3-q12",
    domain: 3,
    question: "An architect wants Claude Code to explore an unfamiliar codebase and propose an implementation approach while guaranteeing that no files are modified and no state-changing commands run during the analysis. Which permission mode fits best?",
    options: [
      "default",
      "acceptEdits",
      "bypassPermissions",
      "plan"
    ],
    answer: 3,
    explanation: "Plan mode restricts Claude Code to read-only analysis: it can inspect the codebase and produce a plan but cannot edit files or execute mutating commands until the user approves moving forward. This makes it the safe choice for exploration and design work."
  },
  {
    id: "d3-q13",
    domain: 3,
    question: "A developer trusts Claude Code to make file edits during a refactoring session and does not want to approve each edit individually, but still wants other permission prompts (such as for new Bash commands) to behave normally. Which permission mode should they use?",
    options: [
      "acceptEdits, which automatically accepts file edit permissions for the session",
      "bypassPermissions, which skips only file-related prompts",
      "plan, which pre-approves edits described in the plan",
      "default with the --yes flag"
    ],
    answer: 0,
    explanation: "acceptEdits mode auto-accepts file edit permissions for the session while other permission checks continue to apply. bypassPermissions skips all permission prompts, not just file edits, which is broader than requested."
  },
  {
    id: "d3-q14",
    domain: 3,
    question: "A compliance team must ensure that no developer in the organization can ever run Claude Code in bypassPermissions mode, even with command-line flags. What is the supported way to enforce this?",
    options: [
      "Add \"bypassPermissions\": false to every project's .claude/settings.json",
      "Remove the --dangerously-skip-permissions flag by pinning an older CLI version",
      "Set \"disableBypassPermissionsMode\": \"disable\" in the permissions section of the enterprise managed settings file",
      "Add a deny rule for Bash(claude --dangerously-skip-permissions) in user settings"
    ],
    answer: 2,
    explanation: "The managed settings file supports disableBypassPermissionsMode set to \"disable\", which prevents bypassPermissions mode from being activated at all. Because managed settings outrank every other settings source, users cannot override it."
  },
  {
    id: "d3-q15",
    domain: 3,
    question: "A PreToolUse hook script detects that Claude is about to run a forbidden command. What should the script do so that the tool call is blocked and Claude receives feedback explaining why?",
    options: [
      "Print a warning to stdout and exit with code 0",
      "Write the reason to stderr and exit with code 2",
      "Exit with code 1, which is reserved for blocking tool calls",
      "Delete the pending tool call from the session transcript"
    ],
    answer: 1,
    explanation: "For hooks, exit code 2 is the blocking error code: the tool call is prevented and the hook's stderr is fed back to Claude so it can adjust. Exit code 0 indicates success, and other non-zero codes are non-blocking errors shown to the user."
  },
  {
    id: "d3-q16",
    domain: 3,
    question: "A team wants their code formatter to run automatically every time Claude Code writes or edits a file, so formatting is deterministic rather than dependent on Claude remembering an instruction. What is the recommended mechanism?",
    options: [
      "A PostToolUse hook with a matcher for Edit and Write tools that runs the formatter",
      "A CLAUDE.md rule stating that the formatter must be run after every change",
      "A PreToolUse hook that reformats the file before Claude edits it",
      "A custom slash command the developer runs after each edit"
    ],
    answer: 0,
    explanation: "Hooks provide deterministic, guaranteed execution, unlike CLAUDE.md instructions which the model may overlook. A PostToolUse hook matched on file-modifying tools runs the formatter immediately after each edit or write."
  },
  {
    id: "d3-q17",
    domain: 3,
    question: "Which statement correctly describes how Claude Code hooks are configured?",
    options: [
      "Hooks are defined in .claude/hooks.yaml using event names as top-level keys",
      "Hooks are registered at runtime with the claude hooks add command and stored in a database",
      "Hooks are Markdown files in .claude/hooks/ with frontmatter specifying the event",
      "Hooks are defined in settings files (user, project, or local) under a hooks key, where events like PreToolUse contain matchers and shell commands to run"
    ],
    answer: 3,
    explanation: "Hooks live in the settings files under a hooks key: each event (PreToolUse, PostToolUse, Stop, and so on) maps matchers (such as tool name patterns) to shell commands that Claude Code executes when the event fires."
  },
  {
    id: "d3-q18",
    domain: 3,
    question: "How does a hook script receive details about the event that triggered it, such as the tool name and tool input?",
    options: [
      "Through command-line arguments appended to the hook command",
      "By querying a local REST endpoint exposed by Claude Code",
      "As JSON delivered on the script's stdin, including fields like session_id, tool_name, and tool_input",
      "Through a temporary file whose path is set in the HOOK_PAYLOAD environment variable"
    ],
    answer: 2,
    explanation: "Claude Code passes hook input as JSON on stdin. The payload includes session metadata plus event-specific fields such as tool_name and tool_input, which scripts typically parse with a tool like jq or a small script."
  },
  {
    id: "d3-q19",
    domain: 3,
    question: "A team repeatedly asks Claude Code to generate a release-notes summary with a project-specific prompt. They want to invoke it as /release-notes v2.3 and have the version number injected into the prompt. How should they implement this?",
    options: [
      "Create .claude/commands/release-notes.md containing the prompt and reference the input with $ARGUMENTS",
      "Create .claude/agents/release-notes.md so the command appears in the slash menu",
      "Add a release-notes entry to the commands array in .claude/settings.json",
      "Define a UserPromptSubmit hook that rewrites messages starting with /release-notes"
    ],
    answer: 0,
    explanation: "Custom slash commands are Markdown files in .claude/commands/ whose filename becomes the command name. The $ARGUMENTS placeholder (or positional $1, $2) injects whatever the user types after the command."
  },
  {
    id: "d3-q20",
    domain: 3,
    question: "A developer has written a /standup slash command they want available in every project on their machine, without committing it to any repository. Where should the command file live?",
    options: [
      "In each project's .claude/commands/ directory",
      "In ~/.claude/commands/",
      "In ~/.claude/settings.json under a commands key",
      "In /usr/local/share/claude/commands/"
    ],
    answer: 1,
    explanation: "Personal slash commands stored in ~/.claude/commands/ are available across all of the user's projects, while .claude/commands/ inside a repository is for project-scoped commands shared with the team."
  },
  {
    id: "d3-q21",
    domain: 3,
    question: "What is the key behavioral difference between an Agent Skill and a custom slash command in Claude Code?",
    options: [
      "Skills can run shell commands, while slash commands cannot",
      "Slash commands are shared with the team, while skills are always personal",
      "Skills replace the system prompt, while slash commands append to the conversation",
      "A slash command is explicitly invoked by the user, while a skill is discovered and invoked by Claude itself when its description matches the task"
    ],
    answer: 3,
    explanation: "Skills are model-invoked: Claude reads each skill's description and loads the skill when it is relevant to the current task. Slash commands are user-invoked shortcuts typed explicitly into the prompt."
  },
  {
    id: "d3-q22",
    domain: 3,
    question: "A team defines a code-reviewer subagent in .claude/agents/code-reviewer.md. Which statement about how this subagent operates is accurate?",
    options: [
      "It shares the main conversation's context window, so the main thread sees every file it reads",
      "It runs on a separate machine configured through MCP",
      "It runs with its own separate context window and system prompt, returning results to the main conversation without polluting its context",
      "It can only be triggered by hooks, not by Claude or the user directly"
    ],
    answer: 2,
    explanation: "Subagents operate in their own context window with their own system prompt defined in the agent's Markdown file. This isolation keeps exploratory tool output out of the main conversation, which only receives the subagent's final result."
  },
  {
    id: "d3-q23",
    domain: 3,
    question: "A team wants their documentation-writer subagent to be unable to execute shell commands while still being able to read and edit files. How is this configured?",
    options: [
      "List only the permitted tools (e.g., Read, Edit) in the tools field of the subagent's frontmatter; omitting the field would grant it the full inherited tool set",
      "Add a deny rule for the subagent's name in .claude/settings.json",
      "Set sandbox: true in the subagent's frontmatter",
      "Subagent tool access cannot be restricted; all subagents share the main agent's tools"
    ],
    answer: 0,
    explanation: "A subagent's Markdown frontmatter supports a tools field listing exactly which tools it may use. When the field is omitted, the subagent inherits the full set of available tools, so explicitly listing tools is how access is narrowed."
  },
  {
    id: "d3-q24",
    domain: 3,
    question: "A team wants an MCP server for their internal issue tracker to be available automatically to everyone who clones the repository. Which approach achieves this?",
    options: [
      "Each developer runs claude mcp add with default settings after cloning",
      "Add the server with claude mcp add --scope project (or equivalent), which writes it to a .mcp.json file at the project root that is committed to source control",
      "Add the server to ~/.claude/settings.json and share the file over chat",
      "Declare the server in CLAUDE.md so Claude configures it on first run"
    ],
    answer: 1,
    explanation: "Project-scoped MCP servers are stored in .mcp.json at the repository root, which is designed to be checked into version control so the whole team shares the configuration. Local and user scopes are personal to one developer."
  },
  {
    id: "d3-q25",
    domain: 3,
    question: "A developer clones a repository that contains a .mcp.json file defining several MCP servers. What does Claude Code do before those servers can be used?",
    options: [
      "Starts them automatically, since committed configuration is implicitly trusted",
      "Ignores them unless the developer copies the entries into user settings",
      "Runs them in a network-isolated sandbox for the first session",
      "Prompts the developer to approve the project-scoped servers for security before using them"
    ],
    answer: 3,
    explanation: "For security, Claude Code asks the user to approve project-scoped MCP servers from .mcp.json before using them, since the file arrives from the repository rather than from the user's own configuration. Approval choices can be reset with claude mcp reset-project-choices."
  },
  {
    id: "d3-q26",
    domain: 3,
    question: "A developer runs claude mcp add github -- npx -y @modelcontextprotocol/server-github without specifying a scope, then later wants the same server available in all of their projects. Which statement is correct?",
    options: [
      "The default scope is user, so the server is already available everywhere",
      "The default scope is project, so the server was written to .mcp.json",
      "The default scope is local (available only to them in the current project); re-adding it with --scope user makes it available across all their projects",
      "Scopes only apply to remote SSE servers, not stdio servers"
    ],
    answer: 2,
    explanation: "claude mcp add defaults to local scope, which is private to the user within the current project. User scope (--scope user) makes a server available to that user in every project, while project scope shares it with the team via .mcp.json."
  },
  {
    id: "d3-q27",
    domain: 3,
    question: "What does running claude -p \"summarize the failing tests\" do?",
    options: [
      "Runs Claude Code in non-interactive (headless) mode: it processes the prompt, prints the result, and exits without opening the interactive UI",
      "Opens an interactive session with the prompt pre-filled for editing",
      "Runs the prompt in plan mode, since -p stands for plan",
      "Creates a persistent background process that watches the test suite"
    ],
    answer: 0,
    explanation: "The -p (print) flag runs Claude Code headlessly: the prompt is processed, output is printed to stdout, and the process exits. The -p flag selects print mode, not plan mode, and no interactive session or daemon is started."
  },
  {
    id: "d3-q28",
    domain: 3,
    question: "A platform engineer is wrapping claude -p in a script and needs to reliably parse the result, including metadata such as cost and session ID, rather than scraping free-form text. What should they use?",
    options: [
      "Pipe stdout through grep for known phrases",
      "Add --output-format json (or stream-json for incremental events) and parse the structured output",
      "Set the CLAUDE_OUTPUT=machine environment variable",
      "Use the --quiet flag so only the final answer is printed"
    ],
    answer: 1,
    explanation: "Headless mode supports --output-format json and stream-json, which emit structured output including the result and metadata like cost and session ID. This is the supported way to consume Claude Code output programmatically."
  },
  {
    id: "d3-q29",
    domain: 3,
    question: "A team wants Claude to respond to @claude mentions in GitHub issue and PR comments, implementing small fixes and answering questions about the code. What is the standard way to set this up?",
    options: [
      "Run claude -p in a cron-scheduled workflow that polls for new comments",
      "Install a webhook that forwards comments to a self-hosted MCP server",
      "Install the Claude GitHub App and add a workflow using the official claude-code-action with an Anthropic API key stored as a repository secret",
      "Enable GitHub integration in ~/.claude/settings.json with their repository URL"
    ],
    answer: 2,
    explanation: "The official integration uses Anthropic's GitHub Action (claude-code-action) together with the Claude GitHub App; the /install-github-app command in Claude Code can set this up. The API key is provided via a repository secret, and @claude mentions trigger the workflow."
  },
  {
    id: "d3-q30",
    domain: 3,
    question: "In a CI pipeline, claude -p is asked to run the test suite, but there is no human available to answer permission prompts. What is the recommended way to let it run exactly the commands the pipeline needs, and no more?",
    options: [
      "Permission prompts automatically default to allow after a timeout in headless mode",
      "Run with --permission-mode acceptEdits, which also pre-approves Bash commands",
      "Always use --dangerously-skip-permissions, as it is the only option in CI",
      "Pre-approve the specific tools with flags or settings, e.g. --allowedTools \"Bash(npm test:*)\", so only those commands run without prompting"
    ],
    answer: 3,
    explanation: "In non-interactive mode there is no one to answer prompts, so tools that are not pre-approved cannot be used. Granting only the needed permissions via --allowedTools (or allow rules in settings) follows least privilege; skipping all permissions should be reserved for isolated, sandboxed environments."
  },
  {
    id: "d3-q31",
    domain: 3,
    question: "A developer wants to have Claude Code work on two independent features of the same repository simultaneously, without the two tasks interfering with each other's files or git state. What is the recommended workflow?",
    options: [
      "Create a git worktree for each feature and run a separate Claude Code session in each worktree",
      "Run two Claude Code sessions in the same directory and tell each one which files to avoid",
      "Use /fork inside a single session to split it into two parallel branches",
      "Clone the repository into itself as a nested submodule for the second task"
    ],
    answer: 0,
    explanation: "Git worktrees give each task its own working directory and branch while sharing one repository, so independent Claude Code sessions can proceed in isolation. Two sessions sharing one directory would race on files and git state."
  },
  {
    id: "d3-q32",
    domain: 3,
    question: "Which statement accurately describes Claude Code's git and GitHub capabilities in a typical workflow?",
    options: [
      "Claude Code can read files but delegates all git operations to the IDE integration",
      "Claude Code can search git history, create commits with descriptive messages, resolve merge conflicts, and create pull requests using the gh CLI when asked",
      "Claude Code manages git through a built-in MCP server that must be enabled in .mcp.json",
      "Claude Code automatically commits after every file edit unless hooks prevent it"
    ],
    answer: 1,
    explanation: "Claude Code performs git operations through ordinary shell commands: it can explore history, commit, and handle conflicts, and it uses the gh CLI for GitHub tasks such as opening pull requests. It commits when the user asks, not automatically after every edit."
  },
  {
    id: "d3-q33",
    domain: 3,
    question: "Midway through an interactive session, a developer wants to switch from a faster, cheaper model to a more capable one for a tricky refactor. What is the simplest way to do this without losing the session?",
    options: [
      "Exit and restart the CLI with the ANTHROPIC_MODEL environment variable set",
      "Edit the model field in .claude/settings.json and wait for hot reload",
      "Use the /model command in the session to select a different model",
      "Models cannot change mid-session; a new conversation is required"
    ],
    answer: 2,
    explanation: "The /model slash command switches the active model within the current interactive session. Environment variables, the --model flag, and the model setting also control model choice, but they apply at startup rather than mid-session."
  },
  {
    id: "d3-q34",
    domain: 3,
    question: "A developer on a long session notices responses slowing down and wants to check what the session has consumed so far and then shrink the context while keeping a summary of the work. Which pair of built-in commands addresses this?",
    options: [
      "/usage to see spend and /clear to summarize the conversation",
      "/tokens to see usage and /trim to shrink context",
      "/stats for usage and /reset --keep-summary for context",
      "/cost to review session token usage and /compact to summarize the conversation and reduce context size"
    ],
    answer: 3,
    explanation: "/cost reports the current session's token usage statistics, and /compact replaces the conversation history with a summary (optionally guided by instructions), reducing context size while preserving key information. /clear wipes history entirely without summarizing."
  },
  {
    id: "d3-q35",
    domain: 3,
    question: "Which of the following is a real feature of Claude Code's IDE integrations for VS Code and JetBrains?",
    options: [
      "Lint and syntax diagnostics from the IDE are shared with Claude automatically, and code changes can be viewed in the IDE's diff viewer",
      "Claude Code replaces the IDE's built-in terminal with its own shell implementation",
      "The integration requires a separate subscription from the Claude Code CLI",
      "The IDE plugin only works when the repository is hosted on GitHub"
    ],
    answer: 0,
    explanation: "The IDE integrations share editor context such as current selection and diagnostics with Claude, support viewing Claude's changes in the IDE diff viewer, and offer a quick-launch shortcut (Cmd+Esc / Ctrl+Esc). They do not replace the terminal, cost extra, or depend on GitHub hosting."
  },
  {
    id: "d3-q36",
    domain: 3,
    question: "A developer previously used CLAUDE.local.md for personal, repo-specific instructions but works heavily with git worktrees and finds the file missing in new worktrees. What does the official guidance recommend instead?",
    options: [
      "Symlink CLAUDE.local.md into each worktree with a post-checkout script",
      "Use an import in the checked-in CLAUDE.md that references a file in the developer's home directory (e.g., @~/.claude/my-project-instructions.md), since imports work across all worktrees",
      "Commit the personal instructions to the shared CLAUDE.md with a 'personal' heading",
      "Move the instructions into .claude/settings.local.json under an instructions key"
    ],
    answer: 1,
    explanation: "CLAUDE.local.md is deprecated in favor of imports: a checked-in CLAUDE.md can import a file from the user's home directory, which works in every checkout and worktree of the repository. Settings files hold configuration, not memory instructions."
  }
);
