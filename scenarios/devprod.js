/* Developer Productivity with Claude — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    id: "sc-devprod-001",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "An engineer asks the agent to investigate a production stack trace from an unfamiliar legacy service. The trace contains the message \"InvalidInventoryTransition\" and references a helper named validateTransition, but the repository has hundreds of source files and inconsistent directory naming. In a first trial the agent spent most of its context opening files that turned out to be irrelevant. What should the agent do first to find the relevant implementation and usage sites efficiently?",
    options: [
      "Use Read to load the entire module tree upfront, then ask the agent to infer every relevant reference from what it has loaded.",
      "Use Bash to run ad hoc recursive shell commands across the tree, then paste the raw terminal output into the conversation.",
      "Use Glob to list likely source files by extension, then Read each candidate file in turn until the error string appears.",
      "Use Grep to search file contents for the error string and the function name, then Read only the files that match."
    ],
    answer: 3,
    optionNotes: [
      "Reading large portions of the repository upfront is a context management anti-pattern. It fills the context window with irrelevant content and makes it more likely that the specific implementation details get lost.",
      "Bash can run shell searches, but raw recursive output is noisy and less controlled than the built-in content search tool. Pasting it into the conversation floods the context instead of steering the agent toward a few focused reads.",
      "Glob matches file paths, not file contents. Listing every file with a given extension still leaves the agent to open candidates one by one, which is exactly the wasteful pattern seen in the first trial.",
      "Grep is the built-in tool for finding patterns inside file contents, such as error messages, function names or imports. A targeted content search narrows the investigation to a handful of files before any Read, which preserves context."
    ],
    explanation: "Grep is the right first tool when the agent knows a string that should appear inside the code, such as an error message or identifier. It returns the candidate implementation and call sites, and the agent then reads only those files. Glob is for path patterns, and bulk reading or raw shell output spends context before the agent knows what matters.",
    source: "pt1-q060"
  },
  {
    id: "sc-devprod-002",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "A team asks the agent to update every test fixture file ending in .fixture.json across a monorepo, reading only those files. In trials, the agent searches for the word \"fixture\" in file contents, which produces noisy matches from comments and misses fixture files whose content never mentions the word. The team wants the agent to find exactly the right set of files before opening any of them. Which tool-use strategy should you adopt?",
    options: [
      "Use Grep for the word fixture across the repository, then ask Claude to decide which of the matching results are real fixture files.",
      "Use Read on all files under the folders most likely to hold fixtures, then keep inspecting contents until every candidate is found.",
      "Use Glob with a pattern such as **/*.fixture.json to enumerate matching paths, then Read only the files that need changes.",
      "Use Bash to run find and ls pipelines, then paste the complete directory listing into the conversation for Claude to filter."
    ],
    answer: 2,
    optionNotes: [
      "Grep searches file contents, so it is mismatched to a task defined by file names. It produces false positives from comments and strings and misses fixture files that never contain the word.",
      "Reading broad file contents before narrowing by path wastes context and still misses fixtures outside the guessed folders. It reverses the efficient order of finding paths first and reading second.",
      "Glob is the built-in tool for selecting files by name, extension or path pattern. It returns exactly the matching paths, so the agent can Read only the files it has to change.",
      "Shell pipelines can find paths, but dumping a full directory listing adds noise that the model then has to sift. The built-in path matcher does the same job with a targeted result."
    ],
    explanation: "When the selection criterion is a file name or extension, Glob is the right tool: it returns matching paths directly. Grep answers a different question, what text appears inside files, and is noisy for filename-based selection. Narrow the set with Glob first, then Read or Edit only what matched.",
    source: "pt1-q013"
  },
  {
    id: "sc-devprod-003",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "The agent is fixing a timeout value in a legacy configuration module. Its Edit call fails because the old_string it targeted, a line reading \"timeout: 30\", appears six times in the file, once in each service block, and only the payments block should change. The engineer wants the change applied to that single occurrence without touching the other five. What is the correct next step for the agent?",
    options: [
      "Run the Edit again with replace_all set to true, so that all six occurrences of the line are updated in a single call.",
      "Use Bash to run a sed substitution on the file, matching the line pattern and replacing it in place across the whole module.",
      "Write the whole file again from memory with the new value, since that avoids the uniqueness check that blocked the Edit call.",
      "Retry the Edit with a longer old_string that includes the surrounding payments block lines, so the match is unique."
    ],
    answer: 3,
    optionNotes: [
      "replace_all exists for changing every occurrence. Here only the payments block should change, so it would silently alter five service blocks that were meant to stay at 30.",
      "A sed substitution on that pattern hits every matching line, the same problem as replacing all occurrences, and it swaps a checked file edit for an unreviewed stream rewrite.",
      "Rewriting the whole file from memory risks dropping or altering content the agent has not just read. Write is for creating files or full replacements based on content the agent has read, not a way around a failed anchor.",
      "Edit requires old_string to appear exactly once. Adding surrounding context that only exists in the payments block, such as its header line, pins the match to the one occurrence that should change."
    ],
    explanation: "The Edit tool replaces old_string only when it matches exactly once. When an anchor repeats, the documented remedy is to include enough surrounding context to make it unique, or to set replace_all when every occurrence really should change. Here only one occurrence should change, so a longer, unique anchor is the fix; a full Read and Write is a last resort when no unique anchor can be built.",
    source: "purcell-q032"
  },
  {
    id: "sc-devprod-004",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "An engineer asks the agent how the billing module works. The agent immediately Reads dozens of files in directory order and exhausts much of its context before it has identified where invoices are actually calculated. Its eventual answer is vague and misses the tax adjustment path entirely. What exploration strategy should the agent follow to build its understanding of the module?",
    options: [
      "Read files in alphabetical order, summarising each in turn, and stop reading once the context window is close to its limit.",
      "Work incrementally: Grep for entry points and key symbols, then Read selectively to trace the flows outward from those anchors.",
      "Read the module's main entry-point file in full and answer from that single file, since it should describe the overall design.",
      "Read only the README and inline docstrings, reasoning about the behaviour from documentation rather than the implementation."
    ],
    answer: 1,
    optionNotes: [
      "Alphabetical order spends the context budget by filename accident. The files that matter may come late, and per-file summaries still consume context on irrelevant code.",
      "Incremental exploration searches first to find where the relevant code lives, then reads narrowly along the traced paths. Context goes to the files that matter, and each finding guides the next search.",
      "Billing logic rarely lives in one file. Answering from the entry point alone stops at the front door and would miss downstream paths such as tax adjustments.",
      "Documentation in a legacy system is often stale or incomplete. Reasoning from it alone risks describing intended behaviour rather than what the code actually does."
    ],
    explanation: "Build understanding incrementally: use Grep to locate entry points and key identifiers, then Read selectively and follow imports and calls from those anchors. This spends context on the code that matters and lets each discovery shape the next step. Bulk reading, single-file answers and documentation-only reasoning all leave gaps or waste context.",
    source: "purcell-q033"
  },
  {
    id: "sc-devprod-005",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "The team wants a shared GitHub MCP server available in every developer's Claude Code session for PR lookups, and each developer authenticates with a personal access token. You also run a personal, experimental MCP server that you do not want to impose on anyone else. Last week a teammate nearly committed a token while editing a shared config by hand. How should these two servers be configured?",
    options: [
      "Put the shared server in the project's .mcp.json with ${GITHUB_TOKEN} expansion, and the personal one at user or local scope.",
      "Put both servers in the project's .mcp.json, with the token pasted in directly so that teammates do not have to set any variables.",
      "Put both servers in each developer's ~/.claude.json, with the shared server's full setup and token handling documented in the wiki.",
      "Describe the shared server and its token in the project CLAUDE.md, and define the personal server as a command in .claude/commands/."
    ],
    answer: 0,
    optionNotes: [
      "Project scope distributes team tooling through version control in .mcp.json, and ${VAR} expansion keeps each developer's token out of the repository. User or local scope, both stored in ~/.claude.json, keeps the experimental server private to you.",
      "Pasting a live token into a committed file leaks the credential to everyone with repository access, and it would be one person's token used by the whole team.",
      "Personal configuration is not version-controlled, so each developer must replicate the shared server by hand from a wiki page. The setups drift and the team loses a single source of truth.",
      "CLAUDE.md holds instructions, and command files hold prompts. Neither file configures an MCP server, so no server would actually be connected."
    ],
    explanation: "Scope follows audience. Team servers belong in the project-scoped .mcp.json, which is committed, with credentials supplied through environment variable expansion such as ${GITHUB_TOKEN}. Personal or experimental servers belong at user or local scope, which Claude Code stores in ~/.claude.json and never shares.",
    source: "purcell-q034"
  },
  {
    id: "sc-devprod-006",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "Two tasks arrive on the same morning. One is an off-by-one bug in a single pagination function, with a clear stack trace and a failing test that pinpoints the line. The other is migrating the codebase's HTTP client library, which touches more than 45 files and has several viable approaches the team has not chosen between. How should plan mode and direct execution be assigned to these tasks?",
    options: [
      "Plan mode for both tasks, since reviewing a written plan before any execution reduces the risk of every change, however small.",
      "Direct execution for both tasks, since plan mode only adds a review step and does not change what eventually gets written.",
      "Direct execution for the single-function bug fix, and plan mode for the 45-file migration with several viable approaches.",
      "Plan mode for the bug fix, where precision matters most, and direct execution for the migration, where volume matters most."
    ],
    answer: 2,
    optionNotes: [
      "A well-scoped fix with a stack trace and failing test needs no design phase. Planning it adds ceremony without reducing any meaningful risk.",
      "Executing a large migration with unresolved design choices invites edits across dozens of files that may have to be unwound once the approach is settled.",
      "Direct execution suits simple, well-scoped changes. Plan mode suits work where scale, architectural implications or competing approaches make it worth designing before committing, as in a 45-file migration.",
      "This inverts the rule on both tasks: it adds overhead to the trivial fix and skips the design step where it matters most."
    ],
    explanation: "Choose by uncertainty and blast radius. A single-function fix with a clear failing test is a direct execution task. A multi-file migration with several valid approaches benefits from plan mode, where Claude explores and proposes a design before any file changes.",
    source: "purcell-q035"
  },
  {
    id: "sc-devprod-007",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "An engineer gives the agent an open-ended task: \"add comprehensive tests to this legacy codebase.\" Nobody on the team knows where the risk concentrates or which modules depend on which. A first attempt asked for the whole suite in one request and produced shallow tests for utility code while leaving the payment flow untested. Which decomposition approach fits this task?",
    options: [
      "First map the codebase structure and identify high-impact areas, then build a prioritised plan that adapts as new findings emerge.",
      "Write tests file by file in directory order, which guarantees that every file has received some coverage by the end of the run.",
      "Generate the complete test suite again in one large request, this time asking Claude to weight its coverage towards critical code.",
      "Prioritise the files with the most recent commits, since actively changing code is where regressions are most likely to surface."
    ],
    answer: 0,
    optionNotes: [
      "Open-ended tasks call for adaptive decomposition: understand the terrain, prioritise by impact, and let the plan evolve with what each step reveals, rather than fixing the steps before anything is known.",
      "Directory order spends effort by listing position rather than risk. Shallow coverage everywhere repeats the first attempt's failure on the payment flow.",
      "A single pass cannot do the discovery the task needs. Asking it to weight critical code does not tell it which code is critical in an unfamiliar system.",
      "Recency is a weak proxy for importance. In legacy systems much of the risk lives in old, untouched code that nobody has dared to change."
    ],
    explanation: "When the shape of the work is unknown, decompose adaptively: map structure and dependencies first, rank areas by impact, and revise the plan as findings come in. Fixed orderings and one-shot generation commit to a plan before the information that should shape it exists.",
    source: "purcell-q038"
  },
  {
    id: "sc-devprod-008",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "The same agent now handles two request types. Dependency license reviews follow a stable rubric with known checks, while production bug investigations in unfamiliar services vary depending on the call paths, logs and failing tests that turn up. The current single-pass prompt misses checklist items during license reviews and wastes effort during investigations. Which decomposition strategy is most appropriate?",
    options: [
      "Use dynamic task planning for every workflow, letting the agent redefine the review criteria as it discovers new code patterns.",
      "Use a fixed prompt chain for the stable license rubric, and let the agent adapt its subtasks during open-ended investigations.",
      "Use the same fixed sequential checklist for both workflows, requiring each investigation to complete every predefined step.",
      "Use one large prompt for both request types, and ask the agent to reason carefully about the request before using any tools."
    ],
    answer: 1,
    optionNotes: [
      "Dynamic planning helps when the path is unknown, but it is unnecessary for a stable rubric. Letting the agent redefine review criteria undermines the consistency the rubric exists to provide.",
      "Predictable work with known steps suits a prompt chain where each pass covers one part of the rubric. Open-ended investigations suit adaptive decomposition, because later subtasks depend on what earlier steps uncover.",
      "A fixed sequence fits the rubric but not investigations, where discoveries should change the next action. Forcing every step wastes tool calls on irrelevant checks.",
      "A single large prompt dilutes attention, which is why checklist items are being missed. Asking for careful reasoning does not create focused passes or adaptive branching."
    ],
    explanation: "Match the decomposition to the workflow's shape. Prompt chaining gives each pass of a known rubric a focused objective, while adaptive decomposition lets an investigation generate subtasks from intermediate findings. Use the simplest structure that preserves quality for each type.",
    source: "pt1-q054"
  },
  {
    id: "sc-devprod-009",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "An engineer asks the agent to explain how the \"user export\" capability works in a legacy repository. The answer confidently covers REST controllers and serializers but misses scheduled exports, admin-triggered jobs and CLI invocations. Logs show every subagent completed successfully, and their prompts were \"inspect export controller,\" \"trace export API request\" and \"summarize export endpoint tests.\" What should you change first to improve coverage on similar broad codebase questions?",
    options: [
      "Run a fixed pipeline that always invokes controller, database, CLI, worker and test subagents for every incoming codebase question.",
      "Revise the coordinator's planning so it identifies plausible entry points first, then delegates distinct code areas to subagents.",
      "Strengthen the synthesis prompt so it infers any missing workflows from naming conventions and common framework patterns.",
      "Require each subagent to read every file that matches export-related terms before it returns any findings to the coordinator."
    ],
    answer: 1,
    optionNotes: [
      "Running every subagent for every question wastes work on simple queries and still depends on a fixed list that may not match the capability being investigated.",
      "The subagents did what they were asked; the assignments only covered the HTTP path. Better coordinator planning decomposes broad questions across all relevant entry points before synthesis.",
      "Inferring workflows that were never investigated produces plausible but unsupported explanations, especially in legacy code that departs from framework conventions.",
      "Brute-force reading floods each subagent's context and does not fix the narrow task allocation that caused the gap."
    ],
    explanation: "The root cause is the coordinator's decomposition, not subagent execution. For broad questions, the coordinator should first enumerate the surfaces where a capability might live, such as controllers, jobs, commands and models, and delegate each. Synthesis can only be as complete as the coverage the coordinator assigned.",
    source: "pt1-q053"
  },
  {
    id: "sc-devprod-010",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "During a legacy payment module analysis, the coordinator first assigns one subagent to map database tables and another to trace API callers, and both return useful findings. The coordinator then invokes a planning subagent to propose a migration strategy. The plan ignores the database constraints and caller list already discovered, and recommends changes that would break known integrations. What should you change to make this orchestration reliable?",
    options: [
      "Instruct the planning subagent to infer any missing dependencies from file and directory names whenever prior findings are unavailable.",
      "Have the coordinator keep the investigation state and include the relevant prior findings directly in each later subagent's prompt.",
      "Replace the specialised subagents with one long-running generalist subagent that performs both the discovery and the planning work.",
      "Allow the subagents to message each other directly, so that the planning subagent can request any missing analysis details itself."
    ],
    answer: 1,
    optionNotes: [
      "Inferring dependencies from names substitutes guesses for the evidence that has already been collected. A migration plan needs the actual constraints and callers.",
      "A subagent starts with a fresh context and receives only the prompt the coordinator passes it. The coordinator must carry forward the findings each later subagent needs.",
      "One generalist avoids the handoff but loses specialisation and accumulates a large context during exploration. Fixing the state passing is the smaller, better change.",
      "Routing information directly between subagents hides it from the coordinator, which makes failures harder to observe and control. The coordinator should stay the hub."
    ],
    explanation: "Subagents do not see the parent's conversation or each other's results; the only input they get is the prompt they are invoked with. The coordinator therefore owns the shared investigation state and must pass the relevant findings, such as tables, constraints and callers, into each downstream prompt.",
    source: "pt1-q034"
  },
  {
    id: "sc-devprod-011",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "During a legacy billing-module analysis, a coordinator launches separate subagents to trace API handlers, database writes and scheduled jobs. Each subagent returns useful narrative findings, but the final architecture brief often attaches claims to the wrong file or omits the line ranges engineers need to verify them. Reviewers have stopped trusting the brief's references. What change best improves handoff reliability between the subagents and the final synthesizer?",
    options: [
      "Add instructions asking the synthesizer to reconstruct file locations and line numbers from the subagents' narrative summaries.",
      "Have the coordinator concatenate the complete subagent transcripts so the synthesizer can search them for provenance details.",
      "Apply regex parsing to the subagents' prose summaries, extracting anything that resembles a file path, symbol or citation.",
      "Require each subagent to return structured records that keep findings, file paths, symbols, line ranges and excerpts separate."
    ],
    answer: 3,
    optionNotes: [
      "Once file associations are compressed out of a narrative, no synthesis instruction can reliably recover them. The synthesizer would be guessing.",
      "Full transcripts consume a large share of context and bury the evidence in intermediate reasoning. They do not create a reliable mapping from each claim to its source.",
      "Regex over prose is brittle: it can extract plausible-looking paths while missing which claim each one supports.",
      "Structured records keep each claim tied to the metadata needed to verify it, so the synthesizer can merge findings without guessing which file or line range supports what."
    ],
    explanation: "Provenance has to travel with the finding. Requiring subagents to return records with explicit fields such as file_path, symbol, line_range and an evidence excerpt lets the synthesizer preserve attribution. Reconstructing or parsing provenance after it has been compressed into prose is unreliable.",
    source: "pt1-q028"
  },
  {
    id: "sc-devprod-012",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "A team asks the agent to add a \"cancel renewal\" workflow to a legacy subscription service. Cancellation behaviour appears split across command-line scripts, web handlers and scheduled jobs, so the right place to implement it is unclear. In earlier similar tasks, immediate edits targeted the wrong abstraction and had to be rolled back after tests exposed broken shared behaviour. Which workflow should the tool recommend first?",
    options: [
      "Instruct Claude to read every file in the repository first, then implement the changes later in the same extended session.",
      "Proceed with direct execution, relying on test failures to reveal hidden dependencies and to guide the corrective edits.",
      "Use plan mode to map the relevant flows and compare candidate implementation points before allowing any file changes.",
      "Start separate direct-execution sessions for each suspected module, then combine the resulting edits by hand afterwards."
    ],
    answer: 2,
    optionNotes: [
      "Reading the whole repository wastes context on irrelevant files and degrades attention on the ones that matter. Targeted exploration is more reliable than exhaustive reading.",
      "Using failed edits as the discovery mechanism is the costly pattern that already caused rollbacks. Tests should validate a design, not find it.",
      "The main risk is choosing the wrong abstraction. Plan mode lets Claude explore the flows and propose where the change belongs before any file is modified.",
      "Independent sessions each lack a shared design baseline, so their edits are likely to conflict and to repeat the wrong-abstraction problem in several places."
    ],
    explanation: "Plan mode fits when the main risk is implementing in the wrong place. It adds a small exploration cost up front and avoids the rework that comes from edits based on an incomplete understanding of a distributed legacy flow.",
    source: "pt1-q014"
  },
  {
    id: "sc-devprod-013",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Your internal agent generates repository-specific data adapter classes from interface definitions. In pilots, the first drafts compile, but later reviews find unhandled null fields, incorrect retry behaviour and slow processing on large fixtures. Engineers can state the expected outcomes and edge cases before implementation starts, but prose-only instructions have produced uneven results. Which workflow should you add?",
    options: [
      "Write tests for expected behaviour, edge cases and performance limits first, then iterate by sending Claude the failing results.",
      "Give Claude a longer prose specification of the adapter and ask it to reason carefully before it produces the full implementation.",
      "Run the generated adapter once on a representative happy-path input, and approve it if the output matches what you expected.",
      "Let Claude implement the adapter freely, then rely on manual code review afterwards to catch any of the cases it has missed."
    ],
    answer: 0,
    optionNotes: [
      "Tests turn the expected behaviour into objective acceptance criteria. Feeding specific failures back to Claude gives it precise targets for each refinement round.",
      "More prose still leaves correctness open to interpretation and provides no executable acceptance criteria. Prose-only instructions are what produced the uneven results.",
      "A single happy-path run checks the easiest case and misses the null handling, retry and performance defects already observed.",
      "Manual review is reactive and inconsistent, and it offers no repeatable loop for improving the generator's output."
    ],
    explanation: "When engineers can state expected behaviour up front, write the tests first and iterate against their failures. Concrete failures such as a null assertion or a timing threshold tell Claude exactly what to fix, which vague requests to be more robust cannot.",
    source: "pt1-q016"
  },
  {
    id: "sc-devprod-014",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Claude has generated a helper that scaffolds new internal SDK integrations. Review finds three failures: retry handling conflicts with your error-normalisation helper, generated config duplicates an existing block, and a naming fix for one path breaks another path that uses the same template. Each single-issue fix so far has reintroduced one of the other failures. What is the best next refinement step?",
    options: [
      "Ask Claude to fix the failures one at a time in separate turns, starting with whichever failing assertion is easiest to fix.",
      "Open a separate Claude session for each failure and merge whichever patch is first to pass its own local tests.",
      "Tell Claude that the output is still wrong and ask it to be much more careful before it attempts the fix another time.",
      "Send one detailed request that describes all three failures, their shared constraints and the expected behaviour on each path."
    ],
    answer: 3,
    optionNotes: [
      "Sequential fixes work when issues are independent. These share code paths, and single fixes have already reintroduced the other failures, so this would continue the churn.",
      "Each isolated session sees only part of the problem, so the patches are likely to conflict when combined.",
      "Vague feedback carries no evidence about what failed or what the constraints are, so it rarely changes the outcome.",
      "When failures interact, Claude needs the full set of constraints at once to produce a change that satisfies all of them together."
    ],
    explanation: "Match the refinement style to the coupling between problems. Independent issues can be fixed one turn at a time, but interacting issues should be described together in one request so Claude can reason about the shared constraints and produce a coherent fix.",
    source: "pt1-q017"
  },
  {
    id: "sc-devprod-015",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "An engineer asks the agent to add a caching layer around a legacy authorization module. The codebase has multiple tenants, audit logging and inconsistent invalidation behaviour, and the team has little domain knowledge of it. Past attempts produced working code that later failed on stale permissions and compliance edge cases. What should the engineer do before asking Claude to modify any files?",
    options: [
      "Tell Claude to copy the caching approach from a different module, assuming the same rules apply to the authorization code.",
      "Have Claude ask targeted questions about invariants, invalidation triggers, audit needs and failure modes before it proposes code.",
      "Give Claude a long prose description of the performance goals and let it infer the domain rules from the surrounding code.",
      "Ask Claude to implement the simplest cache wrapper right away, then iterate only if tests or reviewers expose a problem."
    ],
    answer: 1,
    optionNotes: [
      "Reusing a pattern is safe only after confirming the same invariants apply. Authorization caching has its own correctness and compliance risks that another module's approach may ignore.",
      "The interview pattern surfaces hidden requirements before implementation. In an unfamiliar, high-risk domain it stops Claude from filling gaps with plausible but wrong defaults.",
      "Performance goals do not define invalidation semantics or audit requirements, and inferring rules from inconsistent legacy code yields confident but wrong choices.",
      "Waiting for tests or reviewers repeats the past failures; the stale-permission and compliance cases may never be encoded in a test."
    ],
    explanation: "When the domain is unfamiliar and mistakes are costly, have Claude interview the engineer first. Targeted questions about invariants, invalidation and audit requirements turn hidden constraints into explicit ones before any code is written, which prevents correct-looking but unsafe implementations.",
    source: "pt1-q030"
  },
  {
    id: "sc-devprod-016",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "A team has built a Claude-powered helper that converts legacy configuration files to a new format. Early output looked reasonable in review, but repeated runs keep breaking different corner cases: missing optional sections, duplicate keys and very large files with thousands of entries. Developers have been sending follow-up prompts like \"fix the migration bugs\" and getting inconsistent improvements. What refinement approach should they use next?",
    options: [
      "Ask Claude to reread the whole legacy codebase and rewrite the migration helper from scratch after every failed run.",
      "Tell Claude the output is still wrong, request a more careful implementation, and continue until reviewers approve it.",
      "Remove the hardest corner-case checks for now so that Claude can stabilise the happy-path migration behaviour first.",
      "Share the failing test names, inputs, expected and actual outputs and stack traces, then iterate on minimal fixes."
    ],
    answer: 3,
    optionNotes: [
      "Restarting from scratch discards working progress and invites new regressions, while expanding context instead of focusing on the specific failures.",
      "Vague qualitative feedback gives Claude no concrete signal about which behaviour is wrong, which is why improvements have been inconsistent.",
      "Removing the hard checks hides exactly the cases that need work and gives a false sense of progress.",
      "Concrete, reproducible failures give Claude a precise target for each revision, so the helper improves step by step without unrelated rewrites."
    ],
    explanation: "Anchor iteration in objective signals. Failing test names, inputs, expected versus actual output and stack traces tell Claude exactly what to change, and minimal fixes keep regressions down. Vague feedback, full rewrites and dropping hard tests all undermine convergence.",
    source: "pt1-q032"
  },
  {
    id: "sc-devprod-017",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "Your codebase migration assistant has tools for repository metadata extraction, dependency graph analysis and migration plan generation, and it calls the Messages API directly. Evaluation runs show it sometimes starts dependency analysis or plan generation before collecting the canonical package manager and framework versions, which produces plans built on wrong assumptions. What change most reliably enforces the intended first step while keeping later steps model-driven?",
    options: [
      "Force the metadata extraction tool with tool_choice on the first request, then let later turns use automatic tool selection.",
      "Set tool_choice to any on the first request, relying on the tool descriptions to make metadata extraction the likely pick.",
      "Strengthen the system prompt so it states that metadata extraction must happen before any dependency or planning tool.",
      "Inspect Claude's text for phrases that indicate metadata is complete, and retry the request when that phrase is missing."
    ],
    answer: 0,
    optionNotes: [
      "Setting tool_choice to a specific named tool guarantees that tool is called on that request. Once its result is in the conversation, later requests can return to auto so Claude chooses the next steps.",
      "The any setting guarantees that some tool is called but not which one, so dependency analysis or planning could still come first.",
      "Prompt instructions raise the likelihood of the right order but do not enforce it, and the failures show that likelihood is not enough.",
      "Parsing natural language as a control signal is brittle and couples the workflow to wording rather than to structured tool calls."
    ],
    explanation: "A named tool_choice, such as {\"type\": \"tool\", \"name\": \"extract_metadata\"}, makes a required first step deterministic. After the result is returned, later requests can use auto so Claude decides what to do next. The any setting forces a tool call but not a particular tool, and prompts alone remain probabilistic.",
    source: "pt1-q055"
  },
  {
    id: "sc-devprod-018",
    scenario: "devprod",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Your team added a CI step that reviews code produced by an internal Claude-powered scaffolding workflow. The review job currently resumes the same named session that generated the branch and asks it to critique the resulting pull request. Human reviewers report that the automated review misses subtle design issues and often defends choices made during generation. What change would most improve review quality?",
    options: [
      "Keep the existing session but add instructions telling Claude to challenge its own earlier assumptions before it approves anything.",
      "Run the review as a separate Claude invocation that receives only the PR diff, relevant repository context and the review criteria.",
      "Resume the generation session after the tests complete, and give it the failing logs before asking it for final review feedback.",
      "Ask the generating session to perform three consecutive review passes, and report only the issues that it finds at least twice."
    ],
    answer: 1,
    optionNotes: [
      "The generation reasoning is still in context, so a prompt to be sceptical does not remove the bias toward defending earlier decisions.",
      "An independent instance does not inherit the generator's reasoning and justifications, so it judges the diff against the criteria with fresh eyes.",
      "Test logs help with debugging but make the review an extension of implementation rather than an independent critique.",
      "Repeated passes in the same context share the same assumptions, and requiring repeat detections can suppress subtle issues that appear inconsistently."
    ],
    explanation: "Generation and review are different roles. A reviewer that shares the generator's context tends to confirm its choices, so run the review in a separate instance given only the diff, the necessary repository context and explicit criteria.",
    source: "pt1-q027"
  },
  {
    id: "sc-devprod-019",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your team wrote its own loop on the Messages API for a lightweight code-explorer agent that has Grep and Read tools. In testing, the loop sometimes ends after Claude says \"Let me search for the call sites\" without the search ever running, and at other times it keeps calling the API after Claude has already given a complete explanation. The loop currently decides by inspecting the text of each response. What should drive the decision to continue or stop?",
    options: [
      "Stop as soon as a response contains any text block, since text means Claude is addressing the user rather than calling a tool.",
      "Look for closing phrases such as \"Hope this helps\" in the text, and keep looping until one of them appears in the response.",
      "Check stop_reason: when it is tool_use, run the requested tools and send the results back; when it is end_turn, stop the loop.",
      "Run a fixed number of iterations sized for a typical exploration task, then stop whatever the latest response happens to say."
    ],
    answer: 2,
    optionNotes: [
      "Text and tool_use blocks often arrive in the same response, as when Claude announces a search and requests it together. Stopping on any text ends the loop before the tool runs, which is the first observed bug.",
      "Phrase matching is brittle because wording varies from turn to turn. It explains why the loop sometimes runs on after a complete answer that lacked the expected phrase.",
      "stop_reason is the structured signal for loop control. tool_use means Claude is waiting for tool results, and end_turn means the response is complete and the loop should finish.",
      "A fixed count either cuts off long explorations mid-task or keeps calling after the work is done. An iteration cap is a safety backstop, not the completion signal."
    ],
    explanation: "Agentic loops should branch on stop_reason. Execute tools and continue when it is tool_use, and finish when it is end_turn. Text content, phrasing and iteration counts are unreliable signals, although a maximum iteration count is still a useful safety limit."
  },
  {
    id: "sc-devprod-020",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your boilerplate generator runs a custom Messages API loop that executes tools whenever stop_reason is tool_use and otherwise treats the turn as finished. Engineers report that generated service classes sometimes end abruptly in the middle of a method, yet the tool reports success. Logs show that on those runs the final response had stop_reason set to max_tokens. How should the loop be changed?",
    options: [
      "Keep treating every non-tool_use stop as completion, but add a lint step afterwards that deletes any file which fails to parse.",
      "Treat max_tokens as a truncated response: handle it separately from end_turn, for example by raising max_tokens or continuing.",
      "Add a system prompt instruction asking Claude to keep each generated class short enough to fit within the output token budget.",
      "Switch tool_choice to any, so every response must contain a tool call and the loop can never reach a text-only final response."
    ],
    answer: 1,
    optionNotes: [
      "Deleting unparsable files hides the truncation instead of handling it, and code that happens to parse can still be missing methods.",
      "max_tokens means Claude was cut off by the output limit, not that it finished. The loop should branch on it explicitly, for example by retrying with a higher limit or asking Claude to continue, rather than reporting success.",
      "A prompt instruction does not guarantee the output fits the budget, and the loop would still report truncated output as complete whenever it does not.",
      "Forcing a tool call on every response prevents Claude from ever ending its turn normally and does nothing to detect truncation."
    ],
    explanation: "stop_reason has more values than tool_use and end_turn. max_tokens signals a response cut off by the output limit, so a loop that treats every non-tool_use value as completion will report truncated work as finished. Handle each stop_reason explicitly."
  },
  {
    id: "sc-devprod-021",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "In your custom Messages API loop, Claude often requests two Grep calls in one response. Your code runs both, then sends their outputs back as a plain-text user message such as \"Results: ...\". Claude then repeats the same searches or says it never received results, and the loop wastes several turns on each exploration step. What is the correct way to return the tool results?",
    options: [
      "Send each result as a separate plain-text user message in turn, one per search, so Claude can read them in the order they finished.",
      "Append the results to the system prompt for the next request, so Claude treats them as fixed background information for the task.",
      "Append the assistant message that holds the tool_use blocks, then one user message with a tool_result block for each tool_use_id.",
      "Start a new conversation containing only the search results, so that the earlier tool requests no longer clutter the context."
    ],
    answer: 2,
    optionNotes: [
      "Plain text does not link a result to the tool_use that requested it, so Claude cannot tell which call it answers. Splitting results across several messages makes this worse.",
      "The system prompt is not where tool results go. Results moved there are no longer tied to the calls that requested them, and the conversation still shows unanswered tool requests.",
      "Each tool_use block needs a matching tool_result block carrying the same tool_use_id, and results for parallel calls go together in the next user message after the assistant turn that requested them.",
      "Dropping the history removes the reasoning that led to the searches, and the results arrive with no request to answer."
    ],
    explanation: "Tool use is a structured exchange. Keep Claude's assistant message with its tool_use blocks in the history, then send one user message containing a tool_result for every tool_use_id. Without that pairing Claude does not recognise the results, which causes the repeated searches."
  },
  {
    id: "sc-devprod-022",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your Agent SDK tool runs codebase audits with maxTurns set to 25. On a very large monorepo, the run ends with a ResultMessage whose subtype is error_max_turns, and your code reads the result field to build the report, which comes out empty. Engineers then rerun the whole audit from scratch with a higher limit, repeating hours of exploration. How should the tool handle this outcome?",
    options: [
      "Ignore the subtype and use the last assistant text in the stream as the report, since it usually summarises the work done so far.",
      "Remove maxTurns entirely for audits, so that large repositories are never cut off before the agent decides on its own to stop.",
      "Treat any non-success result as a crash, log it, and always restart the audit in a new session with twice the turn limit.",
      "Check the subtype first; on error_max_turns, keep the session_id and resume that session with a higher limit to finish."
    ],
    answer: 3,
    optionNotes: [
      "The last assistant text is mid-task output, not a final report. Presenting it as the audit result hides that the work is incomplete.",
      "Removing the limit trades a recoverable stop for the risk of runaway cost on open-ended runs. Limits are a deliberate safeguard.",
      "Restarting discards all the exploration already done. Error results still carry the session_id, so the work can be continued instead of repeated.",
      "The result field is only present on success, so the subtype must be checked first. Every result carries a session_id, and resuming that session with a higher maxTurns continues with the full prior context."
    ],
    explanation: "Always branch on the ResultMessage subtype before reading result. error_max_turns means the loop hit its cap, not that it failed, and the session can be resumed by ID with a higher limit, so prior exploration is not lost."
  },
  {
    id: "sc-devprod-023",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "Your coordinator agent explains legacy systems by delegating to subagents that each analyse one service: billing, auth, notifications and reporting. The four analyses are independent of each other, but traces show the coordinator invokes one subagent, waits for its report, then invokes the next, so a typical question takes four times longer than the slowest single analysis. What change best reduces the end-to-end time without losing coverage?",
    options: [
      "Have the coordinator issue all four independent subagent invocations in a single turn, so they run concurrently.",
      "Merge the four specialists into one subagent that analyses every service in turn and returns a single combined report.",
      "Skip the subagents for most questions and have the coordinator Read the key files of each service itself, one by one.",
      "Lower the model tier for each subagent so that each analysis finishes faster, while keeping the sequential invocation order."
    ],
    answer: 0,
    optionNotes: [
      "Independent subtasks can run in parallel when the coordinator requests them together, so the whole step takes about as long as the slowest analysis rather than the sum of all four.",
      "One combined subagent keeps the work sequential and loads all four services into one context, losing both speed and isolation.",
      "Doing the reading in the coordinator puts all four services' detail into its context and is still sequential.",
      "A cheaper model may shave some time but leaves the fourfold sequential delay in place and may weaken the analysis."
    ],
    explanation: "When subtasks have no dependencies on each other, the coordinator should launch them together so they run concurrently. Parallel subagents finish in the time of the slowest one and keep each service's detail isolated in its own context."
  },
  {
    id: "sc-devprod-024",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "Your Agent SDK application defines a \"legacy-explainer\" subagent that should only read and search code to answer questions. Its prompt says \"never modify files,\" but in one run it edited a configuration file while \"tidying up\" a misleading comment, and in another it ran a Bash command that wrote a cache directory. The subagent definition currently omits the tools field. How should you constrain it?",
    options: [
      "Strengthen the subagent prompt with a capitalised warning that editing files or running commands is forbidden in every situation.",
      "Set the subagent's tools field in its AgentDefinition to Read, Grep and Glob, so edit, write and shell tools are not available to it.",
      "Keep the default tools but have the coordinator review the subagent's final report for any mention of edits before relaying it.",
      "Set the whole application's permission mode to plan, so that no agent in the system, including the coordinator, can edit files."
    ],
    answer: 1,
    optionNotes: [
      "A stronger prompt still leaves the edit and shell tools available, and the observed runs show the instruction is not followed reliably.",
      "Omitting tools gives the subagent every tool available to subagents. Listing only Read, Grep and Glob removes the others from its session entirely, which enforces read-only behaviour.",
      "Reviewing the report happens after the change has already been made, and the subagent may not mention every edit it performed.",
      "Plan mode for the whole application blocks edits for the coordinator and every other agent too, including those that legitimately need to write."
    ],
    explanation: "Give each agent the minimum tool set its role needs. An AgentDefinition's tools field restricts a subagent to the listed tools, and a tool left out is simply not in its session. Prompt instructions are guidance, not enforcement."
  },
  {
    id: "sc-devprod-025",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "While debugging with an engineer, the main agent has identified a failing test, the stack trace and two suspect files. It then delegates to a fix-verification subagent with the prompt \"Check whether the fix we discussed resolves the failure.\" The subagent spends many turns searching the repository and ends up testing an unrelated module. What is the most likely cause, and what should change?",
    options: [
      "The subagent has a smaller context window than the parent; give it a larger model so that it can hold the whole conversation.",
      "The subagent lacks the right tools; add Bash and Edit so it can reproduce the failure without searching the repository first.",
      "The subagent inherited too much context from the parent; clear the parent conversation before every single delegation so that it stays focused.",
      "The subagent does not see the parent's conversation; put the test name, stack trace, file paths and the proposed fix in its prompt."
    ],
    answer: 3,
    optionNotes: [
      "Model size is not the issue. A non-fork subagent never receives the parent conversation, whatever its context window.",
      "More tools do not tell the subagent which test or fix to check. It would still have to guess what \"the fix we discussed\" means.",
      "A non-fork subagent starts with a fresh context and does not inherit the parent's history, so there is nothing to clear. The problem is too little context, not too much.",
      "A non-fork subagent starts fresh and receives only the prompt it is invoked with. Everything it needs, such as file paths, errors and decisions, must be stated in that prompt."
    ],
    explanation: "Subagents provide context isolation: apart from forks, they do not see the parent's conversation or tool results. The delegating agent must pass the specific facts the subtask depends on, such as the failing test, stack trace, relevant paths and the change to verify, in the subagent's prompt."
  },
  {
    id: "sc-devprod-026",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "Your scaffolding agent must run the project's schema validator against an OpenAPI spec before writing any generated client code under src/generated/. The system prompt states this order clearly, yet in about one run in twenty the agent writes the generated files first and validates afterwards, and invalid clients have reached review twice. What change most reliably enforces the order?",
    options: [
      "Repeat the ordering rule at both the beginning and the end of the system prompt and add an example run that shows the correct order.",
      "Run the validator in a separate nightly job and open an issue whenever invalid generated code has made it into the main branch.",
      "Add a PreToolUse hook that denies Write and Edit calls under src/generated/ until the session has recorded a passing validation.",
      "Ask the agent to state at the end of each run whether it validated first, and flag any run where its answer is no for review."
    ],
    answer: 2,
    optionNotes: [
      "Better prompting can lower the failure rate but cannot guarantee the order, and the failures show instructions alone are not enough here.",
      "A nightly check detects the problem after invalid code has already been written and merged, which is what the team is trying to prevent.",
      "A hook runs in code on every tool call. Denying writes to the generated directory until validation has passed makes the prerequisite a hard gate, and the denial reason tells the agent what to do first.",
      "Self-reporting relies on the same model that skipped the step, and it only labels the problem after the files are written."
    ],
    explanation: "When a step must happen before another, enforce it in code rather than in the prompt. A PreToolUse hook that blocks writes to the output path until validation has passed makes the ordering deterministic, while prompts only make it likely."
  },
  {
    id: "sc-devprod-027",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "Your automation agent upgrades a library across services and must stop and hand over to an engineer when a change needs production database access, which it does not have. Today it ends with \"I need a human to continue,\" and engineers spend twenty minutes reading the transcript to work out what was done and what is blocked. The engineers never see the agent's conversation directly. How should the handoff be designed?",
    options: [
      "Return a structured handoff summary: completed changes and files touched, the exact blocker, what was tried and the next steps.",
      "Include the full session transcript in the handoff ticket, so the engineer can see every step the agent took before it stopped.",
      "Keep the brief message, but add a link that lets the engineer resume the agent's session and ask it directly what happened.",
      "Have the agent continue past the blocker using sample data, then mark the result as needing verification by an engineer."
    ],
    answer: 0,
    optionNotes: [
      "A self-contained summary gives the engineer what they need to act without the transcript: what changed, where it is blocked and why, what was attempted and the recommended next step.",
      "A full transcript is exactly what engineers are struggling to read today. It buries the blocker in hundreds of tool calls.",
      "Resuming the session still makes the engineer interrogate the agent before they can act, and not every engineer may be able to resume it.",
      "Working around a missing permission with substitute data produces changes that look complete but were never validated against the real system."
    ],
    explanation: "A handoff should be a structured summary that stands on its own, because the person receiving it does not share the agent's context. It lists completed work and files touched, the precise blocker, attempted approaches and recommended next steps."
  },
  {
    id: "sc-devprod-028",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your repetitive-task agent runs cleanup scripts with Bash. The system prompt says never to run rm -rf outside the build directory and never to force-push. During an unattended run the agent ran rm -rf on a fixtures directory while \"resetting state,\" and the team now needs a guarantee that such commands cannot execute. What should you implement?",
    options: [
      "A PreToolUse hook on Bash that inspects the command and returns a deny decision with a reason when it matches a forbidden pattern.",
      "A PostToolUse hook on Bash that detects destructive commands after they finish and adds a warning to the result for Claude to see.",
      "Additional few-shot examples in the system prompt that show the agent declining destructive commands and choosing safer ones.",
      "A Stop hook that reviews the session's commands when the run ends and reverts any files that were deleted during the session."
    ],
    answer: 0,
    optionNotes: [
      "PreToolUse runs before the tool executes. Returning permissionDecision deny blocks the call, and the reason tells Claude why so it can choose another approach.",
      "PostToolUse fires after the command has already run, so the files are already gone when the warning arrives.",
      "Examples make compliance more likely but remain probabilistic, and the requirement is a guarantee.",
      "A Stop hook runs at the end, and restoring deleted files may not be possible, especially for untracked fixtures."
    ],
    explanation: "Policies that must hold every time belong in hooks or permission rules, not prompts. A PreToolUse hook sees the tool name and input before execution and can deny the call deterministically, while post-execution hooks and prompts cannot prevent the damage."
  },
  {
    id: "sc-devprod-029",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your agent calls an internal MCP tool that returns build history. Different backends return timestamps as Unix epochs, ISO strings or locale-formatted dates, and each response carries thousands of lines of raw log noise. The agent misorders builds and its context fills quickly when it compares runs. You cannot change the MCP server, which is owned by another team. Where should you normalise the data?",
    options: [
      "Add a system prompt section that explains all three timestamp formats and tells the agent to ignore the log noise when reading.",
      "Add a PostToolUse hook for that tool that converts timestamps to one format and trims the noise before Claude sees the result.",
      "Add a PreToolUse hook that rewrites the tool's input so it requests fewer builds, keeping each response a little smaller.",
      "Ask Claude to call the tool, then call it a second time with a request to reformat the first response into a clean table."
    ],
    answer: 1,
    optionNotes: [
      "Explaining formats leaves the conversion to the model on every call, which is where the misordering comes from, and the noise still consumes context.",
      "A PostToolUse hook can replace a tool's output before Claude sees it. Normalising formats and trimming noise in code makes every result consistent and smaller without changing the server.",
      "Requesting fewer builds reduces volume but leaves the mixed formats in place and may drop builds the comparison needs.",
      "A second call spends more context and still relies on the model to convert formats correctly."
    ],
    explanation: "Use PostToolUse hooks to normalise heterogeneous tool output deterministically before it reaches the model, for example by setting updatedToolOutput. This fixes inconsistent formats and reduces context use when you do not control the tool itself."
  },
  {
    id: "sc-devprod-030",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "You registered a PreToolUse hook with the matcher \"src/legacy/**\" so that edits to legacy code require approval. In testing, the hook never fires, even when the agent edits src/legacy/payments.ts. A colleague suggests the glob syntax is wrong and proposes trying a regular expression for the path instead. What is the actual problem and fix?",
    options: [
      "Matchers are case-sensitive glob patterns; change the matcher to \"**/legacy/**\" so it matches the path at any depth.",
      "PreToolUse hooks do not fire for file tools; register the same check as a PostToolUse hook on the Edit tool instead.",
      "Matchers match the tool name, not file paths; match \"Write|Edit\" and check tool_input.file_path inside the callback.",
      "Hooks only apply to Bash commands; route all legacy edits through a Bash script so that the hook is able to inspect them."
    ],
    answer: 2,
    optionNotes: [
      "Rewriting the pattern does not help, because the matcher is compared against the tool name, not against any path in the tool's input.",
      "PreToolUse fires for file tools such as Write and Edit. Moving the check to PostToolUse would also make it run after the edit, too late to require approval.",
      "For tool events the matcher filters on the tool name. To act on specific files, match the editing tools and inspect tool_input.file_path in the callback, returning ask or deny for legacy paths.",
      "Hooks apply to any tool, including Read, Write and Edit. Routing edits through Bash would make them harder to inspect, not easier."
    ],
    explanation: "Hook matchers select which tools trigger a callback, using exact names or a regular expression over the tool name. Path-based rules belong inside the callback, which receives the tool input and can return a permission decision for matching files."
  },
  {
    id: "sc-devprod-031",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your agent has a PreToolUse hook with the matcher \"Write|Edit\" that denies any change to .env files. A security review finds that during one session the agent still overwrote .env, by running echo with output redirection through the Bash tool. The team assumed the hook protected the file in every case. What is the best explanation and fix?",
    options: [
      "The hook timed out and allowed the call; raise the timeout on the matcher so that the check always completes in time.",
      "The hook only covers the tools its matcher names; also guard Bash, for example with a Bash hook, deny rules or sandboxing.",
      "Hooks do not run in unattended sessions; switch the agent to an interactive permission mode so that the hook takes effect.",
      "The agent ignored the hook's decision; add a system prompt rule so the agent respects denials returned by any hook."
    ],
    answer: 1,
    optionNotes: [
      "A PreToolUse timeout blocks the call rather than allowing it, and in any case the hook never ran for the Bash call.",
      "A Write|Edit matcher limits the hook to those tools, so a Bash command that writes the file bypasses it. Protection must also cover Bash, through a Bash hook, permission deny rules or sandbox restrictions.",
      "Hooks run in unattended SDK sessions as well; the hook simply did not match the Bash tool.",
      "A deny decision blocks the call in code regardless of the model; the agent did not ignore it, the hook never applied."
    ],
    explanation: "A hook only intercepts the tools its matcher selects. Any tool that can produce the same effect, such as Bash writing a file, needs its own control. Design enforcement around the effect being prevented, not around one tool."
  },
  {
    id: "sc-devprod-032",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "Engineers ask the agent to generate typed client wrappers for 40 internal REST endpoints in one request. The output is long and inconsistent: naming conventions drift halfway through, error handling differs between wrappers, and several endpoints are skipped without notice. The endpoints share common patterns, and two hand-written wrappers already exist as references. How should this generation task be decomposed?",
    options: [
      "Repeat the single request with a stronger instruction to stay consistent and to confirm explicitly that it has covered all 40 endpoints.",
      "Split the endpoints randomly into four groups and generate each group in a parallel session without any shared guidance.",
      "Generate all 40 wrappers in one pass, then ask Claude to review the whole output once and fix whatever looks inconsistent.",
      "Derive a conventions spec from the two references, generate each endpoint in a focused call using it, then run a consistency check."
    ],
    answer: 3,
    optionNotes: [
      "One very long generation is what causes the drift and skipped endpoints. Stronger wording does not reduce the attention load.",
      "Parallel sessions with no shared conventions would each drift in their own direction, making inconsistency worse.",
      "A single review of a very long output suffers the same attention problems as the generation and is likely to miss inconsistencies.",
      "Fixing the conventions first gives every focused generation the same target, per-endpoint calls keep attention narrow and make coverage trackable, and a final pass checks consistency across the set."
    ],
    explanation: "Break large repetitive generation into a sequence: establish shared conventions from exemplars, generate each item in a focused step against those conventions, then verify coverage and consistency across the whole set. This avoids the drift and omissions of one oversized request."
  },
  {
    id: "sc-devprod-033",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "Yesterday you started a Claude Code session named billing-audit with claude -n billing-audit and spent two hours tracing a legacy billing module. This morning you ran two quick unrelated sessions in the same directory to answer questions from teammates. You now want to pick up the billing investigation exactly where it stopped, with its context intact. What should you run?",
    options: [
      "claude --continue, which reopens the most recent conversation in the current directory with its full prior context.",
      "claude --resume billing-audit, which resumes that specific named session with its prior context restored.",
      "claude -p \"continue the billing audit\", which starts a non-interactive run that picks up the previous investigation.",
      "A new session in the same directory, relying on CLAUDE.md to restore what the investigation discovered yesterday."
    ],
    answer: 1,
    optionNotes: [
      "--continue loads the most recent conversation in the directory, which is now one of this morning's unrelated sessions, not the billing audit.",
      "--resume accepts a session ID or name, so it returns to the billing-audit session regardless of what has run since.",
      "-p starts a fresh non-interactive run with no memory of yesterday's investigation.",
      "CLAUDE.md carries project instructions, not the files read and conclusions reached in a past session."
    ],
    explanation: "Use --continue only when the session you want is the most recent one in the directory. To return to a specific earlier session, use --resume with its ID or name, which is why naming long-running investigations is useful."
  },
  {
    id: "sc-devprod-034",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "Your Agent SDK service lets several engineers run long codebase investigations from the same server working directory, and each can come back later with follow-up questions. The service currently sets continue: true on follow-ups. Engineers report that answers sometimes draw on someone else's investigation, mentioning modules they never asked about. How should the service resume conversations?",
    options: [
      "Keep using continue but serialise all requests through a queue, so only one engineer's session is ever active at a time.",
      "Give each follow-up a fresh session and prepend a summary of the engineer's previous answers to its prompt as context.",
      "Capture session_id from each ResultMessage, store it per engineer, and pass it as resume on that engineer's follow-ups.",
      "Ask Claude at the start of each follow-up which earlier investigation it relates to, and let it choose the right context."
    ],
    answer: 2,
    optionNotes: [
      "A queue still lets continue pick up whichever session ran last, which may belong to a different engineer.",
      "A summary loses the files read and analysis performed, and the full session already exists to be resumed.",
      "continue picks the most recent session in the directory, which is wrong with several users. Resuming by the stored session ID returns each engineer to their own conversation.",
      "The model cannot reliably choose between sessions it cannot see, and this does not change which session continue loads."
    ],
    explanation: "continue is for apps that run one conversation at a time; it resumes the most recent session in the directory. Multi-user or multi-thread apps should capture each session_id, available on every ResultMessage, and pass it to resume."
  },
  {
    id: "sc-devprod-035",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "Your agent has spent an hour building a detailed analysis of a legacy order-processing module in one SDK session. The team now wants to explore two competing refactoring strategies, an event-driven rewrite and an incremental extraction, each developed from that same analysis without the two explorations influencing each other. Re-running the analysis twice would be slow and costly. Which approach fits?",
    options: [
      "Resume the analysis session twice with forkSession enabled, so each strategy starts as its own branch from the shared history.",
      "Develop both strategies one after the other in the original session, asking Claude to set aside the first before starting the second.",
      "Start two brand-new sessions and paste a short written summary of the analysis into each one as its opening message.",
      "Run /compact in the original session between the two strategies so the first exploration takes up less space in context."
    ],
    answer: 0,
    optionNotes: [
      "Forking creates a new session that starts with a copy of the original history and then diverges, leaving the original unchanged. Two forks give two independent branches from the same analysis.",
      "Claude cannot selectively forget part of its context on request, so the first strategy would influence the second.",
      "A pasted summary is a lossy copy of the analysis, and the files read and reasoning behind it are not carried over.",
      "Compaction summarises the first exploration but keeps it in the same conversation, so the strategies are not independent."
    ],
    explanation: "Forking a session branches the conversation: each fork inherits the full prior analysis and then evolves separately, while the original stays intact. It is the tool for comparing alternatives from a shared baseline without paying for the baseline twice."
  },
  {
    id: "sc-devprod-036",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "An engineer forked an Agent SDK analysis session into two branches, one per refactoring strategy, and let each branch apply its changes. Both forks ran in the same repository checkout. Afterwards, the files reflect a confusing mix of both strategies, and neither branch's tests pass. The engineer expected each fork to have its own copy of the code. What explains this, and what should they do next time?",
    options: [
      "Forked sessions share a file lock, and the second fork overrode the first; run the forks one after the other rather than together.",
      "The second fork resumed the original session instead of the fork; capture each fork's own session ID from its init message.",
      "Forks only keep their separate file changes when compaction is turned off; disable auto-compaction before forking sessions.",
      "Forking branches the conversation, not the filesystem; run each fork in its own git worktree or branch to keep edits apart."
    ],
    answer: 3,
    optionNotes: [
      "There is no shared file lock between forks. Running them one after another would still layer both strategies' edits onto the same files.",
      "Even with the correct session IDs, two forks working in one directory write to the same files.",
      "Compaction affects the conversation history, not file changes, and has nothing to do with whether edits are isolated.",
      "A fork copies conversation history only. File edits are real and visible to every session in that directory, so each strategy needs its own worktree or branch, or file checkpointing, to stay separate."
    ],
    explanation: "Session forking isolates conversations, not files. When forks will modify code, give each one its own working copy, such as a separate git worktree, so the strategies can be compared without overwriting each other."
  },
  {
    id: "sc-devprod-037",
    scenario: "devprod",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "You resume yesterday's session in which the agent mapped a legacy invoicing module across about 40 files. Overnight, a teammate merged a change that touched three of those files, renaming one function and moving a validation check. Most of the session's earlier findings are still accurate. What is the most efficient way to continue reliably?",
    options: [
      "Resume as-is and continue; Claude detects that files changed on disk and refreshes its earlier findings automatically.",
      "Abandon the session and start over with a full re-exploration, since any change makes all earlier tool results untrustworthy.",
      "Resume, run /compact so the old tool results are summarised, and then continue the work in the same session as before.",
      "Resume and tell Claude exactly which three files changed and how, asking it to re-read them and update its findings."
    ],
    answer: 3,
    optionNotes: [
      "Claude does not re-verify old tool results when you resume. Stale content for the three files would be treated as current.",
      "A full restart discards 37 files' worth of still-valid analysis to deal with three changes.",
      "Compaction summarises stale content rather than correcting it, so the outdated details remain, just shorter.",
      "When most prior context is still valid, resuming and pointing Claude at the specific changed files for targeted re-analysis keeps the valid work and corrects only what is stale."
    ],
    explanation: "Resume when most earlier context is still accurate and tell the session exactly what changed so it can re-read those files. Start fresh with a summary only when changes are so widespread that most tool results are stale."
  },
  {
    id: "sc-devprod-038",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Your agent has the built-in Grep tool and an internal MCP tool named search_code, described as \"Search the codebase.\" The MCP tool queries an index of the main branch that is rebuilt nightly. Engineers working on feature branches report the agent saying functions they just wrote \"do not exist,\" and logs show it chose search_code for those lookups. What is the most effective fix?",
    options: [
      "Rewrite the search_code description to say it searches a nightly index of main and to use Grep for the local working tree.",
      "Remove Grep from the agent's tools, so that every code search goes through the single, centrally maintained index instead.",
      "Add a system prompt line saying \"prefer accurate tools\" so that the agent weighs which of its search tools is more reliable.",
      "Rebuild the search_code index every hour, so that recent work appears in its results sooner after engineers write it."
    ],
    answer: 0,
    optionNotes: [
      "The model chooses tools mainly from their descriptions. Stating what the tool covers, its freshness and when to use Grep instead lets the agent pick correctly for uncommitted or branch-local code.",
      "Removing Grep leaves only the index, which never contains branch-local changes, so the problem would happen every time.",
      "A vague instruction does not tell the agent which tool is accurate for which situation.",
      "Faster indexing still covers only main and never sees uncommitted local work, so lookups on feature branches would keep failing."
    ],
    explanation: "When tools overlap, their descriptions must state each tool's scope and limits and when to prefer the alternative. A description like \"Search the codebase\" hides that the index is main-only and nightly, which is why the agent misroutes branch-local lookups."
  },
  {
    id: "sc-devprod-039",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Your legacy-explainer agent has two MCP tools: get_history, described as \"Gets history for code,\" and get_blame, described as \"Gets information about who changed code.\" When engineers ask why a function behaves a certain way, the agent alternates unpredictably between them and often fetches line-by-line authorship when the commit messages explaining the change were what mattered. How should you improve tool selection?",
    options: [
      "Merge both tools into one generic tool that returns history and blame together, and let the agent pick the parts it needs.",
      "Expand each description with its inputs, its output and when to use it versus the other, with a short example query.",
      "Add few-shot examples to the system prompt showing the right choice for a few questions, leaving the descriptions as they are.",
      "Rename the tools to history_tool_1 and history_tool_2 and list them in order of preference inside the system prompt."
    ],
    answer: 1,
    optionNotes: [
      "A merged tool returns much more data than most questions need and does not resolve the ambiguity about which information answers which question.",
      "Clear descriptions are the main input to tool selection. Stating that get_history returns commit messages explaining why code changed, while get_blame returns per-line authorship, with when to use each, removes the overlap.",
      "Examples help, but they cover only the questions shown, and the vague descriptions remain the primary source of confusion.",
      "Opaque names make selection harder, and a preference order does not explain which tool fits which question."
    ],
    explanation: "Disambiguate similar tools through their descriptions: say what each takes, what it returns, and when to choose it over the other. Tool descriptions are what the model relies on when selecting a tool, so vague overlapping descriptions produce unreliable choices."
  },
  {
    id: "sc-devprod-040",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "An internal MCP tool, search_design_docs, returns an empty list when its upstream service rejects an expired auth token. The agent then tells engineers that \"no design documents exist for this service,\" and two teams have duplicated designs that did exist. The same empty list is returned for a genuine search with no matches. How should the tool report this failure?",
    options: [
      "Keep returning an empty list but add a log line on the server side, so that operators can investigate auth failures later on.",
      "Retry the upstream call silently up to five times inside the tool and return an empty list only if every attempt has failed.",
      "Return a plain-text message such as \"Something went wrong, please try again\" in place of the list whenever any error occurs.",
      "Return an error result with isError set and structured details: an auth error category, whether it is retryable and a message."
    ],
    answer: 3,
    optionNotes: [
      "Server-side logging does not help the agent, which still cannot tell a failed search from a real empty result.",
      "Retries cannot fix an expired token, and returning an empty list afterwards still disguises the failure as a valid result.",
      "A generic message tells the agent something failed but not what kind of failure, so it cannot decide whether to retry, ask for re-authentication or report the gap.",
      "Marking the result as an error and including a category, retryability and a clear message lets the agent distinguish an access failure from an empty search and respond appropriately."
    ],
    explanation: "MCP tools should report failures as errors, with isError set and structured detail such as error category, whether retrying could help and a human-readable explanation. An empty success result for a failed call leads the agent to state false conclusions with confidence."
  },
  {
    id: "sc-devprod-041",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your Agent SDK tool connects to an internal Jira MCP server registered under the key jira in mcpServers. The init message shows the server as connected and lists its tools, but in unattended runs Claude never manages to fetch an issue, and the runs end saying the tool could not be used. The permission mode is acceptEdits, and allowedTools lists only Read, Grep and Glob. What should you change?",
    options: [
      "Switch the permission mode to bypassPermissions, so that every tool, including the MCP tools, runs without any approval.",
      "Add the server's tools to allowedTools, for example mcp__jira__* or the specific mcp__jira__get_issue tool name.",
      "Move the server definition out of code and into the project's .mcp.json, so it is loaded with project-level permissions.",
      "Rename the server key to jira-mcp so that its tools are recognised as MCP tools by the SDK's permission system."
    ],
    answer: 1,
    optionNotes: [
      "bypassPermissions would work but disables most other safety prompts too, which is far broader than granting access to one server.",
      "MCP tools need explicit permission. acceptEdits only auto-approves file edits and filesystem commands, so listing the server's tools in allowedTools, by wildcard or by name, grants exactly the access needed.",
      "Where the server is configured does not change whether its tools are approved; they would still need permission.",
      "The tool names already follow the mcp__<server>__<tool> convention. Renaming the key changes the names, not the permissions."
    ],
    explanation: "In the Agent SDK, Claude can see MCP tools without being allowed to call them. Grant access with allowedTools using the mcp__<server>__<tool> names, or a server-wide wildcard such as mcp__jira__*. This is narrower and safer than a permissive mode."
  },
  {
    id: "sc-devprod-042",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your repository's committed .mcp.json defines an internal docs server that the whole team uses in interactive Claude Code sessions. A new engineer says the server never appears in their sessions. It turns out that on first launch they declined the prompt asking whether to use the project's MCP servers, because they did not recognise it. Everyone else sees the server normally. What should they do?",
    options: [
      "Copy the server definition from .mcp.json into their own ~/.claude.json at user scope so that it loads in every project.",
      "Delete and re-clone the repository so that Claude Code treats the project as new and shows the approval prompt again.",
      "Run claude mcp reset-project-choices, then start a new session and approve the project's server when they are prompted.",
      "Ask a teammate to add an always-approve flag for the server to .mcp.json and commit it for the whole team to use."
    ],
    answer: 2,
    optionNotes: [
      "A user-scope copy duplicates the shared definition and will drift from the committed one as the team updates it.",
      "Re-cloning is heavy-handed and not how Claude Code tracks these approval choices.",
      "Interactive sessions ask before using servers from a project's .mcp.json, and the choice is remembered. Resetting project choices clears the earlier decline so the prompt appears again.",
      "There is no per-server approval flag inside .mcp.json, and approval is meant to be each user's own decision."
    ],
    explanation: "Project-scoped servers are shared through .mcp.json, but each user approves them in interactive sessions. When someone has declined, claude mcp reset-project-choices resets those choices so they can approve the server without duplicating its configuration."
  },
  {
    id: "sc-devprod-043",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "The team's committed .mcp.json defines a server named github that points at the company's GitHub Enterprise instance. One developer's sessions keep connecting to public github.com instead, and their PR lookups fail. Months ago they added a server also named github with claude mcp add, using the default scope, while experimenting. What explains the behaviour, and what is the fix?",
    options: [
      "Their local-scope github entry takes precedence over the project entry with the same name; remove or rename the local one.",
      "Project servers always override local ones, so the problem must be a stale cache; restart Claude Code to reload .mcp.json.",
      "Claude Code merges fields from both github entries, mixing the URLs; add the missing fields to the project entry to fix it.",
      "Two servers with the same name cannot coexist, so Claude Code picks one at random; rename the project server for everyone."
    ],
    answer: 0,
    optionNotes: [
      "claude mcp add defaults to local scope, and local entries take precedence over project entries with the same name. Removing or renaming the personal entry lets the shared definition load.",
      "Precedence runs the other way, local over project, so restarting would load the same personal entry again.",
      "Claude Code uses the whole entry from the highest-precedence scope and does not merge fields across scopes.",
      "Selection is not random; it follows a defined precedence order, and renaming the shared server would affect the whole team unnecessarily."
    ],
    explanation: "MCP servers with the same name are resolved by scope precedence, with local above project and project above user, and the winning entry is used whole. A forgotten local entry can therefore shadow the team's shared configuration."
  },
  {
    id: "sc-devprod-044",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "An engineer asks the agent why a nightly job failed, and points it at a 400,000-line log file. The agent's Read call returns only the first page of the file with a partial-view notice, and the agent concludes from those early lines that the job \"started normally and no error is visible.\" The actual failure is somewhere near the end of the file. How should the agent approach this file?",
    options: [
      "Read the file repeatedly from the start, increasing the page size each time until the whole log fits in a single call.",
      "Use Bash to cat the entire file into the conversation, since shell output is not subject to the Read tool's page limits.",
      "Ask the engineer to copy and paste the last few hundred lines of the log into the chat, as the file is too large for its tools.",
      "Grep the log for error markers to find the relevant line numbers, then Read with offset and limit around those lines."
    ],
    answer: 3,
    optionNotes: [
      "A file of this size will not fit in one read, and reading from the start spends the context on lines that are irrelevant to the failure.",
      "Dumping hundreds of thousands of lines through Bash floods the context and can exceed output limits, hiding the error in noise.",
      "The agent has the tools to do this itself; handing the work back to the engineer defeats the purpose of the tool.",
      "Searching first finds where errors occur, and Read's offset and limit parameters then load only the surrounding lines, which is how large files are meant to be read."
    ],
    explanation: "For large files, locate the region of interest with Grep, then read targeted ranges with offset and limit. A partial first page is not the whole file, so conclusions drawn from it are unreliable."
  },
  {
    id: "sc-devprod-045",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Your boilerplate agent adds a new route to existing 2,000-line router files by reading the file and then calling Write with the complete updated content. Reviewers find occasional unrelated changes in those diffs, such as reflowed comments and a dropped import, and twice the agent overwrote a teammate's edit made while it was working. The agent also creates brand-new handler files. How should it use the file tools?",
    options: [
      "Keep using Write for every change, but ask the agent to double-check that the full content matches the original apart from the route.",
      "Use Bash with a heredoc to rewrite each router file, since shell output tends to preserve the original formatting more faithfully.",
      "Use Edit for targeted changes to existing router files, and Write only when creating new handler files from scratch.",
      "Use Edit for everything, including new handler files, by editing an empty placeholder file that is created beforehand."
    ],
    answer: 2,
    optionNotes: [
      "Regenerating a whole file on each change is what causes the unrelated churn and overwrites. Self-checking a 2,000-line file is unreliable.",
      "A heredoc rewrite has the same whole-file risks as Write and removes the file tools' safety checks.",
      "Edit replaces a specific, uniquely matched span, so only the intended lines change, and it matches against the file's current content. Write is the right tool for creating a new file.",
      "Creating placeholders just to edit them adds steps and no benefit. Write is the intended tool for new files."
    ],
    explanation: "Use Edit for focused modifications to existing files, which limits the change to the matched text and keeps diffs clean. Use Write to create new files or for full replacements you really intend. Rewriting large existing files causes unrelated churn and can overwrite concurrent changes."
  },
  {
    id: "sc-devprod-046",
    scenario: "devprod",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Before a logging migration, the agent must list which files import the legacy logger. It runs Grep across the monorepo with the content output mode, which returns thousands of matching lines with line numbers and fills much of its context. It then loses track of the migration plan it was given earlier in the session. All it needed at this stage was the set of affected files. What should it have done?",
    options: [
      "Use Grep's files_with_matches output mode, which returns only the paths of matching files, and inspect individual files later.",
      "Use Glob with a pattern such as **/*logger*, which returns the matching file names without their content and saves context.",
      "Use Read on each package's index file to see which ones import the logger, then follow their imports from there by hand.",
      "Keep the content mode but ask Claude to summarise the output immediately after it arrives, to release the context it uses."
    ],
    answer: 0,
    optionNotes: [
      "files_with_matches, which is Grep's default mode, returns just the file paths. It answers \"which files\" at a fraction of the context cost, and content mode can be used later on specific files.",
      "Glob matches file names, not imports inside files, so it would miss importers whose names do not contain \"logger\" and include unrelated files.",
      "Tracing imports by hand from index files is slow and misses files that are not reachable from an index.",
      "Summarising after the fact does not remove the thousands of lines already added to the context."
    ],
    explanation: "Choose the Grep output mode that matches the question. Use files_with_matches to find which files contain a pattern, count to see how many matches there are, and content only when the matching lines themselves are needed. This keeps exploration from crowding out the task context."
  },
  {
    id: "sc-devprod-047",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your project CLAUDE.md says \"Never read .env files or anything under secrets/.\" During a debugging session about a failing database connection, Claude Code read .env anyway to check the connection string, and the security team now requires that this can never happen in the repository. Developers use Claude Code interactively and in scripted runs. What change meets the requirement?",
    options: [
      "Move the instruction to the top of CLAUDE.md and mark it as critical in capital letters so that it is given more weight.",
      "Add a skill that explains the secrets policy in detail and is loaded whenever a debugging task touches configuration files.",
      "Rename .env to a name that does not suggest secrets, so that Claude is less likely to look in it during a debugging session.",
      "Add deny rules such as Read(./.env) and Read(./secrets/**) to the project's committed .claude/settings.json file."
    ],
    answer: 3,
    optionNotes: [
      "CLAUDE.md content is guidance that Claude usually follows, but it is not enforced. Emphasis raises compliance without guaranteeing it.",
      "A skill is still guidance and depends on being loaded at the right time, so it cannot provide a guarantee.",
      "Obscuring the file name is security by obscurity and does nothing to stop a read when the agent goes looking for configuration.",
      "Permission deny rules are enforced by Claude Code itself before the tool runs, and committing them in project settings applies them to every developer and scripted run."
    ],
    explanation: "CLAUDE.md is the place for conventions and context, but it does not enforce anything. Requirements that must always hold, such as never reading secrets, belong in permission rules or hooks, which Claude Code applies regardless of what the model decides."
  },
  {
    id: "sc-devprod-048",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "A team lead is reorganising the guidance for the team's productivity agent. The current list mixes items such as \"never push directly to main,\" \"never write inside vendor/,\" \"prefer small, focused functions,\" \"start exploration from the services/ directory\" and \"use the repository's test factories.\" They propose moving all of it into hooks so that \"everything is guaranteed.\" What is the right split?",
    options: [
      "Put everything in hooks as proposed, since deterministic enforcement is always preferable to guidance for any rule an agent follows.",
      "Put everything in CLAUDE.md, since the agent follows its instructions most of the time and hooks add maintenance overhead.",
      "Enforce the hard constraints on pushes and vendor/ with permissions or hooks, and keep style and exploration hints in CLAUDE.md.",
      "Put the style rules in hooks that reject non-conforming code, and the push and vendor/ rules in CLAUDE.md as reminders."
    ],
    answer: 2,
    optionNotes: [
      "Judgement-based guidance such as preferring small functions cannot be expressed as a mechanical check, and forcing it into hooks would produce brittle, frequent false blocks.",
      "Most of the time is not enough for rules whose violation causes real damage, such as pushing to main or editing vendored code.",
      "Constraints with a clear, checkable boundary and a real cost when broken belong in deterministic controls. Conventions that need judgement belong in CLAUDE.md as guidance.",
      "This inverts the split: it hard-blocks subjective style choices and leaves the damaging actions as soft reminders."
    ],
    explanation: "Use deterministic controls, such as permission rules and hooks, for constraints that must never be broken and can be checked mechanically. Use CLAUDE.md for conventions, preferences and context that require judgement. Each mechanism fits a different kind of rule."
  },
  {
    id: "sc-devprod-049",
    scenario: "devprod",
    domain: 3,
    subdomain: "3.4 Determine when to use plan mode vs direct execution",
    question: "Your Agent SDK tool offers a \"propose refactor\" action: the agent should explore an unfamiliar module and present a concrete change plan, and only after an engineer approves it should any source file be modified. In the current version the agent sometimes starts editing during exploration because it is \"confident about the fix.\" Which configuration best supports this workflow?",
    options: [
      "Run the proposal step with permissionMode set to plan, then switch to an editing mode once the engineer approves the plan.",
      "Use acceptEdits for the whole action and rely on git afterwards to revert whatever the engineer does not approve after the run.",
      "Keep the default mode and add a system prompt sentence telling the agent to wait for approval before making edits.",
      "Remove Read and Grep from the proposal step so that the agent proposes changes based on the module's documentation."
    ],
    answer: 0,
    optionNotes: [
      "Plan mode lets Claude explore and plan without editing source files, which matches the propose-then-approve flow. After approval, the session can move to a mode that allows edits.",
      "acceptEdits auto-approves edits, the opposite of what is wanted, and reverting afterwards wastes review effort and risks missed changes.",
      "A prompt sentence is the same soft guidance the agent is already sometimes ignoring when it feels confident.",
      "Without exploration tools the agent cannot understand the unfamiliar module, so its plan would rest on documentation that may be wrong."
    ],
    explanation: "Plan mode separates exploration and design from execution: Claude can read and plan, but file edits are not auto-approved. It fits workflows where a human must approve the approach before changes are made, and the mode can be changed after approval."
  },
  {
    id: "sc-devprod-050",
    scenario: "devprod",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "Your agent builds a service inventory by extracting fields from each repository's manifest and README, using a tool schema in which every field is required. About a third of repositories name no owning team, and many use internal licences that fit none of the listed licence values. Reviewers find invented owner names and licences forced into the wrong category. How should the schema change?",
    options: [
      "Keep every field required, and add a prompt instruction telling Claude to never guess a value when the source does not state one.",
      "Make owner nullable or optional, and add \"other\" and \"unknown\" values to the licence enum, with a free-text detail field.",
      "Remove the licence enum and the owner field entirely, and capture everything as a single free-text notes field per repository.",
      "Keep the schema the same, but run a second extraction pass that asks Claude to double-check the owner and licence values."
    ],
    answer: 1,
    optionNotes: [
      "A required field gives the model nowhere to put \"not stated,\" so the schema itself pushes it to invent a value. A prompt instruction conflicts with that structural pressure.",
      "Allowing null for absent owners and adding other and unknown enum values, with a detail field for the actual licence text, gives the model a valid way to express missing or unlisted information instead of fabricating.",
      "Dropping structure loses the machine-readable fields that downstream tooling needs for the inventory.",
      "A second pass faces the same schema constraints, so it cannot record a missing owner or an unlisted licence either."
    ],
    explanation: "Design extraction schemas so that absence and ambiguity are expressible. Make fields that may be missing nullable or optional, and give enums escape values such as other or unknown with a detail field. Forcing a value where the source has none leads to fabrication."
  },
  {
    id: "sc-devprod-051",
    scenario: "devprod",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Your agent generates boilerplate from templates, and generated files run through the linter and compiler before a PR is opened. About 15% fail, and the current handling is simply to regenerate until the checks pass, which costs extra calls and sometimes never converges. Nobody knows which templates or instructions cause most of the failures. What should you add?",
    options: [
      "Raise the regeneration limit from three attempts to ten, so that a larger share of generations eventually pass the checks.",
      "Lower the model temperature for all generation calls, so that each regeneration attempt produces more consistent results.",
      "Drop the lint step for generated files, keeping only the compile step, which halves the number of checks that can fail.",
      "Record structured failure data, such as template, rule ID, file and message, retry with that error, and review the patterns."
    ],
    answer: 3,
    optionNotes: [
      "More blind retries add cost and still learn nothing about why generations fail.",
      "Lower temperature may reduce variation but does not address systematic errors caused by particular templates or instructions.",
      "Removing a check hides failures rather than fixing them, and lint rules usually encode real team standards.",
      "Retrying with the specific error gives the model what it needs to correct the output, and aggregating structured failure metadata shows which templates and rules need fixing at the source."
    ],
    explanation: "A good validation loop does two things: it feeds the specific validation error back into the retry so the model can correct it, and it records structured failure data so recurring patterns can be traced to the templates, prompts or schemas that cause them."
  },
  {
    id: "sc-devprod-052",
    scenario: "devprod",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your tool has two Claude workloads. One generates docstrings for about 3,000 undocumented legacy functions every night, with results needed by the next morning. The other answers engineers' \"explain this function\" requests inside the IDE, where they wait for the answer. Both currently use synchronous Messages API calls, and the nightly job is the main cost driver. How should these be processed?",
    options: [
      "Move both workloads to the Message Batches API, since the 50% cost saving applies equally well to each of them.",
      "Keep both synchronous, and reduce the nightly job's cost by running it with fewer concurrent requests at a time.",
      "Use the Message Batches API for the nightly docstring job and keep the IDE explanations on synchronous Messages calls.",
      "Use the Message Batches API for the IDE explanations, since they are short, and keep the large nightly job on synchronous calls."
    ],
    answer: 2,
    optionNotes: [
      "Batches can take up to 24 hours to complete and have no latency guarantee, which is unacceptable for an engineer waiting in the IDE.",
      "Lower concurrency spreads the same synchronous calls out over time without reducing their per-token cost.",
      "The nightly job is high volume and tolerant of latency, so the Batches API's lower cost fits it. Interactive requests need synchronous responses.",
      "This inverts the fit: interactive requests need immediate answers, while the latency-tolerant nightly job is where batching saves money."
    ],
    explanation: "The Message Batches API costs about half as much as standard calls but processes requests asynchronously, with most batches finishing within an hour and a 24-hour limit. Use it for large, latency-tolerant jobs, and keep work that someone is waiting for on synchronous calls."
  },
  {
    id: "sc-devprod-053",
    scenario: "devprod",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "To cut costs, a teammate moved the weekly dependency audit into the Message Batches API. Each audit needs the agent to call Read and Grep several times, look at the results and decide what to inspect next, across many turns. After the change, every batch result contains only a first response that requests a tool, and no audit completes. What is the problem and a sound redesign?",
    options: [
      "Each batch request is a single Messages call that cannot run tools; keep the multi-turn audit synchronous, or batch only single-shot steps.",
      "The batch is too large to finish in time; split it into several smaller batches so that each one has enough time to finish all its tool calls.",
      "The batch needs tool_choice set to auto; with that setting, the Batches API runs the tool loop for each request on its own.",
      "Batch results expire before the tools run; download the results more often so that the tool calls are not lost in between."
    ],
    answer: 0,
    optionNotes: [
      "A batch request produces one response, and nothing runs tools between turns. Multi-turn tool use needs your own loop, so either keep the audit synchronous or restructure it into independent single-shot requests that suit batching.",
      "Batch size is not the issue; even one request would stop at its first tool request.",
      "tool_choice controls whether Claude calls a tool, not who executes it. The Batches API never executes your tools.",
      "Results remain available for days after a batch ends, and retrieving them sooner would not make tools run."
    ],
    explanation: "Each Message Batches request is an independent, single Messages API call. It can return a tool_use request but cannot carry out a multi-turn tool loop. Batch the parts of a workflow that are single-shot and latency-tolerant, and keep iterative agentic work on synchronous calls."
  },
  {
    id: "sc-devprod-054",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "At the start of a long SDK session, an engineer told the agent \"do not change any public API signatures in this refactor,\" and the agent followed that for the first hour. After the conversation was automatically compacted, the agent began renaming public methods and adjusting their parameters. The constraint applies to every session on this codebase. What is the best way to make sure it survives?",
    options: [
      "Repeat the constraint in each new prompt sent to the session, so that it stays among the most recent messages in context.",
      "Lower the model's effort level so that the session uses fewer tokens per turn and reaches the compaction threshold later.",
      "Disable automatic compaction for these sessions, so that the original instruction is never summarised away while the refactor is under way.",
      "Put the constraint in the project's CLAUDE.md, loaded via settingSources, so it is re-injected on every request after compaction."
    ],
    answer: 3,
    optionNotes: [
      "Repeating the rule manually is easy to forget and adds noise to every prompt; it relies on the engineer rather than the configuration.",
      "Using fewer tokens only delays compaction, and the instruction is lost just the same when it eventually happens.",
      "Without compaction, the session simply runs out of context instead; this trades one failure for another.",
      "Compaction summarises older history, so early instructions can be lost. CLAUDE.md content is loaded with every request, so a persistent rule stored there survives compaction."
    ],
    explanation: "Automatic compaction replaces older messages with a summary, and specific instructions from early in a session may not survive it. Rules that must persist belong in CLAUDE.md, which is re-injected on each request, and CLAUDE.md can also tell the compactor what to preserve."
  },
  {
    id: "sc-devprod-055",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "A coordinator delegates a dependency upgrade check to one subagent per package. The subagent for the payments package hits a registry rate limit halfway through its work. It currently either throws, which aborts the entire coordinator run and discards results from 30 other packages, or returns \"no outdated dependencies,\" which is false. How should failures in this subagent be handled?",
    options: [
      "Return a generic message such as \"analysis failed\" so that the coordinator knows something went wrong and can stop.",
      "Keep throwing on any error, so problems are never hidden, and rerun the whole coordinator workflow once the limit resets.",
      "Retry the rate-limited call indefinitely inside the subagent until it succeeds, so that the coordinator never sees a failure.",
      "Retry transient errors locally a few times, then return the partial results with the error type and what was left unchecked."
    ],
    answer: 3,
    optionNotes: [
      "A generic message gives the coordinator no basis for deciding whether to retry, continue with a gap or escalate, and wastes the partial work.",
      "Aborting everything on one local failure discards valid results from the other packages and makes the workflow fragile.",
      "Unbounded retries can hang the whole run, and the coordinator gets no signal about the delay or the risk.",
      "Recover locally from what is probably transient, and when recovery fails, propagate structured context: the failure type, partial results and what remains unchecked, so the coordinator can decide what to do."
    ],
    explanation: "Subagents should handle transient failures locally with bounded retries. When they cannot recover, they should report the failure in a structured way, with category, partial results and coverage gaps, rather than crashing the whole workflow or returning a false clean result."
  },
  {
    id: "sc-devprod-056",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "Midway through implementing a feature flag cleanup in Claude Code, an engineer needs to know every place a legacy flag is read across about 600 files, including indirect reads through helper wrappers. Doing the search in the main conversation would add hundreds of matches and file excerpts to a context that already holds the agreed implementation plan. What is the best way to get this information?",
    options: [
      "Run the searches in the main conversation and use /compact afterwards to shrink the results once they have been gathered.",
      "Clear the conversation with /clear, perform the search, and then re-explain the implementation plan from memory afterwards.",
      "Delegate the search to the read-only Explore subagent, which does the exploration in its own context and returns a summary.",
      "Ask Claude to search only the 50 most recently modified files, which keeps the search results small enough for the context."
    ],
    answer: 2,
    optionNotes: [
      "The matches still enter the main context before compaction, and compaction is a lossy summary that may drop details of the plan.",
      "Clearing discards the agreed plan and its reasoning, which then has to be reconstructed by hand.",
      "A subagent explores in its own context and returns only its findings, so the verbose search output never reaches the main conversation and the plan stays intact.",
      "Restricting the search to recent files would miss older reads of the flag, which defeats the purpose of finding every use."
    ],
    explanation: "Use subagents to isolate verbose exploration. The Explore subagent searches and reads in a separate context and returns a concise summary, so the main conversation keeps room for the plan and implementation."
  },
  {
    id: "sc-devprod-057",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "An engineer is spending several days with the agent mapping a large legacy claims system. Each day's session discovers useful facts, such as which services own which tables and where the hidden batch jobs live, but after compactions and new sessions the agent rediscovers the same things and occasionally contradicts its earlier conclusions. What practice best preserves the accumulated understanding?",
    options: [
      "Have the agent keep a structured notes file in the repository, updating it with findings and re-reading it at each session start.",
      "Resume one single session for the whole project every day, so that every discovery stays inside a single conversation history.",
      "Ask the agent to begin each day by re-exploring the system from scratch, so that its understanding of it is always completely current.",
      "Paste the full transcripts from earlier days into the first message of each new session, so no detail is left behind at all."
    ],
    answer: 0,
    optionNotes: [
      "A persistent notes file acts as an external memory: key findings survive compaction and new sessions, and the agent can re-read a compact, curated summary instead of rediscovering facts.",
      "A single ever-growing session will still be compacted repeatedly, losing exactly the details that matter.",
      "Re-exploring every day wastes hours and is what causes the inconsistent conclusions in the first place.",
      "Full transcripts consume a large part of the context and bury the key findings among old tool output."
    ],
    explanation: "For long explorations, write findings to a persistent scratchpad file and have the agent consult and update it. Conversation history is temporary and gets compacted, but a curated notes file carries understanding across sessions efficiently."
  },
  {
    id: "sc-devprod-058",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "After three hours of exploring a payments service in Claude Code, the engineer notices that responses are slower and less precise, because the context is full of old file reads and test output. The session also holds a list of 14 confirmed call sites and two design decisions that the remaining work depends on. The engineer wants to keep working in this session. What should they do?",
    options: [
      "Run /clear to empty the context, then continue the work and let Claude rediscover each of the call sites as and when it is needed.",
      "Run /rewind to go back to a checkpoint from before the exploration started, removing the old file reads from context.",
      "Run /compact with instructions to keep the confirmed call sites and design decisions, then carry on in the same session.",
      "Ignore the slowdown, since the session will eventually compact automatically once it reaches the context window limit."
    ],
    answer: 2,
    optionNotes: [
      "Clearing removes the call-site list and design decisions along with the noise, forcing costly rediscovery.",
      "Rewinding to before the exploration also discards the discoveries made during it.",
      "Compaction frees space by summarising history, and focus instructions tell it what must be preserved, so the noise goes while the critical findings stay.",
      "Waiting lets quality degrade further, and automatic compaction has no guidance about which findings matter most."
    ],
    explanation: "/compact summarises the conversation to free context, and you can pass instructions about what to keep. That makes it the right tool when a long session is bloated with stale output but holds findings the remaining work depends on."
  },
  {
    id: "sc-devprod-059",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "Your coordinator delegates exploration of six legacy services to subagents in parallel. Each subagent returns a narrative report of about 5,000 words, including file excerpts and its step-by-step reasoning. By the time all six reports arrive, the coordinator's context is crowded, and its synthesis misses details from the middle reports. How should you change the subagents?",
    options: [
      "Have each subagent return its complete transcript instead of a report, so that the coordinator can select the details itself.",
      "Run the subagents one at a time instead of in parallel, so the coordinator processes each report before the next arrives.",
      "Define a concise return format in each subagent's prompt: key findings with file paths and line ranges, and open questions.",
      "Ask the coordinator to skim each report quickly and to ignore any section that does not look relevant to the question."
    ],
    answer: 2,
    optionNotes: [
      "Full transcripts are larger still and defeat the purpose of using subagents to isolate context.",
      "Sequencing the reports does not shrink them; the same 30,000 words still accumulate in the coordinator's context.",
      "A subagent's final message is all the parent receives, so specifying a compact, structured return format keeps the coordinator's context focused on findings and their sources.",
      "Asking the coordinator to skim still loads every report in full and invites the same lost-in-the-middle omissions."
    ],
    explanation: "Subagents save the parent's context only if what they return is concise. Specify the output format in each subagent's prompt, such as findings with file references and open questions, so the coordinator can synthesise across many subagents without its context overflowing."
  },
  {
    id: "sc-devprod-060",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Your agent opens automated PRs that migrate call sites from a deprecated API, and it reports a confidence score for each PR. Leadership wants to auto-merge PRs scoring above 0.9. A review of past PRs shows most failures came from call sites using reflection or dynamically built method names, and several of those PRs had scored above 0.9. What review policy is most reliable?",
    options: [
      "Auto-merge every PR above 0.9 as proposed, and rely on the test suite to catch any of the problems that slip through after the merge.",
      "Calibrate thresholds against labelled past PRs, and always route PRs that touch reflection or dynamic dispatch to a human.",
      "Raise the auto-merge threshold to 0.99 for every PR, which should filter out the few risky changes that remain.",
      "Require a human review for every PR indefinitely, since the model's confidence scores have already proved unreliable once."
    ],
    answer: 1,
    optionNotes: [
      "Uncalibrated self-reported confidence already let risky PRs score highly, and tests may not cover dynamically dispatched calls.",
      "Calibrating against labelled outcomes shows where confidence actually predicts correctness, and routing known ambiguous patterns to humans keeps review effort on the riskiest changes.",
      "A higher threshold on an uncalibrated score does not fix the scoring; risky PRs can still score highly.",
      "Reviewing everything is safe but wastes reviewer capacity on the many straightforward migrations that are reliably correct."
    ],
    explanation: "Self-reported confidence must be calibrated against labelled outcomes before it can drive automation. Combine calibrated thresholds with rules that send known ambiguous cases, such as reflection or dynamic dispatch, to human review."
  },
  {
    id: "sc-devprod-061",
    scenario: "devprod",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "An engineer asks the agent how many times the legacy payment client retries a failed charge. The README says three retries, a code comment in client.py says five, and the code reads the value from a RETRY_LIMIT setting whose default is four. The agent's current answer simply states \"three retries\" from the README, with no mention of the other sources. What should the agent's answer look like?",
    options: [
      "Report the README value, because documentation describes the intended behavior and is the most authoritative source for the system.",
      "Report the code comment value, since a comment placed directly next to the code is more likely to be current than a README file.",
      "Report the default of four from the code, cite each conflicting source by file, and note that the deployed setting needs checking.",
      "Report the average of the three values as the likely retry count, and mention that the sources disagree somewhat on the exact number."
    ],
    answer: 2,
    optionNotes: [
      "Documentation in legacy systems often drifts from the code, and picking it silently hides the conflict from the engineer.",
      "Comments drift too, and choosing one source silently still hides that the sources disagree.",
      "The code's default is the strongest evidence of runtime behavior, citing each source exposes the conflict, and flagging the unverified deployed setting marks what remains uncertain.",
      "An average is a number no source states, and it blurs the conflict instead of explaining it."
    ],
    explanation: "When sources conflict, keep the attribution of each value, say which is the strongest evidence, and flag what remains unverified. Do not silently pick one source or blend them."
  }
);
