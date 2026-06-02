const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  let envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../../.env.local.txt');
  }
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
      process.env[key.toUpperCase()] = value;
    }
  });
}

function runGit(cmd) {
  try {
    const output = execSync(cmd, { cwd: path.resolve(__dirname, '../../'), encoding: 'utf8' });
    console.log(output.trim());
    return true;
  } catch (err) {
    console.error(`Git command failed: ${cmd}\n${err.message}`);
    return false;
  }
}

async function main() {
  loadEnv();
  console.log("🛡️ Initiating Autonomous GitHub Sync...");

  const pat = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;
  if (!pat) {
    console.error("❌ GITHUB_PAT not found in .env.local. Aborting sync.");
    process.exit(1);
  }

  // Check if repo is initialized
  const gitDir = path.resolve(__dirname, '../../.git');
  if (!fs.existsSync(gitDir)) {
    console.log("   Initializing local Git repository...");
    runGit('git init');
  }

  // We add scripts, config, and docs
  console.log("   Staging files...");
  runGit('git add scripts/ config/ docs/ reports/');

  // Check if there's anything to commit
  try {
    execSync('git diff --staged --quiet', { cwd: path.resolve(__dirname, '../../') });
    console.log("   🤷‍♂️ No changes to commit. Exiting.");
    return;
  } catch (e) {
    // If command fails (returns non-zero), there are changes to commit
  }

  console.log("   Committing changes...");
  const dateStr = new Date().toISOString().split('T')[0];
  runGit(`git commit -m "Auto-Update from Brain Reflection Node [${dateStr}]"`);

  // We are not configuring the remote automatically since we don't know the exact repo name yet,
  // but if remote exists, we push
  try {
    const remotes = execSync('git remote', { cwd: path.resolve(__dirname, '../../'), encoding: 'utf8' }).trim();
    if (remotes.includes('origin')) {
      console.log("   Pushing to origin...");
      runGit('git push origin HEAD');
      console.log("   ✅ Successfully pushed to GitHub!");
    } else {
      console.log("   ⚠️ Origin remote not configured. Skipping push.");
      console.log("   (To push, run: git remote add origin https://<PAT>@github.com/username/repo.git)");
    }
  } catch (err) {
    console.error("   ❌ Failed to push to remote.");
  }
}

main();
