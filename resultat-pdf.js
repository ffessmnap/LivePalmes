const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const pdfTitle = document.querySelector("#pdfTitle");
const statusBox = document.querySelector("#pdfViewerStatus");
const pdfFrame = document.querySelector("#pdfFrame");
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

function dataUrlToBlobUrl(dataUrl) {
  const [header, base64] = String(dataUrl || "").split(",");
  if (!header?.includes("application/pdf") || !base64) return "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

async function init() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showMessage("PDF introuvable : aucun identifiant de résultat.");
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
    .collection("results")
    .doc(id)
    .get();
  if (!snapshot.exists) {
    showMessage("PDF introuvable ou résultat non publié.");
    return;
  }
  const result = snapshot.data();
  const title = `${result.eventLabel || "Résultat"} ${result.sexLabel || ""}`.trim();
  if (pdfTitle) pdfTitle.textContent = title;
  const blobUrl = dataUrlToBlobUrl(result.pdfDataUrl);
  if (!blobUrl) {
    showMessage("Le PDF n'a pas pu être chargé.");
    return;
  }
  window.location.replace(blobUrl);
  if (statusBox) statusBox.hidden = true;
  if (pdfFrame) {
    pdfFrame.hidden = false;
    pdfFrame.src = blobUrl;
  }
  if (fallback) {
    fallback.hidden = false;
    fallback.innerHTML = `
      <a class="ghost-button compact confirm-button" href="${escapeHtml(blobUrl)}" target="_blank" rel="noopener">Ouvrir le PDF</a>
      <a class="ghost-button compact" href="${escapeHtml(blobUrl)}" download="${escapeHtml(result.pdfName || "resultat.pdf")}">Télécharger</a>
    `;
  }
}

init().catch((error) => {
  console.error(error);
  showMessage(`Impossible de charger le PDF : ${error?.message || error}`);
});
