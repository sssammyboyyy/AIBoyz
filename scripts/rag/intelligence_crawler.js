const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadEnv, chunkMarkdown, getOpenRouterEmbeddings, upsertToPinecone } = require('./lib/rag_engine');

loadEnv();

const CACHE_DIR = path.resolve(__dirname, '../../tmp/crawler_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function getCachePath(url) {
  const hash = crypto.createHash('md5').update(url).digest('hex');
  return path.join(CACHE_DIR, `${hash}.json`);
}

async function scrapeWithFirecrawl(url) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY");

  console.log(`   🕷️ Firecrawl API initiating on: ${url}`);
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url, formats: ['markdown'] })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Firecrawl failed: ${errText}`);
  }

  const result = await response.json();
  if (!result.success) throw new Error("Firecrawl return success=false");
  return result.data.markdown;
}

async function gradeContent(markdown) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const prompt = `You are an elite Staff Engineer and Tech Lead. Evaluate the following markdown text for its actionable engineering or architectural intelligence. 
If it is a marketing fluff piece, score it low. If it contains concrete code, patterns, or strategies, score it high.
Return ONLY a raw JSON object (no markdown formatting, no prose): {"score": <0-100>, "reason": "<short reason>"}

TEXT:
${markdown.substring(0, 8000)}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen-2.5-7b-instruct',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) throw new Error("Grading LLM failed");
  const result = await response.json();
  try {
    return JSON.parse(result.choices[0].message.content);
  } catch (e) {
    console.error("Failed to parse grader response:", result.choices[0].message.content);
    return { score: 0, reason: "Parse error" };
  }
}

async function main() {
  console.log("🌐 Initiating Intelligence Crawler...");
  const sourcesPath = path.resolve(__dirname, '../../config/intelligence_sources.json');
  if (!fs.existsSync(sourcesPath)) {
    console.error("❌ config/intelligence_sources.json not found.");
    process.exit(1);
  }

  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));

  for (const url of sources) {
    console.log(`\n🔍 Evaluating Target: ${url}`);
    const cachePath = getCachePath(url);

    // Caching check (7 days)
    if (fs.existsSync(cachePath)) {
      const stats = fs.statSync(cachePath);
      const ageDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        console.log(`   ⏭️ Skipped (Cached ${ageDays.toFixed(1)} days ago to save credits)`);
        continue;
      }
    }

    try {
      const markdown = await scrapeWithFirecrawl(url);
      
      // Save cache immediately to preserve credits even if grading fails
      fs.writeFileSync(cachePath, JSON.stringify({ url, date: Date.now(), markdown }));

      console.log(`   ⚖️ Grading payload via LLM...`);
      const grade = await gradeContent(markdown);
      console.log(`   📊 Score: ${grade.score}/100 - ${grade.reason}`);

      if (grade.score >= 85) {
        console.log(`   💎 High-Signal detected. Committing to Pinecone...`);
        const chunks = await chunkMarkdown(markdown, url);
        if (chunks.length > 0) {
          chunks.forEach(c => c.metadata.tags = 'external_intelligence');
          const embeddings = await getOpenRouterEmbeddings(chunks.map(c => c.text));
          const count = await upsertToPinecone(chunks, embeddings);
          console.log(`   ✅ Successfully pushed ${count} vectors to the RAG Brain.`);
        }
      } else {
        console.log(`   🗑️ Low signal-to-noise. Discarding.`);
      }

    } catch (err) {
      console.error(`   ❌ Failed to process ${url}: ${err.message}`);
    }
  }
  
  console.log("\n🏁 Intelligence Crawler complete.");
}

main();
