(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("national-requests", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function loadEngagementAccessRequests({ force = false, silent = false } = {}) {
        portalConfig.accessRequestHistory?.onOpen();
        if (!portalActions.canReviewEngagementAccessRequests() || portalState.engagementAccessRequestsLoading) return;
        if (portalState.engagementAccessRequestsLoaded && !force) return;
        portalState.engagementAccessRequestsLoading = true;
        if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
          portalContext.elements.engagementsAccessRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("listEngagementAccessRequests", { status: "pending", limit: 120 });
          portalState.engagementAccessRequests = Array.isArray(result.requests) ? result.requests : [];
          portalState.engagementAccessRequestsLoaded = true;
          portalActions.updateEngagementAccessRequestBadge(portalState.engagementAccessRequests.length);
          moduleActions.renderEngagementAccessRequests();
          if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
            portalActions.markLastRefresh(portalContext.elements.engagementsAccessRequestsStatus);
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `${portalState.engagementAccessRequests.length} demande${portalState.engagementAccessRequests.length > 1 ? "s" : ""} en attente.${portalActions.lastRefreshSuffix(portalContext.elements.engagementsAccessRequestsStatus)}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsAccessRequestsStatus && !silent) {
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `Lecture demandes impossible : ${error?.message || error}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementAccessRequestsLoading = false;
        }
      }

    async function resolveEngagementAccessRequest(requestId, decision, correctedRequest = null, resolutionReason = "") {
        const cleanId = String(requestId || "").trim();
        if (!cleanId || !portalActions.canReviewEngagementAccessRequests()) return;
        const request = portalState.engagementAccessRequests.find((item) => item.id === cleanId) || {};
        const approve = decision === "approved";
        const label = [request.firstName, request.lastName].filter(Boolean).join(" ") || request.email || "cette demande";
        const message = approve
          ? `Valider la demande de ${label} et créer l'accès aux engagements du club ?`
          : `Refuser la demande de ${label} ?`;
        if (approve && !global.confirm(message)) return false;
        if (portalContext.elements.engagementsAccessRequestsStatus) {
          portalContext.elements.engagementsAccessRequestsStatus.textContent = approve ? "Validation en cours..." : "Refus en cours...";
          portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("resolveEngagementAccessRequest", {
            requestId: cleanId,
            decision: approve ? "approved" : "rejected",
            ...(approve && correctedRequest ? { correctedRequest } : {}),
            ...(!approve ? { resolutionReason: String(resolutionReason || "").trim() } : {})
          });
          portalConfig.accessRequestHistory?.invalidate();
          if (approve && result.access?.email) {
            await global.firebase?.auth?.().sendPasswordResetEmail(result.access.email, {
              url: `${global.LivePalmesEnvironment.authOrigin}/portail.html`,
              handleCodeInApp: false
            }).catch(() => {});
          }
          portalState.engagementAccessRequestsLoaded = false;
          if (portalActions.canManageAccessDirectory()) portalActions.refreshAccessUsersAfterMutation({ reset: true });
          await moduleActions.loadEngagementAccessRequests({ force: true });
          portalState.portalPendingOverviewLoaded = false;
          await portalActions.loadPortalPendingOverview({ force: true });
          if (portalContext.elements.engagementsAccessRequestsStatus) {
            const notificationFailed = !approve && result.resolutionNotification?.status !== "sent";
            portalContext.elements.engagementsAccessRequestsStatus.textContent = approve
              ? "Demande validée. L'accès club est actif et un e-mail de mot de passe a été envoyé si possible."
              : notificationFailed
                ? "Demande refusée, mais l’e-mail d’information n’a pas pu être envoyé."
                : "Demande refusée et demandeur informé par e-mail.";
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = notificationFailed ? "error" : "ok";
          }
          return true;
        } catch (error) {
          if (portalContext.elements.engagementsAccessRequestsStatus) {
            portalContext.elements.engagementsAccessRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsAccessRequestsStatus.dataset.tone = "error";
          }
          moduleActions.setEngagementAccessRequestEditMessage(`Validation impossible : ${error?.message || error}`);
          return false;
        }
      }

    async function submitEngagementAccessRequestEdit(event) {
        event?.preventDefault?.();
        const requestId = portalContext.elements.engagementsAccessRequestEditId?.value || "";
        if (!requestId) return;
        const button = portalContext.elements.engagementsAccessRequestEditForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        moduleActions.setEngagementAccessRequestEditMessage("Validation en cours...", "loading");
        try {
          const ok = await moduleActions.resolveEngagementAccessRequest(requestId, "approved", moduleActions.correctedEngagementAccessRequestFromEditForm());
          if (ok) moduleActions.closeEngagementAccessRequestEditForm();
        } finally {
          if (button) button.disabled = false;
        }
      }

    async function submitPublicEngagementAccessRequest(event) {
        event?.preventDefault?.();
        portalActions.setFormPending(portalContext.elements.publicAccessRequestForm, true, "Envoi en cours…");
        portalActions.setPublicAccessRequestMessage("Envoi de la demande...", "loading");
        try {
          await portalActions.matchPublicAccessRequestClubByFederalNumber();
          portalActions.setPublicAccessRequestMessage("Envoi de la demande...", "loading");
          const result = await portalActions.callFunction("submitEngagementAccessRequest", moduleActions.publicAccessRequestPayloadFromForm());
          portalContext.elements.publicAccessRequestForm?.reset();
          portalActions.populatePublicAccessRequestClubSelect();
          portalActions.updatePublicAccessRequestNewClubMode();
          portalState.engagementAccessRequestsLoaded = false;
          portalActions.setPublicAccessRequestMessage(
            result.existingAccount
              ? "Cette adresse semble déjà associée à un compte LivePalmes. Consultez l'e-mail que nous venons de vous envoyer."
              : "Demande envoyée. Elle doit maintenant être validée par la région ou le niveau national.",
            "ok"
          );
        } catch (error) {
          portalActions.setPublicAccessRequestMessage(`Demande impossible : ${error?.message || error}`);
        } finally {
          portalActions.setFormPending(portalContext.elements.publicAccessRequestForm, false);
        }
      }

    async function loadEngagementDeletionRequests({ force = false, silent = false } = {}) {
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") {
          portalState.engagementDeletionRequests = [];
          portalState.engagementDeletionRequestsLoaded = true;
          moduleActions.updateEngagementDeletionRequestBadge(0);
          moduleActions.renderEngagementDeletionRequests();
          return;
        }
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementDeletionRequestsLoading) return;
        if (portalState.engagementDeletionRequestsLoaded && !force) return;
        portalState.engagementDeletionRequestsLoading = true;
        moduleActions.updateEngagementNationalRequestsPresentation();
        if (portalContext.elements.engagementsDeletionRequestsRefresh) portalContext.elements.engagementsDeletionRequestsRefresh.disabled = true;
        if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
          portalContext.elements.engagementsDeletionRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
        }
        try {
          const [competitionResult, swimmerResult] = await Promise.all([
            portalActions.callFunction("listEngagementCompetitionDeletionRequests", { status: "pending", limit: 50 }),
            portalActions.callFunction("listEngagementSwimmerDeletionRequests", { status: "pending", limit: 50 })
          ]);
          portalState.engagementDeletionRequests = [
            ...(Array.isArray(competitionResult.requests) ? competitionResult.requests.map((request) => ({ ...request, requestType: "competition" })) : []),
            ...(Array.isArray(swimmerResult.requests) ? swimmerResult.requests : [])
          ].sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
          portalState.engagementDeletionRequestsLoaded = true;
          moduleActions.updateEngagementDeletionRequestBadge(portalState.engagementDeletionRequests.length);
          moduleActions.renderEngagementDeletionRequests();
          if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
            portalActions.markLastRefresh(portalContext.elements.engagementsDeletionRequestsStatus);
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `${portalState.engagementDeletionRequests.length} demande${portalState.engagementDeletionRequests.length > 1 ? "s" : ""} en attente.`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "ok";
          }
        } catch (error) {
          if (portalContext.elements.engagementsDeletionRequestsStatus && !silent) {
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `Lecture impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementDeletionRequestsLoading = false;
          if (portalContext.elements.engagementsDeletionRequestsRefresh) portalContext.elements.engagementsDeletionRequestsRefresh.disabled = false;
          moduleActions.updateEngagementNationalRequestsPresentation();
        }
      }

    async function resolveEngagementDeletionRequest(requestId, decision, requestType = "competition") {
        const cleanId = String(requestId || "").trim();
        if (!cleanId || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const approve = decision === "approved";
        const swimmerRequest = requestType === "swimmer";
        const message = swimmerRequest
          ? approve
            ? "Confirmer le retrait de ce nageur ? Sa fiche restera archivée et désactivée pour préserver l'historique."
            : "Refuser cette demande et réactiver le nageur dans l'effectif de son club ?"
          : approve
            ? "Approuver cette demande et supprimer définitivement la compétition ?"
            : "Refuser cette demande de suppression ?";
        if (!global.confirm(message)) return;
        if (portalContext.elements.engagementsDeletionRequestsStatus) {
          portalContext.elements.engagementsDeletionRequestsStatus.textContent = swimmerRequest
            ? approve ? "Confirmation du retrait..." : "Réactivation en cours..."
            : approve ? "Suppression en cours..." : "Refus en cours...";
          portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "loading";
        }
        try {
          await portalActions.callFunction(swimmerRequest ? "resolveEngagementSwimmerDeletionRequest" : "resolveEngagementCompetitionDeletionRequest", {
            requestId: cleanId,
            decision: approve ? "approved" : "rejected"
          });
          portalState.portalPendingOverviewLoaded = false;
          portalState.engagementDeletionRequestsLoaded = false;
          await moduleActions.loadEngagementDeletionRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (approve && !swimmerRequest) {
            portalActions.invalidateEngagementCalendarCaches();
            portalActions.closeEngagementCompetitionDetail();
            await portalActions.loadEngagementCompetitions({ force: true });
          }
        } catch (error) {
          if (portalContext.elements.engagementsDeletionRequestsStatus) {
            portalContext.elements.engagementsDeletionRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsDeletionRequestsStatus.dataset.tone = "error";
          }
        }
      }

    async function loadEngagementSwimmerChangeRequests({ force = false } = {}) {
        if (!portalActions.canDeleteEngagementCompetitionDirectly() || portalState.engagementSwimmerChangeRequestsLoading) return;
        if (portalState.engagementSwimmerChangeRequestsLoaded && !force) return;
        portalState.engagementSwimmerChangeRequestsLoading = true;
        moduleActions.updateEngagementNationalRequestsPresentation();
        if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = "Chargement des demandes...";
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
        }
        moduleActions.renderEngagementSwimmerChangeRequests();
        try {
          const result = await portalActions.callFunction("listEngagementSwimmerChangeRequests", { status: "pending", limit: 50 });
          portalState.engagementSwimmerChangeRequests = Array.isArray(result.requests) ? result.requests : [];
          portalState.engagementSwimmerChangeRequestsLoaded = true;
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = "";
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "neutral";
          }
        } catch (error) {
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = `Demandes impossibles à charger : ${error?.message || error}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
          }
        } finally {
          portalState.engagementSwimmerChangeRequestsLoading = false;
          moduleActions.renderEngagementSwimmerChangeRequests();
          moduleActions.updateEngagementNationalRequestsPresentation();
        }
      }

    async function resolveEngagementSwimmerChangeRequest(requestId = "", decision = "", card = null, options = {}) {
        if (!requestId || !["approved", "rejected"].includes(decision) || !portalActions.canDeleteEngagementCompetitionDirectly()) return;
        const duplicate=portalState.engagementSwimmerChangeRequests.find(item=>item.id===requestId)?.reportType==="duplicate";
        const verb = decision === "approved" ? "Valider" : "Refuser";
        if (options.confirm !== false && !global.confirm(duplicate ? "Clore ce signalement sans modifier ni fusionner de fiche ?" : `${verb} cette demande de correction ?`)) return;
        const resolutionNote = String(options.resolutionNote ?? card?.querySelector("[data-engagement-swimmer-change-resolution-note]")?.value ?? "").trim();
        const buttons = card?.querySelectorAll("button") || [];
        buttons.forEach((button) => { button.disabled = true; });
        if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = decision === "approved" ? "Application de la correction..." : "Refus de la demande...";
          portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "loading";
        }
        try {
          const result = await portalActions.callFunction("resolveEngagementSwimmerChangeRequest", {
            requestId,
            decision,
            resolutionNote,
            ...(options.proposed && typeof options.proposed === "object" ? { proposed: options.proposed } : {})
          });
          const correctedPerson=result?.result?.person;
          if(correctedPerson){
            portalState.engagementNationalPeopleLoaded=false;
            if(portalState.engagementClubPeople.some(person=>person.id===correctedPerson.id&&String(person.clubId)===String(correctedPerson.clubId))){
              portalState.engagementClubPeople=portalState.engagementClubPeople.map(person=>person.id===correctedPerson.id?correctedPerson:person);
              portalActions.renderEngagementClubPeople();
            }
          }
          portalState.portalPendingOverviewLoaded = false;
          portalState.engagementSwimmerChangeRequestsLoaded = false;
          portalState.engagementNationalSwimmersLoaded = false;
          portalActions.invalidateEngagementClubSwimmersCache();
          await moduleActions.loadEngagementSwimmerChangeRequests({ force: true });
          await portalActions.loadPortalPendingOverview({ force: true });
          if (portalContext.elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2) {
            await portalActions.loadEngagementNationalSwimmers({ force: true, silent: true });
          }
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            const publicWarning = result?.result?.publicSnapshot?.ok === false
              ? " La fiche a été corrigée, mais sa publication publique devra être relancée."
              : "";
            const notificationStatus = result?.request?.resolutionNotification?.status || "";
            const testMailDisabled = global.LivePalmesEnvironment?.isTest === true && result?.request?.resolutionNotification?.reason === "test-emails-disabled";
            const mailWarning = notificationStatus && notificationStatus !== "sent" && !testMailDisabled && !duplicate && result?.request?.requestType !== "swimmer-ns"
              ? " La demande a bien été traitée, mais l’e-mail au demandeur n’a pas été envoyé."
              : "";
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = duplicate ? "Signalement clos. Aucune fiche n’a été modifiée ou fusionnée." : `${decision === "approved" ? "Correction validée." : "Demande refusée."}${publicWarning}${mailWarning}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = publicWarning || mailWarning ? "warning" : "ok";
          }
          return result;
        } catch (error) {
          buttons.forEach((button) => { button.disabled = false; });
          if (portalContext.elements.engagementsSwimmerChangeRequestsStatus) {
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.textContent = `Traitement impossible : ${error?.message || error}`;
            portalContext.elements.engagementsSwimmerChangeRequestsStatus.dataset.tone = "error";
          }
          if (options.rethrow) throw error;
          return null;
        }
      }

    async function submitEngagementAccessRequestRejection(event) {
        event?.preventDefault?.();
        const requestId = portalContext.elements.engagementsAccessRequestRejectId?.value || "";
        const reason = String(portalContext.elements.engagementsAccessRequestRejectReason?.value || "").trim();
        if (!requestId || !reason) return;
        const button = portalContext.elements.engagementsAccessRequestRejectForm?.querySelector("button[type='submit']");
        if (button) button.disabled = true;
        if (portalContext.elements.engagementsAccessRequestRejectMessage) {
          portalContext.elements.engagementsAccessRequestRejectMessage.textContent = "Refus et envoi de l’e-mail en cours...";
          portalContext.elements.engagementsAccessRequestRejectMessage.dataset.tone = "loading";
        }
        const resolved = await moduleActions.resolveEngagementAccessRequest(requestId, "rejected", null, reason);
        if (resolved) moduleActions.closeEngagementAccessRequestRejectDialog();
        else if (portalContext.elements.engagementsAccessRequestRejectMessage) {
          portalContext.elements.engagementsAccessRequestRejectMessage.textContent = "Refus impossible. Vérifiez le message affiché dans la liste des demandes.";
          portalContext.elements.engagementsAccessRequestRejectMessage.dataset.tone = "error";
        }
        if (button) button.disabled = false;
      }

    async function submitEngagementSwimmerCorrection() {
        if(portalContext.elements.engagementsSwimmerCorrectionForm?.getAttribute?.("aria-busy")==="true")return;
        if (!portalContext.elements.engagementsSwimmerCorrectionForm?.reportValidity()) return;
        const correctionSession=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession;
        const clubScopeVersion=portalState.engagementClubPeopleRequestVersion;
        const mode = portalContext.elements.engagementsSwimmerCorrectionMode?.value || "request";
        const direct = mode === "direct";
        const review = mode === "review";
        const duplicate = mode === "duplicate";
        if (direct && portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource !== "true" && !global.confirm("Enregistrer cette correction nationale ?")) return;
        if (review && !global.confirm("Valider cette demande avec les valeurs affichées ?")) return;
        const payload = {
          napSource: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource === "true",
          expectedFingerprint: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.expectedFingerprint || "",
          expectedLicenseNumber: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.expectedLicenseNumber || "",
          source: portalContext.elements.engagementsSwimmerCorrectionSource?.value || "performances",
          swimmerId: portalContext.elements.engagementsSwimmerCorrectionId?.value || "",
          identityKey: portalContext.elements.engagementsSwimmerCorrectionIdentityKey?.value || "",
          proposed: {
            lastName: portalContext.elements.engagementsSwimmerCorrectionLastName?.value || "",
            firstName: portalContext.elements.engagementsSwimmerCorrectionFirstName?.value || "",
            birthDate: portalContext.elements.engagementsSwimmerCorrectionBirthDate?.value || "",
            sex: portalContext.elements.engagementsSwimmerCorrectionSex?.value || "",
            licenseNumber: portalContext.elements.engagementsSwimmerCorrectionForm?.dataset.napSource === "true" ? String(portalContext.elements.engagementsSwimmerCorrectionLicense?.value || "").trim() : portalActions.formatEngagementSwimmerLicense(portalContext.elements.engagementsSwimmerCorrectionLicense?.value || "")
          },
          reason: portalContext.elements.engagementsSwimmerCorrectionReason?.value || ""
        };
        if(portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind==="official")payload.personId=payload.swimmerId;
        if(payload.napSource&&!direct&&!review&&!duplicate) {
          try {
            const official=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.identityKind==="official";
            const plan=global.LivePalmesClubIdentity.classify(JSON.parse(portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialIdentity),payload.proposed,official);
            if(plan.action==="none")throw Error("Aucune modification.");
            if(official)payload.personId=payload.swimmerId;
            payload.proposed=plan.patch;
            if(plan.action==="complete") {
              payload.completeLicense=!official;
              payload.completePerson=official;
            }
          }catch(error){if(portalContext.elements.engagementsSwimmerCorrectionMessage){portalContext.elements.engagementsSwimmerCorrectionMessage.textContent=error.message;portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone="error";}return;}
        } else if(payload.napSource&&!direct)delete payload.proposed.licenseNumber;
        if(direct&&payload.napSource&&portalContext.elements.engagementsSwimmerCorrectionClub){const club=portalContext.elements.engagementsSwimmerCorrectionClub.querySelector("select");if(!club?.value||!club.reportValidity())return;payload.proposed.clubId=club.value;}
        if (duplicate) { payload.reportType="duplicate"; payload.proposed={}; }
        portalActions.setFormPending(
          portalContext.elements.engagementsSwimmerCorrectionForm,
          true,
          review ? "Validation en cours…" : direct ? "Enregistrement en cours…" : "Envoi en cours…"
        );
        if (portalContext.elements.engagementsSwimmerCorrectionMessage) {
          portalContext.elements.engagementsSwimmerCorrectionMessage.textContent = review ? "Validation de la demande..." : direct ? "Enregistrement de la correction..." : "Envoi de la demande...";
          portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone = "loading";
          portalContext.elements.engagementsSwimmerCorrectionMessage.classList.add("is-loading");
        }
        try {
          if(direct&&payload.napSource){
            const clubChanged=String(payload.proposed.clubId)!==portalContext.elements.engagementsSwimmerCorrectionForm.dataset.initialClubId;
            if(clubChanged){
              const serialized=JSON.stringify(payload),previous=portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload;
              const retry=previous?JSON.parse(previous):null;
              if(retry?.serialized===serialized)payload.historicalClubConfirmation=retry.token;
              else{
                const preview=await portalActions.callFunction("updateEngagementNationalSwimmerIdentity",{...payload,previewOnly:true});
                if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
                const summary=preview?.historicalClubPreview;
                if(!summary?.token)throw Error("Récapitulatif des clubs historiques indisponible. Rechargez la fiche.");
                const confirmed=await global.LivePalmesSwimmerClubs.getTools(portalActions.callFunction).confirmClubChange(summary);
                if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
                if(!confirmed){
                  portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm,false);
                  if(portalContext.elements.engagementsSwimmerCorrectionMessage){portalContext.elements.engagementsSwimmerCorrectionMessage.textContent="Changement de club annulé. Aucune donnée modifiée.";portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone="neutral";portalContext.elements.engagementsSwimmerCorrectionMessage.classList.remove("is-loading");}
                  return;
                }
                payload.historicalClubConfirmation=summary.token;
                portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload=JSON.stringify({serialized,token:summary.token});
              }
            }else if(!global.confirm("Enregistrer cette correction nationale ?")){portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm,false);return;}
            if(!portalContext.elements.engagementsSwimmerCorrectionDialog?.open||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession)return;
          }
          const result = review
            ? await moduleActions.resolveEngagementSwimmerChangeRequest(
              portalState.engagementSwimmerCorrectionReview?.requestId || "",
              "approved",
              portalState.engagementSwimmerCorrectionReview?.card || null,
              {
                confirm: false,
                rethrow: true,
                proposed: payload.proposed,
                resolutionNote: payload.reason
              }
            )
            : payload.completePerson
              ? await portalActions.callFunction("saveEngagementClubPerson",{personId:payload.personId,expectedFingerprint:payload.expectedFingerprint,patch:payload.proposed})
              : await portalActions.callFunction(direct ? "updateEngagementNationalSwimmerIdentity" : "requestEngagementClubSwimmerChange", payload);
          if(payload.personId) {
            if(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open)return;
            const changedPerson=result.person||result.result?.person;
            if(changedPerson)portalState.engagementClubPeople=portalState.engagementClubPeople.filter(person=>person.id!==changedPerson.id).concat(changedPerson);
            portalActions.renderEngagementClubPeople();portalState.engagementSwimmerChangeRequestsLoaded=false;moduleActions.closeEngagementSwimmerCorrectionDialog();
            if(portalContext.elements.engagementsClubPeopleStatus){portalContext.elements.engagementsClubPeopleStatus.textContent=payload.completePerson?"Champs manquants enregistrés. Aucun visa demandé.":"Demande transmise au niveau national.";portalContext.elements.engagementsClubPeopleStatus.dataset.tone="ok";}
            return;
          }
          if(payload.completeLicense) {
            if(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open)return;
            const index=portalState.engagementClubSwimmers.findIndex(swimmer=>String(swimmer.id||swimmer.swimmerIndexId)===String(payload.swimmerId));
            if(index>=0){
              const saved=result.swimmer||{};
              portalState.engagementClubSwimmers[index]={...portalState.engagementClubSwimmers[index],licenseNumber:saved.licenseNumber,napFingerprint:saved.napFingerprint||portalState.engagementClubSwimmers[index].napFingerprint,...Object.fromEntries(["licenseVerificationStatus","licenseSeasonLabel","licenseSeasonStatus"].filter(key=>saved[key]!==undefined).map(key=>[key,saved[key]]))};
              portalActions.writeEngagementClubSwimmersCache();
            }
            portalActions.renderEngagementClubSwimmersDirectory();moduleActions.closeEngagementSwimmerCorrectionDialog();
            if(portalContext.elements.engagementsClubSwimmersDirectoryStatus){portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent="Licence enregistrée et numéro verrouillé. Le contrôle saisonnier est conservé.";portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone="ok";}
            return;
          }
          portalActions.invalidateEngagementClubSwimmersCache();
          portalState.engagementNationalSwimmersLoaded = false;
          portalState.engagementSwimmerChangeRequestsLoaded = false;
          moduleActions.closeEngagementSwimmerCorrectionDialog();
          if (review) {
            portalConfig.publicPerformanceSwimmerSearchShards.clear();
          } else if (direct) {
            portalConfig.publicPerformanceSwimmerSearchShards.clear();
            await Promise.all([
              portalContext.elements.engagementsNationalSwimmersSearch?.value.trim().length >= 2
                ? portalActions.loadEngagementNationalSwimmers({ force: true, silent: true })
                : Promise.resolve(),
              moduleActions.loadEngagementSwimmerChangeRequests({ force: true })
            ]);
            if (portalContext.elements.engagementsNationalSwimmersStatus) {
              const publicWarning = result?.publicSnapshot?.ok === false ? " Publication publique à relancer." : "";
              portalContext.elements.engagementsNationalSwimmersStatus.textContent = `Nageur corrigé.${publicWarning}`;
              portalContext.elements.engagementsNationalSwimmersStatus.dataset.tone = publicWarning ? "warning" : "ok";
            }
          } else {
            await portalActions.loadEngagementClubSwimmers({ force: true, silent: true });
            if (portalContext.elements.engagementsClubSwimmersDirectoryStatus) {
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.textContent = duplicate ? "Signalement transmis au niveau national. Aucune fiche n’a été modifiée." : "Demande envoyée au niveau national.";
              portalContext.elements.engagementsClubSwimmersDirectoryStatus.dataset.tone = "ok";
            }
          }
        } catch (error) {
          if((payload.personId||payload.completeLicense)&&(clubScopeVersion!==portalState.engagementClubPeopleRequestVersion||portalContext.elements.engagementsSwimmerCorrectionForm.dataset.correctionSession!==correctionSession||!portalContext.elements.engagementsSwimmerCorrectionDialog?.open))return;
          if(String(error?.code||"").endsWith("failed-precondition")||String(error?.code||"").endsWith("resource-exhausted"))delete portalContext.elements.engagementsSwimmerCorrectionForm.dataset.historicalClubPayload;
          portalActions.setFormPending(portalContext.elements.engagementsSwimmerCorrectionForm, false);
          if (portalContext.elements.engagementsSwimmerCorrectionMessage) {
            portalContext.elements.engagementsSwimmerCorrectionMessage.textContent = `Correction impossible : ${String(error?.message || error).replace(/^(Correction impossible :\s*)+/i, "")}`;
            portalContext.elements.engagementsSwimmerCorrectionMessage.dataset.tone = "error";
            portalContext.elements.engagementsSwimmerCorrectionMessage.classList.remove("is-loading");
          }
        }
      }
    return { loadEngagementAccessRequests, resolveEngagementAccessRequest, submitEngagementAccessRequestEdit, submitPublicEngagementAccessRequest, loadEngagementDeletionRequests, resolveEngagementDeletionRequest, loadEngagementSwimmerChangeRequests, resolveEngagementSwimmerChangeRequest, submitEngagementAccessRequestRejection, submitEngagementSwimmerCorrection };
  });
})(window);
