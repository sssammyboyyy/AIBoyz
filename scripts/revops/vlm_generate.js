// scripts/revops/vlm_generate.js
// Stage 4: UI Wireframe Generation
// Fetches audit data, distills it, runs the Semantic Mapper VLM, and persists to landing_payload.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getVlmSystemPrompt } = require('./vlm_system_prompt');

function getArgs() {
  const args = {};
  process.argv.slice(2).forEach((val, index, array) => {
    if (val.startsWith('--')) {
      const key = val.substring(2);
      const nextVal = array[index + 1];
      if (nextVal && !nextVal.startsWith('--')) {
        args[key] = nextVal;
      }
    }
  });
  return args;
}

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

function cleanJsonString(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }
  let inString = false;
  let result = '';
  let escape = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escape) { result += char; escape = false; continue; }
    if (char === '\\') { result += char; escape = true; continue; }
    if (char === '"') { inString = !inString; result += char; continue; }
    if (inString) {
      if (char === '\n') result += '\\n';
      else if (char === '\r') result += '\\r';
      else if (char === '\t') result += '\\t';
      else result += char;
    } else {
      result += char;
    }
  }
  return result;
}

const BANNED_FONTS = ['inter', 'roboto', 'arial', 'helvetica', 'times new roman', 'outfit', 'poppins', 'montserrat', 'open sans', 'lato', 'sans-serif', 'serif', 'monospace'];
const REQUIRED_COMPONENT_ORDER = [
  'HeroSection', 'PainMatrix', 'ExecutiveMetricBanner',
  'TrustVelocityGrid', 'FrictionlessConversionEngine', 'ExecutiveCloser'
];

function validate(payload) {
  const violations = [];
  const jsonStr = JSON.stringify(payload).toLowerCase();

  // RULE 1: Typography prohibition (using word boundary regex to avoid false positives)
  for (const font of BANNED_FONTS) {
    const fontRegex = new RegExp('\\b' + font + '\\b', 'i');
    if (fontRegex.test(jsonStr)) {
      violations.push(`❌ RULE 1 VIOLATION: Found banned font "${font}" in output`);
    }
  }

  // Component registry — must use "sections" array with "component_type" keys
  const sections = payload.sections;
  if (!Array.isArray(sections)) {
    violations.push('❌ REGISTRY VIOLATION: "sections" is not an array');
    return violations;
  }
  if (sections.length !== 6) {
    violations.push(`❌ REGISTRY VIOLATION: Expected exactly 6 sections, got ${sections.length}`);
  }
  for (let i = 0; i < Math.min(sections.length, REQUIRED_COMPONENT_ORDER.length); i++) {
    if (sections[i]?.component_type !== REQUIRED_COMPONENT_ORDER[i]) {
      violations.push(`❌ REGISTRY VIOLATION: Section ${i} should be "${REQUIRED_COMPONENT_ORDER[i]}", got "${sections[i]?.component_type}"`);
    }
    if (sections[i]?.render_priority !== i + 1) {
      violations.push(`❌ REGISTRY VIOLATION: Section ${i} missing correct render_priority ${i + 1}`);
    }
  }

  // Immutable COI contract
  const coiSection = sections.find(s => s.component_type === 'ExecutiveMetricBanner');
  if (coiSection?.props?.coi_raw_value !== undefined) {
    violations.push('❌ COI CONTRACT VIOLATION: VLM emitted "coi_raw_value" in ExecutiveMetricBanner');
  }

  return violations;
}

async function main() {
  loadEnv();
  const args = getArgs();
  const auditId = args['audit-id'];

  if (!auditId) {
    console.error('❌ Error: --audit-id is required');
    process.exit(1);
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openrouterKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[Stage 4] Fetching audit report ${auditId}...`);
  const { data: row, error: fetchError } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', auditId)
    .single();

  if (fetchError || !row) {
    console.error(`❌ Fetch failed: ${fetchError?.message}`);
    process.exit(1);
  }

  const auditData = row.audit_data;
  const companyName = row.company_name;
  const niche = args.niche || 'B2B/Hospitality';

  console.log(`[Stage 4] Generating UI Wireframe for ${companyName}...`);

  const systemPrompt = getVlmSystemPrompt({ companyName, niche });

  const userContent = `
COMPANY: ${companyName}
URL: ${row.target_url}
SCORE: ${row.score_out_of_100}/100
COI: R ${auditData.cost_of_inaction_zar} / month

AUDIT FINDINGS:
${auditData.technical_seo_table ? "TECHNICAL SEO: " + JSON.stringify(auditData.technical_seo_table) : ''}
${auditData.analytics_tracking_table ? "ANALYTICS: " + JSON.stringify(auditData.analytics_tracking_table) : ''}
${auditData.competitor_matrix ? "COMPETITORS: " + JSON.stringify(auditData.competitor_matrix) : ''}
${auditData.prioritized_action_plan ? "ACTION PLAN: " + JSON.stringify(auditData.prioritized_action_plan) : ''}
${auditData.marketable_differentiators ? "DIFFERENTIATORS: " + JSON.stringify(auditData.marketable_differentiators) : ''}
${auditData.coi_calculation_breakdown ? "COI BREAKDOWN: " + auditData.coi_calculation_breakdown : ''}
`;

  const models = ['openai/gpt-oss-120b:free', 'google/gemma-4-31b-it:free', 'openrouter/free'];
  let rawResponse = null;

  for (const model of models) {
    let retries = 3;
    while (retries > 0) {
      try {
        console.log(`💬 Requesting model: ${model}...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 4000,
            temperature: 0.3
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const completion = await response.json();
        rawResponse = completion.choices[0].message.content.trim();
        break;
      } catch (err) {
        console.warn(`⚠️ ${model} failed: ${err.message}`);
        if (err.message.includes('429') || err.message.includes('503') || err.message.includes('upstream')) {
          await new Promise(r => setTimeout(r, 8000));
          retries--;
        } else { break; }
      }
    }
    if (rawResponse) break;
  }

  if (!rawResponse) {
    console.error('❌ All models failed.');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(rawResponse);
  } catch (e) {
    try {
      payload = JSON.parse(cleanJsonString(rawResponse));
    } catch (e2) {
      console.error('❌ JSON parse failed. Raw output:');
      console.error(rawResponse);
      process.exit(1);
    }
  }

  const violations = validate(payload);
  if (violations.length > 0) {
    console.error('❌ Validation failed. Violations:');
    violations.forEach(v => console.error(v));
    console.error('\nRaw payload for debugging:');
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log('[Stage 4] ✅ Validation passed. Persisting to landing_payload...');
  const { error: updateError } = await supabase
    .from('audit_reports')
    .update({ landing_payload: payload })
    .eq('id', auditId);

  if (updateError) {
    console.error(`❌ Supabase update failed: ${updateError.message}`);
    process.exit(1);
  }

  console.log('✅ Stage 4 complete! Landing page wireframe populated.');
}

main();
