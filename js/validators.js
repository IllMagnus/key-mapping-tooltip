// ============================================
// VALIDATORS MODULE
// ============================================

/**
 * Normalizza un singolo valore di campo
 * Per coordinate (x, y, width, height): THROW se stringa invalida (bloccante)
 * Ordine: trim → controlla "auto" → parseFloat (se numero) → validazione
 *
 * @param {string} fieldName - Nome campo (x, y, width, height, color, letter, text)
 * @param {*} value - Valore grezzo
 * @param {number} lineNumber - Numero riga per messaggi errore (solo per x,y - opzionale)
 * @returns {*} Valore normalizzato
 * @throws {Error} Se coordinata invalida (bloccante)
 */
function normalizeFieldValue(fieldName, value, lineNumber = null) {
  // CAMPI NUMERICI x, y, width, height: trim → parseFloat (VALIDAZIONE BLOCCANTE)
  if (["x", "y", "width", "height"].includes(fieldName)) {
    // Prepara valore
    let trimmed = null;
    let num = null;
    // Caso 1 + 2: stringa o numero
    if (typeof value === "string") {
      trimmed = value.trim();
      // Caso: stringa vuota o "auto" → null
      if (trimmed === "" || trimmed.toLowerCase() === "auto")
        return null;
      num = parseFloat(trimmed);
    } else if (typeof value === "number") {
      num = value;
    } else if (value === null || value === undefined) {
      return null;
    } else {
      // Tipo inaspettato
      const msg = lineNumber
        ? `Riga ${lineNumber}: campo ${fieldName} ha tipo ${typeof value}`
        : `Campo ${fieldName} ha tipo ${typeof value}`;
      throw new Error(msg);
    }
    // Valida numero
    if (isNaN(num)) {
      const msg = lineNumber
        ? `Riga ${lineNumber}: campo ${fieldName} non convertibile a numero`
        : `Campo ${fieldName} non convertibile a numero`;
      throw new Error(msg);
    }
    // Numeri ≤ 0 → null
    return num > 0 ? Math.round(num) : null;
  }

  // campo colore: stringa o null
  if (fieldName === "color") {
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed || null;
    }
    return null;
  }

  // Campo lettera: max 1 carattere, no trim
  if (fieldName === "letter") {
    if (typeof value === "string") {
      return value.substring(0, 1);
    }
    if (typeof value === "number") {
      return String(value).substring(0, 1);
    }
    return "";
  }

  // Campo testo: PRESERVA spazi (NO trim), ma non svg/html
  if (fieldName === "text") {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number") {
      return String(value);
    }
    return "";
  }

  // Campi extra (note, commenti): no trim e preserva
  return value;
}

/**
 * Normalizza un tooltip completo con validazione
 * @param {object} tooltipData - Dati tooltip grezzi
 * @param {number} autoId - ID automatico (opzionale)
 * @param {number} lineNumber - Numero riga per messaggi errore (opzionale)
 * @returns {object} Tooltip normalizzato e validato
 * @throws {Error} Se coordinate invalide (bloccante)
 */
function normalizeTooltipData(tooltipData, autoId = null, lineNumber = null) {
  tooltipData = tooltipData && typeof tooltipData === "object" ? tooltipData : {};
  tooltipData.x ??= undefined;
  tooltipData.y ??= undefined;
  tooltipData.color ??= undefined;
  tooltipData.letter ??= undefined;
  tooltipData.text ??= undefined;

  const normalized = {};
  // Gestione ID (separata, non normalizza)
  normalized.id = autoId !== null ? autoId : tooltipData.id || 0;

  // Loop su TUTTI i campi (escluso id)
  for (const key in tooltipData) {
    if (key === "id") continue;
    // Passa OGNI campo a normalizeFieldValue()
    // Il nome della key diventa il fieldName per il validatore
    normalized[key] = normalizeFieldValue(key, tooltipData[key], lineNumber);
  }

  Object.assign(normalized, validateCoordinates(normalized.x, normalized.y));

  if (!isValidColor(normalized.color)) normalized.color = "#ff0000";

  return normalized;
}

/**
 * Normalizza dati immagine con validazione
 * @param {object} imageData - Dati immagine grezzi
 * @returns {object} Dati immagine normalizzati
 * @throws {Error} Se width/height invalide (bloccante)
 */
function normalizeImageData(imageData) {
  if (!imageData || typeof imageData !== "object") {
    imageData = {};
  }

  let width = normalizeFieldValue("width", imageData.width);
  let height = normalizeFieldValue("height", imageData.height);
  const validated = validateImageDimensions(width, height);

  return {
    width: validated.width,
    height: validated.height,
    inverted: Boolean(imageData.inverted) || false,
  };
}

/** Crea un tooltip con tutti i default */
function createDefaultTooltip(id) {
  const { centerX, centerY } = getImageCenters();
  return {
    id: id || 1,
    x: centerX,
    y: centerY,
    text: "",
    color: "#ff0000",
    letter: "",
  };
}

// ============================================
// PARSING FORMATO
// ============================================

/**
 * Converte una riga CSV (array di stringhe) → oggetto tooltip
 * @param {string[]} row - Array di stringhe della riga CSV
 * @param {string[]} headers - Array di header names
 * @param {number} lineNumber - Numero riga per errori (1-based)
 * @returns {object} Oggetto grezzo con dati tooltip
 * @throws {Error} Se row ha più elementi che headers (errore bloccante)
 */
function rowToTooltipObject(row, headers, lineNumber) {
  // VALIDAZIONE BLOCCANTE: troppe colonne in questa riga
  if (row.length > headers.length) {
    throw new Error(
      `Riga ${lineNumber}: ${row.length} dati > ${headers.length} headers`
    );
  }

  const tooltipData = {};
  for (let j = 0; j < headers.length; j++) {
    const headerName = headers[j];
    // Skip header "id" (rigenerato ad ogni import)
    if (headerName === "id") continue;
    // Se colonna non esiste nella riga, usa stringa vuota
    const value = row[j] !== undefined ? row[j] : "";
    tooltipData[headerName] = value;
  }

  return tooltipData;
}

/**
 * Parsa JSON e estrae tooltip con normalizzazione
 * @param {string} jsonText - Contenuto JSON
 * @returns {object} {tooltips: [], image: {}}
 * @throws {Error} Se JSON non valido o coordinate invalide (bloccante)
 */
function parseJSONTooltips(jsonText) {
  let importedData;

  // VALIDAZIONE BLOCCANTE: JSON parse
  try {
    importedData = JSON.parse(jsonText);
  } catch (parseError) {
    throw new Error("JSON non valido: " + parseError.message);
  }

  const importedTooltips = importedData.tooltips;
  const importedImage = importedData.image;

  // VALIDAZIONE BLOCCANTE: tooltips è array
  if (!Array.isArray(importedTooltips)) {
    throw new Error("Campo 'tooltips' non è un array");
  }

  // PARSING + NORMALIZZAZIONE UNIFICATA
  const normalizedTooltips = importedTooltips.map((tooltipData, index) => {
    const lineNumber = index + 6; // Numero riga approssimativo nel file JSON
    return normalizeTooltipData(tooltipData, index + 1, lineNumber);
  });

  const normalizedImage = importedImage
    ? normalizeImageData(importedImage)
    : null;

  return {
    tooltips: normalizedTooltips,
    image: normalizedImage,
  };
}

/**
 * Parsa CSV e estrae tooltip con normalizzazione
 * Righe vuote → tooltip default (non skip)
 * Multi-line in text → gestito da parseCSV() con quoting
 *
 * @param {string} csvText - Contenuto CSV
 * @returns {object} {tooltips: []}
 * @throws {Error} Se CSV invalido, header invalido, o coordinate invalide (bloccante)
 */
function parseCSVTooltips(csvText) {
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    throw new Error("CSV vuoto");
  }

  let headers = rows[0];

  if (headers.length === 0) {
    throw new Error("CSV non ha headers");
  }
  // VALIDAZIONE BLOCCANTE: header validi (non vuoti, non duplicati)
  // nessun header vuoto
  for (let i = 0; i < headers.length; i++) {
    if (!headers[i] || headers[i].trim() === "") {
      throw new Error(
        `Header riga 1, colonna ${i + 1}: header non può essere vuoto`
      );
    }
  }

  // nessun header duplicato
  const seenHeaders = new Set();
  for (let i = 0; i < headers.length; i++) {
    const headerName = headers[i];
    if (seenHeaders.has(headerName)) {
      throw new Error(
        `Header riga 1: header "${headerName}" è duplicato (colonna ${i + 1})`
      );
    }
    seenHeaders.add(headerName);
  }

  // PARSING + NORMALIZZAZIONE UNIFICATA
  const normalizedTooltips = [];

  for (let i = 1; i < rows.length; i++) {
    const lineNumber = i + 1; // Numero riga effettivo
    let row = rows[i];
    // Trim colonne vuote finali PRIMA di check
    while (
      row.length > 0 &&
      (row[row.length - 1] === "" || row[row.length - 1] === undefined)
    )
      row.pop();

    // Controllo riga vuota → crea tooltip default
    const isEmptyRow = row.every(
      (field) => field === "" || field === undefined
    );

    if (isEmptyRow) {
      // Riga vuota → crea default tooltip con centro immagine
      // id = numero riga escluso headers
      normalizedTooltips.push(createDefaultTooltip(i));
      continue;
    }

    const tooltipData = rowToTooltipObject(row, headers, lineNumber);

    // Normalizzazione con validazione coordinate bloccante
    const normalized = normalizeTooltipData(
      tooltipData,
      i, // id = numero riga escluso headers, rigenerato ad ogni import/export
      lineNumber
    );
    normalizedTooltips.push(normalized);
  }

  return {
    tooltips: normalizedTooltips,
  };
}

// ============================================
// VALIDATORI CORE
// ============================================

/**
 * Valida se un colore hex è valido (case-insensitive)
 * @param {string} color - Colore hex (#RRGGBB o #RGB)
 * @returns {boolean} True se valido
 */
function isValidColor(color) {
  if (!color || typeof color !== "string") return false;
  // Normalizza a minuscolo per validazione case-insensitive
  const hexRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
  return hexRegex.test(color.toLowerCase());
}

/**
 * Valida coordinate con fallback a center image
 * Se x o y ≤ 0 o non sono numeri → fallback a center image
 */
function validateCoordinates(x, y) {
  const { centerX, centerY } = getImageCenters();

  const validX = typeof x === "number" && x > 0 ? x : centerX;
  const validY = typeof y === "number" && y > 0 ? y : centerY;

  return { x: validX, y: validY };
}

/**
 * Valida tooltip completo (legacy, usa normalizeTooltipData)
 * @deprecated
 */
function validateTooltip(tooltipData, autoId = null) {
  return normalizeTooltipData(tooltipData, autoId);
}

function cleanTooltip(tooltip) {
  const cleaned = {};
  const requiredFields = getRequiredFields();

  for (const key in tooltip) {
    const value = tooltip[key];

    if (requiredFields.includes(key)) {
      cleaned[key] = value;
    } else {
      if (value !== "" && value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// IMMAGINE

function validateImageDimensions(width, height) {
  const img = getImageElement();

  const currentWidth = img.offsetWidth;
  const currentHeight = img.offsetHeight;
  const aspectRatio = currentWidth / currentHeight;

  const validWidth = typeof width === "number" && width > 0 ? width : null;
  const validHeight = typeof height === "number" && height > 0 ? height : null;

  // Caso 1: entrambi validi → usali
  if (validWidth && validHeight) {
    return { width: validWidth, height: validHeight };
  }

  // Caso 2: solo width valido → calcola height dal ratio
  if (validWidth && !validHeight) {
    const calculatedHeight = Math.round(validWidth / aspectRatio);
    return { width: validWidth, height: calculatedHeight };
  }

  // Caso 3: solo height valido → calcola width dal ratio
  if (!validWidth && validHeight) {
    const calculatedWidth = Math.round(validHeight * aspectRatio);
    return { width: calculatedWidth, height: validHeight };
  }

  // Caso 4: niente valido → ritorna dimensioni originali
  return { width: currentWidth, height: currentHeight };
}

// ============================================
// CSV UTILITIES
// ============================================

function escapeCSV(field) {
  if (field === null || field === undefined) {
    return "";
  }
  const str = String(field);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseCSV(csvText) {
  const lines = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "\n" && !insideQuotes) {
      if (currentLine.trim() || currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = "";
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim() || currentLine.length > 0) {
    lines.push(currentLine);
  }

  const rows = lines.map((line) => {
    const fields = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        fields.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }

    fields.push(currentField.trim());
    return fields;
  });

  return rows;
}

function getCSVHeadersFromData(tooltips) {
  if (tooltips.length === 0) {
    return [];
  }

  const firstTooltip = tooltips[0];
  const headers = [];

  for (const key in firstTooltip) {
    if (key !== "id") {
      headers.push(key);
    }
  }

  tooltips.forEach((tooltip, index) => {
    if (index === 0) return;

    for (const key in tooltip) {
      if (key !== "id" && !headers.includes(key)) {
        headers.push(key);
      }
    }
  });

  return headers;
}

function tooltipsToCSV(tooltips) {
  const headers = getCSVHeadersFromData(tooltips);

  if (headers.length === 0) {
    return "";
  }

  const lines = [headers.join(",")];

  tooltips.forEach((tooltip) => {
    const row = headers.map((header) => {
      let value = tooltip[header];

      if ((header === "x" || header === "y") && typeof value === "number") {
        return Math.round(value);
      }

      if (typeof value === "string") {
        value = JSON.parse('"' + value + '"');
      }

      return escapeCSV(value);
    });
    lines.push(row.join(","));
  });

  return lines.join("\n");
}
