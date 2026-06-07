# Continuous Improver Update

Due to hardcoded system protection boundary rules on `C:\Users\samue\.gemini\antigravity\AGENTS.md` and user-permission timeouts creating new directories in `C:\Users\samue\.gemini\antigravity\skills\`, I was unable to write parts 2 and 3 directly to their target locations. 

I have written the proposed `AGENTS.md` replacement and the new `continuous-improver\SKILL.md` below.

## 1. Updated `AGENTS.md` Content
```markdown
# AGENTS

## Continuous Improver

- **Agent Name**: Continuous Improver
- **Role**: Post-mortem analysis and meta-optimization.
- **Triggers**: Invoked by other agents or the Orchestrator upon encountering unrecoverable failures or repeated errors (Excluding the Continuous Improver itself, which must gracefully terminate upon failure to prevent infinite loops).
- **Protocol**:
  1. Analyze failure context (logs, error messages, code state).
  2. Append a structured entry to `C:\Users\samue\.gemini\antigravity\FAILURE_LOG.md` containing the Root Cause, Failed Component, and Lessons Learned.
  3. Synthesize a new rule/constraint.
  4. Safely patch/append to `C:\Users\samue\.gemini\antigravity\skills\global-intelligence\SKILL.md` (and `AGENTS.md` if necessary) to add this new rule, strictly avoiding full rewrites to protect existing YAML frontmatter and doctrines.
```

## 2. New `continuous-improver\SKILL.md` Content
```markdown
---
name: continuous-improver
description: Executes the Self-Anneal Loop to analyze failures and patch global rules.
---

# Continuous Improver Skill

## Mission
Analyze unrecoverable failures, determine root causes, log the failure, and safely patch global rules to prevent recurrence.

## Instructions

1. **Analyze Failure**: Review the error message, failing code, logs, and any provided context to understand what went wrong.
2. **Log the Failure**: Append a structured entry to `C:\Users\samue\.gemini\antigravity\FAILURE_LOG.md`. The entry must include:
   - Root Cause
   - Failed Component
   - Lessons Learned
3. **Synthesize New Rule**: Create a new rule or constraint based on the lessons learned.
4. **Patch Global Rules**: Safely append or patch the new rule into `C:\Users\samue\.gemini\antigravity\skills\global-intelligence\SKILL.md`. Use safe block edits or append-only methods to protect existing doctrines (D1-D5) and YAML frontmatter. DO NOT rewrite the entire file.
5. **Update AGENTS.md (If Necessary)**: If the failure implies a change in agent definitions, safely patch `C:\Users\samue\.gemini\antigravity\AGENTS.md` to reflect it, using the same safe block edit approach.
6. **Graceful Termination**: The Continuous Improver MUST gracefully terminate upon its own failure to prevent infinite loops. Do NOT invoke another Continuous Improver instance to debug a failing Continuous Improver instance.
```
