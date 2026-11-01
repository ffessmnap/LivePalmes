// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_assertNoEngagementSwimmerLicenseConflict(backendContext) {
  async function assertNoEngagementSwimmerLicenseConflict(db, swimmer = {}, ignoredSwimmerIds = []) {
    const conflict = await (0, backendContext.local$findEngagementSwimmerLicenseConflict)(db, swimmer, ignoredSwimmerIds);
    if (!conflict) return null;
    const name = [conflict.firstName, conflict.lastName].filter(Boolean).join(" ") || conflict.name || "un nageur existant";
    const club = backendContext.engagementClubCode(conflict.clubId) || backendContext.engagementClubName(conflict.clubId, conflict.clubName) || "club non renseigne";
    throw new backendContext.HttpsError("already-exists", `Licence deja utilisee par ${name} (${club}). Utilisez la fiche existante au lieu de creer un doublon.`, {
      conflict
    });
  }

  return { assertNoEngagementSwimmerLicenseConflict };
}

module.exports = { createEntryModelService_assertNoEngagementSwimmerLicenseConflict };
