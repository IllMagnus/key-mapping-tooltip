// ============================================
// TOAST NOTIFICATIONS
// ============================================

const TOAST_DURATION = 3000; // 3 secondi per tutti i toast

function createToastContainer() {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
}

function showToast(message, type = "info") {
  createToastContainer();

  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");

  const icons = {
    success: "✔",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  // Auto-remove dopo TOAST_DURATION
  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, TOAST_DURATION);
}
