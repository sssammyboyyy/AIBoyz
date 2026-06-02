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

async function main() {
  loadEnv();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const auditId = process.argv[2];

  const { data: row, error } = await supabase
    .from('audit_reports')
    .select('audit_data')
    .eq('id', auditId)
    .single();

  if (error || !row) {
    console.error('FETCH_FAILED:', error?.message);
    process.exit(1);
  }

  const data = row.audit_data;
  
  console.log('\n================ PRIORITIZED ACTION PLAN ================');
  console.log(JSON.stringify(data.prioritized_action_plan, null, 2));

  console.log('\n================ LANDING PAGE STRATEGY ================');
  console.log(JSON.stringify(data.landing_page_strategy, null, 2));
}

main();
