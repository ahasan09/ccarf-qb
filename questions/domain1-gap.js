// Domain 1 gap set — 6 questions (1.6 ×3, 1.7 ×3)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d1-q82",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "A trust-and-safety team screens user-submitted posts with a single LLM call that outputs a violation verdict. The verdict is a nuanced judgment call, borderline cases are frequently misclassified, and a missed violation is far more costly than a small increase in compute. The latency budget comfortably allows several model calls to run at once, and the screening task itself cannot be meaningfully split into smaller pieces. Which decomposition strategy best fits this situation?",
    options: [
      "Section the post into paragraphs and assign each paragraph to its own worker so each call handles less text.",
      "Convert the single call into a sequential prompt chain where a second call re-checks the first call's verdict before it is returned.",
      "Use the voting variant of parallelization: run the same screening judgment multiple times in parallel, with prompts or thresholds varied, and aggregate the verdicts.",
      "Introduce an orchestrator that inspects each post at runtime and dynamically decides which specialized screening worker to delegate it to."
    ],
    answer: 2,
    explanation: "Anthropic's parallelization pattern has two variants: sectioning (splitting a task into independent subtasks) and voting (running the same task multiple times to get diverse outputs). When a single nuanced judgment is unreliable and the task cannot be subdivided, voting raises confidence by aggregating multiple independent attempts, and the available latency budget makes the parallel calls essentially free. Sectioning, chaining, and dynamic orchestration all add structure without addressing the core problem of judgment reliability on an indivisible task."
  },
  {
    id: "d1-q83",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "To speed up translation of a 90-page legal contract, a team splits it into one section per parallel subagent, each translating its section in isolation. The merged result is grammatically clean, but defined terms like \"Provider\" and \"Service Period\" are rendered differently across sections, breaking the contract's internal cross-references. What is the most important design lesson here?",
    options: [
      "Parallel decomposition is only safe when subtasks are genuinely independent; sections sharing coupled context like consistent terminology need either a shared artifact (such as a glossary extracted first and passed to every worker) or a single shared context.",
      "Legal documents are too ambiguous for LLM translation, so the entire contract should be translated token-by-token in a single deterministic pass with temperature zero.",
      "The team should have used more subagents with smaller slices, since finer granularity gives each worker fewer chances to introduce terminology drift.",
      "The failure proves orchestrator-workers was the wrong pattern and a voting ensemble of three full-document translations should have been used instead."
    ],
    answer: 0,
    explanation: "Decomposition hurts when subtasks that look separable actually share state — here, a consistent mapping for defined terms. The fix is to respect the coupling: extract the shared dependency (a term glossary) in a first sequential step and supply it to every parallel worker, or keep tightly coupled content in one context. Finer-grained splitting makes the inconsistency worse, not better, because it multiplies the number of independent terminology decisions."
  },
  {
    id: "d1-q84",
    domain: 1,
    subdomain: "1.6 Design task decomposition strategies for complex workflows",
    question: "An architect must design an automated review of a six-file pull request that needs three distinct assessments: security, performance, and accessibility. Each assessment requires different reference material and evaluation criteria, and issues within a single concern often span multiple files (for example, an input sanitized in one file but trusted in another). Review quality degrades noticeably when one prompt mixes all three concerns. How should the work be decomposed?",
    options: [
      "Run one combined prompt over all six files covering all three concerns, since splitting would lose the full picture of the change.",
      "Assign one subagent per file, with each subagent responsible for checking security, performance, and accessibility in its file.",
      "Run three identical general-purpose reviews of the whole PR in parallel and merge their findings by majority vote.",
      "Assign one subagent per concern, each with instructions and criteria specialized for that concern, and give each one visibility across all six files."
    ],
    answer: 3,
    explanation: "Splitting by expertise keeps each prompt focused on a single, well-defined concern — which Anthropic's sectioning guidance notes tends to improve performance over one prompt juggling many considerations — while preserving the cross-file visibility each concern needs to catch issues like a sanitization done in one file and bypassed in another. Splitting by file would fragment exactly the cross-file view that matters, and voting with identical generalist prompts repeats the degraded mixed-concern review three times."
  },
  {
    id: "d1-q85",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "A backend service uses the Claude Agent SDK's query() function to run an investigation, and must be able to resume that exact conversation hours later in response to a webhook. During the original run, how should the service obtain the identifier it will later pass via the resume option?",
    options: [
      "Generate its own UUID before calling query() and pass it in as the session identifier for the SDK to adopt.",
      "Read the session_id field from the initial system message with subtype \"init\" that the SDK yields at the start of the response stream, and persist it.",
      "Call a REST endpoint on the Claude API to list active sessions for the API key and select the newest one.",
      "Parse the model's final text output, since the agent appends its session identifier to the last assistant message."
    ],
    answer: 1,
    explanation: "The Claude Agent SDK assigns the session ID itself and reports it in the init system message emitted at the start of the message stream; the documented pattern is to capture session_id from that message and store it. Later, passing it as the resume option continues the conversation with its full history — there is no REST session listing for this, no client-supplied ID, and the model's text output is not a reliable transport for identifiers."
  },
  {
    id: "d1-q86",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "During a Claude Code session, the agent edited several source files with its file-editing tools, ran a shell script via Bash that rewrote a generated config file, and executed a database migration against a local dev database. The developer dislikes the direction, uses /rewind to restore an earlier checkpoint, and expects everything to be back as it was. What will actually be restored?",
    options: [
      "Only the edits Claude made through its file-editing tools are reverted; files changed by the Bash-invoked script and the database migration are untouched, because checkpoints do not track shell side effects or external state.",
      "All file changes and the database are restored, because checkpoints snapshot the full working directory and replay inverse operations for each command.",
      "Nothing is restored until the developer also runs git reset, because checkpoints are implemented purely as git commits on the current branch.",
      "The conversation returns to the earlier point but no files change at all, since checkpoints only ever store conversation history."
    ],
    answer: 0,
    explanation: "Claude Code's checkpoints automatically track edits Claude makes through its file-editing tools, and /rewind can restore the code, the conversation, or both. Changes produced by bash commands — including scripts that rewrite files — and external state such as a database are outside checkpoint tracking, so they persist after a rewind and must be undone separately."
  },
  {
    id: "d1-q87",
    domain: 1,
    subdomain: "1.7 Manage session state, resumption, and forking",
    question: "A nightly automation on a shared build server starts an analysis in a repository each morning with Claude Code, then runs \"claude --continue -p '<follow-up>'\" in that repository each night to extend it. Occasionally the nightly run extends a completely unrelated conversation that an engineer happened to start in the same directory that afternoon. What is the most robust fix?",
    options: [
      "Schedule the nightly job earlier so it runs before engineers have a chance to open their own sessions in the repository.",
      "Pass --fork-session alongside --continue so the nightly run branches off into its own copy instead of touching anyone's session.",
      "Capture the morning session's ID when it is created and have the nightly job resume that specific session explicitly (e.g., claude --resume <session-id>), since --continue simply loads the most recent conversation in the current directory.",
      "Run the nightly job from a different working directory so --continue cannot see the engineers' sessions."
    ],
    answer: 2,
    explanation: "--continue is a convenience that resumes the most recent conversation for the current directory, so any later session started there becomes the one it picks up. Deterministic automation should persist the intended session's ID and resume it explicitly with --resume (or the SDK's resume option). Rescheduling is a race, forking --continue still forks whatever session happens to be newest, and changing directories breaks the association between the session and the repository being analyzed."
  }
);
