import json, os

def test_context_windows_valid():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    config_path = os.path.join(base_dir, 'config', 'context_windows.json')
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
        
    assert 'pinecone' in config, "context_windows.json must define 'pinecone'"
    assert 'localSearch' in config, "context_windows.json must define 'localSearch'"
    assert 'contextBudget' in config, "context_windows.json must define 'contextBudget'"
    assert config['localSearch']['endpoint'] == "http://localhost:8085/search", "localSearch endpoint must be port 8085"
