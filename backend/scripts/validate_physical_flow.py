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

        # 1. Reload request page to fetch updated Firestore/API data
        reload_script = """
        (() => {
          window.location.reload();
          return "RELOADED";
        })()
        """
        await cdp_call(ws, "Runtime.evaluate", {"expression": reload_script, "returnByValue": True}, req_id=1)
        
        # Wait 3 seconds for page reload & API fetch
        await asyncio.sleep(3.0)

        # 2. Inspect state after reload
        inspect_script = """
        (() => {
          const bodyText = document.body.innerText;
          const modalCalifica = document.querySelector('.fixed.inset-0.z-50') || Array.from(document.querySelectorAll('div')).find(d => d.className && d.className.includes('fixed') && d.innerText.includes('Calificá'));
          const ratingFormInPage = document.querySelector('.card.p-6.bg-amber-50');
          const promptCard = document.querySelector('.card.p-6.bg-blue-50');

          const starBtns = Array.from(document.querySelectorAll('svg')).filter(s => s.parentElement && (s.parentElement.tagName === 'BUTTON' || s.parentElement.classList.contains('cursor-pointer')));

          return {
            href: window.location.href,
            promptCardFound: !!promptCard,
            modalCalificaFound: !!modalCalifica,
            modalCalificaText: modalCalifica ? modalCalifica.innerText : null,
            ratingFormInPageFound: !!ratingFormInPage,
            ratingFormText: ratingFormInPage ? ratingFormInPage.innerText : null,
            totalStarIcons: starBtns.length,
            bodySnippet: bodyText.slice(0, 500)
          };
        })()
        """

        r = await cdp_call(ws, "Runtime.evaluate", {"expression": inspect_script, "returnByValue": True}, req_id=2)
        val = r.get("result", {}).get("value", {})
        print("\n==================================================")
        print("AFTER RELOAD INSPECTION ON PHYSICAL PHONE:")
        print("==================================================")
        print(json.dumps(val, indent=2, ensure_ascii=False))

        # 3. Click the 5th star (rating 5) and submit rating
        submit_rating_script = """
        (async () => {
          // Find star rating buttons
          const stars = Array.from(document.querySelectorAll('svg')).filter(s => s.parentElement && s.parentElement.tagName === 'BUTTON');
          // Or clickable star icons inside FormCalificacion
          const starContainer = document.querySelector('.flex.justify-center.gap-2') || document.querySelector('.flex.gap-2');
          
          let clickedStar = false;
          if (starContainer) {
            const starButtons = starContainer.querySelectorAll('button');
            if (starButtons.length >= 5) {
              starButtons[4].click(); // Click 5th star
              clickedStar = true;
            }
          }

          await new Promise(r => setTimeout(r, 500));

          // Find Submit Rating button
          const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Enviar calificación'));
          if (submitBtn) {
            submitBtn.click();
            return { status: "RATING_SUBMITTED", clickedStar: clickedStar };
          }

          return { status: "SUBMIT_BTN_NOT_FOUND", clickedStar: clickedStar };
        })()
        """

        r_sub = await cdp_call(ws, "Runtime.evaluate", {"expression": submit_rating_script, "awaitPromise": True, "returnByValue": True}, req_id=3)
        print("\n--- RATING SUBMISSION RESULT ---")
        print(json.dumps(r_sub.get("result", {}).get("value"), indent=2, ensure_ascii=False))

        # Wait 3 seconds
        await asyncio.sleep(3.0)

        # 4. Final state check after rating submission
        final_check_script = """
        (() => {
          return {
            href: window.location.href,
            pathname: window.location.pathname,
            bodySnippet: document.body.innerText.slice(0, 400)
          };
        })()
        """
        r_final = await cdp_call(ws, "Runtime.evaluate", {"expression": final_check_script, "returnByValue": True}, req_id=4)
        print("\n--- FINAL PAGE STATE AFTER RATING ---")
        print(json.dumps(r_final.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
