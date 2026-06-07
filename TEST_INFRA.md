# Test Infrastructure Plan

## 1. Test Philosophy
- **Opaque-Box Testing**: Testing will treat the system as a black box, verifying inputs against expected outputs without directly inspecting or mocking the internal implementation details.
- **Requirement-Driven**: All test cases are derived directly from the 6 architectural upgrade features documented in the original request. The test strategy is designed to trace back to these specific system enhancements.

## 2. Feature Inventory
The test suite maps directly to the 6 core features from the request:
1. Web Scraping Configuration (`mcp_config.json`)
2. Design System Integration (`design.json`)
3. Worktree Parallelism (`worktree_workflow.md`)
4. Prompt Caching
5. Meta-Optimization (`AGENTS.md` & Skill Updates)
6. Marketing Funnel Research Output

## 3. Test Architecture
- **Test Runner**: `pytest`
- **Format**: Python test scripts utilizing `pytest` markers (e.g., `@pytest.mark.tier1`), parameterized inputs for pairwise configurations, and synthetic fixtures.
- **Directory Layout**:
  ```text
  tests/
  ├── e2e/
  │   ├── test_feature_1_scraping.py
  │   ├── test_feature_2_design_system.py
  │   ├── test_feature_3_worktree.py
  │   ├── test_feature_4_caching.py
  │   ├── test_feature_5_meta_optimization.py
  │   └── test_feature_6_marketing_research.py
  ├── conftest.py
  └── pytest.ini
  ```

## 4. Real-World Application Scenarios (Tier 4)
We apply boundary value analysis (BVA) and edge-case negative testing. Minimum of 5 scenarios per feature:

**Feature 1: Web Scraping Configuration**
1. Target returning 0 bytes or abrupt connection drop.
2. Extremely large DOM (>10MB).
3. Artificial network timeout (>30s delay).
4. Missing `<head>` or completely unparseable HTML structure.
5. Infinite redirect loops.

**Feature 2: Design System Integration**
1. Empty `design.json` payload.
2. Severely malformed JSON formatting.
3. Missing mandatory tokens (e.g., missing color palette).
4. Unexpected value types (e.g., boolean instead of string).
5. Extreme dimension values (e.g., `9999px` padding).

**Feature 3: Worktree Parallelism**
1. Overlapping line edits triggering merge conflict (Pairwise).
2. Leftover Git lock file from a crashed process.
3. Attempting checkout on a missing branch.
4. Exhaustion of disk space during worktree clone.
5. Concurrent deletion while active read operations occur.

**Feature 4: Prompt Caching**
1. Exactly at the minimum token boundary (e.g., 1024 tokens).
2. Dynamically inserted noise busting the cache.
3. Cache eviction mid-way through long-running workflow.
4. Large prompt exactly 1 token below the boundary.
5. Concurrent requests causing cache race condition.

**Feature 5: Meta-Optimization**
1. Truncated stack traces heavily exceeding context limits.
2. Improver agent recursion (failure during the post-mortem itself).
3. Corrupted read of the global intelligence state.
4. Non-deterministic, flaky error payloads.
5. Read-only permissions preventing the improver update.

**Feature 6: Marketing Funnel Research Output**
1. Exact conversion data unavailable (verifying gaps/limitations section).
2. Broken hyperlinks and hallucinated citations.
3. Incomplete funnel structure inputs.
4. Non-standard email formats outside the tested combinations.
5. Direct contradictions from multiple authoritative sources.

## 5. Coverage Thresholds
We strictly adhere to minimum test thresholds to achieve ~66+ test cases across the 6 features:

- **Tier 1 (Smoke) & Tier 2 (Integration)**: ≥5 test cases per feature.
  - *Feature 1*: Config exists, valid JSON, static DOM extract, dynamic SPA extract, rich media extract.
  - *Feature 2*: File exists, valid schema, color tokens, typography tokens, spacing tokens.
  - *Feature 3*: Workflow exists, valid commands, create worktree, switch worktree, teardown worktree.
  - *Feature 4*: Headers enabled, flag presence, cache hit validation, metrics format valid, consecutive exact match.
  - *Feature 5*: Rules exist, logging schema valid, syntax error parsed, logic error parsed, timeout error parsed.
  - *Feature 6*: Report exists, markdown valid, Awareness data extracted, Consideration data extracted, Action data extracted.
  *(Subtotal: 30 test cases)*

- **Tier 3 (E2E Workflow)**: Pairwise and cohesive user journeys.
  - *Feature 1*: Search -> Scrape -> Summary
  - *Feature 2*: Generate UI React component matching tokens exactly
  - *Feature 3*: Concurrent execution of Task A & Task B without cross-contamination
  - *Feature 4*: Workflow executed twice, asserting valid latency drop
  - *Feature 5*: Simulate failure -> Improver wakes up -> Updates global rule
  - *Feature 6*: Extract and test all links; Pairwise validation across `[Awareness, Consideration, Action]` x `[HTML, Plain Text]`
  *(Subtotal: 6 end-to-end journey tests + internal pairwise parameterizations)*

- **Tier 4 (Edge/Resiliency)**: ≥5 real-world scenarios per feature.
  *(Subtotal: 30 test cases, as detailed in Section 4)*

**Total Expected Coverage**: 66+ tests.
