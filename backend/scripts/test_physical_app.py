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
    print(f"Connecting to live WebView at: {ws_url}")

    async with websockets.connect(ws_url) as ws:
        await cdp_call(ws, "Runtime.enable", req_id=10)

        # Detailed evaluation script to extract real runtime React & DOM values
        expr = """
        (() => {
          const userStr = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          const user = userStr ? JSON.parse(userStr) : null;
          
          // Check DOM elements
          const cards = Array.from(document.querySelectorAll('.card')).map(c => ({
            className: c.className,
            innerText: c.innerText.slice(0, 150)
          }));

          const bluePromptEl = document.querySelector('.card.p-6.bg-blue-50');
          const amberRatingEl = document.querySelector('.card.p-6.bg-amber-50');

          const bodyText = document.body.innerText;
          const isLoginPage = bodyText.includes('Iniciar sesión') || bodyText.includes('Ingresá a tu cuenta');

          return {
            href: window.location.href,
            pathname: window.location.pathname,
            user: user,
            tokenPresent: !!token,
            isLoginPage: isLoginPage,
            bluePromptElFound: !!bluePromptEl,
            bluePromptText: bluePromptEl ? bluePromptEl.innerText : null,
            bluePromptVisible: bluePromptEl ? (bluePromptEl.offsetWidth > 0 && bluePromptEl.offsetHeight > 0) : false,
            amberRatingElFound: !!amberRatingEl,
            amberRatingText: amberRatingEl ? amberRatingEl.innerText : null,
            amberRatingVisible: amberRatingEl ? (amberRatingEl.offsetWidth > 0 && amberRatingEl.offsetHeight > 0) : false,
            totalCards: cards.length,
            cards: cards,
            fullBodySnippet: bodyText.slice(0, 500)
          };
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": expr, "returnByValue": True}, req_id=1)
        val = r.get("result", {}).get("value", {})
        print("\n==================================================")
        print("REAL PHYSICAL PHONE RUNTIME INSPECTION RESULT:")
        print("==================================================")
        print(json.dumps(val, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
