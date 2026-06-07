const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '..', 'tmp', 'prompt_cache');

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

function getCacheFilePath(key, config) {
    const hash = crypto.createHash('sha256');
    hash.update(key + JSON.stringify(config));
    return path.join(CACHE_DIR, `${hash.digest('hex')}.json`);
}

function purgeStale(ttl) {
    if (!fs.existsSync(CACHE_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
        const filePath = path.join(CACHE_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > ttl) {
            fs.unlinkSync(filePath);
        }
    }
}

async function getOrGenerate(key, config, ttl, generatorFn) {
    ensureCacheDir();
    purgeStale(ttl);

    const filePath = getCacheFilePath(key, config);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }

    const result = await generatorFn();
    fs.writeFileSync(filePath, JSON.stringify(result));
    return result;
}

module.exports = {
    getOrGenerate,
    purgeStale
};
