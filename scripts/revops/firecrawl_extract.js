// scripts/revops/firecrawl_extract.js
const fs = require('fs');
const path = require('path');

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

async function main() {
  const args = getArgs();
  const targetUrl = args.url;
  const outputPath = args.output || './tmp/raw_scrape.md';

  if (!targetUrl) {
    console.error('❌ Error: Missing --url parameter.');
    process.exit(1);
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: FIRECRAWL_API_KEY environment variable is not set.');
    process.exit(1);
  }

  console.log(`📡 Requesting API-native crawl from Firecrawl for: ${targetUrl}`);

  try {
    const crawlResponse = await fetch('https://api.firecrawl.dev/v1/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: targetUrl,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown']
        }
      })
    });

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      throw new Error(`Firecrawl API responded with status ${crawlResponse.status}: ${errorText}`);
    }

    const crawlInit = await crawlResponse.json();
    if (!crawlInit.success) {
      throw new Error(`Firecrawl crawl initiation failed: ${JSON.stringify(crawlInit)}`);
    }

    const jobId = crawlInit.id;
    console.log(`⏳ Crawl job initiated with ID: ${jobId}. Polling for completion...`);

    let crawlData = null;
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const statusResponse = await fetch(`https://api.firecrawl.dev/v1/crawl/${jobId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (!statusResponse.ok) {
         throw new Error(`Failed to check crawl status: ${statusResponse.statusText}`);
      }

      const statusJson = await statusResponse.json();
      if (statusJson.status === 'completed') {
        crawlData = statusJson.data;
        break;
      } else if (statusJson.status === 'failed' || statusJson.status === 'cancelled' || statusJson.status === 'timeout') {
        throw new Error(`Crawl job failed or was cancelled: ${statusJson.error || statusJson.status}`);
      } else {
        console.log(`   Status: ${statusJson.status}...`);
      }
    }

    if (!crawlData || !Array.isArray(crawlData)) {
      throw new Error('Firecrawl returned an invalid data structure.');
    }

    const consolidatedMarkdown = crawlData.map(page => {
      const url = page.metadata?.sourceURL || page.url || 'Unknown URL';
      const md = page.markdown || '';
      return `\n\n--- PAGE: ${url} ---\n\n${md}`;
    }).join('\n');

    if (!consolidatedMarkdown.trim()) {
      throw new Error('Firecrawl returned an empty markdown payload across all crawled pages.');
    }

    // Ensure directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, consolidatedMarkdown, 'utf8');
    
    console.log(`✅ Success! Consolidated crawl intelligence secured at: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Data Acquisition Failed: ${error.message}`);
    process.exit(1);
  }
}

main();