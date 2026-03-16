// ============================================
// TOOLTIP MODULE
// ============================================

const Tooltip = {
  hoverTimeoutId: null,
  activeHoverId: null,
  dragHandler: null,
  stopDragHandler: null,

  add() {
    const tooltipIdCounter = StateManager.get("ui.tooltipIdCounter");
    const newId = tooltipIdCounter + 1;
    StateManager.set("ui.tooltipIdCounter", newId);

    const img = getImageElement();
    const imgRect = img.getBoundingClientRect();

    // Center calcolato in base all'immagine nel DOM
    const centerViewportX = imgRect.left + imgRect.width / 2;
    const centerViewportY = imgRect.top + imgRect.height / 2;

    const x = centerViewportX + window.scrollX;
    const y = centerViewportY + window.scrollY;

    let circleLetter = document.getElementById("circleLetter").value;
    if (circleLetter.length > 0) {
      circleLetter = circleLetter.substring(0, 1);
    }
    document.getElementById("circleLetter").value = circleLetter;

    const circleColor = document.getElementById("circleColor").value;

    const tooltipData = {
      id: newId,
      x: x,
      y: y,
      text: "tooltip",
      color: circleColor,
      letter: circleLetter,
    };

    const tooltips = StateManager.get("tooltips");
    StateManager.set("tooltips", [...tooltips, tooltipData]);

    this.render(tooltipData);
    saveTooltipsToStorage();
  },

  getTextContent(element) {
    let text = "";
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
        text += "\n";
      }
    }
    return text;
  },

  cancelHideDelay() {
    if (this.hoverTimeoutId) {
      clearTimeout(this.hoverTimeoutId);
      this.hoverTimeoutId = null;
    }
  },

  showWithDelay(id) {
    if (this.activeHoverId !== null && this.activeHoverId !== id) {
      // this.hide(this.activeHoverId);
      const text1 = document.getElementById(`text-${this.activeHoverId}`);
      if (text1) {
        text1.classList.remove("tooltip-visible");
        text1.blur();
      }
    }

    this.cancelHideDelay();
    this.activeHoverId = id;
    
    const text = document.getElementById(`text-${id}`);
    if (text) {
      text.classList.add("tooltip-visible");
      setTimeout(() => {
        this.updateVisual(id);
      }, 0);
    }
  },

  render(data) {
    const validatedCoords = validateCoordinates(data.x, data.y);
    data.x = validatedCoords.x;
    data.y = validatedCoords.y;

    const point = document.createElement("div");
    point.className = "tooltip-point-overlay";
    point.id = `point-${data.id}`;
    point.style.background = data.color;
    point.textContent = data.letter;

    const text = document.createElement("div");
    text.className = "tooltip-text-overlay";
    text.id = `text-${data.id}`;
    text.contentEditable = true;

    // this.setTextContent(text, data.text);
    text.innerHTML = "";
    const lines = data.text.split("\n");

    lines.forEach((line, index) => {
      if (index > 0) text.appendChild(document.createElement("br"));
      if (line) text.appendChild(document.createTextNode(line));
    });

    const overlay = getOverlay();
    overlay.appendChild(point);
    overlay.appendChild(text);

    this.updateVisual(data.id);

    point.addEventListener("mousedown", (e) => this.startDrag(e, data.id));
    point.addEventListener("mouseenter", () => this.showWithDelay(data.id));
    point.addEventListener("mouseleave", () => this.hideWithDelay(data.id));

    text.addEventListener("click", (e) => e.stopPropagation());
    text.addEventListener("mouseenter", () => this.cancelHideDelay());
    text.addEventListener("mouseleave", () => this.hideWithDelay(data.id));
    
    text.addEventListener("blur", () => {
      const tooltips = StateManager.get("tooltips");
      const tooltip = tooltips.find((t) => t.id === data.id);
      if (tooltip) {
        tooltip.text = this.getTextContent(text) || "tooltip";
        saveTooltipsToStorage();
      }
      this.updateVisual(data.id);
    });

    text.addEventListener("keydown", (e) => {
      if (!text.classList.contains("tooltip-visible")) {
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const br = document.createElement("br");
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        const tooltips = StateManager.get("tooltips");
        const tooltip = tooltips.find((t) => t.id === data.id);
        if (tooltip) {
          tooltip.text = this.getTextContent(text) || "tooltip";
          saveTooltipsToStorage();
        }

        setTimeout(() => {
          this.updateVisual(data.id);
        }, 0);
      }
    });
    
    text.addEventListener("input", () => {
      if (!text.classList.contains("tooltip-visible")) {
        text.blur();
        return;
      }
      
      setTimeout(() => {
        this.updateVisual(data.id);
      }, 0);
    });
  },

  hideWithDelay(id) {
    this.hoverTimeoutId = setTimeout(() => {
      if (this.activeHoverId === id) {
        this.activeHoverId = null;
        const text = document.getElementById(`text-${id}`);
        if (text) {
          text.classList.remove("tooltip-visible");
          text.blur();
        }
      }
    }, 200);
  },

  /*
  show(id) {
    const text = document.getElementById(`text-${id}`);
    if (text) {
      text.classList.add("tooltip-visible");
    }
  },
  */

  /*
  hide(id) {
    const text = document.getElementById(`text-${id}`);
    if (text) {
      text.classList.remove("tooltip-visible");
      text.blur();
    }
  },
  */

  startDrag(e, id) {
    const tooltips = StateManager.get("tooltips");
    const tooltip = tooltips.find((t) => t.id === id);
    if (!tooltip) return;

    StateManager.set("ui.draggingTooltip", id);

    const point = document.getElementById(`point-${id}`);
    const text = document.getElementById(`text-${id}`);
    if (point) point.classList.add("tooltip-dragging");
    if (text) text.classList.add("tooltip-dragging");

    const mousePageX = e.clientX + window.scrollX;
    const mousePageY = e.clientY + window.scrollY;

    StateManager.set("ui.offsetX", mousePageX - tooltip.x);
    StateManager.set("ui.offsetY", mousePageY - tooltip.y);

    const textElement = document.getElementById(`text-${id}`);
    if (textElement) {
      textElement.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(textElement);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    document.addEventListener("mousemove", this.dragHandler);
    document.addEventListener("mouseup", this.stopDragHandler);

    e.preventDefault();
  },

  drag(e) {
    const draggingTooltip = StateManager.get("ui.draggingTooltip");
    if (!draggingTooltip) return;

    const tooltips = StateManager.get("tooltips");
    const tooltip = tooltips.find((t) => t.id === draggingTooltip);
    if (!tooltip) return;

    const mousePageX = e.clientX + window.scrollX;
    const mousePageY = e.clientY + window.scrollY;

    const offsetX = StateManager.get("ui.offsetX");
    const offsetY = StateManager.get("ui.offsetY");

    tooltip.x = mousePageX - offsetX;
    tooltip.y = mousePageY - offsetY;

    // ⚠️ BINDING: Usa Tooltip.updateVisual() se il binding di 'this' cambia
    // (es. se dragHandler non è più bound con .bind(Tooltip) in app.js)
    this.updateVisual(draggingTooltip);

    const deleteZone = document.getElementById("deleteZone");
    const deleteRect = deleteZone.getBoundingClientRect();
    const deleteX = deleteRect.left + deleteRect.width / 2;
    const deleteY = deleteRect.top + deleteRect.height / 2;

    const distance = Math.sqrt(
      Math.pow(e.clientX - deleteX, 2) + Math.pow(e.clientY - deleteY, 2)
    );

    if (distance < 150) {
      deleteZone.classList.add("tooltip-delete-active");
    } else {
      deleteZone.classList.remove("tooltip-delete-active");
    }
  },

  stopDrag(e) {
    const draggingTooltip = StateManager.get("ui.draggingTooltip");
    if (!draggingTooltip) return;

    const tooltips = StateManager.get("tooltips");
    const tooltip = tooltips.find((t) => t.id === draggingTooltip);
    if (!tooltip) {
      StateManager.set("ui.draggingTooltip", null);
      return;
    }

    const pointBaseZ = 2000;
    const textboxBaseZ = 3000;

    tooltips.forEach((t) => {
      const pointEl = document.getElementById(`point-${t.id}`);
      const textEl = document.getElementById(`text-${t.id}`);

      if (t.id === draggingTooltip) {
        if (pointEl) {
          pointEl.style.zIndex = pointBaseZ;
          pointEl.classList.remove("tooltip-dragging");
        }
        if (textEl) {
          textEl.style.zIndex = textboxBaseZ + tooltips.length;
          textEl.classList.remove("tooltip-dragging");
        }
      } else {
        if (pointEl) {
          pointEl.style.zIndex = pointBaseZ + 10;
        }
        if (textEl) {
          textEl.style.zIndex = textboxBaseZ + (t.id % tooltips.length);
        }
      }
    });

    const deleteZone = document.getElementById("deleteZone");
    const deleteRect = deleteZone.getBoundingClientRect();
    const deleteX = deleteRect.left + deleteRect.width / 2;
    const deleteY = deleteRect.top + deleteRect.height / 2;

    const distance = Math.sqrt(
      Math.pow(e.clientX - deleteX, 2) + Math.pow(e.clientY - deleteY, 2)
    );

    if (distance < 150) {
      // ⚠️ BINDING: Usa Tooltip.delete() se il binding di 'this' cambia
      // (es. se stopDragHandler non è più bound con .bind(Tooltip) in app.js)
      this.delete(draggingTooltip);
    } else {
      saveTooltipsToStorage();
    }

    deleteZone.classList.remove("tooltip-delete-active");
    document.removeEventListener("mousemove", this.dragHandler);
    document.removeEventListener("mouseup", this.stopDragHandler);
    StateManager.set("ui.draggingTooltip", null);
  },

  delete(id) {
    const tooltips = StateManager.get("tooltips");
    StateManager.set(
      "tooltips",
      tooltips.filter((t) => t.id !== id)
    );
    document.getElementById(`point-${id}`)?.remove();
    document.getElementById(`text-${id}`)?.remove();
    saveTooltipsToStorage();
  },

  updateVisual(id) {
    const tooltips = StateManager.get("tooltips");
    const tooltip = tooltips.find((t) => t.id === id);
    if (!tooltip) return;

    const point = document.getElementById(`point-${id}`);
    const text = document.getElementById(`text-${id}`);

    const viewportX = tooltip.x - window.scrollX;
    const viewportY = tooltip.y - window.scrollY;

    if (point) {
      point.style.left = viewportX + "px";
      point.style.top = viewportY + "px";
      point.style.transform = "translate(-50%, -50%)";
    }

    if (text) {
      const textTopPosition = viewportY - text.offsetHeight - 8;

      text.style.left = viewportX + "px";
      text.style.top = textTopPosition + "px";
      text.style.transform = "translateX(-50%)";
    }
  },
};

window.addEventListener("scroll", () => {
  const tooltips = StateManager.get("tooltips");
  tooltips.forEach((tooltip) => {
    Tooltip.updateVisual(tooltip.id);
  });
});
