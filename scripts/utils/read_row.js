const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Env file not found');
    process.exit(1);
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
      process.env[key.toUpperCase()] = value;
    }
  });
}

async function main() {
  loadEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const auditId = '56b20c1d-da67-4e1f-a8a1-ce65d125e1bc';

  console.log(`Fetching audit report: ${auditId}`);
  const { data, error } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', auditId)
    .single();

  if (error) {
    console.error('❌ Supabase fetch failed:', error.message);
    process.exit(1);
  }

  console.log('--- AUDIT REPORT DETAILS ---');
  console.log(`Company Name: ${data.company_name}`);
  console.log(`Target URL: ${data.target_url}`);
  console.log(`Status: ${data.status}`);
  console.log(`Score: ${data.score_out_of_100}/100`);
  console.log(`COI ZAR Value: R ${data.audit_data?.cost_of_inaction_zar}`);
  console.log(`COI Calculation Breakdown: ${data.audit_data?.coi_calculation_breakdown}`);
  console.log('\n--- LANDING PAYLOAD SECTIONS ---');
  if (data.landing_payload && data.landing_payload.sections) {
    data.landing_payload.sections.forEach((sec, idx) => {
      console.log(`Section ${idx+1}: ${sec.component_type} (Priority: ${sec.render_priority})`);
      if (sec.props) {
        console.log(`   Props Keys: ${Object.keys(sec.props).join(', ')}`);
      }
    });
  } else {
    console.log('⚠️ No landing payload found or sections missing!');
  }
}

main();
