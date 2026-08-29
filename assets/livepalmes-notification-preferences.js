(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyC4sh5R8eU9SAnEsqyji6aJKnpUGgbE-AM",
    authDomain: "livepalmes.firebaseapp.com",
    projectId: "livepalmes",
    storageBucket: "livepalmes.firebasestorage.app",
    messagingSenderId: "718081132564",
    appId: "1:718081132564:web:618d1e95b6d6aefa4ebf01"
  };
  const elements = {
    loading: document.querySelector("#notificationPreferenceLoading"),
    panel: document.querySelector("#notificationPreferencePanel"),
    disableButton: document.querySelector("#notificationPreferenceDisableButton"),
    success: document.querySelector("#notificationPreferenceSuccess"),
    error: document.querySelector("#notificationPreferenceError"),
    errorMessage: document.querySelector("#notificationPreferenceErrorMessage"),
    message: document.querySelector("#notificationPreferenceMessage")
  };
  const params = new URLSearchParams(window.location.search);
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";
  let disableNotifications;

  function showError(message) {
    elements.loading.hidden = true;
    elements.panel.hidden = true;
    elements.success.hidden = true;
    elements.errorMessage.textContent = message;
    elements.error.hidden = false;
  }

  async function disable() {
    elements.disableButton.disabled = true;
    elements.message.textContent = "Enregistrement en cours…";
    try {
      await disableNotifications({ uid, token });
      elements.panel.hidden = true;
      elements.message.textContent = "";
      elements.success.hidden = false;
    } catch (_) {
      showError("La désinscription n’a pas pu être enregistrée. Le lien est peut-être invalide.");
    } finally {
      elements.disableButton.disabled = false;
    }
  }

  function initialize() {
    if (!uid || !token) {
      showError("Ce lien de gestion des notifications est incomplet.");
      return;
    }
    try {
      if (!window.firebase?.apps?.length) window.firebase.initializeApp(firebaseConfig);
      disableNotifications = window.firebase.app().functions("europe-west1")
        .httpsCallable("disableCompetitionEmailNotifications");
      elements.loading.hidden = true;
      elements.panel.hidden = false;
      elements.disableButton.addEventListener("click", disable);
    } catch (_) {
      showError("Le service de gestion des notifications est momentanément indisponible.");
    }
  }

  initialize();
}());
