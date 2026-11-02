/* The six official CCAR-F scenarios. Each real exam draws four of them and
 * asks 15 questions about each, with this background text fixed on the left.
 * Questions live in scenarios/<id>.js and push onto SCENARIO_BANK. */
window.SCENARIOS = [
  {
    id: "support",
    name: "Customer Support Resolution Agent",
    text: "You are building a customer support resolution agent using the Claude Agent SDK. The agent handles high-ambiguity requests like returns, billing disputes, and account issues. It has access to backend systems through MCP tools (get_customer, lookup_order, process_refund, escalate_to_human). Your target is 80%+ first-contact resolution while knowing when to escalate.",
  },
  {
    id: "codegen",
    name: "Code Generation with Claude Code",
    text: "You are using Claude Code to accelerate software development. Your team uses it for code generation, refactoring, debugging, and documentation. You need to integrate it into your development workflow with custom slash commands, CLAUDE.md configurations, and understand when to use plan mode vs direct execution.",
  },
  {
    id: "research",
    name: "Multi-Agent Research System",
    text: "You are building a multi-agent research system using the Claude Agent SDK. A coordinator agent delegates to specialized subagents: one searches the web, one analyzes documents, one synthesizes findings, and one generates reports. The system researches topics and produces comprehensive, cited reports.",
  },
  {
    id: "devprod",
    name: "Developer Productivity with Claude",
    text: "You are building developer productivity tools using the Claude Agent SDK. The agent helps engineers explore unfamiliar codebases, understand legacy systems, generate boilerplate code, and automate repetitive tasks. It uses built-in tools (Read, Write, Bash, Grep, Glob) and integrates with MCP servers.",
  },
  {
    id: "ci",
    name: "Claude Code for Continuous Integration",
    text: "You are integrating Claude Code into your CI/CD pipeline. The system runs automated code reviews, generates test cases, and provides feedback on pull requests. You need to design prompts that provide actionable feedback and minimize false positives.",
  },
  {
    id: "extraction",
    name: "Structured Data Extraction",
    text: "You are building a structured data extraction system using Claude. The system extracts information from unstructured documents, validates output using JSON schemas, and maintains high accuracy. It must handle edge cases gracefully and integrate with downstream systems.",
  },
];
window.SCENARIO_BANK = window.SCENARIO_BANK || [];
