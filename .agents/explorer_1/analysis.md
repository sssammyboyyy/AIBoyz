# E2E Test Suite Plan: Architectural System Upgrades

## Overview
This document outlines the opaque-box test design strategy for the 6 architectural system upgrades specified in the initial request. The tests follow a 4-Tier track system (Smoke, Integration, System/E2E, Edge) and utilize Category-Partition, Boundary Value Analysis (BVA), and Pairwise testing methodologies.

---

## 1. Web Scraping Configuration (`mcp_config.json`)

**Goal:** Verify the chosen headless scraper (Chrome MCP or SearxNG) is fully integrated, operational, and properly proxied via `toolhive-mcp-optimizer`.

* **Tier 1: Smoke Tests (Category-Partition)**
  * **Test 1.1:** Verify `mcp_config.json` exists and strictly contains `toolhive-mcp-optimizer` pointing to port `61514`.
  * **Test 1.2:** Validate the configuration schema against expected proxy definitions.
* **Tier 2: Integration Tests**
  * **Test 2.1:** Execute a programmatic programmatic scrape (`test_scrape.py`) on a static, plain-text DOM structure.
* **Tier 3: System / E2E Scenarios**
  * **Test 3.1:** Execute a programmatic scrape on a dynamic JS-heavy page requiring media/DOM rendering. Ensure the underlying MCP (Chrome or SearxNG) properly resolves elements before extraction.
* **Tier 4: Edge Cases / Resilience (BVA & Negative)**
  * **Test 4.1 (BVA):** Test scraping payloads with exceedingly large DOMs (>10MB).
  * **Test 4.2 (Negative):** Disconnect the target or provide invalid CSS selectors; verify the system returns a graceful error instead of crashing.
  * **Test 4.3 (Negative):** Verify the `transport_type` error pipeline. Ensure proxy polling auto-recovers if a misconfigured tool is introduced.

---

## 2. Design System Integration (`design.json`)

**Goal:** Enforce visual tokens and constraints through StitchMCP.

* **Tier 1: Smoke Tests (Category-Partition)**
  * **Test 2.1:** Verify `design.json` exists in the project root.
  * **Test 2.2:** Verify JSON parses correctly and contains core categories (Typography, Colors, Spacing).
* **Tier 2: Integration Tests**
  * **Test 2.3:** Parse the `design.json` directly into the StitchMCP `apply_design_system` tool and confirm successful validation.
* **Tier 3: System / E2E Scenarios**
  * **Test 3.1:** Execute a full UI/UX generation workflow. Validate the generated assets/code adhere strictly to the variables defined in `design.json`.
* **Tier 4: Edge Cases / Resilience (Pairwise & BVA)**
  * **Test 4.1 (Pairwise):** Pair an incomplete `design.json` (missing Spacing, has Colors) with the UI generation workflow to check fallback behavior.
  * **Test 4.2 (BVA):** Use extreme boundary values in the schema (e.g., `font-size: 0px` or `margin: 9999px`) to verify constraint limits or warning triggers.

---

## 3. Worktree Parallelism (`worktree_workflow.md`)

**Goal:** Validate Multi-Agent Git Worktree parallelism for parallel feature development.

* **Tier 1: Smoke Tests**
  * **Test 3.1:** Verify `worktree_workflow.md` script/documentation exists and outlines the initialization syntax.
* **Tier 2: Integration Tests (Category-Partition)**
  * **Test 3.2:** Execute the workflow to initialize two separate, active worktrees tied to different branches.
* **Tier 3: System / E2E Scenarios (Pairwise)**
  * **Test 3.3:** Have two simulated agents perform concurrent `git commit` and `git push` operations on their respective worktrees to ensure isolated execution contexts and no cross-contamination.
* **Tier 4: Edge Cases / Resilience**
  * **Test 4.1:** Lock contention: Attempt to run parallel operations modifying the same remote state. Verify Git lock file resolution and push rejection handles properly.
  * **Test 4.2:** Attempt to delete a worktree directory while unstaged changes exist (expecting a block/warning).

---

## 4. Prompt Caching

**Goal:** Prove Anthropic Prompt Caching functions correctly for lengthy strategy manifestos.

* **Tier 1: Smoke Tests (BVA)**
  * **Test 4.1:** Validate the strategy manifesto prompt payload is strictly `>1024` tokens (Anthropic's caching boundary).
* **Tier 2: Integration Tests**
  * **Test 4.2:** Issue the manifesto generation request and inspect API metadata for `cache_creation_input_tokens`.
* **Tier 3: System / E2E Scenarios**
  * **Test 3.1:** Issue the identical manifesto generation request consecutively. Verify the second response metadata shows `cache_read_input_tokens` and reduced latency.
* **Tier 4: Edge Cases / Resilience (BVA & Pairwise)**
  * **Test 4.1 (BVA):** Submit a prompt with exactly 1023 tokens to verify cache miss, followed by 1024 tokens to verify cache hit.
  * **Test 4.2:** Introduce a 1-character variation in the prompt prefix to verify complete cache invalidation and re-creation.

---

## 5. Meta-Optimization (Continuous Improver)

**Goal:** Validate the Continuous Improver's ability to rewrite global rules based on post-mortem failures.

* **Tier 1: Smoke Tests**
  * **Test 5.1:** Verify the Continuous Improver framework instructions exist in `AGENTS.md` and `/global-intelligence` skills.
* **Tier 2: Integration Tests (Category-Partition)**
  * **Test 5.2:** Inject dummy failure logs covering three distinct categories (Syntax, Timeout, Logic). Verify the framework parses each error type correctly.
* **Tier 3: System / E2E Scenarios**
  * **Test 3.1:** E2E Feedback Loop:
    1. Simulate subagent task failure.
    2. Subagent logs error.
    3. Continuous Improver analyzes log and appends a concrete rule to `AGENTS.md`.
    4. Next subagent execution successfully reads the new rule.
* **Tier 4: Edge Cases / Resilience**
  * **Test 4.1:** Provide a massively obfuscated/noisy stack trace to the Continuous Improver to test its extraction accuracy.
  * **Test 4.2:** Test concurrent failures triggering simultaneous rewrite requests to `AGENTS.md` (race condition checking).

---

## 6. Marketing Funnel Research Output

**Goal:** Verify research data comparing HTML vs. Plain Text email conversions across B2C funnel stages.

* **Tier 1: Smoke Tests**
  * **Test 6.1:** Verify the output markdown report exists and follows the required formatting structure.
* **Tier 2: Integration Tests (Category-Partition)**
  * **Test 6.2:** Verify data covers all structural partitions: Formats (HTML, Plain Text) multiplied by Funnel Stages (Awareness, Consideration, Action).
* **Tier 3: System / E2E Scenarios**
  * **Test 3.1:** Verify the presence of valid, formatted citations that back the statistical claims. 
* **Tier 4: Edge Cases / Resilience**
  * **Test 4.1:** Missing Data Resilience: If empirical data for a specific niche slice (e.g., B2C Plain Text Consideration Stage) cannot be found, verify the report highlights the gap explicitly rather than hallucinating generic metrics.
