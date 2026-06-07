# Handoff Report: Continuous Improver Framework

**Summary:** The optimal location for `AGENTS.md` is the global `antigravity` directory. The framework requires a new Doctrine (D6) in the global intelligence skill and a detailed agent definition in `AGENTS.md` to manage `FAILURE_LOG.md` updates and rule rewrites.

## 1. Observation
- **Scope Requirement:** `C:\Users\samue\.gemini\antigravity\worktrees\AIBoyz\swarm-architectural-upgrade-integration\.agents\sub_orch_m3\SCOPE.md` requires establishing a Continuous Improver framework to perpetually log post-mortem failures and rewrite global rules by outlining changes to `AGENTS.md` and the `global-intelligence` skill.
- **Architectural Constraints:** `C:\Users\samue\.gemini\antigravity\ARCHITECTURE_DECISION_LOG.md` (Decision 2) mandates: "NO SPLIT-BRAIN STATE. State persistence lives EXCLUSIVELY in the global `C:\Users\samue\.gemini\antigravity` directory."
- **Current State:** `C:\Users\samue\.gemini\antigravity\FAILURE_LOG.md` currently exists but is empty. The `global-intelligence` skill outlines Doctrines D1-D5.

## 2. Logic Chain
1. Based on the "NO SPLIT-BRAIN STATE" rule and the fact that `global-intelligence` affects all workspaces, `AGENTS.md` must be located globally at `C:\Users\samue\.gemini\antigravity\AGENTS.md` rather than the project root. This ensures the Continuous Improver is universally available and rules are globally enforced.
2. The `global-intelligence` skill must be updated to introduce a new Doctrine (e.g., D6: Continuous Improvement Protocol). This doctrine will formalize the post-mortem process, instructing all agents to invoke the Continuous Improver upon an unrecoverable workflow or test failure.
3. The `AGENTS.md` file must establish the Continuous Improver's specific responsibilities, which are: taking error context as input, logging a structured root-cause analysis to `FAILURE_LOG.md`, and directly mutating `global-intelligence/SKILL.md` and `AGENTS.md` to encode new constraints to prevent recurrence.

## 3. Caveats
- No code implementation was performed (as constrained by read-only rules). 
- The implementer will need to define the exact structured markdown schema (e.g., JSON or specific headers) used in `FAILURE_LOG.md` when they write the agent prompt.

## 4. Conclusion
To establish the Continuous Improver framework, perform the following two changes:

**1. Create `C:\Users\samue\.gemini\antigravity\AGENTS.md` with this content:**
- **Agent Name**: Continuous Improver
- **Role**: Post-mortem analysis and meta-optimization.
- **Triggers**: Invoked by other agents or the Orchestrator upon encountering unrecoverable failures or repeated errors.
- **Protocol**:
  1. Analyze failure context (logs, error messages, code state).
  2. Append a structured entry to `C:\Users\samue\.gemini\antigravity\FAILURE_LOG.md` containing the Root Cause, Failed Component, and Lessons Learned.
  3. Synthesize a new rule/constraint.
  4. Rewrite `C:\Users\samue\.gemini\config\skills\global-intelligence\SKILL.md` (and `AGENTS.md` if necessary) to add this new rule, ensuring all future agents are protected against the failure.

**2. Update `C:\Users\samue\.gemini\config\skills\global-intelligence\SKILL.md`:**
- Add **D6: CONTINUOUS IMPROVEMENT PROTOCOL** under `▣ 2. ARCHITECTURAL PERSISTENCE`.
- **Content**: "Upon encountering unrecoverable workflow or testing failures, agents MUST invoke the Continuous Improver subagent. The Continuous Improver is authorized to write to `FAILURE_LOG.md` and perpetually update this `global-intelligence` skill or `AGENTS.md` to rewrite global rules, adding defensive constraints that prevent the recurrence of identified failures."

## 5. Verification Method
- **Inspect Constraints:** Check `ARCHITECTURE_DECISION_LOG.md` to confirm the global path requirement.
- **Read Output Files:** Verify the implementer creates `C:\Users\samue\.gemini\antigravity\AGENTS.md` and modifies `global-intelligence/SKILL.md` exactly as outlined.
