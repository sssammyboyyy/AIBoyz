# Session Protocol — `/orient` Detailed Procedure

## Purpose
Every session begins with `/orient` to ensure you have full context before acting. No task starts without orientation.

## Mandatory 6-Step Read-First

### Step 1: Load Core Documents
Read these files in order. They define the project's boundaries, strategy, and available tools.

| # | File | Why |
|---|------|-----|
| 1 | `sam-os/AGENTS.md` | Identity, rules, command menu, weekly rhythm |
| 2 | `context/Community-OS.md` | Vantage community strategy, offer, audience |
| 3 | `context/Sam-One-Pager.md` | Sam's role, compensation, personal boundaries |
| 4 | `context/tool-manifest.md` | Every integration, key, and tool in use |
| 5 | `context/skill-inventory-vantage.md` | Vantage-curated skills (subset of full inventory) |
| 6 | `context/session-protocol.md` | (this file) — the /orient checklist |

### Step 2: Run Situation Assessment
Answer these questions based on what you loaded:

- **Current week #** of the 90-day sprint? (Week 1-2 = conversations, Week 3-4 = offer design, etc.)
- **What's built vs pending** — what infra exists, what needs creating
- **Member count** — how many paying members right now? (target: 50 in 90 days)
- **Conversations logged** — how many of the 25 required conversations are done?
- **Blockers** — anything blocking progress right now?
- **Deliverables this week** — what's due by Friday?

### Step 3: State the North Star
Explicitly state: *"50 paying members at R399/mo within 90 days. Currently at X members, Y conversations logged, week Z of 13."*

### Step 4: List Relevant Agents
From the 10 available agents, list which are relevant to today's context. Example:
> "Today is Tuesday — focus is writing 2 playbooks → content-creator agent relevant. No build tasks → frontend-dev on standby."

### Step 5: Confirm Memory Surface
Check each layer:
- **Neo4j** — is Graphify connected? Run `/graph` → quick query to verify.
- **brain_sync** — check session logs from last session.
- **NotebookLM** — is the Sam-OS Mentor notebook accessible and up to date?

### Step 6: Stand By
End with:
> "Fully oriented. North star: 50 members at R399/mo. Currently week X of 13, Y members, Z conversations. Standing by for next command: `/build`, `/content`, `/community`, `/research`, `/north-star`, `/hitl`, `/ship`, `/state`, or `/graph`."

## Orientation Exit Criteria
Do NOT consider orientation complete until:
- [ ] All 6 core documents loaded
- [ ] Situation assessment reported (week, members, conversations, blockers)
- [ ] North star stated
- [ ] Relevant agents identified
- [ ] Memory surface confirmed
- [ ] Standing by for next command

## If Orientation Fails
If any document is missing, blocked, or outdated:
- Report exactly what's missing
- Propose a fix (e.g., "Community-OS.md doesn't exist yet. Should I create it from the Session 2 notes?")
- Do NOT fabricate the missing content — ask first

## Post-Orient Command Reference
Available once oriented:

| Command | When to Use |
|---------|-------------|
| `/build` | Creating infra, landing pages, payment systems |
| `/content` | Writing playbooks, prompts, live session plans |
| `/community` | Managing members, onboarding, engagement |
| `/research` | Deep research on AI tools, competitor analysis |
| `/north-star` | Any time you lose sight of the 50-in-90 target |
| `/hitl` | Decisions needing Sam's approval (pricing, partnerships) |
| `/ship` | Packaging a deliverable for delivery (end of week) |
| `/state` | Full project state dump |
| `/graph` | Query or update the knowledge graph |
| `/graph-save` | Save session context to graph |
