// Domain 1 — multiple-response questions (select two), 11 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d1-m01",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "An unattended nightly agent built on the Claude Agent SDK repairs flaky tests. Two problems have appeared: one run explored a large monorepo for hours and produced an unexpectedly large bill, and several runs end without a final answer even though the work was nearly done. Which TWO changes address these problems directly? (Select TWO.)",
    options: [
      "Switch permissionMode to 'bypassPermissions' so the loop never stalls waiting on an approval that nobody is awake to give.",
      "Set maxBudgetUsd (max_budget_usd) so the loop stops with an error_max_budget_usd result once estimated spend reaches the cap, leaving headroom because the response that crosses the cap still completes.",
      "Set maxTurns to 1 so each query performs exactly one tool call and your own harness drives the rest of the work.",
      "Inspect the ResultMessage subtype and, when it is error_max_turns, resume that session with a higher limit instead of restarting the task from scratch.",
      "Add an instruction to the system prompt telling Claude to stop once it judges that it has spent enough time on the task."
    ],
    answers: [1, 3],
    explanation: "maxBudgetUsd is the documented spend control for the loop: the SDK ends the run with an error_max_budget_usd result subtype once estimated spend reaches the cap, and the docs warn to leave headroom because the response that crosses the cap still completes. Checking the result subtype and resuming on error_max_turns is the documented recovery path for a run that hit a limit, because resuming restores the full prior context instead of re-doing the analysis. Bypassing permissions removes an approval gate but does nothing about cost or truncation, and it weakens safety on an unattended run. maxTurns of 1 makes things worse, since a run must also leave room for the final text-only turn, and asking the model to police its own spend in the prompt is steering, not an enforced limit.",
  },
  {
    id: "d1-m02",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "A developer new to the Claude Agent SDK is reasoning about how a single query() call progresses. Which TWO statements about the agent loop are accurate? (Select TWO.)",
    options: [
      "Tool results are fed back into the same loop automatically; you do not call query() again to continue after a tool runs.",
      "Each turn starts from a fresh context window, so a long session does not accumulate tokens from earlier tool outputs.",
      "The loop ends as soon as any tool returns an error, because an error result cannot be passed back to the model.",
      "maxTurns is effectively a cost ceiling, since every turn in a session costs about the same number of tokens.",
      "The loop continues until Claude produces a response containing no tool calls, so a capped run has to leave room for that final text-only turn."
    ],
    answers: [0, 4],
    explanation: "The loop is self-driving within a call: the SDK executes the requested tools, feeds the results back, and repeats until Claude answers with no tool calls, which is also why a maxTurns cap must count the final text-only turn or the run ends as error_max_turns with no result text. Context does not reset between turns — the system prompt, history, tool inputs and tool outputs all accumulate, which is exactly why automatic compaction and subagents exist. A tool error does not end the loop; the error comes back as a tool result and Claude typically tries another approach. And maxTurns is a turn count, not a spend cap: turns vary enormously in token cost, which is why maxBudgetUsd exists as a separate option.",
  },
  {
    id: "d1-m03",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "A coordinator agent fans a pull-request review out to three specialized subagents (style, security, test coverage) rather than doing all three reviews itself. Which TWO benefits of this coordinator-subagent design are accurate per the Agent SDK's documented behavior? (Select TWO.)",
    options: [
      "Context isolation: a subagent's intermediate tool calls and results stay inside its own context, and only its final message returns to the coordinator.",
      "Shared memory: subagents can read the coordinator's conversation history, so the coordinator does not need to restate file paths or constraints in the delegation.",
      "Parallelization: independent subagents run concurrently, so the fan-out finishes in roughly the time of the slowest reviewer rather than the sum of all three.",
      "Cost isolation: a subagent's token usage is accounted for separately and does not count toward the parent query's total cost.",
      "Tool safety: any tool you leave out of a subagent's tools list still exists in its session but triggers a permission prompt the coordinator must approve."
    ],
    answers: [0, 2],
    explanation: "Context isolation and parallelization are the two headline benefits in the SDK docs: a subagent can read dozens of files without any of that landing in the coordinator's context, because only its final report comes back, and independent subagents run concurrently so the fan-out costs the slowest reviewer's wall time. Shared memory is the most common misconception here — a non-fork subagent starts fresh, and the only thing passed from parent to child is the Agent tool's prompt string, so the coordinator must brief it explicitly. Subagent spend is not isolated: it counts toward the query's total_cost_usd and toward maxBudgetUsd. And a tool omitted from the tools list is simply absent from the subagent's session, with no prompt and no error.",
  },
  {
    id: "d1-m04",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "A team ships a coordinator agent and finds that a single prompt sometimes grows into a tree of agents: subagents spawn their own subagents, dozens run at once, and one run cost six times the estimate. They need bounds that hold regardless of how the model decides to delegate. Which TWO measures provide that? (Select TWO.)",
    options: [
      "Lower the coordinator's effort setting to 'low', since effort governs how many subagents the model is permitted to spawn.",
      "Add a line to the project instructions telling Claude not to delegate, and rely on the model following it.",
      "Set CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH through the env option so subagents at the bottom layer cannot spawn subagents of their own.",
      "Set maxBudgetUsd on the query: subagent requests count toward it, and at the cap further spawns are refused and background subagents are stopped.",
      "Switch the coordinator to permissionMode 'plan' so subagent work is planned but never executed."
    ],
    answers: [2, 3],
    explanation: "The documented hard bounds on a growing agent tree are the depth and concurrency environment variables and the spend cap: CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH limits nesting, and maxBudgetUsd counts every subagent's requests, refusing new spawns and stopping background subagents once the cap is reached. Effort controls reasoning depth per response, not delegation fan-out, so lowering it changes cost per turn but sets no ceiling on the tree. A prompt instruction is the tempting half-answer — Anthropic's own guidance for delegation-happy models is to add such an instruction *and* set the limits, because the instruction only steers. Plan mode restricts file edits during exploration; it is not a delegation control.",
  },
  {
    id: "d1-m05",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "An engineer is debugging why a research subagent keeps asking for information the main agent already established. Which TWO statements correctly describe what a non-fork subagent starts with in the Claude Agent SDK? (Select TWO.)",
    options: [
      "It inherits the parent's conversation history up to the moment of the spawn, minus the parent's tool results.",
      "The only content passed from parent to child is the Agent tool's prompt string, so file paths, error messages, and prior decisions must be stated there.",
      "It inherits the parent agent's system prompt in addition to its own AgentDefinition prompt.",
      "Its full transcript, including every tool call and result, is appended to the parent's context when it finishes.",
      "It starts with its own system prompt from the AgentDefinition plus the tool definitions it is allowed to use."
    ],
    answers: [1, 4],
    explanation: "A non-fork subagent's context window starts fresh but not empty: it contains its own AgentDefinition prompt, the tool definitions it is permitted to use, and the Agent tool's prompt string — which is the only channel from parent to child, so everything the subagent needs has to be written into that delegation prompt. It does not receive the parent's conversation history or the parent's system prompt; a fork is the separate mechanism that copies the conversation. And the transfer back is equally narrow: the parent receives only the subagent's final report, not its transcript, which is precisely the context-isolation benefit that makes delegation worthwhile.",
  },
  {
    id: "d1-m06",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "A team defines a db-migrator subagent both as a markdown file in .claude/agents/ and programmatically in the agents option, and finds that Claude almost never delegates to it. Which TWO statements are correct? (Select TWO.)",
    options: [
      "The programmatic definition passed in the agents option takes precedence over the filesystem agent with the same name.",
      "The filesystem definition always wins, because Claude Code watches .claude/agents/ and reloads it during the session.",
      "Adding the agent's name to allowedTools is what makes it invocable; without that entry the Agent tool cannot reach it.",
      "Claude picks a subagent from each definition's description, so a vague description is a common cause of non-delegation, and naming the agent explicitly in the prompt bypasses automatic matching.",
      "Leaving out the tools field blocks the subagent from using any tools until each one is granted individually."
    ],
    answers: [0, 3],
    explanation: "Programmatic agents override filesystem agents of the same name, so the in-code definition is the one actually in play — worth knowing before editing the markdown file in search of a fix. Delegation itself is driven by the description field, which is how Claude matches a task to an agent; the documented remedies for non-delegation are a sharper description or naming the agent in the prompt to bypass matching. The filesystem-wins claim inverts the real precedence rule. allowedTools lists tool names such as Agent, not subagent names. And omitting tools has the opposite effect of the one described: the subagent inherits the full set of tools available to subagents, which is why restricting that list is the recommended safety move.",
  },
  {
    id: "d1-m07",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "A release agent must never run the deploy script before the test suite has passed. Twice the agent deployed first and ran tests afterward. The team needs the ordering to hold on every run, not merely most runs. Which TWO changes provide actual enforcement? (Select TWO.)",
    options: [
      "Add 'CRITICAL: You MUST NEVER deploy before the tests pass' in capitals near the top of the system prompt.",
      "Raise effort to 'max' so the model reasons more carefully about the order of operations.",
      "Register a PreToolUse hook matched to Bash that inspects the command and returns permissionDecision 'deny' with a reason when a deploy command is attempted before a recorded passing test run.",
      "Register a PostToolUse hook that detects a deploy and instructs Claude to roll it back.",
      "Restructure the run as an explicit multi-step workflow in which your code runs the test step and only invokes the deploy step after programmatically checking the result."
    ],
    answers: [2, 4],
    explanation: "Enforcement means the constraint lives in code the model cannot talk its way past. A PreToolUse hook is the SDK's interception point: it sees the tool name and arguments before execution and can return permissionDecision 'deny' with a reason, which blocks the call and tells the model why. Moving the ordering into an orchestrated workflow — your code runs the tests, checks the result, and only then calls the deploy step — is the same idea expressed as control flow, and matches Anthropic's prompt-chaining pattern with a programmatic gate between steps. Emphatic prompt language and higher effort both only make compliance more likely, and current models tend to over-apply shouted instructions rather than treat them as guarantees. A PostToolUse rollback fires after the deploy has already happened, which is remediation rather than prevention.",
  },
  {
    id: "d1-m08",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "In a four-stage content pipeline, stage 2 hands stage 3 a free-prose summary. Stage 3 occasionally misreads an implied field and the pipeline completes with a confidently wrong deliverable that only a human notices much later. Which TWO changes best address the handoff failure? (Select TWO.)",
    options: [
      "Define a structured artifact — a schema-constrained JSON object or a file on disk — as the contract between stages, so each handoff carries exactly the fields the next stage needs.",
      "Add a programmatic gate between stages that validates the artifact before the next stage starts and routes a failed check back for a retry instead of letting it propagate.",
      "Collapse all four stages into a single prompt so there is no handoff to get wrong.",
      "Pass the complete transcript of each stage into the next stage so no information can be lost.",
      "Upgrade stage 3 to a more capable model so it can infer the missing field correctly."
    ],
    answers: [0, 1],
    explanation: "The failure is a contract problem, not a capability problem: prose handoffs leave fields implied, so the fix is to make the boundary explicit with a structured artifact and to check that artifact at a gate before the next stage consumes it. That pairing is exactly Anthropic's prompt-chaining pattern, where programmatic checks between steps catch errors while they are still cheap instead of letting a bad input ride to the end. Collapsing the pipeline is tempting because it removes the handoff, but it also removes the per-step validation and control that motivated decomposing the work. Forwarding full transcripts floods the next stage's context with noise and still leaves the key field implied, and a stronger model at stage 3 only reduces the frequency of an error the pipeline still has no way to detect.",
  },
  {
    id: "d1-m09",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "A CRM lookup exposed through an MCP server returns a large JSON payload with inconsistent date formats and raw customer email addresses. The team wants Claude to see a normalized, redacted version of the result, and also wants the query arguments canonicalized before the call goes out. Which TWO hook mechanisms do this? (Select TWO.)",
    options: [
      "Return the normalized payload in a PostToolUse hook's top-level systemMessage field, which inserts the text into the conversation for the model to read.",
      "Return updatedToolOutput inside hookSpecificOutput from a PostToolUse hook to replace the tool's output before Claude sees it.",
      "Return updatedInput inside hookSpecificOutput from a PreToolUse hook to rewrite the tool's arguments before the call executes.",
      "Set the hook's matcher to the customer-id argument so the hook fires only for records that contain personal data.",
      "Return async: true from the hook so the normalization work runs without blocking the agent loop."
    ],
    answers: [1, 2],
    explanation: "PreToolUse and PostToolUse are the documented interception points for exactly this shape of work: updatedInput inside hookSpecificOutput rewrites the tool's arguments before execution, and updatedToolOutput inside hookSpecificOutput replaces the tool's output before Claude reads it (additionalContext only appends, which would leave the raw emails in place). systemMessage is the trap in this set — it surfaces text to the user, not to the model, so it cannot be used to feed Claude a cleaned payload. Matchers test the event's target, which for tool hooks is the tool name, not an argument value, so per-record filtering belongs inside the callback. And an async hook explicitly cannot block, modify, or inject context, since the loop has already moved on by the time it finishes.",
  },
  {
    id: "d1-m10",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "A task that a single well-written prompt handled acceptably has been rebuilt as a seven-step chained workflow. The rebuilt version is slower and more expensive, quality scores are flat, and most new failures come from steps mis-reading the previous step's output. Which TWO lessons follow from Anthropic's guidance on building effective agents? (Select TWO.)",
    options: [
      "The remedy is an eighth step that reviews the output of the previous seven before it is returned.",
      "Decomposition failures are a model-capability problem, so each step should be moved to a larger model.",
      "Each step should itself be made agentic, with its own tool loop, so it can self-correct when the input looks wrong.",
      "The guidance is to find the simplest solution that works and add complexity — multi-step workflows, then agents — only when it demonstrably improves outcomes, which did not happen here.",
      "Every handoff is an additional failure surface as well as added latency and cost, so a step earns its place only when it isolates a genuinely distinct, well-defined subtask."
    ],
    answers: [3, 4],
    explanation: "Anthropic's consistent advice is to start with the simplest approach and only escalate to workflows or agents when the added complexity measurably improves results; here it did not, so the honest conclusion is that the decomposition was not warranted. The concrete mechanism behind the regression is that each handoff adds latency, cost, and a new place for information to be lost, which is why steps should map to genuinely distinct, well-defined subtasks rather than to arbitrary slices of one task. Adding a review step, upgrading models, or making every step agentic are all tempting because they are real techniques, but each adds yet more complexity on top of complexity that is not paying for itself, and none of them removes the handoffs that are producing the failures.",
  },
  {
    id: "d1-m11",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "An agent session has analyzed an auth module and sketched a JWT approach. The team wants to explore an OAuth2 alternative while keeping the ability to return to the JWT thread exactly as it stands. Which TWO statements about doing this with the Claude Agent SDK are correct? (Select TWO.)",
    options: [
      "Pass resume with the session ID together with forkSession: true (fork_session=True in Python); the fork gets its own new session ID and the original history is left unchanged.",
      "Forking also snapshots the working tree, so any file edits the forked run makes are reverted when you go back to the original session.",
      "The session ID can be read from the result message's session_id field, which is present on every result regardless of success or error.",
      "continue: true is the right option here, because it branches from the most recent session in the directory.",
      "Session transcripts are stored centrally by the API, so any host can resume a session by passing its ID."
    ],
    answers: [0, 2],
    explanation: "Forking is resume plus forkSession/fork_session: the new run starts from a copy of the original's history, receives its own session ID, and leaves the original untouched so both threads can be resumed independently. The ID itself comes from session_id on the result message, which the docs note is present on every result whether the run succeeded or errored (TypeScript also exposes it earlier on the init system message). Forking branches the conversation only — file edits a fork makes are real and visible to anything working in that directory, with file checkpointing being the separate feature for reverting changes. continue: true resumes the most recent session rather than branching it, so it would extend the JWT thread instead of preserving it. And transcripts are local files on the machine that created them, which is why cross-host resumption needs a session store adapter or a copied transcript.",
  }
);
