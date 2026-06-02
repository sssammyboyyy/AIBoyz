// scripts/revops/dataforseo_client.js
// Tier 1 Ingestion: DataForSEO Google Ads Search Volume (Live)
// Correct v3 endpoint: keywords_data/google_ads/search_volume/live
// Previous endpoint (keyword_share) was returning 404.

async function getKeywordMetrics(keywordsArray) {
  let login = process.env.DATAFORSEO_LOGIN;
  let password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    console.warn("⚠️ Warning: DATAFORSEO credentials missing from .env.local. Skipping volumetric fetch.");
    return null;
  }

  // Strip surrounding quotes if present (common in .env files)
  login = login.replace(/^["']|["']$/g, '');
  password = password.replace(/^["']|["']$/g, '');

  const authHeader = 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');

  // Google Ads Search Volume Live payload
  // Docs: https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live
  const postData = [{
    "keywords": keywordsArray,
    "location_code": 2710,      // South Africa
    "language_code": "en",
    "date_from": null,          // Use defaults (last 12 months)
    "date_to": null,
    "sort_by": "search_volume"
  }];

  try {
    console.log(`📡 Querying DataForSEO (Google Ads SV Live) for: [${keywordsArray.join(', ')}]...`);
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const result = await response.json();

    // Validate response structure
    if (!result.tasks || !result.tasks[0]) {
      console.warn('⚠️ DataForSEO returned no tasks. Raw response:', JSON.stringify(result).substring(0, 500));
      return null;
    }

    const task = result.tasks[0];
    if (task.status_code !== 20000) {
      console.warn(`⚠️ DataForSEO task error: ${task.status_message} (code: ${task.status_code})`);
      return null;
    }

    if (!task.result || task.result.length === 0) {
      console.warn('⚠️ DataForSEO returned empty result set.');
      return null;
    }

    // Map the Google Ads SV response schema
    const metrics = task.result.map(item => ({
      keyword: item.keyword,
      search_volume: item.search_volume || 0,
      cpc: item.cpc || 0,
      competition: item.competition || 0,
      competition_level: item.competition_level || 'UNKNOWN',
      monthly_searches: item.monthly_searches || []
    }));

    console.log(`✅ DataForSEO returned metrics for ${metrics.length} keyword(s).`);
    metrics.forEach(m => {
      console.log(`   → "${m.keyword}": SV=${m.search_volume}, CPC=$${m.cpc}, Competition=${m.competition_level}`);
    });

    return metrics;
  } catch (error) {
    console.error(`❌ DataForSEO Integration Error: ${error.message}`);
    return null;
  }
}

module.exports = { getKeywordMetrics };
