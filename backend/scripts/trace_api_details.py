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

        # Hook fetch to log detailed request & response headers & bodies
        hook_script = """
        (() => {
          window.__api_trace = [];
          const origFetch = window.fetch;
          window.fetch = async function(url, opts) {
            const reqLog = { url: String(url), method: opts ? opts.method : 'GET', body: opts ? opts.body : null };
            try {
              const resp = await origFetch.apply(this, arguments);
              const clone = resp.clone();
              let respBody = null;
              try { respBody = await clone.json(); } catch(e){ respBody = await clone.text(); }
              reqLog.status = resp.status;
              reqLog.respBody = respBody;
              window.__api_trace.push(reqLog);
              return resp;
            } catch(err) {
              reqLog.error = String(err);
              window.__api_trace.push(reqLog);
              throw err;
            }
          };

          const yesBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sí');
          if (yesBtn) {
            yesBtn.click();
            return "CLICKED";
          }
          return "BUTTON_NOT_FOUND";
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": hook_script, "returnByValue": True}, req_id=1)
        print("Click triggered:", r.get("result", {}).get("value"))

        # Wait 3 seconds for response
        await asyncio.sleep(3.0)

        get_log = "window.__api_trace"
        r_log = await cdp_call(ws, "Runtime.evaluate", {"expression": get_log, "returnByValue": True}, req_id=2)
        print("\n--- DETAILED API NETWORK TRACE ---")
        print(json.dumps(r_log.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
