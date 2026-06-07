# Handoff Report: chrome-devtools-mcp Schema & Protocol Violations

## Observation
1. **ToolHive Optimizer Protocol**: In `C:\Users\samue\.gemini\antigravity\worktrees\AIBoyz\swarm-architectural-upgrade-integration\test_scrape.py`, the script invokes `await session.call_tool(...)` directly without first fetching the available tools. The user rule (`mcp_config.json Source of Truth`) explicitly states: *"find_tool() -> call_tool() is the correct invocation pattern. Never call server tools directly. If find_tool() / list_tools() returns 0 tools, check optimizer logs..."*
2. **wait_for schema**: `C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\wait_for.json` defines a required parameter `"text"` which must be an array of strings (`"type": "array", "items": {"type": "string"}`). It does not accept a `"selector"` parameter. The current test script incorrectly sends `{"selector": "h1"}`.
3. **evaluate_script schema**: `C:\Users\samue\.gemini\antigravity\mcp\chrome-devtools-mcp\evaluate_script.json` defines a required parameter `"function"` which expects a JavaScript function declaration string (`"type": "string"`). It does not accept a `"script"` parameter. The test script incorrectly sends `{"script": "document.title"}`.

## Logic Chain
1. **Protocol Violation**: The `toolhive-mcp-optimizer` serves as a meta-proxy. If any downstream ToolHive workload has an empty `transport_type`, the optimizer's Pydantic validation fails and it returns 0 tools. By calling `session.call_tool()` blindly without a preceding `session.list_tools()` (the MCP SDK equivalent of `find_tool()`), the script masks this initialization failure and silently fails. The script must call `session.list_tools()` to verify the tool array is not empty and that the required tools are present before invoking them.
2. **wait_for Violation**: Because `wait_for` uses textual matching rather than DOM selectors, the payload `{"selector": "h1"}` is rejected. To wait for an H1 element on `example.com`, the script must wait for its text, e.g., `{"text": ["Example Domain"]}`.
3. **evaluate_script Violation**: Because `evaluate_script` expects a valid JS function declaration, the bare statement `document.title` is rejected. It must be wrapped in a function, e.g., `{"function": "() => { return document.title; }"}`.

## Caveats
- The script targets `https://example.com`. The `wait_for` payload assumes we can wait for the text `"Example Domain"` instead of the `h1` selector. If text-based waiting is insufficient for the actual task, another tool might be required.
- The `navigate_page` tool call in the script (`{"url": "https://example.com"}`) is valid according to its schema, but should also be gated behind the `list_tools()` check.

## Conclusion
The `test_scrape.py` script must be updated to adhere to the correct payload logic and invocation pattern:

**1. Invocation Pattern (find_tool -> call_tool):**
```python
# Discover tools to validate optimizer health
tools_response = await session.list_tools()
if not tools_response.tools:
    raise RuntimeError("list_tools() returned 0 tools! Check toolhive-mcp-optimizer logs for Pydantic validation errors.")

tool_names = [t.name for t in tools_response.tools]
if "wait_for" not in tool_names or "evaluate_script" not in tool_names:
    raise RuntimeError("Required tools not discovered in the proxy.")
```

**2. Correct Payloads:**
```python
# wait_for
wait_res = await session.call_tool("wait_for", {"text": ["Example Domain"]})

# evaluate_script
eval_res = await session.call_tool("evaluate_script", {"function": "() => { return document.title; }"})
eval_dom = await session.call_tool("evaluate_script", {"function": "() => { return document.documentElement.outerHTML.length; }"})
```

## Verification Method
1. Modify `test_scrape.py` with the proposed changes.
2. Run `python test_scrape.py`.
3. If the script succeeds without schema validation errors and returns the title `"Example Domain"` and the correct DOM length, the payloads are correct. If it correctly raises a `RuntimeError` when `toolhive-mcp-optimizer` is misconfigured, the `find_tool()` protocol is verified.
