# AGENTS.md — Global Agentic Engineering Memory

## Workflow: Plan → Code → Validate

This project follows Kun Chen's 3-phase agentic loop:
1. **Plan** — Use lavish-axi for HTML visual planning before writing code
2. **Code** — Delegate 100% to agents; never hand-write implementation
3. **Validate** — Gate all pushes through no-mistakes before PR

## Toolchain (global)

| Tool | Purpose | How to invoke |
|------|---------|--------------|
| `treehouse` | Isolated git worktrees | `treehouse get` (releases: `treehouse return`) |
| `no-mistakes` | Pre-push validation gate | `git push no-mistakes <branch>` or `/no-mistakes` |
| `gnhf` | Overnight autonomous loops | `gnhf "<objective>" --worktree` |
| `lavish-axi` | HTML artifact editor | `npx -y lavish-axi <file>` |
| `nvim` | Text editor | `nvim <file>` |
| `wezterm` | Terminal (with multiplexing) | `Ctrl+Shift+D` split, `Ctrl+Shift+E` vsplit |

## Directives

- Never use mdash
- Keep response output minimal — no preamble, no postamble, no commentary
- Before coding, always plan using lavish-axi HTML artifacts
- Record mistakes into this file under "Learnings" so agents grow smarter
- Use sub-agents for exploratory/deep research to protect context window
- All code changes must pass through no-mistakes gate

## Session Context

- **Last session:** 2026-06-21 — installed full Kun Chen toolchain (WezTerm, Neovim, treehouse, no-mistakes, gnhf, Go, lavish-axi skill, no-mistakes skill)
- **Full context:** `SESSION_CONTEXT.md`
- **NotebookLM synth:** notebook `a8d3afc6-5431-4735-ab1f-e06620a84d25`, study guide at `agentic-workflow-study-guide.md`
- **Voice input not installed (Windows):** Use GigaWhisper — https://github.com/karvrak/gigaWhisper

## Learnings

<!-- Record agent mistakes and corrections here so the crew improves over time -->

## Continuous Improver

- Automatically logs post-mortem failures of any sub-agent, analyzes root causes, and rewrites rules to prevent repeat failures.
- Key Behaviors: Failure Capture → Root-Cause Analysis → Rule Update → Feedback Loop
- Default mode: development (auto-commit). Benchmark mode requires human sign-off.

// ✅ verified
