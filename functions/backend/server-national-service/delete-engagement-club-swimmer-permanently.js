// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_deleteEngagementClubSwimmerPermanently(backendContext) {
  async function engagementClubSwimmerDeletionUsage(swimmerId, swimmer = {}, context = {}) {
    const identityKey = backendContext.cleanText(swimmer.identityKey).slice(0, 180);
    const [performanceSnapshot, entriesSnapshot] = await Promise.all([
      identityKey
        ? backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", identityKey).limit(5).get()
        : Promise.resolve({ docs: [], size: 0 }),
      backendContext.db.collection("engagementClubEntries").where("clubId", "==", context.clubId).limit(201).get()
    ]);
    const competitionIds = entriesSnapshot.docs.filter((entryDoc) => {
      const entry = entryDoc.data() || {};
      const usedAsSwimmer = (Array.isArray(entry.swimmers) ? entry.swimmers : [])
        .some((item) => backendContext.cleanText(item?.swimmerIndexId) === swimmerId);
      const usedInRelay = (Array.isArray(entry.relays) ? entry.relays : []).some((relay) => {
        const memberIds = Array.isArray(relay?.memberIds)
          ? relay.memberIds
          : (Array.isArray(relay?.members) ? relay.members.map((member) => member?.swimmerIndexId) : []);
        return memberIds.some((memberId) => backendContext.cleanText(memberId) === swimmerId);
      });
      return usedAsSwimmer || usedInRelay;
    }).map((entryDoc) => backendContext.cleanText(entryDoc.data()?.competitionId || entryDoc.id).slice(0, 128));
    return {
      performanceMatchCount: performanceSnapshot.size || performanceSnapshot.docs.length,
      entryUsageCount: competitionIds.length,
      competitionIds: Array.from(new Set(competitionIds)).slice(0, 25),
      entryScanTruncated: entriesSnapshot.size > 200
    };
  }

  async function deleteEngagementClubSwimmerPermanently(ref, snapshot, context = {}, auditSource = "national") {
    const swimmerId = ref.id;
    const data = snapshot.data() || {};
    const alertsSnapshot = await backendContext.db.collection("engagementSwimmerAlerts")
      .where("newSwimmerId", "==", swimmerId)
      .limit(100)
      .get();
    const batch = backendContext.db.batch();
    batch.delete(ref);
    batch.delete(backendContext.db.collection("engagementSwimmerDeletionRequests").doc(swimmerId));
    batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(swimmerId).slice(0, 40)));
    const licenseNumberRefId = backendContext.engagementSwimmerLicenseNumberId(data.licenseNumber);
    if (licenseNumberRefId) {
      batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(licenseNumberRefId));
    }
    backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, { ...data, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" });
    alertsSnapshot.docs.forEach((alertDoc) => batch.delete(alertDoc.ref));
    await batch.commit();
    await backendContext.writeAuditLog("engagementClubSwimmer.deleted", context.uid, {
      swimmerId,
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      alertDocsDeleted: alertsSnapshot.size,
      source: auditSource
    });
    return { swimmerId, alertDocsDeleted: alertsSnapshot.size };
  }

  return { engagementClubSwimmerDeletionUsage, deleteEngagementClubSwimmerPermanently };
}

module.exports = { createNationalService_deleteEngagementClubSwimmerPermanently };
