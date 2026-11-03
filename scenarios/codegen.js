/* Code Generation with Claude Code — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    id: "sc-codegen-001",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "You need to add Slack as a new notification channel, and the existing codebase has clear, consistent patterns for email, SMS and push channels. The Slack API offers fundamentally different integration approaches: incoming webhooks (simple, one-way), bot tokens (delivery confirmation and programmatic control), or Slack Apps (bidirectional events, workspace approval required). Your ticket only says 'add Slack support' without naming a method or saying whether delivery tracking will be needed. How should you approach this task?",
    options: [
      "Start direct execution using incoming webhooks so the new channel matches the existing one-way notification pattern.",
      "Enter plan mode to explore the integration options and their architectural implications, then recommend one before implementing.",
      "Start direct execution using the bot token approach so that delivery confirmation is available from day one.",
      "Start direct execution to scaffold a Slack channel class from the existing channel patterns, deferring the integration method decision."
    ],
    answer: 1,
    optionNotes: [
      "Choosing incoming webhooks resolves the ticket's ambiguity by assumption and silently rules out delivery tracking that the ticket neither requires nor excludes. Matching the one-way pattern is a reasonable default, but it is an architectural decision that should be surfaced rather than buried in code.",
      "The integration has several valid approaches with different architectural consequences and the requirements are ambiguous. Plan mode lets Claude explore the codebase and the trade-offs read-only and present a recommendation the team can agree on before any files change.",
      "Bot tokens commit unilaterally to the heavier option, adding token management and workspace scoping for a delivery-confirmation feature nobody has asked for. Picking the most capable option is still picking without the alignment the trade-offs warrant.",
      "The integration method shapes the class interface: a webhook channel is fire-and-forget, while bot tokens or a Slack App add confirmation handling and inbound events. Scaffolding first does not defer the decision; it embeds a one-way assumption that later has to be reworked."
    ],
    explanation: "Plan mode fits tasks with multiple valid approaches, architectural consequences and unclear requirements. Exploring the options read-only and presenting a recommendation avoids committing code to an assumption the team has not agreed on.",
    source: "mock1-q018"
  },
  {
    id: "sc-codegen-002",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "You are adding error-handling wrappers to external API calls across a 120-file codebase in three phases: discover every call site, design the approach together with Claude, then implement the wrappers consistently. During discovery Claude produces verbose output listing hundreds of call sites with surrounding code. Your context window is filling rapidly before discovery is even finished. What is the most effective way to complete the work while keeping the implementation consistent?",
    options: [
      "Use the Explore subagent for discovery so the verbose output stays in its own context and only a summary returns, then design and implement in the main conversation.",
      "Continue all three phases in the main conversation, running /compact periodically to reduce context usage as you progress through the files.",
      "Define the error-handling pattern in CLAUDE.md, then process files in batches across several sessions, relying on the shared memory file for consistency.",
      "Switch to headless mode with --continue, passing explicit context summaries between batch invocations to keep continuity across the files."
    ],
    answer: 0,
    optionNotes: [
      "A subagent runs in its own context window, so the hundreds of call sites never enter the main conversation; only a concise summary comes back. The main context stays free for the collaborative design and consistent implementation phases, where retained context matters most.",
      "The call sites still enter the main context before /compact runs, so this cleans up after the overflow instead of preventing it. Compaction is lossy and may drop the discovery details the design and implementation phases depend on.",
      "CLAUDE.md carries the written pattern but not the reasoning from the design discussion, so each new session restarts without it. Spread across 120 files and many sessions, that lost context is where inconsistent wrappers creep in.",
      "Headless runs with --continue suit automation rather than interactive design work, and hand-passing summaries between invocations adds overhead and loss that a subagent avoids automatically."
    ],
    explanation: "Verbose discovery is the classic case for delegating to a subagent: its output stays in a separate context and only the distilled result returns. That preserves the main session's context for the phases that need continuity.",
    source: "mock1-q019"
  },
  {
    id: "sc-codegen-003",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your team wants to add a GitHub MCP server so Claude Code can look up pull requests and CI status. Each of the six developers has their own GitHub personal access token. You want every developer to get the same tooling automatically when they pull the repository, and no credential may ever be committed to version control. What is the most effective configuration approach?",
    options: [
      "Configure the server in project scope with a placeholder token value, then have each developer override it in their own local scope configuration.",
      "Add the server to a project-scoped .mcp.json that uses ${GITHUB_TOKEN} expansion for authentication, and document the variable in the README.",
      "Create a small MCP wrapper server that reads each developer's token from a local .env file and proxies requests to the GitHub API, then register it in .mcp.json.",
      "Have each developer add the server in user scope with claude mcp add --scope user, using their own token on their own machine."
    ],
    answer: 1,
    optionNotes: [
      "A committed placeholder invites developers to edit the tracked .mcp.json and accidentally commit a real token, and the checked-in value is wrong by design. Environment variable expansion supplies each token without a placeholder to overwrite.",
      "A project-scoped .mcp.json is checked in, so everyone gets the same server definition, and Claude Code expands ${GITHUB_TOKEN} from each developer's environment in fields such as env, headers and url. Documenting the variable makes onboarding easy without ever committing a secret.",
      "A proxy wrapper duplicates what the GitHub MCP server already does, adds a component the team must maintain, and still needs each developer to populate .env. Native variable expansion gives the same isolation with no extra code.",
      "User scope stores the server privately in each developer's ~/.claude.json, so six setups drift and nothing is version-controlled. That fails the requirement for consistent tooling delivered through the repository."
    ],
    explanation: "Project scope (.mcp.json) is the shared, version-controlled MCP configuration, and ${VAR} expansion keeps per-developer secrets out of it. Each developer exports their own token and the same committed file works for everyone.",
    source: "mock1-q030"
  },
  {
    id: "sc-codegen-004",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "You want to create a custom /review command that runs your team's standard code review checklist. The command should be available to every developer as soon as they clone or pull the repository, with no manual setup on their machines. Two developers have already tried keeping private copies and their checklists have drifted apart. Where should you create the command file?",
    options: [
      "In the CLAUDE.md file at the project root, under a Commands heading",
      "In the .claude/commands/ directory inside the project repository",
      "In a .claude/config.json file that declares a commands array with the checklist",
      "In ~/.claude/commands/ in each developer's home directory"
    ],
    answer: 1,
    optionNotes: [
      "CLAUDE.md carries project context and standing instructions; prose written there does not register an invocable /review command.",
      "Files in the project's .claude/commands/ (or an equivalent .claude/skills/review/SKILL.md) are version-controlled, so every clone or pull delivers the same /review command to the whole team.",
      "Claude Code has no commands array in a .claude/config.json file; commands and skills are discovered as markdown files in their own directories, so this would never register.",
      "~/.claude/commands/ is the personal scope and sits outside the repository, so cloning delivers nothing and each developer keeps a private copy, which is exactly how the checklists drifted."
    ],
    explanation: "Project-scoped commands live in the repository's .claude/commands/ directory (custom commands are now part of skills, so .claude/skills/<name>/SKILL.md works the same way). Committing the file shares one definition with everyone who pulls the repository.",
    source: "mock1-q031"
  },
  {
    id: "sc-codegen-005",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "You have been assigned to restructure the team's monolithic application into microservices. The work will touch dozens of files, and the service boundaries and module dependencies have not been decided yet. A colleague suggests just starting and seeing how far Claude gets in an afternoon. Which approach should you take with Claude Code?",
    options: [
      "Use direct execution with comprehensive upfront instructions that detail exactly how each service should be structured.",
      "Begin in direct execution mode and switch to plan mode only if you run into unexpected complexity partway through the implementation.",
      "Enter plan mode to explore the codebase, map the dependencies and design the approach before any files change.",
      "Start with direct execution and make changes incrementally, letting the implementation itself reveal where the natural service boundaries are."
    ],
    answer: 2,
    optionNotes: [
      "Detailed upfront instructions presuppose that boundaries and dependencies are settled, but those are exactly the open decisions. Without exploring the code first, the instructions encode guesses that then spread across dozens of files.",
      "The complexity is known at the outset: dozens of files and unresolved boundary decisions. Waiting to be surprised means edits are already spread across the monolith and must be unwound before a coherent design can be applied.",
      "Plan mode lets Claude read the codebase and analyse dependencies without editing, then propose a design you can review. For an architectural change with open decisions across many files, that moves the costly discovery before any change is made.",
      "Letting boundaries emerge from edits means many files are modified before the dependency graph is understood, so wrong cuts are discovered as rework rather than as a cheap revision to a plan."
    ],
    explanation: "Large, multi-file changes with unresolved architectural decisions are the clearest case for plan mode. Exploring and designing first is far cheaper than discovering a bad boundary after dozens of files have been edited.",
    source: "mock1-q033"
  },
  {
    id: "sc-codegen-006",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your team has used Claude Code for several months. Three developers report that Claude reliably follows the 'always include comprehensive error handling' guideline, but a developer who joined last week says Claude ignores it. All four work in the same repository and have the latest code pulled. What is the most likely cause and the appropriate fix?",
    options: [
      "Claude Code builds a preference model for each user over time, so the new developer must keep restating the requirement until Claude learns it.",
      "The guideline lives in the original developers' ~/.claude/CLAUDE.md files rather than the project CLAUDE.md; move it to the project-level file.",
      "The new developer's ~/.claude/CLAUDE.md contains conflicting instructions that override the project settings; have them remove that section.",
      "Claude Code caches CLAUDE.md after the first read, so the original developers have an older cached copy; have everyone clear the Claude Code cache."
    ],
    answer: 1,
    optionNotes: [
      "Claude Code does not learn per-user preferences from repetition; persistent guidance comes from instruction files. Restating the rule each session is manual re-instruction that would never reach the next new hire.",
      "User-level ~/.claude/CLAUDE.md applies only on that developer's machine and is never shared through version control. A guideline that works for exactly the long-standing developers points there; moving it to the committed project CLAUDE.md gives it to everyone.",
      "Nothing suggests the new developer wrote conflicting instructions, and CLAUDE.md files are concatenated rather than one overriding another. This also fails to explain why the rule works for exactly the three long-standing developers.",
      "There is no cross-session CLAUDE.md cache to clear; files are read when a session loads them. With the latest code pulled, all four see the same project file, so caching cannot explain the difference."
    ],
    explanation: "When a convention works for some team members and not others in the same repository, suspect user-level configuration. Team standards belong in the project-level CLAUDE.md, which every clone receives.",
    source: "mock1-q034"
  },
  {
    id: "sc-codegen-007",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your codebase has distinct conventions by area: React components use functional style with hooks, API handlers use async/await with a specific error pattern, and database models follow a repository pattern. Test files sit next to the code they test throughout the tree (Button.test.tsx beside Button.tsx), and every test should follow the same conventions wherever it lives. What is the most maintainable way to make Claude apply the right conventions automatically when generating code?",
    options: [
      "Place a separate CLAUDE.md in each subdirectory containing that area's conventions, including a copy of the test conventions",
      "Create rule files in .claude/rules/ whose paths frontmatter lists glob patterns such as **/*.test.tsx and src/api/**/*.ts",
      "Consolidate all conventions in the root CLAUDE.md under one heading per area, relying on Claude to infer which section applies",
      "Create a skill in .claude/skills/ for each kind of code, putting the relevant conventions in each SKILL.md"
    ],
    answer: 1,
    optionNotes: [
      "Per-directory files break down on the cross-cutting case: because tests live beside their sources everywhere, the test conventions must be copied into every directory that has a test, and the copies drift.",
      "A rule with a paths field loads when Claude reads or edits a matching file, wherever it is in the tree. One rule for **/*.test.tsx covers every scattered test file, and area rules cover their own globs, with no duplication.",
      "One root file loads every convention for every task and asks Claude to judge which section applies, so React guidance can leak into API handlers and scattered tests get no reliable trigger.",
      "Skills load when Claude judges that a task matches the skill description, or when invoked; they are not reliably attached to the file being edited, so test conventions may not apply when Button.test.tsx is touched."
    ],
    explanation: "Path-scoped rules in .claude/rules/ attach conventions to file patterns rather than directories, which handles cross-cutting files such as co-located tests. Directory CLAUDE.md files suit conventions that belong to one subtree.",
    source: "mock1-q035"
  },
  {
    id: "sc-codegen-008",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your CLAUDE.md has grown past 400 lines covering coding standards, testing conventions, a detailed PR review checklist, the deployment workflow and database migration procedures. Claude should always follow the coding standards and testing conventions. The PR review, deployment and migration guidance should only come into play when someone is actually doing those tasks. What is the most effective restructuring?",
    options: [
      "Keep everything in CLAUDE.md but use @import to split it into separately maintained files by category",
      "Split CLAUDE.md into .claude/rules/ files with path globs so each rule loads only for matching file types",
      "Move all guidance into skills organised by workflow, keeping only a brief project description in CLAUDE.md",
      "Keep universal standards in CLAUDE.md and turn PR review, deployment and migrations into on-demand skills"
    ],
    answer: 3,
    optionNotes: [
      "Imports help organise a long file but do not reduce its context cost, because imported files load together with the CLAUDE.md that imports them. All the task-specific guidance would still load in every session.",
      "Path globs condition on the files being touched, not on the workflow being performed. A PR review or a deployment does not correspond to a particular file type, so this misapplies path matching.",
      "Moving the coding standards and testing conventions into skills makes them conditional on invocation, which contradicts the requirement that they always apply.",
      "CLAUDE.md loads in every session, which suits always-on standards, while skills load only when invoked or when Claude judges a task matches their description. That is the always-on versus on-demand split the requirement describes."
    ],
    explanation: "Put guidance that must always apply in CLAUDE.md and package task-specific workflows as skills that load on demand. This keeps the always-loaded context small without losing the specialised procedures.",
    source: "mock1-q036"
  },
  {
    id: "sc-codegen-009",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "Your team created an /analyze-codebase skill that performs dependency scanning, test coverage calculation and code quality metrics. After running it, team members report that Claude becomes sluggish and loses track of the task they were working on before the analysis. Nobody wants to cut back what the analysis covers. What is the most effective fix that keeps the full analysis?",
    options: [
      "Add instructions to the skill telling Claude to compress all of its output into a brief summary before displaying anything",
      "Split the skill into three smaller skills that each run one part of the analysis and produce less output",
      "Add model: haiku to the skill frontmatter so a faster, cheaper model performs the analysis",
      "Add context: fork to the skill frontmatter so the analysis runs in an isolated subagent context"
    ],
    answer: 3,
    optionNotes: [
      "The raw scan, coverage and metrics output still passes through the main conversation before any summarising instruction acts, so the context is already consumed, and instruction-based compression discards detail unreliably.",
      "Three skills produce the same total output, all of which still lands in the main session. The problem is where the output accumulates, not how many invocations produce it.",
      "Changing the model affects speed and cost, not the volume of analysis text filling the main context, and a smaller model may weaken the analysis the team wants to keep.",
      "With context: fork the skill runs in a forked subagent with its own context window, and only its result returns to the main session. The full analysis still runs, but its working output no longer crowds out the original task."
    ],
    explanation: "context: fork isolates a verbose skill in its own subagent context. The main conversation receives the distilled result, so it stays responsive and keeps track of the user's task.",
    source: "mock1-q037"
  },
  {
    id: "sc-codegen-010",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your team's CLAUDE.md has grown past 500 lines, mixing TypeScript conventions, testing guidelines, API patterns and deployment procedures. Developers struggle to find and update the right section, and edits by different owners keep colliding in the same file. You want each topic maintained in its own focused file that Claude Code still loads as instructions. What does Claude Code support for this?",
    options: [
      "Define a .claude/config.yaml file that maps file patterns to specific sections within CLAUDE.md",
      "Split the instructions into README.md files in relevant subdirectories, which Claude loads automatically as instructions",
      "Create separate markdown files in .claude/rules/, one per topic, such as testing.md and api-conventions.md",
      "Create several CLAUDE.md files at different directory levels, each one overriding its parent's instructions"
    ],
    answer: 2,
    optionNotes: [
      "Claude Code has no .claude/config.yaml mapping patterns to sections of CLAUDE.md, and the 500-line file would remain intact anyway.",
      "README.md files are ordinary documentation and are not loaded automatically as instructions, so moving guidance there would silently stop it reaching Claude.",
      "Claude Code discovers every .md file under .claude/rules/ (recursively), so each topic can live in its own file with its own owner. Files without a paths field load in every session like CLAUDE.md; adding paths scopes a topic to matching files.",
      "Nested CLAUDE.md files are concatenated with their parents rather than overriding them, and they organise guidance by directory rather than by topic; deployment procedures have no natural directory."
    ],
    explanation: "The .claude/rules/ directory is the modular alternative to one large CLAUDE.md: one topic per file, discovered automatically, optionally path-scoped. It keeps the same content available while making ownership and maintenance easier.",
    source: "mock1-q038"
  },
  {
    id: "sc-codegen-011",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "You found that giving Claude two or three full exemplar endpoint implementations as context greatly improves consistency when it generates new API endpoints. That context is only useful when creating new endpoints, not for bug fixes, code reviews or other work in the API directory, where it just wastes context. Developers create new endpoints a few times a week. What is the most efficient configuration?",
    options: [
      "Create a skill that references the exemplar endpoints and includes pattern-following instructions, run on demand with its slash command.",
      "Reference the exemplar endpoints manually in each generation request by copying the relevant code into your prompt.",
      "Configure a path-specific rule in .claude/rules/ that includes the exemplar code and activates for files in the API directory.",
      "Add the exemplar endpoint code with pattern documentation to the project CLAUDE.md file so it is always available."
    ],
    answer: 0,
    optionNotes: [
      "A skill loads its content only when invoked, so the exemplars enter context exactly when a new endpoint is being created and stay out of bug fixes and reviews. It is shared and versioned with the repository.",
      "Pasting exemplars into each prompt does keep them task-scoped, but it is unrepeatable manual work that drifts as the exemplars change and gives the team no shared definition.",
      "A path-scoped rule loads whenever Claude touches a matching API file, including during bug fixes and reviews, which is exactly where the exemplars are not wanted.",
      "Project CLAUDE.md loads in every session, so full endpoint implementations would consume context during all unrelated work."
    ],
    explanation: "Task-specific reference material belongs in an on-demand skill, not in always-loaded or path-triggered instructions. The skill brings in the exemplars only for the task that benefits from them.",
    source: "mock1-q039"
  },
  {
    id: "sc-codegen-012",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "Your team maintains a /commit skill in .claude/skills/commit/SKILL.md. One developer wants a personal variant with a different message format and extra checks. They still want to run the team's /commit on shared branches, and nothing they do may change what teammates get. What should you recommend?",
    options: [
      "Create a personal skill at ~/.claude/skills/commit/SKILL.md using the same name as the team skill",
      "Set override: true in a personal skill's frontmatter so it takes precedence only when they want it to",
      "Add username-based conditional logic to the frontmatter of the shared project skill",
      "Create a personal skill in ~/.claude/skills/ under a different name, such as /my-commit"
    ],
    answer: 3,
    optionNotes: [
      "Personal skills take precedence over project skills with the same name, so this would silently shadow the team's /commit for this developer, and they could no longer run the team version.",
      "Skill frontmatter has no override field; precedence between personal and project skills is fixed by location, not toggled per invocation.",
      "Frontmatter is static metadata with no per-user conditionals, and editing the shared skill changes what every teammate runs.",
      "A distinct name in the personal skills directory lives alongside the team skill: /my-commit runs the variant and /commit still runs the team version, and nothing in the repository changes."
    ],
    explanation: "When skills share a name, enterprise beats personal and personal beats project, so a same-name personal skill hides the team one. Giving the personal variant its own name keeps both available.",
    source: "mock1-q040"
  },
  {
    id: "sc-codegen-013",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "Your team's /migration skill generates database migration files and takes a migration name through $ARGUMENTS. Three problems have appeared: developers often run it without an argument and get badly named files, it sometimes pulls schema details from unrelated earlier discussion in the session, and once it ran a destructive test cleanup through the shell. Which configuration addresses all three?",
    options: [
      "Add instructions to SKILL.md telling Claude to check that $ARGUMENTS holds a valid name, to ignore earlier conversation, and to avoid destructive operations.",
      "Add argument-hint to show the expected name, set context: fork to isolate execution, and list Bash in disallowed-tools so the shell is unavailable.",
      "Use positional $0 and $1 instead of $ARGUMENTS, reference the schema files with @ syntax, and warn about destructive operations in the description.",
      "Split it into /migration-create and /migration-apply, ask for a name in each SKILL.md if none is given, and pre-approve different tools in each."
    ],
    answer: 1,
    optionNotes: [
      "All three fixes are soft guidance: telling Claude to ignore earlier conversation does not remove it from context, and asking it to avoid destructive commands does not take the shell away.",
      "argument-hint shows the expected argument during autocomplete, context: fork runs the skill in a forked subagent that does not see the earlier conversation, and disallowed-tools removes Bash from Claude's tools while the skill is active, so the cleanup cannot run.",
      "Positional arguments still bind to whatever was typed, @ references add context rather than isolating it, and a description warning enforces nothing.",
      "Splitting the skill does nothing about context bleed, a name request in SKILL.md is soft guidance, and pre-approving tools (allowed-tools) grants permission without restricting anything."
    ],
    explanation: "Each problem maps to a frontmatter control: argument-hint for the expected input, context: fork for isolation and disallowed-tools for a hard tool restriction. Note that allowed-tools only pre-approves tools; it does not stop other tools being used.",
    source: "mock1-q041"
  },
  {
    id: "sc-codegen-014",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "You asked Claude Code to implement a function that transforms API responses into a normalised internal format. After two iterations the output still does not match expectations: some fields are nested differently and timestamps are formatted wrongly. You have been describing the requirements in prose, and Claude interprets them a little differently each time. What is the most effective approach for the next iteration?",
    options: [
      "Rewrite the requirements with more technical precision, spelling out exact field mappings, nesting rules and timestamp format strings.",
      "Ask Claude to explain its current interpretation of the requirements so you can find where its understanding diverges from yours.",
      "Write a JSON schema for the expected output structure and validate Claude's output against it after each iteration.",
      "Provide two or three concrete input-output examples showing the expected transformation for representative API responses."
    ],
    answer: 3,
    optionNotes: [
      "Two prose rounds have already been read differently, so a third keeps the same ambiguous medium; a described nesting rule still has to be interpreted before it can be applied.",
      "Eliciting Claude's interpretation is a diagnostic round trip that ends with prose to patch again; it gives no unambiguous target for the next attempt.",
      "A schema checks structure after the fact but does not convey the transformation logic, such as how timestamps should be formatted, so it verifies rather than clarifies.",
      "Concrete input-output pairs show exactly how each field should be nested and how timestamps should look, removing the ambiguity that prose kept reintroducing."
    ],
    explanation: "When prose descriptions are interpreted inconsistently, concrete input-output examples are the most effective refinement tool. They give Claude an unambiguous target for every transformation rule at once.",
    source: "mock1-q048"
  },
  {
    id: "sc-codegen-015",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "A nightly CI job asks Claude Code to propose tests for changed modules. The suggestions are consistently low value: they duplicate brittle snapshots, mock helpers the repository already provides, and ignore the team rule of preferring behaviour tests over implementation details. The job runs on ephemeral runners, so no developer's local preferences are present. What change would most improve the quality and consistency of the suggestions?",
    options: [
      "Commit project-level CLAUDE.md guidance describing what makes a valuable test, the fixture conventions and the reusable helpers.",
      "Store the preferred testing style in ~/.claude/CLAUDE.md on the maintainer's laptop and copy good outputs into pull requests.",
      "Add a prompt line asking Claude to be conservative and avoid unnecessary tests whenever it reviews changed files in CI.",
      "Exclude existing test files from the CI context so that Claude infers what coverage is needed from the product code alone."
    ],
    answer: 0,
    optionNotes: [
      "A committed CLAUDE.md is part of the checkout, so Claude Code on every ephemeral runner loads the same repository-specific testing standards, fixtures and helpers.",
      "User-level memory exists only on that laptop and never reaches the CI runners, and manual copying defeats the automated workflow.",
      "Asking for conservatism does not say which tests are valuable or which helpers to reuse; it may reduce volume without improving relevance.",
      "Hiding existing tests removes the evidence Claude needs to avoid duplicates and follow the established patterns."
    ],
    explanation: "Automated Claude Code runs need the same durable project context a developer relies on, and the project CLAUDE.md delivers it through the repository. User-level files and vague prompt tweaks do not reach CI or define the team's standards.",
    source: "pt2-q011"
  },
  {
    id: "sc-codegen-016",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your repository has separate frontend, backend and data packages. Each package has a maintainer-owned standards document that changes monthly, but Claude Code currently gets a 900-line root instruction file with copied sections covering every package. Developers see inconsistent behaviour because irrelevant conventions appear in context, and the copies fall out of date. What is the most maintainable change?",
    options: [
      "Keep all standards in the root CLAUDE.md and add stronger headings telling Claude to ignore the sections for other packages.",
      "Give each package a small CLAUDE.md that @imports its canonical standards document, keeping the shared root guidance minimal.",
      "Duplicate the current standards into a CLAUDE.md in every package subdirectory and assign maintainers to update the copies.",
      "Move package standards into each developer's ~/.claude/CLAUDE.md so individuals can customise package guidance locally."
    ],
    answer: 1,
    optionNotes: [
      "The monolithic file keeps loading every package's conventions, and headings asking Claude to ignore sections rely on inference rather than scoping.",
      "A package CLAUDE.md loads when Claude works in that package, and @import pulls in the maintainer's canonical document, so there is one source of truth and other packages' rules stay out of context.",
      "More copies mean more drift; manual synchronisation is the failure already being observed.",
      "User-level files are not shared through the repository, so team behaviour would diverge and the standards would leave version control."
    ],
    explanation: "Subdirectory CLAUDE.md files scope guidance to the package being worked on, and @imports reference canonical documents instead of copying them. Together they cut irrelevant context and eliminate copy drift.",
    source: "pt2-q012"
  },
  {
    id: "sc-codegen-017",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "Your /migrate-to-new-logger command uses a coordinator that launches subagents to scan packages and propose edits. In a dry run, the plan said the legacy logger appears only in billing and notifications. Reviewers later found the auth package was never scanned because a subagent hit a path permission error, while the reporting subagent scanned cleanly and found nothing; the coordinator saw both as 'no findings'. What change would most improve the reliability of future plans?",
    options: [
      "Treat every subagent result without code references as a success, and rely on human reviewers to catch any packages that were missed.",
      "Ask each subagent to describe any failures in natural language, letting the coordinator infer whether an empty result means clean code.",
      "Have subagents report a successful empty search separately from an access failure, including the paths tried, partial results and next steps.",
      "Terminate the whole migration workflow whenever any package scan fails, discarding the successful findings from the other subagents."
    ],
    answer: 2,
    optionNotes: [
      "Converting failures into apparent clean results hides coverage gaps and stops the coordinator from retrying or flagging them.",
      "Prose summaries leave the coordinator guessing whether 'nothing found' means clean or unscanned, which is the confusion that caused the miss.",
      "Distinguishing 'scanned, no matches' from 'could not scan' with structured context lets the coordinator retry, reroute or mark the plan with an explicit coverage gap.",
      "Aborting on one local failure throws away valid work; the coordinator should get enough context to decide whether to retry, continue with caveats or escalate."
    ],
    explanation: "Subagents must distinguish a valid empty result from a failure and propagate failures with actionable context. Only then can the coordinator recover locally or annotate its output honestly instead of treating unscanned code as clean.",
    source: "pt2-q020"
  },
  {
    id: "sc-codegen-018",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your monorepo stores database migration files in several unrelated locations: service folders, package folders and an importer tool. Every migration must follow the same rollback, idempotency and naming conventions. Local instruction files near some migration folders keep missing new locations, and putting the guidance in the root CLAUDE.md makes Claude apply migration advice during unrelated edits. What is the most maintainable configuration?",
    options: [
      "Create a .claude/rules/ migration file whose paths patterns match every migration location, so it loads only for those files.",
      "Create a migration skill that developers invoke by hand before they edit database migration files in each package.",
      "Put the migration conventions in the root CLAUDE.md and tell Claude to ignore them whenever it edits non-migration files.",
      "Copy an identical CLAUDE.md into every current migrations directory and update the copies by hand as packages change."
    ],
    answer: 0,
    optionNotes: [
      "A path-scoped rule loads when Claude reads or edits a file matching its globs, wherever that file lives, so one rule covers every migration location without adding noise to unrelated edits.",
      "A manually invoked skill depends on developers remembering it, whereas the requirement is automatic application whenever migration files are touched.",
      "Root CLAUDE.md loads for every task, so the advice still sits in context during unrelated work, and asking Claude to ignore it relies on inference.",
      "Copies drift and new migration directories are easy to miss, which is the failure already observed."
    ],
    explanation: "Conventions that follow a file pattern across unrelated directories belong in a path-scoped rule. It loads automatically for matching files and stays out of context otherwise.",
    source: "pt2-q026"
  },
  {
    id: "sc-codegen-019",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "A three-month pilot dashboard shows 96% reviewer acceptance for artifacts generated with Claude Code. Review notes show most accepted outputs are README edits and changelogs, while rejections cluster in OpenAPI response schemas and migration rollback notes. Leadership now wants to stop manual review for any output where Claude reports confidence above 0.9. What is the most reliable next step?",
    options: [
      "Increase the overall random sample for two more sprints, then decide using the combined acceptance rate across all artifacts.",
      "Have reviewers check only low-confidence outputs, since high-confidence results have already passed the aggregate evaluation.",
      "Adopt the 0.9 threshold globally, then monitor incidents and turn review back on if production defects start to increase.",
      "Break the validation results down by artifact category and field, then reduce review only for segments that are consistently reliable."
    ],
    answer: 3,
    optionNotes: [
      "A bigger pooled sample is still dominated by easy README and changelog edits; the issue is that reliability varies by segment, not that there is too little data.",
      "Self-reported confidence is not accuracy until it is calibrated, and this removes review from the very areas where rejections cluster.",
      "A global, uncalibrated threshold lets the known weak segments bypass review, and waiting for production defects is purely reactive.",
      "Segmenting by artifact type and field reveals where the 96% hides weak spots, so review can be reduced where data shows reliability and kept for schemas and rollback notes."
    ],
    explanation: "Aggregate acceptance can mask poor performance in specific categories. Decide where to reduce human review from segmented, labelled results, not from a pooled rate or an uncalibrated confidence score.",
    source: "pt2-q030"
  },
  {
    id: "sc-codegen-020",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Your team's custom review workflow turns generated code changes into structured records with modified files, test coverage, security impact, rollback risk and a reviewer recommendation. Each record carries one overall confidence score. In pilot runs, high-scoring records usually have accurate file lists and test summaries but occasionally miss rollback or security concerns, the highest-risk fields. What change best supports routing low-risk records safely while keeping reviewers on uncertain areas?",
    options: [
      "Reduce confidence variance by making Claude Code output only high, medium or low confidence for each record as a whole.",
      "Send every record to senior reviewers until the workflow reaches a stable overall accuracy percentage for a full month.",
      "Approve records above a fixed overall confidence threshold automatically, after adding instructions to be careful with risky changes.",
      "Require confidence per critical field, then calibrate routing thresholds against a labelled set of previously reviewed changes."
    ],
    answer: 3,
    optionNotes: [
      "Coarser labels look tidier but are no better calibrated, and a single label per record still hides uncertainty in specific fields.",
      "Reviewing everything is safe but builds no routing strategy, and a stable aggregate accuracy can still mask weak rollback or security fields.",
      "A fixed overall threshold automates exactly the failure seen in the pilot, where high overall scores hide weak high-risk fields.",
      "Field-level confidence exposes uncertainty in rollback and security specifically, and calibrating against labelled outcomes sets thresholds from measured accuracy rather than unvalidated claims."
    ],
    explanation: "Different fields have different error profiles, so routing needs field-level signals. Confidence must be validated against labelled outcomes before it can safely decide what skips human review.",
    source: "pt2-q048"
  },
  {
    id: "sc-codegen-021",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "A developer asks Claude Code to replace a legacy logging library across 18 packages. There are two viable migration paths and several wrapper modules nobody fully understands. Once the team picks a path, most of the remaining edits are expected to be mechanical and repetitive. What workflow best balances careful discovery with efficient implementation?",
    options: [
      "Use plan mode to investigate the dependencies and choose a migration path, then switch to direct execution for the agreed edits.",
      "Stay in plan mode for the entire task, requiring Claude to re-plan after every package-level edit before it moves on to the next.",
      "Split the task into separate direct-execution sessions per package, avoiding shared context so each migration stays locally focused.",
      "Use direct execution from the start, letting compile errors reveal the hidden wrappers and adjusting the migration strategy afterwards."
    ],
    answer: 0,
    optionNotes: [
      "Plan mode handles the uncertain part, discovering wrappers and comparing paths, without editing; once the plan is approved, direct execution applies the known, mechanical changes efficiently.",
      "Re-planning after every mechanical edit adds overhead long after the uncertainty has been resolved.",
      "Isolated per-package sessions miss shared wrappers and cross-package consistency, which are exactly the unknowns here.",
      "Discovering architecture through compile errors turns design into trial and error and risks broad rework across many packages."
    ],
    explanation: "Use plan mode for the uncertain phase of a task and direct execution once the approach is decided. Matching the mode to the phase gets safe exploration without slowing down the mechanical work.",
    source: "pt2-q052"
  },
  {
    id: "sc-codegen-022",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "A CI review job runs Claude Code non-interactively and completes, but the script that posts inline pull request comments keeps failing. Claude's findings vary between markdown bullets, paragraphs and code fences, severity labels are sometimes missing, and line ranges are formatted inconsistently. Valid findings are dropped or posted on the wrong lines. What change best makes the results reliable for automated consumption?",
    options: [
      "Post Claude's entire text response as one pull request comment and ask developers to review the findings manually.",
      "Run Claude Code with --output-format json and a --json-schema that defines the required fields for each finding.",
      "Keep the markdown output but add stricter prompt wording plus regex patterns for severity, file name and line extraction.",
      "Use the -p flag on its own and have the CI script split Claude's response into separate findings by markdown heading."
    ],
    answer: 1,
    optionNotes: [
      "One big comment avoids parsing errors only by giving up inline automation and pushing triage back onto developers.",
      "In print mode, --json-schema returns validated JSON matching the schema, so the posting script gets a stable contract with file, line range and severity for every finding.",
      "Regex over free-form markdown stays brittle; stricter wording may reduce variation but provides no machine-checked contract.",
      "The job already runs non-interactively; splitting on headings still depends on formatting that varies or disappears."
    ],
    explanation: "Free-form text is a poor integration boundary for automation. Schema-validated JSON output gives downstream scripts predictable fields to place comments reliably.",
    source: "pt2-q059"
  },
  {
    id: "sc-codegen-023",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "You have a personal /scratch-notes slash command that you use constantly. It reflects your own note-taking workflow and should never appear for teammates when they pull the repository. You also want it available in every project you open, not just this one. Where does the command file belong?",
    options: [
      "In .claude/commands/ in the repository, with a name prefix so teammates know to ignore it",
      "In the root CLAUDE.md under a Commands heading that describes how the command works",
      "In ~/.claude/commands/ in your home directory, outside any repository",
      "In .claude/rules/ with a paths glob that matches files only you tend to edit"
    ],
    answer: 2,
    optionNotes: [
      "Anything in the repository's .claude/commands/ ships to every clone; a naming convention does not limit who sees it.",
      "CLAUDE.md is project context shared with the team; prose there does not define an invocable command.",
      "The user-level ~/.claude/commands/ (or ~/.claude/skills/) directory holds personal commands available in all your projects and never travels with the repository.",
      "Path-scoped rules load instructions for matching files; they do not define commands and cannot scope anything to a person."
    ],
    explanation: "Command and skill location mirrors intent: the repository's .claude/ directory is shared with the team, while ~/.claude/ is personal and applies across all your projects.",
    source: "purcell-q011"
  },
  {
    id: "sc-codegen-024",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "You are writing a /scaffold-component skill that generates boilerplate files. You want a configuration-level guarantee that while the skill is active Claude can create files but cannot run shell commands, regardless of what the skill's instructions or the user's arguments ask for. A teammate's first draft relies on wording in the skill body. How do you enforce the restriction?",
    options: [
      "State 'never run Bash' prominently at the top of the SKILL.md instructions",
      "List only Write and Edit in the skill's allowed-tools frontmatter field",
      "Run the skill only in plan mode, where commands are proposed but not run",
      "List Bash in the skill's disallowed-tools frontmatter field"
    ],
    answer: 3,
    optionNotes: [
      "Instructions shape what Claude tries to do but enforce nothing, so there remains a non-zero chance the shell is used.",
      "allowed-tools only pre-approves the listed tools so they run without a prompt; it does not restrict which tools are available, so Bash remains callable under normal permissions.",
      "Plan mode prevents edits altogether, so the skill could not create the files it exists to generate.",
      "disallowed-tools removes the listed tools from Claude's tool pool while the skill is active, which is a configuration-level restriction rather than a request."
    ],
    explanation: "Skill frontmatter has two different tool fields: allowed-tools grants permission without prompting, while disallowed-tools removes tools. Only removal guarantees a tool cannot be used.",
    source: "purcell-q013"
  },
  {
    id: "sc-codegen-025",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "Yesterday you ran a long investigation into a memory leak in a session you named leak-hunt. Since then you have also used Claude Code in the same directory for an unrelated quick fix. Today you want to continue the leak investigation exactly where it left off, with its full context. What do you run?",
    options: [
      "claude --continue, which reopens the most recent session in the current directory",
      "claude --resume leak-hunt, which resumes that named session with its context",
      "claude -p 'continue the leak investigation', which picks up the previous work",
      "A new session in the same directory, relying on CLAUDE.md to restore the context"
    ],
    answer: 1,
    optionNotes: [
      "--continue picks the most recent conversation, which is now the unrelated quick fix rather than the investigation.",
      "--resume accepts a session ID or name, so it restores the leak-hunt conversation and its context directly.",
      "A plain -p run starts a fresh non-interactive session with no memory of yesterday's investigation.",
      "CLAUDE.md restores project conventions, not the findings and tool results accumulated during the investigation."
    ],
    explanation: "Named sessions make it easy to return to specific work with --resume. --continue only reaches the most recent session, which may not be the one you want.",
    source: "purcell-q016"
  },
  {
    id: "sc-codegen-026",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "You have finished a thorough analysis of a module in a Claude Code session and now want to compare two competing refactoring strategies. Each strategy should be developed independently from the same analysis baseline, without one exploration contaminating the other. Re-running the analysis would take another hour. Which approach fits?",
    options: [
      "Run both strategies one after the other in the same session, asking Claude to forget the first before starting the second",
      "Open two brand-new sessions and paste a summary of the analysis conclusions into each as the first message",
      "Run /compact between the two strategies so the first exploration is compressed before the second one starts",
      "Resume the analysis session twice with --resume and --fork-session, developing one strategy in each fork"
    ],
    answer: 3,
    optionNotes: [
      "Context cannot be selectively forgotten on request; the first strategy stays in the conversation and colours the second.",
      "A hand-written summary is a lossy copy of the baseline, set up twice, whereas forking carries the full analysis into both branches.",
      "Compaction shrinks one session's history; it does not branch it, so the strategies still share and influence one context.",
      "--fork-session creates a new session ID when resuming, so each fork starts from the full analysis and then evolves independently."
    ],
    explanation: "Forking a session gives several independent branches from one shared baseline. It avoids repeating expensive analysis and keeps divergent explorations apart.",
    source: "purcell-q017"
  },
  {
    id: "sc-codegen-027",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "You want to resume last week's refactoring session, but the team has since merged substantial changes across the files it analysed. Most of that session's tool results now describe code that no longer exists. You still value the conclusions the session reached about the module's design. What is the reliable approach?",
    options: [
      "Start a new session seeded with a structured summary of the prior conclusions, because the stale tool results make resuming unreliable",
      "Resume the session as it is, because Claude automatically detects that files changed and refreshes its understanding of them",
      "Resume the session and run /compact first, so the stale tool results are compressed before any new work begins",
      "Resume the session and ask Claude to re-read each changed file, correcting its stale understanding as it goes"
    ],
    answer: 0,
    optionNotes: [
      "When most prior tool results are stale, a fresh session with the conclusions injected keeps what is still valuable and drops the outdated evidence.",
      "There is no automatic re-verification of earlier tool results; stale file contents stay in context as if they were current.",
      "Compaction summarises the stale evidence, but a compressed out-of-date view is still out of date.",
      "Re-reading files leaves old and new versions side by side in one context, which works for minor drift but invites blending after substantial change."
    ],
    explanation: "Resume when the prior context is mostly valid; start fresh with a summary when tool results have gone stale. Heavy changes to the analysed files put this case firmly in the second category.",
    source: "purcell-q018"
  },
  {
    id: "sc-codegen-028",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "Midway through a long exploration session, the context is filling with verbose discovery output and Claude's responses are noticeably degrading. You have made useful discoveries you want to keep, and you are not ready to end the session or start over. Which built-in command helps right away?",
    options: [
      "/memory, which reloads the memory files into the session and refreshes the context",
      "/rewind, which rolls the session back to a checkpoint from before the exploration began",
      "/compact, which summarises the conversation so far so the session can continue",
      "/clear, which empties the conversation so the session continues with a fresh context"
    ],
    answer: 2,
    optionNotes: [
      "/memory is for viewing and editing memory files; it does not reduce conversation history.",
      "Rewinding to before the exploration discards the discoveries along with the noise.",
      "/compact replaces the accumulated history with a summary, freeing context while keeping the gist of what was found, and can be told what to preserve.",
      "/clear starts over with an empty conversation, throwing away the discoveries you wanted to keep."
    ],
    explanation: "/compact is the in-session relief valve when verbose output fills the context. It keeps a summary of the work while freeing space, unlike /clear or /rewind, which discard it.",
    source: "purcell-q019"
  },
  {
    id: "sc-codegen-029",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "In your monorepo you added packages/payments/CLAUDE.md with payment-specific conventions, and you usually start Claude Code from the repository root. At the start of a session, Claude cannot describe those conventions when asked in general terms, yet once it reads or edits a file under packages/payments it follows them correctly. A colleague wants to move the conventions into the root CLAUDE.md to 'fix' this. What is the best response?",
    options: [
      "Agree, because CLAUDE.md files below the launch directory are ignored unless the root CLAUDE.md imports them with @",
      "Explain this is expected: subdirectory CLAUDE.md files load once Claude works with files there, so keep the file where it is",
      "Agree, because nested CLAUDE.md files only load when Claude Code is started from inside that exact subdirectory",
      "Explain that the payments file overrides the root file, so it must be loaded later to avoid conflicting with root rules"
    ],
    answer: 1,
    optionNotes: [
      "Subdirectory CLAUDE.md files are discovered automatically; no import is needed, as the observed behaviour shows.",
      "Files above the working directory load at launch, while CLAUDE.md files in subdirectories load on demand when Claude reads, writes or edits a file in that subdirectory. That keeps payment rules out of unrelated work, which a move to the root would undo.",
      "Starting inside the subdirectory loads it at launch, but it is not the only way; on-demand loading from the root is exactly what is happening here.",
      "CLAUDE.md files are concatenated rather than overriding each other, and load timing has nothing to do with resolving conflicts."
    ],
    explanation: "Claude Code loads CLAUDE.md files from the launch directory and its ancestors at startup, and subdirectory files when Claude works in that subdirectory. This lazy loading is a feature for scoping package-specific guidance.",
  },
  {
    id: "sc-codegen-030",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "You want Claude Code to know your personal sandbox URL and the test account you use when working on one particular project. These details are specific to you, should not affect other projects on your machine, and must never be committed for teammates to see. You keep pasting them into prompts at the start of each session. Where should they go?",
    options: [
      "In the project's CLAUDE.md under a 'Personal notes' heading that teammates are asked to skip",
      "In ~/.claude/CLAUDE.md, so that they are loaded in every session you start on this machine",
      "In a CLAUDE.local.md at the project root, added to .gitignore so it is never committed",
      "In .claude/settings.local.json under a new instructions key that holds the sandbox details"
    ],
    answer: 2,
    optionNotes: [
      "The project CLAUDE.md is committed, so the personal details would be shared with the whole team.",
      "User-level memory loads in every project, so details for this one project would leak into all your other work.",
      "CLAUDE.local.md is the documented place for private, per-project instructions: it loads alongside CLAUDE.md for you only and is kept out of version control through .gitignore.",
      "Settings files hold configuration such as permissions and hooks, not free-text instructions; an invented instructions key would not be loaded as context."
    ],
    explanation: "CLAUDE.local.md holds personal, project-specific instructions that should not be committed. User-level CLAUDE.md is for preferences that apply across all projects.",
  },
  {
    id: "sc-codegen-031",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your security team requires that Claude Code never reads .env files in any repository at the company. Today each project's CLAUDE.md contains the line 'Never open .env files', yet an audit found a session where Claude used its Read tool on .env while debugging a configuration error. The security lead wants a control that individual projects and developers cannot weaken. What should you implement?",
    options: [
      "Move the instruction into the organisation-wide managed CLAUDE.md, which developers cannot exclude with claudeMdExcludes",
      "Add a .claudeignore file listing .env to every repository, so Claude Code skips those files entirely",
      "Deploy a Read deny rule for .env files through managed settings, keeping the CLAUDE.md line only as an explanation",
      "Rewrite the CLAUDE.md line in capitals with NEVER and repeat it in every subdirectory CLAUDE.md file"
    ],
    answer: 2,
    optionNotes: [
      "A managed CLAUDE.md cannot be excluded, but it is still guidance that Claude treats as context; the docs recommend enforcing rules with managed settings such as permissions.deny.",
      "Claude Code does not honour a .claudeignore file; its entries need to become Read deny rules to have any effect.",
      "Permission rules are enforced by Claude Code rather than by the model, deny rules win over allow rules from any scope, and managed settings cannot be overridden by project or user settings.",
      "Stronger wording may improve adherence but is still an instruction, which is exactly what failed in the audit."
    ],
    explanation: "CLAUDE.md shapes what Claude tries to do but does not enforce boundaries. Hard prohibitions belong in permission deny rules, and managed settings make them organisation-wide and non-overridable.",
  },
  {
    id: "sc-codegen-032",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your team created .claude/rules/react.md containing React component conventions, written as plain markdown with no frontmatter. Developers working on the Python backend notice Claude mentioning hooks and JSX conventions in unrelated sessions, and the always-loaded context keeps growing. The conventions should only reach Claude when it works on component files. What is the right fix?",
    options: [
      "Move react.md into a .claude/rules/frontend/ subdirectory so that it only applies to frontend work",
      "Add a paths frontmatter field to react.md listing globs such as src/components/**/*.{ts,tsx}",
      "Add a first line telling Claude to apply this file only when the current task involves React",
      "Convert react.md into a skill so that Claude decides when the React conventions are relevant"
    ],
    answer: 1,
    optionNotes: [
      "Rule files are discovered recursively, and subdirectories only organise them; without a paths field the file still loads in every session.",
      "Rules without a paths field load unconditionally; adding paths globs makes the rule load only when Claude reads or edits a matching file.",
      "An in-file condition still loads the whole file into every session and relies on Claude to judge relevance.",
      "A skill depends on invocation or Claude's judgement about the task, rather than reliably attaching to the component files being edited."
    ],
    explanation: "A rule file is path-scoped only when its frontmatter has a paths field. Folder placement under .claude/rules/ is organisational and does not limit when the rule loads.",
  },
  {
    id: "sc-codegen-033",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "You added .claude/rules/api.md with paths set to src/api/**/*.ts. In a fresh session you ask Claude to summarise the team's API conventions before touching any code, and it gives a generic answer. Later in the same session, after it opens src/api/users.ts, it follows the rule precisely. A teammate suspects the glob is broken. Which explanation is accurate?",
    options: [
      "The glob is invalid because paths patterns must be regular expressions, so it only matched by coincidence later on",
      "Path-scoped rules load when Claude reads or edits a matching file, so the rule was not in context before users.ts was opened",
      "Rule files are only loaded after /memory is run in the session, which happened implicitly when users.ts was opened",
      "Path-scoped rules apply only to subagents, so the main conversation saw the rule indirectly through a delegated task"
    ],
    answer: 1,
    optionNotes: [
      "paths takes glob patterns such as src/api/**/*.ts, not regular expressions; the later correct behaviour shows the glob matched.",
      "A rule with a paths field loads when Claude uses Read, Write or Edit on a matching file, not at session start. That is the intended trade-off: less always-on context in exchange for on-demand loading.",
      "/memory is for viewing and editing memory files; loading rules does not depend on running it.",
      "Path-scoped rules load in the main session when matching files are touched; they are not limited to subagents."
    ],
    explanation: "Path-scoped rules are lazy: they enter context when Claude works with a matching file. If guidance must be available before any file is opened, it belongs in an unconditional rule or CLAUDE.md.",
  },
  {
    id: "sc-codegen-034",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your TypeScript conventions rule uses paths: src/**/*.ts. Developers notice that Claude ignores the conventions when editing React components ending in .tsx under src/, and when editing utility files under lib/. Both kinds of file should follow the same conventions, and you want a single source of truth. How should you change the rule?",
    options: [
      "Create two more rule files, one for .tsx and one for lib/, each containing a copy of the same conventions",
      "Replace the glob with a regular expression such as ^(src|lib)/.*\\.tsx?$ in the paths field",
      "List several globs in paths, for example src/**/*.{ts,tsx} and lib/**/*.ts, in the same rule file",
      "Remove the rule and put the TypeScript conventions in the root CLAUDE.md so they always apply"
    ],
    answer: 2,
    optionNotes: [
      "Copies across three files drift apart, which defeats the goal of a single source of truth.",
      "The paths field takes glob patterns, not regular expressions, so this pattern would not match as intended.",
      "paths accepts a list of globs and supports brace expansion, so one rule can cover .ts and .tsx under src/ and .ts under lib/.",
      "Always-on loading adds TypeScript guidance to every task, including unrelated work, instead of fixing the pattern."
    ],
    explanation: "A single rule can list multiple glob patterns, including brace expansion like *.{ts,tsx}. Widen the patterns rather than duplicating the rule or giving up on path scoping.",
  },
  {
    id: "sc-codegen-035",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "You personally prefer terse commit messages and a particular style of debug logging, and you want Claude Code to follow these preferences in every project you work on. Your teammates have different preferences, and nothing about yours should end up in any shared repository. You would like to organise these preferences as separate topic files rather than one long file. Where should they go?",
    options: [
      "In the repository's .claude/rules/ directory, with a paths glob that matches your username",
      "In ~/.claude/rules/, with one markdown file per topic, such as commits.md and logging.md",
      "In a CLAUDE.local.md copied into the root of each repository you work in",
      "In the env block of your ~/.claude/settings.json as preference variables"
    ],
    answer: 1,
    optionNotes: [
      "paths globs match file paths, not people, and the repository's rules directory is shared with the team.",
      "User-level rules in ~/.claude/rules/ apply to every project on your machine, are never committed, and support one file per topic.",
      "CLAUDE.local.md is per project, so you would have to maintain a copy in every repository and keep them in sync.",
      "The env block sets environment variables for sessions; it does not give Claude instructions."
    ],
    explanation: "Personal, cross-project preferences belong in user-level memory: ~/.claude/CLAUDE.md or, for modular topics, ~/.claude/rules/. Repository files are for guidance the whole team should share.",
  },
  {
    id: "sc-codegen-036",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "A production error report includes a stack trace pointing to one function that dereferences an optional field without a null check. The fix is obvious, confined to a single file, and needs one new unit test to reproduce the bug. A colleague insists every Claude Code task should begin in plan mode for safety. How should you approach this fix?",
    options: [
      "Enter plan mode and have Claude explore the wider codebase and propose a design before touching the function",
      "Use direct execution: ask Claude to add a failing test that reproduces the bug, then fix the null check",
      "Delegate to the Explore subagent to map every caller of the function before deciding whether a fix is needed",
      "Enter plan mode and ask Claude for several alternative designs for null handling across the whole module"
    ],
    answer: 1,
    optionNotes: [
      "A well-understood, single-file change gains little from a planning phase; it adds overhead without reducing real risk.",
      "Direct execution suits clear, small, well-scoped changes. Writing the reproducing test first still gives a safety check without the overhead of planning.",
      "Mapping every caller is exploration the stack trace has already made unnecessary for this localised fix.",
      "Designing module-wide alternatives expands a one-line fix into an architectural exercise nobody asked for."
    ],
    explanation: "Plan mode pays off for ambiguous or wide-reaching changes. For a clear, contained fix, direct execution with a reproducing test is faster and just as safe.",
  },
  {
    id: "sc-codegen-037",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "You entered plan mode for an authentication refactor, and Claude explored the code and presented its plan. The plan is mostly good, but one step changes the session-store schema, which the team explicitly wants left untouched this quarter. No files have been changed yet. What is the best next step?",
    options: [
      "Approve the plan and interrupt Claude when it reaches the schema step during the implementation",
      "Approve the plan and add a note to CLAUDE.md saying the session-store schema must not change",
      "Reject the plan, start a new session without plan mode, and describe the refactor again from scratch",
      "Stay in plan mode and tell Claude to revise the plan so it keeps the current schema before approving"
    ],
    answer: 3,
    optionNotes: [
      "Approving a plan you already know is wrong relies on catching the step at the right moment, and earlier steps may already assume the new schema.",
      "A CLAUDE.md note added after approval does not change the approved plan, which still contains the schema change.",
      "Starting over discards Claude's exploration and the parts of the plan that were good.",
      "Plan mode makes no edits, so feedback at this point is cheap: Claude revises the plan around the constraint and you approve only when it is right."
    ],
    explanation: "The value of plan mode is reviewing and correcting the approach before anything changes. Iterate on the plan until it is acceptable, then switch to execution.",
  },
  {
    id: "sc-codegen-038",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "One of your repositories is a fragile legacy billing system where unplanned edits have caused incidents. The team decides that every Claude Code session in this repository should start in plan mode, so Claude explores and proposes before it edits. Developers can still switch modes when they deliberately choose to. How should you configure this for everyone?",
    options: [
      "Add 'Always start by planning and never edit before approval' to the project CLAUDE.md",
      "Set permissions.defaultMode to plan in the committed project .claude/settings.json",
      "Create a /plan skill and ask developers to run it at the start of every session",
      "Ask each developer to launch Claude Code with --permission-mode plan from now on"
    ],
    answer: 1,
    optionNotes: [
      "A CLAUDE.md line is guidance Claude may or may not follow; it does not put the session into plan mode.",
      "permissions.defaultMode in settings sets the permission mode sessions start in, and a committed project settings file applies it to everyone who uses the repository.",
      "A skill developers must remember to run is opt-in and easy to forget, and does not change the session's mode.",
      "The flag works, but it depends on every developer remembering it on every launch; the settings file makes it the default."
    ],
    explanation: "The starting permission mode is configuration, so it belongs in settings rather than in instructions. A committed project setting gives the whole team the same safe default.",
  },
  {
    id: "sc-codegen-039",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "You asked Claude Code to 'add rate limiting to the public API' in a codebase you do not know well. It immediately started editing in direct execution, chose per-route decorators, and changed nine files before you realised the gateway layer already had a middleware hook built for this. You reverted the changes. How should you handle this kind of task next time?",
    options: [
      "Use acceptEdits mode so that Claude's edits flow faster and can be reviewed together at the end",
      "Add 'think harder before editing' to CLAUDE.md so Claude considers alternatives on its own",
      "Start in plan mode so Claude explores the codebase read-only and proposes an approach before editing",
      "Rely on /rewind to restore checkpoints whenever Claude takes a wrong direction during implementation"
    ],
    answer: 2,
    optionNotes: [
      "acceptEdits makes edits happen with fewer prompts, which speeds up the wrong approach rather than preventing it.",
      "A general instruction does not guarantee exploration happens, and gives you no chance to review the approach before edits begin.",
      "Plan mode lets Claude discover existing mechanisms such as the gateway hook and present a plan you approve before any file changes, which is what was missing here.",
      "Rewinding is useful recovery, but making it the standard workflow accepts wasted work instead of avoiding it."
    ],
    explanation: "When the codebase is unfamiliar or several approaches are possible, plan mode puts exploration and review before edits. Checkpoints and faster edit modes treat the symptom rather than the cause.",
  },
  {
    id: "sc-codegen-040",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Claude generated a signup form component, and your review found six problems. Three of them interact: validation messages, error-state styling and the logic that disables the submit button all depend on the same validation state. You have been sending one fix per message, and each fix keeps breaking an earlier one. How should you give the remaining feedback?",
    options: [
      "Keep sending one fix per message, but add 'do not break anything else' to each request",
      "Send the interacting issues together in one message so Claude can resolve them in one coherent change",
      "Open a new session for each issue so that each fix is made without the noise of earlier attempts",
      "Ask Claude to regenerate the whole component from scratch using the original prompt and the six issues"
    ],
    answer: 1,
    optionNotes: [
      "A generic warning does not tell Claude how the fixes depend on each other, so the cycle of regressions continues.",
      "Issues that share state should be fixed together; batching them lets Claude design one consistent change instead of patching each in isolation.",
      "Separate sessions remove the context about the other fixes, making it more likely each change undoes another.",
      "Regenerating throws away the parts that already work and does not explain how the interacting requirements fit together."
    ],
    explanation: "Batch feedback on problems that interact so they can be resolved in one consistent change; address independent problems one at a time. Feeding interacting fixes piecemeal is a common cause of regressions.",
  },
  {
    id: "sc-codegen-041",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Claude is implementing a date-range parser that must handle open-ended ranges, time zones and leap days. After each attempt you describe in prose what went wrong, and each round fixes one case but quietly breaks another. You want progress you can verify after every change. What is the most effective way to iterate?",
    options: [
      "Ask Claude to review its own code more carefully and list the edge cases it believes it has now handled",
      "Write test cases for the expected behaviour first, then have Claude run them and iterate until they all pass",
      "Ask Claude to add detailed logging so you can inspect the parser's behaviour by hand after each change",
      "Raise the effort level so Claude reasons more thoroughly about the edge cases before writing the code"
    ],
    answer: 1,
    optionNotes: [
      "Self-review without an external check is what has been missing; Claude's list of handled cases is a claim, not evidence.",
      "Tests turn the requirements into a concrete, repeatable target: Claude can run them after every change, see exact failures and catch regressions immediately.",
      "Logging helps diagnosis but still leaves you checking behaviour by hand each round, with no automatic regression check.",
      "More reasoning may help, but it gives no way to verify that a change did not break a case that worked before."
    ],
    explanation: "Test-driven iteration gives Claude a verifiable target and immediate feedback on regressions. It replaces subjective prose feedback with failures Claude can act on directly.",
  },
  {
    id: "sc-codegen-042",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "You need a caching layer for a service, but you have not built one before. Claude's first attempt ignored cache invalidation on writes and how to handle many requests missing the cache at once, issues you had not thought to mention. You suspect there are other considerations you do not know to ask about. What is the best way to improve the next attempt?",
    options: [
      "Write a long specification yourself listing every caching concern you can think of, then ask Claude to implement it",
      "Let Claude implement again and rely on code review to catch the considerations you did not mention",
      "Ask Claude to interview you with questions about requirements and trade-offs before it writes any code",
      "Copy a caching implementation from another project into the prompt and ask Claude to adapt it as is"
    ],
    answer: 2,
    optionNotes: [
      "A specification written from your own limited knowledge will miss the same unknown considerations that caused the first failure.",
      "Code review catches problems after the work is done and depends on reviewers knowing the same considerations you are missing.",
      "Having Claude ask clarifying questions first surfaces considerations such as invalidation and thundering herds that you would not have raised yourself, before any code is written.",
      "Another project's implementation encodes its own requirements and trade-offs, which may not match this service."
    ],
    explanation: "When you are unfamiliar with a domain, asking Claude to interview you before implementing surfaces design questions you would otherwise miss. It front-loads the discovery that iteration would otherwise reveal slowly.",
  },
  {
    id: "sc-codegen-043",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Claude has made three attempts to fix a failing integration test. Each time you reply 'still failing, please try again', and each attempt changes something different without converging. The test run produces a detailed assertion diff and a stack trace that Claude never sees, because you run the tests in a separate terminal. What should you change about your feedback?",
    options: [
      "Paste the exact failure output, including the assertion diff and stack trace, into your next message",
      "Ask Claude to rewrite the integration test so that it is less strict about the exact output format",
      "Ask Claude to try a completely different implementation approach, since the current one is not working",
      "Ask Claude to explain its last change in detail before it attempts another fix for the same test"
    ],
    answer: 0,
    optionNotes: [
      "Specific failure output tells Claude exactly what differs and where, turning blind guessing into targeted correction.",
      "Weakening the test hides the defect instead of fixing it.",
      "Switching approaches without knowing why the current one fails is still guessing, and may discard a nearly correct solution.",
      "An explanation of the last change does not provide the missing evidence of what actually went wrong."
    ],
    explanation: "Iteration converges when feedback is specific. Giving Claude the concrete failure output, or letting it run the tests itself, replaces vague 'try again' rounds with targeted fixes.",
  },
  {
    id: "sc-codegen-044",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "You asked Claude to add docstrings to a module 'in our usual style'. The result is grammatically fine but does not match the team's style: it lacks the Raises section, uses a different parameter format and is far more verbose. Your prose attempts to describe the style have produced a slightly different variation each round. What is the most effective next step?",
    options: [
      "Describe the style again in more detail, listing every section and formatting rule in the team's convention",
      "Point Claude at two or three existing docstrings from the codebase that show the exact target style",
      "Ask Claude to keep its own style but shorten the docstrings so they look closer to the existing ones",
      "Accept Claude's style for this module and plan a separate clean-up pass to align it with the team later"
    ],
    answer: 1,
    optionNotes: [
      "More prose is still the medium that has been interpreted differently each round.",
      "Concrete examples show the sections, parameter format and length at once, which removes the ambiguity that descriptions leave.",
      "Shortening addresses verbosity only; the missing Raises section and parameter format remain wrong.",
      "Deferring creates inconsistency now and extra work later instead of fixing the cause."
    ],
    explanation: "Showing concrete examples of the desired output is more reliable than describing it. A few representative samples pin down format details that prose leaves open to interpretation.",
  },
  {
    id: "sc-codegen-045",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "Your project has a /deploy skill that builds the app and pushes it to the staging environment. Yesterday a developer said 'this looks ready to ship' in passing, and Claude loaded the deploy skill on its own and started a deployment. The team wants deploying to happen only when someone deliberately types /deploy. Which change achieves this?",
    options: [
      "Set user-invocable: false in the skill frontmatter so the skill can no longer be triggered automatically",
      "Add 'Only use this skill when the user explicitly asks to deploy' to the skill's description field",
      "Set disable-model-invocation: true in the skill frontmatter so only the /deploy command can run it",
      "Move the skill from .claude/skills/ to ~/.claude/skills/ so that only its author can trigger it"
    ],
    answer: 2,
    optionNotes: [
      "user-invocable: false does the opposite: it hides the skill from the / menu so that only Claude can invoke it.",
      "A description is what Claude uses to decide when to load a skill; wording there still leaves the decision to Claude's judgement.",
      "disable-model-invocation: true stops Claude from loading the skill automatically, so it runs only when a user invokes /deploy, which suits workflows with side effects.",
      "Moving it to personal scope removes it from teammates but still lets Claude invoke it automatically for its author."
    ],
    explanation: "Skills with side effects such as deployments should not be model-invoked. disable-model-invocation makes them run only when a person deliberately calls them.",
  },
  {
    id: "sc-codegen-046",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your project CLAUDE.md says 'Run prettier on every file you edit'. Code review shows that in about one session in five, Claude forgets and unformatted files reach pull requests. The team wants formatting to happen every time Claude writes or edits a file, with no reliance on Claude remembering. What should you configure?",
    options: [
      "Rewrite the CLAUDE.md instruction in bold and repeat it in the path-scoped rules for each language",
      "A PostToolUse hook in .claude/settings.json, matching Edit|Write, that runs prettier on the edited file",
      "A PreToolUse hook in .claude/settings.json, matching Edit|Write, that runs prettier before each edit",
      "A /format skill that developers run before committing to format whatever Claude changed in the session"
    ],
    answer: 1,
    optionNotes: [
      "Stronger wording is still guidance Claude treats as context, so the one-in-five miss rate is likely to persist.",
      "A PostToolUse hook runs after every successful Edit or Write, so formatting happens deterministically, and a committed project settings file applies it for the whole team.",
      "A PreToolUse hook runs before the edit is applied, so it would format the old content and the new edit would still be unformatted.",
      "A skill that developers must remember to run moves the reliability problem from Claude to people."
    ],
    explanation: "Actions that must happen every time belong in hooks, which Claude Code runs deterministically, rather than in CLAUDE.md instructions. Running a formatter after edits is the canonical PostToolUse use case.",
  },
  {
    id: "sc-codegen-047",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Claude must never modify a database migration that has already been applied, but it may create new migrations in the same folder. The list of applied migrations lives in db/applied.lock and changes with every deploy. Last week Claude edited an applied migration to fix a typo, which broke checksums in staging. What is the most reliable way to prevent this?",
    options: [
      "A PostToolUse hook on Edit|Write that compares the edited file with db/applied.lock and reports a violation",
      "A path-scoped rule for db/migrations/** that tells Claude never to change migrations that have already been applied",
      "A PreToolUse hook on Edit|Write that checks the target path against db/applied.lock and exits with code 2 if applied",
      "A line in the project CLAUDE.md listing the currently applied migrations and asking Claude to leave them alone"
    ],
    answer: 2,
    optionNotes: [
      "PostToolUse runs after the tool has already succeeded, so it can report the problem but cannot stop the edit.",
      "A rule is guidance loaded as context; it informs Claude but does not block the edit, which is what failed last week.",
      "A PreToolUse hook runs before the tool call, can consult the current lock file, and exit code 2 blocks the call and sends the reason back to Claude.",
      "A hand-maintained list in CLAUDE.md goes stale with every deploy and is still only guidance."
    ],
    explanation: "Use a PreToolUse hook when blocking depends on logic such as checking a changing file. Exit code 2 stops the tool call before it runs, which no instruction or after-the-fact hook can guarantee.",
  },
  {
    id: "sc-codegen-048",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Developers complain that Claude Code often finishes a task and reports success while the unit test suite is failing. CLAUDE.md already says 'Always run the tests before you finish', but Claude sometimes skips them or ignores a failure. The team wants Claude to be unable to end its turn while the suite fails, and to keep working on the failures instead. Which mechanism fits?",
    options: [
      "A Stop hook that runs the test suite and exits with code 2, passing the failures back, when tests fail",
      "A SessionEnd hook that runs the test suite and writes the results to a log file for developers to read",
      "A PreToolUse hook on Bash that refuses any command until the test suite has been run at least once",
      "A stronger CLAUDE.md instruction that says Claude must never claim success while any test is failing"
    ],
    answer: 0,
    optionNotes: [
      "A Stop hook runs when Claude is about to finish; exit code 2 prevents stopping and feeds the failure output back, so Claude continues working on it.",
      "SessionEnd fires when the session is ending; it cannot make Claude continue, so failures are only discovered afterwards.",
      "Blocking unrelated shell commands disrupts normal work and still does not stop Claude finishing while tests fail.",
      "A stronger instruction is still guidance, and the current instruction is already being skipped."
    ],
    explanation: "A Stop hook can turn 'tests must pass before finishing' into an enforced gate. Exit code 2 keeps Claude working and gives it the failure details to act on.",
  },
  {
    id: "sc-codegen-049",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your team lets Claude Code run git commands freely, but it must never force-push to the main branch. Someone added a deny rule for Bash(git push --force *), yet a session still ran git push -f origin main. Ordinary pushes to feature branches must keep working without prompts. What is the most reliable fix?",
    options: [
      "Add more deny rules covering every spelling, such as git push -f * and git push * --force",
      "Deny Bash(git push *) entirely and ask developers to push every branch by hand from now on",
      "Add a PreToolUse hook on Bash that parses the full command and exits with code 2 for force pushes to main",
      "Add a CLAUDE.md instruction explaining that force pushes to main are forbidden under any circumstances"
    ],
    answer: 2,
    optionNotes: [
      "Bash rules match the command text as written, so listing spellings is whack-a-mole; flag orders, combined flags and wrappers keep slipping through.",
      "Denying all pushes is enforceable but blocks the feature-branch pushes the team wants to keep.",
      "The permissions docs recommend a PreToolUse hook when you need your own logic over the full command; it can recognise any form of force push to main and block only that.",
      "An instruction shapes what Claude tries but enforces nothing, and a force push to main is exactly the kind of action that needs enforcement."
    ],
    explanation: "Deny rules are ideal for blocking a whole tool or a clearly defined command, but they match command text. When the decision depends on parsing arguments, a PreToolUse hook gives a precise, enforceable check.",
  },
  {
    id: "sc-codegen-050",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "Claude Code should never run terraform apply in your infrastructure repository; it may plan but humans apply. Today this lives in your own ~/.claude/settings.json deny list and a line in CLAUDE.md. A new teammate's session ran terraform apply against a sandbox account last week. How should you make the restriction apply to everyone who works in the repository?",
    options: [
      "Add a deny rule for Bash(terraform apply *) to the committed project .claude/settings.json",
      "Make the CLAUDE.md line more prominent by moving it to the top and marking it as critical",
      "Copy your ~/.claude/settings.json to the new teammate so they get the same deny list",
      "Put the deny rule in the repository's .claude/settings.local.json so it applies only here"
    ],
    answer: 0,
    optionNotes: [
      "Project settings in .claude/settings.json are committed and shared, and deny rules are enforced by Claude Code regardless of what Claude decides.",
      "A more prominent instruction is still guidance; it does not prevent the command from running.",
      "Hand-copied user settings protect only the people who receive the copy and drift as rules change.",
      "settings.local.json is personal and not meant to be shared, so teammates would not receive the rule."
    ],
    explanation: "Restrictions that must hold for a whole team belong in committed project settings as permission rules. User settings are personal and CLAUDE.md is guidance, so neither protects new teammates.",
  },
  {
    id: "sc-codegen-051",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "Your project's committed .claude/settings.json denies Bash(npm publish *). A developer who publishes packages often added Bash(npm publish *) to the allow list in their own ~/.claude/settings.json and expected Claude to publish without asking. Instead, every publish attempt is still refused. What explains this behaviour?",
    options: [
      "User settings load before project settings, so the project file always overrides whatever the user configures",
      "Deny rules are evaluated before allow rules from any scope, so the project deny blocks the call regardless",
      "The more specific rule wins, and the two rules are identical, so Claude Code falls back to refusing the call",
      "Allow rules only take effect after the user restarts Claude Code and confirms them in the trust dialog"
    ],
    answer: 1,
    optionNotes: [
      "The outcome does not depend on load order; even a user-level deny would block a project-level allow.",
      "Rules are evaluated deny first, then ask, then allow, and a deny at any level cannot be overridden by an allow at another level.",
      "Specificity does not change evaluation order; a deny matches before any allow is considered.",
      "Restarting changes nothing here, because the deny rule would still be evaluated before the allow rule."
    ],
    explanation: "Claude Code evaluates permission rules deny first, across all settings scopes. That makes deny rules a dependable way to enforce restrictions that individual configuration cannot loosen.",
  },
  {
    id: "sc-codegen-052",
    scenario: "codegen",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "You are restructuring your team's Claude Code setup and have three kinds of requirement: style preferences such as 'prefer named exports'; hard prohibitions such as 'never write to config/production/'; and actions that must happen every time, such as 'run the linter after each edit'. Today all three live in one CLAUDE.md, and the prohibitions and lint step are occasionally missed. Which split is right?",
    options: [
      "Keep all three in CLAUDE.md, but move prohibitions and the lint step to the top under a CRITICAL heading",
      "Turn all three into hooks so every requirement, including style preferences, is checked in code",
      "Style in CLAUDE.md, prohibitions as permission deny rules, and the lint step as a PostToolUse hook",
      "Turn all three into permission rules in settings so that every requirement is enforced uniformly"
    ],
    answer: 2,
    optionNotes: [
      "CLAUDE.md is context, not enforced configuration, so prominence may help but cannot guarantee the prohibition or the lint step.",
      "Style preferences are judgement calls that guide how code is written; encoding them as hooks is brittle and unnecessary.",
      "Guidance goes in CLAUDE.md, things that must be blocked go in deny rules enforced by Claude Code, and things that must always happen go in hooks that run deterministically.",
      "Permission rules allow, ask or deny tool calls; they cannot express a style preference or make the linter run."
    ],
    explanation: "Match each requirement to the mechanism that can deliver it: CLAUDE.md for guidance, permissions for prohibitions, and hooks for actions that must always run. Relying on CLAUDE.md for enforcement is the root cause of the misses.",
  },
  {
    id: "sc-codegen-053",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "You created a security-reviewer subagent in .claude/agents/security-reviewer.md whose instructions say it only reviews code and reports findings. Its frontmatter has a name and description but no tools field. During one review it 'helpfully' edited two files to fix the issues it found, which the team did not want. How should you constrain it?",
    options: [
      "Add 'You are read-only and must never edit files' to the subagent's description and system prompt",
      "Set the tools field to read-only tools such as Read, Grep and Glob in the subagent's frontmatter",
      "Set model: haiku in the frontmatter so the subagent is less inclined to take actions beyond reviewing",
      "Move the file to ~/.claude/agents/ so that the subagent runs with your personal permission settings"
    ],
    answer: 1,
    optionNotes: [
      "Stronger instructions still leave the edit tools available, so the same behaviour can recur.",
      "When the tools field is omitted, a subagent inherits all tools from the main session; listing only read-only tools removes the ability to edit.",
      "Changing the model affects capability and cost, not which tools the subagent can use.",
      "Moving it to personal scope only changes who has the subagent; it still inherits every tool."
    ],
    explanation: "Give each subagent only the tools its role needs. An explicit tools allowlist is a structural limit, while instructions only ask for restraint.",
  },
  {
    id: "sc-codegen-054",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your committed .mcp.json defines an internal-docs MCP server. Most developers should use the production URL, but two developers working on the docs platform need to point the same server at a staging URL. You want one shared entry that works for both groups without anyone editing the tracked file. How should you write the url field?",
    options: [
      "Define two servers, internal-docs and internal-docs-staging, and ask Claude to choose the right one each time",
      "Use ${DOCS_MCP_URL:-https://docs.example.com/mcp}, so developers who set DOCS_MCP_URL get staging",
      "Hard-code the production URL and ask the two developers to edit .mcp.json locally without committing",
      "Leave url empty in .mcp.json and have each developer fill it in by running claude mcp add on their machine"
    ],
    answer: 1,
    optionNotes: [
      "Two entries load both servers for everyone and leave the choice to Claude, adding confusion instead of configuration.",
      "Claude Code expands ${VAR:-default} in url and other fields: developers who set DOCS_MCP_URL use staging and everyone else falls back to the production default.",
      "Local edits to a tracked file are easily committed by mistake and show up as noise in every git status.",
      "An empty url breaks the shared entry, and adding servers per machine gives up the consistent team configuration."
    ],
    explanation: "Environment variable expansion with a default lets one committed .mcp.json entry serve different environments. Developers override it through their environment rather than the file.",
  },
  {
    id: "sc-codegen-055",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your team's committed .mcp.json defines a server named jira. You want to try a modified build of that server privately for a week, in this project only, without changing the shared file or affecting teammates. You also want all the other servers to keep working normally. What should you do?",
    options: [
      "Add the modified server with claude mcp add in local scope using the same name, jira",
      "Add the modified server in user scope with the same name, jira, so it applies everywhere",
      "Edit the jira entry in .mcp.json to point at your build and simply avoid committing it",
      "Start sessions with --strict-mcp-config and --mcp-config pointing at a file with your build"
    ],
    answer: 0,
    optionNotes: [
      "Local scope is private to you and this project, and it has the highest precedence, so your jira definition replaces the project one for you while other servers are unaffected.",
      "User scope ranks below project scope, so the project's jira entry would still be the one used.",
      "Editing the tracked file risks accidentally committing your experiment and changing it for the whole team.",
      "--strict-mcp-config ignores every other MCP configuration, so all the other servers would disappear."
    ],
    explanation: "When the same server name exists in several scopes, local beats project, which beats user, and the whole entry from the winning scope is used. Local scope is the right place for private overrides of shared servers.",
  },
  {
    id: "sc-codegen-056",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "You use a personal note-taking MCP server in every project you work on. It holds only your own notes, so teammates should never see it in any repository's configuration. Last month you added it with a plain claude mcp add in one project and were surprised it was missing everywhere else. How should you add it this time?",
    options: [
      "Run claude mcp add again without a scope flag in each project where you want it available",
      "Add it to the .mcp.json of every repository you work in so that it is always configured",
      "Run claude mcp add with --scope user so that it is available in all of your projects",
      "Run claude mcp add with --scope project and add .mcp.json to .gitignore in each repository"
    ],
    answer: 2,
    optionNotes: [
      "Without a scope flag the default is local scope, which is limited to the current project; that is why it was missing elsewhere.",
      "Project-scoped .mcp.json files are shared with teammates, which is exactly what you want to avoid.",
      "User scope stores the server in your ~/.claude.json and makes it available across all your projects while staying private to you.",
      "Ignoring .mcp.json would also hide the team's shared servers and still needs repeating in every repository."
    ],
    explanation: "Local scope (the default) is private and per project, project scope is shared through .mcp.json, and user scope is private across all projects. A personal tool you want everywhere belongs in user scope.",
  },
  {
    id: "sc-codegen-057",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your committed .mcp.json configures an error-tracking MCP server whose Authorization header is 'Bearer ${SENTRY_TOKEN}'. It works for most of the team, but one developer's calls fail with authentication errors, and claude mcp list shows a missing-variable warning for that server. The developer insists the configuration file is identical for everyone. What is the most likely cause?",
    options: [
      "Variable expansion only works in user-scoped configuration, so the server must be moved out of .mcp.json",
      "SENTRY_TOKEN is not set in that developer's environment, so the header contains the literal unexpanded text",
      "Claude Code reads MCP variables only from a .env file stored next to .mcp.json, which this developer lacks",
      "The developer declined the project-server approval, which strips environment variables from the server"
    ],
    answer: 1,
    optionNotes: [
      "Expansion is supported in project-scoped .mcp.json, which is why it works for the rest of the team.",
      "When a referenced variable is unset and has no default, the config still loads, claude mcp list warns about the missing variable, and the unexpanded ${VAR} text is used, which the server rejects.",
      "Claude Code expands variables from the environment Claude Code runs in; it does not require a .env file beside .mcp.json.",
      "Declining approval would stop the project server from being used at all, not produce a missing-variable warning."
    ],
    explanation: "With ${VAR} expansion, each developer must supply the variable in their own environment. The missing-variable warning points directly to an unset variable rather than a configuration difference.",
  },
  {
    id: "sc-codegen-058",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "You asked Claude Code to find every call to a deprecated formatCurrency function across a repository of about 2,000 files before replacing it. Claude started opening files one at a time with Read, and after forty files the context was filling up with irrelevant code and it had found only six calls. What approach should Claude use instead?",
    options: [
      "Keep using Read but process the files in alphabetical batches of fifty to keep progress organised",
      "Use Grep to search file contents for formatCurrency, narrowing with Glob if needed, then Read only the matches",
      "Run a Bash command that prints the full contents of every source file so Claude can scan them all at once",
      "Ask Claude to list where formatCurrency is probably used, based on its understanding of the architecture"
    ],
    answer: 1,
    optionNotes: [
      "Batching still reads every file in full, so the context cost and wasted effort stay the same.",
      "Grep searches contents across the repository and returns just the matching locations, so Claude reads only the files that actually call the function.",
      "Dumping every file floods the context even faster than reading them one by one.",
      "Guessing from architecture misses calls and is no substitute for an exhaustive search."
    ],
    explanation: "Use Grep to locate content and Glob to find files by name pattern, then Read only what is relevant. Reading files blindly wastes context in large codebases.",
  },
  {
    id: "sc-codegen-059",
    scenario: "codegen",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Claude tried to change one timeout value in a large configuration module using the Edit tool, but the edit failed because the snippet it targeted, 'timeout: 30', appears in four different places. Only the timeout in the payments section should change. The file also contains uncommitted changes you made by hand earlier. What should Claude do?",
    options: [
      "Use the Write tool to rewrite the whole file with the payments timeout updated",
      "Run sed -i through Bash to replace every 'timeout: 30' in the file at once",
      "Retry Edit with more surrounding lines from the payments section so the match is unique",
      "Retry Edit with replace_all enabled so that every matching timeout value is updated"
    ],
    answer: 2,
    optionNotes: [
      "Rewriting the whole file risks clobbering your uncommitted hand edits and turns a one-line change into a full-file change.",
      "A global substitution changes all four timeouts, not just the payments one.",
      "Edit requires the target text to be unique; adding nearby lines from the payments section pins down the single occurrence to change.",
      "replace_all is for when every occurrence should change; here only one should."
    ],
    explanation: "Edit makes targeted replacements and needs a unique match; when the text repeats, include more context. Write and global substitutions are blunt tools for a single, precise change.",
  },
  {
    id: "sc-codegen-060",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "You are spending a long session working out how authentication flows through a 3,000-file service before a risky change. You expect to compact the conversation at least once, and last time a compaction lost specific details such as which middleware sets the tenant header and which tests cover token refresh. You need those findings to survive. What should you ask Claude to do?",
    options: [
      "Avoid compacting at all and keep working until the context limit forces the session to end",
      "Record key findings in a notes file in the repository as it goes, and consult that file after compacting",
      "Repeat the important findings in every message so they are more likely to be kept in the summary",
      "Start a new session for each question, re-exploring the codebase from scratch each time"
    ],
    answer: 1,
    optionNotes: [
      "Running to the limit degrades responses and ends the session anyway, losing the details all at once.",
      "A notes file persists outside the conversation, so specific findings survive compaction and can be re-read whenever they are needed.",
      "Repetition wastes context and still leaves retention up to how the summary is written.",
      "Re-exploring each time repeats expensive work and discards findings between sessions."
    ],
    explanation: "Summaries are lossy, so durable findings from long explorations should be written to a file. Claude can re-read that file after compaction or in later sessions.",
  },
  {
    id: "sc-codegen-061",
    scenario: "codegen",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "You are two hours into a Claude Code debugging session on a flaky payment test. The context is nearly full, mostly with long test logs, but you have established three specific facts: the race occurs only when the retry worker starts before the ledger lock, the fix must not change the public charge() signature, and two hypotheses have already been ruled out. You want to keep working in this session. What should you do?",
    options: [
      "Run /compact with instructions to keep the root cause, the charge() constraint and the ruled-out hypotheses.",
      "Run /clear and restate the three findings from memory in your first message once the fresh conversation begins.",
      "Keep going without compacting and let the session continue until Claude Code reaches the context limit on its own.",
      "Run /compact with no instructions, since the automatic summary always keeps every specific detail from the session."
    ],
    answer: 0,
    optionNotes: [
      "/compact summarizes the conversation to free context, and focus instructions tell it what must survive. The bulky logs go while the critical findings stay.",
      "/clear discards the whole conversation. Restating findings from memory risks losing details you did not think to repeat.",
      "Responses degrade as the context fills, and when auto-compaction eventually triggers you have no say in what it keeps.",
      "Summaries are lossy. Without guidance, specific constraints and ruled-out paths can be condensed into vague statements."
    ],
    explanation: "Use /compact with focus instructions to free context while telling the summary what to preserve. For findings that must survive repeated compaction or later sessions, also record them in a file or in CLAUDE.md.",
  },
  {
    id: "sc-codegen-062",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your root CLAUDE.md has grown to 900 lines, with long sections on React component style, Django model conventions, Terraform module layout and SQL migration rules. Every session loads all of it, so a developer fixing a Python bug still has the Terraform and React guidance in context, and the team notices Claude applying conventions from the wrong area. You want each set of conventions loaded only when relevant. What should you do?",
    options: [
      "Keep the single file but add a heading before each section that names the folders where the conventions in that section apply.",
      "Move each section into its own slash command so that developers can load the relevant conventions by hand when they start work.",
      "Move each section into a .claude/rules/ file with paths frontmatter matching that area, keeping shared rules in CLAUDE.md.",
      "Split the content into separate files and import each of them from the root CLAUDE.md with @ references to keep it short."
    ],
    answer: 2,
    optionNotes: [
      "Headings are still part of a file loaded in full every session, so all conventions remain in context and can still be misapplied.",
      "Manual loading depends on developers remembering to do it, and conventions are skipped whenever someone forgets.",
      "Rules with paths frontmatter load only when Claude works with matching files, so each area's conventions appear only when relevant, while project-wide guidance stays in CLAUDE.md.",
      "Imported files load together with the CLAUDE.md that imports them, so this reorganizes the text but still loads everything every session."
    ],
    explanation: "Use path-scoped rules in .claude/rules/ to load area-specific conventions only when Claude works on matching files. Imports and headings organize content but do not make loading conditional.",
  },
  {
    id: "sc-codegen-063",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your .claude/rules/ directory has grown to 30 files with names like fe-forms.md, be-auth.md and infra-dns.md. A teammate proposes moving them into frontend/, backend/ and infra/ subfolders to make them easier to maintain, but another teammate worries that Claude Code only reads rule files placed directly in .claude/rules/ and would silently stop applying the moved ones. What is correct?",
    options: [
      "The concern is valid, so each subfolder must be listed in settings.json for Claude Code to discover the rule files inside it.",
      "The concern is valid, so the rule files must stay flat, and naming prefixes such as fe- and be- are the only way to group them.",
      "Subfolders work only if each one also contains its own CLAUDE.md that imports the rule files stored inside that subfolder.",
      "Rule files are discovered recursively, so subfolders are fine, and each file's paths frontmatter still controls when it loads."
    ],
    answer: 3,
    optionNotes: [
      "No settings entry is needed; Claude Code discovers rule files in subdirectories on its own.",
      "Flat naming is not required, because every .md file under .claude/rules/ is found recursively.",
      "A CLAUDE.md is not part of rule discovery, so adding one to each subfolder is unnecessary.",
      "All .md files under .claude/rules/ are discovered recursively, so subfolders are a supported way to organize them. Moving a file does not change its paths frontmatter, which still decides when it applies."
    ],
    explanation: "Claude Code discovers every .md file under .claude/rules/ recursively, so rules can be grouped in subdirectories. Each rule's paths frontmatter, not its folder, determines when it loads.",
  },
  {
    id: "sc-codegen-064",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your API conventions apply to TypeScript handlers in src/api/ and also to serverless functions in functions/, which use both .ts and .js files. Right now the team keeps two copies of the same rule file with different paths frontmatter, and the copies have drifted apart after several edits. You want one source of truth that still loads only for those files. What should you do?",
    options: [
      "Keep both copies but add a CI check that fails whenever the contents of the two rule files are no longer identical to each other.",
      "Use one rule file whose paths list has src/api/**/*.ts and functions/**/*.{ts,js}, and delete the duplicate.",
      "Use one rule file without any paths frontmatter, so that it loads in every session and always covers both sets of files.",
      "Move the conventions into the root CLAUDE.md and tell Claude to apply them only when it edits files in those two folders."
    ],
    answer: 1,
    optionNotes: [
      "A sync check guards against drift but keeps the duplication that caused it; one file with several patterns is simpler.",
      "A rule's paths frontmatter accepts multiple patterns and brace expansion, so one file can cover both locations and both extensions while still loading only for matching files.",
      "Without paths the rule loads unconditionally, putting API conventions in context for unrelated work.",
      "Root CLAUDE.md loads in every session, and an instruction to apply conventions selectively is less reliable than path-based loading."
    ],
    explanation: "A single rule can list several glob patterns, including brace expansion such as *.{ts,js}. That keeps one source of truth while loading stays conditional.",
  },
  {
    id: "sc-codegen-065",
    scenario: "codegen",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your .claude/rules/payments.md has paths set to src/payments/**. Early in a long session Claude edited payment files and followed the rule. After you ran /compact, you asked Claude to outline the next change to the payment flow before it opened any files, and the outline ignored the rule's conventions. Once Claude read a payment file again, it followed them. What explains this behavior?",
    options: [
      "Path-scoped rules are not re-injected after compaction; they load again when Claude next reads or edits a matching file.",
      "Compaction deletes rule files from the session permanently, so the rule had to be recreated before Claude could follow it again.",
      "The paths glob is invalid, since src/payments/** matches only folders and never matches the files that are inside them.",
      "Path-scoped rules only ever apply during edits, so Claude cannot use them for any planning or explanation work at all."
    ],
    answer: 0,
    optionNotes: [
      "The project-root CLAUDE.md is re-read after compaction, but path-scoped rules load on demand when Claude next works with a matching file. Having Claude read a relevant file before planning brings the rule back.",
      "Nothing is deleted from disk; the rule loaded again as soon as a matching file was read, which shows it was intact.",
      "The rule worked before compaction and again afterwards on matching files, so the glob does match the files.",
      "Rules apply whenever they are loaded, including for planning. The issue was only that it had not loaded again yet."
    ],
    explanation: "Path-specific rules load when Claude reads or edits matching files. After compaction they return on demand rather than automatically, so for planning work have Claude open a relevant file first, or put always-needed guidance in CLAUDE.md.",
  }
);
