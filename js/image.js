// ============================================
// EDITOR MODULE
// ============================================

const Editor = {
  applyImageInvert(invert, img) {
    const btn = document.getElementById("invertBtn");
    if (invert) {
      img.style.filter = "invert(1)";
      btn.classList.add("editor-active");
    } else {
      img.style.filter = "invert(0)";
      btn.classList.remove("editor-active");
    }
    StateManager.set("image.inverted", invert);
  },

  /**
   * FONTE DI VERITÀ per l'applicazione di styling all'immagine
   * Gestisce: dimensioni (width, height) + inverted + UI + StateManager
   *
   * @param {object} imageData - {width?, height?, inverted?}
   *   - width/height: number | null | undefined (null/undefined = reset)
   *   - inverted: boolean (opzionale)
   * @throws {Error} se validazione fallisce
   * @side-effects: DOM, StateManager, input HTML
   * @returns: undefined
   */
  applyImageStyles(imageData) {
    imageData = imageData || {};
    const img = getImageElement();

    // PUNTO 1: Normalizza width e height
    let width = normalizeFieldValue("width", imageData.width);
    let height = normalizeFieldValue("height", imageData.height);

    // PUNTO 2: Valida e calcola dimensioni mancanti
    // Ottieni dimensioni originali dall'immagine
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;
    const originalAspectRatio = originalWidth / originalHeight;

    // Caso 1: entrambi null → reset completo a dimensioni originali
    if (width === null && height === null) {
      width = originalWidth;
      height = originalHeight;
    }
    // Caso 2: width numero, height null → calcola height da ratio
    else if (width !== null && height === null)
      height = Math.round(width / originalAspectRatio);
    // Caso 3: height numero, width null → calcola width da ratio
    else if (width === null && height !== null)
      width = Math.round(height * originalAspectRatio);
    // Caso 4: entrambi numero → usali come-è (già positivi dopo normalizzazione)

    // PUNTO 3: Applica DOM styling
    img.style.width = width + "px";
    img.style.height = height + "px";
    img.style.maxWidth = "none";

    // PUNTO 4: Applica inverted (se definito)
    // PUNTO 5: Aggiorna StateManager
    if (imageData.inverted !== undefined)
      this.applyImageInvert(imageData.inverted, img);
    StateManager.set("image.width", width);
    StateManager.set("image.height", height);

    // PUNTO 6: Ricalcola aspect ratio da dimensioni ATTUALI (dopo render)
    const currentWidth = img.offsetWidth;
    const currentHeight = img.offsetHeight;
    const currentAspectRatio = currentWidth / currentHeight;
    StateManager.set("image.aspectRatio", currentAspectRatio);

    // PUNTO 7: Aggiorna input HTML se panel visibile
    if (StateManager.get("editor.resizeModeActive")) {
      document.getElementById("widthInput").value = Math.round(currentWidth);
      document.getElementById("heightInput").value = Math.round(currentHeight);
    }
  },

  toggleInvert() {
    try {
      const inverted = StateManager.get("image.inverted");
      this.applyImageInvert(!inverted, getImageElement());
      saveTooltipsToStorage();
      showToast("Immagine invertita", "success");
    } catch (error) {
      showToast("Errore durante inversione: " + error.message, "error");
    }
  },

  toggleResizeMode() {
    const resizeModeActive = StateManager.get("editor.resizeModeActive");
    StateManager.set("editor.resizeModeActive", !resizeModeActive);

    const panel = document.getElementById("resizePanel");
    const btn = document.getElementById("resizeToggleBtn");
    const img = getImageElement();

    if (!resizeModeActive) {
      panel.classList.remove("hidden");
      btn.classList.add("editor-active");

      const currentWidth = img.offsetWidth;
      const currentHeight = img.offsetHeight;

      document.getElementById("widthInput").value = currentWidth;
      document.getElementById("heightInput").value = currentHeight;
    } else {
      panel.classList.add("hidden");
      btn.classList.remove("editor-active");
    }
  },

  toggleLockProportions() {
    const lockProportions = StateManager.get("editor.lockProportions");
    StateManager.set("editor.lockProportions", !lockProportions);

    const btn = document.getElementById("lockProportionsBtn");
    const img = getImageElement();

    if (lockProportions) {
      btn.classList.remove("editor-active");
      btn.textContent = "🔓 Blocca Proporzioni";
    } else {
      btn.classList.add("editor-active");
      btn.textContent = "🔒 Proporzioni Bloccate";

      const currentWidth = parseFloat(
        document.getElementById("widthInput").value
      );
      const currentHeight = parseFloat(
        document.getElementById("heightInput").value
      );
      StateManager.set("image.aspectRatio", currentWidth / currentHeight);
    }
  },

  handleWidthChange() {
    const lockProportions = StateManager.get("editor.lockProportions");
    if (!lockProportions) return;

    const widthInput = document.getElementById("widthInput");
    const heightInput = document.getElementById("heightInput");
    const aspectRatio = StateManager.get("image.aspectRatio");

    const newWidth = parseFloat(widthInput.value);
    const newHeight = Math.round(newWidth / aspectRatio);

    heightInput.value = newHeight;
  },

  handleHeightChange() {
    const lockProportions = StateManager.get("editor.lockProportions");
    if (!lockProportions) return;

    const widthInput = document.getElementById("widthInput");
    const heightInput = document.getElementById("heightInput");
    const aspectRatio = StateManager.get("image.aspectRatio");

    const newHeight = parseFloat(heightInput.value);
    const newWidth = Math.round(newHeight * aspectRatio);

    widthInput.value = newWidth;
  },

  applyResize() {
    try {
      let width = document.getElementById("widthInput").value;
      let height = document.getElementById("heightInput").value;

      // Normalizza e Applica styling (delegati a applyImageStyles)
      this.applyImageStyles({ width, height });

      // Se no errore
      Manager.closeEditorUI();
      saveTooltipsToStorage();
      showToast("Dimensioni applicate", "success");
    } catch (error) {
      showToast("Errore: " + error.message, "error");
    }
  },

  resetImageSize() {
    try {
      // Passa null per entrambi → trigger reset a dimensioni originali
      this.applyImageStyles({ width: null, height: null });

      // Se no errore
      Manager.closeEditorUI();
      saveTooltipsToStorage();
      showToast("Dimensioni ripristinate", "success");
    } catch (error) {
      showToast("Errore durante reset: " + error.message, "error");
    }
  },
};
