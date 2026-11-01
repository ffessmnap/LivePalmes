// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_readEngagementClubAdminDirectory(backendContext) {
  async function readEngagementClubAdminDirectory(db) {
    const ref = (0, backendContext.local$engagementClubAdminDirectoryRef)(db);
    const snapshot = await ref.get();
    if (snapshot.exists && snapshot.data()?.status === "ready") {
      return {
        administrators: Object.values(snapshot.data()?.admins || {}),
        bootstrapped: false
      };
    }
    const stateSnapshot = await (0, backendContext.local$engagementMailRecipientIndexStateRef)(db).get();
    if (stateSnapshot.data()?.status !== "ready") {
      return { administrators: [], available: false, bootstrapped: false };
    }
    const recipients = await (0, backendContext.local$engagementMailRecipientsFromIndex)(db, ["engagements.club.manage"]);
    try {
      const directory = await (0, backendContext.local$writeEngagementClubAdminDirectory)(db, recipients);
      return {
        administrators: Object.values(directory.admins),
        available: true,
        bootstrapped: true
      };
    } catch (error) {
      console.error("Initialisation de l'annuaire privé des administrateurs impossible.", backendContext.cleanText(error?.message || error));
      return { administrators: [], available: false, bootstrapped: false };
    }
  }

  return { readEngagementClubAdminDirectory };
}

module.exports = { createMailService_readEngagementClubAdminDirectory };
