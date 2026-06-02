const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const dir = path.resolve(__dirname, '../../GoodShit');
  if (!fs.existsSync(dir)) {
    console.log("GoodShit folder not found!");
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      console.log(`\n--- Processing: ${file} ---`);
      execSync(`node "${path.resolve(__dirname, 'auto_archive.js')}" "${filePath}" --tags "good_shit, legacy_intelligence"`, { stdio: 'inherit' });
    } catch (e) {
      console.error(`Failed to process ${file}`);
    }
  }
}

main();
