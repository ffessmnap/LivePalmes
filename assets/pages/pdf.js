const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = window.LivePalmesEnvironment.firebaseConfig;

const PDFJS_WORKER_SRC = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const pdfTitle = document.querySelector("#pdfTitle");
const statusBox = document.querySelector("#pdfViewerStatus");
const pdfFrame = document.querySelector("#pdfFrame");
const canvasViewer = document.querySelector("#pdfCanvasViewer");
const fallback = document.querySelector("#pdfFallback");
const downloadBtn = document.querySelector("#pdfDownloadBtn");
const closeBtn = document.querySelector("#pdfCloseBtn");
const meetMeta = document.querySelector("#pdfMeetMeta");

const PDF_TYPES = {
  resultat: {
    collection: "resultPdfs",
    defaultTitle: "Résultat",
    missingId: "PDF introuvable : aucun identifiant de résultat.",
    missingDoc: "PDF introuvable ou résultat non publié.",
    downloadName: "resultat.pdf",
    titleFromData: (data) => `${data.eventLabel || "Résultat"} ${data.sexLabel || ""}`.trim()
  },
  series: {
    collection: "seriesPdfs",
    defaultTitle: "Séries",
    missingId: "PDF de séries introuvable.",
    missingDoc: "PDF de séries introuvable ou non publié.",
    downloadName: "series.pdf",
    titleFromData: (data) => data.sourceLabel || "Séries"
  },
  "session-result": {
    collection: "sessionResultsPdfs",
    defaultTitle: "Résultats complets",
    missingId: "PDF de résultats complets introuvable.",
    missingDoc: "PDF de résultats complets introuvable ou non publié.",
    downloadName: "resultats-complets.pdf",
    titleFromData: (data) => data.sourceLabel || "Résultats complets"
  }
};

PDF_TYPES["archive-result"] = {
  collection: "resultPdfs",
  archive: true,
  defaultTitle: "Archive resultat",
  missingId: "PDF d'archive introuvable : aucun identifiant de resultat.",
  missingDoc: "PDF d'archive introuvable.",
  downloadName: "resultat-archive.pdf",
  titleFromData: (data) => `${data.eventLabel || "Archive resultat"} ${data.sexLabel || ""}`.trim()
};

PDF_TYPES["archive-session-result"] = {
  collection: "sessionResultsPdfs",
  archive: true,
  defaultTitle: "Archive resultats complets",
  missingId: "PDF de resultats complets archive introuvable.",
  missingDoc: "PDF de resultats complets archive introuvable.",
  downloadName: "resultats-complets-archive.pdf",
  titleFromData: (data) => data.sourceLabel || "Archive resultats complets"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function meetMetaLabel(meet = {}) {
  const city = cleanText(meet.city || "");
  const year = cleanText(meet.year || "");
  return [city, year].filter(Boolean).join(" ");
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
      <a class="ghost-button compact" href="${escapeHtml(blobUrl)}" download="${escapeHtml(pdfName || "livepalmes.pdf")}">Télécharger</a>
    `;
  }
}

function setDownloadLink(blobUrl, pdfName) {
  if (!downloadBtn || !blobUrl) return;
  downloadBtn.hidden = false;
  downloadBtn.href = blobUrl;
  downloadBtn.download = pdfName || "livepalmes.pdf";
}

function closeOrReturn() {
  if (window.opener) {
    window.close();
    setTimeout(() => {
      if (!window.closed) window.location.href = "resultats";
    }, 120);
    return;
  }
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = "resultats";
}

async function init() {
  if (closeBtn) {
    closeBtn.textContent = window.opener ? "Fermer" : "Retour";
    closeBtn.addEventListener("click", closeOrReturn);
  }
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") || "resultat";
  const id = params.get("id");
  const archiveId = params.get("archive") || "";
  const config = PDF_TYPES[type] || PDF_TYPES.resultat;
  if (pdfTitle) pdfTitle.textContent = config.defaultTitle;
  if (!id) {
    showMessage(config.missingId);
    return;
  }
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    showMessage("Firebase n'est pas disponible sur cette page.");
    return;
  }
  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(FIREBASE_CONFIG);
  }
  const db = window.firebase.firestore();
  const competition = db.collection("competitions").doc(FIRESTORE_COMPETITION_ID);
  const archiveRef = config.archive && archiveId
    ? competition.collection("resultArchives").doc(archiveId)
    : null;
  const mainCollection = archiveRef
    ? archiveRef.collection(config.collection)
    : competition.collection(config.collection);
  const publicIndexRequest = archiveRef
    ? archiveRef.get().catch(() => null)
    : competition.collection("public").doc("resultsIndex").get().catch(() => null);
  const [snapshot, indexSnapshot] = await Promise.all([
    mainCollection.doc(id).get(),
    publicIndexRequest
  ]);
  const publicIndex = archiveRef
    ? (indexSnapshot?.data()?.publicIndex || indexSnapshot?.data() || {})
    : (indexSnapshot?.data() || {});
  if (!archiveRef && publicIndex.publicAccess?.online === false) {
    showMessage("La page publique des résultats est temporairement hors ligne.");
    return;
  }
  if (!snapshot.exists) {
    showMessage(config.missingDoc);
    return;
  }
  const data = snapshot.data() || {};
  const metaLabel = meetMetaLabel(publicIndex.meet || data.meet || {});
  if (meetMeta) {
    meetMeta.textContent = metaLabel;
    meetMeta.hidden = !metaLabel;
  }
  if (pdfTitle) pdfTitle.textContent = config.titleFromData(data);
  const pdfSource = data.pdfUrl || data.pdfDataUrl || "";
  const blobUrl = data.pdfUrl || dataUrlToBlobUrl(data.pdfDataUrl);
  if (blobUrl) setDownloadLink(blobUrl, data.pdfName || config.downloadName);
  const rendered = await renderPdfInline(pdfSource);
  if (rendered) return;
  if (!blobUrl) {
    showMessage("Le PDF n'a pas pu être chargé.");
    return;
  }
  if (statusBox) statusBox.hidden = true;
  showFallback(blobUrl, data.pdfName || config.downloadName);
}

init().catch((error) => {
  console.error(error);
  showMessage(`Impossible de charger le PDF : ${error?.message || error}`);
});
