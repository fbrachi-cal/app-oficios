import json
import asyncio
import urllib.request
import sys
import websockets

sys.stdout.reconfigure(encoding='utf-8')

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

        # Hook console.error, console.warn, console.log and logger
        intercept_script = """
        (async () => {
          window.__caught_logs = [];
          
          const origConsoleError = console.error;
          console.error = function(...args) {
            window.__caught_logs.push({ type: 'console.error', args: args.map(a => String(a?.stack || a?.message || a)) });
            origConsoleError.apply(console, args);
          };

          const origConsoleWarn = console.warn;
          console.warn = function(...args) {
            window.__caught_logs.push({ type: 'console.warn', args: args.map(a => String(a)) });
            origConsoleWarn.apply(console, args);
          };

          const yesBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sí');
          if (!yesBtn) return { error: "YES_BTN_NOT_FOUND" };

          // Click Yes
          yesBtn.click();
          
          // Wait 3 seconds for async operations
          await new Promise(r => setTimeout(r, 3000));
          
          return {
            caughtLogs: window.__caught_logs,
            bodyText: document.body.innerText.slice(0, 300)
          };
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": intercept_script, "awaitPromise": True, "returnByValue": True}, req_id=1)
        print("\n--- CAUGHT CONSOLE LOGS & ERRORS ---")
        print(json.dumps(r.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
