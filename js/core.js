// ============================================
// UTILITY FUNCTIONS
// ============================================

function getImageElement() {
  return document.getElementById("mainImage");
}

function getImageCenters() {
  const imgRect = getImageElement().getBoundingClientRect();

  // 1. Centro relativo alla Viewport (la finestra visibile del browser)
  const centerViewportX = imgRect.left + imgRect.width / 2;
  const centerViewportY = imgRect.top + imgRect.height / 2;

  // 2. Centro assoluto rispetto al Documento (include lo scroll)
  const centerX = centerViewportX + window.scrollX;
  const centerY = centerViewportY + window.scrollY;

  return {
    centerX,
    centerY
  };
}

function getOverlay() {
  return document.getElementById("tooltipsOverlay");
}

function sanitizeText(text, maxLength) {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .substring(0, maxLength)
    .trim();
}

// csv
function getRequiredFields() {
  return ["x", "y", "text", "color", "letter"];
}

// ============================================
// STATE MANAGER
// ============================================

const StateManager = (() => {
  const AppState = {
    tooltips: [],
    image: {
      inverted: false,
      width: null,
      height: null,
      aspectRatio: 1,
    },
    editor: {
      resizeModeActive: false,
      lockProportions: true,
    },
    ui: {
      draggingTooltip: null,
      offsetX: 0,
      offsetY: 0,
      tooltipIdCounter: 0,
      lastMouseX: 0,
      lastMouseY: 0,
    },
  };

  const subscribers = [];

  return {
    /**
     * Legge un valore dallo state usando notazione con punto (es: "image.width")
     * @param {string} path - Percorso del valore (es: "ui.tooltipIdCounter")
     * @returns {any} Il valore nello state
     */
    get(path) {
      const keys = path.split(".");
      let current = AppState;

      for (const key of keys) {
        current = current[key];
      }

      return current;
    },

    /**
     * Modifica un valore dello state e notifica tutti i subscriber
     * @param {string} path - Percorso del valore (es: "ui.tooltipIdCounter")
     * @param {any} value - Nuovo valore
     */
    set(path, value) {
      const keys = path.split(".");
      let current = AppState;

      // Naviga fino al penultimo livello
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }

      // Prendi il vecchio valore per il callback
      const oldValue = current[keys[keys.length - 1]];

      // Assegna il nuovo valore
      current[keys[keys.length - 1]] = value;

      // NOTIFICA: Dì a tutti i subscriber che qualcosa è cambiato
      subscribers.forEach((callback) => {
        try {
          callback({
            path,
            oldValue,
            newValue: value,
            timestamp: Date.now(),
          });
        } catch (e) {
          console.error("Errore nel subscriber:", e);
        }
      });
    },

    /**
     * Registra una funzione che viene chiamata quando lo state cambia
     * @param {function} callback - Funzione da chiamare al cambio dello state
     * @returns {function} Funzione per unsubscribe
     */
    subscribe(callback) {
      if (typeof callback !== "function") {
        console.warn("Subscribe richiede una funzione come parametro");
        return () => {};
      }

      subscribers.push(callback);

      // Ritorna funzione per unsubscribe
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },

    /**
     * Debug: Ritorna una copia dell'intero state (READ ONLY)
     * @returns {object} Copia dello state
     */
    getDebug() {
      return JSON.parse(JSON.stringify(AppState));
    },
  };
})();

// ============================================
// STORAGE MANAGEMENT
// ============================================

function saveTooltipsToStorage() {
  const tooltips = StateManager.get("tooltips");

  // Valida le dimensioni prima di salvare
  let width = StateManager.get("image.width");
  let height = StateManager.get("image.height");
  const validated = validateImageDimensions(width, height);

  const imageState = {
    width: validated.width,
    height: validated.height,
    inverted: StateManager.get("image.inverted"),
  };

  const data = {
    tooltips: tooltips,
    image: imageState,
  };

  localStorage.setItem("temp-tooltips", JSON.stringify(data));
}

function loadTooltipsFromStorage() {
  const stored = localStorage.getItem("temp-tooltips");
  if (stored) {
    try {
      const data = JSON.parse(stored);

      // Carica i tooltip
      const tooltips = data.tooltips || [];
      StateManager.set("tooltips", tooltips);

      // Carica e valida le dimensioni e lo stato dell'immagine
      if (data.image) {
        let width = data.image.width;
        let height = data.image.height;

        const validated = validateImageDimensions(width, height);
        StateManager.set("image.width", validated.width);
        StateManager.set("image.height", validated.height);

        if (data.image.inverted !== undefined)
          StateManager.set("image.inverted", data.image.inverted);
      }

      // Ricalcola l'ID counter basato sui tooltip caricati
      if (tooltips.length > 0) {
        const maxId = Math.max(...tooltips.map((t) => t.id));
        StateManager.set("ui.tooltipIdCounter", maxId);
      }

      return tooltips;
    } catch (e) {
      console.error("Errore nel caricamento dei tooltip:", e);
      return [];
    }
  }
  return [];
}
