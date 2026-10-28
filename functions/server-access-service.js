// Preserve the execution mode of the existing index.js function bodies.

// Private existing helpers; live services/state are supplied by index.js.
// Module creation performs no external operation.
function createAccessService(backendContext) {
  function portalReadStats(callable, startedAt, options = {}) {
    const stats = {
      baseDocuments: Math.max(0, Math.trunc(Number(options.baseDocuments) || 0)),
      variableDocumentsMax: Math.max(0, Math.trunc(Number(options.variableDocumentsMax) || 0)),
      cacheHit: typeof options.cacheHit === "boolean" ? options.cacheHit : null,
      durationMs: Math.max(0, Date.now() - startedAt)
    };
    console.info("livepalmes.portal.reads", { callable, ...stats });
    return stats;
  }

  function engagementCategoryCodesForEvent(code) {
    const definition = backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE.get(code);
    return definition?.type === "relay"
      ? backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES
      : backendContext.ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES;
  }

  function normalizeEngagementEventCategoryRestrictions(code, categories = []) {
    const allowedCategories = engagementCategoryCodesForEvent(code)
      .filter((category) => !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[code] || new Set()).has(category));
    const restrictionSet = new Set(categories.filter((category) => allowedCategories.includes(category)));
    if (code === "50AP") {
      const legacyDefault = ["C", "J", "S", "M30+", "M40+", "M50+"];
      if (legacyDefault.every((category) => restrictionSet.has(category)) && ["M60+", "M70+", "M80+"].some((category) => !restrictionSet.has(category))) {
        return allowedCategories;
      }
    }
    return Array.from(restrictionSet);
  }

  function cleanEngagementRelayMixedMode(rawEvent = {}, definition = {}) {
    if (definition.type !== "relay") return "";
    if (definition.relayMixedRule === "required") return "required";
    if (definition.relayMixedRule === "mastersOnly") {
      const mode = backendContext.cleanText(rawEvent.relayMixedMode).trim();
      return backendContext.ENGAGEMENT_RELAY_MIXED_MODES.has(mode) && mode === "masters" ? "masters" : "none";
    }
    return "";
  }



  function competitionEmailNotificationsEnabled(value = {}) {
    return value?.emailPreferences?.competitionNotifications !== false && value?.competitionNotificationsEnabled !== false;
  }

  function notificationPreferenceSecretValue() {
    try {
      return String(backendContext.LIVEPALMES_NOTIFICATION_LINK_SECRET.value() || process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
    } catch (_) {
      return String(process.env.LIVEPALMES_NOTIFICATION_LINK_SECRET || "");
    }
  }

  function competitionNotificationPreferenceToken(uid = "") {
    const cleanUid = backendContext.cleanText(uid).slice(0, 128);
    const secret = notificationPreferenceSecretValue();
    if (!cleanUid || !secret) return "";
    return backendContext.crypto.createHmac("sha256", secret)
      .update(`competition-notifications|${cleanUid}`)
      .digest("base64url");
  }

  function validCompetitionNotificationPreferenceToken(uid = "", token = "") {
    const expected = competitionNotificationPreferenceToken(uid);
    const provided = backendContext.cleanText(token);
    if (!expected || !provided || expected.length !== provided.length) return false;
    return backendContext.crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }

  function competitionNotificationPreferenceUrl(uid = "") {
    const token = competitionNotificationPreferenceToken(uid);
    if (!token) return "";
    return `${backendContext.ENVIRONMENT.hostingOrigin}/notifications.html?uid=${encodeURIComponent(backendContext.cleanText(uid))}&token=${encodeURIComponent(token)}`;
  }

  function engagementClubRegionId(club = {}, fallback = "") {
    return backendContext.CLUB_REFERENCE_REGION_LABELS[backendContext.cleanText(club.regionId)] || backendContext.cleanText(fallback).slice(0, 80);
  }

  function engagementClubCode(clubId, fallback = "") {
    return backendContext.CLUB_REFERENCE_BY_ID.get(backendContext.cleanText(clubId))?.clubCode || backendContext.cleanText(fallback);
  }

  function engagementClubName(clubId, fallback = "") {
    return backendContext.CLUB_REFERENCE_BY_ID.get(backendContext.cleanText(clubId))?.clubName || backendContext.cleanText(fallback);
  }

  function engagementStoredClubItem(doc) {
    const data = doc?.data ? doc.data() || {} : doc || {};
    return cleanFirestoreValue({
      id: backendContext.cleanText(doc?.id || data.id || data.clubId).slice(0, 40),
      clubId: backendContext.cleanText(data.clubId || doc?.id).slice(0, 40),
      clubCode: backendContext.cleanText(data.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: backendContext.cleanText(data.regionId).slice(0, 80),
      federalNumber: backendContext.cleanText(data.federalNumber).slice(0, 24),
      city: backendContext.cleanText(data.city).slice(0, 100),
      postalCode: backendContext.cleanText(data.postalCode).slice(0, 16),
      active: data.active !== false,
      deleted: data.deleted === true,
      source: backendContext.cleanText(data.source || "national").slice(0, 40),
      createdAt: backendContext.cleanText(data.createdAt).slice(0, 40),
      createdBy: backendContext.cleanText(data.createdBy).slice(0, 128),
      updatedAt: backendContext.cleanText(data.updatedAt).slice(0, 40),
      updatedBy: backendContext.cleanText(data.updatedBy).slice(0, 128)
    });
  }

  function publicEngagementClubItem(club = {}) {
    return cleanFirestoreValue({
      clubId: backendContext.cleanText(club.clubId || club.id).slice(0, 40),
      clubCode: backendContext.cleanText(club.clubCode).slice(0, 40),
      clubName: backendContext.cleanText(club.clubName).slice(0, 140),
      regionId: backendContext.cleanText(club.regionId).slice(0, 80),
      federalNumber: backendContext.cleanText(club.federalNumber).slice(0, 24),
      city: backendContext.cleanText(club.city).slice(0, 100),
      postalCode: backendContext.cleanText(club.postalCode).slice(0, 16),
      active: club.active !== false,
      source: backendContext.cleanText(club.source || "national").slice(0, 40)
    });
  }

  function publicEngagementClubDirectoryRef() {
    return backendContext.db.collection(backendContext.ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION).doc("clubs");
  }

  async function engagementClubsByIds(clubIds = []) {
    const ids = Array.from(new Set(clubIds.map((clubId) => backendContext.cleanText(clubId).slice(0, 40)).filter(Boolean)));
    const byId = new Map(ids.map((clubId) => [clubId, backendContext.CLUB_REFERENCE_BY_ID.get(clubId) || { clubId }]));
    if (!ids.length) return byId;
    const snapshots = await backendContext.db.getAll(...ids.map((clubId) => backendContext.db.collection(backendContext.ENGAGEMENT_CLUBS_COLLECTION).doc(clubId)));
    snapshots.filter((snapshot) => snapshot.exists).forEach((snapshot) => {
      const stored = engagementStoredClubItem(snapshot);
      byId.set(stored.clubId, { ...(byId.get(stored.clubId) || {}), ...stored });
    });
    return byId;
  }

  async function engagementClubById(clubId) {
    return (await engagementClubsByIds([clubId])).get(backendContext.cleanText(clubId)) || null;
  }

  function cleanFirestoreValue(value) {
    if (value === undefined || typeof value === "function") return undefined;
    if (value === null) return null;
    if (Array.isArray(value)) {
      return value
        .map(cleanFirestoreValue)
        .filter((item) => item !== undefined);
    }
    if (value && typeof value === "object") {
      return Object.entries(value).reduce((acc, [key, item]) => {
        const cleaned = cleanFirestoreValue(item);
        if (cleaned !== undefined) acc[key] = cleaned;
        return acc;
      }, {});
    }
    return value;
  }

  function competitionIdFrom(data = {}) {
    const competitionId = backendContext.cleanText(data.competitionId || "livepalmes-active");
    if (!backendContext.COMPETITION_IDS.has(competitionId)) {
      throw new backendContext.HttpsError("invalid-argument", "Competition LivePalmes inconnue.");
    }
    return competitionId;
  }

  function assertAdmin(request) {
    const uid = request.auth?.uid || "";
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (!backendContext.ADMIN_UIDS.has(uid) && capabilities["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Admin LivePalmes requis.");
    }
  }

  function assertCapability(request, capability) {
    const uid = request.auth?.uid || "";
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    const explicitCapabilityRequired = capability === "dtn.view" || capability.startsWith("engagements.");
    const adminFallbackAllowed = !explicitCapabilityRequired && capabilities["admin.full"] === true;
    if (!backendContext.ADMIN_UIDS.has(uid) && !adminFallbackAllowed && capabilities[capability] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit LivePalmes requis.");
    }
  }

  async function assertLivePalmesAccess(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid)) return;
    const capabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (capabilities["admin.full"] === true || backendContext.ACCESS_CAPABILITIES.some((capability) => capabilities[capability] === true)) return;

    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    const activeCapabilities = activeCapabilitiesFromMap(data.capabilities || {});
    if (!snapshot.exists || data.status !== "active" || !activeCapabilities.length) {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes requis.");
    }
  }

  function normalizeEmail(value) {
    return backendContext.cleanText(value).toLowerCase();
  }

  function normalizedEngagementRegionKey(value) {
    const cleanValue = backendContext.cleanText(value);
    return backendContext.cleanText(backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue] || cleanValue)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "")
      .toLocaleLowerCase("fr");
  }

  function engagementRegionsMatch(left, right) {
    const leftKey = normalizedEngagementRegionKey(left);
    return Boolean(leftKey && leftKey === normalizedEngagementRegionKey(right));
  }

  function canonicalAccessDirectoryRegionId(value) {
    const cleanValue = backendContext.cleanText(value).slice(0, 80);
    if (!cleanValue) return "";
    if (backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue]) return backendContext.CLUB_REFERENCE_REGION_LABELS[cleanValue];
    const normalizedValue = normalizedEngagementRegionKey(cleanValue);
    const knownRegion = Object.values(backendContext.CLUB_REFERENCE_REGION_LABELS)
      .find((label) => normalizedEngagementRegionKey(label) === normalizedValue);
    return knownRegion || cleanValue;
  }

  function assertEmail(email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new backendContext.HttpsError("invalid-argument", "Email invalide.");
    }
  }

  function cleanAccessProfile(raw = {}) {
    const uid = backendContext.cleanText(raw.uid).slice(0, 128);
    const email = normalizeEmail(raw.email);
    assertEmail(email);
    const firstName = backendContext.cleanText(raw.firstName).slice(0, 80);
    const lastName = backendContext.cleanText(raw.lastName).slice(0, 80);
    const clubId = backendContext.cleanText(raw.clubId).slice(0, 40);
    const clubName = backendContext.cleanText(raw.clubName).slice(0, 140);
    const regionId = canonicalAccessDirectoryRegionId(raw.regionId);
    const licenseNumber = backendContext.cleanText(raw.licenseNumber).slice(0, 60);
    const capabilities = Array.isArray(raw.capabilities)
      ? raw.capabilities.map(backendContext.cleanText).filter((item) => backendContext.ACCESS_CAPABILITY_SET.has(item))
      : [];
    if (!firstName || !lastName) {
      throw new backendContext.HttpsError("invalid-argument", "Nom et prenom obligatoires.");
    }
    if (!capabilities.length) {
      throw new backendContext.HttpsError("invalid-argument", "Selectionne au moins un droit.");
    }
    if (capabilities.includes("dtn.manage") && !capabilities.includes("dtn.view")) {
      throw new backendContext.HttpsError("invalid-argument", "La gestion des paramètres DTN requiert l’accès à l’espace DTN.");
    }
    if (capabilities.includes("engagements.club.manage") && !clubId) {
      throw new backendContext.HttpsError("invalid-argument", "Numero de club obligatoire pour un acces engagements club.");
    }
    if (capabilities.includes("engagements.club.switch") && !capabilities.includes("engagements.club.manage")) {
      throw new backendContext.HttpsError("invalid-argument", "Le droit de changement de club requiert le droit engagements club.");
    }
    if (capabilities.includes("engagements.region.manage") && !regionId) {
      throw new backendContext.HttpsError("invalid-argument", "Region obligatoire pour un acces engagements region.");
    }
    const accessScopes = accessScopesMapFromProfile({ clubId, regionId, capabilities });
    return { uid, email, firstName, lastName, clubId, clubName, regionId, licenseNumber, capabilities, accessScopes };
  }

  function capabilitiesMap(capabilities = []) {
    return backendContext.ACCESS_CAPABILITIES.reduce((acc, capability) => {
      acc[capability] = capabilities.includes(capability);
      return acc;
    }, {});
  }

  function activeCapabilitiesFromMap(map = {}) {
    return backendContext.ACCESS_CAPABILITIES.filter((capability) => map?.[capability] === true);
  }

  function accessDirectoryKeys(profile = {}, status = profile.status || "active") {
    const cleanStatus = status === "inactive" ? "inactive" : "active";
    const capabilities = Array.isArray(profile.capabilities)
      ? profile.capabilities
      : activeCapabilitiesFromMap(profile.capabilities || {});
    const regionId = accessUserRegionIdFromData({
      ...profile,
      capabilities: capabilitiesMap(capabilities)
    });
    const nationalAccount = capabilities.includes("admin.full") || capabilities.includes("engagements.national.manage");
    const keys = new Set(["all", `status:${cleanStatus}`]);
    capabilities.forEach((capability) => {
      keys.add(`capability:${capability}`);
      keys.add(`status:${cleanStatus}|capability:${capability}`);
    });
    if (regionId && !nationalAccount) {
      keys.add(`region:${regionId}`);
      keys.add(`region:${regionId}|status:${cleanStatus}`);
      capabilities.forEach((capability) => {
        keys.add(`region:${regionId}|capability:${capability}`);
        keys.add(`region:${regionId}|status:${cleanStatus}|capability:${capability}`);
      });
    }
    return [...keys];
  }

  function accessDirectoryFilterKey(context = {}, status = "", capability = "") {
    return [
      !context.national && context.regionId ? `region:${context.regionId}` : "",
      status ? `status:${status}` : "",
      capability ? `capability:${capability}` : ""
    ].filter(Boolean).join("|") || "all";
  }

  function accessDirectoryIndexStateRef() {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_INDEX_STATE_COLLECTION).doc("default");
  }

  function accessDirectorySnapshotStateRef() {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION).doc("default");
  }

  function accessDirectorySnapshotDocumentId(scopeType = "national", scopeId = "") {
    return scopeType === "region"
      ? `region:${encodeURIComponent(backendContext.cleanText(scopeId).slice(0, 80))}`
      : "national";
  }

  function accessDirectorySnapshotRef(scopeType = "national", scopeId = "") {
    return backendContext.db.collection(backendContext.ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION)
      .doc(accessDirectorySnapshotDocumentId(scopeType, scopeId));
  }

  function accessDirectorySnapshotEntryKey(uid = "") {
    return backendContext.crypto.createHash("sha256").update(backendContext.cleanText(uid)).digest("hex").slice(0, 32);
  }

  function normalizedAccessScope(scope = {}) {
    const scopeType = ["club", "region", "national"].includes(backendContext.cleanText(scope.scopeType))
      ? backendContext.cleanText(scope.scopeType)
      : "national";
    return {
      scopeType,
      scopeId: scopeType === "national" ? "" : backendContext.cleanText(scope.scopeId).slice(0, 80)
    };
  }

  function accessScopeForCapability(profile = {}, capability) {
    if (capability === "engagements.club.manage") {
      return normalizedAccessScope({ scopeType: "club", scopeId: profile.clubId });
    }
    if (capability === "engagements.region.manage") {
      return normalizedAccessScope({ scopeType: "region", scopeId: profile.regionId });
    }
    return normalizedAccessScope({ scopeType: "national", scopeId: "" });
  }

  function accessScopesMapFromProfile(profile = {}) {
    return (profile.capabilities || []).reduce((acc, capability) => {
      acc[capability] = accessScopeForCapability(profile, capability);
      return acc;
    }, {});
  }

  function hasEngagementsCapability(capabilities = {}) {
    return capabilities["engagements.club.manage"] === true ||
      capabilities["engagements.region.manage"] === true ||
      capabilities["engagements.national.manage"] === true;
  }

  async function engagementAccessContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE) {
      return {
        uid,
        email: backendContext.cleanText(request.auth?.token?.email).slice(0, 180),
        national: true,
        region: true,
        regionId: "",
        competitionNotificationsEnabled: true
      };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities || request.auth?.token?.livepalmesCapabilities || {};
    const accessScopes = data.accessScopes || {};
    const national = capabilities["engagements.national.manage"] === true;
    const region = capabilities["engagements.region.manage"] === true;
    const regionScope = normalizedAccessScope(accessScopes["engagements.region.manage"]);
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      national,
      region,
      regionId: regionScope.scopeId || backendContext.cleanText(data.regionId).slice(0, 80),
      competitionNotificationsEnabled: competitionEmailNotificationsEnabled(data)
    };
  }

  async function accessManagementContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
      return {
        uid,
        email: backendContext.cleanText(request.auth?.token?.email).slice(0, 180),
        adminFull: true,
        national: true,
        region: true,
        regionId: ""
      };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = data.capabilities || tokenCapabilities || {};
    const accessScopes = data.accessScopes || {};
    const national = capabilities["engagements.national.manage"] === true;
    const region = capabilities["engagements.region.manage"] === true;
    if (!national && !region) {
      throw new backendContext.HttpsError("permission-denied", "Droit de gestion des acces requis.");
    }
    const regionScope = normalizedAccessScope(accessScopes["engagements.region.manage"]);
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      adminFull: false,
      national,
      region,
      regionId: canonicalAccessDirectoryRegionId(regionScope.scopeId || data.regionId)
    };
  }

  async function auditManagementContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (backendContext.ADMIN_UIDS.has(uid) || backendContext.FUNCTIONS_EMULATOR_ACTIVE || tokenCapabilities["admin.full"] === true) {
      return { uid, adminFull: true, profileReadCount: 0 };
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active" || data.capabilities?.["admin.full"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Journal reserve a la gestion generale.");
    }
    return { uid, adminFull: true, profileReadCount: 1 };
  }

  function accessUserRegionIdFromData(data = {}) {
    const regionScope = normalizedAccessScope(data.accessScopes?.["engagements.region.manage"]);
    const directRegionId = regionScope.scopeId || backendContext.cleanText(data.regionId).slice(0, 80);
    if (directRegionId) return canonicalAccessDirectoryRegionId(directRegionId);
    const clubScope = normalizedAccessScope(data.accessScopes?.["engagements.club.manage"]);
    const clubId = clubScope.scopeId || backendContext.cleanText(data.clubId).slice(0, 40);
    return canonicalAccessDirectoryRegionId(backendContext.CLUB_REFERENCE_BY_ID.get(clubId)?.regionId);
  }

  function accessUserVisibleToRegional(context, data = {}) {
    if (!context?.region || !context.regionId) return false;
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return false;
    return accessUserRegionIdFromData(data) === context.regionId;
  }

  function accessUserCanBeManagedByRegional(context, data = {}) {
    if (!context?.region || !context.regionId) return false;
    const capabilities = data.capabilities || {};
    if (capabilities["admin.full"] === true || capabilities["engagements.national.manage"] === true) return false;
    if (capabilities["engagements.region.manage"] !== true) return false;
    return accessUserRegionIdFromData(data) === context.regionId;
  }

  function accessUserVisibleForAccessDirectory(context, doc) {
    if (context?.national) return true;
    return accessUserVisibleToRegional(context, doc.data() || {});
  }

  function assertRegionalAccessUserDeletionRequestAllowed(context, targetData = {}) {
    if (context?.national) return;
    if (!accessUserCanBeManagedByRegional(context, targetData)) {
      throw new backendContext.HttpsError("permission-denied", "Demande limitee aux admins region de ta region.");
    }
  }

  async function engagementClubAccessContext(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active") {
      throw new backendContext.HttpsError("permission-denied", "Acces LivePalmes desactive.");
    }
    const capabilities = backendContext.ADMIN_UIDS.has(uid)
      ? capabilitiesMap(backendContext.ACCESS_CAPABILITIES)
      : (data.capabilities || request.auth?.token?.livepalmesCapabilities || {});
    if (capabilities["engagements.club.manage"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements club requis.");
    }
    const accessScopes = data.accessScopes || {};
    const clubScope = normalizedAccessScope(accessScopes["engagements.club.manage"]);
    const homeClubId = backendContext.cleanText(clubScope.scopeId || data.clubId).slice(0, 40);
    if (!homeClubId) {
      throw new backendContext.HttpsError("failed-precondition", "Numero de club requis pour les engagements club.");
    }
    const requestedClubId = backendContext.cleanText(request.data?.activeClubId).slice(0, 40);
    const isSwitchingClub = Boolean(requestedClubId && requestedClubId !== homeClubId);
    if (isSwitchingClub && capabilities["engagements.club.switch"] !== true) {
      throw new backendContext.HttpsError("permission-denied", "Droit de changement de club requis.");
    }
    let activeClub = null;
    if (isSwitchingClub) {
      if (backendContext.ENVIRONMENT.sportingDataSource === "nap") {
        try {
          const pool = require("./nap-portal-swimmers").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
          activeClub = await require("./nap-club-directory").findClub(pool, requestedClubId);
        } catch (error) {
          throw new backendContext.HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable",
            error instanceof TypeError ? error.message : "Club NAP indisponible. Reessayez.");
        }
      } else activeClub = await engagementClubById(requestedClubId);
    }
    if (isSwitchingClub && (!activeClub || !backendContext.CLUB_REFERENCE_REGION_LABELS[activeClub.regionId])) {
      throw new backendContext.HttpsError("invalid-argument", "Club actif inconnu.");
    }
    const clubId = activeClub?.clubId || homeClubId;
    return {
      uid,
      email: backendContext.cleanText(request.auth?.token?.email || data.email).slice(0, 180),
      firstName: backendContext.cleanText(data.firstName || request.auth?.token?.given_name).slice(0, 80),
      lastName: backendContext.cleanText(data.lastName || request.auth?.token?.family_name).slice(0, 80),
      clubId,
      clubName: activeClub?.clubName || backendContext.cleanText(data.clubName).slice(0, 140),
      regionId: activeClub ? engagementClubRegionId(activeClub, data.regionId) : backendContext.cleanText(data.regionId).slice(0, 80),
      homeClubId,
      switchedClub: isSwitchingClub
    };
  }

  async function assertEngagementsAccess(request) {
    const uid = request.auth?.uid || "";
    if (!uid) {
      throw new backendContext.HttpsError("unauthenticated", "Connexion Firebase requise.");
    }
    if (backendContext.ADMIN_UIDS.has(uid)) return;
    const tokenCapabilities = request.auth?.token?.livepalmesCapabilities || {};
    if (request.auth?.token?.livepalmesAccess === true && hasEngagementsCapability(tokenCapabilities)) return;

    const snapshot = await backendContext.db.collection("users").doc(uid).get();
    const data = snapshot.exists ? snapshot.data() || {} : {};
    if (!snapshot.exists || data.status !== "active" || !hasEngagementsCapability(data.capabilities || {})) {
      throw new backendContext.HttpsError("permission-denied", "Droit engagements requis.");
    }
  }

  function displayNameFromProfile(profile = {}) {
    return [backendContext.cleanText(profile.firstName), backendContext.cleanText(profile.lastName)].filter(Boolean).join(" ");
  }

  async function accessUserDisplayName(uid, fallbackToken = {}) {
    const cleanUid = backendContext.cleanText(uid);
    if (!cleanUid) return "";
    const snapshot = await backendContext.db.collection("users").doc(cleanUid).get().catch(() => null);
    const data = snapshot?.exists ? snapshot.data() || {} : {};
    return displayNameFromProfile(data) || backendContext.cleanText(fallbackToken.name);
  }

  async function userByEmailOrCreate(profile) {
    const displayName = displayNameFromProfile(profile);
    if (profile.uid) {
      const existing = await backendContext.auth.getUser(profile.uid);
      await backendContext.auth.updateUser(existing.uid, { email: profile.email, displayName, disabled: false });
      return { user: { ...existing, email: profile.email, displayName }, created: false };
    }
    try {
      const existing = await backendContext.auth.getUserByEmail(profile.email);
      await backendContext.auth.updateUser(existing.uid, { displayName, disabled: false });
      return { user: existing, created: false };
    } catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      const user = await backendContext.auth.createUser({
        email: profile.email,
        emailVerified: false,
        displayName,
        disabled: false
      });
      return { user, created: true };
    }
  }

  async function saveAccessUserProfile(profile, actorUid) {
    const { user, created } = await userByEmailOrCreate(profile);
    const now = new Date().toISOString();
    const capabilityMap = capabilitiesMap(profile.capabilities);

    await backendContext.auth.setCustomUserClaims(user.uid, {
      ...(user.customClaims || {}),
      livepalmesAccess: true,
      livepalmesConsoleAccess: backendContext.hasConsolePortalCapability(capabilityMap),
      livepalmesCapabilities: capabilityMap
    });

    const userRef = backendContext.db.collection("users").doc(user.uid);
    await userRef.set({
      uid: user.uid,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      clubId: profile.clubId,
      clubName: profile.clubName,
      regionId: profile.regionId,
      licenseNumber: profile.licenseNumber,
      status: "active",
      capabilities: capabilityMap,
      accessDirectoryKeys: accessDirectoryKeys({ ...profile, capabilities: profile.capabilities }, "active"),
      accessScopes: profile.accessScopes,
      updatedAt: now,
      updatedBy: actorUid,
      ...(created ? { createdAt: now, createdBy: actorUid } : {})
    }, { merge: true });

    await writeAccessGrants(user.uid, profile.email, profile.capabilities, "active", actorUid, now, profile.accessScopes);

    await writeAuditLog(created ? "accessUser.created" : "accessUser.updated", actorUid, {
      uid: user.uid,
      email: profile.email,
      capabilities: profile.capabilities,
      accessScopes: profile.accessScopes
    });

    return {
      ok: true,
      created,
      uid: user.uid,
      email: profile.email,
      capabilities: profile.capabilities
    };
  }

  async function writeAuditLog(action, actorUid, target = {}) {
    const now = new Date().toISOString();
    await backendContext.db.collection("auditLogs").add({
      action,
      actorUid,
      target,
      createdAt: now
    });
  }

  async function writeAuditLogOnce(action, actorUid, target = {}, eventId = "") {
    const now = new Date().toISOString();
    const auditId = stableHash([action, eventId || now].join("|")).slice(0, 40);
    await backendContext.db.collection("auditLogs").doc(auditId).set({
      action,
      actorUid,
      target,
      createdAt: now
    }, { merge: false });
  }

  async function writeAccessGrants(uid, email, capabilities, status, actorUid, now, accessScopes = {}) {
    const batch = backendContext.db.batch();
    backendContext.ACCESS_CAPABILITIES.forEach((capability) => {
      const grantRef = backendContext.db.collection("accessGrants").doc(`${uid}_${capability.replace(".", "_")}`);
      const scope = normalizedAccessScope(accessScopes[capability]);
      batch.set(grantRef, {
        uid,
        email,
        capability,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        status: capabilities.includes(capability) ? status : "inactive",
        updatedAt: now,
        updatedBy: actorUid,
        createdAt: now
      }, { merge: true });
    });
    return batch.commit();
  }

  function assertRole(role) {
    if (!backendContext.ROLE_SET.has(role)) {
      throw new backendContext.HttpsError("invalid-argument", "Role LivePalmes inconnu.");
    }
  }

  function assertPin(pin) {
    if (!/^\d{4}$/.test(pin)) {
      throw new backendContext.HttpsError("invalid-argument", "Le code PIN doit contenir 4 chiffres.");
    }
  }

  function pinHash(pin, salt) {
    return backendContext.crypto.pbkdf2Sync(String(pin), String(salt), backendContext.HASH_ITERATIONS, backendContext.HASH_BYTES, "sha256").toString("hex");
  }

  function stableHash(value) {
    return backendContext.crypto.createHash("sha256").update(String(value || "")).digest("hex");
  }

  return {
    portalReadStats,
    engagementCategoryCodesForEvent,
    normalizeEngagementEventCategoryRestrictions,
    cleanEngagementRelayMixedMode,
    competitionEmailNotificationsEnabled,
    notificationPreferenceSecretValue,
    competitionNotificationPreferenceToken,
    validCompetitionNotificationPreferenceToken,
    competitionNotificationPreferenceUrl,
    engagementClubRegionId,
    engagementClubCode,
    engagementClubName,
    engagementStoredClubItem,
    publicEngagementClubItem,
    publicEngagementClubDirectoryRef,
    engagementClubsByIds,
    engagementClubById,
    cleanFirestoreValue,
    competitionIdFrom,
    assertAdmin,
    assertCapability,
    assertLivePalmesAccess,
    normalizeEmail,
    normalizedEngagementRegionKey,
    engagementRegionsMatch,
    canonicalAccessDirectoryRegionId,
    assertEmail,
    cleanAccessProfile,
    capabilitiesMap,
    activeCapabilitiesFromMap,
    accessDirectoryKeys,
    accessDirectoryFilterKey,
    accessDirectoryIndexStateRef,
    accessDirectorySnapshotStateRef,
    accessDirectorySnapshotDocumentId,
    accessDirectorySnapshotRef,
    accessDirectorySnapshotEntryKey,
    normalizedAccessScope,
    accessScopeForCapability,
    accessScopesMapFromProfile,
    hasEngagementsCapability,
    engagementAccessContext,
    accessManagementContext,
    auditManagementContext,
    accessUserRegionIdFromData,
    accessUserVisibleToRegional,
    accessUserCanBeManagedByRegional,
    accessUserVisibleForAccessDirectory,
    assertRegionalAccessUserDeletionRequestAllowed,
    engagementClubAccessContext,
    assertEngagementsAccess,
    displayNameFromProfile,
    accessUserDisplayName,
    userByEmailOrCreate,
    saveAccessUserProfile,
    writeAuditLog,
    writeAuditLogOnce,
    writeAccessGrants,
    assertRole,
    assertPin,
    pinHash,
    stableHash
  };
}

module.exports = { createAccessService };
