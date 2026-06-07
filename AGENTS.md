# AGENTS.md

## Continuous Improver

- **Purpose**: Automatically logs post‑mortem failures of any sub‑agent, analyzes root causes, and rewrites global rules (e.g., in `global-intelligence` skill) to prevent repeat failures.
- **Scope**: All agents operating within the Antigravity ecosystem, including research, design, and orchestration sub‑agents.
- **Key Behaviors**:
  1. **Failure Capture** – Hooks into sub‑agent status messages, persists a concise failure report.
  2. **Root‑Cause Analysis** – Runs a deterministic reasoning chain (via `sequentialthinking` MCP) to identify the underlying rule violation.
  3. **Rule Update** – Generates a diff for the `global‑intelligence` skill (or other designated rule files) and commits it automatically.
  4. **Feedback Loop** – Emits a summary to `PROJECT_STATE.md` and notifies the orchestrator for optional human review.
- **Configuration**: Controlled via `continuous-improver-config.yaml` placed at the repo root (not created here). Default mode is *development* – updates are auto‑committed; in *benchmark* mode a human sign‑off is required.

// ✅ verified
