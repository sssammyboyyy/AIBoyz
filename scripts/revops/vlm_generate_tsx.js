// scripts/revops/vlm_generate_tsx.js
// Stage 4: Generative UI/UX Vision Builder
// Fetches audit data, reads a local premium UI reference, and commands a Vision Model to output raw, bespoke Next.js Tailwind TSX.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ─────────────────────────────────────────────────────────────────
// CLI ARGUMENT PARSER
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// ENV LOADER
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
// BASE64 IMAGE ENCODER
// ─────────────────────────────────────────────────────────────────
function getBase64ReferenceImage() {
  const referencesDir = path.resolve(__dirname, '../../components/landing/references');
  if (!fs.existsSync(referencesDir)) {
    console.warn(`⚠️ References directory missing at ${referencesDir}`);
    return null;
  }
  
  const files = fs.readdirSync(referencesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.webp'));
  if (files.length === 0) {
    console.warn('⚠️ No golden reference images found in components/landing/references/. Proceeding without visual reference.');
    return null;
  }

  // Select random reference
  const randomFile = files[Math.floor(Math.random() * files.length)];
  const filePath = path.join(referencesDir, randomFile);
  console.log(`🖼️ Using UI Golden Reference: ${randomFile}`);
  
  const ext = path.extname(randomFile).substring(1);
  const mimeType = ext === 'jpg' ? 'jpeg' : ext;
  const base64Data = fs.readFileSync(filePath).toString('base64');
  
  return {
    mimeType: `image/${mimeType}`,
    base64: base64Data
  };
}

// ─────────────────────────────────────────────────────────────────
// TSX EXTRACTION
// ─────────────────────────────────────────────────────────────────
function extractTsx(rawResponse) {
  const match = rawResponse.match(/```tsx([\s\S]*?)```/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return rawResponse.trim();
}

// ─────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────
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

  console.log(`\n[Stage 4: Generative UI] Fetching audit report ${auditId}...`);
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

  console.log(`[Stage 4] Reading Reference Image & Engaging Vision Model...`);
  const imageRef = getBase64ReferenceImage();

  const systemPrompt = `You are a world-class UI/UX Designer and Next.js/Tailwind Developer.
Your task is to generate a fully functioning, beautiful B2C landing page mockup.

CRITICAL ARCHITECTURE RULES:
1. Output ONLY pure, raw \`\`\`tsx code representing a Next.js App Router Page. Do not include any JSON schemas, explanations, or prose.
2. ⚠️ NEXT.JS APP ROUTER MANDATE: Since you will use interactive hooks (like useState or useEffect) for micro-animations or mobile menus, you MUST write "use client"; on the very first line of the file.
3. The UI must be visually stunning, using Tailwind CSS, lucide-react icons, and smooth micro-animations. ⚠️ When using lucide-react, import individual icons explicitly (e.g., import { Menu, Check } from 'lucide-react'). DO NOT import or use a generic <LucideIcon> component wrapper.
4. You must use the provided AUDIT DATA (the pain points, ad strategies, and action plan) to populate the COPY of the website. Do not use generic Lorem Ipsum.
5. If an image reference is provided in the prompt, analyze its aesthetic, layout, spacing, and typography structure, and use it as your Golden Standard template.
6. Create a monolithic, single-file \`page.tsx\`. Do not import local custom components, just define any sub-components within the same file or inline them.
7. The page must be responsive, modern, and built to convert. Address the "Cost of Inaction" implicitly through the design.`;

  const userText = `
COMPANY: ${companyName}
URL: ${row.target_url}

AUDIT FINDINGS (USE THIS DATA TO WRITE THE COPY):
- Cost of Inaction: R ${auditData.cost_of_inaction_zar} / month
- Key Ad Strategy: ${JSON.stringify(auditData.google_ads_strategy)}
- Target Landing Page Concept: ${JSON.stringify(auditData.landing_page_strategy)}
- Differentiators: ${JSON.stringify(auditData.marketable_differentiators)}
- Action Plan Insights: ${JSON.stringify(auditData.prioritized_action_plan)}

Build the flawless Next.js \`page.tsx\` file now using Tailwind CSS.`;

  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  if (imageRef) {
    messages.push({
      role: 'user',
      content: [
        { type: "text", text: userText },
        { 
          type: "image_url", 
          image_url: { url: `data:${imageRef.mimeType};base64,${imageRef.base64}` }
        }
      ]
    });
  } else {
    messages.push({ role: 'user', content: userText });
  }

  const models = ['qwen/qwen2.5-vl-72b-instruct'];
  let rawResponse = null;

  for (const model of models) {
    let retries = 2;
    while (retries > 0) {
      try {
        console.log(`💬 Requesting vision model: ${model}...`);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 8000,
            temperature: 0.2
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
    console.error('❌ All vision models failed.');
    process.exit(1);
  }

  const tsxCode = extractTsx(rawResponse);
  
  // Create dynamic route for Next.js to compile instantly
  const outputDir = path.resolve(__dirname, `../../app/landing/generated-${auditId}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'page.tsx');
  fs.writeFileSync(outputPath, tsxCode);

  console.log(`\n✅ Stage 4 complete! Generative .tsx saved to: app/landing/generated-${auditId}/page.tsx`);
  console.log(`🌐 Instantly viewable at: http://localhost:3000/landing/generated-${auditId}`);
}

main();
