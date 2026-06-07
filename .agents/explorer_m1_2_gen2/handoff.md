# Architecture Integration & Schema Validation Handoff

## 1. Observation
1. **Schema: `wait_for`** (`C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\wait_for.json`)
   - Requires a `"text"` property.
   - `"text"` must be an array of strings (`"items": {"type": "string"}`, `"minItems": 1`).
   - Does *not* contain a `"selector"` property.
2. **Schema: `evaluate_script`** (`C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\evaluate_script.json`)
   - Requires a `"function"` property.
   - `"function"` must be a string representing a JavaScript function declaration (e.g., `() => { return document.title; }`).
   - Does *not* contain a `"script"` property.
3. **Current Test Script Implementation** (`test_scrape.py`)
   - Contains direct, non-proxied MCP tool calls:
     - `await session.call_tool("navigate_page", {"url": "https://example.com"})`
     - `await session.call_tool("wait_for", {"selector": "h1"})` *(Invalid schema)*
     - `await session.call_tool("evaluate_script", {"script": "document.title"})` *(Invalid schema)*
4. **Protocol Constraint (`toolhive-mcp-optimizer`)**
   - Universal rule states: `find_tool() -> call_tool()` is the correct invocation pattern because the optimizer operates as a meta-server that proxies other tools. Directly calling underlying tools (like `navigate_page`) bypasses this design.

## 2. Logic Chain
- Because `test_scrape.py` passes `{"selector": "h1"}` to `wait_for`, it violates the `chrome-devtools-mcp` schema. It must pass an array of text, such as `{"text": ["Example Domain"]}`.
- Because `test_scrape.py` passes `{"script": "document.title"}` to `evaluate_script`, it violates the schema. It must pass a JS function declaration, such as `{"function": "() => { return document.title; }"}`.
- Because `test_scrape.py` calls underlying tools directly via the MCP `session.call_tool(tool_name, ...)` primitive, it violates the `toolhive-mcp-optimizer` proxy pattern. The script must be updated to either use the Python `toolhive` SDK or wrap the calls in the optimizer's `find_tool` and `call_tool` MCP endpoints.

## 3. Caveats
- Since this investigation is read-only and no commands were executed to dynamically inspect installed Python packages, the `toolhive` package SDK syntax in the proposed solution relies on standard SDK semantics. 
- If the `toolhive` Python SDK is missing or not intended to be used, the explicit MCP wrapping approach (`session.call_tool("find_tool", ...)`) should be implemented instead. 

## 4. Conclusion
To pass the architectural gate, `test_scrape.py` must be refactored to correct the payload schemas and adhere to the `toolhive-mcp-optimizer` protocol. 

**Proposed Payload Corrections:**
- `wait_for` payload: `{"text": ["Example Domain"]}` (or other expected on-page text)
- `evaluate_script` payload (title): `{"function": "() => { return document.title; }"}`
- `evaluate_script` payload (DOM length): `{"function": "() => { return document.documentElement.outerHTML.length; }"}`

**Proposed Invocation Pattern Corrections (Choose One):**

**Option A: Using Explicit MCP Proxy Tools (No new dependencies)**
```python
# 1. Find the tool
await session.call_tool("find_tool", {"name": "navigate_page"})

# 2. Call the tool
await session.call_tool("call_tool", {
    "name": "navigate_page", 
    "arguments": {"url": "https://example.com"}
})
```

**Option B: Using Python `toolhive` SDK**
```python
from toolhive import ToolHive

client = ToolHive(url="http://localhost:61514/mcp")
nav_tool = client.find_tool(name="navigate_page")
nav_res = nav_tool.call(url="https://example.com")
```

## 5. Verification Method
1. The implementer should apply the proposed payload and protocol corrections to `test_scrape.py`.
2. Execute the test using `python test_scrape.py`.
3. Success is verified when the script successfully outputs the `document.title` and DOM length without encountering MCP schema validation errors or failing the `toolhive-mcp-optimizer` proxy routing.
