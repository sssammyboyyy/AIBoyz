const fs = require('fs');
const path = require('path');
const { loadEnv, chunkMarkdown, getOpenRouterEmbeddings, upsertToPinecone } = require('./lib/rag_engine');

async function main() {
  loadEnv();

  const filePath = process.argv[2];
  let tagsStr = 'success';
  const tagsIndex = process.argv.indexOf('--tags');
  if (tagsIndex !== -1 && process.argv[tagsIndex + 1]) {
    tagsStr = process.argv[tagsIndex + 1];
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error("❌ Auto-Archiver Error: File not found.");
    console.error("Usage: node auto_archive.js <file_path> [--tags \"success, architecture\"]");
    process.exit(1);
  }

  console.log(`\n📦 [AUTO-ARCHIVER] Triggered for: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceName = `${path.basename(path.dirname(filePath))}_${path.basename(filePath)}`;
  
  const chunks = await chunkMarkdown(content, sourceName);
  console.log(`   ✂️ Chunked into ${chunks.length} blocks.`);

  if (chunks.length === 0) {
    console.log("   ⚠️ File too small or empty, skipping.");
    return;
  }

  // Inject tags into metadata
  chunks.forEach(c => c.metadata.tags = tagsStr);

  try {
    const texts = chunks.map(c => c.text);
    console.log(`   🧠 Computing math vectors via Qwen-3...`);
    const embeddings = await getOpenRouterEmbeddings(texts);
    
    console.log(`   🌲 Uploading to Pinecone database...`);
    const count = await upsertToPinecone(chunks, embeddings);
    console.log(`   ✅ Successfully archived ${count} discrete intelligence nodes.`);
  } catch (err) {
    console.error(`   ❌ Archive failed: ${err.message}`);
  }
}

main();
