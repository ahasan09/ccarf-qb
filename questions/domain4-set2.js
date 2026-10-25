// Domain 4: Prompt Engineering & Structured Output — set 2, 24 questions (harder)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d4-q37",
    domain: 4,
    question: "A pipeline must return schema-valid JSON on every call, stream the response, AND use extended thinking for hard extraction cases. The team debates three options: prefilling '{', forcing a tool with tool_choice {\"type\": \"tool\"}, or the structured outputs feature. Which choice satisfies all three requirements?",
    options: [
      "Prefilling '{' — it is the lightest-weight option and streams naturally",
      "Forcing the extraction tool with tool_choice {\"type\": \"tool\"}, since strict tools guarantee the schema",
      "Structured outputs via a json_schema output format — prefilling is incompatible with extended thinking, and forced tool_choice ('any'/'tool') is also unsupported when thinking is enabled, while structured outputs work with both streaming and extended thinking",
      "None — guaranteed JSON fundamentally cannot be combined with extended thinking"
    ],
    answer: 2,
    explanation: "Extended thinking rejects assistant prefills and only supports tool_choice 'auto' (or 'none'), so both alternatives fail the thinking requirement. Structured outputs are documented as compatible with streaming and extended thinking while guaranteeing schema conformance."
  },
  {
    id: "d4-q38",
    domain: 4,
    question: "An extraction service switches from tool_choice {\"type\": \"auto\"} to {\"type\": \"tool\", \"name\": \"extract\"} to guarantee structured output. Format reliability improves, but accuracy on ambiguous inputs drops noticeably. What is the most likely cause and remediation?",
    options: [
      "Forcing a specific tool suppresses the chain-of-thought text Claude would otherwise emit before calling it; return to 'auto' with strong instructions to use the tool (or add a dedicated field/step for reasoning) so Claude can reason before committing to values",
      "The forced tool's schema is being randomly mutated by the API; re-upload the tool definition",
      "Forced tool use lowers the effective temperature, making outputs too conservative; raise temperature to compensate",
      "tool_choice 'tool' truncates the input context to fit the tool definition; shorten the tool description"
    ],
    answer: 0,
    explanation: "Anthropic documents that with tool_choice 'any' or 'tool', Claude will not emit chain-of-thought before the tool call, which can hurt accuracy on inputs that benefit from deliberation. Using 'auto' plus prompting, or giving the model somewhere to reason, restores the deliberation."
  },
  {
    id: "d4-q39",
    domain: 4,
    question: "A developer enables extended thinking and, out of habit, also sets temperature 0.2 'for consistency' on the same request. What happens, and what sampling control remains available with thinking enabled?",
    options: [
      "The request succeeds; thinking tokens use temperature 1 while visible tokens use 0.2",
      "The request succeeds but thinking is silently disabled in favor of the temperature setting",
      "Temperature is clamped to 0.5 as a compromise between the two modes",
      "The request is rejected — extended thinking is incompatible with temperature (and top_k) modifications; only top_p within a limited high range (0.95–1) may be adjusted"
    ],
    answer: 3,
    explanation: "With extended thinking enabled, temperature and top_k cannot be modified (temperature effectively stays at 1); the docs allow only top_p values between 0.95 and 1. Setting temperature with thinking enabled returns a validation error."
  },
  {
    id: "d4-q40",
    domain: 4,
    question: "An agent uses extended thinking with tool use. To 'save tokens', the developer strips the thinking block from the assistant turn before sending back the tool_result. The API rejects the request. Why?",
    options: [
      "Tool results must always be accompanied by a text block, not a thinking block",
      "When continuing a tool-use exchange, the final assistant turn's thinking block (with its signature) must be passed back complete and unmodified — the API validates it, and altering or dropping it fails the request",
      "Thinking blocks are billed as input on every subsequent turn, so the API requires them for billing integrity",
      "The developer should have stripped the tool_use block as well; partial stripping is the only error"
    ],
    answer: 1,
    explanation: "During a tool-use loop with thinking, the signed thinking block from the last assistant turn must be returned intact so the API can verify reasoning continuity. (Thinking blocks from earlier, completed turns are a different story — the API strips those automatically and does not bill them.)"
  },
  {
    id: "d4-q41",
    domain: 4,
    question: "A team migrates a prompt to an extended-thinking model. The prompt contains an elaborate prescriptive scaffold: 'Step 1: list entities. Step 2: check each… Step 7: output.' Results are mediocre. What does Anthropic's extended thinking guidance recommend trying first?",
    options: [
      "Add even more granular steps so the thinking has a tighter rail to follow",
      "Replace the prescriptive step list with high-level general instructions (e.g., 'think about this thoroughly and consider multiple approaches') — Claude's own reasoning in the thinking phase often exceeds rigidly human-prescribed steps — then add specific guidance only where needed",
      "Disable thinking entirely, since step lists and thinking are mutually exclusive",
      "Move the step list into a prefilled assistant message so it lands inside the thinking block"
    ],
    answer: 1,
    explanation: "Anthropic's extended thinking tips recommend starting with general instructions to think deeply rather than prescriptive step-by-step guidance, because the model's own structured reasoning can outperform a rigid human-specified process; prescriptive steps are a fallback refinement. (Prefilling is incompatible with thinking anyway.)"
  },
  {
    id: "d4-q42",
    domain: 4,
    question: "A production integration gets JSON by prefilling the assistant response with '{'. The team upgrades to the newest Claude model tier and every request starts failing with a validation error on the trailing assistant message. What is the correct migration?",
    options: [
      "Move the '{' into the system prompt, where prefills now live",
      "Escape the brace as '\\u007B' so the validator accepts it",
      "Downgrade max_tokens until the error disappears",
      "Adopt the structured outputs feature (a json_schema/JSON output format) — the newest model tiers reject trailing-assistant prefills, and structured outputs are the documented replacement, with the added benefit of actually guaranteeing valid, schema-conformant JSON"
    ],
    answer: 3,
    explanation: "The newest Claude models (4.6+ tiers) no longer accept assistant-message prefills; Anthropic points prefill-based 'JSON mode' users to structured outputs, which constrain generation to the declared schema instead of merely biasing toward JSON."
  },
  {
    id: "d4-q43",
    domain: 4,
    question: "On a model that still supports prefilling (and with extended thinking off), a developer wants Claude's reply to continue an exact in-progress format — picking up mid-way through a markdown table the user started — with zero preamble. No field schema exists or is wanted. Which technique fits best?",
    options: [
      "Prefill the assistant message with the table's next row prefix (e.g., '| ') so generation continues exactly from that point",
      "Define a JSON schema describing table rows and use structured outputs, then convert to markdown client-side",
      "Force a 'write_table' tool via tool_choice so the rows arrive as tool input",
      "Add a stop sequence of '|' so Claude cannot produce anything except table cells"
    ],
    answer: 0,
    explanation: "Prefilling is the lightweight steering tool for controlling exactly how a response begins and for format continuation; structured outputs and forced tools require defining schemas and change the response shape, which is overkill when no schema is needed. A '|' stop sequence would end generation at the first cell boundary, not enforce format."
  },
  {
    id: "d4-q44",
    domain: 4,
    question: "An analyst tool lets users ask many successive questions about the same 80K-token filing. An engineer proposes putting each question BEFORE the document 'so Claude knows what to look for while reading'. Why is document-first, query-last still the better architecture here?",
    options: [
      "Query-first ordering causes the API to truncate the document to fit the question",
      "Claude reads the prompt in reverse order, so the question must be last to be read first",
      "Placing the long document at the top with the query at the end both improves answer quality (up to ~30% in Anthropic's long-context testing) and keeps the large document a stable prompt prefix across questions, which is exactly what prompt caching needs to avoid reprocessing it every request",
      "Document-first ordering is required by the API whenever a document content block is used"
    ],
    answer: 2,
    explanation: "Anthropic's long-context guidance puts longform data at the top and the query at the end for quality; as a bonus, the unchanging document prefix with only the trailing question varying is the ideal shape for prompt caching, cutting cost and latency on repeat questions."
  },
  {
    id: "d4-q45",
    domain: 4,
    question: "A compliance Q&A system already instructs Claude to extract supporting quotes into <quotes> tags before answering. Auditors still find occasional answers resting on quotes that do not exist in the source. What is the right additional layer?",
    options: [
      "Raise the quote count requirement from one to five quotes per answer",
      "Ask Claude to self-certify at the end of each response that all quotes are genuine",
      "Place the quotes instruction in the system prompt, where it cannot be ignored",
      "Programmatically verify each extracted quote appears verbatim in the source document before accepting the answer, rejecting or retrying responses whose quotes do not string-match"
    ],
    answer: 3,
    explanation: "Quote-grounding reduces hallucination but the quotes themselves can be fabricated; because quotes are claimed to be word-for-word, they are cheaply machine-checkable against the source — a deterministic verification layer no amount of extra prompting can match."
  },
  {
    id: "d4-q46",
    domain: 4,
    question: "To cut perceived latency, a developer rewrites a reasoning prompt as: 'State your final answer first, then provide your step-by-step justification.' Benchmark accuracy falls back to roughly the no-CoT baseline. Why?",
    options: [
      "Generation is autoregressive: reasoning produced after the answer cannot influence the already-generated answer, so answer-first ordering forfeits the accuracy benefit of chain of thought — the reasoning becomes post-hoc rationalization",
      "The word 'justification' triggers a more conservative response mode than 'reasoning'",
      "Chain of thought only functions inside XML tags, which this prompt omitted",
      "Stating answers first doubles output tokens, and long outputs degrade accuracy"
    ],
    answer: 0,
    explanation: "CoT improves accuracy because the answer is conditioned on reasoning tokens generated before it. Reversing the order means the answer is produced without that benefit, and the trailing 'justification' merely rationalizes whatever was already emitted."
  },
  {
    id: "d4-q47",
    domain: 4,
    question: "A support-routing endpoint has a strict latency budget. Roughly 90% of tickets are trivially classifiable, but about 10% involve multi-policy edge cases where chain of thought measurably improves accuracy. What is the best engineering of this tradeoff?",
    options: [
      "Enable chain of thought on every request — accuracy always outranks latency",
      "Use a tiered approach: run a fast, no-CoT classification first and escalate only the hard or low-confidence cases to a second, CoT-enabled prompt, paying the reasoning latency only where it buys accuracy",
      "Disable CoT everywhere and raise temperature so hard cases get more varied guesses",
      "Enable CoT everywhere but set max_tokens very low so the reasoning stays short"
    ],
    answer: 1,
    explanation: "Anthropic advises applying CoT judiciously because it trades latency and tokens for accuracy; a routing/escalation design confines that cost to the minority of inputs that need it. Truncating reasoning with max_tokens risks cutting off the answer entirely."
  },
  {
    id: "d4-q48",
    domain: 4,
    question: "A chat UI streams Claude's output but parses structured CoT, displaying only the <answer> section. Users complain the answer still takes a long time to start appearing even though streaming is enabled. Why does streaming not fix this?",
    options: [
      "Streaming is incompatible with XML tags, so the SDK buffers the whole response",
      "The parser must wait for the closing </answer> tag before rendering anything",
      "Streaming changes delivery, not generation order: the <thinking> tokens are still generated before the <answer> tokens, so time-to-first-visible-token includes the full reasoning phase — the real levers are capping reasoning length or skipping CoT for easy queries",
      "Streaming increases total generation time, offsetting its delivery benefit"
    ],
    answer: 2,
    explanation: "The answer section cannot stream until the model has generated everything before it; hiding the reasoning does not make it free. Shortening the reasoning or reserving CoT for queries that need it are the levers that actually move time-to-answer. (A parser can render answer tokens as they arrive — it need not wait for the closing tag.)"
  },
  {
    id: "d4-q49",
    domain: 4,
    question: "A priority classifier is few-shot prompted with historical tickets. Every 'high priority' example happens to contain the word 'ASAP', while low-priority examples never do. In production, calm tickets about outages get labeled low priority and trivial requests saying 'ASAP' get flagged high. What went wrong?",
    options: [
      "Too few examples were used; adding more examples of any kind would fix it",
      "The labels should have been numeric, since word labels bias the model",
      "Few-shot examples cannot encode priority judgments; only fine-tuning can",
      "The examples contain a spurious correlation — a surface cue ('ASAP') perfectly predicts the label — so Claude learned the shortcut instead of the concept; examples should vary irrelevant features so only the true signal (actual impact) correlates with the label"
    ],
    answer: 3,
    explanation: "Example sets must be diverse not only across labels but across incidental features: when a superficial cue co-varies perfectly with the label, the model pattern-matches on the cue. Include high-priority examples without urgency words and low-priority ones with them."
  },
  {
    id: "d4-q50",
    domain: 4,
    question: "Few-shot examples for a routing prompt were copied from an internal dataset where each ticket body still contains an export artifact like 'queue=billing' — which matches the gold label. Offline accuracy is near-perfect; on live tickets (which have no such field) accuracy collapses. What is this failure mode?",
    options: [
      "Label leakage: the example inputs literally contain the answer, so Claude learned to read the leaked field rather than classify the content — examples must mirror real production inputs with all label-revealing artifacts stripped",
      "Catastrophic forgetting: the examples overwrote Claude's base routing knowledge",
      "Schema drift: the examples' field names no longer match the production schema",
      "Context-window overflow: the leaked fields pushed the real content out of context"
    ],
    answer: 0,
    explanation: "When example inputs embed the target label, the demonstrated task becomes 'copy the leaked field', which is unlearnable on inputs that lack it. This classic leakage pitfall also silently inflates any eval built from the same contaminated data."
  },
  {
    id: "d4-q51",
    domain: 4,
    question: "A prompt's instructions demand 'a summary of exactly five bullet points', but its three few-shot examples all show flowing two-paragraph summaries written before the instruction was added. Claude consistently produces paragraphs. What does this demonstrate?",
    options: [
      "Claude always obeys the most recent text in the prompt, so the examples must appear above the instructions",
      "Bullet formatting requires a markdown output flag that was not set",
      "When examples and instructions conflict, Claude tends to follow the demonstrated pattern — examples are a powerful format signal and must be kept consistent with the written instructions, so the fix is updating the examples to show five bullets",
      "The word 'exactly' is treated as stylistic emphasis rather than a constraint"
    ],
    answer: 2,
    explanation: "Examples are among the strongest levers on output structure; a demonstrated format typically outweighs a contradicting written rule. Audit examples whenever instructions change — stale examples silently override new requirements."
  },
  {
    id: "d4-q52",
    domain: 4,
    question: "A moderation pipeline passes stop_sequences: [\"</verdict>\", \"</escalate>\"] and branches on which sentinel ended the response. Since the matched text is not included in the output, how should the code determine which path fired?",
    options: [
      "Re-tokenize the output and infer the ending from the final tokens",
      "Read the response's stop_sequence field, which is populated with the exact matched sequence whenever stop_reason is 'stop_sequence'",
      "Compare output lengths, since '</escalate>' responses are reliably longer",
      "It cannot be determined; only a single stop sequence may be passed per request"
    ],
    answer: 1,
    explanation: "The API accepts multiple custom stop sequences and, when one triggers, sets stop_reason to 'stop_sequence' and reports the specific matched string in the response's stop_sequence field — the documented way to branch on which sentinel ended generation."
  },
  {
    id: "d4-q53",
    domain: 4,
    question: "A report generator chains four calls: summarize document A, summarize document B, summarize document C, then synthesize the three summaries. End-to-end latency is too high. Which restructuring preserves prompt-chaining benefits while cutting latency?",
    options: [
      "Merge everything into one mega-prompt, since chains are inherently slower",
      "Cache the synthesis step so the final call becomes free",
      "Reorder the chain so synthesis runs first and summaries fill in afterwards",
      "Run the three independent summarization calls in parallel, then feed all three outputs into the synthesis call — chained subtasks without data dependencies between them do not need to run sequentially"
    ],
    answer: 3,
    explanation: "Anthropic's chaining guidance includes parallelizing independent subtasks: only the synthesis step depends on the summaries, so the chain's critical path is one summary plus one synthesis, not four sequential calls."
  },
  {
    id: "d4-q54",
    domain: 4,
    question: "After a workshop on prompt chaining, a team decomposes a simple 'rewrite this paragraph more formally' feature into a six-call chain (analyze tone, plan changes, draft, critique, revise, format). Latency and cost balloon with no quality gain. What judgment error was made?",
    options: [
      "Chaining is a tool for complex multi-step workflows where single prompts drop instructions or accumulate errors; for a simple single-objective task, one well-structured prompt is faster, cheaper, and just as accurate — decomposition has overhead and should be justified by observed failures",
      "The chain was too short; self-correction requires at least eight links to converge",
      "The chain omitted a final verification call, which is mandatory in chaining",
      "Chains must always run at temperature 0, which this team forgot to set"
    ],
    answer: 0,
    explanation: "Prompt chaining trades extra calls (latency, cost, plumbing) for reliability on genuinely multi-step work. Applying it to a task a single prompt already handles buys nothing — decompose when you observe dropped instructions or compounding errors, not by default."
  },
  {
    id: "d4-q55",
    domain: 4,
    question: "A grounded Q&A system already restricts Claude to provided documents and permits 'I don't know'. Rare but costly hallucinations persist. The team wants to layer additional documented mitigations rather than replace the prompt. Which combination is the right next layer?",
    options: [
      "Remove the 'I don't know' permission, since it signals uncertainty is acceptable and thereby invites guessing",
      "Raise temperature so the model samples a wider region and averages out the fabrications",
      "Require the answer to be built from cited/quoted source passages drawn before answering, and add a verification pass — a follow-up call in which Claude checks each claim of the draft against the documents before the answer is released",
      "Replace the documents with a one-paragraph summary so there is less text to misread"
    ],
    answer: 2,
    explanation: "Hallucination mitigations compound: document restriction and 'I don't know' outs form the base, citation/quote grounding ties each claim to verifiable text, and a chain-of-thought-style verification step catches residual errors. Removing the uncertainty out or shrinking evidence increases fabrication risk."
  },
  {
    id: "d4-q56",
    domain: 4,
    question: "An assistant answers obscure factual questions correctly most of the time, but intermittently fabricates — and the fabrications are fluent and confident, so reviewers cannot spot them by tone. Which documented technique exploits the intermittent nature of these errors?",
    options: [
      "Instruct Claude to adopt a less confident writing style so fabrications sound tentative",
      "Best-of-N verification: run the same prompt multiple times and compare the answers — grounded facts tend to reproduce consistently, while hallucinated details vary across runs, flagging low-agreement answers for review",
      "Set top_k to 1 so only the single most likely token is ever produced, eliminating variation",
      "Append 'double-check your answer' so the same pass catches its own errors"
    ],
    answer: 1,
    explanation: "Anthropic lists best-of-N (self-consistency) verification among advanced hallucination mitigations: because fabrications are sampled noise rather than stable knowledge, disagreement across independent runs is a usable hallucination signal. Forcing determinism would just reproduce the same fabrication consistently."
  },
  {
    id: "d4-q57",
    domain: 4,
    question: "A prompt engineer iterates a production prompt against the same 20 hand-picked test cases until all 20 pass, then ships. Production quality drops on inputs unlike those 20. What is the flaw in this eval workflow?",
    options: [
      "The prompt was overfit to a small, static eval set — repeatedly tuning against the same cases optimizes for their quirks; the workflow needs a larger, diverse test set reflecting real input distribution (including edge cases), ideally with held-out cases not used during iteration",
      "Twenty cases is fine, but they should have been evaluated at temperature 1 for realism",
      "Prompts cannot be evaluated offline at all; only production A/B traffic is valid",
      "The engineer should have asked Claude to generate the prompt, since self-generated prompts do not overfit"
    ],
    answer: 0,
    explanation: "Just like models overfit training data, prompts overfit small fixed eval sets. Anthropic's eval guidance favors larger volumes of diverse, production-representative cases — more questions with automatable grading beats a handful of polished examples — and holding out cases preserves an honest signal."
  },
  {
    id: "d4-q58",
    domain: 4,
    question: "A team must grade 5,000 eval outputs per prompt candidate against a nuanced criterion: 'response shows empathy appropriate to the customer's frustration level'. Exact-match grading is impossible and human review of every output is unaffordable. What does Anthropic's evaluation guidance recommend?",
    options: [
      "Shrink the eval to the 50 cases humans can afford to grade, since judgment criteria require human graders",
      "Grade on response length as a proxy, since empathetic responses are longer",
      "Drop the criterion from the eval; only code-gradable properties belong in automated suites",
      "Use LLM-based grading: have a model grade each output against a detailed rubric that defines the criterion and the allowed verdicts, validate the judge's agreement with human judgment on a sample, and keep humans for spot-checks"
    ],
    answer: 3,
    explanation: "Anthropic's eval guidance orders grading methods by scalability: code-based when possible, LLM-based grading with a clear rubric for nuanced judgment criteria at scale, and human grading as the slow, expensive last resort — with the LLM judge itself validated against human spot-checks."
  },
  {
    id: "d4-q59",
    domain: 4,
    question: "A heavily-tuned production prompt performs well on the current Claude model. The platform team wants to swap in a newer model version during a routine dependency bump, arguing 'newer models are strictly better, so the prompt can only improve'. What is the correct production practice?",
    options: [
      "Proceed — model upgrades are backward-compatible by design, so prompt behavior is preserved",
      "Treat the model change like any prompt change: run the full evaluation suite against the new model before cutover, because prompt behavior is model-sensitive and instructions tuned around one model's quirks can regress on another despite higher general capability",
      "Pin temperature to 0 during the swap; determinism guarantees identical behavior across model versions",
      "Re-run only the eval cases that failed historically, since passing cases cannot regress"
    ],
    answer: 1,
    explanation: "A prompt is tuned to a specific model's behavior; a more capable model can still interpret the same instructions differently. Anthropic's production guidance is to validate model migrations empirically with the same eval rigor as prompt changes — temperature 0 does not guarantee determinism, let alone cross-model equivalence."
  },
  {
    id: "d4-q60",
    domain: 4,
    question: "An extraction service uses structured outputs with a strict JSON schema and temperature 1. Every response parses and validates, yet the same invoice extracted twice yields different values in fields like 'category' and 'notes'. The team is confused because 'the schema is enforced'. What should they understand?",
    options: [
      "Structured outputs ignore the temperature parameter, so something else causes the variance",
      "The schema must additionally declare each field as 'deterministic: true' to lock values",
      "Schema enforcement constrains the FORM of the output (types, fields, enums), not the CONTENT chosen within it — sampling parameters still govern which valid values are generated, so an extraction task wanting run-to-run consistency should use a low temperature alongside the schema",
      "Valid JSON at temperature 1 is a bug; schema enforcement is documented to require temperature 0"
    ],
    answer: 2,
    explanation: "Structured outputs guarantee the response conforms to the schema, but within that grammar the model still samples: at high temperature, different valid field values can be chosen on identical input. Guaranteed structure and consistent content are separate levers — the latter is controlled by sampling settings like temperature."
  }
);
