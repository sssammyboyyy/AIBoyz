import asyncio
import sys

try:
    from mcp.client.sse import sse_client
    from mcp.client.session import ClientSession
except ImportError:
    print("mcp package is not installed.")
    sys.exit(1)

async def run_test():
    server_url = "http://localhost:61514/mcp"
    print(f"Connecting to {server_url} ...")
    
    try:
        async with sse_client(server_url) as streams:
            read_stream, write_stream = streams
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                
                tools = await session.list_tools()
                for t in tools.tools:
                    print(f"Tool: {t.name}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())
