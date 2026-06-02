// scripts/utils/visual_extractor.js
// Zero-dependency serverless screenshot fetcher and native binary validator.

async function fetchScreenshot(targetUrl) {
  console.log(`📸 Routing to Microlink for serverless screenshot of ${targetUrl}...`);
  
  const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false`;
  try {
    // Step 1: Fetch from Microlink to get the JSON payload containing the image URL
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Microlink capture failed.");
    const data = await response.json();
    
    if (!data.data || !data.data.screenshot || !data.data.screenshot.url) {
      throw new Error("Invalid Microlink response structure.");
    }
    
    const imageUrl = data.data.screenshot.url;
    return imageUrl; 
  } catch (err) {
    console.error("❌ Visual extraction failed:", err.message);
    return null;
  }
}

async function validateMagicNumbers(imageUrl) {
  try {
    const response = await fetch(imageUrl, { headers: { Range: 'bytes=0-11' } });
    if (!response.ok) return false;
    const buffer = Buffer.from(await response.arrayBuffer());
    const hex = buffer.toString('hex').toUpperCase();
    if (hex.startsWith('FFD8FF') || hex.startsWith('89504E47') || hex.startsWith('52494646')) return true;
    return false;
  } catch (error) {
    return false;
  }
}

module.exports = { fetchScreenshot, validateMagicNumbers };
