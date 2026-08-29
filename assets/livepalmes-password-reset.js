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
    loading: document.querySelector("#passwordResetLoading"),
    formPanel: document.querySelector("#passwordResetFormPanel"),
    form: document.querySelector("#passwordResetForm"),
    email: document.querySelector("#passwordResetEmail"),
    password: document.querySelector("#passwordResetValue"),
    confirmation: document.querySelector("#passwordResetConfirmation"),
    submit: document.querySelector("#passwordResetSubmit"),
    successPanel: document.querySelector("#passwordResetSuccessPanel"),
    successTitle: document.querySelector("#passwordResetSuccessTitle"),
    successText: document.querySelector("#passwordResetSuccessText"),
    errorPanel: document.querySelector("#passwordResetErrorPanel"),
    errorTitle: document.querySelector("#passwordResetErrorTitle"),
    errorMessage: document.querySelector("#passwordResetErrorMessage"),
    message: document.querySelector("#passwordResetMessage")
  };
  const params = new URLSearchParams(window.location.search);
  const actionCode = params.get("oobCode");
  const mode = params.get("mode");
  let auth;

  function showError(message, title = "Réinitialisation impossible") {
    elements.loading.hidden = true;
    elements.formPanel.hidden = true;
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorPanel.hidden = false;
  }

  function showSuccess(title, message) {
    elements.loading.hidden = true;
    elements.formPanel.hidden = true;
    elements.successTitle.textContent = title;
    elements.successText.textContent = message;
    elements.successPanel.hidden = false;
  }

  function resetErrorMessage(error) {
    const code = String(error?.code || "");
    if (code.includes("expired-action-code") || code.includes("invalid-action-code")) {
      return "Ce lien est expiré ou invalide. Demandez une nouvelle réinitialisation depuis le Portail.";
    }
    if (code.includes("weak-password")) return "Le nouveau mot de passe n’est pas assez sécurisé.";
    return "La réinitialisation n’a pas pu être effectuée. Réessayez ou demandez un nouveau lien depuis le Portail.";
  }

  async function handleEmailVerification() {
    await auth.applyActionCode(actionCode);
    showSuccess("Adresse e-mail validée", "Votre adresse e-mail a bien été validée. Vous pouvez accéder au Portail LivePalmes.");
  }

  async function handleEmailRecovery() {
    await auth.checkActionCode(actionCode);
    await auth.applyActionCode(actionCode);
    showSuccess("Adresse e-mail rétablie", "L’adresse e-mail de votre compte a bien été rétablie. Vous pouvez accéder au Portail LivePalmes.");
  }

  async function initialize() {
    if (!actionCode) {
      showError("Ce lien de réinitialisation est incomplet. Demandez un nouveau lien depuis le Portail.");
      return;
    }
    try {
      if (!window.firebase?.apps?.length) window.firebase.initializeApp(firebaseConfig);
      auth = window.firebase.auth();
      if (mode === "verifyEmail") {
        await handleEmailVerification();
        return;
      }
      if (mode === "recoverEmail") {
        await handleEmailRecovery();
        return;
      }
      if (mode !== "resetPassword") {
        showError("Ce lien correspond à une action non prise en charge. Utilisez le Portail LivePalmes pour continuer.", "Action impossible");
        return;
      }
      const email = await auth.verifyPasswordResetCode(actionCode);
      elements.email.textContent = email;
      elements.loading.hidden = true;
      elements.formPanel.hidden = false;
      elements.password.focus();
    } catch (error) {
      showError(resetErrorMessage(error));
    }
  }

  elements.form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = elements.password.value;
    if (password.length < 8) {
      elements.message.textContent = "Le mot de passe doit contenir au moins 8 caractères.";
      return;
    }
    if (password !== elements.confirmation.value) {
      elements.message.textContent = "La confirmation ne correspond pas au nouveau mot de passe.";
      return;
    }
    elements.message.textContent = "";
    elements.submit.disabled = true;
    try {
      await auth.confirmPasswordReset(actionCode, password);
      showSuccess("Mot de passe modifié", "Vous pouvez maintenant vous connecter au Portail LivePalmes avec votre nouveau mot de passe.");
    } catch (error) {
      elements.message.textContent = resetErrorMessage(error);
      elements.submit.disabled = false;
    }
  });

  initialize();
}());
