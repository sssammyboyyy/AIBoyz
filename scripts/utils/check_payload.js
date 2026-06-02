const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Env file not found at:', envPath);
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

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Env variables missing!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const auditId = 'd62efc54-d6ef-467a-b458-efc33f3c1dd0';

  console.log(`Fetching report ID: ${auditId}`);
  const { data, error } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', auditId)
    .single();

  if (error) {
    console.error('❌ Supabase fetch failed:', error.message);
    process.exit(1);
  }

  const output = {
    id: data.id,
    company_name: data.company_name,
    target_url: data.target_url,
    score_out_of_100: data.score_out_of_100,
    status: data.status,
    cost_of_inaction_zar: data.audit_data?.cost_of_inaction_zar,
    landing_payload: data.landing_payload
  };

  const outputPath = path.resolve(__dirname, '../../tmp/payload_result.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`✅ Success! Output written to ${outputPath}`);
}

main();
