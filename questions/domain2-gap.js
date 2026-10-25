// Domain 2 gap set — 6 questions (2.5 ×6)
window.QUESTION_BANK = window.QUESTION_BANK || [];
window.QUESTION_BANK.push(
  {
    id: "d2-q55",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "While reviewing a transcript, an architect notices Claude Code repeatedly running Bash commands like grep -rn \"PaymentService\" src/ and cat src/billing/invoice.ts to inspect the codebase, even though no shell-specific behavior is needed. Why is this considered a misuse pattern, and what should Claude do instead?",
    options: [
      "It is only a problem because Bash output is truncated at one line; Claude should pipe every command through a pager utility so full output is preserved",
      "Shelling out duplicates what the dedicated tools already do; Claude should use the Grep tool for content searches and Read for file contents, reserving Bash for actual command execution",
      "Bash cannot access source directories at all, so those commands silently return empty results; Claude should mount the directory first with a separate Bash call",
      "The commands are fine functionally, but Grep and Read must still be called afterward anyway to register the files with the permission system before any edit"
    ],
    answer: 1,
    explanation: "Claude Code's guidance explicitly says to avoid using Bash for grep, find, and cat style inspection, because the dedicated Grep, Glob, and Read tools are optimized for these tasks and integrate better with the session. Bash should be reserved for things the dedicated tools cannot do, such as running builds, tests, or git commands."
  },
  {
    id: "d2-q56",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Claude Code needs to examine a specific failing function that it already knows starts around line 1,450 of a 9,000-line generated API client file. Reading irrelevant content would waste a large amount of context. What is the most token-efficient way to inspect just that region?",
    options: [
      "Use Grep with output mode count on the file so the number of matches substitutes for actually seeing the function body",
      "Use Write to split the large file into several smaller files on disk first, then Read the one fragment that contains the function",
      "Use Bash to open the file in a terminal editor, since editors load files lazily and therefore consume no tokens in the conversation",
      "Use Read with an offset near the function's starting line and a limit covering the function's length, so only that slice enters context"
    ],
    answer: 3,
    explanation: "Read accepts offset and limit parameters precisely for this situation: when you know which part of a large file you need, reading only that range keeps context usage low. Splitting the file on disk or substituting match counts for actual content would either mutate the project unnecessarily or fail to show the code."
  },
  {
    id: "d2-q57",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "An architect asks Claude Code which packages in a monorepo still depend on an internal library slated for removal. Claude only needs the list of affected files to map them to packages — the actual import lines do not matter yet. The library name appears in hundreds of import statements. Which Grep usage is the best fit?",
    options: [
      "Output mode files_with_matches, which returns only the matching file paths and avoids flooding context with hundreds of matching lines",
      "Output mode content with no filters, since seeing every matching line is always worth the token cost before any planning decision",
      "Output mode content with surrounding context lines enabled, so each of the hundreds of matches arrives with several extra lines around it",
      "Running the same search four times, once per output mode, and cross-checking that all runs agree before trusting the file list"
    ],
    answer: 0,
    explanation: "When only the locations of matches are needed, files_with_matches returns just the file paths, which is far cheaper in tokens than content mode with hundreds of matched lines. Content mode and added context lines are valuable when the line text itself must be examined, which is not the case here."
  },
  {
    id: "d2-q58",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Inside a single 300-line module Claude Code has already read, a poorly named helper function doCalc is defined and called 11 times, and the architect wants every occurrence in this file renamed to computeTotals. The identifier doCalc appears nowhere else in the file as a substring of other names. What is the most efficient correct approach?",
    options: [
      "Call Write with the full renamed file content, since Edit is incapable of changing more than one occurrence of a string in a single call",
      "Call Grep in content mode on the file, because retrieving all 11 matching lines also applies the rename to each of them in place",
      "Issue a single Edit call with old_string doCalc, new_string computeTotals, and replace_all set to true, updating all 11 occurrences at once",
      "Issue 11 sequential Edit calls, each including enough unique surrounding context, since replace_all exists only for whitespace changes"
    ],
    answer: 2,
    explanation: "Edit's replace_all option replaces every occurrence of old_string in the file in one call, which is exactly right for renaming a variable or function consistently when no unintended substring collisions exist. Eleven individual edits or a full-file Write would accomplish the same result with far more effort and token cost."
  },
  {
    id: "d2-q59",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "An architect asks Claude Code to relocate src/utils/currency.ts to src/billing/currency.ts in a git-tracked project, keeping the file's content identical and its history easy to follow. Which approach uses the toolset correctly?",
    options: [
      "Use Edit on the original file with old_string set to its path header comment, since changing the path comment inside a file also relocates it on disk",
      "Use Bash to run git mv on the file, since moving or renaming files is an operation the Read, Write, and Edit tools do not perform",
      "Use Glob with the new path as the pattern, since globbing for a path that does not exist yet instructs the tool to create it by moving the closest match",
      "Use Write to create the file at the new path from memory without reading the original, then leave the old copy in place to preserve history"
    ],
    answer: 1,
    explanation: "Read, Write, and Edit operate on file contents, not filesystem structure, so moving or renaming a file is a job for Bash — and git mv both relocates the file and records it as a rename for history purposes. Recreating the file from memory or leaving a duplicate behind risks divergence and clutters the repository."
  },
  {
    id: "d2-q60",
    domain: 2,
    subdomain: "2.5 Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
    question: "Claude Code has read a 2,400-line service file and must change one incorrect comparison operator inside a single if condition. A teammate suggests simply regenerating the whole file with Write since Claude already has the content in context. Why is Edit the better choice here?",
    options: [
      "Write is blocked on files longer than 2,000 lines, so the Write call would be rejected by the tool before any content was persisted",
      "Edit bypasses the permission system for small changes, making it faster to execute than Write in interactive sessions",
      "Write would invalidate the earlier Read, forcing Claude to re-read all 2,400 lines before any future tool call could touch the file",
      "A targeted Edit changes only the intended span, while regenerating 2,400 lines with Write costs far more output tokens and risks introducing unintended differences elsewhere in the file"
    ],
    answer: 3,
    explanation: "For a small localized change, Edit's exact string replacement is cheaper and safer: Write must emit the entire file as output, which consumes many more tokens and creates the risk that the regenerated content silently drifts from the original outside the intended fix. Whole-file Write is appropriate when most of the file is changing, not for a one-operator fix."
  }
);
