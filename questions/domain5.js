// Domain 5: Context Management & Reliability — 27 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d5-q01",
    domain: 5,
    question: "Which of the following all count toward the context window usage of a single Messages API request?",
    options: [
      "Only the contents of the messages array",
      "The messages array and system prompt, but not tool definitions, which are stored server-side",
      "The system prompt, tool definitions, full message history, and the model's generated output for that turn",
      "Only input tokens — output tokens are tracked against a separate, independent window"
    ],
    answer: 2,
    explanation: "Everything rendered into the request — tool definitions, system prompt, and conversation history — plus the tokens the model generates all consume the same context window. Tool definitions are sent with each request and count as input tokens."
  },
  {
    id: "d5-q02",
    domain: 5,
    question: "A developer sends a 50,000-token prompt with max_tokens set to 500. What does the max_tokens parameter actually control?",
    options: [
      "The combined total of input plus output tokens allowed for the request",
      "The maximum number of tokens the model may generate in its response for this turn",
      "A truncation threshold applied to the input before it reaches the model",
      "An override that shrinks the model's context window to save cost"
    ],
    answer: 1,
    explanation: "max_tokens is a hard cap on generated output only (including thinking tokens on models where thinking shares the budget). Input size is unaffected by it and is limited only by the context window."
  },
  {
    id: "d5-q03",
    domain: 5,
    question: "A production summarization service starts returning responses that cut off mid-sentence, and logs show stop_reason is \"max_tokens\". What is the appropriate fix?",
    options: [
      "Increase max_tokens to give the response headroom, using streaming if the new value is large",
      "Retry the identical request, since truncation at max_tokens is a transient server error",
      "Reduce the input document size, since the input is crowding out the output",
      "Move the workload to the Batch API, which does not enforce max_tokens"
    ],
    answer: 0,
    explanation: "stop_reason \"max_tokens\" means the model hit the requested output cap, not an error — the fix is a larger max_tokens, with streaming recommended for large values to avoid HTTP timeouts. Retrying unchanged reproduces the same truncation."
  },
  {
    id: "d5-q04",
    domain: 5,
    question: "An agentic application makes dozens of tool calls per session, and large tool results are inflating the context toward the window limit. Which optimization best controls context growth while preserving prompt-cache efficiency?",
    options: [
      "Shorten the system prompt on each turn as the conversation grows",
      "Resend only the most recent user message and discard all prior history each turn",
      "Switch models mid-session to one with a larger context window once the limit nears",
      "Clear or summarize stale tool results from older turns while keeping the stable prefix (system prompt and tools) unchanged"
    ],
    answer: 3,
    explanation: "Old tool results are usually the bulk of context growth and are rarely needed again; removing or condensing them (e.g., via context editing) trims the transcript. Keeping the system prompt and tool list byte-stable preserves the cached prefix, whereas editing the prefix or switching models invalidates the cache."
  },
  {
    id: "d5-q05",
    domain: 5,
    question: "A team adds cache_control breakpoints but interpolates \"Current time: <timestamp>\" at the top of the system prompt. Cache reads stay at zero. Why?",
    options: [
      "cache_control requires a separate beta header before any caching takes effect",
      "Prompt caching is an exact prefix match — the changing timestamp alters the prefix bytes every request, invalidating everything after it",
      "System prompts can never be cached; only messages are cacheable",
      "The cache only activates after one hundred identical requests have been observed"
    ],
    answer: 1,
    explanation: "The cache key is derived from the exact bytes of the rendered prompt prefix, so a timestamp near the front makes every request a unique prefix with no reusable entry. Dynamic values must be moved after the last breakpoint or removed."
  },
  {
    id: "d5-q06",
    domain: 5,
    question: "How many cache_control breakpoints can a single Messages API request contain?",
    options: [
      "Up to 4",
      "Exactly 1",
      "Up to 16",
      "Unlimited, one per content block"
    ],
    answer: 0,
    explanation: "The API allows a maximum of four cache_control breakpoints per request, placed at stability boundaries such as the end of tools/system and the end of conversation history."
  },
  {
    id: "d5-q07",
    domain: 5,
    question: "What is the default time-to-live (TTL) of a prompt cache entry created with cache_control type \"ephemeral\"?",
    options: [
      "1 minute",
      "1 hour",
      "5 minutes, refreshed each time the cached prefix is read",
      "24 hours"
    ],
    answer: 2,
    explanation: "Ephemeral cache entries default to a 5-minute TTL that resets whenever the entry is used; an optional 1-hour TTL can be requested with ttl: \"1h\" at a higher write cost."
  },
  {
    id: "d5-q08",
    domain: 5,
    question: "Relative to base input-token pricing, what is the cost model for prompt caching with the default 5-minute TTL?",
    options: [
      "Cache writes cost 0.5x and cache reads are free",
      "Cache writes cost 2x and cache reads cost 0.25x",
      "Both writes and reads are billed at the normal 1x input rate",
      "Cache writes cost 1.25x and cache reads cost roughly 0.1x"
    ],
    answer: 3,
    explanation: "Writing to the 5-minute cache carries a 1.25x premium on the cached tokens (2x for the 1-hour TTL), while reads are billed at about one-tenth of base input price. This means caching pays off from the second request onward for a 5-minute-TTL prefix."
  },
  {
    id: "d5-q09",
    domain: 5,
    question: "Midway through a cached multi-turn conversation, a developer appends a new tool to the tools array. What happens to the prompt cache on the next request?",
    options: [
      "Only the messages portion of the cache is invalidated; tools and system remain cached",
      "The entire cache is invalidated, because tool definitions render at the very front of the prompt prefix",
      "Nothing changes — tool definitions are hashed separately from the cached prompt",
      "The new tool is appended after the cached prefix, so all prior cache entries remain valid"
    ],
    answer: 1,
    explanation: "The prompt renders in the order tools → system → messages, so any change to the tool list changes the first bytes of the prefix and invalidates every downstream cache entry. Keeping the tool set and model fixed for the life of a conversation is a core caching practice."
  },
  {
    id: "d5-q10",
    domain: 5,
    question: "A service sends what the team believes are identical-prefix requests, yet usage.cache_read_input_tokens is zero every time while cache_creation_input_tokens is nonzero. What is the most likely cause?",
    options: [
      "A silent prefix invalidator, such as a timestamp, random ID, or non-deterministic JSON serialization, is making each rendered prefix unique",
      "The account has not been granted prompt-caching access",
      "Cache reads are only reported on streaming requests",
      "The requests are being routed to the Batch API, where caching is unsupported"
    ],
    answer: 0,
    explanation: "Nonzero cache writes with zero reads means every request is writing a fresh entry that is never matched — the classic signature of a prefix that differs by a few bytes each time. Diffing the rendered prompts of two requests exposes the invalidator."
  },
  {
    id: "d5-q11",
    domain: 5,
    question: "A customer-support chatbot holds multi-hour conversations that approach the context window. The team wants to keep key facts from early in the conversation without sending the full transcript. Which approach fits best?",
    options: [
      "Raise max_tokens so the model can handle the longer transcript",
      "Silently drop every message older than the last five turns",
      "Summarize (compact) older turns into a condensed summary block and keep recent turns verbatim",
      "Start a brand-new conversation with no carried-over state once the limit is hit"
    ],
    answer: 2,
    explanation: "Summarization/compaction preserves salient facts and decisions in far fewer tokens while recent turns stay intact for continuity — this is exactly what server-side compaction automates. Raising max_tokens affects output, not input capacity, and blind truncation or resetting loses important context."
  },
  {
    id: "d5-q12",
    domain: 5,
    question: "A team implements naive truncation that deletes the oldest individual messages when context gets long. Soon the API starts rejecting requests from their tool-using agent. What is the most likely reason?",
    options: [
      "Truncated conversations must always begin with an assistant message",
      "Truncation orphaned tool_result blocks whose matching tool_use blocks were deleted, producing an invalid message sequence",
      "The API requires the full conversation history and rejects any truncated transcript",
      "Deleting messages changes the token count, which the API cross-validates against earlier requests"
    ],
    answer: 1,
    explanation: "Every tool_result must reference a tool_use block that is still present in the history; cutting in the middle of a tool exchange breaks that pairing and the request fails validation. Truncation should happen at clean turn boundaries, keeping tool_use/tool_result pairs together."
  },
  {
    id: "d5-q13",
    domain: 5,
    question: "A coding assistant must remember a user's conventions and prior decisions across separate sessions, not just within one conversation. What is the recommended mechanism?",
    options: [
      "Rely on the model having memorized the user from earlier API calls",
      "Enable the 1-hour prompt-cache TTL so earlier sessions remain cached",
      "Keep one conversation alive forever and never start a new session",
      "Use external memory — e.g., the memory tool or an application-managed store — written during sessions and loaded back at the start of new ones"
    ],
    answer: 3,
    explanation: "The API is stateless and prompt caching only accelerates reprocessing of an identical prefix — neither persists knowledge across sessions. File- or store-backed external memory (such as the memory tool's /memories directory) is the pattern for durable cross-session state."
  },
  {
    id: "d5-q14",
    domain: 5,
    question: "What is the key difference between context editing (e.g., clearing tool uses) and compaction for managing long agent transcripts?",
    options: [
      "Context editing removes stale content such as old tool results outright, while compaction replaces earlier history with a generated summary",
      "Context editing works only on the system prompt, while compaction works only on messages",
      "Compaction deletes content permanently, while context editing summarizes it",
      "They are two names for the same operation"
    ],
    answer: 0,
    explanation: "Context editing prunes — cleared tool results or thinking blocks are dropped, not replaced — keeping the transcript lean without rewriting it. Compaction instead condenses earlier context into a summary block so the gist survives when nearing the window limit."
  },
  {
    id: "d5-q15",
    domain: 5,
    question: "A legal-tech product must answer questions over a corpus of 50,000 contracts (hundreds of millions of tokens) that is updated daily, with tight per-query cost targets. Which architecture is most appropriate?",
    options: [
      "Concatenate the entire corpus into each request using a 1M-context model",
      "Fine-tune the model on the corpus so no documents need to be sent",
      "Retrieval-augmented generation: index the corpus, retrieve the relevant passages per query, and send only those",
      "Split the corpus across parallel requests and merge the answers for every query"
    ],
    answer: 2,
    explanation: "When the corpus vastly exceeds any context window, changes frequently, and per-query cost matters, RAG sends only the relevant slice per request. Long-context stuffing is impossible at this scale, and fine-tuning is a poor fit for fast-changing factual retrieval."
  },
  {
    id: "d5-q16",
    domain: 5,
    question: "An analyst will ask many questions about a single 150K-token contract over the next hour. Which approach gives the best quality-to-effort tradeoff?",
    options: [
      "Build a vector database and RAG pipeline over the contract before answering anything",
      "Load the full contract into context once, mark it with a cache breakpoint, and reuse the cached prefix across questions",
      "Summarize the contract to 2K tokens first and answer all questions from the summary alone",
      "Send each question with a randomly selected 20K-token slice of the contract"
    ],
    answer: 1,
    explanation: "The document fits comfortably in context, so full-document reasoning avoids retrieval misses, and prompt caching makes repeated questions cheap and fast after the first request. A RAG pipeline adds engineering and recall risk for no benefit at this scale, and a lossy summary discards detail the analyst may need."
  },
  {
    id: "d5-q17",
    domain: 5,
    question: "Before sending a large prompt, a team wants an accurate token count to validate it fits their budget. What is the correct approach for Claude models?",
    options: [
      "Use the tiktoken library, since all major LLM vendors share a tokenizer",
      "Estimate at exactly 4 characters per token",
      "Send the request and roll back if usage.input_tokens is too high",
      "Call the token counting endpoint (count_tokens) with the same model that will serve the request"
    ],
    answer: 3,
    explanation: "The count_tokens endpoint returns the authoritative count, and it is model-specific — different Claude models can tokenize the same text differently. tiktoken is OpenAI's tokenizer and significantly miscounts Claude tokens, especially on code and non-English text."
  },
  {
    id: "d5-q18",
    domain: 5,
    question: "A production system sees bursts of HTTP 429 responses during traffic spikes. Which retry strategy is the recommended practice?",
    options: [
      "Exponential backoff with jitter, honoring the retry-after header when present",
      "Immediate retries in a tight loop until the request succeeds",
      "A fixed 1-second delay between retries regardless of response headers",
      "Treat 429 as fatal and surface an error to the end user on first occurrence"
    ],
    answer: 0,
    explanation: "429 means a rate limit was exceeded; the retry-after header states how long to wait, and exponential backoff with jitter prevents synchronized retry storms that would re-trigger the limit. Tight-loop retries make the overload worse."
  },
  {
    id: "d5-q19",
    domain: 5,
    question: "An application intermittently receives HTTP 529 \"overloaded_error\" responses. What does this indicate, and how should the client respond?",
    options: [
      "The API key has exceeded its monthly quota; retries are pointless until the next billing cycle",
      "The API is temporarily overloaded; retry with exponential backoff, and consider spreading load or using a less-loaded model",
      "The request payload was too large; it must be shrunk before resending",
      "The model has been retired; the client must switch model IDs immediately"
    ],
    answer: 1,
    explanation: "529 signals temporary capacity pressure on the service, not a problem with the request — it is retryable with backoff. Spreading requests over time, queuing, or shifting some traffic to a lighter model are standard mitigations."
  },
  {
    id: "d5-q20",
    domain: 5,
    question: "A developer is writing retry middleware. Which response should NOT be automatically retried?",
    options: [
      "HTTP 529 overloaded_error",
      "HTTP 500 api_error",
      "HTTP 400 invalid_request_error",
      "HTTP 429 rate_limit_error"
    ],
    answer: 2,
    explanation: "A 400 means the request itself is malformed or uses invalid parameters — resending the same payload deterministically fails again and wastes quota. 429, 500, and 529 are transient conditions that are safe to retry with backoff."
  },
  {
    id: "d5-q21",
    domain: 5,
    question: "A report-generation feature requests up to 60,000 output tokens and non-streaming calls are failing with HTTP timeouts after several minutes. What is the recommended fix?",
    options: [
      "Use streaming, consuming events (or the SDK's final-message helper) so the connection stays active during long generations",
      "Raise the client timeout to several hours and keep the request non-streaming",
      "Lower max_tokens to 4,096 and silently accept truncated reports",
      "Send the same non-streaming request from multiple clients and keep whichever finishes"
    ],
    answer: 0,
    explanation: "Long generations exceed typical HTTP timeout windows for a single blocking response; streaming delivers tokens incrementally so the connection never sits idle. The SDKs even refuse or warn on non-streaming requests with very large max_tokens for this reason."
  },
  {
    id: "d5-q22",
    domain: 5,
    question: "What retry behavior do the official Anthropic SDKs provide out of the box?",
    options: [
      "No retries — all retry logic must be implemented by the application",
      "Unlimited retries of every failed request, including 400s, until it succeeds",
      "Retries only for network connection errors, never for HTTP status codes",
      "Automatic retries of rate limits (429), server errors (5xx), and connection errors with exponential backoff, defaulting to 2 retries and configurable via max_retries"
    ],
    answer: 3,
    explanation: "The SDKs retry retryable failures (connection errors, 408, 409, 429, and 5xx) with exponential backoff, with max_retries defaulting to 2. Custom retry code is only needed for behavior beyond this built-in handling."
  },
  {
    id: "d5-q23",
    domain: 5,
    question: "A team must classify 80,000 support tickets every night, with results needed by the next morning. Latency per item is irrelevant and cost matters. What is the best approach?",
    options: [
      "Send 80,000 synchronous Messages API requests in parallel at maximum concurrency",
      "Submit the jobs via the Message Batches API, which processes asynchronously at 50% of standard token prices",
      "Concatenate all tickets into a single giant request to amortize overhead",
      "Use streaming requests, since streaming is billed at a reduced rate"
    ],
    answer: 1,
    explanation: "The Batch API is built for non-urgent bulk workloads: it costs 50% of standard prices, accepts up to 100,000 requests per batch, and typically completes well within 24 hours. Blasting synchronous requests pays full price and fights rate limits; streaming changes delivery, not pricing."
  },
  {
    id: "d5-q24",
    domain: 5,
    question: "When retrieving results from a completed message batch, how should a client match results back to the original requests?",
    options: [
      "By position — results are returned in exactly the order the requests were submitted",
      "By timestamp — the earliest result corresponds to the first request",
      "By the custom_id supplied with each request, because results can arrive in any order",
      "By re-hashing each request body and comparing it to a hash in the result"
    ],
    answer: 2,
    explanation: "Batch results are not ordered to match submission; each result carries the custom_id the client assigned, which is the only reliable join key. Relying on position silently mismatches outputs to inputs."
  },
  {
    id: "d5-q25",
    domain: 5,
    question: "A team wants to change their production system prompt but fears regressing behavior for existing use cases. What is the best practice before shipping the change?",
    options: [
      "Run the new prompt against a maintained evaluation dataset with graded criteria (automated checks and/or LLM-as-judge) and compare scores to the current baseline",
      "Manually eyeball three or four sample outputs and ship if they look fine",
      "Deploy to 100% of traffic and roll back if users complain",
      "Rely on the model's own self-assessment of whether the new prompt is better"
    ],
    answer: 0,
    explanation: "Systematic evals over a representative test set with defined grading give a measurable before/after comparison and catch regressions a handful of spot checks will miss. Self-assessment and complaint-driven rollback detect problems only after they have shipped."
  },
  {
    id: "d5-q26",
    domain: 5,
    question: "Users intermittently report poor answers from a production LLM feature, but engineers have nothing to investigate with. Which observability practice addresses this gap?",
    options: [
      "Log only HTTP status codes, since content logging is never permissible",
      "Rely on the model provider to monitor output quality on the customer's behalf",
      "Add a disclaimer asking users to retry when answers seem wrong",
      "Log requests and responses (with appropriate redaction/sampling) along with request IDs, token usage, latency, and stop reasons, and build dashboards and alerts over these signals"
    ],
    answer: 3,
    explanation: "Diagnosing quality issues requires being able to replay what was sent and received: prompt/response traces, request IDs for support escalation, and metrics like token usage, latency, and stop_reason distributions. Status codes alone cannot explain a bad-but-successful completion."
  },
  {
    id: "d5-q27",
    domain: 5,
    question: "A customer-facing assistant depends on a single model, and an extended provider incident is making requests to it fail. Which design best preserves user experience through such incidents?",
    options: [
      "Block all traffic and display a maintenance page until the incident fully resolves",
      "Graceful degradation: fail over to an alternate model or reduced-capability mode, serve cached or canned responses where safe, and queue non-urgent work for later",
      "Retry the primary model indefinitely with no backoff so requests succeed the instant it recovers",
      "Permanently migrate to the smallest available model to avoid future outages"
    ],
    answer: 1,
    explanation: "Production reliability design assumes dependencies will sometimes fail: a fallback model, degraded mode, cached responses, and deferred queues keep the service useful instead of hard-down. Infinite retries amplify the outage, and a full stop or permanent downgrade sacrifices more than the incident requires."
  }
);
