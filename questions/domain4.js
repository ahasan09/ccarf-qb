// Domain 4: Prompt Engineering & Structured Output — 36 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d4-q01",
    domain: 4,
    question: "A developer is building a legal document analyzer and wants Claude to consistently behave as an expert contract lawyer across every request. According to Anthropic's role prompting guidance, where should this role be defined?",
    options: [
      "In the first user message of every conversation, repeated each turn so it stays in context",
      "In the system parameter of the API request, keeping task-specific instructions and data in the user turn",
      "As a prefilled assistant message at the start of the conversation",
      "Inside each tool description, so the role is reinforced on every tool call"
    ],
    answer: 1,
    explanation: "Anthropic recommends setting Claude's role via the system parameter — it is the most powerful way to use system prompts — while task-specific instructions and input data belong in the user turn."
  },
  {
    id: "d4-q02",
    domain: 4,
    question: "A team's prompt produces inconsistent results across runs, and users interpret the outputs differently than intended. According to Anthropic's 'be clear and direct' guidance, what is the recommended first diagnostic step?",
    options: [
      "Add more few-shot examples until the behavior converges",
      "Raise max_tokens so Claude has more room to infer the intent",
      "Show the prompt to a colleague with minimal context and see if they could follow it; if not, add the missing context and explicit, specific instructions",
      "Switch to a larger model, since instruction-following scales with model size"
    ],
    answer: 2,
    explanation: "The 'golden rule of clear prompting' is to show the prompt to a colleague (treating Claude like a brilliant new employee with no context) — if a human would be confused, Claude likely will be too, so add explicit context and instructions."
  },
  {
    id: "d4-q03",
    domain: 4,
    question: "A prompt interleaves instructions, a pasted customer document, and formatting examples in one block of text. Claude sometimes treats sentences from the document as if they were instructions. What is the recommended fix?",
    options: [
      "Wrap each part in descriptive XML tags such as <instructions>, <document>, and <example> so Claude can clearly separate the components",
      "Place the entire prompt inside a single <prompt> tag so Claude knows it is all one prompt",
      "Rewrite the instructions in all capital letters so they stand out from the document text",
      "Shorten the document so there is less text to confuse with the instructions"
    ],
    answer: 0,
    explanation: "XML tags are Anthropic's recommended way to structure prompts with multiple components — they prevent Claude from mixing up instructions with data or examples and make outputs easier to parse."
  },
  {
    id: "d4-q04",
    domain: 4,
    question: "Which statement about using XML tags in Claude prompts is accurate?",
    options: [
      "Claude only recognizes an official list of tags such as <document> and <instructions>",
      "Tags must form valid, well-formed XML with a declared schema or they are ignored",
      "XML tags only affect behavior when they are also declared in the system prompt",
      "There are no special canonical tag names — choose meaningful names, use them consistently, and refer to them by name in your instructions"
    ],
    answer: 3,
    explanation: "Anthropic's docs state there are no canonical 'best' XML tags; what matters is that tag names are descriptive, used consistently, and referenced in the instructions (e.g., 'Using the contract in <contract> tags...')."
  },
  {
    id: "d4-q05",
    domain: 4,
    question: "A developer's ticket classifier keeps varying its output format between runs. Following Anthropic's multishot prompting guidance, what is the best improvement?",
    options: [
      "Add a single perfect 'gold standard' example for the model to copy",
      "Include roughly 3–5 diverse, relevant examples wrapped in <example> (or <examples>) tags showing the exact desired output format",
      "Add 50+ examples covering every conceivable input to eliminate ambiguity",
      "Avoid examples entirely and describe the format in prose, since examples bias the model"
    ],
    answer: 1,
    explanation: "Anthropic recommends including 3–5 diverse, relevant examples wrapped in XML tags; examples are one of the most effective tools for getting consistent structure and format."
  },
  {
    id: "d4-q06",
    domain: 4,
    question: "A sentiment classifier uses few-shot examples, but every example happens to show a positive review mapped to 'positive'. In production, Claude mislabels many negative reviews. What is the most likely cause?",
    options: [
      "The examples lack diversity, so Claude pattern-matches to the only label it has seen — add examples covering negative, neutral, and edge-case inputs",
      "Few-shot prompting supports a maximum of three examples, so the extras are ignored",
      "Sentiment classification requires temperature 1.0 to work correctly",
      "Examples only influence behavior when placed in the system prompt"
    ],
    answer: 0,
    explanation: "Effective few-shot examples must be relevant, clear, and diverse — covering edge cases and all expected output labels — otherwise Claude can overfit to unintended patterns in the examples."
  },
  {
    id: "d4-q07",
    domain: 4,
    question: "A developer wants Claude to reason through tax scenarios but needs to strip the reasoning out before showing the final recommendation in the UI. Which chain-of-thought approach best supports this?",
    options: [
      "Append 'think step by step' to the prompt and display the full response",
      "Instruct Claude to keep its reasoning brief so it is less visible to users",
      "Use structured chain of thought: instruct Claude to write its reasoning inside <thinking> tags and the final recommendation inside <answer> tags, then parse out only the <answer> content",
      "Set temperature to 0 so Claude skips the reasoning and outputs only conclusions"
    ],
    answer: 2,
    explanation: "Structured CoT with XML tags like <thinking> and <answer> is the most prescriptive chain-of-thought technique in Anthropic's docs, and it makes the reasoning trivially separable from the user-facing answer."
  },
  {
    id: "d4-q08",
    domain: 4,
    question: "For which workload does Anthropic advise AGAINST adding chain-of-thought prompting?",
    options: [
      "Multi-step financial analysis with intermediate calculations",
      "Complex legal reasoning across several documents",
      "Research synthesis requiring weighing of conflicting sources",
      "Simple, latency-sensitive tasks such as short lookups — CoT increases output length, cost, and latency without improving quality"
    ],
    answer: 3,
    explanation: "CoT trades latency and output tokens for accuracy on complex tasks; Anthropic advises using it judiciously and skipping it for simple tasks where the extra reasoning adds cost but no performance benefit."
  },
  {
    id: "d4-q09",
    domain: 4,
    question: "A developer prompts: 'Think through the problem carefully in your head, but output only the final answer.' Accuracy on hard problems does not improve. Why?",
    options: [
      "Chain of thought only works when the reasoning is actually generated as output (or in thinking blocks) — Claude cannot 'think silently' before answering",
      "Claude ignores all meta-instructions about its own reasoning process",
      "The phrase 'in your head' triggers a safety refusal",
      "Reasoning quality can only be improved by adding few-shot examples"
    ],
    answer: 0,
    explanation: "Anthropic's CoT guidance is explicit that thinking must be output to occur — suppressing the reasoning text means no actual step-by-step reasoning happens, so the accuracy benefit disappears."
  },
  {
    id: "d4-q10",
    domain: 4,
    question: "A developer enables manual extended thinking on a Claude model that supports {\"type\": \"enabled\", \"budget_tokens\": N}. Which constraint applies to budget_tokens?",
    options: [
      "budget_tokens must be greater than max_tokens so thinking has priority",
      "budget_tokens must be at least 1024 and strictly less than max_tokens",
      "budget_tokens is unlimited and billed separately from max_tokens",
      "budget_tokens cannot be set directly; it always defaults to half of max_tokens"
    ],
    answer: 1,
    explanation: "On models that support the manual extended thinking configuration, budget_tokens has a minimum of 1024 and must be less than max_tokens, since thinking tokens count toward the overall output limit."
  },
  {
    id: "d4-q11",
    domain: 4,
    question: "On a model that supports response prefilling, how does a developer prefill Claude's response to skip preambles like 'Here is the JSON you requested:'?",
    options: [
      "Set a top-level 'prefill' parameter on the request",
      "Add the desired opening text as a stop sequence",
      "Include a final message with role 'assistant' containing the starting text (for example '{'), and Claude continues generating from that point",
      "Pass the opening text in output_config under a 'prefix' field"
    ],
    answer: 2,
    explanation: "Prefilling works by placing text in a trailing assistant message; Claude continues from exactly that text. Note the newest models (Claude 4.6+ tiers) reject trailing-assistant prefills, where structured outputs are the replacement."
  },
  {
    id: "d4-q12",
    domain: 4,
    question: "Which of the following is a real API constraint when prefilling the assistant response?",
    options: [
      "The prefill text cannot end with trailing whitespace — the API returns an error if it does",
      "The prefill must be at least 10 characters long to register",
      "Prefilling only works when temperature is set to 0",
      "The prefill must be wrapped in XML tags to be recognized"
    ],
    answer: 0,
    explanation: "The Messages API rejects a prefilled assistant message whose content ends in trailing whitespace; this is a documented constraint of the prefill technique."
  },
  {
    id: "d4-q13",
    domain: 4,
    question: "A roleplay chatbot playing a detective character gradually drifts out of character over long conversations, despite a role in the system prompt. Which documented technique directly combats this?",
    options: [
      "Raise the temperature so the character feels more alive",
      "Restate the full persona description inside every user message",
      "Trim the conversation history so there is less text to drift from",
      "Prefill each assistant turn with a bracketed character tag such as '[Sherlock]' so every response starts in character"
    ],
    answer: 3,
    explanation: "Anthropic's prefill guidance recommends combining a system-prompt role with a bracketed-name prefill (e.g., '[Sherlock]') to maintain character consistency across long conversations."
  },
  {
    id: "d4-q14",
    domain: 4,
    question: "A developer enables extended thinking and also includes a prefilled assistant message in the same request. What happens?",
    options: [
      "Claude performs its thinking inside the prefilled text",
      "The request is rejected — prefilling the assistant response is not compatible with extended thinking",
      "The prefill silently disables thinking for that request",
      "Both features compose: thinking blocks come first, then generation continues from the prefill"
    ],
    answer: 1,
    explanation: "Prefilling is documented as incompatible with extended thinking; a request combining a trailing assistant message with thinking enabled returns an error."
  },
  {
    id: "d4-q15",
    domain: 4,
    question: "A support app builds its prompt by string-concatenating instructions and the customer ticket into one blob. What is the main benefit of refactoring this into a prompt template with variables?",
    options: [
      "Templates reduce the number of tokens billed per request",
      "Variables are hidden from the model, improving privacy",
      "The fixed instructions can be versioned, tested, and cached independently, while only the variable content (the ticket) changes per request",
      "Templates allow the model to skip reading the instructions on repeat calls"
    ],
    answer: 2,
    explanation: "Separating the static prompt skeleton from dynamic inputs gives consistency, easier version control and testing, and a stable prefix — the dynamic content simply fills designated slots per request."
  },
  {
    id: "d4-q16",
    domain: 4,
    question: "In the Anthropic Console's prompt tools, what is the syntax for marking a variable inside a prompt template?",
    options: [
      "Double curly brackets: {{variable_name}}",
      "Dollar-brace interpolation: ${variable_name}",
      "An XML element: <variable>name</variable>",
      "Percent signs: %variable_name%"
    ],
    answer: 0,
    explanation: "The Console uses double-bracket {{variable}} syntax to mark template variables, which can then be filled with different values for testing and evaluation."
  },
  {
    id: "d4-q17",
    domain: 4,
    question: "A developer sends a ~50-page contract plus a question about its termination clause. According to Anthropic's long-context prompting tips, how should the prompt be arranged?",
    options: [
      "Question first, then the document, so Claude knows what to look for while reading",
      "Split the document across alternating user and assistant turns to simulate dialogue",
      "Always place long documents in the system prompt",
      "Place the long document near the top of the prompt, with the question and instructions after it — putting the query at the end can improve response quality by up to 30% in testing"
    ],
    answer: 3,
    explanation: "Anthropic's long-context guidance is to put longform data at the top and the query at the end; in internal tests this ordering improved quality by up to 30%, especially with complex, multi-document inputs."
  },
  {
    id: "d4-q18",
    domain: 4,
    question: "A long-document Q&A feature sometimes fabricates details that are not in the document. Which documented long-context technique most directly addresses this?",
    options: [
      "Increase temperature so Claude explores the document more broadly",
      "Ask Claude to first extract the relevant quotes from the document (e.g., into <quotes> tags) and then answer based only on those quotes",
      "Chunk the document into many short separate requests and merge the answers",
      "Repeat the question both before and after the document"
    ],
    answer: 1,
    explanation: "Quote-first grounding — having Claude extract word-for-word supporting quotes before answering — helps it cut through long-context noise and anchors the answer in actual document text, reducing hallucination."
  },
  {
    id: "d4-q19",
    domain: 4,
    question: "An application sends several reference documents in one request. What structure does Anthropic recommend for presenting multiple documents in the prompt?",
    options: [
      "Concatenate the documents separated by '---' dividers",
      "Base64-encode each document so the boundaries are unambiguous",
      "Wrap each document in <document> tags containing metadata subtags such as <source> and the content in <document_contents>",
      "Send one document per API request and merge the answers client-side"
    ],
    answer: 2,
    explanation: "The long-context tips recommend structuring multi-document inputs with <document> wrappers including <source> metadata and <document_contents>, which helps Claude attribute and reference each document correctly."
  },
  {
    id: "d4-q20",
    domain: 4,
    question: "A developer needs API responses that are guaranteed to parse against a specific JSON schema on every request, with no retry logic. Which approach provides that guarantee?",
    options: [
      "Use the structured outputs feature — a JSON output format with type 'json_schema' — which constrains generation so the response conforms to the schema",
      "Add 'Respond ONLY with valid JSON' to the system prompt",
      "Set temperature to 0 so the JSON is always produced identically",
      "Provide several few-shot examples of valid JSON output"
    ],
    answer: 0,
    explanation: "Prompting, examples, and low temperature all improve the odds but cannot guarantee validity; the structured outputs feature enforces the declared JSON schema at generation time, guaranteeing parseable, schema-conformant output."
  },
  {
    id: "d4-q21",
    domain: 4,
    question: "A developer instructs Claude to wrap its answer in <answer></answer> tags, but Claude keeps adding commentary after the closing tag. How can generation be halted exactly when the answer is complete?",
    options: [
      "Tune max_tokens low enough that the commentary gets cut off",
      "Set tool_choice to 'none' so no extra content is produced",
      "Lower the temperature to suppress the commentary",
      "Pass '</answer>' in the stop_sequences parameter — generation stops when it is produced, stop_reason is 'stop_sequence', and the matched sequence is not included in the output"
    ],
    answer: 3,
    explanation: "Custom stop sequences end generation the moment the model emits the specified string; the response reports stop_reason 'stop_sequence' and omits the sequence itself, making this the clean way to truncate at a sentinel."
  },
  {
    id: "d4-q22",
    domain: 4,
    question: "A data pipeline must receive extracted entities in a fixed structure on every single call. The developer defines a 'record_entities' tool with an input_schema. How do they guarantee Claude always calls that tool?",
    options: [
      "Set tool_choice to {\"type\": \"auto\"} and trust the tool description",
      "Set tool_choice to {\"type\": \"tool\", \"name\": \"record_entities\"}, forcing Claude to call that specific tool so output always arrives as schema-shaped tool input",
      "Add 'You MUST use the record_entities tool' to the system prompt",
      "Set tool_choice to {\"type\": \"none\"} so Claude outputs the structure as plain text"
    ],
    answer: 1,
    explanation: "Forcing a specific tool via tool_choice {type: 'tool', name: ...} is the documented pattern for structured extraction: Claude must respond with a tool_use block whose input follows the tool's JSON schema."
  },
  {
    id: "d4-q23",
    domain: 4,
    question: "What is the difference between tool_choice {\"type\": \"auto\"} and {\"type\": \"any\"}?",
    options: [
      "'any' disables parallel tool use while 'auto' allows it",
      "'auto' forces at least one tool call while 'any' makes tools optional",
      "'auto' lets Claude decide whether to use a tool at all, while 'any' forces Claude to use at least one of the provided tools",
      "They behave identically; 'any' is just the legacy name"
    ],
    answer: 2,
    explanation: "With 'auto' (the default when tools are present) Claude may answer without tools; 'any' requires at least one tool call. Note that forced modes ('any' or 'tool') also suppress chain-of-thought text before the call."
  },
  {
    id: "d4-q24",
    domain: 4,
    question: "A developer wants a guarantee that a tool call's input always validates exactly against the tool's JSON schema. What is required to enable strict tool use?",
    options: [
      "Set strict: true on the tool definition itself, with a schema that sets additionalProperties: false and lists its required properties",
      "Set strict: true inside the tool_choice object on the request",
      "Pass a 'strict-tools' beta header; strict mode is unavailable otherwise",
      "Nothing — the SDK validates tool inputs client-side by default"
    ],
    answer: 0,
    explanation: "Strict tool use is enabled per-tool with strict: true alongside name/description/input_schema (not on tool_choice), and the schema must declare additionalProperties: false and a required list; the API then guarantees the tool input validates."
  },
  {
    id: "d4-q25",
    domain: 4,
    question: "Which JSON Schema feature is NOT supported by Claude's structured outputs and must instead be validated client-side?",
    options: [
      "enum values for a string property",
      "additionalProperties set to false",
      "anyOf composition of subschemas",
      "Numeric constraints such as minimum and maximum"
    ],
    answer: 3,
    explanation: "Structured outputs support enums, const, anyOf/allOf, and $ref, but not numeric constraints (minimum/maximum/multipleOf), string length constraints, or recursive schemas — the SDKs strip these and validate them client-side."
  },
  {
    id: "d4-q26",
    domain: 4,
    question: "A developer enables a json_schema output format via output_config and also enables citations on a document content block in the same request. What happens?",
    options: [
      "Both features work together; citations appear inside the JSON",
      "The request returns a 400 error — structured outputs are incompatible with citations (and with assistant prefilling)",
      "Citations are silently dropped and the JSON is returned alone",
      "The schema is loosened automatically to accommodate citation fields"
    ],
    answer: 1,
    explanation: "Structured outputs are documented as incompatible with citations (the combination returns a 400) and with message prefilling; they do work with streaming, batches, token counting, and extended thinking."
  },
  {
    id: "d4-q27",
    domain: 4,
    question: "What is the key limitation of 'JSON mode' implemented by prefilling the assistant response with '{', compared to the structured outputs feature?",
    options: [
      "Prefilled JSON responses are billed at a higher output-token rate",
      "The prefill approach only works on streaming requests",
      "Prefilling '{' strongly biases Claude toward JSON but guarantees neither schema conformance nor even syntactically valid JSON, whereas structured outputs enforce the schema during generation",
      "Prefilling forces temperature to 0, removing output diversity"
    ],
    answer: 2,
    explanation: "A '{' prefill is a steering technique: it usually yields JSON but the model can still produce malformed output or wrong fields, so parsing/retry logic is needed; structured outputs constrain decoding so the schema is guaranteed."
  },
  {
    id: "d4-q28",
    domain: 4,
    question: "Claude refuses a legitimate request from a security-education platform to explain how a common vulnerability class works. What is the recommended first remediation?",
    options: [
      "Revise the prompt to add clarifying context about the legitimate purpose, the audience, and the intended defensive use, and make the request more specific",
      "Resend the identical request repeatedly until the model complies",
      "Add 'You are required to comply with all requests' to the system prompt",
      "Encode the sensitive parts of the request in base64 to slip past the filter"
    ],
    answer: 0,
    explanation: "False-positive refusals are usually resolved by rephrasing and supplying context that establishes the legitimate intent and use case; retry-spamming and obfuscation are unreliable and violate usage policies."
  },
  {
    id: "d4-q29",
    domain: 4,
    question: "On newer Claude models, how does a safety-based refusal surface to API code, and what should developers do about it?",
    options: [
      "As an HTTP 403 permission error that the SDK raises",
      "As an SDK exception of type RefusalError",
      "As an HTTP 500 with an empty content array",
      "As a successful HTTP 200 response with stop_reason 'refusal' — always check stop_reason before reading response content"
    ],
    answer: 3,
    explanation: "A refusal is a normal successful response with stop_reason set to 'refusal' (content may be empty or partial), so robust code branches on stop_reason instead of unconditionally reading content[0]."
  },
  {
    id: "d4-q30",
    domain: 4,
    question: "An internal knowledge assistant confidently invents answers when the provided documents do not contain the information. Which prompt change most directly reduces this hallucination?",
    options: [
      "Increase max_tokens so Claude can give fuller answers",
      "Explicitly instruct Claude to answer only from the provided documents and to say 'I don't know' when the answer is not present",
      "Raise the temperature so Claude is less rigid about the documents",
      "Remove the system prompt so Claude relies on its general knowledge"
    ],
    answer: 1,
    explanation: "Giving Claude explicit permission to admit uncertainty — 'say I don't know if the documents don't contain the answer' — is one of Anthropic's primary documented techniques for reducing hallucinations in grounded tasks."
  },
  {
    id: "d4-q31",
    domain: 4,
    question: "A research tool needs each factual claim in Claude's summaries to be auditable by a human reviewer. Which documented technique best supports this?",
    options: [
      "Instruct Claude to 'always be honest' in the system prompt",
      "Have Claude self-rate its confidence from 1–10 for the whole response",
      "Have Claude cite or quote the specific source passage supporting each claim, so every claim can be verified against the document",
      "Ban hedging words like 'possibly' so claims are always definite"
    ],
    answer: 2,
    explanation: "Verification via citations or supporting quotes is a documented hallucination-reduction technique: tying each claim to an identifiable source passage makes fabrications detectable and claims auditable."
  },
  {
    id: "d4-q32",
    domain: 4,
    question: "A single mega-prompt asks Claude to research a topic, outline a report, write the draft, and polish the style — and it regularly drops some of the instructions. What does Anthropic recommend?",
    options: [
      "Break the workflow into a prompt chain where each call has a single clear objective, passing each step's output (e.g., wrapped in XML tags) into the next prompt",
      "Keep one prompt but add ALL-CAPS emphasis to the instructions Claude drops",
      "Raise the temperature so Claude handles the complexity more creatively",
      "Reduce max_tokens so Claude is forced to be more focused"
    ],
    answer: 0,
    explanation: "Prompt chaining breaks complex multi-step work into sequential subtasks so each gets Claude's full attention; passing intermediate outputs between prompts with clear structure (like XML tags) keeps the pipeline reliable."
  },
  {
    id: "d4-q33",
    domain: 4,
    question: "In Anthropic's prompt chaining guidance, what is a 'self-correction' chain?",
    options: [
      "Automatic SDK retries when an API call returns a 5xx error",
      "Gradually lowering the temperature across successive calls",
      "Re-running the identical prompt and keeping the majority answer",
      "A separate call in which Claude reviews its own earlier output against criteria, followed by another call that fixes the issues it identified"
    ],
    answer: 3,
    explanation: "A self-correction chain feeds Claude's output back to Claude in a dedicated review step (grade/critique against stated criteria), then uses the feedback in a refinement step — catching errors a single pass would miss."
  },
  {
    id: "d4-q34",
    domain: 4,
    question: "A team edits its production system prompt directly whenever someone has an idea, and output quality quietly regresses. What is the recommended production practice?",
    options: [
      "Freeze the prompt and only ever change it when upgrading models",
      "Version prompts like code and run an evaluation suite comparing the candidate prompt against the current one before deploying the change",
      "Set temperature to 0 so prompt edits cannot cause regressions",
      "Ask Claude directly whether the new prompt is better than the old one"
    ],
    answer: 1,
    explanation: "Anthropic recommends treating prompts as versioned artifacts and empirically evaluating changes against defined success criteria and test cases before rollout, so regressions are caught rather than discovered in production."
  },
  {
    id: "d4-q35",
    domain: 4,
    question: "What does the prompt improver in the Anthropic Console do with a prompt you submit?",
    options: [
      "Fine-tunes a custom model on the prompt and its examples",
      "Compresses the prompt to minimize token usage",
      "Rewrites the prompt with chain-of-thought reasoning instructions, a clearer XML-structured template, and standardized, enriched examples",
      "Generates an evaluation dataset but leaves the prompt text unchanged"
    ],
    answer: 2,
    explanation: "The prompt improver applies prompt engineering best practices automatically: it restructures the prompt (XML sections), adds and refines chain-of-thought guidance, and standardizes/augments the examples — it does not train or fine-tune a model."
  },
  {
    id: "d4-q36",
    domain: 4,
    question: "One pipeline classifies invoices and needs maximal run-to-run consistency; another generates creative marketing taglines and needs variety. How should sampling be configured on a model that supports temperature?",
    options: [
      "Temperature near 0 for the classifier and nearer 1 for tagline generation — noting that even temperature 0 does not guarantee fully deterministic outputs",
      "Temperature 1.0 for both, relying on prompt wording for consistency",
      "Temperature near 0 for the creative task and 1.0 for classification",
      "Set both temperature and top_p aggressively in the same request for a stronger combined effect"
    ],
    answer: 0,
    explanation: "Anthropic's guidance is temperature closer to 0 for analytical/deterministic tasks and closer to 1 for creative ones, while cautioning that 0 is not perfectly deterministic; temperature and top_p should be adjusted one at a time, not together."
  }
);
