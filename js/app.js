// ============================================
// EVENT LISTENERS & INITIALIZATION
// ============================================

window.addEventListener("DOMContentLoaded", () => {
  const img = getImageElement();

  const savedTooltips = loadTooltipsFromStorage();

  Editor.applyImageStyles({
    width: StateManager.get("image.width"),
    height: StateManager.get("image.height"),
    inverted: StateManager.get("image.inverted"),
  });

  const btn = document.getElementById("lockProportionsBtn");
  StateManager.set("editor.lockProportions", true);
  btn.classList.add("editor-active");
  btn.textContent = "🔒 Proporzioni Bloccate";

  if (savedTooltips.length > 0) {
    savedTooltips.forEach((tooltipData) => {
      Tooltip.render(tooltipData);
    });
    showToast(`${savedTooltips.length} tooltip caricati`, "info");
  }
  Tooltip.dragHandler = Tooltip.drag.bind(Tooltip);
  Tooltip.stopDragHandler = Tooltip.stopDrag.bind(Tooltip);

  Manager.closeEditorUI() // è utile ??
});

document.addEventListener("mousemove", (e) => {
  StateManager.set("ui.lastMouseX", e.clientX);
  StateManager.set("ui.lastMouseY", e.clientY);
});

// ============================================
// FASE 5: ORCHESTRAZIONE IMPORT
// ============================================

/**
 * FASE 5: Import JSON handler
 *
 * Collega il bottone HTML a Manager.importTooltips()
 *
 * Flow:
 * 1. User clicca bottone "Importa JSON"
 * 2. Manager.importTooltips() apre file dialog
 * 3. User seleziona .json
 * 4. Manager processa:
 *    - Backup stato attuale
 *    - Parse JSON (validators.js)
 *    - Apply image PRIMA (manager.js)
 *    - Apply tooltip (manager.js)
 *    - Salva localStorage
 * 5. Se errore: Rollback atomico (manager.js)
 */
document.getElementById("importBtn")?.addEventListener("click", () => {
  Manager.importTooltips();
});

/**
 * FASE 5: Import CSV handler
 *
 * Collega il bottone HTML a Manager.importTooltipsCSV()
 *
 * Flow:
 * 1. User clicca bottone "Importa CSV"
 * 2. Manager.importTooltipsCSV() apre file dialog
 * 3. User seleziona .csv
 * 4. Manager processa:
 *    - Backup stato attuale
 *    - Parse CSV (validators.js)
 *    - Apply tooltip (manager.js)
 *    - Salva localStorage
 * 5. Se errore: Rollback atomico (manager.js)
 *
 * Nota: CSV non contiene image data, quindi applyImageData() non viene chiamato
 */
document.getElementById("importCSVBtn")?.addEventListener("click", () => {
  Manager.importTooltipsCSV();
});

// ============================================
// FASE 6: ORCHESTRAZIONE EXPORT
// ============================================

/**
 * FASE 6: Export JSON handler
 *
 * Collega il bottone HTML a Manager.exportTooltips()
 *
 * Flow:
 * 1. User clicca bottone "Esporta JSON"
 * 2. Manager.exportTooltips() processa:
 *    - Ottiene tooltips da StateManager
 *    - Formatta tooltip (FASE 4): rigenera ID 1,2,3..., arrotonda x,y
 *    - Formatta image (FASE 4): se height="auto" → converti in numero
 *    - Crea file JSON con Manager.createExportFile()
 *    - Scarica file con Manager.downloadFile()
 * 3. Browser scarica temp.json
 * 4. Toast feedback di successo
 */
document.getElementById("exportBtn")?.addEventListener("click", () => {
  Manager.exportTooltips();
});

/**
 * FASE 6: Export CSV handler
 *
 * Collega il bottone HTML a Manager.exportTooltipsCSV()
 *
 * Flow:
 * 1. User clicca bottone "Esporta CSV"
 * 2. Manager.exportTooltipsCSV() processa:
 *    - Ottiene tooltips da StateManager
 *    - Formatta tooltip (FASE 4): rigenera ID 1,2,3..., arrotonda x,y
 *    - Crea file CSV con Manager.createExportFile()
 *    - Scarica file con Manager.downloadFile()
 * 3. Browser scarica tooltips.csv
 * 4. Toast feedback di successo
 *
 * Nota: CSV non include image data (non contiene colonne width, height, inverted)
 */
document.getElementById("exportCSVBtn")?.addEventListener("click", () => {
  Manager.exportTooltipsCSV();
});

// ============================================
// FASE 7: BUTTON HANDLERS & EDITOR INTEGRATION
// ============================================

/**
 * FASE 7: Invert image handler
 *
 * Collega il bottone HTML a Editor.toggleInvert()
 *
 * Flow:
 * 1. User clicca bottone "Inverti"
 * 2. Editor.toggleInvert() processa:
 *    - Legge stato attuale: image.inverted
 *    - Inverte il valore (true → false, false → true)
 *    - Applica filter CSS: "invert(1)" o "invert(0)"
 *    - Aggiorna UI button class: aggiunge/rimuove "editor-active"
 *    - Salva localStorage con saveTooltipsToStorage()
 * 3. Toast feedback (opzionale, già nella logica inverted)
 */
document.getElementById("invertBtn")?.addEventListener("click", () => {
  Editor.toggleInvert();
});

/**
 * FASE 7: Resize mode toggle handler
 *
 * Collega il bottone HTML a Editor.toggleResizeMode()
 *
 * Flow:
 * 1. User clicca bottone "Ridimensiona"
 * 2. Editor.toggleResizeMode() processa:
 *    - Legge stato attuale: editor.resizeModeActive
 *    - Inverte il valore
 *    - Se attivo: mostra panel, aggiorna input con dimensioni attuali
 *    - Se inattivo: nasconde panel
 *    - Aggiorna UI button class: aggiunge/rimuove "editor-active"
 * 3. User può ora inserire larghezza/altezza
 */
document.getElementById("resizeToggleBtn")?.addEventListener("click", () => {
  Editor.toggleResizeMode();
});

/**
 * FASE 7: Lock proportions toggle handler
 *
 * Collega il bottone HTML a Editor.toggleLockProportions()
 *
 * Flow:
 * 1. User clicca bottone "Blocca/Sblocca Proporzioni"
 * 2. Editor.toggleLockProportions() processa:
 *    - Legge stato attuale: editor.lockProportions
 *    - Inverte il valore
 *    - Se bloccato: aggiorna aspect ratio dalla width e height attuali
 *    - Se sbloccato: text diventa "🔓 Blocca Proporzioni"
 *    - Aggiorna UI button class e testo
 * 3. Quando è bloccato, cambiare width → height si adatta automaticamente
 */
document.getElementById("lockProportionsBtn")?.addEventListener("click", () => {
  Editor.toggleLockProportions();
});

/**
 * FASE 7: Width input change handler
 *
 * Collega l'input HTML a Editor.handleWidthChange()
 *
 * Flow:
 * 1. User cambia valore width input (es: 500 px)
 * 2. Editor.handleWidthChange() processa:
 *    - Se proportions BLOCCATE:
 *      - Calcola: newHeight = width / aspectRatio
 *      - Aggiorna height input con il nuovo valore
 *    - Se proportions SBLOCCATE:
 *      - Nulla (height rimane indipendente)
 * 3. User vede height aggiornato in real-time
 */
document.getElementById("widthInput")?.addEventListener("input", () => {
  Editor.handleWidthChange();
});

/**
 * FASE 7: Height input change handler
 *
 * Collega l'input HTML a Editor.handleHeightChange()
 *
 * Flow:
 * 1. User cambia valore height input (es: 300 px)
 * 2. Editor.handleHeightChange() processa:
 *    - Se proportions BLOCCATE:
 *      - Calcola: newWidth = height * aspectRatio
 *      - Aggiorna width input con il nuovo valore
 *    - Se proportions SBLOCCATE:
 *      - Nulla (width rimane indipendente)
 * 3. User vede width aggiornato in real-time
 */
document.getElementById("heightInput")?.addEventListener("input", () => {
  Editor.handleHeightChange();
});

/**
 * FASE 7: Apply resize handler
 *
 * Collega il bottone HTML a Editor.applyResize()
 *
 * Flow:
 * 1. User clicca bottone "Applica Dimensioni"
 * 2. Editor.applyResize() processa:
 *    - Legge width e height dagli input
 *    - Valida le dimensioni con validateImageDimensions()
 *    - Se height="auto": applica solo width
 *    - Se height numerica: applica entrambi
 *    - Aggiorna DOM style: img.style.width, img.style.height
 *    - Aggiorna StateManager: image.width, image.height
 *    - Salva localStorage
 * 3. Toast: "Dimensioni applicate"
 */
document.getElementById("applyResizeBtn")?.addEventListener("click", () => {
  Editor.applyResize();
});

/**
 * FASE 7: Reset image size handler
 *
 * Collega il bottone HTML a Editor.resetImageSize()
 *
 * Flow:
 * 1. User clicca bottone "Ripristina Dimensioni"
 * 2. Editor.resetImageSize() processa:
 *    - Resetta immagine a default: width="100%", height="auto", maxWidth="880px"
 *    - Legge dimensioni attuali dal DOM con offsetWidth/offsetHeight
 *    - Aggiorna input width e height
 *    - Aggiorna StateManager: image.width, image.height
 *    - Salva localStorage
 * 3. Toast: "Dimensioni ripristinate"
 */
document.getElementById("resetImageBtn")?.addEventListener("click", () => {
  Editor.resetImageSize();
});

/**
 * FASE 7: Clear all handler
 *
 * Collega il bottone HTML a Manager.clearAll()
 *
 * Flow:
 * 1. User clicca bottone "Cancella Tutto"
 * 2. Manager.clearAll() processa:
 *    - FIRST CLICK: isWaitingForConfirmation = true
 *      - Mostra toast: "Clicca di nuovo entro 2 secondi per confermare"
 *      - Imposta timeout di 2 secondi per reset
 *    - SECOND CLICK (entro 2 secondi):
 *      - Cancella timeout
 *      - isWaitingForConfirmation = false
 *      - Rimuove tutti i tooltip dal DOM (overlay.innerHTML = "")
 *      - SVUOTA STATE: tooltips = [], tooltipIdCounter = 0
 *      - Salva localStorage
 *      - Toast: "Tutti i tooltip sono stati eliminati"
 *    - Se 2 secondi passano senza secondo click:
 *      - Reset stato
 *      - Toast: "Azione annullata"
 * 3. User vede overlay vuoto e state sincronizzato
 */
document.getElementById("clearAllBtn")?.addEventListener("click", () => {
  Manager.clearAll();
});
