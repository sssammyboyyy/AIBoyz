const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...rest] = line.split('=');
      return [key.trim(), rest.join('=').trim().replace(/^"|"$/g, '')];
    })
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchPayload() {
  const { data, error } = await supabase
    .from('audit_reports')
    .select('landing_payload')
    .eq('id', '2b04bc7d-0d11-4a39-bfb7-483ae5cafbf9')
    .single();

  if (error) {
    console.error("Error fetching data:", error);
  } else {
    console.log(JSON.stringify(data.landing_payload, null, 2));
  }
}

fetchPayload();
