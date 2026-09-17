import json
import urllib.request
import asyncio
import sys

try:
    import websockets
except ImportError:
    print("websockets module not installed")
    sys.exit(1)

async def run():
    res = urllib.request.urlopen("http://127.0.0.1:9222/json/list")
    pages = json.loads(res.read().decode())
    print("Pages found:", json.dumps(pages, indent=2))
    
    if not pages:
        print("No pages found")
        return

    ws_url = pages[0].get("webSocketDebuggerUrl")
    if not ws_url:
        print("No webSocketDebuggerUrl found")
        return

    print("Connecting to websocket:", ws_url)
    async with websockets.connect(ws_url) as ws:
        # Evaluate JavaScript on the page
        expr = """
        (() => {
          return {
            url: window.location.href,
            title: document.title,
            localStorageUser: localStorage.getItem('user'),
            solicitudInDOM: !!document.querySelector('.card'),
            bodyText: document.body.innerText.slice(0, 300)
          };
        })()
        """
        req = {
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": expr,
                "returnByValue": True
            }
        }
        await ws.send(json.dumps(req))
        resp = await ws.recv()
        print("CDP Result:", json.dumps(json.loads(resp), indent=2))

if __name__ == "__main__":
    asyncio.run(run())
