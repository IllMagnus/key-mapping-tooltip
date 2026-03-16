// ============================================
// MANAGER MODULE
// ============================================

const Manager = {
  clearAllState: {
    isWaitingForConfirmation: false,
    timeoutId: null,
  },

  // ============================================
  // STATE BACKUP & RESTORE
  // ============================================

  /**
   * Crea un backup profondo dello stato attuale
   * Copre: tooltips[], image.*, editor.*, ui.tooltipIdCounter
   * @returns {object} Backup completo dello stato
   */
  createStateBackup() {
    return {
      tooltips: JSON.parse(JSON.stringify(StateManager.get("tooltips"))),
      image: {
        width: StateManager.get("image.width"),
        height: StateManager.get("image.height"),
        inverted: StateManager.get("image.inverted"),
        aspectRatio: StateManager.get("image.aspectRatio"),
      },
      editor: {
        resizeModeActive: StateManager.get("editor.resizeModeActive"),
        lockProportions: StateManager.get("editor.lockProportions"),
      },
      ui: {
        tooltipIdCounter: StateManager.get("ui.tooltipIdCounter"),
      },
    };
  },

  /**
   * Applica i tooltip importati allo stato e al DOM
   * ORDINE: State FIRST (svuota), poi applica, poi render
   * SVUOTA STATE PRIMO (CRUCIALE PER ROLLBACK ATOMICO)
   * @param {array} tooltips - Array tooltip normalizzati
   */
  applyImportedTooltips(tooltips) {
    // Rimuovi tooltip VECCHI dal DOM (pulizia completa)
    const oldTooltips = StateManager.get("tooltips");
    oldTooltips.forEach((tooltip) => {
      const pointEl = document.getElementById(`point-${tooltip.id}`);
      const textEl = document.getElementById(`text-${tooltip.id}`);

      if (pointEl) pointEl.remove(); // Rimuove completamente, listener automaticamente rimossi
      if (textEl) textEl.remove();
    });

    // SVUOTA STATE PRIMA
    // Se accade un errore, lo state rimarrà pulito per rollback atomico
    StateManager.set("tooltips", []);
    StateManager.set("ui.tooltipIdCounter", 0);

    // Applica nuovi tooltip allo state
    StateManager.set("tooltips", tooltips);

    // Ricalcola tooltipIdCounter dal massimo ID importato
    if (tooltips.length > 0) {
      const maxId = Math.max(...tooltips.map((t) => t.id));
      StateManager.set("ui.tooltipIdCounter", maxId);
    }

    // RENDER nuovi tooltip nel DOM
    // Se errore qui, state è coerente (già aggiornato)
    tooltips.forEach((tooltip) => {
      Tooltip.render(tooltip);
    });
  },

  /**
   * Ripristina lo stato completo dal backup (ROLLBACK ATOMICO)
   * Ripristina: State → DOM → UI buttons
   * @param {object} backup - Backup creato da createStateBackup()
   */
  restoreStateBackup(backup) {
    // Ripristina STATE
    StateManager.set("tooltips", JSON.parse(JSON.stringify(backup.tooltips)));
    StateManager.set("image.width", backup.image.width);
    StateManager.set("image.height", backup.image.height);
    StateManager.set("image.inverted", backup.image.inverted);
    StateManager.set("image.aspectRatio", backup.image.aspectRatio);
    StateManager.set("editor.resizeModeActive", backup.editor.resizeModeActive);
    StateManager.set("editor.lockProportions", backup.editor.lockProportions);
    StateManager.set("ui.tooltipIdCounter", backup.ui.tooltipIdCounter);

    // Ripristina DOM (rimuovi tutti gli elementi)
    const overlay = getOverlay();
    if (overlay) overlay.innerHTML = ""; // Pulisci tutti i tooltip

    // Re-render tooltip dal backup
    backup.tooltips.forEach((tooltip) => {
      Tooltip.render(tooltip);
    });

    // Ripristina UI state (immagine)
    Editor.applyImageStyles(backup.image);

    // Ripristina UI buttons
    const resizeToggleBtn = document.getElementById("resizeToggleBtn");
    const resizePanel = document.getElementById("resizePanel");

    if (backup.editor.resizeModeActive) {
      resizePanel.classList.remove("hidden");
      resizeToggleBtn.classList.add("editor-active");
    } else {
      resizePanel.classList.add("hidden");
      resizeToggleBtn.classList.remove("editor-active");
    }

    const lockBtn = document.getElementById("lockProportionsBtn");
    if (backup.editor.lockProportions) {
      lockBtn.classList.add("editor-active");
      lockBtn.textContent = "🔒 Proporzioni Bloccate";
    } else {
      lockBtn.classList.remove("editor-active");
      lockBtn.textContent = "🔓 Blocca Proporzioni";
    }
  },

  /**
   * Chiude UI del resize panel
   */
  closeEditorUI() {
    const resizePanel = document.getElementById("resizePanel");
    const resizeToggleBtn = document.getElementById("resizeToggleBtn");

    if (!resizePanel.classList.contains("hidden")) {
      resizePanel.classList.add("hidden");
      resizeToggleBtn.classList.remove("editor-active");
      StateManager.set("editor.resizeModeActive", false);
    }
  },

  // ============================================
  // FORMATTING EXPORT
  // ============================================

  /**
   * Formatta tooltip per export
   * - Rigenera ID sequenziali 1,2,3,... (risolve gaps)
   * - Arrotonda coordinate x,y
   * - Mantiene tutti i campi richiesti e opzionali
   * @param {array} tooltips - Array tooltip da formattare
   * @returns {array} Array tooltip formattati per export
   */
  formatTooltipsForExport(tooltips) {
    return tooltips.map((tooltip, index) => {
      const formatted = {};
      const requiredFields = getRequiredFields();

      // RIGENERA ID SEQUENZIALE
      formatted.id = index + 1;
      // Aggiungi campi richiesti
      requiredFields.forEach((field) => {
        let value = tooltip[field];
        // Arrotonda coordinate x, y
        if ((field === "x" || field === "y") && typeof value === "number") {
          value = Math.round(value);
        }
        formatted[field] = value;
      });

      // Aggiungi campi opzionali (non vuoti)
      for (const key in tooltip) {
        if (key !== "id" && !requiredFields.includes(key)) {
          const value = tooltip[key];

          if (value !== "" && value !== null && value !== undefined) {
            formatted[key] = value;
          }
        }
      }

      return formatted;
    });
  },

  /**
   * Formatta dati immagine per export
   * - Se height è stringa ("auto"), converte in numero usando aspect ratio
   * - Arrotonda entrambe le dimensioni
   * - Mantiene stato inverted
   * @param {object} imageData - Dati immagine da formattare {width, height, inverted, aspectRatio}
   * @returns {object} Dati immagine formattati {width, height, inverted}
   */
  formatImageDataForExport(imageData) {
    if (!imageData) {
      return null;
    }

    let width = imageData.width;
    let height = imageData.height;
    const inverted = imageData.inverted || false;
    const aspectRatio = imageData.aspectRatio || 1;

    // Gestisci height = "auto": converti in numero usando aspect ratio
    if (height === "auto") {
      // height = width / aspectRatio
      height = Math.round(width / aspectRatio);
    }

    // Arrotonda entrambe le dimensioni
    const exportWidth = typeof width === "number" ? Math.round(width) : width;
    const exportHeight =
      typeof height === "number" ? Math.round(height) : height;

    return {
      width: exportWidth,
      height: exportHeight,
      inverted: inverted,
    };
  },

  /**
   * Crea file di export (wrapper per JSON o CSV)
   * @param {string} format - "json" o "csv"
   * @param {array} tooltips - Array tooltip formattati
   * @param {object} imageData - Dati immagine formattati
   * @returns {string} Contenuto del file (JSON o CSV)
   */
  createExportFile(format, tooltips, imageData) {
    if (format === "json") {
      const exportData = {
        tooltips: tooltips,
        image: imageData,
      };
      return JSON.stringify(exportData, null, 2);
    } else if (format === "csv") {
      // CSV: usa tooltipsToCSV() da validators.js
      // Non include image data
      return tooltipsToCSV(tooltips);
    } else {
      throw new Error(`Formato export non supportato: ${format}`);
    }
  },

  /**
   * Scarica file dal browser
   * @param {string} content - Contenuto del file
   * @param {string} filename - Nome file (es: "temp.json", "tooltips.csv")
   * @param {string} mimeType - MIME type (es: "application/json", "text/csv")
   */
  downloadFile(content, filename, mimeType) {
    const dataUri =
      `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", filename);
    linkElement.click();
  },

  // ============================================
  // JSON EXPORT/IMPORT
  // ============================================

  exportTooltips() {
    const tooltips = StateManager.get("tooltips");

    if (tooltips.length === 0) {
      showToast("Nessun tooltip da esportare", "warning");
      return;
    }

    // Formatta tooltip
    const formattedTooltips = this.formatTooltipsForExport(tooltips);

    // Formatta immagine
    const imageData = {
      width: StateManager.get("image.width"),
      height: StateManager.get("image.height"),
      inverted: StateManager.get("image.inverted"),
      aspectRatio: StateManager.get("image.aspectRatio"),
    };
    const formattedImage = this.formatImageDataForExport(imageData);

    // Crea file JSON
    const fileContent = this.createExportFile(
      "json",
      formattedTooltips,
      formattedImage
    );

    // Scarica
    this.downloadFile(fileContent, "temp.json", "application/json");

    showToast(
      `${formattedTooltips.length} tooltip esportati in temp.json`,
      "success"
    );
  },

  importTooltips() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        // BACKUP: Salva stato attuale PRIMA di qualunque modifica
        const stateBackup = this.createStateBackup();

        try {
          // PARSE JSON
          const jsonText = event.target.result;
          const parsedData = parseJSONTooltips(jsonText);

          // Apply: Immagine PRIMA dei tooltip
          Editor.applyImageStyles(parsedData.image);
          this.applyImportedTooltips(parsedData.tooltips);

          // Chiudi resize panel
          this.closeEditorUI();

          // Salva localStorage SOLO se tutto OK
          saveTooltipsToStorage();

          showToast(
            `${parsedData.tooltips.length} tooltip importati con successo`,
            "success"
          );
        } catch (error) {
          // ROLLBACK ATOMICO: Ripristina tutto come se import non fosse mai accaduto
          this.restoreStateBackup(stateBackup);
          saveTooltipsToStorage();

          showToast(`Errore importazione: ${error.message}`, "error");
        }
      };

      reader.readAsText(file);
    });

    fileInput.click();
  },

  // ============================================
  // CSV EXPORT/IMPORT
  // ============================================

  exportTooltipsCSV() {
    const tooltips = StateManager.get("tooltips");

    if (tooltips.length === 0) {
      showToast("Nessun tooltip da esportare", "warning");
      return;
    }

    // Formatta tooltip (arrotonda x,y, rigenera ID)
    const formattedTooltips = this.formatTooltipsForExport(tooltips);

    // FASE 4: Crea file CSV
    const fileContent = this.createExportFile("csv", formattedTooltips, null);

    // FASE 4: Scarica
    this.downloadFile(fileContent, "tooltips.csv", "text/csv");

    showToast(
      `${formattedTooltips.length} tooltip esportati in tooltips.csv`,
      "success"
    );
  },

  importTooltipsCSV() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".csv";

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        // BACKUP: Salva stato attuale PRIMA di qualunque modifica
        const stateBackup = this.createStateBackup();

        try {
          // PARSE CSV
          const csvText = event.target.result;
          const parsedData = parseCSVTooltips(csvText);

          // Apply: Tooltip soltanto (CSV non ha image data)
          // applyImportedTooltips() contiene SVUOTA STATE
          this.applyImportedTooltips(parsedData.tooltips);

          // Chiudi resize panel
          this.closeEditorUI();

          // Salva localStorage SOLO se tutto OK
          saveTooltipsToStorage();

          showToast(
            `${parsedData.tooltips.length} tooltip importati con successo`,
            "success"
          );
        } catch (error) {
          // ROLLBACK ATOMICO: Ripristina tutto come se import non fosse mai accaduto
          this.restoreStateBackup(stateBackup);
          saveTooltipsToStorage();

          showToast(`Errore importazione: ${error.message}`, "error");
        }
      };

      reader.readAsText(file);
    });

    fileInput.click();
  },

  // ============================================
  // CLEAR ALL
  // ============================================

  clearAll() {
    if (!this.clearAllState.isWaitingForConfirmation) {
      this.clearAllState.isWaitingForConfirmation = true;
      showToast("Clicca di nuovo entro 2 secondi per confermare", "warning");

      this.clearAllState.timeoutId = setTimeout(() => {
        this.clearAllState.isWaitingForConfirmation = false;
        showToast("Azione annullata", "info");
      }, 2000);
    } else {
      if (this.clearAllState.timeoutId) {
        clearTimeout(this.clearAllState.timeoutId);
        this.clearAllState.timeoutId = null;
      }

      this.clearAllState.isWaitingForConfirmation = false;

      const overlay = getOverlay();

      // Rimuovi tutti i tooltip dal DOM
      if (overlay) overlay.innerHTML = "";

      // SVUOTA STATE - Pattern coerente con applyImportedTooltips
      StateManager.set("tooltips", []);
      StateManager.set("ui.tooltipIdCounter", 0);
      saveTooltipsToStorage();

      showToast("Tutti i tooltip sono stati eliminati", "success");
    }
  },
};
