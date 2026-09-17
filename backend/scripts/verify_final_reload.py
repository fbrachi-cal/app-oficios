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

        # Navigate back to request ISenN7C0bCYkOuWryhka
        nav_script = """
        (() => {
          window.history.pushState({}, '', '/solicitud/ISenN7C0bCYkOuWryhka');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return window.location.href;
        })()
        """
        await cdp_call(ws, "Runtime.evaluate", {"expression": nav_script, "returnByValue": True}, req_id=1)

        # Wait 3 seconds for request detail reload
        await asyncio.sleep(3.0)

        check_script = """
        (() => {
          const promptCard = document.querySelector('.card.p-6.bg-blue-50');
          const ratingCard = document.querySelector('.card.p-6.bg-amber-50');
          const statusBadge = document.querySelector('.badge');
          
          return {
            href: window.location.href,
            statusBadgeText: statusBadge ? statusBadge.innerText : null,
            promptCardFound: !!promptCard,
            ratingCardFound: !!ratingCard,
            fullBodySnippet: document.body.innerText.slice(0, 400)
          };
        })()
        """
        r_final = await cdp_call(ws, "Runtime.evaluate", {"expression": check_script, "returnByValue": True}, req_id=2)
        print("\n==================================================")
        print("FINAL VERIFICATION AFTER RATING PERSISTENCE:")
        print("==================================================")
        print(json.dumps(r_final.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
