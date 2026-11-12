// Domain 1: Agentic Architecture & Orchestration — 49 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d1-q01",
    domain: 1,
    question: "According to Anthropic's guidance on building agents, what is the core loop that an agent repeats while working on a task?",
    options: [
      "Plan the entire task upfront, execute all steps, then report results",
      "Gather context, take action, verify work, and repeat",
      "Prompt, cache, compress, and summarize",
      "Classify the request, route to a specialist, and return the specialist's answer"
    ],
    answer: 1,
    explanation: "Anthropic describes the agent loop as gathering context, taking action, verifying the work, and repeating until the task is done. Upfront full planning describes a workflow, and classify-and-route describes the routing pattern, not the agent loop."
  },
  {
    id: "d1-q02",
    domain: 1,
    question: "In Anthropic's 'Building effective agents' terminology, what is the key distinction between a workflow and an agent?",
    options: [
      "Workflows use a single LLM call while agents always use multiple models",
      "Workflows run on the server while agents run on the client",
      "Workflows orchestrate LLMs and tools through predefined code paths, while agents let the model dynamically direct its own process and tool usage",
      "Workflows cannot use tools, while agents are defined by their tool use"
    ],
    answer: 2,
    explanation: "The documented distinction is about who controls the control flow: workflows follow developer-defined code paths, while agents let the LLM decide its own steps and tool usage dynamically. Both can use tools and multiple calls."
  },
  {
    id: "d1-q03",
    domain: 1,
    question: "An architect is designing a system that extracts invoice fields from uploaded PDFs with a fixed, well-understood sequence of steps. Following Anthropic's guidance, what should they build?",
    options: [
      "A deterministic workflow (or even a single LLM call), since the steps are predictable and don't require model-driven decision making",
      "A full autonomous agent, since agents outperform workflows on all tasks",
      "An orchestrator-workers system with one subagent per invoice field",
      "An evaluator-optimizer loop that iterates until the extraction is perfect"
    ],
    answer: 0,
    explanation: "Anthropic's guidance is to find the simplest solution that works: agents add cost, latency, and unpredictability, so predictable tasks with fixed steps are better served by workflows or single calls. The other options add agentic complexity the task does not need."
  },
  {
    id: "d1-q04",
    domain: 1,
    question: "A team is deciding whether a customer-support automation task justifies building an agent. Which combination of factors most closely matches Anthropic's recommended checklist for that decision?",
    options: [
      "Team size, programming language, and cloud provider",
      "Task complexity, value of the outcome, model viability on the task, and the cost of errors / ability to catch them",
      "Number of available tools, context window size, and token price",
      "Whether the task requires streaming and whether users are internal or external"
    ],
    answer: 1,
    explanation: "Anthropic recommends checking that the task is complex and hard to fully specify, valuable enough to justify agent cost, something the model is actually capable of, and that errors can be caught and recovered from. The other lists are operational details, not the documented decision criteria."
  },
  {
    id: "d1-q05",
    domain: 1,
    question: "Which scenario is the strongest candidate for an agent rather than a workflow?",
    options: [
      "Translating product descriptions into five fixed languages every night",
      "Classifying support tickets into one of four queues",
      "Generating a weekly report from a SQL query with a fixed template",
      "Resolving a software bug where the files to inspect, the fix, and the validation steps cannot be known in advance"
    ],
    answer: 3,
    explanation: "Open-ended tasks where the number and nature of steps can't be predicted in advance are the documented sweet spot for agents. The other three are predictable, repeatable tasks that are cheaper and more reliable as workflows or single calls."
  },
  {
    id: "d1-q06",
    domain: 1,
    question: "What is the 'prompt chaining' workflow pattern?",
    options: [
      "Sending the same prompt to several models and picking the majority answer",
      "Decomposing a task into a fixed sequence of LLM calls, where each call processes the previous call's output, optionally with programmatic checks (gates) between steps",
      "Letting the model call itself recursively until it decides to stop",
      "Appending every prior conversation turn to the prompt so context is never lost"
    ],
    answer: 1,
    explanation: "Prompt chaining splits a task into sequential subtasks, each handled by its own LLM call, with optional gates validating intermediate output. It trades latency for accuracy by making each call simpler. The other options describe voting, recursion, and ordinary conversation history."
  },
  {
    id: "d1-q07",
    domain: 1,
    question: "A team routes incoming queries through a cheap classification step: billing questions go to a prompt tuned for billing, technical questions to a technical prompt, and refund requests to a human. Which orchestration pattern is this?",
    options: [
      "Evaluator-optimizer",
      "Parallelization (sectioning)",
      "Routing",
      "Orchestrator-workers"
    ],
    answer: 2,
    explanation: "Routing classifies an input and directs it to a specialized downstream handler, allowing separation of concerns and specialized prompts per category. No parallel fan-out, iterative critique, or dynamic task decomposition is involved."
  },
  {
    id: "d1-q08",
    domain: 1,
    question: "When is the routing pattern most appropriate, according to Anthropic's guidance?",
    options: [
      "When the task has distinct categories that are better handled separately, and classification can be done accurately",
      "When subtasks cannot be predicted in advance and must be determined dynamically",
      "When the output quality improves with repeated critique and revision",
      "When every request needs the most capable model regardless of difficulty"
    ],
    answer: 0,
    explanation: "Routing works when inputs fall into distinct categories that benefit from specialized handling and the classifier is reliable — it also enables cost optimization, such as sending easy queries to a smaller model. Dynamic decomposition is orchestrator-workers; iterative critique is evaluator-optimizer."
  },
  {
    id: "d1-q09",
    domain: 1,
    question: "Anthropic's parallelization pattern has two main variants. What are they?",
    options: [
      "Mapping and reducing",
      "Sectioning (splitting a task into independent subtasks run concurrently) and voting (running the same task multiple times for diverse answers)",
      "Sharding (splitting the context window) and mirroring (duplicating the system prompt)",
      "Pipelining (sequential stages) and batching (grouped requests)"
    ],
    answer: 1,
    explanation: "The documented variants are sectioning — independent subtasks run in parallel — and voting — the same task run multiple times to get diverse outputs or higher-confidence judgments. The other pairs are not Anthropic's terminology for this pattern."
  },
  {
    id: "d1-q10",
    domain: 1,
    question: "A content moderation system runs the same policy check three times with differently-worded prompts and flags content if any run flags it. Which pattern variant does this implement?",
    options: [
      "Prompt chaining with gates",
      "Orchestrator-workers",
      "Evaluator-optimizer",
      "Parallelization using the voting variant"
    ],
    answer: 3,
    explanation: "Running the same task several times and aggregating the results (here, flag-if-any-flags) is the voting form of parallelization — Anthropic cites exactly this kind of moderation use case. It is not chaining (no sequence), orchestration (no dynamic decomposition), or evaluator-optimizer (no revision loop)."
  },
  {
    id: "d1-q11",
    domain: 1,
    question: "What distinguishes the orchestrator-workers pattern from simple parallelization?",
    options: [
      "Orchestrator-workers requires that all workers use the same model",
      "In orchestrator-workers, a central LLM dynamically decides what subtasks are needed and delegates them, rather than the subtasks being predefined in code",
      "Parallelization is only for read-only tasks while orchestrator-workers can write data",
      "Orchestrator-workers always runs subtasks sequentially to preserve ordering"
    ],
    answer: 1,
    explanation: "The defining feature is dynamic decomposition: the orchestrator LLM determines the subtasks at runtime based on the input, delegates to workers, and synthesizes results. In parallelization, the fan-out is fixed in code. Workers may run in parallel and may use different models."
  },
  {
    id: "d1-q12",
    domain: 1,
    question: "An architect is building a coding assistant that must make changes across an unknown number of files, where the set of files depends on each request. Which workflow pattern does Anthropic specifically suggest for this shape of problem?",
    options: [
      "Routing",
      "Prompt chaining",
      "Orchestrator-workers",
      "Voting"
    ],
    answer: 2,
    explanation: "Anthropic's example use cases for orchestrator-workers include coding tasks that change multiple files in ways that can't be predicted upfront — the orchestrator decides which files need work and delegates. The other patterns assume a fixed or classifiable structure."
  },
  {
    id: "d1-q13",
    domain: 1,
    question: "In the evaluator-optimizer pattern, what are the two roles?",
    options: [
      "One LLM call generates a response, and another LLM call evaluates it and provides feedback in a loop until criteria are met",
      "One model optimizes the prompt's token count while the other evaluates latency",
      "A human evaluates every output and the model optimizes its temperature",
      "A fast model drafts an outline while a capable model fills in the details"
    ],
    answer: 0,
    explanation: "Evaluator-optimizer pairs a generator with an evaluator that critiques the output; the generator revises based on the feedback until the evaluation passes or a limit is hit. It is analogous to a writer iterating with an editor."
  },
  {
    id: "d1-q14",
    domain: 1,
    question: "When does the evaluator-optimizer pattern add the most value?",
    options: [
      "When the task is latency-sensitive and must complete in a single round trip",
      "When no clear evaluation criteria exist for the output",
      "When outputs are deterministic and identical across runs",
      "When there are clear evaluation criteria and iterative refinement measurably improves the result"
    ],
    answer: 3,
    explanation: "Anthropic notes the pattern fits when you can articulate clear evaluation criteria (so the evaluator's feedback is meaningful) and when revision demonstrably improves quality — for example, literary translation or thorough search. Without clear criteria or improvement from iteration, the loop just adds cost and latency."
  },
  {
    id: "d1-q15",
    domain: 1,
    question: "A translation pipeline produces a draft, has a second LLM call critique nuances the draft missed, and feeds the critique back for revision, repeating up to three times. Which two mechanisms is this combining?",
    options: [
      "Routing and sectioning",
      "The evaluator-optimizer pattern and an explicit iteration budget as a stop condition",
      "Orchestrator-workers and prompt caching",
      "Voting and human-in-the-loop approval"
    ],
    answer: 1,
    explanation: "Generate-critique-revise is evaluator-optimizer, and capping it at three rounds is an iteration budget that bounds cost and prevents endless loops. Neither routing, fan-out, nor human approval appears in the scenario."
  },
  {
    id: "d1-q16",
    domain: 1,
    question: "Which statement best reflects Anthropic's overarching advice on choosing among single calls, workflows, and agents?",
    options: [
      "Start with the most capable pattern (an agent) and simplify later if costs are too high",
      "Workflows are deprecated in favor of agents for all new systems",
      "Start with the simplest solution that meets the need, and add agentic complexity only when it demonstrably improves outcomes",
      "Always combine at least two workflow patterns for redundancy"
    ],
    answer: 2,
    explanation: "The repeated guidance is to find the simplest solution possible and only increase complexity when needed — many applications are best served by a single optimized call with retrieval and examples. Agentic systems trade cost and latency for capability, which must be justified."
  },
  {
    id: "d1-q17",
    domain: 1,
    question: "What is the primary architectural benefit of delegating a research subtask to a subagent instead of doing it in the main agent's loop?",
    options: [
      "Subagents are billed at a discounted token rate",
      "Subagents bypass tool permission checks, making them faster",
      "Subagents guarantee deterministic output for the same input",
      "The subagent works in its own context window and returns only a distilled result, keeping the main agent's context lean"
    ],
    answer: 3,
    explanation: "Context isolation is the key benefit: the subagent's exploratory reads and tool outputs stay in its own context, and only the condensed answer flows back to the orchestrator. Billing, permissions, and determinism are unchanged by delegation."
  },
  {
    id: "d1-q18",
    domain: 1,
    question: "A team notices their orchestrator's context fills up with raw search results after a subagent summarizes ten documents. Investigation shows each subagent returns its full reading notes and all source excerpts. What is the best fix?",
    options: [
      "Instruct subagents to return only a concise report in a defined format, keeping raw material out of the orchestrator's context",
      "Increase the orchestrator's max_tokens so the context fits",
      "Replace subagents with a single agent that reads all ten documents itself",
      "Have the orchestrator re-summarize each subagent's output with another model call"
    ],
    answer: 0,
    explanation: "The point of subagent isolation is lost if subagents dump their full working material back; the fix is a tight report contract so only distilled findings return. Raising max_tokens doesn't shrink the input context, a single agent makes the problem worse, and re-summarizing adds cost without fixing the root cause."
  },
  {
    id: "d1-q19",
    domain: 1,
    question: "When an orchestrator delegates a task to a subagent, why must the task description be fully self-contained (paths, constraints, expected output format)?",
    options: [
      "Because subagents can only receive a single string of at most one sentence",
      "Because the subagent does not share the orchestrator's conversation history and sees only what is passed in the task",
      "Because the API rejects delegation requests that reference prior messages",
      "Because subagents run on a different model family that cannot parse context"
    ],
    answer: 1,
    explanation: "Subagents start with a fresh, isolated context — they see none of the orchestrator's conversation — so anything they need must be stated explicitly in the task briefing. The other options describe nonexistent restrictions."
  },
  {
    id: "d1-q20",
    domain: 1,
    question: "An architect is designing a multi-agent research system where a lead agent plans and synthesizes while cheaper worker agents do high-volume reading. What is the main rationale for this split?",
    options: [
      "Worker agents cache better because small models have longer cache TTLs",
      "The lead model cannot call read-only tools directly",
      "Reading-heavy subtasks consume many input tokens but need less reasoning, so running them on a cheaper model cuts cost while the capable model focuses on planning and synthesis",
      "Mixing models is required for the API to allow parallel execution"
    ],
    answer: 2,
    explanation: "Delegated research work is mostly search-read-extract — token-heavy but not reasoning-heavy — so it is cost-effective on a smaller model, reserving the expensive model's tokens for planning, verification, and synthesis. The other options are fabricated constraints."
  },
  {
    id: "d1-q21",
    domain: 1,
    question: "Which task is a poor fit for spawning a subagent?",
    options: [
      "A wide investigation across dozens of files in an unfamiliar repository",
      "Independent research into four unrelated data sources in parallel",
      "Reading a large corpus whose contents would flood the main agent's context",
      "Reading one small file the main agent could fetch with a single tool call"
    ],
    answer: 3,
    explanation: "Every delegation costs a round trip, re-established context, and a report back; for work the agent could finish in one or two tool calls, delegation is pure overhead. The other options are canonical subagent use cases: parallel independent work and context-heavy reading."
  },
  {
    id: "d1-q22",
    domain: 1,
    question: "An agent has a bash tool and occasionally needs to send emails. The team wants every outbound email to require human confirmation. What is the recommended design?",
    options: [
      "Add a system prompt line saying 'always ask before sending email' and keep using bash with curl",
      "Promote email sending to a dedicated send_email tool with typed arguments, so the harness can reliably intercept and gate that specific action",
      "Block the entire bash tool whenever the task mentions email",
      "Log all bash commands and review them after the agent finishes"
    ],
    answer: 1,
    explanation: "A dedicated tool gives the harness an action-specific, typed hook it can gate behind confirmation; a bash command is an opaque string that is hard to reliably intercept. Prompt-only guardrails are not enforcement, and after-the-fact logging doesn't prevent the irreversible action."
  },
  {
    id: "d1-q23",
    domain: 1,
    question: "Which principle best describes how to scope an agent's tool access?",
    options: [
      "Grant every available tool so the agent never gets blocked mid-task",
      "Grant only read-only tools, since write operations are never safe for agents",
      "Grant the minimum set of tools and permissions the task actually requires (least privilege)",
      "Grant tools dynamically based on the model's own request for more access"
    ],
    answer: 2,
    explanation: "Least privilege limits the blast radius if the agent behaves unexpectedly or is manipulated via prompt injection. All-tools-always and model-self-granted access both expand the attack surface; read-only-only is too restrictive for legitimate write tasks that can be gated instead."
  },
  {
    id: "d1-q24",
    domain: 1,
    question: "A team's autonomous agent processes content from external websites and has tools that can modify the company's database. What is the most important guardrail consideration this design raises?",
    options: [
      "Website content may be too long for the context window",
      "Fetched web content is untrusted input that could carry prompt-injection instructions, so high-impact tools must be gated or isolated from that influence",
      "External websites may rate-limit the agent's requests",
      "The database tool should be renamed so the model uses it less often"
    ],
    answer: 1,
    explanation: "Untrusted content entering an agent's context can attempt to steer the model into misusing its tools; combining untrusted input with write-capable tools demands approval gates, sandboxing, or separation of privileges. Context length and rate limits are operational concerns, not the core safety risk."
  },
  {
    id: "d1-q25",
    domain: 1,
    question: "Why is reversibility a useful criterion when deciding which agent actions need an approval gate?",
    options: [
      "Reversible actions are always free of cost, so they need no monitoring at all",
      "Irreversible actions run faster when approved by a human first",
      "The API requires approval callbacks for all write operations",
      "Hard-to-reverse actions (deleting data, sending messages, external API calls) can't be fixed after the fact, so they justify a human checkpoint while easily-undone actions can run freely"
    ],
    answer: 3,
    explanation: "Gating is costly in latency and attention, so it should be spent where mistakes can't be undone. Reversible actions can be verified and corrected afterward, which is cheaper than gating everything. There is no API mandate to approve writes, and approval does not speed anything up."
  },
  {
    id: "d1-q26",
    domain: 1,
    question: "A coding agent occasionally runs destructive git commands. The team wants to block 'git push --force' deterministically, not just discourage it. Which approach gives an actual guarantee?",
    options: [
      "Enforce the rule in the harness — e.g. a pre-tool-use hook or permission rule that inspects and rejects the command before execution",
      "Add 'NEVER force push' in capital letters to the system prompt",
      "Fine-tune the model on examples where force pushing is declined",
      "Lower the model's effort level so it takes fewer risky actions"
    ],
    answer: 0,
    explanation: "Prompts and training shift probabilities but cannot guarantee behavior; only code that intercepts the tool call before execution (hooks, permission rules, allowlists) provides deterministic enforcement. This is the documented purpose of pre-tool-use hooks in agent harnesses."
  },
  {
    id: "d1-q27",
    domain: 1,
    question: "Why should an agent loop have an explicit maximum-iteration or budget limit even when the agent usually terminates on its own?",
    options: [
      "Because the Messages API rejects conversations longer than ten turns",
      "Because models bill double for any turn after the twentieth",
      "Because an agent can get stuck repeating failing actions, and a bound converts a potential runaway loop into a predictable worst-case cost and latency",
      "Because iteration limits improve answer quality on every task"
    ],
    answer: 2,
    explanation: "Stop conditions exist to bound failure modes: without a cap, a confused agent can loop indefinitely, burning tokens. The limit is a safety net for cost and latency, not a quality booster, and no such API turn limit or billing rule exists."
  },
  {
    id: "d1-q28",
    domain: 1,
    question: "In a manual tool-use loop against the Messages API, what is the standard signal that the agent has finished and the loop should exit?",
    options: [
      "The response contains an empty content array",
      "The response's stop_reason is no longer 'tool_use' (e.g. it is 'end_turn'), meaning the model issued no further tool calls",
      "The API returns HTTP 204 No Content",
      "The model outputs the literal string 'DONE' as its final token"
    ],
    answer: 1,
    explanation: "The loop continues while the model requests tools (stop_reason 'tool_use') and exits when the model ends its turn without tool calls. There is no HTTP 204 or magic token convention, and content is not empty on completion."
  },
  {
    id: "d1-q29",
    domain: 1,
    question: "An agent hits its iteration budget before completing a long task. Which handling is most appropriate?",
    options: [
      "Silently discard all partial work and return a generic error",
      "Immediately restart the same task from scratch with the same budget",
      "Double the budget automatically and keep doing so until the task completes",
      "Surface the partial progress and state reached, so a human or a follow-up run can resume or re-scope the task deliberately"
    ],
    answer: 3,
    explanation: "A budget exhaustion is a signal to escalate, not to discard work or blindly retry: preserving partial results and status lets the system resume, re-scope, or hand off. Automatic unlimited budget doubling defeats the purpose of having a bound."
  },
  {
    id: "d1-q30",
    domain: 1,
    question: "A team gives their agent a token budget for the whole task and also sets max_tokens on each request. What is the correct way to think about these two controls?",
    options: [
      "They are redundant; setting one makes the other ignored",
      "max_tokens caps total spend across the loop, while the task budget caps a single response",
      "A task-level budget paces or bounds the whole multi-turn loop, while max_tokens is a hard per-response output cap — they operate at different levels",
      "Both apply only to thinking tokens, not to visible output"
    ],
    answer: 2,
    explanation: "Per-response caps (max_tokens) and loop-level budgets address different failure modes: one bounds a single generation, the other bounds cumulative spend across iterations. Robust agent designs use both; neither disables the other."
  },
  {
    id: "d1-q31",
    domain: 1,
    question: "Which human-in-the-loop design keeps the agent productive while still protecting against dangerous actions?",
    options: [
      "Pause for human approval only on high-impact or irreversible tool calls, letting low-risk actions proceed automatically",
      "Require human approval for every single tool call, including read-only searches",
      "Let the agent complete the entire task and ask the human to approve the summary afterward",
      "Disable all tools and have the human execute every action the agent describes"
    ],
    answer: 0,
    explanation: "Selective gating concentrates scarce human attention on the actions that matter, preserving autonomy for safe operations. Approving every read creates fatigue and bottlenecks; post-hoc approval cannot prevent irreversible actions already taken; and a no-tools agent is not an agent."
  },
  {
    id: "d1-q32",
    domain: 1,
    question: "When an agent's tool call is denied by a human reviewer, what should the harness return to the model?",
    options: [
      "Nothing — drop the tool call from history so the model forgets it",
      "An HTTP 403 error that terminates the conversation",
      "The same tool call replayed automatically until it is approved",
      "A tool result indicating the action was declined (ideally with the reason), so the model can adjust its approach"
    ],
    answer: 3,
    explanation: "Every tool_use block needs a corresponding tool_result; returning a 'user declined' result — with a reason where possible — lets the model adapt and try an alternative. Dropping the call breaks the message structure, and auto-retrying defeats the gate."
  },
  {
    id: "d1-q33",
    domain: 1,
    question: "An architect wants the agent to ask a clarifying question and block until the user answers, rendered as a proper UI element rather than plain text. What design does this suggest?",
    options: [
      "Embed the question in the system prompt before every run",
      "Promote question-asking to a dedicated tool, so the harness can render it specially and pause the loop until an answer arrives",
      "Have the agent poll a shared file until the user edits it",
      "Raise the temperature so the model guesses instead of asking"
    ],
    answer: 1,
    explanation: "Making 'ask the user' a tool gives the harness a structured hook: it can render a modal with options and block the agent loop until answered — the approach Claude Code uses. Prompt text, file polling, and guessing don't give the harness a controllable interception point."
  },
  {
    id: "d1-q34",
    domain: 1,
    question: "A compliance team requires that an agent's plan be reviewed before any file is modified. Which pattern matches this requirement most directly?",
    options: [
      "Voting across three independent agents",
      "Caching the plan so later runs skip planning",
      "A plan-then-approve flow: the agent works in a read-only/planning mode, presents its plan for human approval, and only then executes with write access",
      "Running the agent twice and diffing the results"
    ],
    answer: 2,
    explanation: "Plan-mode-style flows (e.g. the Agent SDK's plan permission mode) let the agent analyze and propose without writing, inserting a human checkpoint between planning and execution. Voting and diffing provide redundancy, not pre-execution review."
  },
  {
    id: "d1-q35",
    domain: 1,
    question: "What is the Claude Agent SDK?",
    options: [
      "A fine-tuning toolkit for training custom Claude models",
      "A thin wrapper that only adds retry logic to the Messages API",
      "A hosted service where Anthropic runs agents in managed cloud sandboxes",
      "The Claude Code harness packaged as a library: it provides the agent loop, built-in tools (file ops, bash, search), context management, hooks, subagents, and permissions for building agents on your own infrastructure"
    ],
    answer: 3,
    explanation: "The Agent SDK exposes the same harness that powers Claude Code — a batteries-included agent loop with built-in tools, permissions, hooks, and subagents — that you host yourself. It is not fine-tuning, not a bare API wrapper, and not a managed hosting service (that is Managed Agents)."
  },
  {
    id: "d1-q36",
    domain: 1,
    question: "A developer must choose between the Anthropic SDK's tool runner and the Claude Agent SDK. Which statement correctly distinguishes them?",
    options: [
      "The tool runner loops over tools you define yourself with no built-in tools, while the Agent SDK ships the full Claude Code harness including built-in file, bash, and search tools",
      "The tool runner provides managed cloud deployment while the Agent SDK is local-only",
      "The Agent SDK cannot use MCP servers, while the tool runner can",
      "They are two names for the same package"
    ],
    answer: 0,
    explanation: "Both are harnesses you host, but their scope differs: the tool runner automates the request-execute-loop cycle for custom tools only, while the Agent SDK is Claude Code as a library with built-in tools, context management, permissions, and subagents. The Agent SDK supports MCP, and neither provides managed deployment."
  },
  {
    id: "d1-q37",
    domain: 1,
    question: "In the Claude Agent SDK, what are hooks used for?",
    options: [
      "Changing the model's weights at runtime",
      "Running custom logic at defined lifecycle points — such as before or after a tool call — to enforce rules, log activity, or block actions deterministically",
      "Streaming partial tokens to the browser",
      "Compressing the conversation history into a summary"
    ],
    answer: 1,
    explanation: "Hooks fire at lifecycle events (e.g. PreToolUse, PostToolUse, Stop) and can observe, modify, or block behavior with code — giving guarantees prompts cannot. Streaming and context compaction are separate SDK features, and nothing changes model weights."
  },
  {
    id: "d1-q38",
    domain: 1,
    question: "Which Claude Agent SDK hook would a team use to deterministically reject a dangerous shell command before it executes?",
    options: [
      "A SessionStart hook",
      "A Stop hook",
      "A PreToolUse hook that inspects the Bash tool's input and returns a blocking decision",
      "A PostToolUse hook that logs the command after it runs"
    ],
    answer: 2,
    explanation: "PreToolUse hooks run before a tool executes and can deny the call based on its input — the right place for command blocklists. PostToolUse is too late to prevent execution, and SessionStart/Stop fire at session boundaries, not per tool call."
  },
  {
    id: "d1-q39",
    domain: 1,
    question: "In the Claude Agent SDK, what does the 'plan' permission mode do?",
    options: [
      "It doubles the model's thinking budget for better planning",
      "It automatically approves all file edits without prompting",
      "It disables subagents so the main agent plans alone",
      "It restricts the agent to read-only analysis so it can produce a plan for review before any changes are made"
    ],
    answer: 3,
    explanation: "Plan mode lets the agent explore and design an approach without modifying anything, supporting review-before-execution workflows. Auto-approving edits is a different mode (acceptEdits); plan mode does not change thinking budgets or disable subagents."
  },
  {
    id: "d1-q40",
    domain: 1,
    question: "A team is tempted to run their Agent SDK deployment with the permission mode that bypasses all permission checks, to avoid interruptions. What is the appropriate guidance?",
    options: [
      "It is the recommended default for production because prompts are a sufficient safeguard",
      "Reserve it for isolated, sandboxed environments where the agent cannot cause real harm; in ordinary environments use permission rules, hooks, or approval callbacks instead",
      "It is safe as long as the system prompt forbids dangerous actions",
      "It only affects MCP tools, so built-in tools remain gated anyway"
    ],
    answer: 1,
    explanation: "Bypassing permissions removes the harness's enforcement layer entirely, so it belongs only in containers or sandboxes where damage is contained. Prompt instructions are not enforcement, and the mode affects all tools, not just MCP ones."
  },
  {
    id: "d1-q41",
    domain: 1,
    question: "How does the Claude Agent SDK integrate with the Model Context Protocol (MCP)?",
    options: [
      "It can connect to MCP servers, exposing their tools to the agent alongside the built-in tools",
      "It re-implements each MCP server as a built-in tool at compile time",
      "MCP is only available in the hosted Managed Agents product, not the SDK",
      "The SDK uses MCP only for authentication, not for tools"
    ],
    answer: 0,
    explanation: "The Agent SDK supports configuring MCP servers, whose tools become callable by the agent under the same permission system as built-in tools. MCP is a live protocol connection, not compile-time codegen, and it is available in the SDK, not just hosted products."
  },
  {
    id: "d1-q42",
    domain: 1,
    question: "What problem does the Claude Agent SDK's automatic context management (compaction) solve for long-running agents?",
    options: [
      "It encrypts the conversation so logs cannot leak data",
      "It guarantees identical outputs across repeated runs",
      "It reduces per-token prices for long conversations",
      "It summarizes or prunes older conversation history as the context window fills, letting long sessions continue without overflowing the window"
    ],
    answer: 3,
    explanation: "Long agent sessions accumulate tool results and turns that eventually exceed the context window; the SDK compacts earlier history so work can continue. It does not change pricing, determinism, or provide encryption."
  },
  {
    id: "d1-q43",
    domain: 1,
    question: "During an agent run, a tool call fails because an external API is down. What is the recommended way to report this back to the model?",
    options: [
      "Omit the tool result so the model assumes success",
      "Return a tool_result for the matching tool_use_id with is_error set to true and an informative message, so the model can adapt or try another approach",
      "Terminate the loop immediately with an unhandled exception",
      "Re-send the entire conversation from the beginning without the failed call"
    ],
    answer: 1,
    explanation: "The documented pattern is to return the error as a tool result flagged with is_error and a useful message — the model typically acknowledges it and changes course. Omitting the result breaks the required tool_use/tool_result pairing, and aborting or restarting discards recoverable state."
  },
  {
    id: "d1-q44",
    domain: 1,
    question: "An agent loop receives HTTP 429 and 529 responses during a traffic spike. Which handling matches Anthropic's guidance?",
    options: [
      "Treat them like 400 errors and surface them to the user as invalid requests",
      "Retry immediately in a tight loop until the request succeeds",
      "Retry with exponential backoff (respecting any retry-after header) — these are transient, retryable errors, unlike 4xx validation errors",
      "Switch the conversation to a different provider mid-turn"
    ],
    answer: 2,
    explanation: "Rate-limit (429) and overloaded (529) errors are retryable with backoff — the official SDKs even do this automatically — whereas 400-class validation errors should not be retried unchanged. Tight-loop retries worsen the overload."
  },
  {
    id: "d1-q45",
    domain: 1,
    question: "A long server-tool turn returns stop_reason 'pause_turn'. What should the agent loop do?",
    options: [
      "Treat it as a refusal and end the session",
      "Append a new user message saying 'Continue' to force another turn",
      "Ask the user to restart the task from scratch",
      "Re-send the conversation with the paused assistant turn appended; the server resumes where it left off (with a cap on how many times this is repeated)"
    ],
    answer: 3,
    explanation: "pause_turn means the server-side loop paused and can be resumed by re-sending the conversation including the paused assistant content — no extra user text is needed, and a continuation cap prevents infinite resumes. It is not a refusal or a reason to restart."
  },
  {
    id: "d1-q46",
    domain: 1,
    question: "A team notices their agent sometimes reports 'all tests pass' when the test command actually failed. Which design change most directly addresses this?",
    options: [
      "Strengthen verification: ground completion claims in actual tool output (e.g. feed back exit codes/test output and check them) rather than trusting the model's self-report",
      "Lower the temperature so the model is more honest",
      "Shorten the system prompt so the model focuses better",
      "Run the agent twice and accept the answer if both runs agree"
    ],
    answer: 0,
    explanation: "The verify step of the agent loop should rest on evidence — real exit codes, test output, or a checking harness — not on the model's assertion. Temperature and prompt length don't make claims verifiable, and two unverified runs can agree on the same wrong claim."
  },
  {
    id: "d1-q47",
    domain: 1,
    question: "Compared with a single-agent conversation, what is the primary cost characteristic of multi-agent architectures that architects must plan for?",
    options: [
      "They cost less because each subagent uses a smaller context",
      "Token usage multiplies substantially — each subagent re-establishes context, explores, and reports back, on top of the orchestrator reading those reports",
      "Costs are identical since the total work is the same",
      "Only latency increases; token cost is unaffected"
    ],
    answer: 1,
    explanation: "Anthropic's multi-agent research found such systems use many times the tokens of a single chat because every agent carries its own context and exploration, plus coordination overhead. The capability gains must justify that multiplied spend; both cost and latency are affected."
  },
  {
    id: "d1-q48",
    domain: 1,
    question: "An architect must cut end-to-end latency for an agent that performs several independent lookups (weather, calendar, traffic) each turn. Which change helps most without reducing quality?",
    options: [
      "Serialize the lookups so each benefits from the previous result",
      "Remove the verification step from the agent loop",
      "Execute the independent tool calls in parallel — the model can emit multiple tool_use blocks in one turn, and all results return together in a single user message",
      "Switch every call to the Batch API for its discount"
    ],
    answer: 2,
    explanation: "Parallel tool use is the standard latency lever for independent actions: run the calls concurrently and return all tool_result blocks in one message. Serializing adds latency for no benefit when calls are independent, dropping verification trades quality, and batching is for throughput, not interactive latency."
  },
  {
    id: "d1-q49",
    domain: 1,
    question: "A product team runs an expensive orchestrator-workers agent for every incoming request, including trivial FAQs. What architectural adjustment best balances cost and capability?",
    options: [
      "Raise the iteration budget so the agent at least finishes faster",
      "Cache the orchestrator's output and serve it for all future requests regardless of the question",
      "Use the multi-agent system for FAQs too, but with a shorter system prompt",
      "Add a routing layer: send simple, classifiable requests to a cheap single-call path and reserve the multi-agent system for genuinely complex requests"
    ],
    answer: 3,
    explanation: "Routing by difficulty is the documented cost-optimization pattern: easy queries go to smaller/cheaper handling while hard ones get the expensive agentic path. Raising budgets or trimming prompts doesn't remove the unnecessary agentic overhead, and blanket caching returns wrong answers to different questions."
  }
);
