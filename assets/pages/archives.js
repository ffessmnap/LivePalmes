const FIRESTORE_COMPETITION_ID = "livepalmes-active";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
  authDomain: "livepalmes.firebaseapp.com",
  projectId: "livepalmes",
  storageBucket: "livepalmes.firebasestorage.app",
  messagingSenderId: "718081132564",
  appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
};

const archiveList = document.querySelector("#publicArchivesList");
const params = new URLSearchParams(window.location.search);
const directArchiveId = String(params.get("archive") || "").trim();

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

function archiveMeetLabel(archive = {}) {
  const meet = archive.meet || archive.publicIndex?.meet || {};
  return [meet.name, meet.city, meet.year].map(cleanText).filter(Boolean).join(" - ") || "Competition archivee";
}

function archiveDateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderArchives(archives = []) {
  if (!archiveList) return;
  if (!archives.length) {
    archiveList.innerHTML = `
      <section class="panel public-archive-empty">
        <h2>Archives nationales</h2>
        <p>Aucune competition nationale archivee pour le moment.</p>
      </section>
    `;
    return;
  }
  archiveList.innerHTML = `
    <section class="public-archive-list" aria-label="Competitions nationales archivees">
      ${archives.map((archive) => `
        <article class="panel public-archive-card">
          <div>
            <span class="public-document-kind">Archive</span>
            <h2>${escapeHtml(archiveMeetLabel(archive))}</h2>
            <p>${escapeHtml(archiveDateLabel(archive.createdAt) || archive.createdLabel || "")}</p>
            <span>${escapeHtml(String(archive.count || 0))} resultat${Number(archive.count || 0) > 1 ? "s" : ""} archive${Number(archive.count || 0) > 1 ? "s" : ""}</span>
          </div>
          <a class="ghost-button compact confirm-button" href="resultats.html?archive=${encodeURIComponent(archive.id || "")}">Consulter</a>
        </article>
      `).join("")}
    </section>
  `;
}

function isPublicArchive(archive = {}) {
  return archive.publicArchive === true || archive.reason === "Archive publique de la compétition";
}

async function loadArchives() {
  if (directArchiveId) {
    window.location.replace(`resultats.html?archive=${encodeURIComponent(directArchiveId)}`);
    return;
  }
  if (!archiveList) return;
  if (!window.firebase?.initializeApp || !window.firebase?.firestore) {
    archiveList.innerHTML = `<section class="panel"><p class="panel-subtitle">Firebase n'est pas disponible.</p></section>`;
    return;
  }
  if (!window.firebase.apps?.length) window.firebase.initializeApp(FIREBASE_CONFIG);
  const db = window.firebase.firestore();
  const snapshot = await db
    .collection("competitions")
    .doc(FIRESTORE_COMPETITION_ID)
    .collection("resultArchives")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get({ source: "server" });
  renderArchives(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter(isPublicArchive));
}

loadArchives().catch((error) => {
  console.warn("Lecture des archives impossible", error);
  if (archiveList) {
    archiveList.innerHTML = `<section class="panel"><p class="panel-subtitle">Impossible de charger les archives.</p></section>`;
  }
});
