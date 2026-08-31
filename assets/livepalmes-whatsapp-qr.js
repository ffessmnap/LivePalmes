(function (global) {
  "use strict";

  const sourceScript = document.currentScript?.src || "";
  const libraryUrl = sourceScript
    ? new URL("vendor/qrcode.min.js?v=20260831-whatsapp-qr-1", sourceScript).href
    : "assets/vendor/qrcode.min.js?v=20260831-whatsapp-qr-1";
  let libraryPromise = null;
  let dialog = null;

  function cleanUrl(value) {
    const url = String(value || "").trim();
    return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{10,}\/?$/i.test(url) ? url : "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]);
  }

  function triggerHtml(value, options = {}) {
    const url = cleanUrl(value);
    if (!url) return "";
    const extraClass = String(options.className || "").replace(/[^A-Za-z0-9 _-]/g, "").trim();
    const label = String(options.label || "Afficher le groupe WhatsApp");
    return `<button class="whatsapp-qr-trigger${extraClass ? ` ${extraClass}` : ""}" type="button" data-whatsapp-qr-url="${escapeHtml(url)}" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM15 14h2v2h-2zM18 14h2v3h-2zM14 18h3v2h-3zM19 19h1v1h-1z"></path></svg><span>${escapeHtml(label)}</span></button>`;
  }

  function loadLibrary() {
    if (global.QRCode?.toCanvas) return Promise.resolve(global.QRCode);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = libraryUrl;
      script.async = true;
      script.dataset.livepalmesWhatsappQrLibrary = "true";
      script.addEventListener("load", () => global.QRCode?.toCanvas
        ? resolve(global.QRCode)
        : reject(new Error("Bibliothèque QR indisponible.")), { once: true });
      script.addEventListener("error", () => reject(new Error("Chargement du QR code impossible.")), { once: true });
      document.head.appendChild(script);
    });
    return libraryPromise;
  }

  function ensureDialog() {
    if (dialog?.isConnected) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "whatsapp-qr-dialog";
    dialog.setAttribute("aria-labelledby", "livepalmesWhatsappQrTitle");
    dialog.innerHTML = `
      <div class="whatsapp-qr-dialog-panel">
        <header>
          <div>
            <span>Chefs d'équipe</span>
            <h2 id="livepalmesWhatsappQrTitle">Groupe WhatsApp</h2>
          </div>
          <button class="whatsapp-qr-dialog-close" type="button" data-whatsapp-qr-close aria-label="Fermer la fenêtre">×</button>
        </header>
        <div class="whatsapp-qr-dialog-body">
          <p>Scannez ce QR code depuis un autre appareil ou utilisez le lien ci-dessous.</p>
          <canvas class="whatsapp-qr-canvas" width="224" height="224" aria-label="QR code du groupe WhatsApp" hidden></canvas>
          <p class="whatsapp-qr-status" role="status">Préparation du QR code…</p>
          <a class="whatsapp-qr-direct-link" target="_blank" rel="noopener noreferrer">Rejoindre le groupe WhatsApp</a>
        </div>
      </div>`;
    dialog.querySelector("[data-whatsapp-qr-close]")?.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const panel = dialog.querySelector(".whatsapp-qr-dialog-panel");
      const rect = panel?.getBoundingClientRect();
      if (!rect || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        dialog.close();
      }
    });
    document.body.appendChild(dialog);
    return dialog;
  }

  async function open(value) {
    const url = cleanUrl(value);
    if (!url) return false;
    const modal = ensureDialog();
    const canvas = modal.querySelector(".whatsapp-qr-canvas");
    const status = modal.querySelector(".whatsapp-qr-status");
    const link = modal.querySelector(".whatsapp-qr-direct-link");
    link.href = url;
    canvas.hidden = true;
    status.hidden = false;
    status.textContent = "Préparation du QR code…";
    if (!modal.open) modal.showModal();
    try {
      const qrCode = await loadLibrary();
      await qrCode.toCanvas(canvas, url, {
        width: 224,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#073b44", light: "#ffffff" }
      });
      canvas.hidden = false;
      status.hidden = true;
    } catch (_) {
      status.textContent = "Le QR code n’a pas pu être affiché. Le lien reste disponible.";
    }
    link.focus();
    return true;
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target?.closest?.("[data-whatsapp-qr-url]");
    if (!trigger) return;
    event.preventDefault();
    void open(trigger.dataset.whatsappQrUrl);
  });

  global.LivePalmesWhatsAppQr = { cleanUrl, open, triggerHtml };
})(window);
