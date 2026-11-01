// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementNationalSwimmerEntrySnapshot(backendContext) {
  function engagementNationalSwimmerEntrySnapshot(swimmer = {}, source = "") {
    return backendContext.cleanEngagementEntrySwimmer({
      ...swimmer,
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      source: backendContext.cleanText(source || swimmer.source || "performances").slice(0, 40),
      individualEntries: swimmer.individualEntries || []
    });
  }

  function mergeEngagementEntryIndividualEntries(targetEntries = [], sourceEntries = []) {
    const byEvent = new Map();
    (Array.isArray(targetEntries) ? targetEntries : []).forEach((entry) => {
      const cleanEntry = backendContext.cleanEngagementEntryIndividualEntries([entry])[0];
      if (cleanEntry?.eventCode) byEvent.set(cleanEntry.eventCode, cleanEntry);
    });
    (Array.isArray(sourceEntries) ? sourceEntries : []).forEach((entry) => {
      const cleanEntry = backendContext.cleanEngagementEntryIndividualEntries([entry])[0];
      if (cleanEntry?.eventCode && !byEvent.has(cleanEntry.eventCode)) byEvent.set(cleanEntry.eventCode, cleanEntry);
    });
    return Array.from(byEvent.values());
  }

  function mergeEngagementClubEntrySwimmers(swimmers = [], sourceIds = [], targetSnapshot = {}) {
    const sourceKeys = new Set((Array.isArray(sourceIds) ? sourceIds : [sourceIds])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean));
    const targetKey = backendContext.cleanText(targetSnapshot.swimmerIndexId || targetSnapshot.id).slice(0, 80);
    if (!sourceKeys.size || !targetKey) return { swimmers: Array.isArray(swimmers) ? swimmers : [], changed: false };
    const cleanSwimmers = (Array.isArray(swimmers) ? swimmers : []).map(backendContext.cleanEngagementEntrySwimmer);
    const sourceSwimmer = cleanSwimmers.find((swimmer) => sourceKeys.has(backendContext.cleanText(swimmer.swimmerIndexId).slice(0, 80)));
    if (!sourceSwimmer) return { swimmers: cleanSwimmers, changed: false };
    const existingTarget = cleanSwimmers.find((swimmer) => backendContext.cleanText(swimmer.swimmerIndexId).slice(0, 80) === targetKey);
    const mergedTarget = backendContext.cleanEngagementEntrySwimmer({
      ...targetSnapshot,
      individualEntries: mergeEngagementEntryIndividualEntries(existingTarget?.individualEntries || [], sourceSwimmer.individualEntries || [])
    });
    const next = [];
    let targetInserted = false;
    cleanSwimmers.forEach((swimmer) => {
      const swimmerKey = backendContext.cleanText(swimmer.swimmerIndexId).slice(0, 80);
      if (sourceKeys.has(swimmerKey)) {
        if (!targetInserted && !existingTarget) {
          next.push(mergedTarget);
          targetInserted = true;
        }
        return;
      }
      if (swimmerKey === targetKey) {
        next.push(mergedTarget);
        targetInserted = true;
        return;
      }
      next.push(swimmer);
    });
    if (!targetInserted) next.push(mergedTarget);
    return { swimmers: next, changed: true };
  }

  function mergeEngagementClubEntryRelays(relays = [], sourceIds = [], targetSnapshot = {}) {
    const sourceKeys = new Set((Array.isArray(sourceIds) ? sourceIds : [sourceIds])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean));
    const targetKey = backendContext.cleanText(targetSnapshot.swimmerIndexId || targetSnapshot.id).slice(0, 80);
    if (!sourceKeys.size || !targetKey) return { relays: Array.isArray(relays) ? relays : [], changed: false };
    let changed = false;
    const targetMember = {
      swimmerIndexId: targetKey,
      swimmerId: backendContext.cleanText(targetSnapshot.swimmerId).slice(0, 80),
      firstName: backendContext.cleanText(targetSnapshot.firstName).slice(0, 80),
      lastName: backendContext.cleanText(targetSnapshot.lastName).slice(0, 80),
      name: backendContext.cleanText(targetSnapshot.name).slice(0, 160),
      birthDate: backendContext.cleanIsoDate(targetSnapshot.birthDate),
      sex: backendContext.normalizeCategoryCode(targetSnapshot.sex),
      licenseNumber: backendContext.cleanText(targetSnapshot.licenseNumber).slice(0, 60)
    };
    const nextRelays = (Array.isArray(relays) ? relays : []).map((relay) => {
      const memberIds = (Array.isArray(relay?.memberIds) ? relay.memberIds : [])
        .map((id) => backendContext.cleanText(id).slice(0, 80))
        .filter(Boolean);
      if (!memberIds.some((id) => sourceKeys.has(id))) return relay;
      if (memberIds.includes(targetKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Fusion impossible : source et cible sont dans le meme relais. Corrigez ce relais avant de fusionner.");
      }
      changed = true;
      const members = (Array.isArray(relay?.members) ? relay.members : []).map((member) =>
        sourceKeys.has(backendContext.cleanText(member?.swimmerIndexId).slice(0, 80)) ? targetMember : member
      );
      return backendContext.cleanFirestoreValue({
        ...relay,
        memberIds: Array.from(new Set(memberIds.map((id) => sourceKeys.has(id) ? targetKey : id))),
        members
      });
    });
    return { relays: nextRelays, changed };
  }

  function performanceMergeTargetPayloadFromSwimmer(targetSwimmer = {}) {
    const identityKey = backendContext.cleanText(targetSwimmer.identityKey).slice(0, 180) ||
      backendContext.engagementSwimmerIdentityKey(targetSwimmer.firstName, targetSwimmer.lastName, targetSwimmer.birthDate);
    return backendContext.cleanFirestoreValue({
      swimmerId: backendContext.cleanText(targetSwimmer.swimmerId || targetSwimmer.id || targetSwimmer.swimmerIndexId).slice(0, 80),
      swimmerIdentityKey: identityKey,
      swimmer: (0, backendContext.local$engagementNationalSwimmerFullName)(targetSwimmer),
      firstName: backendContext.cleanText(targetSwimmer.firstName).slice(0, 80),
      lastName: backendContext.cleanText(targetSwimmer.lastName).slice(0, 80),
      birthDate: backendContext.cleanIsoDate(targetSwimmer.birthDate),
      sex: backendContext.normalizeCategoryCode(targetSwimmer.sex)
    });
  }

  async function readPerformanceDocsForNationalSwimmerMerge(db, sourceSwimmer = {}, sourceSwimmerId = "", limit = 180) {
    const ids = Array.from(new Set([
      sourceSwimmerId,
      sourceSwimmer.id,
      sourceSwimmer.swimmerId,
      sourceSwimmer.swimmerIndexId,
      ...(Array.isArray(sourceSwimmer.sourceIds) ? sourceSwimmer.sourceIds : [])
    ].map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean))).slice(0, 25);
    const identityKey = backendContext.cleanText(sourceSwimmer.identityKey).slice(0, 180);
    if (!ids.length && !identityKey) return [];
    const performanceRows = await backendContext.getPerformanceBaseRowsBySwimmer({ swimmerIds: ids, identityKey });
    const rows = performanceRows.map((row) => {
      const id = backendContext.cleanText(row.performanceBaseId || backendContext.performanceBaseDocId(row));
      return {
        id,
        ref: db.collection(backendContext.PERFORMANCE_BASE_COLLECTION).doc(id),
        data: () => row
      };
    }).filter((doc) => doc.id);
    if (rows.length > limit) {
      throw new backendContext.HttpsError("failed-precondition", "Fusion trop volumineuse pour une action directe. Une migration dediee est necessaire.");
    }
    return rows;
  }

  return { engagementNationalSwimmerEntrySnapshot, mergeEngagementEntryIndividualEntries, mergeEngagementClubEntrySwimmers, mergeEngagementClubEntryRelays, performanceMergeTargetPayloadFromSwimmer, readPerformanceDocsForNationalSwimmerMerge };
}

module.exports = { createNationalService_engagementNationalSwimmerEntrySnapshot };
