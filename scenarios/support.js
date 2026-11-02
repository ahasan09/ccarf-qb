/* Customer Support Resolution Agent — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    id: "sc-support-001",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "You are writing the agentic loop that drives the support agent through the Agent SDK's underlying Messages API calls. In early tests the loop sometimes stops while a refund lookup is still pending, and other times keeps calling Claude after the customer has already received a complete answer. After each API response, your code must decide whether to execute the requested tools and call Claude again, or stop and present the final reply. What should determine this decision?",
    options: [
      "Parse Claude's response text for phrases like \"I've completed\" or \"Is there anything else?\"—these natural language signals indicate the task is finished.",
      "Set a maximum iteration count (e.g., 10 calls) and stop when reached, regardless of whether Claude indicates more work is needed.",
      "Check whether the response includes any assistant text content—if Claude generated explanatory text, the loop should end.",
      "Check the stop_reason field in Claude's response—continue when it equals \"tool_use\" and stop when it equals \"end_turn\"."
    ],
    answer: 3,
    optionNotes: [
      "String-matching phrases like \"I've completed\" is brittle and unnecessary: the API already exposes a structured stop_reason. Claude's wording varies turn to turn, and it may narrate a closing pleasantry in the same response that carries a tool_use block, so the loop would stop before the tool ran.",
      "An iteration cap is a runaway-cost backstop, not the loop-control signal. Stopping at 10 calls \"regardless of whether Claude indicates more work is needed\" ignores a stop_reason of tool_use, cutting off the turn mid-tool-call and handing the customer a response whose pending tool results were never returned.",
      "Assistant text and tool_use blocks coexist in one response. Claude routinely explains what it is about to do (\"let me look up that order\") in the same message that requests the tool, so ending the loop whenever explanatory text appears would abort before any tool executed.",
      "The stop_reason field is Claude's explicit, structured signal for loop control: \"tool_use\" indicates Claude wants to execute a tool and receive the results back, while \"end_turn\" indicates Claude has completed its response and the loop should terminate."
    ],
    explanation: "The stop_reason field is the structured signal for loop control: tool_use means Claude is waiting for tool results, and end_turn means the turn is complete. Text content, closing phrases and iteration counts are not reliable completion signals, although a cap can still serve as a runaway backstop.",
    source: "mock1-q005"
  },
  {
    id: "sc-support-002",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Production metrics show the support agent averages more than four API round-trips per resolution. Trace analysis reveals Claude frequently requests get_customer in one turn and lookup_order in the next, even when the opening message already contains both the email address and the order number. Each extra round-trip adds latency and re-sends the full conversation. What is the most effective way to reduce these round-trips?",
    options: [
      "Prompt Claude to request independent lookups in the same turn, and return all of the tool results together before the next API call.",
      "Create composite tools like get_customer_with_orders that bundle common lookup combinations into single calls.",
      "Implement speculative execution that automatically calls likely-needed tools alongside any requested tool, returning all results regardless of what was requested.",
      "Increase max_tokens to give Claude more space to plan ahead and naturally batch its tool requests."
    ],
    answer: 0,
    optionNotes: [
      "Prompting Claude to batch related tool requests in a single turn, and returning all results together before the next API call, leverages Claude's native ability to request multiple tools simultaneously. This is the most effective approach because it directly addresses the sequential calling pattern with minimal architectural changes.",
      "Creating composite tools reduces flexibility and increases maintenance burden by requiring new bundled tools for every common combination, without addressing the root cause—which is that Claude already supports requesting multiple tools per turn and simply needs to be prompted to do so.",
      "Speculative execution fires tools Claude never asked for, so most resolutions pay for unused get_customer or lookup_order payloads in latency, backend load and context tokens. It also hides an unrequested-side-effect risk, and it is far heavier architecture than prompting for the multi-tool turns Claude already supports natively.",
      "max_tokens only caps how long a single response may be; it does not change whether Claude emits one tool_use block or several in a turn. The agent is not truncating mid-plan, it is choosing sequential calls, so raising the ceiling leaves the 4+ round-trip pattern untouched."
    ],
    explanation: "Claude can emit several tool_use blocks in one response when the calls are independent, and the application returns all of their results together in the next user message. Encouraging that behaviour removes the sequential round-trips without new tools or speculative backend calls.",
    source: "mock1-q021"
  },
  {
    id: "sc-support-003",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "During integration testing, a billing-dispute case starts well: Claude requests get_customer, your service executes it successfully, and the tool returns a verified customer record. The next user-facing message, however, is generated by your application from that raw tool payload, so no order lookup, refund decision, or escalation decision occurs. What change best fixes the control-flow design?",
    options: [
      "Limit each request to three tool iterations, then summarize collected results and ask the customer to confirm.",
      "Keep calling Claude while assistant text includes question marks, uncertainty phrases, or unresolved customer-facing language.",
      "Template a final customer response from the first completed tool result, using returned backend fields directly.",
      "Run an agentic loop that inspects stop_reason, executes requested tools, appends tool results, and repeats until end_turn."
    ],
    answer: 3,
    optionNotes: [
      "An arbitrary iteration cap can be a safety backstop, but it should not be the primary completion condition. Some cases may finish after one tool call, while others legitimately require more steps before a correct final response.",
      "Parsing natural language text to decide whether the loop should continue is an anti-pattern. Assistant wording is not a reliable control signal, while stop_reason explicitly indicates whether tool execution is needed or the turn is complete.",
      "This bypasses Claude's reasoning after the tool result is available, which is exactly why later decisions are missing. Tool outputs are intermediate context for the next model turn, not a substitute for the agent's final decision process.",
      "This implements the core agentic loop lifecycle: request, inspect why Claude stopped, execute tools when requested, return tool results, and continue. It lets Claude reason over the verified customer record before deciding whether to look up orders, process a refund, or escalate."
    ],
    explanation: "An agentic loop sends the request, checks stop_reason, executes requested tools on tool_use, appends the tool results and calls Claude again until end_turn. Templating a reply from the first tool payload ends the loop before Claude can reason about the next action.",
    source: "pt2-q042"
  },
  {
    id: "sc-support-004",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "During a staging test, backend logs show that get_customer returns a verified customer record and lookup_order returns two eligible orders. On the next model request, the agent again asks the customer for the same identifiers and sometimes repeats the same lookup instead of deciding whether to refund or escalate. The tool executor is successfully calling the MCP tools and recording their outputs in server-side logs. What change most directly fixes this loop behavior?",
    options: [
      "Keep tool outputs in application state, then provide Claude a concise natural-language recap only after all tools finish.",
      "Run a predetermined get_customer, lookup_order, process_refund sequence and ignore intermediate model turns unless a tool fails.",
      "Continue the loop until the assistant text says the request is resolved, then suppress further tool calls.",
      "Append each tool result to the messages, keyed by the matching tool_use_id, before sending the next model request."
    ],
    answer: 3,
    optionNotes: [
      "Server-side application state is not visible to Claude unless it is included in the conversation context. Waiting until all tools finish also breaks the model-driven loop, because Claude needs each tool result before deciding which action should come next.",
      "A fixed sequence removes Claude's ability to adapt based on tool outputs, such as multiple orders, ineligible refunds, or escalation needs. The scenario shows the model lacks the results, not that every case should follow the same hard-coded path.",
      "Parsing assistant text for completion is an anti-pattern because natural-language wording is not a reliable control signal. The loop should be driven by structured response metadata and tool results, not by phrases that may vary across responses.",
      "Claude can only reason over information included in the messages sent on the next request. Returning each tool result with the matching tool_use_id lets the model connect the backend output to its requested tool call and decide the next action."
    ],
    explanation: "Claude only sees what is in the messages of the next request, so each executed tool result must be returned as a tool_result block referencing its tool_use_id. Results kept only in server logs or application state are invisible to the model, which is why it keeps asking for the same identifiers.",
    source: "pt3-q060"
  },
  {
    id: "sc-support-005",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "A customer describes a long billing history, and the agent decides to call escalate_to_human with a detailed summary. The response comes back with stop_reason set to \"max_tokens\", and the last content block is a tool_use whose input JSON is cut off. Your loop treats every stop_reason other than \"tool_use\" as finished, so the customer receives a half-sentence and no escalation is created. How should the loop handle this response?",
    options: [
      "Treat it like \"end_turn\" but strip the incomplete block, then send whatever text Claude produced to the customer as the final reply.",
      "Execute the tool with the partial input after repairing the JSON, since the important fields usually appear before the cut-off point.",
      "Handle \"max_tokens\" explicitly: discard the truncated tool call and retry the request with a higher max_tokens so the tool call completes.",
      "Append a user message saying \"continue\" and concatenate the next response onto the broken tool input before running the tool."
    ],
    answer: 2,
    optionNotes: [
      "A max_tokens stop means Claude was cut off, not that it finished. Sending the leftover text ends the case with an incomplete reply and silently drops the escalation Claude was trying to make.",
      "Guessing at a truncated tool input risks creating an escalation with missing or corrupted fields. The documented recovery for an incomplete tool_use block is to retry with more output room, not to repair the arguments.",
      "The API documentation says that when a response hits max_tokens and contains an incomplete tool_use block, you should retry with a higher max_tokens. Handling each stop_reason explicitly keeps truncation from being mistaken for completion.",
      "Stitching partial JSON across two responses is fragile, and the second response is not guaranteed to continue the same tool input. It also leaves an invalid tool_use block in the history."
    ],
    explanation: "A robust loop branches on every stop_reason, not just tool_use versus everything else. max_tokens means the output was truncated; if a tool_use block is incomplete, the request should be retried with a higher max_tokens rather than treated as a final answer."
  },
  {
    id: "sc-support-006",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "During a payment-gateway incident, process_refund throws an exception inside your tool executor. Your loop code catches it, breaks out of the loop, and shows the customer a generic \"Something went wrong\" message, even in cases where the agent could have offered store credit or escalated. You want the agent, not the loop code, to decide how to recover. What should the executor do when a tool fails?",
    options: [
      "Retry the failed tool automatically until it succeeds, and only return control to Claude once a successful result is available.",
      "Return a tool_result for that tool_use_id with is_error set to true and a descriptive error, then continue the loop as usual.",
      "Remove process_refund from the tools list for the rest of the conversation so that Claude cannot request it again.",
      "Drop the failed tool_use from the history and call Claude again without it, so the conversation looks as if it was never requested."
    ],
    answer: 1,
    optionNotes: [
      "Unbounded retries during an outage leave the customer waiting and may never succeed. The model never learns the call failed, so it cannot choose a different path such as escalation.",
      "Returning the failure as a tool_result with is_error: true keeps the conversation valid and tells Claude what went wrong. Claude can then retry, explain, offer an alternative or escalate, which is the recovery decision you want it to make.",
      "Removing the tool hides the failure rather than reporting it, and it blocks legitimate refunds once the gateway recovers. Claude still does not know why its request went unanswered.",
      "Every tool_use block must be followed by a matching tool_result in the next user message. Deleting the request rewrites history and leaves Claude unaware that the refund never happened."
    ],
    explanation: "Tool errors belong in the conversation as tool_result blocks with is_error: true, so Claude can reason about them like any other result. Breaking out of the loop or hiding the failure takes the recovery decision away from the agent."
  },
  {
    id: "sc-support-007",
    scenario: "support",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "A customer gives both an email address and an order number in their first message. Claude's response contains two tool_use blocks, one for get_customer and one for lookup_order, with stop_reason \"tool_use\". Your loop executes only the first block, sends that single result back, and the API rejects the next request with an error about missing tool results. What is the correct way to handle this response?",
    options: [
      "Execute only the first tool_use block per turn, and ask Claude in the system prompt to request a single tool at a time.",
      "Send each tool result in its own separate user message, one per API call, so that Claude can process them in order.",
      "Merge the two calls into a single combined tool result keyed to the first tool_use_id, and ignore the second identifier.",
      "Execute every tool_use block and return all of the results in one user message, each tool_result with its own tool_use_id."
    ],
    answer: 3,
    optionNotes: [
      "Restricting Claude to one tool per turn adds round-trips and does not fix the protocol error: any response that contains several tool_use blocks still needs a result for each.",
      "Every tool_use in a response must have its matching tool_result in the very next user message. Splitting them across separate requests leaves calls unanswered and breaks the expected message structure.",
      "Each tool_result must reference the tool_use_id it answers. Folding both outputs under one ID leaves the other call unanswered and makes it unclear which data came from which tool.",
      "When Claude requests several tools in one response, the application runs them all and returns every result together in the next user message, each tool_result block referencing its tool_use_id. The loop then calls Claude again."
    ],
    explanation: "Parallel tool use means one assistant message can contain several tool_use blocks. The loop must execute all of them and return all results in a single user message, each tied to its tool_use_id, before calling Claude again."
  },
  {
    id: "sc-support-008",
    scenario: "support",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "A customer writes: \"I was charged twice, my return label never arrived, and I cannot sign in to check the order.\" The coordinator currently launches billing, returns, and account subagents with the same prompt: \"Investigate this customer issue and recommend a resolution.\" Logs show each subagent calls overlapping tools for the same order, repeats the same facts, and sometimes recommends conflicting next steps. The final reply then contradicts itself about whether a refund was issued. What orchestration change would most effectively improve reliability and efficiency?",
    options: [
      "Assign each subagent a distinct issue boundary and shared case facts, then synthesize their non-overlapping findings centrally.",
      "Route every request through returns, billing, and account subagents sequentially, regardless of the customer's stated concerns.",
      "Allow subagents to message each other directly so they can divide remaining work without coordinator involvement.",
      "Send the full customer transcript to every subagent, then use majority agreement to choose the resolution."
    ],
    answer: 0,
    optionNotes: [
      "This approach gives each subagent a clear area of responsibility while preserving the coordinator as the central router and synthesizer. It reduces duplicate tool calls, prevents conflicting investigations, and lets the final response combine the results into one coherent customer resolution.",
      "A fixed full pipeline wastes work when some specialists are not needed and increases latency. It also does not solve the overlap problem because each subagent can still investigate the same issue unless the coordinator scopes their assignments.",
      "Direct subagent communication reduces observability and weakens centralized error handling and state management. In coordinator-subagent patterns, the coordinator should control delegation, information routing, and final aggregation.",
      "This repeats the current failure mode by asking every subagent to investigate the whole case. Majority agreement is an anti-pattern because overlapping agents can reinforce the same incomplete or incorrect interpretation instead of producing complementary findings."
    ],
    explanation: "Parallel subagents add value when the coordinator partitions the work: each gets a distinct concern plus the shared verified facts, and the coordinator merges the results. Identical broad prompts produce duplicate tool calls and conflicting recommendations, and majority voting over duplicated work does not add coverage.",
    source: "pt1-q006"
  },
  {
    id: "sc-support-009",
    scenario: "support",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "Production QA finds final replies often address refunds and returns but overlook shipping address corrections or unresolved account-lock evidence. Logs show subagents return partial findings successfully, but the coordinator accepts the first synthesized reply. Which change best improves completeness without escalating every multi-concern case?",
    options: [
      "Instruct each subagent to include an overall confidence score, then escalate cases whenever any score falls below 0.8.",
      "Let the synthesis subagent directly contact investigation subagents for missing details, bypassing coordinator turns to reduce handoff latency.",
      "Have the coordinator compare the draft resolution with the original request, assign targeted follow-up subagent work, then rerun synthesis.",
      "Run the complete fixed subagent pipeline twice for every complex case, keeping whichever final answer is longer."
    ],
    answer: 2,
    optionNotes: [
      "A single self-reported confidence score is not a reliable proxy for actual case completeness or customer impact. This would likely over-escalate cases that could be resolved through targeted follow-up, reducing first-contact resolution rather than improving it.",
      "Direct subagent-to-subagent communication reduces coordinator visibility and weakens centralized error handling. In coordinator-subagent patterns, the coordinator should manage information routing so the system maintains observability, controlled context flow, and consistent recovery behavior.",
      "This adds an explicit coordinator review step before finalizing the customer response. The coordinator can identify missing or weakly supported parts of the case, send only targeted follow-up work to the relevant subagents, and synthesize a more complete answer without unnecessary human escalation.",
      "Repeating the entire pipeline wastes work and does not focus on the specific unresolved parts of the case. Choosing the longer answer is an anti-pattern because length does not indicate correctness, coverage, or policy compliance."
    ],
    explanation: "The coordinator should check the synthesized draft against every concern in the original request and send targeted follow-up work only for the gaps. This raises completeness while keeping multi-concern cases automated and keeping all routing visible to the coordinator.",
    source: "pt2-q029"
  },
  {
    id: "sc-support-010",
    scenario: "support",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "You added returns, billing, and account subagents. In test cases involving a damaged item plus a disputed late fee, the billing subagent asks the returns subagent about refund eligibility, the returns subagent replies directly, and the coordinator only sees the final billing summary. Audits now show missing rationale for why fees were waived, duplicate customer messages, and inconsistent escalation decisions. What orchestration change would best address this?",
    options: [
      "Have each subagent independently escalate whenever its confidence drops, then merge all escalations into the final customer response.",
      "Route every subagent handoff and result through the coordinator, which tracks state, applies escalation rules, and delegates follow-ups.",
      "Give all subagents the full conversation history and complete tool access so they can independently resolve cross-cutting issues.",
      "Let specialized subagents call each other directly when they need context, reducing coordinator workload and shortening investigation paths."
    ],
    answer: 1,
    optionNotes: [
      "Self-reported confidence is an unreliable proxy for actual case complexity or escalation need. Independent escalation decisions also fragment the customer experience and undermine the coordinator's role in applying a consistent support policy.",
      "A coordinator-controlled hub-and-spoke pattern preserves observability, consistent error handling, and controlled information flow across specialized subagents. This directly addresses the missing rationale and inconsistent escalation decisions because the coordinator sees every intermediate result and decides the next delegation step.",
      "Broad context and complete tool access increase decision complexity and weaken role boundaries. Subagents should receive explicit relevant context and scoped tools, while the coordinator manages cross-cutting issues and routes information between specialists.",
      "Direct subagent-to-subagent communication is the pattern causing the audit and consistency problems. It may reduce apparent latency, but it bypasses the component responsible for maintaining shared state, tracking rationale, and applying escalation policy consistently."
    ],
    explanation: "In a hub-and-spoke design every handoff passes through the coordinator, so it sees intermediate results, records rationale and applies one escalation policy. Direct subagent-to-subagent calls bypass that control point, which is what produced the missing rationale and inconsistent decisions.",
    source: "pt2-q036"
  },
  {
    id: "sc-support-011",
    scenario: "support",
    domain: 1,
    subdomain: "1.2 Orchestrate multi-agent systems with coordinator-subagent patterns",
    question: "Production logs show simple requests like \"Can you resend my tracking link?\" take nearly as long as multi-issue cases because every request runs through all specialist subagents. The extra passes sometimes introduce irrelevant refund or policy details into final responses, even when no refund is requested. Complex cases still require multiple specialists and a unified customer-facing answer. What change best improves the orchestration design?",
    options: [
      "Let specialist subagents message each other directly, allowing whichever agent finishes first to assemble the final customer response.",
      "Keep the fixed specialist sequence, but lower each subagent's max_tokens so simple requests complete with less overhead.",
      "Have the coordinator assess the request's scope, delegate only to the relevant specialists, then combine their findings.",
      "Route each request to a single keyword-matched specialist, bypassing aggregation unless the customer explicitly asks about multiple issues."
    ],
    answer: 2,
    optionNotes: [
      "Direct subagent-to-subagent communication weakens observability, controlled information flow, and consistent error handling. In a coordinator-subagent pattern, the coordinator should manage routing and synthesis rather than letting specialists independently decide final ownership.",
      "Reducing token budgets does not fix the orchestration problem of invoking irrelevant subagents for every request. It may also degrade subagent output quality, especially for complex cases that genuinely require detailed investigation.",
      "The coordinator should own task decomposition, delegation, result aggregation, and decisions about which subagents are needed for each request. This reduces unnecessary work for simple cases while preserving multi-specialist handling for complex customer issues.",
      "Keyword routing is brittle for high-ambiguity support requests and can miss implied or compound issues. Bypassing aggregation also fails when a request looks simple initially but requires multiple backend checks or policy considerations."
    ],
    explanation: "The coordinator owns decomposition: it decides which specialists a request actually needs and aggregates their output into one answer. Running every request through every specialist wastes time on simple cases and drags irrelevant details into replies.",
    source: "pt2-q056"
  },
  {
    id: "sc-support-012",
    scenario: "support",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "During evaluation, the coordinator first verifies the customer and retrieves two recent orders, then delegates a billing-dispute investigation. The delegated investigator often asks for the order status again or analyzes the wrong order when the customer mentioned several purchases. You want the coordinator to preserve accuracy without giving the investigator all support tools. What should you change?",
    options: [
      "Update coordinator instructions to tell subagents they should remember all facts discovered earlier in the case.",
      "Have the investigator rerun get_customer and lookup_order for every dispute before assessing refund eligibility or billing adjustments.",
      "Rely on the parent conversation history, because investigators spawned with the Agent tool can inspect earlier tool results.",
      "Include verified customer identity, relevant order records, prior findings, and exact investigation goal in each subagent prompt."
    ],
    answer: 3,
    optionNotes: [
      "Prompting subagents to remember facts they were never given cannot make missing context available. This is an anti-pattern because it relies on nonexistent shared memory rather than passing the needed state explicitly at invocation time.",
      "Giving the subagent backend lookup tools can duplicate work, increase latency, and broaden tool access beyond its investigative role. It also does not solve the core handoff problem when prior coordinator findings, customer statements, and selected order context must be preserved.",
      "This assumes context inheritance that subagents do not have. If the investigator is invoked without the relevant customer and order facts in its prompt, it may ask redundant questions, analyze the wrong entity, or produce incomplete results.",
      "Subagents do not automatically receive the coordinator's conversation history or prior tool results. Providing the verified identity, relevant order data, prior findings, and task goal directly in each invocation gives the investigator the context needed to reason accurately without expanding its tool access."
    ],
    explanation: "A subagent starts with a fresh context: the only thing passed from the parent is the prompt given to the Agent tool (formerly named Task). The coordinator must therefore put the verified identity, the relevant orders, prior findings and the precise goal into that prompt.",
    source: "pt1-q001"
  },
  {
    id: "sc-support-013",
    scenario: "support",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "During testing, the coordinator sends refund-investigation subagents long prompts that prescribe exact tool sequences and conditional branches. These subagents work on standard returns, but they fail or ask for unnecessary escalation when a customer describes unusual evidence, missing order numbers, or mixed billing and delivery concerns. What change would most improve subagent performance while preserving coordinator control?",
    options: [
      "Rewrite delegated prompts to state the support objective, known context, quality criteria, constraints, and required structured return format.",
      "Expand delegated prompts with more detailed step-by-step branches covering missing order numbers, mixed issues, and unusual evidence types.",
      "Require subagents to follow a fixed tool order and escalate whenever any expected intermediate field is unavailable.",
      "Have the coordinator parse each subagent's natural-language response for completion phrases before deciding whether to continue."
    ],
    answer: 0,
    optionNotes: [
      "Subagents perform better when they understand the goal, relevant context, constraints, and success criteria rather than following brittle procedural scripts. This preserves coordinator control over delegation and output shape while allowing the subagent to adapt its tool use to unusual customer details.",
      "Adding more procedural branches makes the prompt more brittle and harder for the model to follow across novel cases. It may improve a few known paths, but it does not address the underlying need for adaptive investigation within the subagent's assigned scope.",
      "A fixed tool order is an anti-pattern for ambiguous support cases because missing fields may have recoverable alternatives. Escalating whenever an expected field is unavailable reduces first-contact resolution and prevents the subagent from using available context intelligently.",
      "Parsing natural-language completion phrases is an unreliable control-flow mechanism and can break when wording changes. The coordinator should rely on structured outputs and explicit orchestration state rather than fragile text matching."
    ],
    explanation: "Delegation works best when the subagent receives the goal, the known context, constraints, quality criteria and the expected output shape, rather than a rigid script. That keeps the coordinator in control of scope and format while letting the subagent adapt to unusual evidence.",
    source: "pt2-q016"
  },
  {
    id: "sc-support-014",
    scenario: "support",
    domain: 1,
    subdomain: "1.3 Configure subagent invocation, context passing, and spawning",
    question: "You added AgentDefinition entries for billing-investigator and returns-investigator specialists, but production traces show the coordinator never starts them. The coordinator is configured with allowedTools containing only get_customer, lookup_order, process_refund, and escalate_to_human. The specialists' own definitions list the narrow sets of MCP tools they need. What change best enables the intended delegation without unnecessarily broadening each specialist's permissions?",
    options: [
      "Instruct the coordinator to mention specialist names in prompts and treat their natural-language replies as delegated investigations.",
      "Grant every specialist all backend MCP tools so they can self-select capabilities without coordinator-mediated spawning.",
      "Allow the Agent tool (formerly Task) for the coordinator and delegate through it, keeping backend MCP tools scoped per agent.",
      "Run separate support-agent sessions for each specialty and paste their final summaries into the coordinator after completion."
    ],
    answer: 2,
    optionNotes: [
      "Naming specialists in prompts does not create or invoke subagents through the Agent SDK. Treating natural-language text as a handoff is an anti-pattern because it bypasses the actual orchestration mechanism and produces unreliable delegation.",
      "Giving every specialist all backend tools increases tool-selection complexity and violates role-based scoping. It also does not address the coordinator's inability to start subagents in the first place.",
      "Subagents defined in agents are invoked through the Agent tool, so the coordinator must be allowed to use it (the SDK docs include \"Agent\" in allowedTools; older versions named it Task). Each AgentDefinition keeps its own tools list, so delegation is enabled without widening any specialist's access.",
      "Manual parallel sessions bypass the coordinator-subagent orchestration model and make state, error handling, and observability harder to manage. This may work as an ad hoc workaround, but it is not the correct Agent SDK configuration for production delegation."
    ],
    explanation: "In the Agent SDK, the main agent spawns programmatically defined subagents by calling the Agent tool, which was named Task before Claude Code v2.1.63. The fix is to allow that tool for the coordinator while each specialist keeps its own scoped tools list.",
    source: "pt2-q047"
  },
  {
    id: "sc-support-015",
    scenario: "support",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "Production data shows that in 12% of cases the agent skips get_customer entirely and calls lookup_order using only the customer's stated name. Several of these cases led to the wrong account being identified and refunds issued against someone else's order. The system prompt already says that verification comes first, and the agent follows it most of the time. What change would most effectively address this reliability issue?",
    options: [
      "Add few-shot examples showing the agent always calling get_customer first, even when customers volunteer order details.",
      "Enhance the system prompt to state that customer verification via get_customer is mandatory before any order operations.",
      "Implement a routing classifier that analyzes each request and enables only the subset of tools appropriate for that request type.",
      "Add a programmatic prerequisite that blocks lookup_order and process_refund until get_customer returns a verified customer ID."
    ],
    answer: 3,
    optionNotes: [
      "Few-shot examples only shift the model's priors; they cannot guarantee that get_customer runs before lookup_order. The 12% skip rate might shrink, but nothing prevents the sequence violation on the next unusual phrasing, so misidentified accounts and incorrect refunds remain possible.",
      "A system prompt declaring verification \"mandatory\" is still soft guidance the model can deprioritize when a customer volunteers order details. The question describes a reliability defect with financial consequences, which calls for a deterministic block rather than a stronger instruction.",
      "A routing classifier gates which tools are exposed per request type, but refund handling legitimately needs both get_customer and lookup_order, so the classifier cannot enforce ordering between them. It targets tool selection, while the failure here is a skipped prerequisite in a sequence, and it adds a new misclassification failure point.",
      "Adding a programmatic prerequisite that blocks downstream tools until get_customer returns a verified customer ID provides a deterministic guarantee that the required sequence is followed. This is the most effective approach because it removes the possibility of the agent skipping verification, regardless of LLM behavior."
    ],
    explanation: "When a step must always precede another and mistakes cost money, enforce the order in code. A gate that rejects downstream tool calls until a verified customer ID exists works regardless of how the model reasons, whereas prompts and examples only make compliance more likely.",
    source: "mock1-q022"
  },
  {
    id: "sc-support-016",
    scenario: "support",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "During a billing-dispute pilot, get_customer correctly verifies the caller, but lookup_order sometimes returns an order tied to a different customer ID because family members share names. The required workflow says refunds must only be issued when the verified customer ID matches the order owner; otherwise the case goes to a human. Logs show Claude usually follows this rule, but occasionally calls process_refund after a persuasive customer message. What change best improves reliability?",
    options: [
      "Add a stateful gate that blocks process_refund unless the verified customer and order owner IDs match, and escalates mismatches.",
      "Add few-shot examples where persuasive customers with mismatched accounts receive apologies and are transferred without refunds.",
      "Parse the assistant response for phrases like verified owner before allowing process_refund to run in production.",
      "Strengthen the system prompt to emphasize that ownership mismatches always require escalation before any refund is issued."
    ],
    answer: 0,
    optionNotes: [
      "This creates a deterministic control point outside the model's probabilistic reasoning. Since the required workflow depends on verified state from prior tool results, the gate directly prevents the unsafe downstream action when the prerequisite condition is not satisfied.",
      "Few-shot examples can help clarify ambiguous escalation boundaries, but they do not enforce the required workflow. For an identity and ownership rule with financial consequences, examples should support the behavior rather than serve as the primary safeguard.",
      "Parsing natural language as a control signal is brittle because the assistant may phrase the same state in many ways or omit the phrase entirely. Reliable workflow control should depend on structured tool results and application state, not generated explanatory text.",
      "A stronger prompt can improve behavior, but it still relies on probabilistic compliance. The logs already show the model usually understands the rule but occasionally violates it, so prompt wording alone is not reliable enough for financial operations."
    ],
    explanation: "An ownership rule with financial consequences must be enforced outside the model. A gate that compares IDs from earlier tool results blocks the unsafe call deterministically, while prompts, examples and text parsing remain probabilistic.",
    source: "pt3-q054"
  },
  {
    id: "sc-support-017",
    scenario: "support",
    domain: 1,
    subdomain: "1.4 Implement multi-step workflows with enforcement and handoff patterns",
    question: "In production, escalated cases often bounce back because human support agents ask customers to repeat order numbers, refund amounts, and prior troubleshooting details. The escalation review console shows only fields submitted through the escalate_to_human tool, not the original chat transcript or tool results. What change best improves escalation handoff quality?",
    options: [
      "Send only the final customer-facing response in escalation notes, keeping internal reasoning and tool details out of the handoff.",
      "Escalate cases earlier whenever sentiment appears negative, so human agents can gather missing details directly from customers.",
      "Attach a transcript link to each escalation and instruct human agents to read it before contacting the customer.",
      "Fill escalate_to_human with a structured handoff: customer ID, verified facts, root cause, amounts, actions tried and next steps."
    ],
    answer: 3,
    optionNotes: [
      "This is incorrect because the final response usually omits the diagnostic details a human agent needs to continue the case. It may be concise for the customer, but it does not preserve verified facts, tool findings, or recommended actions for the reviewer.",
      "This is incorrect because sentiment is an unreliable proxy for escalation quality or case complexity. It also creates a poor customer experience by pushing information gathering onto the human agent and customer instead of preserving context from the automated workflow.",
      "This is incorrect because the scenario states that human agents cannot access the original transcript or tool results. Depending on an unavailable transcript link fails to solve the actual handoff constraint.",
      "This is correct because the human agent reviewing the escalation does not have access to the conversation transcript or tool results. A structured handoff preserves the operational context needed to continue the case without forcing the customer to repeat information."
    ],
    explanation: "Because reviewers see only the fields passed to escalate_to_human, that handoff must carry everything needed to continue the case. A structured summary of identity, verified facts, amounts, attempted actions and a recommendation stops customers from having to repeat themselves.",
    source: "pt2-q057"
  },
  {
    id: "sc-support-018",
    scenario: "support",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Production logs reveal that the agent misinterprets data from your MCP tools: get_customer returns Unix timestamps, lookup_order returns ISO 8601 dates, and order status arrives as numeric codes (1 = pending, 2 = shipped). Some of these tools come from third-party MCP servers you cannot modify. The misreadings have led the agent to tell customers that shipped orders were still pending. What is the most maintainable approach to normalize the data formats?",
    options: [
      "Use a PostToolUse hook to intercept tool results and apply formatting transformations before agent processing",
      "Create a normalize_data tool that the agent calls after each data retrieval to transform values",
      "Add detailed format documentation to your system prompt explaining each tool's data conventions",
      "Modify tools you control to return human-readable formats; create wrapper tools for third-party tools"
    ],
    answer: 0,
    optionNotes: [
      "Using a PostToolUse hook provides a centralized, deterministic point to intercept and normalize all tool outputs—including those from third-party MCP servers—before the agent processes them. This is the most maintainable approach because it applies transformations uniformly via code rather than relying on LLM interpretation or agent behavior.",
      "Requiring the agent to call a separate normalization tool after every data retrieval doubles API calls and depends on the agent reliably remembering to invoke it each time. This approach is fragile because agents can forget or skip steps, making it unsuitable for deterministic data transformations.",
      "Documenting that get_customer returns Unix timestamps and that 2 means shipped leaves the actual conversion to the model on every call, which is soft guidance where the question needs a reliable transformation. The prompt also grows with every tool added, and misreadings like the ones already in production logs remain possible.",
      "Wrapper tools around the unmodifiable third-party MCP servers work, but they multiply the surface to maintain: every new or changed upstream tool needs its own wrapper, transformation logic is scattered across two code paths, and the original third-party tool remains callable and unnormalized. A single PostToolUse hook covers all of them from one place."
    ],
    explanation: "A PostToolUse hook runs after every tool call, so one piece of code can convert timestamps and status codes for both your own and third-party tools before Claude reasons over them. That is deterministic and central, unlike prompt documentation or a normalization tool the model must remember to call.",
    source: "mock1-q020"
  },
  {
    id: "sc-support-019",
    scenario: "support",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "After adding regional order backends, production traces show the agent sometimes misreads raw lookup_order payloads: one region returns status_code: 3, another returns state: \"RETURN_PENDING\", and a third includes nested timestamps. The agent's final responses are inconsistent, even though each backend response is technically valid. What change best improves reliability without modifying every MCP tool implementation?",
    options: [
      "Require each customer message to include the customer's region so Claude can choose the correct payload interpretation.",
      "Expand the system prompt with every regional status mapping and ask Claude to normalize payloads during response generation.",
      "Parse the assistant's final text for status words and retry lookup_order whenever inconsistent wording appears.",
      "Add a PostToolUse hook that converts lookup_order outputs into one canonical structure before Claude sees them."
    ],
    answer: 3,
    optionNotes: [
      "This shifts backend integration complexity onto the customer and still requires Claude to interpret raw schemas correctly. Region selection does not solve inconsistent field names, nested formats, or code mappings in tool results.",
      "Prompt instructions can help, but they leave normalization to probabilistic model behavior at the moment of reasoning. When backend payloads vary systematically, central transformation before model processing is more reliable and easier to maintain.",
      "Parsing natural language output for recovery is an anti-pattern because final response wording is not a reliable control signal. It detects symptoms after reasoning has already been affected by inconsistent raw data.",
      "A PostToolUse hook is designed to intercept tool results after execution and transform them before the model reasons over them. This centralizes normalization outside individual MCP tools, reducing inconsistency while preserving each backend integration."
    ],
    explanation: "When valid tool results arrive in different shapes, transform them centrally before the model reads them. A PostToolUse hook does this without touching each backend, and is more reliable than asking the model to remember every regional mapping.",
    source: "pt2-q008"
  },
  {
    id: "sc-support-020",
    scenario: "support",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "A new refunds policy allows autonomous refunds up to $150. Anything above that amount requires human approval, regardless of customer history, sentiment, or how obvious the case appears. In staging, the agent usually follows the policy but occasionally calls process_refund for $175 after reasoning that the customer clearly qualifies. What change best meets the policy requirement before launch?",
    options: [
      "Add a tool call interception hook that blocks process_refund above $150 and redirects the case to human escalation.",
      "Strengthen the system prompt to state that refunds above $150 must always be escalated before process_refund is used.",
      "Add few-shot examples where the agent declines refunds above $150 and apologizes before continuing the support conversation.",
      "Let the agent self-report confidence before each refund and escalate only when confidence falls below a fixed threshold."
    ],
    answer: 0,
    optionNotes: [
      "A tool call interception hook provides deterministic enforcement before the refund action reaches the backend system. This is the right approach when a business rule must be guaranteed rather than merely encouraged through instructions.",
      "Prompt instructions can improve behavior, but they remain probabilistic and cannot guarantee compliance. The staging failures already show that the agent can reason itself into violating the policy despite being instructed otherwise.",
      "Few-shot examples can clarify intended behavior, but they do not create a hard boundary around backend actions. They are useful for calibration, not for guaranteeing compliance with a financial approval threshold.",
      "Self-reported confidence is an unreliable proxy for policy compliance and may be highest in cases where the agent confidently violates the rule. The requirement depends on refund amount, not the model's stated certainty."
    ],
    explanation: "A hard financial limit belongs at the tool boundary. A PreToolUse-style hook that inspects the refund amount and blocks the call above the limit guarantees compliance, while prompt wording, examples and self-reported confidence only influence the model's choices.",
    source: "pt3-q017"
  },
  {
    id: "sc-support-021",
    scenario: "support",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "Production logs show that for simple requests like \"refund order #1234\", your agent succeeds in 3-4 tool calls with 91% resolution rate. However, for complex requests like \"I've been charged twice, my discount didn't apply, and I want to cancel\", the agent averages 12+ tool calls with only 54% resolution—often investigating concerns sequentially and gathering redundant customer data for each one. What's the most effective change to improve complex request handling?",
    options: [
      "Reduce the number of available tools by consolidating get_customer, lookup_order, and billing-related lookups into a single investigate_issue tool.",
      "Add few-shot examples demonstrating ideal tool call sequences for various multi-part billing scenarios to your system prompt.",
      "Add explicit verification gates between steps requiring the agent to checkpoint after resolving each concern before moving to the next.",
      "Decompose the request into distinct concerns, then investigate each in parallel using shared customer context before synthesizing a resolution."
    ],
    answer: 3,
    optionNotes: [
      "Collapsing the lookups into one coarse investigate_issue tool hides the problem: fewer tools, but the same serial investigation inside it, plus a loss of the granularity that makes simple requests work at 91%.",
      "Few-shot examples are soft guidance. They can nudge tool choice, but they do not change an architecture that re-fetches customer data once per concern.",
      "Verification gates after each concern add more sequential turns, worsening the very metric you are trying to improve.",
      "The logs name two distinct root causes: the agent investigates concerns sequentially (driving the 12+ tool calls) and re-gathers redundant customer data for each one. Decomposing the request into distinct concerns, investigating them in parallel against a shared customer context, then synthesising a single resolution is the only option that fixes both — it cuts round-trips and removes the duplicate lookups while keeping each concern fully investigated."
    ],
    explanation: "The logs show two causes: concerns are investigated one after another, and customer data is fetched again for each concern. Splitting the request into its concerns, investigating them in parallel against one shared customer context and then synthesizing fixes both causes.",
    source: "mock1-q002"
  },
  {
    id: "sc-support-022",
    scenario: "support",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "Production logs show that when customers describe several related problems in one message, the agent often gives a detailed answer for the first issue, misses later issues, and sometimes recommends a refund without reconciling other charges on the same account. The workflow is predictable: each order or charge must be assessed, then the overall account resolution must be checked before the customer receives a response. What design should you use?",
    options: [
      "Ask one agent to process the entire case in a single prompt with stricter instructions to be exhaustive.",
      "Set a maximum of three agent iterations, escalating cases that still contain unresolved issues after the cap.",
      "Route the case through every available MCP tool in a fixed sequence before allowing any customer response.",
      "Use a prompt chain that reviews each order or charge independently, then runs a final account-level consistency pass."
    ],
    answer: 3,
    optionNotes: [
      "A single broad prompt is the pattern already producing missed issues and inconsistent recommendations. Stricter wording may help slightly, but it does not solve attention dilution across multiple records and concerns.",
      "An arbitrary iteration cap is an anti-pattern because it treats symptoms rather than improving task decomposition. It may escalate solvable cases prematurely and still miss issues within cases that finish under the cap.",
      "Calling every tool creates unnecessary work and may invoke tools that are irrelevant or inappropriate for the case. The problem is not lack of tool execution, it is how the reasoning work is decomposed and reconciled.",
      "This matches a predictable multi-step workflow where each local item needs focused attention before a broader synthesis step. Separating per-item review from account-level reconciliation reduces attention dilution while still catching interactions across issues before responding."
    ],
    explanation: "When the steps are predictable, a prompt chain gives each order or charge a focused pass and then reconciles the whole account in a final step. This avoids the attention dilution of one large prompt and catches interactions between issues before the customer sees a reply.",
    source: "pt2-q007"
  },
  {
    id: "sc-support-023",
    scenario: "support",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "Production logs show that vague requests such as \"my replacement and refund are both wrong\" often require different investigation paths after the first backend lookup. Some turn out to be return-status issues, some are duplicate authorization holds, some involve account verification problems, and some combine multiple causes. A fixed workflow is producing unnecessary tool calls on simple cases and missing important branches on unusual cases. Which decomposition strategy should you use?",
    options: [
      "Begin with a brief fact-gathering pass, then let the coordinator create targeted follow-up subtasks as tool findings reveal the dispute type.",
      "Run every vague case through a fixed sequence covering billing, returns, account access, and refunds before generating the final response.",
      "Set a maximum of three investigation steps, escalating any case that still lacks a clear resolution after the cap.",
      "Ask Claude to select one likely dispute category from the opening message, then execute only that category's standard workflow."
    ],
    answer: 0,
    optionNotes: [
      "This matches an open-ended investigation where the correct next steps depend on what is discovered during the case. A lightweight initial pass establishes the facts, then the coordinator can adapt the plan and delegate only the investigations needed for the actual dispute pattern.",
      "A fixed exhaustive sequence wastes tool calls on simple cases and still may not cover unusual combinations that emerge from intermediate findings. This approach is better suited to predictable workflows with known steps, not ambiguous support investigations with branching causes.",
      "An arbitrary step cap is an anti-pattern because it treats loop length as a proxy for case complexity or correctness. Some cases need more than three targeted checks, while others should escalate earlier due to policy gaps or explicit customer preference.",
      "Choosing a single category from the initial message is brittle because customers often describe symptoms incompletely or inaccurately. It can prematurely narrow the investigation and miss mixed cases where billing, return status, and account state interact."
    ],
    explanation: "When the right path depends on what the first lookups reveal, decompose adaptively: gather facts first, then create follow-up subtasks for the dispute type actually found. A fixed sequence wastes calls on simple cases and still misses unusual combinations.",
    source: "pt3-q023"
  },
  {
    id: "sc-support-024",
    scenario: "support",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "During development, you resume yesterday's named investigation session about refund errors. In that session, Claude had read refund_policy.md, the process_refund tool schema, and escalation_rules.md, and most of its analysis is still relevant. Since then, a teammate changed the refund threshold rules and updated process_refund parameter names. You need Claude to continue designing the fix without repeating the whole investigation or relying on stale assumptions. What is the best next step?",
    options: [
      "Fork the old session into competing branches and let each branch decide whether prior tool results remain trustworthy.",
      "Resume the session normally and rely on Claude to infer changed assumptions from the prior conversation history during implementation.",
      "Start a fresh session and require complete codebase re-exploration whenever any previously analyzed file has changed.",
      "Resume the session, point out the changed policy and tool files, and ask for targeted re-analysis before deciding."
    ],
    answer: 3,
    optionNotes: [
      "Forking is useful for exploring divergent approaches from a shared baseline, not for refreshing stale facts after file changes. The branches would still inherit the same outdated assumptions unless the changed files are explicitly reintroduced or re-read.",
      "This is an anti-pattern because the prior conversation history contains stale tool results and outdated analysis. Claude cannot reliably infer external file changes unless they are provided in the resumed context or rediscovered through tool use.",
      "Starting fresh can be appropriate when prior context is broadly stale, but the situation states that most analysis remains relevant. A full re-exploration wastes time and context when only specific files need refreshed analysis.",
      "This preserves the useful context from the previous investigation while explicitly invalidating the parts most likely to be stale. Targeted re-analysis lets Claude refresh its understanding of the changed files before using prior conclusions for implementation decisions."
    ],
    explanation: "Resuming keeps the still-valid investigation, but Claude cannot know that files changed since its earlier reads. Naming the changed files and asking for targeted re-analysis refreshes exactly the stale parts without a full restart.",
    source: "pt1-q043"
  },
  {
    id: "sc-support-025",
    scenario: "support",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "After verified customer, order, and policy facts are already collected for a difficult billing dispute, two plausible resolution paths remain. In previous tests, exploring both paths in one conversation caused later analysis to inherit assumptions from earlier analysis, while starting from scratch created inconsistent fact bases and extra backend calls. What is the best way to compare the two paths?",
    options: [
      "Explore both paths in one conversation, separating them with headings and stopping after three turns each.",
      "Resume the same named session twice, ask Claude to ignore the other path, then merge both final answers.",
      "Start two fresh sessions, rerun all customer and order lookups separately, then compare their independent recommendations.",
      "Fork the session from the verified case baseline, explore each path in its own branch, then compare the branches."
    ],
    answer: 3,
    optionNotes: [
      "Headings do not isolate session context, so assumptions from one path can still affect the other. An arbitrary turn cap is an anti-pattern because it controls exploration length rather than reasoning quality or completion state.",
      "Resuming the same session does not create independent reasoning branches. Asking Claude to ignore prior context is a prompt-based workaround and does not reliably prevent assumptions from one path influencing the other.",
      "Fresh sessions reduce cross-contamination, but they discard the already validated baseline and duplicate backend work. They also risk producing different fact sets if tool results, summaries, or retrieval timing differ between sessions.",
      "Forking (forkSession in TypeScript, fork_session in Python, used together with resume) gives each branch the same verified baseline while keeping the two lines of reasoning apart. It avoids both cross-contamination inside one conversation and inconsistent facts from separate restarts."
    ],
    explanation: "Forking a session copies its history into a new session, so each resolution path starts from the same verified facts without inheriting the other path's assumptions. That is the intended pattern for exploring divergent approaches from a shared baseline.",
    source: "pt2-q014"
  },
  {
    id: "sc-support-026",
    scenario: "support",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Production logs show the agent frequently calls get_customer when users ask about orders, for example \"check my order #12345\", instead of calling lookup_order. Both tools have minimal descriptions (\"Retrieves customer information\" and \"Retrieves order details\") and accept similar identifier formats. No backend errors appear, and the wrong tool simply returns unhelpful data. What is the most effective first step to improve tool selection reliability?",
    options: [
      "Expand each tool's description to include input formats it handles, example queries, edge cases, and boundaries explaining when to use it versus similar tools.",
      "Add few-shot examples to the system prompt demonstrating correct tool selection patterns, with 5-8 examples showing order-related queries routing to lookup_order.",
      "Consolidate both tools into a single lookup_entity tool that accepts any identifier and internally determines which backend to query.",
      "Implement a routing layer that parses user input before each turn and pre-selects the appropriate tool based on detected keywords and identifier patterns."
    ],
    answer: 0,
    optionNotes: [
      "Expanding tool descriptions to include input formats, example queries, edge cases, and boundaries directly addresses the root cause—minimal descriptions that leave the LLM unable to distinguish between similar tools. This is a low-effort, high-leverage first step that improves the primary mechanism LLMs use for tool selection.",
      "Few-shot routing examples in the system prompt leave the primary selection signal broken: \"Retrieves customer information\" and \"Retrieves order details\" stay indistinguishable, so the model must generalize from 5-8 memorized query shapes. That cost is paid on every request and does not transfer to phrasings outside the examples.",
      "Collapsing into a single lookup_entity hides the ambiguity in backend identifier sniffing rather than resolving it, and the question says both tools already accept similar identifier formats, so the same guess just moves server-side. It is also a schema-breaking rewrite, not a first step, and sacrifices per-tool granularity.",
      "A keyword and identifier-pattern router cannot disambiguate inputs the question describes as similar identifier formats, so \"check my order #12345\" style cases become brittle regex maintenance. It also pre-empts Claude's own tool reasoning with a hand-built layer while get_customer and lookup_order remain undescribed."
    ],
    explanation: "Tool descriptions are the main input Claude uses to choose between tools. When two descriptions are one-liners and the inputs overlap, adding accepted inputs, example requests, edge cases and explicit when-to-use-which boundaries is the cheapest and most direct fix.",
    source: "mock1-q024"
  },
  {
    id: "sc-support-027",
    scenario: "support",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Production logs show inconsistent tool selection for billing-related messages. Routine refund requests are sometimes escalated, while requests requiring policy review are sometimes sent directly to process_refund. There are no backend errors, and the tool registry shows broad descriptions with little detail about side effects, eligible inputs, or boundaries between refund handling and human escalation. What is the best first change to improve reliability?",
    options: [
      "Merge process_refund and escalate_to_human into one handle_billing_case tool that internally decides the correct backend action.",
      "Raise temperature slightly so the agent explores alternative tool choices instead of repeatedly choosing the same billing action.",
      "Rewrite the tool descriptions to state purpose, required inputs, side effects, examples, and the boundary between refund and escalation.",
      "Add a keyword router that sends messages containing refund to process_refund and messages containing supervisor to escalate_to_human."
    ],
    answer: 2,
    optionNotes: [
      "Consolidating tools can sometimes reduce ambiguity, but it also hides important action boundaries and side effects from the model. For financial and escalation workflows, preserving distinct tools with clear descriptions is safer than burying decisions inside a generic tool.",
      "Temperature changes randomness, not the model's understanding of tool boundaries. Increasing variability can make production behavior less predictable and does not address the missing selection guidance in the tool interface.",
      "Tool descriptions are the primary signal Claude uses when deciding which tool fits a user request. Adding clear boundaries, side effects, and examples directly addresses the observed misselection without adding brittle external logic.",
      "Keyword routing is a brittle anti-pattern for high-ambiguity support requests because user language often does not map cleanly to tool intent. It can also override Claude's ability to reason from the full context, such as policy exceptions or customer preferences."
    ],
    explanation: "With no backend errors and vague descriptions, the misselection comes from the tool interface itself. Descriptions that state side effects, inputs and the refund-versus-escalation boundary give Claude the information it needs, without brittle routing or hiding the actions in a merged tool.",
    source: "pt2-q038"
  },
  {
    id: "sc-support-028",
    scenario: "support",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "You add an MCP server with policy_search and case_history_search tools that use backend ranking, policy metadata, and customer-safe summaries. In evaluation runs, Claude frequently searches raw policy markdown files instead and sometimes quotes outdated refund rules. The MCP tools are connected and return better results when explicitly called, but they are rarely chosen spontaneously. What is the most effective first change?",
    options: [
      "Add a system prompt rule that says MCP tools are always preferred whenever a customer request mentions returns or billing.",
      "Merge the MCP policy tools into one broad support_lookup tool that searches customers, orders, refunds, and policy files together.",
      "Rewrite the MCP tool descriptions to cover capabilities, accepted identifiers, returned fields, and when to prefer them over generic search.",
      "Disable generic file-search tools for all sessions so the agent cannot inspect policy documents without calling the MCP server."
    ],
    answer: 2,
    optionNotes: [
      "A broad prompt rule is keyword-sensitive and can create inappropriate tool use when returns or billing are mentioned in unrelated contexts. It also does not explain the MCP tools' capabilities or outputs, so selection remains brittle.",
      "A broad consolidated tool increases ambiguity and mixes distinct data domains with different safety and workflow requirements. This can worsen tool selection reliability and encourage unnecessary overfetching rather than improving adoption of the right MCP tool.",
      "Tool descriptions are the primary signal Claude uses to decide which tools to call. Describing capabilities, inputs, outputs, and boundaries helps the agent understand why the MCP tools are more appropriate than raw file search for policy and case retrieval.",
      "This is a blunt restriction that can break legitimate file inspection and debugging workflows. The problem is not that generic search exists, it is that the agent lacks enough guidance to select the more capable MCP tools reliably."
    ],
    explanation: "If a better tool exists but is rarely picked, its description is not telling Claude why it is better. Detailed descriptions that explain capabilities, inputs, outputs and when to prefer them over generic file search fix adoption at the source.",
    source: "pt2-q041"
  },
  {
    id: "sc-support-029",
    scenario: "support",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "A newly connected returns-policy MCP server exposes a returns_helper tool. In production traces, the tool is discovered and works when manually forced, but the agent usually chains lookup_order, asks customers redundant policy questions, or escalates standard return cases. What is the best first change to improve adoption of this MCP capability?",
    options: [
      "Force returns_helper with tool_choice at the start of every return conversation, then let Claude continue after receiving results.",
      "Rewrite the returns_helper description to give eligibility inputs, returned fields, examples, and its boundary with refund tools.",
      "Add a keyword router that invokes returns_helper whenever users mention return, exchange, refund, damaged, or late delivery.",
      "Merge returns_helper into process_refund so every refund attempt automatically computes eligibility before performing backend actions."
    ],
    answer: 1,
    optionNotes: [
      "Forced tool selection is useful when a specific tool must run at a specific step, but it is too blunt for general tool adoption. It can cause unnecessary calls, bypass better model-driven sequencing, and does not teach the agent when the tool is appropriate.",
      "Tool descriptions are the primary signal Claude uses to decide when and how to call MCP tools. Making the tool's purpose, inputs, outputs, examples, and boundaries explicit directly improves model-driven tool selection without adding brittle orchestration.",
      "Keyword routing is brittle because similar words can imply different workflows, such as refund disputes, damage replacements, or shipping complaints. It bypasses Claude's natural language judgment and can create misrouting when customer language is ambiguous.",
      "Combining policy evaluation with a backend action blurs tool boundaries and increases the risk of accidental side effects. The issue is that the agent is not selecting the available capability reliably, not that policy checks and refund processing must become one operation."
    ],
    explanation: "A tool that works when forced but is rarely chosen has a description problem. Stating its inputs, outputs, examples and how it differs from lookup_order and process_refund lets Claude select it on its own, without forced calls or keyword routing.",
    source: "pt3-q026"
  },
  {
    id: "sc-support-030",
    scenario: "support",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "A loyalty integration adds an issue_store_credit tool next to process_refund. Both descriptions currently read \"Compensates the customer for an order\" and take an order ID and an amount. Since the change, many customers who asked for their money back received store credit instead, which cannot be reversed to their card. What is the best first change?",
    options: [
      "Add a system prompt rule saying process_refund should be preferred over issue_store_credit whenever the customer mentions money.",
      "Rewrite both descriptions to state what each does, its side effects, example requests, and when to use it instead of the other.",
      "Merge both into a compensate_customer tool with a method parameter, so Claude only has to choose a single tool for compensation.",
      "Set tool_choice to force process_refund for all compensation requests and expose issue_store_credit only to human agents."
    ],
    answer: 1,
    optionNotes: [
      "A keyword rule about \"money\" is brittle: many credit requests mention money and many refund requests do not. It also leaves the identical descriptions in place, so selection outside that keyword stays a guess.",
      "Identical descriptions give Claude no way to tell the tools apart. Stating the purpose, the irreversible side effect of store credit, example phrasings and an explicit boundary between the two tools is the direct, low-cost fix.",
      "Merging moves the same ambiguity into a parameter value without explaining when each method applies. The model still has to choose between two undefined options, and the action boundary becomes less visible.",
      "Forcing one tool removes a legitimate option customers sometimes want and overrides model judgment for every request. It treats a description problem with a heavy-handed configuration change."
    ],
    explanation: "Tool descriptions are the primary signal Claude uses to choose among tools, so near-identical tools need descriptions that say how they differ. Purpose, side effects, examples and explicit use-this-not-that guidance resolve the ambiguity at its source."
  },
  {
    id: "sc-support-031",
    scenario: "support",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "Production logs show several distinct backend problems all being returned to the agent as the same text: \"Operation failed.\" Examples include an invalid order ID, a temporary billing service timeout, an expired permission token, and a refund blocked by policy. The agent wastes turns retrying non-retryable failures, asks customers to re-enter valid information after timeouts, and escalates cases it could have resolved. What change would most directly improve recovery behavior?",
    options: [
      "Keep a single generic failure message, but instruct the agent to infer retryability from surrounding conversation and customer urgency.",
      "Return structured MCP errors with categories, retryability, and user-safe details so the agent can choose recovery, clarification, or escalation.",
      "Retry every failed tool call twice before responding, then escalate if the same MCP tool still reports failure.",
      "Map failures to customer sentiment levels, escalating angry customers first and retrying only when the conversation remains neutral."
    ],
    answer: 1,
    optionNotes: [
      "This keeps the root cause intact: the tool result still does not communicate what actually failed. Asking the model to infer retryability from conversational context is unreliable because customer urgency does not indicate whether a backend error is transient, validation-related, permission-related, or policy-related.",
      "Uniform failure text hides the information the agent needs to decide what to do next. Structured error metadata lets the agent distinguish retryable outages, invalid inputs, permission problems, and business rule blocks, enabling appropriate local recovery before escalation.",
      "Blanket retries waste time on non-retryable failures such as invalid input, permission denial, or policy violations. This approach may help occasional transient failures, but it still prevents the agent from tailoring responses to the actual failure type.",
      "Sentiment is not a reliable proxy for technical recoverability or business policy status. This anti-pattern can escalate solvable cases from frustrated customers while mishandling calm customers whose requests require permission checks or policy explanations."
    ],
    explanation: "An MCP tool should return failures with isError set and enough structure for the agent to choose a recovery: a category, whether retrying can help, and a message that is safe to show. With uniform text the agent can only guess, which leads to useless retries and unnecessary escalations.",
    source: "pt1-q026"
  },
  {
    id: "sc-support-032",
    scenario: "support",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "Production logs show that during short order-service outages, customers with valid orders are sometimes told that no matching order exists. The same tool response shape is currently used when a search completes with zero matches and when the order backend cannot be reached. What change would best improve the agent's recovery behavior?",
    options: [
      "Treat all lookup_order failures as no-match outcomes, and escalate only if the customer disputes the result.",
      "Return an empty success only for completed searches, and a structured retryable error when the backend cannot be reached.",
      "Add a prompt instruction telling the agent to apologize and explain uncertainty whenever lookup_order returns empty results.",
      "Automatically retry every empty lookup_order response three times before telling customers that no matching orders were found."
    ],
    answer: 1,
    optionNotes: [
      "This silently suppresses real access failures and presents misleading information to customers. Waiting for the customer to dispute the result shifts error detection to the user and prevents the agent from recovering intelligently.",
      "This separates a valid empty result from an access failure, giving the agent the information needed to choose the right recovery path. A completed search with no matches can prompt clarification, while a backend access failure can trigger retry logic, alternate lookup, or escalation with accurate context.",
      "A prompt instruction can improve wording, but it does not fix the tool contract that hides whether the lookup actually completed. The agent still lacks structured information for deciding between clarification, retry, or escalation.",
      "This treats valid no-match results as failures, wasting time and increasing backend load without improving correctness. It also uses a fixed retry rule rather than letting the tool communicate whether the condition is actually retryable."
    ],
    explanation: "A completed search that finds nothing and a search that never ran are different outcomes and must look different to the agent. An empty success invites clarification, while a retryable error invites a retry or an honest explanation, never a false \"no order found\".",
    source: "pt2-q024"
  },
  {
    id: "sc-support-033",
    scenario: "support",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "Production logs show two failure patterns in refund handling: intermittent gateway timeouts that often succeed on the next attempt, and permanent failures such as refund window expired or missing permission. Today the MCP tool sets isError and returns the same short failure message for both, so the agent sometimes repeats impossible operations and sometimes gives up on recoverable ones. What change best improves recovery behavior?",
    options: [
      "Add errorCategory and isRetryable fields to tool failures, retry only retryable ones, and keep a user-facing explanation.",
      "Have the agent inspect failure message wording for timeout or permission keywords before deciding whether another attempt is useful.",
      "Configure the agent to retry every failed refund operation three times before showing the final error to the customer.",
      "Disable automatic retries for process_refund and escalate all failed refund attempts to avoid duplicate backend operations."
    ],
    answer: 0,
    optionNotes: [
      "This gives the agent enough structured information to choose the correct recovery path. Transient failures can be retried, while permanent business or permission failures can be explained or escalated without wasting attempts.",
      "Parsing natural language error text is brittle because wording can change and similar phrases may have different meanings. Recovery decisions should be driven by structured metadata, not keyword matching in human-readable messages.",
      "A fixed retry count treats all failures as if they might recover, which wastes time on permanent business or permission failures. It also fails to encode why the failure happened, so the agent still cannot communicate or escalate intelligently.",
      "This avoids duplicate attempts but sacrifices recovery for intermittent backend problems that could succeed on retry. Escalating every failure lowers first-contact resolution and ignores the observed distinction between recoverable and permanent failures."
    ],
    explanation: "Setting isError alone tells the agent something failed but not what to do next. A category and a retryable flag let it retry transient gateway timeouts and explain or escalate permanent policy and permission failures.",
    source: "pt3-q055"
  },
  {
    id: "sc-support-034",
    scenario: "support",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "A customer asks for a refund on an order delivered 64 days ago, and your returns window is 30 days. process_refund correctly rejects the request, but the agent currently receives only a generic failure and keeps trying different refund amounts. You are redesigning what the tool returns in this situation. Which error response best enables the agent to handle the case correctly with the customer?",
    options: [
      "errorCategory: \"business\", isRetryable: false, plus a customer-friendly explanation of the returns policy",
      "errorCategory: \"validation\", prompting the agent to correct the request parameters and try the refund again",
      "A success result with an empty refund object, letting the agent infer that no refund was issued",
      "The policy engine's full rejection payload, including internal rule identifiers, so nothing is lost"
    ],
    answer: 0,
    optionNotes: [
      "A returns-window violation is a business rule outcome: retrying can never succeed, so isRetryable: false stops wasted attempts, and the plain-language explanation gives the agent something accurate to tell the customer.",
      "Labelling a policy refusal as a validation error tells the agent the input was malformed and can be fixed, which invites it to keep reformulating a request that policy will always reject.",
      "Returning success for a failed operation is silent error suppression. The agent may tell the customer the refund went through, turning a clear rejection into misinformation.",
      "Internal rule identifiers are meaningless to the agent and should not reach the customer. Without a category or retry flag, the agent still has to guess what to do next."
    ],
    explanation: "Policy violations are business errors: they are not retryable and need an explanation the agent can relay. Structured metadata such as a category and a retryable flag lets the agent stop retrying and explain the policy, or offer alternatives, instead of guessing.",
    source: "purcell-q007"
  },
  {
    id: "sc-support-035",
    scenario: "support",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "You split the support system into a coordinator plus specialized subagents for intake, order investigation, and refund-policy evaluation. Production traces show the refund-policy subagent needs order delivery dates and return-window status in most refund cases, but only the coordinator can currently call lookup_order, adding multiple round trips. The lookup_order tool is read-only, while process_refund changes backend state and escalate_to_human creates a handoff. What change best balances latency reduction with reliable control of sensitive actions?",
    options: [
      "Give every support subagent access to all four MCP tools so each can resolve cases without coordinator round trips.",
      "Grant the refund-policy subagent scoped access to lookup_order, while keeping process_refund and escalation routed through the coordinator.",
      "Create a keyword router that sends any message mentioning refunds directly to process_refund before subagent review.",
      "Keep all tools coordinator-only and have subagents return natural-language requests whenever they need order or customer details."
    ],
    answer: 1,
    optionNotes: [
      "This over-provisions agents with tools outside their specialization, increasing the chance of tool misuse and unreliable selection. Reducing latency does not justify giving specialized subagents direct access to sensitive state-changing actions.",
      "This gives the subagent the read-only capability it frequently needs while preserving centralized control over state-changing and handoff actions. It applies least privilege rather than exposing the full support toolset to a specialized agent.",
      "This is an anti-pattern because keyword routing bypasses model reasoning, policy evaluation, and customer-specific context. It also invokes a state-changing tool before eligibility has been established, increasing the risk of incorrect refunds.",
      "This preserves strict centralization but fails to address the repeated latency caused by routine read-only lookups. It also forces unnecessary coordinator mediation for information the subagent needs frequently and safely."
    ],
    explanation: "Least privilege does not mean routing everything through the coordinator. Giving one specialist a read-only lookup it needs constantly cuts round-trips, while state-changing refunds and escalations stay under the coordinator's control.",
    source: "pt2-q021"
  },
  {
    id: "sc-support-036",
    scenario: "support",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "During intake testing, when a customer provides enough identifying details but asks, \"Can you just check this?\", the agent sometimes replies with generic guidance instead of using any backend tool. You do not know in advance whether get_customer, lookup_order, or escalate_to_human is appropriate, but every production response must be grounded in at least one backend action. What configuration best addresses this behavior?",
    options: [
      "Keep tool_choice on auto and strengthen system prompt instructions requiring backend lookup before every customer-facing response.",
      "Retry whenever assistant text sounds generic, using phrase matching to continue the loop until a tool appears.",
      "Set tool_choice to {\"type\": \"any\"} so Claude must call some tool but still chooses which one fits the request.",
      "Force get_customer as the required tool for all turns, then let Claude decide whether additional tools are needed."
    ],
    answer: 2,
    optionNotes: [
      "The auto setting permits Claude to return text without calling a tool, which is the observed failure mode. Stronger instructions may reduce the issue, but they do not guarantee a tool call when production behavior requires one.",
      "Parsing natural language text to control agent behavior is brittle and can fail when wording changes. Loop control should rely on structured API behavior and tool configuration, not subjective phrase matching.",
      "With tool_choice type any, Claude must use one of the provided tools but still picks which. That matches a requirement for some backend action without fixing in advance whether it is get_customer, lookup_order or escalate_to_human.",
      "Forcing one specific tool is too rigid when the appropriate backend action may be an order lookup or human escalation. It can introduce unnecessary or incorrect tool calls by removing model-driven selection among valid tools."
    ],
    explanation: "tool_choice auto lets Claude answer in plain text, a specific tool forces one predetermined call, and any requires some tool call while leaving the choice to Claude. When every reply must be grounded in a backend action but the right tool varies, any is the fit.",
    source: "pt2-q034"
  },
  {
    id: "sc-support-037",
    scenario: "support",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "During a pilot, the agent often spends its first two turns asking backend tools what refund policies, return reason codes, and escalation queues exist. These lists are read-only, change weekly, and help the agent choose the right customer-specific actions, but the extra calls increase latency and sometimes consume context before order lookup. Which MCP integration change best addresses this issue?",
    options: [
      "Expose the read-only policy, reason-code, and queue catalogs as MCP resources, while keeping customer-changing operations as tools.",
      "Combine catalog listing and action execution into each backend tool so every call returns available policies and queues.",
      "Add a mandatory first-turn tool_choice forcing list_policy_catalog before any customer lookup, then let normal tool selection resume.",
      "Instruct the agent to skip catalog discovery unless its response text mentions uncertainty about policy applicability."
    ],
    answer: 0,
    optionNotes: [
      "MCP resources are appropriate for read-only catalogs that provide context about available data or policy options. This reduces exploratory tool calls while preserving tools for model-driven actions such as looking up orders, processing refunds, or escalating cases.",
      "Adding catalog data to every tool response bloats tool outputs and causes irrelevant information to accumulate in the conversation. It also blurs tool boundaries, making action tools harder for the model to select and interpret reliably.",
      "Forcing a catalog tool call preserves the latency and context overhead that the design is trying to remove. It may make ordering more consistent, but it still treats static reference context as an action the model must repeatedly request.",
      "Parsing the assistant's natural language text to control tool behavior is an agentic loop anti-pattern. It relies on incidental wording rather than a reliable architectural separation between reference context and executable actions."
    ],
    explanation: "MCP resources expose read-only reference data, such as catalogs and policy indexes, that the application can provide as context without the model spending tool calls to discover it. Tools remain the right primitive for actions and per-customer lookups.",
    source: "pt2-q005"
  },
  {
    id: "sc-support-038",
    scenario: "support",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your team tests the support agent locally in Claude Code against a staging support-backend MCP server. One developer added the server to the project's .mcp.json with the staging API key pasted into the headers, and the file is about to be committed. Everyone on the team should get the server automatically when they clone the repository, but no credentials may live in version control. What is the best configuration?",
    options: [
      "Keep the server in the project .mcp.json and reference the key as ${SUPPORT_API_KEY}, which each developer sets in their environment.",
      "Move the server definition into each developer's user-scoped configuration, so the key never appears in any project file.",
      "Leave the key in .mcp.json but add the file to .gitignore, and share a copy of it with new team members over chat.",
      "Remove the key from .mcp.json and write it in the project CLAUDE.md so Claude can supply it when connecting to the server."
    ],
    answer: 0,
    optionNotes: [
      "Project-scoped servers in .mcp.json are shared through version control, and Claude Code expands environment variables such as ${SUPPORT_API_KEY} in that file. The server definition is shared while each developer's secret stays in their own environment.",
      "User scope keeps the key out of the repository, but every developer must configure the server by hand, so the team no longer gets it automatically on clone.",
      "Ignoring the file stops it from being shared at all, which defeats the point of a project-scoped server, and passing secrets around in chat spreads them further.",
      "CLAUDE.md is committed instruction text loaded into context. Putting the key there still commits it and also exposes it to the model; it is not how MCP authentication is configured."
    ],
    explanation: "Use project scope (.mcp.json) for servers the whole team needs, and keep credentials out of it with environment variable expansion. Each developer supplies the secret locally, so the shared file contains no secrets."
  },
  {
    id: "sc-support-039",
    scenario: "support",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "During a production incident review, logs show the message \"Refund approval token missing\" appears only after escalation handoffs. You need Claude Code to inspect the support agent's repository and identify every code path that emits or handles this message before changing anything. The repository is large, and the string could be defined in constants, adapters, or middleware under unrelated filenames. Which approach should you take first?",
    options: [
      "Use Glob to find refund-related filenames, then review only those files and skip content searches across unrelated paths.",
      "Use Grep to search repository contents for the exact error string and refund handler names, then Read matching files.",
      "Use Edit to open likely refund modules one by one, searching manually before making targeted code changes.",
      "Read every support-agent source file into context, then ask Claude to identify where the error originates."
    ],
    answer: 1,
    optionNotes: [
      "Glob is useful for matching file paths or filename patterns, not for finding text inside files. Restricting review to refund-named files can miss handlers, shared middleware, escalation adapters, or constants stored under unrelated filenames.",
      "Grep is the appropriate built-in tool for searching file contents, including exact error messages, function names, and import statements. Starting with content search narrows the investigation to relevant files before using Read to understand the surrounding code paths.",
      "Edit is intended for targeted modifications using unique text matches, not for repository-wide investigation. Manually opening likely modules is slower and less reliable than searching all file contents for the known error text.",
      "Reading every source file upfront wastes context and increases the risk of attention dilution. A targeted content search is more reliable because it locates the exact references before loading surrounding files."
    ],
    explanation: "Grep searches file contents, so it finds an exact error string wherever it is defined, regardless of filename. Glob matches paths only, Edit is for changes, and reading everything wastes context.",
    source: "pt3-q003"
  },
  {
    id: "sc-support-040",
    scenario: "support",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "Production logs reveal a consistent pattern: when customers include \"account\" in messages (e.g., \"I want to check my account for the order I placed yesterday\"), the agent calls get_customer first 78% of the time. When customers phrase similar requests without \"account\" (e.g., \"I want to check on the order I placed yesterday\"), it calls lookup_order first 93% of the time. The tool descriptions are well-written and unambiguous. What is the most likely root cause of this discrepancy?",
    options: [
      "The model requires more training data on multi-concept messages and should be fine-tuned on examples that include both account and order language",
      "The system prompt contains keyword-sensitive instructions that steer behavior on terms like \"account\", causing unintended tool choices",
      "The tool descriptions need additional negative examples specifying when NOT to use each tool to prevent this keyword-triggered confusion",
      "The model's base training creates associations between \"account\" terminology and customer-related operations that override the tool descriptions"
    ],
    answer: 1,
    optionNotes: [
      "Fine-tuning misdiagnoses a deterministic routing rule as a model capability gap. The split is systematic and keyword-gated (78% with \"account\", 93% without), not the diffuse error pattern a data shortage produces, and retraining would not remove the keyword-sensitive instruction still sitting in the system prompt.",
      "This is the most likely root cause because the systematic, keyword-triggered pattern (78% vs 93%) strongly suggests explicit routing logic in the system prompt that reacts to the word \"account\" and directs the agent toward customer-related tools. Since the tool descriptions are already well-written and unambiguous, the discrepancy points to prompt-level instructions creating unintended behavioral steering.",
      "The question explicitly states the tool descriptions are already well-written and unambiguous, so adding negative examples about when not to use get_customer or lookup_order treats a symptom. Prompt-level routing instructions that fire on \"account\" would continue to steer selection regardless of description wording.",
      "Base-model associations would produce diffuse, inconsistent tool choices, not the sharp keyword-gated 78% versus 93% split observed. It also blames an unmodifiable cause, diverting attention from the explicit system prompt instruction that is actually creating the steering."
    ],
    explanation: "A sharp split tied to one word, with good tool descriptions, points to an instruction in the system prompt that reacts to that word. Prompt instructions keyed to terms rather than intent cause this kind of unintended steering, so the prompt is the place to look first.",
    source: "mock1-q023"
  },
  {
    id: "sc-support-041",
    scenario: "support",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "Your agent handles single-concern requests with 94% accuracy (e.g., \"I need a refund for order #1234\"). However, when customers include multiple concerns in one message (e.g., \"I need a refund for order #1234 and also want to update my shipping address for order #5678\"), tool selection accuracy drops to 58%. The agent typically addresses only one concern or mixes up parameters between requests. What's the most effective approach to improve reliability for multi-concern requests?",
    options: [
      "Implement response validation that detects incomplete responses and automatically re-prompts the agent to address any missed concerns.",
      "Implement a preprocessing layer that uses a separate model call to decompose multi-concern messages into individual requests, process each independently, then combine the results.",
      "Add few-shot examples to your prompt demonstrating the correct reasoning and tool sequence for multi-concern requests.",
      "Consolidate the refund, address and order tools into one general-purpose account tool so each request needs fewer tool choices."
    ],
    answer: 2,
    optionNotes: [
      "Validation plus re-prompting catches the missed concern after the fact but leaves the decomposition failure intact, and it does nothing about the parameter mixing between order #1234 and #5678 that the question describes. Each retry adds a round trip while the underlying pattern gap persists.",
      "A separate decomposition model call adds an extra inference hop, latency and cost to solve a gap that in-prompt examples close, since the agent already resolves individual concerns at 94%. It also discards cross-concern context that may matter when both requests touch the same customer.",
      "The agent already handles each concern well at 94%; what it lacks is a pattern for splitting one message into several requests and keeping each order's parameters separate. Few-shot examples showing that reasoning and tool sequence teach exactly that, at low cost.",
      "Tool granularity is not the failure mode: single-concern selection already works at 94%, so the tools are fine. Folding refunds and address updates into broader general-purpose tools makes parameter confusion between orders #1234 and #5678 more likely, not less."
    ],
    explanation: "The agent already handles each concern well on its own, so it needs to see the pattern for combining them. A few worked examples showing how to split the message and keep parameters with the right order address the gap cheaply.",
    source: "mock1-q004"
  },
  {
    id: "sc-support-042",
    scenario: "support",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "Production logs show the agent sometimes selects get_customer when lookup_order would be more appropriate, particularly for ambiguous requests like \"I need help with my recent purchase.\" Clear requests that include an order number are almost always routed correctly. You decide to add few-shot examples to your system prompt to improve tool selection. Which approach will most effectively address this issue?",
    options: [
      "Add examples grouped by tool—all get_customer scenarios together, then all lookup_order scenarios.",
      "Add 4-6 examples targeting ambiguous scenarios, each showing reasoning for why one tool was chosen over plausible alternatives.",
      "Add explicit \"use when\" and \"do not use when\" guidelines in each tool's description covering the ambiguous cases.",
      "Add 10-15 examples of clear, unambiguous requests that demonstrate correct tool selection for each tool's typical use cases."
    ],
    answer: 1,
    optionNotes: [
      "Grouping all get_customer examples together and then all lookup_order examples shows each tool in isolation and never contrasts them, so it gives no signal for a request like \"I need help with my recent purchase\" where both tools look plausible. The confusion is comparative, and this layout removes the comparison.",
      "Targeting few-shot examples at the specific ambiguous scenarios where errors occur, with explicit reasoning about why one tool is preferred over another, directly teaches the model the comparative decision-making process it needs for edge cases. This approach is the most effective because worked examples demonstrating reasoning are better than declarative rules for nuanced tool selection.",
      "\"Use when\" and \"do not use when\" clauses are declarative rules, and for nuanced tool selection worked examples that show the reasoning outperform rules the model must apply on its own. The question also specifies improving selection through few-shot examples in the system prompt, not rewriting tool descriptions.",
      "The failures occur specifically on ambiguous requests, so 10-15 examples of clear, unambiguous requests reinforce cases the agent already handles correctly. It spends prompt tokens on the wrong population of inputs and dilutes the examples with no coverage of the boundary between get_customer and lookup_order."
    ],
    explanation: "Few-shot examples are most useful when they target the inputs that actually fail and show the reasoning behind the choice. A handful of ambiguous cases, each explaining why one tool beats the plausible alternative, teaches the comparison the model is getting wrong.",
    source: "mock1-q042"
  },
  {
    id: "sc-support-043",
    scenario: "support",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "escalate_to_human takes a JSON schema in which order_id is a required string and escalation_reason is an enum of policy_gap, customer_request, and fraud_suspected. Reviewers find that for account-lock cases with no order the agent invents plausible order IDs, and many legal or accessibility complaints are labelled policy_gap. The schema validates every time, but the data is wrong. Which schema change best fixes this?",
    options: [
      "Keep order_id required but add a regex pattern for real order IDs, and add a system prompt reminder to choose escalation reasons carefully.",
      "Make order_id nullable for cases without an order, and add an \"other\" enum value with a required free-text reason_detail field.",
      "Replace escalation_reason with a free-text field and make every field optional so that the agent is never forced to fill one in.",
      "Add more specific enum values for each complaint type seen so far and require a confidence score next to every field."
    ],
    answer: 1,
    optionNotes: [
      "A pattern only checks the format, so an invented ID in the correct format still passes. The enum still has no honest choice for complaints that fit none of the three reasons.",
      "Required fields with no valid value push the model to fabricate one. Allowing null when there is no order and adding an \"other\" value with a detail field gives the agent an honest way to fill the schema while keeping it structured.",
      "Making everything optional and free text removes the structure downstream routing relies on, and the agent may drop fields it actually has.",
      "New enum values only cover categories already seen, and the next unusual case is again forced into a wrong bucket. A confidence score does not stop the agent from inventing a required order_id."
    ],
    explanation: "Schemas should let the model represent what is really known. Nullable fields for information that may not exist and an \"other\" or \"unclear\" enum value with a detail field prevent fabricated values while keeping output machine-readable."
  },
  {
    id: "sc-support-044",
    scenario: "support",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Escalation handoffs produced by the agent are validated against a JSON schema before they reach the human queue. About 6% fail, usually because refund_amount is a string such as \"$45\" or because attempted_actions is missing. Today the code retries with the message \"Invalid output, try again\", and the same errors often repeat; nobody tracks which fields fail. What is the best way to improve output quality over time?",
    options: [
      "Raise the retry limit to five attempts with the same generic message, then send whatever the final attempt produced to the queue.",
      "Lower the temperature for escalation calls and remove the schema check so that malformed handoffs at least reach a person quickly.",
      "Ask a second model to rewrite every failed handoff into valid JSON and forward the rewritten version without logging anything.",
      "Retry with the specific validation errors (field, expected type, value received), and log failures by field to refine the prompt and schema."
    ],
    answer: 3,
    optionNotes: [
      "More retries with the same vague message give the model nothing new to correct, so the same errors repeat and are eventually forwarded anyway.",
      "Removing validation moves malformed data onto human reviewers and downstream systems, and lower temperature does not address the specific type and completeness errors.",
      "A rewrite pass may produce valid JSON with guessed values, such as an invented list of attempted actions, and without logging the recurring causes are never fixed.",
      "Specific error feedback lets the model fix the actual problem on retry. Recording which fields fail, and how, shows where the prompt, examples or schema need to change, so the failure rate falls over time."
    ],
    explanation: "Validation-retry loops work when the retry tells the model exactly what was wrong. Logging structured error data turns individual failures into evidence for improving prompts and schemas."
  },
  {
    id: "sc-support-045",
    scenario: "support",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Each night the team runs a compliance audit that asks Claude to classify the day's roughly 40,000 closed support conversations against refund policy. The job currently sends synchronous Messages API requests in a loop, takes most of the night, hits rate limits, and is the largest item on the API bill. Results only need to be ready for the 9 a.m. review, and a product manager now proposes moving the live chat agent to the same mechanism to save money too. What should you do?",
    options: [
      "Move both the nightly audit and the live chat agent to the Message Batches API, since both would get the same discount on every request.",
      "Keep both on synchronous calls, but run the audit with more parallel workers so it finishes faster and stays within the same daily budget.",
      "Submit the audit through the Message Batches API with a custom_id per conversation, and keep the live agent on the synchronous Messages API.",
      "Move the live chat agent to the Message Batches API, and run the audit synchronously during business hours when reviewers are online."
    ],
    answer: 2,
    optionNotes: [
      "Batches have no latency guarantee: they can take up to 24 hours to complete. A live agent that must answer customers in seconds and run a multi-turn tool loop cannot wait for batch results.",
      "More parallel synchronous calls hit rate limits even harder and still pay full price. It ignores the asynchronous option designed for large, non-urgent workloads.",
      "The audit is large, non-interactive and has an overnight deadline, which suits the Batches API: about half the cost, processing within 24 hours (usually much sooner), and custom_id to match each result to its conversation, since results can arrive in any order. Live chat needs synchronous responses.",
      "This reverses the fit. Customers would wait unpredictably for replies, and the audit would pay full synchronous prices while competing with live traffic during the day."
    ],
    explanation: "The Message Batches API trades latency for cost and throughput: around a 50% discount, with results within 24 hours. It fits large offline jobs such as overnight audits, but not interactive, multi-turn agents that need an immediate response."
  },
  {
    id: "sc-support-046",
    scenario: "support",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Production metrics show that when your agent resolves complex cases involving billing disputes or multi-order returns, customer satisfaction scores are 15% lower than for simple cases—even when the resolution is technically correct. Root cause analysis reveals the agent provides accurate resolutions but inconsistently explains the reasoning: sometimes omitting relevant policy details, other times missing timeline information or next steps. The specific context gaps vary by case. You want to improve resolution quality without adding human review overhead. Which approach is most effective?",
    options: [
      "Implement few-shot examples in the system prompt showing complete resolution explanations for five common complex case types, demonstrating how to include policy context, timelines, and next steps.",
      "Add a confirmation step where the agent asks \"Does this fully address your concern?\" before closing, letting customers request additional information if needed.",
      "Add a self-critique step where the agent evaluates its draft response for completeness—ensuring it addresses the customer's concern, includes relevant context, and anticipates follow-up questions.",
      "Increase the model tier from Haiku to Sonnet for complex cases, routing based on detected case complexity."
    ],
    answer: 2,
    optionNotes: [
      "Five fixed exemplars encode a static template, but the question states the missing context gaps vary by case, so a case outside those five patterns still ships with a policy detail or timeline omitted. Few-shot demonstration is soft guidance, not a per-response completeness check against the draft actually produced.",
      "Asking \"Does this fully address your concern?\" shifts detection of the omission onto the customer after an incomplete answer has already been delivered, which is the exact experience driving satisfaction 15% lower. It treats the symptom, adds a conversational round trip, and depends on customers knowing what policy or timeline detail was left out.",
      "A self-critique step (evaluator-optimizer pattern) directly addresses the root cause of inconsistent explanation completeness by having the agent evaluate its own draft against specific criteria—such as policy context, timelines, and next steps—before presenting it. This catches case-specific gaps that vary across different complex scenarios without requiring human review.",
      "The question states resolutions are already technically correct, so raw reasoning capability is not the root cause; upgrading Haiku to Sonnet for complex cases spends more per resolution without adding any mechanism that verifies policy context, timelines, and next steps are present in the draft."
    ],
    explanation: "The resolutions are correct but the explanations miss different details from case to case, so the check must run on each draft. A self-critique pass against explicit criteria (policy context, timeline, next steps) catches case-specific gaps without human review.",
    source: "mock1-q003"
  },
  {
    id: "sc-support-047",
    scenario: "support",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "Your support agent uses progressive summarization—when context reaches 70% capacity, older turns are summarized while recent ones remain verbatim. Production logs reveal a pattern: customers reference specific amounts (\"the 15% discount I mentioned\"), but the agent responds with incorrect values. Investigation shows these details were stated 20+ turns ago and got condensed into vague summaries like \"discussed promotional pricing.\" What's the most effective fix?",
    options: [
      "Store full conversation history externally and implement retrieval to search it when the agent detects reference phrases like \"as I mentioned.\"",
      "Revise the summarization prompt to explicitly preserve all numerical values, percentages, dates, and customer-stated expectations verbatim.",
      "Extract transactional facts (amounts, dates, order numbers) into a persistent \"case facts\" block kept outside the summary.",
      "Increase the summarization threshold from 70% to 85% capacity so conversations have more room before summarization triggers."
    ],
    answer: 2,
    optionNotes: [
      "External retrieval gated on detected reference phrases like \"as I mentioned\" is a soft trigger: a customer who says \"apply my discount\" without a cue phrase still gets the vague \"discussed promotional pricing\" summary. It also adds a retrieval hop and search latency while still not guaranteeing the 15% figure is in the prompt.",
      "Instructing the summarizer to keep numbers verbatim is soft prompt guidance against an inherently lossy compression step, and adherence decays as summaries are themselves re-summarized across 20+ turns. The root cause the question identifies is that precise transactional details sit inside the compressible region at all.",
      "Extracting transactional facts (amounts, dates, order numbers) into a persistent \"case facts\" block addresses the root cause: summarization is inherently lossy for precise details. By preserving critical information in a structured block outside the summarized history, these facts remain reliably available in every prompt regardless of how many turns are summarized.",
      "Moving the trigger from 70% to 85% only delays the first summarization pass. Conversations that already run 20+ turns past the stated \"15% discount\" will still condense it into \"discussed promotional pricing,\" and the change leaves less headroom before the window fills, so it treats a symptom rather than the lossiness."
    ],
    explanation: "Summarization is lossy for exact values, so numbers and identifiers should never depend on it. A case facts block that is carried verbatim into every prompt keeps amounts and dates accurate however much history gets compressed.",
    source: "mock1-q049"
  },
  {
    id: "sc-support-048",
    scenario: "support",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "After calling get_customer and lookup_order, the agent has retrieved all available system data but still faces uncertainty in several open cases. You are reviewing which of them actually justify a handoff. Your goal is to keep first-contact resolution high while escalating the cases a human genuinely needs to decide. Which situation represents the most appropriate trigger for calling escalate_to_human?",
    options: [
      "The customer wants to cancel an order that shipped yesterday, with delivery scheduled for tomorrow. The agent should escalate because the customer might change their mind once they receive the package.",
      "The customer claims they never received their order, but tracking shows it was delivered and signed for at their address three days ago. The agent should escalate because presenting contradictory evidence might damage the customer relationship.",
      "The customer's message mentions both a billing question and a product return. The agent should escalate so a human can coordinate handling both issues in a single interaction.",
      "The customer requests a price match against a competitor. Your policies allow adjustments for price drops on your own site within 14 days but are silent on competitor pricing. The agent should escalate for policy interpretation."
    ],
    answer: 3,
    optionNotes: [
      "This is a routine in-transit cancellation with a clear policy path. Escalating on speculation that the customer “might change their mind” is guessing at intent, not resolving ambiguity.",
      "Contradictory tracking evidence is a defined dispute workflow. The agent has the evidence and should present it and open the appropriate claim; escalating to avoid an uncomfortable conversation trades away first-contact resolution for nothing.",
      "Two concerns in one message is a decomposition problem, not an escalation trigger. The agent has tools for both the billing question and the return and should handle them in a single interaction.",
      "A price match against a competitor is the only option where the agent has exhausted its data and still has no defensible basis for a decision: the policy covers price drops on your own site but is silent on competitor pricing. Escalation is the right trigger when resolving the case requires interpreting or extending policy, which is a human judgment call — not something the agent should improvise."
    ],
    explanation: "Escalation is warranted when the agent has the facts but no policy basis for a decision, such as a request the policy does not address. Multi-part requests, uncomfortable evidence and speculation about customer intent are things the agent should handle itself.",
    source: "mock1-q001"
  },
  {
    id: "sc-support-049",
    scenario: "support",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "Your agent achieves 55% first-contact resolution, well below the 80% target. Logs show it escalates straightforward cases (standard damage replacements with photo evidence) while attempting to autonomously handle complex situations requiring policy exceptions. What's the most effective way to improve escalation calibration?",
    options: [
      "Deploy a separate classifier model trained on historical tickets to predict which requests need escalation before the main agent begins processing.",
      "Have the agent self-report a confidence score (1-10) before each response and automatically route requests to humans when confidence falls below a threshold.",
      "Implement sentiment analysis to detect customer frustration levels and automatically escalate when negative sentiment exceeds a threshold.",
      "Add explicit escalation criteria to your system prompt with few-shot examples demonstrating when to escalate versus resolve autonomously."
    ],
    answer: 3,
    optionNotes: [
      "A separately trained classifier is heavy infrastructure for a problem the question localizes to undefined decision boundaries, and training it on historical tickets bakes in the same miscalibrated escalation behavior those logs record. It also front-loads a routing decision before the agent has examined the evidence, such as the photo attached to a standard damage replacement.",
      "Self-reported confidence is the miscalibrated signal itself: the agent is already confident enough to autonomously attempt policy exceptions and unconfident on standard photo-evidence damage replacements, so thresholding that number routes the same cases the same wrong way. It adds a gate without ever teaching where the escalation boundary lies.",
      "Sentiment analysis measures customer emotion, not case complexity. A calm customer requesting a policy exception still gets handled autonomously, and a frustrated one with a straightforward damage replacement gets escalated, which worsens the 55% first-contact resolution rather than fixing the boundary the logs expose.",
      "Adding explicit escalation criteria with few-shot examples directly addresses the root cause—unclear decision boundaries between straightforward and complex cases. This is the most proportionate and effective first intervention, as it teaches the agent precisely when to escalate versus resolve autonomously without requiring additional infrastructure."
    ],
    explanation: "The agent's escalation boundary is unclear: it escalates easy cases and keeps hard ones. Explicit criteria with contrasting examples teach where the line is, whereas sentiment and self-reported confidence measure the wrong things.",
    source: "mock1-q006"
  },
  {
    id: "sc-support-050",
    scenario: "support",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "A customer starts a chat with: \"I don't want to go through a bot. Put me through to a person about order 8421.\" The message includes enough details that your normal automation would probably resolve the delayed-shipment issue in one or two tool calls. You are tuning the escalation policy and want to avoid both unnecessary deflection and unnecessary automation. What should the agent do next?",
    options: [
      "Call escalate_to_human with the order context and a brief summary, without first attempting a lookup or replacement.",
      "Ask the customer to explain why human help is needed, then continue autonomously if the reason seems resolvable.",
      "Acknowledge the request, run lookup_order to confirm eligibility, then offer the replacement before considering escalation.",
      "Use sentiment analysis on the message, escalating only when the customer appears highly frustrated or hostile."
    ],
    answer: 0,
    optionNotes: [
      "An explicit request for a human should be honored without requiring the customer to participate in automated troubleshooting first. A concise handoff preserves context for the human agent while respecting the customer's stated preference.",
      "Requiring justification adds friction and risks overriding a clear customer preference. The agent can include the customer's stated issue in the handoff without interrogating them or continuing autonomously.",
      "This optimizes for first-contact resolution at the expense of the customer's explicit preference. Even if the case is straightforward, attempting autonomous resolution first can feel like deflection and violates the escalation boundary.",
      "Sentiment is an unreliable proxy for whether escalation is appropriate. The customer has already made a clear request, so routing should not depend on inferred emotional intensity."
    ],
    explanation: "An explicit request for a human is a hard escalation trigger, even when the issue looks easy to automate. The agent should hand off with a concise summary rather than make the customer go through automation first.",
    source: "pt1-q038"
  },
  {
    id: "sc-support-051",
    scenario: "support",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "Production logs show misdirected refunds and privacy disclosures when users provide common names and partial addresses. In these cases, get_customer returns several plausible profiles, and the agent chooses one using recent order activity or name similarity. What change best improves reliability without unnecessarily routing routine cases to humans?",
    options: [
      "Escalate every request with duplicate customer records to a human agent before performing any lookup_order calls.",
      "Rank matching customers by recent activity and continue with the highest ranked profile when confidence exceeds a threshold.",
      "Call lookup_order for each matching customer profile, then select the account whose order details best match the message.",
      "Treat multiple matches as unresolved identity and ask for a disambiguating identifier before any order or refund action."
    ],
    answer: 3,
    optionNotes: [
      "Escalating every duplicate-match case would reduce automation unnecessarily, since many customers can provide additional identifiers in the conversation. Human escalation should be reserved for explicit requests, policy gaps, or cases where meaningful progress cannot be made.",
      "This relies on heuristic selection, which is unsafe when several customer records are plausible. A confidence threshold does not create reliable identity verification and can still lead to privacy disclosures or incorrect refunds.",
      "Looking up orders across multiple plausible profiles can expose unrelated customer information to the model and does not solve identity ambiguity. Selecting the best match from order details is still a heuristic choice rather than a reliable clarification process.",
      "Multiple plausible customer records represent an ambiguity that the agent cannot safely resolve from heuristics alone. Requesting a disambiguating identifier, such as an email address, order number, or phone suffix, prevents account mixups while still allowing the agent to resolve the case autonomously once identity is clear."
    ],
    explanation: "Several plausible customer records mean identity is unresolved, and heuristics such as recency or name similarity can pick the wrong person. Asking the customer for another identifier resolves it safely while keeping the case automated.",
    source: "pt1-q044"
  },
  {
    id: "sc-support-052",
    scenario: "support",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "Production review finds the agent routes many frustrated but straightforward damage-replacement cases to escalate_to_human. The tickets usually include phrases like \"this is ridiculous\" and photos matching your standard replacement policy, but not an explicit request for a human. Which change best improves escalation calibration while preserving customer preference handling?",
    options: [
      "Require the agent to finish all available investigation steps before honoring any human escalation preference from the customer.",
      "Have the agent request a self-rated confidence score from itself, escalating when the score falls below a threshold.",
      "Automatically escalate any message with angry language before investigating, because negative sentiment indicates the case is too complex.",
      "Acknowledge the frustration, carry out the policy-covered replacement, and escalate if the customer asks for a person."
    ],
    answer: 3,
    optionNotes: [
      "This goes too far in the opposite direction by ignoring explicit customer preferences. If a customer clearly asks for a human, the agent should honor that request rather than forcing an autonomous investigation first.",
      "Self-reported confidence is poorly calibrated for escalation decisions and can be misleading in ambiguous support cases. Explicit criteria tied to customer preference, policy coverage, and meaningful progress are more reliable than a numeric self-rating.",
      "Sentiment-based escalation is an anti-pattern because frustration does not reliably correlate with case complexity. This would reduce first-contact resolution by escalating cases the agent can handle under the standard replacement policy.",
      "Frustration alone is not an escalation criterion. When the case is covered by the standard replacement policy and the customer has not asked for a person, the agent should acknowledge the feeling and resolve it, while honoring a request for a human if one comes."
    ],
    explanation: "Escalation criteria should be policy gaps, explicit requests for a human, or an inability to make progress, not tone. Acknowledging frustration and resolving a policy-covered case raises first-contact resolution without ignoring customer preference.",
    source: "pt3-q035"
  },
  {
    id: "sc-support-053",
    scenario: "support",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "You added an order-investigation subagent that checks identity and order state before the coordinator decides whether to refund or escalate. Production traces show many escalations where the only subagent output is {\"status\":\"failed\",\"message\":\"backend unavailable\"}. Manual review finds some cases had a verified customer record, a timeout on only one order lookup, and cached order summaries that could have supported a safe response. What change would best enable the coordinator to recover more intelligently?",
    options: [
      "Retry lookup_order several times inside the subagent, then return a single backend unavailable message to the coordinator.",
      "Escalate any case after one order lookup failure, since support workflows should avoid acting on incomplete backend data.",
      "Return error details with the failure type, the lookup attempted, partial customer data, cached summaries, and fallback options.",
      "Convert lookup_order timeouts into successful empty results so the coordinator can continue without triggering unnecessary escalations."
    ],
    answer: 2,
    optionNotes: [
      "Local retries can be useful for transient failures, but collapsing the final outcome into a generic message still hides the important details. The coordinator remains unable to tell what succeeded, what failed, and what recovery paths remain available.",
      "Immediate escalation is safer than pretending a failure succeeded, but it sacrifices recoverable cases unnecessarily. A single failed lookup does not prove the entire workflow is unsafe when verified customer data, partial results, or alternative actions may exist.",
      "This gives the coordinator enough context to distinguish a total backend outage from a localized lookup failure. With failure type, attempted operation, partial results, and alternatives, the coordinator can retry selectively, use safe cached data, ask for clarification, or escalate with a useful handoff.",
      "This silently suppresses an access failure by pretending it was a valid no-results response. The coordinator may produce an incorrect resolution because it cannot distinguish no matching order from an unavailable order service."
    ],
    explanation: "A subagent should report what failed, what it attempted and what it did get, so the coordinator can choose a recovery. A bare \"failed\" status forces escalation, and converting errors to empty results hides them.",
    source: "pt2-q028"
  },
  {
    id: "sc-support-054",
    scenario: "support",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "A long-running billing dispute workflow delegates separate investigations for account status, order history, and refund eligibility. The service sometimes restarts after deploying updates. After restart, the coordinator resumes but cannot determine which subagent findings are current, re-runs completed investigations, and occasionally omits evidence needed for escalation handoffs. What design change best improves reliability?",
    options: [
      "Have each subagent export structured state to a known location; the coordinator reloads and injects it when resuming.",
      "Resume the prior coordinator session and ask Claude to reconstruct missing subagent progress from the conversation transcript.",
      "Store only the final customer response draft after each run, using it as the sole recovery checkpoint.",
      "Set a fixed limit of one retry per subagent after restarts, then continue with whichever findings return first."
    ],
    answer: 0,
    optionNotes: [
      "This creates an explicit recovery mechanism that does not depend on fragile conversational memory. Loading structured state on resume lets the coordinator determine what was completed, what remains, and what evidence must be passed into new or resumed subagent prompts.",
      "Session resumption can help when prior context is still valid, but it is not a reliable crash recovery strategy for isolated subagent work. The coordinator may not have complete subagent context, and reconstructed progress can omit details or treat stale tool results as current.",
      "A final response draft is not enough to recover investigation state because it usually lacks tool outputs, unresolved questions, source metadata, and subagent completion status. Recovery needs structured intermediate state, not only the last customer-facing message.",
      "A fixed retry cap is an anti-pattern when used as the main reliability mechanism because it does not preserve completed work or explain missing evidence. Continuing with whichever findings return first risks incomplete resolutions and weak escalation handoffs."
    ],
    explanation: "Recovery after a restart needs durable, structured state: each subagent writes what it found and whether it finished, and the coordinator reloads that on resume. Transcripts and final drafts are not reliable records of which work is done and current.",
    source: "pt3-q059"
  },
  {
    id: "sc-support-055",
    scenario: "support",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "During a multi-hour investigation of the refund workflow, the agent correctly identifies several important files, policy branches, and edge cases. Later in the same session, it starts contradicting earlier findings, references generic support-system patterns, and asks to rediscover classes it already inspected. What change would best improve reliability across the rest of the investigation?",
    options: [
      "Use /compact after every major tool call so the entire conversation remains summarized before additional investigation continues.",
      "Restart the session whenever answers become inconsistent and require the agent to scan the entire repository again.",
      "Append every raw tool result to each follow-up request so the agent can reconsider all discovered evidence each turn.",
      "Have agents maintain concise scratchpad files with key findings, file paths, and decisions, then reference them in later prompts."
    ],
    answer: 3,
    optionNotes: [
      "Compaction can reduce context usage, but frequent summarization risks losing precise facts such as file paths, policy conditions, and edge cases. It is useful as a context management tool, but it should not replace explicit persistence of critical findings.",
      "Restarting and rediscovering the same information wastes time and does not create durable state for the next long investigation. Without persisted findings, the same context degradation problem can recur after the new session grows long.",
      "Carrying every raw result forward increases context pressure and can worsen attention dilution. Verbose tool outputs often contain many irrelevant fields, making it harder for the model to focus on the few facts that matter.",
      "Persistent scratchpad files preserve important discoveries outside the model's shifting conversation context. Referencing those files during later questions helps counteract context degradation and keeps the investigation grounded in previously verified facts."
    ],
    explanation: "In long sessions, early findings fade as context fills up. Writing key findings, paths and decisions to a scratchpad file and referring back to it keeps later work grounded without rereading the whole repository.",
    source: "pt2-q033"
  },
  {
    id: "sc-support-056",
    scenario: "support",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "During a week-long investigation into regressions in billing dispute handling, the coordinator has already explored order lookup flows, refund policy files, and escalation handlers. It then launches subagents to inspect refund calculation and account-status branches. The subagents produce inconsistent findings, miss constraints discovered earlier, and repeat searches that were already completed. What change would most effectively improve reliability across the next exploration phase?",
    options: [
      "Keep the full coordinator conversation open longer and rely on subagents to recover earlier discoveries through additional tool searches.",
      "Increase the number of parallel subagents so repeated searches are diluted across more independent codebase exploration branches and files.",
      "Before launching each new investigation wave, create a structured findings brief and include it in every subagent’s initial prompt.",
      "Set a strict maximum of two tool calls per subagent to force concise exploration and reduce repeated context growth."
    ],
    answer: 2,
    optionNotes: [
      "A longer coordinator conversation does not solve context isolation for subagents, and it can worsen context degradation. Asking each subagent to rediscover prior findings wastes tool calls and increases the chance that important constraints are found inconsistently or missed entirely.",
      "More parallelism can improve latency for independent questions, but it does not preserve knowledge between exploration phases. Without shared findings injected into each prompt, additional subagents may simply duplicate work faster and amplify inconsistent conclusions.",
      "Subagents do not automatically share the coordinator’s accumulated working context, so prior discoveries must be carried forward explicitly. A structured brief gives each new exploration phase the necessary baseline, reducing repeated searches and preventing missed constraints from earlier work.",
      "Arbitrary tool-call caps are an anti-pattern when they become the primary reliability control. They may stop useful investigation before the subagent gathers enough evidence, and they do not address the missing prior context that caused repeated searches."
    ],
    explanation: "Subagents do not see the coordinator's accumulated findings, so each new wave needs them passed explicitly. A structured findings brief in every subagent prompt prevents repeated searches and missed constraints.",
    source: "pt2-q045"
  },
  {
    id: "sc-support-057",
    scenario: "support",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "The QA process reviews 2% of auto-resolved tickets chosen uniformly each week. The dashboard shows 96% overall correctness, but refunds later reversed by human supervisors are concentrated in rare marketplace-seller warranty claims and older billing disputes that barely appear in the sample. You need to redesign review without sending every automated resolution to humans. What should you do?",
    options: [
      "Ask the agent to include a single global confidence score, then audit cases closest to the threshold.",
      "Stop sampling tickets above the confidence threshold, and review only low-confidence or customer-complaint cases going forward.",
      "Use stratified random sampling of high-confidence auto-closures by issue type, order age, seller channel, and action.",
      "Increase the overall random sample from 2% to 5%, keeping selection uniform across all auto-resolved tickets."
    ],
    answer: 2,
    optionNotes: [
      "A single global confidence score can help prioritize review, but it does not reveal whether accuracy differs across case types, product channels, or resolution actions. Auditing only near-threshold cases also misses high-confidence failures in poorly calibrated segments.",
      "This is an anti-pattern because it assumes high-confidence outputs are safe without ongoing measurement. Customer complaints are a lagging signal, and high-confidence failures are exactly what the QA process needs to detect before customers or supervisors find them.",
      "Stratified random sampling ensures that rare but important segments are represented in the review set, even when overall volume is low. This makes it possible to measure hidden error rates in high-confidence cases and detect new failure patterns before they grow.",
      "A larger uniform sample may improve statistical power overall, but it still can miss rare segments when their base rate is very low. The observed failures are concentrated in specific slices, so representation by segment matters more than simply sampling more cases uniformly."
    ],
    explanation: "Aggregate accuracy can hide error-prone segments that a uniform sample barely touches. Stratified sampling guarantees each segment is reviewed, so you can measure per-segment error rates in high-confidence resolutions and adjust routing.",
    source: "pt3-q014"
  },
  {
    id: "sc-support-058",
    scenario: "support",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "The agent attaches a self-reported confidence score to each proposed resolution, and anything below 0.80 goes to a human reviewer before it is executed. An audit of 2,000 labelled cases shows the agent's 0.95-confidence warranty decisions are wrong 14% of the time, while its 0.70-confidence address changes are almost always right. Reviewers are overloaded with easy cases and still miss costly errors. How should you redesign the review routing?",
    options: [
      "Calibrate confidence against labelled outcomes per case type, set thresholds per type, and keep sampling some auto-approvals.",
      "Raise the global threshold from 0.80 to 0.95, so that far more of the agent's resolutions are checked by a human before execution.",
      "Tell the agent in its prompt to report lower confidence whenever a case looks unusual, so that more of the risky cases fall under the threshold.",
      "Remove the confidence score and send every resolution above a fixed refund amount to review, regardless of type or history."
    ],
    answer: 0,
    optionNotes: [
      "Raw self-reported confidence is only useful once it is checked against real outcomes. Calibrating per case type shows that warranty decisions need review even when the score is high and address changes do not, and continued sampling detects drift.",
      "A higher global threshold sends even more easy address changes to reviewers. The worst warranty errors, already at 0.95, could still pass without review, so the overload grows without fixing the blind spot.",
      "Asking the model to lower its own scores does not calibrate them. It cannot reliably tell which of its confident answers are wrong, which is the problem the audit revealed.",
      "Amount is one useful signal, but it ignores the error pattern the audit found: a low-value warranty decision can be wrong just as often, and harmless high-value cases still flood the queue."
    ],
    explanation: "Confidence-based routing only works if scores are calibrated against labelled data, ideally per segment. Thresholds set from observed accuracy send reviewer time where errors actually occur, and ongoing sampling keeps the calibration honest."
  },
  {
    id: "sc-support-059",
    scenario: "support",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Refunds above $150 wait in a human approval queue, where reviewers re-check every detail of every case and take about nine minutes each. Analysis shows most corrections involve a single field, such as which of two similar orders was meant, or an amount the customer stated but no tool confirmed. You want reviewers to spend their time on the parts most likely to be wrong. What should the agent provide with each case?",
    options: [
      "A complete transcript and every raw tool output, so that reviewers have all the original evidence before approving the refund.",
      "A single overall confidence score for the case, with the approval queue sorted so the lowest-scoring cases are reviewed first.",
      "A short narrative summary of the case, written in plain language so reviewers can approve the routine refunds more quickly.",
      "Per-field status for key fields (verified by tool, stated by customer, or ambiguous), with the source, highlighting ambiguous fields."
    ],
    answer: 3,
    optionNotes: [
      "Raw transcripts and payloads are useful for audits, but they make the reviewer reconstruct everything, which is the nine-minute problem itself.",
      "One case-level score can order the queue, but it does not tell the reviewer which field to check, and a confident case can still contain one wrong order ID.",
      "A narrative summary is quicker to read, but it hides which statements were verified and which were only claimed by the customer, so the risky fields are easy to miss.",
      "Marking each important field as tool-verified, customer-stated or ambiguous, with its source, points reviewers directly at the fields that cause most corrections. Verified fields can be skimmed and ambiguous ones checked carefully."
    ],
    explanation: "Human review is most effective when attention goes where uncertainty is. Field-level verification status and sources tell reviewers which parts of a case need checking, cutting review time without lowering accuracy."
  },
  {
    id: "sc-support-060",
    scenario: "support",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "During billing disputes, the agent creates condensed case notes before responding or escalating. Human reviewers report that notes sometimes say things like \"refund approved\" or \"customer was promised free return shipping,\" but they cannot tell whether each claim came from the customer, an order record, a policy document, or the agent's inference. In several escalations, customer allegations were treated as verified backend facts. What change would most effectively reduce this reliability risk?",
    options: [
      "Ask the agent to include only high-confidence claims in final responses, omitting uncertain details from summaries and escalations.",
      "Store complete raw transcripts and tool outputs only, relying on human reviewers to reconstruct sources when disputes arise.",
      "Require summaries and handoffs to map each claim to its source type, excerpt or tool field, timestamp, and verification status.",
      "Compress each case into a shorter narrative summary and instruct reviewers to ask follow-up questions when provenance seems unclear."
    ],
    answer: 2,
    optionNotes: [
      "Self-assessed confidence is not a reliable substitute for source attribution. Omitting uncertain details can hide important ambiguity from human reviewers and may remove exactly the information needed to resolve the dispute safely.",
      "Raw records are useful for auditability, but they do not solve the operational handoff problem by themselves. Reviewers still need claim-level provenance to understand which statements support each conclusion without manually reconstructing the entire case.",
      "This preserves provenance for each material claim as information moves through summarization, response generation, and escalation. It lets the agent and human reviewers distinguish verified backend facts from customer statements, policy text, and model inferences.",
      "Shorter narrative summaries make the core problem worse because they remove source boundaries and context. Asking reviewers to investigate later shifts the burden downstream instead of preserving provenance when the information is transformed."
    ],
    explanation: "Condensed notes lose where each statement came from unless provenance is kept explicitly. Claim-to-source mappings let reviewers tell verified backend facts from customer allegations and agent inferences.",
    source: "pt1-q035"
  }
);
