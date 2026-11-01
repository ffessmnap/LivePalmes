// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_removeEngagementClubTeamLeader(backendContext) {
  async function removeEngagementClubTeamLeader(request) {
    const context = await backendContext.engagementClubAccessContext(request);
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      try {
        const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0,128);
        const pool = require("../../nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
        const result = await require("../../nap-team-leader-remove").removeNativeTeamLeader(pool, {
          competitionId, clubId: String(context.clubId), actorUid: context.uid,
          leaderId: request.data?.leaderId, expectedFingerprint: request.data?.expectedFingerprint
        }, {
          read: async operation => { const snapshot = await backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).get(); return snapshot.exists ? snapshot.data().target : null; },
          prepare: (operation,target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).create({action:"nap.teamLeader.remove.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          checkpoint: (operation,target) => backendContext.db.collection("auditLogs").doc(`nap-team-leader-remove-${operation}-before`).update({target,updatedAt:new Date().toISOString()}),
          complete: (operation,target) => backendContext.writeAuditLogOnce("engagementClubEntry.teamLeaderRemoved",context.uid,{...target,auditPreparationId:`nap-team-leader-remove-${operation}-before`},operation)
        }, event => backendContext.assertEngagementClubWriteOpen(event));
        const competition = await backendContext.nativePortalCompetition(competitionId, () => {});
        const pack = await require("../../nap-portal-entries").readNativeClubEntry(pool,{competitionId,clubId:context.clubId},()=>{});
        return {...result,competition:{...competition,nativeTeamLeaderEditable:pack.leaders.length<=1,nativeTeamLeaderRequired:pack.leaders.length===0,nativeRelaysEditable:false,nativeOfficialsEditable:false,nativeIndividualEntriesEditable:false,nativeSwimmerSelectionEditable:false},entry:await backendContext.nativeClubEntryView(pack,context,competition),sqlBudget:{queriesMax:54,writesMax:1}};
      } catch(error) {
        if(error instanceof backendContext.HttpsError) throw error;
        throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Retrait NAP a verifier. La sauvegarde est conservee.");
      }
    }
    const competitionId = backendContext.cleanText(request.data?.competitionId).slice(0, 128);
    if (!competitionId) {
      throw new backendContext.HttpsError("invalid-argument", "Competition requise.");
    }
    const competition = await backendContext.db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) {
      throw new backendContext.HttpsError("not-found", "Competition d'engagements introuvable.");
    }
    backendContext.assertEngagementClubWriteOpen(competition.data() || {});
    const now = new Date().toISOString();
    const entryRef = backendContext.db.collection("engagementClubEntries").doc(backendContext.engagementClubEntryId(competitionId, context.clubId));
    await backendContext.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(entryRef);
      if (!snapshot.exists) {
        throw new backendContext.HttpsError("not-found", "Aucun chef d'equipe enregistre.");
      }
      const entry = backendContext.engagementClubEntryItem(snapshot);
      if (entry.teamLeader.mode !== "person") {
        throw new backendContext.HttpsError("failed-precondition", "Aucun chef d'equipe a retirer.");
      }
      if (backendContext.engagementClubEntryHasParticipants(entry)) {
        throw new backendContext.HttpsError("failed-precondition", "Le chef d'equipe ne peut plus etre retire : remplacez-le tant que des nageurs, officiels ou relais sont engages.");
      }
      transaction.delete(entryRef);
      backendContext.deleteEngagementCompetitionEntrySummary(transaction, backendContext.db, entry, now);
    });
    await backendContext.writeAuditLog("engagementClubEntry.teamLeaderRemoved", context.uid, {
      competitionId,
      clubId: context.clubId
    });
    return {
      ok: true,
      entry: backendContext.engagementClubEntryItem(null, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      })
    };
  }

  return { removeEngagementClubTeamLeader };
}

module.exports = { createClubHandlers_removeEngagementClubTeamLeader };
