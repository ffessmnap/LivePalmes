// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionHandlers_deleteEngagementCompetition(backendContext) {
  async function deleteEngagementCompetition(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const pool = require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      try {
        return await require("../../nap-competition-deletion").competitionDeletion(pool, {
          competitionId: request.data?.competitionId, actorUid: context.uid,
          previewOnly: request.data?.previewOnly === true, confirmPermanent: request.data?.confirmPermanent === true,
          expectedFingerprint: request.data?.expectedFingerprint
        }, {
          prepare: (id, target) => backendContext.db.collection("auditLogs").doc(`nap-competition-delete-${id}-before`).create({action:"nap.competitionDelete.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete: (id, target) => backendContext.writeAuditLogOnce("nap.competitionDelete.complete",context.uid,{...target,auditPreparationId:`nap-competition-delete-${id}-before`},`nap-competition-delete-${id}-complete`)
        }, async id => {
          const pack = await require("../../nap-portal-competitions").readNativeCompetition(pool,id,event=>backendContext.assertCanModifyEngagementEvent(context,event));
          if (!pack) throw new backendContext.HttpsError("not-found", "Competition NAP introuvable.");
          return pack;
        });
      } catch (error) {
        if (error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError("failed-precondition", error?.code === 6 || error?.code === "ALREADY_EXISTS" ? "Une suppression est deja en cours ou doit etre verifiee ; aucune nouvelle tentative automatique." : error instanceof TypeError || error instanceof RangeError ? error.message : "Suppression NAP a verifier ; sauvegarde conservee si la confirmation avait commence.");
      }
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }

    const docRef = backendContext.db.collection("engagementCompetitions").doc(competitionId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }

    const competition = snapshot.data() || {};
    if (!context.national) {
      backendContext.assertCanManageEngagementCompetition(context, competition);
      if (backendContext.engagementEventIsPast(competition)) {
        throw new backendContext.HttpsError("failed-precondition", "Une competition passee doit faire l'objet d'une demande de suppression au niveau national.");
      }
      if (backendContext.cleanEngagementEntryStatus(competition.entryStatus || competition.status) !== "upcoming") {
        throw new backendContext.HttpsError("failed-precondition", "Seule une competition a venir peut etre retiree du calendrier par la region.");
      }
      const entriesSnapshot = await backendContext.db.collection("engagementClubEntries")
        .where("competitionId", "==", competitionId)
        .limit(1)
        .get();
      if (!entriesSnapshot.empty) {
        throw new backendContext.HttpsError("failed-precondition", "Impossible de retirer cette competition : au moins un club a deja commence ses engagements.");
      }
    }
    const now = new Date().toISOString();
    const deletionRequestRef = backendContext.db.collection("engagementCompetitionDeletionRequests").doc(competitionId);
    const deletionRequest = await deletionRequestRef.get();
    const batch = backendContext.db.batch();
    batch.delete(docRef);
    const competitionDate = backendContext.cleanIsoDate(competition.date);
    const seasonEndYear = competitionDate ? backendContext.engagementSeasonEndYearFromIsoDate(competitionDate) : null;
    if (seasonEndYear !== null) {
      const season = backendContext.engagementSeasonBoundsFromEndYear(seasonEndYear);
      batch.set(backendContext.engagementCompetitionCalendarRef(backendContext.db, seasonEndYear), {
        ...season,
        generatedAt: now,
        updatedAt: now,
        competitions: {
          [competitionId]: backendContext.FieldValue.delete()
        }
      }, { merge: true });
    }
    batch.delete(backendContext.engagementClosureQueueRef(backendContext.db, competitionId));
    if (deletionRequest.exists) {
      batch.set(deletionRequestRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: context.uid,
        approvedByEmail: context.email || "",
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    await batch.commit();
    const competitionDocuments = backendContext.cleanCompetitionDocuments(competition.clubDocuments || [], { includeUploader: true });
    const documentDeletionResults = await Promise.allSettled(competitionDocuments.filter(backendContext.hasManagedEngagementCompetitionDocumentStorage).map((document) =>
      backendContext.storage.bucket(backendContext.LIVEPALMES_STORAGE_BUCKET)
        .file(backendContext.assertEngagementCompetitionDocumentPath(document.storagePath))
        .delete({ ignoreNotFound: true })
    ));
    await backendContext.writeAuditLog("engagementCompetition.deleted", context.uid, {
      competitionId,
      name: competition.name || "",
      date: competition.date || "",
      regionId: competition.regionId || "",
      level: competition.level || "",
      competitionDocumentCount: competitionDocuments.length,
      competitionDocumentDeleteErrorCount: documentDeletionResults.filter((result) => result.status === "rejected").length
    });
    return {
      ok: true,
      deleted: true,
      competitionId
    };
  }

  return { deleteEngagementCompetition };
}

module.exports = { createCompetitionHandlers_deleteEngagementCompetition };
