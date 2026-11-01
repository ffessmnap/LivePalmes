// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_engagementNationalAdministrationPendingCounts(backendContext) {
  async function engagementNationalAdministrationPendingCounts() {
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const snapshots = await Promise.all([
        backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).where("status", "==", "pending").count().get(),
        backendContext.db.collection("accessUserDeletionRequests").where("status", "==", "pending").count().get()
      ]);
      const swimmerChanges = Math.max(0, Number(snapshots[0].data()?.count || 0));
      const accountDeletions = Math.max(0, Number(snapshots[1].data()?.count || 0));
      return { swimmerChanges, dataDeletions: 0, accountDeletions, total: swimmerChanges + accountDeletions };
    }

    const [competitionSnapshot, swimmerSnapshot, correctionSnapshot, accountSnapshot] = await Promise.all([
      backendContext.db.collection("engagementCompetitionDeletionRequests").where("status", "==", "pending").count().get(),
      backendContext.db.collection("engagementSwimmerDeletionRequests").where("status", "==", "pending").count().get(),
      backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).where("status", "==", "pending").count().get(),
      backendContext.db.collection("accessUserDeletionRequests").where("status", "==", "pending").count().get()
    ]);
    const competitionDeletionCount = Math.max(0, Number(competitionSnapshot.data()?.count || 0));
    const swimmerDeletionCount = Math.max(0, Number(swimmerSnapshot.data()?.count || 0));
    const swimmerChangeCount = Math.max(0, Number(correctionSnapshot.data()?.count || 0));
    const accountDeletionCount = Math.max(0, Number(accountSnapshot.data()?.count || 0));
    return {
      swimmerChanges: swimmerChangeCount,
      dataDeletions: competitionDeletionCount + swimmerDeletionCount,
      accountDeletions: accountDeletionCount,
      total: competitionDeletionCount + swimmerDeletionCount + swimmerChangeCount + accountDeletionCount
    };
  }

  return { engagementNationalAdministrationPendingCounts };
}

module.exports = { createNationalService_engagementNationalAdministrationPendingCounts };
