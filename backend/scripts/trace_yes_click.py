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
        # Enable Runtime, Network, and Console domains
        await cdp_call(ws, "Runtime.enable", req_id=10)
        await cdp_call(ws, "Network.enable", req_id=11)

        # 1. Inspect DOM before click
        script_before = """
        (() => {
          const yesBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sí');
          const modalCalificaBefore = document.querySelector('.fixed.inset-0');
          return {
            yesBtnFound: !!yesBtn,
            yesBtnDisabled: yesBtn ? yesBtn.disabled : null,
            modalCalificaBefore: !!modalCalificaBefore
          };
        })()
        """
        r_before = await cdp_call(ws, "Runtime.evaluate", {"expression": script_before, "returnByValue": True}, req_id=1)
        print("--- BEFORE CLICK ---")
        print(json.dumps(r_before.get("result", {}).get("value"), indent=2))

        # 2. Add click handler hook / event monitor and click "Sí"
        click_script = """
        (() => {
          const yesBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Sí');
          if (!yesBtn) return "NO_YES_BTN";
          
          window.__yes_click_log = [];
          
          // Monitor fetch calls
          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            window.__yes_click_log.push({ type: 'fetch_start', url: args[0] });
            try {
              const resp = await origFetch.apply(this, args);
              const clone = resp.clone();
              let body = null;
              try { body = await clone.json(); } catch(e){}
              window.__yes_click_log.push({ type: 'fetch_end', status: resp.status, url: args[0], body: body });
              return resp;
            } catch(err) {
              window.__yes_click_log.push({ type: 'fetch_error', err: String(err) });
              throw err;
            }
          };

          yesBtn.click();
          return "CLICKED";
        })()
        """
        r_click = await cdp_call(ws, "Runtime.evaluate", {"expression": click_script, "returnByValue": True}, req_id=2)
        print("Click result:", r_click.get("result", {}).get("value"))

        # Wait 500ms and check state
        await asyncio.sleep(0.5)

        script_during = """
        (() => {
          const modalEl = document.querySelector('.fixed.inset-0.z-50') || document.querySelector('.fixed.inset-0');
          const stars = document.querySelectorAll('svg');
          return {
            time: '500ms_after_click',
            log: window.__yes_click_log,
            modalElFound: !!modalEl,
            modalClass: modalEl ? modalEl.className : null,
            modalText: modalEl ? modalEl.innerText : null,
            starSvgsFound: stars.length,
            bodySnippet: document.body.innerText.slice(0, 400)
          };
        })()
        """
        r_during = await cdp_call(ws, "Runtime.evaluate", {"expression": script_during, "returnByValue": True}, req_id=3)
        print("\n--- 500ms AFTER CLICK ---")
        print(json.dumps(r_during.get("result", {}).get("value"), indent=2, ensure_ascii=False))

        # Wait 2 seconds (after cargarSolicitud finishes) and check state again
        await asyncio.sleep(2.0)

        script_after = """
        (() => {
          const modalEl = document.querySelector('.fixed.inset-0.z-50') || document.querySelector('.fixed.inset-0') || Array.from(document.querySelectorAll('div')).find(d => d.className && d.className.includes('fixed') && d.className.includes('inset-0'));
          const ratingCard = document.querySelector('.card.p-6.bg-amber-50');
          const promptCard = document.querySelector('.card.p-6.bg-blue-50');
          
          return {
            time: '2500ms_after_click',
            log: window.__yes_click_log,
            modalElFound: !!modalEl,
            modalClass: modalEl ? modalEl.className : null,
            modalText: modalEl ? modalEl.innerText : null,
            ratingCardFound: !!ratingCard,
            ratingCardText: ratingCard ? ratingCard.innerText : null,
            promptCardFound: !!promptCard,
            bodyTextSnippet: document.body.innerText.slice(0, 500)
          };
        })()
        """
        r_after = await cdp_call(ws, "Runtime.evaluate", {"expression": script_after, "returnByValue": True}, req_id=4)
        print("\n--- 2500ms AFTER CLICK ---")
        print(json.dumps(r_after.get("result", {}).get("value"), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
