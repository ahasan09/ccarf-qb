# Question Coverage Audit — 2026-11-04

Replaces the 2026-10-25 audit. The gap files (`questions/domain*-gap.js`)
had already brought 2.5, 3.5, 5.2, 5.3 and 5.4 to 23 bank questions each, so
the thin spots had moved to the scenario bank. 23 new scenario questions
brought 5.1, 3.3, 5.2, 1.4, 3.6 and 5.6 from 6–9 to 12 each.

Regenerate with `npm run coverage`.

```
Objective                                                    Bank  Scenario
1.1 Design and implement agentic loops for autonomous tas…     18        19
1.2 Orchestrate multi-agent systems with coordinator-suba…     18        11
1.3 Configure subagent invocation, context passing, and s…     18        10
1.4 Implement multi-step workflows with enforcement and h…     18        12
1.5 Apply Agent SDK hooks for tool call interception and …     17        16
1.6 Design task decomposition strategies for complex work…     20        10
1.7 Manage session state, resumption, and forking              20        13
2.1 Design effective tool interfaces with clear descripti…     18        14
2.2 Implement structured error responses for MCP tools         17        10
2.3 Distribute tools appropriately across agents and conf…     17        11
2.4 Integrate MCP servers into Claude Code and agent work…     18        17
2.5 Select and apply built-in tools (Read, Write, Edit, B…     23        12
3.1 Configure CLAUDE.md files with appropriate hierarchy,…     18        14
3.2 Create and configure custom slash commands and skills      20        11
3.3 Apply path-specific rules for conditional convention …     20        12
3.4 Determine when to use plan mode vs direct execution        20        10
3.5 Apply iterative refinement techniques for progressive…     23        12
3.6 Integrate Claude Code into CI/CD pipelines                 18        12
4.1 Design prompts with explicit criteria to improve prec…     18        10
4.2 Apply few-shot prompting to improve output consistenc…     17        11
4.3 Enforce structured output using tool use and JSON sch…     18        13
4.4 Implement validation, retry, and feedback loops for e…     20        16
4.5 Design efficient batch processing strategies               20        20
4.6 Design multi-instance and multi-pass review architect…     17        12
5.1 Manage conversation context to preserve critical info…     17        12
5.2 Design effective escalation and ambiguity resolution …     23        12
5.3 Implement error propagation strategies across multi-a…     23        10
5.4 Manage context effectively in large codebase explorat…     23        12
5.5 Design human review workflows and confidence calibrat…     17        17
5.6 Preserve information provenance and handle uncertaint…     23        12

877 bank questions (300 without an objective, used by the supplementary mock), 383 scenario questions. 0 objective(s) under 10.
```
