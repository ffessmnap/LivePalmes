// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_assertEngagementSwimmerRoleCompatibility(backendContext) {
  function assertEngagementSwimmerRoleCompatibility(entryData = {}, swimmers = []) {
    const teamLeader = entryData.teamLeader || {};
    const teamLeaderLicense = (0, backendContext.local$engagementPersonLicenseKey)(teamLeader.licenseNumber);
    const officialLicenses = new Set((Array.isArray(entryData.officials) ? entryData.officials : [])
      .map((official) => (0, backendContext.local$engagementPersonLicenseKey)(official.licenseNumber))
      .filter(Boolean));
    swimmers.forEach((swimmer) => {
      const licenseKey = (0, backendContext.local$engagementPersonLicenseKey)(swimmer.licenseNumber);
      if (licenseKey && teamLeaderLicense === licenseKey) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et chef d'equipe sur cette competition.");
      }
      if (licenseKey && officialLicenses.has(licenseKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Une meme personne ne peut pas etre nageur et officiel sur cette competition.");
      }
    });
  }

  return { assertEngagementSwimmerRoleCompatibility };
}

module.exports = { createCompetitionModelService_assertEngagementSwimmerRoleCompatibility };
