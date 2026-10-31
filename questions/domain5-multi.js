// Domain 5 — multiple-response questions (select two), 6 questions
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d5-m01",
    domain: 5,
    subdomain: "5.1 Manage conversation context to preserve critical information across long interactions",
    question: "A support agent runs multi-hour conversations. Early in each session the user supplies durable facts — the account ID, a compliance constraint, and an agreed escalation threshold — and the transcript later grows large enough that history must be condensed. Which TWO measures best preserve those critical facts across the full interaction? (Select TWO.)",
    options: [
      "Enable server-side compaction and append the assistant's full response content — including the compaction blocks — back into the messages array on every turn",
      "Raise max_tokens so the conversation has a larger context window to grow into",
      "Trim the oldest messages from the array whenever the transcript gets long, since the newest turns are the most relevant",
      "Write the durable facts to a persistent store the agent re-reads each turn, such as a memory file, so they survive any summarization of the transcript",
      "Switch to a smaller, cheaper model once the conversation grows long, to buy headroom for the remaining turns"
    ],
    answers: [0, 3],
    explanation: "Compaction summarizes earlier context server-side, but it only works if the compaction blocks are preserved — appending just the text string silently loses the compaction state, so the full response content must go back into messages. Externalizing durable facts into a memory file or similar store is the complementary safeguard, because a summary is lossy and an exact account ID or threshold is exactly the kind of detail that can be compressed away. Raising max_tokens is wrong because it caps output length, not the context window. Blind trimming is the most tempting distractor and the most dangerous: the critical facts are in the oldest turns, which is precisely what it discards, and it also invalidates the cached prefix. Switching models mid-conversation gives no extra context and invalidates the cache, since caches are model-scoped."
  },
  {
    id: "d5-m02",
    domain: 5,
    subdomain: "5.2 Design effective escalation and ambiguity resolution patterns",
    question: "An operations agent is told to \"clear out the stale records in the billing table.\" Two readings are plausible: archiving the rows to a cold table (reversible) or deleting them outright (irreversible). The requesting engineer is offline for several hours. Which TWO responses best handle the ambiguity? (Select TWO.)",
    options: [
      "Choose whichever reading matches the most literal dictionary sense of \"clear out,\" since the instruction text is the only authoritative signal",
      "Escalate with a specific, option-framed question — archive versus delete — that names a recommended default the engineer can confirm with one word",
      "Stop all work on the task and wait for the engineer to return, since any action under ambiguity risks the wrong outcome",
      "Perform the deletion, because it satisfies both readings and is the more thorough interpretation of the request",
      "Carry out the reversible archiving now, state that assumption explicitly in the handoff, and leave the irreversible deletion pending confirmation"
    ],
    answers: [1, 4],
    explanation: "Good escalation minimizes round trips and reviewer effort: a concrete either/or question with a proposed default can be resolved in one word, which matters when the human is hours away. In parallel, the agent can make real progress on the branch that is safe to undo, as long as the assumption is surfaced rather than buried — reversibility, not confidence, is what licenses acting without approval. Literal word-matching is wrong because the risk asymmetry, not the phrasing, should drive the decision. Blanket refusal is the most tempting distractor: it looks appropriately cautious, but it over-escalates by blocking work that is safely reversible. Deletion does not \"satisfy both readings\" — it forecloses the archive outcome permanently, which is the one thing an agent should not do on an unresolved ambiguity."
  },
  {
    id: "d5-m03",
    domain: 5,
    subdomain: "5.3 Implement error propagation strategies across multi-agent systems",
    question: "An orchestrator fans out three independent research subtasks to subagents. One subagent's API tool call fails with a 500 after its retries are exhausted, while its other two sources returned cleanly. Which TWO practices give the system sound error propagation? (Select TWO.)",
    options: [
      "Drop the failed tool call from the follow-up message entirely, so the model is not distracted by an error it cannot act on",
      "Have the subagent substitute a plausible value for the missing data so the downstream synthesis step is not blocked",
      "Return a tool_result for the failed call with is_error set to true and an informative message, so the model can adapt its approach",
      "Have the subagent's report to the orchestrator state explicitly which source failed and which conclusions are therefore unverified",
      "Terminate the entire session as soon as any subagent reports an error, so no partial result can be mistaken for a complete one"
    ],
    answers: [2, 3],
    explanation: "Every tool_use block needs a matching tool_result; marking the failed one with is_error lets the model see the failure and route around it instead of stalling. The second half is the boundary discipline: a subagent's report is all the orchestrator sees, so a partial result must be labeled partial or the orchestrator will treat two sources as three. Dropping the failed tool_result is the most tempting distractor — it feels like noise reduction, but the API expects a result per call and the omission hides the gap rather than handling it. Fabricating a value is the worst case, converting a visible failure into an invisible one. Killing the session is an over-correction that throws away two successful branches; the goal is to propagate the error accurately, not to make every failure fatal."
  },
  {
    id: "d5-m04",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "A coding agent must find every call site of a deprecated authentication helper across a monorepo with tens of thousands of files, then propose a migration. Which TWO approaches manage context most effectively? (Select TWO.)",
    options: [
      "Delegate the broad fan-out search to subagents whose intermediate file reads stay in their own context windows, returning only their conclusions to the main loop",
      "Read the entire repository into the context window up front, since current models offer a 1M-token context and complete information gives the best answer",
      "Raise the effort setting to its maximum so the model can hold more of the codebase in context at once",
      "Disable prompt caching for the session so the agent never reasons over a stale copy of a file it has since edited",
      "Locate candidates with pattern search first, then read only the specific files and line ranges those matches point to"
    ],
    answers: [0, 4],
    explanation: "Subagent delegation is the core context-management move for fan-out work: the sweep's bulky intermediate reads are absorbed by a separate context window and only the distilled findings come back, keeping the orchestrator's window clean. Search-then-read-narrowly is the same principle applied within one agent — matches identify where to look so whole files never need loading. Reading the whole repo is the most tempting distractor because the large context window makes it sound feasible; in practice it is slow, expensive, and buries the signal in noise. Effort controls reasoning depth and token spend, not context capacity, so it cannot make more of the codebase fit. Disabling caching addresses a non-problem: the cache stores prompt prefix tokens for reuse, it does not serve outdated file contents back to the model, and turning it off only raises cost and latency."
  },
  {
    id: "d5-m05",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "An invoice-processing agent extracts fields and writes them to an accounting system. It is about 94% accurate overall, but errors on the payment-amount and vendor-bank-details fields are costly and hard to reverse. The team can staff a small review queue. Which TWO design choices are soundest? (Select TWO.)",
    options: [
      "Route items for review using the model's self-reported confidence percentage as the sole signal, reviewing everything it scores below a chosen threshold",
      "Gate by stakes and reversibility — auto-apply low-value, easily corrected fields, and require human approval before any irreversible or high-value write",
      "Have the agent present each extracted value alongside the source span it came from, so a reviewer can verify in seconds rather than re-reading the invoice",
      "Review a random 5% sample of all processed invoices and auto-apply the remaining 95% regardless of which fields they touch",
      "Have the agent re-check its own extraction in a second pass and auto-approve whenever the two passes agree"
    ],
    answers: [1, 2],
    explanation: "Review capacity is finite, so it should be spent where a mistake actually costs something — gating on stakes and reversibility puts the human in front of the irreversible bank-detail write while letting trivially correctable fields flow through. Showing the source span alongside each value is what makes that review economical, since verification against evidence is far faster than redoing the extraction, and it preserves provenance for later audit. Self-reported confidence is the most tempting distractor: models are not reliably calibrated, so a confidence score is a weak proxy and a poor sole gate — it is at best one input alongside stakes. Random sampling is a quality-measurement technique, not a safety control; a 5% sample catches errors only after the other 95% have already been written. Self-consistency is not correctness, and a model that repeats a confident mistake twice will simply auto-approve it."
  },
  {
    id: "d5-m06",
    domain: 5,
    subdomain: "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    question: "A research agent synthesizes a market summary from three uploaded PDFs plus live web results. Two sources state different figures for the same metric, and the final report will be read by people who cannot consult the underlying sources. Which TWO practices best preserve provenance and handle the disagreement? (Select TWO.)",
    options: [
      "Average the two figures so the report presents a single, decisive number rather than confusing the reader with a discrepancy",
      "Adopt the most recently fetched source as an automatic tiebreaker whenever any two sources disagree",
      "Enable citations on the document blocks so cited claims carry the quoted source text and the document they came from, rather than relying on a prose source list the model writes at the end",
      "Have the model attach a numeric confidence score to every claim and silently drop any claim scoring below 80%",
      "Report both figures with their respective sources and state plainly that the sources disagree, rather than resolving the conflict silently"
    ],
    answers: [2, 4],
    explanation: "Enabling citations attaches the quoted source text and document identity to each cited claim at the API level, which is far more reliable than asking the model to append a bibliography it may misattribute. Surfacing the disagreement explicitly is the honest handling of genuine uncertainty: the reader cannot check the sources, so collapsing a conflict into one number hides exactly the information they would need. Averaging is the most tempting distractor because it produces a clean deliverable, but it manufactures a figure that no source actually supports. Recency is a reasonable input to a judgment, not an automatic rule — a newer blog post does not outrank an audited filing. Dropping low-confidence claims silently is doubly wrong: the confidence scores are not calibrated, and silent omission destroys the uncertainty signal instead of communicating it."
  }
);
