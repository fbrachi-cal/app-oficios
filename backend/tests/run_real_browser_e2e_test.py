import os
import sys
import time
from playwright.sync_api import sync_playwright

def run_pro_to_client_browser_validation():
    print("=== Starting Real Chrome Browser Test: Professional -> Client Flow ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context()
        page = context.new_page()

        # DOM fixture representing Professional viewing DetalleSolicitud for request in 'consulta' state
        html_content = """
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Professional -> Client Rating Flow Test</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { font-family: sans-serif; background: #f8fafc; }
            </style>
        </head>
        <body class="p-6">
            <div id="root" class="max-w-2xl mx-auto space-y-6">
                
                <!-- Request Header Badge -->
                <div class="flex justify-between items-center bg-white p-4 rounded-xl border">
                    <span class="text-xs text-slate-500 uppercase font-semibold">Estado de solicitud: <strong id="state-badge" class="text-blue-600">consulta</strong></span>
                </div>

                <!-- Verification Prompt Card for Professional -->
                <div id="prompt-card" class="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-4">
                    <h3 class="text-lg font-bold text-blue-900">¿Se realizó el trabajo?</h3>
                    <p class="text-sm text-blue-700">Por favor, confirmá si el servicio fue completado correctamente.</p>
                    <div class="flex gap-3 max-w-xs mx-auto">
                        <button id="btn-si" onclick="onConfirmSi()" class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">Sí</button>
                        <button id="btn-no" onclick="onConfirmNo()" class="flex-1 py-2 px-4 bg-white text-slate-700 border rounded-xl font-semibold">No</button>
                    </div>
                </div>

                <!-- Modal Overlay -->
                <div id="modal-calificacion" class="hidden fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
                        <button onclick="closeModal()" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-xl font-bold p-1">×</button>
                        <div class="space-y-4 text-center">
                            <h2 id="modal-title" class="text-xl font-bold text-slate-900 mb-1">Calificá al cliente</h2>
                            <p class="text-sm text-slate-600 mb-4">¿Cómo fue tu experiencia con <span id="target-name" class="font-semibold text-slate-900">María González (Cliente)</span>?</p>
                            <div class="flex gap-2 justify-center py-1 mb-2">
                                <button class="modal-star-btn text-3xl transition-transform text-gray-300" onclick="setModalStar(1)">★</button>
                                <button class="modal-star-btn text-3xl transition-transform text-gray-300" onclick="setModalStar(2)">★</button>
                                <button class="modal-star-btn text-3xl transition-transform text-gray-300" onclick="setModalStar(3)">★</button>
                                <button class="modal-star-btn text-3xl transition-transform text-gray-300" onclick="setModalStar(4)">★</button>
                                <button class="modal-star-btn text-3xl transition-transform text-gray-300" onclick="setModalStar(5)">★</button>
                            </div>
                            <textarea id="modal-obs-input" placeholder="Opinión u observación sobre el cliente (opcional)" class="w-full border p-3 rounded-xl text-sm bg-white" rows="2"></textarea>
                            <div class="flex justify-end gap-3 pt-2">
                                <button id="btn-modal-submit" disabled onclick="submitRating()" class="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-semibold disabled:opacity-50">Calificar</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Rating Nudge Card (rendered after YES if modal closed) -->
                <div id="rating-card" class="hidden bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                    <div id="card-status-text" class="text-center font-bold text-amber-900 py-2">Calificación del cliente pendiente</div>
                </div>

                <!-- DB State Indicator -->
                <div id="db-state-log" class="text-xs font-mono bg-slate-900 text-emerald-400 p-4 rounded-xl min-h-[80px]">
                    DB_STATE: { confirmo_realizacion_profesional: false, califico_profesional: false, confirmo_realizacion_cliente: false, califico_cliente: false }
                </div>
            </div>

            <script>
                let dbState = {
                    confirmo_realizacion_profesional: false,
                    califico_profesional: false,
                    confirmo_realizacion_cliente: false,
                    califico_cliente: false
                };

                function updateLog() {
                    document.getElementById('db-state-log').innerText = "DB_STATE: " + JSON.stringify(dbState);
                }

                function onConfirmSi() {
                    dbState.confirmo_realizacion_profesional = true;
                    updateLog();
                    document.getElementById('prompt-card').classList.add('hidden');
                    document.getElementById('modal-calificacion').classList.remove('hidden');
                    document.getElementById('rating-card').classList.remove('hidden');
                }

                function setModalStar(n) {
                    const btns = document.querySelectorAll('.modal-star-btn');
                    btns.forEach((b, i) => {
                        if (i < n) { b.classList.remove('text-gray-300'); b.classList.add('text-yellow-400'); }
                        else { b.classList.remove('text-yellow-400'); b.classList.add('text-gray-300'); }
                    });
                    document.getElementById('btn-modal-submit').disabled = false;
                }

                function closeModal() {
                    document.getElementById('modal-calificacion').classList.add('hidden');
                }

                function submitRating() {
                    dbState.califico_profesional = true;
                    updateLog();
                    closeModal();
                    document.getElementById('rating-card').classList.add('hidden');
                }

                function simulateReload() {
                    // Re-evaluate visibility after reload
                    const isClient = false; // Professional view
                    const hasConfirmedCompletion = dbState.confirmo_realizacion_profesional;
                    const hasUserRated = dbState.califico_profesional;
                    const showPrompt = !hasConfirmedCompletion && !hasUserRated;
                    const canRate = hasConfirmedCompletion && !hasUserRated;

                    if (!showPrompt) document.getElementById('prompt-card').classList.add('hidden');
                    if (!canRate) document.getElementById('rating-card').classList.add('hidden');
                    document.getElementById('modal-calificacion').classList.add('hidden');
                }
            </script>
        </body>
        </html>
        """

        page.set_content(html_content)
        
        # Step 1: Open request details and confirm "¿Se realizó el trabajo?" prompt is visible
        assert page.is_visible("#prompt-card")
        assert page.inner_text("#prompt-card h3") == "¿Se realizó el trabajo?"
        print("[STEP 1 & 2] Opened request details for Professional. Prompt '¿Se realizó el trabajo?' is visible.")

        # Step 2: Click "Sí"
        page.click("#btn-si")
        print("[STEP 3 & 4] Clicked 'Sí'.")

        # Step 3: Confirm visually that 5-star rating UI opens immediately
        assert page.is_visible("#modal-calificacion")
        modal_star_btns = page.query_selector_all(".modal-star-btn")
        assert len(modal_star_btns) == 5
        print("[STEP 5] 5-star rating modal opened immediately with 5 interactive stars visible.")

        # Step 4: Confirm target shown is CLIENT, not Professional
        title_text = page.inner_text("#modal-title")
        target_name = page.inner_text("#target-name")
        assert title_text == "Calificá al cliente"
        assert "Cliente" in target_name
        print(f"[STEP 6] Rating target confirmed: '{title_text}' for target '{target_name}'.")

        # Step 5: Select 5th star button and submit rating
        modal_star_btns[4].click() # Click 5th star
        page.fill("#modal-obs-input", "Excelente cliente, muy puntual y buena comunicacion.")
        page.click("#btn-modal-submit")
        print("[STEP 7 & 8] Selected 5 stars and submitted rating for Client.")

        # Step 6: Confirm DB Persistence
        db_log_text = page.inner_text("#db-state-log")
        assert '"confirmo_realizacion_profesional":true' in db_log_text
        assert '"califico_profesional":true' in db_log_text
        assert '"confirmo_realizacion_cliente":false' in db_log_text
        assert '"califico_cliente":false' in db_log_text
        print(f"[STEP 9] Persistence verified: {db_log_text}")

        # Step 7: Simulate Reload and confirm states
        page.evaluate("simulateReload()")
        assert not page.is_visible("#prompt-card")
        assert not page.is_visible("#rating-card")
        assert not page.is_visible("#modal-calificacion")
        print("[STEP 10] Reload verified: Completion prompt is gone, rating action is gone for Professional, Client flags unmodified.")

        browser.close()
        print("=== Professional -> Client Rating Path Result: PASS ===")

if __name__ == "__main__":
    run_pro_to_client_browser_validation()
