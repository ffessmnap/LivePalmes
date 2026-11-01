// Existing operation bodies; live services arrive through explicit accessors.
function createNationalHandlers_listEngagementNationalAuditLogs(backendContext) {
  async function listEngagementNationalAuditLogs(request) {
    const context = await backendContext.auditManagementContext(request);
    const limit = Math.min(backendContext.AUDIT_PAGE_LIMIT, Math.max(20, Math.trunc(Number(request.data?.limit) || backendContext.AUDIT_PAGE_LIMIT)));
    const requestedDays = [7, 30, 90, 365].includes(Math.trunc(Number(request.data?.days)))
      ? Math.trunc(Number(request.data.days))
      : 30;
    const requestedCutoff = new Date(Date.now() - requestedDays * 24 * 60 * 60 * 1000).toISOString();
    const visibleFrom = requestedCutoff > backendContext.AUDIT_LEGACY_VISIBLE_SINCE ? requestedCutoff : backendContext.AUDIT_LEGACY_VISIBLE_SINCE;
    const actorUid = backendContext.cleanText(request.data?.actorUid).slice(0, 160);
    const clubId = backendContext.cleanText(request.data?.clubId).slice(0, 80);
    const cursorCreatedAt = backendContext.cleanText(request.data?.cursor?.createdAt).slice(0, 40);
    const cursorId = backendContext.cleanText(request.data?.cursor?.id).slice(0, 160);

    let query = backendContext.db.collection("auditLogs").where("createdAt", ">=", visibleFrom);
    if (actorUid) query = query.where("actorUid", "==", actorUid);
    if (clubId) query = query.where("target.clubId", "==", clubId);
    query = query.orderBy("createdAt", "desc").orderBy(backendContext.FieldPath.documentId(), "desc");
    if (cursorCreatedAt && cursorId) query = query.startAfter(cursorCreatedAt, cursorId);
    const snapshot = await query.limit(limit + 1).get();
    const pageDocuments = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;
    const rawLogs = pageDocuments.map((doc) => {
      const data = doc.data() || {};
      return backendContext.cleanFirestoreValue({
        id: doc.id,
        action: backendContext.cleanText(data.action).slice(0, 120),
        actorUid: backendContext.cleanText(data.actorUid).slice(0, 160),
        createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
        target: typeof data.target === "object" && data.target ? data.target : {}
      });
    });
    const journal = await require("../../activity-journal").projectPage(rawLogs, async (ids) => {
      const documents = await backendContext.db.getAll(...ids.map((id) => backendContext.db.collection("auditLogs").doc(id)));
      return documents.filter((doc) => doc.exists).map((doc) => ({ id: doc.id, ...doc.data() }));
    });
    const logs = journal.logs;
    const knownActorUids = new Set((Array.isArray(request.data?.knownActorUids) ? request.data.knownActorUids : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 160))
      .filter(Boolean));
    const actorUidsToResolve = Array.from(new Set(logs
      .map((log) => log.actorUid)
      .filter((uid) => uid && !knownActorUids.has(uid) && !uid.startsWith("system:") && uid !== "public-login-page")))
      .slice(0, backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT);
    const knownCompetitionIds = new Set((Array.isArray(request.data?.knownCompetitionIds) ? request.data.knownCompetitionIds : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 128))
      .filter(Boolean));
    const competitionIdsToResolve = Array.from(new Set(logs
      .map((log) => backendContext.cleanText(log.target?.competitionId).slice(0, 128))
      .filter((competitionId) => competitionId && !knownCompetitionIds.has(competitionId))))
      .slice(0, backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT);
    const knownPersonIds = new Set((Array.isArray(request.data?.knownPersonIds) ? request.data.knownPersonIds : [])
      .slice(0, 100)
      .map((value) => backendContext.cleanText(value).slice(0, 80))
      .filter(Boolean));
    const personIdsToResolve = Array.from(new Set(logs
      .map((log) => backendContext.cleanText(log.target?.personId).slice(0, 80))
      .filter((personId) => personId && !knownPersonIds.has(personId))))
      .slice(0, backendContext.AUDIT_PERSON_RESOLUTION_LIMIT);
    // Independent reference families keep the same page limits and known IDs.
    const [actorSnapshots, competitionSnapshots, personSnapshots] = await Promise.all([
      actorUidsToResolve.length
        ? backendContext.db.getAll(...actorUidsToResolve.map((uid) => backendContext.db.collection("users").doc(uid))) : [],
      competitionIdsToResolve.length
        ? backendContext.db.getAll(...competitionIdsToResolve.map((competitionId) => backendContext.db.collection("engagementCompetitions").doc(competitionId))) : [],
      personIdsToResolve.length
        ? backendContext.db.getAll(...personIdsToResolve.map((personId) => backendContext.db.collection("engagementClubPeople").doc(personId))) : []
    ]);
    const unresolvedAuthUids = actorSnapshots
      .filter((actorSnapshot) => {
        const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
        return !backendContext.displayNameFromProfile(data) && !backendContext.cleanText(data.email);
      })
      .map((actorSnapshot) => actorSnapshot.id);
    const authUsers = unresolvedAuthUids.length
      ? await backendContext.auth.getUsers(unresolvedAuthUids.map((uid) => ({ uid }))).catch(() => ({ users: [] }))
      : { users: [] };
    const authUsersByUid = new Map(authUsers.users.map((user) => [user.uid, user]));
    const actors = actorSnapshots.map((actorSnapshot) => {
      const data = actorSnapshot.exists ? actorSnapshot.data() || {} : {};
      const authUser = authUsersByUid.get(actorSnapshot.id);
      return {
        uid: actorSnapshot.id,
        name: backendContext.displayNameFromProfile(data) || backendContext.cleanText(authUser?.displayName).slice(0, 160),
        email: (backendContext.cleanText(data.email) || backendContext.cleanText(authUser?.email)).slice(0, 180)
      };
    });
    const competitions = competitionSnapshots.map((competitionSnapshot) => {
      const data = competitionSnapshot.exists ? competitionSnapshot.data() || {} : {};
      return {
        id: competitionSnapshot.id,
        name: backendContext.cleanText(data.name || data.title).slice(0, 180),
        date: backendContext.cleanText(data.date).slice(0, 20)
      };
    });
    const people = personSnapshots.map((personSnapshot) => {
      const data = personSnapshot.exists ? personSnapshot.data() || {} : {};
      return {
        id: personSnapshot.id,
        name: backendContext.displayNameFromProfile(data),
        licenseNumber: backendContext.cleanText(data.licenseNumber).slice(0, 60)
      };
    });
    const lastDocument = pageDocuments.at(-1);
    return {
      ok: true,
      logs,
      actors,
      competitions,
      people,
      hasMore,
      nextCursor: hasMore && lastDocument
        ? { id: lastDocument.id, createdAt: backendContext.cleanText(lastDocument.data()?.createdAt).slice(0, 40) }
        : null,
      visibleFrom,
      readBudget: {
        auditDocuments: snapshot.docs.length,
        counterpartDocuments: journal.counterpartDocuments,
        actorDocuments: actorSnapshots.length,
        competitionDocuments: competitionSnapshots.length,
        personDocuments: personSnapshots.length,
        profileDocuments: context.profileReadCount,
        maximumDocuments: 2 * limit + 1 + backendContext.AUDIT_ACTOR_RESOLUTION_LIMIT + backendContext.AUDIT_COMPETITION_RESOLUTION_LIMIT + backendContext.AUDIT_PERSON_RESOLUTION_LIMIT + 1
      }
    };
  }

  return { listEngagementNationalAuditLogs };
}

module.exports = { createNationalHandlers_listEngagementNationalAuditLogs };
