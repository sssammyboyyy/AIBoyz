const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const { loadEnv } = require('./lib/rag_engine');

loadEnv();

async function getRecentSuccesses(pc, indexName) {
  const index = pc.Index(indexName);
  
  // Create a neutral query vector to fetch a random sample of recent successes
  const dummyVector = Array.from({ length: 4096 }, () => Math.random() - 0.5);
  
  const queryResponse = await index.query({
    vector: dummyVector,
    topK: 20,
    includeMetadata: true,
    filter: {
      tags: { "$in": ["success", "proven_success"] }
    }
  });

  if (!queryResponse.matches || queryResponse.matches.length === 0) {
    return [];
  }

  return queryResponse.matches.map(m => m.metadata.text);
}

async function synthesizeDoctrines(texts) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) throw new Error("Missing OPENROUTER_API_KEY");

  const combinedText = texts.join('\n\n---\n\n');
  const prompt = `You are a Principal AI Architect analyzing recent successful executions of our autonomous agents.
Identify deep architectural patterns, repeated bug fixes, or recurring successful strategies present in these logs.
Synthesize these patterns into 3 NEW concrete, highly specific doctrine rules that our AI should globally enforce in the future.

Do NOT output generic advice. Output strictly formatted Markdown.

RECENT SUCCESSFUL LOGS:
${combinedText.substring(0, 16000)}

Format:
### [Proposed Doctrine 1 Name]
- **Observation:** [What you noticed in the logs]
- **New Rule:** [The strict rule to enforce]

### [Proposed Doctrine 2 Name]
...`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.1-8b-instruct',
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) throw new Error("Synthesis LLM failed");
  const result = await response.json();
  return result.choices[0].message.content;
}

async function main() {
  console.log("🛌 Initiating Reflection Node (Dream Cycle)...");
  
  const pineconeKey = process.env.PINECONE_KEY || process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'antigravity-brain';
  const pc = new Pinecone({ apiKey: pineconeKey });

  try {
    console.log("   🔍 Fetching recent successes from Pinecone...");
    const texts = await getRecentSuccesses(pc, indexName);
    
    if (texts.length === 0) {
      console.log("   ⚠️ Not enough recent success data in Pinecone to reflect on. Exiting.");
      return;
    }

    console.log(`   🧠 Synthesizing ${texts.length} memories into new global doctrines...`);
    const newDoctrines = await synthesizeDoctrines(texts);

    const docsDir = path.resolve(__dirname, '../../docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

    const outputPath = path.join(docsDir, 'proposed_doctrines.md');
    
    const content = `# Proposed Global Doctrines\n*Generated on: ${new Date().toISOString()}*\n\n` + 
                    `> **⚠️ HUMAN APPROVAL REQUIRED:** Review these synthesized rules. If they are good, copy them into \`.gemini/config/skills/global-intelligence/SKILL.md\`.\n\n` +
                    newDoctrines;

    fs.writeFileSync(outputPath, content);
    console.log(`\n   ✅ Success! Proposed doctrines written to: docs/proposed_doctrines.md`);
    console.log(`   👀 Awaiting your manual review before global enforcement.`);

  } catch (err) {
    console.error(`   ❌ Reflection failed: ${err.message}`);
  }
}

main();
