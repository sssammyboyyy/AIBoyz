import os
import subprocess
import json

def test_prompt_cache():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    script_path = os.path.join(base_dir, 'scripts', 'prompt_cache.js')
    
    # We create a small node wrapper to test the cache
    test_wrapper = """
    const { getOrGenerate } = require('./scripts/prompt_cache.js');
    async function runTest() {
        let callCount = 0;
        const generator = async () => {
            callCount++;
            return { result: 'hello world', called: callCount };
        };
        const res1 = await getOrGenerate('test-key', {model: 'test'}, 60000, generator);
        const res2 = await getOrGenerate('test-key', {model: 'test'}, 60000, generator);
        console.log(JSON.stringify({res1, res2}));
    }
    runTest().catch(err => { console.error(err); process.exit(1); });
    """
    
    # Run the wrapper
    result = subprocess.run(
        ["node", "-e", test_wrapper],
        cwd=base_dir,
        capture_output=True,
        text=True
    )
    
    assert result.returncode == 0, f"Node script failed: {result.stderr}"
    
    try:
        output = json.loads(result.stdout.strip())
        assert output['res1']['called'] == 1, "First call should execute generator"
        # The second call should pull from cache, so 'called' remains 1 in the cached result
        assert output['res2']['called'] == 1, "Second call should return cached result"
    except json.JSONDecodeError:
        assert False, f"Failed to parse node output: {result.stdout}"
