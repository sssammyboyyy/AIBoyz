// scripts/revops/openrouter_analyze.js
// SOVEREIGN MONOLITH: 2-Stage Segmented Pipeline
// Stage A: Core Diagnostics (technical_seo, analytics, competitors, COI math)
// Stage B: GTM & Strategy (action_plan, google_ads_strategy, landing_page_strategy)
// Each stage writes independently to Supabase to guarantee zero data loss.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { getKeywordMetrics } = require('./dataforseo_client');
const { getCompetitorData } = require('./places_client');

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
// OPENROUTER FETCH WITH CASCADING MODEL FALLBACK + RETRY
// ─────────────────────────────────────────────────────────────────
async function fetchOpenRouter(models, systemPrompt, userContent, openrouterKey, isJson = false, maxTokens = 8000) {
  const modelList = Array.isArray(models) ? models : [models];
  let lastError = null;

  for (const model of modelList) {
    let retries = 3;
    while (retries > 0) {
      try {
        console.log(`\n💬 Requesting OpenRouter with model: ${model} (${retries} retries left)...`);
        const payload = {
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          max_tokens: maxTokens,
          temperature: 0.1
        };

        if (isJson) {
          payload.response_format = { type: 'json_object' };
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter invocation failed for ${model}: ${errText}`);
        }

        const completion = await response.json();
        if (completion.choices && completion.choices[0] && completion.choices[0].message) {
          return completion.choices[0].message.content.trim();
        } else {
          throw new Error(`Invalid completion response: ${JSON.stringify(completion)}`);
        }
      } catch (err) {
        lastError = err;
        console.warn(`⚠️ [COGNITIVE SHIFT] Model ${model} failed (${err.message}). Cascading to next available intelligence node...`);
        if (err.message.includes('429') || err.message.includes('rate-limit') || err.message.includes('503') || err.message.includes('upstream')) {
          console.log('⏳ Rate limit or service error detected. Sleeping for 8 seconds before retrying...');
          await new Promise(resolve => setTimeout(resolve, 8000));
          retries--;
        } else {
          break;
        }
      }
    }
  }
  throw new Error(`All models failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

// ─────────────────────────────────────────────────────────────────
// JSON SANITIZER: Control characters + markdown fence removal
// ─────────────────────────────────────────────────────────────────
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

    if (escape) {
      result += char;
      escape = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// MULTI-STRATEGY JSON REPAIR PIPELINE
// Strategy 1: Control-char repair
// Strategy 2: Truncate-and-close (find last valid structural point)
// Strategy 3: Regex extraction of known keys as nuclear fallback
// ─────────────────────────────────────────────────────────────────
function repairJson(rawString, expectedKeys = []) {
  let cleaned = rawString.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  }

  // Strategy 1: Control-char repair
  try {
    return JSON.parse(cleanJsonString(cleaned));
  } catch (e) {
    console.warn('⚠️ Strategy 1 (control-char repair) failed. Trying truncate-and-close...');
  }

  // Strategy 2: Truncate at last complete array element or object property
  try {
    let truncated = cleaned;
    for (let i = truncated.length - 1; i >= 0; i--) {
      if (truncated[i] === '}') {
        let attempt = truncated.substring(0, i + 1);
        const needBrackets = (attempt.match(/\[/g) || []).length - (attempt.match(/]/g) || []).length;
        const needBraces = (attempt.match(/{/g) || []).length - (attempt.match(/}/g) || []).length;
        attempt += ']'.repeat(Math.max(0, needBrackets)) + '}'.repeat(Math.max(0, needBraces));
        try {
          const parsed = JSON.parse(attempt);
          console.log(`✅ Strategy 2 succeeded: Truncated at position ${i} and closed ${needBrackets} brackets + ${needBraces} braces`);
          return parsed;
        } catch (e2) { /* continue searching */ }
      }
    }
    console.warn('⚠️ Strategy 2 (truncate-and-close) failed.');
  } catch (e) {
    console.warn('⚠️ Strategy 2 threw:', e.message);
  }

    // Strategy 3: Nuclear fallback — extract known keys via regex
  try {
    console.warn('⚠️ Strategy 3 (regex extraction) — building minimal valid payload...');
    const fallback = {};
    // Try to extract each expected key
    for (const key of expectedKeys) {
      const arrayMatch = cleaned.match(new RegExp(`"${key}"\\s*:\\s*\\[`));
      if (arrayMatch) {
        fallback[key] = []; // Placeholder empty array — data was lost but structure is intact
      }
    }
    const scoreMatch = cleaned.match(/"website_score"\s*:\s*(\d+)/);
    const coiMatch = cleaned.match(/"cost_of_inaction_zar"\s*:\s*(\d+)/);
    const breakdownMatch = cleaned.match(/"coi_calculation_breakdown"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|\\}|$))/);
    const overviewMatch = cleaned.match(/"company_overview"\s*:\s*"([\s\S]*?)"(?=\s*(?:,|\\}|$))/);
    
    if (scoreMatch) fallback.website_score = parseInt(scoreMatch[1], 10);
    if (coiMatch) fallback.cost_of_inaction_zar = parseInt(coiMatch[1], 10);
    if (breakdownMatch) fallback.coi_calculation_breakdown = breakdownMatch[1];
    if (overviewMatch) fallback.company_overview = overviewMatch[1];
    
    return fallback;
  } catch (e) {
    throw new Error('All 3 JSON repair strategies failed. Cannot recover.');
  }
}

// ─────────────────────────────────────────────────────────────────
// NICHE-AWARE KEYWORD DERIVATION
// ─────────────────────────────────────────────────────────────────
function deriveKeywordsFromNiche(niche) {
  const nicheLC = (niche || '').toLowerCase();
  if (nicheLC.includes('dent')) return ['dentist near me', 'teeth whitening', 'dental implants', 'emergency dentist'];
  if (nicheLC.includes('hotel') || nicheLC.includes('hospitality')) return ['luxury hotel', 'boutique hotel booking', 'hotel deals south africa'];
  if (nicheLC.includes('law') || nicheLC.includes('legal')) return ['lawyer near me', 'legal advice', 'attorney consultation'];
  if (nicheLC.includes('restaurant') || nicheLC.includes('food')) return ['restaurant near me', 'best restaurants', 'food delivery'];
  if (nicheLC.includes('real estate') || nicheLC.includes('property')) return ['property for sale', 'real estate agent', 'houses for sale'];
  if (nicheLC.includes('fitness') || nicheLC.includes('gym')) return ['gym near me', 'personal trainer', 'fitness classes'];
  if (nicheLC.includes('salon') || nicheLC.includes('beauty')) return ['hair salon near me', 'beauty treatments', 'nail salon'];
  if (nicheLC.includes('auto') || nicheLC.includes('mechanic') || nicheLC.includes('car')) return ['car mechanic near me', 'auto repair', 'car service'];
  // Fallback: split niche words into search terms
  const words = niche.split(/[,\s]+/).filter(w => w.length > 3);
  if (words.length >= 2) return [niche, words.slice(0, 2).join(' '), words.slice(-2).join(' ')];
  return ['business services', 'local business', 'professional services'];
}

// ─────────────────────────────────────────────────────────────────
// STAGE A SYSTEM PROMPT: Core Diagnostics Only
// Outputs: website_score, cost_of_inaction_zar, coi_calculation_breakdown,
//          technical_seo_table, analytics_tracking_table, competitor_matrix,
//          marketable_differentiators, company_overview
// ─────────────────────────────────────────────────────────────────
function buildStageASystemPrompt(targetNiche, realMetrics) {
  return `You are an elite Revenue Operations Consultant specializing in ${targetNiche}. 
Synthesize the provided website facts and economic analysis into a CORE TECHNICAL DIAGNOSTIC.

GROUNDING DATA (REAL SEARCH METRICS — USE THESE EXACT NUMBERS):
${JSON.stringify(realMetrics || [])}

CRITICAL RULES:
1. NO TECHNICAL JARGON. Translate technical gaps into business pain.
2. MATH TRANSPARENCY & PROOF: For the "coi_calculation_breakdown", you MUST prove your "cost_of_inaction_zar" number. Show the explicit formula (e.g. Search Volume x Expected CTR x Lead Conversion Rate x Average Order Value). Do NOT be vague. Provide the step-by-step arithmetic so the client believes the loss.
3. Use the REAL search volume and CPC data above to calculate COI in ZAR. Do NOT hallucinate numbers.
4. ACTIONABLE TIPS FOR NEGATIVES: If any finding in the tables (technical, content, SEO, social) is negative or missing, you MUST provide a direct, actionable solution in the "actionable_tip" field. If it's positive, you can leave it null or brief.
5. VISUAL EMOJIS: Assign an appropriate, highly-relevant single emoji in the "emoji" field for every single table finding to improve visual scannability (e.g. ⚡ for speed, 📱 for mobile, 🔒 for SSL).
6. ANTI-FLUFF MANDATE: You are strictly forbidden from using generic marketing adjectives. You must extract and output HARD OPERATIONAL FACTS (e.g., '10-vehicle fleet', 'Level 2 B-BBEE', 'Board-certified').
7. BUDGET MANDATE: For Google Ads Strategy, you must output explicit, realistic ZAR budget ranges based on the CPC data and niche.
8. STRICT JSON SCHEMA: Output ONLY valid JSON with EXACTLY these keys:

{
  "website_score": <number 0-100>,
  "analytics_setup_score": <number 0-100>,
  "seo_readiness_score": <number 0-100>,
  "social_presence_score": <number 0-100>,
  "ads_readiness_score": <number 0-100>,
  "cost_of_inaction_zar": <pure integer, e.g. 450000, NO currency symbols or spaces>,
  "coi_calculation_breakdown": "<string, explicit mathematical proof of lost MRR>",
  "company_overview": "<3-4 sentences of hard operational facts>",
  "technical_foundation_table": [
    { "metric": "<string>", "platform_or_status": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ],
  "content_assessment_table": [
    { "element": "<string>", "status": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ],
  "analytics_tracking_table": [
    { "tool": "<string>", "purpose": "<string>", "cost": "<string>", "priority": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ],
  "seo_onpage_findings": [
    { "element": "<string>", "finding": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ],
  "seo_offpage_local": [
    { "element": "<string>", "finding": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ],
  "social_media_audit": [
    { "platform": "<string>", "url_or_status": "<string>", "recommendation": "<string>", "priority": "<string>", "is_negative": <boolean>, "actionable_tip": "<string or null>", "emoji": "<string>" }
  ]
}

GOLDEN EXAMPLE (EMULATE THIS DENSITY AND TONE):
Example Overview: Factor Pro Industrial Solutions is a well-established B2B electrical wholesale supplier with over 50 years of combined experience, 42+ brand partnerships (Schneider, Siemens), a 10-vehicle fleet, and two strategic branches. Despite strong foundations, their digital presence is critically underdeveloped.
Example SEO Pain: 'Generic meta titles (not keyword-optimized) and missing schema markup mean the website is invisible to high-intent procurement searches.'

Do NOT include google_ads_strategy, landing_page_strategy, prioritized_action_plan, competitor_landscape, or marketable_differentiators. Those will be generated separately.
Output ONLY the JSON object. No prose, no markdown fences.`;
}

// ─────────────────────────────────────────────────────────────────
// STAGE B SYSTEM PROMPT: GTM & Strategy Only
// Outputs: prioritized_action_plan, google_ads_strategy, landing_page_strategy
// ─────────────────────────────────────────────────────────────────
function buildStageBSystemPrompt(targetNiche) {
  return `You are an elite Go-To-Market strategist for ${targetNiche}. 
You are given the COMPLETED core diagnostic of a business website. Your job is to generate ONLY the Go-To-Market strategies.

CRITICAL RULES:
1. Generate aggressive, high-converting Google Ads copy and Landing Page structures.
2. The action plan must include granular timelines and specific technical fixes (e.g., 'Install GTM + GA4 — Week 1 — CRITICAL').
3. Use a blunt, executive tone. No generic advice — output hyper-specific corporate intelligence.
4. Do not use generic filler. You must infer and write with the extreme, granular specificity shown in the Golden Examples, tailored to the target's specific niche and scraped data.
5. ANTI-FLUFF MANDATE: You are strictly forbidden from using generic marketing adjectives. You must extract and output HARD OPERATIONAL FACTS (e.g., '10-vehicle fleet', 'Level 2 B-BBEE', 'Board-certified'). For Marketable Differentiators, the 'operational_rationale' must explain exactly WHY this changes the buyer decision calculus.
6. BUDGET MANDATE: For Google Ads Strategy, you must output explicit, realistic ZAR budget ranges based on the CPC data and niche (e.g., 'R4,000–R6,000/month').
7. ACTION PLAN ALIGNMENT: The Prioritized Action Plan must include specific categories (e.g., 'Local SEO', 'Website', 'Paid Search') and Effort levels ('Low', 'Medium', 'High').
8. STRICT JSON SCHEMA: Output ONLY valid JSON with EXACTLY these keys:

{
  "competitor_landscape": [
    { "competitor_name": "<string>", "presence": "<string>", "digital_strength": "<string>", "threat_level": "<string>", "your_advantage": "<string>" }
  ],
  "google_ads_strategy": [
    { "campaign_name": "<string>", "suggested_budget_zar": "<string>", "objective": "<string>", "core_keywords": ["<string>"], "negative_keywords": ["<string>"], "ad_preview_headline": "<string>", "ad_preview_body": "<string>" }
  ],
  "landing_page_strategy": [
    { "lp_name": "<string>", "hero_concept": "<string>", "bullet_points": ["<string>"], "required_trust_signals": ["<string>"] }
  ],
  "prioritized_action_plan": [
    { "priority_number": <number>, "action_title": "<string>", "action_subtitle": "<string>", "category": "<string>", "timeframe": "<string>", "effort": "<string>", "impact": "<string>" }
  ],
  "marketable_differentiators": [
    { "title": "<string>", "operational_rationale": "<string>" }
  ]
}

GOLDEN EXAMPLE (EMULATE THIS DENSITY AND TONE):
Example Ad Strategy: Campaign 1 — Local Intent & Emergency Services. Objective: Capture high-intent local searches for urgent project work. Core Keywords: '24hr electrical breakdown', 'same day delivery motor repair'. Ad Preview Headline: 'Industrial Electrical Supplies — Same Day Delivery | 24hr Emergency Service'.
Example Action: 'Install Google Tag Manager + GA4 + Search Console — Zero-cost foundation for all future marketing measurement (Week 1 - CRITICAL)'.

Do NOT include website_score, cost_of_inaction_zar, or the diagnostic tables.
Output ONLY the JSON object. No prose, no markdown fences.`;
}

// ─────────────────────────────────────────────────────────────────
// DYNAMIC UNIVERSAL NICHE OFF-PAGE INTELLIGENCE NODE
// ─────────────────────────────────────────────────────────────────
async function fetchOffPageMetadata(companyName, location, niche, openrouterKey) {
  console.log(`\n🕵️‍♂️ DYNAMIC INTELLIGENCE NODE: Gathering off-page metadata for ${companyName}...`);
  const query = `${companyName} ${location} ${niche} reviews B-BBEE scale operations`;
  const prompt = `Search the web, local registries, Map packs, and niche directories for intelligence regarding the company '${companyName}' in '${location}' operating within the '${niche}' sector. Isolate and return only explicit operational metrics based on this niche (e.g., number of practitioners/staff, estimated operational scale, specialized equipment capacity, location convenience, brand footprints, or B-BBEE status where applicable). Keep it highly consolidated. If information is totally missing from search surfaces, print 'Unknown' for that field.`;

  // Try Brave Search (Strategy A)
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  let braveContext = "";
  if (braveKey) {
    try {
      console.log("   -> Strategy A: Brave Search Free Tier...");
      const braveRes = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: { "Accept": "application/json", "X-Subscription-Token": braveKey }
      });
      if (braveRes.ok) {
        const data = await braveRes.json();
        const snippets = data.web?.results?.map(r => r.description).join('\n') || "";
        braveContext = snippets ? `Web Snippets:\n${snippets}\n\n` : "";
      } else {
        console.warn(`   ⚠️ Brave Search HTTP error: ${braveRes.status}`);
      }
    } catch(e) {
      console.warn("   ⚠️ Brave Search failed:", e.message);
    }
  } else {
    console.log("   -> Strategy A skipped (no BRAVE_SEARCH_API_KEY).");
  }

  // Strategy B (Fallback/Synthesis using OpenRouter)
  console.log("   -> Strategy B: Synthesis via OpenRouter...");
  const userContent = braveContext ? `${braveContext}Use the above snippets to answer: ${prompt}` : prompt;
  const cascade = ['qwen/qwen-2.5-7b-instruct'];
  try {
    const synthesis = await fetchOpenRouter(cascade, "You are a corporate intelligence analyst.", userContent, openrouterKey, false, 1000);
    console.log("✅ Off-Page Intelligence Secured.");
    return synthesis;
  } catch (e) {
    console.warn("   ⚠️ Off-Page Intelligence failed:", e.message);
    return "Unknown";
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────
async function main() {
  const args = getArgs();
  const inputPath = args.input;
  const targetNiche = args.niche || 'South African B2B and industrial sectors';
  const targetLocation = args.location || 'South Africa';

  // Tier 1: DataForSEO volumetric grounding
  const nicheKeywords = deriveKeywordsFromNiche(targetNiche);
  console.log(`🔑 Niche-derived keywords: [${nicheKeywords.join(', ')}]`);
  const realMetrics = await getKeywordMetrics(nicheKeywords);
  
  // Tier 2: Google Places competitor grounding
  const liveCompetitors = await getCompetitorData(targetLocation, targetNiche);

  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('❌ Error: Valid input file path required via --input.');
    process.exit(1);
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openrouterKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing required environment variables (OPENROUTER_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const rawMarkdown = fs.readFileSync(inputPath, 'utf8');

  const cleanUrl = path.basename(inputPath, '.md').replace('_scrape', '').replace('https_', 'https://').replace('_', '.');
  const derivedCompanyName = cleanUrl.replace('https://', '').replace('www.', '').split('.')[0].toUpperCase();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧠 SOVEREIGN MONOLITH: 2-Stage Segmented Pipeline`);
  console.log(`   Target: ${derivedCompanyName} | Niche: ${targetNiche}`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    // ═══════════════════════════════════════════════════════════
    // COGNITIVE CHAIN: READER → THINKER (shared upstream stages)
    // ═══════════════════════════════════════════════════════════

    console.log('[1/5] ⚡ PARALLEL EXTRACTION: DOM Facts & Off-Page Intelligence...');
    const stage1SystemPrompt = `You are a data extraction engine. Read the following website markdown. Extract all hard facts, services, locations, missing SEO elements, and technical gaps. Additionally, find 3 direct regional competitors within the ${targetNiche} sector. Output a dense, bulleted summary. Do not format, just extract facts.`;
    
    const [stage1Facts, offPageIntelligence] = await Promise.all([
      fetchOpenRouter(['qwen/qwen-2.5-7b-instruct'], stage1SystemPrompt, `Raw Site Content:\n${rawMarkdown}`, openrouterKey, false, 4000),
      fetchOffPageMetadata(derivedCompanyName, targetLocation, targetNiche, openrouterKey)
    ]);

    console.log('[2/5] 🧮 THE THINKER: Calculating Economics...');
    const stage2SystemPrompt = `You are an elite quantitative analyst. Review these business facts. Calculate a ruthless, data-backed 'Cost of Inaction' in ZAR reflecting estimated monthly lost revenue for the ${targetNiche} sector based on these specific technical gaps and competitor threats.\n\nREAL VOLUMETRIC DATA: ${JSON.stringify(realMetrics)}. Use these exact Search Volumes and CPCs to calculate the ZAR Cost of Inaction. Output only your mathematical logic and the final ZAR number.`;
    const stage2Math = await fetchOpenRouter(['qwen/qwen-2.5-7b-instruct'], stage2SystemPrompt, `Factual Summary:\n${stage1Facts}`, openrouterKey);

    const competitorContext = liveCompetitors ? `\n\nLIVE LOCAL COMPETITORS (Use these strictly for the competitor_matrix):\n${JSON.stringify(liveCompetitors, null, 2)}` : "";
    const sharedContext = `Facts:\n${stage1Facts}\n\nOff-Page Intelligence:\n${offPageIntelligence}\n\nCOI Math:\n${stage2Math}${competitorContext}`;

    // ═══════════════════════════════════════════════════════════
    // PARALLEL EXECUTION: STAGE A (Diagnostics) & STAGE B (Strategy)
    // ═══════════════════════════════════════════════════════════
    console.log('[3/5] 🚀 PARALLEL EXECUTION: Generating Core Diagnostics & GTM Strategy concurrently...');
    const stageAPrompt = buildStageASystemPrompt(targetNiche, realMetrics);
    const stageBPrompt = buildStageBSystemPrompt(targetNiche);

    const [stageAJsonString, stageBJsonString] = await Promise.all([
      fetchOpenRouter(['google/gemini-3.5-flash', 'anthropic/claude-3-haiku', 'meta-llama/llama-3.1-8b-instruct'], stageAPrompt, sharedContext, openrouterKey, true, 8000),
      fetchOpenRouter(['google/gemini-3.5-flash', 'anthropic/claude-3-haiku', 'meta-llama/llama-3.1-8b-instruct'], stageBPrompt, sharedContext, openrouterKey, true, 8000)
    ]);

    let stageAData, stageBData;

    try {
      stageAData = JSON.parse(stageAJsonString);
    } catch (parseErr) {
      console.warn('⚠️ Stage A: Initial JSON parse failed. Engaging repair pipeline...');
      stageAData = repairJson(stageAJsonString, [
        'technical_foundation_table', 'content_assessment_table', 'analytics_tracking_table', 'seo_onpage_findings', 'seo_offpage_local', 'social_media_audit'
      ]);
    }

    try {
      stageBData = JSON.parse(stageBJsonString);
    } catch (parseErr) {
      console.warn('⚠️ Stage B: Initial JSON parse failed. Engaging repair pipeline...');
      stageBData = repairJson(stageBJsonString, [
        'competitor_landscape', 'google_ads_strategy', 'landing_page_strategy', 'prioritized_action_plan', 'marketable_differentiators'
      ]);
    }

    // Validate fields exist
    stageAData.website_score = stageAData.website_score || 50;
    stageAData.cost_of_inaction_zar = stageAData.cost_of_inaction_zar || 0;
    
    // Merge Stage A and Stage B
    const mergedAuditData = {
      ...stageAData,
      competitor_landscape: Array.isArray(stageBData.competitor_landscape) ? stageBData.competitor_landscape : [],
      google_ads_strategy: Array.isArray(stageBData.google_ads_strategy) ? stageBData.google_ads_strategy : [],
      landing_page_strategy: Array.isArray(stageBData.landing_page_strategy) ? stageBData.landing_page_strategy : [],
      prioritized_action_plan: Array.isArray(stageBData.prioritized_action_plan) ? stageBData.prioritized_action_plan : [],
      marketable_differentiators: Array.isArray(stageBData.marketable_differentiators) ? stageBData.marketable_differentiators : []
    };

    // ─── DATABASE WRITE: Single Unified Insert ───
    console.log('[4/5] 💾 DB WRITE: Committing Unified Audit & Strategy to Supabase...');
    const { data: insertedRow, error: insertError } = await supabase
      .from('audit_reports')
      .insert([{
        company_name: derivedCompanyName,
        target_url: cleanUrl,
        status: 'review_required',
        audit_data: mergedAuditData,
        score_out_of_100: stageAData.website_score
      }])
      .select();

    if (insertError) throw new Error(`DB Write failed: ${insertError.message}`);
    const auditId = insertedRow[0].id;
    console.log(`✅ DB Write Success. Row ID: ${auditId}`);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🚀 PIPELINE COMPLETE: ${derivedCompanyName}`);
    console.log(`   Row ID: ${auditId}`);
    console.log(`   Score: ${stageAData.website_score}/100`);
    console.log(`   COI: R${stageAData.cost_of_inaction_zar}/month`);
    console.log(`   Action Items: ${mergedAuditData.prioritized_action_plan.length}`);
    console.log(`   Ad Campaigns: ${mergedAuditData.google_ads_strategy.length}`);
    console.log(`${'═'.repeat(60)}\n`);

    console.log(`__PIPELINE_RESULT__:${JSON.stringify({ id: auditId })}`);

  } catch (error) {
    console.error(`\n❌ PIPELINE FAILURE: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();