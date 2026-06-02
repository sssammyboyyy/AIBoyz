const { fetchScreenshot } = require('../utils/visual_extractor');
const { VISION_EXTRACTION_PROMPT, TEXT_UI_GENERATION_PROMPT } = require('./vlm_prompts');

async function generateRedesignMockup(auditData, scrapedMarkdown, targetUrl) {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) throw new Error('Missing OPENROUTER_API_KEY');

  // 1. Get Screenshot
  const screenshotUrl = await fetchScreenshot(targetUrl);
  let spatialMap = "{}";

  // 2. VLM STAGE: Spatial Extraction (Qwen-VL)
  if (screenshotUrl) {
    console.log(`👁️ VLM STAGE: Analyzing spatial layout with qwen/qwen-2.5-vl-72b-instruct:free...`);
    const vlmResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen-2.5-vl-72b-instruct:free',
        messages: [{
          role: 'user',
          content: [
            { type: "text", text: VISION_EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: screenshotUrl } }
          ]
        }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });
    if (vlmResponse.ok) {
      const vlmData = await vlmResponse.json();
      spatialMap = vlmData.choices[0].message.content.trim();
    }
  }

  // 3. TEXT STAGE: UI JSON Generation (GPT-OSS-120B)
  console.log(`🧠 TEXT STAGE: Synthesizing Next.js Mockup Schema with openai/gpt-oss-120b:free...`);
  const userContent = `[AUDIT JSON]: ${JSON.stringify(auditData)}\n\n[LEGACY MARKDOWN]: ${scrapedMarkdown}\n\n[SPATIAL MAP]: ${spatialMap}`;
  
  const textResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b:free',
      messages: [
        { role: 'system', content: TEXT_UI_GENERATION_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.1,
      max_tokens: 8000
    })
  });

  if (!textResponse.ok) throw new Error("Text Stage Failed.");
  const textData = await textResponse.json();
  const rawJson = textData.choices[0].message.content.trim().replace(/^```(json)?\s*/, '').replace(/\s*```$/, '');
  
  console.log("✅ Phase 2 Mockup Schema generated successfully!");
  return JSON.parse(rawJson);
}

module.exports = { generateRedesignMockup };
