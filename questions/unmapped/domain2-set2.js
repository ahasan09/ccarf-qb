// Domain 2: Tool Design & MCP Integration — set 2, 22 questions (harder)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d2-q33",
    domain: 2,
    question: "A team enables extended thinking on their agent and simultaneously sets tool_choice to {\"type\": \"tool\", \"name\": \"classify_ticket\"} to guarantee a structured call. The API rejects the request. Why?",
    options: [
      "Extended thinking doubles token usage, which exceeds the tool_choice budget",
      "Forced tool use requires strict: true on the tool definition when thinking is enabled",
      "Extended thinking only supports tool_choice of type \"auto\" or \"none\" — forcing a specific tool (or \"any\") is incompatible and must be removed, or thinking disabled",
      "tool_choice of type \"tool\" is deprecated and was replaced by \"any\" with a name filter"
    ],
    answer: 2,
    explanation: "When extended thinking is enabled, the API only accepts tool_choice \"auto\" (the default) or \"none\"; \"any\" and \"tool\" are rejected because forcing a tool constrains the response in a way that conflicts with thinking blocks. The practical fix is to rely on auto plus strong prompting, or turn thinking off for that request."
  },
  {
    id: "d2-q34",
    domain: 2,
    question: "An agent uses prompt caching with a large, stable system prompt and 40 tool definitions. To help Claude, a developer starts injecting the current timestamp into one tool's description on every request. Cache hit rate drops to zero across the board. Why?",
    options: [
      "Tool definitions sit at the very start of the cached prompt prefix (before system and messages), so changing any tool invalidates the cache for everything after it; dynamic values belong later in the prompt, such as in a message",
      "Prompt caching never covers tool definitions, so the timestamp is unrelated and the drop must come from the system prompt",
      "Timestamps are stripped by the API, producing malformed descriptions that disable caching",
      "Caching requires tools to be sorted alphabetically, and the timestamp breaks the ordering"
    ],
    answer: 0,
    explanation: "The cacheable prompt prefix is built in the order tools, then system, then messages, and a cache hit requires an exact prefix match. Mutating a tool description on each request changes the earliest part of the prefix, invalidating the cache for the entire prompt; per-request dynamic data should be placed in the conversation instead."
  },
  {
    id: "d2-q35",
    domain: 2,
    question: "Telemetry shows an agent books meetings by always chaining three tools in sequence — list_availability, create_event, send_invite — burning several model round trips and occasionally dropping the invite step. Per Anthropic's tool-design guidance, what is the best redesign?",
    options: [
      "Set tool_choice to \"any\" so the model is forced to keep calling tools until the chain completes",
      "Add a shared 'workflow_id' parameter to all three tools so the server can correlate the steps",
      "Document the required ordering in the system prompt and keep the three tools unchanged",
      "Consolidate the frequently-chained operations into one higher-level schedule_meeting tool that checks availability, books, and invites in a single call"
    ],
    answer: 3,
    explanation: "Anthropic's guidance for agent tools is to build for workflows, not to mirror API endpoints: operations that are reliably chained together should be consolidated into one tool, cutting round trips, context cost, and mid-chain failure modes. Prompt ordering rules and tool_choice tweaks still pay the multi-call tax and don't remove the dropped-step risk."
  },
  {
    id: "d2-q36",
    domain: 2,
    question: "A search_customers tool sometimes needs to return rich detail (full history for account analysis) and sometimes just names and IDs (for a quick lookup). The team wants token efficiency without losing capability. Which design does Anthropic recommend?",
    options: [
      "Always return full detail, since Claude can ignore fields it does not need",
      "Add an enum parameter such as response_format with values like \"concise\" (the default) and \"detailed\", letting Claude request the verbose payload only when the task needs it",
      "Return only IDs and require a second tool call per customer for any other field",
      "Compress the detailed payload with gzip and return it base64-encoded"
    ],
    answer: 1,
    explanation: "Anthropic's tool-writing guidance recommends giving tools a response-format style enum so the agent controls verbosity, defaulting to the concise form. Always returning everything wastes context on most calls, forcing per-field lookups multiplies round trips, and compression doesn't help because the model must read the content as tokens."
  },
  {
    id: "d2-q37",
    domain: 2,
    question: "A query_logs tool can match tens of thousands of lines. The team worries both about blowing the context window and about Claude missing data it needs. What is the best response design?",
    options: [
      "Return every matching line and rely on the model's long context to cope",
      "Return a random sample of 100 lines so the result is statistically representative",
      "Return nothing and instruct Claude to narrow the query until the count is below a threshold",
      "Apply a sensible default limit, and when results are truncated say so explicitly in the response along with how to get more (e.g., a cursor or offset parameter and filter suggestions)"
    ],
    answer: 3,
    explanation: "Token-efficient tools use pagination/truncation with sensible defaults, and — critically — tell the model that truncation occurred and how to retrieve the rest, so Claude can page or refine deliberately. Dumping everything blows context, silent sampling hides data loss, and returning nothing discards useful partial results."
  },
  {
    id: "d2-q38",
    domain: 2,
    question: "A create_shipment tool currently returns the raw upstream failure — 'Error 422: unprocessable entity (trace id 9f3c…)' — whenever Claude passes a malformed date. Claude then retries the same malformed input. What is the most effective error-result redesign?",
    options: [
      "Return is_error: true with an empty body so Claude falls back to asking the user",
      "Map every upstream failure to a numeric internal error code that Claude can look up in the system prompt",
      "Return an actionable message that names the invalid parameter, states the expected format with an example (e.g., 'ship_date must be ISO 8601, like 2026-03-01'), and suggests the correction",
      "Have the server silently coerce the date into a guess so no error is ever surfaced"
    ],
    answer: 2,
    explanation: "Error results are prompts too: the model can only self-correct if the message explains what was wrong and what a valid call looks like. Opaque status codes and empty errors give Claude nothing to adapt to, and silently guessing hides real failures and can ship to the wrong date."
  },
  {
    id: "d2-q39",
    domain: 2,
    question: "Claude emits one assistant message with three parallel tool_use blocks. Your harness runs the first successfully, the second throws, and the user aborts before the third runs. How should the next user message be constructed?",
    options: [
      "Include tool_result blocks only for the two tools that actually started, in one message",
      "Include three tool_result blocks in a single user message — the success, the failure with is_error: true, and the aborted call reported as an error/cancelled result — one per tool_use_id",
      "Send the successful result now and the other two results in later user messages as they are resolved",
      "Replace all three with one summary text block explaining what happened"
    ],
    answer: 1,
    explanation: "Every tool_use id in the assistant turn must be answered by a matching tool_result in the single following user message — including calls that failed or never ran, which are reported with is_error and an explanatory message such as 'cancelled by user'. Omitting or splitting results produces API errors or degrades future parallel tool use."
  },
  {
    id: "d2-q40",
    domain: 2,
    question: "A response comes back with stop_reason \"max_tokens\" and its final content block is a tool_use whose JSON input appears cut off. What does Anthropic recommend?",
    options: [
      "Execute the tool with the partial input, since the API repairs truncated JSON automatically",
      "Send an is_error tool_result telling Claude its JSON was malformed",
      "Append an empty assistant message so Claude resumes generating the rest of the input",
      "Treat the truncated tool_use block as unusable and retry the request with a higher max_tokens so the full tool call can be generated"
    ],
    answer: 3,
    explanation: "When generation stops at the token limit mid tool_use, the call's input is incomplete and cannot be trusted or 'resumed'; the documented remedy is retrying with a larger max_tokens. Executing partial input risks acting on wrong arguments, and the API does not repair or continue truncated blocks."
  },
  {
    id: "d2-q41",
    domain: 2,
    question: "An agent connects to both a GitHub MCP server and a Google Drive MCP server, and each exposes a tool whose natural name would be 'search'. Tool selection accuracy suffers. What naming practice does Anthropic recommend for this situation?",
    options: [
      "Namespace the tools by service (and resource where helpful), e.g., github_search_issues and drive_search_files, so names themselves signal distinct domains",
      "Keep both named 'search' and rely on the server identity field to disambiguate at runtime",
      "Rename one of them to 'query' so the strings differ",
      "Merge both into one universal search tool that takes a 'provider' parameter"
    ],
    answer: 0,
    explanation: "Anthropic's guidance is to namespace tool names by service or resource when agents face many tools from multiple sources — distinct, self-describing prefixes reduce cross-tool confusion. Cosmetic renames like 'query' don't convey the domain, and a merged mega-tool with a provider switch obscures each backend's distinct schema and semantics."
  },
  {
    id: "d2-q42",
    domain: 2,
    question: "An MCP server needs to summarize large documents with an LLM, but the vendor shipping it does not want to embed any model API key or pay for inference, and host users should stay in control. Which MCP feature fits?",
    options: [
      "Prompts — the server exposes a summarization template the model fills in locally",
      "Roots — the server declares the documents as roots so the host summarizes them",
      "Sampling — the server sends a sampling/createMessage request to the client, which runs the completion through its own model access, optionally with human review of the request and response",
      "Resources — the server publishes summaries as URIs that regenerate on read"
    ],
    answer: 2,
    explanation: "Sampling inverts the usual flow: the server requests an LLM completion from the client, so inference runs on the client's model access and billing, no key ships in the server, and the host can keep a human in the loop and control model choice. Prompts, roots, and resources do not give a server access to model inference."
  },
  {
    id: "d2-q43",
    domain: 2,
    question: "A security engineer assumes that because an MCP client declares roots (e.g., file:///home/user/project), the protocol guarantees a filesystem server cannot read files outside them. Which statement is accurate?",
    options: [
      "Correct — the client capability layer blocks any tool call resolving outside a declared root",
      "Roots are informational guidance: servers retrieve them via roots/list and SHOULD respect them, but MCP does not enforce the boundary, so real containment requires OS-level sandboxing or server-side checks",
      "Roots are enforced, but only on the stdio transport where the client owns the process",
      "Roots apply only to resources, so tools are out of scope by design"
    ],
    answer: 1,
    explanation: "Roots are a client capability that communicates which URIs/directories the server should operate within, with change updates via notifications/roots/list_changed — but the spec makes them advisory, not an enforcement mechanism. A misbehaving server can ignore them, so defense requires sandboxing or validation outside the protocol."
  },
  {
    id: "d2-q44",
    domain: 2,
    question: "Midway through executing a deploy tool, an MCP server realizes it needs the user to pick one of three target environments — information the model did not supply and should not invent. Under the current MCP specification, what is the designed mechanism?",
    options: [
      "Return a partial tool result and hope the model asks the user in its next text turn",
      "Emit a notifications/message log entry asking the user to re-run the tool with more arguments",
      "Call sampling/createMessage so the client's model picks an environment",
      "Send an elicitation request (elicitation/create) with a flat JSON schema of the needed field, letting the host present a form the user can accept, decline, or cancel"
    ],
    answer: 3,
    explanation: "Elicitation, added in the 2025-06-18 revision of the spec, lets servers request structured input from the user mid-interaction via a simple flat schema of primitive fields, with explicit accept/decline/cancel outcomes. Sampling asks the model rather than the user, and log notifications or hopeful partial results give no structured, reliable answer channel."
  },
  {
    id: "d2-q45",
    domain: 2,
    question: "A remote MCP server fronts an internal REST API. To 'simplify' auth, a developer proposes accepting any valid token the client already holds for the REST API and forwarding the MCP access token upstream unchanged. What does the MCP authorization spec say?",
    options: [
      "This is the recommended pattern, since it avoids a second OAuth flow",
      "It is allowed if both services share the same authorization server",
      "Both halves are prohibited: the server MUST validate that access tokens were issued specifically for it (audience binding, per RFC 8707 resource indicators) and must not pass tokens through to upstream APIs — it should obtain separate upstream credentials",
      "It is allowed as long as traffic stays inside the corporate network perimeter"
    ],
    answer: 2,
    explanation: "Token passthrough is an explicit anti-pattern in MCP's security guidance: an MCP server must only accept tokens whose audience is itself and must not forward them, otherwise it becomes a confused deputy and breaks auditability and scoping. Upstream access requires the server to hold its own appropriately-scoped credentials or perform a proper token exchange."
  },
  {
    id: "d2-q46",
    domain: 2,
    question: "A newly built MCP client makes its first unauthenticated POST to a remote streamable HTTP server and receives HTTP 401. Per the MCP authorization flow, what should the client do next?",
    options: [
      "Use the WWW-Authenticate header to locate the protected resource metadata (RFC 9728), discover the authorization server from it, then run an OAuth 2.1 authorization-code flow with PKCE, binding the token to the server with a resource indicator",
      "Prompt the user for a username and password and retry with Basic auth",
      "Retry over the stdio transport, which does not require authorization",
      "Generate a self-signed JWT naming the server as audience and present it as a bearer token"
    ],
    answer: 0,
    explanation: "MCP authorization is discovery-driven: the 401 response points the client at protected resource metadata, which identifies the authorization server; the client then performs standard OAuth 2.1 with PKCE (optionally after dynamic client registration) and requests a token audience-bound to the MCP server via RFC 8707. Self-minted JWTs and Basic auth are not part of the flow, and switching transports sidesteps nothing."
  },
  {
    id: "d2-q47",
    domain: 2,
    question: "A developer runs a streamable HTTP MCP server on their laptop for local testing, bound to 0.0.0.0 with no Origin checking, reasoning that 'nothing outside localhost can reach it anyway'. What attack does the MCP spec specifically warn this setup enables?",
    options: [
      "SQL injection through the JSON-RPC params field",
      "DNS rebinding — a malicious website visited in the user's browser can be made to issue requests that land on the local server, so local HTTP servers must validate the Origin header and should bind only to 127.0.0.1",
      "Replay of SSE event IDs to duplicate tool executions",
      "Downgrade of TLS to plaintext by a network middlebox"
    ],
    answer: 1,
    explanation: "The spec's transport security warning is explicit: locally running HTTP servers are vulnerable to DNS rebinding, where a remote web page tricks the browser into addressing the local server. Mitigations are validating Origin on incoming connections, binding to localhost rather than all interfaces, and requiring authentication."
  },
  {
    id: "d2-q48",
    domain: 2,
    question: "During a long-running tool call over streamable HTTP, the client's SSE stream drops on a flaky network. The server supports resumability. How does the client recover the messages it missed without re-running the tool?",
    options: [
      "It re-sends the original tools/call request with the same JSON-RPC id, which the server deduplicates",
      "It opens a WebSocket fallback channel defined by the spec for lossy networks",
      "It must start a new session, since message history dies with the stream",
      "It reconnects with an HTTP GET carrying the Last-Event-ID header (from the SSE event ids the server attached), and the server replays the messages sent after that point on the broken stream"
    ],
    answer: 3,
    explanation: "Streamable HTTP resumability works through standard SSE mechanics: servers may attach event ids, and a client that reconnects with Last-Event-ID lets the server replay messages that would otherwise be lost, within the same session (tracked via Mcp-Session-Id). There is no WebSocket fallback in the spec, and re-POSTing the call risks re-executing the operation."
  },
  {
    id: "d2-q49",
    domain: 2,
    question: "An MCP host auto-approves tool calls whenever the tool's annotations include readOnlyHint: true, including for community servers users install from a public registry. What is wrong with this policy?",
    options: [
      "Nothing — annotations are cryptographically signed by the registry",
      "readOnlyHint applies only to resources, so it never appears on tools",
      "Tool annotations are self-declared by the server and the spec says clients MUST treat them as untrusted unless the server itself is trusted — a malicious server can label a destructive tool read-only, so hints cannot be a security boundary",
      "The policy is wrong only because idempotentHint, not readOnlyHint, marks safe tools"
    ],
    answer: 2,
    explanation: "Annotations like readOnlyHint and destructiveHint exist to help UX (icons, default prompts), but they are unverified claims from the server. The spec requires clients to consider them untrusted except from trusted servers, so auto-execution decisions for arbitrary third-party servers must not hinge on them."
  },
  {
    id: "d2-q50",
    domain: 2,
    question: "A widely-adopted public MCP server's create_invoice tool needs a new 'currency' input. Many third-party agents already call the tool in production and cannot be updated in lockstep. What is the safest schema evolution?",
    options: [
      "Add currency as a required field — strict clients will fail fast and update quickly",
      "Add currency as an optional parameter with a documented server-side default (e.g., USD), note it in the description, and only introduce a breaking/renamed version later with a deprecation window if required becomes necessary",
      "Silently change the tool's behavior to infer currency from the amount's formatting",
      "Change the tool's name to create_invoice_v2 immediately and delete the old tool in the same release"
    ],
    answer: 1,
    explanation: "Adding a required field breaks every existing caller the moment the schema updates, and deleting the old tool in the same release is the same break with extra steps. Additive, optional parameters with sensible defaults preserve compatibility; genuinely breaking changes deserve a parallel version plus deprecation period."
  },
  {
    id: "d2-q51",
    domain: 2,
    question: "An MCP server exposes employee records. During open-ended Q&A, the model itself must decide — mid-reasoning — to fetch an arbitrary employee's record by ID. The team debates a resource template (employee://{id}) versus a lookup tool. What is the deciding consideration?",
    options: [
      "Resource templates cannot take parameters, so a tool is the only syntactically valid option",
      "Tools are cheaper per call than resources at the protocol level",
      "Resources support only plain text, and records are JSON",
      "Invocation control: resources (including templates) are application-controlled and typically attached by the host or user, so autonomous model-driven retrieval calls for a tool; the template remains useful where hosts let users attach records as context"
    ],
    answer: 3,
    explanation: "The tools/resources boundary is about who decides to act: tools are model-controlled, while resources are read-only context the application or user chooses to attach, and many hosts never let the model browse resources on its own. Since the scenario requires the model to initiate the fetch, a tool is the reliable primitive; the other options cite protocol limitations that don't exist."
  },
  {
    id: "d2-q52",
    domain: 2,
    question: "After several tool-using turns, an agent's final request should force Claude to synthesize a plain-text answer with no further tool calls — without hurting the prompt cache built over the session. What is the best approach?",
    options: [
      "Set tool_choice to {\"type\": \"none\"} on the final request while leaving the tools array unchanged, so the prefix (and cache) is preserved but Claude must answer in text",
      "Remove the tools array from the final request so no tools exist to call",
      "Append 'do not use tools' to the system prompt for the final request",
      "Set disable_parallel_tool_use: true, which in the final turn means zero tool calls"
    ],
    answer: 0,
    explanation: "tool_choice \"none\" blocks tool use while keeping the tool definitions in place, so the cached prefix (tools → system → messages) still matches. Removing the tools array or editing the system prompt changes the prefix and invalidates the cache, and disable_parallel_tool_use limits calls to one, not zero."
  },
  {
    id: "d2-q53",
    domain: 2,
    question: "An MCP tool generates compliance reports that take around ten minutes. Hosts currently see nothing until completion, and some time out. Staying within the MCP spec, how should the server keep clients informed mid-execution?",
    options: [
      "Return an immediate fake success, then push the real result later through resources/updated",
      "When the client's tools/call request includes a progressToken in its _meta, emit notifications/progress messages referencing that token with progress (and optionally total and a message) while work continues",
      "Split the report into 60 sub-tools so each call finishes within ten seconds",
      "Send partial tool results every 30 seconds under the same JSON-RPC request id"
    ],
    answer: 1,
    explanation: "MCP's progress mechanism is opt-in per request: the sender includes a progressToken in the request metadata, and the receiver may emit notifications/progress tied to that token until the final response arrives. JSON-RPC allows exactly one response per request id, so streaming repeated 'partial results' for one id violates the protocol, and faking completion breaks the tool contract."
  },
  {
    id: "d2-q54",
    domain: 2,
    question: "A reporting tool returns the same 20 fields either as deeply nested JSON (full key names repeated per record, wrapper objects, opaque UUIDs) or in alternative layouts. Multi-record results are consuming a large share of context. Keeping all needed information, which guidance applies?",
    options: [
      "Response format materially affects token cost — flatter, concise formats (e.g., Markdown tables or compact text) often convey the same information in far fewer tokens than verbose nested JSON, so measure and pick the leaner format while keeping identifiers agents need for follow-up calls",
      "Token count depends only on information content, so format changes cannot help",
      "JSON is always cheapest because the tokenizer is optimized for it",
      "Return the data as a CSV file attachment, since attachments bypass the context window"
    ],
    answer: 0,
    explanation: "Anthropic's tool-writing guidance notes that the serialization format of a result meaningfully changes token consumption — repeated keys, nesting, and low-signal fields inflate cost without adding information, and formats like Markdown or concise text can be substantially cheaper. Tool results always enter the context as tokens, so there is no 'attachment bypass', but identifiers needed for subsequent calls must survive the trimming."
  }
);
