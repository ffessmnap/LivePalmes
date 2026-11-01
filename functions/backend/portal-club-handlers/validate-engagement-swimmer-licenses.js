// Existing operation bodies; live services arrive through explicit accessors.
function createClubHandlers_validateEngagementSwimmerLicenses(backendContext) {
  async function validateEngagementSwimmerLicenses(request) {
    const context = await backendContext.engagementAccessContext(request);
    if (!context.national) throw new backendContext.HttpsError("permission-denied", "Validation des licences reservee au niveau national.");
    if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
      const connection=await require("../../nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      let locked=false;
      try {
        const [lock]=await connection.execute({sql:"SELECT GET_LOCK('livepalmes_license_control',0) AS acquired",timeout:10000});
        if(Number(lock[0]?.acquired)!==1) throw new TypeError("Un controle de licences est deja en cours.");
        locked=true;
        return await require("../../nap-license-control").validateBatch(connection,request.data || {},context.uid,{
          read:async operation=>{const snapshot=await backendContext.db.collection("auditLogs").doc(`nap-licenses-${operation}-before`).get();return snapshot.exists?snapshot.data().target:null;},
          prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-licenses-${operation}-before`).create({action:"nap.licenses.correction.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
          complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.licenses.corrected",context.uid,{...target,auditPreparationId:`nap-licenses-${operation}-before`},operation)
        });
      } catch(error) {throw new backendContext.HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Validation a verifier. La sauvegarde est conservee : reprenez le meme lot.");}
      finally {try{if(locked)await connection.execute({sql:"SELECT RELEASE_LOCK('livepalmes_license_control')",timeout:10000});}finally{connection.release();}}
    }
    const season = backendContext.engagementLicenseControlSeason(request.data?.season);
    const source = backendContext.cleanText(request.data?.source) === "admin_import" ? "admin_import" : "national_manual";
    const rawItems = Array.isArray(request.data?.items) ? request.data.items.slice(0, 100) : [];
    if (!rawItems.length) throw new backendContext.HttpsError("invalid-argument", "Aucune licence a valider.");
    const ids = new Set();
    const items = rawItems.map((raw) => {
      const swimmerIndexId = backendContext.cleanText(raw?.swimmerIndexId || raw?.livePalmesId).slice(0, 80);
      const licenseNumber = backendContext.cleanText(raw?.licenseNumber).toUpperCase().slice(0, 60);
      if (!swimmerIndexId || ids.has(swimmerIndexId)) throw new backendContext.HttpsError("invalid-argument", "Nageur absent ou duplique dans la selection.");
      if (!backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) throw new backendContext.HttpsError("invalid-argument", "Chaque licence doit respecter le format A-12-34567.");
      ids.add(swimmerIndexId);
      const federalValidityEndDate = backendContext.cleanIsoDate(raw?.federalValidityEndDate);
      if (source === "admin_import" && (!federalValidityEndDate || federalValidityEndDate < season.requiredValidityDate)) {
        throw new backendContext.HttpsError("failed-precondition", "Une licence importee ne couvre pas la saison demandee.");
      }
      return {
        swimmerIndexId,
        swimmerId: backendContext.cleanText(raw?.swimmerId).slice(0, 80),
        identityKey: backendContext.cleanText(raw?.identityKey).slice(0, 180),
        source: backendContext.cleanText(raw?.source || "performances").slice(0, 40),
        firstName: backendContext.cleanText(raw?.firstName).slice(0, 80),
        lastName: backendContext.cleanText(raw?.lastName).slice(0, 80),
        name: backendContext.cleanText(raw?.name).slice(0, 160),
        birthDate: backendContext.cleanIsoDate(raw?.birthDate),
        sex: backendContext.cleanText(raw?.sex).toUpperCase().slice(0, 1),
        clubId: backendContext.cleanText(raw?.clubId).slice(0, 40),
        clubName: backendContext.cleanText(raw?.clubName).slice(0, 140),
        licenseNumber,
        federalValidityEndDate
      };
    });
    const now = new Date().toISOString();
    await backendContext.db.runTransaction(async (transaction) => {
      const licenseRefs = items.map((item) => backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.engagementSwimmerLicenseId({ swimmerIndexId: item.swimmerIndexId })));
      const numberRefs = items.map((item) => backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(backendContext.engagementSwimmerLicenseNumberId(item.licenseNumber)));
      const rosterClubIds = Array.from(new Set(items.map((item) => item.clubId).filter(Boolean)));
      const rosterRefs = rosterClubIds.map((clubId) => backendContext.engagementClubRosterRef(backendContext.db, clubId));
      const readSnapshots = await transaction.getAll(...licenseRefs, ...numberRefs, ...rosterRefs);
      const licenseSnapshots = readSnapshots.slice(0, licenseRefs.length);
      const numberSnapshots = readSnapshots.slice(licenseRefs.length, licenseRefs.length + numberRefs.length);
      const rosterOffset = licenseRefs.length + numberRefs.length;
      const rosterDataByClub = new Map(rosterClubIds.map((clubId, index) => [clubId, readSnapshots[rosterOffset + index]?.data() || {}]));
      numberSnapshots.forEach((snapshot, index) => {
        const ownerId = backendContext.cleanText(snapshot.data()?.swimmerIndexId).slice(0, 80);
        if (snapshot.exists && ownerId && ownerId !== items[index].swimmerIndexId) {
          throw new backendContext.HttpsError("already-exists", `La licence ${items[index].licenseNumber} appartient deja a une autre fiche.`);
        }
      });
      const rosterUpdates = new Map();
      items.forEach((item, index) => {
        const seasonRecord = {
          status: "valid",
          validatedAt: now,
          updatedAt: now,
          updatedBy: context.uid,
          source,
          ...(item.federalValidityEndDate ? { federalValidityEndDate: item.federalValidityEndDate } : {})
        };
        const payload = backendContext.cleanFirestoreValue({
          ...item,
          verificationStatus: "verified",
          verificationSource: source,
          licenseSeasonLabel: season.label,
          licenseSeasonStatus: "valid",
          licenseSeasons: { [season.label]: seasonRecord },
          updatedAt: now,
          updatedBy: context.uid
        });
        const previousLicenseNumber = backendContext.cleanText(licenseSnapshots[index]?.data()?.licenseNumber).toUpperCase().slice(0, 60);
        if (previousLicenseNumber && previousLicenseNumber !== item.licenseNumber) {
          transaction.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(backendContext.engagementSwimmerLicenseNumberId(previousLicenseNumber)));
        }
        transaction.set(licenseRefs[index], payload, { merge: true });
        transaction.set(numberRefs[index], {
          ...payload,
          licenseKey: backendContext.engagementSwimmerLicenseNumberKey(item.licenseNumber)
        }, { merge: true });
        if (item.clubId) {
          if (!rosterUpdates.has(item.clubId)) rosterUpdates.set(item.clubId, {});
          const rosterKey = backendContext.engagementClubRosterSwimmerKey(item);
          const storedRosterItem = rosterDataByClub.get(item.clubId)?.swimmers?.[rosterKey] || {};
          const rosterItem = backendContext.engagementClubRosterSwimmerItem({
            ...storedRosterItem,
            ...item,
            id: item.swimmerIndexId,
            licenseVerificationStatus: "verified",
            licenseSeasonLabel: season.label,
            licenseSeasonStatus: "valid",
            licenseSeasons: {
              ...(storedRosterItem.licenseSeasons && typeof storedRosterItem.licenseSeasons === "object" ? storedRosterItem.licenseSeasons : {}),
              [season.label]: seasonRecord
            },
            updatedAt: now,
            active: true
          });
          rosterUpdates.get(item.clubId)[rosterKey] = rosterItem;
        }
      });
      rosterUpdates.forEach((swimmers, clubId) => transaction.set(backendContext.engagementClubRosterRef(backendContext.db, clubId), {
        clubId,
        updatedAt: now,
        swimmers
      }, { merge: true }));
    });
    await backendContext.writeAuditLog("engagementSwimmerLicenses.validated", context.uid, {
      season: season.label,
      source,
      count: items.length,
      swimmerIds: items.map((item) => item.swimmerIndexId)
    });
    return { ok: true, season: season.label, source, validatedCount: items.length, validatedAt: now };
  }

  return { validateEngagementSwimmerLicenses };
}

module.exports = { createClubHandlers_validateEngagementSwimmerLicenses };
