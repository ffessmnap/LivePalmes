// Existing operation bodies; live services arrive through explicit accessors.
function createNationalService_findEngagementSwimmerCorrectionLicense(backendContext) {
  async function findPerformanceSwimmerCorrectionTarget(db, swimmerId = "", identityKey = "") {
    const cleanId = backendContext.cleanText(swimmerId).slice(0, 80);
    const cleanIdentityKey = backendContext.cleanText(identityKey).slice(0, 180);
    if (cleanId) {
      const direct = await db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(cleanId).get();
      if (direct.exists) return direct;
      const bySourceId = await db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("sourceIds", "array-contains", cleanId)
        .limit(2)
        .get();
      if (bySourceId.docs.length === 1) return bySourceId.docs[0];
    }
    if (cleanIdentityKey) {
      const byIdentity = await db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("identityKey", "==", cleanIdentityKey)
        .limit(2)
        .get();
      if (byIdentity.docs.length === 1) return byIdentity.docs[0];
    }
    return null;
  }

  async function findEngagementSwimmerCorrectionLicense(db, swimmerIds = []) {
    const documentIds = Array.from(new Set((Array.isArray(swimmerIds) ? swimmerIds : [])
      .map((candidateId) => backendContext.cleanText(candidateId).slice(0, 80))
      .filter(Boolean)
      .map((candidateId) => backendContext.engagementSwimmerLicenseId({ swimmerIndexId: candidateId })))).slice(0, 25);
    if (!documentIds.length) return { license: null, documentId: "" };
    const snapshots = await db.getAll(...documentIds.map((documentId) =>
      db.collection("engagementSwimmerLicenses").doc(documentId)
    ));
    const snapshot = snapshots.find((candidate) => candidate.exists) || null;
    return {
      license: snapshot?.exists ? backendContext.engagementSwimmerLicenseItem(snapshot) : null,
      documentId: snapshot?.id || ""
    };
  }

  async function getEngagementSwimmerCorrectionTarget(db, source = "", swimmerId = "", identityKey = "") {
    const cleanSource = ["engagement", "performances", "reference"].includes(backendContext.cleanText(source)) ? backendContext.cleanText(source) : "performances";
    const cleanId = backendContext.cleanText(swimmerId).slice(0, 80);
    const cleanIdentityKey = backendContext.cleanText(identityKey).slice(0, 180);
    if (!cleanId) throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    if (cleanSource === "engagement") {
      const ref = db.collection("engagementClubSwimmers").doc(cleanId);
      const snapshot = await ref.get();
      if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
      return {
        requestedSource: cleanSource,
        requestedSwimmerId: cleanId,
        source: cleanSource,
        swimmerId: cleanId,
        ref,
        snapshot,
        swimmer: backendContext.engagementNewSwimmerItem(snapshot)
      };
    }
    const performanceSnapshot = await findPerformanceSwimmerCorrectionTarget(
      db,
      cleanId,
      cleanIdentityKey
    );
    if (performanceSnapshot?.exists) {
      const performanceSwimmer = backendContext.engagementClubSwimmerItem(performanceSnapshot);
      const licenseCandidateIds = Array.from(new Set([
        performanceSnapshot.id,
        cleanId,
        performanceSwimmer.swimmerId,
        ...(performanceSwimmer.sourceIds || [])
      ].map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean)));
      const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, licenseCandidateIds);
      const license = licenseMatch.license;
      return {
        requestedSource: cleanSource,
        requestedSwimmerId: cleanId,
        source: "performances",
        swimmerId: performanceSnapshot.id,
        licenseDocumentId: licenseMatch.documentId,
        ref: performanceSnapshot.ref,
        snapshot: performanceSnapshot,
        swimmer: {
          ...performanceSwimmer,
          ...(license?.licenseNumber ? {
            licenseNumber: license.licenseNumber,
            licenseVerificationStatus: license.verificationStatus,
            licenseSeasonLabel: license.licenseSeasonLabel,
            licenseSeasonStatus: license.licenseSeasonStatus,
            licenseSeasons: license.licenseSeasons
          } : {})
        }
      };
    }
    const performanceRows = await backendContext.getPerformanceBaseRowsBySwimmer({
      swimmerIds: [cleanId],
      identityKey: cleanIdentityKey
    });
    if (performanceRows.length) {
      const candidates = backendContext.aggregateSwimmerIndexRows(performanceRows);
      const matchingCandidates = candidates.filter((candidate) => {
        const candidateIds = [candidate.id, ...(candidate.sourceIds || []), ...(candidate.aliases || [])]
          .map(backendContext.cleanText)
          .filter(Boolean);
        return candidateIds.includes(cleanId) || (cleanIdentityKey && backendContext.cleanText(candidate.identityKey) === cleanIdentityKey);
      });
      if (matchingCandidates.length > 1) {
        throw new backendContext.HttpsError("failed-precondition", "Plusieurs fiches de performances correspondent a cet identifiant. Utilisez la fusion avant la correction.");
      }
      if (matchingCandidates.length === 1) {
        const recovered = matchingCandidates[0];
        if (cleanIdentityKey && backendContext.cleanText(recovered.identityKey) !== cleanIdentityKey) {
          throw new backendContext.HttpsError("failed-precondition", "La fiche de performances a change depuis la recherche. Rechargez-la avant de corriger.");
        }
        const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, [
          cleanId,
          recovered.id,
          ...(recovered.sourceIds || []),
          ...(recovered.aliases || [])
        ]);
        return {
          requestedSource: cleanSource,
          requestedSwimmerId: cleanId,
          source: "performance-base",
          swimmerId: backendContext.cleanText(recovered.id || cleanId).slice(0, 80),
          ref: null,
          snapshot: null,
          licenseDocumentId: licenseMatch.documentId,
          swimmer: {
            ...recovered,
            source: "performances",
            ...(licenseMatch.license?.licenseNumber ? {
              licenseNumber: licenseMatch.license.licenseNumber,
              licenseVerificationStatus: licenseMatch.license.verificationStatus,
              licenseSeasonLabel: licenseMatch.license.licenseSeasonLabel,
              licenseSeasonStatus: licenseMatch.license.licenseSeasonStatus,
              licenseSeasons: licenseMatch.license.licenseSeasons
            } : {})
          },
          performanceRows,
          resolvedBy: "performance-base"
        };
      }
    }
    const referenceTarget = backendContext.findReferenceSwimmerCorrectionTarget(backendContext.intranapSwimmersIndex, {
      swimmerId: cleanId,
      identityKey: cleanIdentityKey
    });
    if (referenceTarget.ambiguous) {
      throw new backendContext.HttpsError("failed-precondition", "Plusieurs fiches nationales correspondent a cet identifiant. Utilisez la fusion avant la correction.");
    }
    if (referenceTarget.stale) {
      throw new backendContext.HttpsError("failed-precondition", "La fiche nationale a change depuis la recherche. Rechargez-la avant de corriger.");
    }
    const referenceSwimmer = referenceTarget.swimmer
      ? backendContext.engagementReferenceSwimmerItem(referenceTarget.swimmer)
      : null;
    if (referenceSwimmer) {
      const licenseMatch = await findEngagementSwimmerCorrectionLicense(db, [
        cleanId,
        referenceSwimmer.id,
        ...(referenceSwimmer.sourceIds || [])
      ]);
      return {
        requestedSource: cleanSource,
        requestedSwimmerId: cleanId,
        source: "reference",
        swimmerId: cleanId,
        ref: null,
        snapshot: null,
        licenseDocumentId: licenseMatch.documentId,
        swimmer: {
          ...referenceSwimmer,
          ...(licenseMatch.license?.licenseNumber ? {
            licenseNumber: licenseMatch.license.licenseNumber,
            licenseVerificationStatus: licenseMatch.license.verificationStatus,
            licenseSeasonLabel: licenseMatch.license.licenseSeasonLabel,
            licenseSeasonStatus: licenseMatch.license.licenseSeasonStatus,
            licenseSeasons: licenseMatch.license.licenseSeasons
          } : {})
        },
        resolvedBy: `reference-${referenceTarget.matchedBy || "fallback"}`
      };
    }
    throw new backendContext.HttpsError("not-found", "Nageur introuvable dans la base nationale.");
  }

  return { findPerformanceSwimmerCorrectionTarget, findEngagementSwimmerCorrectionLicense, getEngagementSwimmerCorrectionTarget };
}

module.exports = { createNationalService_findEngagementSwimmerCorrectionLicense };
