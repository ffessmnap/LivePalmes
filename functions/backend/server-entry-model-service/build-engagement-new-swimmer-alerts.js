// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_buildEngagementNewSwimmerAlerts(backendContext) {
  function engagementNewSwimmerAlertFromMatch(match = {}, context = {}, type = "") {
    const swimmerIndexId = backendContext.cleanText(match.id || match.swimmerIndexId);
    const clubId = backendContext.cleanText(match.clubId);
    const differentClub = clubId && clubId !== context.clubId;
    const alertType = type || (differentClub ? "club-change" : "duplicate");
    const firstName = backendContext.cleanText(match.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(match.lastName).slice(0, 80);
    return backendContext.cleanFirestoreValue({
      type: alertType,
      level: alertType === "inverted-identity" ? "error" : differentClub ? "warning" : "info",
      message: alertType === "inverted-identity"
        ? "Creation impossible : un nageur existe avec le nom et le prenom inverses."
        : alertType === "possible-duplicate"
        ? "Nageur ressemblant deja present dans LivePalmes."
        : differentClub
          ? "Nageur existant avec un dernier club connu different."
          : "Nageur existant avec la meme identite.",
      swimmerIndexId,
      swimmerId: backendContext.cleanText(match.swimmerId || match.id).slice(0, 80),
      source: backendContext.cleanText(match.source || "performances").slice(0, 40),
      identityKey: backendContext.cleanText(match.identityKey).slice(0, 180),
      name: [lastName, firstName].filter(Boolean).join(" ") || backendContext.cleanText(match.name).slice(0, 160),
      firstName,
      lastName,
      birthDate: backendContext.cleanIsoDate(match.birthDate),
      clubId,
      clubName: backendContext.cleanText(match.clubName).slice(0, 140),
      latestDate: backendContext.cleanIsoDate(match.latestDate),
      validationStatus: "validated-by-club"
    });
  }

  async function buildEngagementNewSwimmerAlerts(swimmer = {}, context = {}) {
    const alerts = [];
    const addAlert = (alert) => {
      if (!alert?.swimmerIndexId && !alert?.identityKey) return;
      const key = [alert.type, alert.identityKey || alert.swimmerIndexId, alert.clubId].join("|");
      if (alerts.some((item) => [item.type, item.identityKey || item.swimmerIndexId, item.clubId].join("|") === key)) return;
      alerts.push(alert);
    };
    const invertedIdentityKey = (0, backendContext.local$engagementSwimmerIdentityKey)(swimmer.lastName, swimmer.firstName, swimmer.birthDate);
    const identityKeys = Array.from(new Set([swimmer.identityKey, invertedIdentityKey].filter(Boolean)));
    const alertTypeForMatch = (match = {}) => invertedIdentityKey && invertedIdentityKey !== swimmer.identityKey && backendContext.cleanText(match.identityKey) === invertedIdentityKey
      ? "inverted-identity"
      : "";
    if (identityKeys.length) {
      const exactSnapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("identityKey", "in", identityKeys)
        .limit(10)
        .get();
      exactSnapshot.docs.forEach((doc) => {
        const match = backendContext.engagementClubSwimmerItem(doc);
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
      });
      const engagementSnapshot = await backendContext.db.collection("engagementClubSwimmers")
        .where("identityKey", "in", identityKeys)
        .limit(10)
        .get();
      engagementSnapshot.docs.forEach((doc) => {
        const match = (0, backendContext.local$engagementNewSwimmerItem)(doc);
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, alertTypeForMatch(match)));
      });
      backendContext.intranapSwimmersIndex
        .filter((match) => identityKeys.includes(backendContext.cleanText(match.identityKey)))
        .slice(0, 10)
        .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
          ...match,
          source: "reference"
        }, context, alertTypeForMatch(match))));
    }
    const lastToken = backendContext.performanceSearchTokens(swimmer.lastName)[0] || "";
    if (lastToken.length >= 2) {
      const similarSnapshot = await backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("searchPrefixes", "array-contains", lastToken.slice(0, Math.min(6, lastToken.length)))
        .limit(20)
        .get();
      similarSnapshot.docs.forEach((doc) => {
        const match = backendContext.engagementClubSwimmerItem(doc);
        if (alerts.some((alert) => alert.swimmerIndexId === match.id)) return;
        const sameBirthYear = backendContext.cleanText(match.birthDate).slice(0, 4) === backendContext.cleanText(swimmer.birthDate).slice(0, 4);
        const firstClose = backendContext.performanceSearchTokens(match.firstName).some((token) =>
          backendContext.performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
        );
        if (!sameBirthYear || !firstClose) return;
        addAlert(engagementNewSwimmerAlertFromMatch(match, context, "possible-duplicate"));
      });
      backendContext.intranapSwimmersIndex
        .filter((match) => {
          if (identityKeys.includes(backendContext.cleanText(match.identityKey))) return false;
          const sameBirthYear = backendContext.cleanText(match.birthDate).slice(0, 4) === backendContext.cleanText(swimmer.birthDate).slice(0, 4);
          const lastClose = backendContext.performanceSearchTokens(match.lastName).some((token) => token.slice(0, Math.min(6, lastToken.length)) === lastToken.slice(0, Math.min(6, lastToken.length)));
          const firstClose = backendContext.performanceSearchTokens(match.firstName).some((token) =>
            backendContext.performanceSearchTokens(swimmer.firstName).some((inputToken) => token.slice(0, 3) === inputToken.slice(0, 3))
          );
          return sameBirthYear && lastClose && firstClose;
        })
        .slice(0, 12)
        .forEach((match) => addAlert(engagementNewSwimmerAlertFromMatch({
          ...match,
          source: "reference"
        }, context, "possible-duplicate")));
    }
    return alerts
      .sort((left, right) =>
        Number(right.type === "inverted-identity") - Number(left.type === "inverted-identity") ||
        Number(right.type === "club-change") - Number(left.type === "club-change") ||
        backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
        backendContext.cleanText(left.name).localeCompare(backendContext.cleanText(right.name), "fr")
      )
      .slice(0, 8);
  }

  return { engagementNewSwimmerAlertFromMatch, buildEngagementNewSwimmerAlerts };
}

module.exports = { createEntryModelService_buildEngagementNewSwimmerAlerts };
