// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createNationalService(backendContext) {
  async function importSwimmerCreation(request,write) {
    if(backendContext.ENVIRONMENT.sportingDataSource!=="nap")throw new backendContext.HttpsError("failed-precondition","Source NAP requise.");
    try{return await require("./nap-import-swimmer-creation").service({
      authorize:backendContext.authorizeNativePerformance,
      getPool:()=>require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),
      formatAlert:(match,type,clubId)=>{
        const {validationStatus,...alert}=backendContext.engagementNewSwimmerAlertFromMatch(match,{clubId},type);
        return alert;
      },
      audit:context=>({
        read:async operation=>{const doc=await backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).get();return doc.exists?doc.data().target:null;},
        prepare:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).create({action:"nap.swimmerCreate.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
        checkpoint:(operation,target)=>backendContext.db.collection("auditLogs").doc(`nap-swimmer-create-${operation}-before`).update({target}),
        complete:(operation,target)=>backendContext.writeAuditLogOnce("nap.swimmerCreate.complete",context.uid,{...target,validationScope:"national-import",auditPreparationId:`nap-swimmer-create-${operation}-before`},`nap-swimmer-create-${operation}-complete`)
      })
    })(request,write);}catch(error){throw backendContext.nativePerformanceFailure(error);}
  }

  function nationalSwimmerSearchMatches(swimmer = {}, terms = []) {
    if (!terms.length) return true;
    const haystack = backendContext.normalizePerformanceSearchText([
      swimmer.firstName,
      swimmer.lastName,
      swimmer.name,
      swimmer.licenseNumber,
      swimmer.birthDate,
      swimmer.sex,
      swimmer.clubId,
      swimmer.club,
      swimmer.clubName,
      swimmer.identityKey,
      swimmer.id,
      swimmer.swimmerId,
      ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : [])
    ].filter(Boolean).join(" "));
    return terms.every((term) => haystack.includes(term));
  }

  function nationalSwimmerSort(left = {}, right = {}) {
    return backendContext.cleanText(right.latestDate).localeCompare(backendContext.cleanText(left.latestDate)) ||
      backendContext.cleanText(left.lastName).localeCompare(backendContext.cleanText(right.lastName), "fr") ||
      backendContext.cleanText(left.firstName).localeCompare(backendContext.cleanText(right.firstName), "fr") ||
      backendContext.cleanText(left.source).localeCompare(backendContext.cleanText(right.source), "fr");
  }

  async function searchEngagementNationalSwimmerDocs(db, query = "", limit = 40) {
    const cleanQuery = backendContext.cleanText(query).slice(0, 120);
    const normalized = backendContext.normalizePerformanceSearchText(cleanQuery);
    const terms = normalized.split(/\s+/).filter((term) => term.length >= 2).slice(0, 5);
    const licenseKey = backendContext.engagementSwimmerLicenseNumberKey(cleanQuery);
    if (!terms.length && licenseKey.length < 3) return [];
    const docs = new Map();
    const addDoc = (doc, source) => {
      if (!doc.exists) return;
      const key = `${source}:${doc.id}`;
      if (!docs.has(key)) docs.set(key, { doc, source });
    };
    const reads = [];
    if (terms.length) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("searchPrefixes", "array-contains", terms[0].slice(0, 18))
        .limit(Math.min(80, Math.max(limit * 2, 30)))
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
    }
    if (cleanQuery) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION)
        .where("licenseNumber", "==", cleanQuery)
        .limit(limit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "performances"))));
      reads.push(db.collection("engagementClubSwimmers")
        .where("licenseNumber", "==", cleanQuery)
        .limit(limit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement"))));
    }
    if (terms.length) {
      const nameSeed = cleanQuery.split(/\s+/).filter(Boolean).at(-1) || cleanQuery;
      const titleCase = nameSeed.toLocaleLowerCase("fr").replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
      const variants = Array.from(new Set([nameSeed, nameSeed.toLocaleUpperCase("fr"), titleCase].filter(Boolean)));
      const querySpecs = ["lastName", "firstName"]
        .flatMap((field) => variants.map((variant) => ({ field, variant })))
        .slice(0, 6);
      const perQueryLimit = Math.max(8, Math.ceil((limit * 2) / Math.max(1, querySpecs.length)));
      reads.push(...querySpecs.map(({ field, variant }) => db.collection("engagementClubSwimmers")
        .orderBy(field)
        .startAt(variant)
        .endAt(`${variant}\uf8ff`)
        .limit(perQueryLimit)
        .get()
        .then((snapshot) => snapshot.docs.forEach((doc) => addDoc(doc, "engagement")))));
    }
    await Promise.all(reads);
    return Array.from(docs.values())
      .map((item) => engagementNationalSwimmerItemFromDoc(item.doc, item.source))
      .filter((swimmer) => nationalSwimmerSearchMatches(swimmer, terms))
      .sort(nationalSwimmerSort)
      .slice(0, limit);
  }

  function engagementLicenseControlSeason(value = "") {
    const match = backendContext.cleanText(value).match(/^(\d{4})-(\d{4})$/);
    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      throw new backendContext.HttpsError("invalid-argument", "Saison invalide. Format attendu : 2026-2027.");
    }
    const startYear = Number(match[1]);
    if (startYear < 2020 || startYear > 2199) {
      throw new backendContext.HttpsError("invalid-argument", "Saison hors plage autorisee.");
    }
    return {
      label: `${startYear}-${startYear + 1}`,
      startYear,
      endYear: startYear + 1,
      startDate: `${startYear}-09-01`,
      endDate: `${startYear + 1}-08-31`,
      requiredValidityDate: `${startYear + 1}-12-31`
    };
  }

  function engagementLicenseControlPerson(swimmer = {}, entry = {}, competitions = []) {
    const swimmerIndexId = backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id || swimmer.swimmerId).slice(0, 80);
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName || swimmer.name).slice(0, 80);
    return {
      livePalmesId: swimmerIndexId,
      swimmerIndexId,
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      source: backendContext.cleanText(swimmer.source || "performances").slice(0, 40) || "performances",
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName,
      lastName,
      name: backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" "),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).toUpperCase().slice(0, 1),
      clubId: backendContext.cleanText(entry.clubId || swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(entry.clubName || swimmer.clubName).slice(0, 140),
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).toUpperCase().slice(0, 60),
      competitionIds: competitions.map((competition) => competition.id),
      competitions: competitions.map((competition) => backendContext.cleanText(competition.name || competition.title || competition.id).slice(0, 160))
    };
  }

  async function engagementLicenseReportRequest(input, context, pool) {
    const reports = require("./engagement-license-reports"), store = require("./nap-license-reports").store(pool);
    if (input.action === "summaries") return reports.summaries(backendContext.db, input.season, store);
    if (input.action === "reportHistory") return store.history(input.season, input.competitionId, input.before);
    if (input.action === "reportVersion") { const report=await store.readVersion(input.season,input.competitionId,input.version); return {report, text:report?reports.message(report).text:""}; }
    if (!["readReport", "completeReport", "closeReport", "previewReport", "sendReport"].includes(input.action)) throw new TypeError("Action de contrôle inconnue.");
    const batch = await require("./nap-license-control").prepareBatch(pool, { season: input.season, competitionIds: [input.competitionId] });
    if (input.action === "readReport") {
      await reports.attach(backendContext.db, batch, store);
      return { report: batch.controlReports[String(require("./nap-direct-calendar").positiveId(input.competitionId))], participantCount: batch.people.length, history: await store.history(input.season,input.competitionId) };
    }
    if (input.action === "completeReport") return reports.complete(backendContext.db, batch, input, context.uid, store);
    if (input.action === "closeReport") return reports.close(backendContext.db, batch, input, context.uid, store);
    let transporter;
    try {
      return await reports.notify(backendContext.db, batch, input, {
        projectId: backendContext.ENVIRONMENT.projectId,
        competition: async competitionId => {
          const rows = await require("./nap-portal-competitions").bounded(pool,
            "SELECT c.id,c.comite,cp.mailtxt FROM competitions c FORCE INDEX (PRIMARY) LEFT JOIN compet_parametres cp ON cp.compet=c.id WHERE c.id=? LIMIT 2", [Number(competitionId)], 1);
          if (!rows.length) throw new TypeError("Compétition introuvable.");
          return { regionId: require("./nap-competition-scope").REGIONS[rows[0].comite] || "", computerEmail: backendContext.cleanText(rows[0].mailtxt) };
        },
        directory: async () => {
          if ((await backendContext.engagementMailRecipientIndexStateRef(backendContext.db).get()).data()?.status !== "ready") throw new TypeError("Annuaire des destinataires indisponible ; aucune reconstruction automatique.");
          return backendContext.engagementMailRecipientsFromIndex(backendContext.db, ["engagements.region.manage"]);
        },
        setting: () => require("./engagement-mail-control").read(backendContext.db),
        send: async (ref, job) => {
          // TEST is blocked both here and before any outbox write in the report module.
          if (backendContext.ENVIRONMENT.projectId === "livepalmes-test") throw new TypeError("Envois réels désactivés sur TEST.");
          let started = false;
          try {
            const gate = require("./engagement-mail-control").decision(await require("./engagement-mail-control").read(backendContext.db), job, backendContext.ENVIRONMENT.projectId);
            if (!gate.allowed) throw new TypeError("Envoi bloqué par le réglage des notifications.");
            const config = backendContext.engagementMailSmtpConfig();
            if (!config.ready) throw new TypeError("Configuration des mails indisponible.");
            if (!transporter) transporter = backendContext.nodemailer.createTransport({ ...config.transport, pool: true, maxConnections: 1, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
            started = true;
            await transporter.sendMail({ from: `LivePalmes <${config.fromEmail}>`, to: gate.to, subject: job.subject, text: job.textBody, html: backendContext.livePalmesMailHtml(job.textBody) });
            const sentAt = new Date().toISOString();
            await ref.set({ status: "sent", sentAt, sentBy: context.uid, updatedAt: sentAt }, { merge: true });
            return { status: "sent" };
          } catch (error) {
            const status = started ? "uncertain" : "failed";
            await ref.set({ status, updatedAt: new Date().toISOString(), reason: "Envoi non confirmé ; aucun renvoi automatique." }, { merge: true });
            throw new TypeError("Envoi non confirmé. Vérifiez le journal avant de reprendre.");
          }
        }
      }, store);
    } finally { if (transporter) transporter.close(); }
  }

  function engagementSwimmerIdentitySnapshot(swimmer = {}, source = swimmer.source || "") {
    const firstName = backendContext.cleanText(swimmer.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(swimmer.lastName).slice(0, 80);
    return backendContext.cleanFirestoreValue({
      id: backendContext.cleanText(swimmer.id || swimmer.swimmerIndexId).slice(0, 80),
      swimmerIndexId: backendContext.cleanText(swimmer.swimmerIndexId || swimmer.id).slice(0, 80),
      source: backendContext.cleanText(source || swimmer.source).slice(0, 40),
      swimmerId: backendContext.cleanText(swimmer.swimmerId).slice(0, 80),
      sourceIds: Array.isArray(swimmer.sourceIds)
        ? swimmer.sourceIds.map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean).slice(0, 25)
        : [],
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180),
      firstName,
      lastName,
      name: backendContext.cleanText(swimmer.name).slice(0, 160) || [firstName, lastName].filter(Boolean).join(" "),
      birthDate: backendContext.cleanIsoDate(swimmer.birthDate),
      sex: backendContext.cleanText(swimmer.sex).toUpperCase().slice(0, 1),
      nonSelectable: swimmer.nonSelectable === true,
      licenseNumber: backendContext.cleanText(swimmer.licenseNumber).toUpperCase().slice(0, 60),
      clubId: backendContext.cleanText(swimmer.clubId).slice(0, 40),
      clubName: backendContext.cleanText(swimmer.clubName).slice(0, 140),
      performanceCount: Math.max(0, Math.trunc(Number(swimmer.performanceCount) || 0)),
      ...(swimmer.napSource === true ? { napSource: true, napFingerprint: backendContext.cleanText(swimmer.napFingerprint).slice(0, 64) } : {})
    });
  }

  function cleanEngagementSwimmerIdentityCorrection(raw = {}, current = {}) {
    const firstName = backendContext.cleanText(raw.firstName ?? current.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName ?? current.lastName).slice(0, 80);
    const birthDate = backendContext.cleanIsoDate(raw.birthDate ?? current.birthDate);
    const sex = backendContext.cleanText(raw.sex ?? current.sex).toUpperCase().slice(0, 1);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber ?? current.licenseNumber).toUpperCase().slice(0, 60);
    if (!firstName || !lastName || !birthDate || !["F", "M"].includes(sex)) {
      throw new backendContext.HttpsError("invalid-argument", "Nom, prenom, date de naissance et sexe sont obligatoires.");
    }
    if (licenseNumber && !backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN.test(licenseNumber)) {
      throw new backendContext.HttpsError("invalid-argument", "Le numero de licence doit respecter le format A-12-34567.");
    }
    const correction = {
      firstName,
      lastName,
      name: [firstName, lastName].join(" "),
      birthDate,
      sex,
      licenseNumber,
      identityKey: backendContext.engagementSwimmerIdentityKey(firstName, lastName, birthDate)
    };
    const changed = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
      .some((field) => backendContext.cleanText(correction[field]) !== backendContext.cleanText(current[field]));
    if (!changed) {
      throw new backendContext.HttpsError("invalid-argument", "Aucune modification n'a ete saisie.");
    }
    return correction;
  }

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

  async function assertNoEngagementSwimmerIdentityConflict(db, current = {}, correction = {}) {
    const ignoredIds = new Set([
      current.id,
      current.swimmerIndexId,
      current.swimmerId,
      ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
    ].map((id) => backendContext.cleanText(id).slice(0, 80)).filter(Boolean));
    if (correction.identityKey && correction.identityKey !== current.identityKey) {
      const [performanceSnapshot, engagementSnapshot] = await Promise.all([
        db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", correction.identityKey).limit(3).get(),
        db.collection("engagementClubSwimmers").where("identityKey", "==", correction.identityKey).limit(3).get()
      ]);
      const conflict = [
        ...performanceSnapshot.docs.map((doc) => ({ id: doc.id, source: "performances", data: doc.data() || {} })),
        ...engagementSnapshot.docs.map((doc) => ({ id: doc.id, source: "engagement", data: doc.data() || {} }))
      ].find((candidate) => !ignoredIds.has(candidate.id) && candidate.data.active !== false && backendContext.cleanText(candidate.data.status) !== "merged");
      if (conflict) {
        const name = [backendContext.cleanText(conflict.data.lastName), backendContext.cleanText(conflict.data.firstName)].filter(Boolean).join(" ") || "une fiche existante";
        throw new backendContext.HttpsError("already-exists", `${name} possede deja cette identite. Utilisez la fusion plutot qu'une correction.`, {
          conflictId: conflict.id,
          conflictSource: conflict.source
        });
      }
    }
    if (correction.licenseNumber) {
      await backendContext.assertNoEngagementSwimmerLicenseConflict(db, correction, Array.from(ignoredIds));
    }
  }

  function engagementEntrySwimmerCorrectionResult(items = [], oldIds = new Set(), next = {}) {
    let changed = false;
    const corrected = (Array.isArray(items) ? items : []).map((item) => {
      const itemId = backendContext.cleanText(item?.swimmerIndexId || item?.id || item?.swimmerId);
      if (!oldIds.has(itemId)) return item;
      changed = true;
      return backendContext.cleanFirestoreValue({
        ...item,
        id: next.id,
        swimmerIndexId: next.swimmerIndexId || next.id,
        swimmerId: next.swimmerId || item.swimmerId,
        source: next.source || item.source,
        identityKey: next.identityKey,
        firstName: next.firstName,
        lastName: next.lastName,
        name: next.name,
        birthDate: next.birthDate,
        sex: next.sex,
        category: backendContext.currentEngagementCategoryFromBirthDate(next.birthDate),
        licenseNumber: next.licenseNumber ?? item.licenseNumber
      });
    });
    return { changed, items: corrected };
  }

  function engagementEntryRelayCorrectionResult(relays = [], oldIds = new Set(), next = {}) {
    let changed = false;
    const corrected = (Array.isArray(relays) ? relays : []).map((relay) => {
      const membersResult = engagementEntrySwimmerCorrectionResult(relay?.members || [], oldIds, next);
      const memberIds = (Array.isArray(relay?.memberIds) ? relay.memberIds : [])
        .map((id) => oldIds.has(backendContext.cleanText(id)) ? (next.swimmerIndexId || next.id) : id);
      const idsChanged = memberIds.some((id, index) => id !== relay?.memberIds?.[index]);
      if (!membersResult.changed && !idsChanged) return relay;
      changed = true;
      return backendContext.cleanFirestoreValue({
        ...relay,
        members: membersResult.items,
        memberIds
      });
    });
    return { changed, relays: corrected };
  }

  async function updateEngagementEntriesForSwimmerCorrection(db, current = {}, next = {}, context = {}) {
    const clubId = backendContext.cleanText(current.clubId || next.clubId).slice(0, 40);
    if (!clubId) return { scannedEntryCount: 0, entryUpdateCount: 0, relayUpdateCount: 0 };
    const oldIds = new Set([
      current.id,
      current.swimmerIndexId,
      current.swimmerId,
      ...(Array.isArray(current.sourceIds) ? current.sourceIds : [])
    ].map((id) => backendContext.cleanText(id)).filter(Boolean));
    let scannedEntryCount = 0;
    let entryUpdateCount = 0;
    let relayUpdateCount = 0;
    const now = context.now || new Date().toISOString();
    let cursor = null;
    do {
      let query = db.collection("engagementClubEntries")
        .where("clubId", "==", clubId)
        .orderBy(backendContext.FieldPath.documentId())
        .limit(backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE);
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      scannedEntryCount += snapshot.size;
      const batch = db.batch();
      let pageUpdateCount = 0;
      snapshot.docs.forEach((doc) => {
        const entry = doc.data() || {};
        const swimmerResult = engagementEntrySwimmerCorrectionResult(entry.swimmers || [], oldIds, next);
        const relayResult = engagementEntryRelayCorrectionResult(entry.relays || [], oldIds, next);
        if (!swimmerResult.changed && !relayResult.changed) return;
        batch.set(doc.ref, backendContext.cleanFirestoreValue({
          ...(swimmerResult.changed ? { swimmers: swimmerResult.items } : {}),
          ...(relayResult.changed ? { relays: relayResult.relays } : {}),
          updatedAt: now,
          updatedBy: context.uid || ""
        }), { merge: true });
        pageUpdateCount += 1;
        if (swimmerResult.changed) entryUpdateCount += 1;
        if (relayResult.changed) relayUpdateCount += 1;
      });
      if (pageUpdateCount) await batch.commit();
      cursor = snapshot.size === backendContext.ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;
    } while (cursor);
    return { scannedEntryCount, entryUpdateCount, relayUpdateCount };
  }

  function setEngagementSwimmerChangeRequestRosterState(batch, target = {}, status = "", requestId = "", now = "") {
    const swimmer = engagementSwimmerIdentitySnapshot(target.swimmer || target.current || {}, target.requestedSource || target.source);
    const rosterItem = {
      ...swimmer,
      id: target.requestedSwimmerId || swimmer.id,
      swimmerIndexId: target.requestedSwimmerId || swimmer.swimmerIndexId,
      source: target.requestedSource || swimmer.source,
      changeRequestStatus: status,
      changeRequestId: requestId,
      changeRequestedAt: status === "pending" ? now : "",
      active: true,
      updatedAt: now
    };
    backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, rosterItem, now);
  }

  async function applyEngagementSwimmerIdentityCorrection(target = {}, correction = {}, context = {}) {
    const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
    await assertNoEngagementSwimmerIdentityConflict(backendContext.db, current, correction);
    const now = context.now || new Date().toISOString();
    if (target.source === "engagement") {
      const payload = {
        ...correction,
        updatedAt: now,
        updatedBy: context.uid,
        identityCorrectedAt: now,
        identityCorrectedBy: context.uid
      };
      const batch = backendContext.db.batch();
      batch.set(target.ref, payload, { merge: true });
      const oldLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(current.licenseNumber);
      const newLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(correction.licenseNumber);
      if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
        batch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
      }
      if (correction.licenseNumber) {
        const licensePayload = backendContext.engagementSwimmerLicensePayload(
          { ...current, ...correction, swimmerIndexId: target.swimmerId, source: "engagement" },
          { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
          { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
        );
        batch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(target.swimmerId).slice(0, 40)), licensePayload, { merge: true });
        if (newLicenseRefId) {
          batch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
            ...licensePayload,
            swimmerIndexId: target.swimmerId,
            licenseKey: backendContext.engagementSwimmerLicenseNumberKey(correction.licenseNumber)
          }, { merge: true });
        }
      } else if (current.licenseNumber) {
        batch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(backendContext.stableHash(target.swimmerId).slice(0, 40)));
      }
      const next = engagementSwimmerIdentitySnapshot({
        ...current,
        ...correction,
        id: target.swimmerId,
        swimmerIndexId: target.swimmerId,
        source: "engagement",
        updatedAt: now
      }, "engagement");
      backendContext.upsertEngagementClubRosterSwimmer(batch, backendContext.db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
      if (target.requestedSource !== "engagement" || target.requestedSwimmerId !== target.swimmerId) {
        backendContext.deleteEngagementClubRosterSwimmer(batch, backendContext.db, {
          ...current,
          source: target.requestedSource,
          swimmerIndexId: target.requestedSwimmerId
        }, now);
      }
      await batch.commit();
      const entryResult = await updateEngagementEntriesForSwimmerCorrection(backendContext.db, current, next, { ...context, now });
      return { current, swimmer: next, performanceUpdateCount: 0, publicSnapshot: null, ...entryResult };
    }

    const rows = Array.isArray(target.performanceRows) && target.performanceRows.length
      ? target.performanceRows
      : await backendContext.getPerformanceBaseRowsBySwimmer({
        swimmerIds: Array.from(new Set([
          target.requestedSwimmerId,
          target.swimmerId,
          current.swimmerId,
          ...(current.sourceIds || [])
        ].map(backendContext.cleanText).filter(Boolean))),
        identityKey: current.identityKey
      });
    const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
    if (!rows.length) {
      throw new backendContext.HttpsError("failed-precondition", "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la correction.");
    }
    if (rows.length > backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS || (current.performanceCount > 0 && finalPerformanceCount < current.performanceCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Correction trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
    }
    const updatedRows = rows.map((row) => ({
      ...row,
      firstName: correction.firstName,
      lastName: correction.lastName,
      swimmer: correction.name,
      birthDate: correction.birthDate,
      sex: correction.sex,
      swimmerIdentityKey: correction.identityKey,
      sourceAction: "engagement.swimmerIdentityCorrected"
    }));
    await backendContext.writePerformanceBaseRows(updatedRows, {
      actorUid: context.uid,
      actorEmail: context.email || "",
      now,
      action: "engagement.swimmerIdentityCorrected",
      status: "active",
      logChanges: false,
      dtnInvalidationRows: rows
    });
    await backendContext.writePerformanceSwimmerIndexRows(updatedRows, {
      now,
      action: "engagement.swimmerIdentityCorrected",
      mode: "replace"
    });
    await backendContext.writePerformanceSwimmerPageRows(updatedRows, {
      now,
      action: "engagement.swimmerIdentityCorrected"
    });
    const newIndexId = backendContext.performanceSwimmerIndexDocId(updatedRows[0]);
    const newIndexRef = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(newIndexId);
    await newIndexRef.set({
      licenseNumber: correction.licenseNumber,
      identityCorrectedAt: now,
      identityCorrectedBy: context.uid,
      updatedAt: now
    }, { merge: true });
    const cleanupBatch = backendContext.db.batch();
    const oldIndexId = target.source === "performances" ? target.swimmerId : "";
    const oldLicenseDocId = backendContext.cleanText(target.licenseDocumentId)
      || (oldIndexId ? backendContext.engagementSwimmerLicenseId({ swimmerIndexId: oldIndexId }) : "");
    const newLicenseDocId = backendContext.engagementSwimmerLicenseId({ swimmerIndexId: newIndexId });
    const oldLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(current.licenseNumber);
    const newLicenseRefId = backendContext.engagementSwimmerLicenseNumberId(correction.licenseNumber);
    if (oldLicenseRefId && oldLicenseRefId !== newLicenseRefId) {
      cleanupBatch.delete(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(oldLicenseRefId));
    }
    if (oldLicenseDocId && (oldLicenseDocId !== newLicenseDocId || !correction.licenseNumber)) {
      cleanupBatch.delete(backendContext.db.collection("engagementSwimmerLicenses").doc(oldLicenseDocId));
    }
    if (correction.licenseNumber) {
      const licensePayload = backendContext.engagementSwimmerLicensePayload(
        { ...current, ...correction, swimmerIndexId: newIndexId, source: "performances" },
        { uid: context.uid, clubId: current.clubId, clubName: current.clubName },
        { type: "national_identity_correction", collectedAt: now, verificationSource: "national" }
      );
      cleanupBatch.set(backendContext.db.collection("engagementSwimmerLicenses").doc(newLicenseDocId), licensePayload, { merge: true });
      if (newLicenseRefId) {
        cleanupBatch.set(backendContext.db.collection(backendContext.ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION).doc(newLicenseRefId), {
          ...licensePayload,
          swimmerIndexId: newIndexId,
          licenseKey: backendContext.engagementSwimmerLicenseNumberKey(correction.licenseNumber)
        }, { merge: true });
      }
    }
    if (oldIndexId && oldIndexId !== newIndexId) {
      const oldPageCount = Math.min(50, Math.max(0, Math.trunc(Number(target.snapshot?.data()?.pageCount || 0) || 0)));
      for (let pageIndex = 0; pageIndex < oldPageCount; pageIndex += 1) {
        cleanupBatch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMER_PAGES_COLLECTION).doc(backendContext.performanceSwimmerPageId(oldIndexId, pageIndex)));
      }
      cleanupBatch.delete(backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(oldIndexId));
    }
    backendContext.deleteEngagementClubRosterSwimmer(cleanupBatch, backendContext.db, {
      ...current,
      source: target.requestedSource,
      swimmerIndexId: target.requestedSwimmerId
    }, now);
    const newIndexSnapshot = await newIndexRef.get();
    const next = engagementSwimmerIdentitySnapshot({
      ...backendContext.engagementClubSwimmerItem(newIndexSnapshot),
      ...correction,
      id: newIndexId,
      swimmerIndexId: newIndexId,
      source: "performances",
      clubId: current.clubId,
      clubName: current.clubName,
      performanceCount: finalPerformanceCount
    }, "performances");
    backendContext.upsertEngagementClubRosterSwimmer(cleanupBatch, backendContext.db, { ...next, changeRequestStatus: "", changeRequestId: "", changeRequestedAt: "" }, now);
    await cleanupBatch.commit();
    const entryResult = await updateEngagementEntriesForSwimmerCorrection(backendContext.db, current, next, { ...context, now });
    let publicSnapshot = null;
    try {
      const oldPublicKey = backendContext.publicSwimmerKey(rows[0] || {});
      const newPublicKey = backendContext.publicSwimmerKey(updatedRows[0] || {});
      if (oldPublicKey && newPublicKey && oldPublicKey !== newPublicKey) {
        publicSnapshot = await backendContext.replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, updatedRows);
      } else {
        publicSnapshot = await backendContext.rebuildPublicPerformanceFilesForAffectedRows(updatedRows, {
          now,
          reason: "engagement.swimmerIdentityCorrected"
        });
      }
      await backendContext.invalidateEngagementEntryTimeCachesForPerformanceRows([...rows, ...updatedRows]);
      const correctedTopFiles = await backendContext.rebuildPublicTopFilesForAffectedRows(
        [...rows, ...updatedRows],
        new Map([[newPublicKey, updatedRows]])
      );
      publicSnapshot.correctedTopBuckets = correctedTopFiles.affectedTopBuckets;
    } catch (error) {
      console.error("Publication publique ciblee impossible apres correction nageur", {
        swimmerId: target.swimmerId,
        message: error?.message || String(error)
      });
      publicSnapshot = { ok: false, error: error?.message || "Publication publique ciblee impossible." };
    }
    return {
      current,
      swimmer: next,
      performanceUpdateCount: updatedRows.length,
      publicSnapshot,
      ...entryResult
    };
  }

  function engagementSwimmerChangeRequestItem(doc) {
    const data = doc.data() || {};
    return backendContext.cleanFirestoreValue({
      id: doc.id,
      requestType: data.requestType === "swimmer-ns" ? "swimmer-ns" : data.requestType === "person-change" ? "person-change" : "swimmer-change",
      reportType: data.reportType === "duplicate" ? "duplicate" : "correction",
      status: backendContext.cleanText(data.status).slice(0, 40),
      napSource: data.napSource === true,
      requestedSource: backendContext.cleanText(data.requestedSource).slice(0, 40),
      requestedSwimmerId: backendContext.cleanText(data.requestedSwimmerId).slice(0, 80),
      targetSource: backendContext.cleanText(data.targetSource).slice(0, 40),
      targetSwimmerId: backendContext.cleanText(data.targetSwimmerId).slice(0, 80),
      current: data.current && typeof data.current === "object" ? engagementSwimmerIdentitySnapshot(data.current, data.current.source) : {},
      proposed: data.proposed && typeof data.proposed === "object" ? engagementSwimmerIdentitySnapshot(data.proposed, data.proposed.source) : {},
      resolvedProposed: data.resolvedProposed && typeof data.resolvedProposed === "object" ? engagementSwimmerIdentitySnapshot(data.resolvedProposed, data.resolvedProposed.source) : {},
      proposalAdjusted: data.proposalAdjusted === true,
      reason: backendContext.cleanText(data.reason).slice(0, 500),
      clubId: backendContext.cleanText(data.clubId).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      requestedAt: backendContext.cleanText(data.requestedAt).slice(0, 40),
      requestedBy: backendContext.cleanText(data.requestedBy).slice(0, 128),
      requestedByEmail: backendContext.cleanText(data.requestedByEmail).slice(0, 180),
      requestedByFirstName: backendContext.cleanText(data.requestedByFirstName).slice(0, 80),
      requestedByLastName: backendContext.cleanText(data.requestedByLastName).slice(0, 80),
      resolvedAt: backendContext.cleanText(data.resolvedAt).slice(0, 40),
      resolvedBy: backendContext.cleanText(data.resolvedBy).slice(0, 128),
      resolutionNote: backendContext.cleanText(data.resolutionNote).slice(0, 500),
      resolutionNotification: {
        status: backendContext.cleanText(data.resolutionNotification?.status).slice(0, 40),
        attemptedAt: backendContext.cleanText(data.resolutionNotification?.attemptedAt).slice(0, 40),
        sentAt: backendContext.cleanText(data.resolutionNotification?.sentAt).slice(0, 40),
        reason: backendContext.cleanText(data.resolutionNotification?.reason).slice(0, 180)
      }
    });
  }

  async function sendEngagementSwimmerChangeResolutionNotification(payload = {}) {
    const attemptedAt = new Date().toISOString();
    const recipientEmail = backendContext.normalizeEmail(payload.requestedByEmail);
    if (!recipientEmail) {
      return {
        status: "skipped_missing_recipient",
        attemptedAt,
        reason: "Adresse e-mail du demandeur absente."
      };
    }
    const config = backendContext.engagementMailSmtpConfig();
    if (!config.ready) {
      return {
        status: "skipped_missing_config",
        attemptedAt,
        reason: "Configuration SMTP incomplete."
      };
    }
    const mail = backendContext.engagementSwimmerChangeResolutionMail(payload);
    try {
      const transporter = backendContext.nodemailer.createTransport(config.transport);
      await transporter.sendMail({
        from: `LivePalmes <${config.fromEmail}>`,
        to: recipientEmail,
        subject: backendContext.cleanText(mail.subject).slice(0, 220),
        text: mail.text,
        html: backendContext.livePalmesMailHtml(mail.text)
      });
      return {
        status: "sent",
        attemptedAt,
        sentAt: new Date().toISOString(),
        reason: ""
      };
    } catch (error) {
      console.error(
        "Notification de resolution de correction nageur impossible.",
        backendContext.cleanText(error?.code || error?.name || "smtp-error").slice(0, 80)
      );
      return {
        status: "failed",
        attemptedAt,
        reason: "Envoi SMTP impossible."
      };
    }
  }

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

  function engagementNationalSwimmerCollectionForSource(db, source = "") {
    const cleanSource = backendContext.cleanText(source || "engagement");
    if (cleanSource === "performances") return db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION);
    if (cleanSource === "engagement") return db.collection("engagementClubSwimmers");
    throw new backendContext.HttpsError("invalid-argument", "Source nageur invalide.");
  }

  function engagementNationalSwimmerItemFromDoc(doc, source = "") {
    return backendContext.cleanText(source) === "performances"
      ? backendContext.engagementClubSwimmerItem(doc)
      : backendContext.engagementNewSwimmerItem(doc);
  }

  async function materializeEngagementNationalPerformanceSwimmerForMerge(target = {}, context = {}) {
    if (target.ref?.id && target.snapshot?.exists) {
      return {
        ref: target.ref,
        snapshot: target.snapshot,
        swimmer: target.swimmer,
        source: "performances",
        performanceRows: target.performanceRows || [],
        recoveredIndex: false
      };
    }
    const rows = Array.isArray(target.performanceRows) ? target.performanceRows : [];
    const finalPerformanceCount = rows.filter((row) => row.isIntermediate !== true).length;
    if (!rows.length) {
      throw new backendContext.HttpsError(
        "failed-precondition",
        "Les performances de ce nageur ne sont pas encore disponibles dans la base active. Synchronisez la base avant la fusion."
      );
    }
    if (rows.length > backendContext.ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS ||
        !backendContext.recoveredPerformanceRowsAreComplete(rows, target.swimmer?.performanceCount)) {
      throw new backendContext.HttpsError("failed-precondition", "Fusion trop volumineuse ou index incomplet. Une migration dediee est necessaire.");
    }
    const now = context.now || new Date().toISOString();
    await backendContext.writePerformanceSwimmerIndexRows(rows, {
      now,
      action: "engagement.swimmerMergeIndexRecovered",
      mode: "replace"
    });
    await backendContext.writePerformanceSwimmerPageRows(rows, {
      now,
      action: "engagement.swimmerMergeIndexRecovered"
    });
    const indexId = backendContext.performanceSwimmerIndexDocId(rows[0]);
    const ref = backendContext.db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).doc(indexId);
    if (target.swimmer?.licenseNumber) {
      await ref.set({
        licenseNumber: backendContext.cleanText(target.swimmer.licenseNumber).slice(0, 60),
        updatedAt: now
      }, { merge: true });
    }
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new backendContext.HttpsError("internal", "Reconstruction de l'index nageur impossible.");
    }
    return {
      ref,
      snapshot,
      swimmer: {
        ...backendContext.engagementClubSwimmerItem(snapshot),
        ...(target.swimmer?.licenseNumber ? { licenseNumber: target.swimmer.licenseNumber } : {})
      },
      source: "performances",
      performanceRows: rows,
      recoveredIndex: true
    };
  }

  async function getEngagementNationalSwimmerForMerge(db, source = "", swimmerId = "", identityKey = "", context = {}) {
    const cleanSource = backendContext.cleanText(source || "engagement");
    const cleanId = backendContext.cleanText(swimmerId).slice(0, 80);
    const cleanIdentityKey = backendContext.cleanText(identityKey).slice(0, 180);
    if (!cleanId) throw new backendContext.HttpsError("invalid-argument", "Nageur requis.");
    if (cleanSource === "engagement") {
      const collection = engagementNationalSwimmerCollectionForSource(db, cleanSource);
      const ref = collection.doc(cleanId);
      const snapshot = await ref.get();
      if (!snapshot.exists) throw new backendContext.HttpsError("not-found", "Nageur introuvable.");
      const swimmer = engagementNationalSwimmerItemFromDoc(snapshot, cleanSource);
      if (cleanIdentityKey && backendContext.cleanText(swimmer.identityKey) !== cleanIdentityKey) {
        throw new backendContext.HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
      }
      return { ref, snapshot, swimmer, source: cleanSource, recoveredIndex: false };
    }
    if (cleanSource !== "performances") {
      engagementNationalSwimmerCollectionForSource(db, cleanSource);
    }
    const target = await getEngagementSwimmerCorrectionTarget(db, "performances", cleanId, cleanIdentityKey);
    if (cleanIdentityKey && backendContext.cleanText(target.swimmer?.identityKey) !== cleanIdentityKey) {
      throw new backendContext.HttpsError("failed-precondition", "La fiche nageur a change depuis la recherche. Rechargez-la avant la fusion.");
    }
    return materializeEngagementNationalPerformanceSwimmerForMerge(target, context);
  }

  function engagementNationalSwimmerFullName(swimmer = {}) {
    return [swimmer.firstName, swimmer.lastName].filter(Boolean).join(" ") || swimmer.name || swimmer.licenseNumber || swimmer.id || "Nageur";
  }

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

  async function searchEngagementNationalSwimmerMergeTargetDocs(db, sourceSwimmer = {}, query = "", limit = 25) {
    const docs = new Map();
    const addDocs = (snapshot, source) => {
      snapshot.docs.forEach((doc) => {
        const key = `${source}:${doc.id}`;
        if (!docs.has(key)) docs.set(key, { doc, source });
      });
    };
    const cleanQuery = backendContext.cleanText(query).slice(0, 100);
    const sourceIdentityKey = backendContext.cleanText(sourceSwimmer.identityKey).slice(0, 180);
    const sourceLicense = backendContext.cleanText(sourceSwimmer.licenseNumber).slice(0, 60);
    const searchToken = backendContext.normalizePerformanceSearchText(cleanQuery || engagementNationalSwimmerFullName(sourceSwimmer)).split(/\s+/)[0] || "";
    const reads = [];
    if (sourceIdentityKey) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
      reads.push(db.collection("engagementClubSwimmers").where("identityKey", "==", sourceIdentityKey).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
    }
    const license = cleanQuery || sourceLicense;
    if (license) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
      reads.push(db.collection("engagementClubSwimmers").where("licenseNumber", "==", license).limit(limit).get().then((snapshot) => addDocs(snapshot, "engagement")));
    }
    if (searchToken.length >= 2) {
      reads.push(db.collection(backendContext.PERFORMANCE_SWIMMERS_COLLECTION).where("searchPrefixes", "array-contains", searchToken.slice(0, 18)).limit(limit).get().then((snapshot) => addDocs(snapshot, "performances")));
    }
    await Promise.all(reads);
    return Array.from(docs.values()).slice(0, limit);
  }

  function performanceMergeTargetPayloadFromSwimmer(targetSwimmer = {}) {
    const identityKey = backendContext.cleanText(targetSwimmer.identityKey).slice(0, 180) ||
      backendContext.engagementSwimmerIdentityKey(targetSwimmer.firstName, targetSwimmer.lastName, targetSwimmer.birthDate);
    return backendContext.cleanFirestoreValue({
      swimmerId: backendContext.cleanText(targetSwimmer.swimmerId || targetSwimmer.id || targetSwimmer.swimmerIndexId).slice(0, 80),
      swimmerIdentityKey: identityKey,
      swimmer: engagementNationalSwimmerFullName(targetSwimmer),
      firstName: backendContext.cleanText(targetSwimmer.firstName).slice(0, 80),
      lastName: backendContext.cleanText(targetSwimmer.lastName).slice(0, 80),
      birthDate: backendContext.cleanIsoDate(targetSwimmer.birthDate),
      sex: backendContext.normalizeCategoryCode(targetSwimmer.sex)
    });
  }

  function publicPerformanceRowsFromSwimmerPayload(payload = {}) {
    return (Array.isArray(payload?.rows) ? payload.rows : []).map((row) => backendContext.publicPerformanceBaseRow({
      ...row,
      swimmerId: backendContext.cleanText(payload.id),
      swimmerIdentityKey: backendContext.cleanText(payload.identityKey),
      swimmer: backendContext.cleanText(payload.name),
      firstName: backendContext.cleanText(payload.firstName),
      lastName: backendContext.cleanText(payload.lastName),
      birthDate: backendContext.cleanText(payload.birthDate),
      sex: backendContext.cleanText(payload.sex),
      clubId: backendContext.cleanText(row.clubId || payload.clubId),
      club: backendContext.cleanText(row.club || payload.club),
      clubName: backendContext.cleanText(row.clubName || payload.clubName)
    }));
  }

  async function publishEngagementNationalSwimmerMerge(sourceSwimmer = {}, targetSwimmer = {}, targetRows = [], context = {}) {
    const oldPublicKey = backendContext.cleanText(sourceSwimmer.identityKey) || backendContext.publicSwimmerKey(sourceSwimmer);
    const newPublicKey = backendContext.cleanText(targetSwimmer.identityKey) || backendContext.publicSwimmerKey(targetSwimmer);
    const rows = backendContext.uniquePublicPerformanceRows((Array.isArray(targetRows) ? targetRows : []).map(backendContext.publicPerformanceBaseRow));
    if (!oldPublicKey || !newPublicKey || !rows.length) {
      throw new Error("Donnees insuffisantes pour publier la fusion nageur.");
    }
    const oldPayload = await backendContext.readPublicPerformanceJson(backendContext.publicPerformanceSwimmerFilePath(oldPublicKey), null);
    const oldRows = publicPerformanceRowsFromSwimmerPayload(oldPayload || {});
    const now = context.now || new Date().toISOString();
    const newPerfFile = backendContext.publicPerformanceSwimmerFilePath(newPublicKey);
    const existingTargetPayload = await backendContext.readPublicPerformanceJson(newPerfFile, null);
    if (existingTargetPayload) {
      await backendContext.removePublicSearchIndexes(existingTargetPayload, newPerfFile);
      await backendContext.deletePublicPerformanceFile(newPerfFile);
    }
    const publicSnapshot = oldPublicKey === newPublicKey
      ? await backendContext.rebuildPublicPerformanceFilesForAffectedRows(rows, {
          now,
          reason: "engagement.swimmerMerged"
        })
      : await backendContext.replacePublicSwimmerIdentity(oldPublicKey, newPublicKey, rows);
    const topSnapshot = await backendContext.rebuildPublicTopFilesForAffectedRows(
      [...oldRows, ...rows],
      new Map([[newPublicKey, rows]])
    );
    return {
      ...publicSnapshot,
      oldPublicKey,
      newPublicKey,
      correctedTopBuckets: topSnapshot.affectedTopBuckets
    };
  }

  async function activePerformanceRowsForNationalSwimmer(target = {}) {
    const swimmer = target.swimmer || {};
    return backendContext.getPerformanceBaseRowsBySwimmer({
      swimmerIds: backendContext.swimmerMergeIds(swimmer, target.ref?.id).slice(0, 25),
      identityKey: backendContext.cleanText(swimmer.identityKey).slice(0, 180)
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

  function engagementClubPersonEntrySnapshot(person = {}) {
    return {
      personId: backendContext.cleanText(person.id).slice(0, 80),
      firstName: backendContext.cleanText(person.firstName).slice(0, 80),
      lastName: backendContext.cleanText(person.lastName).slice(0, 80),
      licenseNumber: backendContext.cleanText(person.licenseNumber).slice(0, 60)
    };
  }

  function engagementClubPersonFullName(person = {}) {
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.licenseNumber || person.id || "Personne";
  }

  function mergeEngagementClubEntryOfficials(officials = [], sourceId = "", targetOfficial = {}) {
    const targetId = backendContext.cleanText(targetOfficial.personId).slice(0, 80);
    const seen = new Set();
    let changed = false;
    const merged = (Array.isArray(officials) ? officials : []).map((official) => {
      const officialId = backendContext.cleanText(official?.personId).slice(0, 80);
      if (officialId === sourceId) {
        changed = true;
        return targetOfficial;
      }
      return backendContext.cleanEngagementEntryOfficial(official || {});
    }).filter((official) => official.personId || official.licenseNumber)
      .filter((official) => {
        const key = official.personId || `${official.licenseNumber}|${official.firstName}|${official.lastName}`;
        if (!key) return false;
        if (seen.has(key)) {
          changed = true;
          return false;
        }
        seen.add(key);
        return true;
      });
    if (targetId && !seen.has(targetId) && (Array.isArray(officials) ? officials : []).some((official) => backendContext.cleanText(official?.personId).slice(0, 80) === sourceId)) {
      changed = true;
    }
    return { officials: merged, changed };
  }

  return {
    importSwimmerCreation,
    nationalSwimmerSearchMatches,
    nationalSwimmerSort,
    searchEngagementNationalSwimmerDocs,
    engagementLicenseControlSeason,
    engagementLicenseControlPerson,
    engagementLicenseReportRequest,
    engagementSwimmerIdentitySnapshot,
    cleanEngagementSwimmerIdentityCorrection,
    findPerformanceSwimmerCorrectionTarget,
    findEngagementSwimmerCorrectionLicense,
    getEngagementSwimmerCorrectionTarget,
    assertNoEngagementSwimmerIdentityConflict,
    engagementEntrySwimmerCorrectionResult,
    engagementEntryRelayCorrectionResult,
    updateEngagementEntriesForSwimmerCorrection,
    setEngagementSwimmerChangeRequestRosterState,
    applyEngagementSwimmerIdentityCorrection,
    engagementSwimmerChangeRequestItem,
    sendEngagementSwimmerChangeResolutionNotification,
    engagementNationalAdministrationPendingCounts,
    engagementClubSwimmerDeletionUsage,
    deleteEngagementClubSwimmerPermanently,
    engagementNationalSwimmerCollectionForSource,
    engagementNationalSwimmerItemFromDoc,
    materializeEngagementNationalPerformanceSwimmerForMerge,
    getEngagementNationalSwimmerForMerge,
    engagementNationalSwimmerFullName,
    engagementNationalSwimmerEntrySnapshot,
    mergeEngagementEntryIndividualEntries,
    mergeEngagementClubEntrySwimmers,
    mergeEngagementClubEntryRelays,
    searchEngagementNationalSwimmerMergeTargetDocs,
    performanceMergeTargetPayloadFromSwimmer,
    publicPerformanceRowsFromSwimmerPayload,
    publishEngagementNationalSwimmerMerge,
    activePerformanceRowsForNationalSwimmer,
    readPerformanceDocsForNationalSwimmerMerge,
    engagementClubPersonEntrySnapshot,
    engagementClubPersonFullName,
    mergeEngagementClubEntryOfficials
  };
}

module.exports = { createNationalService };
