# Analysis: E2E Test Suite Plan for AIBoyz Swarm Upgrade

## Overview
Based on `ORIGINAL_REQUEST.md` and `SCOPE.md`, the goal is to define an opaque-box test strategy for the 6 architectural system upgrades. The tests are structured into 4 Tiers and employ Category-Partition (CP), Boundary Value Analysis (BVA), and Pairwise testing methodologies.

---

## Component 1: Web Scraping Configuration (`mcp_config.json`)
**Testing Approach:** Opaque-box verification of scraper execution and output, without unit-testing the internal scraper code.
- **Tier 1 (Smoke):** Verify `mcp_config.json` exists, is valid JSON, and correctly registers the chosen tool (SearxNG or Chrome MCP).
- **Tier 2 (Integration - CP):** Execute a programmatic test script against categorized DOM targets:
  1. Static HTML page.
  2. SPA/Dynamic JavaScript-rendered page.
  3. Rich media page (checking extraction of `<img>` and `<video>` attributes).
- **Tier 3 (E2E Workflow):** Trigger the subagent to perform a web search -> scrape a resulting URL -> generate a markdown summary. Verify the summary contains content from the scraped DOM.
- **Tier 4 (Edge/Resiliency - BVA):** Test boundary network conditions:
  1. Target returning 0 bytes or immediate connection drop.
  2. Extremely large DOM (>10MB).
  3. Artificial timeout (>30s delay).

## Component 2: Design System Integration (`design.json`)
**Testing Approach:** Verification of configuration parsing and application of visual tokens.
- **Tier 1 (Smoke):** Verify `design.json` exists in project root and parses as valid JSON matching the expected StitchMCP schema.
- **Tier 2 (Integration - CP):** Test the retrieval/application of partitioned token groups:
  1. Color tokens (Primary, Secondary, Background).
  2. Typography scale tokens.
  3. Spacing/Padding tokens.
- **Tier 3 (E2E Workflow):** Request UI component generation from the Design subagent. Verify the opaque output (e.g., raw React code) explicitly contains the exact hex codes and spacing values mapped in `design.json`.
- **Tier 4 (Edge/Resiliency - Negative):** Pass an empty or severely malformed `design.json`. Verify the system defaults safely to standard values or throws a clear, handled schema error.

## Component 3: Worktree Parallelism (`worktree_workflow.md`)
**Testing Approach:** File-system level verification of concurrent execution isolation.
- **Tier 1 (Smoke):** Verify the `worktree_workflow.md` file exists and outlines valid git worktree commands.
- **Tier 2 (Integration - CP):** Test the core partitioned operations: Worktree Creation, Worktree Switch, and Worktree Teardown via script.
- **Tier 3 (E2E Workflow):** Simulate a parallel run:
  1. Assign task A to Worktree 1.
  2. Assign task B to Worktree 2 concurrently.
  3. Verify strict isolation (no cross-contamination of uncommitted files).
- **Tier 4 (Edge/Resiliency - Pairwise):** Test pairwise merge states when integrating parallel work:
  - Non-overlapping file edits (should auto-merge).
  - Overlapping line edits (should trigger standard conflict resolution without corrupting the state).

## Component 4: Prompt Caching
**Testing Approach:** Observability of cache-hit metrics and latency heuristics.
- **Tier 1 (Smoke):** Inspect the initialization logs/config to ensure Anthropic caching headers/flags are enabled.
- **Tier 2 (Integration - CP):** Send two identically structured, large prompt requests sequentially. Assert that the second request returns token metadata indicating a cache hit.
- **Tier 3 (E2E Workflow):** Run a standard manifesto generation workflow twice. Measure total execution time and token usage, verifying a statistically significant latency drop and cache usage confirmation on the second run.
- **Tier 4 (Edge/Resiliency - BVA):** 
  - Test exactly at the minimum token boundary required to trigger caching (e.g., 1024 tokens).
  - Test with dynamically inserted noise (busting the cache) to ensure fallback behavior is correct.

## Component 5: Meta-Optimization (`AGENTS.md` & Skill Updates)
**Testing Approach:** Simulating failures to trigger the "Continuous Improver" framework.
- **Tier 1 (Smoke):** Verify `AGENTS.md` and `global-intelligence/SKILL.md` contain text explicitly detailing the "Continuous Improver" logging rules.
- **Tier 2 (Integration - CP):** Send a synthetic error payload to the continuous improver partitioned by type:
  1. Syntax Error.
  2. Logic/Assertion Error.
  3. Tool Timeout.
  Verify it produces a valid post-mortem analysis for each.
- **Tier 3 (E2E Workflow):** Intentionally fail a task script. Verify the Improver agent wakes up, appends the failure to a log, and updates a global rule to prevent the specific failure mechanism.
- **Tier 4 (Edge/Resiliency - BVA):** Feed the Improver a massive, truncated stack trace exceeding context limits. Verify it degrades gracefully by identifying the core error without context collapse.

## Component 6: Marketing Funnel Research Output
**Testing Approach:** Verification of data matrices and citation validity.
- **Tier 1 (Smoke):** Verify the target markdown file (the B2C Marketing Funnel report) has been generated.
- **Tier 2 (Integration - Pairwise):** Parse the markdown and assert the presence of data for all Pairwise combinations:
  - *Funnel Stage:* [Awareness, Consideration, Action]
  - *Email Format:* [HTML, Plain Text]
  *(i.e., Expecting data points comparing HTML vs Plain Text explicitly at the Awareness stage, Consideration stage, etc.)*
- **Tier 3 (E2E Workflow):** Extract all hyperlinks/citations from the report. Assert that they are valid URLs (status 200) and represent definitive sources, rather than hallucinated links.
- **Tier 4 (Edge/Resiliency - Negative):** Verify the report contains a "Gaps/Limitations" section indicating where exact conversion data was unavailable, proving the agent correctly refused to fabricate data.
