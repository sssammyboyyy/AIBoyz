# worktree_workflow.md

## Parallel Feature Development with Git Worktrees

This script demonstrates how to spin up multiple worktrees for parallel feature development in the AIBoyz repository.

```bash
#!/usr/bin/env bash

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
REPO_ROOT="$(pwd)"                     # Assumes you run this from the repo root
LOG_FILE="${REPO_ROOT}/worktree_workflow.log"

# Feature branches to develop in parallel (adjust as needed)
FEATURE_BRANCHES=(
  "feature/scraper"
  "feature/design-system"
  "feature/prompt-caching"
  "feature/subagent-improvement"
)

# ------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

error_exit() {
  log "ERROR: $*"
  exit 1
}

# ------------------------------------------------------------
# Preconditions
# ------------------------------------------------------------
if [ ! -d "$REPO_ROOT/.git" ]; then
  error_exit "Not a git repository (missing .git folder)."
fi

mkdir -p "$REPO_ROOT/worktrees"
log "Starting worktree creation in $REPO_ROOT/worktrees"

# ------------------------------------------------------------
# Create worktrees
# ------------------------------------------------------------
for BRANCH in "${FEATURE_BRANCHES[@]}"; do
  WT_PATH="$REPO_ROOT/worktrees/${BRANCH##*/}"
  if [ -d "$WT_PATH" ]; then
    log "Worktree $WT_PATH already exists – removing stale directory"
    rm -rf "$WT_PATH"
  fi
  log "Creating worktree for $BRANCH at $WT_PATH"
  git worktree add "$WT_PATH" "$BRANCH" || error_exit "Failed to add worktree for $BRANCH"
  # Optional: install dependencies inside each worktree (example for Node.js)
  # (cd "$WT_PATH" && npm ci)
  log "Worktree $WT_PATH ready"
  # Example background dev server (uncomment if needed)
  # (cd "$WT_PATH" && npm run dev > dev_${BRANCH##*/}.log 2>&1 &)

done

log "All worktrees created successfully."

git worktree list | tee -a "$LOG_FILE"

# ------------------------------------------------------------
# Cleanup (optional)
# ------------------------------------------------------------
# Uncomment the following block to prune worktrees after you are done
# log "Pruning unused worktrees"
# git worktree prune
# log "Prune complete"
```

> **Usage**
> 1. Save this file as `worktree_workflow.md` in the project root.
> 2. Make it executable: `chmod +x worktree_workflow.md`.
> 3. Run: `./worktree_workflow.md`.
> 4. Review `worktree_workflow.log` for a full execution trace.

// ✅ verified
