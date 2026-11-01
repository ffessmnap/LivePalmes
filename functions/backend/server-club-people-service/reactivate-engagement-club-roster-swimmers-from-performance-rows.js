// Existing operation bodies; live services arrive through explicit accessors.
function createClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows(backendContext) {
  async function reactivateEngagementClubRosterSwimmersFromPerformanceRows(rows = [], context = {}) {
    const byClub = new Map();
    rows.filter((row) => row && row.isIntermediate !== true).forEach((row) => {
      const clubId = backendContext.cleanText(row.clubId).slice(0, 40);
      const swimmerId = backendContext.cleanText(row.swimmerId || row.originalSwimmerId).slice(0, 80);
      const identityKey = backendContext.cleanText(row.swimmerIdentityKey).slice(0, 180);
      if (!clubId || (!swimmerId && !identityKey)) return;
      if (!byClub.has(clubId)) byClub.set(clubId, { swimmerIds: new Set(), identityKeys: new Set() });
      if (swimmerId) byClub.get(clubId).swimmerIds.add(swimmerId);
      if (identityKey) byClub.get(clubId).identityKeys.add(identityKey);
    });
    if (!byClub.size) return { affectedClubs: 0, reactivatedSwimmers: 0 };
    if (byClub.size > 200) throw new Error("Trop de clubs à réactiver dans un seul import.");
    const clubIds = Array.from(byClub.keys());
    const refs = clubIds.map((clubId) => backendContext.engagementClubRosterRef(backendContext.db, clubId));
    const snapshots = await backendContext.db.getAll(...refs);
    const now = context.now || new Date().toISOString();
    const writer = backendContext.db.bulkWriter({ throttling: { initialOpsPerSecond: 50, maxOpsPerSecond: 100 } });
    let affectedClubs = 0;
    let reactivatedSwimmers = 0;
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const targets = byClub.get(clubIds[index]);
      const data = snapshot.data() || {};
      const entries = data.swimmers && typeof data.swimmers === "object" ? data.swimmers : {};
      const updates = {};
      Object.entries(entries).forEach(([key, swimmer]) => {
        const matches = targets.swimmerIds.has(backendContext.cleanText(swimmer?.swimmerId)) ||
          targets.identityKeys.has(backendContext.cleanText(swimmer?.identityKey));
        if (!matches || backendContext.cleanEngagementClubActivityStatus(swimmer?.clubActivityStatus) === "active") return;
        updates[key] = backendContext.engagementClubRosterSwimmerItem({
          ...swimmer,
          clubActivityStatus: "active",
          clubActivityStatusSource: "new-performance",
          clubActivityStatusUpdatedAt: now,
          clubActivityStatusUpdatedBy: context.actorUid || "system:performance-import"
        });
        reactivatedSwimmers += 1;
      });
      if (!Object.keys(updates).length) return;
      affectedClubs += 1;
      writer.set(snapshot.ref, { updatedAt: now, swimmers: updates }, { merge: true });
    });
    await writer.close();
    return { affectedClubs, reactivatedSwimmers };
  }

  return { reactivateEngagementClubRosterSwimmersFromPerformanceRows };
}

module.exports = { createClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows };
