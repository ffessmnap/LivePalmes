const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = window.LivePalmesEnvironment.firebaseConfig;

const PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfTitle = document.querySelector("#pdfTitle");
const statusBox = document.querySelector("#pdfViewerStatus");
const pdfFrame = document.querySelector("#pdfFrame");
const canvasViewer = document.querySelector("#pdfCanvasViewer");
const fallback = document.querySelector("#pdfFallback");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(message) {
  if (!statusBox) return;
  statusBox.hidden = false;
  statusBox.innerHTML = `<p class="panel-subtitle">${escapeHtml(message)}</p>`;
}

function dataUrlToBytes(dataUrl) {
  const [header, base64] = String(dataUrl || "").split(",");
  if (!header?.includes("application/pdf") || !base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function dataUrlToBlobUrl(dataUrl) {
  const bytes = dataUrlToBytes(dataUrl);
  if (!bytes) return "";
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

async function renderPdfInline(dataUrl) {
  const bytes = dataUrlToBytes(dataUrl);
  if (!bytes || !canvasViewer || !window.pdfjsLib) return false;
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
  canvasViewer.hidden = false;
  canvasViewer.innerHTML = "";
  const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
  if (statusBox) statusBox.hidden = true;
  const dpr = window.devicePixelRatio || 1;
  const containerWidth = Math.max(canvasViewer.clientWidth || window.innerWidth || 360, 320);
  const targetWidth = Math.min(containerWidth - 16, 980);
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvasViewer.appendChild(canvas);
    await page.render({ canvasContext: context, viewport }).promise;
  }
  return true;
}

function showFallback(blobUrl, pdfName) {
  if (pdfFrame && blobUrl) {
    pdfFrame.hidden = false;
    pdfFrame.src = blobUrl;
  }
  if (fallback && blobUrl) {
    fallback.hidden = false;
    fallback.innerHTML = `
      <a class="ghost-button compact confirm-button" href="${escapeHtml(blobUrl)}" target="_blank" rel="noopener">Ouvrir le PDF</a>
      <a class="ghost-button compact" href="${escapeHtml(blobUrl)}" download="${escapeHtml(pdfName || "series.pdf")}">Télécharger</a>
    `;
  }
}

async function init() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showMessage("PDF de séries introuvable.");
    return;
  }
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    showMessage("Firebase n'est pas disponible sur cette page.");
    return;
  }
  window.firebase.initializeApp(FIREBASE_CONFIG);
  const snapshot = await window.firebase.firestore()
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("seriesPdfs")
    .doc(id)
    .get();
  if (!snapshot.exists) {
    showMessage("PDF de séries introuvable ou non publié.");
    return;
  }
  const pdf = snapshot.data();
  if (pdfTitle) pdfTitle.textContent = pdf.sourceLabel || "Séries";
  const pdfSource = pdf.pdfUrl || pdf.pdfDataUrl || "";
  const rendered = await renderPdfInline(pdfSource);
  if (rendered) return;
  const blobUrl = pdf.pdfUrl || dataUrlToBlobUrl(pdf.pdfDataUrl);
  if (!blobUrl) {
    showMessage("Le PDF n'a pas pu être chargé.");
    return;
  }
  if (statusBox) statusBox.hidden = true;
  showFallback(blobUrl, pdf.pdfName || "series.pdf");
}

init().catch((error) => {
  console.error(error);
  showMessage(`Impossible de charger le PDF : ${error?.message || error}`);
});
