# Handoff Report: Scraping Architecture (R1) - searxng vs chrome-devtools-mcp

## 1. Observation
- `searxng` is a Docker-based metasearch engine aggregator. It retrieves aggregated search results via APIs or HTML parsing of search engines, but does not natively evaluate JavaScript or interact with arbitrary rich DOM structures on specific target web pages.
- `chrome-devtools-mcp` connects to the local browser (e.g., Brave via CDP) and exposes tools like `evaluate_script`, `wait_for`, `list_network_requests`, and `take_screenshot`.
- The user constraints specify "Zero-cost reliability" and targeting "Rich DOM structures and multimedia".
- The user rules dictate "Universal Alignment Protocol: Browser: Brave (Default Profile) is the exclusive research environment".

## 2. Logic Chain
1. **Rich DOM Rendering**: Modern web pages and SPAs require JavaScript execution to hydrate the DOM. `searxng` cannot execute JS on arbitrary target sites. `chrome-devtools-mcp` connects to an actual browser, natively rendering React/Vue/Angular sites.
2. **Multimedia Extraction**: Multimedia (videos, dynamic images, audio) is often loaded asynchronously via XHR/Fetch or WebSockets. `searxng` cannot capture these. `chrome-devtools-mcp` can use `list_network_requests` to intercept media URLs (e.g., m3u8 playlists or mp4 files) directly from the network tab.
3. **Zero-Cost Reliability**: Running a `searxng` Docker container requires infrastructure, and reliably scraping search engines without getting blocked requires paid proxies. Using `chrome-devtools-mcp` with the user's default Brave profile inherently bypasses most bot-protection mechanisms (like Cloudflare Turnstile) without proxy costs, achieving true zero-cost reliability.
4. **Alignment**: Using `chrome-devtools-mcp` with Brave directly fulfills the Universal Alignment Protocol's exclusive research environment rule.

## 3. Caveats
- `chrome-devtools-mcp` relies on the host machine running the browser. It cannot easily scale to hundreds of parallel instances without consuming significant local RAM.
- Headless vs. Headful: Bypassing advanced bot protection often requires running the browser headful (visible), which might temporarily interrupt the user if it steals focus, though background tabs can mitigate this.

## 4. Conclusion
**Winner: `chrome-devtools-mcp`**. It is definitively the best choice for the Scraping Architecture (R1). It natively handles rich DOM and multimedia extraction via Chrome DevTools Protocol, guarantees zero-cost reliability by leveraging the user's local Brave profile (bypassing bot-detection), and perfectly aligns with the Universal Alignment Protocol.

## 5. Configuration & Implementation

### `mcp_config.json` Configuration
No direct entry is required for `chrome-devtools-mcp` in `mcp_config.json`. According to the ToolHive Operational Protocol, it is proxied via the `toolhive-mcp-optimizer`. 
Ensure `mcp_config.json` contains:
```json
{
  "mcpServers": {
    "toolhive-mcp-optimizer": {
      "serverUrl": "http://localhost:61514/mcp"
    }
  }
}
```
If a standalone fallback is ever needed, it could be registered as:
```json
"chrome-devtools": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
}
```

### Programmatic Test Script
The following Python script outlines how the workflow orchestrates `chrome-devtools-mcp` to scrape a rich DOM and extract multimedia URLs.

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Pseudo-code for interacting with the MCP via stdio_client
async def test_scrape():
    # In practice, connect via the toolhive-mcp-optimizer SSE endpoint or direct stdio
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-puppeteer"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # 1. Open a new page
            page_res = await session.call_tool("new_page", {"url": "https://example-rich-media.com"})
            
            # 2. Wait for the rich DOM to load a specific element
            await session.call_tool("wait_for", {"selector": ".video-player-container", "timeout": 10000})
            
            # 3. Extract Rich DOM content
            dom_data = await session.call_tool("evaluate_script", {
                "script": "document.querySelector('.video-player-container').innerText"
            })
            print(f"Extracted DOM: {dom_data}")
            
            # 4. Extract Multimedia from Network Requests
            network_reqs = await session.call_tool("list_network_requests", {})
            media_urls = [
                req['url'] for req in network_reqs['requests'] 
                if req['url'].endswith(('.mp4', '.m3u8', '.jpg', '.png'))
            ]
            print(f"Captured Media URLs: {media_urls}")
            
            # 5. Cleanup
            await session.call_tool("close_page", {})

if __name__ == "__main__":
    asyncio.run(test_scrape())
```

## 6. Verification Method
1. Run the test script or use the `find_tool` / `call_tool` sequence in Antigravity to invoke `new_page`, `wait_for`, `evaluate_script`, and `list_network_requests`.
2. Target a JavaScript-heavy SPA (e.g., YouTube or a React-based image gallery).
3. Confirm that `evaluate_script` successfully returns dynamically rendered DOM elements and `list_network_requests` captures the actual media stream URLs.
