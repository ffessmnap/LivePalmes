// Compatibility factory; operation modules hold the existing bodies.
function createClubPeopleService(backendContext) {
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/server-club-people-service/clean-engagement-club-person").createClubPeopleService_cleanEngagementClubPerson({
      get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
      set ENGAGEMENT_SWIMMER_LICENSE_PATTERN(value) { backendContext.ENGAGEMENT_SWIMMER_LICENSE_PATTERN = value; },
      get HttpsError() { return backendContext.HttpsError; },
      set HttpsError(value) { backendContext.HttpsError = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementSwimmerIdentityKey() { return backendContext.engagementSwimmerIdentityKey; },
      set engagementSwimmerIdentityKey(value) { backendContext.engagementSwimmerIdentityKey = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get local$engagementClubPeopleRosterPersonItem() { return operation3().engagementClubPeopleRosterPersonItem; },
      get local$engagementClubPersonItem() { return operation1().engagementClubPersonItem; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/server-club-people-service/engagement-club-person-item").createClubPeopleService_engagementClubPersonItem({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/server-club-people-service/engagement-club-people-roster-id").createClubPeopleService_engagementClubPeopleRosterId({
      get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
      set ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION(value) { backendContext.ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/server-club-people-service/engagement-club-people-roster-person-item").createClubPeopleService_engagementClubPeopleRosterPersonItem({
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/server-club-people-service/engagement-club-people-roster-people-from-data").createClubPeopleService_engagementClubPeopleRosterPeopleFromData({
      get local$engagementClubPeopleRosterPersonItem() { return operation3().engagementClubPeopleRosterPersonItem; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/server-club-people-service/upsert-engagement-club-people-roster-person").createClubPeopleService_upsertEngagementClubPeopleRosterPerson({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$deleteEngagementClubPeopleRosterPerson() { return operation6().deleteEngagementClubPeopleRosterPerson; },
      get local$engagementClubPeopleRosterPersonItem() { return operation3().engagementClubPeopleRosterPersonItem; },
      get local$engagementClubPeopleRosterRef() { return operation2().engagementClubPeopleRosterRef; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/server-club-people-service/delete-engagement-club-people-roster-person").createClubPeopleService_deleteEngagementClubPeopleRosterPerson({
      get FieldValue() { return backendContext.FieldValue; },
      set FieldValue(value) { backendContext.FieldValue = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementClubPeopleRosterRef() { return operation2().engagementClubPeopleRosterRef; }
    });
    return cache6;
  }

  let cache7;
  function operation7() {
    if (!cache7) cache7 = require("./backend/server-club-people-service/rebuild-engagement-club-people-roster").createClubPeopleService_rebuildEngagementClubPeopleRoster({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$engagementClubPeopleRosterPeopleFromData() { return operation4().engagementClubPeopleRosterPeopleFromData; },
      get local$engagementClubPeopleRosterPersonItem() { return operation3().engagementClubPeopleRosterPersonItem; },
      get local$engagementClubPeopleRosterRef() { return operation2().engagementClubPeopleRosterRef; },
      get local$engagementClubPersonItem() { return operation1().engagementClubPersonItem; }
    });
    return cache7;
  }

  let cache8;
  function operation8() {
    if (!cache8) cache8 = require("./backend/server-club-people-service/sync-engagement-club-people-roster-from-change").createClubPeopleService_syncEngagementClubPeopleRosterFromChange({
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get local$deleteEngagementClubPeopleRosterPerson() { return operation6().deleteEngagementClubPeopleRosterPerson; },
      get local$engagementClubPersonItem() { return operation1().engagementClubPersonItem; },
      get local$upsertEngagementClubPeopleRosterPerson() { return operation5().upsertEngagementClubPeopleRosterPerson; }
    });
    return cache8;
  }

  let cache9;
  function operation9() {
    if (!cache9) cache9 = require("./backend/server-club-people-service/engagement-club-swimmer-item").createClubPeopleService_engagementClubSwimmerItem({
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; }
    });
    return cache9;
  }

  let cache10;
  function operation10() {
    if (!cache10) cache10 = require("./backend/server-club-people-service/engagement-reference-swimmer-item").createClubPeopleService_engagementReferenceSwimmerItem({
      get cleanEngagementLicenseVerificationStatus() { return backendContext.cleanEngagementLicenseVerificationStatus; },
      set cleanEngagementLicenseVerificationStatus(value) { backendContext.cleanEngagementLicenseVerificationStatus = value; },
      get cleanFirestoreValue() { return backendContext.cleanFirestoreValue; },
      set cleanFirestoreValue(value) { backendContext.cleanFirestoreValue = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get currentEngagementCategoryFromBirthDate() { return backendContext.currentEngagementCategoryFromBirthDate; },
      set currentEngagementCategoryFromBirthDate(value) { backendContext.currentEngagementCategoryFromBirthDate = value; },
      get engagementLicenseSeasonState() { return backendContext.engagementLicenseSeasonState; },
      set engagementLicenseSeasonState(value) { backendContext.engagementLicenseSeasonState = value; },
      get engagementSwimmerIdentityKey() { return backendContext.engagementSwimmerIdentityKey; },
      set engagementSwimmerIdentityKey(value) { backendContext.engagementSwimmerIdentityKey = value; }
    });
    return cache10;
  }

  let cache11;
  function operation11() {
    if (!cache11) cache11 = require("./backend/server-club-people-service/engagement-reference-club-swimmers").createClubPeopleService_engagementReferenceClubSwimmers({
      get PERFORMANCE_SWIMMERS_COLLECTION() { return backendContext.PERFORMANCE_SWIMMERS_COLLECTION; },
      set PERFORMANCE_SWIMMERS_COLLECTION(value) { backendContext.PERFORMANCE_SWIMMERS_COLLECTION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; },
      get engagementClubRosterSwimmerKey() { return backendContext.engagementClubRosterSwimmerKey; },
      set engagementClubRosterSwimmerKey(value) { backendContext.engagementClubRosterSwimmerKey = value; },
      get engagementLegacySwimmerLicensesByClub() { return backendContext.engagementLegacySwimmerLicensesByClub; },
      set engagementLegacySwimmerLicensesByClub(value) { backendContext.engagementLegacySwimmerLicensesByClub = value; },
      get engagementNewSwimmerItem() { return backendContext.engagementNewSwimmerItem; },
      set engagementNewSwimmerItem(value) { backendContext.engagementNewSwimmerItem = value; },
      get intranapSwimmersIndex() { return backendContext.intranapSwimmersIndex; },
      set intranapSwimmersIndex(value) { backendContext.intranapSwimmersIndex = value; },
      get local$engagementClubSwimmerItem() { return operation9().engagementClubSwimmerItem; },
      get local$engagementReferenceSwimmerItem() { return operation10().engagementReferenceSwimmerItem; },
      get local$sortEngagementClubSwimmers() { return operation12().sortEngagementClubSwimmers; },
      get local$uniqueEngagementClubSwimmers() { return operation12().uniqueEngagementClubSwimmers; }
    });
    return cache11;
  }

  let cache12;
  function operation12() {
    if (!cache12) cache12 = require("./backend/server-club-people-service/engagement-club-swimmer-match-keys").createClubPeopleService_engagementClubSwimmerMatchKeys({
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; },
      get engagementSwimmerLicenseNumberKey() { return backendContext.engagementSwimmerLicenseNumberKey; },
      set engagementSwimmerLicenseNumberKey(value) { backendContext.engagementSwimmerLicenseNumberKey = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; }
    });
    return cache12;
  }

  let cache13;
  function operation13() {
    if (!cache13) cache13 = require("./backend/server-club-people-service/sync-engagement-club-roster-from-swimmer-change").createClubPeopleService_syncEngagementClubRosterFromSwimmerChange({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get deleteEngagementClubRosterSwimmer() { return backendContext.deleteEngagementClubRosterSwimmer; },
      set deleteEngagementClubRosterSwimmer(value) { backendContext.deleteEngagementClubRosterSwimmer = value; },
      get deleteEngagementEntryTimeCache() { return backendContext.deleteEngagementEntryTimeCache; },
      set deleteEngagementEntryTimeCache(value) { backendContext.deleteEngagementEntryTimeCache = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; },
      get engagementClubRosterSwimmerKey() { return backendContext.engagementClubRosterSwimmerKey; },
      set engagementClubRosterSwimmerKey(value) { backendContext.engagementClubRosterSwimmerKey = value; },
      get upsertEngagementClubRosterSwimmer() { return backendContext.upsertEngagementClubRosterSwimmer; },
      set upsertEngagementClubRosterSwimmer(value) { backendContext.upsertEngagementClubRosterSwimmer = value; }
    });
    return cache13;
  }

  let cache14;
  function operation14() {
    if (!cache14) cache14 = require("./backend/server-club-people-service/reactivate-engagement-club-roster-swimmers-from-performance-rows").createClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows({
      get cleanEngagementClubActivityStatus() { return backendContext.cleanEngagementClubActivityStatus; },
      set cleanEngagementClubActivityStatus(value) { backendContext.cleanEngagementClubActivityStatus = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get db() { return backendContext.db; },
      set db(value) { backendContext.db = value; },
      get engagementClubRosterRef() { return backendContext.engagementClubRosterRef; },
      set engagementClubRosterRef(value) { backendContext.engagementClubRosterRef = value; },
      get engagementClubRosterSwimmerItem() { return backendContext.engagementClubRosterSwimmerItem; },
      set engagementClubRosterSwimmerItem(value) { backendContext.engagementClubRosterSwimmerItem = value; }
    });
    return cache14;
  }

  let cache15;
  function operation15() {
    if (!cache15) cache15 = require("./backend/server-club-people-service/clean-iso-date-time").createClubPeopleService_cleanIsoDateTime({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache15;
  }

  let cache16;
  function operation16() {
    if (!cache16) cache16 = require("./backend/server-club-people-service/clean-engagement-deadline-at").createClubPeopleService_cleanEngagementDeadlineAt({
      get cleanEngagementEntryStatus() { return backendContext.cleanEngagementEntryStatus; },
      set cleanEngagementEntryStatus(value) { backendContext.cleanEngagementEntryStatus = value; },
      get local$cleanIsoDateTime() { return operation15().cleanIsoDateTime; }
    });
    return cache16;
  }

  let cache17;
  function operation17() {
    if (!cache17) cache17 = require("./backend/server-club-people-service/clean-engagement-region-ids").createClubPeopleService_cleanEngagementRegionIds({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizedEngagementRegionKey() { return backendContext.normalizedEngagementRegionKey; },
      set normalizedEngagementRegionKey(value) { backendContext.normalizedEngagementRegionKey = value; }
    });
    return cache17;
  }
  return {
    cleanEngagementClubPerson: operation0().cleanEngagementClubPerson,
    engagementClubPersonItem: operation1().engagementClubPersonItem,
    engagementClubPeopleRosterId: operation2().engagementClubPeopleRosterId,
    engagementClubPeopleRosterRef: operation2().engagementClubPeopleRosterRef,
    engagementClubPeopleRosterPersonItem: operation3().engagementClubPeopleRosterPersonItem,
    engagementClubPeopleRosterPeopleFromData: operation4().engagementClubPeopleRosterPeopleFromData,
    engagementClubPersonIdentityConflict: operation0().engagementClubPersonIdentityConflict,
    throwEngagementClubPersonIdentityConflict: operation0().throwEngagementClubPersonIdentityConflict,
    engagementClubPersonOutsideClubConflict: operation0().engagementClubPersonOutsideClubConflict,
    upsertEngagementClubPeopleRosterPerson: operation5().upsertEngagementClubPeopleRosterPerson,
    deleteEngagementClubPeopleRosterPerson: operation6().deleteEngagementClubPeopleRosterPerson,
    rebuildEngagementClubPeopleRoster: operation7().rebuildEngagementClubPeopleRoster,
    syncEngagementClubPeopleRosterFromChange: operation8().syncEngagementClubPeopleRosterFromChange,
    engagementClubSwimmerItem: operation9().engagementClubSwimmerItem,
    engagementReferenceSwimmerItem: operation10().engagementReferenceSwimmerItem,
    engagementReferenceClubSwimmers: operation11().engagementReferenceClubSwimmers,
    sortEngagementClubSwimmers: operation12().sortEngagementClubSwimmers,
    engagementClubSwimmerMatchKeys: operation12().engagementClubSwimmerMatchKeys,
    engagementClubSwimmerSourceRank: operation12().engagementClubSwimmerSourceRank,
    mergeEngagementClubSwimmerItems: operation12().mergeEngagementClubSwimmerItems,
    uniqueEngagementClubSwimmers: operation12().uniqueEngagementClubSwimmers,
    rebuildEngagementClubRoster: operation11().rebuildEngagementClubRoster,
    syncEngagementClubRosterFromSwimmerChange: operation13().syncEngagementClubRosterFromSwimmerChange,
    reactivateEngagementClubRosterSwimmersFromPerformanceRows: operation14().reactivateEngagementClubRosterSwimmersFromPerformanceRows,
    cleanIsoDateTime: operation15().cleanIsoDateTime,
    cleanEngagementDeadlineAt: operation16().cleanEngagementDeadlineAt,
    isEngagementOpeningDeadlinePast: operation16().isEngagementOpeningDeadlinePast,
    isEngagementOpeningTooEarly: operation16().isEngagementOpeningTooEarly,
    cleanEngagementRegionIds: operation17().cleanEngagementRegionIds
  };
}

module.exports = { createClubPeopleService };
