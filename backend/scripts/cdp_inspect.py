import json
import asyncio
import urllib.request
import websockets

async def cdp_inspect():
    res = urllib.request.urlopen("http://127.0.0.1:9222/json/list")
    pages = json.loads(res.read().decode())
    print(f"Found {len(pages)} WebView targets")
    
    ws_url = pages[0]["webSocketDebuggerUrl"]
    print(f"Connecting to: {ws_url}")
    
    async with websockets.connect(ws_url) as ws:
        # First check current location & user
        script1 = """
        (() => {
          const userStr = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          return {
            href: window.location.href,
            pathname: window.location.pathname,
            hasUser: !!userStr,
            userData: userStr ? JSON.parse(userStr) : null,
            hasToken: !!token
          };
        })()
        """
        await ws.send(json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {"expression": script1, "returnByValue": True}
        }))
        res1 = json.loads(await ws.recv())
        print("\n--- Initial Webview State ---")
        print(json.dumps(res1.get("result", {}).get("value"), indent=2, ensure_ascii=False))

        # Navigate to /solicitud/ISenN7C0bCYkOuWryhka inside the SPA
        nav_script = """
        (() => {
          window.location.hash = '';
          window.history.pushState({}, '', '/solicitud/ISenN7C0bCYkOuWryhka');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return window.location.href;
        })()
        """
        await ws.send(json.dumps({
            "id": 2,
            "method": "Runtime.evaluate",
            "params": {"expression": nav_script, "returnByValue": True}
        }))
        res2 = json.loads(await ws.recv())
        print("\n--- Navigated URL ---", res2.get("result", {}).get("value"))

        # Wait 2 seconds for API load
        await asyncio.sleep(2.5)

        # Inspect DOM and React component state
        inspect_script = """
        (() => {
          const promptEl = document.querySelector('.card.p-6.bg-blue-50');
          const promptText = promptEl ? promptEl.innerText : null;
          const promptVisible = promptEl ? (promptEl.offsetWidth > 0 && promptEl.offsetHeight > 0 && window.getComputedStyle(promptEl).display !== 'none') : false;
          
          const ratingEl = document.querySelector('.card.p-6.bg-amber-50');
          const ratingVisible = ratingEl ? (ratingEl.offsetWidth > 0 && ratingEl.offsetHeight > 0) : false;

          const cards = Array.from(document.querySelectorAll('.card')).map(c => ({
            className: c.className,
            text: c.innerText.slice(0, 100)
          }));

          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;

          return {
            url: window.location.href,
            user: user,
            promptElFound: !!promptEl,
            promptText: promptText,
            promptVisible: promptVisible,
            ratingElFound: !!ratingEl,
            ratingVisible: ratingVisible,
            cardsFound: cards.length,
            cardsSummary: cards
          };
        })()
        """
        await ws.send(json.dumps({
            "id": 3,
            "method": "Runtime.evaluate",
            "params": {"expression": inspect_script, "returnByValue": True}
        }))
        res3 = json.loads(await ws.recv())
        print("\n--- Request Page Inspection Result ---")
        print(json.dumps(res3.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(cdp_inspect())
