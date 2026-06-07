import asyncio
import sys

try:
    from mcp.client.sse import sse_client
    from mcp.client.session import ClientSession
except ImportError:
    print("mcp package is not installed. Please install it using 'pip install mcp'.")
    sys.exit(1)

async def run_test():
    server_url = "http://localhost:61514/mcp"
    print(f"Connecting to {server_url} ...")
    
    try:
        async with sse_client(server_url) as streams:
            read_stream, write_stream = streams
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                print("Connected! Initialized session.")
                
                tools = await session.list_tools()
                def find_tool(name):
                    tool = next((t for t in tools.tools if t.name == name), None)
                    if not tool:
                        raise RuntimeError(f"Tool {name} not found by optimizer.")
                    return tool
                
                # Navigate to example.com
                print("Navigating to https://example.com ...")
                find_tool("navigate_page")
                nav_res = await session.call_tool("navigate_page", {"url": "https://example.com"})
                print("Navigate result:", nav_res.content)
                
                # Wait for the h1 element
                print("Waiting for h1 element...")
                find_tool("wait_for")
                wait_res = await session.call_tool("wait_for", {"text": ["Example Domain"]})
                print("Wait result:", wait_res.content)
                
                # Evaluate script to get the title
                print("Evaluating script to get document title...")
                find_tool("evaluate_script")
                eval_res = await session.call_tool("evaluate_script", {"function": "() => { return document.title; }"})
                print("Title:", eval_res.content)
                
                # Evaluate script to get DOM length to demonstrate rich DOM fetching
                print("Evaluating script to get DOM length...")
                find_tool("evaluate_script")
                eval_dom = await session.call_tool("evaluate_script", {"function": "() => { return document.documentElement.outerHTML.length; }"})
                print("DOM length:", eval_dom.content)
                
                print("Scrape test completed successfully!")
                
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
