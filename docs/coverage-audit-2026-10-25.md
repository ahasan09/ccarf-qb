# Question Bank Coverage Audit — 2026-10-25

Bank at time of audit: 780 questions (300 authored, 480 imported with
subdomain tags). Audited against the official 30-subdomain CCAR-F lesson
structure (7/5/6/6/6 per domain). The imported set contributes exactly 16
questions to every subdomain; the 300 authored questions were classified by
primary topic.

## Totals per subdomain (authored + 16 imported)

| Sub | Topic (short) | Authored | Total |
|-----|---------------|---------:|------:|
| 1.1 | Agentic loops | 19 | 35 |
| 1.2 | Coordinator–subagent orchestration | 7 | 23 |
| 1.3 | Subagent invocation & context passing | 6 | 22 |
| 1.4 | Multi-step workflows & handoffs | 33 | 49 |
| 1.5 | Agent SDK hooks | 7 | 23 |
| 1.6 | Task decomposition | 3 | 19 |
| 1.7 | Session state, resumption, forking | 3 | 19 |
| 2.1 | Tool interface design | 13 | 29 |
| 2.2 | Structured error responses | 7 | 23 |
| 2.3 | Tool distribution & tool choice | 6 | 22 |
| 2.4 | MCP integration | 28 | 44 |
| 2.5 | Built-in tools (Read/Write/Edit/Bash/Grep/Glob) | **0** | 16 |
| 3.1 | CLAUDE.md hierarchy & scoping | 7 | 23 |
| 3.2 | Slash commands & skills | 3 | 19 |
| 3.3 | Path-specific rules | 1 | 17 |
| 3.4 | Plan mode vs direct execution | 1 | 17 |
| 3.5 | Iterative refinement | **0** | 16 |
| 3.6 | CI/CD integration | 8 | 24 |
| 4.1 | Explicit-criteria prompts | 20 | 36 |
| 4.2 | Few-shot prompting | 5 | 21 |
| 4.3 | Structured output via tools/schemas | 18 | 34 |
| 4.4 | Validation/retry/feedback loops | 2 | 18 |
| 4.5 | Batch processing strategies | 1 | 17 |
| 4.6 | Multi-instance / multi-pass review | 6 | 22 |
| 5.1 | Long-conversation context management | 6 | 22 |
| 5.2 | Escalation & ambiguity resolution | **0** | 16 |
| 5.3 | Error propagation across agents | **0** | 16 |
| 5.4 | Context in large-codebase exploration | **0** | 16 |
| 5.5 | Human review & confidence calibration | 2 | 18 |
| 5.6 | Provenance & multi-source uncertainty | **0** | 16 |

88 authored questions classified "other": topics outside the 30-lesson list
but inside the broader domain descriptions — mostly Claude Code
settings/permissions/hooks precedence (40, D3), prompt caching / rate limits
/ Batch API (37, D5), and extended-thinking/sampling mechanics (8, D4).
These remain useful; the official domain descriptions explicitly mention
settings, hooks, permissions, and caching even though the lesson list
decomposes differently.

## Findings

1. No subdomain is uncovered — every one of the 30 has at least 16 questions.
2. Six subdomains ride on imported questions alone (authored = 0):
   **2.5, 3.5, 5.2, 5.3, 5.4, 5.6** — Domain 5 is the weak spot (4 of 6).
3. Six more are thin (authored ≤ 3): 1.6, 1.7, 3.2, 3.3, 3.4, 4.4, 4.5.
4. Authoring skewed toward 1.4 (49 total) and 2.4 (44) — no action needed.

## Recommendation

Author a targeted "gap set": ~6 questions each for the six zero-authored
subdomains (≈36 questions), optionally +3 each for the seven thin ones
(≈21). No broad expansion needed.
