/* Structured Data Extraction — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    "id": "sc-extraction-001",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.6 Design multi-instance and multi-pass review architectures",
    "question": "During evaluation, the extraction pipeline handles supplier contracts by first asking Claude to infer document-specific extraction rules, then asking the same conversation to review the resulting field values. Human auditors find that the review step often misses subtle errors introduced by the inferred rules, such as treating renewal notice dates as contract end dates. You need to improve review effectiveness without changing the extraction schema. What architecture should you use?",
    "options": [
      "Run a separate Claude instance that reviews the source document and extracted fields against a rubric, without the extraction reasoning.",
      "Append the extraction rationale to the review prompt so Claude can verify whether each reasoning step was internally consistent.",
      "Run three self-review turns in the original conversation and accept fields only when all turns report high confidence.",
      "Ask the same conversation to self-critique its extraction using extended thinking and a stricter instruction to find mistakes."
    ],
    "answer": 0,
    "optionNotes": [
      "A separate review instance does not carry over the assumptions and reasoning that produced the extraction. Given only the source, the extracted fields and a rubric, it compares values directly against the evidence and is more likely to question a misplaced date.",
      "Feeding the reviewer the original rationale anchors it to the same mistaken assumptions. The reviewer ends up judging whether the reasoning sounded coherent rather than whether each value is supported by the source.",
      "Repeated self-review turns in the same conversation share the original context and repeat its blind spots. Agreement across turns and self-reported confidence are not evidence of correctness unless calibrated against labeled data.",
      "Self-critique in the same session still holds the reasoning context that led to the original decision. Extended thinking and stricter wording may help slightly, but they do not remove the anchoring effect."
    ],
    "explanation": "A reviewer that shares the generator's context tends to inherit its assumptions, so subtle errors such as reading a renewal notice date as an end date go unnoticed. An independent instance given only the source, the extracted fields and an explicit rubric checks values against the evidence instead of re-reading the original reasoning.",
    "source": "pt1-q007"
  },
  {
    "id": "sc-extraction-002",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Your extraction pipeline includes a QA pass that flags possible mistakes in supplier contract records before they enter the downstream procurement system. Over the last month, procurement analysts accepted many findings about missing renewal clauses but overturned most findings involving informal pricing language. Current logs store only document ID, field name, confidence, and finding text, making it difficult to prioritize prompt and validator improvements. What change should you make first?",
    "options": [
      "Add a structured detected_pattern field to each QA finding, then analyze acceptance rates by pattern and document type.",
      "Increase the QA confidence threshold globally, suppressing all lower-confidence findings before analysts review extracted contract records.",
      "Add a system prompt instruction telling Claude to report only findings that procurement analysts would likely accept.",
      "Store only analyst accept or reject decisions per document, then randomly sample overturned findings for manual discussion."
    ],
    "answer": 0,
    "optionNotes": [
      "Recording the source pattern that triggered each finding makes the feedback loop analyzable rather than anecdotal. Acceptance rates by pattern and document type show exactly which prompts, examples or validators need refinement, without suppressing useful categories.",
      "A global threshold may cut volume, but it hides which patterns produce low-value findings. It also suppresses useful findings in categories that already perform well, lowering recall without touching the root cause.",
      "This asks Claude to predict reviewer preferences instead of measuring them. It provides no structured data about which patterns lead to overturned findings, so there is nothing to analyze or improve against.",
      "Document-level accept or reject labels say nothing about what triggered each finding. Random discussion of examples can surface anecdotes, but it does not give the systematic segmentation needed to prioritize fixes."
    ],
    "explanation": "A feedback loop needs to record why each finding was produced, not just whether it was accepted. A structured detected_pattern field lets the team compute acceptance rates per pattern and document type, then target prompt, example or validator changes at the patterns that produce overturned findings.",
    "source": "pt1-q008"
  },
  {
    "id": "sc-extraction-003",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.3 Implement error propagation strategies across multi-agent systems",
    "question": "A coordinator splits each document into sections and sends them to extraction subagents for fields such as parties, dates, totals, and obligations. During testing, one subagent sometimes loses access to a section-level source system for a few minutes. The current implementation either returns an empty section extraction marked as successful or aborts the entire document extraction, causing downstream systems to misinterpret the document state. What should you change?",
    "options": [
      "Retry the failed section until it succeeds, withholding all partial extractions from downstream systems until completion.",
      "Terminate the entire document workflow whenever any subagent cannot access its assigned source section.",
      "Have subagents report unresolved failures with the section, failure type, partial fields, and suggested recovery steps.",
      "Return an empty extraction object for the failed section so downstream validators can treat missing fields consistently."
    ],
    "answer": 2,
    "optionNotes": [
      "Unbounded retries can stall the whole document indefinitely and hide the progress already made. The coordinator still needs structured context about what failed and what valid data is available in order to choose a recovery path.",
      "Aborting the document discards fields that other subagents extracted successfully, even though the failure is local and probably recoverable. It removes the coordinator's ability to make targeted recovery decisions.",
      "Structured failure reports preserve valid work while making the gap visible. The coordinator can retry the section, use an alternate path, or send only that portion to review, without claiming completeness or throwing away good results.",
      "An empty object marked as success hides the access failure. Downstream validators cannot distinguish a section that truly had no data from one that was never read, which creates false confidence in the record."
    ],
    "explanation": "Reliable multi-agent extraction must distinguish a valid empty result from a failure to read the source. Subagents should propagate unresolved failures with enough structured context, such as the section, failure type and partial results, for the coordinator to retry, reroute or flag the gap instead of silently succeeding or aborting everything.",
    "source": "pt1-q010"
  },
  {
    "id": "sc-extraction-004",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "A labeled validation run reports 97.2% aggregate extraction accuracy across NDAs, invoices, insurance forms, and purchase orders. Leadership wants to bypass human review for any record where Claude returns high confidence, but pilot complaints suggest errors cluster in specific document families and fields. The review team is small, so its time must go where errors actually occur. What should you do before reducing reviewer coverage?",
    "options": [
      "Use the 97.2% aggregate accuracy to auto-approve all high-confidence outputs, monitoring user complaints for emerging regressions.",
      "Randomly review a fixed percentage of every extraction category, regardless of document type, field, or prior validation performance.",
      "Measure accuracy by document type and field, automate only segments that meet validated thresholds, and route the rest to review.",
      "Raise the global confidence threshold until the aggregate validation accuracy reaches 99%, then disable review for remaining outputs."
    ],
    "answer": 2,
    "optionNotes": [
      "High aggregate accuracy can mask concentrated failures in particular document families or fields. Waiting for complaints makes customers and downstream systems the detection mechanism, which is unsuitable for a high-accuracy pipeline.",
      "Uniform random sampling ignores the known differences in risk across document types and fields. It over-reviews reliable segments and under-reviews the fields that actually need human attention.",
      "Segment-level measurement shows where automation is proven safe and where it is not. Automating only validated segments keeps human review focused on the document types and fields where errors cluster.",
      "A higher global threshold does not show that every document type and field performs acceptably. Confidence must be calibrated at the segment level, because some fields stay error-prone even when the model reports high confidence."
    ],
    "explanation": "Aggregate accuracy can hide weak performance on specific document types or fields. Measure accuracy per segment, automate only the segments that meet validated thresholds, and keep routing the others to review until they are calibrated.",
    "source": "pt1-q012"
  },
  {
    "id": "sc-extraction-005",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Your extraction pipeline uses tool use with a strict schema, so outputs are syntactically valid. However, downstream semantic validators reject some invoices because the extracted line-item totals do not match the stated invoice total, and because a due date was placed in the invoice_date field. The current retry simply sends the document again with \"fix the extraction,\" and the same fields often remain wrong. What change would most effectively improve recoverable correction quality?",
    "options": [
      "Send a follow-up with the document, the failed extraction, and the exact validation errors for targeted correction.",
      "Retry the original extraction prompt with a lower temperature and discard the failed output before revalidating.",
      "Loosen the downstream validators so line-item total mismatches and date-field swaps become warnings instead of failures.",
      "Ask Claude to provide a confidence score for each field and retry only fields below a chosen threshold."
    ],
    "answer": 0,
    "optionNotes": [
      "With the source, its own previous output and the validator's specific objections, Claude can see exactly which fields failed and why. That focuses the retry on correcting the swapped date and the inconsistent totals.",
      "Lower temperature reduces variation but tells Claude nothing about what was wrong. Discarding the failed output also throws away the context showing which fields broke which rule.",
      "Weakening the validators hides the problem instead of fixing it. Semantic validation exists to keep plausible but wrong data out of downstream systems.",
      "A field can be confidently wrong, so self-reported confidence is no substitute for concrete validation errors. A confidence threshold also does not tell Claude that totals failed an arithmetic check."
    ],
    "explanation": "Strict schemas prevent syntax and shape errors but not semantic ones. A retry works when it carries the source document, the prior output and the exact validator messages, so the model can correct the specific defect instead of repeating a blind attempt.",
    "source": "pt1-q059"
  },
  {
    "id": "sc-extraction-006",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "An invoice extraction fails your Pydantic validation with two specific errors: invoice_date is not a valid ISO date, and line_items[2].amount is a string rather than a number. The pipeline allows one retry before a record goes to the human queue. Engineers disagree about what the retry request should contain, and about which kinds of failure should not be retried at all. Which approach is right?",
    "options": [
      "Send only the validation errors with a stricter instruction, and stop retrying after any second consecutive failure.",
      "Send the failed extraction and the errors without the document to save tokens, and retry up to a fixed attempt budget.",
      "Send the document, the failed extraction and the errors, and skip the retry when the value is absent from the source.",
      "Send the original document with a fresh prompt and no mention of the failure, and skip retrying only on API errors."
    ],
    "answer": 2,
    "optionNotes": [
      "Without the source document Claude cannot re-read the date or the amount it needs to fix, so it can only guess. A stricter instruction adds no information about what the correct values are.",
      "Omitting the document saves tokens but leaves Claude unable to re-ground the failing fields in the evidence. A fixed attempt budget also keeps retrying cases where no retry can succeed.",
      "Claude sees what it produced, what was wrong and the source to correct against, which is what makes the retry targeted. Format and placement errors are recoverable; a value that is not in the document is not, so retrying it only invites fabrication.",
      "A fresh prompt withholds the error feedback that makes a retry targeted, so the same mistake is likely to recur. API errors, such as overload, are among the most retryable failures, so skipping only those gets the boundary backwards."
    ],
    "explanation": "Retry-with-error-feedback works because the model gets the source, its previous output and the specific validation errors together. The boundary matters too: format and structural errors are worth retrying, while information missing from the source should be marked and routed instead.",
    "source": "purcell-q055"
  },
  {
    "id": "sc-extraction-007",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "Your extraction QA pass produces JSON records that validate successfully, but reviewers report the findings are hard to act on. Some records describe vague problems like \"date issue,\" others omit where the problem appears, and suggested fixes vary between full sentences, fragments, and empty strings. The downstream ticketing system accepts the records, but reviewers spend significant time interpreting them. What change would most effectively improve consistency?",
    "options": [
      "Make every finding field non-null in the schema so validation fails whenever Claude leaves any reviewer detail empty.",
      "Add a general instruction requiring concise, high-confidence findings and asking Claude to avoid vague or incomplete notes.",
      "Add a few example findings that each show location, affected field, issue, severity, and a suggested correction.",
      "Post-process each finding with regular expressions to infer missing locations, severities, and suggested fixes from the text."
    ],
    "answer": 2,
    "optionNotes": [
      "A non-null schema forces fields to be filled but does not show what a useful value looks like. When a detail is genuinely unavailable it also pushes Claude to invent something.",
      "Words like concise and complete are too vague to define the desired shape. They do not demonstrate what an actionable finding looks like, so specificity and format stay inconsistent.",
      "Examples are the most effective lever when the model understands the task but produces inconsistent, incomplete output. Showing complete findings teaches the expected structure and level of detail better than prose rules.",
      "Regex post-processing tries to recover structure from inconsistent prose after the fact. It is brittle across varied wording and can attach wrong locations or severities."
    ],
    "explanation": "Schemas enforce structural validity, while examples communicate judgment and the expected level of detail. A few complete example findings show Claude what an actionable record contains, which stabilizes output that already validates but varies in quality.",
    "source": "pt1-q024"
  },
  {
    "id": "sc-extraction-008",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "In validation runs, 18% of supplier contracts return null for effective_date and renewal_terms even though human reviewers find the information present. The misses cluster in documents where dates and renewal language appear in cover letters, footnotes, or table captions rather than standard contract header sections. Outputs are otherwise schema-valid, and downstream systems can accept null only when the source truly omits the field. What change would most improve extraction accuracy?",
    "options": [
      "Change the schema to make effective_date and renewal_terms required non-null fields, rejecting outputs that leave either value empty.",
      "Add few-shot examples that extract these fields from cover letters, footnotes, and table captions, with brief rationale.",
      "Append a rule telling Claude that null values are unacceptable whenever the document is classified as a supplier contract.",
      "Retry every extraction with null fields until the model returns populated values for all contract metadata fields."
    ],
    "answer": 1,
    "optionNotes": [
      "Forcing non-null values does not teach Claude where to look in unusual layouts. It also pressures the model to fabricate a value when a contract genuinely omits the field.",
      "Examples drawn from the layouts where misses cluster show Claude where these facts can appear. Claude still returns null when the information is truly absent, which is what downstream systems require.",
      "Banning nulls removes the honest answer for contracts that truly lack the field. It reduces empty values by encouraging guesses rather than by improving extraction.",
      "Retrying without new guidance does not address the missed locations. Repeated retries waste calls and push the model toward inventing values for genuinely absent fields."
    ],
    "explanation": "When misses cluster around particular document structures, targeted examples from those structures teach Claude where to look. Schema pressure, bans on null and blind retries convert uncertainty into fabricated data instead.",
    "source": "pt1-q056"
  },
  {
    "id": "sc-extraction-009",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "In pilot runs, quantity fields from several vendors use shorthand like \"approx. 12 kg\", \"12kg net\", and \"12 kilograms\". The extractor often flags valid variants as defects while accepting truly ambiguous entries like \"12 units\" without unit context. The schema and validation logic are stable, and prose instructions listing allowed unit formats have not improved consistency. What change would most effectively improve judgment across new vendor layouts?",
    "options": [
      "Instruct the model to return null for any measurement containing informal wording, unusual spacing, or missing punctuation.",
      "Increase the minimum confidence threshold so borderline extractions are routed to human review before downstream validation occurs.",
      "Expand the prompt with a comprehensive list of every vendor-specific unit spelling and abbreviation observed so far.",
      "Add a few labeled examples of acceptable unit variants and of genuinely ambiguous entries, with the expected output."
    ],
    "answer": 3,
    "optionNotes": [
      "Nulling all informal wording throws away valid data, because real documents routinely use shorthand and irregular spacing. It trades false positives for many more false negatives.",
      "A higher threshold only changes how much goes to reviewers. It does not teach the model the distinction it is getting wrong, so misclassification continues and review volume rises.",
      "An exhaustive spelling list is brittle because new vendors keep introducing unseen variants. It encourages matching known strings rather than learning the underlying distinction.",
      "Labeled positive and negative cases define the boundary between acceptable variation and real ambiguity. Claude can generalize that judgment to vendors and layouts it has not seen."
    ],
    "explanation": "The failure here is inconsistent judgment on ambiguous cases, not syntax. A compact set of labeled examples that includes both acceptable variants and genuinely ambiguous entries teaches the decision boundary better than lists, thresholds or blanket null rules.",
    "source": "pt3-q002"
  },
  {
    "id": "sc-extraction-010",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.2 Design effective escalation and ambiguity resolution patterns",
    "question": "Production review shows inconsistent routing: documents with unreadable required values and unfamiliar layouts sometimes flow into downstream systems, while routine invoices missing optional purchase-order numbers are sent for manual review. The extraction schema already permits nullable fields for data that is absent from the source. The current prompt only says to escalate \"anything unusual\". What change would most effectively improve routing decisions?",
    "options": [
      "State explicit review criteria, with examples separating absent optional fields, unreadable required fields, and unsupported types.",
      "Escalate documents based on frustrated wording, urgent language, or negative sentiment detected anywhere in the source text.",
      "Require retries until all schema fields are populated, then escalate only those documents still containing null values.",
      "Route documents to reviewers whenever the model reports confidence below a single global threshold after extraction."
    ],
    "answer": 0,
    "optionNotes": [
      "Explicit criteria define when the system proceeds and when a human is needed, replacing the vague \"anything unusual\". Examples help most where similar-looking documents need different outcomes, such as an absent optional field versus an unreadable required one.",
      "Sentiment in the source says nothing about how hard the document is to extract or how risky the output is. An angry cover letter can be trivial to extract accurately.",
      "Retrying until nulls disappear pressures the model to fabricate values for fields that are legitimately absent. It treats a missing optional field as an extraction failure.",
      "Self-reported confidence is often poorly calibrated, and a single global threshold ignores the distinction between missing optional data and unreadable required data."
    ],
    "explanation": "Routing improves when the prompt defines concrete decision boundaries rather than relying on proxies. Unreadable required values and unsupported document types are real review triggers; absent optional fields can be null and pass through, and examples make that distinction learnable.",
    "source": "pt1-q025"
  },
  {
    "id": "sc-extraction-011",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your invoice extractor currently asks Claude to \"return valid JSON\" with fields for vendor, invoice_date, line_items, and total_amount. In production, a small but persistent share of responses include markdown fences, explanatory text, or malformed commas, causing downstream parsers to reject otherwise correct extractions. The team has already tried rewording the instruction twice. What change would most effectively improve structured output reliability?",
    "options": [
      "Add stronger prompt wording that forbids explanations, examples, markdown, comments, and any non-JSON characters in responses.",
      "Define an extraction tool with a JSON schema for the target fields, then consume the structured tool_use input directly.",
      "Keep requesting JSON only, then strip markdown fences and trailing prose with regular expressions before parsing.",
      "Prefill the assistant turn with an opening brace and add stop sequences, then parse the generated text as JSON."
    ],
    "answer": 1,
    "optionNotes": [
      "Stronger wording may reduce formatting slips, but it cannot guarantee valid syntax. The team has already seen that prose-only constraints leave a persistent failure rate.",
      "With tool use, the application reads a parsed input object from the tool_use block instead of scraping JSON out of prose, so fences and commentary disappear. Setting strict: true on the tool goes further and guarantees the input conforms to the schema.",
      "Regex cleanup treats symptoms after unreliable text generation. It misses new edge cases, can corrupt valid values, and leaves the pipeline dependent on brittle repairs.",
      "Prefill still produces text that must be parsed, so malformed JSON and missing fields remain possible. Recent models, Claude 4.6 and later, also reject a prefilled final assistant turn with a 400 error."
    ],
    "explanation": "Machine-readable output should not travel through a prose channel. Defining the extraction as a tool with a JSON schema returns structured input in a tool_use block, and strict tool use or structured outputs guarantee schema conformance.",
    "source": "pt1-q031"
  },
  {
    "id": "sc-extraction-012",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "Your product has two document queues: customer onboarding forms that must populate an eligibility screen while an operations specialist is waiting, and 40,000 archived contracts used for a dashboard due next week. Finance asks whether the lower-cost processing path should replace the current real-time calls for both queues. The onboarding team has a service target of under a minute per form. What should you recommend?",
    "options": [
      "Keep both queues on synchronous calls, since batch responses cannot be reliably matched back to the submitted documents.",
      "Keep onboarding forms synchronous, and use the Message Batches API for the latency-tolerant archived contracts.",
      "Move both queues to the Message Batches API, polling frequently so urgent onboarding jobs usually finish quickly.",
      "Route onboarding forms to batches first, then fall back to synchronous calls whenever pending jobs exceed a threshold."
    ],
    "answer": 1,
    "optionNotes": [
      "The premise is false: every batch request carries a custom_id that is returned with its result, so asynchronous output can be matched to its document reliably.",
      "Each queue gets the processing mode its latency needs. A waiting specialist needs synchronous calls; the archive can tolerate a processing window of up to 24 hours and benefits from the lower batch price.",
      "Polling more often does not change how long a batch takes; batches can take up to 24 hours with no latency guarantee. Specialists could wait far longer than their one-minute target.",
      "Urgent work still enters a path without any latency guarantee before the fallback triggers. The scheme adds complexity and risks duplicate processing and reconciliation problems."
    ],
    "explanation": "Match the API to the latency requirement. Blocking, interactive work stays on the synchronous Messages API, while large latency-tolerant jobs suit the Message Batches API, which costs less but may take up to 24 hours and uses custom_id to match results to requests.",
    "source": "pt1-q042"
  },
  {
    "id": "sc-extraction-013",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.6 Design multi-instance and multi-pass review architectures",
    "question": "Your QA prompt reviews a 90-page vendor onboarding packet and its extracted records in one call. It catches detailed field errors in the first few forms, but misses mismatched tax IDs in middle attachments and contradicts itself about required signatures. Running the same prompt again produces a different, equally uneven set of findings. Which review architecture would best improve reliability?",
    "options": [
      "Ask the same extraction instance to critique its own output using extended thinking before returning the final records.",
      "Increase max_tokens and add stronger instructions to be exhaustive while reviewing the entire packet in a single pass.",
      "Run focused review passes on each packet section, then a separate consistency pass across the cross-section fields.",
      "Run three full-packet reviews and accept only the issues that are reported by at least two of the three reviewers."
    ],
    "answer": 2,
    "optionNotes": [
      "Self-review keeps the reasoning context that produced the extraction, and extended thinking does not narrow the scope. Attention-related misses in the middle of a long packet remain.",
      "max_tokens limits the response length, not how evenly the model attends to a long input. One broad pass still has to juggle local field checks and cross-section consistency together.",
      "Narrow section passes give each local check full attention, and a separate consistency pass then compares tax IDs and signature requirements across sections without competing with field-level checks.",
      "Majority voting over broad reviews can discard real issues that only one pass catches. It repeats the same unfocused review three times rather than fixing the architecture."
    ],
    "explanation": "Large mixed-objective reviews produce uneven coverage, especially for content in the middle of long inputs. Splitting the work into focused per-section passes plus a dedicated cross-section consistency pass gives each call a clear objective and catches both local and relational errors.",
    "source": "pt1-q049"
  },
  {
    "id": "sc-extraction-014",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    "question": "Your extraction QA pass reviews Claude's JSON outputs before downstream ingestion. Reviewers dismiss many findings because the QA prompt flags harmless differences: inferred date formats, optional fields absent from the source, and wording variations that do not change extracted values. The current prompt says, \"Check the extraction for accuracy and report any problems.\" What change would most effectively improve precision?",
    "options": [
      "Increase the validation sample size and ask reviewers to manually ignore findings that are not actionable for them.",
      "Rewrite the QA prompt to define reportable errors, acceptable variations, and skip conditions, with examples.",
      "Require the QA pass to flag every schema field that is null, even when the source document omits that information.",
      "Add instructions that Claude should be conservative and report only the findings where it feels highly confident."
    ],
    "answer": 1,
    "optionNotes": [
      "A larger sample measures the problem better but does not change the prompt's precision. Asking reviewers to ignore noise keeps the burden on them and erodes trust in the QA feed.",
      "Explicit categories tell Claude what counts as a finding and what is an acceptable variation. That directly removes the false positives caused by an open-ended \"check for accuracy\" instruction.",
      "Flagging every null treats valid absence as an error and adds false positives. When the source omits an optional value, null is the correct output.",
      "\"Be conservative\" and \"high confidence\" do not define which cases to report or skip. Self-assessed confidence is not a substitute for concrete categorical criteria."
    ],
    "explanation": "Precision improves when the prompt gives concrete decision rules instead of broad quality goals. Define what to report, which variations are acceptable and when to skip, ideally with an example of each, so harmless differences and valid nulls stop being flagged.",
    "source": "pt1-q052"
  },
  {
    "id": "sc-extraction-015",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "You are about to process 80,000 archived vendor contracts overnight through the Message Batches API. A new extraction prompt and schema passed a few hand-picked examples, but historical documents vary by template, scanned OCR quality, and contract addenda. Reprocessing failures would delay a downstream migration that is already scheduled. What should you do next?",
    "options": [
      "Submit the entire workload immediately, then resubmit every failed document after inspecting aggregate completion and error counts.",
      "Split the documents randomly into equal daily batches and tune the prompt only after all of the batches finish processing.",
      "Increase max_tokens for all batch requests so longer outputs can handle templates, addenda, and OCR noise more reliably.",
      "Run a representative pilot batch, analyze validation failures and null patterns, refine the prompt, then submit the rest."
    ],
    "answer": 3,
    "optionNotes": [
      "Submitting everything before testing at representative scale multiplies any prompt defect across tens of thousands of documents. Aggregate counts also hide which templates or fields caused the failures.",
      "Random daily batches spread the volume but still postpone learning until most of the work is done. The same avoidable failures repeat in every batch.",
      "Raising max_tokens only helps when outputs are truncated, which is not the stated problem. Template variety and OCR noise call for prompt, schema and validation changes.",
      "A pilot that includes the known variations exposes real failure modes while they are still cheap to fix. Refining the prompt first raises first-pass success and cuts resubmission work."
    ],
    "explanation": "Batch processing lowers cost but does not remove the need to validate a new prompt and schema on representative documents. A pilot batch reveals template, OCR and addendum failures early, so the full run succeeds on the first pass instead of becoming a large cleanup.",
    "source": "pt1-q058"
  },
  {
    "id": "sc-extraction-016",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "Your nightly run submits 30,000 document extraction requests through the Message Batches API. The result processing job must update the correct downstream record for each successful extraction and resubmit only the documents that failed validation or exceeded context limits. During testing, engineers notice that relying on the result file's line order creates occasional mismatches after retries and partial failure handling. What design should you use?",
    "options": [
      "Ask Claude to include the source filename in every extraction, then parse that field when processing the failures.",
      "Submit one combined request containing all documents, so every extraction and failure appears in a single ordered output.",
      "Assume batch results preserve submission order, then join each response to the original manifest by its array position.",
      "Give each request a stable custom_id derived from the document record, persist it, and reconcile results by that ID."
    ],
    "answer": 3,
    "optionNotes": [
      "Correlation would depend on model-generated content. Errored requests may contain no extraction at all, and successful ones could return a normalized or wrong filename.",
      "One giant request removes per-document failure isolation, strains the context window and makes it impossible to resubmit only the failed documents.",
      "The documentation states that batch results are not guaranteed to be in request order. Positional joins break further once failed items are filtered and resubmitted.",
      "Each batch request carries a custom_id that comes back with its result. A stable ID persisted with the request lets the job map every success and failure to the right record across retries."
    ],
    "explanation": "Batch results can arrive in any order, so correlation must rely on stable request metadata. A custom_id per document, persisted alongside the request, lets the pipeline update the right record and resubmit only failed items.",
    "source": "pt2-q009"
  },
  {
    "id": "sc-extraction-017",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "An overnight Message Batches job of 10,000 document extractions ends with 9,800 succeeded results and 200 that did not succeed. Most of the 200 are oversized scanned contracts that exceeded the model's context window, and the rest hit transient errors. The downstream warehouse load cannot start until every document has a result or an explicit exception. What failure-handling workflow should you use?",
    "options": [
      "Find the unsuccessful requests by custom_id, chunk the oversized documents, and resubmit only that subset.",
      "Resubmit the entire 10,000-document batch and keep whichever result arrives first for each of the documents.",
      "Log the 200 failures for a weekly manual review and mark the batch as operationally complete for loading.",
      "Send the 200 failed documents unchanged through the synchronous API, where batch context limits do not apply."
    ],
    "answer": 0,
    "optionNotes": [
      "custom_id ties each failure back to its source document. Fixing the cause first, by chunking the oversized contracts, and resubmitting only those 200 requests costs a fraction of a full rerun.",
      "Rerunning everything pays again for 9,800 successful extractions and does nothing about the oversized documents, which will fail again.",
      "Deferring the failures to a weekly review quietly drops 2% of the corpus from the load and violates the requirement that every document has a result or an explicit exception.",
      "The context window belongs to the model, not to the API path. Unchunked oversized documents fail synchronously too."
    ],
    "explanation": "Use custom_id to find exactly which requests failed, fix what caused each failure, and resubmit only that subset. Context-window failures need chunking whichever API is used, while transient errors can simply be retried.",
    "source": "purcell-q056"
  },
  {
    "id": "sc-extraction-018",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your extraction tool captures payment_method using a JSON Schema enum of credit_card, ach, wire, and check. In validation logs, documents with wording like \"paid through marketplace balance\" or no stated payment method either fail enum validation or get coerced into one of the existing categories. The coerced values are now misleading a downstream payments report. What schema change best handles these edge cases while preserving structured categories?",
    "options": [
      "Extend the enum with unclear and other, plus a required detail field when other is selected.",
      "Force Claude to choose the closest existing enum value and add a confidence score for downstream filtering.",
      "Reject any document with unfamiliar payment wording and route it to human review before extraction.",
      "Replace the enum with an unrestricted string so novel payment descriptions pass validation unchanged."
    ],
    "answer": 0,
    "optionNotes": [
      "The categories stay structured while Claude gets honest outputs for ambiguous and novel cases. unclear covers missing or ambiguous evidence, and other with a detail field captures new methods without forcing a wrong label.",
      "Forcing the closest category is the failure already seen in the logs. A confidence score may help routing, but the stored category is still wrong.",
      "Rejecting every unfamiliar phrase is far too broad and wastes reviewer capacity. The schema can represent uncertainty directly and let downstream logic decide what needs review.",
      "A free string removes the normalization the report depends on. Equivalent methods would appear under many spellings, making aggregation and quality checks harder."
    ],
    "explanation": "A closed enum gives consistent categories but needs escape hatches for real-world variety. Adding values such as unclear and other, with a detail field for other, prevents forced misclassification while keeping the output machine-readable.",
    "source": "pt3-q046"
  },
  {
    "id": "sc-extraction-019",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "In a pilot, 6% of procurement packet extractions fail semantic validation because the required approval date is missing. Reviewer audit shows the provided PDFs say \"approval letter on file,\" but the approval letters were not included in the model input. Retrying the same documents often produces plausible but unsupported dates. Which adjustment best improves extraction reliability?",
    "options": [
      "Add examples of varied approval letter layouts and rerun the extraction unchanged against the same procurement PDFs.",
      "Detect the absent source, stop automated retries, mark the extraction incomplete, and request the missing letter.",
      "Retry failed documents up to five times with increasingly explicit prompts, then accept the most frequent date returned.",
      "Require the approval_date field and instruct Claude to infer it from nearby signature dates when no date is explicit."
    ],
    "answer": 1,
    "optionNotes": [
      "Examples help Claude recognize information that is present in unfamiliar layouts. They cannot help when the approval letter was never given to the model.",
      "Retries fix format, placement and structural errors, but they cannot recover facts that are absent from the input. Marking the record incomplete and requesting the document keeps unsupported dates out of downstream systems.",
      "More retries cannot create missing evidence. Choosing the most frequent invented date launders a hallucination into something that looks stable.",
      "Requiring the field and inferring from nearby dates pressures the model to fabricate. A signature date is not the approval date, and the result has no provenance."
    ],
    "explanation": "Validation loops must separate recoverable mistakes from missing-source conditions. When the needed fact is not in the input, retries only produce unsupported values; the right move is to mark the extraction incomplete with a clear reason and obtain the missing document.",
    "source": "pt2-q027"
  },
  {
    "id": "sc-extraction-020",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.1 Manage conversation context to preserve critical information across long interactions",
    "question": "A pilot processes 30 contracts per run, and accuracy declines on later documents: clauses from earlier contracts appear in later extractions, and page references from middle documents are dropped. Trace logs show raw OCR, table-parsing and validation tool outputs dominating the history, including coordinates, styling data, alternate OCR hypotheses, debug IDs, and validator traces. Downstream extraction only uses clause text, page number, document ID, confidence, and validation status. The operations team also needs the original tool responses available for traceability. What change best addresses the reliability problem?",
    "options": [
      "Store full tool outputs externally and append only the schema-relevant fields and provenance to the conversation.",
      "Replace the accumulated tool results with brief prose summaries after every fixed batch of five processed documents.",
      "Keep all raw tool outputs in the conversation history so Claude can determine for itself which details remain important.",
      "Increase max_tokens and reduce each request to fewer documents while leaving the tool result payloads unchanged."
    ],
    "answer": 0,
    "optionNotes": [
      "Tool results become part of the context and compete for attention with later documents. Trimming them to the fields the extraction uses keeps the prompt focused, while the external store preserves full traceability.",
      "Prose summaries can blur exact clause text, page numbers and confidence values that structured extraction needs. A fixed five-document interval also does not distinguish critical fields from noise.",
      "This is the pattern causing the degradation. Verbose payloads accumulate until they dominate the context, and Claude cannot reliably attend to the few fields that matter.",
      "max_tokens governs response length, not the quality of the accumulated input. Smaller runs delay the symptom but leave the verbose payloads in place."
    ],
    "explanation": "Every tool result added to the history competes for attention with later work. Keep the raw outputs in an external trace store for auditing, and put only the fields the extraction needs, with provenance, into the conversation.",
    "source": "pt2-q032"
  },
  {
    "id": "sc-extraction-021",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    "question": "Reviewers receive structured QA findings about extracted contract fields before downstream loading. After two weeks, audits show that most categories are useful, but findings labeled \"ambiguous payment terms\" are dismissed in 68% of reviews because the source wording is often acceptable. Reviewers have started ignoring the entire QA feed, including accurate findings about unsupported totals and missing effective dates. What should you do next?",
    "options": [
      "Temporarily suppress the ambiguous payment terms category while refining its criteria and examples.",
      "Raise the global confidence threshold for all QA findings until the overall finding volume drops to an acceptable level.",
      "Keep every finding category active and ask reviewers to dismiss incorrect items until enough data has accumulated.",
      "Add a general instruction telling Claude to be conservative and to report only findings it is highly confident about."
    ],
    "answer": 0,
    "optionNotes": [
      "Pausing the one noisy category restores trust in the accurate categories immediately. The team can then define what makes payment wording reportable, add examples, and bring the category back once it is precise.",
      "A global threshold treats every category as equally unreliable and can hide the accurate findings on totals and dates. It does not clarify the unclear decision boundary that causes the noise.",
      "Leaving a 68%-dismissal category in the feed deepens alert fatigue. More data may be useful later, but not at the cost of reviewers ignoring accurate findings.",
      "\"Be conservative\" does not say what makes payment wording reportable, so the same false positives are likely to continue in a slightly smaller volume."
    ],
    "explanation": "A high false-positive category can destroy trust in an otherwise useful feed. Temporarily disabling that category protects the accurate ones while its criteria and examples are tightened, which is more effective than global thresholds or vague instructions.",
    "source": "pt2-q044"
  },
  {
    "id": "sc-extraction-022",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.4 Manage context effectively in large codebase exploration",
    "question": "During a month-long effort to improve your extraction pipeline, Claude Code has explored parsers, JSON schema definitions, validation utilities, fixture documents, and downstream mapping code. After several long sessions, it starts giving answers based on generic extraction patterns rather than specific files it already inspected. Teammates joining later cannot reliably recover the earlier discoveries either. What should you do to make later exploration and follow-up changes more reliable?",
    "options": [
      "Ask Claude to reread the entire extractor codebase before each new change to refresh all of the implementation details.",
      "Continue the same session indefinitely, adding reminders in chat whenever Claude overlooks a previously found mapping.",
      "Rely on /compact whenever context grows, trusting the compressed conversation to preserve every schema detail and exception.",
      "Have Claude keep a scratchpad file in the repo recording discovered schemas, validators, edge cases, and file paths."
    ],
    "answer": 3,
    "optionNotes": [
      "Rereading everything wastes context and time and still dilutes attention across many files. It also leaves no durable record for teammates or later sessions.",
      "An ever-growing session worsens degradation as tool output accumulates. Chat reminders get buried in the middle of long context and are easily lost.",
      "Compaction reduces token use but summarizes lossily. Specific field mappings, file paths and edge cases can be condensed away, which is the failure already being observed.",
      "A scratchpad file moves key findings out of the volatile conversation into a persistent artifact. Later sessions and teammates can reload exact discoveries instead of relying on degraded context."
    ],
    "explanation": "Long exploration sessions degrade as tool results pile up and summaries drop detail. Recording schemas, validators, edge cases and file paths in a repository file gives every later session and teammate a durable, inspectable source of truth.",
    "source": "pt2-q043"
  },
  {
    "id": "sc-extraction-023",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    "question": "During consolidation of extracted obligations from 60 supplier contracts, the final dataset correctly groups duplicate obligations across documents. However, auditors cannot determine which contract clauses support each normalized obligation, and reviewers must reopen every source file to verify disputed entries. The consolidation step itself is valued and must stay. What change would best improve reliability without preventing consolidation?",
    "options": [
      "Keep only the highest-confidence extraction for each obligation and discard the lower-confidence duplicates during consolidation.",
      "Require each extracted obligation to carry source IDs and excerpts, then merge duplicates while keeping every supporting reference.",
      "Concatenate all document summaries before consolidation and ask Claude to regenerate citations for the final normalized obligations.",
      "Store source document names at the batch level only, then rely on reviewers to infer the relevant clauses when they need them."
    ],
    "answer": 1,
    "optionNotes": [
      "Dropping duplicates loses corroborating evidence and makes each record depend on a single source. Confidence is not a substitute for verifiable provenance.",
      "Provenance survives consolidation: duplicates are merged into one normalized obligation, and every supporting clause stays attached so reviewers can verify it directly.",
      "Regenerating citations after summarization is unreliable because the claim-to-source link may already be lost. It can produce plausible references that do not match the documents.",
      "Batch-level document names are far too coarse for obligation-level verification. Reviewers still have to hunt for the clause behind each entry."
    ],
    "explanation": "Consolidation and traceability are compatible when provenance is kept at the granularity of each extracted item. Carry source identifiers and excerpts with every obligation, and merge them along with the duplicates instead of discarding or reconstructing them.",
    "source": "pt2-q054"
  },
  {
    "id": "sc-extraction-024",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.6 Preserve information provenance and handle uncertainty in multi-source synthesis",
    "question": "A pipeline extracts insurance policy exclusions from packets containing the policy, riders, emails, and broker notes. The first pass captures detailed snippets, but a middle step condenses each packet into a short narrative before final JSON extraction. Audit reviewers find accurate-looking exclusions in final records, but they cannot determine which document or passage supports each exclusion, especially when riders override earlier policy language. What change best addresses this failure mode?",
    "options": [
      "Append a packet-level bibliography to every final JSON record so reviewers can manually search the likely source documents.",
      "Ask Claude to include citations only for exclusions it considers uncertain, keeping straightforward final records easier to read.",
      "Change intermediate handoffs so each extracted fact carries its source document, location, and excerpt into final synthesis.",
      "Increase the final synthesis context budget so Claude can reread all original packet documents before producing each record."
    ],
    "answer": 2,
    "optionNotes": [
      "A bibliography shows which documents were processed but does not link individual exclusions to passages. Which rider overrides which clause stays ambiguous.",
      "Confident-looking claims can still be wrong or unsupported, so provenance cannot depend on the model's sense of uncertainty. Every fact that downstream systems rely on needs it.",
      "Keeping source, location and excerpt attached to every fact through each handoff preserves provenance at the granularity of the output. It fixes the loss introduced by the narrative compression step.",
      "More context at the final step does not tie each fact back to its passage, and it adds cost and attention load. The provenance was lost earlier, in the compression step."
    ],
    "explanation": "Attribution is lost when intermediate steps compress findings into prose. Make provenance part of the data contract between steps, so each extracted fact travels with its source document, location and excerpt all the way into the final record.",
    "source": "pt3-q027"
  },
  {
    "id": "sc-extraction-025",
    "scenario": "extraction",
    "domain": 1,
    "subdomain": "1.7 Manage session state, resumption, and forking",
    "question": "A long-running audit of your extraction pipeline delegates separate Claude Code subagents to inspect parser modules, schema definitions, validation failures, and downstream mapping logic. Twice this week, the process was interrupted after hours of exploration. When restarted, the coordinator repeated completed investigations, missed several previously discovered edge cases, and gave subagents incomplete background about which document formats had already been analyzed. What design change would most improve reliability after interruptions?",
    "options": [
      "Resume the prior named session and ask Claude to infer the unfinished work from the accumulated conversation history.",
      "Have each subagent export structured state to fixed paths, then load a resume manifest into the restarted coordinator.",
      "Restart the audit from the beginning after any interruption, discarding partial subagent findings to avoid inconsistency.",
      "Keep a single freeform scratchpad summary updated by hand, then tell new subagents to continue from that summary."
    ],
    "answer": 1,
    "optionNotes": [
      "Resuming helps when prior context is still valid, but the accumulated history may hold stale tool results and verbose reasoning. Inferring unfinished work from it is exactly what failed after the restarts.",
      "Structured state at known paths records completed work, edge cases and open questions outside the conversation. The coordinator can rebuild its picture of progress and pass precise context to any new subagent.",
      "Starting over wastes hours of completed work and risks inconsistent coverage between runs. Hard-won edge cases may not be rediscovered.",
      "A freeform summary helps somewhat but lacks explicit fields for completed items, open questions and ownership. The coordinator cannot reliably decide what to resume or delegate from it."
    ],
    "explanation": "Conversation history is not a durable system of record for long multi-agent work. Having subagents write structured state to known locations, and loading a resume manifest on restart, lets the coordinator continue precisely where work stopped.",
    "source": "pt3-q048"
  },
  {
    "id": "sc-extraction-026",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.3 Distribute tools appropriately across agents and configure tool choice",
    "question": "Your pipeline defines four extraction tools, one per document type (invoice, receipt, purchase order, bank statement), and incoming files arrive with no type label. In testing with tool_choice left at its default, Claude occasionally replies with a sentence such as \"This appears to be a receipt\" instead of calling any tool. Every document must produce a structured extraction, and Claude must still pick the schema itself. The model you run accepts forced tool use. Which tool_choice setting fits?",
    "options": [
      "tool_choice {\"type\": \"any\"}, so Claude must call one of the tools but chooses which one to call.",
      "tool_choice {\"type\": \"auto\"}, so Claude decides on each document whether to call a tool at all.",
      "tool_choice forced to the invoice tool by name, applied in the same way to every incoming document.",
      "Leave tool_choice unset and add strongly worded instructions telling Claude to always call a tool."
    ],
    "answer": 0,
    "optionNotes": [
      "\"any\" requires a tool call while leaving the choice among the four schemas to Claude, which is exactly what unlabeled documents that must always yield structured output need.",
      "\"auto\" is the default that produced the prose replies in the first place. It permits Claude to answer in text instead of calling a tool.",
      "Forcing one named tool welds every document to the invoice schema, so receipts and bank statements would be extracted into the wrong shape.",
      "With tool_choice unset the behaviour is \"auto\", and prompt emphasis lowers but does not remove the chance of a text reply."
    ],
    "explanation": "tool_choice \"any\" forces a tool call while letting Claude choose which tool, which suits several schemas with unknown document types. Note that some newer models, such as Claude Opus 5.5 and Sonnet 5.5, reject \"any\" and named-tool forcing; on those, use \"auto\" with strict tool use and a prompt that says when each tool applies.",
    "source": "purcell-q052"
  },
  {
    "id": "sc-extraction-027",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your invoice schema marks vendor_tax_id as a required string. Reviewers notice that on invoices from small suppliers that genuinely lack a tax ID, Claude returns plausible-looking IDs that do not appear anywhere in the document. On invoices that do show a tax ID, extraction is accurate. What is the schema-level fix for these fabricated values?",
    "options": [
      "Keep the field required and add a prompt instruction that says \"never fabricate tax IDs\" in capital letters.",
      "Validate extracted tax IDs against the official checksum after extraction and discard any value that fails.",
      "Lower the sampling temperature so that Claude stops inventing values it cannot find in the document text.",
      "Make the field nullable, so Claude can legitimately return null when the tax ID is absent from the invoice."
    ],
    "answer": 3,
    "optionNotes": [
      "The instruction competes with a schema that still demands a value. When the document has none, the structure leaves no honest answer, so fabrication continues.",
      "A checksum only catches fabrications that happen to be malformed. Well-formed invented IDs pass, and the schema still pushes the model to invent them.",
      "Temperature changes how varied the output is, not whether a required field gets filled. An invented value is still invented at low temperature.",
      "A required, non-nullable field on information that may be absent forces the model to produce something. Allowing null gives it a legitimate way to say the value is not present, which removes the pressure to fabricate."
    ],
    "explanation": "Required fields for information that may not exist push the model toward fabrication because the schema leaves no honest answer. Making the field nullable, for example type [\"string\", \"null\"], lets the extraction report absence explicitly.",
    "source": "purcell-q053"
  },
  {
    "id": "sc-extraction-028",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Since adopting tool use with a strict schema, every extraction is syntactically valid. Yet invoices still arrive downstream where line items do not sum to the stated total, and values occasionally land in the wrong fields, such as a shipping charge recorded as a line item. A teammate argues that the schema guarantee must be broken. What should you understand, and what should you do?",
    "options": [
      "Schema compliance has been falsely advertised, so file a bug report and revert to plain-text JSON output.",
      "Schemas ensure structure, not meaning; extract calculated_total and stated_total and flag any mismatch.",
      "Relax all numeric fields to unconstrained strings so that schema validation can never reject an extraction.",
      "Re-run each affected extraction with the numeric discrepancy described in the retry prompt so it can be fixed."
    ],
    "answer": 1,
    "optionNotes": [
      "The guarantee covers shape, not truth, so nothing was falsely advertised. Reverting to plain-text JSON would bring back the syntax failures as well.",
      "A schema can guarantee types and required keys but not that the numbers reconcile. Extracting both totals and comparing them makes the discrepancy machine-visible, so it can trigger a retry or review.",
      "Turning numbers into strings destroys the structure downstream systems rely on and does nothing about the semantic errors.",
      "Describing the discrepancy in a retry presupposes that something has already detected it. That detection is the semantic validation layer this pipeline is missing."
    ],
    "explanation": "Tool use and strict schemas ensure structure, not semantic correctness. Add a semantic validation layer, for example extracting calculated_total next to stated_total with a conflict flag, so mismatches and misplaced values become detectable and can feed a retry or review.",
    "source": "purcell-q054"
  },
  {
    "id": "sc-extraction-029",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    "question": "A single analyze_document tool handles extraction, summarization, and claim verification, chosen by a mode parameter. Traces show the agent regularly picks the wrong mode, for example summarizing a contract when the user asked for its payment fields, and results are inconsistent across runs. Rewording the system prompt has not changed the pattern. What is the recommended redesign?",
    "options": [
      "Add a fourth auto mode that inspects the request and selects the right one of the other three modes internally.",
      "Document each mode's selection criteria far more thoroughly inside the single tool's existing description.",
      "Reduce the tool to two modes by merging extraction into summarization so there are fewer choices to make.",
      "Split it into purpose-specific tools: extract_data_points, summarize_content, and verify_claim_against_source."
    ],
    "answer": 3,
    "optionNotes": [
      "An auto mode buries the same selection problem one layer deeper, inside the tool, where it is even harder to observe or steer.",
      "Better documentation helps, but the structure stays ambiguous: one tool, one description and a parameter whose value is the real decision.",
      "Merging extraction into summarization removes a choice by removing a capability, and the overloaded design remains.",
      "Purpose-specific tools turn a hidden parameter choice into a visible tool selection, which is what tool descriptions are good at guiding. Each tool gets its own explicit contract and description."
    ],
    "explanation": "Multi-mode tools hide the real decision in a parameter. Splitting them into purpose-specific tools with distinct names and descriptions makes selection explicit, which reduces misrouting.",
    "source": "purcell-q057"
  },
  {
    "id": "sc-extraction-030",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.2 Implement structured error responses for MCP tools",
    "question": "When your MCP extraction tool hits a parsing failure on a corrupt PDF, it returns the text \"Error: could not parse document\" as an ordinary successful result. The agent then treats that sentence as document content and extracts fields from it, producing records with a vendor name of \"Error\". You want the agent to recognize the failure and decide what to do next. What is the correct MCP pattern?",
    "options": [
      "Prefix the error text with \"SYSTEM ERROR:\" in capital letters so that the agent notices it in the result.",
      "Return the failure with the MCP isError flag set, plus a description of what went wrong.",
      "Return a JSON body inside the successful result text with an error field the agent is told to check.",
      "Throw an unhandled exception in the server so that the MCP connection drops and the agent sees a failure."
    ],
    "answer": 1,
    "optionNotes": [
      "A prefix still relies on the model inferring failure from prose conventions inside what is reported as a successful result.",
      "isError is MCP's channel for tool failure. It makes the failure a machine-recognizable condition the agent can reason about, rather than text masquerading as a successful result.",
      "A structured body improves the error's shape but still delivers it as a successful result. The protocol-level flag is the signal the agent and client recognize.",
      "Crashing the server turns a recoverable tool error into a transport failure, cutting off every other tool on that server as well."
    ],
    "explanation": "MCP tools should report failures through the isError flag on the tool result, with a useful description. That lets the agent distinguish an error from content and choose to retry, skip or escalate, instead of extracting fields from an error message.",
    "source": "purcell-q058"
  },
  {
    "id": "sc-extraction-031",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your purchase-order extraction schema lists po_number, delivery_instructions and vat_number as required strings. Many genuine documents omit some of these, and in those cases Claude returns empty strings, \"N/A\", or occasionally a plausible-looking number copied from another field. Downstream code cannot tell an absent value from an extracted one. How should you change the schema?",
    "options": [
      "Keep the fields as required strings and add a prompt rule that the literal text N/A must be used whenever a value is missing.",
      "Remove the three fields from the schema and capture any missing-value context in a single free-text notes field instead.",
      "Allow null for these fields, for example type [\"string\", \"null\"], and tell Claude to return null when the source omits them.",
      "Add minLength constraints to the three fields so that empty strings fail validation and trigger an automatic retry."
    ],
    "answer": 2,
    "optionNotes": [
      "A sentinel string is still a string in the value column, so downstream code must special-case it, and the schema still demands something for every field. Fabricated numbers remain a risk.",
      "Dropping the fields loses structured data for the many documents that do contain them, and moves the absent-versus-present question into free text that nothing can query reliably.",
      "Null gives Claude a legitimate, machine-readable way to say the value is not in the document. Downstream code can then tell absence from an extracted value, and the pressure to invent a number disappears.",
      "Forbidding empty strings increases the pressure to put something in the field, which is what produces copied or invented values. String-length constraints are also not supported in strict tool schemas."
    ],
    "explanation": "Fields that may be absent from the source should be nullable rather than required non-null strings. Null is an honest, structured answer for missing data, so the model no longer has to choose between an empty placeholder and a fabricated value."
  },
  {
    "id": "sc-extraction-032",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your schema has a currency field with the enum USD, EUR, GBP and SEK. Invoices that state no currency are silently returned as USD, and amounts written as \"kr 1 200\" are labeled SEK even when the vendor is Norwegian or Danish. Analysts need to know whether a currency was stated, inferred from context, or impossible to determine. Which schema change gives them that?",
    "options": [
      "Add an \"unknown\" enum value plus a currency_basis field (stated, inferred, unknown) so Claude never has to guess silently.",
      "Set a schema default of USD for the field so that documents without a stated currency still validate and load cleanly.",
      "Replace the enum with a free-text currency string so Claude can copy whatever symbol or word appears in the document.",
      "Keep the four-value enum and ask Claude to choose the most likely currency based on the vendor's country of origin."
    ],
    "answer": 0,
    "optionNotes": [
      "An explicit unknown value gives Claude an honest answer when the evidence is insufficient, and currency_basis records how each value was obtained. Analysts can filter inferred or unknown values instead of trusting silent guesses.",
      "A USD default formalizes the silent guess the analysts are complaining about. Absent and stated USD become indistinguishable in the data.",
      "Free text such as \"kr\" or \"$\" keeps the ambiguity and destroys normalization, so every consumer has to reinterpret symbols on its own.",
      "Guessing from the vendor's country may be right more often, but the output still hides whether the currency was stated or inferred, which is exactly what analysts need to know."
    ],
    "explanation": "Enums need a way to express insufficient evidence; otherwise the model is forced to pick a real category. Adding an unknown value and a field that records how the value was determined keeps the output structured while making uncertainty visible."
  },
  {
    "id": "sc-extraction-033",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "A dedicated pipeline handles only supplier invoices and defines a single tool, record_invoice, whose input_schema is the invoice schema. With tool_choice left at auto, about 2% of responses are prose such as \"Here is the extracted data\" followed by JSON in a code block, which the parser rejects. The model you use accepts forced tool use, and you want every response to be a call to this one tool. What should you set?",
    "options": [
      "tool_choice {\"type\": \"none\"}, then ask Claude to return the invoice JSON as plain text that the parser can read.",
      "tool_choice {\"type\": \"tool\", \"name\": \"record_invoice\"}, so every response is a call to that one tool.",
      "Keep tool_choice at auto and add a second fallback tool that accepts free-text answers for the parser to repair.",
      "Keep tool_choice at auto and raise max_tokens so Claude has room to finish its prose and then call the tool."
    ],
    "answer": 1,
    "optionNotes": [
      "\"none\" prevents tool calls entirely, which moves every response onto the prose channel that is already failing.",
      "Naming the tool in tool_choice forces Claude to call record_invoice on every request, so the application always receives a structured tool_use block for its single schema.",
      "A free-text fallback tool gives Claude another way to avoid the schema and adds a repair step instead of removing the failure.",
      "The prose replies are not truncated tool calls; they are Claude choosing to answer in text, which auto allows. More output room does not change that choice."
    ],
    "explanation": "When there is exactly one extraction schema and the model supports forced tool use, setting tool_choice to that named tool guarantees a tool call on every request. With several schemas, \"any\" forces a call while leaving the choice of tool to Claude."
  },
  {
    "id": "sc-extraction-034",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "After you upgrade the extraction service to Claude Opus 5.5, every request fails with a 400 error saying that tool_choice types \"tool\" and \"any\" are not supported for this model. The service had forced the record_invoice tool so that responses were always schema-shaped. You need schema-valid output on the new model without going back to parsing prose. What should you change?",
    "options": [
      "Switch tool_choice to auto, set strict: true on record_invoice, and say in the prompt that the tool must be used.",
      "Switch tool_choice to none and prefill the assistant turn with an opening brace so that the reply starts as raw JSON.",
      "Keep forcing the tool, but retry each rejected request with exponential backoff until the API eventually accepts it.",
      "Move the schema text into the system prompt and parse the JSON out of the plain-text reply with a regular expression."
    ],
    "answer": 0,
    "optionNotes": [
      "This is the documented replacement on models that reject forced tool use: auto with strict tool use guarantees schema-valid tool input, and a clear prompt makes Claude call the tool. Structured outputs are the other documented option when a fixed JSON response is needed.",
      "Recent models, Claude 4.6 and later, reject a prefilled final assistant turn with a 400 error, and \"none\" removes the tool path entirely.",
      "The 400 is a validation error for this model, not a transient failure. Every retry will be rejected the same way.",
      "Regex parsing of prose is the brittle approach tool use was adopted to avoid, and it gives no schema guarantee."
    ],
    "explanation": "Some newer models, including Claude Opus 5.5, do not support forced tool use. For schema-valid output there, keep tool_choice at auto and add strict: true to the tool, or use structured outputs, and state in the prompt when the tool applies."
  },
  {
    "id": "sc-extraction-035",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.3 Enforce structured output using tool use and JSON schemas",
    "question": "Your contract schema marks termination_notice_days as optional, so Claude simply leaves the key out when it finds no notice period. Downstream, a missing key is ambiguous: the loader cannot tell whether Claude looked and found nothing or whether an older schema version, which lacked the field, produced the record. Data engineers want every record to show explicitly that each field was considered. Which schema design meets that need?",
    "options": [
      "Keep the field optional and have the loader treat any record without the key as having a zero-day notice period.",
      "Make the field required with a non-null integer type so that every record must contain an actual notice period.",
      "List the field as required but allow null, so the key is always present and null means \"not found in the source\".",
      "Add a schema_version field and drop termination_notice_days from any records produced by the older schema."
    ],
    "answer": 2,
    "optionNotes": [
      "Treating a missing key as zero days invents a business fact. A contract with no stated notice period is not the same as one with immediate termination.",
      "A non-null requirement forces a number onto contracts that have no notice period, which is the classic path to fabricated values.",
      "Required-but-nullable separates the two questions: the key's presence proves the field was considered, and null records that the source had no value. Engineers get an explicit answer for every field.",
      "A version field helps trace old records, but for new records an omitted key would still not show whether the field was considered."
    ],
    "explanation": "Optional (omittable) and nullable are different tools. Marking a field required while allowing null makes every record state explicitly whether a value was found, which is easier for downstream systems than interpreting missing keys."
  },
  {
    "id": "sc-extraction-036",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Your extraction retry loop works, but each failure is logged only as a free-text line such as \"validation failed, retried, passed\". After a month, the team wants to decide whether to change the prompt, the schema, or the few-shot examples. They cannot tell which rules fail most, on which document types, or whether retries actually fix them. What should the loop record for each validation failure?",
    "options": [
      "The full model transcript of every attempt, so engineers can read through the failures whenever a decision is needed.",
      "A daily count of retries charted against API cost, so the team can see whether the loop is getting more expensive.",
      "Only the final record that passed, since earlier failed attempts no longer matter once the document was corrected.",
      "Structured fields such as rule ID, field, error type, document type, attempt number, and whether the retry fixed it."
    ],
    "answer": 3,
    "optionNotes": [
      "Transcripts are useful for spot checks but cannot be aggregated. Answering \"which rule fails most on which document type\" would require reading thousands of them.",
      "Retry counts show cost trends but say nothing about which rules or document types cause failures, so they cannot guide prompt or schema changes.",
      "Discarding failed attempts throws away exactly the evidence needed to find systematic weaknesses in the prompt or schema.",
      "Structured error metadata can be grouped and counted. The team can see which rules fail on which document types and whether retries resolve them, then target the prompt, schema or examples accordingly."
    ],
    "explanation": "A feedback loop improves the system only if failures are recorded in an analyzable form. Capturing structured error metadata for each validation failure turns the retry loop into data for deciding where to change prompts, schemas or examples."
  },
  {
    "id": "sc-extraction-037",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Your agent submits extractions through a submit_extraction tool, and your code then checks business rules that the strict schema cannot express, such as amounts being positive and due_date falling after invoice_date. When a rule fails, the code returns a tool_result saying \"invalid input\", and Claude resubmits nearly the same values. You want Claude to correct the specific problem on its next call. How should the tool respond to a failed validation?",
    "options": [
      "Return a tool_result with is_error set to true, listing each failed field, the rule it broke, and the offending value.",
      "Return a successful tool_result so the loop ends, and queue the invalid record for a nightly batch correction job.",
      "Raise an exception in the tool handler so the API call fails and the whole extraction restarts from the beginning.",
      "Return \"invalid input\" again, but add a system prompt line asking Claude to double-check values before resubmitting."
    ],
    "answer": 0,
    "optionNotes": [
      "An error result with specific field, rule and value tells Claude exactly what to fix, while the document and its earlier call are still in context. That turns the next tool call into a targeted correction.",
      "Reporting success hides the failure from Claude and defers the fix to a separate job that lacks the conversation's context.",
      "Restarting from scratch discards the context that would make a targeted fix possible, and the same mistake is likely to recur.",
      "A generic message gives Claude nothing to act on. A reminder to double-check does not say which value broke which rule."
    ],
    "explanation": "Strict schemas cannot express every business rule; numeric bounds, for example, are not supported in strict mode, so code must check them. When the check fails, return an is_error tool result with specific, structured validation errors so Claude can correct exactly those fields on its next call."
  },
  {
    "id": "sc-extraction-038",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.4 Implement validation, retry, and feedback loops for extraction quality",
    "question": "Human reviewers correct about 6% of extracted shipping manifests by editing values directly in the review UI. The corrected records overwrite the originals, so nothing is left to show what Claude got wrong or why. The team wants reviewer work to steadily improve the prompt and the few-shot examples instead of fixing the same mistakes every week. What should you build?",
    "options": [
      "Ask reviewers to email a weekly summary of the mistakes they noticed most often to the prompt engineering team.",
      "Store each correction as a structured diff: field, original and corrected values, document type, reason.",
      "Fine-tune a separate classifier on the corrected records so it can predict which manifests reviewers will edit.",
      "Increase reviewer coverage to every manifest so that each mistake is caught before it reaches the shipping system."
    ],
    "answer": 1,
    "optionNotes": [
      "Weekly recollections are selective and unstructured. They cannot show how often each error occurs or on which document types.",
      "Structured diffs preserve what was wrong and why, in a form that can be grouped by field, document type and reason. Recurring patterns point to specific prompt rules or examples to add.",
      "Predicting which manifests will be edited may help routing, but it does not record what the errors were, so it cannot improve the extraction itself.",
      "Full coverage catches mistakes at high cost and still discards the information about them, so the same errors keep occurring."
    ],
    "explanation": "Reviewer corrections are the richest feedback signal an extraction pipeline has, but only if they are captured as structured data. Field-level diffs with document type and reason let the team find recurring errors and turn them into prompt changes or new few-shot examples."
  },
  {
    "id": "sc-extraction-039",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "Two jobs use the same extraction prompt. One runs when an accounts-payable clerk uploads an invoice and waits on screen for the fields to appear; the other re-extracts 120,000 archived invoices every night for a reconciliation report read the next afternoon. Finance asks you to cut API spend without slowing down the clerks. Which plan is right?",
    "options": [
      "Move both jobs to the Message Batches API, since most batches finish within an hour and every request costs less.",
      "Keep both jobs on synchronous calls, because batch results cannot be tied back to the invoices that produced them.",
      "Keep clerk uploads synchronous and send the nightly re-extraction through the Message Batches API at lower cost.",
      "Run the nightly job synchronously with high concurrency, and use batches for clerk uploads during quiet hours."
    ],
    "answer": 2,
    "optionNotes": [
      "Most batches finish within an hour, but a batch can take up to 24 hours and has no latency guarantee. A clerk waiting on screen cannot accept that.",
      "Batch requests carry a custom_id that is returned with each result, so results map back to invoices reliably.",
      "The clerk flow is blocking and needs synchronous latency, while the nightly job has hours of slack and gets the batch discount. The 120,000 requests must be split across at least two batches, since one batch holds at most 100,000.",
      "This inverts the fit: the latency-sensitive work goes to the asynchronous path and the latency-tolerant work pays the full synchronous price."
    ],
    "explanation": "The Message Batches API costs less and suits latency-tolerant work, but batches may take up to 24 hours. Keep interactive, blocking requests on the synchronous Messages API and move scheduled bulk work to batches."
  },
  {
    "id": "sc-extraction-040",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "A regulator requires that disclosures extracted from incoming filings be published within four hours of receipt. Filings arrive in bursts of a few hundred, and an engineer proposes submitting each burst as a Message Batch to halve the cost, polling every minute for results. In load tests most batches finished in under an hour. Should you adopt this design for the four-hour deadline?",
    "options": [
      "Yes, because polling every minute guarantees that results are collected as soon as each batch finishes processing.",
      "No, because a batch may take up to 24 hours with no latency guarantee, so a hard four-hour deadline needs synchronous calls.",
      "Yes, as long as each burst is split into batches of fewer than 100 requests so that they are processed with priority.",
      "No, because the Message Batches API cannot process extraction requests that include tool definitions or images."
    ],
    "answer": 1,
    "optionNotes": [
      "Polling controls how quickly you notice completion, not how quickly the batch completes. The processing time itself has no guarantee below 24 hours.",
      "Load-test averages do not create a guarantee. Batches can take up to 24 hours and may expire unfinished under heavy demand, so a regulatory deadline of four hours needs the synchronous API.",
      "Small batches are not given priority; processing time depends on demand and volume, and the 24-hour window still applies.",
      "Batch requests accept the same parameters as the Messages API, including tools and images. The real problem is latency, not feature support."
    ],
    "explanation": "The Message Batches API trades latency for cost: most batches finish quickly, but processing may take up to 24 hours. Work with a hard deadline shorter than that window belongs on the synchronous Messages API."
  },
  {
    "id": "sc-extraction-041",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "Your synchronous extraction agent calls a lookup_vendor tool mid-extraction to fetch the canonical vendor ID, then calls submit_extraction. You move the nightly backlog to the Message Batches API by putting the same initial request into each batch entry. Many results come back with stop_reason \"tool_use\" and a lookup_vendor call, but no extraction. What is the underlying issue, and what is the fix?",
    "options": [
      "The batch API drops tool results, so resubmit those entries with tool_choice set to none so Claude answers directly.",
      "Each batch entry is one Messages call, so the tool loop never continues; pre-resolve vendor data into the prompt.",
      "The batch exceeded its 24-hour window, so Claude stopped mid-task; split the backlog into several smaller batches.",
      "Batch requests ignore tool definitions, so move lookup_vendor's description into the system prompt as plain text."
    ],
    "answer": 1,
    "optionNotes": [
      "Nothing is dropped: the batch returned exactly what one Messages call returns. Disabling tools would also stop Claude from calling submit_extraction.",
      "A batch entry is a single request and response; no one executes the tool and sends the result back. Supplying the vendor reference data up front lets each entry finish in one turn, and anything that truly needs a tool loop must run in further rounds or synchronously.",
      "An expired request comes back with an expired result type, not a successful response ending in tool_use. The stop_reason shows Claude was waiting for a tool result.",
      "Batches accept tool definitions; the tool_use responses prove the tools were seen. The issue is that nothing runs the loop."
    ],
    "explanation": "Each Message Batches entry is one independent Messages API call, so an agentic loop that needs tool results cannot continue inside it. For batch extraction, design single-turn requests by putting the needed reference data in the prompt, or run tool-dependent steps in later rounds or synchronously."
  },
  {
    "id": "sc-extraction-042",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.5 Design efficient batch processing strategies",
    "question": "Your nightly batch processor treats every line in the results file as a finished extraction and writes the message content straight to the warehouse. One morning, several hundred warehouse records are blank. Investigation shows those lines had result types other than succeeded, and some succeeded lines had failed your schema validators as well. How should result processing be redesigned?",
    "options": [
      "Treat any line that has a custom_id as complete, and rely on the warehouse's own constraints to reject bad records.",
      "Discard the whole results file whenever any line is not succeeded, and resubmit the full batch the following night.",
      "Branch on each line's result type: validate succeeded ones, and resubmit errored or expired ones by custom_id.",
      "Re-run the whole batch synchronously each morning and compare the two outputs to decide which records to load."
    ],
    "answer": 2,
    "optionNotes": [
      "Every line has a custom_id, including errored and expired ones, so this is the current bug. Warehouse constraints are not designed to catch extraction errors.",
      "Throwing away thousands of good results because of a few failures wastes cost and delays the entire load by a day.",
      "Each result carries a type (succeeded, errored, canceled or expired) and its custom_id. Validating successes and resubmitting only the failed requests keeps bad data out and limits rework.",
      "Running everything twice doubles cost and removes the point of using batches, without defining which output is right."
    ],
    "explanation": "Batch results must be handled per request: check each result type, match by custom_id, validate succeeded outputs, and resubmit errored or expired requests selectively. A successful API result is not the same as a valid extraction."
  },
  {
    "id": "sc-extraction-043",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "Today 10% of extracted insurance claims are randomly sampled for human review, and the rest load automatically. Audits show errors concentrate in a few fields, such as policy_number on faxed forms and loss_date when several dates appear, while most fields on most claims are reliably correct. The random sample wastes reviewer time on clean claims and misses many of the error-prone ones. What routing design should replace it?",
    "options": [
      "Raise the random sample to a quarter of all claims, so that more error-prone records happen to reach reviewers.",
      "Have Claude return one overall confidence score per claim and route claims below a single global cut-off.",
      "Send every claim with any null field to review, since nulls are the most visible sign of extraction trouble.",
      "Emit per-field confidence with evidence, calibrate thresholds per field, and send reviewers only flagged fields."
    ],
    "answer": 3,
    "optionNotes": [
      "A bigger random sample costs proportionally more reviewer time and still catches error-prone fields only by chance.",
      "One score per claim hides which field is uncertain, so a shaky policy_number can sit behind high confidence elsewhere. Reviewers also have to recheck the whole claim.",
      "Nulls are often correct for absent data, and the errors here are wrong values, not missing ones. This routes the wrong claims.",
      "Field-level confidence, calibrated on labeled data, targets review at the fields and conditions where errors actually occur. Reviewers check only the flagged values, with evidence beside them."
    ],
    "explanation": "Random sampling spreads reviewer effort evenly while errors cluster in specific fields. Routing by calibrated field-level confidence, with the source evidence attached, focuses human review on the values most likely to be wrong."
  },
  {
    "id": "sc-extraction-044",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "Your extractor is validated on typed invoices and purchase orders, where labeled accuracy is above 99%. A new client starts sending handwritten delivery notes and photographed receipts, and Claude reports high confidence on those too. The current rule auto-approves any record whose confidence exceeds 0.9, regardless of document type. How should review routing handle the new formats?",
    "options": [
      "Route the new document types to review until accuracy is measured on labeled samples, then set their own thresholds.",
      "Keep auto-approving them, since Claude's reported confidence on the new formats is just as high as on typed ones.",
      "Raise the global threshold to 0.97 for every document type so the new formats are reviewed more often than before.",
      "Reject handwritten notes and photographed receipts outright and ask the client to resend typed versions only."
    ],
    "answer": 0,
    "optionNotes": [
      "Confidence calibrated on typed documents says nothing about handwriting or photos. Reviewing the new types until labeled accuracy is known, then setting type-specific thresholds, keeps unvalidated output out of downstream systems.",
      "Reported confidence is not evidence of accuracy on a format that has never been validated. High confidence on unfamiliar inputs is a common failure mode.",
      "A global change sends many already-validated typed documents to review and still applies an uncalibrated threshold to the new formats.",
      "Refusing the documents avoids the problem rather than solving it, and the client relationship depends on handling them."
    ],
    "explanation": "Confidence thresholds are only meaningful for the document types they were calibrated on. New formats should be routed to review by document type until labeled data shows how accurate they are, and then get their own thresholds."
  },
  {
    "id": "sc-extraction-045",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "Claude returns a confidence score from 0 to 1 for every extracted field, and the team plans to auto-approve fields that score 0.85 or higher. Nobody has checked how often a 0.85 field is actually correct, and spot checks have already found some confidently wrong bank account numbers. Before using the scores for routing, what should you do?",
    "options": [
      "Ask Claude to be more conservative when scoring so that fewer fields cross the 0.85 auto-approval threshold.",
      "Compare the scores with labeled outcomes per field and set thresholds where accuracy meets the target.",
      "Average the scores across all fields on a document and route whole documents rather than fields by that average.",
      "Replace the numeric scores with high, medium, and low labels, which reviewers find easier to interpret quickly."
    ],
    "answer": 1,
    "optionNotes": [
      "Shifting the scores downward does not make them track accuracy. An uncalibrated score is still uncalibrated after a prompt change.",
      "Calibration on a labeled set shows how often each score band is actually right for each field. Thresholds can then be set where measured accuracy meets the target, and fields that never get there stay in review.",
      "Averaging hides the uncertain field, such as an account number, behind confident ones and still relies on uncalibrated scores.",
      "Coarser labels are easier to read but no more reliable. Without labeled outcomes they are just as untested."
    ],
    "explanation": "Model-reported confidence is a useful signal only after it is calibrated against labeled outcomes. Measure accuracy per field at each score level, then set thresholds where the data shows they are safe."
  },
  {
    "id": "sc-extraction-046",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "Your routing now sends low-confidence fields and new document types to reviewers, and everything else loads automatically. Three months in, reviewer queues look healthy, but nobody checks the auto-approved records. A slow drift in accuracy, for example after a large vendor redesigns its invoice template, would go unnoticed. What should you add?",
    "options": [
      "Turn off automatic loading for one week each quarter and have reviewers check every record during that week.",
      "Lower all field thresholds by 0.05 each month so that more records gradually flow into the review queues.",
      "Ask Claude to flag any document that looks different from those it saw during the original validation run.",
      "Audit a small stratified sample of auto-approved records by type, and recalibrate when accuracy drops."
    ],
    "answer": 3,
    "optionNotes": [
      "A quarterly full review is expensive and leaves up to three months of drift undetected between checks.",
      "Steadily lowering thresholds grows the review load whether or not accuracy has changed, and does not measure drift.",
      "Claude has no memory of the validation run across requests, so it cannot tell which documents differ from those it was validated on.",
      "Targeted routing decides what is reviewed; a small stratified sample of auto-approved output measures whether that routing is still safe. A drop in sampled accuracy triggers recalibration for that segment."
    ],
    "explanation": "Confidence-based routing needs ongoing monitoring of what it lets through. A small stratified audit sample of auto-approved records, by document type and field, detects drift early, while the main routing stays targeted rather than random."
  },
  {
    "id": "sc-extraction-047",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.5 Design human review workflows and confidence calibration",
    "question": "Your supplier onboarding extraction fills about 30 fields, including bank_account_number and payment_routing_code. A misread on those two fields can send a payment to the wrong account, while a misread on most other fields is caught later by the supplier. Today all fields share one confidence threshold. How should review routing account for the difference in risk?",
    "options": [
      "Keep a single shared threshold, since a calibrated confidence score already captures how likely each field is wrong.",
      "Drop the two payment fields from extraction and ask suppliers to enter their bank details by hand in a separate form.",
      "Set stricter thresholds for the payment fields, or always review them when they change, while other fields use their own.",
      "Ask Claude to double-check the payment fields in the same response and auto-approve whenever both readings match."
    ],
    "answer": 2,
    "optionNotes": [
      "Calibration tells you how likely an error is, not how costly it is. The same error rate is acceptable on a contact name and unacceptable on a bank account.",
      "Removing the fields gives up the automation for the most valuable data and replaces it with manual entry that has its own error rate.",
      "Routing should weigh both the chance of an error and its consequence. Stricter thresholds, or mandatory review for high-impact fields, put human attention where a mistake is most expensive.",
      "A self-check in the same response tends to agree with the first reading, so matching readings are weak evidence of correctness."
    ],
    "explanation": "Human review routing should reflect both calibrated confidence and the cost of an error. High-impact fields such as bank details deserve stricter thresholds or mandatory review, while low-risk fields can be automated more aggressively."
  },
  {
    "id": "sc-extraction-048",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "Your prompt includes three few-shot examples for extracting lease terms, all taken from the same landlord's two-column template. Accuracy is high on that template but drops on leases where the terms appear in prose paragraphs, in an amendment table, or in a scanned addendum. Adding more examples from the same template did not help. How should you revise the examples?",
    "options": [
      "Use three to five examples covering prose, tables, and scanned addenda, each mapped to the same output schema.",
      "Remove all of the examples and rely on detailed field definitions, since examples bias Claude toward one template.",
      "Keep the template examples and add a sentence telling Claude that other leases may use different layouts.",
      "Add ten more examples from the original template so the pattern is reinforced more strongly in the prompt."
    ],
    "answer": 0,
    "optionNotes": [
      "Diverse examples show that the same field can appear in very different structures and still map to one schema. That is what lets Claude generalize to layouts it has not seen.",
      "Removing examples gives up the most effective tool for teaching judgment. The problem is that the examples are too similar, not that examples exist.",
      "A one-sentence warning does not show Claude how terms look in prose or tables. Examples demonstrate what instructions only mention.",
      "More copies of the same template deepen the overfitting that is already causing the drop, as the earlier attempt showed."
    ],
    "explanation": "Few-shot examples teach most when they cover the variety of inputs the system will see. A small set spanning prose, tables and scanned addenda helps Claude extract consistently across formats instead of overfitting to one template."
  },
  {
    "id": "sc-extraction-049",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "After you add four few-shot examples to your invoice prompt, extraction of present fields improves, but the rate of fabricated purchase-order numbers rises sharply. Every example happens to contain a PO number, and the schema already allows null for po_number. Reviewers confirm the invented numbers never appear in the source. What is the best fix?",
    "options": [
      "Make po_number required and non-null so that the schema forces Claude to commit to one value on every invoice.",
      "Add an example where the invoice has no PO number and the expected output shows po_number as null.",
      "Remove po_number from the examples entirely so that Claude no longer sees what a PO number looks like.",
      "Add a validator that rejects any PO number shorter than eight characters and then retries the extraction."
    ],
    "answer": 1,
    "optionNotes": [
      "Requiring a value is the opposite of what is needed; it removes the honest null answer and increases fabrication.",
      "The examples taught, implicitly, that a PO number is always present. Showing a case with the field absent and null in the output teaches the missing behaviour directly.",
      "Removing the field from examples loses the guidance that improved extraction where PO numbers do exist.",
      "A length check catches only some fabrications and retries would invent new ones, because nothing tells Claude that null is acceptable."
    ],
    "explanation": "Few-shot examples teach patterns, including unintended ones. If every example has a value, Claude learns that the value is always present; include examples with absent fields and null outputs so the model learns to report absence."
  },
  {
    "id": "sc-extraction-050",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.2 Apply few-shot prompting to improve output consistency and quality",
    "question": "Your pipeline extracts invoice_date from vendors in the US, the UK, and Germany. Dates like 03/04/2025 are being normalized inconsistently, sometimes as March 4 and sometimes as April 3, even for the same vendor. The prompt already says \"interpret dates using the document's locale\", but Claude applies the rule unevenly. What change would most improve consistency?",
    "options": [
      "Tell Claude to always assume month-first ordering, since most of the company's invoices come from US vendors.",
      "Return dates exactly as written and let each downstream consumer decide how to interpret the day and month.",
      "Add examples where locale cues such as address, currency, and language set the date order, plus an ambiguous case.",
      "Lower the temperature to zero so that the same vendor's dates are always interpreted in exactly the same way."
    ],
    "answer": 2,
    "optionNotes": [
      "A fixed month-first rule is wrong for every UK and German invoice, turning inconsistency into systematic error.",
      "Passing raw strings downstream multiplies the problem: every consumer must solve the same ambiguity, probably differently.",
      "Examples show how to apply the locale rule using concrete cues, and an ambiguous example shows what to output when the cues conflict or are missing. That turns a vague instruction into a demonstrated procedure.",
      "Temperature reduces randomness but does not teach which cues decide the order. Claude can still be consistently wrong."
    ],
    "explanation": "An instruction like \"use the document's locale\" leaves Claude to work out which cues matter. A few examples that show those cues in action, including how to handle a genuinely ambiguous date, produce more consistent normalization than further prose."
  },
  {
    "id": "sc-extraction-051",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    "question": "Your extraction returns line_items for each invoice, but the totals check fails on about 9% of documents. Inspection shows Claude sometimes includes subtotal, tax, shipping and discount rows as line items, and sometimes omits them, depending on how the table is laid out. The prompt currently says only \"extract all line items from the invoice\". What prompt change would most improve precision?",
    "options": [
      "Ask Claude to be careful and to extract only the rows that it is confident are genuine line items.",
      "Define what counts as a line item and which rows to exclude or map to separate fields.",
      "Ask Claude to extract every row of every table and let downstream code decide which rows are items.",
      "Increase max_tokens so Claude has enough room to reason about each table row before extracting it."
    ],
    "answer": 1,
    "optionNotes": [
      "\"Be careful\" and \"confident\" do not define the boundary, so Claude keeps guessing differently depending on layout.",
      "Explicit criteria remove the ambiguity: purchased goods and services are line items, while subtotal, tax, shipping and discount rows go to their own fields. The totals check then has consistent inputs.",
      "Moving classification downstream relocates the same judgment problem into code that sees even less context.",
      "The issue is unclear criteria, not truncated output. More room to write does not tell Claude which rows count."
    ],
    "explanation": "Inconsistent extraction often reflects an undefined category rather than model error. Stating explicitly what counts as a line item and where the other rows go gives Claude a stable rule across table layouts."
  },
  {
    "id": "sc-extraction-052",
    "scenario": "extraction",
    "domain": 4,
    "subdomain": "4.6 Design multi-instance and multi-pass review architectures",
    "question": "For wire-transfer instructions, your extractor and its self-check run in one request: Claude extracts the beneficiary account and amount, then confirms them against the document in the same response. Audits find that when the first reading is wrong, the self-check almost always agrees with it. The team wants a stronger check on these few high-value fields without re-reviewing every field. What should you do?",
    "options": [
      "Ask for a second confirmation in the same response, requiring Claude to restate each value before agreeing.",
      "Send only the extracted values, without the document, to a second call that checks them for plausibility.",
      "Raise the temperature on the self-check step so that it is less likely to repeat the original reading.",
      "Run a separate instance that re-extracts or verifies only those fields from the source and flags disagreement."
    ],
    "answer": 3,
    "optionNotes": [
      "A further confirmation in the same response shares the same context and tends to repeat the first reading.",
      "Without the document a checker can judge only whether a value looks plausible, not whether it matches the source. A wrong but well-formed account number passes.",
      "More randomness in the same context does not create independence; it adds noise to both correct and incorrect readings.",
      "An independent instance reading the source fresh is not anchored on the first answer. Limiting it to the high-value fields keeps the cost small, and disagreements go to a human."
    ],
    "explanation": "Self-checks in the same context share the original's blind spots. For a small set of high-value fields, an independent pass over the source document provides a real second reading, and disagreement is a strong signal for human review."
  },
  {
    "id": "sc-extraction-053",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    "question": "Your agent has two tools, extract_invoice and extract_receipt, whose descriptions both read \"Extracts structured data from a financial document.\" Logs show Claude often sends point-of-sale receipts to extract_invoice and supplier invoices with no due date to extract_receipt. The schemas themselves are correct for each document type. What change would most directly reduce the misrouting?",
    "options": [
      "Rewrite each description to state which documents it handles, their telltale features, and when to use the other tool.",
      "Merge both tools into one extract_document tool with a doc_type parameter that Claude fills in at call time.",
      "Rename the tools to tool_a and tool_b so Claude stops relying on their names and reads the schemas instead.",
      "Add a system prompt line asking Claude to think carefully about the document type before choosing a tool."
    ],
    "answer": 0,
    "optionNotes": [
      "Tool descriptions are Claude's main basis for choosing a tool. Saying what each one covers, how to recognize those documents and where the boundary lies resolves the ambiguity at its source.",
      "A doc_type parameter moves the same unclear decision into an argument, without giving Claude any more information to make it.",
      "Meaningless names remove a helpful signal and leave the identical descriptions as the only guide.",
      "A general instruction to think carefully does not supply the missing distinction between the two document types."
    ],
    "explanation": "When two tools have near-identical descriptions, Claude has no basis for choosing between them. Descriptions should state what each tool handles, the features that identify its inputs, and when to use the other tool instead."
  },
  {
    "id": "sc-extraction-054",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.2 Implement structured error responses for MCP tools",
    "question": "Your MCP ocr_document tool fails for two different reasons: the OCR service sometimes times out under load, and some uploaded PDFs are password-protected. Both cases currently return isError with the text \"OCR failed\". As a result, the agent retries password-protected files repeatedly and gives up too early on timeouts. How should the tool report these failures?",
    "options": [
      "Return isError with structured details, such as an error category, a retryable flag, and a short description.",
      "Return an empty successful result in both cases so that the agent moves on to the next document without delay.",
      "Retry inside the tool five times for every failure, and only then return the same \"OCR failed\" message.",
      "Drop isError and return a longer human-readable paragraph explaining the possible causes of OCR failures."
    ],
    "answer": 0,
    "optionNotes": [
      "Structured error details let the agent tell a transient timeout, which is worth retrying, from a permanent condition such as a password-protected file, which should be escalated or skipped.",
      "An empty success hides both failures, so downstream steps treat unread documents as documents with no content.",
      "Blind internal retries waste time on files that can never succeed and still leave the agent unable to tell the two cases apart.",
      "Without isError the failure looks like a successful result, and a prose explanation of possible causes does not say which one occurred."
    ],
    "explanation": "MCP tool errors should be flagged with isError and carry structured context, such as category and whether a retry can help. That lets the agent retry transient failures and stop retrying permanent ones."
  },
  {
    "id": "sc-extraction-055",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.3 Distribute tools appropriately across agents and configure tool choice",
    "question": "A coordinator classifies each incoming document and then hands it to an extraction subagent. Today every subagent receives all 14 tools, including email, file deletion and every document-type schema, and traces show subagents occasionally calling the wrong schema tool or sending emails. Each subagent only ever needs to extract one document type. How should the tools be distributed?",
    "options": [
      "Keep all 14 tools on every subagent and add a system prompt listing which tools each subagent should avoid.",
      "Give each extraction subagent only its document type's schema tool and what it needs, keeping the rest elsewhere.",
      "Remove the tools from the subagents and have them return JSON as plain text for the coordinator to validate.",
      "Give the coordinator only the email and deletion tools, and let the subagents keep every schema tool for flexibility."
    ],
    "answer": 1,
    "optionNotes": [
      "A list of tools to avoid is guidance the model can still ignore, and the extra tools keep cluttering the subagent's choices.",
      "Scoping each subagent's tools to its role removes wrong choices and risky side effects entirely. Fewer, relevant tools also make selection more reliable.",
      "Dropping the schema tool gives up structured output and brings back the parsing problems tool use solves.",
      "Subagents would still choose among every schema, so the wrong-schema calls the traces show would continue."
    ],
    "explanation": "Agents choose tools more reliably when they have only the tools their role requires. Restricting each extraction subagent to its own schema tool prevents misrouting and removes access to unrelated, risky actions."
  },
  {
    "id": "sc-extraction-056",
    "scenario": "extraction",
    "domain": 2,
    "subdomain": "2.4 Integrate MCP servers into Claude Code and agent workflows",
    "question": "Your team uses Claude Code to develop the extraction pipeline and wants everyone to use the same MCP server, which reads sample documents from the company's document store. Each developer has a personal access token for that store. One engineer committed .mcp.json with their own token pasted into it, and security has asked for it to be removed. How should the server be configured?",
    "options": [
      "Have each developer run claude mcp add at user scope, typing in their own token, so nothing is committed.",
      "Commit .mcp.json at project scope with a placeholder token string that each developer replaces locally.",
      "Commit a project-scoped .mcp.json referencing ${DOCSTORE_TOKEN}, with each developer setting the variable.",
      "Store the token in CLAUDE.md so that Claude can pass it to the MCP server when it first connects in a session."
    ],
    "answer": 2,
    "optionNotes": [
      "User scope keeps each configuration private and uncommitted, so the team's setups drift apart and new members get nothing on clone.",
      "A placeholder in a tracked file invites developers to paste real tokens into it, which is how the original leak happened.",
      "Claude Code expands environment variables in .mcp.json, so one shared, version-controlled configuration works for everyone while each token stays in the developer's own environment.",
      "CLAUDE.md is committed project context that goes into the model's prompt, so it would expose the secret, and it is not a mechanism for MCP authentication."
    ],
    "explanation": "Shared MCP servers belong in a project-scoped .mcp.json so the whole team gets the same setup. Credentials should be referenced through environment variable expansion such as ${DOCSTORE_TOKEN}, never committed."
  },
  {
    "id": "sc-extraction-057",
    "scenario": "extraction",
    "domain": 1,
    "subdomain": "1.1 Design and implement agentic loops for autonomous task execution",
    "question": "Your extraction agent can call lookup_vendor and lookup_po before calling submit_extraction. The loop code currently stops as soon as a response contains any text, and it also stops after the first tool result has been returned. As a result, many runs end after the vendor lookup without a submitted extraction. How should the loop decide whether to continue?",
    "options": [
      "Continue only until the first tool result has been returned, then ask Claude to summarize the extracted fields.",
      "Stop whenever the response contains text, because text means Claude has finished working on the document.",
      "Run a fixed three iterations for every document, which covers both lookups and the final submission call.",
      "Check stop_reason: run the requested tools and call again on \"tool_use\", and finish on \"end_turn\"."
    ],
    "answer": 3,
    "optionNotes": [
      "Stopping after one tool result is the current bug: the agent still needs the PO lookup and the submission call.",
      "Claude often writes text alongside a tool_use block, for example explaining the next lookup, so text alone is not a completion signal.",
      "A fixed count is too few when Claude needs another lookup and wasteful when it needs fewer; it ignores what Claude is actually asking for.",
      "stop_reason is the structured signal: \"tool_use\" means Claude is waiting for tool results, and \"end_turn\" means the turn is complete. Looping on it lets the agent finish both lookups and the submission."
    ],
    "explanation": "Agentic loops should be driven by stop_reason: execute the requested tools and call Claude again while it is \"tool_use\", and stop at \"end_turn\". Text content and fixed iteration counts are unreliable completion signals, though a cap can serve as a runaway backstop."
  },
  {
    "id": "sc-extraction-058",
    "scenario": "extraction",
    "domain": 5,
    "subdomain": "5.2 Design effective escalation and ambiguity resolution patterns",
    "question": "Some invoices show two different totals: a printed total and a handwritten corrected total, or a summary-box total that differs from the sum of the line items. Claude currently picks one value silently, and reviewers cannot tell which one was chosen or that a conflict existed. Downstream payment needs a clear signal whenever the amount is uncertain. How should the extraction handle these documents?",
    "options": [
      "Always take the larger of the two totals, since underpaying a supplier is riskier than overpaying them.",
      "Capture each candidate value with its location, set a conflict flag, and route flagged invoices to review.",
      "Ask Claude to pick the most likely total and to lower its confidence score so the choice is trusted less.",
      "Leave total_amount null whenever two values appear, and let the payment team find the correct amount."
    ],
    "answer": 1,
    "optionNotes": [
      "A fixed rule resolves the conflict arbitrarily and hides it, so overpayments flow through without anyone seeing the discrepancy.",
      "Recording both values, where they appear and a conflict flag preserves the ambiguity instead of resolving it silently. A reviewer can make the call with the evidence in front of them.",
      "A lowered score still stores a single silently chosen value and loses the alternative that a reviewer would need.",
      "Null says the value is absent, which is false here, and it discards both candidates, leaving the payment team to start from scratch."
    ],
    "explanation": "When the source itself is contradictory, the extraction should represent the conflict rather than resolve it silently. Capturing each candidate with its location and a conflict flag gives downstream systems a clear signal and gives reviewers the evidence."
  },
  {
    "id": "sc-extraction-059",
    "scenario": "extraction",
    "domain": 1,
    "subdomain": "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    "question": "Your Agent SDK extraction agent calls a write_to_erp tool after extraction. The system prompt says never to call write_to_erp unless validation_passed is true, yet logs show a handful of writes each week with failed validation. Separately, the vendor-lookup MCP tool returns dates in three different formats, which confuses later steps. Which approach addresses both problems?",
    "options": [
      "Repeat the validation rule in capital letters in the system prompt and add an example of a refused write.",
      "Add a PreToolUse hook that blocks write_to_erp unless validation passed, and a PostToolUse hook to normalize dates.",
      "Move the validation rule into CLAUDE.md so it is loaded every session, and ask Claude to reformat the dates.",
      "Remove write_to_erp from the agent and have an engineer copy validated records into the ERP system by hand."
    ],
    "answer": 1,
    "optionNotes": [
      "Stronger wording lowers the violation rate but cannot guarantee it reaches zero, and it does nothing about the inconsistent date formats.",
      "A PreToolUse hook enforces the rule in code before the call runs, so it holds every time. A PostToolUse hook can rewrite the MCP tool's output into one date format before Claude sees it.",
      "CLAUDE.md is guidance in the prompt just like the system prompt, so it is not enforcement. Asking Claude to reformat dates leaves normalization to model judgment.",
      "Manual copying removes the risk by removing the automation, adding labor and its own error rate."
    ],
    "explanation": "Rules that must always hold should be enforced deterministically with hooks rather than prompt instructions. PreToolUse hooks can block disallowed calls, and PostToolUse hooks can normalize tool output before the model processes it."
  },
  {
    "id": "sc-extraction-060",
    "scenario": "extraction",
    "domain": 1,
    "subdomain": "1.6 Design task decomposition strategies for complex workflows",
    "question": "Your extractor must pull every obligation from 400-page master service agreements with many schedules. A single request over the whole document returns well-formed output, but obligations in the middle schedules are frequently missed. Obligations that span a page break are sometimes split into two partial entries. What decomposition strategy should you use?",
    "options": [
      "Split the agreement by section with a small overlap, extract per section with page references, then merge and dedupe.",
      "Ask Claude to summarize the whole agreement first, then extract the obligations from that summary in a second call.",
      "Keep a single request but raise max_tokens so that Claude has more room to list every obligation in the agreement.",
      "Extract only from the main body and the first schedule, which is where most obligations normally tend to appear."
    ],
    "answer": 0,
    "optionNotes": [
      "Section-sized requests give each part of the agreement full attention, the overlap keeps obligations that cross a boundary intact, and a merge step with page references removes duplicates from the overlaps.",
      "A summary compresses away exactly the detailed obligations the extraction needs, and its omissions become permanent.",
      "The output is not truncated; obligations are missed because attention over a very long input is uneven. More output room does not change that.",
      "Skipping most schedules guarantees missed obligations, which is the opposite of the requirement to extract every one."
    ],
    "explanation": "Very long documents are better handled by decomposing them into focused sections, with overlap at the boundaries and a merge step that deduplicates and keeps provenance. This avoids attention loss in the middle of long inputs."
  }
);
