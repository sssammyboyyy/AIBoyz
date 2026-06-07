import json, os

def test_mcp_config_valid():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    mcp_path = os.path.join(base_dir, 'mcp_config.json')
    
    with open(mcp_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
        
    assert 'scraper' in config, "mcp_config.json must define a 'scraper' key"
    assert config['scraper'].get('type') == 'native-mcp', "scraper type must be 'native-mcp'"
    assert config['scraper'].get('server') == 'chrome-devtools-mcp', "scraper server must be 'chrome-devtools-mcp'"
