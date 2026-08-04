(function () {
  function init(context = {}) {
    const {
      ADMIN_PIN,
      FIRESTORE_COMPETITION_ID,
      archiveCurrentResults,
      cleanLegacyResultPdfs,
      clearPublishedResults,
      clearPublishedResultsForSession,
      clearTechnicalLog,
      closeRoleCodesModal,
      competitionModeEnabled,
      currentClientId,
      currentRolePins,
      downloadAdminBackup,
      ensureResultsAdminSession,
      finishRolePin,
      historyArchivesCollection,
      livePalmesAdminAuth,
      initFirebaseSync,
      livePalmesPinAuth,
      openDsqRows,
      openResultArchiveRows,
      performResetHistoryWithArchive,
      publishPublicResultsIndex,
      renderHistoryArchivesModal,
      renderResultsAdminPanel,
      renderRoleCodesModal,
      resetSeriesForNextCompetition,
      resultArchivesCollection,
      restoreAdminBackupFile,
      roleCodesModal,
      saveRoleCodesFromModal,
      showPerformanceDiagnosticModal,
      showPublicPublicationDiagnosticModal,
      showTechnicalDiagnosticModal,
      showTechnicalLogModal,
      toggleCompetitionMode,
      unlockRole,
      updateLiveNotes
    } = context;

    async function openAuthenticatedAdminAction(action) {
      if (action === "reset") {
        closeRoleCodesModal();
        await performResetHistoryWithArchive();
        return;
      }
      renderRoleCodesModal();
    }

    async function prepareManualModeForReset() {
      if (!competitionModeEnabled()) return true;
      return window.confirm([
        "L'actualisation directe est active.",
        "",
        "Cette RAZ sera envoyée immédiatement aux consoles connectées.",
        "Continuer ?"
      ].join("\n"));
    }

      roleCodesModal?.addEventListener("click", async (event) => {
        if (event.target === roleCodesModal && roleCodesModal.querySelector(".session-infos-dialog")) {
          return;
        }
        if (event.target === roleCodesModal || event.target.closest("[data-role-codes-close]")) {
          closeRoleCodesModal();
          return;
        }
        if (event.target.closest("[data-open-history-archives]")) {
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        if (event.target.closest("[data-admin-auth-signout]")) {
          try {
            await livePalmesAdminAuth?.signOut?.();
            closeRoleCodesModal();
            window.alert("Admin deconnecte.");
          } catch (error) {
            console.error(error);
            window.alert(`Deconnexion impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-technical-diagnostic]")) {
          try {
            await showTechnicalDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Diagnostic technique impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-performance-diagnostic]")) {
          try {
            await showPerformanceDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Diagnostic performance impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-public-publication-diagnostic]")) {
          try {
            await showPublicPublicationDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Diagnostic public impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-technical-log]")) {
          try {
            showTechnicalLogModal?.();
          } catch (error) {
            console.error(error);
            window.alert(`Journal technique impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-clear-technical-log]")) {
          clearTechnicalLog?.();
          return;
        }
        if (event.target.closest("[data-clean-result-pdfs]")) {
          const ok = window.confirm("Nettoyer les anciens PDF résultats encore stockés dans results ?\n\nLes PDF resteront consultables, mais seront déplacés dans resultPdfs pour accélérer les consoles.");
          if (!ok) return;
          try {
            const count = await cleanLegacyResultPdfs();
            window.alert(`${count} PDF résultat${count > 1 ? "s" : ""} nettoyé${count > 1 ? "s" : ""}.`);
            await showPerformanceDiagnosticModal();
          } catch (error) {
            console.error(error);
            window.alert(`Nettoyage impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-public-index-republish]")) {
          try {
            await publishPublicResultsIndex({ strict: true });
            window.alert("Index public republié. Les pages Séries/Résultats peuvent utiliser les données à jour sans modifier l'heure des séries.");
          } catch (error) {
            console.error(error);
            window.alert(`Republication impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-public-competition-archive]")) {
          const ok = window.confirm("Créer une archive publique de la compétition actuelle puis retirer la compétition du direct public ?\n\nLes résultats, fiches nageurs et PDF seront copiés dans l'historique consultable. Les pages publiques directes seront ensuite vidées pour ne plus mélanger archive et direct.");
          if (!ok) return;
          try {
            await publishPublicResultsIndex({ silent: true, strict: true });
            const archive = await archiveCurrentResults?.("Archive publique de la compétition", undefined, { publicArchive: true });
            if (!archive?.id) {
              const cleanOnly = window.confirm("Aucun résultat publié n'a été trouvé à archiver.\n\nRetirer quand même la compétition du direct public ?");
              if (!cleanOnly) return;
            }
            const cleared = await clearPublishedResults?.({
              skipArchive: true,
              unpublishPublicIndexes: true,
              clearSeriesPdfs: true,
              reason: "Compétition archivée"
            });
            await updateLiveNotes?.("Compétition archivée et retirée du direct public", { publicDirectDisabled: true });
            window.alert(archive?.id
              ? `Archive créée : ${archive.count} résultat${archive.count > 1 ? "s" : ""} archivé${archive.count > 1 ? "s" : ""}.\n\nDirect public vidé : ${cleared || 0} résultat${(cleared || 0) > 1 ? "s" : ""} retiré${(cleared || 0) > 1 ? "s" : ""}. Elle reste visible depuis la page Archives publiques.`
              : "Direct public retiré. Les pages directes ne doivent plus annoncer cette compétition.");
            if (archive?.id) window.open(`archives.html?archive=${encodeURIComponent(archive.id)}`, "_blank", "noopener");
          } catch (error) {
            console.error(error);
            window.alert(`Archivage impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-download-livepalmes-backup]")) {
          try {
            downloadAdminBackup?.();
          } catch (error) {
            console.error(error);
            window.alert(`Sauvegarde impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-restore-livepalmes-backup]")) {
          roleCodesModal.querySelector("[data-restore-livepalmes-backup-input]")?.click();
          return;
        }
        if (event.target.closest("[data-role-codes-back]")) {
          renderRoleCodesModal();
          return;
        }
        if (event.target.closest("[data-confirm-reset-history]")) {
          const confirmation = String(roleCodesModal.querySelector("#resetHistoryInput")?.value || "").trim().toUpperCase();
          if (confirmation !== "RAZ") {
            window.alert("RAZ annulée : il faut écrire RAZ.");
            return;
          }
          closeRoleCodesModal();
          await performResetHistoryWithArchive();
          return;
        }
        if (event.target.closest("[data-confirm-reset-results]")) {
          const confirmation = String(roleCodesModal.querySelector("#resetResultsInput")?.value || "").trim().toUpperCase();
          if (confirmation !== "RAZ") {
            window.alert("RAZ annulée : il faut écrire RAZ.");
            return;
          }
          if (!await prepareManualModeForReset()) return;
          const scope = roleCodesModal.querySelector("input[name='resetResultsScope']:checked")?.value || "results-session";
          const selectedResetSession = String(roleCodesModal.querySelector("#resetResultsSessionSelect")?.value || ensureResultsAdminSession() || "").trim();
          closeRoleCodesModal();
          try {
            if (scope === "history") {
              await performResetHistoryWithArchive();
            } else if (scope === "series-all") {
              await resetSeriesForNextCompetition();
            } else if (scope === "results-all") {
              const count = await clearPublishedResults();
              await updateLiveNotes("RAZ résultats publics compétition");
              window.alert(`${count} résultat${count > 1 ? "s" : ""} public${count > 1 ? "s" : ""} archivé${count > 1 ? "s" : ""} puis supprimé${count > 1 ? "s" : ""}.`);
            } else if (selectedResetSession) {
              const summary = await clearPublishedResultsForSession(selectedResetSession);
              await updateLiveNotes(`RAZ résultats publics S${selectedResetSession}`);
              window.alert(`${summary.results} résultat${summary.results > 1 ? "s" : ""} public${summary.results > 1 ? "s" : ""} et ${summary.sessionPdfs} PDF complet${summary.sessionPdfs > 1 ? "s" : ""} de session archivés puis supprimés pour S${selectedResetSession}.`);
            } else {
              window.alert("Aucune session sélectionnée pour le RAZ résultats.");
            }
          } catch (error) {
            console.error(error);
            window.alert(`RAZ impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-save-public-session-infos]")) {
          const nextInfos = {};
          roleCodesModal.querySelectorAll("[data-session-info-input]").forEach((field) => {
            const session = String(field.dataset.sessionInfoInput || "").trim();
            const value = String(field.value || "").trim();
            if (session && value) nextInfos[session] = value;
          });
          closeRoleCodesModal();
          updateLiveNotes("Informations sessions publiques", {
            publicSessionInfos: nextInfos,
            publicSessionInfosUpdatedAt: new Date().toISOString()
          }).then(async () => {
            await publishPublicResultsIndex({ silent: true });
            renderResultsAdminPanel();
            window.alert("Informations de session publiées sur les pages Résultats et Séries.");
          }).catch((error) => {
            console.error(error);
            window.alert(`Publication impossible : ${error?.message || error}`);
          });
          return;
        }
        const openArchiveButton = event.target.closest("[data-open-archive]");
        if (openArchiveButton) {
          const id = openArchiveButton.dataset.openArchive;
          const collection = historyArchivesCollection();
          if (!collection) return;
          const snapshot = await collection.doc(id).get();
          if (!snapshot.exists) {
            window.alert("Archive introuvable.");
            return;
          }
          const archive = snapshot.data();
          openDsqRows(Array.isArray(archive.alerts) ? archive.alerts : [], `Archive journal d'arbitrage - ${archive.createdLabel || id}`);
          return;
        }
        const deleteArchiveButton = event.target.closest("[data-delete-archive]");
        if (deleteArchiveButton) {
          if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
            window.alert("Suppression réservée à l'administrateur général.");
            return;
          }
          const ok = window.confirm("Supprimer définitivement cette archive ?");
          if (!ok) return;
          const collection = historyArchivesCollection();
          if (!collection) return;
          await collection.doc(deleteArchiveButton.dataset.deleteArchive).delete();
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        const openResultArchiveButton = event.target.closest("[data-open-result-archive]");
        if (openResultArchiveButton) {
          const id = openResultArchiveButton.dataset.openResultArchive;
          const collection = resultArchivesCollection();
          if (!collection) return;
          const archiveSnapshot = await collection.doc(id).get();
          if (!archiveSnapshot.exists) {
            window.alert("Archive introuvable.");
            return;
          }
          const itemSnapshot = await collection.doc(id).collection("items").get();
          const rows = itemSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          openResultArchiveRows(rows, archiveSnapshot.data());
          return;
        }
        const deleteResultArchiveButton = event.target.closest("[data-delete-result-archive]");
        if (deleteResultArchiveButton) {
          if (roleCodesModal.querySelector(".history-archives-dialog")?.dataset.archivesCanDelete !== "1") {
            window.alert("Suppression réservée à l'administrateur général.");
            return;
          }
          const ok = window.confirm("Supprimer définitivement cette archive de résultats ?\n\nSi elle est visible dans les archives publiques, elle disparaîtra aussi de la page Archives.");
          if (!ok) return;
          const collection = resultArchivesCollection();
          if (!collection || !context.firestoreDb) return;
          const archiveRef = collection.doc(deleteResultArchiveButton.dataset.deleteResultArchive);
          const itemSnapshot = await archiveRef.collection("items").get();
          const pdfSnapshot = await archiveRef.collection("resultPdfs").get();
          const sessionPdfSnapshot = await archiveRef.collection("sessionResultsPdfs").get();
          const archivesIndexRef = collection.parent?.collection("public")?.doc("archivesIndex") || null;
          const archivesIndexSnapshot = archivesIndexRef ? await archivesIndexRef.get().catch(() => null) : null;
          const batch = context.firestoreDb.batch();
          itemSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
          pdfSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
          sessionPdfSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
          if (archivesIndexSnapshot?.exists && Array.isArray(archivesIndexSnapshot.data()?.archives)) {
            batch.set(archivesIndexRef, {
              ...archivesIndexSnapshot.data(),
              archives: archivesIndexSnapshot.data().archives.filter((archive) => archive?.id !== archiveRef.id),
              updatedAt: new Date().toISOString()
            });
          }
          batch.delete(archiveRef);
          await batch.commit();
          await renderHistoryArchivesModal({ canDelete: true });
          return;
        }
        if (event.target.closest("[data-role-pin-cancel]")) {
          finishRolePin(false);
          return;
        }
        if (event.target.closest("[data-admin-auth-reset]")) {
          const emailInput = roleCodesModal.querySelector("#adminEmailInput");
          const email = String(emailInput?.value || "").trim();
          try {
            await livePalmesAdminAuth?.sendPasswordReset?.(email);
            window.alert("Email de reinitialisation envoye. Verifie la boite mail du compte admin.");
          } catch (error) {
            console.error(error);
            window.alert(`Reinitialisation impossible : ${error?.message || error}`);
          }
          return;
        }
        if (event.target.closest("[data-confirm-role-code-admin]")) {
          const action = event.target.closest("[data-confirm-role-code-admin]")?.dataset.confirmRoleCodeAdmin || "codes";
          if (livePalmesAdminAuth?.isAdminAuthenticated?.()) {
            await openAuthenticatedAdminAction(action);
            return;
          }
          const emailInput = roleCodesModal.querySelector("#adminEmailInput");
          const passwordInput = roleCodesModal.querySelector("#adminPasswordInput");
          if (emailInput || passwordInput) {
            try {
              await livePalmesAdminAuth?.signIn?.(emailInput?.value, passwordInput?.value);
              await openAuthenticatedAdminAction(action);
            } catch (error) {
              console.error(error);
              window.alert(`Connexion admin impossible : ${error?.message || error}`);
            }
            return;
          }
          const code = String(roleCodesModal.querySelector("#roleCodeAdminInput")?.value || "").trim();
          if (!livePalmesAdminAuth?.legacyAdminPinFallbackEnabled?.() || code !== ADMIN_PIN) {
            window.alert("Acces admin refuse.");
            return;
          }
          await openAuthenticatedAdminAction(action);
          return;
        }
        const pinButton = event.target.closest("[data-confirm-role-pin]");
        if (pinButton) {
          const role = pinButton.dataset.confirmRolePin;
          const code = String(roleCodesModal.querySelector("#rolePinInput")?.value || "").trim();
          if (livePalmesAdminAuth?.isAdminAuthenticated?.() || (livePalmesAdminAuth?.legacyAdminPinFallbackEnabled?.() && code === ADMIN_PIN)) {
            finishRolePin({ allowed: true, adminBypass: true });
          } else if (context.forceCloudRolePin === role || livePalmesPinAuth?.cloudPinModeEnabled?.(context.data?.notes)) {
            try {
              await livePalmesPinAuth.verifyRolePin({
                clientId: currentClientId?.(),
                competitionId: FIRESTORE_COMPETITION_ID,
                pin: code,
                role
              });
              context.cloudAuthenticatedRoles = {
                ...(context.cloudAuthenticatedRoles || {}),
                [role]: true
              };
              initFirebaseSync?.();
              unlockRole(role);
              finishRolePin({ allowed: true, adminBypass: false });
            } catch (error) {
              console.error(error);
              window.alert(`Code incorrect ou serveur PIN indisponible : ${error?.message || error}`);
            }
          } else if (code === currentRolePins()[role]) {
            unlockRole(role);
            finishRolePin({ allowed: true, adminBypass: false });
          } else {
            window.alert("Code incorrect.");
          }
          return;
        }
        const saveButton = event.target.closest("[data-save-role-codes]");
        if (saveButton) {
          await saveRoleCodesFromModal(true);
          return;
        }
      });
      
      roleCodesModal?.addEventListener("input", (event) => {
        if (event.target?.matches("[data-role-code]")) {
          event.target.value = String(event.target.value || "").replace(/\D/g, "").slice(0, 4);
          return;
        }
        if (event.target?.matches("#roleCodeAdminInput, #rolePinInput")) {
          event.target.value = String(event.target.value || "").replace(/[^0-9!]/g, "").slice(0, 5);
          return;
        }
        if (event.target?.matches("#resetHistoryInput, #resetResultsInput")) {
          event.target.value = String(event.target.value || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
        }
      });

      roleCodesModal?.addEventListener("change", async (event) => {
        const input = event.target?.closest("[data-restore-livepalmes-backup-input]");
        if (!input) return;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        try {
          const summary = await restoreAdminBackupFile?.(file);
          if (summary) {
            closeRoleCodesModal();
            window.alert(`Sauvegarde restauree : ${summary.series} lignes de series, ${summary.entrants} engages, ${summary.results} resultats, ${summary.alerts} alertes.`);
          }
        } catch (error) {
          console.error(error);
          window.alert(`Restauration impossible : ${error?.message || error}`);
        }
      });
      
      roleCodesModal?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const adminInput = event.target?.closest("#roleCodeAdminInput");
        const adminAuthInput = event.target?.closest("#adminEmailInput, #adminPasswordInput");
        if (adminInput || adminAuthInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-role-code-admin]")?.click();
          return;
        }
        const pinInput = event.target?.closest("#rolePinInput");
        if (pinInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-role-pin]")?.click();
          return;
        }
        const resetInput = event.target?.closest("#resetHistoryInput");
        if (resetInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-reset-history]")?.click();
          return;
        }
        const resetResultsInput = event.target?.closest("#resetResultsInput");
        if (resetResultsInput) {
          event.preventDefault();
          roleCodesModal.querySelector("[data-confirm-reset-results]")?.click();
        }
      });
  }

  window.LivePalmesUiAdminEvents = { init };
}());
