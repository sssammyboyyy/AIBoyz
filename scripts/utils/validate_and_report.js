// scripts/utils/validate_and_report.js
// Fetches the audit row, runs SEVERE MATRIX validation, and outputs a full report.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
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

const BANNED_FONTS = ['inter', 'roboto', 'arial', 'helvetica', 'times new roman', 'outfit', 'poppins', 'montserrat', 'open sans', 'lato', 'sans-serif', 'serif', 'monospace'];
const REQUIRED_COMPONENT_ORDER = [
  'HeroSection', 'PainMatrix', 'ExecutiveMetricBanner',
  'TrustVelocityGrid', 'FrictionlessConversionEngine', 'ExecutiveCloser'
];

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const auditId = process.argv[2] || 'cfd2b1b3-bbff-4248-980c-83abfe14977e';

  const { data: row, error } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', auditId)
    .single();

  if (error || !row) {
    console.error('FETCH_FAILED:', error?.message);
    process.exit(1);
  }

  const auditData = row.audit_data || {};
  const payload = row.landing_payload || {};
  const sections = payload.sections || [];

  console.log('===== AUDIT REPORT METADATA =====');
  console.log(`COMPANY: ${row.company_name}`);
  console.log(`URL: ${row.target_url}`);
  console.log(`SCORE: ${row.score_out_of_100}/100`);
  console.log(`STATUS: ${row.status}`);
  console.log(`COI_ZAR: ${auditData.cost_of_inaction_zar}`);
  console.log(`COI_BREAKDOWN: ${auditData.coi_calculation_breakdown}`);
  console.log(`ROW_ID: ${row.id}`);

  // === SEVERE MATRIX VALIDATION ===
  console.log('\n===== SEVERE MATRIX VALIDATION =====');

  // VAL_01: Component Count
  const val01 = sections.length === 6;
  console.log(`VAL_01|COMPONENT_COUNT|${sections.length}|${val01 ? 'PASS' : 'FAIL'}`);

  // VAL_02: Registry Order
  let val02 = true;
  const orderDetails = [];
  for (let i = 0; i < REQUIRED_COMPONENT_ORDER.length; i++) {
    const expected = REQUIRED_COMPONENT_ORDER[i];
    const actual = sections[i]?.component_type || 'MISSING';
    const match = expected === actual;
    if (!match) val02 = false;
    orderDetails.push(`${i}:${expected}=${actual}:${match ? 'OK' : 'MISMATCH'}`);
  }
  console.log(`VAL_02|REGISTRY_ORDER|${orderDetails.join(';')}|${val02 ? 'PASS' : 'FAIL'}`);

  // VAL_03: COI Contract
  const coiSection = sections.find(s => s.component_type === 'ExecutiveMetricBanner');
  const val03 = coiSection ? coiSection.props?.coi_raw_value === undefined : true;
  console.log(`VAL_03|COI_CONTRACT|coi_raw_value_absent=${val03}|${val03 ? 'PASS' : 'FAIL'}`);

  // VAL_04: Font Sanitization
  const jsonStr = JSON.stringify(payload).toLowerCase();
  const fontViolations = [];
  for (const font of BANNED_FONTS) {
    const fontRegex = new RegExp('\\b' + font + '\\b', 'i');
    if (fontRegex.test(jsonStr)) fontViolations.push(font);
  }
  const val04 = fontViolations.length === 0;
  console.log(`VAL_04|FONT_SANITIZATION|violations=[${fontViolations.join(',')}]|${val04 ? 'PASS' : 'FAIL'}`);

  // === SECTION DETAILS ===
  console.log('\n===== LANDING PAYLOAD SECTIONS =====');
  sections.forEach((sec, idx) => {
    console.log(`\nSECTION_${idx + 1}: ${sec.component_type} (priority: ${sec.render_priority})`);
    if (sec.props) {
      Object.entries(sec.props).forEach(([key, val]) => {
        const display = typeof val === 'string' ? val : JSON.stringify(val);
        console.log(`  ${key}: ${display}`);
      });
    }
  });

  // === AUDIT DATA SUMMARY ===
  console.log('\n===== AUDIT DATA SUMMARY =====');
  console.log(`TECHNICAL_SEO_ITEMS: ${(auditData.technical_seo_table || []).length}`);
  console.log(`ANALYTICS_ITEMS: ${(auditData.analytics_tracking_table || []).length}`);
  console.log(`COMPETITOR_MATRIX_ITEMS: ${(auditData.competitor_matrix || []).length}`);
  console.log(`ACTION_PLAN_ITEMS: ${(auditData.prioritized_action_plan || []).length}`);
  console.log(`DIFFERENTIATORS: ${(auditData.marketable_differentiators || []).length}`);
  console.log(`ADS_STRATEGIES: ${(auditData.google_ads_strategy || []).length}`);
  console.log(`LP_STRATEGIES: ${(auditData.landing_page_strategy || []).length}`);

  // Dump raw hero section for copywriting review
  const hero = sections.find(s => s.component_type === 'HeroSection');
  if (hero) {
    console.log('\n===== HERO SECTION RAW JSON =====');
    console.log(JSON.stringify(hero, null, 2));
  }
}

main();
