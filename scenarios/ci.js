/* Claude Code for Continuous Integration — scenario questions. Adapted from the imported exams
 * (`source` = original id) plus new questions. */
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
window.SCENARIO_BANK.push(
  {
    id: "sc-ci-001",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your pipeline runs three kinds of Claude-powered analysis: quick style checks on every PR that block merging until they finish, a comprehensive security audit of the whole codebase every week, and test case generation every night for recently modified modules. Finance has asked you to cut API spend, and the Message Batches API offers a 50% discount but can take up to 24 hours to return results. Developers have said they will not accept slower merges. Which assignment of workloads to APIs is correct?",
    options: [
      "Send all three workloads through the Message Batches API to capture the full discount, and have the pipeline poll for batch completion before continuing.",
      "Keep all three workloads on synchronous calls for predictable response times, and rely on prompt caching alone to bring costs down across the board.",
      "Keep the blocking PR style checks on synchronous calls, and move the weekly security audit and nightly test generation to the Message Batches API.",
      "Keep PR style checks and nightly test generation on synchronous calls, and use the Message Batches API only for the weekly security audit."
    ],
    answer: 2,
    optionNotes: [
      "The PR style checks block merging, so routing them through a window of up to 24 hours stalls every merge. Polling only reports the delay; it does not shorten it, so this breaks the stated developer-experience requirement.",
      "The weekly audit and nightly generation have nobody waiting on them, so paying synchronous rates forfeits the batch discount for responsiveness nobody uses. Prompt caching only discounts repeated prompt prefixes and does not replace the batch discount on scheduled work.",
      "Blocking checks need an immediate answer, which only synchronous calls guarantee. The weekly audit and nightly test generation are scheduled and latency-tolerant, so both fit inside the 24-hour batch window and earn the 50% discount.",
      "Nightly test generation is just as latency-tolerant as the weekly audit; its output is not awaited until the next working day. Keeping it synchronous gives up the discount on a second eligible workload with no benefit to developers."
    ],
    explanation: "Match the API to the latency requirement of each workload. Anything that blocks a developer stays on the synchronous Messages API, while scheduled jobs that can wait up to 24 hours move to the Message Batches API for the 50% discount.",
    source: "mock1-q008"
  },
  {
    id: "sc-ci-002",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your review component works iteratively: Claude reads a changed file, then calls a get_file tool to request imports, base classes or tests, receives the contents, and continues until it can write final feedback. A colleague proposes moving this component to the Message Batches API to halve its cost. You need to explain the main technical obstacle before anyone starts the migration. What is it?",
    options: [
      "Batch processing has no request identifiers, so there is no reliable way to match each returned result to the pull request it came from.",
      "The Message Batches API does not accept tool definitions in request parameters, so the get_file tool could not be offered to Claude at all.",
      "Results can take up to 24 hours, which is too slow for pull request feedback, but the multi-step tool workflow itself would otherwise run unchanged.",
      "Each batch request returns one response, so the pipeline cannot run a tool mid-request and hand the result back for Claude to continue its analysis."
    ],
    answer: 3,
    optionNotes: [
      "Every batch request carries a custom_id that is echoed in its result, precisely so results can be matched to inputs even though they may come back in any order.",
      "Batch requests accept the same parameters as the Messages API, including tool definitions. Claude can request a tool in a batch result; the problem is what happens next.",
      "Latency matters for PR feedback, but this understates the issue. Even with unlimited time, one batch request yields one response, so the read-more-files loop cannot proceed inside a single request.",
      "A batch request is a single Messages call processed asynchronously. When Claude stops with tool_use, the tool result can only be supplied in a new request, so each loop iteration would need another batch submission and another wait of up to 24 hours."
    ],
    explanation: "The Message Batches API processes independent single-turn requests asynchronously. An agentic loop that executes tools and feeds results back needs a new request per iteration, which makes batches a poor fit for interactive tool-driven workflows even though tools themselves are supported.",
    source: "mock1-q012"
  },
  {
    id: "sc-ci-003",
    scenario: "ci",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "A pull request changes 14 files across the stock tracking module. Your single-pass review, which sends all 14 files in one prompt, gives detailed feedback on some files and superficial comments on others. It also misses obvious bugs and contradicts itself, flagging a pattern as a problem in one file while approving identical code in another. How should you restructure the review?",
    options: [
      "Move to a higher-tier model with a larger context window so all 14 files receive adequate attention in one pass.",
      "Review each file in its own focused pass for local issues, then run a separate integration pass that examines cross-file data flow.",
      "Require developers to split large pull requests into separate submissions of three or four files each before the automated review will run.",
      "Run three independent passes over the full pull request and only report issues that appear in at least two of the three runs."
    ],
    answer: 1,
    optionNotes: [
      "The files already fit in the context window; the problem is attention spread thinly across many files. A bigger window does not make the model treat each file with consistent depth.",
      "Per-file passes give each file full attention and apply the same criteria consistently, and a dedicated integration pass catches issues that only appear across files, such as a changed return type consumed elsewhere.",
      "This shifts the cost onto developers and changes their workflow to suit the tool. Some changes are legitimately large, and the review architecture should handle them.",
      "Repeating the same overloaded pass produces correlated misses. Voting can suppress real issues that only one run caught and does nothing to fix the uneven depth."
    ],
    explanation: "When a single pass over many files produces uneven and contradictory results, split the work. Focused per-file passes handle local issues consistently, and a separate cross-file pass covers integration concerns that no single file reveals.",
    source: "mock1-q009"
  },
  {
    id: "sc-ci-004",
    scenario: "ci",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Your CI workflow lets Claude Code generate fixes for failing checks and then review the resulting pull request in the same continuing conversation. Audits show the review often misses defects tied to assumptions made during implementation, such as trusting a helper API it introduced without testing edge cases. The review prompt already has explicit severity criteria and a consistent finding format. What change would most improve defect detection?",
    options: [
      "Run the review as a separate Claude Code invocation that sees only the diff, the repository context and the review criteria.",
      "Add stricter instructions telling the same session to challenge its own assumptions and search aggressively for mistakes.",
      "Run several reviews within the original session and only report a finding when it appears in at least two of them.",
      "Ask the generating session to explain its implementation rationale first, then review the pull request in light of that rationale."
    ],
    answer: 0,
    optionNotes: [
      "A fresh invocation does not carry the reasoning that produced the change, so it judges the code on its merits instead of inheriting the generator's assumptions. Independence is what lets it question the helper API that the generator trusted.",
      "The session still holds the reasoning that convinced it the code was correct. Instructions to be more critical do not remove that context, so the same blind spots persist.",
      "Each repeat shares the same biased context, so their errors are correlated. Agreement between them measures consistency, not correctness, and can filter out the rare run that spotted the problem.",
      "Restating the rationale reinforces the very assumptions that need challenging. It anchors the review further toward the generator's view of the code."
    ],
    explanation: "A model reviewing its own work in the same context is anchored by the reasoning that produced it. An independent instance that sees only the change and the criteria catches the defects that self-review rationalizes away.",
    source: "pt2-q055"
  },
  {
    id: "sc-ci-005",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "A new GitHub Actions step runs claude \"Review the changed files for regressions\" and then stalls until the job hits its timeout. The repository checkout is valid, and the same command works when a developer runs it by hand in a terminal. Nothing appears in the job log after the process starts. What change should you make to the pipeline command?",
    options: [
      "Add --output-format json and --json-schema so the runner receives a parseable response instead of an interactive prompt.",
      "Run Claude Code with the -p (--print) flag so it processes the prompt non-interactively, prints the result and exits.",
      "Redirect stdin from /dev/null so Claude Code cannot wait for any additional input during the CI job.",
      "Add instructions to the prompt telling Claude to avoid follow-up questions and to finish the review without stopping."
    ],
    answer: 1,
    optionNotes: [
      "These flags shape the output of print mode; they do not switch Claude Code out of interactive mode on their own. Without -p the session still waits for a user.",
      "Print mode is the documented way to run Claude Code in scripts and CI. It runs the prompt to completion, writes the response to stdout and exits, which is what a pipeline step needs.",
      "Starving stdin does not turn an interactive session into a one-shot run. It is a workaround with unpredictable behavior rather than the supported non-interactive mode.",
      "The hang comes from the interactive session waiting for a user, not from Claude asking questions. Prompt wording cannot change how the CLI process runs."
    ],
    explanation: "Running claude without -p starts an interactive session that waits for input. In CI, use claude -p so the prompt runs once and the process exits with its output.",
    source: "pt3-q047"
  },
  {
    id: "sc-ci-006",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "Your pipeline runs claude -p with CLAUDE.md providing project context, and developers find the reviews insightful. However, the output is narrative paragraphs that someone has to copy into PR comments by hand. The team wants each finding posted automatically as an inline comment, which needs file path, line number, severity and suggested fix for every finding. What is the most effective approach?",
    options: [
      "Add --output-format json and --json-schema to the command, then read the validated findings and post each one through the GitHub API.",
      "Keep the narrative review, then add a second Claude call that summarizes the paragraphs into a JSON list of findings for posting.",
      "Add a Review Output Format section with structured examples to CLAUDE.md so Claude picks up the expected format from project context.",
      "Require a parseable template such as [FILE:path] [LINE:n] [SEVERITY:level] in the review prompt and parse it with regular expressions."
    ],
    answer: 0,
    optionNotes: [
      "With --json-schema, print mode returns output that conforms to your schema in the structured_output field of the JSON result. The pipeline gets reliable fields to post as inline comments without parsing prose.",
      "A second pass adds cost and latency and can drop or distort findings while summarizing. It still relies on unenforced output from the summarizer.",
      "Examples in CLAUDE.md are guidance that Claude usually follows, not a guarantee. An automated poster needs machine-checked structure, which instructions alone do not provide.",
      "A text template is followed most of the time but not always, and regex parsing breaks on small deviations. Schema-enforced output removes that fragility."
    ],
    explanation: "When a pipeline must consume Claude Code's output, use --output-format json with --json-schema so the result is validated against a schema. Prompt or CLAUDE.md formatting instructions improve consistency but do not guarantee parseable output.",
    source: "mock1-q044"
  },
  {
    id: "sc-ci-007",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "Your automated reviewer rates similar issues inconsistently: a possible null dereference is \"critical\" in one PR and \"medium\" in the next. Teams can no longer predict which findings need immediate attention, and trust in the reviewer is falling. The prompt currently asks Claude to \"assign an appropriate severity\" with no further definition. What is the most effective way to make severity consistent?",
    options: [
      "Ask Claude to explain its reasoning for each severity, then have reviewers adjust the ratings by hand during triage based on that reasoning.",
      "Ask Claude to rate each issue relative to the others in the same PR, so the worst issue is always critical and the rest follow in proportion.",
      "Write explicit criteria for each severity level into the prompt, with a concrete code example illustrating each level.",
      "Add a list of issue types with default severities to CLAUDE.md and tell Claude to consult it when rating each finding."
    ],
    answer: 2,
    optionNotes: [
      "Reasoning makes the inconsistency visible but leaves humans to fix it on every PR. The rating itself stays unanchored.",
      "Relative rating guarantees inconsistency across PRs: a minor issue becomes critical in a PR that has nothing worse. Severity should reflect absolute impact.",
      "Defined levels anchored by concrete examples give Claude a rubric to match against, so the same kind of issue lands on the same level regardless of which PR it appears in.",
      "A type-to-severity table ignores context, since the same issue type can be harmless or critical depending on where it occurs. Without criteria and examples, edge cases still drift."
    ],
    explanation: "Severity becomes consistent when each level has an explicit definition and a concrete example. Vague instructions like \"assign an appropriate severity\" leave the judgment to vary from run to run.",
    source: "mock1-q043"
  },
  {
    id: "sc-ci-008",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "Your automated review checks comments and docstrings using the instruction \"check that comments are accurate and up-to-date.\" The findings often flag harmless patterns such as TODO markers and plain descriptions of what a function does. Meanwhile, comments that describe behavior the code no longer implements go unflagged. What change addresses the root cause?",
    options: [
      "Specify an explicit criterion: flag a comment only when the behavior it claims contradicts what the code actually does.",
      "Include git blame data so Claude can identify comments that were written before the most recent code changes.",
      "Add a handful of few-shot examples of misleading comments so the model learns to recognize similar patterns elsewhere in the codebase.",
      "Strip TODO, FIXME and purely descriptive comments out of the input before the review runs to reduce the noise."
    ],
    answer: 0,
    optionNotes: [
      "The instruction is vague, so Claude guesses what \"accurate\" means. A precise criterion based on contradiction between comment and code targets exactly the misleading comments and leaves harmless ones alone.",
      "An old comment is not necessarily wrong, and a new one can be. Age is a weak proxy that adds noise without defining what to report.",
      "Examples of bad comments help recognition but still do not tell Claude where the line is, so the harmless patterns may keep being flagged.",
      "Filtering hides some symptoms but also removes comments that might genuinely be wrong, and it does nothing to help Claude find the contradictory ones."
    ],
    explanation: "Inconsistent findings usually come from vague review criteria. State precisely what makes a finding reportable, here a contradiction between a comment and the code, so Claude can separate real problems from acceptable patterns.",
    source: "mock1-q045"
  },
  {
    id: "sc-ci-009",
    scenario: "ci",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "Your automated reviews find valid issues, but developers say the feedback is not actionable. Findings read like \"complex allocation logic\" or \"potential null pointer\" without saying what to change. You added the instruction \"always include a specific fix suggestion,\" yet the output is still inconsistent, sometimes detailed and sometimes vague. Which technique would most reliably produce actionable feedback?",
    options: [
      "Refine the written instructions further, spelling out every required part of a finding: location, issue, severity and suggested fix.",
      "Split the review into two prompts, one that identifies issues and a second that generates fixes for them, so each can specialize.",
      "Add three or four few-shot examples showing the exact shape of a good finding: the issue, its code location and a specific fix.",
      "Include much more of the surrounding codebase in context so the model has enough information to propose concrete fixes."
    ],
    answer: 2,
    optionNotes: [
      "More detailed instructions were already tried and did not stabilize the output. Describing the format in prose leaves room for interpretation.",
      "A second prompt adds cost and latency and still has no anchor for what a good fix suggestion looks like, so its output can be just as uneven.",
      "Examples show the model exactly what an actionable finding looks like, which is the most reliable way to get consistent format and level of detail when instructions alone have failed.",
      "The issues were found correctly, so missing context is not the problem. The inconsistency is in how findings are written up."
    ],
    explanation: "When instructions produce inconsistent output, a few concrete examples of the desired output are the most effective fix. Few-shot examples demonstrate the expected structure and specificity in a way prose descriptions do not.",
    source: "mock1-q046"
  },
  {
    id: "sc-ci-010",
    scenario: "ci",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Your automated review averages 15 findings per PR, and developers report that about 40% are false positives. The bottleneck is investigation time: developers must open each finding to read the reasoning before deciding whether to fix or dismiss it. Stakeholders have rejected any approach that filters findings out before a developer sees them. What change would best reduce the investigation time?",
    options: [
      "Configure Claude to surface only the findings it rates as high confidence, so that uncertain ones never reach the developers reviewing the PR.",
      "Require Claude to state its reasoning and a confidence assessment inline with each finding, visible without opening it.",
      "Add a post-processor that suppresses findings whose patterns match historical false positives before they are posted.",
      "Split findings into blocking issues and suggestions, with a different review requirement for each tier of finding."
    ],
    answer: 1,
    optionNotes: [
      "This filters findings before developer review, which stakeholders explicitly ruled out. It also risks hiding true positives that Claude rated as uncertain.",
      "Inline reasoning and confidence let developers triage each finding at a glance, so they can dismiss weak ones quickly without clicking through, and nothing is hidden from them.",
      "Automatic suppression is another form of pre-review filtering, which is not allowed, and historical signatures can also suppress genuine new issues.",
      "Tiering changes which findings must be handled but not how long each takes to evaluate. Developers still have to open findings to understand them."
    ],
    explanation: "When every finding must reach a human, the lever is how quickly a human can judge each one. Putting the reasoning and confidence inline turns each finding into something that can be triaged at a glance.",
    source: "mock1-q047"
  },
  {
    id: "sc-ci-011",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "A CI job generates test recommendations on every pull request. Developers report that many comments propose tests that already exist, such as the empty-cart checkout and expired-token login cases. The job currently sends Claude only the PR diff and the modified source files, then posts every suggested test as a comment. What change would best reduce the duplicates while keeping useful gap detection?",
    options: [
      "Have Claude generate a complete replacement test suite for each modified module on every pull request run.",
      "Raise the severity threshold for posted test suggestions so that lower-priority duplicates are filtered out before they become PR comments.",
      "Pass the relevant existing test files into the context and ask Claude to suggest tests only for behavior they do not cover.",
      "Add a prompt rule telling Claude not to repeat existing coverage, while still sending only the implementation diff."
    ],
    answer: 2,
    optionNotes: [
      "A full replacement suite is far more output to review and still ignores what is already there. It makes duplication worse, not better.",
      "Duplicates are not low severity by nature, and severity does not tell Claude what already exists. Real gaps could be filtered out too.",
      "Claude cannot avoid suggesting tests it cannot see. With the existing tests in context it can compare against them and focus on uncovered behavior.",
      "The rule asks Claude to avoid something it has no information about. Without the test files, it cannot know which scenarios are covered."
    ],
    explanation: "Duplicate test suggestions come from missing context. Providing the existing test files lets Claude identify what is already covered and target the real gaps.",
    source: "pt2-q003"
  },
  {
    id: "sc-ci-012",
    scenario: "ci",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "An analysis of your automated reviewer shows false positive rates of 8% for security and correctness, 18% for performance, 52% for style and naming, and 48% for documentation. Developer surveys show growing distrust, and many now dismiss findings without reading them because \"half are wrong.\" The noisy categories are undermining confidence in the accurate ones. What approach best restores trust while the system improves?",
    options: [
      "Reduce strictness uniformly across every category until the overall false positive rate falls to an acceptable level.",
      "Keep every category enabled and add few-shot examples to improve each category's accuracy over the coming weeks.",
      "Keep every category enabled but attach a confidence score to each finding so developers can choose what to investigate.",
      "Temporarily disable the style, naming and documentation categories, keep the high-precision ones running, and improve the prompts offline."
    ],
    answer: 3,
    optionNotes: [
      "A uniform reduction also weakens the security and correctness categories, which are already precise, and may cause real issues to be missed.",
      "Improving prompts is worthwhile, but leaving noisy categories live during the weeks of iteration keeps eroding trust in the whole reviewer.",
      "Developers are already ignoring findings; adding scores does not remove the noise that caused the distrust, and they still have to wade through it.",
      "Removing the noisy categories immediately protects trust in the accurate findings, while the disabled categories are tuned against data and re-enabled once their precision is acceptable."
    ],
    explanation: "Low-precision categories can drag down trust in the entire system. Turning them off temporarily keeps the reliable findings credible while the weak categories are improved and validated before they return.",
    source: "mock1-q051"
  },
  {
    id: "sc-ci-013",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "An initial automated review posts 12 findings, and the developer pushes new commits to address them. When the review runs again it posts 8 findings, but 5 of them repeat earlier comments about code that the new commits already fixed. Developers are starting to mute the bot. What is the most effective way to remove this redundant feedback while keeping the review thorough?",
    options: [
      "Restrict each re-review to the files touched in the most recent push and skip files changed by earlier commits.",
      "Include the prior review's findings in context and instruct Claude to report only issues that are new or still unaddressed.",
      "Run the review only when the PR is first opened and again just before merge, skipping all intermediate commits.",
      "Add a post-processing filter that drops any new finding whose file path and description closely match a comment posted on an earlier run."
    ],
    answer: 1,
    optionNotes: [
      "Issues in earlier files may still be unresolved, and new commits can break code in files they did not touch. Narrowing the scope trades thoroughness for silence.",
      "With the prior findings and the current code in context, Claude can check which issues were fixed, which remain, and which are new, and comment only on the latter two.",
      "Skipping intermediate runs delays feedback and does not stop the final run from repeating fixed issues.",
      "Matching on path and text suppresses issues that are genuinely still present, and it misses repeats that are worded differently."
    ],
    explanation: "Re-reviews should know what was already said. Giving Claude the previous findings lets it confirm fixes and report only new or still-open issues.",
    source: "mock1-q052"
  },
  {
    id: "sc-ci-014",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "Your automated reviewer often posts findings like \"possibly confusing naming\" and \"maybe incomplete validation,\" which developers dismiss as speculative. The prompt already says \"be conservative\" and \"only report high-confidence findings,\" but dismissal rates have not improved across three sprints. You want better precision without losing the findings developers do act on. What prompt change is most likely to work?",
    options: [
      "Raise the required confidence to 95% and tell Claude to suppress any finding it cannot justify with near certainty.",
      "Replace the confidence wording with concrete categories of what to report and what to skip, severity definitions and code examples for each.",
      "Add \"be extremely conservative\" to the system prompt twice, once before and once after the review checklist.",
      "Run the same broad prompt three times and report only the findings that appear in at least two of the runs."
    ],
    answer: 1,
    optionNotes: [
      "Self-reported confidence is poorly calibrated, so a higher number does not make the boundary any clearer. It may also suppress useful findings.",
      "General caution words leave Claude guessing where the line is. Concrete report and skip categories, with defined severities and examples, tell it exactly which issues matter.",
      "Repeating the same vague instruction already failed for three sprints. Emphasis does not add the missing definition of a reportable issue.",
      "Repeated runs of an unclear prompt share the same misunderstanding, so speculative findings can still win the vote."
    ],
    explanation: "Instructions like \"be conservative\" do not improve precision because they do not say what to report. Explicit categories, severity definitions and examples give Claude a precise boundary.",
    source: "pt2-q001"
  },
  {
    id: "sc-ci-015",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "A pilot of your PR reviewer shows that developers dismiss most performance findings. The prompt says \"Only report actionable issues you are highly confident about. Be conservative and avoid nitpicks.\" The dismissed findings are usually speculative, like \"this loop might be slow,\" with no evidence about input size, hot paths or repeated work. What prompt change would most effectively improve precision?",
    options: [
      "Require a self-reported confidence of at least 9/10 and automatically suppress any performance finding scored below that.",
      "Require longer reasoning for each performance concern, then post only the findings whose explanations sound specific and careful.",
      "Define the evidence a performance finding must show, such as unbounded input growth, a known hot path or database calls inside a loop.",
      "Repeat \"be conservative\" and \"avoid speculation\" in the system prompt header, in the review checklist and again in the final output instructions."
    ],
    answer: 2,
    optionNotes: [
      "Self-reported confidence is not calibrated against real outcomes, so the threshold does not separate real issues from speculation.",
      "Long, confident-sounding reasoning is not evidence. Judging findings by how they read rewards style rather than substance.",
      "Concrete evidence thresholds turn \"might be slow\" into a checkable rule. A finding without growth, hot-path or repeated-call evidence is simply not reported.",
      "The prompt already says this. Repeating vague guidance does not tell Claude what counts as evidence of a real performance problem."
    ],
    explanation: "Precision improves when each category has explicit criteria for what to report. For performance, that means stating what evidence makes a concern real rather than asking for more caution.",
    source: "pt3-q021"
  },
  {
    id: "sc-ci-016",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "After rollout, your PR reviewer posts many comments about naming preferences, import ordering and subjective refactoring ideas. Developers now skim past the bot's feedback, and important correctness issues are sometimes overlooked in the noise. The prompt currently asks Claude to \"review the code and suggest improvements.\" What should you change first?",
    options: [
      "Rewrite the prompt to report demonstrable bugs, security risks and test gaps, and to skip stylistic preferences with no documented impact.",
      "Cap each review at five comments sorted by severity, and leave the existing broad review categories otherwise unchanged.",
      "Tell Claude to report only findings it rates above 8 out of 10 confidence, while keeping the same broad review scope.",
      "Ask Claude to include every possible improvement and rely on developers to triage the severity labels during review."
    ],
    answer: 0,
    optionNotes: [
      "The root cause is an open-ended scope. Stating which kinds of issues are worth reporting and which to skip removes the stylistic noise while keeping correctness findings.",
      "A cap hides noise rather than removing it, and if severity is unreliable it may drop real issues in favor of style comments.",
      "Confidence does not separate style from substance; Claude can be very confident that a variable name could be better.",
      "This increases the noise that is already causing developers to ignore the bot."
    ],
    explanation: "An instruction to \"suggest improvements\" invites every preference Claude has. Define the reportable categories explicitly and tell it what to skip.",
    source: "pt2-q023"
  },
  {
    id: "sc-ci-017",
    scenario: "ci",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Your CI job runs Claude Code in print mode with --json-schema to produce structured review findings. The output always passes schema validation, but the comment-posting step sometimes fails or posts misleading comments. One finding cites line 220 of a 90-line file, another names a file that is not in the diff, and a third puts the vulnerable snippet in the remediation field. What should you change in the pipeline?",
    options: [
      "Make every field in the schema required and replace all free-text review fields with enums to increase strictness.",
      "Retry up to three times whenever inline posting fails, and accept the first response that passes schema validation.",
      "Drop schema enforcement, ask for raw JSON in the prompt instead, and reject any response that contains extra text or is missing fields.",
      "Keep schema enforcement, add code checks for line ranges and diff membership, and retry with the specific failures included."
    ],
    answer: 3,
    optionNotes: [
      "These failures are already schema-valid. More required fields and enums cannot express rules like \"line must exist in this file,\" and forcing enums onto remediation text loses meaning.",
      "Blind retries repeat the same request without telling Claude what was wrong, and schema validity was never the problem, so the first schema-valid answer may still be wrong.",
      "Removing schema enforcement makes syntax errors more likely while doing nothing about the semantic errors.",
      "A schema guarantees structure, not correctness. Deterministic checks catch impossible line numbers and files outside the diff, and feeding the specific error back lets Claude correct that finding."
    ],
    explanation: "Schema enforcement solves syntax; semantic validation is a separate layer. Check findings against the diff and file metadata in code, then retry with the concrete validation errors so the model can fix them.",
    source: "pt2-q025"
  },
  {
    id: "sc-ci-018",
    scenario: "ci",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "A senior engineer built a /pr-feedback command that applies your team's review checklist and suppresses known false-positive categories. It works on their laptop, but clean CI runners and new contributors get \"command not found\" unless they copy files from that engineer's home directory. You want the command available from a fresh checkout and reviewed alongside workflow changes. What should you do?",
    options: [
      "Keep the command in ~/.claude/commands/ and add onboarding steps telling each developer and each CI runner image to copy it over.",
      "Move the checklist into CLAUDE.md and ask reviewers to type the same prompt by hand whenever CI needs a review.",
      "Embed the full review checklist directly in each workflow step so every pipeline job builds its own prompt.",
      "Store the command file under .claude/commands/ in the repository and commit it together with the CI workflow changes."
    ],
    answer: 3,
    optionNotes: [
      "User-level commands live on one machine. Manual copying drifts out of date and fails on ephemeral runners that start clean every time.",
      "CLAUDE.md content is context, not an invocable command, and manual retyping invites inconsistency between runs.",
      "Duplicating the checklist across steps creates several copies to maintain, and they drift apart over time.",
      "Project commands under .claude/commands/ are part of the repository, so every checkout, including a fresh CI runner, has them, and changes go through normal code review."
    ],
    explanation: "Anything the team or CI depends on belongs in project scope, committed to version control. User-level configuration in ~/.claude is personal and will not exist on a clean runner.",
    source: "pt2-q010"
  },
  {
    id: "sc-ci-019",
    scenario: "ci",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "Your PR review job has become noisy since teams added security audit steps, release-note checks, dependency migration guidance and test generation procedures to the repository's root CLAUDE.md. Documentation-only PRs now get irrelevant warnings. The specialized jobs still need their detailed procedures when they run. What configuration best balances consistency with focused context?",
    options: [
      "Duplicate the complete workflow prompt inside each CI command and stop using shared Claude Code configuration files.",
      "Keep universal review principles in project CLAUDE.md and move each specialized workflow into a project skill invoked by the job that needs it.",
      "Store the workflow instructions as user-scoped skills on the CI runner and update them by hand whenever the jobs change.",
      "Consolidate every CI checklist into root CLAUDE.md so that each automated review receives identical instructions."
    ],
    answer: 1,
    optionNotes: [
      "Copies in each command drift apart and lose the shared principles that should apply everywhere.",
      "CLAUDE.md loads in every session, so it should hold only what applies everywhere. Skills load their full instructions only when invoked, so specialized procedures stay out of unrelated reviews.",
      "User-scoped skills live outside version control and must be maintained per runner, which is fragile and invisible to code review.",
      "This is the current setup that causes the noise; identical instructions mean every review carries every procedure."
    ],
    explanation: "Put always-relevant guidance in CLAUDE.md and on-demand procedures in project skills. Skills keep detailed workflows available without loading them into every session.",
    source: "pt3-q056"
  },
  {
    id: "sc-ci-020",
    scenario: "ci",
    domain: 3,
    subdomain: "3.2 Create and configure custom slash commands and skills",
    question: "A custom CI skill first inspects the dependency graph, flaky test history and prior PR comments before producing review guidance. In recent runs, the main review output repeats exploratory notes from that setup phase, reports issues unrelated to the changed files, and misses straightforward problems in the diff. You want to keep the setup workflow but stop it from polluting the review. What change would do that?",
    options: [
      "Move the skill's instructions into project CLAUDE.md so every review session receives the same investigation steps.",
      "Tell the CI prompt to ignore the earlier verbose notes in its context and to report only high-confidence findings about the PR itself.",
      "Expand the skill's argument-hint so developers pass narrower module names and the exploration produces less output.",
      "Set context: fork in the skill's frontmatter so the exploration runs in a separate context and returns only a concise summary."
    ],
    answer: 3,
    optionNotes: [
      "This loads the exploration steps into every session, adding more noise to the main context rather than less.",
      "The verbose notes stay in the context window and keep competing for attention. Asking Claude to ignore context is unreliable.",
      "This is a CI job, so nobody is typing arguments, and a narrower target does not stop the exploration output from landing in the main context.",
      "A forked skill runs in an isolated subagent context. Its verbose intermediate output stays there, and the main review receives only the summary it needs."
    ],
    explanation: "Verbose exploration should run in an isolated context. The context: fork setting runs a skill as a subagent so only its concise result returns to the main conversation.",
    source: "pt3-q031"
  },
  {
    id: "sc-ci-021",
    scenario: "ci",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "Your CI review became noisy after you added a database migration checklist to shared instructions. PRs that only change TypeScript handlers now get warnings about lock duration and rollback scripts, but SQL migration PRs still need those checks. Migration files live under both services/*/db/migrations/*.sql and packages/*/migrations/*.sql. You want the checklist to apply automatically only when those files are involved, without adding path-routing logic to CI. What should you do?",
    options: [
      "Create a project slash command for migration reviews and have CI select it whenever SQL files appear in the diff.",
      "Copy the migration instructions into a CLAUDE.md in every service and package directory so nearby files inherit them.",
      "Create a focused rule file under .claude/rules/ with YAML frontmatter paths listing both migration globs, containing only the checklist.",
      "Keep the checklist in root CLAUDE.md and add an instruction telling Claude to ignore sections that do not apply to the PR."
    ],
    answer: 2,
    optionNotes: [
      "This puts file-type routing in CI, which the team wants to avoid, and the logic has to be kept in sync with the directory layout.",
      "Duplicated files drift apart, and new services or packages must remember to add their own copy.",
      "Path-scoped rules load only when Claude works with files matching their globs, so one rule file covers both migration locations and stays out of unrelated reviews.",
      "The checklist is still loaded into every review. Asking Claude to ignore loaded context is unreliable and is what produced the noise."
    ],
    explanation: "Path-specific rules in .claude/rules/ load conditionally based on file globs. They are the right tool for conventions tied to file types that are spread across the repository.",
    source: "pt2-q013"
  },
  {
    id: "sc-ci-022",
    scenario: "ci",
    domain: 3,
    subdomain: "3.3 Apply path-specific rules for conditional convention loading",
    question: "A CI review job recently gained strict accessibility guidance meant only for React UI files. After deployment, Claude flags backend route handlers and migration scripts for missing ARIA labels, because the guidance loads on every review. You need it to apply only when relevant files are in scope, and you would rather not change the CI workflow. What should you change?",
    options: [
      "Create a .claude/commands/accessibility.md command and have CI invoke it only for PRs that contain UI files.",
      "Import the accessibility file from project CLAUDE.md with @import and ask Claude to decide whether it applies.",
      "Add a root CLAUDE.md instruction telling Claude to ignore accessibility guidance unless the file names look like React components.",
      "Move the guidance into a .claude/rules/ file whose YAML frontmatter paths match the React component globs."
    ],
    answer: 3,
    optionNotes: [
      "This requires CI changes to detect UI files and pick the command, which is the routing work the team wants to avoid.",
      "An @import pulls the file into context at launch for every session, so the guidance is still always loaded; Claude would merely be asked to disregard it.",
      "The guidance stays loaded and the decision is left to Claude, which is how the false positives arose.",
      "A rule with paths frontmatter is loaded only when Claude touches matching files, so backend and migration reviews never see the accessibility guidance."
    ],
    explanation: "Use path-scoped rules for guidance that only applies to certain files. Loading guidance everywhere and asking Claude to ignore it produces false positives.",
    source: "pt2-q050"
  },
  {
    id: "sc-ci-023",
    scenario: "ci",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your repository's root CLAUDE.md has grown to 1,200 lines of review criteria, testing standards, API conventions, deployment notes and migration guidance. CI runs of Claude Code now produce noisy feedback that mixes unrelated standards, and teams frequently make conflicting edits when updating guidance for their area. You want to keep the shared behavior consistent across the repository. What restructuring best improves maintainability?",
    options: [
      "Move narrowly scoped guidance into topic-specific files under .claude/rules/ and keep only universal review principles in root CLAUDE.md.",
      "Keep everything in root CLAUDE.md but add stronger headings telling Claude to ignore sections unrelated to each PR.",
      "Copy the relevant paragraphs into each package's CLAUDE.md so every directory contains a complete local instruction set.",
      "Move the CI review checklist into ~/.claude/CLAUDE.md on the build runner to reduce the size of the repository file."
    ],
    answer: 0,
    optionNotes: [
      "Topic files give each team its own file to maintain, reducing edit conflicts, and path-scoped rules load only where relevant, so CI reviews see less unrelated guidance.",
      "The file stays huge, all of it still loads, and teams still collide on one file. Headings do not stop loaded text from influencing output.",
      "Duplication creates many copies to keep in sync, which multiplies the maintenance problem.",
      "User-level memory on a runner is outside version control and absent on other machines, so local runs and CI would diverge."
    ],
    explanation: "A bloated CLAUDE.md is both noisy and hard to maintain. Keep universal principles at the root and split specialized guidance into modular rule files that load only where they apply.",
    source: "pt3-q009"
  },
  {
    id: "sc-ci-024",
    scenario: "ci",
    domain: 2,
    subdomain: "2.3 Distribute tools appropriately across agents and configure tool choice",
    question: "Your PR review workflow calls the Messages API with two tools: extract_pr_metadata and generate_review_findings. CI logs show that on documentation-heavy PRs, Claude sometimes calls generate_review_findings first, so the findings lack repository area, file ownership and review policy metadata. The metadata must exist before the review and enrichment steps run. What change most reliably fixes this?",
    options: [
      "Parse the assistant text for the phrase \"metadata complete\" before accepting any generated review findings.",
      "Set tool_choice to any and list extract_pr_metadata first, letting Claude pick the most suitable structured tool.",
      "Keep tool_choice on auto and strengthen the system prompt to always finish metadata extraction before generating any findings.",
      "Force tool_choice to extract_pr_metadata on the first request, then request the review findings in a follow-up turn."
    ],
    answer: 3,
    optionNotes: [
      "Control flow based on phrases in assistant text is brittle; wording varies and may not reflect what actually happened.",
      "tool_choice any guarantees that some tool is called, not which one. Tool order in the list is not an ordering guarantee.",
      "Prompting lowers the failure rate but stays probabilistic. With auto, Claude can still pick the other tool or answer in text.",
      "Forcing a specific tool guarantees the first response is the metadata call. The findings request then runs with the metadata already available."
    ],
    explanation: "When a pipeline depends on one structured step happening first, force that tool with tool_choice. Prompting and tool order influence behavior but do not guarantee it.",
    source: "pt2-q060"
  },
  {
    id: "sc-ci-025",
    scenario: "ci",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "A structured CI review step extracts potential API-breaking findings with fields including changed_file, changed_line, breaking_change_evidence and suggested_fix. Validation rejects several findings because breaking_change_evidence is null. In those cases the CI context contains only the regenerated client code; the previous API contract and baseline generated files are not available. What change improves extraction quality without increasing unsupported findings?",
    options: [
      "Accept the highest-confidence findings despite the missing evidence and let developers dismiss any unsupported comments.",
      "Retry every rejected finding with stronger instructions to fill in all required evidence fields before posting.",
      "Make the evidence field required and ask Claude to infer the baseline behavior from generated file names and changed imports.",
      "Classify missing-baseline failures separately, retry only format or placement errors, and supply the baseline artifact before re-extracting."
    ],
    answer: 3,
    optionNotes: [
      "This posts findings with no supporting evidence, which is exactly the kind of false positive the team is trying to avoid.",
      "Retrying cannot produce evidence that is not in the input. Pressure to fill the field encourages fabricated evidence.",
      "Requiring the field while the source is absent forces Claude to invent baseline behavior, producing plausible but unsupported claims.",
      "Retries help with errors Claude can fix from the input it has. When information is genuinely missing, the fix is to provide it, so separating the two failure types makes the retry loop effective."
    ],
    explanation: "Retry-with-feedback works for format and reasoning errors, not for information that is not in the context. Distinguish the two and fix missing-input cases by supplying the missing artifact.",
    source: "pt3-q004"
  },
  {
    id: "sc-ci-026",
    scenario: "ci",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "Your automated PR review has started claiming that error-path tests are missing. Spot checks show many flagged cases are already covered by table-driven tests, shared fixtures or helper-generated cases, though some genuinely uncovered branches do need comments. The prompt describes what a test gap is but gives no examples. What change would most effectively improve the review prompt?",
    options: [
      "Add a fixed minimum number of tests per changed file and post a comment whenever a file falls below that count.",
      "Flag gaps only when a changed file has no test file with a matching name in the same directory.",
      "Tell Claude to report only high-confidence missing-test findings and to suppress anything that might possibly be covered indirectly by other tests.",
      "Add targeted examples of varied existing test structures and of genuine gaps, each explaining why it is reported or skipped."
    ],
    answer: 3,
    optionNotes: [
      "Test counts say nothing about which branches are covered. A table-driven test can cover many cases in one function.",
      "File-name heuristics miss shared fixtures and helpers entirely and would still flag code tested elsewhere.",
      "Vague confidence guidance tends to suppress real gaps along with false ones, because Claude still cannot recognize the indirect test patterns.",
      "Examples teach Claude to recognize the coverage patterns it is missing, such as table-driven cases, and show where the boundary to a real gap lies, along with the reasoning."
    ],
    explanation: "When Claude misreads patterns that vary in form, examples showing several valid forms and contrasting them with real problems teach the distinction better than rules or thresholds. Rules and thresholds tend to miss or overcorrect such variety.",
    source: "pt3-q008"
  },
  {
    id: "sc-ci-027",
    scenario: "ci",
    domain: 5,
    subdomain: "5.4 Manage context effectively in large codebase exploration",
    question: "A nightly CI job for large PRs first has Claude Code map ownership boundaries, trace affected call paths and inspect related tests before producing review findings. On broad changes, the conversation fills with verbose search results and file excerpts, and the final review misses earlier discoveries or gives shallow comments. You still need the investigation to happen. What adjustment best preserves review quality?",
    options: [
      "Paste the complete grep output and dependency trees into the initial prompt so that Claude starts the review with the maximum available context.",
      "Keep all discovery in the main session and rely on /compact whenever the verbose output crowds the conversation.",
      "Run the verbose discovery in an Explore subagent that returns concise findings before the main session writes the review.",
      "Limit the review to the changed diff hunks only and skip exploratory reads so Claude can focus on the final comments."
    ],
    answer: 2,
    optionNotes: [
      "Front-loading raw output fills the context with even more noise before the review starts, which is the problem being solved.",
      "Compaction is lossy and happens after the context is already crowded, and summaries can drop the discoveries the review needs.",
      "A subagent does the noisy searching in its own context and returns only a summary, so the main review keeps a clean context with the essential findings.",
      "Skipping investigation loses the cross-cutting understanding that large PRs need, trading thoroughness for focus."
    ],
    explanation: "Isolate verbose exploration in a subagent so the main context receives distilled findings. This keeps the review focused without giving up the investigation.",
    source: "pt3-q020"
  },
  {
    id: "sc-ci-028",
    scenario: "ci",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "A new CI job asks Claude Code to improve test coverage for a data normalization utility. The first generated tests pass, but they miss null inputs, timezone boundaries and duplicate IDs. Follow-up prompts like \"be more thorough\" produce inconsistent additions and occasionally break existing behavior. What workflow would make the improvement reliable?",
    options: [
      "Rerun Claude Code automatically until the generated tests happen to cover the missed cases, stopping after three unsuccessful attempts in a row.",
      "Write a targeted test suite for the expected behavior and edge cases, then iterate by feeding Claude the specific failing results.",
      "Rewrite the prompt to say \"be exhaustive and conservative,\" and accept only tests whose descriptions sound precise.",
      "Ask Claude to give each proposed test a confidence score and merge only the tests above a fixed threshold."
    ],
    answer: 1,
    optionNotes: [
      "Random reruns give Claude no new information, so success is luck rather than progress.",
      "Concrete tests define the target, and specific failures tell Claude exactly what to fix next. This test-driven loop converges instead of drifting.",
      "Vague instructions are what produced the inconsistency, and a test's description says nothing about whether it covers the right cases.",
      "Confidence scores do not identify missing edge cases, and filtering by them can drop the most valuable tests."
    ],
    explanation: "Iterative refinement works best with concrete, verifiable feedback. Tests that encode the expected behavior turn \"be more thorough\" into specific failures Claude can address one at a time.",
    source: "pt3-q025"
  },
  {
    id: "sc-ci-029",
    scenario: "ci",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "Your CI review uses a tool with a JSON schema whose required fields are file_path, start_line, severity, owner_team, linked_ticket and suggested_fix. On PRs that carry no ownership or ticket metadata, findings contain plausible but nonexistent owner teams and ticket numbers, which downstream automation then routes incorrectly. You want to keep the useful findings. What schema change best addresses this?",
    options: [
      "Make the fields that depend on unavailable sources nullable or optional, and instruct Claude to return null unless the value is directly evidenced.",
      "Reject any finding that is missing routing metadata before posting, so only fully populated findings reach developers.",
      "Have Claude infer the missing owner and ticket from repository naming conventions so every finding is fully populated.",
      "Keep every field required and add stronger prompt wording telling Claude never to invent values from context."
    ],
    answer: 0,
    optionNotes: [
      "Required fields force Claude to put something there even when the information does not exist. Allowing null gives it an honest way to say \"not available,\" and downstream routing can handle that case.",
      "The routing fields are genuinely unavailable on these PRs, so this discards valid findings along with the fabricated values.",
      "Inference from naming conventions is still guessing, which is how the plausible but wrong values arose.",
      "The schema still demands a value, so the instruction conflicts with the structure. The required constraint tends to win and fabrication continues."
    ],
    explanation: "Required fields for information that may not exist push the model to fabricate. Make such fields nullable and tell the model to use null when the source does not contain the value.",
    source: "pt3-q028"
  },
  {
    id: "sc-ci-030",
    scenario: "ci",
    domain: 3,
    subdomain: "3.5 Apply iterative refinement techniques for progressive improvement",
    question: "Your pilot review for database migration PRs gives uneven feedback. Claude catches syntax problems but misses rollback safety, data retention, backward compatibility and fixture setup, because the team has never written down what a good migration review covers. You need to improve the workflow before making the check required in CI. What should you do next?",
    options: [
      "Collect examples from previous clean migrations and require Claude to imitate those review comments exactly.",
      "Make the check required now and use developer complaints about failed builds to discover the missing criteria.",
      "Add a broad instruction to be extremely thorough, then suppress any comment that Claude does not mark as high confidence.",
      "Run an interview-style session where Claude asks maintainers targeted questions, then fold the clarified criteria into the review prompt."
    ],
    answer: 3,
    optionNotes: [
      "Comments on clean migrations show what was fine, not the risks to check for. Exact imitation also does not generalize to new kinds of migrations.",
      "Enforcing an underspecified check blocks developers with poor feedback and learns the criteria at their expense.",
      "\"Be thorough\" does not name the missing criteria, and confidence filtering cannot make Claude check things it was never told about.",
      "The gap is unclear requirements. Having Claude interview the maintainers surfaces the criteria they care about, which can then be written into the prompt explicitly."
    ],
    explanation: "When review quality suffers because the criteria are unclear, clarify the criteria first. An interview pass draws out maintainers' expectations so the prompt can state them explicitly.",
    source: "pt3-q036"
  },
  {
    id: "sc-ci-031",
    scenario: "ci",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Your automated PR reviewer emits structured findings with file, line, severity, category and suggested fix. Developers dismiss 38% of comments, but the dashboard only shows broad categories like \"bug\" and \"maintainability,\" so prompt iteration has no clear target. You want a feedback loop that tells you what to fix in the prompt. What schema and workflow change best supports systematic improvement?",
    options: [
      "Combine dismissed findings into weekly natural-language summaries, then ask Claude to infer the recurring root causes.",
      "Add a structured field recording the code pattern that triggered each finding, then analyze dismissal rates by that field.",
      "Parse developers' dismissal comments for negative sentiment and prioritize prompt changes for the most frustrated responses.",
      "Ask Claude for a higher self-reported confidence score and suppress any comment below the team's chosen threshold."
    ],
    answer: 1,
    optionNotes: [
      "Free-text summaries are hard to aggregate or compare across iterations and add another layer of interpretation.",
      "A structured trigger-pattern field lets you group dismissals precisely, so you can see which patterns produce false positives and target the prompt changes at them.",
      "Sentiment measures frustration, not cause. It does not identify which patterns produce the dismissed findings.",
      "Suppression hides findings without explaining why they were wrong, so nothing is learned for the next prompt change."
    ],
    explanation: "Feedback loops need structured data at the right granularity. Capturing what triggered each finding makes dismissal data actionable for targeted prompt changes.",
    source: "pt3-q053"
  },
  {
    id: "sc-ci-032",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "Your CI job generates tests for new modules, but the generated tests ignore the team's fixture library, duplicate helper setup that already exists, and assert trivial things like getter return values. Developers reject most of them and rewrite the useful ones by hand. The job prompt only says \"write tests for the changed code.\" What is the configuration-level fix?",
    options: [
      "Generate three times as many tests on each run so that enough of them survive developer review.",
      "Make developers rewrite the generated tests as a standing chore and treat the job's output as a rough first draft to start from.",
      "Document the testing standards, what makes a test valuable, and the available fixtures in the project CLAUDE.md.",
      "Lower the generation temperature so the produced tests follow common testing conventions more closely."
    ],
    answer: 2,
    optionNotes: [
      "More output means more review work, and the same flaws repeat in every extra test.",
      "This accepts the low quality as permanent and puts the cost on developers instead of fixing the cause.",
      "Claude Code reads CLAUDE.md in every CI run, so documenting standards, valuable-test criteria and fixtures gives test generation the project context it is missing.",
      "Temperature affects randomness, not knowledge. Claude cannot use a fixture library it has never been told about."
    ],
    explanation: "Poor generated tests usually reflect missing project context. Documenting testing standards and available fixtures in CLAUDE.md gives every CI run that context automatically.",
    source: "purcell-q042"
  },
  {
    id: "sc-ci-033",
    scenario: "ci",
    domain: 4,
    subdomain: "4.2 Apply few-shot prompting to improve output consistency and quality",
    question: "Your reviewer keeps flagging accepted idioms in your codebase as bugs, for example intentional switch fall-throughs marked with a comment and deliberate early returns in validators. You have already added detailed prose instructions describing these idioms, but the false positives continue. You want Claude to tell these idioms apart from genuine bugs that look similar. What is the most effective addition?",
    options: [
      "A rule saying that any code accompanied by an explanatory comment is acceptable and should not be flagged.",
      "Few-shot examples contrasting the accepted idioms with genuine bugs, each explaining why it is or is not reportable.",
      "An instruction to defer to the codebase's existing conventions whenever it has to judge whether an unfamiliar pattern is a bug.",
      "A rule excluding from review any file that contains one of the idiomatic patterns the team has accepted."
    ],
    answer: 1,
    optionNotes: [
      "A comment does not make code correct, so this would let real bugs through whenever someone left a comment nearby.",
      "Contrasting pairs show Claude where the boundary lies between an idiom and a lookalike bug, which prose alone has failed to convey.",
      "This is more prose guidance of the kind that already failed, and it does not say which conventions are deliberate.",
      "Skipping whole files leaves real bugs in those files unreviewed."
    ],
    explanation: "When prose instructions do not fix a judgment boundary, show it. Few-shot examples with paired positive and negative cases and the reasoning behind each are the most effective way to teach the distinction.",
    source: "purcell-q048"
  },
  {
    id: "sc-ci-034",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "Your CI job runs claude -p \"Fix the lint errors and run the unit tests\" on a pull request branch. The job finishes quickly with exit code 0, but the log shows that every Bash call to npm run lint and npm test was denied, and Claude reports it could not verify its changes. Nobody is present to approve prompts on the runner. What should you change?",
    options: [
      "Pass --allowedTools with rules such as \"Bash(npm run lint *)\" and \"Bash(npm test *)\" along with Read and Edit, so exactly those calls run without a prompt.",
      "Add --dangerously-skip-permissions to the command so that every tool call in the CI job is approved automatically.",
      "Add a line to CLAUDE.md stating that Claude has permission to run npm commands during CI jobs.",
      "Drop -p and drive an interactive session with an expect script that answers yes to each permission prompt."
    ],
    answer: 0,
    optionNotes: [
      "In print mode, calls that need approval are denied unless an allow rule, hook or other mechanism approves them. Allow rules for the specific commands let the job lint and test while everything else stays blocked.",
      "Bypassing all permission checks lets the agent run any command on a runner that may hold deployment secrets. It solves the denial by removing every safeguard instead of approving the two commands that are needed.",
      "CLAUDE.md is context for the model, not configuration for the permission system. Claude may believe it is allowed, but the CLI still denies the call.",
      "Scripting an interactive session is fragile and approves every prompt blindly, including ones for commands nobody intended to allow."
    ],
    explanation: "Non-interactive runs cannot answer permission prompts, so tools must be pre-approved. Use --allowedTools (or settings allow rules) to approve exactly the commands the job needs rather than disabling permission checks."
  },
  {
    id: "sc-ci-035",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "A nightly job runs claude -p to repair flaky integration tests. On one night a test kept failing for an environmental reason, and Claude kept editing, rerunning and re-editing for several hours, consuming a large share of the monthly budget before the runner's six-hour limit killed it. You want each run bounded and a runaway to show up as a failed job. What should you add?",
    options: [
      "A sentence in the prompt telling Claude to give up after a few unsuccessful attempts and summarize what it tried.",
      "The --max-turns flag with a sensible limit, so the run exits with an error when the limit is reached and the job fails visibly.",
      "A switch to the Message Batches API for the nightly job, since its 50% discount halves the cost of long runs.",
      "A shorter runner timeout of one hour, so the CI platform kills the Claude Code process much sooner whenever it stops making progress."
    ],
    answer: 1,
    optionNotes: [
      "A prompt instruction is guidance the model may not follow, especially when each attempt looks like it might work. It does not guarantee a bound.",
      "In print mode, --max-turns caps the number of agentic turns and exits with an error at the limit, so cost is bounded by configuration and the pipeline sees a failure it can alert on.",
      "A discount does not bound a runaway loop, and an agentic tool loop does not fit single-request batch processing anyway.",
      "A timeout bounds wall-clock time but kills the process abruptly with no clean exit, and an hour of looping can still cost a lot. It is a backstop, not a turn limit."
    ],
    explanation: "Bound unattended agent runs in configuration. --max-turns limits agentic turns in print mode and exits with an error when reached, which keeps cost predictable and makes the failure visible."
  },
  {
    id: "sc-ci-036",
    scenario: "ci",
    domain: 3,
    subdomain: "3.6 Integrate Claude Code into CI/CD pipelines",
    question: "One job in your pipeline runs claude -p to analyze a failing build and propose a root cause. A later step in the same job must ask follow-up questions about that analysis, for example to draft a fix for the identified cause. Currently the second step starts a new claude -p call and repeats most of the investigation, which doubles time and cost. How should the second step continue from the first?",
    options: [
      "Paste the full text of the first step's output into the second prompt and ask Claude to treat it as its earlier work.",
      "Write the first step's conclusions into CLAUDE.md so that the second invocation picks them up as project memory.",
      "Capture session_id from the first call's --output-format json result and pass it to the second call with --resume.",
      "Run both steps in one interactive session by keeping the claude process open between the two pipeline steps."
    ],
    answer: 2,
    optionNotes: [
      "The output text is only the final answer; the files read and intermediate findings are lost, so Claude may still need to repeat much of the work.",
      "CLAUDE.md is for durable project instructions, not per-run state. Writing run results there pollutes it for every later session.",
      "The JSON result includes a session_id, and claude -p --resume with that ID continues the same conversation with its full context, so the follow-up builds on the earlier investigation.",
      "Keeping an interactive process open across pipeline steps is fragile and not how print mode is meant to be used in CI."
    ],
    explanation: "Print mode supports multi-step automation by resuming sessions. Capture the session_id from JSON output and pass it to --resume so later steps keep the earlier context."
  },
  {
    id: "sc-ci-037",
    scenario: "ci",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your project CLAUDE.md says \"Never modify files under db/migrations/; applied migrations are immutable.\" Last week a CI job that fixes failing checks edited an already-applied migration anyway, and the change was merged before anyone noticed. The team lead wants this to be impossible for any Claude Code run in the repository, not just unlikely. What should you do?",
    options: [
      "Rewrite the CLAUDE.md line in capitals with IMPORTANT and repeat it near the top of the file for emphasis.",
      "Add permission deny rules for Edit and Write on the migrations directory to the committed .claude/settings.json.",
      "Add the same instruction to the CI job's prompt so that it appears in both CLAUDE.md and the task description for every run.",
      "Put the deny rules in .claude/settings.local.json so each developer and runner can adjust them as needed."
    ],
    answer: 1,
    optionNotes: [
      "Emphasis may make the instruction more salient, but CLAUDE.md remains guidance the model can still misapply. It cannot make the edit impossible.",
      "Permission rules are enforced by Claude Code itself, and deny rules take precedence over allow rules. Committing them in project settings applies them to every session in the repository, including CI.",
      "Repeating guidance in a second place is still guidance. Nothing stops the tool call if Claude decides an edit is justified.",
      "settings.local.json is meant for personal overrides and is normally gitignored, so a fresh CI checkout would not have the rules at all."
    ],
    explanation: "CLAUDE.md shapes behavior but does not enforce it. Hard constraints belong in permission rules in committed settings, which Claude Code applies to every session regardless of what the model decides."
  },
  {
    id: "sc-ci-038",
    scenario: "ci",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "A developer added deny rules blocking Bash(curl *) and Bash(git push *) and confirmed that Claude Code refuses those commands on their laptop. In CI, though, a run still executed git push to the remote. Investigation shows the rules live in .claude/settings.local.json, which the repository's .gitignore excludes. What change makes the rules apply in CI as well?",
    options: [
      "Copy the rules into the developer's ~/.claude/settings.json so they are applied at user level for all of that developer's projects.",
      "Add a note to CLAUDE.md explaining that curl and git push are forbidden and should never be run by Claude in CI.",
      "Remove settings.local.json from .gitignore so that the developer's personal settings file is committed for everyone.",
      "Move the deny rules into the shared .claude/settings.json and commit it, so every checkout including CI loads them."
    ],
    answer: 3,
    optionNotes: [
      "User settings live on one machine. The CI runner has its own clean home directory and would never see them.",
      "This replaces an enforced rule with guidance, which is weaker than what already works locally.",
      "The local file is meant for personal overrides; committing it mixes individual preferences into team configuration and breaks the convention others rely on.",
      "Project settings in .claude/settings.json are checked into source control and shared with everyone who checks out the repository, so the runner applies the same deny rules."
    ],
    explanation: "Settings scope decides where rules apply. Team-wide enforcement belongs in the committed project settings file, not in local or user settings that exist on a single machine."
  },
  {
    id: "sc-ci-039",
    scenario: "ci",
    domain: 3,
    subdomain: "3.1 Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
    question: "Your team is consolidating the instructions used by CI runs of Claude Code. A draft CLAUDE.md now mixes review tone and severity rubric guidance with lines like \"never call external URLs,\" \"never push to main\" and \"do not read .env files.\" A reviewer asks whether this split is right before the file is merged. What should you recommend?",
    options: [
      "Keep the review conventions in CLAUDE.md and enforce the prohibited actions with permission deny rules in committed settings.",
      "Keep everything in CLAUDE.md, because Claude Code reads it at the start of every session including CI runs.",
      "Move everything into permission rules in settings, including the severity rubric and review tone, so none of it relies on the model.",
      "Keep everything in CLAUDE.md and add a second copy of the prohibitions to each CI job's prompt for redundancy."
    ],
    answer: 0,
    optionNotes: [
      "Tone and rubrics are judgment guidance, which is what CLAUDE.md is for. Network access, pushes and secret files are hard limits that need deterministic enforcement, which permission rules provide.",
      "Being read is not the same as being enforced. Instructions can be outweighed by other context, so security limits written only in CLAUDE.md can still be violated.",
      "Permission rules control tool calls; they cannot express how to judge severity or phrase feedback. Guidance still needs a home in CLAUDE.md.",
      "Duplicating guidance does not change its nature. Both copies can still be overridden by the model's judgment."
    ],
    explanation: "Use CLAUDE.md for guidance that shapes judgment and settings permissions or hooks for anything that must never happen. The test is whether a single violation is acceptable."
  },
  {
    id: "sc-ci-040",
    scenario: "ci",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your CLAUDE.md asks Claude to run the project formatter and linter after every file it edits. In CI runs of the fix-it job, Claude sometimes skips this, especially in long sessions, and the resulting commits fail the formatting check. You want formatting to happen after every edit without depending on the model remembering. What should you configure?",
    options: [
      "Move the formatting instruction to the top of CLAUDE.md and mark it IMPORTANT so it carries more weight in long sessions.",
      "Add a slash command that formats the repository and tell Claude to invoke it once it has finished all of its edits.",
      "Add a PostToolUse hook in the project settings, matched to Edit and Write, that runs the formatter on the edited file.",
      "Ask Claude to list every file it edited at the end of the run so a later pipeline step can review the formatting."
    ],
    answer: 2,
    optionNotes: [
      "Placement and emphasis improve the odds but the step still depends on the model choosing to do it, which is the failure being reported.",
      "Invoking the command is again up to the model, so it can be skipped just like the original instruction.",
      "Hooks run deterministically on lifecycle events. A PostToolUse hook on Edit and Write formats each file right after it changes, every time, regardless of what Claude remembers.",
      "This only reports the problem after the fact and still leaves unformatted commits to fix."
    ],
    explanation: "When an action must happen every time, use a hook rather than an instruction. Hooks are executed by the harness, so they do not rely on the model's attention."
  },
  {
    id: "sc-ci-041",
    scenario: "ci",
    domain: 1,
    subdomain: "1.5 Apply Agent SDK hooks for tool call interception and data normalization",
    question: "Your CI automation lets Claude Code commit fixes on a branch, but it must never push or deploy; a separate, audited step does that. You want any attempt to run git push or the deploy script blocked, with a clear message telling Claude why, so it can carry on with its other work. Permission rules are in place, but the security team also wants a custom check that inspects the full command string, including chained commands. What should you add?",
    options: [
      "A Stop hook that inspects the transcript after the run and fails the job if a push or deploy command appears in it.",
      "A PreToolUse hook on Bash that inspects the command and exits with code 2 and a reason on stderr when it would push or deploy.",
      "A PostToolUse hook on Bash that detects push or deploy commands and force-resets the remote branch to its previous state after they have run.",
      "A CLAUDE.md section explaining that pushing and deploying are handled by a separate audited step in the pipeline."
    ],
    answer: 1,
    optionNotes: [
      "A Stop hook runs after the work is done, so the push or deploy has already happened by the time it fires.",
      "PreToolUse hooks run before the tool executes. Exit code 2 blocks the call and feeds the stderr message back to Claude, so the command never runs and Claude learns why.",
      "PostToolUse fires after the command has executed. Reverting a push or deployment afterwards is risky and may not be possible.",
      "This is guidance, which the security team has already decided is not sufficient for this constraint."
    ],
    explanation: "To block an action, intercept it before it executes. A PreToolUse hook can inspect the exact command and deny it with feedback, which is deterministic in a way instructions are not."
  },
  {
    id: "sc-ci-042",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your nightly job submits a Message Batches API request for every module changed that day, about 1,800 requests, each asking Claude to draft unit tests for one module. A script then writes each result to a test file. Several mornings, generated tests ended up in the wrong module's test file, because the script paired results with modules by their position in the results list. How should the script match results to modules?",
    options: [
      "Give each request a custom_id that identifies its module, and use the custom_id on each result to find the right file.",
      "Sort the results by completion time and pair them with the modules in the order the requests were submitted.",
      "Submit one batch per module so that each batch contains a single request and the pairing cannot be confused.",
      "Ask Claude to begin every response with the module path, then parse that path out of the response text to choose the right test file."
    ],
    answer: 0,
    optionNotes: [
      "Batch results are not guaranteed to come back in submission order. Each result carries the custom_id of its request, which is the intended way to correlate them.",
      "Completion order is no more tied to submission order than result position is, so this produces the same mismatches.",
      "This technically avoids confusion but turns one batch into 1,800 to create, track and poll, discarding the convenience of batching.",
      "Parsing model text for identifiers is fragile and depends on the model reproducing the path exactly; the API already provides a reliable identifier."
    ],
    explanation: "Message Batches results can return in any order. Assign each request a meaningful custom_id and use it to match results to inputs."
  },
  {
    id: "sc-ci-043",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Each week your pipeline produces a dependency risk report from Claude's analysis of every service, and the platform team reads it at 09:00 on Monday. To save cost, the job now uses the Message Batches API and is scheduled to submit at 06:00 on Monday. Most weeks it finishes in under an hour, but twice the report was not ready at 09:00. How should you schedule the submission?",
    options: [
      "Keep the 06:00 submission and automatically switch the job to synchronous calls if the batch has still not completed by 08:30.",
      "Keep the 06:00 submission and poll the batch more frequently so that results are collected as soon as they are ready.",
      "Move the job to synchronous calls permanently, since the batch API cannot be relied on for anything with a deadline.",
      "Submit the batch at least 24 hours before the report is needed, for example on Sunday morning, so the full window fits."
    ],
    answer: 3,
    optionNotes: [
      "A fallback re-runs the whole workload at full price in a rush, and it may still miss 09:00 for a large job. It treats the documented window as an exception.",
      "Polling speed does not change how long processing takes. If the batch has not finished, there is nothing to collect.",
      "Batches are fine for deadlines as long as the deadline is more than 24 hours away. Abandoning them gives up the discount unnecessarily.",
      "Most batches finish quickly, but the documented bound is up to 24 hours. Scheduling the submission so that full window fits before the deadline keeps the discount and makes the deadline safe."
    ],
    explanation: "Plan batch jobs around the 24-hour processing window, not the typical completion time. Submit early enough that the worst case still meets the deadline."
  },
  {
    id: "sc-ci-044",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your nightly batch of 1,800 test-generation requests ended with 1,762 succeeded, 26 errored and 12 expired. The job currently treats any non-succeeded result as a failure of the whole batch and resubmits all 1,800 requests the next night. This doubles cost on bad nights and delays every module's tests by a day. What is the better recovery strategy?",
    options: [
      "Resubmit the whole batch immediately rather than waiting for the next night, so that all modules still get their generated tests the same day.",
      "Process the succeeded results, then submit a new batch containing only the errored and expired requests, identified by custom_id.",
      "Switch the job to synchronous calls so that every failure appears at once and can be retried in a simple loop.",
      "Ignore the errored and expired requests until a developer notices that their module is missing generated tests."
    ],
    answer: 1,
    optionNotes: [
      "Rerunning succeeded requests pays for them twice and may still leave failures, with the same delay risk.",
      "Each result reports its own outcome, so successes can be used right away and only the failed requests retried. Their custom_ids identify exactly which inputs to resubmit.",
      "Synchronous calls lose the 50% discount on a workload that has no latency requirement, and failures still need handling.",
      "Silently dropping failures leaves gaps in coverage that nobody is tracking."
    ],
    explanation: "Batch results report success or failure per request. Keep the successes and resubmit only the failed requests by custom_id instead of rerunning the whole batch."
  },
  {
    id: "sc-ci-045",
    scenario: "ci",
    domain: 4,
    subdomain: "4.5 Design efficient batch processing strategies",
    question: "Your nightly test generation now needs a feedback step: generated tests must compile and pass before they are committed, and failing tests should be revised with the compiler or test output. The job uses the Message Batches API to keep cost down, and there is no deadline until the next morning. A teammate says the feedback step forces a move to synchronous calls. How can you add the feedback step and keep using batches?",
    options: [
      "Ask each batch request to also run the generated tests itself, so that Claude can see the failures and correct them inside that same request.",
      "Move the whole nightly job to synchronous calls, since any workflow with a feedback step requires a live conversation.",
      "Run a first batch to draft tests, run them in CI, then submit a second batch containing only the failing modules with their error output.",
      "Skip the feedback step and commit the first drafts, relying on developers to fix the failing tests during the next day."
    ],
    answer: 2,
    optionNotes: [
      "A batch request is one model call with no access to your test runner, so Claude cannot execute the tests inside it.",
      "Feedback does not require a live conversation when there is no latency requirement. Each round can be its own batch.",
      "Splitting the work into rounds keeps each request single-turn: the pipeline runs the tests between batches and sends only failures back with their errors, preserving the discount and the overnight timeline.",
      "Committing failing tests pushes the work to developers and breaks the build until someone fixes them."
    ],
    explanation: "Batches suit independent single-turn requests. Multi-step workflows can still use them by running deterministic steps between batch rounds, as long as the total fits the deadline."
  },
  {
    id: "sc-ci-046",
    scenario: "ci",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Your PR review uses one long prompt that asks Claude to check security, correctness, test coverage and API compatibility in a single pass. Results are uneven: security findings are thorough on some PRs but missing on others where the diff also contains many test changes. Adding more detail to each section of the prompt has made the output longer but not more consistent. How should you restructure the review?",
    options: [
      "Repeat the same combined prompt three times and keep only the findings that appear in a majority of the runs.",
      "Reorder the prompt so the most important concern comes first and ask Claude to spend most of its reasoning effort on that one section.",
      "Run separate focused passes for each concern, each with its own criteria, then merge and deduplicate the findings in code.",
      "Raise max_tokens for the review so the combined pass has enough room to cover all four concerns in detail."
    ],
    answer: 2,
    optionNotes: [
      "Repeated runs of the same overloaded prompt share its blind spots, so voting does not restore the missing coverage.",
      "Prioritizing one concern improves it at the expense of the others, which is the unevenness you are trying to fix.",
      "Each focused pass gives its concern full attention with criteria tailored to it, so coverage no longer depends on what else is in the diff. Merging in code keeps the final output clean.",
      "The problem is divided attention, not output length. More room does not make the model apply each checklist consistently."
    ],
    explanation: "When one pass tries to cover several concerns, attention gets spread unevenly. Specialized passes with their own criteria, combined afterwards, give more consistent coverage."
  },
  {
    id: "sc-ci-047",
    scenario: "ci",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Your reviewer produces about 20 candidate findings per PR, and roughly a third turn out to be false positives on inspection: issues already handled elsewhere, or code paths that cannot be reached. Developers want fewer false alarms without losing real issues. You can afford extra model calls per PR. Which architecture adds the most precision?",
    options: [
      "Add a verification pass in which a separate instance examines each candidate finding against the code and confirms or rejects it with evidence.",
      "Have the original pass rate its own confidence in each finding and drop everything below a fixed threshold.",
      "Run the same review three times and keep only the findings that appear in at least two of the three runs.",
      "Ask the original pass to reread its whole output at the end and remove anything it now thinks is a mistake."
    ],
    answer: 0,
    optionNotes: [
      "A dedicated verifier focuses on one claim at a time and must point to evidence, such as the guard that already handles the case. Independence from the generating context also avoids rationalizing the original claim.",
      "Self-reported confidence is poorly calibrated, so a threshold drops real issues and keeps confident false ones.",
      "Runs of the same prompt make correlated mistakes; a false positive caused by missing context will tend to recur in every run.",
      "Self-review in the same context is anchored by the reasoning that produced the findings, so it rarely overturns them."
    ],
    explanation: "A separate verification pass that checks each finding against the code is an effective way to raise precision. It is independent of the generator and judges one concrete claim at a time."
  },
  {
    id: "sc-ci-048",
    scenario: "ci",
    domain: 4,
    subdomain: "4.6 Design multi-instance and multi-pass review architectures",
    question: "Your two-stage review runs a first pass over the diff and then sends its findings to a second, independent reviewer instance. To save effort, the pipeline gives the second instance the first pass's full transcript, including its reasoning about why each change looked safe. Audits show that the second stage now almost always agrees with the first, and missed defects have not decreased. What change would restore the value of the second stage?",
    options: [
      "Use a larger model for the second stage so that it is more capable of disagreeing with the first pass.",
      "Instruct the second instance to disagree with at least one finding per PR so that it is forced to challenge the first pass's conclusions.",
      "Run the second stage before the first so that its conclusions cannot be influenced by the first pass.",
      "Give the second instance only the diff, the relevant code and the review criteria, without the first pass's reasoning."
    ],
    answer: 3,
    optionNotes: [
      "Model size does not remove anchoring. A stronger model given the same persuasive reasoning will still tend to accept it.",
      "Forced disagreement creates arbitrary noise rather than catching real defects.",
      "Reordering does not change anything meaningful; whichever stage receives the other's reasoning becomes the anchored one.",
      "The second stage helps only when it judges the code independently. Sharing the first pass's reasoning makes it inherit the same assumptions, which is why agreement went up without catching more defects."
    ],
    explanation: "Independent review depends on independent context. Pass the reviewer the artifacts and criteria, not the earlier reasoning, so it can catch what the first pass talked itself out of."
  },
  {
    id: "sc-ci-049",
    scenario: "ci",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Your pipeline validates each structured finding before posting it, checking for lines outside the diff, unknown file paths, severity outside policy and empty fixes. When a check fails, the log records only \"validation failed\" and the finding is dropped. The drop rate has crept up to 15%, and nobody can say which prompt or schema change would help. What should you change?",
    options: [
      "Lower the strictness of the checks until the drop rate falls back to an acceptable level, then monitor it weekly.",
      "Log a structured error record for each failure, with the rule that failed, the field, the value and the finding category, and analyze it by rule.",
      "Have Claude review the dropped findings each week and summarize in prose what it thinks went wrong with them.",
      "Retry every dropped finding with the instruction to follow the schema carefully, and post whatever comes back."
    ],
    answer: 1,
    optionNotes: [
      "Weakening the checks lets bad findings through without learning anything about why they were bad.",
      "Structured failure metadata shows which rules fail, on which fields and for which kinds of finding. Clusters, such as line errors on renamed files, point directly at the prompt or schema change to make.",
      "Prose summaries are hard to aggregate or track over time, and the underlying data was never recorded.",
      "A retry without the specific error gives Claude nothing to correct, and posting unchecked output defeats validation."
    ],
    explanation: "Feedback loops need structured error data. Recording which rule failed and on what makes it possible to find systematic causes and target fixes to the prompt or schema."
  },
  {
    id: "sc-ci-050",
    scenario: "ci",
    domain: 4,
    subdomain: "4.4 Implement validation, retry, and feedback loops for extraction quality",
    question: "Your CI job asks Claude to write unit tests for a changed module, then compiles and runs them. About a quarter of generated test files fail to compile, usually because of a wrong import path or a misnamed helper. The current job simply regenerates the whole file with the same prompt when compilation fails, and it often fails again in a different way. What is the better retry design?",
    options: [
      "Raise the temperature on retries so that each new attempt explores a different way of writing the test file.",
      "Discard failing files and only commit the tests that compiled the first time, keeping the job simple.",
      "Add a general instruction to the prompt asking Claude to double-check all imports and helper names before answering.",
      "Send the failing file back with the exact compiler errors and the relevant source, ask for a targeted fix, and cap the attempts."
    ],
    answer: 3,
    optionNotes: [
      "More randomness without information produces different errors rather than fixes.",
      "This throws away mostly correct work caused by small, fixable errors and leaves the coverage gaps in place.",
      "Generic double-check instructions help a little, but Claude still lacks the information about which import is wrong.",
      "Specific error output tells Claude exactly what to correct, and keeping the file means the parts that were right are preserved. A cap prevents endless loops on errors that cannot be fixed this way."
    ],
    explanation: "Effective retries feed back the concrete error, not just another chance. Error-informed, bounded retries converge where blind regeneration does not."
  },
  {
    id: "sc-ci-051",
    scenario: "ci",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Instead of Claude Code, one team built its PR reviewer directly on the Messages API with read_file and search_code tools. Their loop stops as soon as a response contains any text block, treating that as the final review. Reviews are often empty or say \"Let me look at the related tests first,\" because Claude wrote that sentence alongside a tool request. How should the loop decide whether to continue?",
    options: [
      "Continue only while the response contains no text at all, and stop at the first response that includes a text block.",
      "Check stop_reason: when it is tool_use, run the requested tools and send the results back; when it is end_turn, take the review.",
      "Stop when the text contains a closing phrase such as \"Review complete,\" which the system prompt asks Claude to write once it has finished.",
      "Always run a fixed number of iterations, such as eight, then use whatever text the last response contains as the review."
    ],
    answer: 1,
    optionNotes: [
      "This is the current bug. Text and tool_use blocks often appear in the same response, so text does not mean Claude has finished.",
      "stop_reason is the structured signal for loop control: tool_use means Claude is waiting for tool results, and end_turn means the response is complete.",
      "Closing phrases depend on the model following an instruction and can appear in unexpected places. The API already provides a reliable signal.",
      "A fixed count either cuts the review off mid-investigation or wastes calls after it has finished. Caps are a safety backstop, not the control signal."
    ],
    explanation: "An agentic loop should continue while stop_reason is tool_use and finish on end_turn. Text content, phrases and iteration counts are not reliable completion signals."
  },
  {
    id: "sc-ci-052",
    scenario: "ci",
    domain: 1,
    subdomain: "1.1 Design and implement agentic loops for autonomous task execution",
    question: "Your Messages API-based reviewer asks Claude to return findings by calling a report_findings tool. On very large PRs, the pipeline sometimes receives a tool_use block whose input is cut off and cannot be parsed, and the loop then crashes. The logs show stop_reason was max_tokens on those responses, but the loop treats max_tokens like tool_use. How should the loop handle this case?",
    options: [
      "Treat max_tokens as a signal that the response hit the output limit, and retry with a higher max_tokens or a smaller unit of work.",
      "Treat max_tokens like end_turn and post whatever part of the findings can be recovered from the truncated tool input.",
      "Parse the truncated tool input by closing any open brackets and quotes, then continue the loop as if the call succeeded.",
      "Ignore stop_reason and wrap the JSON parsing in a try block so that unparseable tool calls are silently skipped."
    ],
    answer: 0,
    optionNotes: [
      "max_tokens means generation stopped because of the output limit, so the tool call is incomplete. The fix is to give it more room or split the review into smaller pieces, then retry.",
      "A truncated response is not a finished one. Posting a partial set of findings silently drops the rest.",
      "Repairing JSON by guesswork may produce a syntactically valid but wrong set of findings, and the missing ones are still lost.",
      "Silently skipping incomplete calls hides the problem and loses findings on exactly the largest PRs."
    ],
    explanation: "Handle each stop_reason explicitly. max_tokens means the output was cut off, so an incomplete tool call should be retried with a higher limit or less work per request, not treated as a valid call."
  },
  {
    id: "sc-ci-053",
    scenario: "ci",
    domain: 2,
    subdomain: "2.1 Design effective tool interfaces with clear descriptions and boundaries",
    question: "Your Messages API reviewer offers two tools: get_pr_diff, described as \"Gets PR content,\" and read_file, described as \"Reads a file.\" Logs show Claude often calls read_file on every changed file to see what changed, which uses many tokens and loses the diff markers, and sometimes calls get_pr_diff when it actually needs an unchanged base class. What is the most effective fix?",
    options: [
      "Merge both tools into one get_code tool with a mode parameter, so Claude only has a single tool to choose from.",
      "Add a system prompt rule saying \"prefer get_pr_diff\" without changing the descriptions of either tool.",
      "Remove read_file from the reviewer so that Claude always works from the diff for every question it has.",
      "Rewrite both descriptions to state what each returns, when to use it and when not to, with example inputs and the boundary between them."
    ],
    answer: 3,
    optionNotes: [
      "A mode parameter moves the same ambiguity into the parameter choice, and a vague description of the merged tool would cause the same confusion.",
      "A blanket preference pushes Claude toward the diff even when it really needs unchanged context, trading one mistake for another.",
      "Reviews often need unchanged code such as base classes and callers. Removing the tool removes a capability the reviewer needs.",
      "Claude chooses tools mostly from their descriptions. Saying that get_pr_diff returns changed hunks with markers and read_file returns full current contents of any file, including unchanged ones, makes the right choice clear."
    ],
    explanation: "Vague, overlapping tool descriptions cause misrouted calls. Clear descriptions that say what each tool returns, when to use it and how it differs from similar tools are the main fix."
  },
  {
    id: "sc-ci-054",
    scenario: "ci",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "Your team wants CI runs of Claude Code to read issue details from the internal tracker through an MCP server so that reviews can check whether a PR meets its ticket. The first draft of the committed .mcp.json contains the tracker's API token in plain text in the server's env block. Security has rejected it, but the CI runner already exposes the token as a secret environment variable named TRACKER_TOKEN. What should the committed configuration look like?",
    options: [
      "Keep the token in .mcp.json but move the file into .gitignore so it is never committed to the repository.",
      "Commit .mcp.json with the env value written as ${TRACKER_TOKEN}, so Claude Code expands it from the runner's environment.",
      "Put the token in CLAUDE.md and instruct Claude to pass it to the MCP server whenever it calls a tracker tool.",
      "Ask each developer to add the server with their own personal token at user scope, and configure the CI runner separately by hand."
    ],
    answer: 1,
    optionNotes: [
      "Ignoring the file means the shared server definition is no longer in the repository, so the runner and teammates lose it.",
      "Claude Code expands ${VAR} references in .mcp.json, including in env, so the shared configuration is committed without the secret and each environment supplies its own value.",
      "Putting a secret in CLAUDE.md exposes it in the repository and in the model's context, which is worse than the original draft.",
      "User-scoped servers are not shared, so configurations drift and the CI setup lives outside version control."
    ],
    explanation: "Share MCP server definitions in a committed .mcp.json and keep secrets out of it with environment variable expansion. Each machine, including CI, provides the value at runtime."
  },
  {
    id: "sc-ci-055",
    scenario: "ci",
    domain: 2,
    subdomain: "2.4 Integrate MCP servers into Claude Code and agent workflows",
    question: "A developer added a code-search MCP server with claude mcp add using the default scope, and it works well in their own Claude Code sessions. When the PR review job runs on a fresh CI runner, Claude reports that no such tools exist. The team wants the CI job to use exactly the same server definition, kept in version control and reviewed like other code. What should you do?",
    options: [
      "Commit a JSON file with the server definition to the repository and pass it to the CI command with --mcp-config.",
      "Ask the developer to export their ~/.claude.json and copy it onto each CI runner as part of the job setup.",
      "Describe the server's capabilities in CLAUDE.md so Claude knows how to search the code without the server.",
      "Reinstall the server on the runner at the start of each job with claude mcp add, using the same command as the developer."
    ],
    answer: 0,
    optionNotes: [
      "The default scope is local, stored with the developer's personal configuration, so the runner never sees it. A committed config file passed with --mcp-config gives CI the same definition under version control.",
      "Copying a personal configuration file onto runners spreads unrelated personal settings and keeps the definition outside code review.",
      "Describing a tool does not provide it; Claude still has no search tools to call.",
      "Repeating ad hoc setup commands in each job duplicates the definition in the pipeline script and is easy to let drift from what developers use."
    ],
    explanation: "Locally scoped MCP servers exist only on one machine. For CI, keep the server definition in the repository, either as the project .mcp.json or a config file passed with --mcp-config."
  },
  {
    id: "sc-ci-056",
    scenario: "ci",
    domain: 4,
    subdomain: "4.3 Enforce structured output using tool use and JSON schemas",
    question: "Your review schema defines category as an enum of security, correctness, performance and testing. Since a new class of issues around accessibility and licensing appeared, logs show these findings being forced into whichever category seems closest, mostly correctness, which skews per-category metrics and routing. You do not want to keep editing the enum every time a new kind of finding appears. What schema change is best?",
    options: [
      "Remove the enum and make category a free-text string so that Claude can describe each finding's category in its own words.",
      "Keep the enum unchanged and add a prompt instruction telling Claude to pick the closest category for anything new.",
      "Make category optional so that Claude can leave it out whenever none of the four values fits the finding.",
      "Add an \"other\" value to the enum together with a category_detail string field that is filled in when \"other\" is chosen."
    ],
    answer: 3,
    optionNotes: [
      "Free text breaks the routing and metrics that rely on stable values; the same category would be written many different ways.",
      "This is what is already happening; picking the closest value is exactly the misclassification that skews the metrics.",
      "Missing values hide the new class of findings instead of capturing it, and routing has nothing to act on.",
      "An \"other\" value with a detail field keeps known categories stable for routing while capturing new kinds honestly. Reviewing the detail values shows when a new enum value is warranted."
    ],
    explanation: "Closed enums force misclassification when reality grows. An \"other\" option plus a detail field preserves structure while making new cases visible."
  },
  {
    id: "sc-ci-057",
    scenario: "ci",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Your team wants to let the reviewer automatically block merges when it reports a high-severity finding with confidence above 0.9. The confidence values are self-reported by Claude and have never been compared against outcomes. A pilot on one repository looked promising, but nobody knows how often 0.9-confidence findings are actually correct. What should you do before enabling automatic blocking?",
    options: [
      "Enable blocking now at 0.9 and raise the threshold later if developers start complaining about false blocks.",
      "Measure precision against a labeled set of past findings, by confidence band and category, and set thresholds from that data.",
      "Ask Claude to be more careful with its confidence values and to reserve any score above 0.9 for findings it is genuinely certain about.",
      "Use 0.99 instead of 0.9 so that only the findings Claude is most certain about can ever block a merge."
    ],
    answer: 1,
    optionNotes: [
      "Learning from complaints means blocking developers on unverified judgment, and trust may be lost before the threshold is fixed.",
      "Self-reported confidence is only useful after calibration. Measuring actual precision for each confidence band and category shows where automation is safe and where human review is still needed.",
      "Instructions do not calibrate a score. The values are still unverified against real outcomes.",
      "A stricter number is still uncalibrated; without data you do not know whether 0.99 findings are more accurate than 0.9 ones."
    ],
    explanation: "Model confidence must be calibrated against labeled outcomes before it drives automation. Measure precision per band and category, then set thresholds from evidence."
  },
  {
    id: "sc-ci-058",
    scenario: "ci",
    domain: 5,
    subdomain: "5.5 Design human review workflows and confidence calibration",
    question: "Your reviewer's findings are 94% precise overall, so the team auto-posts them as blocking comments. Some developers say concurrency findings feel unreliable, but the overall figure looks healthy. A breakdown has never been done, and only findings that developers dispute are ever looked at by a human. How should you set up ongoing human review of the auto-posted findings?",
    options: [
      "Rely on the overall 94% figure and continue reviewing only findings that developers dispute in their PR comments.",
      "Review every auto-posted finding by hand, which removes any doubt about precision but cancels out the automation.",
      "Report precision per finding category and sample auto-posted findings from each category for human review, including the rare ones.",
      "Ask Claude to flag which of its findings it thinks are unreliable, and send only those to human review."
    ],
    answer: 2,
    optionNotes: [
      "An aggregate figure can hide a weak category, and disputed findings are a biased sample, since many developers simply comply or ignore.",
      "Full manual review is safe but gives up the benefit of automating, and it is unnecessary for categories that prove reliable.",
      "Per-category metrics expose weak segments that the overall number hides, and stratified sampling keeps measuring each segment, including low-volume ones like concurrency, over time.",
      "The model's own sense of reliability is exactly what has not been validated; it may be confidently wrong in the weak category."
    ],
    explanation: "Overall accuracy can mask poor performance in specific categories. Break precision down by segment and keep sampling each one so human review covers where errors actually occur."
  },
  {
    id: "sc-ci-059",
    scenario: "ci",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Before reviewing a PR that changes the signature of a shared function parseInvoice, your Claude Code review job should check every call site in the repository. In the current runs, Claude uses Glob for files named like invoice and reads them, so it misses callers in files with unrelated names. The repository has about 4,000 source files. Which approach should the job's instructions describe?",
    options: [
      "Read every source file in the repository so that no call site can be missed during the review.",
      "Use Glob with a broader pattern such as **/*.ts and inspect the resulting list of file names for anything that looks like a likely caller.",
      "Use Grep to search file contents for parseInvoice, then Read only the matching files to check each call.",
      "Use Bash to list the repository directory tree and choose the files that look related to invoices."
    ],
    answer: 2,
    optionNotes: [
      "Reading thousands of files wastes context and time when only a few contain calls.",
      "Glob matches file paths, not contents, so a broader pattern still says nothing about which files call the function.",
      "Grep searches file contents, so it finds every reference regardless of file name. Reading only the matches keeps context focused on actual call sites.",
      "Directory names are no better than file names at revealing which files contain calls."
    ],
    explanation: "Use Grep to search contents and Glob to match file paths. Finding call sites is a content search, followed by targeted Reads of the matching files."
  },
  {
    id: "sc-ci-060",
    scenario: "ci",
    domain: 4,
    subdomain: "4.1 Design prompts with explicit criteria to improve precision and reduce false positives",
    question: "On large PRs your reviewer often comments on code that the PR did not change, such as an old unchecked cast three functions away from the edit. Developers find these comments distracting and out of scope, but the security team still wants to know about serious pre-existing vulnerabilities. The prompt currently says \"review the code in this PR.\" What prompt change best fits both needs?",
    options: [
      "Tell Claude to ignore all code outside the diff completely, including any pre-existing security issues it might notice.",
      "Remove the unchanged code from the context entirely so Claude only ever sees the changed lines.",
      "Ask Claude to be more careful about scope and to use judgment about which nearby code is worth mentioning.",
      "Say that inline comments cover only changed lines, and that critical pre-existing vulnerabilities go in a separate summary section."
    ],
    answer: 3,
    optionNotes: [
      "This removes the noise but also loses the serious pre-existing issues that the security team explicitly asked to keep.",
      "Without surrounding code Claude cannot judge whether a change is correct, so review quality falls.",
      "\"Use judgment\" is the kind of vague instruction that produced the scope creep. It gives no boundary.",
      "An explicit scope rule removes the out-of-scope inline noise, and a defined exception with its own output section keeps the high-value findings without cluttering the diff."
    ],
    explanation: "Precision improves when the prompt states exactly what is in scope and how exceptions are handled. Explicit boundaries beat general appeals to judgment."
  }
);
