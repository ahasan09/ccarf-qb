// Domain 2 — multiple-response questions (select two), 7 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d2-m01",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "A support platform exposes a search_tickets tool to Claude, but in evaluation transcripts the model keeps answering ticket questions from memory instead of calling it, and when it does call the tool it passes free-text values like \"still open\" into a status parameter the backend does not accept. Which TWO changes to the tool definition best address these problems? (Select TWO.)",
    options: [
      "Add a sentence to the tool description stating the trigger condition, such as \"Call this when the user asks about ticket status, assignees, or recent ticket activity\"",
      "Rename the tool to MUST_USE_search_tickets so the model reads the urgency directly from the identifier it sees in every request",
      "Replace the free-text status parameter with an enum of the backend's valid statuses, and give every parameter its own description",
      "Embed a worked example dialogue inside the description showing a user asking about a ticket and the resulting tool call, so the model has a pattern to imitate",
      "Set tool_choice to {\"type\": \"any\"} on every request so the model is obliged to emit a tool call on each turn"
    ],
    answers: [0, 2],
    explanation: "Under-triggering is usually a description problem: tool descriptions should be prescriptive about when to call the tool, not merely what it does, and that trigger sentence is the documented lever for raising the should-call rate. The invalid parameter values are a schema problem, solved by an enum of the valid statuses plus per-property descriptions, which constrain what the model can emit rather than hoping it guesses the vocabulary. Renaming the tool to shout at the model is pressure language in the wrong place — the name is an identifier, not a steering channel. Embedding a worked dialogue is tempting because examples do influence behavior, but examples in a description cost tokens on every request and constrain the exploration space; teaching material belongs in a skill. Forcing tool_choice \"any\" makes the model use some tool every turn, which is a blunt global change that breaks ordinary conversational turns rather than fixing this tool."
  },
  {
    id: "d2-m02",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "An agent exposes two tools with overlapping purposes: get_customer, which returns a CRM contact record, and lookup_account, which returns a billing account record. The model routes to the wrong one roughly a third of the time, often calling both and reconciling the results itself. Which TWO approaches are the most appropriate fixes? (Select TWO.)",
    options: [
      "Keep both descriptions generic and move the routing logic into the system prompt, listing both tool names there and explaining which to pick for each kind of question",
      "State the boundary explicitly inside each description: what that tool covers, what it does not, and which tool to prefer for the excluded case",
      "Add \"CRITICAL: ALWAYS use lookup_account, NEVER use get_customer for billing questions\" to the get_customer description",
      "Leave both tools unchanged and set strict to true on each one, so schema validation resolves the ambiguity at call time",
      "Consolidate the two into a single tool whose well-named enum parameter carries the contact-versus-billing distinction"
    ],
    answers: [1, 4],
    explanation: "Overlapping tools are an interface design problem, and the two durable fixes are to draw the boundary where the model reads it — in each description, including the explicit \"not this, use that instead\" clause — or to remove the ambiguity entirely by collapsing the pair into one tool where an expressive enum parameter carries the distinction. Pushing routing into the system prompt is the common wrong answer: naming tools in prose duplicates the real tool list and leaves dangling references the moment a tool is enabled or disabled. The all-caps cross-reference is both pressure language and behavior smuggled into a contract — a preference for lookup_account belongs in lookup_account's own description, stated plainly. Strict mode guarantees that a tool's arguments validate against its schema; it says nothing about which tool the model picks, so it cannot resolve selection ambiguity."
  },
  {
    id: "d2-m03",
    domain: 2,
    subdomain: "2.2 Implement structured error responses for MCP tools",
    question: "An MCP server exposes a fetch_invoice tool. A call arrives for an invoice ID that the upstream billing API answers with 404 Not Found. The agent should ideally notice the mistake and retry with a corrected ID. Which TWO behaviors should the server implement for this case? (Select TWO.)",
    options: [
      "Return an ordinary successful tool result with an empty content array, letting the model infer from the absence of data that nothing was found",
      "Return a JSON-RPC protocol error with code -32603 (Internal error) so the host application surfaces the failure to the user",
      "Return a tool result marked with isError set to true, so the result is delivered to the model as a failed tool call rather than as a protocol fault",
      "Put actionable detail in the result's content — that the lookup failed, which invoice ID was rejected, and what a valid identifier looks like",
      "Let the exception propagate out of the handler uncaught, so the transport tears down and the host reconnects and retries the call"
    ],
    answers: [2, 3],
    explanation: "The Model Context Protocol draws a deliberate line between protocol errors and tool execution errors: an unknown tool name or a malformed request is a JSON-RPC error, but a tool that ran and failed should report that inside its result using isError, so the content reaches the model and the model can correct itself. The content should therefore be written for that reader — naming what failed, which input was rejected, and what a valid input looks like — because a bare \"error\" string gives the model nothing to act on. A -32603 protocol error is the most tempting distractor: it is a real JSON-RPC code, but it routes a recoverable execution failure around the model to the host, which is exactly backwards here. An empty successful result is silently ambiguous (no invoice versus no result), and letting the exception escape kills the transport, converting a one-call failure into a session-level outage."
  },
  {
    id: "d2-m04",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "An orchestrator agent carries roughly forty tools covering ticketing, deployment, and reporting. It delegates read-only investigation to a research subagent, and a separate deterministic pipeline step must always produce a structured call to a classify_ticket tool. Which TWO configuration decisions are correct? (Select TWO.)",
    options: [
      "For the classification step, set tool_choice to {\"type\": \"tool\", \"name\": \"classify_ticket\"} so that specific tool is always invoked",
      "For the classification step, set tool_choice to {\"type\": \"none\"} so the model stops deliberating about alternatives and emits the classification call directly",
      "Give every subagent the orchestrator's complete forty-tool set so no capability is ever missing, and rely on the tool descriptions to keep the model on task",
      "Set disable_parallel_tool_use on the orchestrator, which narrows the tool list each subagent inherits",
      "Give the research subagent only the read-only subset of tools its investigation actually requires"
    ],
    answers: [0, 4],
    explanation: "Forcing one specific tool is exactly what tool_choice {\"type\": \"tool\", \"name\": ...} is for, and it is the right lever for a pipeline step whose output shape is fixed. Tool distribution is the other half: a subagent should carry the narrow slice it needs, both because an oversized tool set degrades selection accuracy and because a read-only investigator with deployment tools is a needless blast radius. The {\"type\": \"none\"} option inverts the semantics — none forbids tool use entirely, so the forced call would never happen. Handing every subagent all forty tools trades a real accuracy and safety cost for a hypothetical convenience, and past a few dozen tools the right answer is tool search or deferred loading rather than always-loading everything. disable_parallel_tool_use only caps the model to one tool call per response; it has no effect on which tools a subagent is given."
  },
  {
    id: "d2-m05",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "A team wants everyone working in a shared repository to pick up the same Jira MCP server automatically when they open the project in Claude Code, while each developer authenticates with their own personal token. Which TWO statements describe the correct setup? (Select TWO.)",
    options: [
      "Hardcode the Jira token directly in the server configuration, since the file lives inside the repository and is therefore scoped to the team",
      "Add the server with project scope, which writes the configuration to a .mcp.json file at the repository root that can be committed and shared",
      "Add the server with local scope, which is the default and makes the server available across all of that user's projects",
      "Reference the credential through an environment variable expansion such as ${JIRA_TOKEN} in the configuration, so each developer supplies their own value",
      "Expect teammates' Claude Code sessions to connect to the server silently on first run, because configuration committed to the repository is treated as pre-trusted"
    ],
    answers: [1, 3],
    explanation: "Project scope is the mechanism designed for exactly this: the server definition is written to .mcp.json at the repository root, which the team commits so every checkout gets the same configuration. Because that file is shared, credentials must not be literal values in it — .mcp.json supports environment variable expansion, so ${JIRA_TOKEN} lets each developer supply a personal token without the secret entering version control, which is why hardcoding the token is wrong rather than merely untidy. The local-scope option misstates the scope model: local is indeed the default, but it is private to the current user in the current project, and it is user scope that spans all of a user's projects. The silent-connection option is the subtlest distractor: a committed .mcp.json is not pre-trusted, and Claude Code prompts each developer to approve project-scoped servers before they are used."
  },
  {
    id: "d2-m06",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "An architect connects a remote HTTP MCP server named \"linear\" to Claude Code and now needs to write permission rules for its tools and get the team authenticated. Which TWO statements about how MCP servers surface in Claude Code are accurate? (Select TWO.)",
    options: [
      "A remote server must first be wrapped in a local stdio process, because tool discovery is only defined over the stdio transport",
      "Once connected, MCP tool definitions are merged into Claude Code's built-in tool set and lose their server prefix, so rules should match the bare tool name",
      "The /mcp command lists connected servers with their status and is where OAuth authentication is completed for servers that require it",
      "MCP servers can contribute tools but not resources or prompts, so any @-style references or project slash commands have to be built locally instead",
      "Tools from the server are exposed with names of the form mcp__linear__<tool>, and that is the name permission rules and allowlists must match"
    ],
    answers: [2, 4],
    explanation: "Claude Code namespaces every MCP tool as mcp__<server>__<tool>, so permission rules, allowlists, and any disallowed-tools entries must be written against that prefixed name rather than the server's internal one. The /mcp command is the operational surface for the connection itself: it shows which servers are connected and their status, and it is where OAuth flows are completed for servers that require authentication. The stdio claim is false — remote servers are supported over HTTP (and SSE) transports directly, with no local wrapper. The merging claim is the trap for anyone who writes a rule against the bare tool name: the prefix is precisely what prevents collisions between servers and is never dropped. And MCP is not tools-only: servers can also expose resources, reachable as @server:resource, and prompts, which appear as /mcp__server__prompt slash commands."
  },
  {
    id: "d2-m07",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "In a large TypeScript monorepo, Claude must locate every file that defines a hook named useAuth and then change a single conditional line in the one file that turns out to be the real definition. Which TWO tool choices make up the most efficient and appropriate approach? (Select TWO.)",
    options: [
      "Use Grep with a pattern matching useAuth to locate every occurrence across the repository without pulling whole files into context",
      "Use Glob with a pattern such as **/*.ts to enumerate every TypeScript file, then Read each candidate in turn until the definition appears",
      "Use Bash to run grep -rn, because only the shell version reports line numbers alongside matches and Grep cannot",
      "Use Edit on the one target file to replace the exact conditional, after the file has been read in this session",
      "Use Write to regenerate the target file from the version already held in context, which guarantees the final content exactly matches what Claude intends"
    ],
    answers: [0, 3],
    explanation: "Grep is the content-search tool and is built for this first step: it finds matches across the repository and returns locations, so no file bodies are pulled into context speculatively. For the second step, Edit performs an exact string replacement on just the intended span, and the read-before-edit requirement is satisfied because the file was read in this session. Globbing every .ts file and reading each one is the brute-force inversion of Grep's purpose and burns context proportional to repository size. The Bash option rests on a false premise — Grep reports line numbers, and Claude Code's guidance is specifically to prefer the dedicated search tools over shelling out to grep, find, or cat. Whole-file Write is the most tempting distractor since the content is in context, but regenerating the file costs output tokens proportional to its length and risks silent drift outside the intended line; Write is for files that are mostly changing, not one-line fixes."
  }
);
