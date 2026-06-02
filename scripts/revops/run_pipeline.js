const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnv() {
  let envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../../.env.local.txt');
  }
  if (!fs.existsSync(envPath)) {
    console.log(`⚠️ Warning: Neither .env.local nor .env.local.txt found.`);
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      process.env[key] = value;
      // Also expose as uppercase
      process.env[key.toUpperCase()] = value;
    }
  });
}

async function main() {
  loadEnv();

  const url = process.argv[2] || 'https://www.africanskyhotels.com/';
  const niche = process.argv[3] || 'luxury boutique hotels';
  const location = process.argv[4] || 'South Africa';

  // Extract clean URL name for the scrape file
  // E.g. https://www.africanskyhotels.com/ -> https_www.africanskyhotels.com_scrape.md
  let urlClean = url;
  if (urlClean.endsWith('/')) {
    urlClean = urlClean.slice(0, -1);
  }
  const cleanFilename = urlClean
    .replace('https://', 'https_')
    .replace('http://', 'http_')
    .replace(/\//g, '_') + '_scrape.md';

  const scrapePath = path.join(__dirname, '../../tmp', cleanFilename);

  console.log(`🚀 Starting audit pipeline for ${url} in niche "${niche}"...`);
  console.log(`📁 Scrape output target: ${scrapePath}`);

  // Step 1: Run crawl
  console.log('\n--- STEP 1: FIRECRAWL SCRAPE ---');
  try {
    execSync(`node "${path.join(__dirname, 'firecrawl_extract.js')}" --url "${url}" --output "${scrapePath}"`, {
      stdio: 'inherit',
      env: process.env
    });
  } catch (error) {
    console.error('❌ Step 1 failed:', error.message);
    process.exit(1);
  }

  // Step 2: Run analysis
  console.log('\n--- STEP 2: OPENROUTER ANALYSIS & SUPABASE COMMIT ---');
  let auditId = null;
  try {
    const output = execSync(`node "${path.join(__dirname, 'openrouter_analyze.js')}" --input "${scrapePath}" --niche "${niche}" --location "${location}"`, {
      env: process.env,
      encoding: 'utf8'
    });
    console.log(output);
    const resultMatch = output.match(/__PIPELINE_RESULT__:(.+)/);
    if (resultMatch && resultMatch[1]) {
      const parsed = JSON.parse(resultMatch[1]);
      auditId = parsed.id;
    }
  } catch (error) {
    console.error('❌ Step 2 failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    process.exit(1);
  }

  if (!auditId) {
    console.error('❌ Step 2 did not return an audit ID. Cannot proceed to Stage 4.');
    process.exit(1);
  }

  // Step 3: Run VLM generation
  console.log('\n--- STEP 3: VLM UI GENERATION (SKIPPED BY USER REQUEST) ---');
  // try {
  //   execSync(`node "${path.join(__dirname, 'vlm_generate_tsx.js')}" --audit-id "${auditId}" --niche "${niche}" --input "${scrapePath}"`, {
  //     stdio: 'inherit',
  //     env: process.env
  //   });
  // } catch (error) {
  //   console.error('❌ Step 3 failed:', error.message);
  //   process.exit(1);
  // }

  console.log('\n--- STEP 4: AUTO-ARCHIVER (CONTINUOUS LEARNING) ---');
  try {
    const taskPath = path.join(__dirname, '../../task.md');
    if (fs.existsSync(taskPath)) {
      execSync(`node "${path.join(__dirname, '../rag/auto_archive.js')}" "${taskPath}" --tags "proven_success"`, {
        stdio: 'inherit',
        env: process.env
      });
    } else {
      console.log('⚠️ task.md not found, skipping archive.');
    }
  } catch (error) {
    console.error('⚠️ Auto-Archiver failed (non-fatal):', error.message);
  }

  console.log('\n🎉 Pipeline execution complete!');
}

main();
