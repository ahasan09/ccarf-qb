/* Study resources shown on the home page. Edit this list to add or change
 * links — no UI code needs touching.
 *
 *   id     unique key (other screens look some up: "exam-guide")
 *   group  one of the RESOURCE_GROUPS names in js/logic.js
 *   title  link text
 *   url    https only; strip tracking parameters (utm_*, rcm, trackingId)
 *   note   optional one-line description
 *   star   optional — marks a must-read
 *   start  optional — offered on the first-visit screen as a starting point
 *   exam   optional — id of an imported exam this is the source of */
window.STUDY_RESOURCES = [
  {
    id: "exam-guide",
    group: "Official",
    title: "Claude Certified Architect – Foundations Exam Guide",
    url: "https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542750%2FClaude+Certified+Architect+%E2%80%93+Foundations+Exam+Guide.pdf",
    note: "The domains, task statements and scenarios the exam is built from (PDF).",
    star: true,
    start: true,
  },
  {
    id: "skilljar-api",
    group: "Official",
    title: "Claude with the Anthropic API",
    url: "https://anthropic-partners.skilljar.com/claude-with-the-anthropic-api",
    note: "Anthropic's course — the basics, if you are just starting.",
    start: true,
  },
  {
    id: "cert-guide",
    group: "Study guides",
    title: "Claude Certification Guide",
    url: "https://claudecertificationguide.com/learn",
    note: "Lessons organised around the exam objectives.",
    star: true,
  },
  {
    id: "larionov-guide",
    group: "Study guides",
    title: "Claude Certified Architect guide (paullarionov)",
    url: "https://github.com/paullarionov/claude-certified-architect/blob/main/guide_en.md",
    note: "A single-page written guide on GitHub.",
    star: true,
  },
  {
    id: "ccarf-study-kit",
    group: "Study guides",
    title: "CCAR-F study kit (NirjoyDebnath)",
    url: "https://github.com/NirjoyDebnath/ccarf-study-kit",
    note: "Notes and material collected on GitHub.",
  },
  {
    id: "purcell-questions",
    group: "Practice & reviews",
    title: "CCAR-F practice exam questions v2 — Matthew Purcell",
    url: "https://www.linkedin.com/posts/purcellmatthew_ccar-f-practice-exam-questions-v2-ugcPost-7491707994921938944-FhH5/",
    note: "LinkedIn post with practice questions.",
    exam: "purcell",
  },
  {
    id: "purcell-review",
    group: "Practice & reviews",
    title: "Claude certification exams: an honest review — Matthew Purcell",
    url: "https://www.linkedin.com/pulse/claude-certification-exams-honest-review-matthew-purcell-byo2e/",
    note: "What the exam is like, from someone who sat it.",
  },
  {
    id: "linkedin-event",
    group: "Events",
    title: "CCAR-F LinkedIn event",
    url: "https://www.linkedin.com/events/7486174731956813825/",
    note: "LinkedIn event on the certification.",
  },
];
