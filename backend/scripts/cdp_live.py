import json
import asyncio
import urllib.request
import websockets

async def cdp_call(ws, method, params=None, req_id=1):
    msg = {"id": req_id, "method": method}
    if params:
        msg["params"] = params
    await ws.send(json.dumps(msg))
    
    while True:
        raw = await ws.recv()
        data = json.loads(raw)
        if data.get("id") == req_id:
            return data.get("result")

async def main():
    res = urllib.request.urlopen("http://127.0.0.1:9222/json/list")
    pages = json.loads(res.read().decode())
    ws_url = pages[0]["webSocketDebuggerUrl"]
    print(f"Connecting to: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        # Enable Runtime console logs
        await cdp_call(ws, "Runtime.enable", req_id=10)
        
        # Get current location & local storage state
        expr1 = """
        ({
            href: location.href,
            userRaw: localStorage.getItem('user'),
            token: localStorage.getItem('token'),
            session: sessionStorage.length
        })
        """
        r1 = await cdp_call(ws, "Runtime.evaluate", {"expression": expr1, "returnByValue": True}, req_id=1)
        print("--- CURRENT APP STATE ---")
        print(json.dumps(r1.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
