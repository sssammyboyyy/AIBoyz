const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

const { loadEnv, chunkMarkdown, getOpenRouterEmbeddings, upsertToPinecone } = require('./lib/rag_engine');

// ─────────────────────────────────────────────────────────────────
// MAIN INGESTION ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────
async function main() {
  loadEnv();

  const pineconeKey = process.env.PINECONE_KEY || process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'antigravity-brain';

  if (!pineconeKey) {
    console.error("❌ Error: Missing PINECONE_KEY in .env.local");
    process.exit(1);
  }

  console.log(`🌲 Connecting to Pinecone...`);
  const pc = new Pinecone({ apiKey: pineconeKey });
  
  const list = await pc.listIndexes();
  const exists = list.indexes && list.indexes.some(i => i.name === indexName);
  
  if (!exists) {
    console.log(`🌲 Index '${indexName}' not found. Creating it with dimension 4096...`);
    await pc.createIndex({
      name: indexName,
      dimension: 4096,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } } // standard free tier spec
    });
    console.log(`⏳ Waiting 15s for index to initialize...`);
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  const index = pc.Index(indexName);

  // Define files to ingest
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  const globalSkillsDir = path.join(homeDir, '.gemini/config/skills');
  
  const filesToIngest = [];
  
  if (fs.existsSync(globalSkillsDir)) {
    const skills = fs.readdirSync(globalSkillsDir);
    for (const skill of skills) {
      const skillFile = path.join(globalSkillsDir, skill, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        filesToIngest.push(skillFile);
      }
    }
  }

  // Add project-specific docs if they exist
  const architectureLog = path.resolve(__dirname, '../../ARCHITECTURE_DECISION_LOG.md');
  if (fs.existsSync(architectureLog)) filesToIngest.push(architectureLog);

  console.log(`📄 Found ${filesToIngest.length} files for ingestion.`);

  let totalChunks = 0;

  for (const filePath of filesToIngest) {
    console.log(`\nProcessing: ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`);
    const content = fs.readFileSync(filePath, 'utf8');
    const sourceName = path.basename(path.dirname(filePath)); // Use folder name (e.g., prompt-enhancer)
    
    const chunks = await chunkMarkdown(content, sourceName);
    console.log(`   ✂️ Chunked into ${chunks.length} semantic blocks.`);

    if (chunks.length === 0) continue;

    try {
      const texts = chunks.map(c => c.text);
      console.log(`🧠 Embedding ${texts.length} chunks...`);
      const embeddings = await getOpenRouterEmbeddings(texts);
      
      const count = await upsertToPinecone(chunks, embeddings, indexName);
      console.log(`   ✅ Success! Upserted ${count} valid vectors via REST API.`);
      totalChunks += count;
    } catch (err) {
      console.error(`   ❌ Failed to process ${sourceName}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Ingestion Complete! ${totalChunks} discrete intelligence chunks are now globally available in the RAG brain.`);
}

main();
