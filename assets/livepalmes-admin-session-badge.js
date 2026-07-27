(function attachLivePalmesAdminSessionBadge(global) {
  const BADGE_ID = "livepalmesAdminSessionBadge";

  function ensureFirebaseApp() {
    const firebase = global.firebase;
    const config = global.LivePalmesAppConfig?.firebaseConfig;
    if (!firebase?.initializeApp || !firebase?.auth || !config) return null;
    if (!firebase.apps?.length) firebase.initializeApp(config);
    return firebase;
  }

  function functionsService(firebase) {
    if (!firebase?.functions) return null;
    try {
      return firebase.app().functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    } catch {
      return firebase.functions(global.LivePalmesAppConfig?.firebaseFunctionsRegion || "europe-west1");
    }
  }

  function profileName(profile = {}) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  }

  function ensureBadge() {
    const existing = document.querySelector(`#${BADGE_ID}`);
    if (existing) return existing;
    const badge = document.createElement("aside");
    badge.id = BADGE_ID;
    badge.className = "livepalmes-admin-session-badge";
    badge.hidden = true;
    badge.setAttribute("aria-label", "Session administrateur LivePalmes");
    badge.innerHTML = `
      <a href="/portail.html">Portail</a>
      <strong data-admin-session-name>Profil LivePalmes</strong>
      <button type="button" data-admin-session-signout>Deconnexion</button>
    `;
    document.body.appendChild(badge);
    return badge;
  }

  function hideBadge() {
    const badge = document.querySelector(`#${BADGE_ID}`);
    if (badge) badge.hidden = true;
  }

  function showBadge(profile = {}) {
    const capabilities = Array.isArray(profile.capabilities) ? profile.capabilities : [];
    if (!capabilities.length) {
      hideBadge();
      return;
    }
    const badge = ensureBadge();
    const name = profileName(profile) || profile.email || "Profil LivePalmes";
    const label = badge.querySelector("[data-admin-session-name]");
    if (label) label.textContent = name;
    badge.hidden = false;
  }

  async function loadCurrentAccessUser(firebase) {
    const functions = functionsService(firebase);
    if (!functions?.httpsCallable) {
      hideBadge();
      return;
    }
    try {
      const result = await functions.httpsCallable("getCurrentAccessUser")({});
      showBadge(result.data || {});
    } catch {
      hideBadge();
    }
  }

  function init() {
    const firebase = ensureFirebaseApp();
    if (!firebase?.auth) return;
    ensureBadge().addEventListener("click", async (event) => {
      if (!event.target.closest("[data-admin-session-signout]")) return;
      event.preventDefault();
      hideBadge();
      await firebase.auth().signOut().catch(() => {});
    });
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        hideBadge();
        return;
      }
      loadCurrentAccessUser(firebase);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
