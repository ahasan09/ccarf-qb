// Domain 4 — multiple-response questions (select two), 8 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d4-m01",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "A contract-review assistant is asked to \"flag any clause that looks risky.\" Legal reviewers report that roughly half the flags are not actually risky, and they are losing trust in the tool. Which TWO prompt changes most directly reduce the false-positive rate? (Select TWO.)",
    options: [
      "Replace the vague instruction with an enumerated definition of what counts as risky, paired with an explicit list of clause types that must not be flagged",
      "Add \"CRITICAL: you MUST flag anything that could conceivably be a problem\" so the model takes the task seriously",
      "Require the model to return, for each flag, the verbatim clause text it relies on and which named criterion that text satisfies",
      "Set temperature to 0 so the classifier becomes deterministic and stops producing false positives",
      "Raise the effort level and let the model think longer, on the assumption that deeper reasoning will naturally sharpen the judgment"
    ],
    answers: [0, 2],
    explanation: "Precision problems are usually definition problems: an enumerated inclusion list plus an explicit exclusion list turns \"looks risky\" into a decision the model can apply consistently, and it directly removes the categories that produce the observed false positives. Requiring a verbatim supporting quote and the named criterion each flag satisfies makes every flag auditable and lets the pipeline reject findings whose cited text does not actually support them. Emphatic language like \"CRITICAL: you MUST flag anything\" pushes the model toward over-triggering — exactly the wrong direction — because current models follow such instructions literally. Temperature is not a precision control (and non-default sampling parameters are rejected outright on current frontier models), and raising effort buys deeper reasoning against the same ambiguous criteria, not better criteria."
  },
  {
    id: "d4-m02",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "An adverse-event detector over clinical notes is producing too many flags. Error analysis shows most false positives fall into two recurring buckets: pre-existing conditions mentioned in patient history, and hypothetical statements such as \"watch for dizziness.\" Which TWO changes best address this? (Select TWO.)",
    options: [
      "Add \"IMPORTANT: NEVER miss an adverse event — when in doubt, flag it\" to the system prompt",
      "State explicitly that pre-existing conditions in the history section and hypothetical or cautionary statements do not count as adverse events, with a short example of each non-match",
      "Have the model emit a 0–100 severity score and discard everything below 50, using the score as the precision control",
      "Add a tie-breaking default rule for genuinely ambiguous text — for example, if the note does not assert that the event actually occurred, do not flag it",
      "Switch to a larger, more capable model and keep the existing prompt unchanged"
    ],
    answers: [1, 3],
    explanation: "Error analysis has already named the two false-positive categories, so writing them into the prompt as explicit non-matches — with a short labeled example of each — attacks the measured failure directly. A stated tie-breaking default (\"if occurrence is not asserted, do not flag\") resolves genuinely borderline notes the same way every run instead of leaving the call to chance. The \"when in doubt, flag it\" line deliberately trades precision for recall and will increase the very over-flagging being reported. A self-reported severity score is not a calibrated probability of correctness and cannot be trusted as a cutoff until it is validated against labeled data, and swapping in a bigger model leaves the ambiguous criteria — the actual defect — untouched."
  },
  {
    id: "d4-m03",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "A support-ticket categorizer produces inconsistent output: field ordering drifts between runs and several categories are confused with each other. The team wants to add few-shot examples. Which TWO practices will most improve consistency and quality? (Select TWO.)",
    options: [
      "Choose examples that cover the confusable categories and the edge cases the model currently gets wrong, rather than only clean canonical tickets",
      "Include exactly one \"gold\" exemplar, because additional examples dilute the signal the model keys on",
      "Place the examples as a trailing assistant turn that the model continues, so it naturally extends the established pattern",
      "Regenerate the example set from the live ticket database on every request so the examples always reflect current data",
      "Format every example's output exactly as the production format requires, since the model mirrors the structure, length, and tone of the examples it is shown"
    ],
    answers: [0, 4],
    explanation: "Few-shot examples are most valuable where the decision boundary is hard, so covering the confusable categories and known edge cases teaches the distinctions the model is currently missing. Because examples are the strongest format signal in a prompt — the model matches their structure, length, and tone — writing each example's output in the exact production format fixes the field-ordering drift. A single gold exemplar is an anti-pattern: it over-indexes on one shape and generalizes poorly, so several deliberately varied examples work better. Trailing assistant-turn prefills return a 400 on current Opus- and Sonnet-tier models, and regenerating examples per request changes the prompt prefix every time, destroying prompt-cache reuse for no quality gain."
  },
  {
    id: "d4-m04",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "A team needs an extraction endpoint whose responses always parse against a fixed JSON schema, and they also want one tool call whose arguments are guaranteed valid. Which TWO statements about enforcing structured output are correct? (Select TWO.)",
    options: [
      "Prefilling the assistant turn with an opening brace is the supported way to force JSON on current models",
      "Passing the schema as a top-level `output_format` parameter on `messages.create()` is the current, recommended form",
      "Setting `strict: true` on the tool definition guarantees that `tool_use.input` validates against the schema, which must declare `additionalProperties: false` and list its `required` fields",
      "Constraining the response with `output_config.format` using a `json_schema` is the supported mechanism, and SDK helpers such as `messages.parse()` validate the response against the schema for you",
      "Once a schema is attached, the response is guaranteed to conform even when the model refuses the request or hits the `max_tokens` ceiling"
    ],
    answers: [2, 3],
    explanation: "`output_config.format` with a `json_schema` is the supported way to constrain the response shape, and the SDK `parse()` helpers validate the returned payload against that schema automatically. Separately, `strict: true` is a top-level field on a tool definition that guarantees the tool's `input` validates exactly, which is why the schema must set `additionalProperties: false` and enumerate `required`. Assistant-turn prefilling is not a workaround here — it returns a 400 on current Opus- and Sonnet-tier models — and the top-level `output_format` parameter is deprecated in favor of `output_config.format`. The last option is the most dangerous misconception: a safety refusal (`stop_reason: \"refusal\"`) or a `max_tokens` cutoff can still yield output that does not match the schema, so callers must check `stop_reason` before parsing."
  },
  {
    id: "d4-m05",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "An engineer ports an existing JSON Schema into a structured-output call. The schema uses `minimum`/`maximum` on numbers, `minLength` on strings, and a `$ref` that points back at its own definition to model a nested comment tree. Which TWO statements accurately describe what will happen? (Select TWO.)",
    options: [
      "Setting `additionalProperties: true` is acceptable as long as every property is also listed in `required`",
      "Numeric and string constraints such as `minimum`, `maximum`, and `minLength` are not enforced by structured outputs; the Python and TypeScript SDKs strip them from the submitted schema and validate them client-side",
      "Recursive schemas are not supported, so the self-referential comment tree must be flattened to a bounded depth or validated outside the structured-output mechanism",
      "Attaching the schema makes the call incompatible with streaming and with the Batches API",
      "Enabling citations alongside `output_config.format` yields cited output that still conforms to the schema"
    ],
    answers: [1, 2],
    explanation: "Structured outputs support the core JSON Schema vocabulary — basic types, `enum`, `const`, `anyOf`, `$ref`/`$defs`, and the listed string formats — but numeric and string constraints like `minimum`, `maximum`, and `minLength` are not enforced; the Python and TypeScript SDKs remove them from the schema they submit and check them client-side instead. Recursive schemas are explicitly unsupported, so a self-referential comment tree has to be flattened to a fixed depth or validated separately after parsing. `additionalProperties` must be `false` on every object — listing properties in `required` does not relax that. Structured outputs do work with streaming, the Batches API, token counting, and extended thinking; the real incompatibilities are citations (which returns a 400) and message prefilling."
  },
  {
    id: "d4-m06",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "A document-extraction service validates every model response against a schema and a set of business rules, then retries failures. The current loop resends the identical prompt until the output validates. Which TWO changes make the loop sound? (Select TWO.)",
    options: [
      "Retry until the output validates, with no attempt cap, since model output is nondeterministic and will eventually pass",
      "Skip validation entirely for any field where the model self-reports confidence above 0.9, treating that score as a calibrated probability of correctness",
      "Re-prompt rather than post-process whenever a value is merely mis-formatted, so the model learns the correct format",
      "Attach the specific validation error — which field failed and why — to the retry, instead of resending the identical prompt",
      "Cap retries at a small fixed number and route items that exhaust the budget to a human review queue with the failure reason recorded"
    ],
    answers: [3, 4],
    explanation: "A retry carries new information only if the model is told what went wrong, so attaching the failing field and the reason converts a blind resend into an actual feedback loop. Pairing that with a small retry cap and a human-review fallback bounds cost and latency while ensuring nothing silently disappears when the model cannot recover. Unbounded retries are the classic failure mode here: a systematically impossible extraction — a value genuinely absent from the document — will never validate, so the loop burns tokens forever. Self-reported confidence is not a calibrated probability and must be checked against labeled data before it gates anything, and mechanical formatting fixes such as date normalization belong in deterministic post-processing code, which is cheaper, faster, and more reliable than another model call."
  },
  {
    id: "d4-m07",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "A team must classify 80,000 archived documents overnight against a large shared system prompt, and is considering the Message Batches API. Which TWO statements about this design are correct? (Select TWO.)",
    options: [
      "Results may come back in any order, so each result must be matched to its request by `custom_id` rather than by position in the output",
      "Batch requests are processed asynchronously at 50% of standard token prices; the job is polled until `processing_status` reaches `\"ended\"`, then the results are streamed",
      "Prompt caching cannot be combined with the Batches API, so the shared system prompt will be billed at full price on all 80,000 requests",
      "Batching is also the right choice for the team's interactive user-facing endpoint, since the same 50% discount applies there",
      "The Batches API guarantees completion within five minutes, so the overnight window is unnecessary"
    ],
    answers: [0, 1],
    explanation: "Batch results are not returned in submission order, so the only safe way to reassemble them is to key on the `custom_id` supplied with each request — indexing by position silently misattributes results. The workflow itself is create, poll `processing_status` until it is `\"ended\"`, then stream the results, and the whole job bills at 50% of standard token prices. Prompt caching does work inside batches, which is exactly what makes a large shared system prefix across 80,000 requests affordable. The remaining options invert the trade-off batching exists for: it is asynchronous and therefore unsuitable for an interactive latency-sensitive endpoint, and most batches finish within an hour with a 24-hour maximum — there is no five-minute guarantee."
  },
  {
    id: "d4-m08",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "A regulatory-filing pipeline extracts obligations from long documents, and the compliance team wants a review architecture that catches extraction errors before anything reaches the register. Which TWO design choices best serve that goal? (Select TWO.)",
    options: [
      "Run three passes with identical prompts and take the majority answer, which removes hallucinated obligations entirely",
      "Keep the review pass in the same conversation as the extraction so the reviewer can see the extractor's earlier reasoning and build on it",
      "Run the review as a separate call with fresh context, giving the verifier the source document and the candidate extraction and asking it to check each claim against the source",
      "Switch the main loop to a different model for the review turn, relying on the conversation's prompt cache to keep the second pass cheap",
      "Use a cheaper, faster model for the high-volume extraction pass and reserve the more capable model for adjudicating only the items the verifier disputes"
    ],
    answers: [2, 4],
    explanation: "Independence is what makes a second pass worth paying for: a verifier in a fresh context, handed the source and the candidate output, evaluates the claims on their merits instead of rationalizing work it already produced. Tiering the models — a cheap model on the high-volume extraction pass, the expensive one only on disputed items — concentrates capability where judgment is actually needed and keeps the architecture affordable at scale. Keeping the review inside the same conversation destroys that independence, since the reviewer sees and tends to agree with its own prior reasoning. Majority voting across identical prompts reduces variance but does not eliminate hallucination — correlated errors survive every vote — and switching models mid-conversation invalidates the prompt cache entirely, because caches are scoped per model."
  }
);
