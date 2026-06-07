import json, os

def test_design_json_valid():
    # Locate design.json relative to this test file
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    design_path = os.path.join(base_dir, 'design.json')
    with open(design_path, 'r', encoding='utf-8') as f:
        json.load(f)
