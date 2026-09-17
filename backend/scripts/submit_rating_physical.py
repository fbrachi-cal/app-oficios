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

        # Find 5 star buttons inside rating card and click the 5th star, then click Enviar calificación
        submit_script = """
        (async () => {
          const ratingCard = document.querySelector('.card.p-6.bg-amber-50');
          if (!ratingCard) return { status: "NO_RATING_CARD" };

          const starBtns = ratingCard.querySelectorAll('button');
          if (starBtns.length >= 5) {
            starBtns[4].click(); // Click 5th star
          } else {
            // Or star icons
            const svgs = ratingCard.querySelectorAll('svg');
            if (svgs.length >= 5) {
              svgs[4].parentElement.click();
            }
          }

          await new Promise(r => setTimeout(r, 600));

          const submitBtn = Array.from(ratingCard.querySelectorAll('button')).find(b => b.innerText.includes('Enviar calificación'));
          if (submitBtn) {
            submitBtn.click();
            return { status: "RATING_SUBMIT_CLICKED" };
          }

          return { status: "SUBMIT_BTN_NOT_FOUND_IN_CARD" };
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": submit_script, "awaitPromise": True, "returnByValue": True}, req_id=1)
        print("Submit action result:", r.get("result", {}).get("value"))

        # Wait 3 seconds for API call & navigation to /actividad
        await asyncio.sleep(3.0)

        check_script = """
        (() => {
          return {
            href: window.location.href,
            pathname: window.location.pathname,
            bodySnippet: document.body.innerText.slice(0, 400)
          };
        })()
        """
        r_after = await cdp_call(ws, "Runtime.evaluate", {"expression": check_script, "returnByValue": True}, req_id=2)
        print("\n--- PAGE STATE AFTER RATING SUBMISSION ---")
        print(json.dumps(r_after.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
