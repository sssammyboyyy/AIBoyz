const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');

function loadEnv() {
  let envPath = path.resolve(__dirname, '../../../.env.local');
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(__dirname, '../../../.env.local.txt');
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

async function chunkMarkdown(text, sourceName) {
  const rawChunks = text.split(/\n(?=##?\s)/);
  const chunks = rawChunks.map((chunk, index) => {
    return {
      id: `${sourceName.replace(/[^a-zA-Z0-9-]/g, '-')}-chunk-${Date.now()}-${index}`,
      text: chunk.trim(),
      metadata: {
        source: sourceName,
        chunk_index: index,
        text: chunk.substring(0, 3000)
      }
    };
  }).filter(c => c.text.length > 20);

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) return chunks;

  // Contextual Retrieval Pass
  const enhancedChunks = await Promise.all(chunks.map(async (chunk) => {
    try {
      const prompt = `You are a context extraction engine. Here is a full document, followed by a specific chunk from that document.
Your task: Provide a succinct, 50-word context summary that situates this specific chunk within the broader document. Do NOT output anything other than the summary.

<document>
${text.substring(0, 15000)}
</document>

<chunk>
${chunk.text}
</chunk>`;

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

      if (response.ok) {
        const result = await response.json();
        const summary = result.choices[0].message.content.trim();
        chunk.text = `[CONTEXT: ${summary}]\n\n${chunk.text}`;
      }
    } catch (e) {
      // Fallback to original text on failure
    }
    return chunk;
  }));

  return enhancedChunks;
}

async function getOpenRouterEmbeddings(texts, model = 'qwen/qwen3-embedding-8b') {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) throw new Error("Missing OPENROUTER_API_KEY");

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: model, input: texts })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter Embedding failed: ${errText}`);
  }

  const result = await response.json();
  if (!result.data || result.data.length === 0) {
    throw new Error("Invalid embedding response");
  }

  return result.data.map(d => d.embedding);
}

async function upsertToPinecone(chunks, embeddings, indexName = 'antigravity-brain') {
  const pineconeKey = process.env.PINECONE_KEY || process.env.PINECONE_API_KEY;
  if (!pineconeKey) throw new Error("Missing PINECONE_KEY in .env.local");

  const pc = new Pinecone({ apiKey: pineconeKey });
  
  const listData = await pc.listIndexes();
  const targetIndex = listData.indexes.find(i => i.name === indexName);
  if (!targetIndex || !targetIndex.host) {
    throw new Error("Could not determine Pinecone host for index: " + indexName);
  }

  const vectors = chunks.map((chunk, i) => ({
    id: chunk.id,
    values: embeddings[i],
    metadata: chunk.metadata
  }));

  const validVectors = vectors.filter(v => v.values && v.values.length > 0);
  if (validVectors.length === 0) throw new Error("No valid vectors to upsert.");

  const response = await fetch(`https://${targetIndex.host}/vectors/upsert`, {
    method: 'POST',
    headers: {
      'Api-Key': pineconeKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ vectors: validVectors })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pinecone Upsert failed: ${errText}`);
  }

  return validVectors.length;
}

module.exports = {
  loadEnv,
  chunkMarkdown,
  getOpenRouterEmbeddings,
  upsertToPinecone
};
