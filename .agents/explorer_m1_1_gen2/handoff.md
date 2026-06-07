# Handoff Report: Test Script Schema & Protocol Violations

## Observation
- `C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\wait_for.json` specifies `"text"` as a required parameter (type: array of strings) and `"timeout"` (type: integer). It does not support `"selector"`.
- `C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\evaluate_script.json` specifies `"function"` as a required parameter (type: string, description: "A JavaScript function declaration"). It does not support `"script"`.
- `test_scrape.py` (lines 30, 35, 40) directly calls tools with incorrect parameters: 
  - `session.call_tool("wait_for", {"selector": "h1"})`
  - `session.call_tool("evaluate_script", {"script": "document.title"})`
  - `session.call_tool("evaluate_script", {"script": "document.documentElement.outerHTML.length"})`
- Global protocol explicitly requires the `find_tool() -> call_tool()` pattern to ensure the `toolhive-mcp-optimizer` correctly discovers and proxies tools (referencing the rule: "If find_tool() / list_tools() returns 0 tools..."). The test script currently calls tools without querying the server for available tools.

## Logic Chain
1. The test script will fail schema validation for `wait_for` because it uses `"selector"` instead of `"text"`. To conform to the schema, it must pass an array of strings expected on the page, such as `{"text": ["Example Domain"]}`.
2. The test script will fail schema validation for `evaluate_script` because it uses `"script"` instead of `"function"`. It must wrap the expression in a JS function declaration: `{"function": "() => { return document.title; }"}`.
3. The optimizer requires the tool to be "found" before it is "called" (`find_tool() -> call_tool()`). In the context of the standard python `mcp` SDK used in `test_scrape.py`, this maps to invoking `await session.list_tools()`, finding the tool in the returned list, and *then* invoking `session.call_tool()`. This prevents direct tool invocation and adheres to the proxying protocol.

## Caveats
- I assumed `{"text": ["Example Domain"]}` is appropriate since the test navigates to `https://example.com`.
- I have mapped the `find_tool()` requirement from the rule to the standard `session.list_tools()` method since `test_scrape.py` uses the standard `mcp.client.session` SDK. If a dedicated `toolhive` python package is preferred, the script would need to be refactored to use `from toolhive import ToolHive; hive = ToolHive(); tool = hive.find_tool("...")`.

## Conclusion
The test script `test_scrape.py` must be updated to:
1. Implement the `find_tool()` protocol by calling `tools = await session.list_tools()` and verifying tool presence before execution.
2. Update `wait_for` payload: `{"text": ["Example Domain"]}`.
3. Update `evaluate_script` payloads to valid JS functions: 
   - `{"function": "() => { return document.title; }"}`
   - `{"function": "() => { return document.documentElement.outerHTML.length; }"}`

### Proposed Code Adjustments (for implementer):
```python
# Protocol: find_tool() -> call_tool()
tools = await session.list_tools()
def find_tool(name):
    tool = next((t for t in tools.tools if t.name == name), None)
    if not tool:
        raise RuntimeError(f"Tool {name} not found by optimizer.")
    return tool

find_tool("navigate_page")
nav_res = await session.call_tool("navigate_page", {"url": "https://example.com"})

find_tool("wait_for")
wait_res = await session.call_tool("wait_for", {"text": ["Example Domain"]})

find_tool("evaluate_script")
eval_res = await session.call_tool("evaluate_script", {"function": "() => { return document.title; }"})
eval_dom = await session.call_tool("evaluate_script", {"function": "() => { return document.documentElement.outerHTML.length; }"})
```

## Verification Method
- The Implementer should modify `test_scrape.py` with the proposed changes.
- Run the python script locally (`python test_scrape.py`) and confirm successful execution, verifying that all schema errors are resolved and the optimizer correctly proxies the requests.
