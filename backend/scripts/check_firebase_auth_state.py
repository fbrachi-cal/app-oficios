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

    async with websockets.connect(ws_url) as ws:
        await cdp_call(ws, "Runtime.enable", req_id=10)

        # Inspect window/firebase auth state and catch errors in responderVerificacion
        check_script = """
        (async () => {
          const logs = [];
          
          // Capture global window errors & unhandled rejections
          window.addEventListener('error', (e) => logs.push({ type: 'window_error', msg: e.message, filename: e.filename, lineno: e.lineno }));
          window.addEventListener('unhandledrejection', (e) => logs.push({ type: 'unhandled_rejection', reason: String(e.reason), stack: e.reason ? e.reason.stack : null }));

          const yesBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sí');
          if (!yesBtn) return { status: "NO_YES_BTN" };

          // Trigger click
          yesBtn.click();
          
          // Wait 2 seconds
          await new Promise(r => setTimeout(r, 2000));
          
          return {
            status: "CLICKED_AND_WAITED",
            logs: logs,
            bodyText: document.body.innerText.slice(0, 400)
          };
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": check_script, "awaitPromise": True, "returnByValue": True}, req_id=1)
        print("\n--- UNHANDLED REJECTIONS / ERRORS CAPTURED ---")
        print(json.dumps(r.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
