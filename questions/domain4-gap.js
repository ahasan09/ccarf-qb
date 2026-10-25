// Domain 4 gap set — 6 questions (4.4 ×3, 4.5 ×3)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d4-q61",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "An invoice-extraction pipeline pulls dates that are factually correct but arrive in mixed formats ('03/15/2026', 'March 15, 2026'), while the downstream database requires ISO 8601. Validation currently flags about 20% of records for this reason alone, and an engineer proposes re-prompting each flagged record with the validation error attached. What is the most appropriate design?",
    options: [
      "Re-prompt every flagged record with the error message appended, since retry-with-feedback is the standard remedy for any validation failure",
      "Route all format-flagged records to a human review queue, since date handling is too risky to automate",
      "Normalize the date formats deterministically in post-processing code (and constrain the format in the schema or prompt), reserving retry-with-feedback for errors that require the model's judgment",
      "Lower the validation strictness so mixed formats pass, and let the database layer reject them later"
    ],
    answer: 2,
    explanation: "A deterministic, mechanical transformation like date normalization is cheaper, faster, and more reliable in code than in another model call. Re-prompting should be reserved for failures that need the model to re-read the source — such as a missing or misattributed value — not for formatting issues code can fix in microseconds at zero cost."
  },
  {
    id: "d4-q62",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "A claims-processing pipeline has the model emit a per-field confidence score and routes any field below a threshold to human review. The product manager proposes setting the threshold to 0.8 because it 'feels about right.' What is the soundest way to choose the threshold?",
    options: [
      "Run the extractor on a labeled sample, measure how self-reported confidence correlates with actual field accuracy, and pick the threshold that meets the target error rate within the team's review capacity",
      "Set the threshold to 1.0 so only fields the model is certain about skip review, guaranteeing zero extraction errors reach production",
      "Accept 0.8 as-is, because LLM confidence scores are inherently well-calibrated probabilities of correctness",
      "Remove confidence scoring entirely and instead run every extraction twice, accepting a field only when both runs agree"
    ],
    answer: 0,
    explanation: "Self-reported LLM confidence is not guaranteed to be a calibrated probability, so a threshold is meaningful only after it is validated against ground truth. Measuring accuracy versus reported confidence on a labeled sample lets the team place the cutoff where the observed error rate and human-review workload are both acceptable."
  },
  {
    id: "d4-q63",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "An extraction pipeline already uses structured outputs, so every response is guaranteed to parse and conform to the JSON schema. The team now wants to add a second LLM call whose prompt asks it to 'verify the output is valid JSON with correctly typed fields.' How should the validation budget be spent instead?",
    options: [
      "Keep the proposed LLM check, since independent model verification of JSON validity catches parser bugs the schema layer misses",
      "Replace the schema guarantee with the LLM verifier, since one validation layer is enough and the model check is more flexible",
      "Add a third LLM verifier as well, since stacking identical checks multiplies reliability",
      "Use deterministic code for checks code can express (cross-field arithmetic, enum membership, presence of extracted values in the source text), and reserve any second model pass for semantic judgments code cannot make"
    ],
    answer: 3,
    explanation: "Structured outputs already guarantee syntactic validity, so an LLM re-checking JSON well-formedness adds cost and nondeterminism while verifying nothing new. Deterministic validators should own everything code can check, leaving model-based verification for genuinely semantic questions, such as whether an extracted clause faithfully reflects the source."
  },
  {
    id: "d4-q64",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "A team submits a Message Batch of 8,000 contract-review requests. Each request contains the same 40,000-token regulatory guide plus one unique contract. To maximize prompt-cache savings within the batch job, how should the requests be structured?",
    options: [
      "Prepend each contract's unique ID and submission timestamp to the system prompt so results are traceable, then add cache_control at the end of the request",
      "Give every request a byte-identical prefix — the regulatory guide in shared system blocks with cache_control on the last shared block — and place the unique contract after that breakpoint",
      "Skip caching configuration entirely, because prompt caching is not supported inside the Batches API",
      "Place cache_control on the final content block of each complete request so the entire prompt, contract included, is cached"
    ],
    answer: 1,
    explanation: "Caching is a prefix match, so the shared guide must be byte-identical across requests with the breakpoint at the end of the shared portion and the varying contract after it; per-request IDs or timestamps in the prefix would invalidate every entry. Prompt caching is supported in batches, though hits are best-effort because batch requests process concurrently — the shared-prefix structure still captures most of the savings."
  },
  {
    id: "d4-q65",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "A team must classify 40,000 short support tickets in a nightly Message Batch. An engineer proposes packing 50 tickets into each request so the shared classification instructions are not repeated 40,000 times. What tradeoff should drive the decision?",
    options: [
      "Packing is strictly better: fewer requests always means lower total token cost and the Batch API bills per request",
      "Packing is required, because the Batches API rejects batches with more than 10,000 individual requests",
      "One ticket per request preserves per-item custom_id tracking, failure isolation, and independent retries, while prompt caching of the shared instructions makes the repeated prefix cheap — so packing buys little and couples failures and output quality across unrelated tickets",
      "One ticket per request is mandatory because a single response cannot contain classifications for multiple items"
    ],
    answer: 2,
    explanation: "With one item per request, each ticket gets its own custom_id, its own result status, and can be retried alone, and a cached shared prefix largely neutralizes the repeated-instructions cost that motivated packing. Packing many items into one prompt means one error or truncation affects 50 tickets and quality can degrade on items deep in the list; the 40,000 count is also well within the 100,000-request batch limit."
  },
  {
    id: "d4-q66",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "When a document arrives, a latency-sensitive service fans out 60 parallel real-time requests that share an identical 30,000-token system prompt marked with cache_control (the Batch API is ruled out by the latency requirement). Usage data shows all 60 requests paying full input price, with many reporting cache_creation_input_tokens. What is the cause and fix?",
    options: [
      "A cache entry only becomes readable after the first response begins streaming, so simultaneous requests all miss; send one request first, wait for its first streamed token, then fire the remaining 59 so they read the cache that request just wrote",
      "Prompt caching is disabled whenever more than 10 concurrent requests share a prefix; reduce the fan-out to 10 requests per wave",
      "The 30,000-token prompt exceeds the maximum cacheable prefix size; split the system prompt into smaller blocks under the limit",
      "cache_control only works on user messages, not system blocks; move the shared prompt into the first user turn"
    ],
    answer: 0,
    explanation: "A cache entry is written when the first response starts streaming, so N truly simultaneous requests with the same prefix cannot read what the others are still writing and each pays the full (or write-premium) price. Staggering the fan-out — one warm-up request, then the rest after its first token arrives — lets the remaining requests hit the freshly written cache at roughly one-tenth the input cost."
  }
);
