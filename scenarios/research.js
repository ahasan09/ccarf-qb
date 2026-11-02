/* Multi-Agent Research System — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    id: "sc-research-001",
    scenario: "research",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "During load testing, broad topics often produce reports that are missing either the web evidence or the document evidence. Logs show the coordinator requested both a web search and a document analysis in the same model response. However, the next request your orchestration code sends to the model contains only one tool result, and synthesis begins immediately afterwards. What change best fixes this orchestration bug?",
    options: [
      "Execute the first requested tool immediately, then ask the coordinator to reissue any remaining requests on the next turn.",
      "Treat preliminary report text as completion unless it contains explicit phrases like NEED_MORE_TOOLS or CONTINUE_RESEARCH.",
      "When the response has stop_reason \"tool_use\", run every tool_use block, append all matching results, and continue until \"end_turn\".",
      "Serialize the workflow by preventing simultaneous subagent requests, requiring search, analysis, synthesis, and reporting in a fixed order."
    ],
    answer: 2,
    optionNotes: [
      "This drops valid tool requests the model already emitted and forces it to reconstruct them later. It adds latency and can change the coordinator's plan when several subagent calls were meant to run from the same response.",
      "Parsing assistant text or sentinel phrases for loop control is brittle; the reliable signal is the stop_reason in the API response. A response can contain text alongside tool requests, so text alone does not mean the agent is finished.",
      "A single response can contain several tool_use blocks. Executing all of them and returning a tool_result for each lets the coordinator reason over complete outputs, and the loop correctly ends only when stop_reason is \"end_turn\".",
      "A fixed sequence removes the benefit of parallel subagent work on independent tasks. It avoids simultaneous requests instead of fixing the loop's handling of multiple tool calls."
    ],
    explanation: "Loop control should follow stop_reason: on \"tool_use\", execute every requested tool, return matching tool_result blocks and call the model again; on \"end_turn\", the turn is complete. Handling only the first tool_use block silently discards evidence the coordinator asked for.",
    source: "pt3-q007"
  },
  {
    id: "sc-research-002",
    scenario: "research",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your custom coordinator loop calls the Messages API and ends the run as soon as a response contains any text block, treating that text as the final answer. In testing, many runs stop after the model writes \"I'll start by searching recent sources on this topic\" alongside a web search request, so no research is ever performed. Other runs work only because the model happened to emit a tool call with no text. How should the loop decide whether to continue?",
    options: [
      "Continue while stop_reason is \"tool_use\" by running the requested tools and returning results, and finish when it is \"end_turn\".",
      "Keep ending on text, but instruct the coordinator never to include explanatory text in a response that also requests tools.",
      "End only when the text contains a completion phrase such as \"Final report:\", and otherwise send a message asking the model to continue.",
      "Run a fixed number of iterations for every topic, such as eight, so that responses mixing text and tool calls never end the run early."
    ],
    answer: 0,
    optionNotes: [
      "stop_reason is the API's explicit signal: \"tool_use\" means the model is waiting for tool results, and \"end_turn\" means it has finished its turn. Text and tool_use blocks can appear together, so this is the only reliable check.",
      "This relies on the model always obeying a formatting instruction to keep a broken loop working. Any response that mixes text with a tool request still ends the run prematurely.",
      "Completion phrases are natural-language heuristics that vary with wording and can appear in preliminary text. The structured stop_reason already says whether the model wants tools or has finished.",
      "A fixed count ignores the model's actual state: it cuts off research that needs more turns and keeps calling the model after it has finished. An iteration cap is a safety limit, not the primary stop condition."
    ],
    explanation: "An agentic loop continues on stop_reason \"tool_use\" (execute the tools, return the results) and stops on \"end_turn\". Treating the presence of text as completion is a classic anti-pattern because Claude often explains what it is about to do in the same response that requests tools."
  },
  {
    id: "sc-research-003",
    scenario: "research",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "The report generator subagent's final API call sometimes returns a report that ends mid-sentence, partway through the references section. Your loop treats any response without a tool_use block as finished and publishes it. Inspecting the failing responses, you find their stop_reason is \"max_tokens\" rather than \"end_turn\". What is the correct way to handle this?",
    options: [
      "Treat max_tokens as an incomplete turn: raise the limit or continue the generation, and publish only once the response ends with end_turn.",
      "Treat max_tokens like end_turn, since both mean the model stopped generating with no tool calls pending, and add a note that the report may be abridged.",
      "Treat max_tokens as a tool error and retry the identical request unchanged until a response arrives that is short enough to fit inside the limit.",
      "Ask the report generator to keep reports shorter, and keep publishing whatever text comes back whenever no tool call has been requested."
    ],
    answer: 0,
    optionNotes: [
      "\"max_tokens\" means the output hit the configured token limit, so the content is truncated. Raising max_tokens or continuing the generation, and checking for \"end_turn\" before publishing, prevents cut-off reports.",
      "\"max_tokens\" and \"end_turn\" mean different things: one is a truncation, the other a natural finish. Publishing truncated output with a disclaimer still ships an incomplete report.",
      "This is not a tool error, and resending the same request with the same limit will usually truncate again. Nothing in the request changes to make the output fit.",
      "Shorter instructions might reduce truncation but do not detect it. The loop still publishes any truncated response because it ignores stop_reason."
    ],
    explanation: "Loop code must inspect stop_reason rather than infer completion from the absence of tool calls. \"max_tokens\" signals a truncated response that needs a higher limit or a continuation, while only \"end_turn\" indicates the model finished naturally."
  },
  {
    id: "sc-research-004",
    scenario: "research",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your hand-written coordinator loop executes the tools requested in each response, then sends a new request containing the original user message followed by a user message with the tool outputs as plain text. The model often repeats the same searches or says it has no record of requesting them, and some requests fail validation. Logs show the assistant's tool_use blocks are never added to the conversation history. How should the loop build the next request?",
    options: [
      "Append the assistant response with its tool_use blocks unchanged, then a user message of tool_result blocks whose tool_use_id matches each request.",
      "Keep sending tool outputs as plain text, but prefix each one with the tool name and arguments so the model can tell which request produced it.",
      "Put the tool outputs in the system prompt of the next request, since system content is always attended to and need not match earlier messages, which also keeps the message list short.",
      "Start a fresh conversation for each turn with only a summary of results so far, which keeps history short and avoids role-ordering errors."
    ],
    answer: 0,
    optionNotes: [
      "The Messages API is stateless, so the history must include the assistant turn that requested the tools. Each tool_result must reference the tool_use_id of the block it answers, which lets the model connect results to its own requests.",
      "Labelled plain text is still not a tool result. Without the assistant's tool_use blocks in history, the model has no record of making the requests, and the protocol pairing is still missing.",
      "The system prompt is for instructions, not per-turn tool results. Moving results there breaks the tool_use and tool_result pairing and loses the order in which evidence arrived.",
      "Discarding the real history each turn throws away the model's own reasoning and tool requests. Summaries also lose detail the coordinator needs, and the pairing problem is avoided rather than fixed."
    ],
    explanation: "Each loop iteration should append the full assistant message (including tool_use blocks) and then a user message containing one tool_result per tool_use_id. This keeps the conversation valid and lets Claude reason about the results of the calls it actually made."
  },
  {
    id: "sc-research-005",
    scenario: "research",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "The web search subagent uses Anthropic's server-side web search tool, which the API runs in its own sampling loop. On deep research questions, some responses come back with stop_reason \"pause_turn\" and only a partial answer. Your loop currently treats anything other than \"tool_use\" as finished, so these partial answers go straight to synthesis. How should the loop handle \"pause_turn\"?",
    options: [
      "Treat it as a failed request and retry the original user message from scratch with a larger max_tokens value, discarding the partial response.",
      "Send the paused response back as the assistant turn with the same tools so Claude can continue, repeating while it pauses up to a cap.",
      "Treat it as equivalent to end_turn, because server tools run on Anthropic's side and there are no client tool results for your code to return.",
      "Execute the server_tool_use blocks yourself with your own search client and return their outputs as tool_result blocks in a new user message."
    ],
    answer: 1,
    optionNotes: [
      "A pause is not a failure, and restarting throws away the searches already completed. A larger max_tokens does not change the server-side loop limit that caused the pause.",
      "The documented handling is to pass the paused response back as-is, with the same tools, so Claude can resume its turn. A continued turn can pause again, so check stop_reason each time and cap the number of continuations.",
      "\"pause_turn\" means the turn is unfinished, not complete. Treating it as \"end_turn\" sends partial answers to synthesis, which is the bug being reported.",
      "Server tools are executed by the API, not by your code. Supplying your own tool_result blocks for server tool calls bypasses the server loop and does not match how the API expects the turn to continue."
    ],
    explanation: "With server tools such as web search, the API may pause a long-running turn and return stop_reason \"pause_turn\". The client continues by sending the paused assistant content back with the same tools, looping (with a cap) until a different stop_reason arrives."
  },
  {
    id: "sc-research-006",
    scenario: "research",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "In a test run, the web search subagent and the document analysis subagent have both finished and returned their findings to the coordinator. The two result sets overlap in places and disagree on one market figure. The team is debating what should happen next to produce a single integrated research output for the report. What is the appropriate next step?",
    options: [
      "Each subagent sends its findings directly to the report generation agent, bypassing the coordinator",
      "The document analysis agent requests the web search results and merges them internally",
      "The coordinator passes both sets of findings to the synthesis agent for unified integration",
      "The coordinator concatenates the raw outputs from both agents and returns them as the final result"
    ],
    answer: 2,
    optionNotes: [
      "Sending findings straight to report generation bypasses the coordinator's control and skips synthesis entirely. The report agent receives two unreconciled sets of findings with no component responsible for integrating them.",
      "This gives a specialized worker orchestration duties and couples subagents directly to each other. It also duplicates the integration job the pipeline already assigns to the synthesis agent.",
      "The coordinator collects results and routes them to the next specialist. The synthesis agent exists to reconcile overlaps and conflicts into one coherent body of findings before reporting.",
      "Concatenation produces two adjacent dumps, not an integrated output. Nothing reconciles the overlap or the conflicting market figure, and the synthesis step is skipped."
    ],
    explanation: "In a hub-and-spoke design, subagents report to the coordinator, which decides what each next specialist receives. Integrating findings is the synthesis agent's job, so the coordinator routes both result sets there.",
    source: "mock1-q013"
  },
  {
    id: "sc-research-007",
    scenario: "research",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "During production evaluation, reviewers find that first drafts are coherent and cited but often incomplete. For example, a report on AI regulation includes strong EU coverage, weak Asia-Pacific coverage, and unresolved contradictions between two market statistics. The current workflow sends the first synthesis directly to the report generator whenever all subagents return successfully. What change would most effectively improve report completeness without abandoning the coordinator-subagent architecture?",
    options: [
      "Raise the coordinator's maximum iteration count to a fixed cap, stopping after five passes regardless of remaining coverage gaps.",
      "Have all subagents repeat their original broad assignments twice, then merge duplicate findings before sending results to synthesis.",
      "Add a coordinator review loop that checks synthesis coverage, redelegates targeted follow-ups, and reruns synthesis until criteria are met.",
      "Instruct the report generator to hide low-coverage sections unless the synthesis agent marks every subsection as fully supported."
    ],
    answer: 2,
    optionNotes: [
      "An iteration cap is a useful safety guard but a poor completion condition. Stopping after an arbitrary pass count can end too early or waste work once coverage is already sufficient.",
      "Repeating the same broad work does not target the specific gaps or contradictions. It adds latency and duplication without guaranteeing Asia-Pacific coverage improves.",
      "The coordinator evaluates whether the synthesis satisfies the research goal, then sends targeted follow-up work for the specific gaps. This fills holes and resolves contradictions without rerunning the whole pipeline.",
      "Hiding weak sections makes reports look cleaner while leaving the research incomplete. Readers lose the caveats they need, and the gap is concealed rather than fixed."
    ],
    explanation: "Successful subagent completion only means assigned work finished, not that the research question is covered. A coordinator-led refinement loop checks synthesis against coverage criteria, redelegates targeted research, and re-synthesizes until the criteria are met.",
    source: "pt1-q022"
  },
  {
    id: "sc-research-008",
    scenario: "research",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "A prototype of the pipeline allows the search, analysis, synthesis and report subagents to call one another directly whenever they need clarification. After several runs, audit logs are incomplete, retries are handled differently by each agent, and reports sometimes include findings the coordinator never reviewed. The team wants to keep the specialized agents. What architectural change would best improve reliability and observability?",
    options: [
      "Let subagents continue direct communication, but require each agent to append a natural-language summary after every handoff.",
      "Route subagent messages, errors, and follow-up requests through the coordinator, which manages delegation, recovery, and information flow.",
      "Replace coordinator decisions with a fixed pipeline that always runs search, analysis, synthesis, and reporting in the same order for every topic it receives.",
      "Give every subagent access to all research tools so that each one can recover independently from any missing information."
    ],
    answer: 1,
    optionNotes: [
      "Summaries help readability but do not fix fragmented control flow or inconsistent recovery. Peer-to-peer calls still bypass the coordinator, so nothing enforces consistent decisions.",
      "A hub-and-spoke design gives one agent responsibility for routing, tracking failures and deciding next steps. Every handoff and retry passes through a single observable control point.",
      "A fixed pipeline can suit predictable workflows but removes adaptive decomposition. It also does not by itself establish who handles errors and what each agent receives.",
      "Broad tool access widens each agent's decision space and pushes agents outside their specialization. Agents could then take actions the coordinator never requested or reviewed."
    ],
    explanation: "Routing all inter-agent communication through the coordinator keeps the system observable and makes error handling consistent. Subagents focus on their tasks while the coordinator controls information flow and decides when to re-delegate or synthesize.",
    source: "pt3-q016"
  },
  {
    id: "sc-research-009",
    scenario: "research",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "Your coordinator currently gives each subagent a rigid procedure, such as \"run these exact five queries in this order and summarize the top three results of each\". Subagents perform well on topics that fit the script but fail or return thin results whenever a topic needs different sources or query styles. Adding more scripted branches has only shifted where the failures appear. How should the coordinator's delegation prompts be designed instead?",
    options: [
      "Make the procedures longer and more detailed so that they explicitly cover more of the contingencies found in unusual topics",
      "Give subagents only the research goal, leaving out quality criteria so that nothing unnecessarily constrains their approach",
      "State the research goal and quality criteria, describing what a complete answer looks like, and let the subagent adapt",
      "Route off-script topics back to the coordinator, which then writes a revised step-by-step procedure tailored to each topic"
    ],
    answer: 2,
    optionNotes: [
      "Longer scripts are an arms race against topic variety that scripts keep losing. The failures just move to whatever case the new branches did not anticipate.",
      "Dropping the quality criteria removes the definition of success along with the script. Subagents can then return shallow work that technically addresses the goal.",
      "Defining the goal and what a complete answer looks like keeps the subagent accountable while letting it choose its own path. Adaptability is the reason to use an agent rather than a fixed script.",
      "This turns every novel topic into a coordinator round trip and keeps the brittle scripting approach. The adaptability belongs in the subagent, not in ever more procedures."
    ],
    explanation: "Coordinator prompts should specify research goals and quality criteria rather than step-by-step procedures. The coordinator defines success; the subagent decides how to reach it for each topic.",
    source: "purcell-q024"
  },
  {
    id: "sc-research-010",
    scenario: "research",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "Your coordinator always runs all four subagents in a fixed order for every request. Simple factual questions such as \"When did the EU AI Act enter into force?\" now take several minutes and cost as much as a full literature review, because document analysis and report generation run even when there are no documents and no long report is needed. Complex research requests, by contrast, work well. What change best addresses this?",
    options: [
      "Have the coordinator assess each request and invoke only the subagents it needs, scaling delegation to the query's complexity.",
      "Keep the fixed pipeline but run all four subagents in parallel, so simple questions finish sooner even though every agent still runs.",
      "Add a fast path that answers short questions from the coordinator's own knowledge without any tool calls or cited sources at all.",
      "Reduce every subagent's maximum turns so each stage finishes quickly, accepting shallower results on complex topics in exchange."
    ],
    answer: 0,
    optionNotes: [
      "A coordinator that analyzes the request can skip subagents that add nothing, such as document analysis when no documents exist. Complex requests still get the full set of specialists.",
      "Parallelism cuts wall-clock time but not cost, and the stages are not independent: synthesis and reporting need earlier results. Every unneeded agent still runs.",
      "Answering from model knowledge drops the search and citations that make the system trustworthy. Even simple factual answers in a cited research product need a source.",
      "A global turn limit degrades the complex requests that currently work well. It treats a routing problem as a budget problem."
    ],
    explanation: "A coordinator should dynamically select which subagents to invoke based on the query rather than always routing through the full pipeline. This keeps simple questions cheap while preserving depth for complex research."
  },
  {
    id: "sc-research-011",
    scenario: "research",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "Research runs are meeting quality expectations, but they take too long. Logs show the coordinator assigns three independent investigation branches (market adoption, regulatory responses, and technical limitations) one after another, waiting for each subagent to finish before starting the next. The branches do not depend on each other's intermediate findings, and the coordinator still needs to aggregate results before synthesis. What change best reduces elapsed time while preserving the intended orchestration pattern?",
    options: [
      "Combine all branches into one broad prompt for a single generalist subagent, then ask it to produce synthesis-ready findings.",
      "Keep the coordinator's sequential subagent calls, but shorten each subagent prompt and cap each branch at one tool iteration.",
      "Allow the market adoption subagent to invoke the regulatory and technical subagents directly, then return a merged result.",
      "Have the coordinator emit separate Agent tool (formerly Task) calls for the branches in one response, then aggregate the results."
    ],
    answer: 3,
    optionNotes: [
      "One broad generalist task loses specialization and dilutes attention across three research areas. It also makes distinct coverage and attribution harder to keep.",
      "Shorter prompts and a one-iteration cap may truncate valid investigation without addressing the real problem, which is unnecessary sequential execution.",
      "Direct subagent-to-subagent invocation bypasses the coordinator's routing, observability and error handling. Failures and provenance become harder to track.",
      "Multiple subagent calls in a single coordinator response run concurrently. The coordinator remains the aggregation point while independent branches no longer wait on each other."
    ],
    explanation: "When delegated tasks are independent, the coordinator can request several subagents in one response so they run in parallel. This keeps the hub-and-spoke pattern intact while removing avoidable wall-clock latency.",
    source: "pt3-q011"
  },
  {
    id: "sc-research-012",
    scenario: "research",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "Your coordinator's system prompt tells it to delegate searching, document analysis, synthesis and reporting to the four subagents defined in its agents option. At runtime it never spawns any subagent and instead attempts all the research itself with its planning tools. During a recent cleanup, the session's tool list was trimmed down to a short set of research-planning tools. What is the most likely cause?",
    options: [
      "The coordinator's model tier lacks the reasoning depth that multi-agent delegation requires, so it does the work itself",
      "The subagents' AgentDefinition descriptions are too vague for the coordinator to match its tasks against any of them",
      "The system prompt describes delegation only in general terms and never names the specific subagents it should use",
      "The trimmed tool list omits the Agent tool (formerly Task), which is how the coordinator invokes any subagent"
    ],
    answer: 3,
    optionNotes: [
      "Model capability does not explain a total absence of delegation that began after a configuration change. Any model needs the delegation tool before it can delegate.",
      "Vague descriptions cause misrouting between subagents, not a complete failure to spawn any. Delegation is impossible without the tool, however good the descriptions are.",
      "Prompt specificity affects how well the coordinator delegates, not whether it can. A precise prompt cannot make up for a missing tool.",
      "Subagents are invoked through the Agent tool (\"Task\" is still accepted as an alias). If the coordinator's tools do not include it, it has no mechanism to delegate, whatever its prompt says."
    ],
    explanation: "Subagent spawning is a tool call, so the coordinator's configuration must make the Agent tool available. Capability configuration outranks instructions: no prompt can make the coordinator use a tool it does not have.",
    source: "purcell-q021"
  },
  {
    id: "sc-research-013",
    scenario: "research",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "The web search subagent returns detailed, well-sourced findings to the coordinator. The coordinator then invokes the synthesis subagent with the prompt \"Synthesize the research findings.\" The synthesis output is generic, cites none of the sources, and reads as if written from general knowledge. Switching the synthesis subagent to a larger model made no difference. What is wrong?",
    options: [
      "The synthesis subagent needs extended thinking enabled so it can reason more deeply about the findings",
      "Subagents do not inherit the coordinator's conversation, so the findings must be passed in the synthesis prompt",
      "The synthesis subagent needs its own web search tools so it can gather the findings it is meant to combine",
      "The synthesis output schema is too loose, which lets the agent write generic prose instead of sections grounded in findings"
    ],
    answer: 1,
    optionNotes: [
      "More reasoning does not help when the input is empty. The synthesis agent has never seen the findings it is asked to combine.",
      "Each subagent starts with its own context and sees only what its prompt contains. \"The research findings\" refers to material the synthesis agent never received, so the coordinator must include it explicitly.",
      "This duplicates the search agent's role instead of fixing the handoff. The findings already exist; they just were not passed along.",
      "A stricter output shape cannot ground the text in findings the agent does not have. The problem is the input, not the output format."
    ],
    explanation: "Subagents run with isolated context and do not see the coordinator's history. The coordinator must pass the relevant findings, with their sources, directly in each subagent's prompt.",
    source: "purcell-q022"
  },
  {
    id: "sc-research-014",
    scenario: "research",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "To make sure subagents never miss context, the coordinator now passes its entire conversation history, including every earlier subagent's raw output, into each new subagent prompt. Report generator prompts have grown past 120K tokens, costs have tripled, and reports increasingly cite tangential sources mentioned early in the transcript. Before this change, subagents occasionally lacked the user's constraints. What is the best way to pass context to subagents?",
    options: [
      "Keep passing the full history but place the user's original request at the very end of each prompt so it gets the most attention",
      "Pass each subagent what its task needs: the goal, the user's constraints, and the relevant prior findings in structured form",
      "Pass no context at all and let each subagent re-derive the constraints by searching for the topic again with its own tools",
      "Store the history in a shared file and tell every subagent to read the whole file first, so the prompts themselves stay short"
    ],
    answer: 1,
    optionNotes: [
      "Reordering does not reduce the cost or remove the tangential material that is being cited. The prompt is still dominated by content the subagent does not need.",
      "Targeted, structured context gives each subagent the constraints it was missing without the noise. Smaller prompts also cut cost and reduce attention dilution.",
      "This brings back the original problem of subagents lacking the user's constraints, which cannot be rediscovered by searching. It also wastes tool calls repeating earlier work.",
      "Reading the whole file puts the same 120K tokens into each subagent's context through a tool call. Only the location of the bloat changes."
    ],
    explanation: "Subagents need complete but relevant context: the task goal, binding constraints and the specific prior findings their work depends on. Passing everything degrades quality and cost as much as passing too little degrades correctness."
  },
  {
    id: "sc-research-015",
    scenario: "research",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "You defined the four subagents with the Agent SDK's agents option. The coordinator often sends PDF analysis to the web search subagent and sometimes asks the report generator to do synthesis. Their AgentDefinition descriptions are \"Research helper\", \"Research helper for documents\", \"Combines things\" and \"Writes output\". Each subagent's own prompt and tool list are correct. What should you change first?",
    options: [
      "Rewrite each description to say what the subagent does, what inputs it handles, and when to choose it over the others",
      "Merge the four subagents into one general research subagent with every tool, so that the coordinator never has to choose",
      "Give every subagent the same model as the coordinator, since mismatched models are the usual reason for poor routing",
      "Add a line to each subagent's system prompt telling it to refuse tasks outside its specialty and hand them back"
    ],
    answer: 0,
    optionNotes: [
      "The description field is what Claude uses to decide when to invoke each subagent. Clear, distinct descriptions with inputs and selection boundaries fix the misrouting at its source.",
      "Merging discards the specialization and scoped tool sets the architecture relies on. It removes the routing choice instead of making it accurate.",
      "The subagent's model does not influence which subagent the coordinator picks. Routing depends on the descriptions the coordinator reads.",
      "A subagent's own prompt is applied only after it has been chosen, so it does not improve the coordinator's selection. Refusals just add round trips."
    ],
    explanation: "In the Agent SDK, each AgentDefinition's description tells Claude when to use that subagent. Vague, overlapping descriptions produce misrouting, so the first fix is to make each one specific about purpose, inputs and when to prefer it."
  },
  {
    id: "sc-research-016",
    scenario: "research",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "In staging, final reports occasionally include polished sections with missing or unverifiable citations. Traces show the coordinator sometimes invokes the report generation subagent after receiving the web search and document analysis outputs, while the synthesis subagent is still pending or has returned an error. Prompt reminders to wait for synthesis reduced but did not eliminate the problem. What change would most effectively prevent these invalid reports?",
    options: [
      "Have the coordinator parse synthesis messages for phrases like \"complete\" or \"ready\" before it starts the report generation subagent.",
      "Strengthen the report generation subagent's prompt so it refuses to draft unless it believes synthesis completed with all citations.",
      "Add a programmatic prerequisite that blocks report generation calls until synthesis returns a citation manifest and success status.",
      "Allow report generation to start immediately, then run a final citation scan afterwards and discard any reports with missing references."
    ],
    answer: 2,
    optionNotes: [
      "Parsing natural-language cues is brittle because wording varies and may not reflect actual success. Workflow progression should depend on structured status, not inferred phrases.",
      "Prompt instructions improve behavior but do not guarantee it. Relying on the downstream agent to notice missing prerequisites leaves a nonzero failure rate.",
      "A code-level gate makes the ordering deterministic. Report generation cannot start until the required synthesis artifact exists and reports success.",
      "A post-hoc scan wastes work and does not fix the incorrect workflow transition. It can also miss claims whose citations exist but do not support them."
    ],
    explanation: "When a downstream step must never run before an upstream step succeeds, enforce the ordering programmatically rather than through prompts. A prerequisite gate on structured status and artifacts removes the failure mode instead of making it less likely.",
    source: "pt1-q045"
  },
  {
    id: "sc-research-017",
    scenario: "research",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "The web search subagent gets publication dates from three tools: one returns Unix timestamps, one returns strings like \"03/04/2025\", and an MCP news tool returns relative phrases such as \"2 days ago\". The synthesis agent sometimes orders evidence incorrectly and misjudges which study is more recent. Prompt instructions asking agents to convert dates reduced the errors but did not eliminate them. What is the most reliable fix?",
    options: [
      "Add a PostToolUse hook that rewrites the dates in these tools' results to ISO 8601 before the model processes them",
      "Add few-shot examples to the synthesis prompt that show how to convert each of the three date formats into one",
      "Ask the web search subagent to restate every date in ISO format in its final summary before handing results back to the coordinator",
      "Remove the two tools with non-standard date formats and rely only on the tool that already returns Unix timestamps"
    ],
    answer: 0,
    optionNotes: [
      "A PostToolUse hook runs deterministically on every result and can replace the tool's output (for example with updatedToolOutput) before Claude sees it. Every agent then receives one consistent, unambiguous date format.",
      "Examples improve consistency but remain probabilistic, and \"03/04/2025\" is ambiguous between day-first and month-first. The conversion still depends on the model getting it right every time.",
      "This moves the conversion to another model step that can also err, and it happens after the subagent has already reasoned over mixed formats.",
      "Removing tools to avoid a formatting problem sacrifices coverage, including the news tool needed for recent developments."
    ],
    explanation: "Agent SDK PostToolUse hooks can intercept and transform tool results before the model processes them. Normalizing heterogeneous formats in code is deterministic, whereas prompt-based conversion leaves a residual error rate."
  },
  {
    id: "sc-research-018",
    scenario: "research",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "A compliance rule says the report generator subagent may write files only inside the reports/ directory. The rule is stated clearly in the subagent's system prompt, and in testing it is followed in about 98% of runs. In the remaining runs, the subagent writes drafts to the project root or overwrites shared templates, which auditors flag as violations. How should you enforce this rule?",
    options: [
      "Repeat the rule at the top and bottom of the system prompt in capitals and add few-shot examples of correct file paths",
      "Add a PreToolUse hook on Write and Edit that denies any path outside reports/ and gives a reason the agent can act on",
      "Add a final review step in which the coordinator reads the report generator's transcript and reverts out-of-scope writes",
      "Lower the subagent's temperature so that it follows its system prompt more consistently and repeats the same paths"
    ],
    answer: 1,
    optionNotes: [
      "Stronger wording may raise compliance but cannot guarantee it. A compliance rule with a known failure rate needs deterministic enforcement.",
      "A PreToolUse hook inspects each call before it runs and can return a deny decision with a reason. The violation is blocked every time, and the subagent can retry with a valid path.",
      "Reverting after the fact lets the violation happen first, and shared templates may already be overwritten. It also depends on another model reading the transcript accurately.",
      "Temperature affects sampling randomness, not instruction compliance. It offers no guarantee that the rule holds."
    ],
    explanation: "Rules that must always hold belong in hooks or permissions, not only in prompts. A PreToolUse hook blocks disallowed tool calls deterministically, while prompt guidance stays probabilistic."
  },
  {
    id: "sc-research-019",
    scenario: "research",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "When researching a broad topic, you observe that the web search agent and the document analysis agent are both investigating the same subtopics, so their findings overlap heavily. Token usage has nearly doubled without a matching increase in the breadth or depth of research coverage. Both agents are doing competent work on what they cover. What is the most effective way to address this?",
    options: [
      "Add a shared state mechanism in which agents log their current focus area, so other agents can dynamically avoid work in progress",
      "Have the coordinator explicitly partition the research space before delegation, assigning distinct subtopics or source types to each agent",
      "Run document analysis only after web search completes, using the web search findings as context so that it avoids duplicating them",
      "Let both agents finish their parallel work, then have the coordinator deduplicate overlapping findings before passing them to synthesis"
    ],
    answer: 1,
    optionNotes: [
      "A shared focus log is reactive: overlap is caught only after tokens are spent, and concurrent claims can race. It also adds state traffic to every turn when the coordinator could have assigned boundaries up front.",
      "Partitioning the research space before delegation fixes the root cause, unclear task boundaries. It keeps parallel execution while preventing duplicated effort.",
      "Serializing the agents gives up the parallelism the architecture exists for. Feeding all web findings into the second agent also inflates its input tokens.",
      "Deduplication after the fact cleans up the output but leaves the wasted work fully spent. The extra reconciliation pass costs more tokens still."
    ],
    explanation: "The coordinator owns task decomposition, so overlap between subagents is best prevented by giving each a distinct slice of the research space. This keeps the benefits of parallelism without paying twice for the same coverage.",
    source: "mock1-q014"
  },
  {
    id: "sc-research-020",
    scenario: "research",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "After running the system on the topic \"impact of AI on creative industries,\" each subagent completes successfully: the web search agent finds relevant articles, the document analysis agent summarizes papers correctly, and the synthesis agent produces coherent output. However, the final reports cover only visual arts, missing music, writing and film. The coordinator's logs show it decomposed the topic into \"AI in digital art creation,\" \"AI in graphic design,\" and \"AI in photography.\" What is the most likely root cause?",
    options: [
      "The coordinator's task decomposition is too narrow, so the subagent assignments do not cover all relevant domains of the topic.",
      "The synthesis agent lacks instructions for identifying coverage gaps in the findings it receives from the other agents.",
      "The document analysis agent filters out sources about non-visual creative industries because its relevance criteria are too strict.",
      "The web search agent's queries are not comprehensive enough and need expanding to cover more creative industry sectors."
    ],
    answer: 0,
    optionNotes: [
      "The logs show the coordinator created only visual-arts subtasks. Since every subagent did its assigned work correctly, the narrow decomposition explains the missing coverage.",
      "Synthesis can only work with what it receives. Gap-detection instructions could at best report the omission; they cannot produce research that was never assigned.",
      "No music, writing or film sources were ever retrieved, so there was nothing to filter out. The agent also summarized the papers it received correctly.",
      "The search agent found relevant articles for the subtasks it was given. Its scope was fixed upstream, and better queries within \"AI in photography\" cannot reach film or music."
    ],
    explanation: "When every subagent succeeds but coverage is still missing, look at what they were asked to do. Here the coordinator's decomposition omitted whole domains, so the fix belongs in how the coordinator splits broad topics.",
    source: "mock1-q017"
  },
  {
    id: "sc-research-021",
    scenario: "research",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "A user asks for a report comparing how proposed AI copyright regulations affect music licensing, film post-production, and book publishing in the United States and the European Union. Test runs produce reports that mix jurisdictions, duplicate background sections, and leave some industry-specific risks unresolved. The coordinator currently sends the whole prompt to one research pass before synthesis. What workflow change best improves coverage and consistency?",
    options: [
      "Send the full prompt to every subagent in turn, asking each one to improve on whatever the previous agent missed.",
      "Run the broad research pass repeatedly until the synthesis agent reports high confidence that no topics remain missing.",
      "Let subagents negotiate the scope directly with each other, then have the coordinator accept whichever division they choose.",
      "Split the request into industry and jurisdiction workstreams with shared scope definitions, investigate in parallel, then synthesize."
    ],
    answer: 3,
    optionNotes: [
      "Passing the entire request sequentially gives no agent clear ownership of any slice. It amplifies duplication and attention dilution.",
      "Self-reported confidence is a poor proxy for coverage, and repeating the same unfocused pass tends to repeat the same omissions.",
      "Direct negotiation bypasses the coordinator's control of decomposition, making the division unauditable and coverage uneven.",
      "Focused workstreams give each subagent a clear slice, shared definitions keep them consistent, and parallel work keeps latency down. Synthesis then merges them into one report."
    ],
    explanation: "Multi-concern requests should be decomposed into distinct workstreams that share scope definitions such as jurisdictions and date ranges. The coordinator owns that decomposition and the final aggregation, which prevents both gaps and duplication.",
    source: "pt3-q010"
  },
  {
    id: "sc-research-022",
    scenario: "research",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "The coordinator has finished an initial literature map for a controversial research topic. Two stakeholders now want independently developed report outlines, one focused on regulatory risk and one on commercial opportunity. Both outlines should start from the same verified source set, but exploratory assumptions from either outline must not influence the other before the final comparison. What should you do?",
    options: [
      "Fork the session from the completed analysis baseline, develop each framing in its own branch, then compare outputs through the coordinator.",
      "Run both framing tasks as parallel subagent calls that share a scratchpad file for notes and evolving assumptions as they work.",
      "Continue in the existing coordinator session, alternating prompts for each framing, and instruct Claude to keep the assumptions separate.",
      "Start two fresh sessions containing only the original user request, then let each branch rediscover the relevant sources independently."
    ],
    answer: 0,
    optionNotes: [
      "Forking (fork_session / forkSession when resuming) gives both branches the same verified starting context while isolating everything that happens afterwards. That is exactly the shared-baseline, isolated-exploration requirement.",
      "Parallel subagents could work independently, but a shared scratchpad for evolving assumptions creates the cross-contamination the stakeholders want to avoid.",
      "Both framings would accumulate in one shared history, so contamination is likely despite the instruction. Separation would depend on the model's discipline alone.",
      "Fresh sessions avoid contamination but discard the verified source set both outlines must share. Rediscovery may produce inconsistent source sets."
    ],
    explanation: "Session forking is designed for exploring divergent approaches from a common baseline. Each fork inherits the completed analysis, and later reasoning in one branch does not leak into the other.",
    source: "pt3-q041"
  },
  {
    id: "sc-research-023",
    scenario: "research",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "Last week, a long research investigation produced a draft report on a market topic. Since then, several source documents were replaced and the web index was refreshed. When the coordinator resumes the named investigation session, it repeatedly cites withdrawn documents and treats old search outputs as current, even after the user points out the updates. What should you do before continuing the report?",
    options: [
      "Fork the old session into separate branches, compare their reports, and select the branch that shows fewer citation conflicts.",
      "Start a new session with a structured summary of durable findings, explicitly identifying the changed sources for fresh analysis.",
      "Continue the session until the contradictions stop appearing, using a fixed maximum of five additional analysis iterations.",
      "Resume the original session, remind the coordinator that some sources changed, and ask it to disregard any outdated evidence."
    ],
    answer: 1,
    optionNotes: [
      "Forking is for divergent exploration from a valid baseline. Every fork inherits the same stale tool results, so comparing branches does not remove them.",
      "A fresh session leaves the stale tool results behind, while the structured summary carries forward durable conclusions. Naming the changed sources ensures they are re-analyzed rather than trusted.",
      "An iteration cap does not address why contradictions occur. Obsolete evidence stays in context and may still appear in the final report.",
      "The stale outputs remain in the active context and keep influencing the coordinator. Asking it to ignore them is less reliable than removing them."
    ],
    explanation: "Resuming is best when the prior context is still mostly valid. When core evidence has changed, start fresh and inject a structured summary of what still holds, so outdated tool results cannot leak into the report.",
    source: "pt3-q044"
  },
  {
    id: "sc-research-024",
    scenario: "research",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Production logs show that requests to \"analyze the quarterly report I uploaded\" are routed to the web search agent 45% of the time instead of the document analysis agent. The web search agent has an analyze_content tool described as \"analyzes content and extracts key information,\" while the document analysis agent has an analyze_document tool described as \"analyzes documents and extracts key information.\" How should you address this misrouting?",
    options: [
      "Add a pre-routing classifier that decides whether the user means uploaded files or web content before the coordinator delegates.",
      "Add few-shot examples to the coordinator's prompt, such as \"user uploads quarterly report, use document analysis agent\".",
      "Rename the web tool to extract_web_results and describe it as processing information retrieved from web searches and URLs.",
      "Expand only the document tool's description with examples like \"use for uploaded PDFs\", leaving the web search tool unchanged."
    ],
    answer: 2,
    optionNotes: [
      "A classifier adds a component and a latency hop while leaving two near-identical tool definitions in place. Anything that still consults them remains ambiguous.",
      "Few-shot examples are soft steering over a real semantic overlap. Requests phrased differently from the examples still hit the same ambiguity.",
      "Renaming and redescribing the web tool removes the overlap at its source. Each tool's name and description then clearly signal web content versus uploaded documents.",
      "Fixing only one side leaves \"analyzes content and extracts key information\" still matching an uploaded report. The ambiguity comes from the web tool's generic definition."
    ],
    explanation: "Tool names and descriptions are the main signal Claude uses to choose between tools. When two tools are described almost identically, fix the definitions so their purposes and boundaries are distinct.",
    source: "mock1-q027"
  },
  {
    id: "sc-research-025",
    scenario: "research",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "A new MCP server exposes a working literature database tool that searches licensed journals and returns abstracts, DOI links, publication dates and citation-ready metadata. In test runs, the web search subagent still uses general web search for peer-reviewed evidence, while the document analysis subagent scans exported PDFs by hand. The tool appears in the available tool list, but its description is only \"Search articles by query.\" What should you change first?",
    options: [
      "Rename the tool to authoritative_research_supertool, leaving its inputs, outputs, and usage boundaries unchanged.",
      "Require academic prompts from the coordinator to include the word \"literature\" so that keyword matching routes them.",
      "Rewrite the description to state coverage, accepted queries, returned citation metadata, and when to prefer the tool.",
      "Remove web search and file tools from all research subagents so the literature database is the only retrieval path."
    ],
    answer: 2,
    optionNotes: [
      "A dramatic name still does not say what the tool does, what it returns or when to use it. Promotional naming can even increase misuse.",
      "Keyword routing is brittle and fails when requests are phrased differently. It bypasses semantic tool choice instead of improving the tool's definition.",
      "The description is the main input Claude uses to decide whether a tool fits. Stating coverage, inputs, outputs and when to prefer it over web search lets agents pick it for the right tasks.",
      "Forcing the tool by removing alternatives breaks workflows that legitimately need web sources or local documents, and hides the real selection problem."
    ],
    explanation: "MCP tools are selected by the model based on their descriptions. A one-line description gives agents no reason to prefer a specialized tool, so the first fix is a description that states capabilities, inputs, outputs and selection boundaries.",
    source: "pt3-q040"
  },
  {
    id: "sc-research-026",
    scenario: "research",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "The web search subagent has two tools: search_web, described as \"Searches the internet for information\", and search_news, described as \"Searches for news\". For questions about events from the past week it usually calls search_web, which ranks older evergreen pages first, so reports miss recent developments. For background questions it sometimes calls search_news and returns only short-lived coverage. What is the most effective fix?",
    options: [
      "Expand both descriptions to state each tool's index, recency window, typical results, example queries, and when to prefer it.",
      "Merge the two tools into one search tool with a boolean recent flag, keeping the merged description as short as the originals.",
      "Add a line to the coordinator's prompt telling it to include the word \"news\" whenever it delegates a question about recent events.",
      "Always call both tools for every query and let the synthesis agent discard whichever set of results looks less relevant to it."
    ],
    answer: 0,
    optionNotes: [
      "Descriptions that spell out what each tool covers, how recent its results are and when to choose it give the model the information it lacks. This addresses both misuses at their source.",
      "Merging could work only with a clear description of when to set the flag. With an equally vague description, the same ambiguity just moves into a parameter.",
      "This relies on a keyword the coordinator must remember and that the subagent may still not associate with search_news. It works around the vague descriptions instead of fixing them.",
      "Calling both tools doubles cost and context for every query, and pushes the selection problem onto synthesis, which has less information about each tool."
    ],
    explanation: "When similar tools are confused, the fix is to differentiate their descriptions: purpose, data source, recency, example inputs and boundaries against each other. Minimal descriptions leave the model guessing between overlapping tools."
  },
  {
    id: "sc-research-027",
    scenario: "research",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "After a prompt update, the document analysis subagent began calling the web search MCP tool on uploaded PDFs, even though its load_document tool description clearly covers uploaded files. The new system prompt includes the line \"Always search thoroughly before drawing conclusions.\" Rolling back the tool definitions had no effect, but removing that line restored correct tool choice in a quick test. What does this suggest, and what should you do?",
    options: [
      "The system prompt's \"search\" wording is pulling selection toward the search tool; rephrase it to state the goal without that cue",
      "The load_document description is still too weak; double its length with more examples so it outweighs the system prompt's wording",
      "The model is ignoring tool descriptions entirely; replace tool choice with a router that picks a tool from the user's keywords",
      "The web search tool should be renamed so its name no longer contains \"search\" and stops matching instructions to search thoroughly"
    ],
    answer: 0,
    optionNotes: [
      "Keyword-laden instructions in a system prompt can create unintended tool associations. Rewording the goal (for example, \"examine every relevant section of the provided documents\") removes the cue without losing the intent.",
      "The description was already adequate, as the test without the line showed. Making it longer does not remove the conflicting signal in the system prompt.",
      "The evidence shows the model does use descriptions; it was steered by the new instruction. Keyword routing would be more brittle than the original behavior.",
      "Renaming the tool to dodge a word hides what it does and makes selection worse elsewhere. The problem is the instruction, not the tool's accurate name."
    ],
    explanation: "Tool selection is influenced by the system prompt as well as tool descriptions. When a wording change causes misrouting, review the system prompt for keywords that override well-written descriptions and rephrase them."
  },
  {
    id: "sc-research-028",
    scenario: "research",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "Your web search MCP tool occasionally times out. When it does, it returns a content block reading \"Search provider timeout, try again later\" as if the call had succeeded. The synthesis subagent sometimes treats that text as a source note, and the report generator then includes unsupported citations. What tool response change best prevents the model from confusing failures with valid research content?",
    options: [
      "Convert failures into empty successful result lists, allowing the coordinator to proceed without extra error-handling complexity.",
      "Keep returning error text as normal content, but instruct synthesis to ignore any passages that mention timeout or unavailable.",
      "Return failed calls with isError set to true, plus concise diagnostic content that the subagent can use to decide on recovery.",
      "Raise uncaught server exceptions for all failures, letting the agent infer the details from transport-level interruptions instead."
    ],
    answer: 2,
    optionNotes: [
      "An empty success means the query ran and found nothing, which is different from a timeout. Hiding failures this way prevents retries, alternative searches or coverage-gap notes.",
      "This relies on parsing natural language inside successful content, which breaks when wording changes or when real sources contain similar words.",
      "MCP tool results use isError to mark failed executions. The agent then treats the content as diagnostics rather than evidence and can retry, switch sources or record a gap.",
      "A transport failure gives the agent less useful context than an explicit error result and can break the loop rather than enabling recovery."
    ],
    explanation: "Tool failures should be signalled as failures, not returned as ordinary content. Setting isError with a short diagnostic lets agents separate errors from evidence and choose a recovery path.",
    source: "pt1-q018"
  },
  {
    id: "sc-research-029",
    scenario: "research",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "During a run, the document analysis subagent asks a source retrieval MCP tool for the full text of a licensed market report. The backend rejects the request because the license permits summaries and short excerpts only. Today the tool returns \"access denied,\" so the coordinator retries with paraphrased requests and then marks the source as unavailable. What change would best let the agents handle this case correctly?",
    options: [
      "Return a successful empty result set so that the synthesis agent can continue without exposing any licensing details.",
      "Return isError true with errorCategory business, isRetryable false, and guidance to request summaries or excerpts.",
      "Report a permission error and tell the coordinator to escalate to infrastructure owners for urgent credential repair.",
      "Classify the rejection as transient and retry with backoff, using progressively narrower full-text retrieval queries."
    ],
    answer: 1,
    optionNotes: [
      "An empty success misrepresents a blocked request as a query with no matches. The report then omits a source without explaining why or trying an allowed alternative.",
      "Marking it as a non-retryable business-rule error stops pointless retries, and the guidance gives the agent a valid recovery path within the license.",
      "A permission error implies credentials could be fixed. Here the limit is a licensing rule that still allows summaries, so credential repair is the wrong path.",
      "The rejection comes from a stable rule, not a temporary outage. Retrying full-text retrieval only adds latency and hits the same constraint again."
    ],
    explanation: "Structured error metadata should tell the agent what kind of failure occurred and whether retrying can help. Distinguishing business-rule violations from transient and permission errors, and suggesting an allowed alternative, enables a correct recovery.",
    source: "pt1-q037"
  },
  {
    id: "sc-research-030",
    scenario: "research",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "During evaluation, the document analysis subagent repeatedly calls an MCP tool to fetch the same unavailable source URL. Logs show the tool marks every failed fetch the same way, so the subagent retries permanent failures such as deleted documents and unsupported file formats. This adds minutes of latency before the coordinator receives partial findings. What change would best improve recovery behavior?",
    options: [
      "Ask the coordinator to classify retryability from the tool's natural-language error text before deciding whether to rerun.",
      "Return errorCategory and isRetryable for each failure, marking permanent source issues non-retryable and timeouts retryable.",
      "Retry every failed fetch three times before reporting failure, since repeated attempts smooth over provider instability.",
      "Convert non-retryable failures into empty successful results so synthesis continues without any coordinator intervention."
    ],
    answer: 1,
    optionNotes: [
      "Inferring retryability from prose is brittle and moves classification away from the tool, which knows the backend response best.",
      "Machine-readable category and retryability let the subagent retry timeouts locally and stop immediately on permanent failures, then report them with context.",
      "A fixed retry count wastes time on failures that can never succeed, and the delay compounds across subagents.",
      "This hides failures as if the source were empty, so the coordinator and synthesis lose visibility of the coverage gap."
    ],
    explanation: "Not all failures deserve the same response. Tools should return structured metadata such as an error category and a retryable flag, so agents retry transient problems and surface permanent ones quickly.",
    source: "pt3-q018"
  },
  {
    id: "sc-research-031",
    scenario: "research",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "During testing, the synthesis agent frequently needs to verify specific claims while combining findings. Each time, it returns control to the coordinator, which invokes the web search agent and then re-invokes synthesis with the results, adding 2-3 round trips per task and about 40% latency. Your evaluation shows 85% of these verifications are simple fact checks (dates, names, statistics) while 15% need deeper investigation. What is the most effective approach to reduce overhead while maintaining reliability?",
    options: [
      "Have the synthesis agent collect all verification needs and return them as one batch to the coordinator at the end of its pass.",
      "Have the web search agent proactively cache extra context around each source, anticipating what synthesis might need to verify.",
      "Give the synthesis agent a scoped verify_fact tool for simple lookups, and keep routing complex checks through the coordinator.",
      "Give the synthesis agent access to all web search tools so that it can handle every verification need without the coordinator."
    ],
    answer: 2,
    optionNotes: [
      "Batching still routes every check through the coordinator and the search agent and re-invokes synthesis, so most of the overhead remains. Synthesis also has to draft claims it cannot yet confirm.",
      "Caching guesses in advance what will need checking, inflating every payload while still missing the specific facts synthesis queries.",
      "A narrow tool handles the common simple case directly while the complex 15% keeps the coordinator path. It applies least privilege and removes most round trips.",
      "Full search access hands synthesis the deep investigations the search agent specializes in and removes coordinator oversight of complex research."
    ],
    explanation: "Give agents the tools their role needs, plus narrowly scoped cross-role tools for frequent simple needs. Complex work stays with the specialist through the coordinator.",
    source: "mock1-q015"
  },
  {
    id: "sc-research-032",
    scenario: "research",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "During testing, the document analysis subagent receives PDFs and reports that the coordinator selected from an approved catalog, but it has a generic fetch_url tool. It sometimes follows links inside documents to blogs, login pages or duplicate HTML summaries, then cites those pages instead of the approved sources. You need to reduce these citation and scope errors while preserving access to approved source material. What change best addresses this?",
    options: [
      "Keep fetch_url available, but add prompt instructions warning the subagent never to open links found inside documents.",
      "Allow fetch_url for any link, then have synthesis discard citations whose domains are not in the approved catalog.",
      "Give the document analysis subagent web search tools too, so it can confirm whether linked pages are relevant.",
      "Replace fetch_url with a load_document tool that accepts catalog IDs or approved URLs and validates them before fetching."
    ],
    answer: 3,
    optionNotes: [
      "Prompt warnings depend on probabilistic compliance and leave the risky capability in place.",
      "Filtering citations late lets unapproved pages shape intermediate conclusions, even if their citations are removed afterwards.",
      "More tools widen the scope problem, pulling the document agent further into web research outside its role.",
      "A purpose-built tool narrows the action space to the agent's role. Validation keeps access to approved material while making off-catalog fetches impossible."
    ],
    explanation: "When a generic tool lets a subagent wander outside its role, replace it with a constrained tool whose contract encodes the boundary. This is more reliable than prompt guidance or after-the-fact filtering.",
    source: "pt1-q051"
  },
  {
    id: "sc-research-033",
    scenario: "research",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "Every subagent currently receives the full catalog of 18 tools so that none of them is ever blocked. Logs show the synthesis agent attempting web searches, the search agent trying to parse PDFs, and frequent wrong-tool selections across all agents. The tool descriptions were reviewed last month and are clear and distinct. What is the correct redesign?",
    options: [
      "Add a routing tool that every agent calls first, which returns the name of the correct tool to use for the current step",
      "Group the catalog by category and add a category header to each tool description so agents can scan the list faster",
      "Write longer system prompts that warn each agent about the specific tools it should ignore and explain the reasons",
      "Scope each subagent's tools to its role, giving it a handful of relevant tools plus any narrow cross-role utility"
    ],
    answer: 3,
    optionNotes: [
      "A router adds a selection step to solve a selection problem, and the router itself must now be chosen and used correctly.",
      "Headers reorganize the same oversized inventory; every agent still chooses among all 18 tools.",
      "Prompts are fighting an inventory problem that configuration should fix. The out-of-role tools remain available to misuse.",
      "Agents choose more reliably among a few role-relevant tools than among 18, and tools outside a specialization are misused precisely because they are available."
    ],
    explanation: "Tool distribution is an architectural control. Restricting each subagent to its role's tools reduces wrong selections and keeps agents within their specialization.",
    source: "purcell-q026"
  },
  {
    id: "sc-research-034",
    scenario: "research",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "The coordinator's document analysis subagent depends on an internal library catalog MCP server. It works in your local Claude Code session, but two teammates who cloned the repository cannot access the catalog tools, so their runs fall back to weaker web searches. Separately, one researcher is testing an experimental notes server that should not affect the team. What should you change?",
    options: [
      "Place both servers in each user's ~/.claude.json, and rely on onboarding scripts to keep the copies in sync across machines.",
      "Combine the catalog and notes integrations into one MCP server, and expose only role-specific tools to each subagent.",
      "Move the catalog server into project-scoped .mcp.json, and keep the experimental notes server in user scope.",
      "Document per-user claude mcp add commands in the README, and ask each researcher to recreate both servers locally."
    ],
    answer: 2,
    optionNotes: [
      "User scope suits personal tools, not shared dependencies. Syncing it with scripts is brittle and still leaves teammates with different tool sets.",
      "Tool scoping does not solve configuration distribution, and bundling a team dependency with a personal experiment exposes the experiment to everyone.",
      "Project-scoped .mcp.json is checked into the repository, so everyone who clones it gets the catalog server. The experimental server stays in the researcher's user scope.",
      "Manual setup depends on every teammate doing it correctly and pushes the personal experimental server onto the whole team."
    ],
    explanation: "Match MCP configuration scope to its audience: project scope (.mcp.json) for servers the team workflow requires, user scope for personal or experimental servers.",
    source: "pt1-q036"
  },
  {
    id: "sc-research-035",
    scenario: "research",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "A researcher adds an internal corpus MCP server that searches licensed journals and exports citation metadata. The coordinator uses it successfully on that researcher's laptop, but teammates running the same workflow see only the default tools and produce reports with weaker public web citations. The server must become part of the team's reproducible research setup, and each researcher has their own API credential. What should you change?",
    options: [
      "Let each subagent fall back to generic web search when MCP tools are unavailable, avoiding repository-level configuration.",
      "Define the server in the repository's .mcp.json, using environment variable expansion for credentials instead of secrets.",
      "Add the server to each developer's ~/.claude.json profile, then document the manual setup steps in the project README.",
      "Describe the server in CLAUDE.md and instruct the coordinator to request those research tools by name when it needs them."
    ],
    answer: 1,
    optionNotes: [
      "A fallback hides the misconfiguration and accepts lower-quality citations. Results then depend on whichever tools happen to be installed.",
      "A project-scoped .mcp.json travels with the repository, and ${VAR} expansion lets each person supply their own credential without committing it.",
      "User-level configuration does not travel with the repository, so the inconsistency remains and depends on manual setup.",
      "CLAUDE.md provides instructions, not tool registration. The coordinator cannot call tools from a server that was never configured."
    ],
    explanation: "Shared MCP servers belong in the project's .mcp.json, with credentials supplied through environment variable expansion. That makes the setup reproducible for the team without committing secrets.",
    source: "pt3-q034"
  },
  {
    id: "sc-research-036",
    scenario: "research",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Subagents spend many tool calls just discovering what data exists before real work begins: listing the available document collections, probing which reports have summaries, and checking which metadata schemas are present. The collections change weekly, and in some runs a third of all tool calls are this kind of exploration. The data is served by your team's MCP server. Which MCP capability best reduces this overhead?",
    options: [
      "Expose the content catalogs, such as collection listings and schema summaries, as MCP resources",
      "Raise each subagent's tool-call budget so the exploration phase becomes affordable on every run",
      "Hard-code the current data inventory into every subagent's system prompt and update it by hand",
      "Add a describe_available_data tool that every agent is told to call once when it first starts up"
    ],
    answer: 0,
    optionNotes: [
      "MCP resources are the protocol's mechanism for exposing content catalogs, so agents can see what exists without spending exploratory tool calls.",
      "A bigger budget pays for the inefficiency rather than removing it.",
      "A hard-coded inventory goes stale as soon as the weekly collections change.",
      "This rebuilds a catalog as a bespoke tool call per agent; resources are the designed primitive for exposing what content is available."
    ],
    explanation: "MCP resources let a server publish catalogs such as document hierarchies and schema listings for agents to read. Agents start informed instead of discovering the data landscape through many tool calls.",
    source: "purcell-q027"
  },
  {
    id: "sc-research-037",
    scenario: "research",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "The report generator subagent must update a shared Markdown template used for final research reports. The template contains the same phrase, \"TODO: add source summary,\" in several sections. Repeated attempts to make a targeted Edit replacement in one section keep failing because the match text is not unique. What should the subagent do next?",
    options: [
      "Use Bash with a scripted search-and-replace command to bypass Edit and update the template automatically.",
      "Use Grep to locate every matching phrase, then replace all of the occurrences so the edit cannot fail again.",
      "Read the template to see the intended section, then retry Edit with an old_string that includes that section's heading.",
      "Keep retrying Edit with broader surrounding text until one replacement succeeds, without inspecting the file."
    ],
    answer: 2,
    optionNotes: [
      "A script can change the wrong occurrence just as easily unless it is constrained by an inspection of the file. It bypasses the problem rather than resolving the ambiguity.",
      "Replacing every occurrence changes sections that should keep their placeholder. Only one section was meant to change.",
      "Edit needs old_string to match exactly once. Reading the file shows what surrounds the intended occurrence, and including that unique context in old_string pins the change to the right section without rewriting the whole file.",
      "Blind retries without looking at the file may still be ambiguous or hit the wrong section. Guessing at context is not a reliable fix."
    ],
    explanation: "Edit requires old_string to appear exactly once. When text repeats, the documented fix is to widen old_string with surrounding context that is unique (or set replace_all when every occurrence should change); inspecting the file first tells the agent which context to use.",
    source: "pt3-q019"
  },
  {
    id: "sc-research-038",
    scenario: "research",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "In the research pipeline, the report generator subagent wastes context locating reusable Markdown templates and citation style files. The team already knows the naming conventions for these files, such as templates/**/*.report.md. However, the subagent currently inspects broad directory contents before deciding what to read. Which approach best reduces unnecessary context while preserving accuracy?",
    options: [
      "Use Bash to run recursive directory listings, then have the subagent infer the relevant templates from the raw output.",
      "Use Grep for the template filenames across the repository, then Read every file whose content lines match the search.",
      "Use Glob with the known path patterns to list candidate template files, then Read only the matches it actually needs.",
      "Use Read on all files under the reports directory, then summarize away the files that appear to be irrelevant."
    ],
    answer: 2,
    optionNotes: [
      "Recursive listings produce large, noisy output the model must parse. A purpose-built path-matching tool is cleaner.",
      "Grep searches file contents, not names, so it can miss correctly named files and return unrelated ones that mention the term.",
      "Glob matches file paths by pattern, so discovery costs little context. Reading only the selected files keeps content inspection focused.",
      "Reading everything first loads content before relevance is known. Summarizing afterwards does not recover the wasted context."
    ],
    explanation: "Use Glob to find files by name or path pattern and Grep to search inside files. Separating discovery from reading keeps the agent's context focused on relevant files.",
    source: "pt3-q042"
  },
  {
    id: "sc-research-039",
    scenario: "research",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "The document analysis subagent extracts each source into a JSON schema through a tool call, and publication_date is a required string field. About 15% of sources, such as undated white papers, state no date, yet every record comes back with one. Spot checks show many of these dates are invented or copied from a reference the source cites, and synthesis then treats those sources as current. What schema change best fixes this?",
    options: [
      "Keep publication_date required but describe it as \"use today's date when the source has no date\" so values stay consistent",
      "Make publication_date nullable and tell the subagent to return null whenever the source itself states no date",
      "Remove publication_date from the schema and have the synthesis agent look up each source's date with a web search",
      "Keep the field required and add a confidence score so downstream agents can discount dates the model is unsure of"
    ],
    answer: 1,
    optionNotes: [
      "Today's date is also a fabricated value, and it makes undated sources look maximally current, which worsens the synthesis error.",
      "A required field pressures the model to produce a value even when none exists. Allowing null for absent information removes that pressure and gives synthesis an honest signal.",
      "Dropping the field loses dates for the 85% of sources that state one, and web lookups for undated documents may find the wrong date.",
      "The field still forces a value for every source. Self-reported confidence does not reliably flag fabricated values."
    ],
    explanation: "When a schema field is required but the information may be absent, the model tends to fabricate a value to satisfy it. Making such fields nullable (or optional) and instructing the model to return null when the source is silent prevents invented data."
  },
  {
    id: "sc-research-040",
    scenario: "research",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Before synthesis, a validator checks that every claim in the document analysis output cites a page that exists in its source. About 8% of outputs fail, and the current retry simply re-sends the original prompt, which fixes only a few of them. Reviewing the failures, you find that most cite page numbers from the wrong document, while a small share come from sources that have no page numbers at all. What retry strategy is most effective?",
    options: [
      "Retry with the document and the specific errors, such as which claim cited a missing page, and allow null pages for unpaginated sources",
      "Retry the identical request up to five times, since sampling variation means that a later attempt will eventually produce valid page citations",
      "Drop every claim that fails validation from the output and continue to synthesis with only the claims that passed",
      "Switch the validator to warn-only and let the report generator correct the page numbers while it formats citations"
    ],
    answer: 0,
    optionNotes: [
      "Feeding back the specific validation errors lets the model correct exactly what was wrong. Allowing null for unpaginated sources stops retries that can never succeed because the information does not exist.",
      "Identical retries give the model no information about what failed, which is why the current approach fixes so few. Retries also cannot conjure page numbers that do not exist.",
      "Dropping claims loses valid findings that only had a citation error, silently reducing coverage.",
      "The report generator lacks the source context to correct page numbers and may invent them, pushing the error closer to publication."
    ],
    explanation: "Effective retries include the original input, the failed output and the specific validation errors. Retries help with format and placement errors, but not when the required information is absent, which needs a schema that allows null.",
  },
  {
    id: "sc-research-041",
    scenario: "research",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Each night the system re-analyzes about 8,000 archived documents so their extracted findings are available for later research runs. The job currently sends synchronous Messages API requests with retry logic and hits rate limits most nights. Nobody waits on individual results, and the findings only need to be ready within a day. What is the best way to run this job?",
    options: [
      "Submit the documents through the Message Batches API and match results to documents by custom_id when the batch ends",
      "Keep synchronous calls but add more worker processes and a larger retry budget so the job finishes before limits hit",
      "Move the work into the coordinator's live research loop so each document is analyzed only when a user request needs it",
      "Use streaming responses for every document so results arrive token by token and the job completes faster overall"
    ],
    answer: 0,
    optionNotes: [
      "The Message Batches API suits large, non-urgent workloads: it costs 50% less, processes asynchronously within a 24-hour window, and avoids the client-side blocking and retry storms of thousands of synchronous calls.",
      "More workers increase pressure on the same rate limits and keep paying full price for work that has no latency requirement.",
      "This shifts latency onto users who are waiting for reports, which is the opposite of what a non-urgent job should do.",
      "Streaming changes how each response is delivered, not throughput, cost or rate limits."
    ],
    explanation: "Bulk work with no one waiting and a deadline measured in hours is the use case for the Message Batches API. Most batches finish within an hour, results are matched by custom_id, and the cost is half that of synchronous calls."
  },
  {
    id: "sc-research-042",
    scenario: "research",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "To cut costs, a teammate proposes routing all of the coordinator's and subagents' model calls through the Message Batches API, since batch requests cost 50% less. The coordinator runs an agentic loop in which each response may request tools whose results feed the next call, and users wait in the web app for their reports. The nightly archive re-analysis job, by contrast, has no one waiting on it. How should you respond?",
    options: [
      "Adopt batching everywhere, because most batches finish within an hour and the savings outweigh the extra latency for users",
      "Keep the interactive loop on the synchronous Messages API and use batches only for the non-urgent archive job",
      "Batch only the coordinator's calls and keep the subagents synchronous, since the coordinator makes the fewest calls per run",
      "Batch the interactive loop but poll each batch every few seconds, so users see results almost as fast as synchronous calls"
    ],
    answer: 1,
    optionNotes: [
      "Batches have no latency guarantee (up to 24 hours), and every loop iteration depends on the previous result, so each turn would wait on a separate batch. Users would wait far longer.",
      "Interactive, multi-turn tool loops need the immediate responses of synchronous calls. Batching fits the non-urgent bulk job, where its cost savings carry no user-facing penalty.",
      "The coordinator's calls sit on the critical path of every run, so batching them delays the whole workflow even if subagents stay synchronous.",
      "Polling more often does not make batches process sooner; there is still no latency guarantee. It adds API traffic without fixing the blocking problem."
    ],
    explanation: "The Batches API trades latency for cost: up to 24 hours of processing at half the price. That suits offline workloads, not agentic loops where each step must wait for the previous response while a user waits."
  },
  {
    id: "sc-research-043",
    scenario: "research",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your nightly batch of 8,000 document analyses has ended, and the results file shows that most requests succeeded while some errored and some expired. Your code reads the results file line by line and assigns each result to the document at the same position in the original request list. Several reports later cited findings from the wrong document. How should you process batch results?",
    options: [
      "Match each result to its request by custom_id, then resubmit only the errored and expired requests in a new batch",
      "Keep matching by position but sort the results file by creation time first, then resubmit the entire batch again",
      "Match results by position and treat errored and expired items as empty successes so downstream jobs do not block",
      "Resubmit the whole batch whenever any request fails, since partial batches cannot be relied on for consistent analysis"
    ],
    answer: 0,
    optionNotes: [
      "Batch results are not guaranteed to come back in request order, so custom_id is how results are matched. Resubmitting only the failed requests avoids paying again for work that succeeded.",
      "Sorting does not restore request order, so the mismatch persists, and resubmitting everything repeats successful work.",
      "Position matching keeps the mismatch, and treating failures as empty successes hides missing analyses from downstream reports.",
      "Successful results in a batch are valid on their own. Rerunning everything wastes cost and time for a few failures."
    ],
    explanation: "Each batch result carries the custom_id of its request and a result type (succeeded, errored, canceled or expired). Match by custom_id and resubmit only the requests that did not succeed."
  },
  {
    id: "sc-research-044",
    scenario: "research",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "The document analysis subagent receives 45 reports and policy papers in a single pass before synthesis. The final outputs cite many sources but miss source-specific caveats, merge incompatible methodologies, and sometimes contradict facts extracted earlier in the same run. Stronger prompt wording has not helped. What workflow change would most effectively improve reliability?",
    options: [
      "Set a maximum number of synthesis iterations and stop once the report includes citations from every source category.",
      "Send all sources to the synthesis agent together and instruct it to be more careful with citations and contradictions.",
      "Partition sources randomly across parallel subagents, concatenate their summaries, and have the report agent polish them.",
      "Analyze each source in a focused pass that produces structured findings, then run a separate cross-source integration pass."
    ],
    answer: 3,
    optionNotes: [
      "An iteration cap and citation coverage by category do not show that caveats or methodological differences were handled correctly.",
      "This keeps the overloaded single-pass structure that caused the problem. Stronger instructions do not fix attention dilution across 45 sources.",
      "Random partitioning with concatenation has no deliberate integration step, so contradictions and incompatible methods pass through into fluent text.",
      "Per-source passes give each document full attention and keep its caveats, and the integration pass is dedicated to comparing methods and resolving contradictions."
    ],
    explanation: "Splitting work into focused per-source passes plus a separate cross-source integration pass avoids asking one call to juggle too much at once. Each stage has a single responsibility it can do well.",
    source: "pt1-q033"
  },
  {
    id: "sc-research-045",
    scenario: "research",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "After drafting each report, the report generator is asked, in the same conversation, to review its own citations and flag any claim its cited source does not support. Audits show it rarely flags anything, yet about 6% of claims are not supported by the cited passage. Making the review instructions stricter produced little change. What review design is most likely to catch these errors?",
    options: [
      "Run the citation check in a separate Claude instance that sees only the claims and cited passages, not the drafting reasoning",
      "Ask the report generator to review its citations twice in the same conversation and flag only claims both passes question",
      "Have the report generator give a confidence score for every claim, then manually review the claims below a fixed threshold",
      "Turn on extended thinking for the report generator so it reasons more carefully about each citation while drafting the report"
    ],
    answer: 0,
    optionNotes: [
      "An independent instance without the generator's context is not anchored by the reasoning that produced the errors, so it evaluates each claim against its passage afresh.",
      "A second self-review in the same context inherits the same assumptions, and requiring agreement between two biased passes flags even less.",
      "Self-reported confidence comes from the same context that made the errors and is often miscalibrated, so unsupported claims can still score high.",
      "More reasoning during drafting may help somewhat, but it is still self-review by the same instance and adds no independent check."
    ],
    explanation: "A model reviewing its own output in the same session tends to confirm its earlier reasoning. An independent review instance, given only what it needs to verify, catches errors self-review misses."
  },
  {
    id: "sc-research-046",
    scenario: "research",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "Production monitoring reveals inconsistent synthesis quality. When aggregated results total about 75K tokens, the synthesis agent reliably cites information from the first 15K tokens (web search headlines and snippets) and the final 10K tokens (document analysis conclusions). However, it frequently omits critical findings in the middle 50K tokens, even when they directly address the research question. How should you restructure the aggregated input?",
    options: [
      "Place a key findings summary at the start of the aggregated input and organize detailed results under explicit section headers.",
      "Rotate which subagent's results appear first across research tasks, so that both sources receive the primacy position over time.",
      "Stream subagent results to synthesis incrementally, processing web search results to completion before adding document findings.",
      "Summarize all subagent outputs to under 20K tokens in total before aggregation, so the content stays in a reliable range."
    ],
    answer: 0,
    optionNotes: [
      "Putting key findings at the start places them where attention is most reliable, and section headers help the model navigate the middle. This directly targets the lost-in-the-middle effect.",
      "Rotation only moves the primacy slot between sources; on each task about 50K tokens still sit in the neglected middle.",
      "The same 75K tokens still accumulate in context, and finishing web results first forces conclusions before document findings arrive.",
      "Compressing to 20K risks dropping the very critical findings at stake. The failure is positional attention, not total volume."
    ],
    explanation: "Models attend most reliably to the beginning and end of long inputs. Leading with a key-findings summary and structuring the rest with clear headers mitigates omissions from the middle.",
    source: "mock1-q053"
  },
  {
    id: "sc-research-047",
    scenario: "research",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "During load testing, reports on broad topics become inconsistent once the research phase produces more than 30 source analyses. The document analysis subagent completes successfully, but its outputs are long narrative memos including internal reasoning, which are copied verbatim into the synthesis prompt. The synthesis agent omits high-value evidence from earlier analyses and sometimes cites sources that were discussed but not central. What redesign best addresses this reliability problem?",
    options: [
      "Ask the synthesis agent to summarize each long subagent narrative first, then synthesize from its own summaries.",
      "Have upstream subagents return compact structured records: key facts, citations, relevance scores, and needed caveats.",
      "Increase the synthesis agent's max_tokens and ask it to carefully read every upstream narrative before it writes.",
      "Truncate each subagent response at a fixed character limit before sending it to the synthesis agent for review."
    ],
    answer: 1,
    optionNotes: [
      "This adds another lossy summarization layer after the context is already noisy, and can drop exact facts and citations.",
      "Fixing the handoff format at the source keeps what synthesis needs while removing narrative and reasoning noise, which reduces attention dilution.",
      "max_tokens limits output length, not how well the model attends to a large, noisy input.",
      "Fixed truncation can cut the most important evidence or caveats without regard to relevance."
    ],
    explanation: "Upstream agents should return structured, synthesis-ready data rather than verbose narratives. The handoff contract determines whether downstream agents can aggregate findings reliably and keep attribution.",
    source: "pt3-q037"
  },
  {
    id: "sc-research-048",
    scenario: "research",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "Long research sessions often span dozens of coordinator turns. Early on, the user specifies that only sources published after 2022 and only EU jurisdictions are in scope. After several rounds of automatic context compaction, later delegations no longer mention these constraints, and subagents start returning US sources and studies from 2019. What is the most reliable way to keep the constraints in effect?",
    options: [
      "Keep the constraints in a persistent scope block that the coordinator includes in every delegation, outside the compacted history",
      "Disable automatic compaction so the full conversation, including the user's first message, always stays in the context window",
      "Ask the user to repeat the constraints in each new message so the most recent turn always contains the current scope",
      "Have the synthesis agent filter out-of-scope sources at the end, since subagents cannot reliably remember the scope anyway"
    ],
    answer: 0,
    optionNotes: [
      "Facts that must survive the whole session should live in a structured block that is not subject to summarization. Including it in every delegation means subagents always receive the scope.",
      "Without compaction, long sessions eventually exceed the context window, and constraints buried far back can still be under-weighted.",
      "This pushes the system's memory problem onto the user and fails as soon as they forget.",
      "Filtering at the end wastes all the out-of-scope research and leaves gaps where in-scope sources should have been gathered."
    ],
    explanation: "Summarization and compaction can drop critical details such as user constraints. Keeping them in a persistent structured block and passing it explicitly with each delegation preserves them across long sessions."
  },
  {
    id: "sc-research-049",
    scenario: "research",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "During a run on regional climate adaptation funding, the document analysis subagent finds two credible government reports with incompatible cost estimates. The synthesis agent cannot tell whether the difference reflects methodology, geography or time period. Current escalation tickets say only \"conflicting sources found,\" so human reviewers must restart the investigation from scratch. What change would best improve this mid-process escalation?",
    options: [
      "Ask the synthesis agent to choose the most plausible estimate and escalate only when its own confidence score is low.",
      "Have the report generator omit contested sections and notify reviewers only after the unrelated sections are finished.",
      "Generate a structured handoff with the topic, disputed claims, citations, analysis performed, and decisions needed.",
      "Attach the complete coordinator and subagent transcript so reviewers can reconstruct the investigation themselves."
    ],
    answer: 2,
    optionNotes: [
      "Forcing a choice hides a real conflict, and self-reported confidence is not a reliable escalation trigger.",
      "Omitting contested sections hides a gap, and delaying reviewers stalls resolution of the very issue blocking synthesis.",
      "A structured handoff transfers the work already done: what is disputed, the evidence, what was tried and what decision is needed. Reviewers can continue instead of restarting.",
      "A full transcript is verbose and makes reviewers dig out the relevant facts, which is what the ticket should have done for them."
    ],
    explanation: "Escalation should transfer actionable state, not just announce a problem. Reviewers who lack the agents' context need a concise, structured summary of the issue, the evidence and the recommended next decision.",
    source: "pt3-q049"
  },
  {
    id: "sc-research-050",
    scenario: "research",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "The web search subagent returns results for only 3 of 5 requested source categories: competitor websites and industry reports succeeded, but news archives and social media feeds timed out. The document analysis subagent successfully processed all provided documents. The synthesis subagent must now produce a findings summary from this mixed-quality input. What is the most effective error propagation strategy?",
    options: [
      "Proceed with synthesis using only the successful sources, generating output without indicating which data was unavailable.",
      "Structure the synthesis output with coverage annotations showing which findings are well supported and which areas have gaps.",
      "Have synthesis ask the coordinator to retry the timed-out sources with longer timeouts, waiting for full coverage before starting.",
      "Have synthesis return an error to the coordinator indicating incomplete upstream data, triggering a full retry or task failure."
    ],
    answer: 1,
    optionNotes: [
      "Hiding the timeouts lets readers mistake a coverage gap for an absence of evidence, such as concluding there is no negative social sentiment.",
      "Coverage annotations deliver the value of completed work while telling readers where conclusions are weaker. This is graceful degradation with transparency.",
      "This lets a downstream agent drive retry policy and blocks all output on sources that may time out again.",
      "Failing the task turns a useful partial result into nothing and reruns work that already succeeded."
    ],
    explanation: "When some sources fail, propagate that uncertainty rather than hiding it or aborting. Annotating coverage keeps usable findings while making the gaps visible to readers and downstream agents.",
    source: "mock1-q054"
  },
  {
    id: "sc-research-051",
    scenario: "research",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "The document analysis subagent frequently hits failures when processing PDF files: some have corrupted sections that cause parsing exceptions, others are password-protected, and the parsing library occasionally times out on large files. Currently, any exception immediately terminates the subagent and returns an error to the coordinator, which must decide whether to retry, skip the document or fail the task. This causes excessive coordinator involvement in routine error handling. What is the most effective architectural improvement?",
    options: [
      "Have the coordinator validate all documents before dispatching them, rejecting any that are likely to cause parsing failures.",
      "Configure the subagent to always return partial results with a success status, embedding error details in its metadata.",
      "Create a dedicated error-handling agent that monitors all failures via a shared queue and dispatches retries directly.",
      "Have the subagent recover locally from transient failures and propagate only unresolvable errors, with attempts and partial results."
    ],
    answer: 3,
    optionNotes: [
      "Corruption and timeouts can only be detected by attempting the parse, so pre-validation duplicates the work or rejects processable files, and keeps the coordinator involved.",
      "Reporting everything as success erases the difference between a parsed document and a locked one, and failures resurface as silent gaps.",
      "A separate agent lacks the local state that makes recovery cheap and adds another coordination hop.",
      "Handling transient errors where they occur removes routine noise from the coordinator, and the errors that do escalate arrive with what was tried and any partial results."
    ],
    explanation: "Handle errors at the lowest level that can resolve them. Subagents should retry transient failures themselves and escalate only what they cannot fix, with enough context for the coordinator to decide.",
    source: "mock1-q056"
  },
  {
    id: "sc-research-052",
    scenario: "research",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "During a materials research task, the web search subagent queries three source categories with different outcomes. Academic databases returned 15 relevant papers, industry reports returned \"0 results found,\" and patent databases returned \"Connection timeout.\" You are designing how these outcomes are reported back to the coordinator. What approach enables the best recovery decisions?",
    options: [
      "Distinguish access failures such as the timeout, which need retry decisions, from valid empty results such as \"0 results\".",
      "Have the subagent retry transient failures internally and report only the errors that persist after all of its retries.",
      "Aggregate the outcomes into a single success-rate metric, such as \"67% source coverage\", with detailed logs on request.",
      "Report both the timeout and the \"0 results\" outcome as failures that require intervention from the coordinator."
    ],
    answer: 0,
    optionNotes: [
      "A timeout means the source was never checked; \"0 results\" is a successful query that found nothing. Keeping them distinct lets the coordinator retry the patent database and accept the industry result as a finding.",
      "Even with internal retries, the coordinator still needs to know whether the patent database was reachable, and \"0 results\" is not a transient error to retry.",
      "A single percentage collapses two different outcomes into one number, destroying the distinction recovery depends on.",
      "Treating a valid empty result as a failure triggers pointless retries and misrepresents the evidence base."
    ],
    explanation: "Error propagation must keep access failures separate from valid empty results. The coordinator can only choose between retrying, substituting a source or accepting a finding if it knows which outcome occurred.",
    source: "mock1-q058"
  },
  {
    id: "sc-research-053",
    scenario: "research",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "The web search subagent times out partway through researching a complex topic, after it has already collected some useful sources. Today the timeout surfaces at the coordinator only as a generic failure, so the coordinator either reruns the entire search or gives up on the topic. You are redesigning how this failure information flows back to the coordinator. Which error propagation approach best enables intelligent recovery?",
    options: [
      "Propagate the timeout exception directly to a top-level handler that terminates the entire research workflow.",
      "Retry with exponential backoff inside the subagent, returning a generic \"search unavailable\" status once retries run out.",
      "Return structured error context to the coordinator, with failure type, attempted query, partial results, and alternatives.",
      "Catch the timeout inside the subagent and return an empty result set that is marked as a successful search."
    ],
    answer: 2,
    optionNotes: [
      "Terminating everything discards the partial results and every recovery option, including a retry with a narrower query.",
      "A generic status after retries discards exactly what the coordinator needs: what failed, what was attempted and what was already found.",
      "Structured context lets the coordinator choose intelligently, for example retrying a reformulated query or proceeding with the partial results and noting the gap.",
      "Marking a timeout as an empty success misreports the failure, so the coordinator may draw conclusions from a gap it does not know exists."
    ],
    explanation: "Subagents should return failures as structured context, not generic statuses or silent successes. Failure type, attempted query, partial results and possible alternatives give the coordinator what it needs to recover.",
    source: "mock1-q059"
  },
  {
    id: "sc-research-054",
    scenario: "research",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "The synthesis agent correctly receives structured errors showing that two of five source categories failed, and its notes mark the affected sections as low coverage. The report generator, however, receives only the synthesis prose, so published reports read as complete. A reader later acted on a conclusion that rested entirely on the remaining three categories. What change would best fix this?",
    options: [
      "Include a structured coverage field, listing failed sources and affected sections, in the synthesis output the report must render",
      "Have the report generator re-run the failed searches itself before writing, so that every published report is complete",
      "Add a standard disclaimer to every report noting that some sources may have been unavailable during the research",
      "Have the coordinator block publication of any report whenever any upstream source failed, until a full re-run succeeds for all categories"
    ],
    answer: 0,
    optionNotes: [
      "Coverage information is lost at the last handoff. Carrying it as structured data that the report generator is required to render keeps the uncertainty visible to readers next to the affected conclusions.",
      "This gives the report generator a search role outside its specialization, and the sources may fail again.",
      "A generic disclaimer on every report does not say which conclusions are affected, so readers cannot act on it.",
      "Blocking all reports on any failure discards valuable partial results that could be published with clear annotations."
    ],
    explanation: "Error and coverage information must propagate through every handoff, all the way to the final output. If one stage drops it, upstream care is wasted and readers receive overconfident reports."
  },
  {
    id: "sc-research-055",
    scenario: "research",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "After a pilot, the system assigns high confidence to most report claims, and the team wants to auto-publish those claims without review. Later customer audits find citation mismatches concentrated in regulatory topics and in newly added source types, even though overall quality dashboards remain strong. The team still wants to reduce reviewer workload over time. What review strategy should you implement before further reducing reviewer coverage?",
    options: [
      "Review only claims with low confidence scores, since high-confidence findings should be excluded from routine review queues.",
      "Auto-publish all high-confidence reports immediately, then investigate only the defects that customers go on to report.",
      "Randomly sample high-confidence claims across topic, source type, and report section, and track errors by stratum.",
      "Compute one aggregate accuracy metric from accepted reports, then reduce review once the overall rate exceeds the target."
    ],
    answer: 2,
    optionNotes: [
      "This assumes confidence is well calibrated in every segment, which the audits contradict. Overconfident errors in regulatory topics would never be reviewed.",
      "Waiting for customer reports is reactive, and those reports are biased and incomplete measures of the true error rate.",
      "Stratified sampling of high-confidence output measures real error rates per segment and catches new failure patterns, such as those in new source types.",
      "An aggregate metric hides segment-specific failures, which is exactly the pattern the audits found."
    ],
    explanation: "Confidence scores are only trustworthy once they have been checked against real outcomes in each segment. Stratified random sampling reveals where high-confidence output still fails before review is reduced there.",
    source: "pt1-q039"
  },
  {
    id: "sc-research-056",
    scenario: "research",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "During testing, a report on remote work productivity cites two recent, credible studies with different productivity statistics. The synthesis agent currently chooses the higher number because it comes from the larger-sample study, and the report presents it as the single definitive result. Reviewers note that both studies are methodologically credible but measure productivity differently. What change would most improve the reliability of the final report?",
    options: [
      "Select the statistic from the study with the largest sample size and suppress the smaller study to avoid confusing readers.",
      "Preserve both statistics with source attribution, methodology notes, and a conflict annotation for the report to present.",
      "Ask the web search subagent to keep searching until it finds a third source that matches one of the reported statistics.",
      "Average the conflicting statistics into one blended estimate and cite both sources as supporting the combined value."
    ],
    answer: 1,
    optionNotes: [
      "Choosing by sample size alone ignores that the studies measure different things. It hides credible disagreement and overstates certainty.",
      "Keeping both values with attribution and method context lets readers see why the numbers differ and judge the evidence themselves.",
      "Hunting for a tie-breaker biases the system toward confirmation and does not handle the conflict already identified.",
      "An average is a number no source reported, and citing both sources for it misrepresents where the claim came from."
    ],
    explanation: "When credible sources disagree, synthesis should preserve both values with attribution and methodological context rather than forcing one answer. Selecting, averaging or tie-breaking creates false certainty.",
    source: "pt1-q011"
  },
  {
    id: "sc-research-057",
    scenario: "research",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "In pilot runs on fast-changing market topics, reviewers find that final reports make accurate individual claims but misstate whether the evidence is current, peer-reviewed, or based on a small regional sample. When asked to add citations, the report generator sometimes cites the correct document but cannot give the page, publication date or study basis. Those details were available to the subagents that first read the sources. What change would most effectively improve downstream synthesis reliability?",
    options: [
      "Increase the synthesis context by passing full raw transcripts from every source instead of compact summaries between subagents.",
      "Add a report cleanup pass that infers missing citation details from the wording and fills the gaps before the report is published.",
      "Sort all source summaries chronologically before synthesis so that the newest evidence is more visible in the synthesis prompt.",
      "Update each subagent's output contract to attach dates, source locations, and methodological notes to every extracted finding."
    ],
    answer: 3,
    optionNotes: [
      "Full transcripts add volume and attention dilution without ensuring the qualifiers are carried forward where they are needed.",
      "Inferring citation details risks fabricating provenance. Details should be preserved from the source, not reconstructed later.",
      "Ordering helps only with recency and still leaves page locations and study basis unavailable.",
      "Attaching metadata at the finding level means qualifiers travel with each claim through every handoff, so downstream agents can cite and qualify accurately."
    ],
    explanation: "Each handoff compresses information, so important qualifiers disappear unless they are part of the structured output. Per-finding dates, locations and methodology notes preserve the context synthesis needs.",
    source: "pt1-q050"
  },
  {
    id: "sc-research-058",
    scenario: "research",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "Your report generator receives synthesis notes drawn from a peer-reviewed meta-analysis, two industry surveys and several vendor benchmarks. In the final report, a vendor benchmark's narrow claim is presented with the same authority as a finding repeated across the meta-analysis. Readers cannot judge how much weight to give each conclusion. What change would best improve the reliability of the report?",
    options: [
      "Ask the report agent to add a general disclaimer that some sources may vary in their quality and methodology.",
      "Have the synthesis agent select the most authoritative-looking source for each topic and omit weaker evidence.",
      "Normalize all findings into one uniform summary style, then put the full citations in a bibliography at the end.",
      "Organize conclusions by evidentiary status, keeping each source's characterization and methodological context."
    ],
    answer: 3,
    optionNotes: [
      "A general disclaimer does not attach uncertainty to particular claims, so readers still cannot tell strong findings from weak ones.",
      "Picking the authoritative-looking source suppresses legitimate disagreement and may judge authority from superficial cues.",
      "A uniform style hides differences in evidence strength, and an end bibliography does not show what supports each claim.",
      "Separating well-established from tentative or contested findings, with source type and method shown, lets readers weigh each conclusion appropriately."
    ],
    explanation: "Provenance-aware synthesis keeps not just citations but the context needed to interpret them. Reports should distinguish conclusions by strength of evidence instead of flattening all sources into one voice.",
    source: "pt3-q038"
  },
  {
    id: "sc-research-059",
    scenario: "research",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "Final reports state findings clearly but cite almost nothing. Tracing a run, you find that each subagent summarizes its sources in prose and every summarization step drops the link between a claim and the source it came from. By the time synthesis runs, no agent can tell which claim came from where. What is the structural fix?",
    options: [
      "Have the report generator add plausible citations at the end, drawn from the list of sources the system consulted",
      "Have each summarizer append a bibliography of every source it consulted to the end of its summary output",
      "Require subagents to output claim-source mappings that every downstream agent preserves through synthesis",
      "Reduce the number of summarization steps to one so that less source attribution is lost between the agents"
    ],
    answer: 2,
    optionNotes: [
      "Adding plausible citations invents attribution, which is worse than none in a research product.",
      "A bibliography lists what was read without binding sources to specific claims, so attribution still cannot be reconstructed.",
      "Provenance survives only if it is structural: claim-source mappings travel as data through every hop, so synthesis merges attributed claims.",
      "Fewer compression steps reduce the loss, but the remaining step still strips attribution."
    ],
    explanation: "Attribution must be preserved as structured data from the first extraction onward; it cannot be reliably reconstructed later. Claim-source mappings that every agent carries forward keep reports fully citable.",
    source: "purcell-q028"
  },
  {
    id: "sc-research-060",
    scenario: "research",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "The synthesis agent flags many \"contradictions\" in market adoption figures, for example a 2020 survey reporting 12% adoption and a 2024 report stating 41%. Reviewers find that most of these are not real conflicts, because the figures were measured years apart. The findings passed to synthesis include the claim, the value and the source title, but not when the data was collected or published. What change best addresses this?",
    options: [
      "Require each finding to carry its publication and data collection dates, so synthesis can read differences over time as trends",
      "Instruct the synthesis agent to always prefer the most recent figure and drop older figures from the report to avoid confusion",
      "Have the synthesis agent average conflicting figures for the same metric and report the result as a single blended estimate",
      "Tell synthesis to stop flagging contradictions for adoption figures, since such figures vary widely between sources anyway"
    ],
    answer: 0,
    optionNotes: [
      "Without dates, figures from different years look like disagreement. Including publication and collection dates lets synthesis distinguish change over time from genuine conflict.",
      "Always taking the newest figure discards the trend information older data provides and can still hide real conflicts between sources from the same year.",
      "Averaging figures from different years produces a meaningless number that no source reported.",
      "Suppressing contradiction flags would also hide the real conflicts that do exist between contemporaneous sources."
    ],
    explanation: "Structured findings should include publication and data collection dates so temporal differences are not misread as contradictions. Provenance metadata is what allows synthesis to tell real disagreement from change over time."
  }
);
