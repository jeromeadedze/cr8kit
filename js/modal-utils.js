/**
 * Modal Utilities for Cr8Kit
 * Replaces native browser alert() and confirm() dialogs with styled modals
 */

(function () {
  // Create modal container if it doesn't exist
  function ensureModalContainer() {
    let container = document.getElementById("cr8kit-modal-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cr8kit-modal-container";
      document.body.appendChild(container);
    }
    return container;
  }

  // Add modal styles if not already present
  function ensureModalStyles() {
    if (document.getElementById("cr8kit-modal-styles")) return;

    const styles = document.createElement("style");
    styles.id = "cr8kit-modal-styles";
    styles.textContent = `
      .cr8kit-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease-out;
      }
      
      .cr8kit-modal-overlay.active {
        opacity: 1;
      }
      
      .cr8kit-modal {
        background: #0d0d0d;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        padding: 24px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(254, 116, 44, 0.15);
        transform: scale(0.9) translateY(20px);
        transition: transform 0.2s ease-out;
      }
      
      .cr8kit-modal-overlay.active .cr8kit-modal {
        transform: scale(1) translateY(0);
      }
      
      .cr8kit-modal-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        font-size: 24px;
      }
      
      .cr8kit-modal-icon.info {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
      }
      
      .cr8kit-modal-icon.warning {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
      }
      
      .cr8kit-modal-icon.error {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
      }
      
      .cr8kit-modal-icon.success {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
      }
      
      .cr8kit-modal-icon.question {
        background: rgba(254, 116, 44, 0.15);
        color: #fe742c;
      }
      
      .cr8kit-modal-title {
        color: #ffffff;
        font-size: 18px;
        font-weight: 600;
        text-align: center;
        margin: 0 0 8px;
      }
      
      .cr8kit-modal-message {
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        text-align: center;
        margin: 0 0 24px;
        line-height: 1.5;
      }
      
      .cr8kit-modal-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .cr8kit-modal-btn {
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        min-width: 100px;
      }
      
      .cr8kit-modal-btn:hover {
        transform: translateY(-1px);
      }
      
      .cr8kit-modal-btn:active {
        transform: translateY(0);
      }
      
      .cr8kit-modal-btn.primary {
        background: #fe742c;
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(254, 116, 44, 0.3);
      }
      
      .cr8kit-modal-btn.primary:hover {
        background: #ff8a47;
        box-shadow: 0 6px 20px rgba(254, 116, 44, 0.4);
      }
      
      .cr8kit-modal-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .cr8kit-modal-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      
      .cr8kit-modal-btn.danger {
        background: #ef4444;
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
      }
      
      .cr8kit-modal-btn.danger:hover {
        background: #f87171;
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
      }
      
      .cr8kit-modal-btn.success {
        background: #22c55e;
        color: #ffffff;
        box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);
      }
      
      .cr8kit-modal-btn.success:hover {
        background: #4ade80;
        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
      }
    `;
    document.head.appendChild(styles);
  }

  // Get icon HTML based on type
  function getIconHTML(type) {
    const icons = {
      info: '<i class="fas fa-info-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      success: '<i class="fas fa-check-circle"></i>',
      question: '<i class="fas fa-question-circle"></i>',
    };
    return icons[type] || icons.info;
  }

  // Show alert modal (replacement for alert())
  window.showAlert = function (message, options = {}) {
    return new Promise((resolve) => {
      ensureModalStyles();
      const container = ensureModalContainer();

      const type = options.type || "info";
      const title = options.title || getDefaultTitle(type);
      const buttonText = options.buttonText || "OK";
      const buttonStyle = options.buttonStyle || "primary";

      const overlay = document.createElement("div");
      overlay.className = "cr8kit-modal-overlay";
      overlay.innerHTML = `
        <div class="cr8kit-modal">
          <div class="cr8kit-modal-icon ${type}">
            ${getIconHTML(type)}
          </div>
          <h3 class="cr8kit-modal-title">${title}</h3>
          <p class="cr8kit-modal-message">${message}</p>
          <div class="cr8kit-modal-buttons">
            <button class="cr8kit-modal-btn ${buttonStyle}" id="cr8kit-alert-ok">${buttonText}</button>
          </div>
        </div>
      `;

      container.appendChild(overlay);

      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add("active");
      });

      function closeModal() {
        overlay.classList.remove("active");
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 200);
      }

      overlay.querySelector("#cr8kit-alert-ok").addEventListener("click", closeModal);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
      });
    });
  };

  // Show confirm modal (replacement for confirm())
  window.showConfirm = function (message, options = {}) {
    return new Promise((resolve) => {
      ensureModalStyles();
      const container = ensureModalContainer();

      const type = options.type || "question";
      const title = options.title || "Confirm Action";
      const confirmText = options.confirmText || "OK";
      const cancelText = options.cancelText || "Cancel";
      const confirmStyle = options.confirmStyle || "primary";
      const isDangerous = options.dangerous || false;

      const overlay = document.createElement("div");
      overlay.className = "cr8kit-modal-overlay";
      overlay.innerHTML = `
        <div class="cr8kit-modal">
          <div class="cr8kit-modal-icon ${type}">
            ${getIconHTML(type)}
          </div>
          <h3 class="cr8kit-modal-title">${title}</h3>
          <p class="cr8kit-modal-message">${message}</p>
          <div class="cr8kit-modal-buttons">
            <button class="cr8kit-modal-btn secondary" id="cr8kit-confirm-cancel">${cancelText}</button>
            <button class="cr8kit-modal-btn ${isDangerous ? "danger" : confirmStyle}" id="cr8kit-confirm-ok">${confirmText}</button>
          </div>
        </div>
      `;

      container.appendChild(overlay);

      // Trigger animation
      requestAnimationFrame(() => {
        overlay.classList.add("active");
      });

      function closeModal(result) {
        overlay.classList.remove("active");
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      }

      overlay.querySelector("#cr8kit-confirm-ok").addEventListener("click", () => closeModal(true));
      overlay.querySelector("#cr8kit-confirm-cancel").addEventListener("click", () => closeModal(false));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal(false);
      });

      // Handle escape key
      function handleEscape(e) {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", handleEscape);
          closeModal(false);
        }
      }
      document.addEventListener("keydown", handleEscape);
    });
  };

  // Helper function to get default title based on type
  function getDefaultTitle(type) {
    const titles = {
      info: "Information",
      warning: "Warning",
      error: "Error",
      success: "Success",
      question: "Confirm",
    };
    return titles[type] || "Notice";
  }

  // Toast notification for quick feedback
  window.showToast = function (message, options = {}) {
    const type = options.type || "info";
    const duration = options.duration || 3000;

    // Ensure toast container
    let toastContainer = document.getElementById("cr8kit-toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "cr8kit-toast-container";
      toastContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(toastContainer);
    }

    const colors = {
      info: { bg: "rgba(59, 130, 246, 0.9)", icon: "fa-info-circle" },
      warning: { bg: "rgba(245, 158, 11, 0.9)", icon: "fa-exclamation-triangle" },
      error: { bg: "rgba(239, 68, 68, 0.9)", icon: "fa-times-circle" },
      success: { bg: "rgba(34, 197, 94, 0.9)", icon: "fa-check-circle" },
    };

    const color = colors[type] || colors.info;

    const toast = document.createElement("div");
    toast.style.cssText = `
      background: ${color.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      transform: translateX(120%);
      transition: transform 0.3s ease-out;
      font-size: 14px;
      max-width: 350px;
    `;
    toast.innerHTML = `<i class="fas ${color.icon}"></i><span>${message}</span>`;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = "translateX(0)";
    });

    // Auto dismiss
    setTimeout(() => {
      toast.style.transform = "translateX(120%)";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  console.log("Cr8Kit Modal Utilities loaded successfully");
})();
