// Domain 5: Context Management & Reliability — set 2, 18 questions (harder)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d5-q28",
    domain: 5,
    question: "A service sends requests that share a large 80K-token preamble (instructions plus reference documents) followed by a different user question each time. The developer places the cache_control breakpoint on the final content block of each request. Cache writes occur on every request but reads stay near zero. What is the correct fix?",
    options: [
      "Add a second breakpoint on the first content block so both ends of the prompt are cached",
      "Move the breakpoint to the last block of the shared preamble, so the stable prefix is cached and the varying question falls after it",
      "Switch the breakpoint TTL from 5 minutes to 1 hour so entries survive long enough to be read",
      "Enable automatic top-level cache_control, which hashes each block independently of position"
    ],
    answer: 1,
    explanation: "Caching is an exact prefix match up to the breakpoint. A breakpoint after the varying question makes every request a unique prefix — each one writes a fresh entry that no later request can match. Placing it at the end of the shared preamble caches exactly the reusable portion; TTL and block count are not the problem."
  },
  {
    id: "d5-q29",
    domain: 5,
    question: "A support tool with a 60K-token cached system prompt receives one request roughly every 20 minutes throughout the day. Cache reads are always zero and every request bills cache_creation_input_tokens. Given that the 5-minute-TTL write costs 1.25x and the 1-hour-TTL write costs 2x base input price, what should the team do?",
    options: [
      "Remove cache_control entirely — with reads at zero, caching can never be cheaper than the 1x base rate",
      "Keep the 5-minute TTL but send each request twice so the second copy reads the cache",
      "Shorten the system prompt below the cacheable minimum so the write premium stops applying",
      "Switch the breakpoint to ttl: \"1h\" — the 5-minute entry expires between 20-minute-apart requests, so every request pays the write premium with no reads"
    ],
    answer: 3,
    explanation: "The 5-minute TTL (refreshed on use) expires during the 20-minute gaps, so each request re-writes at 1.25x and never reads — strictly worse than not caching. A 1-hour TTL costs 2x on the first write but then serves ~0.1x reads for subsequent requests within the hour, which is cheaper for this traffic pattern. Duplicating requests or removing caching both cost more."
  },
  {
    id: "d5-q30",
    domain: 5,
    question: "A team worries that any parameter change destroys their prompt cache. They vary tool_choice per request (forcing a specific tool on some turns) on a conversation with cached tools, system prompt, and history. Which statement correctly describes the cache impact?",
    options: [
      "Changing tool_choice invalidates only the message-level cache; the tools and system prompt caches remain valid, whereas editing the tool definitions themselves would invalidate everything",
      "Any request-parameter change, including tool_choice, invalidates the entire cache because the full request is hashed",
      "tool_choice changes invalidate nothing because it is not part of the prompt at all",
      "tool_choice changes invalidate the tools cache but preserve the message history cache"
    ],
    answer: 0,
    explanation: "Cache invalidation is hierarchical: tool_choice (like image presence or toggling thinking) only breaks cached message content, leaving the tools and system tiers intact, while changes to tool definitions or the model sit at the front of the prefix and invalidate everything downstream. Not all parameter changes are equal."
  },
  {
    id: "d5-q31",
    domain: 5,
    question: "An assistant has a stable 100K-token prefix and serves a steady stream of requests a few minutes apart (within the refreshed 5-minute TTL). Over 20 requests, roughly what does caching cost on that prefix relative to sending it uncached 20 times?",
    options: [
      "About 50% — caching halves input cost like the Batch API",
      "Slightly more than uncached, because the 1.25x write premium applies to every request",
      "Roughly 15% — one write at 1.25x plus 19 reads at ~0.1x (~3.15 request-equivalents) versus 20 full-price passes",
      "Effectively free after the first request, since cache reads are not billed"
    ],
    answer: 2,
    explanation: "The write premium applies only when an entry is created: 1 × 1.25x + 19 × ~0.1x ≈ 3.15 request-equivalents against 20 uncached, an ~84% saving on the prefix. Reads are cheap but not free, and the write premium is not paid on every request when the TTL keeps being refreshed."
  },
  {
    id: "d5-q32",
    domain: 5,
    question: "A fan-out pipeline fires 50 parallel requests that all share an identical 40K-token cached prefix. Billing shows all 50 paid the full cache-write price with zero reads, even though the breakpoint is correctly placed. Why, and what is the fix?",
    options: [
      "Parallel requests are routed to different regions with separate caches; pin all requests to one region",
      "A cache entry only becomes readable once the first response begins; the parallel requests all missed it — send one warm-up request, wait for it to start streaming, then fire the remaining 49",
      "Prompt caching is disabled for concurrent requests; serialize all 50 requests completely",
      "The 4-breakpoint limit was exceeded across the batch of concurrent requests"
    ],
    answer: 1,
    explanation: "A cache entry is written as the first request processes and only becomes available once that response starts; simultaneous identical requests cannot read what is still being written. Sending one request first, awaiting its first streamed token, then fanning out lets the other 49 read the fresh entry. Full serialization works but sacrifices far more parallelism than necessary."
  },
  {
    id: "d5-q33",
    domain: 5,
    question: "A developer adds cache_control to a ~500-token system prompt. There is no error, but both cache_creation_input_tokens and cache_read_input_tokens remain 0 on every request. What is happening?",
    options: [
      "The request is silently falling back to a model that does not support caching",
      "cache_control on system blocks requires a beta header; without it the field is ignored",
      "The prompt is below the model's minimum cacheable prefix length (around 1024 tokens on most models), so the breakpoint is silently ignored — no entry is written and no error is raised",
      "Caching only activates once the same prefix has been seen at least twice"
    ],
    answer: 2,
    explanation: "Each model has a minimum cacheable prompt length (about 1024 tokens for most current models, higher on some); shorter prefixes are simply not cached, with no error — the usage fields just stay at zero. The fix is to accept it (the saving would be tiny) or grow the stable prefix past the minimum."
  },
  {
    id: "d5-q34",
    domain: 5,
    question: "An agent makes a burst of tool calls, adding roughly 35 content blocks (tool_use/tool_result pairs) in a single turn, with the cache breakpoint on the newest block. The next request unexpectedly misses the cache despite an unchanged prefix. What is the most likely cause?",
    options: [
      "The breakpoint's backward search for a prior cache entry covers only about 20 content blocks, so a turn that adds 35 blocks leaves the previous entry out of range — add an intermediate breakpoint partway through long turns",
      "Tool_result blocks are never cacheable, so turns containing them cannot extend the cache",
      "The 5-minute TTL expired during the burst of tool calls",
      "Each tool call consumed one of the 4 allowed breakpoints, exhausting the quota"
    ],
    answer: 0,
    explanation: "Cache lookups walk back a bounded number (~20) of content blocks from each breakpoint to find an existing entry; a single turn appending more than that strands the previous entry outside the lookback window and causes a silent miss. Placing an intermediate breakpoint every ~15 blocks in tool-heavy turns keeps entries reachable."
  },
  {
    id: "d5-q35",
    domain: 5,
    question: "A long-running research agent must keep its context from overflowing, but auditors require that the exact, verbatim output of any earlier tool call be retrievable later in the session on demand. Which context-management strategy satisfies both constraints?",
    options: [
      "Enable context editing to clear old tool results — the API archives cleared content for later retrieval",
      "Rely on server-side compaction, since the generated summary preserves all details of earlier tool outputs",
      "Raise max_tokens so the model can restate earlier tool outputs from memory when asked",
      "Persist each tool result verbatim to external storage (e.g., files via a memory-style tool), then clear or summarize it from context, reloading the stored copy only when needed"
    ],
    answer: 3,
    explanation: "Context editing deletes cleared content outright and compaction replaces history with a lossy summary — neither can reproduce verbatim tool output afterwards. Writing results to an external store before trimming context gives bounded context plus exact retrieval; max_tokens governs output size, not input capacity, and model recall is not verbatim."
  },
  {
    id: "d5-q36",
    domain: 5,
    question: "A product answers ~20,000 independent single-turn questions per day against a stable 400K-token knowledge base. The chosen model's context window fits the whole base, and each question is typically answerable from about 3K tokens of it. Which architecture is most cost-effective?",
    options: [
      "Send the full 400K tokens with a cache breakpoint — cached input is effectively free, so retrieval adds nothing",
      "RAG: even at ~0.1x cached-read pricing, every query would still bill roughly 40K token-equivalents for the 400K-token prefix, versus ~3K full-price tokens for retrieved passages — an order of magnitude cheaper per query, with lower latency",
      "Fine-tune the model on the knowledge base so no context is needed at inference time",
      "Split each question into 100 parallel sub-queries over 4K-token shards and merge the answers"
    ],
    answer: 1,
    explanation: "Fitting in the context window does not make sending everything optimal: cache reads cost ~0.1x base input, so a 400K cached prefix still bills ~40K token-equivalents per request — more than 10x the ~3K tokens RAG sends at full price, before counting latency from processing the huge prefix. Long-context stuffing wins for deep cross-document reasoning, not for high-volume narrow lookups."
  },
  {
    id: "d5-q37",
    domain: 5,
    question: "A summarization pipeline on a 200K-context model assembles prompts of about 195K tokens and sets max_tokens to 20,000. Requests start failing or outputs terminate early. What design principle was violated?",
    options: [
      "Input tokens and the requested output budget share the same context window — the prompt must leave headroom for max_tokens, validated up front with the token counting endpoint",
      "max_tokens above 8,192 requires the Batch API, which has no context ceiling",
      "The 200K window applies per message, not per request, so the prompt should be split across multiple messages",
      "Output tokens are tracked in a separate window, so the failures must come from rate limiting instead"
    ],
    answer: 0,
    explanation: "The context window bounds input plus generated output together: 195K of input plus a 20K output budget exceeds 200K, so the request is rejected or the generation is cut short at the window. Correct budgeting counts the prompt (tools, system, history) with count_tokens and reserves output headroom before sending."
  },
  {
    id: "d5-q38",
    domain: 5,
    question: "A fleet of 200 identical workers hits a shared rate limit at the same moment. Every worker implements exponential backoff with the exact same deterministic schedule (1s, 2s, 4s, ...). The 429s keep recurring in synchronized waves. What is the missing ingredient?",
    options: [
      "Longer base delays — doubling the initial wait to 2 seconds desynchronizes the fleet",
      "Switching from exponential to linear backoff, which spreads retries more evenly",
      "Randomized jitter on each retry delay — deterministic schedules keep all 200 workers retrying in lockstep, re-saturating the limit on every wave",
      "Retrying immediately without delay so requests drain before the next window"
    ],
    answer: 2,
    explanation: "Exponential backoff spaces retries out in time but, without randomness, every client that failed together retries together, recreating the burst at each step. Adding jitter spreads the retry instants across the window so aggregate load stays under the limit; changing the base delay or curve alone leaves the fleet synchronized."
  },
  {
    id: "d5-q39",
    domain: 5,
    question: "During a regional traffic surge, a team sees intermittent HTTP 529 responses and proposes upgrading their usage tier to raise their rate limits. Why is this proposal misguided?",
    options: [
      "It isn't — 529 indicates the organization's tier quota is exhausted, so a tier upgrade is the direct fix",
      "529 signals temporary overload of the service itself, not the caller's quota — higher per-org limits won't prevent it; the right responses are backoff with retries, smoothing or queueing load, and optionally shifting some traffic to a less-loaded model",
      "529 means the request payload exceeded size limits, which tiers do not affect",
      "529 responses are only returned to free-tier accounts, so any paid tier eliminates them"
    ],
    answer: 1,
    explanation: "429 reflects your organization's rate limits and can be addressed by tier or quota changes; 529 (overloaded_error) reflects capacity pressure on the API itself and is independent of your limits. Mitigation is client-side resilience — backoff, queueing, load spreading, fallbacks — not purchasing more quota."
  },
  {
    id: "d5-q40",
    domain: 5,
    question: "A document pipeline sustainably generates requests at about twice its organization's tokens-per-minute limit for several hours each night. Retries with backoff are already implemented, yet throughput thrashes and 429s are constant. What architectural change actually fixes this?",
    options: [
      "Raise max_retries from 2 to 10 so the SDK eventually pushes every request through",
      "Increase request concurrency so more requests land in each rate-limit window",
      "Disable the SDK's built-in retries so failed requests stop consuming quota",
      "Add client-side admission control — a queue with rate shaping (e.g., token bucket sized to the TPM limit) that feeds work at a sustainable pace, with the backlog absorbing the burst"
    ],
    answer: 3,
    explanation: "Retries are a remedy for transient spikes; when offered load persistently exceeds the limit, retrying just recycles the same excess traffic and wastes attempts. A queue with rate shaping keeps the request rate at or below the limit and lets the nightly backlog drain smoothly — alternatively paired with a tier increase, but more retries or concurrency only worsen the thrash."
  },
  {
    id: "d5-q41",
    domain: 5,
    question: "An architect proposes the Message Batches API for a document-intake flow where each uploaded file must be classified and the result shown to the uploading user within about a minute. Which constraint makes the Batch API unsuitable here?",
    options: [
      "Batches offer no per-request latency guarantee — most complete within an hour and processing can take up to 24 hours, so a ~1-minute per-item SLA cannot be met; use synchronous Messages API calls instead",
      "The Batch API only accepts batches of at least 10,000 requests",
      "Batch results are returned without identifiers, making per-user routing impossible",
      "The Batch API does not support classification-style prompts, only summarization"
    ],
    answer: 0,
    explanation: "Batch processing trades latency for a 50% price cut: results arrive when the whole batch is processed, typically under an hour but with no per-item deadline short of the 24-hour ceiling. Interactive, user-facing SLAs need synchronous calls; batch size minimums and prompt-type restrictions in the distractors are invented, and results do carry custom_id."
  },
  {
    id: "d5-q42",
    domain: 5,
    question: "A nightly batch of 60,000 requests reaches processing_status \"ended\". The engineer marks the whole job successful and ingests the output stream directly. What risk does this miss?",
    options: [
      "\"ended\" is only an estimate; the client must wait an additional 24 hours before results are final",
      "Results are deleted the moment the batch ends, so they must be streamed during processing",
      "\"ended\" means processing finished, not that every request succeeded — individual results can be errored, canceled, or expired, so the client must inspect each result's type (keyed by custom_id) and re-handle failures, e.g., resubmitting expired items",
      "Ended batches automatically retry their failed requests, so no client handling is needed"
    ],
    answer: 2,
    explanation: "A batch ends when every request has reached a terminal state — which includes errored, canceled, and expired outcomes alongside succeeded ones. Robust consumers check request_counts and each result's type, resubmitting expired items and fixing invalid ones; results remain downloadable for 29 days after creation, so there is no need to race deletion."
  },
  {
    id: "d5-q43",
    domain: 5,
    question: "A streaming request begins delivering tokens normally, then the stream terminates with an overloaded error event after several hundred tokens have arrived. How should a well-built client handle this?",
    options: [
      "Treat the received tokens as the complete response, since the HTTP connection was successfully established",
      "Treat it as a retryable failure: discard or clearly flag the partial output, then retry the full request with backoff — mid-stream errors can occur even after a 200 response has started delivering events",
      "Append the partial text as an assistant message and send \"continue\" to resume generation at no extra cost",
      "Mark the request permanently failed, since errors after streaming begins are never retryable"
    ],
    answer: 1,
    explanation: "With SSE, the 200 status arrives before generation finishes, so transient failures can surface as error events mid-stream; the partial text is incomplete and should not be presented as a final answer. Overload errors are retryable with backoff — the retry is a fresh request billed normally, and naive 'continue' stitching risks duplicated or inconsistent output."
  },
  {
    id: "d5-q44",
    domain: 5,
    question: "A team is building an automated eval suite for a support assistant where answer quality is subjective (tone, helpfulness, correctness against policy). Which grading design is most sound?",
    options: [
      "Combine graders by type: deterministic code checks for objective properties (format, required fields, forbidden claims) plus an LLM-as-judge with an explicit rubric for subjective dimensions, validated by spot-checking judge scores against human labels — and grow the set with failures captured from production",
      "Use exact string matching against one golden answer per test case, since LLM judges are inherently unreliable",
      "Have the assistant grade its own responses in the same conversation to avoid a second model call",
      "Skip offline evals entirely and rely on end-user thumbs-up/down as the only quality signal"
    ],
    answer: 0,
    explanation: "Objective properties belong in cheap deterministic checks, while subjective quality needs an LLM judge given a concrete rubric — and the judge itself must be calibrated against human judgment to be trusted. Seeding the regression set with real production failures keeps the suite representative; exact-match grading fails on valid paraphrases, and in-conversation self-grading is biased."
  },
  {
    id: "d5-q45",
    domain: 5,
    question: "The morning after a routine deploy, dashboards show input-token spend up ~4x and p95 latency up sharply, with no change in traffic volume. Usage logs show cache_read_input_tokens collapsed to near zero while cache_creation_input_tokens spiked. What most likely happened?",
    options: [
      "Anthropic flushed its caches overnight; costs will self-correct and no action is needed",
      "The rate limiter began rejecting cached requests, forcing them through the uncached path",
      "The deploy raised max_tokens, which increases input-token billing proportionally",
      "The deploy altered the prompt prefix — e.g., reordered or edited tools, changed the system prompt, or introduced a per-request dynamic value — invalidating the cache so every request re-processes and re-writes the previously cached prefix at full/write cost"
    ],
    answer: 3,
    explanation: "Reads collapsing to zero while writes spike is the fingerprint of a prefix change: the old entries no longer match, so each request pays full processing plus the write premium on the big prefix, raising both cost and latency. Diffing the rendered prompts before and after the deploy locates the invalidator; max_tokens affects output billing, not input, and caches don't silently vanish fleet-wide by coincidence."
  }
);
