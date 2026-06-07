import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    # Configure the MCP server connection to chrome-devtools-mcp
    server_params = StdioServerParameters(
        command="npx",
        args=["-y", "chrome-devtools-mcp@latest"]
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            print("1. Navigating to rich media site...")
            await session.call_tool("navigate_page", {
                "url": "https://www.youtube.com",
                "waitUntil": "networkidle"
            })
            
            print("2. Waiting for DOM elements...")
            await session.call_tool("wait_for", {
                "selector": "video"
            })
            
            print("3. Evaluating script to extract multimedia info...")
            result = await session.call_tool("evaluate_script", {
                "script": "Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc)"
            })
            print("Video sources:", result)
            
            print("4. Taking screenshot...")
            screenshot = await session.call_tool("take_screenshot", {
                "fullPage": True
            })
            print("Screenshot captured successfully.")

if __name__ == "__main__":
    asyncio.run(main())
