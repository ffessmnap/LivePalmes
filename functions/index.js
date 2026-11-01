function $engagementPdfRenderer_buildEngagementClubRecapPdf() {
  if (!$engagementPdfRenderer_buildEngagementClubRecapPdf.instance) $engagementPdfRenderer_buildEngagementClubRecapPdf.instance = require("./backend/engagement-pdf-renderer/build-engagement-club-recap-pdf").createEngagementPdfRenderer_buildEngagementClubRecapPdf({
    ENGAGEMENT_EVENT_DEFINITION_BY_CODE: ENGAGEMENT_EVENT_DEFINITION_BY_CODE,
    ENGAGEMENT_PDF_LOGO_PATH: ENGAGEMENT_PDF_LOGO_PATH,
    PDFDocument: PDFDocument,
    QRCode: QRCode,
    ageCategoryFromDates: ageCategoryFromDates,
    cleanEngagementCompetitionLevel: cleanEngagementCompetitionLevel,
    cleanEngagementCompetitionType: cleanEngagementCompetitionType,
    cleanIsoDate: cleanIsoDate,
    cleanPublicCalendarWhatsAppUrl: cleanPublicCalendarWhatsAppUrl,
    cleanText: cleanText,
    engagementClubCode: engagementClubCode,
    fs: fs,
    normalizeCategoryCode: normalizeCategoryCode,
    normalizeCourseCode: normalizeCourseCode,
    get local$engagementPdfEntryStats() { return $engagementPdfRenderer_engagementPdfEntryStats().engagementPdfEntryStats; },
    get local$engagementPdfEventLabel() { return $engagementPdfRenderer_engagementPdfEventLabel().engagementPdfEventLabel; },
    get local$engagementPdfFeeTotal() { return $engagementPdfRenderer_engagementPdfFeeTotal().engagementPdfFeeTotal; },
    get local$engagementPdfFileName() { return $engagementPdfRenderer_engagementPdfFileName().engagementPdfFileName; }
  });
  return $engagementPdfRenderer_buildEngagementClubRecapPdf.instance;
}

function $engagementPdfRenderer_engagementPdfCollectIndividualRows() {
  if (!$engagementPdfRenderer_engagementPdfCollectIndividualRows.instance) $engagementPdfRenderer_engagementPdfCollectIndividualRows.instance = require("./backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows").createEngagementPdfRenderer_engagementPdfCollectIndividualRows({
    ageCategoryFromDates: ageCategoryFromDates,
    cleanEngagementTimingType: cleanEngagementTimingType,
    cleanText: cleanText,
    normalizeCategoryCode: normalizeCategoryCode,
    get local$engagementPdfEnsureSpace() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfEnsureSpace; },
    get local$engagementPdfEventLabel() { return $engagementPdfRenderer_engagementPdfEventLabel().engagementPdfEventLabel; },
    get local$engagementPdfSwimmerName() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfSwimmerName; }
  });
  return $engagementPdfRenderer_engagementPdfCollectIndividualRows.instance;
}

function $engagementPdfRenderer_engagementPdfFileName() {
  if (!$engagementPdfRenderer_engagementPdfFileName.instance) $engagementPdfRenderer_engagementPdfFileName.instance = require("./backend/engagement-pdf-renderer/engagement-pdf-file-name").createEngagementPdfRenderer_engagementPdfFileName({
    cleanText: cleanText
  });
  return $engagementPdfRenderer_engagementPdfFileName.instance;
}

function $engagementPdfRenderer_engagementPdfEventLabel() {
  if (!$engagementPdfRenderer_engagementPdfEventLabel.instance) $engagementPdfRenderer_engagementPdfEventLabel.instance = require("./backend/engagement-pdf-renderer/engagement-pdf-event-label").createEngagementPdfRenderer_engagementPdfEventLabel({
    ENGAGEMENT_EVENT_DEFINITION_BY_CODE: ENGAGEMENT_EVENT_DEFINITION_BY_CODE,
    normalizeCourseCode: normalizeCourseCode
  });
  return $engagementPdfRenderer_engagementPdfEventLabel.instance;
}

function $engagementPdfRenderer_engagementPdfEntryStats() {
  if (!$engagementPdfRenderer_engagementPdfEntryStats.instance) $engagementPdfRenderer_engagementPdfEntryStats.instance = require("./backend/engagement-pdf-renderer/engagement-pdf-entry-stats").createEngagementPdfRenderer_engagementPdfEntryStats({

  });
  return $engagementPdfRenderer_engagementPdfEntryStats.instance;
}

function $engagementPdfRenderer_engagementPdfFeeTotal() {
  if (!$engagementPdfRenderer_engagementPdfFeeTotal.instance) $engagementPdfRenderer_engagementPdfFeeTotal.instance = require("./backend/engagement-pdf-renderer/engagement-pdf-fee-total").createEngagementPdfRenderer_engagementPdfFeeTotal({
    get local$engagementPdfEntryStats() { return $engagementPdfRenderer_engagementPdfEntryStats().engagementPdfEntryStats; }
  });
  return $engagementPdfRenderer_engagementPdfFeeTotal.instance;
}

function $engagementPdfRenderer_buildEngagementOfficialsPdf() {
  if (!$engagementPdfRenderer_buildEngagementOfficialsPdf.instance) $engagementPdfRenderer_buildEngagementOfficialsPdf.instance = require("./backend/engagement-pdf-renderer/build-engagement-officials-pdf").createEngagementPdfRenderer_buildEngagementOfficialsPdf({
    ENGAGEMENT_PDF_LOGO_PATH: ENGAGEMENT_PDF_LOGO_PATH,
    PDFDocument: PDFDocument,
    cleanText: cleanText,
    fs: fs,
    get local$engagementPdfDocToBuffer() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfDocToBuffer; },
    get local$engagementPdfEmptyState() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfEmptyState; },
    get local$engagementPdfFileName() { return $engagementPdfRenderer_engagementPdfFileName().engagementPdfFileName; },
    get local$engagementPdfFormatDate() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfFormatDate; },
    get local$engagementPdfFormatDateTime() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfFormatDateTime; },
    get local$engagementPdfTable() { return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfTable; }
  });
  return $engagementPdfRenderer_buildEngagementOfficialsPdf.instance;
}

function $legacyPerformancePublication_publicPerformanceFile() {
  if (!$legacyPerformancePublication_publicPerformanceFile.instance) $legacyPerformancePublication_publicPerformanceFile.instance = require("./backend/legacy-performance-publication/public-performance-file").createLegacyPerformancePublication_publicPerformanceFile({
    PUBLIC_PERFORMANCE_FILES_PATH: PUBLIC_PERFORMANCE_FILES_PATH,
    publicPerformanceFilesBucket: publicPerformanceFilesBucket
  });
  return $legacyPerformancePublication_publicPerformanceFile.instance;
}

function $legacyPerformancePublication_buildPublicSearchRow() {
  if (!$legacyPerformancePublication_buildPublicSearchRow.instance) $legacyPerformancePublication_buildPublicSearchRow.instance = require("./backend/legacy-performance-publication/build-public-search-row").createLegacyPerformancePublication_buildPublicSearchRow({
    PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION: PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
    cleanText: cleanText,
    normalizePerformanceSearchText: normalizePerformanceSearchText,
    performancePublicKey: performancePublicKey,
    performanceSearchPrefixes: performanceSearchPrefixes,
    publicBetterPerformance: publicBetterPerformance,
    publicPerformanceBaseRow: publicPerformanceBaseRow,
    publicPerformanceSwimmerStorageRow: publicPerformanceSwimmerStorageRow,
    publicSwimmerKey: publicSwimmerKey,
    stableHash: stableHash,
    get local$publicPerformanceFile() { return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFile; },
    get local$publicPerformanceFilePath() { return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFilePath; },
    get local$readPublicPerformanceJson() { return $legacyPerformancePublication_publicPerformanceFile().readPublicPerformanceJson; }
  });
  return $legacyPerformancePublication_buildPublicSearchRow.instance;
}

function $legacyPerformancePublication_publicPerformanceTopFileName() {
  if (!$legacyPerformancePublication_publicPerformanceTopFileName.instance) $legacyPerformancePublication_publicPerformanceTopFileName.instance = require("./backend/legacy-performance-publication/public-performance-top-file-name").createLegacyPerformancePublication_publicPerformanceTopFileName({
    cleanText: cleanText
  });
  return $legacyPerformancePublication_publicPerformanceTopFileName.instance;
}

function $legacyPerformancePublication_publicPerformanceSwimmerFilePath() {
  if (!$legacyPerformancePublication_publicPerformanceSwimmerFilePath.instance) $legacyPerformancePublication_publicPerformanceSwimmerFilePath.instance = require("./backend/legacy-performance-publication/public-performance-swimmer-file-path").createLegacyPerformancePublication_publicPerformanceSwimmerFilePath({
    stableHash: stableHash
  });
  return $legacyPerformancePublication_publicPerformanceSwimmerFilePath.instance;
}

function $legacyPerformancePublication_mergePublicSwimmerRows() {
  if (!$legacyPerformancePublication_mergePublicSwimmerRows.instance) $legacyPerformancePublication_mergePublicSwimmerRows.instance = require("./backend/legacy-performance-publication/merge-public-swimmer-rows").createLegacyPerformancePublication_mergePublicSwimmerRows({
    PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT: PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT,
    cleanText: cleanText,
    publicPerformanceBaseRow: publicPerformanceBaseRow,
    publicSwimmerKey: publicSwimmerKey,
    get local$buildPublicSwimmerPayload() { return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSwimmerPayload; },
    get local$distinctPublicTopPreview() { return $legacyPerformancePublication_buildPublicSearchRow().distinctPublicTopPreview; },
    get local$mergePublicPerformanceManifest() { return $legacyPerformancePublication_buildPublicSearchRow().mergePublicPerformanceManifest; },
    get local$mergePublicTopRows() { return $legacyPerformancePublication_buildPublicSearchRow().mergePublicTopRows; },
    get local$publicPerformanceFilePath() { return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFilePath; },
    get local$publicPerformanceRowKey() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceRowKey; },
    get local$publicPerformanceSwimmerFilePath() { return $legacyPerformancePublication_publicPerformanceSwimmerFilePath().publicPerformanceSwimmerFilePath; },
    get local$publicPerformanceSwimmerRow() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceSwimmerRow; },
    get local$publicPerformanceTopFileName() { return $legacyPerformancePublication_publicPerformanceTopFileName().publicPerformanceTopFileName; },
    get local$publishPublicSearchIndexes() { return $legacyPerformancePublication_buildPublicSearchRow().publishPublicSearchIndexes; },
    get local$readPublicPerformanceJson() { return $legacyPerformancePublication_publicPerformanceFile().readPublicPerformanceJson; },
    get local$savePublicPerformanceJson() { return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceJson; },
    get local$savePublicPerformanceText() { return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceText; },
    get local$sortPublicPerformanceRows() { return $legacyPerformancePublication_buildPublicSearchRow().sortPublicPerformanceRows; }
  });
  return $legacyPerformancePublication_mergePublicSwimmerRows.instance;
}

function $legacyPerformancePublication_deletePublicPerformanceFile() {
  if (!$legacyPerformancePublication_deletePublicPerformanceFile.instance) $legacyPerformancePublication_deletePublicPerformanceFile.instance = require("./backend/legacy-performance-publication/delete-public-performance-file").createLegacyPerformancePublication_deletePublicPerformanceFile({
    PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT: PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT,
    cleanText: cleanText,
    hydratePublicSwimmerRowsFromPayload: hydratePublicSwimmerRowsFromPayload,
    publicPerformanceBaseRow: publicPerformanceBaseRow,
    publicSwimmerKey: publicSwimmerKey,
    publicSwimmerPayloadSupportsTopRebuild: publicSwimmerPayloadSupportsTopRebuild,
    uniquePublicPerformanceRows: uniquePublicPerformanceRows,
    get local$buildPublicSearchRow() { return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSearchRow; },
    get local$buildPublicSwimmerPayload() { return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSwimmerPayload; },
    get local$distinctPublicTopPreview() { return $legacyPerformancePublication_buildPublicSearchRow().distinctPublicTopPreview; },
    get local$mergePublicPerformanceManifest() { return $legacyPerformancePublication_buildPublicSearchRow().mergePublicPerformanceManifest; },
    get local$mergePublicTopRows() { return $legacyPerformancePublication_buildPublicSearchRow().mergePublicTopRows; },
    get local$publicPerformanceFile() { return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFile; },
    get local$publicPerformanceFilePath() { return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFilePath; },
    get local$publicPerformanceIdShard() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceIdShard; },
    get local$publicPerformanceRowKey() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceRowKey; },
    get local$publicPerformanceSearchShard() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceSearchShard; },
    get local$publicPerformanceSwimmerFilePath() { return $legacyPerformancePublication_publicPerformanceSwimmerFilePath().publicPerformanceSwimmerFilePath; },
    get local$publicPerformanceTopCandidateKey() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceTopCandidateKey; },
    get local$publicPerformanceTopFileName() { return $legacyPerformancePublication_publicPerformanceTopFileName().publicPerformanceTopFileName; },
    get local$publishPublicSearchIndexes() { return $legacyPerformancePublication_buildPublicSearchRow().publishPublicSearchIndexes; },
    get local$readPublicPerformanceJson() { return $legacyPerformancePublication_publicPerformanceFile().readPublicPerformanceJson; },
    get local$savePublicPerformanceJson() { return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceJson; },
    get local$savePublicPerformanceText() { return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceText; }
  });
  return $legacyPerformancePublication_deletePublicPerformanceFile.instance;
}

function $legacyPerformancePublication_assertPublicSwimmerIdentityReplaced() {
  if (!$legacyPerformancePublication_assertPublicSwimmerIdentityReplaced.instance) $legacyPerformancePublication_assertPublicSwimmerIdentityReplaced.instance = require("./backend/legacy-performance-publication/assert-public-swimmer-identity-replaced").createLegacyPerformancePublication_assertPublicSwimmerIdentityReplaced({
    cleanText: cleanText,
    get local$buildPublicSearchRow() { return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSearchRow; },
    get local$deletePublicPerformanceFile() { return $legacyPerformancePublication_deletePublicPerformanceFile().deletePublicPerformanceFile; },
    get local$publicPerformanceIdShard() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceIdShard; },
    get local$publicPerformanceSearchShard() { return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceSearchShard; },
    get local$publicPerformanceSwimmerFilePath() { return $legacyPerformancePublication_publicPerformanceSwimmerFilePath().publicPerformanceSwimmerFilePath; },
    get local$readPublicPerformanceJson() { return $legacyPerformancePublication_publicPerformanceFile().readPublicPerformanceJson; },
    get local$rebuildPublicPerformanceFilesForAffectedRows() { return $legacyPerformancePublication_deletePublicPerformanceFile().rebuildPublicPerformanceFilesForAffectedRows; },
    get local$removePublicSearchIndexes() { return $legacyPerformancePublication_deletePublicPerformanceFile().removePublicSearchIndexes; }
  });
  return $legacyPerformancePublication_assertPublicSwimmerIdentityReplaced.instance;
}

function $portalPerformanceHandlers_storeCompetitionPdf() {
  if (!$portalPerformanceHandlers_storeCompetitionPdf.instance) $portalPerformanceHandlers_storeCompetitionPdf.instance = require("./backend/portal-performance-handlers/store-competition-pdf").createPerformanceHandlers_storeCompetitionPdf({
    get HttpsError() { return HttpsError; },
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get assertComputerPdfAccess() { return assertComputerPdfAccess; },
    get cleanText() { return cleanText; },
    get competitionIdFrom() { return competitionIdFrom; },
    get decodePdfDataUrl() { return decodePdfDataUrl; },
    get publicPdfStoragePath() { return publicPdfStoragePath; },
    get publicStorageUrl() { return publicStorageUrl; },
    get storage() { return storage; }
  });
  return $portalPerformanceHandlers_storeCompetitionPdf.instance;
}

function $portalPerformanceHandlers_deleteCompetitionPdf() {
  if (!$portalPerformanceHandlers_deleteCompetitionPdf.instance) $portalPerformanceHandlers_deleteCompetitionPdf.instance = require("./backend/portal-performance-handlers/delete-competition-pdf").createPerformanceHandlers_deleteCompetitionPdf({
    get HttpsError() { return HttpsError; },
    get PUBLIC_COMPETITION_PDF_PREFIX() { return PUBLIC_COMPETITION_PDF_PREFIX; },
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get assertComputerPdfAccess() { return assertComputerPdfAccess; },
    get cleanText() { return cleanText; },
    get competitionIdFrom() { return competitionIdFrom; },
    get storage() { return storage; }
  });
  return $portalPerformanceHandlers_deleteCompetitionPdf.instance;
}

function $portalPerformanceHandlers_updateEngagementNationalSwimmerIdentity() {
  if (!$portalPerformanceHandlers_updateEngagementNationalSwimmerIdentity.instance) $portalPerformanceHandlers_updateEngagementNationalSwimmerIdentity.instance = require("./backend/portal-performance-handlers/update-engagement-national-swimmer-identity").createPerformanceHandlers_updateEngagementNationalSwimmerIdentity({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get applyEngagementSwimmerIdentityCorrection() { return applyEngagementSwimmerIdentityCorrection; },
    get cleanEngagementSwimmerIdentityCorrection() { return cleanEngagementSwimmerIdentityCorrection; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementSwimmerIdentitySnapshot() { return engagementSwimmerIdentitySnapshot; },
    get getEngagementSwimmerCorrectionTarget() { return getEngagementSwimmerCorrectionTarget; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalPerformanceHandlers_updateEngagementNationalSwimmerIdentity.instance;
}

function $portalPerformanceHandlers_mergeEngagementNationalClubSwimmer() {
  if (!$portalPerformanceHandlers_mergeEngagementNationalClubSwimmer.instance) $portalPerformanceHandlers_mergeEngagementNationalClubSwimmer.instance = require("./backend/portal-performance-handlers/merge-engagement-national-club-swimmer").createPerformanceHandlers_mergeEngagementNationalClubSwimmer({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get activePerformanceRowsForNationalSwimmer() { return activePerformanceRowsForNationalSwimmer; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deleteEngagementEntryTimeCache() { return deleteEngagementEntryTimeCache; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementNationalSwimmerEntrySnapshot() { return engagementNationalSwimmerEntrySnapshot; },
    get engagementNationalSwimmerFullName() { return engagementNationalSwimmerFullName; },
    get engagementNationalSwimmerItemFromDoc() { return engagementNationalSwimmerItemFromDoc; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get getEngagementNationalSwimmerForMerge() { return getEngagementNationalSwimmerForMerge; },
    get mergeEngagementClubEntryRelays() { return mergeEngagementClubEntryRelays; },
    get mergeEngagementClubEntrySwimmers() { return mergeEngagementClubEntrySwimmers; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get performanceMergeTargetPayloadFromSwimmer() { return performanceMergeTargetPayloadFromSwimmer; },
    get performancePublicKey() { return performancePublicKey; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publishEngagementNationalSwimmerMerge() { return publishEngagementNationalSwimmerMerge; },
    get readPerformanceDocsForNationalSwimmerMerge() { return readPerformanceDocsForNationalSwimmerMerge; },
    get stableHash() { return stableHash; },
    get swimmerMergeIds() { return swimmerMergeIds; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get writePerformanceSwimmerIndexRows() { return writePerformanceSwimmerIndexRows; },
    get writePerformanceSwimmerPageRows() { return writePerformanceSwimmerPageRows; }
  });
  return $portalPerformanceHandlers_mergeEngagementNationalClubSwimmer.instance;
}

function $portalPerformanceHandlers_previewCompetitionImport() {
  if (!$portalPerformanceHandlers_previewCompetitionImport.instance) $portalPerformanceHandlers_previewCompetitionImport.instance = require("./backend/portal-performance-handlers/preview-competition-import").createPerformanceHandlers_previewCompetitionImport({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get activeCompetitionImportData() { return activeCompetitionImportData; },
    get assertCapability() { return assertCapability; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get canResumeImportPublication() { return canResumeImportPublication; },
    get competitionImportExistingSummary() { return competitionImportExistingSummary; },
    get competitionImportPreviewPerformance() { return competitionImportPreviewPerformance; },
    get db() { return db; },
    get detectRecordAlerts() { return detectRecordAlerts; },
    get findExistingCompetitionImport() { return findExistingCompetitionImport; },
    get importDocumentId() { return importDocumentId; },
    get importPublicationStatus() { return importPublicationStatus; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get parseCompetitionImportPayload() { return parseCompetitionImportPayload; },
    get stableHash() { return stableHash; }
  });
  return $portalPerformanceHandlers_previewCompetitionImport.instance;
}

function $portalPerformanceHandlers_createCompetitionImport() {
  if (!$portalPerformanceHandlers_createCompetitionImport.instance) $portalPerformanceHandlers_createCompetitionImport.instance = require("./backend/portal-performance-handlers/create-competition-import").createPerformanceHandlers_createCompetitionImport({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get assertCapability() { return assertCapability; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get cleanText() { return cleanText; },
    get cleanTimingType() { return require("./performance-import-timing").cleanTimingType; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get competitionImportPerformanceId() { return competitionImportPerformanceId; },
    get db() { return db; },
    get detectRecordAlerts() { return detectRecordAlerts; },
    get importDocumentId() { return importDocumentId; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get normalizeLivePalmesImportPerformances() { return normalizeLivePalmesImportPerformances; },
    get parseCompetitionImportPayload() { return parseCompetitionImportPayload; },
    get publishCompetitionImportOutputs() { return publishCompetitionImportOutputs; },
    get reactivateEngagementClubRosterSwimmersFromPerformanceRows() { return reactivateEngagementClubRosterSwimmersFromPerformanceRows; },
    get stableHash() { return stableHash; },
    get stageCompetitionImportReplacement() { return stageCompetitionImportReplacement; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; }
  });
  return $portalPerformanceHandlers_createCompetitionImport.instance;
}

function $portalPerformanceHandlers_listCompetitionImports() {
  if (!$portalPerformanceHandlers_listCompetitionImports.instance) $portalPerformanceHandlers_listCompetitionImports.instance = require("./backend/portal-performance-handlers/list-competition-imports").createPerformanceHandlers_listCompetitionImports({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get assertCapability() { return assertCapability; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get canResumeImportPublication() { return canResumeImportPublication; },
    get db() { return db; },
    get importPublicationStatus() { return importPublicationStatus; },
    get isAlreadyPublishedRecordAlert() { return isAlreadyPublishedRecordAlert; },
    get nativePerformanceFailure() { return nativePerformanceFailure; }
  });
  return $portalPerformanceHandlers_listCompetitionImports.instance;
}

function $portalPerformanceHandlers_getDtnSeasons() {
  if (!$portalPerformanceHandlers_getDtnSeasons.instance) $portalPerformanceHandlers_getDtnSeasons.instance = require("./backend/portal-performance-handlers/get-dtn-seasons").createPerformanceHandlers_getDtnSeasons({
    get invokeDtnSeason() { return invokeDtnSeason; }
  });
  return $portalPerformanceHandlers_getDtnSeasons.instance;
}

function $portalPerformanceHandlers_updateDtnSeason() {
  if (!$portalPerformanceHandlers_updateDtnSeason.instance) $portalPerformanceHandlers_updateDtnSeason.instance = require("./backend/portal-performance-handlers/update-dtn-season").createPerformanceHandlers_updateDtnSeason({
    get invokeDtnSeason() { return invokeDtnSeason; }
  });
  return $portalPerformanceHandlers_updateDtnSeason.instance;
}

function $portalPerformanceHandlers_getDtnSeasonOverview() {
  if (!$portalPerformanceHandlers_getDtnSeasonOverview.instance) $portalPerformanceHandlers_getDtnSeasonOverview.instance = require("./backend/portal-performance-handlers/get-dtn-season-overview").createPerformanceHandlers_getDtnSeasonOverview({
    get invokeDtnSeason() { return invokeDtnSeason; }
  });
  return $portalPerformanceHandlers_getDtnSeasonOverview.instance;
}

function $portalPerformanceHandlers_listDtnSeasonSources() {
  if (!$portalPerformanceHandlers_listDtnSeasonSources.instance) $portalPerformanceHandlers_listDtnSeasonSources.instance = require("./backend/portal-performance-handlers/list-dtn-season-sources").createPerformanceHandlers_listDtnSeasonSources({
    get invokeDtnSeason() { return invokeDtnSeason; }
  });
  return $portalPerformanceHandlers_listDtnSeasonSources.instance;
}

function $portalPerformanceHandlers_getNapPerformanceAdministration() {
  if (!$portalPerformanceHandlers_getNapPerformanceAdministration.instance) $portalPerformanceHandlers_getNapPerformanceAdministration.instance = require("./backend/portal-performance-handlers/get-nap-performance-administration").createPerformanceHandlers_getNapPerformanceAdministration({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get readNapRecordsAdministration() { return readNapRecordsAdministration; }
  });
  return $portalPerformanceHandlers_getNapPerformanceAdministration.instance;
}

function $portalPerformanceHandlers_savePerformanceCorrection() {
  if (!$portalPerformanceHandlers_savePerformanceCorrection.instance) $portalPerformanceHandlers_savePerformanceCorrection.instance = require("./backend/portal-performance-handlers/save-performance-correction").createPerformanceHandlers_savePerformanceCorrection({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get accessUserDisplayName() { return accessUserDisplayName; },
    get assertCapability() { return assertCapability; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get enqueuePerformancePublicationJob() { return enqueuePerformancePublicationJob; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get publishNativeRecords() { return publishNativeRecords; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalPerformanceHandlers_savePerformanceCorrection.instance;
}

function $portalAccessHandlers_setRolePins() {
  if (!$portalAccessHandlers_setRolePins.instance) $portalAccessHandlers_setRolePins.instance = require("./backend/portal-access-handlers/set-role-pins").createAccessHandlers_setRolePins({
    get HttpsError() { return HttpsError; },
    get ROLES() { return ROLES; },
    get assertCapability() { return assertCapability; },
    get assertPin() { return assertPin; },
    get cleanText() { return cleanText; },
    get competitionIdFrom() { return competitionIdFrom; },
    get crypto() { return crypto; },
    get db() { return db; },
    get pinHash() { return pinHash; },
    get rolePinsRef() { return rolePinsRef; },
    get updatePublicPinNotes() { return updatePublicPinNotes; }
  });
  return $portalAccessHandlers_setRolePins.instance;
}

function $portalAccessHandlers_verifyPin() {
  if (!$portalAccessHandlers_verifyPin.instance) $portalAccessHandlers_verifyPin.instance = require("./backend/portal-access-handlers/verify-pin").createAccessHandlers_verifyPin({
    get HttpsError() { return HttpsError; },
    get Timestamp() { return Timestamp; },
    get assertConsolePortalAccess() { return assertConsolePortalAccess; },
    get assertPin() { return assertPin; },
    get assertPinAttemptAllowed() { return assertPinAttemptAllowed; },
    get assertRole() { return assertRole; },
    get auth() { return auth; },
    get cleanText() { return cleanText; },
    get clearPinAttempts() { return clearPinAttempts; },
    get competitionIdFrom() { return competitionIdFrom; },
    get consoleGrantRef() { return consoleGrantRef; },
    get consoleRoleClaims() { return consoleRoleClaims; },
    get pinAttemptRef() { return pinAttemptRef; },
    get pinHash() { return pinHash; },
    get recordFailedPinAttempt() { return recordFailedPinAttempt; },
    get rolePinsRef() { return rolePinsRef; },
    get safeCompareHex() { return safeCompareHex; },
    get stableHash() { return stableHash; }
  });
  return $portalAccessHandlers_verifyPin.instance;
}

function $portalAccessHandlers_rebuildAccessDirectoryIndexNextPage() {
  if (!$portalAccessHandlers_rebuildAccessDirectoryIndexNextPage.instance) $portalAccessHandlers_rebuildAccessDirectoryIndexNextPage.instance = require("./backend/portal-access-handlers/rebuild-access-directory-index-next-page").createAccessHandlers_rebuildAccessDirectoryIndexNextPage({
    get ACCESS_DIRECTORY_INDEX_VERSION() { return ACCESS_DIRECTORY_INDEX_VERSION; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get accessDirectoryIndexStateRef() { return accessDirectoryIndexStateRef; },
    get accessDirectoryKeys() { return accessDirectoryKeys; },
    get accessManagementContext() { return accessManagementContext; },
    get cleanText() { return cleanText; },
    get db() { return db; }
  });
  return $portalAccessHandlers_rebuildAccessDirectoryIndexNextPage.instance;
}

function $portalAccessHandlers_rebuildAccessDirectorySnapshotNextPage() {
  if (!$portalAccessHandlers_rebuildAccessDirectorySnapshotNextPage.instance) $portalAccessHandlers_rebuildAccessDirectorySnapshotNextPage.instance = require("./backend/portal-access-handlers/rebuild-access-directory-snapshot-next-page").createAccessHandlers_rebuildAccessDirectorySnapshotNextPage({
    get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
    get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get accessDirectorySnapshotEntry() { return accessDirectorySnapshotEntry; },
    get accessDirectorySnapshotEntryKey() { return accessDirectorySnapshotEntryKey; },
    get accessDirectorySnapshotRegionId() { return accessDirectorySnapshotRegionId; },
    get accessDirectorySnapshotStateRef() { return accessDirectorySnapshotStateRef; },
    get accessManagementContext() { return accessManagementContext; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get mergeAccessDirectorySnapshotEntries() { return mergeAccessDirectorySnapshotEntries; }
  });
  return $portalAccessHandlers_rebuildAccessDirectorySnapshotNextPage.instance;
}

function $portalAccessHandlers_listAccessUsers() {
  if (!$portalAccessHandlers_listAccessUsers.instance) $portalAccessHandlers_listAccessUsers.instance = require("./backend/portal-access-handlers/list-access-users").createAccessHandlers_listAccessUsers({
    get ACCESS_CAPABILITY_SET() { return ACCESS_CAPABILITY_SET; },
    get ACCESS_DIRECTORY_INDEX_VERSION() { return ACCESS_DIRECTORY_INDEX_VERSION; },
    get FieldPath() { return FieldPath; },
    get accessDirectoryFilterKey() { return accessDirectoryFilterKey; },
    get accessDirectoryIndexStateRef() { return accessDirectoryIndexStateRef; },
    get accessManagementContext() { return accessManagementContext; },
    get accessUserListItem() { return accessUserListItem; },
    get accessUserMatchesFilters() { return accessUserMatchesFilters; },
    get accessUserVisibleForAccessDirectory() { return accessUserVisibleForAccessDirectory; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get searchAccessUserDocuments() { return searchAccessUserDocuments; }
  });
  return $portalAccessHandlers_listAccessUsers.instance;
}

function $portalAccessHandlers_setAccessUserStatus() {
  if (!$portalAccessHandlers_setAccessUserStatus.instance) $portalAccessHandlers_setAccessUserStatus.instance = require("./backend/portal-access-handlers/set-access-user-status").createAccessHandlers_setAccessUserStatus({
    get HttpsError() { return HttpsError; },
    get accessDirectoryKeys() { return accessDirectoryKeys; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get assertAdmin() { return assertAdmin; },
    get auth() { return auth; },
    get capabilitiesMap() { return capabilitiesMap; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; },
    get writeAccessGrants() { return writeAccessGrants; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalAccessHandlers_setAccessUserStatus.instance;
}

function $portalAccessHandlers_deleteAccessUser() {
  if (!$portalAccessHandlers_deleteAccessUser.instance) $portalAccessHandlers_deleteAccessUser.instance = require("./backend/portal-access-handlers/delete-access-user").createAccessHandlers_deleteAccessUser({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get deleteAccessUserAccount() { return deleteAccessUserAccount; }
  });
  return $portalAccessHandlers_deleteAccessUser.instance;
}

function $portalAccessHandlers_requestAccessUserDeletion() {
  if (!$portalAccessHandlers_requestAccessUserDeletion.instance) $portalAccessHandlers_requestAccessUserDeletion.instance = require("./backend/portal-access-handlers/request-access-user-deletion").createAccessHandlers_requestAccessUserDeletion({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get accessUserDeletionRequestItem() { return accessUserDeletionRequestItem; },
    get accessUserRegionIdFromData() { return accessUserRegionIdFromData; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get assertRegionalAccessUserDeletionRequestAllowed() { return assertRegionalAccessUserDeletionRequestAllowed; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalAccessHandlers_requestAccessUserDeletion.instance;
}

function $portalAccessHandlers_listAccessUserDeletionRequests() {
  if (!$portalAccessHandlers_listAccessUserDeletionRequests.instance) $portalAccessHandlers_listAccessUserDeletionRequests.instance = require("./backend/portal-access-handlers/list-access-user-deletion-requests").createAccessHandlers_listAccessUserDeletionRequests({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get accessUserDeletionRequestItem() { return accessUserDeletionRequestItem; },
    get db() { return db; }
  });
  return $portalAccessHandlers_listAccessUserDeletionRequests.instance;
}

function $portalAccessHandlers_resolveAccessUserDeletionRequest() {
  if (!$portalAccessHandlers_resolveAccessUserDeletionRequest.instance) $portalAccessHandlers_resolveAccessUserDeletionRequest.instance = require("./backend/portal-access-handlers/resolve-access-user-deletion-request").createAccessHandlers_resolveAccessUserDeletionRequest({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteAccessUserAccount() { return deleteAccessUserAccount; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalAccessHandlers_resolveAccessUserDeletionRequest.instance;
}

function $portalAccessHandlers_updateCurrentAccountEmail() {
  if (!$portalAccessHandlers_updateCurrentAccountEmail.instance) $portalAccessHandlers_updateCurrentAccountEmail.instance = require("./backend/portal-access-handlers/update-current-account-email").createAccessHandlers_updateCurrentAccountEmail({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get assertEmail() { return assertEmail; },
    get assertLivePalmesAccess() { return assertLivePalmesAccess; },
    get auth() { return auth; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizedAccessScope() { return normalizedAccessScope; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalAccessHandlers_updateCurrentAccountEmail.instance;
}

function $portalAccessHandlers_getCurrentAccessUser() {
  if (!$portalAccessHandlers_getCurrentAccessUser.instance) $portalAccessHandlers_getCurrentAccessUser.instance = require("./backend/portal-access-handlers/get-current-access-user").createAccessHandlers_getCurrentAccessUser({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get HttpsError() { return HttpsError; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get cleanText() { return cleanText; },
    get competitionEmailNotificationsEnabled() { return competitionEmailNotificationsEnabled; },
    get db() { return db; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalAccessHandlers_getCurrentAccessUser.instance;
}

function $portalCompetitionHandlers_listEngagementAccessRequests() {
  if (!$portalCompetitionHandlers_listEngagementAccessRequests.instance) $portalCompetitionHandlers_listEngagementAccessRequests.instance = require("./backend/portal-competition-handlers/list-engagement-access-requests").createCompetitionHandlers_listEngagementAccessRequests({
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementAccessRequestItem() { return engagementAccessRequestItem; }
  });
  return $portalCompetitionHandlers_listEngagementAccessRequests.instance;
}

function $portalCompetitionHandlers_listEngagementQualificationSources() {
  if (!$portalCompetitionHandlers_listEngagementQualificationSources.instance) $portalCompetitionHandlers_listEngagementQualificationSources.instance = require("./backend/portal-competition-handlers/list-engagement-qualification-sources").createCompetitionHandlers_listEngagementQualificationSources({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementAccessContext() { return engagementAccessContext; },
    get qualificationService() { return qualificationService; }
  });
  return $portalCompetitionHandlers_listEngagementQualificationSources.instance;
}

function $portalCompetitionHandlers_processEngagementQualificationJob() {
  if (!$portalCompetitionHandlers_processEngagementQualificationJob.instance) $portalCompetitionHandlers_processEngagementQualificationJob.instance = require("./backend/portal-competition-handlers/process-engagement-qualification-job").createCompetitionHandlers_processEngagementQualificationJob({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementAccessContext() { return engagementAccessContext; },
    get nativeQualificationError() { return nativeQualificationError; },
    get nativeQualificationNow() { return nativeQualificationNow; },
    get nativeQualificationServices() { return nativeQualificationServices; },
    get qualificationService() { return qualificationService; }
  });
  return $portalCompetitionHandlers_processEngagementQualificationJob.instance;
}

function $portalCompetitionHandlers_grantEngagementQualificationException() {
  if (!$portalCompetitionHandlers_grantEngagementQualificationException.instance) $portalCompetitionHandlers_grantEngagementQualificationException.instance = require("./backend/portal-competition-handlers/grant-engagement-qualification-exception").createCompetitionHandlers_grantEngagementQualificationException({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get nativeQualificationError() { return nativeQualificationError; },
    get nativeQualificationNow() { return nativeQualificationNow; },
    get nativeQualificationServices() { return nativeQualificationServices; },
    get qualificationService() { return qualificationService; }
  });
  return $portalCompetitionHandlers_grantEngagementQualificationException.instance;
}

function $portalCompetitionHandlers_acknowledgeEngagementQualificationAlert() {
  if (!$portalCompetitionHandlers_acknowledgeEngagementQualificationAlert.instance) $portalCompetitionHandlers_acknowledgeEngagementQualificationAlert.instance = require("./backend/portal-competition-handlers/acknowledge-engagement-qualification-alert").createCompetitionHandlers_acknowledgeEngagementQualificationAlert({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get nativeQualificationError() { return nativeQualificationError; },
    get nativeQualificationNow() { return nativeQualificationNow; },
    get qualificationService() { return qualificationService; }
  });
  return $portalCompetitionHandlers_acknowledgeEngagementQualificationAlert.instance;
}

function $portalCompetitionHandlers_getEngagementAutomaticMailControl() {
  if (!$portalCompetitionHandlers_getEngagementAutomaticMailControl.instance) $portalCompetitionHandlers_getEngagementAutomaticMailControl.instance = require("./backend/portal-competition-handlers/get-engagement-automatic-mail-control").createCompetitionHandlers_getEngagementAutomaticMailControl({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; }
  });
  return $portalCompetitionHandlers_getEngagementAutomaticMailControl.instance;
}

function $portalCompetitionHandlers_updateEngagementAutomaticMailControl() {
  if (!$portalCompetitionHandlers_updateEngagementAutomaticMailControl.instance) $portalCompetitionHandlers_updateEngagementAutomaticMailControl.instance = require("./backend/portal-competition-handlers/update-engagement-automatic-mail-control").createCompetitionHandlers_updateEngagementAutomaticMailControl({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_updateEngagementAutomaticMailControl.instance;
}

function $portalCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage() {
  if (!$portalCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage.instance) $portalCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage.instance = require("./backend/portal-competition-handlers/rebuild-engagement-mail-recipient-index-next-page").createCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage({
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get assertCapability() { return assertCapability; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientShardGroups() { return engagementMailRecipientShardGroups; },
    get engagementMailRecipientShardRef() { return engagementMailRecipientShardRef; },
    get engagementMailRecipientShardRefs() { return engagementMailRecipientShardRefs; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get writeEngagementClubAdminDirectory() { return writeEngagementClubAdminDirectory; }
  });
  return $portalCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage.instance;
}

function $portalCompetitionHandlers_listEngagementCompetitions() {
  if (!$portalCompetitionHandlers_listEngagementCompetitions.instance) $portalCompetitionHandlers_listEngagementCompetitions.instance = require("./backend/portal-competition-handlers/list-engagement-competitions").createCompetitionHandlers_listEngagementCompetitions({
    get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; },
    get ENGAGEMENT_COMPETITION_LEVELS() { return ENGAGEMENT_COMPETITION_LEVELS; },
    get ENGAGEMENT_ENTRY_STATUSES() { return ENGAGEMENT_ENTRY_STATUSES; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubCompetitionIndexRef() { return engagementClubCompetitionIndexRef; },
    get engagementClubEntryCompetitionIds() { return engagementClubEntryCompetitionIds; },
    get engagementCompetitionCalendarItemsFromData() { return engagementCompetitionCalendarItemsFromData; },
    get engagementCompetitionCalendarRef() { return engagementCompetitionCalendarRef; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get engagementSeasonEndYearFromIsoDate() { return engagementSeasonEndYearFromIsoDate; },
    get filterEngagementCompetitionCalendarItems() { return filterEngagementCompetitionCalendarItems; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get nativePortalCalendarItems() { return nativePortalCalendarItems; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalCompetitionHandlers_listEngagementCompetitions.instance;
}

function $portalCompetitionHandlers_listEngagementCalendarEvents() {
  if (!$portalCompetitionHandlers_listEngagementCalendarEvents.instance) $portalCompetitionHandlers_listEngagementCalendarEvents.instance = require("./backend/portal-competition-handlers/list-engagement-calendar-events").createCompetitionHandlers_listEngagementCalendarEvents({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCalendarEventCalendarRef() { return engagementCalendarEventCalendarRef; },
    get engagementCalendarEventItemsFromData() { return engagementCalendarEventItemsFromData; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get engagementSeasonEndYearFromIsoDate() { return engagementSeasonEndYearFromIsoDate; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get nativePortalCalendarItems() { return nativePortalCalendarItems; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalCompetitionHandlers_listEngagementCalendarEvents.instance;
}

function $portalCompetitionHandlers_getEngagementCalendarEvent() {
  if (!$portalCompetitionHandlers_getEngagementCalendarEvent.instance) $portalCompetitionHandlers_getEngagementCalendarEvent.instance = require("./backend/portal-competition-handlers/get-engagement-calendar-event").createCompetitionHandlers_getEngagementCalendarEvent({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCalendarEventDetailItem() { return engagementCalendarEventDetailItem; },
    get engagementDeletionRequestId() { return engagementDeletionRequestId; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get nativePortalCompetition() { return nativePortalCompetition; }
  });
  return $portalCompetitionHandlers_getEngagementCalendarEvent.instance;
}

function $portalCompetitionHandlers_createEngagementCalendarEvent() {
  if (!$portalCompetitionHandlers_createEngagementCalendarEvent.instance) $portalCompetitionHandlers_createEngagementCalendarEvent.instance = require("./backend/portal-competition-handlers/create-engagement-calendar-event").createCompetitionHandlers_createEngagementCalendarEvent({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementCalendarEventPayload() { return cleanEngagementCalendarEventPayload; },
    get createNativePortalCalendarRecord() { return createNativePortalCalendarRecord; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCalendarEventDetailItem() { return engagementCalendarEventDetailItem; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_createEngagementCalendarEvent.instance;
}

function $portalCompetitionHandlers_updateEngagementCalendarEvent() {
  if (!$portalCompetitionHandlers_updateEngagementCalendarEvent.instance) $portalCompetitionHandlers_updateEngagementCalendarEvent.instance = require("./backend/portal-competition-handlers/update-engagement-calendar-event").createCompetitionHandlers_updateEngagementCalendarEvent({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get cleanEngagementCalendarEventPayload() { return cleanEngagementCalendarEventPayload; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCalendarEventDetailItem() { return engagementCalendarEventDetailItem; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalCompetitionHandlers_updateEngagementCalendarEvent.instance;
}

function $portalCompetitionHandlers_deleteEngagementCalendarEvent() {
  if (!$portalCompetitionHandlers_deleteEngagementCalendarEvent.instance) $portalCompetitionHandlers_deleteEngagementCalendarEvent.instance = require("./backend/portal-competition-handlers/delete-engagement-calendar-event").createCompetitionHandlers_deleteEngagementCalendarEvent({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get assertEngagementCompetitionDocumentPath() { return assertEngagementCompetitionDocumentPath; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get hasManagedEngagementCompetitionDocumentStorage() { return hasManagedEngagementCompetitionDocumentStorage; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalCompetitionHandlers_deleteEngagementCalendarEvent.instance;
}

function $portalCompetitionHandlers_listEngagementOpenWaterCourses() {
  if (!$portalCompetitionHandlers_listEngagementOpenWaterCourses.instance) $portalCompetitionHandlers_listEngagementOpenWaterCourses.instance = require("./backend/portal-competition-handlers/list-engagement-open-water-courses").createCompetitionHandlers_listEngagementOpenWaterCourses({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get cleanEngagementOpenWaterCourses() { return cleanEngagementOpenWaterCourses; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementOpenWaterCourseConfigRef() { return engagementOpenWaterCourseConfigRef; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalCompetitionHandlers_listEngagementOpenWaterCourses.instance;
}

function $portalCompetitionHandlers_addEngagementOpenWaterCourse() {
  if (!$portalCompetitionHandlers_addEngagementOpenWaterCourse.instance) $portalCompetitionHandlers_addEngagementOpenWaterCourse.instance = require("./backend/portal-competition-handlers/add-engagement-open-water-course").createCompetitionHandlers_addEngagementOpenWaterCourse({
    get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementOpenWaterCourse() { return cleanEngagementOpenWaterCourse; },
    get cleanEngagementOpenWaterCourses() { return cleanEngagementOpenWaterCourses; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementOpenWaterCourseConfigRef() { return engagementOpenWaterCourseConfigRef; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_addEngagementOpenWaterCourse.instance;
}

function $portalCompetitionHandlers_setEngagementOpenWaterCourseStatus() {
  if (!$portalCompetitionHandlers_setEngagementOpenWaterCourseStatus.instance) $portalCompetitionHandlers_setEngagementOpenWaterCourseStatus.instance = require("./backend/portal-competition-handlers/set-engagement-open-water-course-status").createCompetitionHandlers_setEngagementOpenWaterCourseStatus({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementOpenWaterCourses() { return cleanEngagementOpenWaterCourses; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementOpenWaterCourseConfigRef() { return engagementOpenWaterCourseConfigRef; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_setEngagementOpenWaterCourseStatus.instance;
}

function $portalCompetitionHandlers_getEngagementCompetition() {
  if (!$portalCompetitionHandlers_getEngagementCompetition.instance) $portalCompetitionHandlers_getEngagementCompetition.instance = require("./backend/portal-competition-handlers/get-engagement-competition").createCompetitionHandlers_getEngagementCompetition({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get nativePortalCompetition() { return nativePortalCompetition; }
  });
  return $portalCompetitionHandlers_getEngagementCompetition.instance;
}

function $portalCompetitionHandlers_uploadEngagementCompetitionDocument() {
  if (!$portalCompetitionHandlers_uploadEngagementCompetitionDocument.instance) $portalCompetitionHandlers_uploadEngagementCompetitionDocument.instance = require("./backend/portal-competition-handlers/upload-engagement-competition-document").createCompetitionHandlers_uploadEngagementCompetitionDocument({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get MAX_COMPETITION_DOCUMENTS() { return MAX_COMPETITION_DOCUMENTS; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertEngagementCompetitionDocumentPath() { return assertEngagementCompetitionDocumentPath; },
    get cleanCompetitionDocumentInput() { return cleanCompetitionDocumentInput; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanText() { return cleanText; },
    get competitionDocumentDownloadUrl() { return competitionDocumentDownloadUrl; },
    get competitionDocumentStoragePath() { return competitionDocumentStoragePath; },
    get competitionDocumentTokenFromUrl() { return competitionDocumentTokenFromUrl; },
    get crypto() { return crypto; },
    get db() { return db; },
    get decodeCompetitionDocumentDataUrl() { return decodeCompetitionDocumentDataUrl; },
    get engagementCompetitionDocumentContext() { return engagementCompetitionDocumentContext; },
    get engagementCompetitionDocumentUploader() { return engagementCompetitionDocumentUploader; },
    get hasManagedEngagementCompetitionDocumentStorage() { return hasManagedEngagementCompetitionDocumentStorage; },
    get mutateNativeCompetitionDocument() { return mutateNativeCompetitionDocument; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_uploadEngagementCompetitionDocument.instance;
}

function $portalCompetitionHandlers_updateEngagementCompetitionDocument() {
  if (!$portalCompetitionHandlers_updateEngagementCompetitionDocument.instance) $portalCompetitionHandlers_updateEngagementCompetitionDocument.instance = require("./backend/portal-competition-handlers/update-engagement-competition-document").createCompetitionHandlers_updateEngagementCompetitionDocument({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get cleanCompetitionDocumentInput() { return cleanCompetitionDocumentInput; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementCompetitionDocumentContext() { return engagementCompetitionDocumentContext; },
    get mutateNativeCompetitionDocument() { return mutateNativeCompetitionDocument; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_updateEngagementCompetitionDocument.instance;
}

function $portalCompetitionHandlers_deleteEngagementCompetitionDocument() {
  if (!$portalCompetitionHandlers_deleteEngagementCompetitionDocument.instance) $portalCompetitionHandlers_deleteEngagementCompetitionDocument.instance = require("./backend/portal-competition-handlers/delete-engagement-competition-document").createCompetitionHandlers_deleteEngagementCompetitionDocument({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get assertCanDeleteEngagementDocument() { return assertCanDeleteEngagementDocument; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertEngagementCompetitionDocumentPath() { return assertEngagementCompetitionDocumentPath; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementCompetitionDocumentContext() { return engagementCompetitionDocumentContext; },
    get hasManagedEngagementCompetitionDocumentStorage() { return hasManagedEngagementCompetitionDocumentStorage; },
    get mutateNativeCompetitionDocument() { return mutateNativeCompetitionDocument; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_deleteEngagementCompetitionDocument.instance;
}

function $portalCompetitionHandlers_previewEngagementCompetitionDocumentNotification() {
  if (!$portalCompetitionHandlers_previewEngagementCompetitionDocumentNotification.instance) $portalCompetitionHandlers_previewEngagementCompetitionDocumentNotification.instance = require("./backend/portal-competition-handlers/preview-engagement-competition-document-notification").createCompetitionHandlers_previewEngagementCompetitionDocumentNotification({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementActiveClubMailRecipients() { return engagementActiveClubMailRecipients; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionDocumentContext() { return engagementCompetitionDocumentContext; },
    get engagementCompetitionDocumentRecipients() { return engagementCompetitionDocumentRecipients; },
    get nativeNotificationPreview() { return nativeNotificationPreview; }
  });
  return $portalCompetitionHandlers_previewEngagementCompetitionDocumentNotification.instance;
}

function $portalCompetitionHandlers_getEngagementCompetitionStatistics() {
  if (!$portalCompetitionHandlers_getEngagementCompetitionStatistics.instance) $portalCompetitionHandlers_getEngagementCompetitionStatistics.instance = require("./backend/portal-competition-handlers/get-engagement-competition-statistics").createCompetitionHandlers_getEngagementCompetitionStatistics({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get decodeEngagementCompetitionStatisticsCache() { return decodeEngagementCompetitionStatisticsCache; },
    get encodeEngagementCompetitionStatisticsCache() { return encodeEngagementCompetitionStatisticsCache; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionStatisticsCacheRef() { return engagementCompetitionStatisticsCacheRef; },
    get engagementCompetitionStatisticsItem() { return engagementCompetitionStatisticsItem; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalCompetitionHandlers_getEngagementCompetitionStatistics.instance;
}

function $portalCompetitionHandlers_generateEngagementCompetitionTxtExport() {
  if (!$portalCompetitionHandlers_generateEngagementCompetitionTxtExport.instance) $portalCompetitionHandlers_generateEngagementCompetitionTxtExport.instance = require("./backend/portal-competition-handlers/generate-engagement-competition-txt-export").createCompetitionHandlers_generateEngagementCompetitionTxtExport({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get buildEngagementCompetitionTxt() { return buildEngagementCompetitionTxt; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get engagementTxtSwimmerCategory() { return engagementTxtSwimmerCategory; },
    get getOrCreateEngagementCompetitionTxt() { return getOrCreateEngagementCompetitionTxt; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_generateEngagementCompetitionTxtExport.instance;
}

function $portalCompetitionHandlers_getPortalPendingRequestOverview() {
  if (!$portalCompetitionHandlers_getPortalPendingRequestOverview.instance) $portalCompetitionHandlers_getPortalPendingRequestOverview.instance = require("./backend/portal-competition-handlers/get-portal-pending-request-overview").createCompetitionHandlers_getPortalPendingRequestOverview({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get db() { return db; },
    get engagementNationalAdministrationPendingCounts() { return engagementNationalAdministrationPendingCounts; }
  });
  return $portalCompetitionHandlers_getPortalPendingRequestOverview.instance;
}

function $portalCompetitionHandlers_createEngagementCompetition() {
  if (!$portalCompetitionHandlers_createEngagementCompetition.instance) $portalCompetitionHandlers_createEngagementCompetition.instance = require("./backend/portal-competition-handlers/create-engagement-competition").createCompetitionHandlers_createEngagementCompetition({
    get ENGAGEMENT_COMPETITION_TYPES() { return ENGAGEMENT_COMPETITION_TYPES; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementCompetitionPayload() { return cleanEngagementCompetitionPayload; },
    get cleanText() { return cleanText; },
    get createNativePortalCalendarRecord() { return createNativePortalCalendarRecord; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCompetitionListItem() { return engagementCompetitionListItem; },
    get qualificationEngine() { return require("./engagement-qualification"); },
    get qualificationEvents() { return qualificationEvents; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalCompetitionHandlers_createEngagementCompetition.instance;
}

function $portalCompetitionHandlers_updateEngagementCompetition() {
  if (!$portalCompetitionHandlers_updateEngagementCompetition.instance) $portalCompetitionHandlers_updateEngagementCompetition.instance = require("./backend/portal-competition-handlers/update-engagement-competition").createCompetitionHandlers_updateEngagementCompetition({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get armNativeCompetitionNotification() { return armNativeCompetitionNotification; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionPayload() { return cleanEngagementCompetitionPayload; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementOpenWaterCourses() { return cleanEngagementOpenWaterCourses; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get engagementOpenWaterCourseConfigRef() { return engagementOpenWaterCourseConfigRef; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get nativeQualificationServices() { return nativeQualificationServices; },
    get qualificationEngine() { return require("./engagement-qualification"); },
    get qualificationEvents() { return qualificationEvents; },
    get qualificationService() { return qualificationService; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalCompetitionHandlers_updateEngagementCompetition.instance;
}

function $portalCompetitionHandlers_deleteEngagementCompetition() {
  if (!$portalCompetitionHandlers_deleteEngagementCompetition.instance) $portalCompetitionHandlers_deleteEngagementCompetition.instance = require("./backend/portal-competition-handlers/delete-engagement-competition").createCompetitionHandlers_deleteEngagementCompetition({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get assertEngagementCompetitionDocumentPath() { return assertEngagementCompetitionDocumentPath; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClosureQueueRef() { return engagementClosureQueueRef; },
    get engagementCompetitionCalendarRef() { return engagementCompetitionCalendarRef; },
    get engagementEventIsPast() { return engagementEventIsPast; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get engagementSeasonEndYearFromIsoDate() { return engagementSeasonEndYearFromIsoDate; },
    get hasManagedEngagementCompetitionDocumentStorage() { return hasManagedEngagementCompetitionDocumentStorage; },
    get storage() { return storage; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalCompetitionHandlers_deleteEngagementCompetition.instance;
}

function $portalNationalHandlers_getNationalFeaturedDocuments() {
  if (!$portalNationalHandlers_getNationalFeaturedDocuments.instance) $portalNationalHandlers_getNationalFeaturedDocuments.instance = require("./backend/portal-national-handlers/get-national-featured-documents").createNationalHandlers_getNationalFeaturedDocuments({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementAccessContext() { return engagementAccessContext; },
    get manageNationalLibraryDocuments() { return manageNationalLibraryDocuments; }
  });
  return $portalNationalHandlers_getNationalFeaturedDocuments.instance;
}

function $portalNationalHandlers_saveNationalFeaturedDocuments() {
  if (!$portalNationalHandlers_saveNationalFeaturedDocuments.instance) $portalNationalHandlers_saveNationalFeaturedDocuments.instance = require("./backend/portal-national-handlers/save-national-featured-documents").createNationalHandlers_saveNationalFeaturedDocuments({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get manageNationalLibraryDocuments() { return manageNationalLibraryDocuments; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_saveNationalFeaturedDocuments.instance;
}

function $portalNationalHandlers_searchEngagementNationalSwimmers() {
  if (!$portalNationalHandlers_searchEngagementNationalSwimmers.instance) $portalNationalHandlers_searchEngagementNationalSwimmers.instance = require("./backend/portal-national-handlers/search-engagement-national-swimmers").createNationalHandlers_searchEngagementNationalSwimmers({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get searchEngagementNationalSwimmerDocs() { return searchEngagementNationalSwimmerDocs; }
  });
  return $portalNationalHandlers_searchEngagementNationalSwimmers.instance;
}

function $portalNationalHandlers_requestEngagementClubSwimmerChange() {
  if (!$portalNationalHandlers_requestEngagementClubSwimmerChange.instance) $portalNationalHandlers_requestEngagementClubSwimmerChange.instance = require("./backend/portal-national-handlers/request-engagement-club-swimmer-change").createNationalHandlers_requestEngagementClubSwimmerChange({
    get AUDIT_ACTOR_RESOLUTION_LIMIT() { return AUDIT_ACTOR_RESOLUTION_LIMIT; },
    get AUDIT_COMPETITION_RESOLUTION_LIMIT() { return AUDIT_COMPETITION_RESOLUTION_LIMIT; },
    get AUDIT_LEGACY_VISIBLE_SINCE() { return AUDIT_LEGACY_VISIBLE_SINCE; },
    get AUDIT_PAGE_LIMIT() { return AUDIT_PAGE_LIMIT; },
    get AUDIT_PERSON_RESOLUTION_LIMIT() { return AUDIT_PERSON_RESOLUTION_LIMIT; },
    get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get auditManagementContext() { return auditManagementContext; },
    get auth() { return auth; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanEngagementSwimmerIdentityCorrection() { return cleanEngagementSwimmerIdentityCorrection; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get deleteEngagementClubPeopleRosterPerson() { return deleteEngagementClubPeopleRosterPerson; },
    get deleteEngagementClubSwimmerPermanently() { return deleteEngagementClubSwimmerPermanently; },
    get displayNameFromProfile() { return displayNameFromProfile; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubPersonEntrySnapshot() { return engagementClubPersonEntrySnapshot; },
    get engagementClubPersonFullName() { return engagementClubPersonFullName; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementClubSwimmerDeletionUsage() { return engagementClubSwimmerDeletionUsage; },
    get engagementNationalSwimmerItemFromDoc() { return engagementNationalSwimmerItemFromDoc; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get engagementSwimmerChangeRequestItem() { return engagementSwimmerChangeRequestItem; },
    get engagementSwimmerIdentitySnapshot() { return engagementSwimmerIdentitySnapshot; },
    get getEngagementNationalSwimmerForMerge() { return getEngagementNationalSwimmerForMerge; },
    get getEngagementSwimmerCorrectionTarget() { return getEngagementSwimmerCorrectionTarget; },
    get manageNationalLibraryDocuments() { return manageNationalLibraryDocuments; },
    get mergeEngagementClubEntryOfficials() { return mergeEngagementClubEntryOfficials; },
    get portalReadStats() { return portalReadStats; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get readEngagementClubAdminDirectory() { return readEngagementClubAdminDirectory; },
    get searchEngagementNationalSwimmerDocs() { return searchEngagementNationalSwimmerDocs; },
    get searchEngagementNationalSwimmerMergeTargetDocs() { return searchEngagementNationalSwimmerMergeTargetDocs; },
    get setEngagementSwimmerChangeRequestRosterState() { return setEngagementSwimmerChangeRequestRosterState; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_requestEngagementClubSwimmerChange.instance;
}

function $portalNationalHandlers_listEngagementSwimmerChangeRequests() {
  if (!$portalNationalHandlers_listEngagementSwimmerChangeRequests.instance) $portalNationalHandlers_listEngagementSwimmerChangeRequests.instance = require("./backend/portal-national-handlers/list-engagement-swimmer-change-requests").createNationalHandlers_listEngagementSwimmerChangeRequests({
    get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementSwimmerChangeRequestItem() { return engagementSwimmerChangeRequestItem; }
  });
  return $portalNationalHandlers_listEngagementSwimmerChangeRequests.instance;
}

function $portalNationalHandlers_listEngagementNationalClubs() {
  if (!$portalNationalHandlers_listEngagementNationalClubs.instance) $portalNationalHandlers_listEngagementNationalClubs.instance = require("./backend/portal-national-handlers/list-engagement-national-clubs").createNationalHandlers_listEngagementNationalClubs({
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get portalReadStats() { return portalReadStats; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get readEngagementClubAdminDirectory() { return readEngagementClubAdminDirectory; }
  });
  return $portalNationalHandlers_listEngagementNationalClubs.instance;
}

function $portalNationalHandlers_saveEngagementNationalClub() {
  if (!$portalNationalHandlers_saveEngagementNationalClub.instance) $portalNationalHandlers_saveEngagementNationalClub.instance = require("./backend/portal-national-handlers/save-engagement-national-club").createNationalHandlers_saveEngagementNationalClub({
    get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_saveEngagementNationalClub.instance;
}

function $portalNationalHandlers_deleteEngagementNationalClub() {
  if (!$portalNationalHandlers_deleteEngagementNationalClub.instance) $portalNationalHandlers_deleteEngagementNationalClub.instance = require("./backend/portal-national-handlers/delete-engagement-national-club").createNationalHandlers_deleteEngagementNationalClub({
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get portalReadStats() { return portalReadStats; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_deleteEngagementNationalClub.instance;
}

function $portalNationalHandlers_setEngagementNationalClubSwimmerStatus() {
  if (!$portalNationalHandlers_setEngagementNationalClubSwimmerStatus.instance) $portalNationalHandlers_setEngagementNationalClubSwimmerStatus.instance = require("./backend/portal-national-handlers/set-engagement-national-club-swimmer-status").createNationalHandlers_setEngagementNationalClubSwimmerStatus({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_setEngagementNationalClubSwimmerStatus.instance;
}

function $portalNationalHandlers_deleteEngagementNationalClubSwimmer() {
  if (!$portalNationalHandlers_deleteEngagementNationalClubSwimmer.instance) $portalNationalHandlers_deleteEngagementNationalClubSwimmer.instance = require("./backend/portal-national-handlers/delete-engagement-national-club-swimmer").createNationalHandlers_deleteEngagementNationalClubSwimmer({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubSwimmerPermanently() { return deleteEngagementClubSwimmerPermanently; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubSwimmerDeletionUsage() { return engagementClubSwimmerDeletionUsage; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_deleteEngagementNationalClubSwimmer.instance;
}

function $portalNationalHandlers_searchEngagementNationalSwimmerMergeTargets() {
  if (!$portalNationalHandlers_searchEngagementNationalSwimmerMergeTargets.instance) $portalNationalHandlers_searchEngagementNationalSwimmerMergeTargets.instance = require("./backend/portal-national-handlers/search-engagement-national-swimmer-merge-targets").createNationalHandlers_searchEngagementNationalSwimmerMergeTargets({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementNationalSwimmerItemFromDoc() { return engagementNationalSwimmerItemFromDoc; },
    get getEngagementNationalSwimmerForMerge() { return getEngagementNationalSwimmerForMerge; },
    get searchEngagementNationalSwimmerDocs() { return searchEngagementNationalSwimmerDocs; },
    get searchEngagementNationalSwimmerMergeTargetDocs() { return searchEngagementNationalSwimmerMergeTargetDocs; }
  });
  return $portalNationalHandlers_searchEngagementNationalSwimmerMergeTargets.instance;
}

function $portalNationalHandlers_listEngagementNationalClubPeople() {
  if (!$portalNationalHandlers_listEngagementNationalClubPeople.instance) $portalNationalHandlers_listEngagementNationalClubPeople.instance = require("./backend/portal-national-handlers/list-engagement-national-club-people").createNationalHandlers_listEngagementNationalClubPeople({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubPersonItem() { return engagementClubPersonItem; }
  });
  return $portalNationalHandlers_listEngagementNationalClubPeople.instance;
}

function $portalNationalHandlers_setEngagementNationalClubPersonStatus() {
  if (!$portalNationalHandlers_setEngagementNationalClubPersonStatus.instance) $portalNationalHandlers_setEngagementNationalClubPersonStatus.instance = require("./backend/portal-national-handlers/set-engagement-national-club-person-status").createNationalHandlers_setEngagementNationalClubPersonStatus({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_setEngagementNationalClubPersonStatus.instance;
}

function $portalNationalHandlers_deleteEngagementNationalClubPerson() {
  if (!$portalNationalHandlers_deleteEngagementNationalClubPerson.instance) $portalNationalHandlers_deleteEngagementNationalClubPerson.instance = require("./backend/portal-national-handlers/delete-engagement-national-club-person").createNationalHandlers_deleteEngagementNationalClubPerson({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubPeopleRosterPerson() { return deleteEngagementClubPeopleRosterPerson; },
    get engagementAccessContext() { return engagementAccessContext; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_deleteEngagementNationalClubPerson.instance;
}

function $portalNationalHandlers_listEngagementNationalAuditLogs() {
  if (!$portalNationalHandlers_listEngagementNationalAuditLogs.instance) $portalNationalHandlers_listEngagementNationalAuditLogs.instance = require("./backend/portal-national-handlers/list-engagement-national-audit-logs").createNationalHandlers_listEngagementNationalAuditLogs({
    get AUDIT_ACTOR_RESOLUTION_LIMIT() { return AUDIT_ACTOR_RESOLUTION_LIMIT; },
    get AUDIT_COMPETITION_RESOLUTION_LIMIT() { return AUDIT_COMPETITION_RESOLUTION_LIMIT; },
    get AUDIT_LEGACY_VISIBLE_SINCE() { return AUDIT_LEGACY_VISIBLE_SINCE; },
    get AUDIT_PAGE_LIMIT() { return AUDIT_PAGE_LIMIT; },
    get AUDIT_PERSON_RESOLUTION_LIMIT() { return AUDIT_PERSON_RESOLUTION_LIMIT; },
    get FieldPath() { return FieldPath; },
    get auditManagementContext() { return auditManagementContext; },
    get auth() { return auth; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get displayNameFromProfile() { return displayNameFromProfile; }
  });
  return $portalNationalHandlers_listEngagementNationalAuditLogs.instance;
}

function $portalNationalHandlers_mergeEngagementNationalClubPerson() {
  if (!$portalNationalHandlers_mergeEngagementNationalClubPerson.instance) $portalNationalHandlers_mergeEngagementNationalClubPerson.instance = require("./backend/portal-national-handlers/merge-engagement-national-club-person").createNationalHandlers_mergeEngagementNationalClubPerson({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubPeopleRosterPerson() { return deleteEngagementClubPeopleRosterPerson; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubPersonEntrySnapshot() { return engagementClubPersonEntrySnapshot; },
    get engagementClubPersonFullName() { return engagementClubPersonFullName; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get mergeEngagementClubEntryOfficials() { return mergeEngagementClubEntryOfficials; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalNationalHandlers_mergeEngagementNationalClubPerson.instance;
}

function $portalClubHandlers_getEngagementClubEntry() {
  if (!$portalClubHandlers_getEngagementClubEntry.instance) $portalClubHandlers_getEngagementClubEntry.instance = require("./backend/portal-club-handlers/get-engagement-club-entry").createClubHandlers_getEngagementClubEntry({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalClubHandlers_getEngagementClubEntry.instance;
}

function $portalClubHandlers_generateEngagementClubRecapPdf() {
  if (!$portalClubHandlers_generateEngagementClubRecapPdf.instance) $portalClubHandlers_generateEngagementClubRecapPdf.instance = require("./backend/portal-club-handlers/generate-engagement-club-recap-pdf").createClubHandlers_generateEngagementClubRecapPdf({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get generateNativeClubRecapPdf() { return generateNativeClubRecapPdf; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_generateEngagementClubRecapPdf.instance;
}

function $portalClubHandlers_listEngagementCompetitionClubRecaps() {
  if (!$portalClubHandlers_listEngagementCompetitionClubRecaps.instance) $portalClubHandlers_listEngagementCompetitionClubRecaps.instance = require("./backend/portal-club-handlers/list-engagement-competition-club-recaps").createClubHandlers_listEngagementCompetitionClubRecaps({
    get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionEntrySummariesFromData() { return engagementCompetitionEntrySummariesFromData; },
    get engagementCompetitionEntrySummaryItem() { return engagementCompetitionEntrySummaryItem; },
    get engagementCompetitionEntrySummaryRef() { return engagementCompetitionEntrySummaryRef; },
    get engagementPdfFeeTotal() { return engagementPdfFeeTotal; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; }
  });
  return $portalClubHandlers_listEngagementCompetitionClubRecaps.instance;
}

function $portalClubHandlers_generateEngagementClubRecapPdfForAdmin() {
  if (!$portalClubHandlers_generateEngagementClubRecapPdfForAdmin.instance) $portalClubHandlers_generateEngagementClubRecapPdfForAdmin.instance = require("./backend/portal-club-handlers/generate-engagement-club-recap-pdf-for-admin").createClubHandlers_generateEngagementClubRecapPdfForAdmin({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_generateEngagementClubRecapPdfForAdmin.instance;
}

function $portalClubHandlers_generateEngagementCompetitionClubRecapPdfs() {
  if (!$portalClubHandlers_generateEngagementCompetitionClubRecapPdfs.instance) $portalClubHandlers_generateEngagementCompetitionClubRecapPdfs.instance = require("./backend/portal-club-handlers/generate-engagement-competition-club-recap-pdfs").createClubHandlers_generateEngagementCompetitionClubRecapPdfs({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCanManageEngagementCompetition() { return assertCanManageEngagementCompetition; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get cleanText() { return cleanText; },
    get clubRecapZip() { return clubRecapZip; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionEntrySummaryItem() { return engagementCompetitionEntrySummaryItem; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get nativeAdminCompetitionEntries() { return nativeAdminCompetitionEntries; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_generateEngagementCompetitionClubRecapPdfs.instance;
}

function $portalClubHandlers_saveEngagementClubTeamLeader() {
  if (!$portalClubHandlers_saveEngagementClubTeamLeader.instance) $portalClubHandlers_saveEngagementClubTeamLeader.instance = require("./backend/portal-club-handlers/save-engagement-club-team-leader").createClubHandlers_saveEngagementClubTeamLeader({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanEngagementTeamLeader() { return cleanEngagementTeamLeader; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementPersonLicenseKey() { return engagementPersonLicenseKey; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_saveEngagementClubTeamLeader.instance;
}

function $portalClubHandlers_removeEngagementClubTeamLeader() {
  if (!$portalClubHandlers_removeEngagementClubTeamLeader.instance) $portalClubHandlers_removeEngagementClubTeamLeader.instance = require("./backend/portal-club-handlers/remove-engagement-club-team-leader").createClubHandlers_removeEngagementClubTeamLeader({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementCompetitionEntrySummary() { return deleteEngagementCompetitionEntrySummary; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get nativePortalCompetition() { return nativePortalCompetition; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_removeEngagementClubTeamLeader.instance;
}

function $portalClubHandlers_listEngagementClubPeople() {
  if (!$portalClubHandlers_listEngagementClubPeople.instance) $portalClubHandlers_listEngagementClubPeople.instance = require("./backend/portal-club-handlers/list-engagement-club-people").createClubHandlers_listEngagementClubPeople({
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubPeopleRosterPeopleFromData() { return engagementClubPeopleRosterPeopleFromData; },
    get engagementClubPeopleRosterRef() { return engagementClubPeopleRosterRef; },
    get portalReadStats() { return portalReadStats; },
    get rebuildEngagementClubPeopleRoster() { return rebuildEngagementClubPeopleRoster; }
  });
  return $portalClubHandlers_listEngagementClubPeople.instance;
}

function $portalClubHandlers_saveEngagementClubPerson() {
  if (!$portalClubHandlers_saveEngagementClubPerson.instance) $portalClubHandlers_saveEngagementClubPerson.instance = require("./backend/portal-club-handlers/save-engagement-club-person").createClubHandlers_saveEngagementClubPerson({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementClubPerson() { return cleanEngagementClubPerson; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubPeopleRosterPeopleFromData() { return engagementClubPeopleRosterPeopleFromData; },
    get engagementClubPeopleRosterRef() { return engagementClubPeopleRosterRef; },
    get engagementClubPersonIdentityConflict() { return engagementClubPersonIdentityConflict; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementClubPersonOutsideClubConflict() { return engagementClubPersonOutsideClubConflict; },
    get resolveEngagementClubPersonSwimmer() { return resolveEngagementClubPersonSwimmer; },
    get stableHash() { return stableHash; },
    get throwEngagementClubPersonIdentityConflict() { return throwEngagementClubPersonIdentityConflict; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_saveEngagementClubPerson.instance;
}

function $portalClubHandlers_setEngagementClubPersonStatus() {
  if (!$portalClubHandlers_setEngagementClubPersonStatus.instance) $portalClubHandlers_setEngagementClubPersonStatus.instance = require("./backend/portal-club-handlers/set-engagement-club-person-status").createClubHandlers_setEngagementClubPersonStatus({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get upsertEngagementClubPeopleRosterPerson() { return upsertEngagementClubPeopleRosterPerson; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_setEngagementClubPersonStatus.instance;
}

function $portalClubHandlers_saveEngagementClubOfficials() {
  if (!$portalClubHandlers_saveEngagementClubOfficials.instance) $portalClubHandlers_saveEngagementClubOfficials.instance = require("./backend/portal-club-handlers/save-engagement-club-officials").createClubHandlers_saveEngagementClubOfficials({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubPersonItem() { return engagementClubPersonItem; },
    get engagementPersonLicenseKey() { return engagementPersonLicenseKey; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get saveNativeClubOfficials() { return saveNativeClubOfficials; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_saveEngagementClubOfficials.instance;
}

function $portalClubHandlers_listEngagementClubSwimmers() {
  if (!$portalClubHandlers_listEngagementClubSwimmers.instance) $portalClubHandlers_listEngagementClubSwimmers.instance = require("./backend/portal-club-handlers/list-engagement-club-swimmers").createClubHandlers_listEngagementClubSwimmers({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmersFromData() { return engagementClubRosterSwimmersFromData; },
    get portalReadStats() { return portalReadStats; },
    get sortEngagementClubSwimmers() { return sortEngagementClubSwimmers; },
    get uniqueEngagementClubSwimmers() { return uniqueEngagementClubSwimmers; }
  });
  return $portalClubHandlers_listEngagementClubSwimmers.instance;
}

function $portalClubHandlers_setEngagementClubSwimmerActivityStatus() {
  if (!$portalClubHandlers_setEngagementClubSwimmerActivityStatus.instance) $portalClubHandlers_setEngagementClubSwimmerActivityStatus.instance = require("./backend/portal-club-handlers/set-engagement-club-swimmer-activity-status").createClubHandlers_setEngagementClubSwimmerActivityStatus({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementClubActivityStatus() { return cleanEngagementClubActivityStatus; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get portalReadStats() { return portalReadStats; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_setEngagementClubSwimmerActivityStatus.instance;
}

function $portalClubHandlers_previewEngagementClubSwimmerCreation() {
  if (!$portalClubHandlers_previewEngagementClubSwimmerCreation.instance) $portalClubHandlers_previewEngagementClubSwimmerCreation.instance = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-creation").createClubHandlers_previewEngagementClubSwimmerCreation({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertNoEngagementSwimmerLicenseConflict() { return assertNoEngagementSwimmerLicenseConflict; },
    get buildEngagementNewSwimmerAlerts() { return buildEngagementNewSwimmerAlerts; },
    get cleanEngagementNewSwimmer() { return cleanEngagementNewSwimmer; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementNewSwimmerAlertFromMatch() { return engagementNewSwimmerAlertFromMatch; },
    get importSwimmerCreation() { return importSwimmerCreation; }
  });
  return $portalClubHandlers_previewEngagementClubSwimmerCreation.instance;
}

function $portalClubHandlers_previewEngagementClubSwimmerRecovery() {
  if (!$portalClubHandlers_previewEngagementClubSwimmerRecovery.instance) $portalClubHandlers_previewEngagementClubSwimmerRecovery.instance = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-recovery").createClubHandlers_previewEngagementClubSwimmerRecovery({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementSwimmerRecoveryPreview() { return engagementSwimmerRecoveryPreview; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalClubHandlers_previewEngagementClubSwimmerRecovery.instance;
}

function $portalClubHandlers_recoverEngagementClubSwimmer() {
  if (!$portalClubHandlers_recoverEngagementClubSwimmer.instance) $portalClubHandlers_recoverEngagementClubSwimmer.instance = require("./backend/portal-club-handlers/recover-engagement-club-swimmer").createClubHandlers_recoverEngagementClubSwimmer({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementNewSwimmer() { return cleanEngagementNewSwimmer; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get engagementSwimmerRecoveryPreview() { return engagementSwimmerRecoveryPreview; },
    get portalReadStats() { return portalReadStats; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_recoverEngagementClubSwimmer.instance;
}

function $portalClubHandlers_createEngagementClubSwimmer() {
  if (!$portalClubHandlers_createEngagementClubSwimmer.instance) $portalClubHandlers_createEngagementClubSwimmer.instance = require("./backend/portal-club-handlers/create-engagement-club-swimmer").createClubHandlers_createEngagementClubSwimmer({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertNoEngagementSwimmerLicenseConflict() { return assertNoEngagementSwimmerLicenseConflict; },
    get buildEngagementNewSwimmerAlerts() { return buildEngagementNewSwimmerAlerts; },
    get cleanEngagementNewSwimmer() { return cleanEngagementNewSwimmer; },
    get cleanText() { return cleanText; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementNewSwimmerAlertFromMatch() { return engagementNewSwimmerAlertFromMatch; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get importSwimmerCreation() { return importSwimmerCreation; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_createEngagementClubSwimmer.instance;
}

function $portalClubHandlers_validateEngagementSwimmerLicenses() {
  if (!$portalClubHandlers_validateEngagementSwimmerLicenses.instance) $portalClubHandlers_validateEngagementSwimmerLicenses.instance = require("./backend/portal-club-handlers/validate-engagement-swimmer-licenses").createClubHandlers_validateEngagementSwimmerLicenses({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementClubRosterSwimmerKey() { return engagementClubRosterSwimmerKey; },
    get engagementLicenseControlSeason() { return engagementLicenseControlSeason; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $portalClubHandlers_validateEngagementSwimmerLicenses.instance;
}

function $portalClubHandlers_getPublicEngagementClubDirectory() {
  if (!$portalClubHandlers_getPublicEngagementClubDirectory.instance) $portalClubHandlers_getPublicEngagementClubDirectory.instance = require("./backend/portal-club-handlers/get-public-engagement-club-directory").createClubHandlers_getPublicEngagementClubDirectory({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get portalReadStats() { return portalReadStats; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; }
  });
  return $portalClubHandlers_getPublicEngagementClubDirectory.instance;
}

function $portalClubHandlers_getEngagementClubEntryTimeHistory() {
  if (!$portalClubHandlers_getEngagementClubEntryTimeHistory.instance) $portalClubHandlers_getEngagementClubEntryTimeHistory.instance = require("./backend/portal-club-handlers/get-engagement-club-entry-time-history").createClubHandlers_getEngagementClubEntryTimeHistory({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementKnownTimeHistory() { return engagementKnownTimeHistory; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get getEngagementEntryTimeRowsForSwimmer() { return getEngagementEntryTimeRowsForSwimmer; },
    get nativeClubEntryTimeHistory() { return nativeClubEntryTimeHistory; },
    get portalReadStats() { return portalReadStats; }
  });
  return $portalClubHandlers_getEngagementClubEntryTimeHistory.instance;
}

function $portalClubHandlers_previewEngagementClubSwimmerEventTimes() {
  if (!$portalClubHandlers_previewEngagementClubSwimmerEventTimes.instance) $portalClubHandlers_previewEngagementClubSwimmerEventTimes.instance = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-event-times").createClubHandlers_previewEngagementClubSwimmerEventTimes({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get previewNativeClubEntryTimes() { return previewNativeClubEntryTimes; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; }
  });
  return $portalClubHandlers_previewEngagementClubSwimmerEventTimes.instance;
}

function $portalClubHandlers_previewEngagementClubSwimmerEventTimesBatch() {
  if (!$portalClubHandlers_previewEngagementClubSwimmerEventTimesBatch.instance) $portalClubHandlers_previewEngagementClubSwimmerEventTimesBatch.instance = require("./backend/portal-club-handlers/preview-engagement-club-swimmer-event-times-batch").createClubHandlers_previewEngagementClubSwimmerEventTimesBatch({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get portalReadStats() { return portalReadStats; },
    get previewNativeClubEntryTimes() { return previewNativeClubEntryTimes; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; }
  });
  return $portalClubHandlers_previewEngagementClubSwimmerEventTimesBatch.instance;
}

function $portalClubHandlers_saveEngagementClubIndividualEntries() {
  if (!$portalClubHandlers_saveEngagementClubIndividualEntries.instance) $portalClubHandlers_saveEngagementClubIndividualEntries.instance = require("./backend/portal-club-handlers/save-engagement-club-individual-entries").createClubHandlers_saveEngagementClubIndividualEntries({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get qualificationRelaysAfterIndividualChange() { return qualificationRelaysAfterIndividualChange; },
    get qualificationService() { return qualificationService; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; },
    get saveNativeClubIndividualEntries() { return saveNativeClubIndividualEntries; },
    get validateEngagementIndividualEntryTimes() { return validateEngagementIndividualEntryTimes; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_saveEngagementClubIndividualEntries.instance;
}

function $portalClubHandlers_saveEngagementClubSwimmerSelection() {
  if (!$portalClubHandlers_saveEngagementClubSwimmerSelection.instance) $portalClubHandlers_saveEngagementClubSwimmerSelection.instance = require("./backend/portal-club-handlers/save-engagement-club-swimmer-selection").createClubHandlers_saveEngagementClubSwimmerSelection({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get assertEngagementSwimmerRoleCompatibility() { return assertEngagementSwimmerRoleCompatibility; },
    get buildEngagementClubSwimmersFromRequest() { return buildEngagementClubSwimmersFromRequest; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get qualificationRelaysAfterIndividualChange() { return qualificationRelaysAfterIndividualChange; },
    get qualificationService() { return qualificationService; },
    get saveNativeClubSwimmerSelections() { return saveNativeClubSwimmerSelections; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_saveEngagementClubSwimmerSelection.instance;
}

function $portalClubHandlers_saveEngagementClubSwimmerSelections() {
  if (!$portalClubHandlers_saveEngagementClubSwimmerSelections.instance) $portalClubHandlers_saveEngagementClubSwimmerSelections.instance = require("./backend/portal-club-handlers/save-engagement-club-swimmer-selections").createClubHandlers_saveEngagementClubSwimmerSelections({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get assertEngagementSwimmerRoleCompatibility() { return assertEngagementSwimmerRoleCompatibility; },
    get buildEngagementClubSwimmersFromRequest() { return buildEngagementClubSwimmersFromRequest; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get portalReadStats() { return portalReadStats; },
    get qualificationRelaysAfterIndividualChange() { return qualificationRelaysAfterIndividualChange; },
    get qualificationService() { return qualificationService; },
    get saveNativeClubSwimmerSelections() { return saveNativeClubSwimmerSelections; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_saveEngagementClubSwimmerSelections.instance;
}

function $portalClubHandlers_saveEngagementClubRelays() {
  if (!$portalClubHandlers_saveEngagementClubRelays.instance) $portalClubHandlers_saveEngagementClubRelays.instance = require("./backend/portal-club-handlers/save-engagement-club-relays").createClubHandlers_saveEngagementClubRelays({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryRelays() { return cleanEngagementEntryRelays; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementTeamLeaderComplete() { return engagementTeamLeaderComplete; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get qualificationEngine() { return require("./engagement-qualification"); },
    get qualificationService() { return qualificationService; },
    get saveNativeClubRelays() { return saveNativeClubRelays; },
    get validateEngagementRelayEntryTimes() { return validateEngagementRelayEntryTimes; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $portalClubHandlers_saveEngagementClubRelays.instance;
}

function $serverAccessService_portalReadStats() {
  if (!$serverAccessService_portalReadStats.instance) $serverAccessService_portalReadStats.instance = require("./backend/server-access-service/portal-read-stats").createAccessService_portalReadStats({

  });
  return $serverAccessService_portalReadStats.instance;
}

function $serverAccessService_cleanEngagementRelayMixedMode() {
  if (!$serverAccessService_cleanEngagementRelayMixedMode.instance) $serverAccessService_cleanEngagementRelayMixedMode.instance = require("./backend/server-access-service/clean-engagement-relay-mixed-mode").createAccessService_cleanEngagementRelayMixedMode({
    get cleanText() { return cleanText; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
    get ENGAGEMENT_RELAY_CATEGORY_CODES() { return ENGAGEMENT_RELAY_CATEGORY_CODES; },
    get ENGAGEMENT_RELAY_MIXED_MODES() { return ENGAGEMENT_RELAY_MIXED_MODES; }
  });
  return $serverAccessService_cleanEngagementRelayMixedMode.instance;
}

function $serverAccessService_competitionEmailNotificationsEnabled() {
  if (!$serverAccessService_competitionEmailNotificationsEnabled.instance) $serverAccessService_competitionEmailNotificationsEnabled.instance = require("./backend/server-access-service/competition-email-notifications-enabled").createAccessService_competitionEmailNotificationsEnabled({

  });
  return $serverAccessService_competitionEmailNotificationsEnabled.instance;
}

function $serverAccessService_competitionNotificationPreferenceToken() {
  if (!$serverAccessService_competitionNotificationPreferenceToken.instance) $serverAccessService_competitionNotificationPreferenceToken.instance = require("./backend/server-access-service/competition-notification-preference-token").createAccessService_competitionNotificationPreferenceToken({
    get cleanText() { return cleanText; },
    get LIVEPALMES_NOTIFICATION_LINK_SECRET() { return LIVEPALMES_NOTIFICATION_LINK_SECRET; },
    get crypto() { return crypto; }
  });
  return $serverAccessService_competitionNotificationPreferenceToken.instance;
}

function $serverAccessService_validCompetitionNotificationPreferenceToken() {
  if (!$serverAccessService_validCompetitionNotificationPreferenceToken.instance) $serverAccessService_validCompetitionNotificationPreferenceToken.instance = require("./backend/server-access-service/valid-competition-notification-preference-token").createAccessService_validCompetitionNotificationPreferenceToken({
    get cleanText() { return cleanText; },
    get crypto() { return crypto; },
    get local$competitionNotificationPreferenceToken() { return $serverAccessService_competitionNotificationPreferenceToken().competitionNotificationPreferenceToken; }
  });
  return $serverAccessService_validCompetitionNotificationPreferenceToken.instance;
}

function $serverAccessService_competitionNotificationPreferenceUrl() {
  if (!$serverAccessService_competitionNotificationPreferenceUrl.instance) $serverAccessService_competitionNotificationPreferenceUrl.instance = require("./backend/server-access-service/competition-notification-preference-url").createAccessService_competitionNotificationPreferenceUrl({
    get cleanText() { return cleanText; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get local$competitionNotificationPreferenceToken() { return $serverAccessService_competitionNotificationPreferenceToken().competitionNotificationPreferenceToken; }
  });
  return $serverAccessService_competitionNotificationPreferenceUrl.instance;
}

function $serverAccessService_engagementClubRegionId() {
  if (!$serverAccessService_engagementClubRegionId.instance) $serverAccessService_engagementClubRegionId.instance = require("./backend/server-access-service/engagement-club-region-id").createAccessService_engagementClubRegionId({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; }
  });
  return $serverAccessService_engagementClubRegionId.instance;
}

function $serverAccessService_engagementClubCode() {
  if (!$serverAccessService_engagementClubCode.instance) $serverAccessService_engagementClubCode.instance = require("./backend/server-access-service/engagement-club-code").createAccessService_engagementClubCode({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; }
  });
  return $serverAccessService_engagementClubCode.instance;
}

function $serverAccessService_engagementClubName() {
  if (!$serverAccessService_engagementClubName.instance) $serverAccessService_engagementClubName.instance = require("./backend/server-access-service/engagement-club-name").createAccessService_engagementClubName({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; }
  });
  return $serverAccessService_engagementClubName.instance;
}

function $serverAccessService_engagementStoredClubItem() {
  if (!$serverAccessService_engagementStoredClubItem.instance) $serverAccessService_engagementStoredClubItem.instance = require("./backend/server-access-service/engagement-stored-club-item").createAccessService_engagementStoredClubItem({
    get cleanText() { return cleanText; },
    get local$cleanFirestoreValue() { return $serverAccessService_cleanFirestoreValue().cleanFirestoreValue; }
  });
  return $serverAccessService_engagementStoredClubItem.instance;
}

function $serverAccessService_publicEngagementClubItem() {
  if (!$serverAccessService_publicEngagementClubItem.instance) $serverAccessService_publicEngagementClubItem.instance = require("./backend/server-access-service/public-engagement-club-item").createAccessService_publicEngagementClubItem({
    get cleanText() { return cleanText; },
    get local$cleanFirestoreValue() { return $serverAccessService_cleanFirestoreValue().cleanFirestoreValue; }
  });
  return $serverAccessService_publicEngagementClubItem.instance;
}

function $serverAccessService_publicEngagementClubDirectoryRef() {
  if (!$serverAccessService_publicEngagementClubDirectoryRef.instance) $serverAccessService_publicEngagementClubDirectoryRef.instance = require("./backend/server-access-service/public-engagement-club-directory-ref").createAccessService_publicEngagementClubDirectoryRef({
    get ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION() { return ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION; },
    get db() { return db; }
  });
  return $serverAccessService_publicEngagementClubDirectoryRef.instance;
}

function $serverAccessService_engagementClubsByIds() {
  if (!$serverAccessService_engagementClubsByIds.instance) $serverAccessService_engagementClubsByIds.instance = require("./backend/server-access-service/engagement-clubs-by-ids").createAccessService_engagementClubsByIds({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get db() { return db; },
    get local$engagementStoredClubItem() { return $serverAccessService_engagementStoredClubItem().engagementStoredClubItem; }
  });
  return $serverAccessService_engagementClubsByIds.instance;
}

function $serverAccessService_engagementClubAccessContext() {
  if (!$serverAccessService_engagementClubAccessContext.instance) $serverAccessService_engagementClubAccessContext.instance = require("./backend/server-access-service/engagement-club-access-context").createAccessService_engagementClubAccessContext({
    get cleanText() { return cleanText; },
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get local$canonicalAccessDirectoryRegionId() { return $serverAccessService_canonicalAccessDirectoryRegionId().canonicalAccessDirectoryRegionId; },
    get local$capabilitiesMap() { return $serverAccessService_capabilitiesMap().capabilitiesMap; },
    get local$engagementClubRegionId() { return $serverAccessService_engagementClubRegionId().engagementClubRegionId; },
    get local$engagementClubsByIds() { return $serverAccessService_engagementClubsByIds().engagementClubsByIds; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_engagementClubAccessContext.instance;
}

function $serverAccessService_cleanFirestoreValue() {
  if (!$serverAccessService_cleanFirestoreValue.instance) $serverAccessService_cleanFirestoreValue.instance = require("./backend/server-access-service/clean-firestore-value").createAccessService_cleanFirestoreValue({

  });
  return $serverAccessService_cleanFirestoreValue.instance;
}

function $serverAccessService_competitionIdFrom() {
  if (!$serverAccessService_competitionIdFrom.instance) $serverAccessService_competitionIdFrom.instance = require("./backend/server-access-service/competition-id-from").createAccessService_competitionIdFrom({
    get cleanText() { return cleanText; },
    get COMPETITION_IDS() { return COMPETITION_IDS; },
    get HttpsError() { return HttpsError; }
  });
  return $serverAccessService_competitionIdFrom.instance;
}

function $serverAccessService_assertAdmin() {
  if (!$serverAccessService_assertAdmin.instance) $serverAccessService_assertAdmin.instance = require("./backend/server-access-service/assert-admin").createAccessService_assertAdmin({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; }
  });
  return $serverAccessService_assertAdmin.instance;
}

function $serverAccessService_assertCapability() {
  if (!$serverAccessService_assertCapability.instance) $serverAccessService_assertCapability.instance = require("./backend/server-access-service/assert-capability").createAccessService_assertCapability({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; }
  });
  return $serverAccessService_assertCapability.instance;
}

function $serverAccessService_assertLivePalmesAccess() {
  if (!$serverAccessService_assertLivePalmesAccess.instance) $serverAccessService_assertLivePalmesAccess.instance = require("./backend/server-access-service/assert-live-palmes-access").createAccessService_assertLivePalmesAccess({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get local$activeCapabilitiesFromMap() { return $serverAccessService_activeCapabilitiesFromMap().activeCapabilitiesFromMap; }
  });
  return $serverAccessService_assertLivePalmesAccess.instance;
}

function $serverAccessService_normalizeEmail() {
  if (!$serverAccessService_normalizeEmail.instance) $serverAccessService_normalizeEmail.instance = require("./backend/server-access-service/normalize-email").createAccessService_normalizeEmail({
    get cleanText() { return cleanText; }
  });
  return $serverAccessService_normalizeEmail.instance;
}

function $serverAccessService_normalizedEngagementRegionKey() {
  if (!$serverAccessService_normalizedEngagementRegionKey.instance) $serverAccessService_normalizedEngagementRegionKey.instance = require("./backend/server-access-service/normalized-engagement-region-key").createAccessService_normalizedEngagementRegionKey({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; }
  });
  return $serverAccessService_normalizedEngagementRegionKey.instance;
}

function $serverAccessService_engagementRegionsMatch() {
  if (!$serverAccessService_engagementRegionsMatch.instance) $serverAccessService_engagementRegionsMatch.instance = require("./backend/server-access-service/engagement-regions-match").createAccessService_engagementRegionsMatch({
    get local$normalizedEngagementRegionKey() { return $serverAccessService_normalizedEngagementRegionKey().normalizedEngagementRegionKey; }
  });
  return $serverAccessService_engagementRegionsMatch.instance;
}

function $serverAccessService_canonicalAccessDirectoryRegionId() {
  if (!$serverAccessService_canonicalAccessDirectoryRegionId.instance) $serverAccessService_canonicalAccessDirectoryRegionId.instance = require("./backend/server-access-service/canonical-access-directory-region-id").createAccessService_canonicalAccessDirectoryRegionId({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get local$normalizedEngagementRegionKey() { return $serverAccessService_normalizedEngagementRegionKey().normalizedEngagementRegionKey; }
  });
  return $serverAccessService_canonicalAccessDirectoryRegionId.instance;
}

function $serverAccessService_assertEmail() {
  if (!$serverAccessService_assertEmail.instance) $serverAccessService_assertEmail.instance = require("./backend/server-access-service/assert-email").createAccessService_assertEmail({
    get HttpsError() { return HttpsError; }
  });
  return $serverAccessService_assertEmail.instance;
}

function $serverAccessService_accessScopeForCapability() {
  if (!$serverAccessService_accessScopeForCapability.instance) $serverAccessService_accessScopeForCapability.instance = require("./backend/server-access-service/access-scope-for-capability").createAccessService_accessScopeForCapability({
    get cleanText() { return cleanText; },
    get ACCESS_CAPABILITY_SET() { return ACCESS_CAPABILITY_SET; },
    get HttpsError() { return HttpsError; },
    get local$assertEmail() { return $serverAccessService_assertEmail().assertEmail; },
    get local$canonicalAccessDirectoryRegionId() { return $serverAccessService_canonicalAccessDirectoryRegionId().canonicalAccessDirectoryRegionId; },
    get local$normalizeEmail() { return $serverAccessService_normalizeEmail().normalizeEmail; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_accessScopeForCapability.instance;
}

function $serverAccessService_capabilitiesMap() {
  if (!$serverAccessService_capabilitiesMap.instance) $serverAccessService_capabilitiesMap.instance = require("./backend/server-access-service/capabilities-map").createAccessService_capabilitiesMap({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; }
  });
  return $serverAccessService_capabilitiesMap.instance;
}

function $serverAccessService_activeCapabilitiesFromMap() {
  if (!$serverAccessService_activeCapabilitiesFromMap.instance) $serverAccessService_activeCapabilitiesFromMap.instance = require("./backend/server-access-service/active-capabilities-from-map").createAccessService_activeCapabilitiesFromMap({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; }
  });
  return $serverAccessService_activeCapabilitiesFromMap.instance;
}

function $serverAccessService_accessDirectoryKeys() {
  if (!$serverAccessService_accessDirectoryKeys.instance) $serverAccessService_accessDirectoryKeys.instance = require("./backend/server-access-service/access-directory-keys").createAccessService_accessDirectoryKeys({
    get local$accessUserRegionIdFromData() { return $serverAccessService_accessUserRegionIdFromData().accessUserRegionIdFromData; },
    get local$activeCapabilitiesFromMap() { return $serverAccessService_activeCapabilitiesFromMap().activeCapabilitiesFromMap; },
    get local$capabilitiesMap() { return $serverAccessService_capabilitiesMap().capabilitiesMap; }
  });
  return $serverAccessService_accessDirectoryKeys.instance;
}

function $serverAccessService_accessDirectoryFilterKey() {
  if (!$serverAccessService_accessDirectoryFilterKey.instance) $serverAccessService_accessDirectoryFilterKey.instance = require("./backend/server-access-service/access-directory-filter-key").createAccessService_accessDirectoryFilterKey({
    get local$accessUserRegionIdFromData() { return $serverAccessService_accessUserRegionIdFromData().accessUserRegionIdFromData; }
  });
  return $serverAccessService_accessDirectoryFilterKey.instance;
}

function $serverAccessService_accessDirectoryIndexStateRef() {
  if (!$serverAccessService_accessDirectoryIndexStateRef.instance) $serverAccessService_accessDirectoryIndexStateRef.instance = require("./backend/server-access-service/access-directory-index-state-ref").createAccessService_accessDirectoryIndexStateRef({
    get ACCESS_DIRECTORY_INDEX_STATE_COLLECTION() { return ACCESS_DIRECTORY_INDEX_STATE_COLLECTION; },
    get db() { return db; }
  });
  return $serverAccessService_accessDirectoryIndexStateRef.instance;
}

function $serverAccessService_accessDirectorySnapshotDocumentId() {
  if (!$serverAccessService_accessDirectorySnapshotDocumentId.instance) $serverAccessService_accessDirectorySnapshotDocumentId.instance = require("./backend/server-access-service/access-directory-snapshot-document-id").createAccessService_accessDirectorySnapshotDocumentId({
    get cleanText() { return cleanText; },
    get ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION; },
    get ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION() { return ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION; },
    get crypto() { return crypto; },
    get db() { return db; }
  });
  return $serverAccessService_accessDirectorySnapshotDocumentId.instance;
}

function $serverAccessService_normalizedAccessScope() {
  if (!$serverAccessService_normalizedAccessScope.instance) $serverAccessService_normalizedAccessScope.instance = require("./backend/server-access-service/normalized-access-scope").createAccessService_normalizedAccessScope({
    get cleanText() { return cleanText; }
  });
  return $serverAccessService_normalizedAccessScope.instance;
}

function $serverAccessService_assertEngagementsAccess() {
  if (!$serverAccessService_assertEngagementsAccess.instance) $serverAccessService_assertEngagementsAccess.instance = require("./backend/server-access-service/assert-engagements-access").createAccessService_assertEngagementsAccess({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get db() { return db; }
  });
  return $serverAccessService_assertEngagementsAccess.instance;
}

function $serverAccessService_engagementAccessContext() {
  if (!$serverAccessService_engagementAccessContext.instance) $serverAccessService_engagementAccessContext.instance = require("./backend/server-access-service/engagement-access-context").createAccessService_engagementAccessContext({
    get cleanText() { return cleanText; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get local$competitionEmailNotificationsEnabled() { return $serverAccessService_competitionEmailNotificationsEnabled().competitionEmailNotificationsEnabled; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_engagementAccessContext.instance;
}

function $serverAccessService_accessManagementContext() {
  if (!$serverAccessService_accessManagementContext.instance) $serverAccessService_accessManagementContext.instance = require("./backend/server-access-service/access-management-context").createAccessService_accessManagementContext({
    get cleanText() { return cleanText; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get local$canonicalAccessDirectoryRegionId() { return $serverAccessService_canonicalAccessDirectoryRegionId().canonicalAccessDirectoryRegionId; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_accessManagementContext.instance;
}

function $serverAccessService_auditManagementContext() {
  if (!$serverAccessService_auditManagementContext.instance) $serverAccessService_auditManagementContext.instance = require("./backend/server-access-service/audit-management-context").createAccessService_auditManagementContext({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get FUNCTIONS_EMULATOR_ACTIVE() { return FUNCTIONS_EMULATOR_ACTIVE; },
    get HttpsError() { return HttpsError; },
    get db() { return db; }
  });
  return $serverAccessService_auditManagementContext.instance;
}

function $serverAccessService_accessUserRegionIdFromData() {
  if (!$serverAccessService_accessUserRegionIdFromData.instance) $serverAccessService_accessUserRegionIdFromData.instance = require("./backend/server-access-service/access-user-region-id-from-data").createAccessService_accessUserRegionIdFromData({
    get cleanText() { return cleanText; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get local$canonicalAccessDirectoryRegionId() { return $serverAccessService_canonicalAccessDirectoryRegionId().canonicalAccessDirectoryRegionId; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_accessUserRegionIdFromData.instance;
}

function $serverAccessService_accessUserCanBeManagedByRegional() {
  if (!$serverAccessService_accessUserCanBeManagedByRegional.instance) $serverAccessService_accessUserCanBeManagedByRegional.instance = require("./backend/server-access-service/access-user-can-be-managed-by-regional").createAccessService_accessUserCanBeManagedByRegional({
    get HttpsError() { return HttpsError; },
    get local$accessUserRegionIdFromData() { return $serverAccessService_accessUserRegionIdFromData().accessUserRegionIdFromData; }
  });
  return $serverAccessService_accessUserCanBeManagedByRegional.instance;
}

function $serverAccessService_displayNameFromProfile() {
  if (!$serverAccessService_displayNameFromProfile.instance) $serverAccessService_displayNameFromProfile.instance = require("./backend/server-access-service/display-name-from-profile").createAccessService_displayNameFromProfile({
    get cleanText() { return cleanText; }
  });
  return $serverAccessService_displayNameFromProfile.instance;
}

function $serverAccessService_accessUserDisplayName() {
  if (!$serverAccessService_accessUserDisplayName.instance) $serverAccessService_accessUserDisplayName.instance = require("./backend/server-access-service/access-user-display-name").createAccessService_accessUserDisplayName({
    get cleanText() { return cleanText; },
    get db() { return db; },
    get local$displayNameFromProfile() { return $serverAccessService_displayNameFromProfile().displayNameFromProfile; }
  });
  return $serverAccessService_accessUserDisplayName.instance;
}

function $serverAccessService_writeAuditLog() {
  if (!$serverAccessService_writeAuditLog.instance) $serverAccessService_writeAuditLog.instance = require("./backend/server-access-service/write-audit-log").createAccessService_writeAuditLog({
    get db() { return db; }
  });
  return $serverAccessService_writeAuditLog.instance;
}

function $serverAccessService_writeAuditLogOnce() {
  if (!$serverAccessService_writeAuditLogOnce.instance) $serverAccessService_writeAuditLogOnce.instance = require("./backend/server-access-service/write-audit-log-once").createAccessService_writeAuditLogOnce({
    get db() { return db; },
    get local$stableHash() { return $serverAccessService_stableHash().stableHash; }
  });
  return $serverAccessService_writeAuditLogOnce.instance;
}

function $serverAccessService_writeAccessGrants() {
  if (!$serverAccessService_writeAccessGrants.instance) $serverAccessService_writeAccessGrants.instance = require("./backend/server-access-service/write-access-grants").createAccessService_writeAccessGrants({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get db() { return db; },
    get local$normalizedAccessScope() { return $serverAccessService_normalizedAccessScope().normalizedAccessScope; }
  });
  return $serverAccessService_writeAccessGrants.instance;
}

function $serverAccessService_assertRole() {
  if (!$serverAccessService_assertRole.instance) $serverAccessService_assertRole.instance = require("./backend/server-access-service/assert-role").createAccessService_assertRole({
    get HttpsError() { return HttpsError; },
    get ROLE_SET() { return ROLE_SET; }
  });
  return $serverAccessService_assertRole.instance;
}

function $serverAccessService_assertPin() {
  if (!$serverAccessService_assertPin.instance) $serverAccessService_assertPin.instance = require("./backend/server-access-service/assert-pin").createAccessService_assertPin({
    get HASH_BYTES() { return HASH_BYTES; },
    get HASH_ITERATIONS() { return HASH_ITERATIONS; },
    get HttpsError() { return HttpsError; },
    get crypto() { return crypto; }
  });
  return $serverAccessService_assertPin.instance;
}

function $serverAccessService_stableHash() {
  if (!$serverAccessService_stableHash.instance) $serverAccessService_stableHash.instance = require("./backend/server-access-service/stable-hash").createAccessService_stableHash({
    get crypto() { return crypto; }
  });
  return $serverAccessService_stableHash.instance;
}

function $serverImportService_activeCompetitionImportData() {
  if (!$serverImportService_activeCompetitionImportData.instance) $serverImportService_activeCompetitionImportData.instance = require("./backend/server-import-service/active-competition-import-data").createImportService_activeCompetitionImportData({
    get POOL_COURSES() { return POOL_COURSES; },
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; },
    get local$ageCategoryFromDates() { return $serverImportService_ageCategoryFromDates().ageCategoryFromDates; },
    get local$categoryCodeFromCategory() { return $serverImportService_categoryCodeFromCategory().categoryCodeFromCategory; },
    get local$fallbackCategoryFromSource() { return $serverImportService_categoryCodeFromCategory().fallbackCategoryFromSource; },
    get local$formatTimeValue() { return $serverImportService_formatTimeValue().formatTimeValue; },
    get local$isYouthCategory() { return $serverImportService_isYouthCategory().isYouthCategory; },
    get local$normalizeCategoryCode() { return $serverImportService_normalizeCategoryCode().normalizeCategoryCode; },
    get local$normalizeCourseCode() { return $serverImportService_normalizeCourseCode().normalizeCourseCode; },
    get local$recordReferenceForPerformance() { return $serverImportService_isYouthCategory().recordReferenceForPerformance; },
    get local$recordReferenceMap() { return $serverImportService_isYouthCategory().recordReferenceMap; },
    get local$sameRecordAlertSwimmer() { return $serverImportService_normalizedRecordAlertName().sameRecordAlertSwimmer; }
  });
  return $serverImportService_activeCompetitionImportData.instance;
}

function $serverImportService_parseTimeValue() {
  if (!$serverImportService_parseTimeValue.instance) $serverImportService_parseTimeValue.instance = require("./backend/server-import-service/parse-time-value").createImportService_parseTimeValue({
    get cleanText() { return cleanText; }
  });
  return $serverImportService_parseTimeValue.instance;
}

function $serverImportService_formatTimeValue() {
  if (!$serverImportService_formatTimeValue.instance) $serverImportService_formatTimeValue.instance = require("./backend/server-import-service/format-time-value").createImportService_formatTimeValue({

  });
  return $serverImportService_formatTimeValue.instance;
}

function $serverImportService_normalizeCourseCode() {
  if (!$serverImportService_normalizeCourseCode.instance) $serverImportService_normalizeCourseCode.instance = require("./backend/server-import-service/normalize-course-code").createImportService_normalizeCourseCode({
    get cleanText() { return cleanText; }
  });
  return $serverImportService_normalizeCourseCode.instance;
}

function $serverImportService_normalizeCategoryCode() {
  if (!$serverImportService_normalizeCategoryCode.instance) $serverImportService_normalizeCategoryCode.instance = require("./backend/server-import-service/normalize-category-code").createImportService_normalizeCategoryCode({
    get cleanText() { return cleanText; }
  });
  return $serverImportService_normalizeCategoryCode.instance;
}

function $serverImportService_ageCategoryFromDates() {
  if (!$serverImportService_ageCategoryFromDates.instance) $serverImportService_ageCategoryFromDates.instance = require("./backend/server-import-service/age-category-from-dates").createImportService_ageCategoryFromDates({
    get local$importSeasonYear() { return $serverImportService_importSeasonYear().importSeasonYear; }
  });
  return $serverImportService_ageCategoryFromDates.instance;
}

function $serverImportService_performanceCategoryFromRow() {
  if (!$serverImportService_performanceCategoryFromRow.instance) $serverImportService_performanceCategoryFromRow.instance = require("./backend/server-import-service/performance-category-from-row").createImportService_performanceCategoryFromRow({
    get cleanText() { return cleanText; },
    get local$ageCategoryFromDates() { return $serverImportService_ageCategoryFromDates().ageCategoryFromDates; },
    get local$fallbackCategoryFromSource() { return $serverImportService_categoryCodeFromCategory().fallbackCategoryFromSource; }
  });
  return $serverImportService_performanceCategoryFromRow.instance;
}

function $serverImportService_categoryCodeFromCategory() {
  if (!$serverImportService_categoryCodeFromCategory.instance) $serverImportService_categoryCodeFromCategory.instance = require("./backend/server-import-service/category-code-from-category").createImportService_categoryCodeFromCategory({
    get local$normalizeCategoryCode() { return $serverImportService_normalizeCategoryCode().normalizeCategoryCode; }
  });
  return $serverImportService_categoryCodeFromCategory.instance;
}

function $serverImportService_loadPerformanceRecordsData() {
  if (!$serverImportService_loadPerformanceRecordsData.instance) $serverImportService_loadPerformanceRecordsData.instance = require("./backend/server-import-service/load-performance-records-data").createImportService_loadPerformanceRecordsData({
    get db() { return db; }
  });
  return $serverImportService_loadPerformanceRecordsData.instance;
}

function $serverImportService_isYouthCategory() {
  if (!$serverImportService_isYouthCategory.instance) $serverImportService_isYouthCategory.instance = require("./backend/server-import-service/is-youth-category").createImportService_isYouthCategory({
    get cleanText() { return cleanText; },
    get local$normalizeCategoryCode() { return $serverImportService_normalizeCategoryCode().normalizeCategoryCode; },
    get local$normalizeCourseCode() { return $serverImportService_normalizeCourseCode().normalizeCourseCode; }
  });
  return $serverImportService_isYouthCategory.instance;
}

function $serverImportService_engagementRelayReferenceCourseCode() {
  if (!$serverImportService_engagementRelayReferenceCourseCode.instance) $serverImportService_engagementRelayReferenceCourseCode.instance = require("./backend/server-import-service/engagement-relay-reference-course-code").createImportService_engagementRelayReferenceCourseCode({
    get cleanText() { return cleanText; },
    get local$normalizeCourseCode() { return $serverImportService_normalizeCourseCode().normalizeCourseCode; }
  });
  return $serverImportService_engagementRelayReferenceCourseCode.instance;
}

function $serverImportService_normalizedRecordAlertName() {
  if (!$serverImportService_normalizedRecordAlertName.instance) $serverImportService_normalizedRecordAlertName.instance = require("./backend/server-import-service/normalized-record-alert-name").createImportService_normalizedRecordAlertName({
    get normalizeIdentityText() { return normalizeIdentityText; }
  });
  return $serverImportService_normalizedRecordAlertName.instance;
}

function $serverImportService_isAlreadyPublishedRecordAlert() {
  if (!$serverImportService_isAlreadyPublishedRecordAlert.instance) $serverImportService_isAlreadyPublishedRecordAlert.instance = require("./backend/server-import-service/is-already-published-record-alert").createImportService_isAlreadyPublishedRecordAlert({
    get cleanText() { return cleanText; },
    get local$sameRecordAlertSwimmer() { return $serverImportService_normalizedRecordAlertName().sameRecordAlertSwimmer; }
  });
  return $serverImportService_isAlreadyPublishedRecordAlert.instance;
}

function $serverImportService_resolveIntranapSwimmer() {
  if (!$serverImportService_resolveIntranapSwimmer.instance) $serverImportService_resolveIntranapSwimmer.instance = require("./backend/server-import-service/resolve-intranap-swimmer").createImportService_resolveIntranapSwimmer({
    get swimmerIdentityKey() { return swimmerIdentityKey; },
    get cleanText() { return cleanText; },
    get intranapSwimmerLookup() { return intranapSwimmerLookup; },
    get local$normalizeCategoryCode() { return $serverImportService_normalizeCategoryCode().normalizeCategoryCode; }
  });
  return $serverImportService_resolveIntranapSwimmer.instance;
}

function $serverImportService_competitionImportExistingSummary() {
  if (!$serverImportService_competitionImportExistingSummary.instance) $serverImportService_competitionImportExistingSummary.instance = require("./backend/server-import-service/competition-import-existing-summary").createImportService_competitionImportExistingSummary({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get db() { return db; },
    get importPublicationStatus() { return importPublicationStatus; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get local$activeCompetitionImportData() { return $serverImportService_activeCompetitionImportData().activeCompetitionImportData; },
    get local$normalizeCategoryCode() { return $serverImportService_normalizeCategoryCode().normalizeCategoryCode; },
    get local$resolveIntranapSwimmer() { return $serverImportService_resolveIntranapSwimmer().resolveIntranapSwimmer; }
  });
  return $serverImportService_competitionImportExistingSummary.instance;
}

function $serverImportService_coursePayload() {
  if (!$serverImportService_coursePayload.instance) $serverImportService_coursePayload.instance = require("./backend/server-import-service/course-payload").createImportService_coursePayload({
    get courseLengthFromCode() { return courseLengthFromCode; },
    get courseStyleFromCode() { return courseStyleFromCode; },
    get COURSE_META() { return COURSE_META; }
  });
  return $serverImportService_coursePayload.instance;
}

function $serverImportService_importSeasonYear() {
  if (!$serverImportService_importSeasonYear.instance) $serverImportService_importSeasonYear.instance = require("./backend/server-import-service/import-season-year").createImportService_importSeasonYear({

  });
  return $serverImportService_importSeasonYear.instance;
}

function $serverImportService_currentEngagementSeasonInfo() {
  if (!$serverImportService_currentEngagementSeasonInfo.instance) $serverImportService_currentEngagementSeasonInfo.instance = require("./backend/server-import-service/current-engagement-season-info").createImportService_currentEngagementSeasonInfo({

  });
  return $serverImportService_currentEngagementSeasonInfo.instance;
}

function $serverImportService_cleanEngagementLicenseSeasonStatus() {
  if (!$serverImportService_cleanEngagementLicenseSeasonStatus.instance) $serverImportService_cleanEngagementLicenseSeasonStatus.instance = require("./backend/server-import-service/clean-engagement-license-season-status").createImportService_cleanEngagementLicenseSeasonStatus({
    get ENGAGEMENT_LICENSE_SEASON_STATUSES() { return ENGAGEMENT_LICENSE_SEASON_STATUSES; },
    get ENGAGEMENT_LICENSE_VERIFICATION_STATUSES() { return ENGAGEMENT_LICENSE_VERIFICATION_STATUSES; },
    get cleanText() { return cleanText; },
    get local$currentEngagementSeasonInfo() { return $serverImportService_currentEngagementSeasonInfo().currentEngagementSeasonInfo; }
  });
  return $serverImportService_cleanEngagementLicenseSeasonStatus.instance;
}

function $serverImportService_engagementSeasonEndYearFromIsoDate() {
  if (!$serverImportService_engagementSeasonEndYearFromIsoDate.instance) $serverImportService_engagementSeasonEndYearFromIsoDate.instance = require("./backend/server-import-service/engagement-season-end-year-from-iso-date").createImportService_engagementSeasonEndYearFromIsoDate({
    get cleanIsoDate() { return cleanIsoDate; },
    get local$currentEngagementSeasonInfo() { return $serverImportService_currentEngagementSeasonInfo().currentEngagementSeasonInfo; },
    get local$importSeasonYear() { return $serverImportService_importSeasonYear().importSeasonYear; }
  });
  return $serverImportService_engagementSeasonEndYearFromIsoDate.instance;
}

function $serverImportService_engagementSeasonBoundsFromEndYear() {
  if (!$serverImportService_engagementSeasonBoundsFromEndYear.instance) $serverImportService_engagementSeasonBoundsFromEndYear.instance = require("./backend/server-import-service/engagement-season-bounds-from-end-year").createImportService_engagementSeasonBoundsFromEndYear({
    get local$currentEngagementSeasonInfo() { return $serverImportService_currentEngagementSeasonInfo().currentEngagementSeasonInfo; }
  });
  return $serverImportService_engagementSeasonBoundsFromEndYear.instance;
}

function $serverImportService_currentEngagementCategoryFromBirthDate() {
  if (!$serverImportService_currentEngagementCategoryFromBirthDate.instance) $serverImportService_currentEngagementCategoryFromBirthDate.instance = require("./backend/server-import-service/current-engagement-category-from-birth-date").createImportService_currentEngagementCategoryFromBirthDate({
    get local$ageCategoryFromDates() { return $serverImportService_ageCategoryFromDates().ageCategoryFromDates; }
  });
  return $serverImportService_currentEngagementCategoryFromBirthDate.instance;
}

function $serverImportService_assertPinAttemptAllowed() {
  if (!$serverImportService_assertPinAttemptAllowed.instance) $serverImportService_assertPinAttemptAllowed.instance = require("./backend/server-import-service/assert-pin-attempt-allowed").createImportService_assertPinAttemptAllowed({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get crypto() { return crypto; },
    get db() { return db; },
    get stableHash() { return stableHash; }
  });
  return $serverImportService_assertPinAttemptAllowed.instance;
}

function $serverImportService_roleUid() {
  if (!$serverImportService_roleUid.instance) $serverImportService_roleUid.instance = require("./backend/server-import-service/role-uid").createImportService_roleUid({
    get cleanText() { return cleanText; },
    get crypto() { return crypto; }
  });
  return $serverImportService_roleUid.instance;
}

function $serverImportService_liveDataRef() {
  if (!$serverImportService_liveDataRef.instance) $serverImportService_liveDataRef.instance = require("./backend/server-import-service/live-data-ref").createImportService_liveDataRef({
    get db() { return db; }
  });
  return $serverImportService_liveDataRef.instance;
}

function $serverImportService_rolePinsRef() {
  if (!$serverImportService_rolePinsRef.instance) $serverImportService_rolePinsRef.instance = require("./backend/server-import-service/role-pins-ref").createImportService_rolePinsRef({
    get db() { return db; }
  });
  return $serverImportService_rolePinsRef.instance;
}

function $serverImportService_consoleGrantRef() {
  if (!$serverImportService_consoleGrantRef.instance) $serverImportService_consoleGrantRef.instance = require("./backend/server-import-service/console-grant-ref").createImportService_consoleGrantRef({
    get db() { return db; }
  });
  return $serverImportService_consoleGrantRef.instance;
}

function $serverConsoleService_assertConsolePortalAccess() {
  if (!$serverConsoleService_assertConsolePortalAccess.instance) $serverConsoleService_assertConsolePortalAccess.instance = require("./backend/server-console-service/assert-console-portal-access").createConsoleService_assertConsolePortalAccess({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get PIN_LOCK_MS_BY_LEVEL() { return PIN_LOCK_MS_BY_LEVEL; },
    get PIN_MAX_FAILED_ATTEMPTS() { return PIN_MAX_FAILED_ATTEMPTS; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; },
    get lockMessage() { return lockMessage; },
    get lockRemainingSeconds() { return lockRemainingSeconds; },
    get stableHash() { return stableHash; }
  });
  return $serverConsoleService_assertConsolePortalAccess.instance;
}

function $serverConsoleService_updatePublicPinNotes() {
  if (!$serverConsoleService_updatePublicPinNotes.instance) $serverConsoleService_updatePublicPinNotes.instance = require("./backend/server-console-service/update-public-pin-notes").createConsoleService_updatePublicPinNotes({
    get db() { return db; },
    get liveDataRef() { return liveDataRef; }
  });
  return $serverConsoleService_updatePublicPinNotes.instance;
}

function $serverConsoleService_assertComputerPdfAccess() {
  if (!$serverConsoleService_assertComputerPdfAccess.instance) $serverConsoleService_assertComputerPdfAccess.instance = require("./backend/server-console-service/assert-computer-pdf-access").createConsoleService_assertComputerPdfAccess({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get consoleGrantRef() { return consoleGrantRef; }
  });
  return $serverConsoleService_assertComputerPdfAccess.instance;
}

function $serverDirectoryService_cleanEngagementAccessRequestPayload() {
  if (!$serverDirectoryService_cleanEngagementAccessRequestPayload.instance) $serverDirectoryService_cleanEngagementAccessRequestPayload.instance = require("./backend/server-directory-service/clean-engagement-access-request-payload").createDirectoryService_cleanEngagementAccessRequestPayload({
    get CLUB_REFERENCE_BY_FEDERAL_NUMBER() { return CLUB_REFERENCE_BY_FEDERAL_NUMBER; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertEmail() { return assertEmail; },
    get auth() { return auth; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubRegionId() { return engagementClubRegionId; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverDirectoryService_cleanEngagementAccessRequestPayload.instance;
}

function $serverDirectoryService_engagementAccessRequestItem() {
  if (!$serverDirectoryService_engagementAccessRequestItem.instance) $serverDirectoryService_engagementAccessRequestItem.instance = require("./backend/server-directory-service/engagement-access-request-item").createDirectoryService_engagementAccessRequestItem({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; }
  });
  return $serverDirectoryService_engagementAccessRequestItem.instance;
}

function $serverDirectoryService_assertEngagementAccessRequestScope() {
  if (!$serverDirectoryService_assertEngagementAccessRequestScope.instance) $serverDirectoryService_assertEngagementAccessRequestScope.instance = require("./backend/server-directory-service/assert-engagement-access-request-scope").createDirectoryService_assertEngagementAccessRequestScope({
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get cleanClubPayload() { return cleanClubPayload; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessRejection() { return require("./portal-access-mail").engagementAccessRejection; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nodemailer() { return nodemailer; },
    get publicEngagementClubDirectoryRef() { return publicEngagementClubDirectoryRef; },
    get publicEngagementClubItem() { return publicEngagementClubItem; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$findEngagementClubByFederalNumber() { return $serverDirectoryService_cleanEngagementAccessRequestPayload().findEngagementClubByFederalNumber; }
  });
  return $serverDirectoryService_assertEngagementAccessRequestScope.instance;
}

function $serverDirectoryService_consumePublicAccessRequestRateLimit() {
  if (!$serverDirectoryService_consumePublicAccessRequestRateLimit.instance) $serverDirectoryService_consumePublicAccessRequestRateLimit.instance = require("./backend/server-directory-service/consume-public-access-request-rate-limit").createDirectoryService_consumePublicAccessRequestRateLimit({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get ENGAGEMENT_CLUBS_COLLECTION() { return ENGAGEMENT_CLUBS_COLLECTION; },
    get CLUB_REFERENCE_BY_ID() { return CLUB_REFERENCE_BY_ID; },
    get engagementStoredClubItem() { return engagementStoredClubItem; },
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get HttpsError() { return HttpsError; },
    get PORTAL_ACCESS_RATE_LIMIT_COLLECTION() { return PORTAL_ACCESS_RATE_LIMIT_COLLECTION; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessAcknowledgement() { return require("./portal-access-mail").engagementAccessAcknowledgement; },
    get engagementAccessAdminNotification() { return require("./portal-access-mail").engagementAccessAdminNotification; },
    get engagementAccessAdminNotificationRecipients() { return require("./portal-access-mail").engagementAccessAdminNotificationRecipients; },
    get engagementActiveMailRecipients() { return engagementActiveMailRecipients; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubName() { return engagementClubName; },
    get engagementExistingAccountNotice() { return require("./portal-access-mail").engagementExistingAccountNotice; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nextPortalAccessRateLimit() { return nextPortalAccessRateLimit; },
    get nodemailer() { return nodemailer; },
    get stableHash() { return stableHash; },
    get local$engagementAccessExistingClubPayload() { return $serverDirectoryService_cleanEngagementAccessRequestPayload().engagementAccessExistingClubPayload; },
    get local$findEngagementClubByFederalNumber() { return $serverDirectoryService_cleanEngagementAccessRequestPayload().findEngagementClubByFederalNumber; }
  });
  return $serverDirectoryService_consumePublicAccessRequestRateLimit.instance;
}

function $serverDirectoryService_accessUserListItemFromData() {
  if (!$serverDirectoryService_accessUserListItemFromData.instance) $serverDirectoryService_accessUserListItemFromData.instance = require("./backend/server-directory-service/access-user-list-item-from-data").createDirectoryService_accessUserListItemFromData({
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; }
  });
  return $serverDirectoryService_accessUserListItemFromData.instance;
}

function $serverDirectoryService_accessUserContainsSearch() {
  if (!$serverDirectoryService_accessUserContainsSearch.instance) $serverDirectoryService_accessUserContainsSearch.instance = require("./backend/server-directory-service/access-user-contains-search").createDirectoryService_accessUserContainsSearch({
    get cleanText() { return cleanText; },
    get db() { return db; },
    get local$accessUserListItemFromData() { return $serverDirectoryService_accessUserListItemFromData().accessUserListItemFromData; }
  });
  return $serverDirectoryService_accessUserContainsSearch.instance;
}

function $serverDirectoryService_accessDirectorySnapshotEntry() {
  if (!$serverDirectoryService_accessDirectorySnapshotEntry.instance) $serverDirectoryService_accessDirectorySnapshotEntry.instance = require("./backend/server-directory-service/access-directory-snapshot-entry").createDirectoryService_accessDirectorySnapshotEntry({
    get ACCESS_DIRECTORY_SNAPSHOT_VERSION() { return ACCESS_DIRECTORY_SNAPSHOT_VERSION; },
    get accessDirectorySnapshotRef() { return accessDirectorySnapshotRef; },
    get accessUserRegionIdFromData() { return accessUserRegionIdFromData; },
    get local$accessUserListItemFromData() { return $serverDirectoryService_accessUserListItemFromData().accessUserListItemFromData; }
  });
  return $serverDirectoryService_accessDirectorySnapshotEntry.instance;
}

function $serverDirectoryService_sameAccessDirectorySnapshotEntry() {
  if (!$serverDirectoryService_sameAccessDirectorySnapshotEntry.instance) $serverDirectoryService_sameAccessDirectorySnapshotEntry.instance = require("./backend/server-directory-service/same-access-directory-snapshot-entry").createDirectoryService_sameAccessDirectorySnapshotEntry({

  });
  return $serverDirectoryService_sameAccessDirectorySnapshotEntry.instance;
}

function $serverDirectoryService_accessUserDeletionRequestItem() {
  if (!$serverDirectoryService_accessUserDeletionRequestItem.instance) $serverDirectoryService_accessUserDeletionRequestItem.instance = require("./backend/server-directory-service/access-user-deletion-request-item").createDirectoryService_accessUserDeletionRequestItem({

  });
  return $serverDirectoryService_accessUserDeletionRequestItem.instance;
}

function $serverDirectoryService_deleteAccessUserAccount() {
  if (!$serverDirectoryService_deleteAccessUserAccount.instance) $serverDirectoryService_deleteAccessUserAccount.instance = require("./backend/server-directory-service/delete-access-user-account").createDirectoryService_deleteAccessUserAccount({
    get ACCESS_CAPABILITIES() { return ACCESS_CAPABILITIES; },
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get auth() { return auth; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $serverDirectoryService_deleteAccessUserAccount.instance;
}

function $serverDirectoryService_setCompetitionEmailNotificationPreference() {
  if (!$serverDirectoryService_setCompetitionEmailNotificationPreference.instance) $serverDirectoryService_setCompetitionEmailNotificationPreference.instance = require("./backend/server-directory-service/set-competition-email-notification-preference").createDirectoryService_setCompetitionEmailNotificationPreference({
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexKey() { return engagementMailRecipientIndexKey; },
    get engagementMailRecipientShardNumber() { return engagementMailRecipientShardNumber; },
    get engagementMailRecipientShardRef() { return engagementMailRecipientShardRef; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $serverDirectoryService_setCompetitionEmailNotificationPreference.instance;
}

function $serverCompetitionModelService_cleanIsoDate() {
  if (!$serverCompetitionModelService_cleanIsoDate.instance) $serverCompetitionModelService_cleanIsoDate.instance = require("./backend/server-competition-model-service/clean-iso-date").createCompetitionModelService_cleanIsoDate({
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanIsoDate.instance;
}

function $serverCompetitionModelService_cleanEngagementCompetitionLevel() {
  if (!$serverCompetitionModelService_cleanEngagementCompetitionLevel.instance) $serverCompetitionModelService_cleanEngagementCompetitionLevel.instance = require("./backend/server-competition-model-service/clean-engagement-competition-level").createCompetitionModelService_cleanEngagementCompetitionLevel({
    get ENGAGEMENT_COMPETITION_LEVELS() { return ENGAGEMENT_COMPETITION_LEVELS; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementCompetitionLevel.instance;
}

function $serverCompetitionModelService_cleanEngagementEntryStatus() {
  if (!$serverCompetitionModelService_cleanEngagementEntryStatus.instance) $serverCompetitionModelService_cleanEngagementEntryStatus.instance = require("./backend/server-competition-model-service/clean-engagement-entry-status").createCompetitionModelService_cleanEngagementEntryStatus({
    get ENGAGEMENT_ENTRY_STATUSES() { return ENGAGEMENT_ENTRY_STATUSES; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementEntryStatus.instance;
}

function $serverCompetitionModelService_cleanEngagementCompetitionType() {
  if (!$serverCompetitionModelService_cleanEngagementCompetitionType.instance) $serverCompetitionModelService_cleanEngagementCompetitionType.instance = require("./backend/server-competition-model-service/clean-engagement-competition-type").createCompetitionModelService_cleanEngagementCompetitionType({
    get ENGAGEMENT_COMPETITION_TYPES() { return ENGAGEMENT_COMPETITION_TYPES; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementCompetitionType.instance;
}

function $serverCompetitionModelService_cleanEngagementPoolLaneCount() {
  if (!$serverCompetitionModelService_cleanEngagementPoolLaneCount.instance) $serverCompetitionModelService_cleanEngagementPoolLaneCount.instance = require("./backend/server-competition-model-service/clean-engagement-pool-lane-count").createCompetitionModelService_cleanEngagementPoolLaneCount({
    get ENGAGEMENT_WATER_BODY_TYPES() { return ENGAGEMENT_WATER_BODY_TYPES; },
    get HttpsError() { return HttpsError; },
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanPublicCalendarPublicationStatus() { return cleanPublicCalendarPublicationStatus; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; },
    get local$cleanEngagementCompetitionEvents() { return $serverCompetitionModelService_cleanEngagementCompetitionEvents().cleanEngagementCompetitionEvents; },
    get local$cleanEngagementCompetitionLevel() { return $serverCompetitionModelService_cleanEngagementCompetitionLevel().cleanEngagementCompetitionLevel; },
    get local$cleanEngagementCompetitionType() { return $serverCompetitionModelService_cleanEngagementCompetitionType().cleanEngagementCompetitionType; },
    get local$cleanEngagementEntryStatus() { return $serverCompetitionModelService_cleanEngagementEntryStatus().cleanEngagementEntryStatus; },
    get local$cleanEngagementMaxEventsPerSwimmer() { return $serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer().cleanEngagementMaxEventsPerSwimmer; },
    get local$cleanEngagementMissingEntryTimeMode() { return $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode().cleanEngagementMissingEntryTimeMode; },
    get local$cleanEngagementPoolLength() { return $serverCompetitionModelService_cleanEngagementPoolLength().cleanEngagementPoolLength; },
    get local$cleanEngagementProgramSessions() { return $serverCompetitionModelService_cleanEngagementProgramSessions().cleanEngagementProgramSessions; },
    get local$cleanEngagementQualificationTimesMode() { return $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode().cleanEngagementQualificationTimesMode; },
    get local$cleanEngagementTimingType() { return $serverCompetitionModelService_cleanEngagementPoolLength().cleanEngagementTimingType; },
    get local$cleanIsoDate() { return $serverCompetitionModelService_cleanIsoDate().cleanIsoDate; },
    get local$isNationalOnlyEngagementCompetitionLevel() { return $serverCompetitionModelService_cleanEngagementCompetitionLevel().isNationalOnlyEngagementCompetitionLevel; }
  });
  return $serverCompetitionModelService_cleanEngagementPoolLaneCount.instance;
}

function $serverCompetitionModelService_cleanEngagementOpenWaterCourse() {
  if (!$serverCompetitionModelService_cleanEngagementOpenWaterCourse.instance) $serverCompetitionModelService_cleanEngagementOpenWaterCourse.instance = require("./backend/server-competition-model-service/clean-engagement-open-water-course").createCompetitionModelService_cleanEngagementOpenWaterCourse({
    get ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES() { return ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementOpenWaterCourse.instance;
}

function $serverCompetitionModelService_cleanEngagementOpenWaterCourses() {
  if (!$serverCompetitionModelService_cleanEngagementOpenWaterCourses.instance) $serverCompetitionModelService_cleanEngagementOpenWaterCourses.instance = require("./backend/server-competition-model-service/clean-engagement-open-water-courses").createCompetitionModelService_cleanEngagementOpenWaterCourses({
    get ENGAGEMENT_CONFIGURATION_COLLECTION() { return ENGAGEMENT_CONFIGURATION_COLLECTION; },
    get ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID() { return ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID; },
    get ENGAGEMENT_OPEN_WATER_COURSE_LIMIT() { return ENGAGEMENT_OPEN_WATER_COURSE_LIMIT; },
    get ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES() { return ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES; },
    get db() { return db; },
    get local$cleanEngagementOpenWaterCourse() { return $serverCompetitionModelService_cleanEngagementOpenWaterCourse().cleanEngagementOpenWaterCourse; }
  });
  return $serverCompetitionModelService_cleanEngagementOpenWaterCourses.instance;
}

function $serverCompetitionModelService_cleanEngagementCompetitionEvents() {
  if (!$serverCompetitionModelService_cleanEngagementCompetitionEvents.instance) $serverCompetitionModelService_cleanEngagementCompetitionEvents.instance = require("./backend/server-competition-model-service/clean-engagement-competition-events").createCompetitionModelService_cleanEngagementCompetitionEvents({
    get ENGAGEMENT_CATEGORY_CODE_SET() { return ENGAGEMENT_CATEGORY_CODE_SET; },
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementRelayMixedMode() { return cleanEngagementRelayMixedMode; },
    get cleanText() { return cleanText; },
    get engagementCategoryCodesForEvent() { return engagementCategoryCodesForEvent; },
    get normalizeEngagementEventCategoryRestrictions() { return normalizeEngagementEventCategoryRestrictions; },
    get local$cleanEngagementCompetitionType() { return $serverCompetitionModelService_cleanEngagementCompetitionType().cleanEngagementCompetitionType; },
    get local$cleanEngagementOpenWaterCourse() { return $serverCompetitionModelService_cleanEngagementOpenWaterCourse().cleanEngagementOpenWaterCourse; }
  });
  return $serverCompetitionModelService_cleanEngagementCompetitionEvents.instance;
}

function $serverCompetitionModelService_cleanOptionalEmail() {
  if (!$serverCompetitionModelService_cleanOptionalEmail.instance) $serverCompetitionModelService_cleanOptionalEmail.instance = require("./backend/server-competition-model-service/clean-optional-email").createCompetitionModelService_cleanOptionalEmail({
    get HttpsError() { return HttpsError; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverCompetitionModelService_cleanOptionalEmail.instance;
}

function $serverCompetitionModelService_cleanEngagementPoolLength() {
  if (!$serverCompetitionModelService_cleanEngagementPoolLength.instance) $serverCompetitionModelService_cleanEngagementPoolLength.instance = require("./backend/server-competition-model-service/clean-engagement-pool-length").createCompetitionModelService_cleanEngagementPoolLength({
    get ENGAGEMENT_POOL_LENGTHS() { return ENGAGEMENT_POOL_LENGTHS; },
    get ENGAGEMENT_TIMING_TYPES() { return ENGAGEMENT_TIMING_TYPES; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementPoolLength.instance;
}

function $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode() {
  if (!$serverCompetitionModelService_cleanEngagementMissingEntryTimeMode.instance) $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode.instance = require("./backend/server-competition-model-service/clean-engagement-missing-entry-time-mode").createCompetitionModelService_cleanEngagementMissingEntryTimeMode({
    get ENGAGEMENT_MISSING_ENTRY_TIME_MODES() { return ENGAGEMENT_MISSING_ENTRY_TIME_MODES; },
    get ENGAGEMENT_QUALIFICATION_TIME_MODES() { return ENGAGEMENT_QUALIFICATION_TIME_MODES; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode.instance;
}

function $serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer() {
  if (!$serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer.instance) $serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer.instance = require("./backend/server-competition-model-service/clean-engagement-max-events-per-swimmer").createCompetitionModelService_cleanEngagementMaxEventsPerSwimmer({

  });
  return $serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer.instance;
}

function $serverCompetitionModelService_cleanEngagementFeeAmount() {
  if (!$serverCompetitionModelService_cleanEngagementFeeAmount.instance) $serverCompetitionModelService_cleanEngagementFeeAmount.instance = require("./backend/server-competition-model-service/clean-engagement-fee-amount").createCompetitionModelService_cleanEngagementFeeAmount({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get local$engagementCompetitionCalendarItem() { return $serverCompetitionModelService_cleanEngagementPoolLaneCount().engagementCompetitionCalendarItem; }
  });
  return $serverCompetitionModelService_cleanEngagementFeeAmount.instance;
}

function $serverCompetitionModelService_cleanEngagementProgramSessions() {
  if (!$serverCompetitionModelService_cleanEngagementProgramSessions.instance) $serverCompetitionModelService_cleanEngagementProgramSessions.instance = require("./backend/server-competition-model-service/clean-engagement-program-sessions").createCompetitionModelService_cleanEngagementProgramSessions({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get ENGAGEMENT_PROGRAM_PHASES() { return ENGAGEMENT_PROGRAM_PHASES; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get local$cleanIsoDate() { return $serverCompetitionModelService_cleanIsoDate().cleanIsoDate; }
  });
  return $serverCompetitionModelService_cleanEngagementProgramSessions.instance;
}

function $serverCompetitionModelService_engagementCompetitionCalendarRef() {
  if (!$serverCompetitionModelService_engagementCompetitionCalendarRef.instance) $serverCompetitionModelService_engagementCompetitionCalendarRef.instance = require("./backend/server-competition-model-service/engagement-competition-calendar-ref").createCompetitionModelService_engagementCompetitionCalendarRef({
    get ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION() { return ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION; }
  });
  return $serverCompetitionModelService_engagementCompetitionCalendarRef.instance;
}

function $serverCompetitionModelService_engagementCalendarEventCalendarRef() {
  if (!$serverCompetitionModelService_engagementCalendarEventCalendarRef.instance) $serverCompetitionModelService_engagementCalendarEventCalendarRef.instance = require("./backend/server-competition-model-service/engagement-calendar-event-calendar-ref").createCompetitionModelService_engagementCalendarEventCalendarRef({
    get ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION; },
    get local$engagementCalendarEventCalendarItem() { return $serverCompetitionModelService_engagementCalendarEventCalendarItem().engagementCalendarEventCalendarItem; }
  });
  return $serverCompetitionModelService_engagementCalendarEventCalendarRef.instance;
}

function $serverCompetitionModelService_cleanEngagementCalendarEventPayload() {
  if (!$serverCompetitionModelService_cleanEngagementCalendarEventPayload.instance) $serverCompetitionModelService_cleanEngagementCalendarEventPayload.instance = require("./backend/server-competition-model-service/clean-engagement-calendar-event-payload").createCompetitionModelService_cleanEngagementCalendarEventPayload({
    get HttpsError() { return HttpsError; },
    get PUBLIC_CALENDAR_EVENT_TYPES() { return PUBLIC_CALENDAR_EVENT_TYPES; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanPublicCalendarEventType() { return cleanPublicCalendarEventType; },
    get cleanPublicCalendarLevel() { return cleanPublicCalendarLevel; },
    get cleanPublicCalendarProgram() { return cleanPublicCalendarProgram; },
    get cleanPublicCalendarUrl() { return cleanPublicCalendarUrl; },
    get cleanText() { return cleanText; },
    get local$cleanIsoDate() { return $serverCompetitionModelService_cleanIsoDate().cleanIsoDate; },
    get local$isNationalOnlyEngagementCompetitionLevel() { return $serverCompetitionModelService_cleanEngagementCompetitionLevel().isNationalOnlyEngagementCompetitionLevel; }
  });
  return $serverCompetitionModelService_cleanEngagementCalendarEventPayload.instance;
}

function $serverCompetitionModelService_engagementCalendarEventCalendarItem() {
  if (!$serverCompetitionModelService_engagementCalendarEventCalendarItem.instance) $serverCompetitionModelService_engagementCalendarEventCalendarItem.instance = require("./backend/server-competition-model-service/engagement-calendar-event-calendar-item").createCompetitionModelService_engagementCalendarEventCalendarItem({
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanPublicCalendarEventType() { return cleanPublicCalendarEventType; },
    get cleanPublicCalendarLevel() { return cleanPublicCalendarLevel; },
    get cleanPublicCalendarPublicationStatus() { return cleanPublicCalendarPublicationStatus; },
    get cleanPublicCalendarUrl() { return cleanPublicCalendarUrl; },
    get cleanText() { return cleanText; },
    get local$cleanIsoDate() { return $serverCompetitionModelService_cleanIsoDate().cleanIsoDate; }
  });
  return $serverCompetitionModelService_engagementCalendarEventCalendarItem.instance;
}

function $serverCompetitionModelService_engagementCalendarEventDetailItem() {
  if (!$serverCompetitionModelService_engagementCalendarEventDetailItem.instance) $serverCompetitionModelService_engagementCalendarEventDetailItem.instance = require("./backend/server-competition-model-service/engagement-calendar-event-detail-item").createCompetitionModelService_engagementCalendarEventDetailItem({
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanPublicCalendarProgram() { return cleanPublicCalendarProgram; },
    get cleanText() { return cleanText; },
    get local$engagementCalendarEventCalendarItem() { return $serverCompetitionModelService_engagementCalendarEventCalendarItem().engagementCalendarEventCalendarItem; }
  });
  return $serverCompetitionModelService_engagementCalendarEventDetailItem.instance;
}

function $serverCompetitionModelService_engagementClubCompetitionIndexKey() {
  if (!$serverCompetitionModelService_engagementClubCompetitionIndexKey.instance) $serverCompetitionModelService_engagementClubCompetitionIndexKey.instance = require("./backend/server-competition-model-service/engagement-club-competition-index-key").createCompetitionModelService_engagementClubCompetitionIndexKey({
    get ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION() { return ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION; },
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverCompetitionModelService_engagementClubCompetitionIndexKey.instance;
}

function $serverCompetitionModelService_engagementClosureQueueRef() {
  if (!$serverCompetitionModelService_engagementClosureQueueRef.instance) $serverCompetitionModelService_engagementClosureQueueRef.instance = require("./backend/server-competition-model-service/engagement-closure-queue-ref").createCompetitionModelService_engagementClosureQueueRef({
    get ENGAGEMENT_CLOSURE_QUEUE_COLLECTION() { return ENGAGEMENT_CLOSURE_QUEUE_COLLECTION; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_engagementClosureQueueRef.instance;
}

function $serverCompetitionModelService_engagementClosureQueueItem() {
  if (!$serverCompetitionModelService_engagementClosureQueueItem.instance) $serverCompetitionModelService_engagementClosureQueueItem.instance = require("./backend/server-competition-model-service/engagement-closure-queue-item").createCompetitionModelService_engagementClosureQueueItem({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanText() { return cleanText; },
    get local$cleanEngagementCompetitionLevel() { return $serverCompetitionModelService_cleanEngagementCompetitionLevel().cleanEngagementCompetitionLevel; },
    get local$cleanEngagementEntryStatus() { return $serverCompetitionModelService_cleanEngagementEntryStatus().cleanEngagementEntryStatus; }
  });
  return $serverCompetitionModelService_engagementClosureQueueItem.instance;
}

function $serverCompetitionModelService_engagementClubEntryCompetitionIds() {
  if (!$serverCompetitionModelService_engagementClubEntryCompetitionIds.instance) $serverCompetitionModelService_engagementClubEntryCompetitionIds.instance = require("./backend/server-competition-model-service/engagement-club-entry-competition-ids").createCompetitionModelService_engagementClubEntryCompetitionIds({
    get FieldPath() { return FieldPath; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get local$engagementClubCompetitionIndexKey() { return $serverCompetitionModelService_engagementClubCompetitionIndexKey().engagementClubCompetitionIndexKey; },
    get local$engagementClubCompetitionIndexRef() { return $serverCompetitionModelService_engagementClubCompetitionIndexKey().engagementClubCompetitionIndexRef; },
    get local$engagementClubEntryId() { return $serverCompetitionModelService_engagementClubEntryId().engagementClubEntryId; },
    get local$engagementCompetitionCalendarItem() { return $serverCompetitionModelService_cleanEngagementPoolLaneCount().engagementCompetitionCalendarItem; }
  });
  return $serverCompetitionModelService_engagementClubEntryCompetitionIds.instance;
}

function $serverCompetitionModelService_engagementCompetitionDetailItem() {
  if (!$serverCompetitionModelService_engagementCompetitionDetailItem.instance) $serverCompetitionModelService_engagementCompetitionDetailItem.instance = require("./backend/server-competition-model-service/engagement-competition-detail-item").createCompetitionModelService_engagementCompetitionDetailItem({
    get cleanCompetitionDocuments() { return cleanCompetitionDocuments; },
    get cleanEngagementGeneratedFiles() { return cleanEngagementGeneratedFiles; },
    get cleanText() { return cleanText; },
    get engagementCompetitionDocumentsMetadata() { return engagementCompetitionDocumentsMetadata; },
    get local$cleanEngagementCompetitionEvents() { return $serverCompetitionModelService_cleanEngagementCompetitionEvents().cleanEngagementCompetitionEvents; },
    get local$cleanEngagementCompetitionType() { return $serverCompetitionModelService_cleanEngagementCompetitionType().cleanEngagementCompetitionType; },
    get local$cleanEngagementFees() { return $serverCompetitionModelService_cleanEngagementFeeAmount().cleanEngagementFees; },
    get local$cleanEngagementProgramSessions() { return $serverCompetitionModelService_cleanEngagementProgramSessions().cleanEngagementProgramSessions; },
    get local$engagementCompetitionListItem() { return $serverCompetitionModelService_cleanEngagementFeeAmount().engagementCompetitionListItem; }
  });
  return $serverCompetitionModelService_engagementCompetitionDetailItem.instance;
}

function $serverCompetitionModelService_engagementClubEntryId() {
  if (!$serverCompetitionModelService_engagementClubEntryId.instance) $serverCompetitionModelService_engagementClubEntryId.instance = require("./backend/server-competition-model-service/engagement-club-entry-id").createCompetitionModelService_engagementClubEntryId({
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_engagementClubEntryId.instance;
}

function $serverCompetitionModelService_engagementPersonLicenseKey() {
  if (!$serverCompetitionModelService_engagementPersonLicenseKey.instance) $serverCompetitionModelService_engagementPersonLicenseKey.instance = require("./backend/server-competition-model-service/engagement-person-license-key").createCompetitionModelService_engagementPersonLicenseKey({
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionModelService_engagementPersonLicenseKey.instance;
}

function $serverCompetitionModelService_assertEngagementSwimmerRoleCompatibility() {
  if (!$serverCompetitionModelService_assertEngagementSwimmerRoleCompatibility.instance) $serverCompetitionModelService_assertEngagementSwimmerRoleCompatibility.instance = require("./backend/server-competition-model-service/assert-engagement-swimmer-role-compatibility").createCompetitionModelService_assertEngagementSwimmerRoleCompatibility({
    get HttpsError() { return HttpsError; },
    get local$engagementPersonLicenseKey() { return $serverCompetitionModelService_engagementPersonLicenseKey().engagementPersonLicenseKey; }
  });
  return $serverCompetitionModelService_assertEngagementSwimmerRoleCompatibility.instance;
}

function $serverEntryModelService_cleanEngagementTeamLeader() {
  if (!$serverEntryModelService_cleanEngagementTeamLeader.instance) $serverEntryModelService_cleanEngagementTeamLeader.instance = require("./backend/server-entry-model-service/clean-engagement-team-leader").createEntryModelService_cleanEngagementTeamLeader({
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverEntryModelService_cleanEngagementTeamLeader.instance;
}

function $serverEntryModelService_engagementTeamLeaderComplete() {
  if (!$serverEntryModelService_engagementTeamLeaderComplete.instance) $serverEntryModelService_engagementTeamLeaderComplete.instance = require("./backend/server-entry-model-service/engagement-team-leader-complete").createEntryModelService_engagementTeamLeaderComplete({

  });
  return $serverEntryModelService_engagementTeamLeaderComplete.instance;
}

function $serverEntryModelService_cleanEngagementEntryOfficial() {
  if (!$serverEntryModelService_cleanEngagementEntryOfficial.instance) $serverEntryModelService_cleanEngagementEntryOfficial.instance = require("./backend/server-entry-model-service/clean-engagement-entry-official").createEntryModelService_cleanEngagementEntryOfficial({
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverEntryModelService_cleanEngagementEntryOfficial.instance;
}

function $serverEntryModelService_parseEngagementEntryTime() {
  if (!$serverEntryModelService_parseEngagementEntryTime.instance) $serverEntryModelService_parseEngagementEntryTime.instance = require("./backend/server-entry-model-service/parse-engagement-entry-time").createEntryModelService_parseEngagementEntryTime({
    get cleanText() { return cleanText; },
    get formatTimeValue() { return formatTimeValue; },
    get parseTimeValue() { return parseTimeValue; }
  });
  return $serverEntryModelService_parseEngagementEntryTime.instance;
}

function $serverEntryModelService_cleanEngagementEntryIndividualEntries() {
  if (!$serverEntryModelService_cleanEngagementEntryIndividualEntries.instance) $serverEntryModelService_cleanEngagementEntryIndividualEntries.instance = require("./backend/server-entry-model-service/clean-engagement-entry-individual-entries").createEntryModelService_cleanEngagementEntryIndividualEntries({
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverEntryModelService_cleanEngagementEntryIndividualEntries.instance;
}

function $serverEntryModelService_cleanEngagementEntrySwimmer() {
  if (!$serverEntryModelService_cleanEngagementEntrySwimmer.instance) $serverEntryModelService_cleanEngagementEntrySwimmer.instance = require("./backend/server-entry-model-service/clean-engagement-entry-swimmer").createEntryModelService_cleanEngagementEntrySwimmer({
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get local$cleanEngagementEntryIndividualEntries() { return $serverEntryModelService_cleanEngagementEntryIndividualEntries().cleanEngagementEntryIndividualEntries; }
  });
  return $serverEntryModelService_cleanEngagementEntrySwimmer.instance;
}

function $serverEntryModelService_assertEngagementRelayMembers() {
  if (!$serverEntryModelService_assertEngagementRelayMembers.instance) $serverEntryModelService_assertEngagementRelayMembers.instance = require("./backend/server-entry-model-service/assert-engagement-relay-members").createEntryModelService_assertEngagementRelayMembers({
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get ENGAGEMENT_RELAY_AGE_CATEGORY_RANK() { return ENGAGEMENT_RELAY_AGE_CATEGORY_RANK; },
    get ENGAGEMENT_RELAY_CATEGORY_CODES() { return ENGAGEMENT_RELAY_CATEGORY_CODES; },
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get birthYear() { return birthYear; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionYear() { return competitionYear; },
    get engagementRelayReferenceForEntry() { return engagementRelayReferenceForEntry; },
    get engagementRelayReferenceMap() { return engagementRelayReferenceMap; },
    get formatTimeValue() { return formatTimeValue; },
    get importSeasonYear() { return importSeasonYear; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get stableHash() { return stableHash; },
    get local$engagementCompetitionAppliesToFranceRecords() { return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToFranceRecords; },
    get local$engagementCompetitionAppliesToMpf() { return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToMpf; },
    get local$parseEngagementEntryTime() { return $serverEntryModelService_parseEngagementEntryTime().parseEngagementEntryTime; }
  });
  return $serverEntryModelService_assertEngagementRelayMembers.instance;
}

function $serverEntryModelService_qualificationRelaysAfterIndividualChange() {
  if (!$serverEntryModelService_qualificationRelaysAfterIndividualChange.instance) $serverEntryModelService_qualificationRelaysAfterIndividualChange.instance = require("./backend/server-entry-model-service/qualification-relays-after-individual-change").createEntryModelService_qualificationRelaysAfterIndividualChange({
    get qualificationEngine() { return require("./engagement-qualification"); }
  });
  return $serverEntryModelService_qualificationRelaysAfterIndividualChange.instance;
}

function $serverEntryModelService_qualificationEvents() {
  if (!$serverEntryModelService_qualificationEvents.instance) $serverEntryModelService_qualificationEvents.instance = require("./backend/server-entry-model-service/qualification-events").createEntryModelService_qualificationEvents({
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get engagementCategoryCodesForEvent() { return engagementCategoryCodesForEvent; }
  });
  return $serverEntryModelService_qualificationEvents.instance;
}

function $serverEntryModelService_automaticEngagementIndividualEntry() {
  if (!$serverEntryModelService_automaticEngagementIndividualEntry.instance) $serverEntryModelService_automaticEngagementIndividualEntry.instance = require("./backend/server-entry-model-service/automatic-engagement-individual-entry").createEntryModelService_automaticEngagementIndividualEntry({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanText() { return cleanText; },
    get createQualificationService() { return require("./engagement-qualification-service").createQualificationService; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get formatTimeValue() { return formatTimeValue; },
    get legacyQualificationService() { return legacyQualificationService; },
    set legacyQualificationService(value) { legacyQualificationService = value; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicBetterPerformance() { return publicBetterPerformance; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; },
    get local$cleanEngagementEntryIndividualEntries() { return $serverEntryModelService_cleanEngagementEntryIndividualEntries().cleanEngagementEntryIndividualEntries; },
    get local$engagementEntryTimeCacheId() { return $serverEntryModelService_engagementEntryTimeCacheId().engagementEntryTimeCacheId; },
    get local$engagementEntryTimeCacheRef() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRef; },
    get local$engagementEntryTimeCacheRow() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRow; },
    get local$engagementEntryTimeCacheRowsFromData() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRowsFromData; },
    get local$engagementEntryTimeRowsToEvents() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeRowsToEvents; },
    get local$engagementQualificationRowAllowed() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementQualificationRowAllowed; },
    get local$getEngagementEntryTimeRowsForSwimmer() { return $serverEntryModelService_engagementEntryTimeCacheRef().getEngagementEntryTimeRowsForSwimmer; },
    get local$qualificationEvents() { return $serverEntryModelService_qualificationEvents().qualificationEvents; }
  });
  return $serverEntryModelService_automaticEngagementIndividualEntry.instance;
}

function $serverEntryModelService_nativeQualificationServices() {
  if (!$serverEntryModelService_nativeQualificationServices.instance) $serverEntryModelService_nativeQualificationServices.instance = require("./backend/server-entry-model-service/native-qualification-services").createEntryModelService_nativeQualificationServices({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get armNativeCompetitionNotification() { return armNativeCompetitionNotification; },
    get assertCanModifyEngagementEvent() { return assertCanModifyEngagementEvent; },
    get assertEngagementClubWriteOpen() { return assertEngagementClubWriteOpen; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get db() { return db; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$automaticEngagementIndividualEntry() { return $serverEntryModelService_automaticEngagementIndividualEntry().automaticEngagementIndividualEntry; },
    get local$qualificationEvents() { return $serverEntryModelService_qualificationEvents().qualificationEvents; }
  });
  return $serverEntryModelService_nativeQualificationServices.instance;
}

function $serverEntryModelService_nativeQualificationError() {
  if (!$serverEntryModelService_nativeQualificationError.instance) $serverEntryModelService_nativeQualificationError.instance = require("./backend/server-entry-model-service/native-qualification-error").createEntryModelService_nativeQualificationError({
    get HttpsError() { return HttpsError; }
  });
  return $serverEntryModelService_nativeQualificationError.instance;
}

function $serverEntryModelService_engagementEntryTimeCacheRef() {
  if (!$serverEntryModelService_engagementEntryTimeCacheRef.instance) $serverEntryModelService_engagementEntryTimeCacheRef.instance = require("./backend/server-entry-model-service/engagement-entry-time-cache-ref").createEntryModelService_engagementEntryTimeCacheRef({
    get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
    get ENGAGEMENT_ENTRY_TIME_CACHE_VERSION() { return ENGAGEMENT_ENTRY_TIME_CACHE_VERSION; },
    get ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT() { return ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT; },
    get HttpsError() { return HttpsError; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementEntryTimeCacheBuilds() { return engagementEntryTimeCacheBuilds; },
    get hydratePublicSwimmerRowsFromPayload() { return hydratePublicSwimmerRowsFromPayload; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get stableHash() { return stableHash; },
    get local$engagementEntryTimeCacheId() { return $serverEntryModelService_engagementEntryTimeCacheId().engagementEntryTimeCacheId; }
  });
  return $serverEntryModelService_engagementEntryTimeCacheRef.instance;
}

function $serverEntryModelService_engagementKnownTimeHistory() {
  if (!$serverEntryModelService_engagementKnownTimeHistory.instance) $serverEntryModelService_engagementKnownTimeHistory.instance = require("./backend/server-entry-model-service/engagement-known-time-history").createEntryModelService_engagementKnownTimeHistory({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get formatTimeValue() { return formatTimeValue; },
    get local$engagementQualificationRowAllowed() { return $serverEntryModelService_engagementEntryTimeCacheRef().engagementQualificationRowAllowed; }
  });
  return $serverEntryModelService_engagementKnownTimeHistory.instance;
}

function $serverEntryModelService_engagementEntryTimeCacheId() {
  if (!$serverEntryModelService_engagementEntryTimeCacheId.instance) $serverEntryModelService_engagementEntryTimeCacheId.instance = require("./backend/server-entry-model-service/engagement-entry-time-cache-id").createEntryModelService_engagementEntryTimeCacheId({
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverEntryModelService_engagementEntryTimeCacheId.instance;
}

function $serverEntryModelService_deleteEngagementEntryTimeCache() {
  if (!$serverEntryModelService_deleteEngagementEntryTimeCache.instance) $serverEntryModelService_deleteEngagementEntryTimeCache.instance = require("./backend/server-entry-model-service/delete-engagement-entry-time-cache").createEntryModelService_deleteEngagementEntryTimeCache({
    get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
    get local$engagementEntryTimeCacheId() { return $serverEntryModelService_engagementEntryTimeCacheId().engagementEntryTimeCacheId; }
  });
  return $serverEntryModelService_deleteEngagementEntryTimeCache.instance;
}

function $serverEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows() {
  if (!$serverEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows.instance) $serverEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows.instance = require("./backend/server-entry-model-service/invalidate-engagement-entry-time-caches-for-performance-rows").createEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows({
    get ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION() { return ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION; },
    get db() { return db; },
    get performanceSwimmerIndexKey() { return performanceSwimmerIndexKey; },
    get local$engagementEntryTimeCacheId() { return $serverEntryModelService_engagementEntryTimeCacheId().engagementEntryTimeCacheId; }
  });
  return $serverEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows.instance;
}

function $serverEntryModelService_engagementCompetitionAppliesToFranceRecords() {
  if (!$serverEntryModelService_engagementCompetitionAppliesToFranceRecords.instance) $serverEntryModelService_engagementCompetitionAppliesToFranceRecords.instance = require("./backend/server-entry-model-service/engagement-competition-applies-to-france-records").createEntryModelService_engagementCompetitionAppliesToFranceRecords({
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; }
  });
  return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords.instance;
}

function $serverEntryModelService_engagementEntryTimeWarning() {
  if (!$serverEntryModelService_engagementEntryTimeWarning.instance) $serverEntryModelService_engagementEntryTimeWarning.instance = require("./backend/server-entry-model-service/engagement-entry-time-warning").createEntryModelService_engagementEntryTimeWarning({
    get HttpsError() { return HttpsError; },
    get POOL_COURSES() { return POOL_COURSES; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get cleanText() { return cleanText; },
    get formatTimeValue() { return formatTimeValue; },
    get isYouthCategory() { return isYouthCategory; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get recordReferenceForPerformance() { return recordReferenceForPerformance; },
    get recordReferenceMap() { return recordReferenceMap; },
    get local$engagementCompetitionAppliesToFranceRecords() { return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToFranceRecords; },
    get local$engagementCompetitionAppliesToMpf() { return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToMpf; }
  });
  return $serverEntryModelService_engagementEntryTimeWarning.instance;
}

function $serverEntryModelService_resolveEngagementIndividualEntriesForSwimmer() {
  if (!$serverEntryModelService_resolveEngagementIndividualEntriesForSwimmer.instance) $serverEntryModelService_resolveEngagementIndividualEntriesForSwimmer.instance = require("./backend/server-entry-model-service/resolve-engagement-individual-entries-for-swimmer").createEntryModelService_resolveEngagementIndividualEntriesForSwimmer({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get qualificationEngine() { return require("./engagement-qualification"); },
    get local$automaticEngagementIndividualEntry() { return $serverEntryModelService_automaticEngagementIndividualEntry().automaticEngagementIndividualEntry; },
    get local$cleanEngagementEntryIndividualEntries() { return $serverEntryModelService_cleanEngagementEntryIndividualEntries().cleanEngagementEntryIndividualEntries; },
    get local$getEngagementEntryTimeRowsForSwimmer() { return $serverEntryModelService_engagementEntryTimeCacheRef().getEngagementEntryTimeRowsForSwimmer; },
    get local$getEngagementQualificationRows() { return $serverEntryModelService_automaticEngagementIndividualEntry().getEngagementQualificationRows; },
    get local$parseEngagementEntryTime() { return $serverEntryModelService_parseEngagementEntryTime().parseEngagementEntryTime; },
    get local$qualificationService() { return $serverEntryModelService_automaticEngagementIndividualEntry().qualificationService; }
  });
  return $serverEntryModelService_resolveEngagementIndividualEntriesForSwimmer.instance;
}

function $serverEntryModelService_engagementSwimmerIdentityKey() {
  if (!$serverEntryModelService_engagementSwimmerIdentityKey.instance) $serverEntryModelService_engagementSwimmerIdentityKey.instance = require("./backend/server-entry-model-service/engagement-swimmer-identity-key").createEntryModelService_engagementSwimmerIdentityKey({
    get cleanIsoDate() { return cleanIsoDate; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; }
  });
  return $serverEntryModelService_engagementSwimmerIdentityKey.instance;
}

function $serverEntryModelService_cleanEngagementNewSwimmer() {
  if (!$serverEntryModelService_cleanEngagementNewSwimmer.instance) $serverEntryModelService_cleanEngagementNewSwimmer.instance = require("./backend/server-entry-model-service/clean-engagement-new-swimmer").createEntryModelService_cleanEngagementNewSwimmer({
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; },
    get local$engagementSwimmerIdentityKey() { return $serverEntryModelService_engagementSwimmerIdentityKey().engagementSwimmerIdentityKey; }
  });
  return $serverEntryModelService_cleanEngagementNewSwimmer.instance;
}

function $serverEntryModelService_engagementNewSwimmerItem() {
  if (!$serverEntryModelService_engagementNewSwimmerItem.instance) $serverEntryModelService_engagementNewSwimmerItem.instance = require("./backend/server-entry-model-service/engagement-new-swimmer-item").createEntryModelService_engagementNewSwimmerItem({
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; }
  });
  return $serverEntryModelService_engagementNewSwimmerItem.instance;
}

function $serverEntryModelService_buildEngagementNewSwimmerAlerts() {
  if (!$serverEntryModelService_buildEngagementNewSwimmerAlerts.instance) $serverEntryModelService_buildEngagementNewSwimmerAlerts.instance = require("./backend/server-entry-model-service/build-engagement-new-swimmer-alerts").createEntryModelService_buildEngagementNewSwimmerAlerts({
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get performanceSearchTokens() { return performanceSearchTokens; },
    get local$engagementNewSwimmerItem() { return $serverEntryModelService_engagementNewSwimmerItem().engagementNewSwimmerItem; },
    get local$engagementSwimmerIdentityKey() { return $serverEntryModelService_engagementSwimmerIdentityKey().engagementSwimmerIdentityKey; }
  });
  return $serverEntryModelService_buildEngagementNewSwimmerAlerts.instance;
}

function $serverEntryModelService_engagementSwimmerLicenseId() {
  if (!$serverEntryModelService_engagementSwimmerLicenseId.instance) $serverEntryModelService_engagementSwimmerLicenseId.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-id").createEntryModelService_engagementSwimmerLicenseId({
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverEntryModelService_engagementSwimmerLicenseId.instance;
}

function $serverEntryModelService_engagementSwimmerLicenseNumberKey() {
  if (!$serverEntryModelService_engagementSwimmerLicenseNumberKey.instance) $serverEntryModelService_engagementSwimmerLicenseNumberKey.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-number-key").createEntryModelService_engagementSwimmerLicenseNumberKey({
    get cleanText() { return cleanText; }
  });
  return $serverEntryModelService_engagementSwimmerLicenseNumberKey.instance;
}

function $serverEntryModelService_engagementSwimmerLicenseNumberId() {
  if (!$serverEntryModelService_engagementSwimmerLicenseNumberId.instance) $serverEntryModelService_engagementSwimmerLicenseNumberId.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-number-id").createEntryModelService_engagementSwimmerLicenseNumberId({
    get stableHash() { return stableHash; },
    get local$engagementSwimmerLicenseNumberKey() { return $serverEntryModelService_engagementSwimmerLicenseNumberKey().engagementSwimmerLicenseNumberKey; }
  });
  return $serverEntryModelService_engagementSwimmerLicenseNumberId.instance;
}

function $serverEntryModelService_engagementClubRosterId() {
  if (!$serverEntryModelService_engagementClubRosterId.instance) $serverEntryModelService_engagementClubRosterId.instance = require("./backend/server-entry-model-service/engagement-club-roster-id").createEntryModelService_engagementClubRosterId({
    get ENGAGEMENT_CLUB_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_ROSTERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverEntryModelService_engagementClubRosterId.instance;
}

function $serverEntryModelService_cleanEngagementClubActivityStatus() {
  if (!$serverEntryModelService_cleanEngagementClubActivityStatus.instance) $serverEntryModelService_cleanEngagementClubActivityStatus.instance = require("./backend/server-entry-model-service/clean-engagement-club-activity-status").createEntryModelService_cleanEngagementClubActivityStatus({
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; }
  });
  return $serverEntryModelService_cleanEngagementClubActivityStatus.instance;
}

function $serverEntryModelService_engagementClubRosterSwimmerKey() {
  if (!$serverEntryModelService_engagementClubRosterSwimmerKey.instance) $serverEntryModelService_engagementClubRosterSwimmerKey.instance = require("./backend/server-entry-model-service/engagement-club-roster-swimmer-key").createEntryModelService_engagementClubRosterSwimmerKey({
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverEntryModelService_engagementClubRosterSwimmerKey.instance;
}

function $serverEntryModelService_engagementClubRosterSwimmersFromData() {
  if (!$serverEntryModelService_engagementClubRosterSwimmersFromData.instance) $serverEntryModelService_engagementClubRosterSwimmersFromData.instance = require("./backend/server-entry-model-service/engagement-club-roster-swimmers-from-data").createEntryModelService_engagementClubRosterSwimmersFromData({
    get local$engagementClubRosterSwimmerItem() { return $serverEntryModelService_cleanEngagementClubActivityStatus().engagementClubRosterSwimmerItem; }
  });
  return $serverEntryModelService_engagementClubRosterSwimmersFromData.instance;
}

function $serverEntryModelService_upsertEngagementClubRosterSwimmer() {
  if (!$serverEntryModelService_upsertEngagementClubRosterSwimmer.instance) $serverEntryModelService_upsertEngagementClubRosterSwimmer.instance = require("./backend/server-entry-model-service/upsert-engagement-club-roster-swimmer").createEntryModelService_upsertEngagementClubRosterSwimmer({
    get local$engagementClubRosterRef() { return $serverEntryModelService_engagementClubRosterId().engagementClubRosterRef; },
    get local$engagementClubRosterSwimmerItem() { return $serverEntryModelService_cleanEngagementClubActivityStatus().engagementClubRosterSwimmerItem; },
    get local$engagementClubRosterSwimmerKey() { return $serverEntryModelService_engagementClubRosterSwimmerKey().engagementClubRosterSwimmerKey; }
  });
  return $serverEntryModelService_upsertEngagementClubRosterSwimmer.instance;
}

function $serverEntryModelService_deleteEngagementClubRosterSwimmer() {
  if (!$serverEntryModelService_deleteEngagementClubRosterSwimmer.instance) $serverEntryModelService_deleteEngagementClubRosterSwimmer.instance = require("./backend/server-entry-model-service/delete-engagement-club-roster-swimmer").createEntryModelService_deleteEngagementClubRosterSwimmer({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get local$engagementClubRosterRef() { return $serverEntryModelService_engagementClubRosterId().engagementClubRosterRef; },
    get local$engagementClubRosterSwimmerKey() { return $serverEntryModelService_engagementClubRosterSwimmerKey().engagementClubRosterSwimmerKey; }
  });
  return $serverEntryModelService_deleteEngagementClubRosterSwimmer.instance;
}

function $serverEntryModelService_engagementSwimmerLicenseDataItem() {
  if (!$serverEntryModelService_engagementSwimmerLicenseDataItem.instance) $serverEntryModelService_engagementSwimmerLicenseDataItem.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-data-item").createEntryModelService_engagementSwimmerLicenseDataItem({
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanText() { return cleanText; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; }
  });
  return $serverEntryModelService_engagementSwimmerLicenseDataItem.instance;
}

function $serverEntryModelService_engagementLegacySwimmerLicensesByClub() {
  if (!$serverEntryModelService_engagementLegacySwimmerLicensesByClub.instance) $serverEntryModelService_engagementLegacySwimmerLicensesByClub.instance = require("./backend/server-entry-model-service/engagement-legacy-swimmer-licenses-by-club").createEntryModelService_engagementLegacySwimmerLicensesByClub({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get local$engagementSwimmerLicenseItem() { return $serverEntryModelService_engagementSwimmerLicenseDataItem().engagementSwimmerLicenseItem; }
  });
  return $serverEntryModelService_engagementLegacySwimmerLicensesByClub.instance;
}

function $serverEntryModelService_engagementSwimmerLicensePayload() {
  if (!$serverEntryModelService_engagementSwimmerLicensePayload.instance) $serverEntryModelService_engagementSwimmerLicensePayload.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-payload").createEntryModelService_engagementSwimmerLicensePayload({
    get cleanEngagementLicenseSeasonStatus() { return cleanEngagementLicenseSeasonStatus; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; }
  });
  return $serverEntryModelService_engagementSwimmerLicensePayload.instance;
}

function $serverEntryModelService_engagementSwimmerLicenseConflictData() {
  if (!$serverEntryModelService_engagementSwimmerLicenseConflictData.instance) $serverEntryModelService_engagementSwimmerLicenseConflictData.instance = require("./backend/server-entry-model-service/engagement-swimmer-license-conflict-data").createEntryModelService_engagementSwimmerLicenseConflictData({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get local$engagementSwimmerLicenseNumberId() { return $serverEntryModelService_engagementSwimmerLicenseNumberId().engagementSwimmerLicenseNumberId; },
    get local$engagementSwimmerLicenseNumberKey() { return $serverEntryModelService_engagementSwimmerLicenseNumberKey().engagementSwimmerLicenseNumberKey; }
  });
  return $serverEntryModelService_engagementSwimmerLicenseConflictData.instance;
}

function $serverEntryModelService_assertNoEngagementSwimmerLicenseConflict() {
  if (!$serverEntryModelService_assertNoEngagementSwimmerLicenseConflict.instance) $serverEntryModelService_assertNoEngagementSwimmerLicenseConflict.instance = require("./backend/server-entry-model-service/assert-no-engagement-swimmer-license-conflict").createEntryModelService_assertNoEngagementSwimmerLicenseConflict({
    get HttpsError() { return HttpsError; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubName() { return engagementClubName; },
    get local$findEngagementSwimmerLicenseConflict() { return $serverEntryModelService_engagementSwimmerLicenseConflictData().findEngagementSwimmerLicenseConflict; }
  });
  return $serverEntryModelService_assertNoEngagementSwimmerLicenseConflict.instance;
}

function $serverEntryModelService_engagementSwimmerRecoveryPreview() {
  if (!$serverEntryModelService_engagementSwimmerRecoveryPreview.instance) $serverEntryModelService_engagementSwimmerRecoveryPreview.instance = require("./backend/server-entry-model-service/engagement-swimmer-recovery-preview").createEntryModelService_engagementSwimmerRecoveryPreview({
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementSeasonInfo() { return currentEngagementSeasonInfo; },
    get engagementSeasonBoundsFromEndYear() { return engagementSeasonBoundsFromEndYear; },
    get local$engagementClubRosterSwimmerItem() { return $serverEntryModelService_cleanEngagementClubActivityStatus().engagementClubRosterSwimmerItem; },
    get local$engagementNewSwimmerItem() { return $serverEntryModelService_engagementNewSwimmerItem().engagementNewSwimmerItem; },
    get local$engagementSwimmerLicenseNumberKey() { return $serverEntryModelService_engagementSwimmerLicenseNumberKey().engagementSwimmerLicenseNumberKey; },
    get local$findEngagementSwimmerLicenseConflict() { return $serverEntryModelService_engagementSwimmerLicenseConflictData().findEngagementSwimmerLicenseConflict; }
  });
  return $serverEntryModelService_engagementSwimmerRecoveryPreview.instance;
}

function $serverEntryModelService_engagementClubEntryItem() {
  if (!$serverEntryModelService_engagementClubEntryItem.instance) $serverEntryModelService_engagementClubEntryItem.instance = require("./backend/server-entry-model-service/engagement-club-entry-item").createEntryModelService_engagementClubEntryItem({
    get ENGAGEMENT_PROGRAM_GENDER_MODES() { return ENGAGEMENT_PROGRAM_GENDER_MODES; },
    get cleanEngagementDocumentMetadata() { return cleanEngagementDocumentMetadata; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubName() { return engagementClubName; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get local$cleanEngagementEntryOfficial() { return $serverEntryModelService_cleanEngagementEntryOfficial().cleanEngagementEntryOfficial; },
    get local$cleanEngagementEntrySwimmer() { return $serverEntryModelService_cleanEngagementEntrySwimmer().cleanEngagementEntrySwimmer; },
    get local$engagementTeamLeaderComplete() { return $serverEntryModelService_engagementTeamLeaderComplete().engagementTeamLeaderComplete; }
  });
  return $serverEntryModelService_engagementClubEntryItem.instance;
}

function $serverEntryModelService_engagementClubEntryHasParticipants() {
  if (!$serverEntryModelService_engagementClubEntryHasParticipants.instance) $serverEntryModelService_engagementClubEntryHasParticipants.instance = require("./backend/server-entry-model-service/engagement-club-entry-has-participants").createEntryModelService_engagementClubEntryHasParticipants({

  });
  return $serverEntryModelService_engagementClubEntryHasParticipants.instance;
}

function $serverDocumentsService_cleanEngagementDocumentMetadata() {
  if (!$serverDocumentsService_cleanEngagementDocumentMetadata.instance) $serverDocumentsService_cleanEngagementDocumentMetadata.instance = require("./backend/server-documents-service/clean-engagement-document-metadata").createDocumentsService_cleanEngagementDocumentMetadata({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; }
  });
  return $serverDocumentsService_cleanEngagementDocumentMetadata.instance;
}

function $serverDocumentsService_cleanEngagementGeneratedFile() {
  if (!$serverDocumentsService_cleanEngagementGeneratedFile.instance) $serverDocumentsService_cleanEngagementGeneratedFile.instance = require("./backend/server-documents-service/clean-engagement-generated-file").createDocumentsService_cleanEngagementGeneratedFile({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get local$cleanEngagementDocumentMetadata() { return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata; }
  });
  return $serverDocumentsService_cleanEngagementGeneratedFile.instance;
}

function $serverDocumentsService_engagementClubRecapPdfSourceHash() {
  if (!$serverDocumentsService_engagementClubRecapPdfSourceHash.instance) $serverDocumentsService_engagementClubRecapPdfSourceHash.instance = require("./backend/server-documents-service/engagement-club-recap-pdf-source-hash").createDocumentsService_engagementClubRecapPdfSourceHash({
    get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get stableHash() { return stableHash; },
    get storage() { return storage; },
    get local$cleanEngagementDocumentMetadata() { return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata; },
    get local$deleteEngagementCompetitionEntrySummary() { return $serverDocumentsService_deleteEngagementCompetitionEntrySummary().deleteEngagementCompetitionEntrySummary; },
    get local$engagementCompetitionEntrySummaryItem() { return $serverDocumentsService_engagementCompetitionEntrySummaryItem().engagementCompetitionEntrySummaryItem; },
    get local$engagementCompetitionEntrySummaryRef() { return $serverDocumentsService_engagementCompetitionEntrySummaryRef().engagementCompetitionEntrySummaryRef; },
    get local$readStoredEngagementClubRecapPdf() { return $serverDocumentsService_readStoredEngagementClubRecapPdf().readStoredEngagementClubRecapPdf; }
  });
  return $serverDocumentsService_engagementClubRecapPdfSourceHash.instance;
}

function $serverDocumentsService_engagementCompetitionEntrySummaryId() {
  if (!$serverDocumentsService_engagementCompetitionEntrySummaryId.instance) $serverDocumentsService_engagementCompetitionEntrySummaryId.instance = require("./backend/server-documents-service/engagement-competition-entry-summary-id").createDocumentsService_engagementCompetitionEntrySummaryId({
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverDocumentsService_engagementCompetitionEntrySummaryId.instance;
}

function $serverDocumentsService_engagementCompetitionEntrySummaryRef() {
  if (!$serverDocumentsService_engagementCompetitionEntrySummaryRef.instance) $serverDocumentsService_engagementCompetitionEntrySummaryRef.instance = require("./backend/server-documents-service/engagement-competition-entry-summary-ref").createDocumentsService_engagementCompetitionEntrySummaryRef({
    get ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION() { return ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION; },
    get local$engagementCompetitionEntrySummaryId() { return $serverDocumentsService_engagementCompetitionEntrySummaryId().engagementCompetitionEntrySummaryId; }
  });
  return $serverDocumentsService_engagementCompetitionEntrySummaryRef.instance;
}

function $serverDocumentsService_engagementCompetitionStatisticsCacheRef() {
  if (!$serverDocumentsService_engagementCompetitionStatisticsCacheRef.instance) $serverDocumentsService_engagementCompetitionStatisticsCacheRef.instance = require("./backend/server-documents-service/engagement-competition-statistics-cache-ref").createDocumentsService_engagementCompetitionStatisticsCacheRef({
    get ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION() { return ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION; },
    get local$engagementCompetitionEntrySummaryId() { return $serverDocumentsService_engagementCompetitionEntrySummaryId().engagementCompetitionEntrySummaryId; }
  });
  return $serverDocumentsService_engagementCompetitionStatisticsCacheRef.instance;
}

function $serverDocumentsService_invalidateEngagementCompetitionStatistics() {
  if (!$serverDocumentsService_invalidateEngagementCompetitionStatistics.instance) $serverDocumentsService_invalidateEngagementCompetitionStatistics.instance = require("./backend/server-documents-service/invalidate-engagement-competition-statistics").createDocumentsService_invalidateEngagementCompetitionStatistics({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubCompetitionIndexKey() { return engagementClubCompetitionIndexKey; },
    get engagementClubCompetitionIndexRef() { return engagementClubCompetitionIndexRef; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get local$engagementCompetitionEntrySummaryItem() { return $serverDocumentsService_engagementCompetitionEntrySummaryItem().engagementCompetitionEntrySummaryItem; },
    get local$engagementCompetitionEntrySummaryRef() { return $serverDocumentsService_engagementCompetitionEntrySummaryRef().engagementCompetitionEntrySummaryRef; },
    get local$engagementCompetitionStatisticsCacheRef() { return $serverDocumentsService_engagementCompetitionStatisticsCacheRef().engagementCompetitionStatisticsCacheRef; }
  });
  return $serverDocumentsService_invalidateEngagementCompetitionStatistics.instance;
}

function $serverDocumentsService_decodeEngagementCompetitionStatisticsCache() {
  if (!$serverDocumentsService_decodeEngagementCompetitionStatisticsCache.instance) $serverDocumentsService_decodeEngagementCompetitionStatisticsCache.instance = require("./backend/server-documents-service/decode-engagement-competition-statistics-cache").createDocumentsService_decodeEngagementCompetitionStatisticsCache({
    get cleanText() { return cleanText; },
    get zlib() { return zlib; }
  });
  return $serverDocumentsService_decodeEngagementCompetitionStatisticsCache.instance;
}

function $serverDocumentsService_engagementCompetitionEntrySummaryItem() {
  if (!$serverDocumentsService_engagementCompetitionEntrySummaryItem.instance) $serverDocumentsService_engagementCompetitionEntrySummaryItem.instance = require("./backend/server-documents-service/engagement-competition-entry-summary-item").createDocumentsService_engagementCompetitionEntrySummaryItem({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementClubEntryId() { return engagementClubEntryId; },
    get engagementClubName() { return engagementClubName; },
    get engagementPdfEntryStats() { return engagementPdfEntryStats; },
    get local$cleanEngagementDocumentMetadata() { return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata; }
  });
  return $serverDocumentsService_engagementCompetitionEntrySummaryItem.instance;
}

function $serverDocumentsService_engagementCompetitionEntrySummariesFromData() {
  if (!$serverDocumentsService_engagementCompetitionEntrySummariesFromData.instance) $serverDocumentsService_engagementCompetitionEntrySummariesFromData.instance = require("./backend/server-documents-service/engagement-competition-entry-summaries-from-data").createDocumentsService_engagementCompetitionEntrySummariesFromData({
    get cleanText() { return cleanText; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get local$engagementCompetitionEntrySummaryItem() { return $serverDocumentsService_engagementCompetitionEntrySummaryItem().engagementCompetitionEntrySummaryItem; }
  });
  return $serverDocumentsService_engagementCompetitionEntrySummariesFromData.instance;
}

function $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry() {
  if (!$serverDocumentsService_deleteEngagementClubCompetitionIndexEntry.instance) $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry.instance = require("./backend/server-documents-service/delete-engagement-club-competition-index-entry").createDocumentsService_deleteEngagementClubCompetitionIndexEntry({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get engagementClubCompetitionIndexKey() { return engagementClubCompetitionIndexKey; },
    get engagementClubCompetitionIndexRef() { return engagementClubCompetitionIndexRef; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get local$engagementCompetitionEntrySummariesFromData() { return $serverDocumentsService_engagementCompetitionEntrySummariesFromData().engagementCompetitionEntrySummariesFromData; },
    get local$engagementCompetitionEntrySummaryItem() { return $serverDocumentsService_engagementCompetitionEntrySummaryItem().engagementCompetitionEntrySummaryItem; },
    get local$engagementCompetitionEntrySummaryRef() { return $serverDocumentsService_engagementCompetitionEntrySummaryRef().engagementCompetitionEntrySummaryRef; }
  });
  return $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry.instance;
}

function $serverDocumentsService_deleteEngagementCompetitionEntrySummary() {
  if (!$serverDocumentsService_deleteEngagementCompetitionEntrySummary.instance) $serverDocumentsService_deleteEngagementCompetitionEntrySummary.instance = require("./backend/server-documents-service/delete-engagement-competition-entry-summary").createDocumentsService_deleteEngagementCompetitionEntrySummary({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get local$engagementCompetitionEntrySummaryRef() { return $serverDocumentsService_engagementCompetitionEntrySummaryRef().engagementCompetitionEntrySummaryRef; }
  });
  return $serverDocumentsService_deleteEngagementCompetitionEntrySummary.instance;
}

function $serverDocumentsService_readStoredEngagementClubRecapPdf() {
  if (!$serverDocumentsService_readStoredEngagementClubRecapPdf.instance) $serverDocumentsService_readStoredEngagementClubRecapPdf.instance = require("./backend/server-documents-service/read-stored-engagement-club-recap-pdf").createDocumentsService_readStoredEngagementClubRecapPdf({
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get cleanText() { return cleanText; },
    get storage() { return storage; }
  });
  return $serverDocumentsService_readStoredEngagementClubRecapPdf.instance;
}

function $serverDocumentsService_engagementOfficialsPdfSourceHash() {
  if (!$serverDocumentsService_engagementOfficialsPdfSourceHash.instance) $serverDocumentsService_engagementOfficialsPdfSourceHash.instance = require("./backend/server-documents-service/engagement-officials-pdf-source-hash").createDocumentsService_engagementOfficialsPdfSourceHash({
    get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get buildEngagementOfficialsPdf() { return buildEngagementOfficialsPdf; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get stableHash() { return stableHash; },
    get storage() { return storage; },
    get local$cleanEngagementDocumentMetadata() { return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata; },
    get local$engagementOfficialsPdfRows() { return $serverDocumentsService_engagementOfficialsPdfRows().engagementOfficialsPdfRows; },
    get local$readStoredEngagementClubRecapPdf() { return $serverDocumentsService_readStoredEngagementClubRecapPdf().readStoredEngagementClubRecapPdf; }
  });
  return $serverDocumentsService_engagementOfficialsPdfSourceHash.instance;
}

function $serverDocumentsService_engagementOfficialsPdfRows() {
  if (!$serverDocumentsService_engagementOfficialsPdfRows.instance) $serverDocumentsService_engagementOfficialsPdfRows.instance = require("./backend/server-documents-service/engagement-officials-pdf-rows").createDocumentsService_engagementOfficialsPdfRows({
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementClubCode() { return engagementClubCode; }
  });
  return $serverDocumentsService_engagementOfficialsPdfRows.instance;
}

function $serverDocumentsService_engagementTxtDownloadUrl() {
  if (!$serverDocumentsService_engagementTxtDownloadUrl.instance) $serverDocumentsService_engagementTxtDownloadUrl.instance = require("./backend/server-documents-service/engagement-txt-download-url").createDocumentsService_engagementTxtDownloadUrl({
    get ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get cleanText() { return cleanText; },
    get crypto() { return crypto; },
    get db() { return db; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubsByIds() { return engagementClubsByIds; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get stableHash() { return stableHash; },
    get storage() { return storage; },
    get local$buildEngagementCompetitionTxt() { return $serverDocumentsService_buildEngagementCompetitionTxt().buildEngagementCompetitionTxt; },
    get local$cleanEngagementDocumentMetadata() { return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata; },
    get local$cleanEngagementGeneratedFile() { return $serverDocumentsService_cleanEngagementGeneratedFile().cleanEngagementGeneratedFile; },
    get local$cleanEngagementGeneratedFiles() { return $serverDocumentsService_cleanEngagementGeneratedFile().cleanEngagementGeneratedFiles; }
  });
  return $serverDocumentsService_engagementTxtDownloadUrl.instance;
}

function $serverDocumentsService_buildEngagementCompetitionTxt() {
  if (!$serverDocumentsService_buildEngagementCompetitionTxt.instance) $serverDocumentsService_buildEngagementCompetitionTxt.instance = require("./backend/server-documents-service/build-engagement-competition-txt").createDocumentsService_buildEngagementCompetitionTxt({
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get buildWinPalmeCompetitionTxt() { return buildWinPalmeCompetitionTxt; },
    get engagementPdfFileName() { return engagementPdfFileName; }
  });
  return $serverDocumentsService_buildEngagementCompetitionTxt.instance;
}

function $serverDocumentsService_engagementMailStatusLabel() {
  if (!$serverDocumentsService_engagementMailStatusLabel.instance) $serverDocumentsService_engagementMailStatusLabel.instance = require("./backend/server-documents-service/engagement-mail-status-label").createDocumentsService_engagementMailStatusLabel({
    get cleanText() { return cleanText; }
  });
  return $serverDocumentsService_engagementMailStatusLabel.instance;
}

function $serverDocumentsService_engagementMailSecretValue() {
  if (!$serverDocumentsService_engagementMailSecretValue.instance) $serverDocumentsService_engagementMailSecretValue.instance = require("./backend/server-documents-service/engagement-mail-secret-value").createDocumentsService_engagementMailSecretValue({
    get LIVEPALMES_MAIL_FROM() { return LIVEPALMES_MAIL_FROM; },
    get LIVEPALMES_SMTP_HOST() { return LIVEPALMES_SMTP_HOST; },
    get LIVEPALMES_SMTP_PASS() { return LIVEPALMES_SMTP_PASS; },
    get LIVEPALMES_SMTP_PORT() { return LIVEPALMES_SMTP_PORT; },
    get LIVEPALMES_SMTP_SECURE() { return LIVEPALMES_SMTP_SECURE; },
    get LIVEPALMES_SMTP_USER() { return LIVEPALMES_SMTP_USER; },
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverDocumentsService_engagementMailSecretValue.instance;
}

function $serverDocumentsService_engagementMailPreparedStatus() {
  if (!$serverDocumentsService_engagementMailPreparedStatus.instance) $serverDocumentsService_engagementMailPreparedStatus.instance = require("./backend/server-documents-service/engagement-mail-prepared-status").createDocumentsService_engagementMailPreparedStatus({
    get local$engagementMailSmtpConfig() { return $serverDocumentsService_engagementMailSecretValue().engagementMailSmtpConfig; }
  });
  return $serverDocumentsService_engagementMailPreparedStatus.instance;
}

function $serverMailService_engagementMailPreparedReason() {
  if (!$serverMailService_engagementMailPreparedReason.instance) $serverMailService_engagementMailPreparedReason.instance = require("./backend/server-mail-service/engagement-mail-prepared-reason").createMailService_engagementMailPreparedReason({
    get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return ENGAGEMENT_MAIL_JOBS_COLLECTION; },
    get FieldValue() { return FieldValue; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementMailPreparedStatus() { return engagementMailPreparedStatus; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get normalizeEmail() { return normalizeEmail; },
    get local$engagementMailJobId() { return $serverMailService_engagementMailJobId().engagementMailJobId; },
    get local$engagementMailJobItemFromData() { return $serverMailService_engagementMailJobItemFromData().engagementMailJobItemFromData; }
  });
  return $serverMailService_engagementMailPreparedReason.instance;
}

function $serverMailService_engagementMailJobId() {
  if (!$serverMailService_engagementMailJobId.instance) $serverMailService_engagementMailJobId.instance = require("./backend/server-mail-service/engagement-mail-job-id").createMailService_engagementMailJobId({
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; },
    get stableHash() { return stableHash; }
  });
  return $serverMailService_engagementMailJobId.instance;
}

function $serverMailService_engagementMailRecipientFromUserDoc() {
  if (!$serverMailService_engagementMailRecipientFromUserDoc.instance) $serverMailService_engagementMailRecipientFromUserDoc.instance = require("./backend/server-mail-service/engagement-mail-recipient-from-user-doc").createMailService_engagementMailRecipientFromUserDoc({
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get activeCapabilitiesFromMap() { return activeCapabilitiesFromMap; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionEmailNotificationsEnabled() { return competitionEmailNotificationsEnabled; },
    get engagementClubName() { return engagementClubName; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverMailService_engagementMailRecipientFromUserDoc.instance;
}

function $serverMailService_engagementMailRecipientShardNumber() {
  if (!$serverMailService_engagementMailRecipientShardNumber.instance) $serverMailService_engagementMailRecipientShardNumber.instance = require("./backend/server-mail-service/engagement-mail-recipient-shard-number").createMailService_engagementMailRecipientShardNumber({
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get stableHash() { return stableHash; }
  });
  return $serverMailService_engagementMailRecipientShardNumber.instance;
}

function $serverMailService_engagementMailRecipientShardRef() {
  if (!$serverMailService_engagementMailRecipientShardRef.instance) $serverMailService_engagementMailRecipientShardRef.instance = require("./backend/server-mail-service/engagement-mail-recipient-shard-ref").createMailService_engagementMailRecipientShardRef({
    get ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION() { return ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION; },
    get cleanText() { return cleanText; }
  });
  return $serverMailService_engagementMailRecipientShardRef.instance;
}

function $serverMailService_engagementMailRecipientIndexStateRef() {
  if (!$serverMailService_engagementMailRecipientIndexStateRef.instance) $serverMailService_engagementMailRecipientIndexStateRef.instance = require("./backend/server-mail-service/engagement-mail-recipient-index-state-ref").createMailService_engagementMailRecipientIndexStateRef({
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION() { return ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION; },
    get ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT() { return ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT; },
    get local$engagementMailRecipientShardRef() { return $serverMailService_engagementMailRecipientShardRef().engagementMailRecipientShardRef; }
  });
  return $serverMailService_engagementMailRecipientIndexStateRef.instance;
}

function $serverMailService_engagementMailRecipientIndexKey() {
  if (!$serverMailService_engagementMailRecipientIndexKey.instance) $serverMailService_engagementMailRecipientIndexKey.instance = require("./backend/server-mail-service/engagement-mail-recipient-index-key").createMailService_engagementMailRecipientIndexKey({
    get stableHash() { return stableHash; }
  });
  return $serverMailService_engagementMailRecipientIndexKey.instance;
}

function $serverMailService_assertEngagementClubAdminDirectorySize() {
  if (!$serverMailService_assertEngagementClubAdminDirectorySize.instance) $serverMailService_assertEngagementClubAdminDirectorySize.instance = require("./backend/server-mail-service/assert-engagement-club-admin-directory-size").createMailService_assertEngagementClubAdminDirectorySize({
    get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION() { return ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION; },
    get ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES() { return ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; },
    get local$engagementRecipientHasCapability() { return $serverMailService_engagementRecipientHasCapability().engagementRecipientHasCapability; }
  });
  return $serverMailService_assertEngagementClubAdminDirectorySize.instance;
}

function $serverMailService_engagementClubAdminDirectoryMap() {
  if (!$serverMailService_engagementClubAdminDirectoryMap.instance) $serverMailService_engagementClubAdminDirectoryMap.instance = require("./backend/server-mail-service/engagement-club-admin-directory-map").createMailService_engagementClubAdminDirectoryMap({
    get local$assertEngagementClubAdminDirectorySize() { return $serverMailService_assertEngagementClubAdminDirectorySize().assertEngagementClubAdminDirectorySize; },
    get local$engagementClubAdminDirectoryEntry() { return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryEntry; },
    get local$engagementClubAdminDirectoryRef() { return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryRef; },
    get local$engagementMailRecipientIndexKey() { return $serverMailService_engagementMailRecipientIndexKey().engagementMailRecipientIndexKey; }
  });
  return $serverMailService_engagementClubAdminDirectoryMap.instance;
}

function $serverMailService_updateEngagementClubAdminDirectory() {
  if (!$serverMailService_updateEngagementClubAdminDirectory.instance) $serverMailService_updateEngagementClubAdminDirectory.instance = require("./backend/server-mail-service/update-engagement-club-admin-directory").createMailService_updateEngagementClubAdminDirectory({
    get cleanText() { return cleanText; },
    get local$engagementMailRecipientFromUserDoc() { return $serverMailService_engagementMailRecipientFromUserDoc().engagementMailRecipientFromUserDoc; },
    get local$assertEngagementClubAdminDirectorySize() { return $serverMailService_assertEngagementClubAdminDirectorySize().assertEngagementClubAdminDirectorySize; },
    get local$engagementClubAdminDirectoryEntry() { return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryEntry; },
    get local$engagementClubAdminDirectoryRef() { return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryRef; },
    get local$engagementMailRecipientIndexKey() { return $serverMailService_engagementMailRecipientIndexKey().engagementMailRecipientIndexKey; }
  });
  return $serverMailService_updateEngagementClubAdminDirectory.instance;
}

function $serverMailService_readEngagementClubAdminDirectory() {
  if (!$serverMailService_readEngagementClubAdminDirectory.instance) $serverMailService_readEngagementClubAdminDirectory.instance = require("./backend/server-mail-service/read-engagement-club-admin-directory").createMailService_readEngagementClubAdminDirectory({
    get cleanText() { return cleanText; },
    get local$engagementClubAdminDirectoryRef() { return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryRef; },
    get local$engagementMailRecipientIndexStateRef() { return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientIndexStateRef; },
    get local$engagementMailRecipientsFromIndex() { return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientsFromIndex; },
    get local$writeEngagementClubAdminDirectory() { return $serverMailService_engagementClubAdminDirectoryMap().writeEngagementClubAdminDirectory; }
  });
  return $serverMailService_readEngagementClubAdminDirectory.instance;
}

function $serverMailService_engagementMailRecipientShardGroups() {
  if (!$serverMailService_engagementMailRecipientShardGroups.instance) $serverMailService_engagementMailRecipientShardGroups.instance = require("./backend/server-mail-service/engagement-mail-recipient-shard-groups").createMailService_engagementMailRecipientShardGroups({
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get local$engagementMailRecipientIndexKey() { return $serverMailService_engagementMailRecipientIndexKey().engagementMailRecipientIndexKey; },
    get local$engagementMailRecipientShardNumber() { return $serverMailService_engagementMailRecipientShardNumber().engagementMailRecipientShardNumber; }
  });
  return $serverMailService_engagementMailRecipientShardGroups.instance;
}

function $serverMailService_bootstrapEngagementMailRecipientIndex() {
  if (!$serverMailService_bootstrapEngagementMailRecipientIndex.instance) $serverMailService_bootstrapEngagementMailRecipientIndex.instance = require("./backend/server-mail-service/bootstrap-engagement-mail-recipient-index").createMailService_bootstrapEngagementMailRecipientIndex({
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT() { return ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get local$engagementMailRecipientFromUserDoc() { return $serverMailService_engagementMailRecipientFromUserDoc().engagementMailRecipientFromUserDoc; },
    get local$engagementMailRecipientIndexStateRef() { return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientIndexStateRef; },
    get local$engagementMailRecipientShardGroups() { return $serverMailService_engagementMailRecipientShardGroups().engagementMailRecipientShardGroups; },
    get local$engagementMailRecipientShardRef() { return $serverMailService_engagementMailRecipientShardRef().engagementMailRecipientShardRef; },
    get local$engagementMailRecipientShardRefs() { return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientShardRefs; },
    get local$engagementMailRecipientsFromIndex() { return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientsFromIndex; },
    get local$engagementRecipientHasCapability() { return $serverMailService_engagementRecipientHasCapability().engagementRecipientHasCapability; },
    get local$writeEngagementClubAdminDirectory() { return $serverMailService_engagementClubAdminDirectoryMap().writeEngagementClubAdminDirectory; }
  });
  return $serverMailService_bootstrapEngagementMailRecipientIndex.instance;
}

function $serverMailService_engagementRecipientHasCapability() {
  if (!$serverMailService_engagementRecipientHasCapability.instance) $serverMailService_engagementRecipientHasCapability.instance = require("./backend/server-mail-service/engagement-recipient-has-capability").createMailService_engagementRecipientHasCapability({

  });
  return $serverMailService_engagementRecipientHasCapability.instance;
}

function $serverMailService_engagementCompetitionDocumentRecipients() {
  if (!$serverMailService_engagementCompetitionDocumentRecipients.instance) $serverMailService_engagementCompetitionDocumentRecipients.instance = require("./backend/server-mail-service/engagement-competition-document-recipients").createMailService_engagementCompetitionDocumentRecipients({
    get cleanEngagementCompetitionLevel() { return cleanEngagementCompetitionLevel; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanText() { return cleanText; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; },
    get normalizeEmail() { return normalizeEmail; },
    get normalizedEngagementRegionKey() { return normalizedEngagementRegionKey; },
    get local$engagementRecipientHasCapability() { return $serverMailService_engagementRecipientHasCapability().engagementRecipientHasCapability; }
  });
  return $serverMailService_engagementCompetitionDocumentRecipients.instance;
}

function $serverMailService_engagementActiveClubMailRecipients() {
  if (!$serverMailService_engagementActiveClubMailRecipients.instance) $serverMailService_engagementActiveClubMailRecipients.instance = require("./backend/server-mail-service/engagement-active-club-mail-recipients").createMailService_engagementActiveClubMailRecipients({
    get local$engagementActiveMailRecipients() { return $serverMailService_bootstrapEngagementMailRecipientIndex().engagementActiveMailRecipients; },
    get local$engagementRecipientHasCapability() { return $serverMailService_engagementRecipientHasCapability().engagementRecipientHasCapability; }
  });
  return $serverMailService_engagementActiveClubMailRecipients.instance;
}

function $serverMailService_engagementMailRecipientFromContext() {
  if (!$serverMailService_engagementMailRecipientFromContext.instance) $serverMailService_engagementMailRecipientFromContext.instance = require("./backend/server-mail-service/engagement-mail-recipient-from-context").createMailService_engagementMailRecipientFromContext({
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverMailService_engagementMailRecipientFromContext.instance;
}

function $serverMailService_engagementCompetitionDocumentMailSubject() {
  if (!$serverMailService_engagementCompetitionDocumentMailSubject.instance) $serverMailService_engagementCompetitionDocumentMailSubject.instance = require("./backend/server-mail-service/engagement-competition-document-mail-subject").createMailService_engagementCompetitionDocumentMailSubject({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get competitionMailLines() { return competitionMailLines; }
  });
  return $serverMailService_engagementCompetitionDocumentMailSubject.instance;
}

function $serverMailService_engagementCompetitionDocumentMailHtml() {
  if (!$serverMailService_engagementCompetitionDocumentMailHtml.instance) $serverMailService_engagementCompetitionDocumentMailHtml.instance = require("./backend/server-mail-service/engagement-competition-document-mail-html").createMailService_engagementCompetitionDocumentMailHtml({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get competitionMailLines() { return competitionMailLines; },
    get escapeMailHtml() { return escapeMailHtml; }
  });
  return $serverMailService_engagementCompetitionDocumentMailHtml.instance;
}

function $serverMailService_engagementRecipientsByClub() {
  if (!$serverMailService_engagementRecipientsByClub.instance) $serverMailService_engagementRecipientsByClub.instance = require("./backend/server-mail-service/engagement-recipients-by-club").createMailService_engagementRecipientsByClub({
    get cleanText() { return cleanText; }
  });
  return $serverMailService_engagementRecipientsByClub.instance;
}

function $serverMailService_engagementOpeningMailSubject() {
  if (!$serverMailService_engagementOpeningMailSubject.instance) $serverMailService_engagementOpeningMailSubject.instance = require("./backend/server-mail-service/engagement-opening-mail-subject").createMailService_engagementOpeningMailSubject({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get competitionMailDateTime() { return competitionMailDateTime; },
    get competitionMailLines() { return competitionMailLines; }
  });
  return $serverMailService_engagementOpeningMailSubject.instance;
}

function $serverMailService_engagementClubRecapMailSubject() {
  if (!$serverMailService_engagementClubRecapMailSubject.instance) $serverMailService_engagementClubRecapMailSubject.instance = require("./backend/server-mail-service/engagement-club-recap-mail-subject").createMailService_engagementClubRecapMailSubject({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get competitionMailLines() { return competitionMailLines; },
    get engagementPdfFeeTotal() { return engagementPdfFeeTotal; },
    get engagementPdfMoney() { return engagementPdfMoney; }
  });
  return $serverMailService_engagementClubRecapMailSubject.instance;
}

function $serverMailService_engagementMailJobItemFromData() {
  if (!$serverMailService_engagementMailJobItemFromData.instance) $serverMailService_engagementMailJobItemFromData.instance = require("./backend/server-mail-service/engagement-mail-job-item-from-data").createMailService_engagementMailJobItemFromData({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get engagementClubCode() { return engagementClubCode; },
    get engagementMailStatusLabel() { return engagementMailStatusLabel; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverMailService_engagementMailJobItemFromData.instance;
}

function $serverMailService_engagementMailAttachments() {
  if (!$serverMailService_engagementMailAttachments.instance) $serverMailService_engagementMailAttachments.instance = require("./backend/server-mail-service/engagement-mail-attachments").createMailService_engagementMailAttachments({
    get cleanText() { return cleanText; },
    get crypto() { return crypto; },
    get readStoredEngagementClubRecapPdf() { return readStoredEngagementClubRecapPdf; }
  });
  return $serverMailService_engagementMailAttachments.instance;
}

function $serverMailService_engagementMailWithNotificationPreferenceFooter() {
  if (!$serverMailService_engagementMailWithNotificationPreferenceFooter.instance) $serverMailService_engagementMailWithNotificationPreferenceFooter.instance = require("./backend/server-mail-service/engagement-mail-with-notification-preference-footer").createMailService_engagementMailWithNotificationPreferenceFooter({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get OPTIONAL_COMPETITION_MAIL_TYPES() { return OPTIONAL_COMPETITION_MAIL_TYPES; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionNotificationPreferenceUrl() { return competitionNotificationPreferenceUrl; },
    get db() { return db; },
    get escapeMailHtml() { return escapeMailHtml; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get normalizeEmail() { return normalizeEmail; },
    get local$engagementMailAttachments() { return $serverMailService_engagementMailAttachments().engagementMailAttachments; },
    get local$engagementMailJobItemFromData() { return $serverMailService_engagementMailJobItemFromData().engagementMailJobItemFromData; }
  });
  return $serverMailService_engagementMailWithNotificationPreferenceFooter.instance;
}

function $serverClubPeopleService_cleanEngagementClubPerson() {
  if (!$serverClubPeopleService_cleanEngagementClubPerson.instance) $serverClubPeopleService_cleanEngagementClubPerson.instance = require("./backend/server-club-people-service/clean-engagement-club-person").createClubPeopleService_cleanEngagementClubPerson({
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get local$engagementClubPeopleRosterPersonItem() { return $serverClubPeopleService_engagementClubPeopleRosterPersonItem().engagementClubPeopleRosterPersonItem; },
    get local$engagementClubPersonItem() { return $serverClubPeopleService_engagementClubPersonItem().engagementClubPersonItem; }
  });
  return $serverClubPeopleService_cleanEngagementClubPerson.instance;
}

function $serverClubPeopleService_engagementClubPersonItem() {
  if (!$serverClubPeopleService_engagementClubPersonItem.instance) $serverClubPeopleService_engagementClubPersonItem.instance = require("./backend/server-club-people-service/engagement-club-person-item").createClubPeopleService_engagementClubPersonItem({
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverClubPeopleService_engagementClubPersonItem.instance;
}

function $serverClubPeopleService_engagementClubPeopleRosterId() {
  if (!$serverClubPeopleService_engagementClubPeopleRosterId.instance) $serverClubPeopleService_engagementClubPeopleRosterId.instance = require("./backend/server-club-people-service/engagement-club-people-roster-id").createClubPeopleService_engagementClubPeopleRosterId({
    get ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION() { return ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverClubPeopleService_engagementClubPeopleRosterId.instance;
}

function $serverClubPeopleService_engagementClubPeopleRosterPersonItem() {
  if (!$serverClubPeopleService_engagementClubPeopleRosterPersonItem.instance) $serverClubPeopleService_engagementClubPeopleRosterPersonItem.instance = require("./backend/server-club-people-service/engagement-club-people-roster-person-item").createClubPeopleService_engagementClubPeopleRosterPersonItem({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverClubPeopleService_engagementClubPeopleRosterPersonItem.instance;
}

function $serverClubPeopleService_engagementClubPeopleRosterPeopleFromData() {
  if (!$serverClubPeopleService_engagementClubPeopleRosterPeopleFromData.instance) $serverClubPeopleService_engagementClubPeopleRosterPeopleFromData.instance = require("./backend/server-club-people-service/engagement-club-people-roster-people-from-data").createClubPeopleService_engagementClubPeopleRosterPeopleFromData({
    get local$engagementClubPeopleRosterPersonItem() { return $serverClubPeopleService_engagementClubPeopleRosterPersonItem().engagementClubPeopleRosterPersonItem; }
  });
  return $serverClubPeopleService_engagementClubPeopleRosterPeopleFromData.instance;
}

function $serverClubPeopleService_upsertEngagementClubPeopleRosterPerson() {
  if (!$serverClubPeopleService_upsertEngagementClubPeopleRosterPerson.instance) $serverClubPeopleService_upsertEngagementClubPeopleRosterPerson.instance = require("./backend/server-club-people-service/upsert-engagement-club-people-roster-person").createClubPeopleService_upsertEngagementClubPeopleRosterPerson({
    get cleanText() { return cleanText; },
    get local$deleteEngagementClubPeopleRosterPerson() { return $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson().deleteEngagementClubPeopleRosterPerson; },
    get local$engagementClubPeopleRosterPersonItem() { return $serverClubPeopleService_engagementClubPeopleRosterPersonItem().engagementClubPeopleRosterPersonItem; },
    get local$engagementClubPeopleRosterRef() { return $serverClubPeopleService_engagementClubPeopleRosterId().engagementClubPeopleRosterRef; }
  });
  return $serverClubPeopleService_upsertEngagementClubPeopleRosterPerson.instance;
}

function $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson() {
  if (!$serverClubPeopleService_deleteEngagementClubPeopleRosterPerson.instance) $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson.instance = require("./backend/server-club-people-service/delete-engagement-club-people-roster-person").createClubPeopleService_deleteEngagementClubPeopleRosterPerson({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get local$engagementClubPeopleRosterRef() { return $serverClubPeopleService_engagementClubPeopleRosterId().engagementClubPeopleRosterRef; }
  });
  return $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson.instance;
}

function $serverClubPeopleService_rebuildEngagementClubPeopleRoster() {
  if (!$serverClubPeopleService_rebuildEngagementClubPeopleRoster.instance) $serverClubPeopleService_rebuildEngagementClubPeopleRoster.instance = require("./backend/server-club-people-service/rebuild-engagement-club-people-roster").createClubPeopleService_rebuildEngagementClubPeopleRoster({
    get cleanText() { return cleanText; },
    get local$engagementClubPeopleRosterPeopleFromData() { return $serverClubPeopleService_engagementClubPeopleRosterPeopleFromData().engagementClubPeopleRosterPeopleFromData; },
    get local$engagementClubPeopleRosterPersonItem() { return $serverClubPeopleService_engagementClubPeopleRosterPersonItem().engagementClubPeopleRosterPersonItem; },
    get local$engagementClubPeopleRosterRef() { return $serverClubPeopleService_engagementClubPeopleRosterId().engagementClubPeopleRosterRef; },
    get local$engagementClubPersonItem() { return $serverClubPeopleService_engagementClubPersonItem().engagementClubPersonItem; }
  });
  return $serverClubPeopleService_rebuildEngagementClubPeopleRoster.instance;
}

function $serverClubPeopleService_syncEngagementClubPeopleRosterFromChange() {
  if (!$serverClubPeopleService_syncEngagementClubPeopleRosterFromChange.instance) $serverClubPeopleService_syncEngagementClubPeopleRosterFromChange.instance = require("./backend/server-club-people-service/sync-engagement-club-people-roster-from-change").createClubPeopleService_syncEngagementClubPeopleRosterFromChange({
    get db() { return db; },
    get local$deleteEngagementClubPeopleRosterPerson() { return $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson().deleteEngagementClubPeopleRosterPerson; },
    get local$engagementClubPersonItem() { return $serverClubPeopleService_engagementClubPersonItem().engagementClubPersonItem; },
    get local$upsertEngagementClubPeopleRosterPerson() { return $serverClubPeopleService_upsertEngagementClubPeopleRosterPerson().upsertEngagementClubPeopleRosterPerson; }
  });
  return $serverClubPeopleService_syncEngagementClubPeopleRosterFromChange.instance;
}

function $serverClubPeopleService_engagementClubSwimmerItem() {
  if (!$serverClubPeopleService_engagementClubSwimmerItem.instance) $serverClubPeopleService_engagementClubSwimmerItem.instance = require("./backend/server-club-people-service/engagement-club-swimmer-item").createClubPeopleService_engagementClubSwimmerItem({
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; }
  });
  return $serverClubPeopleService_engagementClubSwimmerItem.instance;
}

function $serverClubPeopleService_engagementReferenceSwimmerItem() {
  if (!$serverClubPeopleService_engagementReferenceSwimmerItem.instance) $serverClubPeopleService_engagementReferenceSwimmerItem.instance = require("./backend/server-club-people-service/engagement-reference-swimmer-item").createClubPeopleService_engagementReferenceSwimmerItem({
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; }
  });
  return $serverClubPeopleService_engagementReferenceSwimmerItem.instance;
}

function $serverClubPeopleService_engagementReferenceClubSwimmers() {
  if (!$serverClubPeopleService_engagementReferenceClubSwimmers.instance) $serverClubPeopleService_engagementReferenceClubSwimmers.instance = require("./backend/server-club-people-service/engagement-reference-club-swimmers").createClubPeopleService_engagementReferenceClubSwimmers({
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementClubRosterSwimmerKey() { return engagementClubRosterSwimmerKey; },
    get engagementLegacySwimmerLicensesByClub() { return engagementLegacySwimmerLicensesByClub; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get local$engagementClubSwimmerItem() { return $serverClubPeopleService_engagementClubSwimmerItem().engagementClubSwimmerItem; },
    get local$engagementReferenceSwimmerItem() { return $serverClubPeopleService_engagementReferenceSwimmerItem().engagementReferenceSwimmerItem; },
    get local$sortEngagementClubSwimmers() { return $serverClubPeopleService_engagementClubSwimmerMatchKeys().sortEngagementClubSwimmers; },
    get local$uniqueEngagementClubSwimmers() { return $serverClubPeopleService_engagementClubSwimmerMatchKeys().uniqueEngagementClubSwimmers; }
  });
  return $serverClubPeopleService_engagementReferenceClubSwimmers.instance;
}

function $serverClubPeopleService_engagementClubSwimmerMatchKeys() {
  if (!$serverClubPeopleService_engagementClubSwimmerMatchKeys.instance) $serverClubPeopleService_engagementClubSwimmerMatchKeys.instance = require("./backend/server-club-people-service/engagement-club-swimmer-match-keys").createClubPeopleService_engagementClubSwimmerMatchKeys({
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; }
  });
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys.instance;
}

function $serverClubPeopleService_syncEngagementClubRosterFromSwimmerChange() {
  if (!$serverClubPeopleService_syncEngagementClubRosterFromSwimmerChange.instance) $serverClubPeopleService_syncEngagementClubRosterFromSwimmerChange.instance = require("./backend/server-club-people-service/sync-engagement-club-roster-from-swimmer-change").createClubPeopleService_syncEngagementClubRosterFromSwimmerChange({
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get deleteEngagementEntryTimeCache() { return deleteEngagementEntryTimeCache; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; },
    get engagementClubRosterSwimmerKey() { return engagementClubRosterSwimmerKey; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; }
  });
  return $serverClubPeopleService_syncEngagementClubRosterFromSwimmerChange.instance;
}

function $serverClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows() {
  if (!$serverClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows.instance) $serverClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows.instance = require("./backend/server-club-people-service/reactivate-engagement-club-roster-swimmers-from-performance-rows").createClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows({
    get cleanEngagementClubActivityStatus() { return cleanEngagementClubActivityStatus; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmerItem() { return engagementClubRosterSwimmerItem; }
  });
  return $serverClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows.instance;
}

function $serverClubPeopleService_cleanIsoDateTime() {
  if (!$serverClubPeopleService_cleanIsoDateTime.instance) $serverClubPeopleService_cleanIsoDateTime.instance = require("./backend/server-club-people-service/clean-iso-date-time").createClubPeopleService_cleanIsoDateTime({
    get cleanText() { return cleanText; }
  });
  return $serverClubPeopleService_cleanIsoDateTime.instance;
}

function $serverClubPeopleService_cleanEngagementDeadlineAt() {
  if (!$serverClubPeopleService_cleanEngagementDeadlineAt.instance) $serverClubPeopleService_cleanEngagementDeadlineAt.instance = require("./backend/server-club-people-service/clean-engagement-deadline-at").createClubPeopleService_cleanEngagementDeadlineAt({
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get local$cleanIsoDateTime() { return $serverClubPeopleService_cleanIsoDateTime().cleanIsoDateTime; }
  });
  return $serverClubPeopleService_cleanEngagementDeadlineAt.instance;
}

function $serverClubPeopleService_cleanEngagementRegionIds() {
  if (!$serverClubPeopleService_cleanEngagementRegionIds.instance) $serverClubPeopleService_cleanEngagementRegionIds.instance = require("./backend/server-club-people-service/clean-engagement-region-ids").createClubPeopleService_cleanEngagementRegionIds({
    get cleanText() { return cleanText; },
    get normalizedEngagementRegionKey() { return normalizedEngagementRegionKey; }
  });
  return $serverClubPeopleService_cleanEngagementRegionIds.instance;
}

function $serverCompetitionService_cleanEngagementCompetitionPayload() {
  if (!$serverCompetitionService_cleanEngagementCompetitionPayload.instance) $serverCompetitionService_cleanEngagementCompetitionPayload.instance = require("./backend/server-competition-service/clean-engagement-competition-payload").createCompetitionService_cleanEngagementCompetitionPayload({
    get HttpsError() { return HttpsError; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionLevel() { return cleanEngagementCompetitionLevel; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementDeadlineAt() { return cleanEngagementDeadlineAt; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanEngagementFees() { return cleanEngagementFees; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLaneCount() { return cleanEngagementPoolLaneCount; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementProgramSessions() { return cleanEngagementProgramSessions; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementRegionIds() { return cleanEngagementRegionIds; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanEngagementWaterBodyType() { return cleanEngagementWaterBodyType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanOptionalEmail() { return cleanOptionalEmail; },
    get cleanPublicCalendarWhatsAppUrl() { return cleanPublicCalendarWhatsAppUrl; },
    get cleanText() { return cleanText; },
    get isEngagementOpeningDeadlinePast() { return isEngagementOpeningDeadlinePast; },
    get isEngagementOpeningTooEarly() { return isEngagementOpeningTooEarly; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; }
  });
  return $serverCompetitionService_cleanEngagementCompetitionPayload.instance;
}

function $serverCompetitionService_assertCanManageEngagementCompetition() {
  if (!$serverCompetitionService_assertCanManageEngagementCompetition.instance) $serverCompetitionService_assertCanManageEngagementCompetition.instance = require("./backend/server-competition-service/assert-can-manage-engagement-competition").createCompetitionService_assertCanManageEngagementCompetition({
    get HttpsError() { return HttpsError; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get isNationalOnlyEngagementCompetitionLevel() { return isNationalOnlyEngagementCompetitionLevel; }
  });
  return $serverCompetitionService_assertCanManageEngagementCompetition.instance;
}

function $serverCompetitionService_engagementEventIsPast() {
  if (!$serverCompetitionService_engagementEventIsPast.instance) $serverCompetitionService_engagementEventIsPast.instance = require("./backend/server-competition-service/engagement-event-is-past").createCompetitionService_engagementEventIsPast({
    get cleanIsoDate() { return cleanIsoDate; }
  });
  return $serverCompetitionService_engagementEventIsPast.instance;
}

function $serverCompetitionService_assertCanModifyEngagementEvent() {
  if (!$serverCompetitionService_assertCanModifyEngagementEvent.instance) $serverCompetitionService_assertCanModifyEngagementEvent.instance = require("./backend/server-competition-service/assert-can-modify-engagement-event").createCompetitionService_assertCanModifyEngagementEvent({
    get HttpsError() { return HttpsError; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$engagementEventIsPast() { return $serverCompetitionService_engagementEventIsPast().engagementEventIsPast; }
  });
  return $serverCompetitionService_assertCanModifyEngagementEvent.instance;
}

function $serverCompetitionService_assertCanDeleteEngagementDocument() {
  if (!$serverCompetitionService_assertCanDeleteEngagementDocument.instance) $serverCompetitionService_assertCanDeleteEngagementDocument.instance = require("./backend/server-competition-service/assert-can-delete-engagement-document").createCompetitionService_assertCanDeleteEngagementDocument({
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get competitionDocumentDownloadUrl() { return competitionDocumentDownloadUrl; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get storage() { return storage; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$engagementEventIsPast() { return $serverCompetitionService_engagementEventIsPast().engagementEventIsPast; },
    get local$nativeDocumentAuthors() { return $serverCompetitionService_nativeDocumentAuthors().nativeDocumentAuthors; }
  });
  return $serverCompetitionService_assertCanDeleteEngagementDocument.instance;
}

function $serverCompetitionService_engagementDeletionRequestId() {
  if (!$serverCompetitionService_engagementDeletionRequestId.instance) $serverCompetitionService_engagementDeletionRequestId.instance = require("./backend/server-competition-service/engagement-deletion-request-id").createCompetitionService_engagementDeletionRequestId({

  });
  return $serverCompetitionService_engagementDeletionRequestId.instance;
}

function $serverCompetitionService_assertEngagementClubWriteOpen() {
  if (!$serverCompetitionService_assertEngagementClubWriteOpen.instance) $serverCompetitionService_assertEngagementClubWriteOpen.instance = require("./backend/server-competition-service/assert-engagement-club-write-open").createCompetitionService_assertEngagementClubWriteOpen({
    get HttpsError() { return HttpsError; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanIsoDateTime() { return cleanIsoDateTime; }
  });
  return $serverCompetitionService_assertEngagementClubWriteOpen.instance;
}

function $serverCompetitionService_nativePortalCalendarItems() {
  if (!$serverCompetitionService_nativePortalCalendarItems.instance) $serverCompetitionService_nativePortalCalendarItems.instance = require("./backend/server-competition-service/native-portal-calendar-items").createCompetitionService_nativePortalCalendarItems({

  });
  return $serverCompetitionService_nativePortalCalendarItems.instance;
}

function $serverCompetitionService_nativeDocumentAuthors() {
  if (!$serverCompetitionService_nativeDocumentAuthors.instance) $serverCompetitionService_nativeDocumentAuthors.instance = require("./backend/server-competition-service/native-document-authors").createCompetitionService_nativeDocumentAuthors({
    get cleanText() { return cleanText; },
    get getAuth() { return getAuth; }
  });
  return $serverCompetitionService_nativeDocumentAuthors.instance;
}

function $serverCompetitionService_nativePortalCompetition() {
  if (!$serverCompetitionService_nativePortalCompetition.instance) $serverCompetitionService_nativePortalCompetition.instance = require("./backend/server-competition-service/native-portal-competition").createCompetitionService_nativePortalCompetition({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get local$nativeDocumentAuthors() { return $serverCompetitionService_nativeDocumentAuthors().nativeDocumentAuthors; }
  });
  return $serverCompetitionService_nativePortalCompetition.instance;
}

function $serverCompetitionService_createNativePortalCalendarRecord() {
  if (!$serverCompetitionService_createNativePortalCalendarRecord.instance) $serverCompetitionService_createNativePortalCalendarRecord.instance = require("./backend/server-competition-service/create-native-portal-calendar-record").createCompetitionService_createNativePortalCalendarRecord({
    get CLUB_REFERENCE_REGION_LABELS() { return CLUB_REFERENCE_REGION_LABELS; },
    get HttpsError() { return HttpsError; },
    get cleanEngagementCalendarEventPayload() { return cleanEngagementCalendarEventPayload; },
    get db() { return db; },
    get engagementRegionsMatch() { return engagementRegionsMatch; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$assertCanModifyEngagementEvent() { return $serverCompetitionService_assertCanModifyEngagementEvent().assertCanModifyEngagementEvent; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_createNativePortalCalendarRecord.instance;
}

function $serverCompetitionService_nativeClubEntryView() {
  if (!$serverCompetitionService_nativeClubEntryView.instance) $serverCompetitionService_nativeClubEntryView.instance = require("./backend/server-competition-service/native-club-entry-view").createCompetitionService_nativeClubEntryView({
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get birthYear() { return birthYear; },
    get competitionYear() { return competitionYear; },
    get importSeasonYear() { return importSeasonYear; }
  });
  return $serverCompetitionService_nativeClubEntryView.instance;
}

function $serverCompetitionService_engagementCompetitionDocumentUploader() {
  if (!$serverCompetitionService_engagementCompetitionDocumentUploader.instance) $serverCompetitionService_engagementCompetitionDocumentUploader.instance = require("./backend/server-competition-service/engagement-competition-document-uploader").createCompetitionService_engagementCompetitionDocumentUploader({
    get cleanText() { return cleanText; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverCompetitionService_engagementCompetitionDocumentUploader.instance;
}

function $serverCompetitionService_assertEngagementCompetitionDocumentPath() {
  if (!$serverCompetitionService_assertEngagementCompetitionDocumentPath.instance) $serverCompetitionService_assertEngagementCompetitionDocumentPath.instance = require("./backend/server-competition-service/assert-engagement-competition-document-path").createCompetitionService_assertEngagementCompetitionDocumentPath({
    get ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX() { return ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; }
  });
  return $serverCompetitionService_assertEngagementCompetitionDocumentPath.instance;
}

function $serverCompetitionService_engagementCompetitionDocumentContext() {
  if (!$serverCompetitionService_engagementCompetitionDocumentContext.instance) $serverCompetitionService_engagementCompetitionDocumentContext.instance = require("./backend/server-competition-service/engagement-competition-document-context").createCompetitionService_engagementCompetitionDocumentContext({
    get ENGAGEMENT_CALENDAR_EVENTS_COLLECTION() { return ENGAGEMENT_CALENDAR_EVENTS_COLLECTION; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; }
  });
  return $serverCompetitionService_engagementCompetitionDocumentContext.instance;
}

function $serverCompetitionService_nationalLibraryContext() {
  if (!$serverCompetitionService_nationalLibraryContext.instance) $serverCompetitionService_nationalLibraryContext.instance = require("./backend/server-competition-service/national-library-context").createCompetitionService_nationalLibraryContext({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get engagementAccessContext() { return engagementAccessContext; }
  });
  return $serverCompetitionService_nationalLibraryContext.instance;
}

function $serverCompetitionService_manageNationalLibraryDocuments() {
  if (!$serverCompetitionService_manageNationalLibraryDocuments.instance) $serverCompetitionService_manageNationalLibraryDocuments.instance = require("./backend/server-competition-service/manage-national-library-documents").createCompetitionService_manageNationalLibraryDocuments({
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get competitionDocumentDownloadUrl() { return competitionDocumentDownloadUrl; },
    get db() { return db; },
    get storage() { return storage; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$nationalLibraryContext() { return $serverCompetitionService_nationalLibraryContext().nationalLibraryContext; }
  });
  return $serverCompetitionService_manageNationalLibraryDocuments.instance;
}

function $serverCompetitionService_notifyNationalLibraryDocument() {
  if (!$serverCompetitionService_notifyNationalLibraryDocument.instance) $serverCompetitionService_notifyNationalLibraryDocument.instance = require("./backend/server-competition-service/notify-national-library-document").createCompetitionService_notifyNationalLibraryDocument({
    get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return ENGAGEMENT_MAIL_JOBS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get crypto() { return crypto; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementDedupMailRecipients() { return engagementDedupMailRecipients; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementRecipientHasCapability() { return engagementRecipientHasCapability; },
    get nodemailer() { return nodemailer; },
    get sendEngagementMailJob() { return sendEngagementMailJob; },
    get writeAuditLog() { return writeAuditLog; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$enqueueNativeNotificationTask() { return $serverCompetitionService_enqueueNativeNotificationTask().enqueueNativeNotificationTask; },
    get local$nationalLibraryContext() { return $serverCompetitionService_nationalLibraryContext().nationalLibraryContext; },
    get local$nativeNotificationPreview() { return $serverCompetitionService_nativeNotificationPreview().nativeNotificationPreview; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_notifyNationalLibraryDocument.instance;
}

function $serverCompetitionService_generateNativeClubRecapPdf() {
  if (!$serverCompetitionService_generateNativeClubRecapPdf.instance) $serverCompetitionService_generateNativeClubRecapPdf.instance = require("./backend/server-competition-service/generate-native-club-recap-pdf").createCompetitionService_generateNativeClubRecapPdf({
    get HttpsError() { return HttpsError; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get local$nativeClubEntryView() { return $serverCompetitionService_nativeClubEntryView().nativeClubEntryView; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_generateNativeClubRecapPdf.instance;
}

function $serverCompetitionService_nativeAdminCompetitionEntries() {
  if (!$serverCompetitionService_nativeAdminCompetitionEntries.instance) $serverCompetitionService_nativeAdminCompetitionEntries.instance = require("./backend/server-competition-service/native-admin-competition-entries").createCompetitionService_nativeAdminCompetitionEntries({
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_nativeAdminCompetitionEntries.instance;
}

function $serverCompetitionService_nativeNotificationPreview() {
  if (!$serverCompetitionService_nativeNotificationPreview.instance) $serverCompetitionService_nativeNotificationPreview.instance = require("./backend/server-competition-service/native-notification-preview").createCompetitionService_nativeNotificationPreview({
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementAccessContext() { return engagementAccessContext; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementCompetitionDocumentRecipients() { return engagementCompetitionDocumentRecipients; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementCompetitionOpeningRecipients() { return engagementCompetitionOpeningRecipients; },
    get engagementDedupMailRecipients() { return engagementDedupMailRecipients; },
    get engagementMailRecipientFromContext() { return engagementMailRecipientFromContext; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementRecipientHasCapability() { return engagementRecipientHasCapability; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_nativeNotificationPreview.instance;
}

function $serverCompetitionService_nativeNotificationAutomationServices() {
  if (!$serverCompetitionService_nativeNotificationAutomationServices.instance) $serverCompetitionService_nativeNotificationAutomationServices.instance = require("./backend/server-competition-service/native-notification-automation-services").createCompetitionService_nativeNotificationAutomationServices({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldValue() { return FieldValue; },
    get HttpsError() { return HttpsError; },
    get LIVEPALMES_STORAGE_BUCKET() { return LIVEPALMES_STORAGE_BUCKET; },
    get REGION() { return REGION; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get buildEngagementClubRecapPdf() { return buildEngagementClubRecapPdf; },
    get buildEngagementCompetitionTxt() { return buildEngagementCompetitionTxt; },
    get buildEngagementOfficialsPdf() { return buildEngagementOfficialsPdf; },
    get db() { return db; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubRecapMailSubject() { return engagementClubRecapMailSubject; },
    get engagementClubRecapMailText() { return engagementClubRecapMailText; },
    get engagementCompetitionDocumentMailSubject() { return engagementCompetitionDocumentMailSubject; },
    get engagementCompetitionDocumentMailText() { return engagementCompetitionDocumentMailText; },
    get engagementCompetitionDocumentRecipients() { return engagementCompetitionDocumentRecipients; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementCompetitionOpeningRecipients() { return engagementCompetitionOpeningRecipients; },
    get engagementDedupMailRecipients() { return engagementDedupMailRecipients; },
    get engagementMailAttachments() { return engagementMailAttachments; },
    get engagementMailJobId() { return engagementMailJobId; },
    get engagementMailRecipientFromUserDoc() { return engagementMailRecipientFromUserDoc; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementOfficialsMailSubject() { return engagementOfficialsMailSubject; },
    get engagementOfficialsMailText() { return engagementOfficialsMailText; },
    get engagementOfficialsPdfRows() { return engagementOfficialsPdfRows; },
    get engagementOpeningMailSubject() { return engagementOpeningMailSubject; },
    get engagementOpeningMailText() { return engagementOpeningMailText; },
    get engagementPdfFileName() { return engagementPdfFileName; },
    get engagementRecipientHasCapability() { return engagementRecipientHasCapability; },
    get engagementTxtMailSubject() { return engagementTxtMailSubject; },
    get engagementTxtMailText() { return engagementTxtMailText; },
    get engagementTxtSwimmerCategory() { return engagementTxtSwimmerCategory; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nodemailer() { return nodemailer; },
    get normalizeEmail() { return normalizeEmail; },
    get storage() { return storage; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_nativeNotificationAutomationServices.instance;
}

function $serverCompetitionService_enqueueNativeNotificationTask() {
  if (!$serverCompetitionService_enqueueNativeNotificationTask.instance) $serverCompetitionService_enqueueNativeNotificationTask.instance = require("./backend/server-competition-service/enqueue-native-notification-task").createCompetitionService_enqueueNativeNotificationTask({
    get db() { return db; },
    get local$nativeNotificationTaskServices() { return $serverCompetitionService_nativeNotificationAutomationServices().nativeNotificationTaskServices; }
  });
  return $serverCompetitionService_enqueueNativeNotificationTask.instance;
}

function $serverCompetitionService_deliverNativeNotificationJobs() {
  if (!$serverCompetitionService_deliverNativeNotificationJobs.instance) $serverCompetitionService_deliverNativeNotificationJobs.instance = require("./backend/server-competition-service/deliver-native-notification-jobs").createCompetitionService_deliverNativeNotificationJobs({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get db() { return db; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get nodemailer() { return nodemailer; },
    get sendEngagementMailJob() { return sendEngagementMailJob; }
  });
  return $serverCompetitionService_deliverNativeNotificationJobs.instance;
}

function $serverCompetitionService_armNativeCompetitionNotification() {
  if (!$serverCompetitionService_armNativeCompetitionNotification.instance) $serverCompetitionService_armNativeCompetitionNotification.instance = require("./backend/server-competition-service/arm-native-competition-notification").createCompetitionService_armNativeCompetitionNotification({
    get db() { return db; },
    get local$assertCanManageEngagementCompetition() { return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition; },
    get local$enqueueNativeNotificationTask() { return $serverCompetitionService_enqueueNativeNotificationTask().enqueueNativeNotificationTask; },
    get local$nativePortalCompetition() { return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition; }
  });
  return $serverCompetitionService_armNativeCompetitionNotification.instance;
}

function $serverCompetitionService_prepareEngagementClubRecapEmailJobs() {
  if (!$serverCompetitionService_prepareEngagementClubRecapEmailJobs.instance) $serverCompetitionService_prepareEngagementClubRecapEmailJobs.instance = require("./backend/server-competition-service/prepare-engagement-club-recap-email-jobs").createCompetitionService_prepareEngagementClubRecapEmailJobs({
    get cleanText() { return cleanText; },
    get engagementActiveClubMailRecipients() { return engagementActiveClubMailRecipients; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementClubRecapMailSubject() { return engagementClubRecapMailSubject; },
    get engagementClubRecapMailText() { return engagementClubRecapMailText; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementMailPreparedStatus() { return engagementMailPreparedStatus; },
    get engagementRecipientsByClub() { return engagementRecipientsByClub; },
    get getOrCreateEngagementClubRecapPdf() { return getOrCreateEngagementClubRecapPdf; },
    get upsertEngagementMailJob() { return upsertEngagementMailJob; }
  });
  return $serverCompetitionService_prepareEngagementClubRecapEmailJobs.instance;
}

function $serverCompetitionService_engagementClosureAutomationContext() {
  if (!$serverCompetitionService_engagementClosureAutomationContext.instance) $serverCompetitionService_engagementClosureAutomationContext.instance = require("./backend/server-competition-service/engagement-closure-automation-context").createCompetitionService_engagementClosureAutomationContext({
    get FieldValue() { return FieldValue; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryStatus() { return cleanEngagementEntryStatus; },
    get cleanEngagementGeneratedFiles() { return cleanEngagementGeneratedFiles; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDateTime() { return cleanIsoDateTime; },
    get cleanText() { return cleanText; },
    get engagementCompetitionDetailItem() { return engagementCompetitionDetailItem; },
    get engagementMailPreparedStatus() { return engagementMailPreparedStatus; },
    get engagementOfficialsMailSubject() { return engagementOfficialsMailSubject; },
    get engagementOfficialsMailText() { return engagementOfficialsMailText; },
    get engagementTxtMailSubject() { return engagementTxtMailSubject; },
    get engagementTxtMailText() { return engagementTxtMailText; },
    get getOrCreateEngagementCompetitionTxt() { return getOrCreateEngagementCompetitionTxt; },
    get getOrCreateEngagementOfficialsPdf() { return getOrCreateEngagementOfficialsPdf; },
    get normalizeEmail() { return normalizeEmail; },
    get upsertEngagementMailJob() { return upsertEngagementMailJob; },
    get writeAuditLog() { return writeAuditLog; },
    get local$prepareEngagementClubRecapEmailJobs() { return $serverCompetitionService_prepareEngagementClubRecapEmailJobs().prepareEngagementClubRecapEmailJobs; },
    get local$sendEngagementPreparedEmailJobs() { return $serverCompetitionService_sendEngagementPreparedEmailJobs().sendEngagementPreparedEmailJobs; }
  });
  return $serverCompetitionService_engagementClosureAutomationContext.instance;
}

function $serverCompetitionService_sendEngagementPreparedEmailJobs() {
  if (!$serverCompetitionService_sendEngagementPreparedEmailJobs.instance) $serverCompetitionService_sendEngagementPreparedEmailJobs.instance = require("./backend/server-competition-service/send-engagement-prepared-email-jobs").createCompetitionService_sendEngagementPreparedEmailJobs({
    get ENGAGEMENT_MAIL_CAPABILITIES() { return ENGAGEMENT_MAIL_CAPABILITIES; },
    get ENGAGEMENT_MAIL_JOBS_COLLECTION() { return ENGAGEMENT_MAIL_JOBS_COLLECTION; },
    get HttpsError() { return HttpsError; },
    get OPTIONAL_COMPETITION_MAIL_TYPES() { return OPTIONAL_COMPETITION_MAIL_TYPES; },
    get cleanText() { return cleanText; },
    get engagementActiveMailRecipients() { return engagementActiveMailRecipients; },
    get engagementClubEntryHasParticipants() { return engagementClubEntryHasParticipants; },
    get engagementClubEntryItem() { return engagementClubEntryItem; },
    get engagementCompetitionNotificationRecipients() { return engagementCompetitionNotificationRecipients; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get nodemailer() { return nodemailer; },
    get sendEngagementMailJob() { return sendEngagementMailJob; }
  });
  return $serverCompetitionService_sendEngagementPreparedEmailJobs.instance;
}

function $serverCompetitionService_resolveEngagementClubPersonSwimmer() {
  if (!$serverCompetitionService_resolveEngagementClubPersonSwimmer.instance) $serverCompetitionService_resolveEngagementClubPersonSwimmer.instance = require("./backend/server-competition-service/resolve-engagement-club-person-swimmer").createCompetitionService_resolveEngagementClubPersonSwimmer({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get engagementClubRosterRef() { return engagementClubRosterRef; },
    get engagementClubRosterSwimmersFromData() { return engagementClubRosterSwimmersFromData; }
  });
  return $serverCompetitionService_resolveEngagementClubPersonSwimmer.instance;
}

function $serverCompetitionService_saveNativeClubOfficials() {
  if (!$serverCompetitionService_saveNativeClubOfficials.instance) $serverCompetitionService_saveNativeClubOfficials.instance = require("./backend/server-competition-service/save-native-club-officials").createCompetitionService_saveNativeClubOfficials({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get db() { return db; },
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$nativeClubEntryView() { return $serverCompetitionService_nativeClubEntryView().nativeClubEntryView; }
  });
  return $serverCompetitionService_saveNativeClubOfficials.instance;
}

function $serverNationalService_importSwimmerCreation() {
  if (!$serverNationalService_importSwimmerCreation.instance) $serverNationalService_importSwimmerCreation.instance = require("./backend/server-national-service/import-swimmer-creation").createNationalService_importSwimmerCreation({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get authorizeNativePerformance() { return authorizeNativePerformance; },
    get db() { return db; },
    get engagementNewSwimmerAlertFromMatch() { return engagementNewSwimmerAlertFromMatch; },
    get nativePerformanceFailure() { return nativePerformanceFailure; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $serverNationalService_importSwimmerCreation.instance;
}

function $serverNationalService_nationalSwimmerSearchMatches() {
  if (!$serverNationalService_nationalSwimmerSearchMatches.instance) $serverNationalService_nationalSwimmerSearchMatches.instance = require("./backend/server-national-service/national-swimmer-search-matches").createNationalService_nationalSwimmerSearchMatches({
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get local$engagementNationalSwimmerItemFromDoc() { return $serverNationalService_engagementNationalSwimmerItemFromDoc().engagementNationalSwimmerItemFromDoc; }
  });
  return $serverNationalService_nationalSwimmerSearchMatches.instance;
}

function $serverNationalService_engagementLicenseControlSeason() {
  if (!$serverNationalService_engagementLicenseControlSeason.instance) $serverNationalService_engagementLicenseControlSeason.instance = require("./backend/server-national-service/engagement-license-control-season").createNationalService_engagementLicenseControlSeason({
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; }
  });
  return $serverNationalService_engagementLicenseControlSeason.instance;
}

function $serverNationalService_engagementLicenseControlPerson() {
  if (!$serverNationalService_engagementLicenseControlPerson.instance) $serverNationalService_engagementLicenseControlPerson.instance = require("./backend/server-national-service/engagement-license-control-person").createNationalService_engagementLicenseControlPerson({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementMailRecipientIndexStateRef() { return engagementMailRecipientIndexStateRef; },
    get engagementMailRecipientsFromIndex() { return engagementMailRecipientsFromIndex; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nodemailer() { return nodemailer; }
  });
  return $serverNationalService_engagementLicenseControlPerson.instance;
}

function $serverNationalService_engagementSwimmerIdentitySnapshot() {
  if (!$serverNationalService_engagementSwimmerIdentitySnapshot.instance) $serverNationalService_engagementSwimmerIdentitySnapshot.instance = require("./backend/server-national-service/engagement-swimmer-identity-snapshot").createNationalService_engagementSwimmerIdentitySnapshot({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; }
  });
  return $serverNationalService_engagementSwimmerIdentitySnapshot.instance;
}

function $serverNationalService_cleanEngagementSwimmerIdentityCorrection() {
  if (!$serverNationalService_cleanEngagementSwimmerIdentityCorrection.instance) $serverNationalService_cleanEngagementSwimmerIdentityCorrection.instance = require("./backend/server-national-service/clean-engagement-swimmer-identity-correction").createNationalService_cleanEngagementSwimmerIdentityCorrection({
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; }
  });
  return $serverNationalService_cleanEngagementSwimmerIdentityCorrection.instance;
}

function $serverNationalService_findEngagementSwimmerCorrectionLicense() {
  if (!$serverNationalService_findEngagementSwimmerCorrectionLicense.instance) $serverNationalService_findEngagementSwimmerCorrectionLicense.instance = require("./backend/server-national-service/find-engagement-swimmer-correction-license").createNationalService_findEngagementSwimmerCorrectionLicense({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get aggregateSwimmerIndexRows() { return aggregateSwimmerIndexRows; },
    get cleanText() { return cleanText; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseItem() { return engagementSwimmerLicenseItem; },
    get findReferenceSwimmerCorrectionTarget() { return findReferenceSwimmerCorrectionTarget; },
    get getPerformanceBaseRowsBySwimmer() { return getPerformanceBaseRowsBySwimmer; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; }
  });
  return $serverNationalService_findEngagementSwimmerCorrectionLicense.instance;
}

function $serverNationalService_applyEngagementSwimmerIdentityCorrection() {
  if (!$serverNationalService_applyEngagementSwimmerIdentityCorrection.instance) $serverNationalService_applyEngagementSwimmerIdentityCorrection.instance = require("./backend/server-national-service/apply-engagement-swimmer-identity-correction").createNationalService_applyEngagementSwimmerIdentityCorrection({
    get ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE() { return ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE; },
    get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get assertNoEngagementSwimmerLicenseConflict() { return assertNoEngagementSwimmerLicenseConflict; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get currentEngagementCategoryFromBirthDate() { return currentEngagementCategoryFromBirthDate; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementSwimmerLicenseId() { return engagementSwimmerLicenseId; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get engagementSwimmerLicenseNumberKey() { return engagementSwimmerLicenseNumberKey; },
    get engagementSwimmerLicensePayload() { return engagementSwimmerLicensePayload; },
    get getPerformanceBaseRowsBySwimmer() { return getPerformanceBaseRowsBySwimmer; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get performanceSwimmerIndexDocId() { return performanceSwimmerIndexDocId; },
    get performanceSwimmerPageId() { return performanceSwimmerPageId; },
    get publicSwimmerKey() { return publicSwimmerKey; },
    get rebuildPublicPerformanceFilesForAffectedRows() { return rebuildPublicPerformanceFilesForAffectedRows; },
    get rebuildPublicTopFilesForAffectedRows() { return rebuildPublicTopFilesForAffectedRows; },
    get replacePublicSwimmerIdentity() { return replacePublicSwimmerIdentity; },
    get stableHash() { return stableHash; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; },
    get writePerformanceSwimmerIndexRows() { return writePerformanceSwimmerIndexRows; },
    get writePerformanceSwimmerPageRows() { return writePerformanceSwimmerPageRows; },
    get local$engagementSwimmerIdentitySnapshot() { return $serverNationalService_engagementSwimmerIdentitySnapshot().engagementSwimmerIdentitySnapshot; }
  });
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection.instance;
}

function $serverNationalService_setEngagementSwimmerChangeRequestRosterState() {
  if (!$serverNationalService_setEngagementSwimmerChangeRequestRosterState.instance) $serverNationalService_setEngagementSwimmerChangeRequestRosterState.instance = require("./backend/server-national-service/set-engagement-swimmer-change-request-roster-state").createNationalService_setEngagementSwimmerChangeRequestRosterState({
    get db() { return db; },
    get upsertEngagementClubRosterSwimmer() { return upsertEngagementClubRosterSwimmer; },
    get local$engagementSwimmerIdentitySnapshot() { return $serverNationalService_engagementSwimmerIdentitySnapshot().engagementSwimmerIdentitySnapshot; }
  });
  return $serverNationalService_setEngagementSwimmerChangeRequestRosterState.instance;
}

function $serverNationalService_engagementSwimmerChangeRequestItem() {
  if (!$serverNationalService_engagementSwimmerChangeRequestItem.instance) $serverNationalService_engagementSwimmerChangeRequestItem.instance = require("./backend/server-national-service/engagement-swimmer-change-request-item").createNationalService_engagementSwimmerChangeRequestItem({
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get local$engagementSwimmerIdentitySnapshot() { return $serverNationalService_engagementSwimmerIdentitySnapshot().engagementSwimmerIdentitySnapshot; }
  });
  return $serverNationalService_engagementSwimmerChangeRequestItem.instance;
}

function $serverNationalService_sendEngagementSwimmerChangeResolutionNotification() {
  if (!$serverNationalService_sendEngagementSwimmerChangeResolutionNotification.instance) $serverNationalService_sendEngagementSwimmerChangeResolutionNotification.instance = require("./backend/server-national-service/send-engagement-swimmer-change-resolution-notification").createNationalService_sendEngagementSwimmerChangeResolutionNotification({
    get cleanText() { return cleanText; },
    get engagementMailSmtpConfig() { return engagementMailSmtpConfig; },
    get engagementSwimmerChangeResolutionMail() { return engagementSwimmerChangeResolutionMail; },
    get livePalmesMailHtml() { return livePalmesMailHtml; },
    get nodemailer() { return nodemailer; },
    get normalizeEmail() { return normalizeEmail; }
  });
  return $serverNationalService_sendEngagementSwimmerChangeResolutionNotification.instance;
}

function $serverNationalService_engagementNationalAdministrationPendingCounts() {
  if (!$serverNationalService_engagementNationalAdministrationPendingCounts.instance) $serverNationalService_engagementNationalAdministrationPendingCounts.instance = require("./backend/server-national-service/engagement-national-administration-pending-counts").createNationalService_engagementNationalAdministrationPendingCounts({
    get ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION() { return ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get db() { return db; }
  });
  return $serverNationalService_engagementNationalAdministrationPendingCounts.instance;
}

function $serverNationalService_deleteEngagementClubSwimmerPermanently() {
  if (!$serverNationalService_deleteEngagementClubSwimmerPermanently.instance) $serverNationalService_deleteEngagementClubSwimmerPermanently.instance = require("./backend/server-national-service/delete-engagement-club-swimmer-permanently").createNationalService_deleteEngagementClubSwimmerPermanently({
    get ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION() { return ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get deleteEngagementClubRosterSwimmer() { return deleteEngagementClubRosterSwimmer; },
    get engagementSwimmerLicenseNumberId() { return engagementSwimmerLicenseNumberId; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $serverNationalService_deleteEngagementClubSwimmerPermanently.instance;
}

function $serverNationalService_engagementNationalSwimmerCollectionForSource() {
  if (!$serverNationalService_engagementNationalSwimmerCollectionForSource.instance) $serverNationalService_engagementNationalSwimmerCollectionForSource.instance = require("./backend/server-national-service/engagement-national-swimmer-collection-for-source").createNationalService_engagementNationalSwimmerCollectionForSource({
    get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get performanceSwimmerIndexDocId() { return performanceSwimmerIndexDocId; },
    get recoveredPerformanceRowsAreComplete() { return recoveredPerformanceRowsAreComplete; },
    get writePerformanceSwimmerIndexRows() { return writePerformanceSwimmerIndexRows; },
    get writePerformanceSwimmerPageRows() { return writePerformanceSwimmerPageRows; },
    get local$engagementNationalSwimmerItemFromDoc() { return $serverNationalService_engagementNationalSwimmerItemFromDoc().engagementNationalSwimmerItemFromDoc; },
    get local$getEngagementSwimmerCorrectionTarget() { return $serverNationalService_findEngagementSwimmerCorrectionLicense().getEngagementSwimmerCorrectionTarget; }
  });
  return $serverNationalService_engagementNationalSwimmerCollectionForSource.instance;
}

function $serverNationalService_engagementNationalSwimmerItemFromDoc() {
  if (!$serverNationalService_engagementNationalSwimmerItemFromDoc.instance) $serverNationalService_engagementNationalSwimmerItemFromDoc.instance = require("./backend/server-national-service/engagement-national-swimmer-item-from-doc").createNationalService_engagementNationalSwimmerItemFromDoc({
    get cleanText() { return cleanText; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; }
  });
  return $serverNationalService_engagementNationalSwimmerItemFromDoc.instance;
}

function $serverNationalService_engagementNationalSwimmerFullName() {
  if (!$serverNationalService_engagementNationalSwimmerFullName.instance) $serverNationalService_engagementNationalSwimmerFullName.instance = require("./backend/server-national-service/engagement-national-swimmer-full-name").createNationalService_engagementNationalSwimmerFullName({

  });
  return $serverNationalService_engagementNationalSwimmerFullName.instance;
}

function $serverNationalService_engagementNationalSwimmerEntrySnapshot() {
  if (!$serverNationalService_engagementNationalSwimmerEntrySnapshot.instance) $serverNationalService_engagementNationalSwimmerEntrySnapshot.instance = require("./backend/server-national-service/engagement-national-swimmer-entry-snapshot").createNationalService_engagementNationalSwimmerEntrySnapshot({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get engagementSwimmerIdentityKey() { return engagementSwimmerIdentityKey; },
    get getPerformanceBaseRowsBySwimmer() { return getPerformanceBaseRowsBySwimmer; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get local$engagementNationalSwimmerFullName() { return $serverNationalService_engagementNationalSwimmerFullName().engagementNationalSwimmerFullName; }
  });
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot.instance;
}

function $serverNationalService_searchEngagementNationalSwimmerMergeTargetDocs() {
  if (!$serverNationalService_searchEngagementNationalSwimmerMergeTargetDocs.instance) $serverNationalService_searchEngagementNationalSwimmerMergeTargetDocs.instance = require("./backend/server-national-service/search-engagement-national-swimmer-merge-target-docs").createNationalService_searchEngagementNationalSwimmerMergeTargetDocs({
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanText() { return cleanText; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get local$engagementNationalSwimmerFullName() { return $serverNationalService_engagementNationalSwimmerFullName().engagementNationalSwimmerFullName; }
  });
  return $serverNationalService_searchEngagementNationalSwimmerMergeTargetDocs.instance;
}

function $serverNationalService_activePerformanceRowsForNationalSwimmer() {
  if (!$serverNationalService_activePerformanceRowsForNationalSwimmer.instance) $serverNationalService_activePerformanceRowsForNationalSwimmer.instance = require("./backend/server-national-service/active-performance-rows-for-national-swimmer").createNationalService_activePerformanceRowsForNationalSwimmer({
    get cleanText() { return cleanText; },
    get deletePublicPerformanceFile() { return deletePublicPerformanceFile; },
    get getPerformanceBaseRowsBySwimmer() { return getPerformanceBaseRowsBySwimmer; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get publicSwimmerKey() { return publicSwimmerKey; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get rebuildPublicPerformanceFilesForAffectedRows() { return rebuildPublicPerformanceFilesForAffectedRows; },
    get rebuildPublicTopFilesForAffectedRows() { return rebuildPublicTopFilesForAffectedRows; },
    get removePublicSearchIndexes() { return removePublicSearchIndexes; },
    get replacePublicSwimmerIdentity() { return replacePublicSwimmerIdentity; },
    get swimmerMergeIds() { return swimmerMergeIds; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; }
  });
  return $serverNationalService_activePerformanceRowsForNationalSwimmer.instance;
}

function $serverNationalService_engagementClubPersonEntrySnapshot() {
  if (!$serverNationalService_engagementClubPersonEntrySnapshot.instance) $serverNationalService_engagementClubPersonEntrySnapshot.instance = require("./backend/server-national-service/engagement-club-person-entry-snapshot").createNationalService_engagementClubPersonEntrySnapshot({
    get cleanEngagementEntryOfficial() { return cleanEngagementEntryOfficial; },
    get cleanText() { return cleanText; }
  });
  return $serverNationalService_engagementClubPersonEntrySnapshot.instance;
}

function $serverEntryService_buildEngagementClubSwimmersFromRequest() {
  if (!$serverEntryService_buildEngagementClubSwimmersFromRequest.instance) $serverEntryService_buildEngagementClubSwimmersFromRequest.instance = require("./backend/server-entry-service/build-engagement-club-swimmers-from-request").createEntryService_buildEngagementClubSwimmersFromRequest({
    get ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE() { return ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE; },
    get ENGAGEMENT_SWIMMER_LICENSE_PATTERN() { return ENGAGEMENT_SWIMMER_LICENSE_PATTERN; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementCompetitionType() { return cleanEngagementCompetitionType; },
    get cleanEngagementEntryIndividualEntries() { return cleanEngagementEntryIndividualEntries; },
    get cleanEngagementEntrySwimmer() { return cleanEngagementEntrySwimmer; },
    get cleanEngagementLicenseVerificationStatus() { return cleanEngagementLicenseVerificationStatus; },
    get cleanEngagementMaxEventsPerSwimmer() { return cleanEngagementMaxEventsPerSwimmer; },
    get cleanEngagementMissingEntryTimeMode() { return cleanEngagementMissingEntryTimeMode; },
    get cleanEngagementPoolLength() { return cleanEngagementPoolLength; },
    get cleanEngagementQualificationTimesMode() { return cleanEngagementQualificationTimesMode; },
    get cleanEngagementTimingType() { return cleanEngagementTimingType; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get engagementClubSwimmerItem() { return engagementClubSwimmerItem; },
    get engagementLicenseSeasonState() { return engagementLicenseSeasonState; },
    get engagementNewSwimmerItem() { return engagementNewSwimmerItem; },
    get engagementReferenceSwimmerItem() { return engagementReferenceSwimmerItem; },
    get engagementSwimmerLicenseItem() { return engagementSwimmerLicenseItem; },
    get intranapSwimmersIndex() { return intranapSwimmersIndex; },
    get loadPerformanceRecordsData() { return loadPerformanceRecordsData; },
    get resolveEngagementIndividualEntriesForSwimmer() { return resolveEngagementIndividualEntriesForSwimmer; },
    get validateEngagementIndividualEntryTimes() { return validateEngagementIndividualEntryTimes; }
  });
  return $serverEntryService_buildEngagementClubSwimmersFromRequest.instance;
}

function $serverEntryService_engagementEntryTimeStats() {
  if (!$serverEntryService_engagementEntryTimeStats.instance) $serverEntryService_engagementEntryTimeStats.instance = require("./backend/server-entry-service/engagement-entry-time-stats").createEntryService_engagementEntryTimeStats({
    get cleanText() { return cleanText; }
  });
  return $serverEntryService_engagementEntryTimeStats.instance;
}

function $serverEntryService_nativeClubEntryTimeHistory() {
  if (!$serverEntryService_nativeClubEntryTimeHistory.instance) $serverEntryService_nativeClubEntryTimeHistory.instance = require("./backend/server-entry-service/native-club-entry-time-history").createEntryService_nativeClubEntryTimeHistory({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get cleanText() { return cleanText; },
    get engagementKnownTimeHistory() { return engagementKnownTimeHistory; }
  });
  return $serverEntryService_nativeClubEntryTimeHistory.instance;
}

function $serverEntryService_previewNativeClubEntryTimes() {
  if (!$serverEntryService_previewNativeClubEntryTimes.instance) $serverEntryService_previewNativeClubEntryTimes.instance = require("./backend/server-entry-service/preview-native-club-entry-times").createEntryService_previewNativeClubEntryTimes({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get automaticEngagementIndividualEntry() { return automaticEngagementIndividualEntry; },
    get parseEngagementEntryTime() { return parseEngagementEntryTime; },
    get qualificationEvents() { return qualificationEvents; }
  });
  return $serverEntryService_previewNativeClubEntryTimes.instance;
}

function $serverEntryService_saveNativeClubIndividualEntries() {
  if (!$serverEntryService_saveNativeClubIndividualEntries.instance) $serverEntryService_saveNativeClubIndividualEntries.instance = require("./backend/server-entry-service/save-native-club-individual-entries").createEntryService_saveNativeClubIndividualEntries({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES() { return ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES; },
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get automaticEngagementIndividualEntry() { return automaticEngagementIndividualEntry; },
    get birthYear() { return birthYear; },
    get competitionYear() { return competitionYear; },
    get db() { return db; },
    get importSeasonYear() { return importSeasonYear; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get parseEngagementEntryTime() { return parseEngagementEntryTime; },
    get qualificationEvents() { return qualificationEvents; },
    get validateEngagementIndividualEntryTimes() { return validateEngagementIndividualEntryTimes; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $serverEntryService_saveNativeClubIndividualEntries.instance;
}

function $serverEntryService_saveNativeClubSwimmerSelections() {
  if (!$serverEntryService_saveNativeClubSwimmerSelections.instance) $serverEntryService_saveNativeClubSwimmerSelections.instance = require("./backend/server-entry-service/save-native-club-swimmer-selections").createEntryService_saveNativeClubSwimmerSelections({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get cleanIsoDate() { return cleanIsoDate; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $serverEntryService_saveNativeClubSwimmerSelections.instance;
}

function $serverEntryService_saveNativeClubRelays() {
  if (!$serverEntryService_saveNativeClubRelays.instance) $serverEntryService_saveNativeClubRelays.instance = require("./backend/server-entry-service/save-native-club-relays").createEntryService_saveNativeClubRelays({
    get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
    get HttpsError() { return HttpsError; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get cleanEngagementCompetitionEvents() { return cleanEngagementCompetitionEvents; },
    get cleanEngagementEntryRelays() { return cleanEngagementEntryRelays; },
    get db() { return db; },
    get nativeClubEntryView() { return nativeClubEntryView; },
    get qualificationEvents() { return qualificationEvents; },
    get validateEngagementRelayEntryTimes() { return validateEngagementRelayEntryTimes; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $serverEntryService_saveNativeClubRelays.instance;
}

function $serverPerformanceService_competitionImportPublicSnapshotSummary() {
  if (!$serverPerformanceService_competitionImportPublicSnapshotSummary.instance) $serverPerformanceService_competitionImportPublicSnapshotSummary.instance = require("./backend/server-performance-service/competition-import-public-snapshot-summary").createPerformanceService_competitionImportPublicSnapshotSummary({
    get CATEGORY_LABELS() { return CATEGORY_LABELS; },
    get POOL_COURSES() { return POOL_COURSES; },
    get ageCategoryFromDates() { return ageCategoryFromDates; },
    get categoryCodeFromCategory() { return categoryCodeFromCategory; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get cleanTimingType() { return require("./performance-import-timing").cleanTimingType; },
    get coursePayload() { return coursePayload; },
    get fallbackCategoryFromSource() { return fallbackCategoryFromSource; },
    get importSeasonYear() { return importSeasonYear; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get performanceImportChrono() { return require("./performance-import-timing").performanceImportChrono; },
    get resolveIntranapSwimmer() { return resolveIntranapSwimmer; },
    get stableHash() { return stableHash; },
    get swimmerIdentityKey() { return swimmerIdentityKey; }
  });
  return $serverPerformanceService_competitionImportPublicSnapshotSummary.instance;
}

function $serverPerformanceService_publishCompetitionImportOutputs() {
  if (!$serverPerformanceService_publishCompetitionImportOutputs.instance) $serverPerformanceService_publishCompetitionImportOutputs.instance = require("./backend/server-performance-service/publish-competition-import-outputs").createPerformanceService_publishCompetitionImportOutputs({
    get cleanText() { return cleanText; },
    get importPublicationError() { return importPublicationError; },
    get importPublicationResultStatus() { return importPublicationResultStatus; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get publishIncrementalPerformanceImport() { return publishIncrementalPerformanceImport; },
    get publishIncrementalPublicPerformanceFiles() { return publishIncrementalPublicPerformanceFiles; },
    get local$competitionImportPublicSnapshotSummary() { return $serverPerformanceService_competitionImportPublicSnapshotSummary().competitionImportPublicSnapshotSummary; }
  });
  return $serverPerformanceService_publishCompetitionImportOutputs.instance;
}

function $serverPerformanceService_competitionImportPerformanceId() {
  if (!$serverPerformanceService_competitionImportPerformanceId.instance) $serverPerformanceService_competitionImportPerformanceId.instance = require("./backend/server-performance-service/competition-import-performance-id").createPerformanceService_competitionImportPerformanceId({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
    get activeCompetitionImportData() { return activeCompetitionImportData; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionImportIdentity() { return competitionImportIdentity; },
    get db() { return db; },
    get publicPerformancePublicationJob() { return publicPerformancePublicationJob; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get stableHash() { return stableHash; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return $serverPerformanceService_competitionImportPerformanceId.instance;
}

function $serverPerformanceService_markCompetitionImportDeleted() {
  if (!$serverPerformanceService_markCompetitionImportDeleted.instance) $serverPerformanceService_markCompetitionImportDeleted.instance = require("./backend/server-performance-service/mark-competition-import-deleted").createPerformanceService_markCompetitionImportDeleted({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_CHANGES_COLLECTION() { return PERFORMANCE_BASE_CHANGES_COLLECTION; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get readPublishedAdditionalPerformanceDataSnapshot() { return readPublishedAdditionalPerformanceDataSnapshot; },
    get stableHash() { return stableHash; },
    get local$performanceBaseDocId() { return $serverPerformanceService_performanceBaseDocId().performanceBaseDocId; },
    get local$publicPerformanceBaseRow() { return $serverPerformanceService_publicPerformanceBaseRow().publicPerformanceBaseRow; }
  });
  return $serverPerformanceService_markCompetitionImportDeleted.instance;
}

function $serverPerformanceService_performancePublicKey() {
  if (!$serverPerformanceService_performancePublicKey.instance) $serverPerformanceService_performancePublicKey.instance = require("./backend/server-performance-service/performance-public-key").createPerformanceService_performancePublicKey({
    get cleanText() { return cleanText; }
  });
  return $serverPerformanceService_performancePublicKey.instance;
}

function $serverPerformanceService_performanceBaseDocId() {
  if (!$serverPerformanceService_performanceBaseDocId.instance) $serverPerformanceService_performanceBaseDocId.instance = require("./backend/server-performance-service/performance-base-doc-id").createPerformanceService_performanceBaseDocId({
    get stableHash() { return stableHash; },
    get local$performancePublicKey() { return $serverPerformanceService_performancePublicKey().performancePublicKey; }
  });
  return $serverPerformanceService_performanceBaseDocId.instance;
}

function $serverPerformanceService_cleanPerformanceBaseRow() {
  if (!$serverPerformanceService_cleanPerformanceBaseRow.instance) $serverPerformanceService_cleanPerformanceBaseRow.instance = require("./backend/server-performance-service/clean-performance-base-row").createPerformanceService_cleanPerformanceBaseRow({
    get CATEGORY_LABELS() { return CATEGORY_LABELS; },
    get PERFORMANCE_BASE_CHANGES_COLLECTION() { return PERFORMANCE_BASE_CHANGES_COLLECTION; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get categoryCodeFromCategory() { return categoryCodeFromCategory; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get coursePayload() { return coursePayload; },
    get db() { return db; },
    get importSeasonYear() { return importSeasonYear; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get normalizeCourseCode() { return normalizeCourseCode; },
    get performanceCategoryFromRow() { return performanceCategoryFromRow; },
    get stableHash() { return stableHash; },
    get touchDtnQualificationCacheState() { return touchDtnQualificationCacheState; },
    get local$performanceBaseDocId() { return $serverPerformanceService_performanceBaseDocId().performanceBaseDocId; },
    get local$performancePublicKey() { return $serverPerformanceService_performancePublicKey().performancePublicKey; }
  });
  return $serverPerformanceService_cleanPerformanceBaseRow.instance;
}

function $serverPerformanceService_publicPerformanceBaseRow() {
  if (!$serverPerformanceService_publicPerformanceBaseRow.instance) $serverPerformanceService_publicPerformanceBaseRow.instance = require("./backend/server-performance-service/public-performance-base-row").createPerformanceService_publicPerformanceBaseRow({
    get CATEGORY_LABELS() { return CATEGORY_LABELS; },
    get categoryCodeFromCategory() { return categoryCodeFromCategory; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get performanceCategoryFromRow() { return performanceCategoryFromRow; }
  });
  return $serverPerformanceService_publicPerformanceBaseRow.instance;
}

function $serverPerformanceService_uniquePublicPerformanceRows() {
  if (!$serverPerformanceService_uniquePublicPerformanceRows.instance) $serverPerformanceService_uniquePublicPerformanceRows.instance = require("./backend/server-performance-service/unique-public-performance-rows").createPerformanceService_uniquePublicPerformanceRows({
    get cleanText() { return cleanText; },
    get local$performancePublicKey() { return $serverPerformanceService_performancePublicKey().performancePublicKey; }
  });
  return $serverPerformanceService_uniquePublicPerformanceRows.instance;
}

function $serverPerformanceService_publicSwimmerKey() {
  if (!$serverPerformanceService_publicSwimmerKey.instance) $serverPerformanceService_publicSwimmerKey.instance = require("./backend/server-performance-service/public-swimmer-key").createPerformanceService_publicSwimmerKey({
    get cleanText() { return cleanText; }
  });
  return $serverPerformanceService_publicSwimmerKey.instance;
}

function $serverPerformanceService_publicBetterPerformance() {
  if (!$serverPerformanceService_publicBetterPerformance.instance) $serverPerformanceService_publicBetterPerformance.instance = require("./backend/server-performance-service/public-better-performance").createPerformanceService_publicBetterPerformance({
    get cleanText() { return cleanText; }
  });
  return $serverPerformanceService_publicBetterPerformance.instance;
}

function $serverPerformanceService_bestTopRows() {
  if (!$serverPerformanceService_bestTopRows.instance) $serverPerformanceService_bestTopRows.instance = require("./backend/server-performance-service/best-top-rows").createPerformanceService_bestTopRows({
    get CATEGORY_LABELS() { return CATEGORY_LABELS; },
    get PERFORMANCE_TOP_BUCKETS_COLLECTION() { return PERFORMANCE_TOP_BUCKETS_COLLECTION; },
    get PERFORMANCE_TOP_INDEX_LIMIT() { return PERFORMANCE_TOP_INDEX_LIMIT; },
    get categoryCodeFromCategory() { return categoryCodeFromCategory; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get normalizeCategoryCode() { return normalizeCategoryCode; },
    get performanceCategoryFromRow() { return performanceCategoryFromRow; },
    get stableHash() { return stableHash; },
    get local$performancePublicKey() { return $serverPerformanceService_performancePublicKey().performancePublicKey; },
    get local$publicBetterPerformance() { return $serverPerformanceService_publicBetterPerformance().publicBetterPerformance; },
    get local$publicSwimmerKey() { return $serverPerformanceService_publicSwimmerKey().publicSwimmerKey; }
  });
  return $serverPerformanceService_bestTopRows.instance;
}

function $serverPerformanceService_performanceTopRowsFromIndex() {
  if (!$serverPerformanceService_performanceTopRowsFromIndex.instance) $serverPerformanceService_performanceTopRowsFromIndex.instance = require("./backend/server-performance-service/performance-top-rows-from-index").createPerformanceService_performanceTopRowsFromIndex({
    get PERFORMANCE_TOP_BUCKETS_COLLECTION() { return PERFORMANCE_TOP_BUCKETS_COLLECTION; },
    get db() { return db; },
    get local$performanceTopBucketId() { return $serverPerformanceService_bestTopRows().performanceTopBucketId; },
    get local$performanceTopBucketKey() { return $serverPerformanceService_bestTopRows().performanceTopBucketKey; },
    get local$readPerformanceTopIndexRows() { return $serverPerformanceService_bestTopRows().readPerformanceTopIndexRows; }
  });
  return $serverPerformanceService_performanceTopRowsFromIndex.instance;
}

function $serverDtnService_dtnSeasonService() {
  if (!$serverDtnService_dtnSeasonService.instance) $serverDtnService_dtnSeasonService.instance = require("./backend/server-dtn-service/dtn-season-service").createDtnService_dtnSeasonService({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get FieldPath() { return FieldPath; },
    get HttpsError() { return HttpsError; },
    get assertCapability() { return assertCapability; },
    get assertLivePalmesAccess() { return assertLivePalmesAccess; },
    get createDtnSeasonService() { return createDtnSeasonService; },
    get db() { return db; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get writeAuditLogOnce() { return writeAuditLogOnce; }
  });
  return $serverDtnService_dtnSeasonService.instance;
}

function $serverDtnService_invokeDtnSeason() {
  if (!$serverDtnService_invokeDtnSeason.instance) $serverDtnService_invokeDtnSeason.instance = require("./backend/server-dtn-service/invoke-dtn-season").createDtnService_invokeDtnSeason({
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get local$dtnSeasonService() { return $serverDtnService_dtnSeasonService().dtnSeasonService; }
  });
  return $serverDtnService_invokeDtnSeason.instance;
}

function $serverDtnService_bestDtnQualificationRows() {
  if (!$serverDtnService_bestDtnQualificationRows.instance) $serverDtnService_bestDtnQualificationRows.instance = require("./backend/server-dtn-service/best-dtn-qualification-rows").createDtnService_bestDtnQualificationRows({
    get DTN_EDF_LIMOGES_COMPETITION_ID() { return DTN_EDF_LIMOGES_COMPETITION_ID; },
    get DTN_NEAR_MINIMUM_MAX_PERCENT() { return DTN_NEAR_MINIMUM_MAX_PERCENT; },
    get DTN_QUALIFICATION_MAX_ROWS_PER_COURSE() { return DTN_QUALIFICATION_MAX_ROWS_PER_COURSE; },
    get ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES() { return ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES; },
    get POOL_COURSES() { return POOL_COURSES; },
    get birthYear() { return birthYear; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get publicBetterPerformance() { return publicBetterPerformance; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceTopFileName() { return publicPerformanceTopFileName; },
    get publicSwimmerKey() { return publicSwimmerKey; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; }
  });
  return $serverDtnService_bestDtnQualificationRows.instance;
}

function $serverDtnService_dtnQualificationCacheStateRef() {
  if (!$serverDtnService_dtnQualificationCacheStateRef.instance) $serverDtnService_dtnQualificationCacheStateRef.instance = require("./backend/server-dtn-service/dtn-qualification-cache-state-ref").createDtnService_dtnQualificationCacheStateRef({
    get DTN_QUALIFICATION_CACHE_STATE_COLLECTION() { return DTN_QUALIFICATION_CACHE_STATE_COLLECTION; },
    get db() { return db; }
  });
  return $serverDtnService_dtnQualificationCacheStateRef.instance;
}

function $serverDtnService_dtnQualificationCacheRef() {
  if (!$serverDtnService_dtnQualificationCacheRef.instance) $serverDtnService_dtnQualificationCacheRef.instance = require("./backend/server-dtn-service/dtn-qualification-cache-ref").createDtnService_dtnQualificationCacheRef({
    get DTN_QUALIFICATION_CACHE_COLLECTION() { return DTN_QUALIFICATION_CACHE_COLLECTION; },
    get db() { return db; }
  });
  return $serverDtnService_dtnQualificationCacheRef.instance;
}

function $serverDtnService_dtnListingCacheRef() {
  if (!$serverDtnService_dtnListingCacheRef.instance) $serverDtnService_dtnListingCacheRef.instance = require("./backend/server-dtn-service/dtn-listing-cache-ref").createDtnService_dtnListingCacheRef({
    get DTN_QUALIFICATION_CACHE_COLLECTION() { return DTN_QUALIFICATION_CACHE_COLLECTION; },
    get db() { return db; }
  });
  return $serverDtnService_dtnListingCacheRef.instance;
}

function $serverDtnService_dtnQualificationSeasonsForRows() {
  if (!$serverDtnService_dtnQualificationSeasonsForRows.instance) $serverDtnService_dtnQualificationSeasonsForRows.instance = require("./backend/server-dtn-service/dtn-qualification-seasons-for-rows").createDtnService_dtnQualificationSeasonsForRows({
    get FieldValue() { return FieldValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get importSeasonYear() { return importSeasonYear; },
    get local$dtnQualificationCacheStateRef() { return $serverDtnService_dtnQualificationCacheStateRef().dtnQualificationCacheStateRef; }
  });
  return $serverDtnService_dtnQualificationSeasonsForRows.instance;
}

function $serverDtnService_dtnQualificationCacheFingerprint() {
  if (!$serverDtnService_dtnQualificationCacheFingerprint.instance) $serverDtnService_dtnQualificationCacheFingerprint.instance = require("./backend/server-dtn-service/dtn-qualification-cache-fingerprint").createDtnService_dtnQualificationCacheFingerprint({
    get DTN_QUALIFICATION_CACHE_VERSION() { return DTN_QUALIFICATION_CACHE_VERSION; },
    get POOL_COURSES() { return POOL_COURSES; },
    get stableHash() { return stableHash; }
  });
  return $serverDtnService_dtnQualificationCacheFingerprint.instance;
}

function $serverDtnService_dtnListingCacheFingerprint() {
  if (!$serverDtnService_dtnListingCacheFingerprint.instance) $serverDtnService_dtnListingCacheFingerprint.instance = require("./backend/server-dtn-service/dtn-listing-cache-fingerprint").createDtnService_dtnListingCacheFingerprint({
    get DTN_LISTING_CACHE_VERSION() { return DTN_LISTING_CACHE_VERSION; },
    get HttpsError() { return HttpsError; },
    get POOL_COURSES() { return POOL_COURSES; },
    get cleanText() { return cleanText; },
    get stableHash() { return stableHash; }
  });
  return $serverDtnService_dtnListingCacheFingerprint.instance;
}

function $serverDtnService_enqueueDtnQualificationJob() {
  if (!$serverDtnService_enqueueDtnQualificationJob.instance) $serverDtnService_enqueueDtnQualificationJob.instance = require("./backend/server-dtn-service/enqueue-dtn-qualification-job").createDtnService_enqueueDtnQualificationJob({
    get DTN_QUALIFICATION_JOBS_COLLECTION() { return DTN_QUALIFICATION_JOBS_COLLECTION; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; }
  });
  return $serverDtnService_enqueueDtnQualificationJob.instance;
}

function $serverDtnService_normalizePerformanceSearchText() {
  if (!$serverDtnService_normalizePerformanceSearchText.instance) $serverDtnService_normalizePerformanceSearchText.instance = require("./backend/server-dtn-service/normalize-performance-search-text").createDtnService_normalizePerformanceSearchText({
    get cleanText() { return cleanText; }
  });
  return $serverDtnService_normalizePerformanceSearchText.instance;
}

function $serverDtnService_performanceSearchTokens() {
  if (!$serverDtnService_performanceSearchTokens.instance) $serverDtnService_performanceSearchTokens.instance = require("./backend/server-dtn-service/performance-search-tokens").createDtnService_performanceSearchTokens({
    get local$normalizePerformanceSearchText() { return $serverDtnService_normalizePerformanceSearchText().normalizePerformanceSearchText; }
  });
  return $serverDtnService_performanceSearchTokens.instance;
}

function $serverDtnService_performanceSearchPrefixes() {
  if (!$serverDtnService_performanceSearchPrefixes.instance) $serverDtnService_performanceSearchPrefixes.instance = require("./backend/server-dtn-service/performance-search-prefixes").createDtnService_performanceSearchPrefixes({
    get local$performanceSearchTokens() { return $serverDtnService_performanceSearchTokens().performanceSearchTokens; }
  });
  return $serverDtnService_performanceSearchPrefixes.instance;
}

function $serverDtnService_performanceSwimmerIndexKey() {
  if (!$serverDtnService_performanceSwimmerIndexKey.instance) $serverDtnService_performanceSwimmerIndexKey.instance = require("./backend/server-dtn-service/performance-swimmer-index-key").createDtnService_performanceSwimmerIndexKey({
    get cleanText() { return cleanText; },
    get local$normalizePerformanceSearchText() { return $serverDtnService_normalizePerformanceSearchText().normalizePerformanceSearchText; }
  });
  return $serverDtnService_performanceSwimmerIndexKey.instance;
}

function $serverDtnService_performanceSwimmerIndexDocId() {
  if (!$serverDtnService_performanceSwimmerIndexDocId.instance) $serverDtnService_performanceSwimmerIndexDocId.instance = require("./backend/server-dtn-service/performance-swimmer-index-doc-id").createDtnService_performanceSwimmerIndexDocId({
    get stableHash() { return stableHash; },
    get local$performanceSwimmerIndexKey() { return $serverDtnService_performanceSwimmerIndexKey().performanceSwimmerIndexKey; }
  });
  return $serverDtnService_performanceSwimmerIndexDocId.instance;
}

function $serverLegacyService_aggregateSwimmerIndexRows() {
  if (!$serverLegacyService_aggregateSwimmerIndexRows.instance) $serverLegacyService_aggregateSwimmerIndexRows.instance = require("./backend/server-legacy-service/aggregate-swimmer-index-rows").createLegacyService_aggregateSwimmerIndexRows({
    get FieldValue() { return FieldValue; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGE_SIZE() { return PERFORMANCE_SWIMMER_PAGE_SIZE; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get normalizePerformanceSearchText() { return normalizePerformanceSearchText; },
    get performancePublicKey() { return performancePublicKey; },
    get performanceSearchPrefixes() { return performanceSearchPrefixes; },
    get performanceSwimmerIndexKey() { return performanceSwimmerIndexKey; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get stableHash() { return stableHash; },
    get local$performanceSwimmerPageId() { return $serverLegacyService_performanceSwimmerPageId().performanceSwimmerPageId; }
  });
  return $serverLegacyService_aggregateSwimmerIndexRows.instance;
}

function $serverLegacyService_performanceSwimmerPageId() {
  if (!$serverLegacyService_performanceSwimmerPageId.instance) $serverLegacyService_performanceSwimmerPageId.instance = require("./backend/server-legacy-service/performance-swimmer-page-id").createLegacyService_performanceSwimmerPageId({

  });
  return $serverLegacyService_performanceSwimmerPageId.instance;
}

function $serverLegacyService_getPerformanceBaseRowsBySwimmer() {
  if (!$serverLegacyService_getPerformanceBaseRowsBySwimmer.instance) $serverLegacyService_getPerformanceBaseRowsBySwimmer.instance = require("./backend/server-legacy-service/get-performance-base-rows-by-swimmer").createLegacyService_getPerformanceBaseRowsBySwimmer({
    get ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS() { return ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS; },
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_SWIMMERS_COLLECTION() { return PERFORMANCE_SWIMMERS_COLLECTION; },
    get PERFORMANCE_SWIMMER_PAGES_COLLECTION() { return PERFORMANCE_SWIMMER_PAGES_COLLECTION; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get publicPerformanceSwimmerFilePath() { return publicPerformanceSwimmerFilePath; },
    get readPublicPerformanceJson() { return readPublicPerformanceJson; },
    get stableHash() { return stableHash; },
    get uniquePublicPerformanceRows() { return uniquePublicPerformanceRows; },
    get local$performanceSwimmerPageId() { return $serverLegacyService_performanceSwimmerPageId().performanceSwimmerPageId; }
  });
  return $serverLegacyService_getPerformanceBaseRowsBySwimmer.instance;
}

function $serverLegacyService_normalizedImportPerformances() {
  if (!$serverLegacyService_normalizedImportPerformances.instance) $serverLegacyService_normalizedImportPerformances.instance = require("./backend/server-legacy-service/normalized-import-performances").createLegacyService_normalizedImportPerformances({
    get db() { return db; },
    get normalizeLivePalmesImportPerformances() { return normalizeLivePalmesImportPerformances; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; }
  });
  return $serverLegacyService_normalizedImportPerformances.instance;
}

function $serverLegacyService_additionalPerformanceFile() {
  if (!$serverLegacyService_additionalPerformanceFile.instance) $serverLegacyService_additionalPerformanceFile.instance = require("./backend/server-legacy-service/additional-performance-file").createLegacyService_additionalPerformanceFile({
    get PUBLIC_ADDITIONAL_PERFORMANCE_PATH() { return PUBLIC_ADDITIONAL_PERFORMANCE_PATH; },
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get cleanText() { return cleanText; },
    get publicPerformanceBaseRow() { return publicPerformanceBaseRow; },
    get storage() { return storage; }
  });
  return $serverLegacyService_additionalPerformanceFile.instance;
}

function $serverLegacyService_additionalPerformanceRowKey() {
  if (!$serverLegacyService_additionalPerformanceRowKey.instance) $serverLegacyService_additionalPerformanceRowKey.instance = require("./backend/server-legacy-service/additional-performance-row-key").createLegacyService_additionalPerformanceRowKey({
    get cleanText() { return cleanText; },
    get performancePublicKey() { return performancePublicKey; }
  });
  return $serverLegacyService_additionalPerformanceRowKey.instance;
}

function $serverLegacyService_claimPerformancePublicationJob() {
  if (!$serverLegacyService_claimPerformancePublicationJob.instance) $serverLegacyService_claimPerformancePublicationJob.instance = require("./backend/server-legacy-service/claim-performance-publication-job").createLegacyService_claimPerformancePublicationJob({
    get MAX_COMPETITION_IMPORT_PERFORMANCES() { return MAX_COMPETITION_IMPORT_PERFORMANCES; },
    get PERFORMANCE_BASE_CHANGES_COLLECTION() { return PERFORMANCE_BASE_CHANGES_COLLECTION; },
    get PERFORMANCE_BASE_COLLECTION() { return PERFORMANCE_BASE_COLLECTION; },
    get PERFORMANCE_PUBLICATION_LEASE_MS() { return PERFORMANCE_PUBLICATION_LEASE_MS; },
    get PERFORMANCE_PUBLICATION_MAX_ATTEMPTS() { return PERFORMANCE_PUBLICATION_MAX_ATTEMPTS; },
    get canClaimPerformancePublicationJob() { return canClaimPerformancePublicationJob; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get cleanText() { return cleanText; },
    get competitionImportPublicSnapshotSummary() { return competitionImportPublicSnapshotSummary; },
    get db() { return db; },
    get deactivatedImportPerformanceRows() { return deactivatedImportPerformanceRows; },
    get invalidateEngagementEntryTimeCachesForPerformanceRows() { return invalidateEngagementEntryTimeCachesForPerformanceRows; },
    get normalizeLivePalmesImportPerformances() { return normalizeLivePalmesImportPerformances; },
    get performanceBaseDocId() { return performanceBaseDocId; },
    get performancePublicationFailureStatus() { return performancePublicationFailureStatus; },
    get rebuildPublicPerformanceFilesForAffectedRows() { return rebuildPublicPerformanceFilesForAffectedRows; },
    get sameCompetitionImport() { return sameCompetitionImport; },
    get stableHash() { return stableHash; },
    get touchDtnQualificationCacheState() { return touchDtnQualificationCacheState; },
    get writeAuditLog() { return writeAuditLog; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; },
    get local$mergeAdditionalPerformanceRows() { return $serverLegacyService_additionalPerformanceRowKey().mergeAdditionalPerformanceRows; },
    get local$readPublishedAdditionalPerformanceDataSnapshot() { return $serverLegacyService_additionalPerformanceFile().readPublishedAdditionalPerformanceDataSnapshot; },
    get local$saveAdditionalPerformanceDataSnapshot() { return $serverLegacyService_saveAdditionalPerformanceDataSnapshot().saveAdditionalPerformanceDataSnapshot; }
  });
  return $serverLegacyService_claimPerformancePublicationJob.instance;
}

function $serverLegacyService_saveAdditionalPerformanceDataSnapshot() {
  if (!$serverLegacyService_saveAdditionalPerformanceDataSnapshot.instance) $serverLegacyService_saveAdditionalPerformanceDataSnapshot.instance = require("./backend/server-legacy-service/save-additional-performance-data-snapshot").createLegacyService_saveAdditionalPerformanceDataSnapshot({
    get PUBLIC_ADDITIONAL_PERFORMANCE_PATH() { return PUBLIC_ADDITIONAL_PERFORMANCE_PATH; },
    get PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN() { return PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN; },
    get local$additionalPerformanceFile() { return $serverLegacyService_additionalPerformanceFile().additionalPerformanceFile; },
    get local$buildAdditionalPerformanceSwimmers() { return $serverLegacyService_additionalPerformanceFile().buildAdditionalPerformanceSwimmers; },
    get local$normalizeAdditionalPerformanceDataSnapshot() { return $serverLegacyService_additionalPerformanceFile().normalizeAdditionalPerformanceDataSnapshot; }
  });
  return $serverLegacyService_saveAdditionalPerformanceDataSnapshot.instance;
}

function $serverLegacyService_publishIncrementalPerformanceImport() {
  if (!$serverLegacyService_publishIncrementalPerformanceImport.instance) $serverLegacyService_publishIncrementalPerformanceImport.instance = require("./backend/server-legacy-service/publish-incremental-performance-import").createLegacyService_publishIncrementalPerformanceImport({
    get cleanText() { return cleanText; },
    get local$mergeAdditionalPerformanceRows() { return $serverLegacyService_additionalPerformanceRowKey().mergeAdditionalPerformanceRows; },
    get local$readPublishedAdditionalPerformanceDataSnapshot() { return $serverLegacyService_additionalPerformanceFile().readPublishedAdditionalPerformanceDataSnapshot; },
    get local$saveAdditionalPerformanceDataSnapshot() { return $serverLegacyService_saveAdditionalPerformanceDataSnapshot().saveAdditionalPerformanceDataSnapshot; }
  });
  return $serverLegacyService_publishIncrementalPerformanceImport.instance;
}

function $serverLegacyService_publicPerformanceFilesBucket() {
  if (!$serverLegacyService_publicPerformanceFilesBucket.instance) $serverLegacyService_publicPerformanceFilesBucket.instance = require("./backend/server-legacy-service/public-performance-files-bucket").createLegacyService_publicPerformanceFilesBucket({
    get PUBLIC_PERFORMANCE_BUCKET() { return PUBLIC_PERFORMANCE_BUCKET; },
    get storage() { return storage; }
  });
  return $serverLegacyService_publicPerformanceFilesBucket.instance;
}

function $serverLegacyService_migrationChunkStatuses() {
  if (!$serverLegacyService_migrationChunkStatuses.instance) $serverLegacyService_migrationChunkStatuses.instance = require("./backend/server-legacy-service/migration-chunk-statuses").createLegacyService_migrationChunkStatuses({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_MIGRATION_COLLECTION() { return PERFORMANCE_BASE_MIGRATION_COLLECTION; },
    get PERFORMANCE_PUBLIC_DATA_URL() { return PERFORMANCE_PUBLIC_DATA_URL; },
    get cleanText() { return cleanText; },
    get db() { return db; }
  });
  return $serverLegacyService_migrationChunkStatuses.instance;
}

function $serverLegacyService_historicalRowsFromChunkPayload() {
  if (!$serverLegacyService_historicalRowsFromChunkPayload.instance) $serverLegacyService_historicalRowsFromChunkPayload.instance = require("./backend/server-legacy-service/historical-rows-from-chunk-payload").createLegacyService_historicalRowsFromChunkPayload({

  });
  return $serverLegacyService_historicalRowsFromChunkPayload.instance;
}

function $serverLegacyService_migrateHistoricalPerformanceBaseChunk() {
  if (!$serverLegacyService_migrateHistoricalPerformanceBaseChunk.instance) $serverLegacyService_migrateHistoricalPerformanceBaseChunk.instance = require("./backend/server-legacy-service/migrate-historical-performance-base-chunk").createLegacyService_migrateHistoricalPerformanceBaseChunk({
    get HttpsError() { return HttpsError; },
    get PERFORMANCE_BASE_MIGRATION_BATCH_SIZE() { return PERFORMANCE_BASE_MIGRATION_BATCH_SIZE; },
    get PERFORMANCE_BASE_MIGRATION_COLLECTION() { return PERFORMANCE_BASE_MIGRATION_COLLECTION; },
    get PERFORMANCE_PUBLIC_DATA_URL() { return PERFORMANCE_PUBLIC_DATA_URL; },
    get cleanText() { return cleanText; },
    get db() { return db; },
    get writePerformanceBaseRows() { return writePerformanceBaseRows; },
    get local$historicalRowsFromChunkPayload() { return $serverLegacyService_historicalRowsFromChunkPayload().historicalRowsFromChunkPayload; }
  });
  return $serverLegacyService_migrateHistoricalPerformanceBaseChunk.instance;
}

function $serverLegacyService_buildAdditionalPerformanceDataSnapshot() {
  if (!$serverLegacyService_buildAdditionalPerformanceDataSnapshot.instance) $serverLegacyService_buildAdditionalPerformanceDataSnapshot.instance = require("./backend/server-legacy-service/build-additional-performance-data-snapshot").createLegacyService_buildAdditionalPerformanceDataSnapshot({
    get HttpsError() { return HttpsError; },
    get local$readPublishedAdditionalPerformanceDataSnapshot() { return $serverLegacyService_additionalPerformanceFile().readPublishedAdditionalPerformanceDataSnapshot; }
  });
  return $serverLegacyService_buildAdditionalPerformanceDataSnapshot.instance;
}

function $serverLegacyService_publishAdditionalPerformanceDataSnapshot() {
  if (!$serverLegacyService_publishAdditionalPerformanceDataSnapshot.instance) $serverLegacyService_publishAdditionalPerformanceDataSnapshot.instance = require("./backend/server-legacy-service/publish-additional-performance-data-snapshot").createLegacyService_publishAdditionalPerformanceDataSnapshot({
    get local$buildAdditionalPerformanceDataSnapshot() { return $serverLegacyService_buildAdditionalPerformanceDataSnapshot().buildAdditionalPerformanceDataSnapshot; },
    get local$saveAdditionalPerformanceDataSnapshot() { return $serverLegacyService_saveAdditionalPerformanceDataSnapshot().saveAdditionalPerformanceDataSnapshot; }
  });
  return $serverLegacyService_publishAdditionalPerformanceDataSnapshot.instance;
}

function $serverLegacyService_enqueuePerformancePublicationJob() {
  if (!$serverLegacyService_enqueuePerformancePublicationJob.instance) $serverLegacyService_enqueuePerformancePublicationJob.instance = require("./backend/server-legacy-service/enqueue-performance-publication-job").createLegacyService_enqueuePerformancePublicationJob({
    get PERFORMANCE_PUBLICATION_JOBS_COLLECTION() { return PERFORMANCE_PUBLICATION_JOBS_COLLECTION; },
    get cleanFirestoreValue() { return cleanFirestoreValue; },
    get db() { return db; },
    get publicPerformancePublicationJob() { return publicPerformancePublicationJob; },
    get stableHash() { return stableHash; }
  });
  return $serverLegacyService_enqueuePerformancePublicationJob.instance;
}

function $serverLegacyService_authorizeNapRecords() {
  if (!$serverLegacyService_authorizeNapRecords.instance) $serverLegacyService_authorizeNapRecords.instance = require("./backend/server-legacy-service/authorize-nap-records").createLegacyService_authorizeNapRecords({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get ENVIRONMENT() { return ENVIRONMENT; },
    get HttpsError() { return HttpsError; },
    get assertCapability() { return assertCapability; }
  });
  return $serverLegacyService_authorizeNapRecords.instance;
}

function $serverLegacyService_readNapRecordsAdministration() {
  if (!$serverLegacyService_readNapRecordsAdministration.instance) $serverLegacyService_readNapRecordsAdministration.instance = require("./backend/server-legacy-service/read-nap-records-administration").createLegacyService_readNapRecordsAdministration({
    get local$authorizeNapRecords() { return $serverLegacyService_authorizeNapRecords().authorizeNapRecords; },
    get local$nativePerformanceFailure() { return $serverLegacyService_nativePerformanceFailure().nativePerformanceFailure; }
  });
  return $serverLegacyService_readNapRecordsAdministration.instance;
}

function $serverLegacyService_publishNativeRecords() {
  if (!$serverLegacyService_publishNativeRecords.instance) $serverLegacyService_publishNativeRecords.instance = require("./backend/server-legacy-service/publish-native-records").createLegacyService_publishNativeRecords({
    get writeAuditLogOnce() { return writeAuditLogOnce; },
    get local$authorizeNapRecords() { return $serverLegacyService_authorizeNapRecords().authorizeNapRecords; },
    get local$nativePerformanceFailure() { return $serverLegacyService_nativePerformanceFailure().nativePerformanceFailure; }
  });
  return $serverLegacyService_publishNativeRecords.instance;
}

function $serverLegacyService_authorizeNativePerformance() {
  if (!$serverLegacyService_authorizeNativePerformance.instance) $serverLegacyService_authorizeNativePerformance.instance = require("./backend/server-legacy-service/authorize-native-performance").createLegacyService_authorizeNativePerformance({
    get ADMIN_UIDS() { return ADMIN_UIDS; },
    get HttpsError() { return HttpsError; },
    get assertCapability() { return assertCapability; }
  });
  return $serverLegacyService_authorizeNativePerformance.instance;
}

function $serverLegacyService_nativePerformanceFailure() {
  if (!$serverLegacyService_nativePerformanceFailure.instance) $serverLegacyService_nativePerformanceFailure.instance = require("./backend/server-legacy-service/native-performance-failure").createLegacyService_nativePerformanceFailure({
    get HttpsError() { return HttpsError; }
  });
  return $serverLegacyService_nativePerformanceFailure.instance;
}

function portalAccountHandlers() {
  if (!portalAccountHandlers.instance) portalAccountHandlers.instance = require("./portal-account-handlers").createAccountHandlers({
    get HttpsError() { return HttpsError; },
    get accessManagementContext() { return accessManagementContext; },
    get auth() { return auth; },
    get canonicalAccessDirectoryRegionId() { return canonicalAccessDirectoryRegionId; },
    get cleanAccessProfile() { return cleanAccessProfile; },
    get engagementClubAccessContext() { return engagementClubAccessContext; },
    get saveAccessUserProfile() { return saveAccessUserProfile; }
  });
  return portalAccountHandlers.instance;
}

function serverAccountWriteService() {
  if (!serverAccountWriteService.instance) serverAccountWriteService.instance = require("./server-account-write-service").createAccountWriteService({
    get accessDirectoryKeys() { return accessDirectoryKeys; },
    get auth() { return auth; },
    get capabilitiesMap() { return capabilitiesMap; },
    get db() { return db; },
    get displayNameFromProfile() { return displayNameFromProfile; },
    get hasConsolePortalCapability() { return hasConsolePortalCapability; },
    get writeAccessGrants() { return writeAccessGrants; },
    get writeAuditLog() { return writeAuditLog; }
  });
  return serverAccountWriteService.instance;
}

function serverDirectorySyncService() {
  if (!serverDirectorySyncService.instance) serverDirectorySyncService.instance = require("./server-directory-sync-service").createDirectorySyncService({
    get FieldValue() { return FieldValue; },
    get accessDirectorySnapshotEntry() { return accessDirectorySnapshotEntry; },
    get accessDirectorySnapshotEntryKey() { return accessDirectorySnapshotEntryKey; },
    get accessDirectorySnapshotRegionId() { return accessDirectorySnapshotRegionId; },
    get accessDirectorySnapshotStateRef() { return accessDirectorySnapshotStateRef; },
    get db() { return db; },
    get mergeAccessDirectorySnapshotEntries() { return mergeAccessDirectorySnapshotEntries; },
    get sameAccessDirectorySnapshotEntry() { return sameAccessDirectorySnapshotEntry; }
  });
  return serverDirectorySyncService.instance;
}





















const crypto = require("node:crypto");
const { clubRecapZip } = require("./club-recap-zip");

const { createDtnSeasonService } = require("./dtn-season-service");

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldPath, FieldValue, getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const {
  PERFORMANCE_PUBLICATION_LEASE_MS,
  PERFORMANCE_PUBLICATION_MAX_ATTEMPTS,
  canClaimPerformancePublicationJob,
  performancePublicationFailureStatus,
  publicPerformancePublicationJob
} = require("./performance-publication-jobs");
const { defineBoolean, defineSecret } = require("firebase-functions/params");
const { createNapPool } = require("./nap-connection");

const { consoleRoleClaims, hasConsolePortalCapability } = require("./console-access");
const clubReference = require("./assets/club-reference.json");
const intranapSwimmersReference = require("./intranap-swimmers-reference.json");
const intranapSwimmersIndex = require("./assets/intranap-swimmers-index.json");
const { nextPublicResultsIndex } = require("./public-results-index");
const {
  decodePdfDataUrl,
  publicPdfStoragePath,
  publicStorageUrl
} = require("./public-pdf-storage");
const { nextPortalAccessRateLimit } = require("./portal-access-protection");
const { livePalmesEnvironment } = require("./livepalmes-environment");
require("./portal-access-origin");
const { engagementSwimmerChangeResolutionMail } = require("./engagement-swimmer-change-mail");
const { competitionMailLines, competitionMailDateTime } = require("./engagement-competition-mail-format");
const { escapeMailHtml, livePalmesMailHtml } = require("./livepalmes-mail-html");
const { cleanClubPayload } = require("./engagement-clubs");
const {
  findReferenceSwimmerCorrectionTarget,
  swimmerMergeIds,
  recoveredPerformanceRowsAreComplete
} = require("./engagement-swimmer-corrections");
const { buildWinPalmeCompetitionTxt } = require("./winpalme-export");
const {
  MAX_COMPETITION_DOCUMENTS,
  cleanCompetitionDocumentInput,
  cleanCompetitionDocuments,
  competitionDocumentDownloadUrl,
  competitionDocumentTokenFromUrl,
  competitionDocumentStoragePath,
  decodeCompetitionDocumentDataUrl
} = require("./engagement-competition-documents");

const {
  competitionImportIdentity,
  sameCompetitionImport
} = require("./performance-import-replacement");
const {
  canResumeImportPublication,
  deactivatedImportPerformanceRows,
  hydratePublicSwimmerRowsFromPayload,
  importPublicationError,
  importPublicationResultStatus,
  importPublicationStatus,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerPayloadSupportsTopRebuild
} = require("./performance-import-publication");
const {
  PUBLIC_CALENDAR_EVENT_TYPES,
  PUBLIC_CALENDAR_GENERIC_EVENT_TYPES,
  cleanPublicCalendarEventType,
  cleanPublicCalendarLevel,
  cleanPublicCalendarProgram,
  cleanPublicCalendarPublicationStatus,
  cleanPublicCalendarUrl,
  cleanPublicCalendarWhatsAppUrl,
  publicCalendarDetail,
  publicCalendarSummary
} = require("./public-calendar");

initializeApp();
const ENVIRONMENT = livePalmesEnvironment();
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

const REGION = "europe-west1";
const LIVEPALMES_SMTP_HOST = defineSecret("LIVEPALMES_SMTP_HOST");
const LIVEPALMES_SMTP_PORT = defineSecret("LIVEPALMES_SMTP_PORT");
const LIVEPALMES_SMTP_USER = defineSecret("LIVEPALMES_SMTP_USER");
const LIVEPALMES_SMTP_PASS = defineSecret("LIVEPALMES_SMTP_PASS");
const LIVEPALMES_SMTP_SECURE = defineSecret("LIVEPALMES_SMTP_SECURE");
const LIVEPALMES_MAIL_FROM = defineSecret("LIVEPALMES_MAIL_FROM");
const LIVEPALMES_NOTIFICATION_LINK_SECRET = defineSecret("LIVEPALMES_NOTIFICATION_LINK_SECRET");
const LIVEPALMES_ENFORCE_APP_CHECK = defineBoolean("LIVEPALMES_ENFORCE_APP_CHECK", { default: false });
const ENGAGEMENT_MAIL_SECRETS = [
  LIVEPALMES_SMTP_HOST,
  LIVEPALMES_SMTP_PORT,
  LIVEPALMES_SMTP_USER,
  LIVEPALMES_SMTP_PASS,
  LIVEPALMES_SMTP_SECURE,
  LIVEPALMES_MAIL_FROM
];
const ENGAGEMENT_NOTIFICATION_MAIL_SECRETS = [
  ...ENGAGEMENT_MAIL_SECRETS,
  LIVEPALMES_NOTIFICATION_LINK_SECRET
];
const COMPETITION_IDS = new Set(["livepalmes-active", "livepalmes-test"]);
const ADMIN_UIDS = new Set(ENVIRONMENT.legacyAdminUids);
const FUNCTIONS_EMULATOR_ACTIVE = process.env.FUNCTIONS_EMULATOR === "true";
const ROLES = ["live", "speaker", "referee", "video", "computer", "secretary"];
const ROLE_SET = new Set(ROLES);
const ENGAGEMENT_COMPETITION_LEVELS = new Set(["departemental", "regional", "national", "international"]);
const ENGAGEMENT_ENTRY_STATUSES = new Set(["upcoming", "open", "closed"]);
const ENGAGEMENT_COMPETITION_TYPES = new Set(["pool", "openWater"]);
const ENGAGEMENT_WATER_BODY_TYPES = new Set(["sea", "lake", "river", "other"]);
const ENGAGEMENT_POOL_LENGTHS = new Set(["25", "33", "50"]);
const ENGAGEMENT_TIMING_TYPES = new Set(["manual", "electronic"]);
const ENGAGEMENT_QUALIFICATION_TIME_MODES = new Set(["all", "period"]);
const ENGAGEMENT_MISSING_ENTRY_TIME_MODES = new Set(["manual", "forbidden", "default595999", "none"]);
const ENGAGEMENT_REQUIRE_ENTRY_SWIMMER_LICENSE = false;
const ENGAGEMENT_SWIMMER_LICENSE_PATTERN = /^[A-Z]-\d{2}-\d+$/;
const ENGAGEMENT_LICENSE_VERIFICATION_STATUSES = new Set(["verified", "pending", "rejected", "conflict"]);
const ENGAGEMENT_LICENSE_SEASON_STATUSES = new Set(["to_check", "valid", "invalid"]);
const ACCESS_CAPABILITIES = [
  "admin.full",
  "records.manage",
  "consoles.manage",
  "consoles.access",
  "competitions.import",
  "dtn.view",
  "dtn.manage",
  "engagements.club.manage",
  "engagements.club.switch",
  "engagements.region.manage",
  "engagements.national.manage"
];
const ACCESS_CAPABILITY_SET = new Set(ACCESS_CAPABILITIES);
const ENGAGEMENT_MAIL_CAPABILITIES = [
  "engagements.club.manage",
  "engagements.region.manage",
  "engagements.national.manage"
];
const OPTIONAL_COMPETITION_MAIL_TYPES = new Set([
  "competition_documents",
  "opening_notification",
  "club_recap_pdf"
]);
const HASH_ITERATIONS = 120000;
const HASH_BYTES = 32;
const CALLABLE_OPTIONS = { region: REGION, invoker: "public" };
// Public sporting reads use NAP; operational migration tools remain TEST-only.
if (ENVIRONMENT.sportingDataSource === "nap") {
  const napPassword = defineSecret("LIVEPALMES_NAP_PASSWORD");
  let napPool;
  let homeEventsReader;
  exports.readNapPublicSwimmer = onRequest({
    region: REGION, invoker: "public", secrets: [napPassword], maxInstances: 2, concurrency: 4, timeoutSeconds: 30,
    cors: ENVIRONMENT.name === "test"
      ? [/^https:\/\/livepalmes-test(?:--[a-z0-9-]+)?\.web\.app$/, "https://livepalmes-test.firebaseapp.com"]
      : ["https://livepalmes.web.app", "https://livepalmes.firebaseapp.com"]
  }, async (request, response) => {
    response.set("Cache-Control", "no-store");
    const homeRequest=request.query.action==="home-page"||(!request.query.action&&!request.query.id&&["/","/index.html"].includes(request.path));
    if (request.method !== "GET" && !(request.method === "HEAD" && homeRequest)) { response.status(405).json({ error: "Methode interdite." }); return; }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      const action = request.query.action || (request.query.id ? "swimmer" : ["/", "/index.html"].includes(request.path) ? "home-page" : "swimmer");
      if(action==="home-page"){
        const homePage=require("./nap-home-page");
        const page=await homePage.readPage(napPool);
        response.set("X-LivePalmes-Home-Source","nap-server-html");
        response.set("Cache-Control","private, no-store");
        response.status(page.events&&page.documents?200:503).type("html").send(page.html);return;
      }
      if (!["swimmer", "search", "top", "top-years", "top-metadata", "calendar-manifest", "calendar-season", "competition", "competition-results", "records", "documents-featured", "documents-catalogue", "home-events"].includes(action)) throw new TypeError("Action invalide.");
      if(action==="home-events"){
        const home=require("./nap-home-direct");
        if(!homeEventsReader)homeEventsReader=home.createReader(()=>home.read(napPool));
        response.set("X-LivePalmes-Home-Source","nap-direct");
        response.json(await homeEventsReader());return;
      }
      response.json(action === "documents-featured" ? {source:"nap",documents:await require("./nap-public-documents").readFeatured(napPool)}
        : action === "documents-catalogue" ? {source:"nap",...await require("./nap-public-documents").readLibrary(napPool,require("./assets/nap-public-documents-index.json"),request.query)}
        : action === "records" ? await require("./nap-records-store").read(napPool)
        : action === "calendar-manifest" ? await require("./nap-direct-calendar").readCalendarManifest(napPool)
        : action === "calendar-season" ? await require("./nap-direct-calendar").readCalendarSeason(napPool, request.query.year)
        : action === "competition" ? await require("./nap-direct-calendar").readCompetition(napPool, request.query.id)
        : action === "competition-results" ? await require("./nap-direct-competition-results").readCompetitionResults(napPool, request.query.id)
        : action === "top" ? await require("./nap-direct-tops").readDirectTop(napPool, request.query)
        : action === "top-years" ? await require("./nap-direct-tops").readTopBirthYears(napPool, request.query)
        : action === "top-metadata" ? await require("./nap-direct-tops").readTopMetadata(napPool)
        : action === "search"
        ? await require("./nap-public-swimmer-redirect").searchSwimmers(napPool, request.query.q)
        : await require("./nap-public-swimmer-redirect").readSwimmer(napPool, request.query.id));
    } catch (error) {
      response.status(error instanceof TypeError ? 400 : 503).json({ error: error instanceof RangeError
        ? "Donnees trop volumineuses pour cette consultation."
        : "Consultation NAP indisponible." });
    }
  });
exports.getNapSwimmerPerformances = onCall({
    ...CALLABLE_OPTIONS, secrets: [napPassword],
    maxInstances: 2, concurrency: 4, timeoutSeconds: 30
  }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
    assertAdmin(request);
    let input;
    try { input = require("./nap-mysql").performanceRequest(request.data); }
    catch { throw new HttpsError("invalid-argument", "Identifiants NAP entiers requis."); }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      return await require("./nap-mysql").readSwimmerPerformances(napPool, input);
    } catch {
      // Ne pas exposer les erreurs du pilote, les secrets ou les donnees.
      throw new HttpsError("unavailable", "Consultation NAP indisponible. Verifier la configuration serveur.");
    }
  });
}
if (ENVIRONMENT.projectId === "livepalmes-test") {
  const napPassword = defineSecret("LIVEPALMES_NAP_PASSWORD");
  let napPool;
  // Export reserve au compte de publication TEST, jamais accessible au public.
  const { inspectExportSources, readExportPage, readSourceSchema } = require("./nap-public-export");
  exports.exportNapPublicPage = onRequest({
    region: REGION,
    invoker: "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com",
    secrets: [napPassword], maxInstances: 2, concurrency: 4, timeoutSeconds: 180
  }, async (request, response) => {
    response.set("Cache-Control", "no-store");
    const indexOperation = request.method === "POST" && request.query.action === "approved-index";
    const swimmerCorrection = request.method === "POST" && request.query.action === "approved-swimmer-correction";
    const noraClubs = request.method === "POST" && request.query.action === "approved-nora-performance-clubs";
    const portalSchema = request.method === "POST" && request.query.action === "approved-portal-schema";
    const closureSchema = request.method === "POST" && request.query.action === "approved-closure-schema";
    const peopleSchema = request.method === "POST" && request.query.action === "approved-people-schema";
    const dtnSchema = request.method === "POST" && request.query.action === "approved-dtn-schema";
    const licenseReports = request.method === "POST" && request.query.action === "approved-license-reports";
    const accountEmails = request.method === "POST" && request.query.action === "approved-club-account-emails";
    const dtnSettings = request.method === "POST" && request.query.action === "approved-dtn-settings";
    const homeRefresh = request.method === "POST" && request.query.action === "home-events-refresh";
    if (request.method === "GET" && request.query.action === "approved-club-account-emails") { response.status(405).json({ error: "Methode interdite." }); return; }
    if (request.method === "GET" && request.query.action === "home-events-refresh") { response.status(405).json({ error: "Methode interdite." }); return; }
    if (request.method !== "GET" && !indexOperation && !swimmerCorrection && !noraClubs && !portalSchema && !closureSchema && !peopleSchema && !dtnSchema && !dtnSettings && !licenseReports && !accountEmails && !homeRefresh || request.method === "GET" && ["approved-index", "approved-swimmer-correction", "approved-nora-performance-clubs", "approved-portal-schema", "approved-closure-schema", "approved-people-schema", "approved-dtn-schema", "approved-dtn-settings", "approved-license-reports"].includes(request.query.action)) { response.status(405).json({ error: "Methode interdite." }); return; }
    try {
      if (!napPool) napPool = createNapPool(napPassword.value());
      const data = noraClubs ? await require("./nap-nora-performance-clubs").repair(napPool, request.body, {
        readDocument: async id => { const doc = await db.collection("auditLogs").doc(id).get(); return doc.exists ? doc.data() : null; },
        read: async () => { const doc = await db.collection("auditLogs").doc("nap-nora-13787-performance-clubs-20261024-before").get(); return doc.exists ? doc.data().target : null; },
        prepare: target => db.collection("auditLogs").doc("nap-nora-13787-performance-clubs-20261024-before").create({ action: "nap.performanceClubs.authorizedRepair.prepare", actorUid: "github-livepalmes-test-backend", target, createdAt: new Date().toISOString() }),
        complete: target => writeAuditLogOnce("nap.performanceClubs.authorizedRepair.complete", "github-livepalmes-test-backend", target, "nap-nora-13787-performance-clubs-20261024")
      }) : accountEmails ? await require("./nap-club-account-emails-maintenance").request(napPool, request.body, ENVIRONMENT.projectId)
        : licenseReports ? await require("./nap-license-report-migration").request(napPool, request.body)
        : dtnSettings ? await require("./nap-dtn-settings-migration").migrateDtnSettings(napPool, db, request.body)
        : dtnSchema ? await require("./nap-approved-dtn-schema").approvedDtnSchema(napPool, request.body)
        : peopleSchema ? request.body?.confirmation === "nap-add-official-identity-fields"
          ? await require("./nap-approved-official-identity-schema").approvedOfficialIdentitySchema(napPool,request.body)
          : await require("./nap-approved-people-schema").approvedPeopleSchema(napPool, request.body)
        : closureSchema ? await require("./nap-approved-closure-schema").approvedClosureSchema(napPool, request.body)
        : portalSchema ? await require("./nap-approved-portal-schema").approvedPortalSchema(napPool, request.body)
        : swimmerCorrection ? await require("./nap-approved-swimmer-correction").approvedSwimmerCorrection(napPool, request.body, {
        read: async () => {
          const snapshot = await db.collection("auditLogs").doc("nap-swimmer-912-fauvau-before").get();
          return snapshot.exists ? snapshot.data().target : null;
        },
        prepare: target => db.collection("auditLogs").doc("nap-swimmer-912-fauvau-before").create({ action: "nap.swimmer.authorizedCorrection.prepare", actorUid: "github-livepalmes-test-backend", target, createdAt: new Date().toISOString() }),
        complete: target => writeAuditLogOnce("nap.swimmer.authorizedCorrection.complete", "github-livepalmes-test-backend", target, "nap-swimmer-912-fauvau")
      }) : indexOperation ? await require("./nap-approved-index").approvedIndexOperation(napPool, request.body)
        : homeRefresh ? await require("./nap-home-events-refresh").refreshTestHomeEvents(napPool,storage.bucket(ENVIRONMENT.publicBucket).file(require("./nap-home-events").OBJECT_PATH),{projectId:ENVIRONMENT.projectId,confirmation:request.body?.confirmation})
        : request.query.action === "document-themes-inspect" ? await require("./nap-document-themes-inspect").inspect(napPool)
        : request.query.action === "performance-clubs" ? await require("./nap-consultation-diagnostic").inspect(napPool)
        : request.query.action === "home-events-measure" ? await require("./nap-home-measure").measure(napPool,{direct:request.query.direct==="1"})
        : request.query.action === "home-events-page" ? await require("./nap-home-events").readPage(napPool,request.query)
        : request.query.action === "direct-plan" ? await require("./nap-direct-query-checks").inspectDirectQueries(napPool)
        : request.query.action === "time-shape" ? await require("./nap-direct-query-checks").inspectTimeShape(napPool, request.query.after)
        : request.query.action === "portal-contract" ? await require("./nap-portal-contract").inspectPortalContract(napPool)
        : request.query.action === "engagement-contract" ? await require("./nap-engagement-contract").inspectEngagementContract(napPool)
        : request.query.action === "portal-competition-contract" ? await require("./nap-portal-competitions").inspectNativeCompetitions(napPool)
        : request.query.action === "portal-entry-contract" ? await require("./nap-portal-entries").inspectNativeClubEntry(napPool)
        : request.query.action === "portal-person-status-plans" ? await require("./nap-club-person-status").inspectStatusWritePlans(napPool)
        : request.query.action === "portal-team-leader-contract" ? await require("./nap-team-leader-contract").inspectNativeLeaderContract(napPool)
        : request.query.action === "dtn-source-contract" ? await require("./nap-dtn-source-proof").inspectDtnSource(napPool)
        : request.query.action === "dtn-service-contract" ? await require("./nap-dtn-service-proof").inspectDtnService(napPool)
        : request.query.action === "portal-competition-write-plans" ? await require("./nap-competition-write-plans").inspectCompetitionWritePlans(napPool)
        : request.query.action === "portal-course-document-contract" ? await require("./nap-course-document-contract").inspectCourseDocumentContract(napPool)
        : request.query.action === "calendar-contract" ? await require("./nap-calendar-contract").inspectCalendarContract(napPool)
        : request.query.action === "source-inventory" ? await require("./nap-source-inventory").inspectSourceInventory(napPool)
        : request.query.action === "schema" ? await readSourceSchema(napPool)
        : request.query.action === "inspect" ? await inspectExportSources(napPool)
          : await readExportPage(napPool, request.query);
      response.json(data);
    } catch (error) {
      response.status(error instanceof TypeError ? 400 : 503).json({ error: noraClubs && (error instanceof TypeError || error instanceof RangeError) ? error.message : "Export NAP indisponible." });
    }
  });
}
const ENGAGEMENT_MAIL_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: ENGAGEMENT_NOTIFICATION_MAIL_SECRETS, timeoutSeconds: 300 };
const ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS = { ...CALLABLE_OPTIONS,
  ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) };
const NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS = { ...CALLABLE_OPTIONS, secrets: [LIVEPALMES_NOTIFICATION_LINK_SECRET] };
const ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 120, memory: "512MiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS = { ...CALLABLE_OPTIONS, timeoutSeconds: 540, memory: "1GiB" };
const ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS = {
  ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS
};
const PORTAL_ACCESS_REQUEST_OPTIONS = {
  ...CALLABLE_OPTIONS,
  secrets: ENGAGEMENT_MAIL_SECRETS,
  timeoutSeconds: 30,
  // Active uniquement apres observation des metriques App Check en production.
  enforceAppCheck: LIVEPALMES_ENFORCE_APP_CHECK
};
const ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: ENVIRONMENT.sportingDataSource === "nap" ? "0 * * * *" : "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ENVIRONMENT.sportingDataSource === "nap" ? [defineSecret("LIVEPALMES_NAP_PASSWORD"), ...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] : ENGAGEMENT_NOTIFICATION_MAIL_SECRETS
};
const MIGRATION_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 540, memory: "1GiB" };
const PUBLIC_PERFORMANCE_CALLABLE_OPTIONS = { region: REGION, invoker: "public", timeoutSeconds: 120, memory: "1GiB" };
const PERFORMANCE_PUBLICATION_JOB_OPTIONS = {
  region: REGION,
  document: "performancePublicationJobs/{jobId}",
  retry: true,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS = {
  region: REGION,
  schedule: "*/5 * * * *",
  timeZone: "Europe/Paris",
  timeoutSeconds: 540,
  memory: "1GiB"
};
const COMPETITION_IMPORT_CALLABLE_OPTIONS = { ...PUBLIC_PERFORMANCE_CALLABLE_OPTIONS,
  ...(ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}: {}) };
const PUBLIC_RESULT_TRIGGER_OPTIONS = {
  region: REGION,
  document: "competitions/{competitionId}/results/{resultId}",
  retry: true
};
const PIN_MAX_FAILED_ATTEMPTS = 5;
const PIN_LOCK_MS_BY_LEVEL = [2 * 60 * 1000, 5 * 60 * 1000];
const AUDIT_LEGACY_VISIBLE_SINCE = "2026-08-12T00:00:00.000Z";
const AUDIT_PAGE_LIMIT = 50;
const AUDIT_ACTOR_RESOLUTION_LIMIT = 25;
const AUDIT_COMPETITION_RESOLUTION_LIMIT = 25;
const AUDIT_PERSON_RESOLUTION_LIMIT = 25;
const PUBLIC_PERFORMANCE_BUCKET = ENVIRONMENT.publicBucket;
const LIVEPALMES_STORAGE_BUCKET = ENVIRONMENT.firebaseStorageBucket;
const ENGAGEMENT_CLOSURE_BATCH_LIMIT = 5;
const PUBLIC_ADDITIONAL_PERFORMANCE_PATH = "performance-public/additional-data.json";
const PUBLIC_ADDITIONAL_PERFORMANCE_TOKEN = "4a78ebdf-07b8-4f05-8d8c-0c6231a7ad5d";
const PUBLIC_PERFORMANCE_FILES_PATH = "performance-public-firestore";
const PUBLIC_COMPETITION_PDF_PREFIX = "competition-pdfs";
const ENGAGEMENT_PDF_LOGO_PATH = path.join(__dirname, "assets", "logo-ffessm-nage-avec-palmes.png");
const PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = 100;
const MAX_COMPETITION_IMPORT_PERFORMANCES = 5000;
const PERFORMANCE_BASE_COLLECTION = "performances";
const PERFORMANCE_BASE_CHANGES_COLLECTION = "performanceChanges";
const PERFORMANCE_BASE_MIGRATION_COLLECTION = "performanceMigrationJobs";
const PERFORMANCE_PUBLICATION_JOBS_COLLECTION = "performancePublicationJobs";
const PERFORMANCE_SWIMMERS_COLLECTION = "performanceSwimmerIndex";
const PERFORMANCE_SWIMMER_PAGES_COLLECTION = "performanceSwimmerPages";
const PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION = "performanceSwimmerIndexState";
const PERFORMANCE_TOP_BUCKETS_COLLECTION = "performanceTopViews";
const PERFORMANCE_TOP_INDEX_STATE_COLLECTION = "performanceTopIndexState";
const ENGAGEMENT_CLUB_ROSTERS_COLLECTION = "engagementClubRosters";
const ENGAGEMENT_CLUBS_COLLECTION = "engagementClubs";
const ENGAGEMENT_PUBLIC_DIRECTORIES_COLLECTION = "engagementPublicDirectories";
const ENGAGEMENT_COMPETITION_CALENDARS_COLLECTION = "engagementCompetitionCalendars";
const ENGAGEMENT_CALENDAR_EVENTS_COLLECTION = "engagementCalendarEvents";
const ENGAGEMENT_CALENDAR_EVENT_CALENDARS_COLLECTION = "engagementCalendarEventCalendars";
const ENGAGEMENT_CONFIGURATION_COLLECTION = "engagementConfigurations";
const ENGAGEMENT_COMPETITION_ENTRY_SUMMARIES_COLLECTION = "engagementCompetitionEntrySummaries";
const ENGAGEMENT_CLUB_COMPETITION_INDEXES_COLLECTION = "engagementClubCompetitionIndexes";
const ENGAGEMENT_COMPETITION_STATISTICS_CACHE_COLLECTION = "engagementCompetitionStatisticsCache";
const ENGAGEMENT_CLUB_PEOPLE_ROSTERS_COLLECTION = "engagementClubPeopleRosters";
const ENGAGEMENT_SWIMMER_LICENSE_NUMBERS_COLLECTION = "engagementSwimmerLicenseNumbers";
const ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION = "engagementSwimmerChangeRequests";
const ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION = "engagementEntryTimeCaches";
const ENGAGEMENT_ENTRY_TIME_CACHE_VERSION = 4;
const ENGAGEMENT_DOCUMENTS_STORAGE_PREFIX = "entry-documents";
const ENGAGEMENT_COMPETITION_DOCUMENTS_STORAGE_PREFIX = "competition-documents";
const ENGAGEMENT_MAIL_JOBS_COLLECTION = "engagementMailJobs";
const ENGAGEMENT_MAIL_RECIPIENT_SHARDS_COLLECTION = "engagementMailRecipientShards";
const ENGAGEMENT_MAIL_RECIPIENT_INDEX_STATE_COLLECTION = "engagementMailRecipientIndexState";
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_COLLECTION = "engagementClubAdminDirectories";
const ACCESS_DIRECTORY_INDEX_STATE_COLLECTION = "accessDirectoryIndexState";
const ACCESS_DIRECTORY_INDEX_VERSION = 3;
const ACCESS_DIRECTORY_SNAPSHOTS_COLLECTION = "accessDirectorySnapshots";
const ACCESS_DIRECTORY_SNAPSHOT_STATE_COLLECTION = "accessDirectorySnapshotState";
const ACCESS_DIRECTORY_SNAPSHOT_VERSION = 3;
const ENGAGEMENT_MAIL_RECIPIENT_SHARD_COUNT = 32;
const ENGAGEMENT_MAIL_RECIPIENT_BOOTSTRAP_LIMIT = 167;
const ENGAGEMENT_CLUB_ADMIN_DIRECTORY_MAX_BYTES = 800000;
const ENGAGEMENT_CLOSURE_QUEUE_COLLECTION = "engagementClosureQueue";
const ENGAGEMENT_OPEN_WATER_COURSE_CONFIG_ID = "open-water-courses";
const ENGAGEMENT_OPEN_WATER_COURSE_LIMIT = 100;
const ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES = new Set(["SF", "BI", "SUP"]);
const ENGAGEMENT_OPEN_WATER_DEFAULT_COURSES = [
  { id: "150-elimination-SF", distance: 150, discipline: "SF", label: "150 m élimination Surface", format: "elimination", active: true },
  { id: "150-elimination-BI", distance: 150, discipline: "BI", label: "150 m élimination Bi-palmes", format: "elimination", active: true },
  { id: "1000-SF", distance: 1000, discipline: "SF", label: "1000 m Surface", format: "standard", active: true },
  { id: "1000-BI", distance: 1000, discipline: "BI", label: "1000 m Bi-palmes", format: "standard", active: true },
  { id: "1000-SUP", distance: 1000, discipline: "SUP", label: "1000 m Support", format: "standard", active: true },
  { id: "3000-SF", distance: 3000, discipline: "SF", label: "3000 m Surface", format: "standard", active: true },
  { id: "3000-BI", distance: 3000, discipline: "BI", label: "3000 m Bi-palmes", format: "standard", active: true },
  { id: "3000-SUP", distance: 3000, discipline: "SUP", label: "3000 m Support", format: "standard", active: true },
  { id: "5000-SF", distance: 5000, discipline: "SF", label: "5000 m Surface", format: "standard", active: true },
  { id: "5000-BI", distance: 5000, discipline: "BI", label: "5000 m Bi-palmes", format: "standard", active: true },
  { id: "5000-SUP", distance: 5000, discipline: "SUP", label: "5000 m Support", format: "standard", active: true }
];
const PERFORMANCE_TOP_INDEX_LIMIT = 500;
const DTN_QUALIFICATION_CACHE_COLLECTION = "dtnQualificationViews";
const DTN_QUALIFICATION_CACHE_STATE_COLLECTION = "dtnQualificationViewState";
const DTN_QUALIFICATION_JOBS_COLLECTION = "dtnQualificationJobs";
const DTN_QUALIFICATION_CACHE_VERSION = 5;
const DTN_NEAR_MINIMUM_MAX_PERCENT = 5;
const DTN_LISTING_CACHE_VERSION = 3;
const DTN_QUALIFICATION_MAX_ROWS_PER_COURSE = 5000;
const DTN_QUALIFICATION_JOB_OPTIONS = {
  region: REGION,
  document: `${DTN_QUALIFICATION_JOBS_COLLECTION}/{jobId}`,
  timeoutSeconds: 540,
  memory: "1GiB"
};
const PORTAL_ACCESS_RATE_LIMIT_COLLECTION = "portalAccessRequestRateLimits";
const DTN_EDF_LIMOGES_COMPETITION_ID = "e40fe3129ffd5d76286774193a2855ed";
const DTN_EDF_COMPETITION_IDS_BY_SEASON = {
  2026: ["5039", "4978", "4979", DTN_EDF_LIMOGES_COMPETITION_ID]
};
const DTN_LISTING_SEASON_YEARS = new Set([2026]);
const PERFORMANCE_SWIMMER_PAGE_SIZE = 500;
const ENGAGEMENT_SWIMMER_CORRECTION_MAX_PERFORMANCE_ROWS = 5000;
const ENGAGEMENT_SWIMMER_CORRECTION_ENTRY_PAGE_SIZE = 250;
const ENGAGEMENT_ENTRY_TIME_SOURCE_KEY_LIMIT = 3;
const PERFORMANCE_PUBLIC_DATA_URL = `${ENVIRONMENT.hostingOrigin}/performances/public/data`;
const PERFORMANCE_BASE_MIGRATION_BATCH_SIZE = 2000;
const POOL_COURSES = ["50SF", "100SF", "200SF", "400SF", "800SF", "1500SF", "50AP", "100IS", "200IS", "400IS", "50BI", "100BI", "200BI", "400BI"];



/* extracted-function: functions/backend/server-access-service/portal-read-stats.js#portalReadStats */
function portalReadStats(input0, input1) {
  return $serverAccessService_portalReadStats().portalReadStats(...arguments);
}
const COURSE_META = {
  "50SF": ["50 m Surface", "50 SF", "SF", 50],
  "100SF": ["100 m Surface", "100 SF", "SF", 100],
  "200SF": ["200 m Surface", "200 SF", "SF", 200],
  "400SF": ["400 m Surface", "400 SF", "SF", 400],
  "800SF": ["800 m Surface", "800 SF", "SF", 800],
  "1500SF": ["1500 m Surface", "1500 SF", "SF", 1500],
  "50AP": ["50 m Apnee", "50 AP", "AP", 50],
  "100IS": ["100 m Immersion", "100 IS", "IS", 100],
  "200IS": ["200 m Immersion", "200 IS", "IS", 200],
  "400IS": ["400 m Immersion", "400 IS", "IS", 400],
  "50BI": ["50 m Bi-palmes", "50 BI", "BI", 50],
  "100BI": ["100 m Bi-palmes", "100 BI", "BI", 100],
  "200BI": ["200 m Bi-palmes", "200 BI", "BI", 200],
  "400BI": ["400 m Bi-palmes", "400 BI", "BI", 400]
};
const ENGAGEMENT_RELAY_EVENTS = [
  ["4X50SF", "4 x 50 m Surface", "4 x 50 SF", "SF", 50, 4, "mastersOnly"],
  ["4X100SF", "4 x 100 m Surface", "4 x 100 SF", "SF", 100, 4],
  ["4X200SF", "4 x 200 m Surface", "4 x 200 SF", "SF", 200, 4],
  ["4X100BI", "4 x 100 m Bi-palmes mixte", "4 x 100 BI", "BI", 100, 4, "required"],
  ["4X100SB", "4 x 100 m Surface/Bi-palmes mixte", "4 x 100 SB", "SB", 100, 4, "required"],
  ["OW4X1000SB", "4 x 1000 m Surface/Bi-palmes mixte", "4 x 1000 SB", "SB", 1000, 4, "required"]
];
const ENGAGEMENT_EVENT_DEFINITIONS = [
  ...["SF", "AP"].map(discipline => ({code: `25${discipline}`, type: "individual", label: `25 m ${discipline === "SF" ? "Surface" : "Apnee"}`, shortLabel: `25 ${discipline}`, discipline, distance: 25})),
  ...POOL_COURSES.map((code) => {
    const meta = COURSE_META[code] || [code, code, courseStyleFromCode(code), courseLengthFromCode(code)];
    return {
      code,
      type: "individual",
      label: meta[0],
      shortLabel: meta[1],
      discipline: meta[2],
      distance: meta[3]
    };
  }),
  ...ENGAGEMENT_RELAY_EVENTS.map(([code, label, shortLabel, discipline, distance, relayLegs, relayMixedRule]) => ({
    code,
    type: "relay",
    label,
    shortLabel,
    discipline,
    distance,
    relayLegs,
    ...(relayMixedRule ? { relayMixedRule } : {})
  }))
];
const ENGAGEMENT_EVENT_DEFINITION_BY_CODE = new Map(
  ENGAGEMENT_EVENT_DEFINITIONS.map((event) => [event.code, event])
);
const ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "M30+", "M40+", "M50+", "M60+", "M70+", "M80+"];
const ENGAGEMENT_RELAY_CATEGORY_CODES = ["P", "B", "M", "C", "J", "S", "R140", "R180", "R220", "R260"];
const ENGAGEMENT_RELAY_AGE_CATEGORY_RANK = {
  P: 0,
  B: 1,
  M: 2,
  C: 3,
  J: 4,
  S: 5
};
const ENGAGEMENT_CATEGORY_CODES = Array.from(new Set([
  ...ENGAGEMENT_INDIVIDUAL_CATEGORY_CODES,
  ...ENGAGEMENT_RELAY_CATEGORY_CODES
]));
const ENGAGEMENT_CATEGORY_CODE_SET = new Set(ENGAGEMENT_CATEGORY_CODES);
const ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES = {
  "50AP": new Set(["P", "B", "M"])
};
const ENGAGEMENT_RELAY_MIXED_MODES = new Set(["none", "masters", "required"]);
const ENGAGEMENT_PROGRAM_GENDER_MODES = new Set(["female", "male", "mixed"]);
const ENGAGEMENT_PROGRAM_PHASES = new Set(["direct", "heats", "final", "slowHeats", "fastHeat"]);

/* extracted-function: functions/backend/server-access-service/clean-engagement-relay-mixed-mode.js#engagementCategoryCodesForEvent */
function engagementCategoryCodesForEvent(input0) {
  return $serverAccessService_cleanEngagementRelayMixedMode().engagementCategoryCodesForEvent(...arguments);
}

/* extracted-function: functions/backend/server-access-service/clean-engagement-relay-mixed-mode.js#normalizeEngagementEventCategoryRestrictions */
function normalizeEngagementEventCategoryRestrictions(input0) {
  return $serverAccessService_cleanEngagementRelayMixedMode().normalizeEngagementEventCategoryRestrictions(...arguments);
}

/* extracted-function: functions/backend/server-access-service/clean-engagement-relay-mixed-mode.js#cleanEngagementRelayMixedMode */
function cleanEngagementRelayMixedMode() {
  return $serverAccessService_cleanEngagementRelayMixedMode().cleanEngagementRelayMixedMode(...arguments);
}

const CATEGORY_LABELS = {
  F: {
    P: "Poussines",
    B: "Benjamines",
    M: "Minimes Femmes",
    C: "Cadettes",
    J: "Juniors Femmes",
    S: "Seniors Femmes",
    "M30+": "Femmes 30+",
    "M40+": "Femmes 40+",
    "M50+": "Femmes 50+",
    "M60+": "Femmes 60+",
    "M70+": "Femmes 70+",
    "M80+": "Femmes 80+"
  },
  M: {
    P: "Poussins",
    B: "Benjamins",
    M: "Minimes Hommes",
    C: "Cadets",
    J: "Juniors Hommes",
    S: "Seniors Hommes",
    "M30+": "Hommes 30+",
    "M40+": "Hommes 40+",
    "M50+": "Hommes 50+",
    "M60+": "Hommes 60+",
    "M70+": "Hommes 70+",
    "M80+": "Hommes 80+"
  }
};

function cleanText(value) {
  return String(value || "").trim();
}

/* extracted-function: functions/backend/server-access-service/competition-email-notifications-enabled.js#competitionEmailNotificationsEnabled */
function competitionEmailNotificationsEnabled() {
  return $serverAccessService_competitionEmailNotificationsEnabled().competitionEmailNotificationsEnabled(...arguments);
}

/* extracted-function: functions/backend/server-access-service/competition-notification-preference-token.js#notificationPreferenceSecretValue */
function notificationPreferenceSecretValue() {
  return $serverAccessService_competitionNotificationPreferenceToken().notificationPreferenceSecretValue(...arguments);
}

/* extracted-function: functions/backend/server-access-service/competition-notification-preference-token.js#competitionNotificationPreferenceToken */
function competitionNotificationPreferenceToken() {
  return $serverAccessService_competitionNotificationPreferenceToken().competitionNotificationPreferenceToken(...arguments);
}

/* extracted-function: functions/backend/server-access-service/valid-competition-notification-preference-token.js#validCompetitionNotificationPreferenceToken */
function validCompetitionNotificationPreferenceToken() {
  return $serverAccessService_validCompetitionNotificationPreferenceToken().validCompetitionNotificationPreferenceToken(...arguments);
}

/* extracted-function: functions/backend/server-access-service/competition-notification-preference-url.js#competitionNotificationPreferenceUrl */
function competitionNotificationPreferenceUrl() {
  return $serverAccessService_competitionNotificationPreferenceUrl().competitionNotificationPreferenceUrl(...arguments);
}

const CLUB_REFERENCE_BY_ID = new Map((Array.isArray(clubReference.clubs) ? clubReference.clubs : [])
  .map((club) => [cleanText(club?.[0]), {
    clubId: cleanText(club?.[0]),
    clubCode: cleanText(club?.[1]),
    clubName: cleanText(club?.[2]),
    regionId: cleanText(club?.[3]).slice(0, 80),
    federalNumber: cleanText(club?.[4]).slice(0, 24),
    city: cleanText(club?.[5]).slice(0, 100),
    postalCode: cleanText(club?.[6]).slice(0, 16),
    active: club?.[7] !== false,
    source: "intranap"
  }])
  .filter(([clubId]) => clubId));

const CLUB_REFERENCE_BY_FEDERAL_NUMBER = new Map(Array.from(CLUB_REFERENCE_BY_ID.values())
  .filter((club) => club.federalNumber)
  .map((club) => [club.federalNumber.toUpperCase(), club]));

const CLUB_REFERENCE_REGION_LABELS = {
  "5": "CMAS",
  "1": "Grand Est",
  "2": "Nouvelle Aquitaine",
  "3": "Ile de France",
  "6": "Bretagne Pays de la Loire",
  "8": "Centre",
  "9": "Guadeloupe",
  "10": "Pyrénées Méditerranée Occitanie",
  "11": "Martinique Guyane",
  "12": "Corse",
  "13": "Hauts de France",
  "15": "Normandie",
  "16": "Sud",
  "17": "Auvergne Rhône Alpes",
  "18": "Réunion",
  "22": "Bourgogne Franche Comté"
};

/* extracted-function: functions/backend/server-access-service/engagement-club-region-id.js#engagementClubRegionId */
function engagementClubRegionId() {
  return $serverAccessService_engagementClubRegionId().engagementClubRegionId(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-club-code.js#engagementClubCode */
function engagementClubCode(input0) {
  return $serverAccessService_engagementClubCode().engagementClubCode(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-club-name.js#engagementClubName */
function engagementClubName(input0) {
  return $serverAccessService_engagementClubName().engagementClubName(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-stored-club-item.js#engagementStoredClubItem */
function engagementStoredClubItem(input0) {
  return $serverAccessService_engagementStoredClubItem().engagementStoredClubItem(...arguments);
}

/* extracted-function: functions/backend/server-access-service/public-engagement-club-item.js#publicEngagementClubItem */
function publicEngagementClubItem() {
  return $serverAccessService_publicEngagementClubItem().publicEngagementClubItem(...arguments);
}

/* extracted-function: functions/backend/server-access-service/public-engagement-club-directory-ref.js#publicEngagementClubDirectoryRef */
function publicEngagementClubDirectoryRef() {
  return $serverAccessService_publicEngagementClubDirectoryRef().publicEngagementClubDirectoryRef(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-clubs-by-ids.js#engagementClubsByIds */
async function engagementClubsByIds() {
  return $serverAccessService_engagementClubsByIds().engagementClubsByIds(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-club-access-context.js#engagementClubById */
async function engagementClubById(input0) {
  return $serverAccessService_engagementClubAccessContext().engagementClubById(...arguments);
}

/* extracted-function: functions/backend/server-access-service/clean-firestore-value.js#cleanFirestoreValue */
function cleanFirestoreValue(input0) {
  return $serverAccessService_cleanFirestoreValue().cleanFirestoreValue(...arguments);
}

/* extracted-function: functions/backend/server-access-service/competition-id-from.js#competitionIdFrom */
function competitionIdFrom() {
  return $serverAccessService_competitionIdFrom().competitionIdFrom(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-admin.js#assertAdmin */
function assertAdmin(input0) {
  return $serverAccessService_assertAdmin().assertAdmin(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-capability.js#assertCapability */
function assertCapability(input0, input1) {
  return $serverAccessService_assertCapability().assertCapability(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-live-palmes-access.js#assertLivePalmesAccess */
async function assertLivePalmesAccess(input0) {
  return $serverAccessService_assertLivePalmesAccess().assertLivePalmesAccess(...arguments);
}

/* extracted-function: functions/backend/server-access-service/normalize-email.js#normalizeEmail */
function normalizeEmail(input0) {
  return $serverAccessService_normalizeEmail().normalizeEmail(...arguments);
}

/* extracted-function: functions/backend/server-access-service/normalized-engagement-region-key.js#normalizedEngagementRegionKey */
function normalizedEngagementRegionKey(input0) {
  return $serverAccessService_normalizedEngagementRegionKey().normalizedEngagementRegionKey(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-regions-match.js#engagementRegionsMatch */
function engagementRegionsMatch(input0, input1) {
  return $serverAccessService_engagementRegionsMatch().engagementRegionsMatch(...arguments);
}

/* extracted-function: functions/backend/server-access-service/canonical-access-directory-region-id.js#canonicalAccessDirectoryRegionId */
function canonicalAccessDirectoryRegionId(input0) {
  return $serverAccessService_canonicalAccessDirectoryRegionId().canonicalAccessDirectoryRegionId(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-email.js#assertEmail */
function assertEmail(input0) {
  return $serverAccessService_assertEmail().assertEmail(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-scope-for-capability.js#cleanAccessProfile */
function cleanAccessProfile() {
  return $serverAccessService_accessScopeForCapability().cleanAccessProfile(...arguments);
}

/* extracted-function: functions/backend/server-access-service/capabilities-map.js#capabilitiesMap */
function capabilitiesMap() {
  return $serverAccessService_capabilitiesMap().capabilitiesMap(...arguments);
}

/* extracted-function: functions/backend/server-access-service/active-capabilities-from-map.js#activeCapabilitiesFromMap */
function activeCapabilitiesFromMap() {
  return $serverAccessService_activeCapabilitiesFromMap().activeCapabilitiesFromMap(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-keys.js#accessDirectoryKeys */
function accessDirectoryKeys() {
  return $serverAccessService_accessDirectoryKeys().accessDirectoryKeys(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-filter-key.js#accessDirectoryFilterKey */
function accessDirectoryFilterKey() {
  return $serverAccessService_accessDirectoryFilterKey().accessDirectoryFilterKey(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-index-state-ref.js#accessDirectoryIndexStateRef */
function accessDirectoryIndexStateRef() {
  return $serverAccessService_accessDirectoryIndexStateRef().accessDirectoryIndexStateRef(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-snapshot-document-id.js#accessDirectorySnapshotStateRef */
function accessDirectorySnapshotStateRef() {
  return $serverAccessService_accessDirectorySnapshotDocumentId().accessDirectorySnapshotStateRef(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-snapshot-document-id.js#accessDirectorySnapshotDocumentId */
function accessDirectorySnapshotDocumentId() {
  return $serverAccessService_accessDirectorySnapshotDocumentId().accessDirectorySnapshotDocumentId(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-snapshot-document-id.js#accessDirectorySnapshotRef */
function accessDirectorySnapshotRef() {
  return $serverAccessService_accessDirectorySnapshotDocumentId().accessDirectorySnapshotRef(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-snapshot-document-id.js#accessDirectorySnapshotEntryKey */
function accessDirectorySnapshotEntryKey() {
  return $serverAccessService_accessDirectorySnapshotDocumentId().accessDirectorySnapshotEntryKey(...arguments);
}

/* extracted-function: functions/backend/server-access-service/normalized-access-scope.js#normalizedAccessScope */
function normalizedAccessScope() {
  return $serverAccessService_normalizedAccessScope().normalizedAccessScope(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-scope-for-capability.js#accessScopeForCapability */
function accessScopeForCapability() {
  return $serverAccessService_accessScopeForCapability().accessScopeForCapability(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-scope-for-capability.js#accessScopesMapFromProfile */
function accessScopesMapFromProfile() {
  return $serverAccessService_accessScopeForCapability().accessScopesMapFromProfile(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-engagements-access.js#hasEngagementsCapability */
function hasEngagementsCapability() {
  return $serverAccessService_assertEngagementsAccess().hasEngagementsCapability(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-access-context.js#engagementAccessContext */
async function engagementAccessContext(input0) {
  return $serverAccessService_engagementAccessContext().engagementAccessContext(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-management-context.js#accessManagementContext */
async function accessManagementContext(input0) {
  return $serverAccessService_accessManagementContext().accessManagementContext(...arguments);
}

/* extracted-function: functions/backend/server-access-service/audit-management-context.js#auditManagementContext */
async function auditManagementContext(input0) {
  return $serverAccessService_auditManagementContext().auditManagementContext(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-user-region-id-from-data.js#accessUserRegionIdFromData */
function accessUserRegionIdFromData() {
  return $serverAccessService_accessUserRegionIdFromData().accessUserRegionIdFromData(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-filter-key.js#accessUserVisibleToRegional */
function accessUserVisibleToRegional(input0) {
  return $serverAccessService_accessDirectoryFilterKey().accessUserVisibleToRegional(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-user-can-be-managed-by-regional.js#accessUserCanBeManagedByRegional */
function accessUserCanBeManagedByRegional(input0) {
  return $serverAccessService_accessUserCanBeManagedByRegional().accessUserCanBeManagedByRegional(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-directory-filter-key.js#accessUserVisibleForAccessDirectory */
function accessUserVisibleForAccessDirectory(input0, input1) {
  return $serverAccessService_accessDirectoryFilterKey().accessUserVisibleForAccessDirectory(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-user-can-be-managed-by-regional.js#assertRegionalAccessUserDeletionRequestAllowed */
function assertRegionalAccessUserDeletionRequestAllowed(input0) {
  return $serverAccessService_accessUserCanBeManagedByRegional().assertRegionalAccessUserDeletionRequestAllowed(...arguments);
}

/* extracted-function: functions/backend/server-access-service/engagement-club-access-context.js#engagementClubAccessContext */
async function engagementClubAccessContext(input0) {
  return $serverAccessService_engagementClubAccessContext().engagementClubAccessContext(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-engagements-access.js#assertEngagementsAccess */
async function assertEngagementsAccess(input0) {
  return $serverAccessService_assertEngagementsAccess().assertEngagementsAccess(...arguments);
}

/* extracted-function: functions/backend/server-access-service/display-name-from-profile.js#displayNameFromProfile */
function displayNameFromProfile() {
  return $serverAccessService_displayNameFromProfile().displayNameFromProfile(...arguments);
}

/* extracted-function: functions/backend/server-access-service/access-user-display-name.js#accessUserDisplayName */
async function accessUserDisplayName(input0) {
  return $serverAccessService_accessUserDisplayName().accessUserDisplayName(...arguments);
}

/* extracted-function: functions/server-account-write-service.js#userByEmailOrCreate */
async function userByEmailOrCreate(input0) {
  return serverAccountWriteService().userByEmailOrCreate(...arguments);
}

/* extracted-function: functions/server-account-write-service.js#saveAccessUserProfile */
async function saveAccessUserProfile(input0, input1) {
  return serverAccountWriteService().saveAccessUserProfile(...arguments);
}

/* extracted-function: functions/backend/server-access-service/write-audit-log.js#writeAuditLog */
async function writeAuditLog(input0, input1) {
  return $serverAccessService_writeAuditLog().writeAuditLog(...arguments);
}

/* extracted-function: functions/backend/server-access-service/write-audit-log-once.js#writeAuditLogOnce */
async function writeAuditLogOnce(input0, input1) {
  return $serverAccessService_writeAuditLogOnce().writeAuditLogOnce(...arguments);
}

/* extracted-function: functions/backend/server-access-service/write-access-grants.js#writeAccessGrants */
async function writeAccessGrants(input0, input1, input2, input3, input4, input5) {
  return $serverAccessService_writeAccessGrants().writeAccessGrants(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-role.js#assertRole */
function assertRole(input0) {
  return $serverAccessService_assertRole().assertRole(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-pin.js#assertPin */
function assertPin(input0) {
  return $serverAccessService_assertPin().assertPin(...arguments);
}

/* extracted-function: functions/backend/server-access-service/assert-pin.js#pinHash */
function pinHash(input0, input1) {
  return $serverAccessService_assertPin().pinHash(...arguments);
}

/* extracted-function: functions/backend/server-access-service/stable-hash.js#stableHash */
function stableHash(input0) {
  return $serverAccessService_stableHash().stableHash(...arguments);
}

function competitionImportParser() {
  if (!competitionImportParser.instance) competitionImportParser.instance = require("./competition-import-parser").createCompetitionImportParser({
    CATEGORY_LABELS,
    HttpsError,
    POOL_COURSES,
    ageCategoryFromDates,
    applyCompetitionImportTiming: require("./performance-import-timing").applyCompetitionImportTiming,
    cleanText,
    courseLengthFromCode,
    courseStyleFromCode,
    fallbackCategoryFromSource,
    ffessmBasTimingType: require("./performance-import-timing").ffessmBasTimingType,
    formatTimeValue,
    importSeasonYear,
    normalizeCategoryCode,
    normalizeCourseCode,
    normalizeImportToken,
    parseTimeValue,
    stableHash
  });
  return competitionImportParser.instance;
}

/* extracted-function: functions/competition-import-parser.js#cleanImportText */
function cleanImportText(input0) {
  return competitionImportParser().cleanImportText(...arguments);
}



/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#normalizeImportToken */
function normalizeImportToken(input0) {
  return $serverImportService_activeCompetitionImportData().normalizeImportToken(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseFrenchDate */
function parseFrenchDate(input0) {
  return competitionImportParser().parseFrenchDate(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseImportDate */
function parseImportDate(input0) {
  return competitionImportParser().parseImportDate(...arguments);
}

/* extracted-function: functions/backend/server-import-service/parse-time-value.js#parseTimeValue */
function parseTimeValue(input0) {
  return $serverImportService_parseTimeValue().parseTimeValue(...arguments);
}

/* extracted-function: functions/backend/server-import-service/format-time-value.js#formatTimeValue */
function formatTimeValue(input0) {
  return $serverImportService_formatTimeValue().formatTimeValue(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseIntermediateTimes */
function parseIntermediateTimes() {
  return competitionImportParser().parseIntermediateTimes(...arguments);
}

function courseStyleFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/(?:SF|AP|IS|BI)$/);
  return match ? match[0] : "";
}

function courseLengthFromCode(course) {
  const match = cleanText(course).toUpperCase().match(/^(\d+)/);
  return match ? Number(match[1]) : null;
}

/* extracted-function: functions/backend/server-import-service/normalize-course-code.js#normalizeCourseCode */
function normalizeCourseCode(input0) {
  return $serverImportService_normalizeCourseCode().normalizeCourseCode(...arguments);
}

/* extracted-function: functions/backend/server-import-service/normalize-category-code.js#normalizeCategoryCode */
function normalizeCategoryCode(input0) {
  return $serverImportService_normalizeCategoryCode().normalizeCategoryCode(...arguments);
}

function normalizeIdentityText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function swimmerIdentityKey(firstName, lastName, birthDate) {
  const first = normalizeIdentityText(firstName);
  const last = normalizeIdentityText(lastName);
  const birth = cleanText(birthDate);
  if (!first || !last || !birth) return "";
  return `${last}|${first}|${birth}`;
}

function canonicalSwimmerId(ids) {
  return ids
    .map((id) => cleanText(id))
    .filter(Boolean)
    .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, "fr-FR", { numeric: true }))[0] || "";
}

/* extracted-function: functions/backend/server-import-service/age-category-from-dates.js#competitionYear */
function competitionYear(input0) {
  return $serverImportService_ageCategoryFromDates().competitionYear(...arguments);
}

/* extracted-function: functions/backend/server-import-service/age-category-from-dates.js#birthYear */
function birthYear(input0) {
  return $serverImportService_ageCategoryFromDates().birthYear(...arguments);
}

/* extracted-function: functions/backend/server-import-service/age-category-from-dates.js#ageCategoryFromDates */
function ageCategoryFromDates(input0, input1) {
  return $serverImportService_ageCategoryFromDates().ageCategoryFromDates(...arguments);
}

/* extracted-function: functions/backend/server-import-service/performance-category-from-row.js#performanceCategoryFromRow */
function performanceCategoryFromRow() {
  return $serverImportService_performanceCategoryFromRow().performanceCategoryFromRow(...arguments);
}

/* extracted-function: functions/backend/server-import-service/category-code-from-category.js#fallbackCategoryFromSource */
function fallbackCategoryFromSource(input0) {
  return $serverImportService_categoryCodeFromCategory().fallbackCategoryFromSource(...arguments);
}

/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#importPerformanceCategory */
function importPerformanceCategory() {
  return $serverImportService_activeCompetitionImportData().importPerformanceCategory(...arguments);
}

/* extracted-function: functions/backend/server-import-service/load-performance-records-data.js#loadPerformanceRecordsData */
async function loadPerformanceRecordsData() {
  return $serverImportService_loadPerformanceRecordsData().loadPerformanceRecordsData(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-youth-category.js#recordReferenceRows */
function recordReferenceRows() {
  return $serverImportService_isYouthCategory().recordReferenceRows(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-youth-category.js#recordReferenceKey */
function recordReferenceKey() {
  return $serverImportService_isYouthCategory().recordReferenceKey(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-youth-category.js#recordReferenceMap */
function recordReferenceMap() {
  return $serverImportService_isYouthCategory().recordReferenceMap(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-youth-category.js#recordReferenceForPerformance */
function recordReferenceForPerformance(input0, input1, input2, input3) {
  return $serverImportService_isYouthCategory().recordReferenceForPerformance(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-relay-reference-course-code.js#engagementRelayReferenceCourseCode */
function engagementRelayReferenceCourseCode(input0) {
  return $serverImportService_engagementRelayReferenceCourseCode().engagementRelayReferenceCourseCode(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-relay-reference-course-code.js#engagementRelayReferenceRows */
function engagementRelayReferenceRows() {
  return $serverImportService_engagementRelayReferenceCourseCode().engagementRelayReferenceRows(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-relay-reference-course-code.js#engagementRelayReferenceKey */
function engagementRelayReferenceKey() {
  return $serverImportService_engagementRelayReferenceCourseCode().engagementRelayReferenceKey(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-relay-reference-course-code.js#engagementRelayReferenceMap */
function engagementRelayReferenceMap() {
  return $serverImportService_engagementRelayReferenceCourseCode().engagementRelayReferenceMap(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-relay-reference-course-code.js#engagementRelayReferenceForEntry */
function engagementRelayReferenceForEntry(input0, input1) {
  return $serverImportService_engagementRelayReferenceCourseCode().engagementRelayReferenceForEntry(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-youth-category.js#isYouthCategory */
function isYouthCategory(input0) {
  return $serverImportService_isYouthCategory().isYouthCategory(...arguments);
}

/* extracted-function: functions/backend/server-import-service/normalized-record-alert-name.js#normalizedRecordAlertName */
function normalizedRecordAlertName(input0) {
  return $serverImportService_normalizedRecordAlertName().normalizedRecordAlertName(...arguments);
}

/* extracted-function: functions/backend/server-import-service/normalized-record-alert-name.js#sameRecordAlertSwimmer */
function sameRecordAlertSwimmer(input0, input1) {
  return $serverImportService_normalizedRecordAlertName().sameRecordAlertSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-import-service/is-already-published-record-alert.js#isAlreadyPublishedRecordAlert */
function isAlreadyPublishedRecordAlert() {
  return $serverImportService_isAlreadyPublishedRecordAlert().isAlreadyPublishedRecordAlert(...arguments);
}

/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#buildRecordAlert */
function buildRecordAlert(input0, input1, input2) {
  return $serverImportService_activeCompetitionImportData().buildRecordAlert(...arguments);
}

/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#detectRecordAlerts */
function detectRecordAlerts() {
  return $serverImportService_activeCompetitionImportData().detectRecordAlerts(...arguments);
}

function buildIntranapSwimmerReference() {
  const byId = new Map();
  const byIdentity = new Map();
  const groupedByIdentity = new Map();
  intranapSwimmersReference.forEach((swimmer) => {
    const key = swimmerIdentityKey(swimmer.firstName, swimmer.lastName, swimmer.birthDate);
    if (!key) return;
    if (!groupedByIdentity.has(key)) groupedByIdentity.set(key, []);
    groupedByIdentity.get(key).push(swimmer);
  });
  groupedByIdentity.forEach((group, key) => {
    const canonicalId = canonicalSwimmerId(group.map((swimmer) => swimmer.id));
    const canonical = group.find((swimmer) => String(swimmer.id) === String(canonicalId)) || group[0];
    const merged = {
      ...canonical,
      id: String(canonicalId || canonical.id),
      identityKey: key,
      aliases: group.map((swimmer) => String(swimmer.id)).filter((id) => id && id !== String(canonicalId)),
      sourceIds: group.map((swimmer) => String(swimmer.id)).filter(Boolean)
    };
    byIdentity.set(key, merged);
    group.forEach((swimmer) => byId.set(String(swimmer.id), merged));
  });
  intranapSwimmersReference.forEach((swimmer) => {
    if (!byId.has(String(swimmer.id))) byId.set(String(swimmer.id), swimmer);
  });
  return { byId, byIdentity };
}

const intranapSwimmerLookup = buildIntranapSwimmerReference();

/* extracted-function: functions/backend/server-import-service/resolve-intranap-swimmer.js#resolveIntranapSwimmer */
function resolveIntranapSwimmer(input0, input1) {
  return $serverImportService_resolveIntranapSwimmer().resolveIntranapSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-import-service/competition-import-existing-summary.js#competitionImportPreviewPerformance */
function competitionImportPreviewPerformance() {
  return $serverImportService_competitionImportExistingSummary().competitionImportPreviewPerformance(...arguments);
}

/* extracted-function: functions/backend/server-import-service/category-code-from-category.js#categoryCodeFromCategory */
function categoryCodeFromCategory(input0, input1) {
  return $serverImportService_categoryCodeFromCategory().categoryCodeFromCategory(...arguments);
}

/* extracted-function: functions/backend/server-import-service/course-payload.js#coursePayload */
function coursePayload(input0) {
  return $serverImportService_coursePayload().coursePayload(...arguments);
}

/* extracted-function: functions/backend/server-import-service/import-season-year.js#importSeasonYear */
function importSeasonYear(input0) {
  return $serverImportService_importSeasonYear().importSeasonYear(...arguments);
}

/* extracted-function: functions/backend/server-import-service/current-engagement-season-info.js#currentEngagementSeasonInfo */
function currentEngagementSeasonInfo() {
  return $serverImportService_currentEngagementSeasonInfo().currentEngagementSeasonInfo(...arguments);
}

/* extracted-function: functions/backend/server-import-service/clean-engagement-license-season-status.js#cleanEngagementLicenseVerificationStatus */
function cleanEngagementLicenseVerificationStatus(input0) {
  return $serverImportService_cleanEngagementLicenseSeasonStatus().cleanEngagementLicenseVerificationStatus(...arguments);
}

/* extracted-function: functions/backend/server-import-service/clean-engagement-license-season-status.js#cleanEngagementLicenseSeasonStatus */
function cleanEngagementLicenseSeasonStatus(input0) {
  return $serverImportService_cleanEngagementLicenseSeasonStatus().cleanEngagementLicenseSeasonStatus(...arguments);
}

/* extracted-function: functions/backend/server-import-service/clean-engagement-license-season-status.js#engagementLicenseSeasonState */
function engagementLicenseSeasonState() {
  return $serverImportService_cleanEngagementLicenseSeasonStatus().engagementLicenseSeasonState(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-season-end-year-from-iso-date.js#engagementSeasonEndYearFromIsoDate */
function engagementSeasonEndYearFromIsoDate() {
  return $serverImportService_engagementSeasonEndYearFromIsoDate().engagementSeasonEndYearFromIsoDate(...arguments);
}

/* extracted-function: functions/backend/server-import-service/engagement-season-bounds-from-end-year.js#engagementSeasonBoundsFromEndYear */
function engagementSeasonBoundsFromEndYear(input0) {
  return $serverImportService_engagementSeasonBoundsFromEndYear().engagementSeasonBoundsFromEndYear(...arguments);
}

/* extracted-function: functions/backend/server-import-service/current-engagement-category-from-birth-date.js#currentEngagementCategoryFromBirthDate */
function currentEngagementCategoryFromBirthDate(input0) {
  return $serverImportService_currentEngagementCategoryFromBirthDate().currentEngagementCategoryFromBirthDate(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseFfessmTxtImport */
function parseFfessmTxtImport(input0) {
  return competitionImportParser().parseFfessmTxtImport(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cleanWorkbookRows */
function cleanWorkbookRows(input0, input1) {
  return competitionImportParser().cleanWorkbookRows(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cleanInternationalWorkbookPayload */
function cleanInternationalWorkbookPayload(input0) {
  return competitionImportParser().cleanInternationalWorkbookPayload(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#competitionValueFromRows */
function competitionValueFromRows(input0, input1) {
  return competitionImportParser().competitionValueFromRows(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#headerMapFromRow */
function headerMapFromRow() {
  return competitionImportParser().headerMapFromRow(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#requiredHeadersPresent */
function requiredHeadersPresent(input0, input1) {
  return competitionImportParser().requiredHeadersPresent(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#internationalHeaderRow */
function internationalHeaderRow(input0) {
  return competitionImportParser().internationalHeaderRow(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#cellByHeader */
function cellByHeader(input0, input1, input2) {
  return competitionImportParser().cellByHeader(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#normalizeInternationalCategory */
function normalizeInternationalCategory(input0) {
  return competitionImportParser().normalizeInternationalCategory(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseInternationalIntermediateTimes */
function parseInternationalIntermediateTimes(input0, input1) {
  return competitionImportParser().parseInternationalIntermediateTimes(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseInternationalWorkbookImport */
function parseInternationalWorkbookImport(input0) {
  return competitionImportParser().parseInternationalWorkbookImport(...arguments);
}

/* extracted-function: functions/competition-import-parser.js#parseCompetitionImportPayload */
function parseCompetitionImportPayload() {
  return competitionImportParser().parseCompetitionImportPayload(...arguments);
}

/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#importDocumentId */
function importDocumentId() {
  return $serverImportService_activeCompetitionImportData().importDocumentId(...arguments);
}

/* extracted-function: functions/backend/server-import-service/active-competition-import-data.js#activeCompetitionImportData */
function activeCompetitionImportData() {
  return $serverImportService_activeCompetitionImportData().activeCompetitionImportData(...arguments);
}

/* extracted-function: functions/backend/server-import-service/competition-import-existing-summary.js#competitionImportExistingSummary */
function competitionImportExistingSummary(input0) {
  return $serverImportService_competitionImportExistingSummary().competitionImportExistingSummary(...arguments);
}

/* extracted-function: functions/backend/server-import-service/competition-import-existing-summary.js#findExistingCompetitionImport */
async function findExistingCompetitionImport() {
  return $serverImportService_competitionImportExistingSummary().findExistingCompetitionImport(...arguments);
}

/* extracted-function: functions/backend/server-import-service/assert-pin-attempt-allowed.js#safeCompareHex */
function safeCompareHex(input0, input1) {
  return $serverImportService_assertPinAttemptAllowed().safeCompareHex(...arguments);
}

/* extracted-function: functions/backend/server-import-service/role-uid.js#roleUid */
function roleUid(input0, input1, input2) {
  return $serverImportService_roleUid().roleUid(...arguments);
}

/* extracted-function: functions/backend/server-import-service/live-data-ref.js#liveDataRef */
function liveDataRef(input0) {
  return $serverImportService_liveDataRef().liveDataRef(...arguments);
}

/* extracted-function: functions/backend/server-import-service/role-pins-ref.js#rolePinsRef */
function rolePinsRef(input0) {
  return $serverImportService_rolePinsRef().rolePinsRef(...arguments);
}

/* extracted-function: functions/backend/server-import-service/assert-pin-attempt-allowed.js#pinAttemptRef */
function pinAttemptRef(input0, input1, input2, input3) {
  return $serverImportService_assertPinAttemptAllowed().pinAttemptRef(...arguments);
}

/* extracted-function: functions/backend/server-import-service/console-grant-ref.js#consoleGrantRef */
function consoleGrantRef(input0, input1) {
  return $serverImportService_consoleGrantRef().consoleGrantRef(...arguments);
}

/* extracted-function: functions/backend/server-import-service/assert-pin-attempt-allowed.js#lockRemainingSeconds */
function lockRemainingSeconds() {
  return $serverImportService_assertPinAttemptAllowed().lockRemainingSeconds(...arguments);
}

/* extracted-function: functions/backend/server-import-service/assert-pin-attempt-allowed.js#lockMessage */
function lockMessage(input0) {
  return $serverImportService_assertPinAttemptAllowed().lockMessage(...arguments);
}

/* extracted-function: functions/backend/server-import-service/assert-pin-attempt-allowed.js#assertPinAttemptAllowed */
async function assertPinAttemptAllowed(input0) {
  return $serverImportService_assertPinAttemptAllowed().assertPinAttemptAllowed(...arguments);
}



/* extracted-function: functions/backend/server-console-service/assert-console-portal-access.js#recordFailedPinAttempt */
async function recordFailedPinAttempt(input0) {
  return $serverConsoleService_assertConsolePortalAccess().recordFailedPinAttempt(...arguments);
}

/* extracted-function: functions/backend/server-console-service/assert-console-portal-access.js#clearPinAttempts */
async function clearPinAttempts(input0) {
  return $serverConsoleService_assertConsolePortalAccess().clearPinAttempts(...arguments);
}

/* extracted-function: functions/backend/server-console-service/update-public-pin-notes.js#updatePublicPinNotes */
async function updatePublicPinNotes(input0, input1) {
  return $serverConsoleService_updatePublicPinNotes().updatePublicPinNotes(...arguments);
}

/* extracted-function: functions/backend/server-console-service/assert-console-portal-access.js#assertConsolePortalAccess */
async function assertConsolePortalAccess(input0) {
  return $serverConsoleService_assertConsolePortalAccess().assertConsolePortalAccess(...arguments);
}

/* extracted-function: functions/backend/server-console-service/assert-computer-pdf-access.js#assertComputerPdfAccess */
async function assertComputerPdfAccess(input0, input1) {
  return $serverConsoleService_assertComputerPdfAccess().assertComputerPdfAccess(...arguments);
}

exports.storeCompetitionPdf = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/store-competition-pdf.js#storeCompetitionPdf#arrow */ async (request) => {
  return $portalPerformanceHandlers_storeCompetitionPdf().storeCompetitionPdf(request);
});

exports.deleteCompetitionPdf = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/delete-competition-pdf.js#deleteCompetitionPdf#arrow */ async (request) => {
  return $portalPerformanceHandlers_deleteCompetitionPdf().deleteCompetitionPdf(request);
});

exports.syncOfficialResultToPublicIndex = onDocumentUpdated(PUBLIC_RESULT_TRIGGER_OPTIONS, async (event) => {
  const competitionId = cleanText(event.params?.competitionId);
  const resultId = cleanText(event.params?.resultId);
  if (!COMPETITION_IDS.has(competitionId) || !resultId || !event.data?.after?.exists) return;
  const officialResult = event.data.after.data() || {};
  const indexRef = db
    .collection("competitions")
    .doc(competitionId)
    .collection("public")
    .doc("resultsIndex");
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(indexRef);
    if (!snapshot.exists) return;
    const nextIndex = nextPublicResultsIndex(snapshot.data() || {}, resultId, officialResult);
    if (!nextIndex) return;
    transaction.update(indexRef, nextIndex);
  });
});

exports.setRolePins = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/set-role-pins.js#setRolePins#arrow */ async (request) => {
  return $portalAccessHandlers_setRolePins().setRolePins(request);
});

exports.verifyPin = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/verify-pin.js#verifyPin#arrow */ async (request) => {
  return $portalAccessHandlers_verifyPin().verifyPin(request);
});

exports.createOrUpdateAccessUser = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/portal-account-handlers.js#createOrUpdateAccessUser#arrow */ async (request) => {
  return portalAccountHandlers().createOrUpdateAccessUser(request);
});



/* extracted-function: functions/backend/server-directory-service/clean-engagement-access-request-payload.js#cleanEngagementAccessRequestPayload */
function cleanEngagementAccessRequestPayload() {
  return $serverDirectoryService_cleanEngagementAccessRequestPayload().cleanEngagementAccessRequestPayload(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/engagement-access-request-item.js#engagementAccessRequestItem */
function engagementAccessRequestItem(input0) {
  return $serverDirectoryService_engagementAccessRequestItem().engagementAccessRequestItem(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/assert-engagement-access-request-scope.js#assertEngagementAccessRequestScope */
function assertEngagementAccessRequestScope() {
  return $serverDirectoryService_assertEngagementAccessRequestScope().assertEngagementAccessRequestScope(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/clean-engagement-access-request-payload.js#engagementAccessExistingClubPayload */
function engagementAccessExistingClubPayload() {
  return $serverDirectoryService_cleanEngagementAccessRequestPayload().engagementAccessExistingClubPayload(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/clean-engagement-access-request-payload.js#findEngagementClubByFederalNumber */
async function findEngagementClubByFederalNumber() {
  return $serverDirectoryService_cleanEngagementAccessRequestPayload().findEngagementClubByFederalNumber(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/consume-public-access-request-rate-limit.js#resolveExistingClubForAccessRequest */
async function resolveExistingClubForAccessRequest() {
  return $serverDirectoryService_consumePublicAccessRequestRateLimit().resolveExistingClubForAccessRequest(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/assert-engagement-access-request-scope.js#createClubFromEngagementAccessRequest */
async function createClubFromEngagementAccessRequest() {
  return $serverDirectoryService_assertEngagementAccessRequestScope().createClubFromEngagementAccessRequest(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/consume-public-access-request-rate-limit.js#sendEngagementAccessAcknowledgement */
async function sendEngagementAccessAcknowledgement() {
  return $serverDirectoryService_consumePublicAccessRequestRateLimit().sendEngagementAccessAcknowledgement(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/assert-engagement-access-request-scope.js#sendEngagementAccessRejection */
async function sendEngagementAccessRejection() {
  return $serverDirectoryService_assertEngagementAccessRequestScope().sendEngagementAccessRejection(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/consume-public-access-request-rate-limit.js#sendEngagementExistingAccountNotice */
async function sendEngagementExistingAccountNotice() {
  return $serverDirectoryService_consumePublicAccessRequestRateLimit().sendEngagementExistingAccountNotice(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/clean-engagement-access-request-payload.js#engagementExistingAccessAccount */
async function engagementExistingAccessAccount() {
  return $serverDirectoryService_cleanEngagementAccessRequestPayload().engagementExistingAccessAccount(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/consume-public-access-request-rate-limit.js#consumePublicAccessRequestRateLimit */
async function consumePublicAccessRequestRateLimit() {
  return $serverDirectoryService_consumePublicAccessRequestRateLimit().consumePublicAccessRequestRateLimit(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/consume-public-access-request-rate-limit.js#sendEngagementAccessAdminNotifications */
async function sendEngagementAccessAdminNotifications() {
  return $serverDirectoryService_consumePublicAccessRequestRateLimit().sendEngagementAccessAdminNotifications(...arguments);
}

exports.submitEngagementAccessRequest = onCall({ ...PORTAL_ACCESS_REQUEST_OPTIONS, secrets: ENVIRONMENT.sportingDataSource === "nap" ? [...ENGAGEMENT_MAIL_SECRETS, defineSecret("LIVEPALMES_NAP_PASSWORD") ] : ENGAGEMENT_MAIL_SECRETS }, async (request) => {
  const uid = cleanText(request.auth?.uid);
  if (cleanText(request.data?.website)) {
    throw new HttpsError("invalid-argument", "Demande invalide.");
  }
  let payload = cleanEngagementAccessRequestPayload(request.data || {}, request);
  const now = new Date().toISOString();
  await consumePublicAccessRequestRateLimit(request, now);
  try { payload = await resolveExistingClubForAccessRequest(payload); }
  catch (error) { throw new HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Annuaire NAP indisponible. Reessayez."); }
  const existingAccount = await engagementExistingAccessAccount(payload.email);
  if (existingAccount) {
    const guidanceEmail = await sendEngagementExistingAccountNotice(existingAccount);
    await writeAuditLog("engagementAccessRequest.redirectedExistingAccount", uid || "public-login-page", {
      email: payload.email,
      guidanceEmailStatus: guidanceEmail.status
    });
    return {
      ok: true,
      request: null,
      existingAccount: true,
      guidanceEmailSent: guidanceEmail.status === "sent"
    };
  }
  const requestClubKey = payload.clubId || payload.newClub?.federalNumber || "new-club";
  const requestId = stableHash(`${payload.email}|${requestClubKey}|engagements.club.manage`).slice(0, 40);
  const ref = db.collection("engagementAccessRequests").doc(requestId);
  const savedPayload = {
    ...payload,
    status: "pending",
    requestedBy: uid || "public-login-page",
    requestedByEmail: cleanText(request.auth?.token?.email || payload.email).slice(0, 180),
    requestSource: uid ? "authenticated-portal" : "login-page",
    requestedAt: now,
    updatedAt: now,
    updatedBy: uid || "public-login-page"
  };
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data()?.status === "pending") {
      throw new HttpsError("already-exists", "Une demande est deja en attente pour cet email et ce club.");
    }
    transaction.set(ref, savedPayload, { merge: true });
  });
  await writeAuditLog("engagementAccessRequest.submitted", uid || "public-login-page", {
    requestId,
    email: payload.email,
    clubId: payload.clubId,
    regionId: payload.regionId
  });
  const acknowledgementEmail = await sendEngagementAccessAcknowledgement(payload);
  const adminNotification = await sendEngagementAccessAdminNotifications(payload);
  await ref.set({
    acknowledgementEmail,
    adminNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true }).catch((error) => {
    console.error(
      "Statut des notifications de demande d'acces non enregistre.",
      cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
    );
  });
  return {
    ok: true,
    request: engagementAccessRequestItem({ id: requestId, data: () => savedPayload }),
    acknowledgementEmailSent: acknowledgementEmail.status === "sent",
    adminNotificationStatus: adminNotification.status
  };
});

exports.listEngagementAccessRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/list-engagement-access-requests.js#listEngagementAccessRequests#arrow */ async (request) => {
  return $portalCompetitionHandlers_listEngagementAccessRequests().listEngagementAccessRequests(request);
});

exports.resolveEngagementAccessRequest = onCall({ ...PORTAL_ACCESS_REQUEST_OPTIONS, secrets: ENVIRONMENT.sportingDataSource === "nap" ? [...ENGAGEMENT_MAIL_SECRETS, defineSecret("LIVEPALMES_NAP_PASSWORD") ] : ENGAGEMENT_MAIL_SECRETS }, async (request) => {
  const context = await engagementAccessContext(request);
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionReason = cleanText(request.data?.resolutionReason).slice(0, 600);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  if (decision === "rejected" && !resolutionReason) {
    throw new HttpsError("invalid-argument", "Le motif du refus est obligatoire.");
  }
  const ref = db.collection("engagementAccessRequests").doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Demande introuvable.");
  }
  const data = snapshot.data() || {};
  if (data.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  assertEngagementAccessRequestScope(context, data);
  const now = new Date().toISOString();
  let accessResult = null;
  let clubCreationResult = null;
  let resolvedData = data;
  if (decision === "approved") {
    resolvedData = {
      ...data,
      ...cleanEngagementAccessRequestPayload({
        ...data,
        ...(request.data?.correctedRequest && typeof request.data.correctedRequest === "object" ? request.data.correctedRequest : {})
      }, request)
    };
    try { resolvedData = await resolveExistingClubForAccessRequest(resolvedData); }
    catch (error) { throw new HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Annuaire indisponible. Reessayez."); }
    assertEngagementAccessRequestScope(context, resolvedData);
    const existingAccount = await engagementExistingAccessAccount(resolvedData.email);
    if (existingAccount) {
      throw new HttpsError(
        "already-exists",
        "Cette adresse possede deja un compte LivePalmes. Utilisez la gestion des comptes pour modifier son club sans remplacer ses droits."
      );
    }
    if (resolvedData.newClubRequested === true) {
      if (!context.national) {
        throw new HttpsError("permission-denied", "La creation d'un club est reservee au niveau national.");
      }
      try { clubCreationResult = await createClubFromEngagementAccessRequest(resolvedData, context.uid, requestId); }
      catch (error) { if (error instanceof HttpsError) throw error; throw new HttpsError(error instanceof TypeError ? "failed-precondition" : "unavailable", error instanceof TypeError ? error.message : "Creation du club a verifier. Reprenez la meme demande ; sauvegarde conservee."); }
      resolvedData = {
        ...resolvedData,
        ...engagementAccessExistingClubPayload(clubCreationResult.club)
      };
    }
    const profile = cleanAccessProfile({
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      email: resolvedData.email,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber,
      capabilities: ["engagements.club.manage"]
    });
    accessResult = await saveAccessUserProfile(profile, context.uid);
  }
  await ref.set({
    ...(decision === "approved" ? {
      email: resolvedData.email,
      firstName: resolvedData.firstName,
      lastName: resolvedData.lastName,
      clubId: resolvedData.clubId,
      clubName: resolvedData.clubName,
      regionId: resolvedData.regionId,
      licenseNumber: resolvedData.licenseNumber,
      ...(clubCreationResult ? {
        requestedNewClub: true,
        createdClubId: cleanText(clubCreationResult.club?.clubId).slice(0, 40),
        newClubCreated: clubCreationResult.created === true
      } : {})
    } : {}),
    ...(decision === "rejected" ? { resolutionReason } : {}),
    status: decision,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email,
    updatedAt: now,
    updatedBy: context.uid,
    ...(accessResult ? { accessUid: accessResult.uid } : {})
  }, { merge: true });
  await writeAuditLog("engagementAccessRequest.resolved", context.uid, {
    requestId,
    decision,
    email: cleanText(resolvedData.email).slice(0, 180),
    clubId: cleanText(resolvedData.clubId).slice(0, 40),
    regionId: cleanText(resolvedData.regionId).slice(0, 80),
    corrected: decision === "approved" && JSON.stringify(resolvedData) !== JSON.stringify(data),
    accessUid: accessResult?.uid || "",
    resolutionReason: decision === "rejected" ? resolutionReason : "",
    createdClubId: cleanText(clubCreationResult?.club?.clubId).slice(0, 40)
  });
  let resolutionNotification = null;
  if (decision === "rejected") {
    resolutionNotification = await sendEngagementAccessRejection({ ...data, resolutionReason });
    await ref.set({ resolutionNotification, updatedAt: new Date().toISOString() }, { merge: true }).catch((error) => {
      console.error(
        "Statut de notification du refus non enregistre.",
        cleanText(error?.code || error?.name || "firestore-error").slice(0, 80)
      );
    });
  }
  const updated = await ref.get();
  return {
    ok: true,
    request: engagementAccessRequestItem(updated),
    access: accessResult,
    club: clubCreationResult?.club ? publicEngagementClubItem(clubCreationResult.club) : null,
    resolutionNotification
  };
});

/* extracted-function: functions/backend/server-directory-service/access-user-list-item-from-data.js#accessUserListItemFromData */
function accessUserListItemFromData(input0) {
  return $serverDirectoryService_accessUserListItemFromData().accessUserListItemFromData(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-contains-search.js#accessUserListItem */
function accessUserListItem(input0) {
  return $serverDirectoryService_accessUserContainsSearch().accessUserListItem(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-directory-snapshot-entry.js#accessDirectorySnapshotEntry */
function accessDirectorySnapshotEntry(input0) {
  return $serverDirectoryService_accessDirectorySnapshotEntry().accessDirectorySnapshotEntry(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-directory-snapshot-entry.js#accessDirectorySnapshotRegionId */
function accessDirectorySnapshotRegionId() {
  return $serverDirectoryService_accessDirectorySnapshotEntry().accessDirectorySnapshotRegionId(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/same-access-directory-snapshot-entry.js#sameAccessDirectorySnapshotEntry */
function sameAccessDirectorySnapshotEntry(input0, input1) {
  return $serverDirectoryService_sameAccessDirectorySnapshotEntry().sameAccessDirectorySnapshotEntry(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-directory-snapshot-entry.js#mergeAccessDirectorySnapshotEntries */
function mergeAccessDirectorySnapshotEntries(input0, input1, input2, input3, input4) {
  return $serverDirectoryService_accessDirectorySnapshotEntry().mergeAccessDirectorySnapshotEntries(...arguments);
}

/* extracted-function: functions/server-directory-sync-service.js#syncAccessDirectorySnapshotFromUserChange */
async function syncAccessDirectorySnapshotFromUserChange(input0, input1, input2, input3) {
  return serverDirectorySyncService().syncAccessDirectorySnapshotFromUserChange(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-deletion-request-item.js#accessUserDeletionRequestItem */
function accessUserDeletionRequestItem(input0) {
  return $serverDirectoryService_accessUserDeletionRequestItem().accessUserDeletionRequestItem(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-contains-search.js#accessUserMatchesFilters */
function accessUserMatchesFilters(input0, input1, input2) {
  return $serverDirectoryService_accessUserContainsSearch().accessUserMatchesFilters(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-contains-search.js#normalizedDirectoryText */
function normalizedDirectoryText(input0) {
  return $serverDirectoryService_accessUserContainsSearch().normalizedDirectoryText(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-contains-search.js#accessUserContainsSearch */
function accessUserContainsSearch(input0, input1) {
  return $serverDirectoryService_accessUserContainsSearch().accessUserContainsSearch(...arguments);
}

/* extracted-function: functions/backend/server-directory-service/access-user-contains-search.js#searchAccessUserDocuments */
async function searchAccessUserDocuments(input0, input1) {
  return $serverDirectoryService_accessUserContainsSearch().searchAccessUserDocuments(...arguments);
}

exports.rebuildAccessDirectoryIndexNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/rebuild-access-directory-index-next-page.js#rebuildAccessDirectoryIndexNextPage#arrow */ async (request) => {
  return $portalAccessHandlers_rebuildAccessDirectoryIndexNextPage().rebuildAccessDirectoryIndexNextPage(request);
});

exports.rebuildAccessDirectorySnapshotNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/rebuild-access-directory-snapshot-next-page.js#rebuildAccessDirectorySnapshotNextPage#arrow */ async (request) => {
  return $portalAccessHandlers_rebuildAccessDirectorySnapshotNextPage().rebuildAccessDirectorySnapshotNextPage(request);
});

exports.listAccessUsers = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/list-access-users.js#listAccessUsers#arrow */ async (request) => {
  return $portalAccessHandlers_listAccessUsers().listAccessUsers(request);
});

exports.setAccessUserStatus = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/set-access-user-status.js#setAccessUserStatus#arrow */ async (request) => {
  return $portalAccessHandlers_setAccessUserStatus().setAccessUserStatus(request);
});

/* extracted-function: functions/backend/server-directory-service/delete-access-user-account.js#deleteAccessUserAccount */
async function deleteAccessUserAccount(input0, input1) {
  return $serverDirectoryService_deleteAccessUserAccount().deleteAccessUserAccount(...arguments);
}

exports.deleteAccessUser = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/delete-access-user.js#deleteAccessUser#arrow */ async (request) => {
  return $portalAccessHandlers_deleteAccessUser().deleteAccessUser(request);
});

exports.requestAccessUserDeletion = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/request-access-user-deletion.js#requestAccessUserDeletion#arrow */ async (request) => {
  return $portalAccessHandlers_requestAccessUserDeletion().requestAccessUserDeletion(request);
});

exports.listAccessUserDeletionRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/list-access-user-deletion-requests.js#listAccessUserDeletionRequests#arrow */ async (request) => {
  return $portalAccessHandlers_listAccessUserDeletionRequests().listAccessUserDeletionRequests(request);
});

exports.resolveAccessUserDeletionRequest = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/resolve-access-user-deletion-request.js#resolveAccessUserDeletionRequest#arrow */ async (request) => {
  return $portalAccessHandlers_resolveAccessUserDeletionRequest().resolveAccessUserDeletionRequest(request);
});

exports.updateCurrentAccountEmail = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/update-current-account-email.js#updateCurrentAccountEmail#arrow */ async (request) => {
  return $portalAccessHandlers_updateCurrentAccountEmail().updateCurrentAccountEmail(request);
});

/* extracted-function: functions/backend/server-directory-service/set-competition-email-notification-preference.js#setCompetitionEmailNotificationPreference */
async function setCompetitionEmailNotificationPreference() {
  return $serverDirectoryService_setCompetitionEmailNotificationPreference().setCompetitionEmailNotificationPreference(...arguments);
}

exports.updateCurrentEmailNotificationPreferences = onCall(CALLABLE_OPTIONS, async (request) => {
  await assertLivePalmesAccess(request);
  const uid = cleanText(request.auth?.uid);
  const result = await setCompetitionEmailNotificationPreference(
    uid,
    request.data?.competitionNotifications === true,
    "portal"
  );
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.disableCompetitionEmailNotifications = onCall(NOTIFICATION_PREFERENCE_CALLABLE_OPTIONS, async (request) => {
  const uid = cleanText(request.data?.uid).slice(0, 128);
  const token = cleanText(request.data?.token).slice(0, 180);
  if (!validCompetitionNotificationPreferenceToken(uid, token)) {
    throw new HttpsError("permission-denied", "Lien de désinscription invalide.");
  }
  const result = await setCompetitionEmailNotificationPreference(uid, false, "email_link");
  return { ok: true, competitionNotificationsEnabled: result.enabled, updatedAt: result.updatedAt };
});

exports.getCurrentAccessUser = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-access-handlers/get-current-access-user.js#getCurrentAccessUser#arrow */ async (request) => {
  return $portalAccessHandlers_getCurrentAccessUser().getCurrentAccessUser(request);
});



/* extracted-function: functions/backend/server-competition-model-service/clean-iso-date.js#cleanIsoDate */
function cleanIsoDate(input0) {
  return $serverCompetitionModelService_cleanIsoDate().cleanIsoDate(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-competition-level.js#cleanEngagementCompetitionLevel */
function cleanEngagementCompetitionLevel(input0) {
  return $serverCompetitionModelService_cleanEngagementCompetitionLevel().cleanEngagementCompetitionLevel(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-competition-level.js#isNationalOnlyEngagementCompetitionLevel */
function isNationalOnlyEngagementCompetitionLevel(input0) {
  return $serverCompetitionModelService_cleanEngagementCompetitionLevel().isNationalOnlyEngagementCompetitionLevel(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-entry-status.js#cleanEngagementEntryStatus */
function cleanEngagementEntryStatus(input0) {
  return $serverCompetitionModelService_cleanEngagementEntryStatus().cleanEngagementEntryStatus(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-competition-type.js#cleanEngagementCompetitionType */
function cleanEngagementCompetitionType(input0) {
  return $serverCompetitionModelService_cleanEngagementCompetitionType().cleanEngagementCompetitionType(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-pool-lane-count.js#cleanEngagementWaterBodyType */
function cleanEngagementWaterBodyType(input0) {
  return $serverCompetitionModelService_cleanEngagementPoolLaneCount().cleanEngagementWaterBodyType(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-open-water-course.js#cleanEngagementOpenWaterCourse */
function cleanEngagementOpenWaterCourse() {
  return $serverCompetitionModelService_cleanEngagementOpenWaterCourse().cleanEngagementOpenWaterCourse(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-open-water-courses.js#cleanEngagementOpenWaterCourses */
function cleanEngagementOpenWaterCourses() {
  return $serverCompetitionModelService_cleanEngagementOpenWaterCourses().cleanEngagementOpenWaterCourses(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-open-water-courses.js#engagementOpenWaterCourseConfigRef */
function engagementOpenWaterCourseConfigRef() {
  return $serverCompetitionModelService_cleanEngagementOpenWaterCourses().engagementOpenWaterCourseConfigRef(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-competition-events.js#engagementOpenWaterEventDefinition */
function engagementOpenWaterEventDefinition() {
  return $serverCompetitionModelService_cleanEngagementCompetitionEvents().engagementOpenWaterEventDefinition(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-optional-email.js#cleanOptionalEmail */
function cleanOptionalEmail(input0) {
  return $serverCompetitionModelService_cleanOptionalEmail().cleanOptionalEmail(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-pool-length.js#cleanEngagementPoolLength */
function cleanEngagementPoolLength(input0) {
  return $serverCompetitionModelService_cleanEngagementPoolLength().cleanEngagementPoolLength(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-pool-lane-count.js#cleanEngagementPoolLaneCount */
function cleanEngagementPoolLaneCount(input0) {
  return $serverCompetitionModelService_cleanEngagementPoolLaneCount().cleanEngagementPoolLaneCount(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-pool-length.js#cleanEngagementTimingType */
function cleanEngagementTimingType(input0) {
  return $serverCompetitionModelService_cleanEngagementPoolLength().cleanEngagementTimingType(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-missing-entry-time-mode.js#cleanEngagementQualificationTimesMode */
function cleanEngagementQualificationTimesMode(input0) {
  return $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode().cleanEngagementQualificationTimesMode(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-missing-entry-time-mode.js#cleanEngagementMissingEntryTimeMode */
function cleanEngagementMissingEntryTimeMode(input0) {
  return $serverCompetitionModelService_cleanEngagementMissingEntryTimeMode().cleanEngagementMissingEntryTimeMode(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-max-events-per-swimmer.js#cleanEngagementMaxEventsPerSwimmer */
function cleanEngagementMaxEventsPerSwimmer(input0) {
  return $serverCompetitionModelService_cleanEngagementMaxEventsPerSwimmer().cleanEngagementMaxEventsPerSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-fee-amount.js#cleanEngagementFeeAmount */
function cleanEngagementFeeAmount(input0) {
  return $serverCompetitionModelService_cleanEngagementFeeAmount().cleanEngagementFeeAmount(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-fee-amount.js#cleanEngagementFees */
function cleanEngagementFees() {
  return $serverCompetitionModelService_cleanEngagementFeeAmount().cleanEngagementFees(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-competition-events.js#cleanEngagementCompetitionEvents */
function cleanEngagementCompetitionEvents() {
  return $serverCompetitionModelService_cleanEngagementCompetitionEvents().cleanEngagementCompetitionEvents(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-program-sessions.js#cleanEngagementProgramSessions */
function cleanEngagementProgramSessions() {
  return $serverCompetitionModelService_cleanEngagementProgramSessions().cleanEngagementProgramSessions(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-pool-lane-count.js#engagementCompetitionCalendarItem */
function engagementCompetitionCalendarItem() {
  return $serverCompetitionModelService_cleanEngagementPoolLaneCount().engagementCompetitionCalendarItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-fee-amount.js#engagementCompetitionListItem */
function engagementCompetitionListItem(input0) {
  return $serverCompetitionModelService_cleanEngagementFeeAmount().engagementCompetitionListItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-competition-calendar-ref.js#engagementCompetitionCalendarRef */
function engagementCompetitionCalendarRef(input0, input1) {
  return $serverCompetitionModelService_engagementCompetitionCalendarRef().engagementCompetitionCalendarRef(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-calendar-event-calendar-ref.js#engagementCalendarEventCalendarRef */
function engagementCalendarEventCalendarRef(input0, input1) {
  return $serverCompetitionModelService_engagementCalendarEventCalendarRef().engagementCalendarEventCalendarRef(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/clean-engagement-calendar-event-payload.js#cleanEngagementCalendarEventPayload */
function cleanEngagementCalendarEventPayload() {
  return $serverCompetitionModelService_cleanEngagementCalendarEventPayload().cleanEngagementCalendarEventPayload(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-calendar-event-calendar-item.js#engagementCalendarEventCalendarItem */
function engagementCalendarEventCalendarItem() {
  return $serverCompetitionModelService_engagementCalendarEventCalendarItem().engagementCalendarEventCalendarItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-calendar-event-detail-item.js#engagementCalendarEventDetailItem */
function engagementCalendarEventDetailItem(input0) {
  return $serverCompetitionModelService_engagementCalendarEventDetailItem().engagementCalendarEventDetailItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-calendar-event-calendar-ref.js#engagementCalendarEventItemsFromData */
function engagementCalendarEventItemsFromData() {
  return $serverCompetitionModelService_engagementCalendarEventCalendarRef().engagementCalendarEventItemsFromData(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-competition-index-key.js#engagementClubCompetitionIndexRef */
function engagementClubCompetitionIndexRef(input0, input1) {
  return $serverCompetitionModelService_engagementClubCompetitionIndexKey().engagementClubCompetitionIndexRef(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-competition-index-key.js#engagementClubCompetitionIndexKey */
function engagementClubCompetitionIndexKey(input0) {
  return $serverCompetitionModelService_engagementClubCompetitionIndexKey().engagementClubCompetitionIndexKey(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-closure-queue-ref.js#engagementClosureQueueRef */
function engagementClosureQueueRef(input0, input1) {
  return $serverCompetitionModelService_engagementClosureQueueRef().engagementClosureQueueRef(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-closure-queue-item.js#engagementClosureQueueItem */
function engagementClosureQueueItem() {
  return $serverCompetitionModelService_engagementClosureQueueItem().engagementClosureQueueItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-entry-competition-ids.js#engagementCompetitionCalendarItemsFromData */
function engagementCompetitionCalendarItemsFromData() {
  return $serverCompetitionModelService_engagementClubEntryCompetitionIds().engagementCompetitionCalendarItemsFromData(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-entry-competition-ids.js#filterEngagementCompetitionCalendarItems */
function filterEngagementCompetitionCalendarItems() {
  return $serverCompetitionModelService_engagementClubEntryCompetitionIds().filterEngagementCompetitionCalendarItems(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-competition-detail-item.js#engagementCompetitionDetailItem */
function engagementCompetitionDetailItem(input0) {
  return $serverCompetitionModelService_engagementCompetitionDetailItem().engagementCompetitionDetailItem(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-entry-id.js#engagementClubEntryId */
function engagementClubEntryId(input0, input1) {
  return $serverCompetitionModelService_engagementClubEntryId().engagementClubEntryId(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-club-entry-competition-ids.js#engagementClubEntryCompetitionIds */
async function engagementClubEntryCompetitionIds() {
  return $serverCompetitionModelService_engagementClubEntryCompetitionIds().engagementClubEntryCompetitionIds(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/engagement-person-license-key.js#engagementPersonLicenseKey */
function engagementPersonLicenseKey(input0) {
  return $serverCompetitionModelService_engagementPersonLicenseKey().engagementPersonLicenseKey(...arguments);
}

/* extracted-function: functions/backend/server-competition-model-service/assert-engagement-swimmer-role-compatibility.js#assertEngagementSwimmerRoleCompatibility */
function assertEngagementSwimmerRoleCompatibility() {
  return $serverCompetitionModelService_assertEngagementSwimmerRoleCompatibility().assertEngagementSwimmerRoleCompatibility(...arguments);
}



/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-team-leader.js#cleanEngagementTeamLeader */
function cleanEngagementTeamLeader() {
  return $serverEntryModelService_cleanEngagementTeamLeader().cleanEngagementTeamLeader(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-team-leader-complete.js#engagementTeamLeaderComplete */
function engagementTeamLeaderComplete() {
  return $serverEntryModelService_engagementTeamLeaderComplete().engagementTeamLeaderComplete(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-entry-official.js#cleanEngagementEntryOfficial */
function cleanEngagementEntryOfficial() {
  return $serverEntryModelService_cleanEngagementEntryOfficial().cleanEngagementEntryOfficial(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/parse-engagement-entry-time.js#parseEngagementEntryTime */
function parseEngagementEntryTime(input0) {
  return $serverEntryModelService_parseEngagementEntryTime().parseEngagementEntryTime(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-entry-individual-entries.js#cleanEngagementEntryIndividualEntries */
function cleanEngagementEntryIndividualEntries() {
  return $serverEntryModelService_cleanEngagementEntryIndividualEntries().cleanEngagementEntryIndividualEntries(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-entry-swimmer.js#cleanEngagementEntrySwimmer */
function cleanEngagementEntrySwimmer() {
  return $serverEntryModelService_cleanEngagementEntrySwimmer().cleanEngagementEntrySwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#engagementRelayAllowedCategories */
function engagementRelayAllowedCategories() {
  return $serverEntryModelService_assertEngagementRelayMembers().engagementRelayAllowedCategories(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#cleanEngagementRelayGenderMode */
function cleanEngagementRelayGenderMode() {
  return $serverEntryModelService_assertEngagementRelayMembers().cleanEngagementRelayGenderMode(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#engagementRelayMemberCategory */
function engagementRelayMemberCategory() {
  return $serverEntryModelService_assertEngagementRelayMembers().engagementRelayMemberCategory(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#engagementRelayMemberAge */
function engagementRelayMemberAge() {
  return $serverEntryModelService_assertEngagementRelayMembers().engagementRelayMemberAge(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#engagementRelayMemberAllowedForCategory */
function engagementRelayMemberAllowedForCategory() {
  return $serverEntryModelService_assertEngagementRelayMembers().engagementRelayMemberAllowedForCategory(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#assertEngagementRelayMembers */
function assertEngagementRelayMembers() {
  return $serverEntryModelService_assertEngagementRelayMembers().assertEngagementRelayMembers(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#cleanEngagementEntryRelays */
function cleanEngagementEntryRelays() {
  return $serverEntryModelService_assertEngagementRelayMembers().cleanEngagementEntryRelays(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/qualification-relays-after-individual-change.js#qualificationRelaysAfterIndividualChange */
function qualificationRelaysAfterIndividualChange() {
  return $serverEntryModelService_qualificationRelaysAfterIndividualChange().qualificationRelaysAfterIndividualChange(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/qualification-events.js#qualificationEvents */
function qualificationEvents() {
  return $serverEntryModelService_qualificationEvents().qualificationEvents(...arguments);
}

let legacyQualificationService;
/* extracted-function: functions/backend/server-entry-model-service/automatic-engagement-individual-entry.js#qualificationService */
function qualificationService() {
  return $serverEntryModelService_automaticEngagementIndividualEntry().qualificationService(...arguments);
}

exports.listEngagementQualificationSources = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:60 } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/list-engagement-qualification-sources.js#listEngagementQualificationSources#arrow */ async (request) => {
  return $portalCompetitionHandlers_listEngagementQualificationSources().listEngagementQualificationSources(request);
});
/* extracted-function: functions/backend/server-entry-model-service/native-qualification-services.js#nativeQualificationServices */
function nativeQualificationServices(input0) {
  return $serverEntryModelService_nativeQualificationServices().nativeQualificationServices(...arguments);
}
const nativeQualificationOptions=ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}:{};
const nativeQualificationNow=()=>new Date().toISOString().replace('T',' ').replace('Z','000');
/* extracted-function: functions/backend/server-entry-model-service/native-qualification-error.js#nativeQualificationError */
function nativeQualificationError(input0) {
  return $serverEntryModelService_nativeQualificationError().nativeQualificationError(...arguments);
}
exports.processEngagementQualificationJob = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:300 }, /* extracted-handler: functions/backend/portal-competition-handlers/process-engagement-qualification-job.js#processEngagementQualificationJob#arrow */ async (request) => {
  return $portalCompetitionHandlers_processEngagementQualificationJob().processEngagementQualificationJob(request);
});
exports.grantEngagementQualificationException = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:60 },/* extracted-handler: functions/backend/portal-competition-handlers/grant-engagement-qualification-exception.js#grantEngagementQualificationException#arrow */ async (request) => {
  return $portalCompetitionHandlers_grantEngagementQualificationException().grantEngagementQualificationException(request);
});
exports.acknowledgeEngagementQualificationAlert = onCall({ ...CALLABLE_OPTIONS,...nativeQualificationOptions,timeoutSeconds:60 },/* extracted-handler: functions/backend/portal-competition-handlers/acknowledge-engagement-qualification-alert.js#acknowledgeEngagementQualificationAlert#arrow */ async (request) => {
  return $portalCompetitionHandlers_acknowledgeEngagementQualificationAlert().acknowledgeEngagementQualificationAlert(request);
});
// Retired endpoints remain deny-only so previously deployed clients cannot use
// the removed request workflow. Historical documents are not migrated or erased.
const retiredQualificationRequest = () => { throw new HttpsError("failed-precondition", "Les demandes de dérogation sont supprimées. Une exception peut être accordée directement par le National."); };
exports.requestEngagementQualificationDerogation = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.listEngagementQualificationRequests = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.resolveEngagementQualificationRequest = onCall(CALLABLE_OPTIONS, retiredQualificationRequest);
exports.syncEngagementQualificationTargets = onDocumentWritten({ region: REGION,
  document: "engagementClubEntries/{entryId}", retry: true, timeoutSeconds: 540 }, (event) => ENVIRONMENT.sportingDataSource === "nap" ? null : qualificationService().syncTargets(event));
exports.revalidateEngagementQualificationCache = onDocumentWritten({ region: REGION,
  document: `${ENGAGEMENT_ENTRY_TIME_CACHES_COLLECTION}/{cacheId}`, retry: true, timeoutSeconds: 540 }, (event) => ENVIRONMENT.sportingDataSource === "nap" ? null : qualificationService().revalidateCache(event));

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementQualificationRowAllowed */
function engagementQualificationRowAllowed() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementQualificationRowAllowed(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/automatic-engagement-individual-entry.js#bestEngagementKnownTime */
function bestEngagementKnownTime() {
  return $serverEntryModelService_automaticEngagementIndividualEntry().bestEngagementKnownTime(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-known-time-history.js#engagementKnownTimeHistory */
function engagementKnownTimeHistory() {
  return $serverEntryModelService_engagementKnownTimeHistory().engagementKnownTimeHistory(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-id.js#engagementEntryTimeCacheId */
function engagementEntryTimeCacheId() {
  return $serverEntryModelService_engagementEntryTimeCacheId().engagementEntryTimeCacheId(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementEntryTimeCacheRef */
function engagementEntryTimeCacheRef(input0) {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRef(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementEntryTimeCacheRow */
function engagementEntryTimeCacheRow() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRow(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementEntryTimeCacheRowsFromData */
function engagementEntryTimeCacheRowsFromData() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeCacheRowsFromData(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementEntryTimeRowsToEvents */
function engagementEntryTimeRowsToEvents() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeRowsToEvents(...arguments);
}

const engagementEntryTimeCacheBuilds = new Map();

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#engagementEntryTimeSourceKeys */
function engagementEntryTimeSourceKeys() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().engagementEntryTimeSourceKeys(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#readEngagementEntryTimeSourceRows */
async function readEngagementEntryTimeSourceRows() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().readEngagementEntryTimeSourceRows(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#rebuildEngagementEntryTimeCache */
async function rebuildEngagementEntryTimeCache(input0) {
  return $serverEntryModelService_engagementEntryTimeCacheRef().rebuildEngagementEntryTimeCache(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-cache-ref.js#getEngagementEntryTimeRowsForSwimmer */
async function getEngagementEntryTimeRowsForSwimmer() {
  return $serverEntryModelService_engagementEntryTimeCacheRef().getEngagementEntryTimeRowsForSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/automatic-engagement-individual-entry.js#getEngagementQualificationRows */
async function getEngagementQualificationRows() {
  return $serverEntryModelService_automaticEngagementIndividualEntry().getEngagementQualificationRows(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/delete-engagement-entry-time-cache.js#deleteEngagementEntryTimeCache */
function deleteEngagementEntryTimeCache(input0, input1) {
  return $serverEntryModelService_deleteEngagementEntryTimeCache().deleteEngagementEntryTimeCache(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/invalidate-engagement-entry-time-caches-for-performance-rows.js#invalidateEngagementEntryTimeCachesForPerformanceRows */
async function invalidateEngagementEntryTimeCachesForPerformanceRows() {
  return $serverEntryModelService_invalidateEngagementEntryTimeCachesForPerformanceRows().invalidateEngagementEntryTimeCachesForPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-competition-applies-to-france-records.js#engagementCompetitionAppliesToFranceRecords */
function engagementCompetitionAppliesToFranceRecords() {
  return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToFranceRecords(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-competition-applies-to-france-records.js#engagementCompetitionAppliesToMpf */
function engagementCompetitionAppliesToMpf() {
  return $serverEntryModelService_engagementCompetitionAppliesToFranceRecords().engagementCompetitionAppliesToMpf(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-warning.js#engagementRecordReferencesForEntry */
function engagementRecordReferencesForEntry(input0) {
  return $serverEntryModelService_engagementEntryTimeWarning().engagementRecordReferencesForEntry(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-warning.js#engagementEntryTimeWarning */
function engagementEntryTimeWarning() {
  return $serverEntryModelService_engagementEntryTimeWarning().engagementEntryTimeWarning(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-entry-time-warning.js#validateEngagementIndividualEntryTimes */
function validateEngagementIndividualEntryTimes() {
  return $serverEntryModelService_engagementEntryTimeWarning().validateEngagementIndividualEntryTimes(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#engagementRelayReferencesForEntry */
function engagementRelayReferencesForEntry(input0) {
  return $serverEntryModelService_assertEngagementRelayMembers().engagementRelayReferencesForEntry(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-engagement-relay-members.js#validateEngagementRelayEntryTimes */
function validateEngagementRelayEntryTimes() {
  return $serverEntryModelService_assertEngagementRelayMembers().validateEngagementRelayEntryTimes(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/resolve-engagement-individual-entries-for-swimmer.js#resolveEngagementIndividualEntriesForSwimmer */
async function resolveEngagementIndividualEntriesForSwimmer() {
  return $serverEntryModelService_resolveEngagementIndividualEntriesForSwimmer().resolveEngagementIndividualEntriesForSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/automatic-engagement-individual-entry.js#automaticEngagementIndividualEntry */
function automaticEngagementIndividualEntry(input0, input1, input2) {
  return $serverEntryModelService_automaticEngagementIndividualEntry().automaticEngagementIndividualEntry(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-identity-key.js#engagementSwimmerIdentityKey */
function engagementSwimmerIdentityKey(input0, input1, input2) {
  return $serverEntryModelService_engagementSwimmerIdentityKey().engagementSwimmerIdentityKey(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-new-swimmer.js#cleanEngagementNewSwimmer */
function cleanEngagementNewSwimmer() {
  return $serverEntryModelService_cleanEngagementNewSwimmer().cleanEngagementNewSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-new-swimmer-item.js#engagementNewSwimmerItem */
function engagementNewSwimmerItem(input0) {
  return $serverEntryModelService_engagementNewSwimmerItem().engagementNewSwimmerItem(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/build-engagement-new-swimmer-alerts.js#engagementNewSwimmerAlertFromMatch */
function engagementNewSwimmerAlertFromMatch() {
  return $serverEntryModelService_buildEngagementNewSwimmerAlerts().engagementNewSwimmerAlertFromMatch(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/build-engagement-new-swimmer-alerts.js#buildEngagementNewSwimmerAlerts */
async function buildEngagementNewSwimmerAlerts() {
  return $serverEntryModelService_buildEngagementNewSwimmerAlerts().buildEngagementNewSwimmerAlerts(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-id.js#engagementSwimmerLicenseId */
function engagementSwimmerLicenseId() {
  return $serverEntryModelService_engagementSwimmerLicenseId().engagementSwimmerLicenseId(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-number-key.js#engagementSwimmerLicenseNumberKey */
function engagementSwimmerLicenseNumberKey() {
  return $serverEntryModelService_engagementSwimmerLicenseNumberKey().engagementSwimmerLicenseNumberKey(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-number-id.js#engagementSwimmerLicenseNumberId */
function engagementSwimmerLicenseNumberId() {
  return $serverEntryModelService_engagementSwimmerLicenseNumberId().engagementSwimmerLicenseNumberId(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-roster-id.js#engagementClubRosterId */
function engagementClubRosterId(input0) {
  return $serverEntryModelService_engagementClubRosterId().engagementClubRosterId(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-roster-id.js#engagementClubRosterRef */
function engagementClubRosterRef(input0, input1) {
  return $serverEntryModelService_engagementClubRosterId().engagementClubRosterRef(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-club-activity-status.js#cleanEngagementClubActivityStatus */
function cleanEngagementClubActivityStatus() {
  return $serverEntryModelService_cleanEngagementClubActivityStatus().cleanEngagementClubActivityStatus(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-roster-swimmer-key.js#engagementClubRosterSwimmerKey */
function engagementClubRosterSwimmerKey() {
  return $serverEntryModelService_engagementClubRosterSwimmerKey().engagementClubRosterSwimmerKey(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/clean-engagement-club-activity-status.js#engagementClubRosterSwimmerItem */
function engagementClubRosterSwimmerItem() {
  return $serverEntryModelService_cleanEngagementClubActivityStatus().engagementClubRosterSwimmerItem(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-roster-swimmers-from-data.js#engagementClubRosterSwimmersFromData */
function engagementClubRosterSwimmersFromData() {
  return $serverEntryModelService_engagementClubRosterSwimmersFromData().engagementClubRosterSwimmersFromData(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/upsert-engagement-club-roster-swimmer.js#upsertEngagementClubRosterSwimmer */
function upsertEngagementClubRosterSwimmer(input0, input1) {
  return $serverEntryModelService_upsertEngagementClubRosterSwimmer().upsertEngagementClubRosterSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/delete-engagement-club-roster-swimmer.js#deleteEngagementClubRosterSwimmer */
function deleteEngagementClubRosterSwimmer(input0, input1) {
  return $serverEntryModelService_deleteEngagementClubRosterSwimmer().deleteEngagementClubRosterSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-data-item.js#engagementSwimmerLicenseDataItem */
function engagementSwimmerLicenseDataItem() {
  return $serverEntryModelService_engagementSwimmerLicenseDataItem().engagementSwimmerLicenseDataItem(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-data-item.js#engagementSwimmerLicenseItem */
function engagementSwimmerLicenseItem(input0) {
  return $serverEntryModelService_engagementSwimmerLicenseDataItem().engagementSwimmerLicenseItem(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-legacy-swimmer-licenses-by-club.js#engagementLegacySwimmerLicensesByClub */
async function engagementLegacySwimmerLicensesByClub(input0, input1) {
  return $serverEntryModelService_engagementLegacySwimmerLicensesByClub().engagementLegacySwimmerLicensesByClub(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-payload.js#engagementSwimmerLicensePayload */
function engagementSwimmerLicensePayload() {
  return $serverEntryModelService_engagementSwimmerLicensePayload().engagementSwimmerLicensePayload(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-conflict-data.js#engagementSwimmerLicenseConflictData */
function engagementSwimmerLicenseConflictData() {
  return $serverEntryModelService_engagementSwimmerLicenseConflictData().engagementSwimmerLicenseConflictData(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-license-conflict-data.js#findEngagementSwimmerLicenseConflict */
async function findEngagementSwimmerLicenseConflict(input0) {
  return $serverEntryModelService_engagementSwimmerLicenseConflictData().findEngagementSwimmerLicenseConflict(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/assert-no-engagement-swimmer-license-conflict.js#assertNoEngagementSwimmerLicenseConflict */
async function assertNoEngagementSwimmerLicenseConflict(input0) {
  return $serverEntryModelService_assertNoEngagementSwimmerLicenseConflict().assertNoEngagementSwimmerLicenseConflict(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-swimmer-recovery-preview.js#engagementSwimmerRecoveryPreview */
async function engagementSwimmerRecoveryPreview(input0, input1) {
  return $serverEntryModelService_engagementSwimmerRecoveryPreview().engagementSwimmerRecoveryPreview(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-entry-item.js#engagementClubEntryItem */
function engagementClubEntryItem(input0) {
  return $serverEntryModelService_engagementClubEntryItem().engagementClubEntryItem(...arguments);
}

/* extracted-function: functions/backend/server-entry-model-service/engagement-club-entry-has-participants.js#engagementClubEntryHasParticipants */
function engagementClubEntryHasParticipants() {
  return $serverEntryModelService_engagementClubEntryHasParticipants().engagementClubEntryHasParticipants(...arguments);
}



/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfFormatDate */
function engagementPdfFormatDate(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfFormatDate(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfFormatDateTime */
function engagementPdfFormatDateTime(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfFormatDateTime(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfLevelLabel */
function engagementPdfLevelLabel(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfLevelLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows.js#engagementPdfStatusLabel */
function engagementPdfStatusLabel(input0) {
  return $engagementPdfRenderer_engagementPdfCollectIndividualRows().engagementPdfStatusLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows.js#engagementPdfTimingLabel */
function engagementPdfTimingLabel(input0) {
  return $engagementPdfRenderer_engagementPdfCollectIndividualRows().engagementPdfTimingLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfMoney */
function engagementPdfMoney(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfMoney(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-file-name.js#engagementPdfFileName */
function engagementPdfFileName(input0) {
  return $engagementPdfRenderer_engagementPdfFileName().engagementPdfFileName(...arguments);
}



/* extracted-function: functions/backend/server-documents-service/clean-engagement-document-metadata.js#cleanEngagementDocumentMetadata */
function cleanEngagementDocumentMetadata() {
  return $serverDocumentsService_cleanEngagementDocumentMetadata().cleanEngagementDocumentMetadata(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/clean-engagement-generated-file.js#cleanEngagementGeneratedFile */
function cleanEngagementGeneratedFile() {
  return $serverDocumentsService_cleanEngagementGeneratedFile().cleanEngagementGeneratedFile(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/clean-engagement-generated-file.js#cleanEngagementGeneratedFiles */
function cleanEngagementGeneratedFiles() {
  return $serverDocumentsService_cleanEngagementGeneratedFile().cleanEngagementGeneratedFiles(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/clean-engagement-generated-file.js#engagementCompetitionDocumentsMetadata */
function engagementCompetitionDocumentsMetadata() {
  return $serverDocumentsService_cleanEngagementGeneratedFile().engagementCompetitionDocumentsMetadata(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-club-recap-pdf-source-hash.js#engagementClubRecapPdfStoragePath */
function engagementClubRecapPdfStoragePath(input0, input1) {
  return $serverDocumentsService_engagementClubRecapPdfSourceHash().engagementClubRecapPdfStoragePath(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-club-recap-pdf-source-hash.js#engagementClubRecapPdfSourceHash */
function engagementClubRecapPdfSourceHash() {
  return $serverDocumentsService_engagementClubRecapPdfSourceHash().engagementClubRecapPdfSourceHash(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-event-label.js#engagementPdfEventLabel */
function engagementPdfEventLabel(input0) {
  return $engagementPdfRenderer_engagementPdfEventLabel().engagementPdfEventLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfSwimmerName */
function engagementPdfSwimmerName() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfSwimmerName(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfPersonName */
function engagementPdfPersonName() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfPersonName(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfGenderLabel */
function engagementPdfGenderLabel(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfGenderLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfRelayCategoryLabel */
function engagementPdfRelayCategoryLabel(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfRelayCategoryLabel(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-entry-stats.js#engagementPdfEntryStats */
function engagementPdfEntryStats() {
  return $engagementPdfRenderer_engagementPdfEntryStats().engagementPdfEntryStats(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-fee-total.js#engagementPdfFeeTotal */
function engagementPdfFeeTotal() {
  return $engagementPdfRenderer_engagementPdfFeeTotal().engagementPdfFeeTotal(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-competition-entry-summary-id.js#engagementCompetitionEntrySummaryId */
function engagementCompetitionEntrySummaryId(input0) {
  return $serverDocumentsService_engagementCompetitionEntrySummaryId().engagementCompetitionEntrySummaryId(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-competition-entry-summary-ref.js#engagementCompetitionEntrySummaryRef */
function engagementCompetitionEntrySummaryRef(input0, input1) {
  return $serverDocumentsService_engagementCompetitionEntrySummaryRef().engagementCompetitionEntrySummaryRef(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-competition-statistics-cache-ref.js#engagementCompetitionStatisticsCacheRef */
function engagementCompetitionStatisticsCacheRef(input0, input1) {
  return $serverDocumentsService_engagementCompetitionStatisticsCacheRef().engagementCompetitionStatisticsCacheRef(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/invalidate-engagement-competition-statistics.js#invalidateEngagementCompetitionStatistics */
function invalidateEngagementCompetitionStatistics(input0, input1, input2) {
  return $serverDocumentsService_invalidateEngagementCompetitionStatistics().invalidateEngagementCompetitionStatistics(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/decode-engagement-competition-statistics-cache.js#decodeEngagementCompetitionStatisticsCache */
function decodeEngagementCompetitionStatisticsCache() {
  return $serverDocumentsService_decodeEngagementCompetitionStatisticsCache().decodeEngagementCompetitionStatisticsCache(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/decode-engagement-competition-statistics-cache.js#encodeEngagementCompetitionStatisticsCache */
function encodeEngagementCompetitionStatisticsCache() {
  return $serverDocumentsService_decodeEngagementCompetitionStatisticsCache().encodeEngagementCompetitionStatisticsCache(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-competition-entry-summary-item.js#engagementCompetitionEntrySummaryItem */
function engagementCompetitionEntrySummaryItem() {
  return $serverDocumentsService_engagementCompetitionEntrySummaryItem().engagementCompetitionEntrySummaryItem(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-competition-entry-summaries-from-data.js#engagementCompetitionEntrySummariesFromData */
function engagementCompetitionEntrySummariesFromData() {
  return $serverDocumentsService_engagementCompetitionEntrySummariesFromData().engagementCompetitionEntrySummariesFromData(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/delete-engagement-club-competition-index-entry.js#rebuildEngagementCompetitionEntrySummary */
async function rebuildEngagementCompetitionEntrySummary(input0, input1) {
  return $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry().rebuildEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-club-recap-pdf-source-hash.js#upsertEngagementCompetitionEntrySummary */
function upsertEngagementCompetitionEntrySummary(input0, input1) {
  return $serverDocumentsService_engagementClubRecapPdfSourceHash().upsertEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/delete-engagement-competition-entry-summary.js#deleteEngagementCompetitionEntrySummary */
function deleteEngagementCompetitionEntrySummary(input0, input1) {
  return $serverDocumentsService_deleteEngagementCompetitionEntrySummary().deleteEngagementCompetitionEntrySummary(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/delete-engagement-club-competition-index-entry.js#upsertEngagementClubCompetitionIndex */
function upsertEngagementClubCompetitionIndex(input0, input1) {
  return $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry().upsertEngagementClubCompetitionIndex(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/delete-engagement-club-competition-index-entry.js#deleteEngagementClubCompetitionIndexEntry */
function deleteEngagementClubCompetitionIndexEntry(input0, input1) {
  return $serverDocumentsService_deleteEngagementClubCompetitionIndexEntry().deleteEngagementClubCompetitionIndexEntry(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/invalidate-engagement-competition-statistics.js#syncEngagementCompetitionEntrySummaryFromChange */
async function syncEngagementCompetitionEntrySummaryFromChange() {
  return $serverDocumentsService_invalidateEngagementCompetitionStatistics().syncEngagementCompetitionEntrySummaryFromChange(...arguments);
}

exports.syncEngagementClubEntryToCompetitionSummary = onDocumentWritten({
  region: REGION,
  document: "engagementClubEntries/{entryId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementCompetitionEntrySummaryFromChange(event);
});

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows.js#engagementPdfCollectIndividualRows */
function engagementPdfCollectIndividualRows() {
  return $engagementPdfRenderer_engagementPdfCollectIndividualRows().engagementPdfCollectIndividualRows(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfIndividualProgramColumns */
function engagementPdfIndividualProgramColumns() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfIndividualProgramColumns(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfIndividualMatrix */
function engagementPdfIndividualMatrix() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfIndividualMatrix(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfSwimmersWithoutIndividualRows */
function engagementPdfSwimmersWithoutIndividualRows() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfSwimmersWithoutIndividualRows(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfCompactSummary */
function engagementPdfCompactSummary(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfCompactSummary(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfDrawIndividualMatrix */
function engagementPdfDrawIndividualMatrix(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfDrawIndividualMatrix(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfCollectRelayRows */
function engagementPdfCollectRelayRows() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfCollectRelayRows(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfDocToBuffer */
function engagementPdfDocToBuffer(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfDocToBuffer(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfAddFooter */
function engagementPdfAddFooter(input0, input1) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfAddFooter(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfEnsureSpace */
function engagementPdfEnsureSpace(input0, input1, input2) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfEnsureSpace(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfSection */
function engagementPdfSection(input0, input1, input2) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfSection(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfEmptyState */
function engagementPdfEmptyState(input0, input1, input2) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfEmptyState(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfWhatsAppBlock */
function engagementPdfWhatsAppBlock(input0, input1, input2, input3) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfWhatsAppBlock(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows.js#engagementPdfKeyValues */
function engagementPdfKeyValues(input0, input1, input2) {
  return $engagementPdfRenderer_engagementPdfCollectIndividualRows().engagementPdfKeyValues(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfFeesTable */
function engagementPdfFeesTable(input0) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfFeesTable(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfTextHeight */
function engagementPdfTextHeight(input0, input1, input2) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfTextHeight(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#engagementPdfTable */
function engagementPdfTable(input0, input1, input2, input3) {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().engagementPdfTable(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-club-recap-pdf.js#buildEngagementClubRecapPdf */
async function buildEngagementClubRecapPdf() {
  return $engagementPdfRenderer_buildEngagementClubRecapPdf().buildEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/read-stored-engagement-club-recap-pdf.js#readStoredEngagementClubRecapPdf */
async function readStoredEngagementClubRecapPdf() {
  return $serverDocumentsService_readStoredEngagementClubRecapPdf().readStoredEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-club-recap-pdf-source-hash.js#saveEngagementClubRecapPdfDocument */
async function saveEngagementClubRecapPdfDocument() {
  return $serverDocumentsService_engagementClubRecapPdfSourceHash().saveEngagementClubRecapPdfDocument(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-club-recap-pdf-source-hash.js#getOrCreateEngagementClubRecapPdf */
async function getOrCreateEngagementClubRecapPdf(input0, input1) {
  return $serverDocumentsService_engagementClubRecapPdfSourceHash().getOrCreateEngagementClubRecapPdf(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-source-hash.js#engagementOfficialsPdfStoragePath */
function engagementOfficialsPdfStoragePath(input0) {
  return $serverDocumentsService_engagementOfficialsPdfSourceHash().engagementOfficialsPdfStoragePath(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-rows.js#engagementOfficialsPdfRows */
function engagementOfficialsPdfRows() {
  return $serverDocumentsService_engagementOfficialsPdfRows().engagementOfficialsPdfRows(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-source-hash.js#resolveEngagementOfficialsPdfRows */
async function resolveEngagementOfficialsPdfRows(input0) {
  return $serverDocumentsService_engagementOfficialsPdfSourceHash().resolveEngagementOfficialsPdfRows(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-source-hash.js#engagementOfficialsPdfSourceHash */
function engagementOfficialsPdfSourceHash() {
  return $serverDocumentsService_engagementOfficialsPdfSourceHash().engagementOfficialsPdfSourceHash(...arguments);
}

/* extracted-function: functions/backend/engagement-pdf-renderer/build-engagement-officials-pdf.js#buildEngagementOfficialsPdf */
async function buildEngagementOfficialsPdf() {
  return $engagementPdfRenderer_buildEngagementOfficialsPdf().buildEngagementOfficialsPdf(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-source-hash.js#saveEngagementOfficialsPdfDocument */
async function saveEngagementOfficialsPdfDocument() {
  return $serverDocumentsService_engagementOfficialsPdfSourceHash().saveEngagementOfficialsPdfDocument(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-officials-pdf-source-hash.js#getOrCreateEngagementOfficialsPdf */
async function getOrCreateEngagementOfficialsPdf(input0, input1) {
  return $serverDocumentsService_engagementOfficialsPdfSourceHash().getOrCreateEngagementOfficialsPdf(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-txt-download-url.js#engagementTxtStoragePath */
function engagementTxtStoragePath(input0) {
  return $serverDocumentsService_engagementTxtDownloadUrl().engagementTxtStoragePath(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-txt-download-url.js#engagementTxtDownloadUrl */
function engagementTxtDownloadUrl(input0, input1) {
  return $serverDocumentsService_engagementTxtDownloadUrl().engagementTxtDownloadUrl(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-txt-download-url.js#engagementTxtSourceHash */
function engagementTxtSourceHash() {
  return $serverDocumentsService_engagementTxtDownloadUrl().engagementTxtSourceHash(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/build-engagement-competition-txt.js#engagementTxtSwimmerCategory */
function engagementTxtSwimmerCategory() {
  return $serverDocumentsService_buildEngagementCompetitionTxt().engagementTxtSwimmerCategory(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/build-engagement-competition-txt.js#buildEngagementCompetitionTxt */
function buildEngagementCompetitionTxt() {
  return $serverDocumentsService_buildEngagementCompetitionTxt().buildEngagementCompetitionTxt(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-txt-download-url.js#readStoredEngagementTxt */
async function readStoredEngagementTxt() {
  return $serverDocumentsService_engagementTxtDownloadUrl().readStoredEngagementTxt(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-txt-download-url.js#getOrCreateEngagementCompetitionTxt */
async function getOrCreateEngagementCompetitionTxt(input0) {
  return $serverDocumentsService_engagementTxtDownloadUrl().getOrCreateEngagementCompetitionTxt(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-mail-status-label.js#engagementMailStatusLabel */
function engagementMailStatusLabel(input0) {
  return $serverDocumentsService_engagementMailStatusLabel().engagementMailStatusLabel(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-mail-secret-value.js#engagementMailSecretValue */
function engagementMailSecretValue(input0, input1) {
  return $serverDocumentsService_engagementMailSecretValue().engagementMailSecretValue(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-mail-secret-value.js#engagementMailSmtpConfig */
function engagementMailSmtpConfig() {
  return $serverDocumentsService_engagementMailSecretValue().engagementMailSmtpConfig(...arguments);
}

/* extracted-function: functions/backend/server-documents-service/engagement-mail-prepared-status.js#engagementMailPreparedStatus */
function engagementMailPreparedStatus() {
  return $serverDocumentsService_engagementMailPreparedStatus().engagementMailPreparedStatus(...arguments);
}

exports.getEngagementAutomaticMailControl = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/get-engagement-automatic-mail-control.js#getEngagementAutomaticMailControl#arrow */ async (request) => {
  return $portalCompetitionHandlers_getEngagementAutomaticMailControl().getEngagementAutomaticMailControl(request);
});
exports.updateEngagementAutomaticMailControl = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/update-engagement-automatic-mail-control.js#updateEngagementAutomaticMailControl#arrow */ async (request) => {
  return $portalCompetitionHandlers_updateEngagementAutomaticMailControl().updateEngagementAutomaticMailControl(request);
});



/* extracted-function: functions/backend/server-mail-service/engagement-mail-prepared-reason.js#engagementMailPreparedReason */
function engagementMailPreparedReason() {
  return $serverMailService_engagementMailPreparedReason().engagementMailPreparedReason(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-job-id.js#engagementMailJobId */
function engagementMailJobId() {
  return $serverMailService_engagementMailJobId().engagementMailJobId(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-from-user-doc.js#engagementMailRecipientFromUserDoc */
function engagementMailRecipientFromUserDoc(input0) {
  return $serverMailService_engagementMailRecipientFromUserDoc().engagementMailRecipientFromUserDoc(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-shard-number.js#engagementMailRecipientShardNumber */
function engagementMailRecipientShardNumber() {
  return $serverMailService_engagementMailRecipientShardNumber().engagementMailRecipientShardNumber(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-shard-ref.js#engagementMailRecipientShardRef */
function engagementMailRecipientShardRef(input0, input1, input2) {
  return $serverMailService_engagementMailRecipientShardRef().engagementMailRecipientShardRef(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-index-state-ref.js#engagementMailRecipientIndexStateRef */
function engagementMailRecipientIndexStateRef(input0) {
  return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientIndexStateRef(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-index-key.js#engagementMailRecipientIndexKey */
function engagementMailRecipientIndexKey() {
  return $serverMailService_engagementMailRecipientIndexKey().engagementMailRecipientIndexKey(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/assert-engagement-club-admin-directory-size.js#engagementClubAdminDirectoryRef */
function engagementClubAdminDirectoryRef(input0) {
  return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryRef(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/assert-engagement-club-admin-directory-size.js#engagementClubAdminDirectoryEntry */
function engagementClubAdminDirectoryEntry() {
  return $serverMailService_assertEngagementClubAdminDirectorySize().engagementClubAdminDirectoryEntry(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-club-admin-directory-map.js#engagementClubAdminDirectoryMap */
function engagementClubAdminDirectoryMap() {
  return $serverMailService_engagementClubAdminDirectoryMap().engagementClubAdminDirectoryMap(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/assert-engagement-club-admin-directory-size.js#assertEngagementClubAdminDirectorySize */
function assertEngagementClubAdminDirectorySize() {
  return $serverMailService_assertEngagementClubAdminDirectorySize().assertEngagementClubAdminDirectorySize(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-club-admin-directory-map.js#writeEngagementClubAdminDirectory */
async function writeEngagementClubAdminDirectory(input0) {
  return $serverMailService_engagementClubAdminDirectoryMap().writeEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/update-engagement-club-admin-directory.js#updateEngagementClubAdminDirectory */
async function updateEngagementClubAdminDirectory(input0) {
  return $serverMailService_updateEngagementClubAdminDirectory().updateEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/read-engagement-club-admin-directory.js#readEngagementClubAdminDirectory */
async function readEngagementClubAdminDirectory(input0) {
  return $serverMailService_readEngagementClubAdminDirectory().readEngagementClubAdminDirectory(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-index-state-ref.js#engagementMailRecipientShardRefs */
function engagementMailRecipientShardRefs(input0) {
  return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientShardRefs(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-shard-groups.js#engagementMailRecipientShardGroups */
function engagementMailRecipientShardGroups() {
  return $serverMailService_engagementMailRecipientShardGroups().engagementMailRecipientShardGroups(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/bootstrap-engagement-mail-recipient-index.js#replaceEngagementMailRecipientIndex */
async function replaceEngagementMailRecipientIndex(input0) {
  return $serverMailService_bootstrapEngagementMailRecipientIndex().replaceEngagementMailRecipientIndex(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/bootstrap-engagement-mail-recipient-index.js#bootstrapEngagementMailRecipientIndex */
async function bootstrapEngagementMailRecipientIndex(input0) {
  return $serverMailService_bootstrapEngagementMailRecipientIndex().bootstrapEngagementMailRecipientIndex(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-index-state-ref.js#engagementMailRecipientsFromIndex */
async function engagementMailRecipientsFromIndex(input0) {
  return $serverMailService_engagementMailRecipientIndexStateRef().engagementMailRecipientsFromIndex(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-recipient-has-capability.js#engagementRecipientHasCapability */
function engagementRecipientHasCapability() {
  return $serverMailService_engagementRecipientHasCapability().engagementRecipientHasCapability(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-recipients.js#engagementCompetitionNotificationRecipients */
function engagementCompetitionNotificationRecipients() {
  return $serverMailService_engagementCompetitionDocumentRecipients().engagementCompetitionNotificationRecipients(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/bootstrap-engagement-mail-recipient-index.js#engagementActiveMailRecipients */
async function engagementActiveMailRecipients(input0) {
  return $serverMailService_bootstrapEngagementMailRecipientIndex().engagementActiveMailRecipients(...arguments);
}

// Isolate NAP retries from existing recipient indexes; TEST never opens shared NAP.
function nativeAccountEmailSynchronizer() {
  if (!nativeAccountEmailSynchronizer.instance) nativeAccountEmailSynchronizer.instance = require("./nap-club-account-emails").createSynchronizer({
  projectId: ENVIRONMENT.projectId,
  createPool: () => createNapPool(defineSecret("LIVEPALMES_NAP_PASSWORD").value()),
  db
});
  return nativeAccountEmailSynchronizer.instance;
}

exports.syncNapClubAccountEmails = onDocumentWritten({
  region: REGION,
  ...(ENVIRONMENT.projectId === "livepalmes" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}),
  document: "users/{uid}",
  retry: true
}, async (event) => {
  if (!event.params?.uid) return;
  await nativeAccountEmailSynchronizer()(event.params.uid);
});

exports.syncEngagementMailRecipientIndex = onDocumentWritten({
  region: REGION,
  document: "users/{uid}",
  retry: true
}, async (event) => {
  const uid = cleanText(event.params.uid);
  if (!uid) return;
  const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const before = beforeData ? engagementMailRecipientFromUserDoc(event.data.before) : null;
  const afterData = event.data?.after?.exists ? event.data.after.data() || {} : {};
  const after = event.data?.after?.exists && afterData.status === "active"
    ? engagementMailRecipientFromUserDoc(event.data.after)
    : null;
  const now = new Date().toISOString();
  await syncAccessDirectorySnapshotFromUserChange(
    uid,
    beforeData,
    event.data?.after?.exists ? afterData : null,
    now
  );
  const key = engagementMailRecipientIndexKey(uid);
  // Event capabilities are cleanup hints only. A transaction binds every
  // shard update to the CURRENT profile, including concurrent scope changes.
  await db.runTransaction(async (transaction) => {
    const profile = await transaction.get(db.collection("users").doc(uid));
    const current = profile.exists && profile.data()?.status === "active"
      ? engagementMailRecipientFromUserDoc(profile) : null;
    const capabilities = new Set([...(before?.capabilities || []), ...(after?.capabilities || []), ...(current?.capabilities || [])]);
    capabilities.forEach((capability) => {
      const shardNumber = engagementMailRecipientShardNumber(uid);
      const value = current?.capabilities?.includes(capability) ? current : FieldValue.delete();
      transaction.set(engagementMailRecipientShardRef(db, capability, shardNumber), {
        capability,
        shardNumber,
        recipients: { [key]: value },
        generatedAt: now
      }, { merge: true });
    });
  }, { maxAttempts: 5 });
  // The helper re-reads profile + directory together. Propagate its failure to
  // the existing retry:true trigger; never acknowledge an incomplete update.
  await updateEngagementClubAdminDirectory(db, before, after, now);
});

exports.rebuildEngagementMailRecipientIndexNextPage = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/rebuild-engagement-mail-recipient-index-next-page.js#rebuildEngagementMailRecipientIndexNextPage#arrow */ async (request) => {
  return $portalCompetitionHandlers_rebuildEngagementMailRecipientIndexNextPage().rebuildEngagementMailRecipientIndexNextPage(request);
});

/* extracted-function: functions/backend/server-mail-service/engagement-active-club-mail-recipients.js#engagementActiveClubMailRecipients */
async function engagementActiveClubMailRecipients(input0) {
  return $serverMailService_engagementActiveClubMailRecipients().engagementActiveClubMailRecipients(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-recipient-from-context.js#engagementMailRecipientFromContext */
function engagementMailRecipientFromContext() {
  return $serverMailService_engagementMailRecipientFromContext().engagementMailRecipientFromContext(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-recipients.js#engagementDedupMailRecipients */
function engagementDedupMailRecipients() {
  return $serverMailService_engagementCompetitionDocumentRecipients().engagementDedupMailRecipients(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-recipients.js#engagementCompetitionOpeningRecipients */
function engagementCompetitionOpeningRecipients() {
  return $serverMailService_engagementCompetitionDocumentRecipients().engagementCompetitionOpeningRecipients(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-recipients.js#engagementCompetitionDocumentRecipients */
function engagementCompetitionDocumentRecipients() {
  return $serverMailService_engagementCompetitionDocumentRecipients().engagementCompetitionDocumentRecipients(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementCompetitionDocumentMailSubject */
function engagementCompetitionDocumentMailSubject() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementCompetitionDocumentMailSubject(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementCompetitionDocumentMailText */
function engagementCompetitionDocumentMailText() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementCompetitionDocumentMailText(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-html.js#engagementCompetitionDocumentMailHtml */
function engagementCompetitionDocumentMailHtml() {
  return $serverMailService_engagementCompetitionDocumentMailHtml().engagementCompetitionDocumentMailHtml(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-recipients-by-club.js#engagementRecipientsByClub */
function engagementRecipientsByClub() {
  return $serverMailService_engagementRecipientsByClub().engagementRecipientsByClub(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-opening-mail-subject.js#engagementOpeningMailSubject */
function engagementOpeningMailSubject() {
  return $serverMailService_engagementOpeningMailSubject().engagementOpeningMailSubject(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-opening-mail-subject.js#engagementOpeningMailText */
function engagementOpeningMailText() {
  return $serverMailService_engagementOpeningMailSubject().engagementOpeningMailText(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-club-recap-mail-subject.js#engagementClubRecapMailSubject */
function engagementClubRecapMailSubject() {
  return $serverMailService_engagementClubRecapMailSubject().engagementClubRecapMailSubject(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-club-recap-mail-subject.js#engagementClubRecapMailText */
function engagementClubRecapMailText() {
  return $serverMailService_engagementClubRecapMailSubject().engagementClubRecapMailText(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementTxtMailSubject */
function engagementTxtMailSubject() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementTxtMailSubject(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementTxtMailText */
function engagementTxtMailText() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementTxtMailText(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementOfficialsMailSubject */
function engagementOfficialsMailSubject() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementOfficialsMailSubject(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-competition-document-mail-subject.js#engagementOfficialsMailText */
function engagementOfficialsMailText() {
  return $serverMailService_engagementCompetitionDocumentMailSubject().engagementOfficialsMailText(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-job-item-from-data.js#engagementMailJobItemFromData */
function engagementMailJobItemFromData() {
  return $serverMailService_engagementMailJobItemFromData().engagementMailJobItemFromData(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-prepared-reason.js#upsertEngagementMailJob */
async function upsertEngagementMailJob() {
  return $serverMailService_engagementMailPreparedReason().upsertEngagementMailJob(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-attachments.js#engagementMailAttachments */
async function engagementMailAttachments() {
  return $serverMailService_engagementMailAttachments().engagementMailAttachments(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-with-notification-preference-footer.js#engagementMailWithNotificationPreferenceFooter */
function engagementMailWithNotificationPreferenceFooter() {
  return $serverMailService_engagementMailWithNotificationPreferenceFooter().engagementMailWithNotificationPreferenceFooter(...arguments);
}

/* extracted-function: functions/backend/server-mail-service/engagement-mail-with-notification-preference-footer.js#sendEngagementMailJob */
async function sendEngagementMailJob(input0, input1, input2, input3) {
  return $serverMailService_engagementMailWithNotificationPreferenceFooter().sendEngagementMailJob(...arguments);
}



/* extracted-function: functions/backend/server-club-people-service/clean-engagement-club-person.js#cleanEngagementClubPerson */
function cleanEngagementClubPerson() {
  return $serverClubPeopleService_cleanEngagementClubPerson().cleanEngagementClubPerson(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-person-item.js#engagementClubPersonItem */
function engagementClubPersonItem(input0) {
  return $serverClubPeopleService_engagementClubPersonItem().engagementClubPersonItem(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-people-roster-id.js#engagementClubPeopleRosterId */
function engagementClubPeopleRosterId(input0) {
  return $serverClubPeopleService_engagementClubPeopleRosterId().engagementClubPeopleRosterId(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-people-roster-id.js#engagementClubPeopleRosterRef */
function engagementClubPeopleRosterRef(input0, input1) {
  return $serverClubPeopleService_engagementClubPeopleRosterId().engagementClubPeopleRosterRef(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-people-roster-person-item.js#engagementClubPeopleRosterPersonItem */
function engagementClubPeopleRosterPersonItem() {
  return $serverClubPeopleService_engagementClubPeopleRosterPersonItem().engagementClubPeopleRosterPersonItem(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-people-roster-people-from-data.js#engagementClubPeopleRosterPeopleFromData */
function engagementClubPeopleRosterPeopleFromData() {
  return $serverClubPeopleService_engagementClubPeopleRosterPeopleFromData().engagementClubPeopleRosterPeopleFromData(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-club-person.js#engagementClubPersonIdentityConflict */
function engagementClubPersonIdentityConflict() {
  return $serverClubPeopleService_cleanEngagementClubPerson().engagementClubPersonIdentityConflict(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-club-person.js#throwEngagementClubPersonIdentityConflict */
function throwEngagementClubPersonIdentityConflict() {
  return $serverClubPeopleService_cleanEngagementClubPerson().throwEngagementClubPersonIdentityConflict(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-club-person.js#engagementClubPersonOutsideClubConflict */
async function engagementClubPersonOutsideClubConflict() {
  return $serverClubPeopleService_cleanEngagementClubPerson().engagementClubPersonOutsideClubConflict(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/upsert-engagement-club-people-roster-person.js#upsertEngagementClubPeopleRosterPerson */
function upsertEngagementClubPeopleRosterPerson(input0, input1) {
  return $serverClubPeopleService_upsertEngagementClubPeopleRosterPerson().upsertEngagementClubPeopleRosterPerson(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/delete-engagement-club-people-roster-person.js#deleteEngagementClubPeopleRosterPerson */
function deleteEngagementClubPeopleRosterPerson(input0, input1) {
  return $serverClubPeopleService_deleteEngagementClubPeopleRosterPerson().deleteEngagementClubPeopleRosterPerson(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/rebuild-engagement-club-people-roster.js#rebuildEngagementClubPeopleRoster */
async function rebuildEngagementClubPeopleRoster(input0) {
  return $serverClubPeopleService_rebuildEngagementClubPeopleRoster().rebuildEngagementClubPeopleRoster(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/sync-engagement-club-people-roster-from-change.js#syncEngagementClubPeopleRosterFromChange */
async function syncEngagementClubPeopleRosterFromChange() {
  return $serverClubPeopleService_syncEngagementClubPeopleRosterFromChange().syncEngagementClubPeopleRosterFromChange(...arguments);
}

exports.syncEngagementClubPersonToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubPeople/{personId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubPeopleRosterFromChange(event);
});

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-item.js#engagementClubSwimmerItem */
function engagementClubSwimmerItem(input0) {
  return $serverClubPeopleService_engagementClubSwimmerItem().engagementClubSwimmerItem(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-reference-swimmer-item.js#engagementReferenceSwimmerItem */
function engagementReferenceSwimmerItem() {
  return $serverClubPeopleService_engagementReferenceSwimmerItem().engagementReferenceSwimmerItem(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-reference-club-swimmers.js#engagementReferenceClubSwimmers */
function engagementReferenceClubSwimmers() {
  return $serverClubPeopleService_engagementReferenceClubSwimmers().engagementReferenceClubSwimmers(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-match-keys.js#sortEngagementClubSwimmers */
function sortEngagementClubSwimmers() {
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys().sortEngagementClubSwimmers(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-match-keys.js#engagementClubSwimmerMatchKeys */
function engagementClubSwimmerMatchKeys() {
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys().engagementClubSwimmerMatchKeys(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-match-keys.js#engagementClubSwimmerSourceRank */
function engagementClubSwimmerSourceRank() {
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys().engagementClubSwimmerSourceRank(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-match-keys.js#mergeEngagementClubSwimmerItems */
function mergeEngagementClubSwimmerItems() {
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys().mergeEngagementClubSwimmerItems(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-club-swimmer-match-keys.js#uniqueEngagementClubSwimmers */
function uniqueEngagementClubSwimmers() {
  return $serverClubPeopleService_engagementClubSwimmerMatchKeys().uniqueEngagementClubSwimmers(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/engagement-reference-club-swimmers.js#rebuildEngagementClubRoster */
async function rebuildEngagementClubRoster(input0) {
  return $serverClubPeopleService_engagementReferenceClubSwimmers().rebuildEngagementClubRoster(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/sync-engagement-club-roster-from-swimmer-change.js#syncEngagementClubRosterFromSwimmerChange */
async function syncEngagementClubRosterFromSwimmerChange() {
  return $serverClubPeopleService_syncEngagementClubRosterFromSwimmerChange().syncEngagementClubRosterFromSwimmerChange(...arguments);
}

exports.syncPerformanceSwimmerToEngagementClubRoster = onDocumentWritten({
  region: REGION,
  document: `${PERFORMANCE_SWIMMERS_COLLECTION}/{swimmerIndexId}`
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubRosterFromSwimmerChange(event, "performances");
});

exports.syncEngagementClubSwimmerToRoster = onDocumentWritten({
  region: REGION,
  document: "engagementClubSwimmers/{swimmerId}"
}, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  await syncEngagementClubRosterFromSwimmerChange(event, "engagement");
});

/* extracted-function: functions/backend/server-club-people-service/reactivate-engagement-club-roster-swimmers-from-performance-rows.js#reactivateEngagementClubRosterSwimmersFromPerformanceRows */
async function reactivateEngagementClubRosterSwimmersFromPerformanceRows() {
  return $serverClubPeopleService_reactivateEngagementClubRosterSwimmersFromPerformanceRows().reactivateEngagementClubRosterSwimmersFromPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-iso-date-time.js#cleanIsoDateTime */
function cleanIsoDateTime(input0) {
  return $serverClubPeopleService_cleanIsoDateTime().cleanIsoDateTime(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-deadline-at.js#cleanEngagementDeadlineAt */
function cleanEngagementDeadlineAt(input0) {
  return $serverClubPeopleService_cleanEngagementDeadlineAt().cleanEngagementDeadlineAt(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-deadline-at.js#isEngagementOpeningDeadlinePast */
function isEngagementOpeningDeadlinePast(input0, input1) {
  return $serverClubPeopleService_cleanEngagementDeadlineAt().isEngagementOpeningDeadlinePast(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-deadline-at.js#isEngagementOpeningTooEarly */
function isEngagementOpeningTooEarly(input0, input1) {
  return $serverClubPeopleService_cleanEngagementDeadlineAt().isEngagementOpeningTooEarly(...arguments);
}

/* extracted-function: functions/backend/server-club-people-service/clean-engagement-region-ids.js#cleanEngagementRegionIds */
function cleanEngagementRegionIds() {
  return $serverClubPeopleService_cleanEngagementRegionIds().cleanEngagementRegionIds(...arguments);
}



/* extracted-function: functions/backend/server-competition-service/clean-engagement-competition-payload.js#cleanEngagementCompetitionPayload */
function cleanEngagementCompetitionPayload() {
  return $serverCompetitionService_cleanEngagementCompetitionPayload().cleanEngagementCompetitionPayload(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-can-manage-engagement-competition.js#assertCanManageEngagementCompetition */
function assertCanManageEngagementCompetition() {
  return $serverCompetitionService_assertCanManageEngagementCompetition().assertCanManageEngagementCompetition(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-event-is-past.js#engagementParisIsoDate */
function engagementParisIsoDate() {
  return $serverCompetitionService_engagementEventIsPast().engagementParisIsoDate(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-event-is-past.js#engagementEventIsPast */
function engagementEventIsPast() {
  return $serverCompetitionService_engagementEventIsPast().engagementEventIsPast(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-can-modify-engagement-event.js#assertCanModifyEngagementEvent */
function assertCanModifyEngagementEvent() {
  return $serverCompetitionService_assertCanModifyEngagementEvent().assertCanModifyEngagementEvent(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-can-delete-engagement-document.js#assertCanDeleteEngagementDocument */
function assertCanDeleteEngagementDocument() {
  return $serverCompetitionService_assertCanDeleteEngagementDocument().assertCanDeleteEngagementDocument(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-deletion-request-id.js#engagementDeletionRequestId */
function engagementDeletionRequestId() {
  return $serverCompetitionService_engagementDeletionRequestId().engagementDeletionRequestId(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-engagement-club-write-open.js#engagementClubWriteLockReason */
function engagementClubWriteLockReason() {
  return $serverCompetitionService_assertEngagementClubWriteOpen().engagementClubWriteLockReason(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-engagement-club-write-open.js#assertEngagementClubWriteOpen */
function assertEngagementClubWriteOpen() {
  return $serverCompetitionService_assertEngagementClubWriteOpen().assertEngagementClubWriteOpen(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/native-portal-calendar-items.js#nativePortalCalendarItems */
async function nativePortalCalendarItems(input0) {
  return $serverCompetitionService_nativePortalCalendarItems().nativePortalCalendarItems(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/native-document-authors.js#nativeDocumentAuthors */
async function nativeDocumentAuthors(input0) {
  return $serverCompetitionService_nativeDocumentAuthors().nativeDocumentAuthors(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/native-portal-competition.js#nativePortalCompetition */
async function nativePortalCompetition(input0, input1) {
  return $serverCompetitionService_nativePortalCompetition().nativePortalCompetition(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/create-native-portal-calendar-record.js#createNativePortalCalendarRecord */
async function createNativePortalCalendarRecord(input0, input1, input2) {
  return $serverCompetitionService_createNativePortalCalendarRecord().createNativePortalCalendarRecord(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/native-club-entry-view.js#nativeClubEntryView */
async function nativeClubEntryView(input0, input1, input2) {
  return $serverCompetitionService_nativeClubEntryView().nativeClubEntryView(...arguments);
}

exports.listEngagementCompetitions = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/list-engagement-competitions.js#listEngagementCompetitions#arrow */ async (request) => {
  return $portalCompetitionHandlers_listEngagementCompetitions().listEngagementCompetitions(request);
});

exports.listEngagementCalendarEvents = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/list-engagement-calendar-events.js#listEngagementCalendarEvents#arrow */ async (request) => {
  return $portalCompetitionHandlers_listEngagementCalendarEvents().listEngagementCalendarEvents(request);
});

exports.getEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/get-engagement-calendar-event.js#getEngagementCalendarEvent#arrow */ async (request) => {
  return $portalCompetitionHandlers_getEngagementCalendarEvent().getEngagementCalendarEvent(request);
});

exports.createEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/create-engagement-calendar-event.js#createEngagementCalendarEvent#arrow */ async (request) => {
  return $portalCompetitionHandlers_createEngagementCalendarEvent().createEngagementCalendarEvent(request);
});

exports.updateEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/update-engagement-calendar-event.js#updateEngagementCalendarEvent#arrow */ async (request) => {
  return $portalCompetitionHandlers_updateEngagementCalendarEvent().updateEngagementCalendarEvent(request);
});

exports.deleteEngagementCalendarEvent = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/delete-engagement-calendar-event.js#deleteEngagementCalendarEvent#arrow */ async (request) => {
  return $portalCompetitionHandlers_deleteEngagementCalendarEvent().deleteEngagementCalendarEvent(request);
});

exports.listEngagementOpenWaterCourses = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/list-engagement-open-water-courses.js#listEngagementOpenWaterCourses#arrow */ async (request) => {
  return $portalCompetitionHandlers_listEngagementOpenWaterCourses().listEngagementOpenWaterCourses(request);
});

exports.addEngagementOpenWaterCourse = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/add-engagement-open-water-course.js#addEngagementOpenWaterCourse#arrow */ async (request) => {
  return $portalCompetitionHandlers_addEngagementOpenWaterCourse().addEngagementOpenWaterCourse(request);
});

exports.setEngagementOpenWaterCourseStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/set-engagement-open-water-course-status.js#setEngagementOpenWaterCourseStatus#arrow */ async (request) => {
  return $portalCompetitionHandlers_setEngagementOpenWaterCourseStatus().setEngagementOpenWaterCourseStatus(request);
});

exports.getEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/get-engagement-competition.js#getEngagementCompetition#arrow */ async (request) => {
  return $portalCompetitionHandlers_getEngagementCompetition().getEngagementCompetition(request);
});

/* extracted-function: functions/backend/server-competition-service/engagement-competition-document-uploader.js#engagementCompetitionDocumentUploader */
function engagementCompetitionDocumentUploader() {
  return $serverCompetitionService_engagementCompetitionDocumentUploader().engagementCompetitionDocumentUploader(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-engagement-competition-document-path.js#assertEngagementCompetitionDocumentPath */
function assertEngagementCompetitionDocumentPath() {
  return $serverCompetitionService_assertEngagementCompetitionDocumentPath().assertEngagementCompetitionDocumentPath(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/assert-engagement-competition-document-path.js#hasManagedEngagementCompetitionDocumentStorage */
function hasManagedEngagementCompetitionDocumentStorage() {
  return $serverCompetitionService_assertEngagementCompetitionDocumentPath().hasManagedEngagementCompetitionDocumentStorage(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-competition-document-context.js#engagementCompetitionDocumentContext */
async function engagementCompetitionDocumentContext(input0) {
  return $serverCompetitionService_engagementCompetitionDocumentContext().engagementCompetitionDocumentContext(...arguments);
}

// Portal news use the live server profile, never a client-supplied role.
exports.managePortalNews = onCall(CALLABLE_OPTIONS, async (request) => {
  return require("./portal-news").managePortalNews({ db, HttpsError, ADMIN_UIDS }, request);
});

// National document selection. No client-supplied role or actor is authoritative.
exports.getNationalFeaturedDocuments = onCall({ ...CALLABLE_OPTIONS, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")] }, /* extracted-handler: functions/backend/portal-national-handlers/get-national-featured-documents.js#getNationalFeaturedDocuments#arrow */ async (request) => {
  return $portalNationalHandlers_getNationalFeaturedDocuments().getNationalFeaturedDocuments(request);
});
exports.saveNationalFeaturedDocuments = onCall({ ...ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")] }, /* extracted-handler: functions/backend/portal-national-handlers/save-national-featured-documents.js#saveNationalFeaturedDocuments#arrow */ async (request) => {
  return $portalNationalHandlers_saveNationalFeaturedDocuments().saveNationalFeaturedDocuments(request);
});
// End national document selection.
/* extracted-function: functions/backend/server-competition-service/national-library-context.js#nationalLibraryContext */
async function nationalLibraryContext(input0) {
  return $serverCompetitionService_nationalLibraryContext().nationalLibraryContext(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/manage-national-library-documents.js#manageNationalLibraryDocuments */
async function manageNationalLibraryDocuments(input0) {
  return $serverCompetitionService_manageNationalLibraryDocuments().manageNationalLibraryDocuments(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/notify-national-library-document.js#notifyNationalLibraryDocument */
async function notifyNationalLibraryDocument(input0) {
  return $serverCompetitionService_notifyNationalLibraryDocument().notifyNationalLibraryDocument(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/assert-can-delete-engagement-document.js#mutateNativeCompetitionDocument */
async function mutateNativeCompetitionDocument(input0, input1) {
  return $serverCompetitionService_assertCanDeleteEngagementDocument().mutateNativeCompetitionDocument(...arguments);
}
exports.uploadEngagementCompetitionDocument = onCall({ ...ENGAGEMENT_DOCUMENT_UPLOAD_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/upload-engagement-competition-document.js#uploadEngagementCompetitionDocument#arrow */ async (request) => {
  return $portalCompetitionHandlers_uploadEngagementCompetitionDocument().uploadEngagementCompetitionDocument(request);
});

exports.updateEngagementCompetitionDocument = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/update-engagement-competition-document.js#updateEngagementCompetitionDocument#arrow */ async (request) => {
  return $portalCompetitionHandlers_updateEngagementCompetitionDocument().updateEngagementCompetitionDocument(request);
});

exports.deleteEngagementCompetitionDocument = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/delete-engagement-competition-document.js#deleteEngagementCompetitionDocument#arrow */ async (request) => {
  return $portalCompetitionHandlers_deleteEngagementCompetitionDocument().deleteEngagementCompetitionDocument(request);
});

exports.previewEngagementCompetitionDocumentNotification = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/preview-engagement-competition-document-notification.js#previewEngagementCompetitionDocumentNotification#arrow */ async (request) => {
  return $portalCompetitionHandlers_previewEngagementCompetitionDocumentNotification().previewEngagementCompetitionDocumentNotification(request);
});

exports.notifyEngagementCompetitionDocuments = onCall(ENVIRONMENT.sportingDataSource === "nap" ? (ENVIRONMENT.projectId === "livepalmes-test" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : { ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, timeoutSeconds:300, secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD"),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] }) : ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  if(request.data?.library===true)return notifyNationalLibraryDocument(request);
  if (ENVIRONMENT.sportingDataSource === "nap") return queueNativeDocumentNotification(request);
  const { context, competitionId, snapshot } = await engagementCompetitionDocumentContext(request);
  const competition = engagementCompetitionDetailItem(snapshot);
  const documentIds = Array.from(new Set((Array.isArray(request.data?.documentIds) ? request.data.documentIds : [])
    .map((id) => cleanText(id).slice(0, 80))
    .filter(Boolean))).slice(0, MAX_COMPETITION_DOCUMENTS);
  const documents = cleanCompetitionDocuments(snapshot.data()?.clubDocuments || [])
    .filter((document) => documentIds.includes(document.id));
  if (!documents.length || documents.length !== documentIds.length) {
    throw new HttpsError("invalid-argument", "Documents à notifier introuvables.");
  }
  const recipients = engagementCompetitionDocumentRecipients(
    await engagementActiveClubMailRecipients(db),
    competition
  );
  const notificationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const subject = engagementCompetitionDocumentMailSubject(competition, documents);
  const text = engagementCompetitionDocumentMailText(competition, documents);
  const html = engagementCompetitionDocumentMailHtml(competition, documents);
  const preparedJobs = [];
  for (let offset = 0; offset < recipients.length; offset += 25) {
    const chunk = recipients.slice(offset, offset + 25);
    const chunkJobs = await Promise.all(chunk.map(async (recipient) => {
      const payload = {
        type: "competition_documents",
        notificationId,
        competitionId,
        competitionName: competition.name,
        clubId: recipient.clubId,
        clubName: recipient.clubName,
        regionId: recipient.regionId,
        toEmail: recipient.email,
        toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
        recipientUid: recipient.uid,
        subject,
        text,
        html
      };
      const item = await upsertEngagementMailJob(payload, now);
      return item ? {
        item,
        data: {
          ...payload,
          status: engagementMailPreparedStatus(),
          textBody: text,
          htmlBody: html,
          createdAt: now,
          updatedAt: now
        }
      } : null;
    }));
    preparedJobs.push(...chunkJobs.filter(Boolean));
  }
  const config = engagementMailSmtpConfig();
  let sentCount = 0;
  let errorCount = 0;
  if (config.ready && preparedJobs.length) {
    const transporter = nodemailer.createTransport({
      ...config.transport,
      pool: true,
      maxConnections: 5,
      maxMessages: 100
    });
    for (let offset = 0; offset < preparedJobs.length; offset += 5) {
      const results = await Promise.all(preparedJobs.slice(offset, offset + 5).map(({ item, data }) =>
        sendEngagementMailJob(transporter, {
          id: item.id,
          ref: db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).doc(item.id),
          data: () => data
        }, config, context)
      ));
      sentCount += results.filter((job) => job.status === "sent").length;
      errorCount += results.filter((job) => job.status === "failed").length;
    }
    await transporter.close();
  }
  await writeAuditLog("engagementCompetition.documentsNotified", context.uid, {
    competitionId,
    notificationId,
    documentIds,
    documentCount: documents.length,
    recipientCount: recipients.length,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  });
  return {
    ok: true,
    competitionId,
    notificationId,
    documentCount: documents.length,
    recipientCount: recipients.length,
    clubCount: new Set(recipients.map((recipient) => cleanText(recipient.clubId)).filter(Boolean)).size,
    sentCount,
    errorCount,
    configurationMissing: !config.ready
  };
});

exports.getEngagementClubEntry = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/get-engagement-club-entry.js#getEngagementClubEntry#arrow */ async (request) => {
  return $portalClubHandlers_getEngagementClubEntry().getEngagementClubEntry(request);
});

exports.preloadEngagementClubWorkspaces = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, async (request) => {
  const startedAt = Date.now();
  const context = await engagementClubAccessContext(request);
  // Native workspaces are read when actually opened. Prefetch must neither
  // consult the abandoned sports collections nor hide an IntraNAP edit.
  if (ENVIRONMENT.sportingDataSource === "nap") return { ok: true, source: "nap", workspaces: [] };
  const competitionIds = Array.from(new Set(
    (Array.isArray(request.data?.competitionIds) ? request.data.competitionIds : [])
      .map((competitionId) => cleanText(competitionId).slice(0, 128))
      .filter(Boolean)
  )).slice(0, 4);
  if (!competitionIds.length) {
    return {
      ok: true,
      workspaces: [],
      readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
        baseDocuments: 1,
        variableDocumentsMax: 0,
        cacheHit: false
      })
    };
  }
  const refs = competitionIds.flatMap((competitionId) => [
    db.collection("engagementCompetitions").doc(competitionId),
    db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId))
  ]);
  const snapshots = await db.getAll(...refs);
  const workspaces = competitionIds.flatMap((competitionId, index) => {
    const competition = snapshots[index * 2];
    const entry = snapshots[index * 2 + 1];
    if (!competition?.exists) return [];
    return [{
      competitionId,
      competition: engagementCompetitionDetailItem(competition),
      entry: engagementClubEntryItem(entry, {
        competitionId,
        clubId: context.clubId,
        clubName: context.clubName,
        regionId: context.regionId,
        status: "active"
      })
    }];
  });
  return {
    ok: true,
    workspaces,
    readStats: portalReadStats("preloadEngagementClubWorkspaces", startedAt, {
      baseDocuments: 1 + refs.length,
      variableDocumentsMax: 0,
      cacheHit: false
    })
  };
});

// TEST recap is generated directly from the trusted native dossier. No sports
// Firestore read, saved PDF cache or Storage write: <=14+1 documents+8 bounded SQL reads.
/* extracted-function: functions/backend/server-competition-service/generate-native-club-recap-pdf.js#generateNativeClubRecapPdf */
async function generateNativeClubRecapPdf(input0, input1) {
  return $serverCompetitionService_generateNativeClubRecapPdf().generateNativeClubRecapPdf(...arguments);
}

exports.generateEngagementClubRecapPdf = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/generate-engagement-club-recap-pdf.js#generateEngagementClubRecapPdf#arrow */ async (request) => {
  return $portalClubHandlers_generateEngagementClubRecapPdf().generateEngagementClubRecapPdf(request);
});

/* extracted-function: functions/backend/server-competition-service/native-admin-competition-entries.js#nativeAdminCompetitionEntries */
async function nativeAdminCompetitionEntries(input0, input1) {
  return $serverCompetitionService_nativeAdminCompetitionEntries().nativeAdminCompetitionEntries(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/native-notification-preview.js#nativeNotificationPreview */
async function nativeNotificationPreview(input0, input1) {
  return $serverCompetitionService_nativeNotificationPreview().nativeNotificationPreview(...arguments);
}
// Reuse the queue and builders. Preview retains manifests only; delivery is
// explicitly selected and gated by the national setting on TEST.
/* extracted-function: functions/backend/server-competition-service/native-notification-automation-services.js#nativeNotificationAutomationServices */
function nativeNotificationAutomationServices() {
  return $serverCompetitionService_nativeNotificationAutomationServices().nativeNotificationAutomationServices(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/native-notification-automation-services.js#nativeNotificationTaskServices */
function nativeNotificationTaskServices() {
  return $serverCompetitionService_nativeNotificationAutomationServices().nativeNotificationTaskServices(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/enqueue-native-notification-task.js#enqueueNativeNotificationTask */
async function enqueueNativeNotificationTask(input0) {
  return $serverCompetitionService_enqueueNativeNotificationTask().enqueueNativeNotificationTask(...arguments);
}
exports.processNapNotificationTask = onTaskDispatched({region:REGION,
  timeoutSeconds:540,memory:'1GiB',concurrency:1,maxInstances:1,
  retryConfig:{maxAttempts:3,minBackoffSeconds:60,maxBackoffSeconds:300},
  rateLimits:{maxConcurrentDispatches:1,maxDispatchesPerSecond:1},
  secrets:[defineSecret('LIVEPALMES_NAP_PASSWORD'),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS]
},async request=>{
  if(request.data?.probe===true&&ENVIRONMENT.projectId==='livepalmes-test'){
    console.info('notification-task-test-probe',{requestedAt:request.data.requestedAt,handledAt:new Date().toISOString(),mailsSent:0});return;
  }
  await require('./nap-notification-task').run(db,String(request.data?.eventId||''),nativeNotificationTaskServices());
});
/* extracted-function: functions/backend/server-competition-service/deliver-native-notification-jobs.js#deliverNativeNotificationJobs */
async function deliverNativeNotificationJobs() {
  return $serverCompetitionService_deliverNativeNotificationJobs().deliverNativeNotificationJobs(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/arm-native-competition-notification.js#armNativeCompetitionNotification */
async function armNativeCompetitionNotification(input0, input1, input2) {
  return $serverCompetitionService_armNativeCompetitionNotification().armNativeCompetitionNotification(...arguments);
}
/* extracted-function: functions/backend/server-competition-service/notify-national-library-document.js#queueNativeDocumentNotification */
async function queueNativeDocumentNotification(input0) {
  return $serverCompetitionService_notifyNationalLibraryDocument().queueNativeDocumentNotification(...arguments);
}
exports.processNapCompetitionNotifications = onCall({ ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS,secrets:[defineSecret('LIVEPALMES_NAP_PASSWORD'),...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS],timeoutSeconds:300,memory:'1GiB' },async request=>{
  if(ENVIRONMENT.sportingDataSource !== "nap")throw new HttpsError('failed-precondition','Source NAP requise.');
  const context=await engagementAccessContext(request),automation=require('./nap-notification-automation');
  try{
    if(request.data?.action==='adopt-open-season'){
      if(!context.national)throw new HttpsError('permission-denied','Reprise reservee au niveau national.');
      return await automation.adoptOpenCompetitions(db,{season:request.data.season,offset:request.data.offset},{
        authorize:async()=>{},schedule:enqueueNativeNotificationTask,season:async year=>{const pack=await require("./nap-portal-calendar-reader").readNativeCompetitionSeason(require("./nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD),year);return {...pack,events:pack.events.map(event=>({...event,id:String(require("./nap-calendar-values").positiveId(event.id))}))};}});
    }
    if(!['process','restart'].includes(request.data?.action))throw new TypeError('Action de notification inconnue.');
    const competitionId=String(require("./nap-calendar-values").positiveId(request.data.competitionId));
    await nativePortalCompetition(competitionId,event=>assertCanManageEngagementCompetition(context,event));
    const snapshot=await db.collection(automation.COLLECTION).where('competitionId','==',competitionId).limit(101).get();
    if(snapshot.size>100)throw new RangeError('Historique technique trop volumineux : maintenance requise.');
    const now=new Date().toISOString(),services=nativeNotificationAutomationServices(false),results=[];
    const pointer=snapshot.docs.find(doc=>doc.id===`nap-state-${competitionId}`)?.data()||{};
    const events=snapshot.docs.filter(doc=>doc.data().source==='nap'&&['opening','closure','documents'].includes(doc.data().kind)&&automation.currentEvent(doc.data(),pointer));
    const blocked=events.filter(doc=>doc.data().status==='blocked');
    if(request.data.action==='restart'){
      const results=[];
      for(const doc of blocked.slice(0,2))results.push(await automation.resumeBlocked(db,doc.ref,services,now));
      return {ok:true,disabled:true,sentCount:0,resumedCount:results.filter(result=>result.resumed).length,remaining:Math.max(0,blocked.length-results.length)};
    }
    if(blocked.length)throw new TypeError('Preparation interrompue apres une modification NAP. Une reprise explicite est necessaire.');
    // Explicit maintenance of an already managed competition also arms its
    // future closure. It neither replays an opening nor prepares mail early.
    const future=events.filter(doc=>doc.data().kind==='closure'&&doc.data().automatic&&doc.data().deliveryMode==='bcc-v1'&&doc.data().status==='pending'&&doc.data().runAt>now),schedules=[];
    for(const doc of future.slice(0,2))schedules.push(await enqueueNativeNotificationTask(doc.id));
    const due=events.filter(doc=>doc.data().runAt&&doc.data().runAt<=now&&!['completed','cancelled'].includes(doc.data().status)).sort((a,b)=>a.data().runAt.localeCompare(b.data().runAt));
    for(const doc of due.slice(0,2))results.push(doc.data().deliveryMode==='bcc-v1'?await enqueueNativeNotificationTask(doc.id):await automation.processEvent(db,doc.ref,services,now));
    const delivery=await deliverNativeNotificationJobs(competitionId);
    return {ok:true,source:'nap',disabled:false,scheduledCount:schedules.filter(result=>result.queued).length,schedulingPending:future.length-schedules.filter(result=>result.queued).length,sentCount:delivery.sent,processedCount:results.length,jobCount:results.reduce((sum,result)=>sum+(result.jobCount||0),0),attachmentCount:results.reduce((sum,result)=>sum+(result.attachmentCount||0),0),remaining:Math.max(0,due.length-results.filter(result=>result.done||result.skipped).length)};
  }catch(error){if(error instanceof HttpsError)throw error;throw new HttpsError(error instanceof TypeError?'failed-precondition':error instanceof RangeError?'resource-exhausted':'unavailable',error instanceof TypeError||error instanceof RangeError?error.message:'Preparation NAP interrompue : vous pouvez reprendre le traitement.');}
});
exports.listEngagementCompetitionClubRecaps = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/list-engagement-competition-club-recaps.js#listEngagementCompetitionClubRecaps#arrow */ async (request) => {
  return $portalClubHandlers_listEngagementCompetitionClubRecaps().listEngagementCompetitionClubRecaps(request);
});

function competitionStatistics() {
  if (!competitionStatistics.instance) competitionStatistics.instance = require("./engagement-competition-statistics").createCompetitionStatistics({
    ageCategoryFromDates,
    cleanText,
    engagementClubCode,
    engagementClubEntryHasParticipants,
    engagementClubName,
    engagementPdfEventLabel,
    normalizeCourseCode
  });
  return competitionStatistics.instance;
}

/* extracted-function: functions/engagement-competition-statistics.js#engagementCompetitionStatisticsItem */
function engagementCompetitionStatisticsItem() {
  return competitionStatistics().engagementCompetitionStatisticsItem(...arguments);
}

exports.getEngagementCompetitionStatistics = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/get-engagement-competition-statistics.js#getEngagementCompetitionStatistics#arrow */ async (request) => {
  return $portalCompetitionHandlers_getEngagementCompetitionStatistics().getEngagementCompetitionStatistics(request);
});

exports.generateEngagementClubRecapPdfForAdmin = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/generate-engagement-club-recap-pdf-for-admin.js#generateEngagementClubRecapPdfForAdmin#arrow */ async (request) => {
  return $portalClubHandlers_generateEngagementClubRecapPdfForAdmin().generateEngagementClubRecapPdfForAdmin(request);
});

exports.generateEngagementCompetitionClubRecapPdfs = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/generate-engagement-competition-club-recap-pdfs.js#generateEngagementCompetitionClubRecapPdfs#arrow */ async (request) => {
  return $portalClubHandlers_generateEngagementCompetitionClubRecapPdfs().generateEngagementCompetitionClubRecapPdfs(request);
});

exports.generateEngagementCompetitionTxtExport = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/generate-engagement-competition-txt-export.js#generateEngagementCompetitionTxtExport#arrow */ async (request) => {
  return $portalCompetitionHandlers_generateEngagementCompetitionTxtExport().generateEngagementCompetitionTxtExport(request);
});

exports.listEngagementCompetitionMailJobs = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  let competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  if (ENVIRONMENT.sportingDataSource === "nap") {
    competitionId=String(require("./nap-calendar-values").positiveId(competitionId));
    await nativePortalCompetition(competitionId, event => assertCanManageEngagementCompetition(context, event));
  } else {
    const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competition.exists) throw new HttpsError("not-found", "Competition d'engagements introuvable.");
    assertCanManageEngagementCompetition(context, competition.data() || {});
  }
  const pageSize = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.pageSize) || 100)));
  const cursor = request.data?.cursor && typeof request.data.cursor === "object" ? request.data.cursor : {};
  const documentId = FieldPath.documentId();
  let jobsQuery = db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION)
    .where("competitionId", "==", competitionId)
    .orderBy("updatedAt", "desc")
    .orderBy(documentId, "desc");
  if (cleanText(cursor.id) && typeof cursor.updatedAt === "string") {
    jobsQuery = jobsQuery.startAfter(cursor.updatedAt, cleanText(cursor.id));
  }
  const [snapshot, totalSnapshot] = await Promise.all([
    jobsQuery.limit(pageSize + 1).get(),
    cleanText(cursor.id)
      ? Promise.resolve(null)
      : db.collection(ENGAGEMENT_MAIL_JOBS_COLLECTION).where("competitionId", "==", competitionId).count().get()
  ]);
  const pageDocuments = snapshot.docs.slice(0, pageSize);
  const control=require('./engagement-mail-control'),setting=await control.read(db);
  const jobs = pageDocuments
    .filter(doc=>ENVIRONMENT.sportingDataSource !== "nap"||doc.data().source==='nap')
    .map(doc=>{
      const data=doc.data()||{};
      // Reading history must not validate a new SMTP delivery or rewrite a
      // terminal status. CCI groups intentionally have no individual toEmail.
      let displayState={};
      if(['ready','pending'].includes(data.status)){
        const gate=control.eventDecision(setting,data);
        const recipients=data.deliveryMode==='bcc-v1'&&Array.isArray(data.recipients)?data.recipients:[data];
        const audienceAllowed=recipients.some(recipient=>control.audienceAllowed(setting,{...data,...recipient}));
        if(!gate.allowed||!audienceAllowed)displayState={status:'cancelled',reason:gate.reason||'automatic-mail-outside-pilot'};
      }
      return engagementMailJobItemFromData({...data,
        ...displayState,
        ...(ENVIRONMENT.projectId==='livepalmes-test'?{toEmail:control.TEST_ADDRESS}:{})},doc.id);
    })
    .sort((left, right) => cleanText(right.updatedAt).localeCompare(cleanText(left.updatedAt)) || cleanText(left.toEmail).localeCompare(cleanText(right.toEmail)));
  const lastDocument = pageDocuments.at(-1);
  return {
    ok: true,
    competitionId,
    collection: ENGAGEMENT_MAIL_JOBS_COLLECTION,
    jobs,
    totalCount: totalSnapshot ? Math.max(0, Number(totalSnapshot.data()?.count || 0)) : null,
    hasMore: snapshot.size > pageSize,
    nextCursor: snapshot.size > pageSize && lastDocument ? {
      updatedAt: cleanText(lastDocument.get("updatedAt")).slice(0, 40),
      id: lastDocument.id
    } : null
  };
});

exports.prepareEngagementOpeningNotificationEmails = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "opening");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const competition = engagementCompetitionDetailItem(competitionSnapshot);
  const recipients = engagementCompetitionOpeningRecipients(
    await engagementActiveMailRecipients(db),
    competition,
    [engagementMailRecipientFromContext(context)].filter(Boolean)
  );
  const now = new Date().toISOString();
  const jobs = [];
  for (const recipient of recipients) {
    const job = await upsertEngagementMailJob({
      type: "opening_notification",
      competitionId,
      competitionName: competition.name,
      clubId: recipient.clubId,
      clubName: recipient.clubName,
      regionId: recipient.regionId,
      toEmail: recipient.email,
      toName: [recipient.firstName, recipient.lastName].filter(Boolean).join(" "),
      recipientUid: recipient.uid,
      subject: engagementOpeningMailSubject(competition),
      text: engagementOpeningMailText(competition)
    }, now);
    if (job) jobs.push(job);
  }
  await writeAuditLog("engagementCompetition.openingEmailsPrepared", context.uid, {
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    mailStatus: "ready"
  });
  return {
    ok: true,
    competitionId,
    recipientCount: recipients.length,
    jobCount: jobs.length,
    jobs
  };
});

/* extracted-function: functions/backend/server-competition-service/prepare-engagement-club-recap-email-jobs.js#prepareEngagementClubRecapEmailJobs */
async function prepareEngagementClubRecapEmailJobs(input0, input1) {
  return $serverCompetitionService_prepareEngagementClubRecapEmailJobs().prepareEngagementClubRecapEmailJobs(...arguments);
}

exports.prepareEngagementClubRecapEmails = onCall(ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "club_recaps");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competitionSnapshot.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competitionSnapshot.data() || {});
  const result = await prepareEngagementClubRecapEmailJobs(db, competitionSnapshot, {
    forcePdf: request.data?.forcePdf === true
  });
  await writeAuditLog("engagementCompetition.clubRecapEmailsPrepared", context.uid, {
    competitionId,
    clubEntryCount: result.clubEntryCount,
    skippedClubCount: result.skippedClubCount,
    jobCount: result.jobCount,
    pdfGeneratedCount: result.pdfGeneratedCount,
    pdfReusedCount: result.pdfReusedCount,
    errorCount: result.errorCount,
    mailStatus: result.mailStatus
  });
  return {
    ok: true,
    ...result
  };
});

/* extracted-function: functions/backend/server-competition-service/engagement-closure-automation-context.js#prepareEngagementTxtEmailJob */
async function prepareEngagementTxtEmailJob(input0, input1) {
  return $serverCompetitionService_engagementClosureAutomationContext().prepareEngagementTxtEmailJob(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-closure-automation-context.js#prepareEngagementOfficialsEmailJob */
async function prepareEngagementOfficialsEmailJob(input0, input1) {
  return $serverCompetitionService_engagementClosureAutomationContext().prepareEngagementOfficialsEmailJob(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/send-engagement-prepared-email-jobs.js#sendEngagementPreparedEmailJobs */
async function sendEngagementPreparedEmailJobs(input0, input1) {
  return $serverCompetitionService_sendEngagementPreparedEmailJobs().sendEngagementPreparedEmailJobs(...arguments);
}

exports.sendEngagementPreparedEmails = onCall(ENVIRONMENT.sportingDataSource === "nap" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : ENGAGEMENT_MAIL_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return nativeNotificationPreview(request, "send");
  const context = await engagementAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertCanManageEngagementCompetition(context, competition.data() || {});
  const result = await sendEngagementPreparedEmailJobs(db, competition, context, {
    type: request.data?.type,
    limit: request.data?.limit
  });
  await writeAuditLog("engagementCompetition.preparedEmailsSent", context.uid, {
    competitionId,
    requestedType: cleanText(request.data?.type).slice(0, 80),
    attemptedCount: result.attemptedCount,
    sentCount: result.sentCount,
    errorCount: result.errorCount
  });
  return {
    ok: true,
    ...result
  };
});

/* extracted-function: functions/backend/server-competition-service/engagement-closure-automation-context.js#engagementClosureAutomationContext */
function engagementClosureAutomationContext() {
  return $serverCompetitionService_engagementClosureAutomationContext().engagementClosureAutomationContext(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-closure-automation-context.js#reserveEngagementCompetitionClosure */
async function reserveEngagementCompetitionClosure(input0, input1, input2) {
  return $serverCompetitionService_engagementClosureAutomationContext().reserveEngagementCompetitionClosure(...arguments);
}

/* extracted-function: functions/backend/server-competition-service/engagement-closure-automation-context.js#processEngagementCompetitionAutomaticClosure */
async function processEngagementCompetitionAutomaticClosure(input0, input1, input2) {
  return $serverCompetitionService_engagementClosureAutomationContext().processEngagementCompetitionAutomaticClosure(...arguments);
}

exports.closeDueEngagementCompetitions = onSchedule(ENGAGEMENT_CLOSURE_SCHEDULER_OPTIONS, async () => {
  const now = new Date().toISOString();
  const snapshot = await db.collection(ENGAGEMENT_CLOSURE_QUEUE_COLLECTION)
    .where("runAt", "<=", now)
    .orderBy("runAt")
    .limit(ENGAGEMENT_CLOSURE_BATCH_LIMIT)
    .get();
  const results = [];
  if(ENVIRONMENT.sportingDataSource === "nap"){
    const automation=require('./nap-notification-automation'),services=nativeNotificationAutomationServices(false);
    for(const event of snapshot.docs){
      // Old technical events are retained, never interpreted as native data.
      if(event.data()?.source!=='nap')continue;
      try{results.push(event.data().deliveryMode==='bcc-v1'?await enqueueNativeNotificationTask(event.id):await automation.processEvent(db,event.ref,services,now));}
      catch{results.push({status:'failed'});}
    }
    await deliverNativeNotificationJobs();
    return null;
  }
  for (const queueSnapshot of snapshot.docs) {
    const queue = queueSnapshot.data() || {};
    const competitionId = cleanText(queue.competitionId || queueSnapshot.id).slice(0, 128);
    if (!competitionId) {
      await queueSnapshot.ref.delete();
      results.push({ skipped: true, reason: "missing-competition-id" });
      continue;
    }
    const competitionSnapshot = await db.collection("engagementCompetitions").doc(competitionId).get();
    if (!competitionSnapshot.exists) {
      await queueSnapshot.ref.delete();
      results.push({ competitionId, skipped: true, reason: "competition-not-found" });
      continue;
    }
    const result = await processEngagementCompetitionAutomaticClosure(db, competitionSnapshot, now);
    results.push(result);
    if (result.skipped && result.reason === "deadline-not-reached") {
      const queueItem = engagementClosureQueueItem(competitionSnapshot.data() || {}, competitionSnapshot.id, now);
      if (queueItem) await queueSnapshot.ref.set(queueItem, { merge: true });
      else await queueSnapshot.ref.delete();
    } else {
      await queueSnapshot.ref.delete();
    }
  }
  if (snapshot.size || results.length) {
    await writeAuditLog("engagementCompetition.automaticClosureSweep", "system:engagementClosureScheduler", {
      checkedAt: now,
      dueQueueCount: snapshot.size,
      processedCount: results.filter((result) => !result.skipped).length,
      skippedCount: results.filter((result) => result.skipped).length,
      failedCount: results.filter((result) => result.status === "failed").length
    });
  }
  return null;
});

exports.saveEngagementClubTeamLeader = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-team-leader.js#saveEngagementClubTeamLeader#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubTeamLeader().saveEngagementClubTeamLeader(request);
});

exports.removeEngagementClubTeamLeader = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/remove-engagement-club-team-leader.js#removeEngagementClubTeamLeader#arrow */ async (request) => {
  return $portalClubHandlers_removeEngagementClubTeamLeader().removeEngagementClubTeamLeader(request);
});

exports.listEngagementClubPeople = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/list-engagement-club-people.js#listEngagementClubPeople#arrow */ async (request) => {
  return $portalClubHandlers_listEngagementClubPeople().listEngagementClubPeople(request);
});

/* extracted-function: functions/backend/server-competition-service/resolve-engagement-club-person-swimmer.js#resolveEngagementClubPersonSwimmer */
async function resolveEngagementClubPersonSwimmer(input0) {
  return $serverCompetitionService_resolveEngagementClubPersonSwimmer().resolveEngagementClubPersonSwimmer(...arguments);
}

exports.saveEngagementClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-person.js#saveEngagementClubPerson#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubPerson().saveEngagementClubPerson(request);
});

exports.setEngagementClubPersonStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/set-engagement-club-person-status.js#setEngagementClubPersonStatus#arrow */ async (request) => {
  return $portalClubHandlers_setEngagementClubPersonStatus().setEngagementClubPersonStatus(request);
});

/* extracted-function: functions/backend/server-competition-service/save-native-club-officials.js#saveNativeClubOfficials */
async function saveNativeClubOfficials(input0, input1) {
  return $serverCompetitionService_saveNativeClubOfficials().saveNativeClubOfficials(...arguments);
}

exports.saveEngagementClubOfficials = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-officials.js#saveEngagementClubOfficials#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubOfficials().saveEngagementClubOfficials(request);
});

exports.listEngagementClubSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/list-engagement-club-swimmers.js#listEngagementClubSwimmers#arrow */ async (request) => {
  return $portalClubHandlers_listEngagementClubSwimmers().listEngagementClubSwimmers(request);
});

exports.setEngagementClubSwimmerActivityStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/set-engagement-club-swimmer-activity-status.js#setEngagementClubSwimmerActivityStatus#arrow */ async (request) => {
  return $portalClubHandlers_setEngagementClubSwimmerActivityStatus().setEngagementClubSwimmerActivityStatus(request);
});

exports.rebuildEngagementClubAggregates = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Reconstruction reservee au niveau national.");
  }
  const clubIds = Array.from(new Set((Array.isArray(request.data?.clubIds) ? request.data.clubIds : [])
    .map((clubId) => cleanText(clubId).slice(0, 40))
    .filter(Boolean))).slice(0, 1);
  if (!clubIds.length) throw new HttpsError("invalid-argument", "Au moins un club est requis.");
  const results = [];
  for (const clubId of clubIds) {
    const userSnapshot = await db.collection("users").where("clubId", "==", clubId).limit(1).get();
    const user = userSnapshot.docs[0]?.data() || {};
    const clubContext = {
      clubId,
      clubName: cleanText(user.clubName).slice(0, 140),
      regionId: cleanText(user.regionId).slice(0, 80)
    };
    const [swimmers, people] = await Promise.all([
      rebuildEngagementClubRoster(db, clubContext, 200),
      rebuildEngagementClubPeopleRoster(db, clubContext)
    ]);
    results.push({ clubId, swimmerCount: swimmers.length, personCount: people.length });
  }
  await writeAuditLog("engagementClubAggregates.rebuilt", context.uid, {
    clubCount: results.length,
    clubs: results
  });
  return {
    ok: true,
    results,
    readStats: portalReadStats("rebuildEngagementClubAggregates", startedAt, {
      baseDocuments: clubIds.length,
      variableDocumentsMax: clubIds.length * 801,
      cacheHit: false
    })
  };
});



/* extracted-function: functions/backend/server-national-service/import-swimmer-creation.js#importSwimmerCreation */
async function importSwimmerCreation(input0, input1) {
  return $serverNationalService_importSwimmerCreation().importSwimmerCreation(...arguments);
}
exports.previewEngagementClubSwimmerCreation = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/preview-engagement-club-swimmer-creation.js#previewEngagementClubSwimmerCreation#arrow */ async (request) => {
  return $portalClubHandlers_previewEngagementClubSwimmerCreation().previewEngagementClubSwimmerCreation(request);
});

exports.previewEngagementClubSwimmerRecovery = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/preview-engagement-club-swimmer-recovery.js#previewEngagementClubSwimmerRecovery#arrow */ async (request) => {
  return $portalClubHandlers_previewEngagementClubSwimmerRecovery().previewEngagementClubSwimmerRecovery(request);
});

exports.recoverEngagementClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/recover-engagement-club-swimmer.js#recoverEngagementClubSwimmer#arrow */ async (request) => {
  return $portalClubHandlers_recoverEngagementClubSwimmer().recoverEngagementClubSwimmer(request);
});

exports.createEngagementClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4 } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/create-engagement-club-swimmer.js#createEngagementClubSwimmer#arrow */ async (request) => {
  return $portalClubHandlers_createEngagementClubSwimmer().createEngagementClubSwimmer(request);
});

exports.listEngagementNationalClubSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  if (ENVIRONMENT.sportingDataSource === "nap") {
    try {
      const { listNationalSwimmers: __nativeMember0 } = require("./nap-portal-swimmer-readers");
const { portalPool: __nativeMember1 } = require("./nap-portal-pool");
const service = { listNationalSwimmers: __nativeMember0, portalPool: __nativeMember1 };
      return await service.listNationalSwimmers(service.portalPool(process.env.LIVEPALMES_NAP_PASSWORD), {cursor:request.data?.cursor});
    } catch (error) {
      throw new HttpsError(error instanceof TypeError ? "invalid-argument" : "unavailable", error instanceof TypeError ? error.message : "Annuaire national NAP indisponible. Reessayez.");
    }
  }
  const limit = Math.min(200, Math.max(20, Math.trunc(Number(request.data?.limit) || 80)));
  const snapshot = await db
    .collection("engagementClubSwimmers")
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get();
  return {
    ok: true,
    swimmers: snapshot.docs.map(engagementNewSwimmerItem)
  };
});

/* extracted-function: functions/backend/server-national-service/national-swimmer-search-matches.js#nationalSwimmerSearchMatches */
function nationalSwimmerSearchMatches() {
  return $serverNationalService_nationalSwimmerSearchMatches().nationalSwimmerSearchMatches(...arguments);
}

/* extracted-function: functions/backend/server-national-service/national-swimmer-search-matches.js#nationalSwimmerSort */
function nationalSwimmerSort() {
  return $serverNationalService_nationalSwimmerSearchMatches().nationalSwimmerSort(...arguments);
}

/* extracted-function: functions/backend/server-national-service/national-swimmer-search-matches.js#searchEngagementNationalSwimmerDocs */
async function searchEngagementNationalSwimmerDocs(input0) {
  return $serverNationalService_nationalSwimmerSearchMatches().searchEngagementNationalSwimmerDocs(...arguments);
}

exports.searchEngagementNationalSwimmers = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/search-engagement-national-swimmers.js#searchEngagementNationalSwimmers#arrow */ async (request) => {
  return $portalNationalHandlers_searchEngagementNationalSwimmers().searchEngagementNationalSwimmers(request);
});

/* extracted-function: functions/backend/server-national-service/engagement-license-control-season.js#engagementLicenseControlSeason */
function engagementLicenseControlSeason() {
  return $serverNationalService_engagementLicenseControlSeason().engagementLicenseControlSeason(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-license-control-person.js#engagementLicenseControlPerson */
function engagementLicenseControlPerson() {
  return $serverNationalService_engagementLicenseControlPerson().engagementLicenseControlPerson(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-license-control-person.js#engagementLicenseReportRequest */
async function engagementLicenseReportRequest(input0, input1, input2) {
  return $serverNationalService_engagementLicenseControlPerson().engagementLicenseReportRequest(...arguments);
}

exports.prepareEngagementLicenseControlBatch = onCall(ENVIRONMENT.projectId === "livepalmes-test" ? ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS : { ...ENGAGEMENT_NOTIFICATION_PREVIEW_OPTIONS, timeoutSeconds: 300, secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD"), ...ENGAGEMENT_NOTIFICATION_MAIL_SECRETS] }, async (request) => {
  const startedAt = Date.now();
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Controle des licences reserve au niveau national.");
  if (ENVIRONMENT.sportingDataSource === "nap") {
    try {
      const pool = require("./nap-portal-pool").portalPool(process.env.LIVEPALMES_NAP_PASSWORD);
      if (request.data?.action) return await engagementLicenseReportRequest(request.data, context, pool);
      return await require("./engagement-license-reports").attach(db, await require("./nap-license-control").prepareBatch(pool, request.data || {}), require("./nap-license-reports").store(pool));
    }
    catch(error) { throw new HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable",error instanceof TypeError || error instanceof RangeError ? error.message : "Controle NAP indisponible."); }
  }
  const season = engagementLicenseControlSeason(request.data?.season);
  const competitionIds = Array.from(new Set((Array.isArray(request.data?.competitionIds) ? request.data.competitionIds : [])
    .map((id) => cleanText(id).slice(0, 128))
    .filter(Boolean))).slice(0, 5);
  if (!competitionIds.length) throw new HttpsError("invalid-argument", "Selectionnez au moins une competition.");

  const competitionSnapshots = await db.getAll(...competitionIds.map((id) => db.collection("engagementCompetitions").doc(id)));
  const competitions = competitionSnapshots.map((snapshot) => {
    if (!snapshot.exists) throw new HttpsError("not-found", "Une competition selectionnee est introuvable.");
    const item = engagementCompetitionDetailItem(snapshot);
    if (!item.date || item.date < season.startDate || item.date > season.endDate) {
      throw new HttpsError("failed-precondition", `La competition ${item.name || item.id} n'appartient pas a la saison ${season.label}.`);
    }
    return item;
  });

  const entrySnapshots = await Promise.all(competitionIds.map(async (competitionId) => {
    const snapshot = await db.collection("engagementClubEntries")
      .where("competitionId", "==", competitionId)
      .limit(501)
      .get();
    if (snapshot.size > 500) throw new HttpsError("resource-exhausted", "Trop de clubs engages pour preparer ce lot en une fois.");
    return snapshot;
  }));
  const competitionById = new Map(competitions.map((competition) => [competition.id, competition]));
  const peopleById = new Map();
  entrySnapshots.forEach((snapshot) => snapshot.docs.forEach((doc) => {
    const entry = engagementClubEntryItem(doc);
    if (entry.status === "deleted") return;
    const competition = competitionById.get(entry.competitionId);
    (entry.swimmers || []).forEach((swimmer) => {
      const person = engagementLicenseControlPerson(swimmer, entry, competition ? [competition] : []);
      if (!person.livePalmesId || !person.firstName || !person.lastName || !person.birthDate) return;
      const existing = peopleById.get(person.livePalmesId);
      if (!existing) {
        peopleById.set(person.livePalmesId, person);
        return;
      }
      const sources = new Map(existing.competitionIds.map((id, index) => [id, existing.competitions[index] || id]));
      person.competitionIds.forEach((id, index) => sources.set(id, person.competitions[index] || id));
      existing.competitionIds = Array.from(sources.keys());
      existing.competitions = Array.from(sources.values());
      if (!existing.licenseNumber && person.licenseNumber) existing.licenseNumber = person.licenseNumber;
    });
  }));
  if (peopleById.size > 800) throw new HttpsError("resource-exhausted", "Le lot depasse 800 nageurs. Selectionnez moins de competitions.");

  const people = Array.from(peopleById.values());
  const licenseSnapshots = people.length
    ? await db.getAll(...people.map((person) => db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId({ swimmerIndexId: person.swimmerIndexId }))))
    : [];
  const licenseBySwimmerId = new Map(licenseSnapshots.filter((snapshot) => snapshot.exists)
    .map((snapshot) => {
      const license = engagementSwimmerLicenseItem(snapshot);
      return [license.swimmerIndexId, license];
    }));
  people.forEach((person) => {
    const license = licenseBySwimmerId.get(person.swimmerIndexId);
    const seasonRecord = license?.licenseSeasons?.[season.label] || {};
    person.licenseNumber = cleanText(license?.licenseNumber || person.licenseNumber).toUpperCase().slice(0, 60);
    person.seasonStatus = cleanEngagementLicenseSeasonStatus(seasonRecord.status, "to_check");
    person.validatedAt = cleanText(seasonRecord.validatedAt || seasonRecord.updatedAt).slice(0, 40);
    person.validationSource = cleanText(seasonRecord.source).slice(0, 40);
    person.federalValidityEndDate = cleanIsoDate(seasonRecord.federalValidityEndDate);
  });
  people.sort((left, right) => left.lastName.localeCompare(right.lastName, "fr") || left.firstName.localeCompare(right.firstName, "fr"));
  const batchId = `licences-${season.label}-${stableHash(`${Date.now()}|${competitionIds.join("|")}`).slice(0, 10)}`;
  return {
    ok: true,
    batchId,
    season,
    competitions: competitions.map((competition) => ({ id: competition.id, name: competition.name, date: competition.date })),
    people,
    readStats: portalReadStats("prepareEngagementLicenseControlBatch", startedAt, {
      baseDocuments: competitionIds.length,
      variableDocumentsMax: competitionIds.length * 501 + people.length,
      cacheHit: false
    })
  };
});

exports.validateEngagementSwimmerLicenses = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/validate-engagement-swimmer-licenses.js#validateEngagementSwimmerLicenses#arrow */ async (request) => {
  return $portalClubHandlers_validateEngagementSwimmerLicenses().validateEngagementSwimmerLicenses(request);
});

/* extracted-function: functions/backend/server-national-service/engagement-swimmer-identity-snapshot.js#engagementSwimmerIdentitySnapshot */
function engagementSwimmerIdentitySnapshot() {
  return $serverNationalService_engagementSwimmerIdentitySnapshot().engagementSwimmerIdentitySnapshot(...arguments);
}

/* extracted-function: functions/backend/server-national-service/clean-engagement-swimmer-identity-correction.js#cleanEngagementSwimmerIdentityCorrection */
function cleanEngagementSwimmerIdentityCorrection() {
  return $serverNationalService_cleanEngagementSwimmerIdentityCorrection().cleanEngagementSwimmerIdentityCorrection(...arguments);
}

/* extracted-function: functions/backend/server-national-service/find-engagement-swimmer-correction-license.js#findPerformanceSwimmerCorrectionTarget */
async function findPerformanceSwimmerCorrectionTarget(input0) {
  return $serverNationalService_findEngagementSwimmerCorrectionLicense().findPerformanceSwimmerCorrectionTarget(...arguments);
}

/* extracted-function: functions/backend/server-national-service/find-engagement-swimmer-correction-license.js#findEngagementSwimmerCorrectionLicense */
async function findEngagementSwimmerCorrectionLicense(input0) {
  return $serverNationalService_findEngagementSwimmerCorrectionLicense().findEngagementSwimmerCorrectionLicense(...arguments);
}

/* extracted-function: functions/backend/server-national-service/find-engagement-swimmer-correction-license.js#getEngagementSwimmerCorrectionTarget */
async function getEngagementSwimmerCorrectionTarget(input0) {
  return $serverNationalService_findEngagementSwimmerCorrectionLicense().getEngagementSwimmerCorrectionTarget(...arguments);
}

/* extracted-function: functions/backend/server-national-service/apply-engagement-swimmer-identity-correction.js#assertNoEngagementSwimmerIdentityConflict */
async function assertNoEngagementSwimmerIdentityConflict(input0) {
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection().assertNoEngagementSwimmerIdentityConflict(...arguments);
}

/* extracted-function: functions/backend/server-national-service/apply-engagement-swimmer-identity-correction.js#engagementEntrySwimmerCorrectionResult */
function engagementEntrySwimmerCorrectionResult() {
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection().engagementEntrySwimmerCorrectionResult(...arguments);
}

/* extracted-function: functions/backend/server-national-service/apply-engagement-swimmer-identity-correction.js#engagementEntryRelayCorrectionResult */
function engagementEntryRelayCorrectionResult() {
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection().engagementEntryRelayCorrectionResult(...arguments);
}

/* extracted-function: functions/backend/server-national-service/apply-engagement-swimmer-identity-correction.js#updateEngagementEntriesForSwimmerCorrection */
async function updateEngagementEntriesForSwimmerCorrection(input0) {
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection().updateEngagementEntriesForSwimmerCorrection(...arguments);
}

/* extracted-function: functions/backend/server-national-service/set-engagement-swimmer-change-request-roster-state.js#setEngagementSwimmerChangeRequestRosterState */
function setEngagementSwimmerChangeRequestRosterState(input0) {
  return $serverNationalService_setEngagementSwimmerChangeRequestRosterState().setEngagementSwimmerChangeRequestRosterState(...arguments);
}

/* extracted-function: functions/backend/server-national-service/apply-engagement-swimmer-identity-correction.js#applyEngagementSwimmerIdentityCorrection */
async function applyEngagementSwimmerIdentityCorrection() {
  return $serverNationalService_applyEngagementSwimmerIdentityCorrection().applyEngagementSwimmerIdentityCorrection(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-swimmer-change-request-item.js#engagementSwimmerChangeRequestItem */
function engagementSwimmerChangeRequestItem(input0) {
  return $serverNationalService_engagementSwimmerChangeRequestItem().engagementSwimmerChangeRequestItem(...arguments);
}

/* extracted-function: functions/backend/server-national-service/send-engagement-swimmer-change-resolution-notification.js#sendEngagementSwimmerChangeResolutionNotification */
async function sendEngagementSwimmerChangeResolutionNotification() {
  return $serverNationalService_sendEngagementSwimmerChangeResolutionNotification().sendEngagementSwimmerChangeResolutionNotification(...arguments);
}

exports.requestEngagementClubSwimmerChange = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/request-engagement-club-swimmer-change.js#requestEngagementClubSwimmerChange#arrow */ async (request) => {
  return $portalNationalHandlers_requestEngagementClubSwimmerChange().requestEngagementClubSwimmerChange(request);
});

exports.listEngagementSwimmerChangeRequests = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-national-handlers/list-engagement-swimmer-change-requests.js#listEngagementSwimmerChangeRequests#arrow */ async (request) => {
  return $portalNationalHandlers_listEngagementSwimmerChangeRequests().listEngagementSwimmerChangeRequests(request);
});

/* extracted-function: functions/backend/server-national-service/engagement-national-administration-pending-counts.js#engagementNationalAdministrationPendingCounts */
async function engagementNationalAdministrationPendingCounts() {
  return $serverNationalService_engagementNationalAdministrationPendingCounts().engagementNationalAdministrationPendingCounts(...arguments);
}

exports.getEngagementNationalAdministrationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  return {
    ok: true,
    counts: await engagementNationalAdministrationPendingCounts()
  };
});

exports.listEngagementNationalClubs = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/list-engagement-national-clubs.js#listEngagementNationalClubs#arrow */ async (request) => {
  return $portalNationalHandlers_listEngagementNationalClubs().listEngagementNationalClubs(request);
});

exports.getPublicEngagementClubDirectory = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/get-public-engagement-club-directory.js#getPublicEngagementClubDirectory#arrow */ async () => {
  return $portalClubHandlers_getPublicEngagementClubDirectory().getPublicEngagementClubDirectory();
});

exports.saveEngagementNationalClub = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/save-engagement-national-club.js#saveEngagementNationalClub#arrow */ async (request) => {
  return $portalNationalHandlers_saveEngagementNationalClub().saveEngagementNationalClub(request);
});

exports.deleteEngagementNationalClub = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/delete-engagement-national-club.js#deleteEngagementNationalClub#arrow */ async (request) => {
  return $portalNationalHandlers_deleteEngagementNationalClub().deleteEngagementNationalClub(request);
});

exports.getPortalPendingRequestOverview = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-competition-handlers/get-portal-pending-request-overview.js#getPortalPendingRequestOverview#arrow */ async (request) => {
  return $portalCompetitionHandlers_getPortalPendingRequestOverview().getPortalPendingRequestOverview(request);
});

exports.resolveEngagementSwimmerChangeRequest = onCall(ENVIRONMENT.sportingDataSource === "nap"
  ? { ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] }
  : ENGAGEMENT_SWIMMER_CORRECTION_MAIL_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  const resolutionNote = cleanText(request.data?.resolutionNote).slice(0, 500);
  if (!requestId || !["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Demande et decision requises.");
  }
  const ref = db.collection(ENGAGEMENT_SWIMMER_CHANGE_REQUESTS_COLLECTION).doc(requestId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Demande de correction introuvable.");
  const data = snapshot.data() || {};
  if (ENVIRONMENT.sportingDataSource === "nap") {
    if (data.reportType === "duplicate") {
      // Close the report only. Merging remains a separate national operation.
      if (request.data?.proposed !== undefined) throw new HttpsError("invalid-argument", "Un signalement ne corrige pas l'identite.");
      if (!resolutionNote) throw new HttpsError("invalid-argument", "Expliquez le traitement du signalement avant de le clore.");
      const now = new Date().toISOString();
      const result = { reportOnly: true, identityChanged: false, merged: false };
      await db.runTransaction(async transaction => {
        const latest = await transaction.get(ref), current = latest.data() || {};
        if (!latest.exists || current.reportType !== "duplicate" || current.requestedAt !== data.requestedAt || current.expectedFingerprint !== data.expectedFingerprint) throw new HttpsError("failed-precondition", "Le signalement a change. Rechargez les demandes.");
        if (current.status !== "pending") {
          if (current.status === decision && current.resolvedBy === context.uid && current.resolutionNote === resolutionNote) return;
          throw new HttpsError("failed-precondition", "Signalement deja traite.");
        }
        transaction.set(ref, { status: decision, resolutionNote, resolvedAt: now, resolvedBy: context.uid,
          updatedAt: now, updatedBy: context.uid, result,
          resolutionNotification: { status: "skipped", reason: "report-only-no-email" } }, { merge: true });
      }, { maxAttempts: 3 });
      await writeAuditLogOnce("nap.swimmer.duplicateReportClosed", context.uid, { requestId, swimmerId: data.targetSwimmerId, clubId: data.clubId, decision }, stableHash([requestId, data.requestedAt, decision, context.uid, resolutionNote].join("|")));
      return { ok: true, request: engagementSwimmerChangeRequestItem(await ref.get()), result };
    }
    let nativeConnection, nativeLock, resolution, claimed = false, claimWasExisting = false, writeAttempted = false;
    try {
      const helper = data.requestType === "swimmer-ns" ? require("./nap-swimmer-ns") : data.requestType === "person-change" ? require("./nap-person-change-requests") : require("./nap-swimmer-change-requests");
      resolution = helper.prepareResolution(data, { ...request.data, decision, resolutionNote }, context.uid);
      if (data.status !== "pending") {
        if (data.status === decision && data.nativeResolution?.key === resolution.key) return { ok: true, request: engagementSwimmerChangeRequestItem(snapshot), result: data.result || {} };
        throw new HttpsError("failed-precondition", "Demande deja traitee.");
      }
      const nap = require("./nap-portal-swimmers");
      nativeConnection = await nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD).getConnection();
      const lockName = `lp-swimmer-request-${stableHash(requestId).slice(0, 40)}`;
      const [lockRows] = await nativeConnection.execute({ sql: "SELECT GET_LOCK(?,0) AS acquired", timeout: 10000 }, [lockName]);
      if (Number(lockRows[0]?.acquired) !== 1) throw new TypeError("Une decision est en cours. Rechargez les demandes avant de recommencer.");
      nativeLock = lockName;
      claimWasExisting = await db.runTransaction(async transaction => {
        const current = await transaction.get(ref), latest = current.data() || {};
        if (!current.exists || latest.status !== "pending" || latest.requestedAt !== data.requestedAt || latest.expectedFingerprint !== data.expectedFingerprint) throw new HttpsError("failed-precondition", "La demande a change. Rechargez-la.");
        if (latest.nativeResolution && latest.nativeResolution.key !== resolution.key) throw new HttpsError("failed-precondition", "Une decision est deja en cours. Reprenez la meme decision depuis le meme compte.");
        transaction.set(ref, { nativeResolution: { key: resolution.key, actorUid: context.uid, decision }, updatedAt: new Date().toISOString() }, { merge: true });
        return !!latest.nativeResolution;
      }, { maxAttempts: 3 });
      claimed = true;
      let result = null;
      if (decision === "approved") {
        const correctionConnection = { execute: async (query, values) => {
          const mutation = query.sql.startsWith("UPDATE nageurs SET ");
          if (mutation) writeAttempted = true;
          const response = await nativeConnection.execute(query, values);
          if (mutation && response[0]?.affectedRows === 0) writeAttempted = false;
          return response;
        } };
        if(data.requestType === "swimmer-ns") {
          result=await require("./nap-swimmer-ns").change(correctionConnection,{swimmerId:data.targetSwimmerId,expectedNsFingerprint:resolution.expectedFingerprint,nonSelectable:false},
            {uid:context.uid,clubId:String(data.clubId)},require("./nap-swimmer-ns-callables").audit({db,writeAuditLogOnce},context.uid),{nationalApproval:context.national===true});
        } else if(data.requestType === "person-change") {
          result=await require("./nap-club-person-edit").editNativePerson(nap.portalPool(process.env.LIVEPALMES_NAP_PASSWORD),{
            clubId:String(data.clubId),actorUid:context.uid,personId:data.targetSwimmerId,expectedFingerprint:resolution.expectedFingerprint,patch:resolution.proposed
          },{
            read:async operation=>{const before=await db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).get();return before.exists?before.data().target:null;},
            prepare:(operation,target)=>db.collection("auditLogs").doc(`nap-person-identity-${operation}-before`).create({action:"nap.person.identity.prepare",actorUid:context.uid,target,createdAt:new Date().toISOString()}),
            complete:(operation,target)=>writeAuditLogOnce("nap.person.identityCorrected",context.uid,{...target,auditPreparationId:`nap-person-identity-${operation}-before`},operation)
          },()=>{if(!context.national)throw new HttpsError("permission-denied","Visa national requis.");},{fillOnly:false,onWrite:value=>{writeAttempted=value;}});
        } else result = await nap.correctPortalIdentity(correctionConnection, {
          id: resolution.id, expectedFingerprint: resolution.expectedFingerprint, proposed: resolution.proposed,
          actorUid: context.uid, reason: resolution.reason
        }, {
          read: async operation => { const before = await db.collection("auditLogs").doc(`nap-identity-${operation}-before`).get(); return before.exists ? before.data().target : null; },
          prepare: (operation, target) => db.collection("auditLogs").doc(`nap-identity-${operation}-before`).create({ action: "nap.swimmer.identityCorrection.prepare", actorUid: context.uid, target, createdAt: new Date().toISOString() }),
          complete: (operation, target) => writeAuditLogOnce("nap.swimmer.identityCorrected", context.uid,{...target,auditPreparationId:`nap-identity-${operation}-before`}, operation)
        }, { prepare: async () => [], apply: async () => ({ entryUpdateCount: 0, relayUpdateCount: 0, oldLivepalmesLinksIgnored: true }) });
      }
      const now = new Date().toISOString();
      const completed = { ...data, status: decision, resolutionNote, resolvedAt: now, resolvedBy: context.uid,
        resolvedByEmail: context.email || "", updatedAt: now, updatedBy: context.uid,
        nativeResolution: { key: resolution.key, actorUid: context.uid, decision },
        ...(decision === "approved" ? { resolvedProposed: resolution.resolvedProposed, proposalAdjusted: resolution.proposalAdjusted } : {}), result: cleanFirestoreValue(result || {}) };
      await ref.set(cleanFirestoreValue(completed), { merge: false });
      // TEST has no automatic emails. The production notification below stays unchanged.
      const resolutionNotification = { status: "skipped", reason: "test-emails-disabled" };
      await ref.set({ resolutionNotification }, { merge: true });
      await writeAuditLogOnce(`nap.swimmer.change${decision === "approved" ? "Approved" : "Rejected"}`, context.uid,
        { requestId, swimmerId: data.targetSwimmerId, clubId: data.clubId, notificationStatus: resolutionNotification.status }, resolution.key);
      return { ok: true, request: engagementSwimmerChangeRequestItem({ id: requestId, data: () => ({ ...completed, resolutionNotification }) }), result };
    } catch (error) {
      // Before any SQL mutation, release a new claim so a stale/invalid request can be refused or reviewed.
      // An uncertain write or an existing retry remains bound to its exact decision.
      if (claimed && !claimWasExisting && !writeAttempted) {
        try {
          await db.runTransaction(async transaction => {
            const current = await transaction.get(ref), latest = current.data() || {};
            if (latest.status === "pending" && latest.nativeResolution?.key === resolution.key) transaction.set(ref, { nativeResolution: null }, { merge: true });
          }, { maxAttempts: 3 });
        } catch { /* Preserve the claim if its durable release is unavailable. */ }
      }
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(error instanceof TypeError ? "failed-precondition" : error instanceof RangeError ? "resource-exhausted" : "unavailable", error instanceof TypeError || error instanceof RangeError ? error.message : "Decision a verifier. Rechargez les demandes ou reprenez exactement la meme decision ; sa sauvegarde est conservee.");
    } finally {
      if (nativeConnection) {
        try { if (nativeLock) await nativeConnection.execute({ sql: "SELECT RELEASE_LOCK(?) AS released", timeout: 10000 }, [nativeLock]); }
        catch { nativeConnection.destroy(); nativeConnection = null; }
        finally { if (nativeConnection) nativeConnection.release(); }
      }
    }
  }
  if (cleanText(data.status) !== "pending") throw new HttpsError("failed-precondition", "Demande deja traitee.");
  const target = await getEngagementSwimmerCorrectionTarget(
    db,
    data.requestedSource,
    data.requestedSwimmerId,
    data.current?.identityKey
  );
  const current = engagementSwimmerIdentitySnapshot(target.swimmer, target.source);
  const expected = engagementSwimmerIdentitySnapshot(data.current || {}, data.targetSource);
  const stale = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
    .some((field) => cleanText(current[field]) !== cleanText(expected[field]));
  if (decision === "approved" && stale) {
    throw new HttpsError("failed-precondition", "La fiche a change depuis la demande. Rechargez-la avant de valider.");
  }
  const now = new Date().toISOString();
  let result = null;
  let requestedCorrection = null;
  let resolvedProposed = null;
  let proposalAdjusted = false;
  if (decision === "approved") {
    requestedCorrection = cleanEngagementSwimmerIdentityCorrection(data.proposed || {}, current);
    const reviewedProposal = request.data?.proposed && typeof request.data.proposed === "object" && !Array.isArray(request.data.proposed)
      ? request.data.proposed
      : data.proposed || {};
    const correction = cleanEngagementSwimmerIdentityCorrection(reviewedProposal, current);
    proposalAdjusted = ["firstName", "lastName", "birthDate", "sex", "licenseNumber"]
      .some((field) => cleanText(correction[field]) !== cleanText(requestedCorrection[field]));
    resolvedProposed = engagementSwimmerIdentitySnapshot({ ...current, ...correction }, target.source);
    result = await applyEngagementSwimmerIdentityCorrection(target, correction, { ...context, now });
  } else {
    const batch = db.batch();
    setEngagementSwimmerChangeRequestRosterState(batch, { ...target, swimmer: current }, "rejected", requestId, now);
    await batch.commit();
  }
  await ref.set({
    status: decision,
    resolutionNote,
    resolvedAt: now,
    resolvedBy: context.uid,
    resolvedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid,
    ...(decision === "approved" ? { resolvedProposed, proposalAdjusted } : {}),
    result: cleanFirestoreValue(result || {})
  }, { merge: true });
  const resolutionNotification = await sendEngagementSwimmerChangeResolutionNotification({
    decision,
    requestedByEmail: data.requestedByEmail,
    requestedByFirstName: data.requestedByFirstName,
    requestedByLastName: data.requestedByLastName,
    swimmer: current,
    current,
    resolvedProposed: resolvedProposed || data.proposed || {},
    clubName: data.clubName,
    resolutionNote
  });
  await ref.set({
    resolutionNotification,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  await writeAuditLog(`engagementClubSwimmer.change${decision === "approved" ? "Approved" : "Rejected"}`, context.uid, {
    requestId,
    swimmerId: target.swimmerId,
    source: target.source,
    clubId: cleanText(data.clubId),
    reason: cleanText(data.reason),
    resolutionNote,
    requestedProposed: requestedCorrection || data.proposed || {},
    resolvedProposed: resolvedProposed || {},
    proposalAdjusted,
    notificationStatus: resolutionNotification.status,
    performanceUpdateCount: Number(result?.performanceUpdateCount || 0),
    entryUpdateCount: Number(result?.entryUpdateCount || 0),
    relayUpdateCount: Number(result?.relayUpdateCount || 0)
  });
  const updated = await ref.get();
  return { ok: true, request: engagementSwimmerChangeRequestItem(updated), result };
});

exports.updateEngagementNationalSwimmerIdentity = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-performance-handlers/update-engagement-national-swimmer-identity.js#updateEngagementNationalSwimmerIdentity#arrow */ async (request) => {
  return $portalPerformanceHandlers_updateEngagementNationalSwimmerIdentity().updateEngagementNationalSwimmerIdentity(request);
});

exports.setEngagementNationalClubSwimmerStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/set-engagement-national-club-swimmer-status.js#setEngagementNationalClubSwimmerStatus#arrow */ async (request) => {
  return $portalNationalHandlers_setEngagementNationalClubSwimmerStatus().setEngagementNationalClubSwimmerStatus(request);
});

/* extracted-function: functions/backend/server-national-service/delete-engagement-club-swimmer-permanently.js#engagementClubSwimmerDeletionUsage */
async function engagementClubSwimmerDeletionUsage(input0) {
  return $serverNationalService_deleteEngagementClubSwimmerPermanently().engagementClubSwimmerDeletionUsage(...arguments);
}

/* extracted-function: functions/backend/server-national-service/delete-engagement-club-swimmer-permanently.js#deleteEngagementClubSwimmerPermanently */
async function deleteEngagementClubSwimmerPermanently(input0, input1) {
  return $serverNationalService_deleteEngagementClubSwimmerPermanently().deleteEngagementClubSwimmerPermanently(...arguments);
}

exports.requestEngagementClubSwimmerDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementClubAccessContext(request);
  const swimmerId = cleanText(request.data?.swimmerId).slice(0, 80);
  if (!swimmerId) {
    throw new HttpsError("invalid-argument", "Nageur requis.");
  }
  const ref = db.collection("engagementClubSwimmers").doc(swimmerId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Seul un nageur cree depuis le portail peut etre supprime par son club.");
  }
  const swimmer = snapshot.data() || {};
  if (cleanText(swimmer.clubId) !== context.clubId) {
    throw new HttpsError("permission-denied", "Nageur hors perimetre club.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(swimmerId);
  const pendingRequest = await requestRef.get();
  if (pendingRequest.exists && cleanText(pendingRequest.data()?.status) === "pending") {
    throw new HttpsError("already-exists", "Une demande de retrait est deja en attente pour ce nageur.");
  }
  const usage = await engagementClubSwimmerDeletionUsage(swimmerId, swimmer, context);
  const blocked = usage.performanceMatchCount > 0 || usage.entryUsageCount > 0 || usage.entryScanTruncated;
  if (!blocked) {
    const deleted = await deleteEngagementClubSwimmerPermanently(ref, snapshot, context, "club-unused");
    return { ok: true, deleted: true, requested: false, usage, ...deleted };
  }
  const now = new Date().toISOString();
  const payload = {
    swimmerId,
    swimmerName: cleanText(swimmer.name).slice(0, 160) || [cleanText(swimmer.lastName), cleanText(swimmer.firstName)].filter(Boolean).join(" "),
    firstName: cleanText(swimmer.firstName).slice(0, 80),
    lastName: cleanText(swimmer.lastName).slice(0, 80),
    birthDate: cleanIsoDate(swimmer.birthDate),
    licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
    clubId: context.clubId,
    clubName: context.clubName,
    regionId: context.regionId,
    status: "pending",
    ...usage,
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const batch = db.batch();
  batch.set(ref, {
    active: false,
    status: "deletion-pending",
    deletionRequestStatus: "pending",
    disabledAt: now,
    disabledBy: context.uid,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
  batch.set(requestRef, payload, { merge: false });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deletionRequested", context.uid, {
    swimmerId,
    clubId: context.clubId,
    performanceMatchCount: usage.performanceMatchCount,
    entryUsageCount: usage.entryUsageCount,
    entryScanTruncated: usage.entryScanTruncated
  });
  return { ok: true, deleted: false, requested: true, usage };
});

exports.deleteEngagementNationalClubSwimmer = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/delete-engagement-national-club-swimmer.js#deleteEngagementNationalClubSwimmer#arrow */ async (request) => {
  return $portalNationalHandlers_deleteEngagementNationalClubSwimmer().deleteEngagementNationalClubSwimmer(request);
});

exports.listEngagementSwimmerDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db.collection("engagementSwimmerDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();
  const requests = snapshot.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      requestType: "swimmer",
      swimmerId: cleanText(data.swimmerId || doc.id).slice(0, 80),
      swimmerName: cleanText(data.swimmerName).slice(0, 160),
      firstName: cleanText(data.firstName).slice(0, 80),
      lastName: cleanText(data.lastName).slice(0, 80),
      birthDate: cleanIsoDate(data.birthDate),
      licenseNumber: cleanText(data.licenseNumber).slice(0, 60),
      clubId: cleanText(data.clubId).slice(0, 40),
      clubName: cleanText(data.clubName).slice(0, 140),
      regionId: cleanText(data.regionId).slice(0, 80),
      performanceMatchCount: Math.max(0, Math.trunc(Number(data.performanceMatchCount) || 0)),
      entryUsageCount: Math.max(0, Math.trunc(Number(data.entryUsageCount) || 0)),
      competitionIds: (Array.isArray(data.competitionIds) ? data.competitionIds : []).map((value) => cleanText(value).slice(0, 128)).filter(Boolean).slice(0, 25),
      entryScanTruncated: data.entryScanTruncated === true,
      status: cleanText(data.status),
      requestedAt: cleanText(data.requestedAt),
      requestedBy: cleanText(data.requestedBy),
      requestedByEmail: cleanText(data.requestedByEmail)
    };
  }).sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));
  return { ok: true, status, requests };
});

exports.resolveEngagementSwimmerDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne suppression Firebase est desactivee. Utilisez la gestion NAP de la fiche.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 80);
  const decision = cleanText(request.data?.decision);
  if (!requestId) throw new HttpsError("invalid-argument", "Demande requise.");
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }
  const requestRef = db.collection("engagementSwimmerDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) throw new HttpsError("not-found", "Demande de retrait introuvable.");
  const deletionRequest = requestSnapshot.data() || {};
  if (cleanText(deletionRequest.status) !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }
  const swimmerId = cleanText(deletionRequest.swimmerId || requestId).slice(0, 80);
  const swimmerRef = db.collection("engagementClubSwimmers").doc(swimmerId);
  const swimmerSnapshot = await swimmerRef.get();
  const swimmer = swimmerSnapshot.exists ? swimmerSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (swimmerSnapshot.exists) {
    if (decision === "rejected") {
      batch.set(swimmerRef, {
        active: true,
        status: "active",
        deletionRequestStatus: "rejected",
        reactivatedAt: now,
        reactivatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      upsertEngagementClubRosterSwimmer(batch, db, { ...swimmer, active: true, status: "active", id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    } else {
      batch.set(swimmerRef, {
        active: false,
        status: "inactive",
        deletionRequestStatus: "approved",
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
      deleteEngagementClubRosterSwimmer(batch, db, { ...swimmer, id: swimmerId, swimmerIndexId: swimmerId, source: "engagement" }, now);
    }
  }
  batch.set(requestRef, {
    status: decision,
    decidedAt: now,
    decidedBy: context.uid,
    decidedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await batch.commit();
  await writeAuditLog("engagementClubSwimmer.deletionRequestResolved", context.uid, {
    requestId,
    swimmerId,
    decision,
    clubId: cleanText(deletionRequest.clubId).slice(0, 40),
    performanceMatchCount: Math.max(0, Math.trunc(Number(deletionRequest.performanceMatchCount) || 0)),
    entryUsageCount: Math.max(0, Math.trunc(Number(deletionRequest.entryUsageCount) || 0))
  });
  return { ok: true, requestId, swimmerId, decision, swimmerActive: decision === "rejected" };
});

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-collection-for-source.js#engagementNationalSwimmerCollectionForSource */
function engagementNationalSwimmerCollectionForSource(input0) {
  return $serverNationalService_engagementNationalSwimmerCollectionForSource().engagementNationalSwimmerCollectionForSource(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-item-from-doc.js#engagementNationalSwimmerItemFromDoc */
function engagementNationalSwimmerItemFromDoc(input0) {
  return $serverNationalService_engagementNationalSwimmerItemFromDoc().engagementNationalSwimmerItemFromDoc(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-collection-for-source.js#materializeEngagementNationalPerformanceSwimmerForMerge */
async function materializeEngagementNationalPerformanceSwimmerForMerge() {
  return $serverNationalService_engagementNationalSwimmerCollectionForSource().materializeEngagementNationalPerformanceSwimmerForMerge(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-collection-for-source.js#getEngagementNationalSwimmerForMerge */
async function getEngagementNationalSwimmerForMerge(input0) {
  return $serverNationalService_engagementNationalSwimmerCollectionForSource().getEngagementNationalSwimmerForMerge(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-full-name.js#engagementNationalSwimmerFullName */
function engagementNationalSwimmerFullName() {
  return $serverNationalService_engagementNationalSwimmerFullName().engagementNationalSwimmerFullName(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#engagementNationalSwimmerEntrySnapshot */
function engagementNationalSwimmerEntrySnapshot() {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().engagementNationalSwimmerEntrySnapshot(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#mergeEngagementEntryIndividualEntries */
function mergeEngagementEntryIndividualEntries() {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().mergeEngagementEntryIndividualEntries(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#mergeEngagementClubEntrySwimmers */
function mergeEngagementClubEntrySwimmers() {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().mergeEngagementClubEntrySwimmers(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#mergeEngagementClubEntryRelays */
function mergeEngagementClubEntryRelays() {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().mergeEngagementClubEntryRelays(...arguments);
}

/* extracted-function: functions/backend/server-national-service/search-engagement-national-swimmer-merge-target-docs.js#searchEngagementNationalSwimmerMergeTargetDocs */
async function searchEngagementNationalSwimmerMergeTargetDocs(input0) {
  return $serverNationalService_searchEngagementNationalSwimmerMergeTargetDocs().searchEngagementNationalSwimmerMergeTargetDocs(...arguments);
}

exports.searchEngagementNationalSwimmerMergeTargets = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/search-engagement-national-swimmer-merge-targets.js#searchEngagementNationalSwimmerMergeTargets#arrow */ async (request) => {
  return $portalNationalHandlers_searchEngagementNationalSwimmerMergeTargets().searchEngagementNationalSwimmerMergeTargets(request);
});

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#performanceMergeTargetPayloadFromSwimmer */
function performanceMergeTargetPayloadFromSwimmer() {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().performanceMergeTargetPayloadFromSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-national-service/active-performance-rows-for-national-swimmer.js#publicPerformanceRowsFromSwimmerPayload */
function publicPerformanceRowsFromSwimmerPayload() {
  return $serverNationalService_activePerformanceRowsForNationalSwimmer().publicPerformanceRowsFromSwimmerPayload(...arguments);
}

/* extracted-function: functions/backend/server-national-service/active-performance-rows-for-national-swimmer.js#publishEngagementNationalSwimmerMerge */
async function publishEngagementNationalSwimmerMerge() {
  return $serverNationalService_activePerformanceRowsForNationalSwimmer().publishEngagementNationalSwimmerMerge(...arguments);
}

/* extracted-function: functions/backend/server-national-service/active-performance-rows-for-national-swimmer.js#activePerformanceRowsForNationalSwimmer */
async function activePerformanceRowsForNationalSwimmer() {
  return $serverNationalService_activePerformanceRowsForNationalSwimmer().activePerformanceRowsForNationalSwimmer(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-national-swimmer-entry-snapshot.js#readPerformanceDocsForNationalSwimmerMerge */
async function readPerformanceDocsForNationalSwimmerMerge(input0) {
  return $serverNationalService_engagementNationalSwimmerEntrySnapshot().readPerformanceDocsForNationalSwimmerMerge(...arguments);
}

exports.mergeEngagementNationalClubSwimmer = onCall({ ...ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-performance-handlers/merge-engagement-national-club-swimmer.js#mergeEngagementNationalClubSwimmer#arrow */ async (request) => {
  return $portalPerformanceHandlers_mergeEngagementNationalClubSwimmer().mergeEngagementNationalClubSwimmer(request);
});

exports.repairEngagementNationalSwimmerMergePublication = onCall(ENGAGEMENT_SWIMMER_CORRECTION_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) throw new HttpsError("permission-denied", "Reparation reservee au niveau national.");
  if(ENVIRONMENT.sportingDataSource==="nap")throw new HttpsError("failed-precondition","Les fiches NAP sont lues directement. Utilisez Finaliser la fusion depuis la fiche fusionnee.");
  const sourceSwimmerId = cleanText(request.data?.sourceSwimmerId).slice(0, 80);
  const sourceSource = cleanText(request.data?.sourceSource || "performances").slice(0, 40);
  const sourceIdentityKey = cleanText(request.data?.sourceIdentityKey).slice(0, 180);
  if (!sourceSwimmerId) throw new HttpsError("invalid-argument", "Fiche fusionnee requise.");
  const source = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSource,
    sourceSwimmerId,
    sourceIdentityKey,
    { uid: context.uid, now: new Date().toISOString() }
  );
  const sourceSwimmer = source.swimmer;
  if (cleanText(sourceSwimmer.status) !== "merged" || !cleanText(sourceSwimmer.mergedIntoId)) {
    throw new HttpsError("failed-precondition", "Cette fiche n'est pas marquee comme fusionnee.");
  }
  const target = await getEngagementNationalSwimmerForMerge(
    db,
    sourceSwimmer.mergedIntoSource || "performances",
    sourceSwimmer.mergedIntoId,
    "",
    { uid: context.uid, now: new Date().toISOString() }
  );
  const targetRows = await activePerformanceRowsForNationalSwimmer(target);
  const publicSnapshot = await publishEngagementNationalSwimmerMerge(
    sourceSwimmer,
    target.swimmer,
    targetRows,
    { now: new Date().toISOString() }
  );
  await writeAuditLog("engagementClubSwimmer.mergePublicationRepaired", context.uid, {
    sourceSwimmerId: source.ref.id,
    targetSwimmerId: target.ref.id,
    affectedRows: targetRows.length,
    writtenFiles: Number(publicSnapshot.writtenFiles || 0),
    correctedTopBuckets: Number(publicSnapshot.correctedTopBuckets || 0)
  });
  return { ok: true, publicSnapshot };
});

exports.listEngagementNationalClubPeople = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/list-engagement-national-club-people.js#listEngagementNationalClubPeople#arrow */ async (request) => {
  return $portalNationalHandlers_listEngagementNationalClubPeople().listEngagementNationalClubPeople(request);
});

exports.setEngagementNationalClubPersonStatus = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/set-engagement-national-club-person-status.js#setEngagementNationalClubPersonStatus#arrow */ async (request) => {
  return $portalNationalHandlers_setEngagementNationalClubPersonStatus().setEngagementNationalClubPersonStatus(request);
});

exports.deleteEngagementNationalClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/delete-engagement-national-club-person.js#deleteEngagementNationalClubPerson#arrow */ async (request) => {
  return $portalNationalHandlers_deleteEngagementNationalClubPerson().deleteEngagementNationalClubPerson(request);
});

exports.listEngagementNationalAuditLogs = onCall(CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-national-handlers/list-engagement-national-audit-logs.js#listEngagementNationalAuditLogs#arrow */ async (request) => {
  return $portalNationalHandlers_listEngagementNationalAuditLogs().listEngagementNationalAuditLogs(request);
});

/* extracted-function: functions/backend/server-national-service/engagement-club-person-entry-snapshot.js#engagementClubPersonEntrySnapshot */
function engagementClubPersonEntrySnapshot() {
  return $serverNationalService_engagementClubPersonEntrySnapshot().engagementClubPersonEntrySnapshot(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-club-person-entry-snapshot.js#engagementClubPersonFullName */
function engagementClubPersonFullName() {
  return $serverNationalService_engagementClubPersonEntrySnapshot().engagementClubPersonFullName(...arguments);
}

/* extracted-function: functions/backend/server-national-service/engagement-club-person-entry-snapshot.js#mergeEngagementClubEntryOfficials */
function mergeEngagementClubEntryOfficials() {
  return $serverNationalService_engagementClubPersonEntrySnapshot().mergeEngagementClubEntryOfficials(...arguments);
}

exports.mergeEngagementNationalClubPerson = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-national-handlers/merge-engagement-national-club-person.js#mergeEngagementNationalClubPerson#arrow */ async (request) => {
  return $portalNationalHandlers_mergeEngagementNationalClubPerson().mergeEngagementNationalClubPerson(request);
});



/* extracted-function: functions/backend/server-entry-service/build-engagement-club-swimmers-from-request.js#buildEngagementClubSwimmersFromRequest */
async function buildEngagementClubSwimmersFromRequest() {
  return $serverEntryService_buildEngagementClubSwimmersFromRequest().buildEngagementClubSwimmersFromRequest(...arguments);
}

/* extracted-function: functions/backend/server-entry-service/engagement-entry-time-stats.js#engagementEntryTimeStats */
function engagementEntryTimeStats() {
  return $serverEntryService_engagementEntryTimeStats().engagementEntryTimeStats(...arguments);
}

exports.previewEngagementClubEntryTimes = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne saisie Firebase est desactivee. Utilisez les engagements NAP.");
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les courses.");
  }
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, { ...competition.data(), qualificationPreview: true });
  return {
    ok: true,
    swimmers,
    stats: engagementEntryTimeStats(swimmers)
  };
});

exports.getEngagementClubEntryTimeHistory = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/get-engagement-club-entry-time-history.js#getEngagementClubEntryTimeHistory#arrow */ async (request) => {
  return $portalClubHandlers_getEngagementClubEntryTimeHistory().getEngagementClubEntryTimeHistory(request);
});

/* extracted-function: functions/backend/server-entry-service/native-club-entry-time-history.js#nativeClubEntryTimeHistory */
async function nativeClubEntryTimeHistory(input0, input1, input2, input3) {
  return $serverEntryService_nativeClubEntryTimeHistory().nativeClubEntryTimeHistory(...arguments);
}

/* extracted-function: functions/backend/server-entry-service/preview-native-club-entry-times.js#previewNativeClubEntryTimes */
async function previewNativeClubEntryTimes(input0, input1, input2, input3) {
  return $serverEntryService_previewNativeClubEntryTimes().previewNativeClubEntryTimes(...arguments);
}

exports.previewEngagementClubSwimmerEventTimes = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/preview-engagement-club-swimmer-event-times.js#previewEngagementClubSwimmerEventTimes#arrow */ async (request) => {
  return $portalClubHandlers_previewEngagementClubSwimmerEventTimes().previewEngagementClubSwimmerEventTimes(request);
});

exports.previewEngagementClubSwimmerEventTimesBatch = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/preview-engagement-club-swimmer-event-times-batch.js#previewEngagementClubSwimmerEventTimesBatch#arrow */ async (request) => {
  return $portalClubHandlers_previewEngagementClubSwimmerEventTimesBatch().previewEngagementClubSwimmerEventTimesBatch(request);
});

/* extracted-function: functions/backend/server-entry-service/save-native-club-individual-entries.js#saveNativeClubIndividualEntries */
async function saveNativeClubIndividualEntries(input0, input1) {
  return $serverEntryService_saveNativeClubIndividualEntries().saveNativeClubIndividualEntries(...arguments);
}

exports.saveEngagementClubIndividualEntries = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-individual-entries.js#saveEngagementClubIndividualEntries#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubIndividualEntries().saveEngagementClubIndividualEntries(request);
});

/* extracted-function: functions/backend/server-entry-service/save-native-club-swimmer-selections.js#saveNativeClubSwimmerSelections */
async function saveNativeClubSwimmerSelections(input0, input1, input2) {
  return $serverEntryService_saveNativeClubSwimmerSelections().saveNativeClubSwimmerSelections(...arguments);
}

exports.saveEngagementClubSwimmerSelection = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-swimmer-selection.js#saveEngagementClubSwimmerSelection#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubSwimmerSelection().saveEngagementClubSwimmerSelection(request);
});

exports.saveEngagementClubSwimmerSelections = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-swimmer-selections.js#saveEngagementClubSwimmerSelections#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubSwimmerSelections().saveEngagementClubSwimmerSelections(request);
});

exports.saveEngagementClubSwimmers = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne saisie Firebase est desactivee. Utilisez les engagements NAP.");
  const context = await engagementClubAccessContext(request);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  if (!competitionId) {
    throw new HttpsError("invalid-argument", "Competition requise.");
  }
  const competition = await db.collection("engagementCompetitions").doc(competitionId).get();
  if (!competition.exists) {
    throw new HttpsError("not-found", "Competition d'engagements introuvable.");
  }
  assertEngagementClubWriteOpen(competition.data() || {});
  const entryRef = db.collection("engagementClubEntries").doc(engagementClubEntryId(competitionId, context.clubId));
  const entry = await entryRef.get();
  if (!entry.exists || !engagementTeamLeaderComplete(entry.data()?.teamLeader || {})) {
    throw new HttpsError("failed-precondition", "Chef d'equipe ou renonciation obligatoire avant les nageurs.");
  }

  const competitionData = { ...competition.data(), id: competition.id };
  const swimmers = await buildEngagementClubSwimmersFromRequest(request.data || {}, context, competitionData);
  assertEngagementSwimmerRoleCompatibility(entry.data() || {}, swimmers);

  const now = new Date().toISOString();
  const relays = qualificationRelaysAfterIndividualChange(entry.data()?.relays || [], swimmers, competitionData);
  await db.runTransaction(async (batch) => {
  const currentCompetition = await batch.get(competition.ref);
  const currentEntry = await batch.get(entryRef);
  assertEngagementClubWriteOpen(currentCompetition.data() || {});
  if (currentCompetition.updateTime.toMillis() !== competition.updateTime.toMillis() || currentEntry.updateTime.toMillis() !== entry.updateTime.toMillis()) throw new HttpsError("aborted", "La fiche a changé. Rechargez-la.");
  qualificationService().revokeRemovedExceptions(batch, competitionId, currentEntry.data()?.swimmers || [], swimmers, context.uid);
  batch.set(entryRef, {
    swimmers,
    relays,
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  swimmers.forEach((swimmer) => {
    if (!swimmer.licenseNumber) return;
    if (!swimmer.licenseLocked && swimmer.source !== "reference") {
      const swimmerCollection = swimmer.source === "engagement" ? "engagementClubSwimmers" : PERFORMANCE_SWIMMERS_COLLECTION;
      const swimmerRef = db.collection(swimmerCollection).doc(swimmer.swimmerIndexId);
      batch.set(swimmerRef, {
        licenseNumber: cleanText(swimmer.licenseNumber).slice(0, 60),
        licenseVerificationStatus: cleanEngagementLicenseVerificationStatus(swimmer.licenseVerificationStatus, "pending"),
        licenseSeasonLabel: cleanText(swimmer.licenseSeasonLabel).slice(0, 20),
        licenseSeasonStatus: cleanEngagementLicenseSeasonStatus(swimmer.licenseSeasonStatus, "to_check"),
        licenseUpdatedAt: now,
        licenseUpdatedBy: context.uid,
        updatedAt: now,
        updatedBy: context.uid
      }, { merge: true });
    }
    if (!swimmer.licenseLocked) {
      const licenseRef = db.collection("engagementSwimmerLicenses").doc(engagementSwimmerLicenseId(swimmer));
      const licensePayload = {
        ...engagementSwimmerLicensePayload(swimmer, context, {
          type: "engagement",
          verificationSource: "club",
          competitionId,
          collectedAt: now
        }),
        updatedAt: now,
        updatedBy: context.uid
      };
      batch.set(licenseRef, licensePayload, { merge: true });
    }
    upsertEngagementClubRosterSwimmer(batch, db, swimmer, now);
  });
  });
  await writeAuditLog("engagementClubEntry.swimmersSaved", context.uid, {
    competitionId,
    clubId: context.clubId,
    swimmerCount: swimmers.length
  });
  const updatedEntryData = {
    ...(entry.data() || {}),
    swimmers,
    relays,
    updatedAt: now,
    updatedBy: context.uid
  };
  return {
    ok: true,
    entry: engagementClubEntryItem({
      id: entryRef.id,
      exists: true,
      data: () => updatedEntryData
    })
  };
});

/* extracted-function: functions/backend/server-entry-service/save-native-club-relays.js#saveNativeClubRelays */
async function saveNativeClubRelays(input0, input1) {
  return $serverEntryService_saveNativeClubRelays().saveNativeClubRelays(...arguments);
}

exports.saveEngagementClubRelays = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-club-handlers/save-engagement-club-relays.js#saveEngagementClubRelays#arrow */ async (request) => {
  return $portalClubHandlers_saveEngagementClubRelays().saveEngagementClubRelays(request);
});

exports.createEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/create-engagement-competition.js#createEngagementCompetition#arrow */ async (request) => {
  return $portalCompetitionHandlers_createEngagementCompetition().createEngagementCompetition(request);
});

exports.updateEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")], maxInstances:2, concurrency:4, timeoutSeconds:120 } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/update-engagement-competition.js#updateEngagementCompetition#arrow */ async (request) => {
  return $portalCompetitionHandlers_updateEngagementCompetition().updateEngagementCompetition(request);
});

exports.deleteEngagementCompetition = onCall({ ...CALLABLE_OPTIONS, ...(ENVIRONMENT.sportingDataSource === "nap" ? { secrets: [defineSecret("LIVEPALMES_NAP_PASSWORD")] } : {}) }, /* extracted-handler: functions/backend/portal-competition-handlers/delete-engagement-competition.js#deleteEngagementCompetition#arrow */ async (request) => {
  return $portalCompetitionHandlers_deleteEngagementCompetition().deleteEngagementCompetition(request);
});

exports.requestEngagementCompetitionDeletion = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const context = await engagementAccessContext(request);
  if (context.national) {
    throw new HttpsError("failed-precondition", "Un niveau national peut supprimer directement l'evenement.");
  }
  const calendarEventId = cleanText(request.data?.calendarEventId).slice(0, 128);
  const competitionId = cleanText(request.data?.competitionId).slice(0, 128);
  const eventId = calendarEventId || competitionId;
  const sourceType = calendarEventId ? "calendarEvent" : "competition";
  if (!eventId) {
    throw new HttpsError("invalid-argument", "Competition ou evenement requis.");
  }

  const collection = sourceType === "calendarEvent" ? ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
  const docRef = db.collection(collection).doc(eventId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Competition ou evenement introuvable.");
  }

  const eventData = snapshot.data() || {};
  assertCanManageEngagementCompetition(context, eventData);

  const now = new Date().toISOString();
  const payload = {
    sourceType,
    eventId,
    competitionId: sourceType === "competition" ? eventId : "",
    calendarEventId: sourceType === "calendarEvent" ? eventId : "",
    competitionName: eventData.name || "",
    competitionDate: eventData.date || "",
    competitionLevel: eventData.level || "",
    regionId: eventData.regionId || "",
    status: "pending",
    requestedAt: now,
    requestedBy: context.uid,
    requestedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  };
  const requestId = engagementDeletionRequestId(sourceType, eventId);
  await db.collection("engagementCompetitionDeletionRequests").doc(requestId).set(payload, { merge: true });
  await writeAuditLog("engagementCompetition.deletionRequested", context.uid, {
    sourceType,
    eventId,
    name: payload.competitionName,
    date: payload.competitionDate,
    regionId: payload.regionId,
    level: payload.competitionLevel
  });
  return {
    ok: true,
    requested: true,
    requestId
  };
});

exports.listEngagementCompetitionDeletionRequests = onCall(CALLABLE_OPTIONS, async (request) => {
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Lecture reservee au niveau national.");
  }
  const status = ["pending", "approved", "rejected"].includes(cleanText(request.data?.status))
    ? cleanText(request.data.status)
    : "pending";
  if (ENVIRONMENT.sportingDataSource === "nap") return { ok: true, source: "nap", status, requests: [] };
  const limit = Math.min(100, Math.max(10, Math.trunc(Number(request.data?.limit) || 50)));
  const snapshot = await db
    .collection("engagementCompetitionDeletionRequests")
    .where("status", "==", status)
    .limit(limit)
    .get();

  const requests = snapshot.docs
    .map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        sourceType: cleanText(data.sourceType) === "calendarEvent" ? "calendarEvent" : "competition",
        eventId: cleanText(data.eventId || data.calendarEventId || data.competitionId),
        competitionId: cleanText(data.competitionId),
        calendarEventId: cleanText(data.calendarEventId),
        competitionName: cleanText(data.competitionName),
        competitionDate: cleanText(data.competitionDate),
        competitionLevel: cleanText(data.competitionLevel),
        regionId: cleanText(data.regionId),
        status: cleanText(data.status),
        requestedAt: cleanText(data.requestedAt),
        requestedBy: cleanText(data.requestedBy),
        requestedByEmail: cleanText(data.requestedByEmail)
      };
    })
    .sort((left, right) => String(right.requestedAt || "").localeCompare(String(left.requestedAt || "")));

  return {
    ok: true,
    status,
    requests
  };
});

exports.resolveEngagementCompetitionDeletionRequest = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est desactivee : utilisez la fiche NAP.");
  const context = await engagementAccessContext(request);
  if (!context.national) {
    throw new HttpsError("permission-denied", "Validation reservee au niveau national.");
  }
  const requestId = cleanText(request.data?.requestId).slice(0, 128);
  const decision = cleanText(request.data?.decision);
  if (!requestId) {
    throw new HttpsError("invalid-argument", "Demande requise.");
  }
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpsError("invalid-argument", "Decision invalide.");
  }

  const requestRef = db.collection("engagementCompetitionDeletionRequests").doc(requestId);
  const requestSnapshot = await requestRef.get();
  if (!requestSnapshot.exists) {
    throw new HttpsError("not-found", "Demande de suppression introuvable.");
  }
  const deletionRequest = requestSnapshot.data() || {};
  if (deletionRequest.status && deletionRequest.status !== "pending") {
    throw new HttpsError("failed-precondition", "Demande deja traitee.");
  }

  const sourceType = cleanText(deletionRequest.sourceType) === "calendarEvent" ? "calendarEvent" : "competition";
  const eventId = cleanText(deletionRequest.eventId || deletionRequest.calendarEventId || deletionRequest.competitionId || requestId).slice(0, 128);
  const collection = sourceType === "calendarEvent" ? ENGAGEMENT_CALENDAR_EVENTS_COLLECTION : "engagementCompetitions";
  const eventRef = db.collection(collection).doc(eventId);
  const eventSnapshot = await eventRef.get();
  const eventData = eventSnapshot.exists ? eventSnapshot.data() || {} : {};
  const now = new Date().toISOString();
  const batch = db.batch();
  if (decision === "approved" && eventSnapshot.exists) {
    batch.delete(eventRef);
  }
  batch.set(requestRef, {
    status: decision,
    decidedAt: now,
    decidedBy: context.uid,
    decidedByEmail: context.email || "",
    updatedAt: now,
    updatedBy: context.uid
  }, { merge: true });
  await batch.commit();
  const documents = cleanCompetitionDocuments(eventData.clubDocuments || [], { includeUploader: true });
  const documentDeletionResults = decision === "approved" && eventSnapshot.exists
    ? await Promise.allSettled(documents.filter(hasManagedEngagementCompetitionDocumentStorage).map((document) =>
        storage.bucket(LIVEPALMES_STORAGE_BUCKET)
          .file(assertEngagementCompetitionDocumentPath(document.storagePath))
          .delete({ ignoreNotFound: true })
      ))
    : [];

  await writeAuditLog("engagementCompetition.deletionRequestResolved", context.uid, {
    requestId,
    decision,
    sourceType,
    eventId,
    name: eventData.name || deletionRequest.competitionName || "",
    date: eventData.date || deletionRequest.competitionDate || "",
    regionId: eventData.regionId || deletionRequest.regionId || "",
    level: eventData.level || deletionRequest.competitionLevel || "",
    documentCount: documents.length,
    documentDeleteErrorCount: documentDeletionResults.filter((result) => result.status === "rejected").length
  });
  return {
    ok: true,
    decision,
    competitionDeleted: decision === "approved" && eventSnapshot.exists,
    sourceType,
    eventId
  };
});

exports.previewCompetitionImport = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/preview-competition-import.js#previewCompetitionImport#arrow */ async (request) => {
  return $portalPerformanceHandlers_previewCompetitionImport().previewCompetitionImport(request);
});



/* extracted-function: functions/backend/server-performance-service/competition-import-public-snapshot-summary.js#competitionImportPublicSnapshotSummary */
function competitionImportPublicSnapshotSummary() {
  return $serverPerformanceService_competitionImportPublicSnapshotSummary().competitionImportPublicSnapshotSummary(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/publish-competition-import-outputs.js#publishCompetitionImportOutputs */
async function publishCompetitionImportOutputs() {
  return $serverPerformanceService_publishCompetitionImportOutputs().publishCompetitionImportOutputs(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/competition-import-performance-id.js#competitionImportPerformanceId */
function competitionImportPerformanceId(input0) {
  return $serverPerformanceService_competitionImportPerformanceId().competitionImportPerformanceId(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/competition-import-performance-id.js#stageCompetitionImportReplacement */
async function stageCompetitionImportReplacement() {
  return $serverPerformanceService_competitionImportPerformanceId().stageCompetitionImportReplacement(...arguments);
}

exports.createCompetitionImport = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/create-competition-import.js#createCompetitionImport#arrow */ async (request) => {
  return $portalPerformanceHandlers_createCompetitionImport().createCompetitionImport(request);
});

exports.resumeCompetitionImportPublication = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const claimedAt = new Date().toISOString();
  let importData = {};
  await db.runTransaction(async (transaction) => {
    const importSnapshot = await transaction.get(importRef);
    if (!importSnapshot.exists) {
      throw new HttpsError("not-found", "Import introuvable.");
    }
    importData = importSnapshot.data() || {};
    if (!canResumeImportPublication(importData, Date.parse(claimedAt))) {
      throw new HttpsError("failed-precondition", "Cet import ne necessite pas de reprise de publication.");
    }
    transaction.set(importRef, {
      publicationStatus: "publishing",
      publicationStartedAt: claimedAt,
      publicationUpdatedAt: claimedAt,
      publicationError: ""
    }, { merge: true });
  });

  let rawSnapshot = null;
  let normalizedPerformances = [];
  try {
    const expectedCount = Number(importData.performanceBaseCount || importData.summary?.importedPerformances || 0) || 0;
    if (!expectedCount || expectedCount > MAX_COMPETITION_IMPORT_PERFORMANCES) {
      throw new HttpsError("failed-precondition", "Volume de l'import incompatible avec la reprise automatique.");
    }
    rawSnapshot = await importRef.collection("performances").limit(expectedCount + 1).get();
    if (rawSnapshot.size !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Import incomplet : ${rawSnapshot.size} performance(s) stockee(s) sur ${expectedCount} attendue(s).`
      );
    }

    const rawPerformances = rawSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
    normalizedPerformances = normalizeLivePalmesImportPerformances(rawPerformances);
    if (normalizedPerformances.length !== expectedCount) {
      throw new HttpsError(
        "failed-precondition",
        `Reprise incomplete : ${normalizedPerformances.length} performance(s) normalisee(s) sur ${expectedCount} attendue(s).`
      );
    }
  } catch (error) {
    const failedAt = new Date().toISOString();
    await importRef.set({
      publicationStatus: "failed",
      publicationUpdatedAt: failedAt,
      publicationError: cleanText(error?.message || error).slice(0, 500)
    }, { merge: true });
    throw error;
  }

  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const publication = await publishCompetitionImportOutputs(normalizedPerformances, importRef, {
    importId,
    now
  });
  await writeAuditLog("performanceImport.publicationResumed", actorUid, {
    importId,
    actorEmail,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: competitionImportPublicSnapshotSummary(publication.publicSnapshot),
    publicFilesSnapshot: competitionImportPublicSnapshotSummary(publication.publicFilesSnapshot)
  });

  return {
    ok: publication.publicationStatus === "published",
    importId,
    performanceCount: normalizedPerformances.length,
    publicationStatus: publication.publicationStatus,
    publicSnapshot: publication.publicSnapshot,
    publicFilesSnapshot: publication.publicFilesSnapshot,
    readStats: {
      importDocuments: 1,
      performanceDocuments: rawSnapshot?.size || 0,
      maximumPerformanceDocuments: MAX_COMPETITION_IMPORT_PERFORMANCES,
      maximumPerformanceDocumentReads: MAX_COMPETITION_IMPORT_PERFORMANCES + 1
    }
  };
});

exports.listCompetitionImports = onCall(COMPETITION_IMPORT_CALLABLE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/list-competition-imports.js#listCompetitionImports#arrow */ async (request) => {
  return $portalPerformanceHandlers_listCompetitionImports().listCompetitionImports(request);
});

/* extracted-function: functions/backend/server-performance-service/mark-competition-import-deleted.js#markCompetitionImportDeleted */
async function markCompetitionImportDeleted(input0) {
  return $serverPerformanceService_markCompetitionImportDeleted().markCompetitionImportDeleted(...arguments);
}

exports.deleteCompetitionImport = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  const now = new Date().toISOString();
  const actorUid = request.auth.uid;
  const actorEmail = request.auth.token?.email || "";
  const result = await markCompetitionImportDeleted(importId, {
    now,
    actorUid,
    actorEmail
  });
  if (result.alreadyDeleted) return result;
  await touchDtnQualificationCacheState(result.affectedRows || [], {
    action: "performanceImport.deleted",
    now
  });

  let publicSnapshot = null;
  try {
    publicSnapshot = await saveAdditionalPerformanceDataSnapshot({
      ...(result.publishedSnapshot || {}),
      performances: (result.publishedSnapshot?.performances || [])
        .filter((row) => cleanText(row.importId) !== importId)
    });
  } catch (error) {
    console.error("Publication publique impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicSnapshot = {
      ok: false,
      error: error?.message || "Publication publique impossible."
    };
  }

  let publicFilesSnapshot = null;
  try {
    const deactivatedRows = deactivatedImportPerformanceRows(result.affectedRows);
    publicFilesSnapshot = await rebuildPublicPerformanceFilesForAffectedRows(deactivatedRows, {
      now,
      reason: "performanceImport.deleted",
      importId
    });
    await invalidateEngagementEntryTimeCachesForPerformanceRows(result.affectedRows || []);
  } catch (error) {
    console.error("Publication publique ciblee impossible apres suppression import", {
      importId,
      message: error?.message || String(error)
    });
    publicFilesSnapshot = {
      ok: false,
      error: error?.message || "Publication publique ciblee impossible."
    };
  }

  await writeAuditLog("performanceImport.deleted", actorUid, {
    importId,
    actorEmail,
    importPerformanceCount: result.importPerformanceCount,
    performanceBaseCount: result.performanceBaseCount,
    publicSnapshot,
    publicFilesSnapshot
  });

  const { affectedRows, publishedSnapshot, ...publicResult } = result;
  return {
    ...publicResult,
    publicSnapshot,
    publicFilesSnapshot
  };
});

exports.updateCompetitionImportRecordAlertDecision = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const importId = cleanText(request.data?.importId).slice(0, 160);
  const alertIndex = Number(request.data?.alertIndex);
  const status = cleanText(request.data?.status);
  const allowedStatuses = new Set(["pending", "accepted", "rejected"]);
  if (!importId) {
    throw new HttpsError("invalid-argument", "Import inconnu.");
  }
  if (!Number.isInteger(alertIndex) || alertIndex < 0) {
    throw new HttpsError("invalid-argument", "Alerte inconnue.");
  }
  if (!allowedStatuses.has(status)) {
    throw new HttpsError("invalid-argument", "Decision inconnue.");
  }

  const importRef = db.collection("performanceImports").doc(importId);
  const importDoc = await importRef.get();
  if (!importDoc.exists) {
    throw new HttpsError("not-found", "Import introuvable.");
  }
  const data = importDoc.data() || {};
  const recordAlerts = Array.isArray(data.recordAlerts) ? data.recordAlerts.slice() : [];
  if (!recordAlerts[alertIndex]) {
    throw new HttpsError("not-found", "Alerte introuvable.");
  }

  const now = new Date().toISOString();
  const updatedByName = await accessUserDisplayName(request.auth.uid, request.auth.token || {});
  const nextAlert = { ...recordAlerts[alertIndex] };
  if (status === "pending") {
    delete nextAlert.decision;
  } else {
    nextAlert.decision = {
      status,
      updatedAt: now,
      updatedBy: request.auth.uid,
      updatedByEmail: request.auth.token?.email || "",
      updatedByName
    };
  }
  recordAlerts[alertIndex] = cleanFirestoreValue(nextAlert);

  await importRef.set({
    recordAlerts,
    recordAlertDecisionUpdatedAt: now,
    updatedAt: now
  }, { merge: true });

  await writeAuditLog("performanceImport.recordAlertDecision", request.auth.uid, {
    importId,
    alertIndex,
    status,
    alert: {
      type: nextAlert.type || "",
      swimmer: nextAlert.swimmer || "",
      course: nextAlert.course || "",
      time: nextAlert.time || "",
      referenceTime: nextAlert.referenceTime || ""
    }
  });

  return {
    ok: true,
    importId,
    alertIndex,
    status,
    recordAlerts: recordAlerts.slice(0, 20)
  };
});

/* extracted-function: functions/backend/server-performance-service/performance-public-key.js#performancePublicKey */
function performancePublicKey() {
  return $serverPerformanceService_performancePublicKey().performancePublicKey(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/performance-base-doc-id.js#performanceBaseDocId */
function performanceBaseDocId() {
  return $serverPerformanceService_performanceBaseDocId().performanceBaseDocId(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/competition-import-public-snapshot-summary.js#normalizeLivePalmesImportPerformances */
function normalizeLivePalmesImportPerformances() {
  return $serverPerformanceService_competitionImportPublicSnapshotSummary().normalizeLivePalmesImportPerformances(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/clean-performance-base-row.js#cleanPerformanceBaseRow */
function cleanPerformanceBaseRow() {
  return $serverPerformanceService_cleanPerformanceBaseRow().cleanPerformanceBaseRow(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/clean-performance-base-row.js#writePerformanceBaseRows */
async function writePerformanceBaseRows() {
  return $serverPerformanceService_cleanPerformanceBaseRow().writePerformanceBaseRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/public-performance-base-row.js#publicPerformanceBaseRow */
function publicPerformanceBaseRow() {
  return $serverPerformanceService_publicPerformanceBaseRow().publicPerformanceBaseRow(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/unique-public-performance-rows.js#uniquePublicPerformanceRows */
function uniquePublicPerformanceRows() {
  return $serverPerformanceService_uniquePublicPerformanceRows().uniquePublicPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/public-swimmer-key.js#publicSwimmerKey */
function publicSwimmerKey() {
  return $serverPerformanceService_publicSwimmerKey().publicSwimmerKey(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/public-better-performance.js#publicBetterPerformance */
function publicBetterPerformance(input0, input1) {
  return $serverPerformanceService_publicBetterPerformance().publicBetterPerformance(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#publicTopIndexRow */
function publicTopIndexRow() {
  return $serverPerformanceService_bestTopRows().publicTopIndexRow(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#performanceTopBucketKey */
function performanceTopBucketKey() {
  return $serverPerformanceService_bestTopRows().performanceTopBucketKey(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#performanceTopBucketId */
function performanceTopBucketId(input0) {
  return $serverPerformanceService_bestTopRows().performanceTopBucketId(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#performanceTopBucketVariants */
function performanceTopBucketVariants() {
  return $serverPerformanceService_bestTopRows().performanceTopBucketVariants(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#bestTopRows */
function bestTopRows() {
  return $serverPerformanceService_bestTopRows().bestTopRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#encodePerformanceTopIndexRows */
function encodePerformanceTopIndexRows(input0) {
  return $serverPerformanceService_bestTopRows().encodePerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#readPerformanceTopIndexRows */
function readPerformanceTopIndexRows() {
  return $serverPerformanceService_bestTopRows().readPerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/best-top-rows.js#writePerformanceTopIndexRows */
async function writePerformanceTopIndexRows() {
  return $serverPerformanceService_bestTopRows().writePerformanceTopIndexRows(...arguments);
}

/* extracted-function: functions/backend/server-performance-service/performance-top-rows-from-index.js#performanceTopRowsFromIndex */
async function performanceTopRowsFromIndex() {
  return $serverPerformanceService_performanceTopRowsFromIndex().performanceTopRowsFromIndex(...arguments);
}



/* extracted-function: functions/backend/server-dtn-service/dtn-season-service.js#dtnSeasonService */
function dtnSeasonService() {
  return $serverDtnService_dtnSeasonService().dtnSeasonService(...arguments);
}

const DTN_SEASON_OPTIONS = ENVIRONMENT.sportingDataSource === "nap" ? {
  ...CALLABLE_OPTIONS, secrets: ["LIVEPALMES_NAP_PASSWORD"], timeoutSeconds: 540, memory: "1GiB", maxInstances: 2, concurrency: 4
} : CALLABLE_OPTIONS;
/* extracted-function: functions/backend/server-dtn-service/invoke-dtn-season.js#invokeDtnSeason */
async function invokeDtnSeason(input0, input1) {
  return $serverDtnService_invokeDtnSeason().invokeDtnSeason(...arguments);
}
exports.getDtnSeasons = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/get-dtn-seasons.js#getDtnSeasons#expression */ (request) => {
  return $portalPerformanceHandlers_getDtnSeasons().getDtnSeasons(request);
});
exports.updateDtnSeason = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/update-dtn-season.js#updateDtnSeason#expression */ (request) => {
  return $portalPerformanceHandlers_updateDtnSeason().updateDtnSeason(request);
});
exports.getDtnSeasonOverview = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/get-dtn-season-overview.js#getDtnSeasonOverview#expression */ (request) => {
  return $portalPerformanceHandlers_getDtnSeasonOverview().getDtnSeasonOverview(request);
});
exports.listDtnSeasonSources = onCall(DTN_SEASON_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/list-dtn-season-sources.js#listDtnSeasonSources#expression */ (request) => {
  return $portalPerformanceHandlers_listDtnSeasonSources().listDtnSeasonSources(request);
});

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#dtnQualificationRow */
function dtnQualificationRow() {
  return $serverDtnService_bestDtnQualificationRows().dtnQualificationRow(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#bestDtnQualificationRows */
function bestDtnQualificationRows() {
  return $serverDtnService_bestDtnQualificationRows().bestDtnQualificationRows(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#nearDtnQualificationRows */
function nearDtnQualificationRows() {
  return $serverDtnService_bestDtnQualificationRows().nearDtnQualificationRows(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-cache-state-ref.js#dtnQualificationCacheStateRef */
function dtnQualificationCacheStateRef(input0) {
  return $serverDtnService_dtnQualificationCacheStateRef().dtnQualificationCacheStateRef(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-cache-ref.js#dtnQualificationCacheRef */
function dtnQualificationCacheRef(input0, input1) {
  return $serverDtnService_dtnQualificationCacheRef().dtnQualificationCacheRef(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-listing-cache-ref.js#dtnListingCacheRef */
function dtnListingCacheRef(input0) {
  return $serverDtnService_dtnListingCacheRef().dtnListingCacheRef(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-seasons-for-rows.js#dtnQualificationSeasonsForRows */
function dtnQualificationSeasonsForRows() {
  return $serverDtnService_dtnQualificationSeasonsForRows().dtnQualificationSeasonsForRows(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-seasons-for-rows.js#touchDtnQualificationCacheState */
async function touchDtnQualificationCacheState() {
  return $serverDtnService_dtnQualificationSeasonsForRows().touchDtnQualificationCacheState(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-cache-fingerprint.js#dtnQualificationCacheFingerprint */
function dtnQualificationCacheFingerprint(input0) {
  return $serverDtnService_dtnQualificationCacheFingerprint().dtnQualificationCacheFingerprint(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#dtnQualificationRowsForStandard */
function dtnQualificationRowsForStandard() {
  return $serverDtnService_bestDtnQualificationRows().dtnQualificationRowsForStandard(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-listing-cache-fingerprint.js#dtnListingCacheFingerprint */
function dtnListingCacheFingerprint(input0) {
  return $serverDtnService_dtnListingCacheFingerprint().dtnListingCacheFingerprint(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-qualification-cache-fingerprint.js#emptyDtnQualificationPayload */
function emptyDtnQualificationPayload(input0) {
  return $serverDtnService_dtnQualificationCacheFingerprint().emptyDtnQualificationPayload(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#buildDtnQualificationPayload */
async function buildDtnQualificationPayload(input0) {
  return $serverDtnService_bestDtnQualificationRows().buildDtnQualificationPayload(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/dtn-listing-cache-fingerprint.js#emptyDtnListingPayload */
function emptyDtnListingPayload(input0) {
  return $serverDtnService_dtnListingCacheFingerprint().emptyDtnListingPayload(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#isDtnElectronicFiftyMeterPerformance */
function isDtnElectronicFiftyMeterPerformance() {
  return $serverDtnService_bestDtnQualificationRows().isDtnElectronicFiftyMeterPerformance(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#dtnListingAthletes */
function dtnListingAthletes() {
  return $serverDtnService_bestDtnQualificationRows().dtnListingAthletes(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/best-dtn-qualification-rows.js#buildDtnListingPayload */
async function buildDtnListingPayload(input0) {
  return $serverDtnService_bestDtnQualificationRows().buildDtnListingPayload(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/enqueue-dtn-qualification-job.js#enqueueDtnQualificationJob */
async function enqueueDtnQualificationJob() {
  return $serverDtnService_enqueueDtnQualificationJob().enqueueDtnQualificationJob(...arguments);
}

exports.buildDtnQualificationView = onDocumentCreated(DTN_QUALIFICATION_JOB_OPTIONS, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return;
  const snapshot = event.data;
  if (!snapshot?.exists) return;
  const job = snapshot.data() || {};
  if (job.view === "season") return dtnSeasonService().build(snapshot);
  if (snapshot.id.startsWith("season-lock-")) return;
  const listingView = cleanText(job.view) === "listing";
  const seasonYear = Number(job.seasonYear || 0);
  const sex = normalizeCategoryCode(job.sex);
  const standards = Array.isArray(job.standards) ? job.standards : [];
  const rules = Array.isArray(job.rules) ? job.rules : [];
  const competitionIds = Array.isArray(job.competitionIds) ? job.competitionIds.map(cleanText).filter(Boolean) : [];
  const sourceVersion = Number(job.sourceVersion || 0) || 0;
  const listingVersion = Number(job.listingVersion || 0) || 0;
  const fingerprint = cleanText(job.fingerprint);
  const startedAt = Date.now();
  await snapshot.ref.set({ status: "running", startedAt: new Date().toISOString() }, { merge: true });
  try {
    const payload = listingView
      ? await buildDtnListingPayload({ seasonYear, rules })
      : await buildDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
    const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
    const latestSourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
    const latestListingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
    if (latestSourceVersion !== sourceVersion || (listingView && latestListingVersion !== listingVersion)) {
      await snapshot.ref.set({ status: "obsolete", completedAt: new Date().toISOString() }, { merge: true });
      return;
    }
    const payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
    if (payloadBytes >= 900000) throw new Error("Vue DTN trop volumineuse pour le cache Firestore.");
    const generatedAt = new Date().toISOString();
    const cacheRef = listingView ? dtnListingCacheRef(seasonYear) : dtnQualificationCacheRef(seasonYear, sex);
    await cacheRef.set({
      fingerprint,
      sourceVersion,
      ...(listingView ? { listingVersion } : {}),
      generatedAt,
      payloadBytes,
      payload: cleanFirestoreValue(payload)
    }, { merge: false });
    await snapshot.ref.set({
      status: "completed",
      completedAt: generatedAt,
      durationMs: Date.now() - startedAt,
      scannedRows: Number(payload.readStats?.scannedRows || 0)
    }, { merge: true });
  } catch (error) {
    console.error("Construction asynchrone DTN impossible", { seasonYear, sex, view: listingView ? "listing" : "edf", error: cleanText(error?.message || error) });
    await snapshot.ref.set({
      status: "failed",
      failedAt: new Date().toISOString(),
      error: cleanText(error?.message || error).slice(0, 300)
    }, { merge: true });
  }
});

exports.refreshDtnQualificationCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour recalculer les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear]) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }

  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const sourceVersion = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const current = Number(snapshot.data()?.version || 0) || 0;
    const next = current + 1;
    transaction.set(stateRef, {
      version: next,
      updatedAt: now,
      reason: "dtn.manual-refresh"
    }, { merge: true });
    return next;
  });

  return { ok: true, seasonYear, sourceVersion, refreshedAt: now };
});

exports.getDtnQualificationOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour consulter les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  const sex = normalizeCategoryCode(request.data?.sex);
  const allowedStandardIds = new Set(["TSP", "TRP", "TJP", "TEP", "TU16C2", "TU16C1"]);
  const rawStandards = Array.isArray(request.data?.standards) ? request.data.standards.slice(0, 6) : [];
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  if (sex !== "F" && sex !== "M") {
    throw new HttpsError("invalid-argument", "Sexe DTN invalide.");
  }
  const standards = rawStandards.map((raw) => {
    const id = cleanText(raw?.id).toUpperCase();
    const birthMin = Number(raw?.birthMin || 0) || 0;
    if (!allowedStandardIds.has(id) || (birthMin && (birthMin < 1900 || birthMin > 2100))) {
      throw new HttpsError("invalid-argument", "Référentiel DTN invalide.");
    }
    const thresholds = {};
    POOL_COURSES.forEach((course) => {
      const threshold = Number(raw?.thresholds?.[course] || 0) || 0;
      if (threshold > 0 && threshold <= 10000000) thresholds[course] = threshold;
    });
    return { id, birthMin, thresholds };
  });
  if (!standards.length) throw new HttpsError("invalid-argument", "Aucun temps DTN fourni.");

  const competitionIds = DTN_EDF_COMPETITION_IDS_BY_SEASON[seasonYear] || [];
  if (!competitionIds.length) throw new HttpsError("failed-precondition", "Compétitions DTN non définies pour cette saison.");

  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const fingerprint = dtnQualificationCacheFingerprint({ seasonYear, sex, standards, competitionIds, sourceVersion });
  const cacheRef = dtnQualificationCacheRef(seasonYear, sex);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      console.info("Cache DTN utilise", { seasonYear, sex, sourceVersion });
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnQualificationPayload({ seasonYear, sex, standards, competitionIds });
  if (request.data?.rebuild !== true) {
    console.info("Vue DTN absente ou obsolete, recalcul manuel requis", { seasonYear, sex, sourceVersion, stale: cacheSnapshot.exists });
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    seasonYear,
    sex,
    standards,
    competitionIds,
    sourceVersion,
    fingerprint
  });
  console.info("Vue DTN mise en file", { seasonYear, sex, sourceVersion, jobId, stale: cacheSnapshot.exists });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnQualificationOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
});

/* extracted-function: functions/backend/server-dtn-service/dtn-listing-cache-fingerprint.js#normalizeDtnListingRules */
function normalizeDtnListingRules() {
  return $serverDtnService_dtnListingCacheFingerprint().normalizeDtnListingRules(...arguments);
}

exports.refreshDtnListingCache = onCall(CALLABLE_OPTIONS, async (request) => {
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour recalculer les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const stateRef = dtnQualificationCacheStateRef(seasonYear);
  const now = new Date().toISOString();
  const listingVersion = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const next = (Number(snapshot.data()?.listingVersion || 0) || 0) + 1;
    transaction.set(stateRef, {
      listingVersion: next,
      listingUpdatedAt: now,
      listingReason: "dtn.listing.manual-refresh"
    }, { merge: true });
    return next;
  });
  return { ok: true, seasonYear, listingVersion, refreshedAt: now };
});

exports.getDtnListingOverview = onCall(CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  assertCapability(request, "dtn.view");
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Utilisez la DTN par saison pour consulter les resultats.");
  const seasonYear = Number(request.data?.seasonYear || 0);
  if (!Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100 || !DTN_LISTING_SEASON_YEARS.has(seasonYear)) {
    throw new HttpsError("invalid-argument", "Saison DTN invalide.");
  }
  const rules = normalizeDtnListingRules(request.data?.rules);
  const stateSnapshot = await dtnQualificationCacheStateRef(seasonYear).get();
  const sourceVersion = Number(stateSnapshot.data()?.version || 0) || 0;
  const listingVersion = Number(stateSnapshot.data()?.listingVersion || 0) || 0;
  const fingerprint = dtnListingCacheFingerprint({ seasonYear, rules, sourceVersion, listingVersion });
  const cacheRef = dtnListingCacheRef(seasonYear);
  const cacheSnapshot = await cacheRef.get();
  if (cacheSnapshot.exists && cleanText(cacheSnapshot.data()?.fingerprint) === fingerprint) {
    const cachedPayload = cacheSnapshot.data()?.payload;
    if (cachedPayload && typeof cachedPayload === "object") {
      return {
        ...cachedPayload,
        cache: { hit: true, pending: false, stale: false, generatedAt: cleanText(cacheSnapshot.data()?.generatedAt) },
        portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: true })
      };
    }
  }
  const stalePayload = cacheSnapshot.exists && cacheSnapshot.data()?.payload && typeof cacheSnapshot.data().payload === "object"
    ? cacheSnapshot.data().payload
    : emptyDtnListingPayload({ seasonYear, rules });
  if (request.data?.rebuild !== true) {
    return {
      ...stalePayload,
      cache: {
        hit: false,
        pending: false,
        stale: cacheSnapshot.exists,
        refreshRequired: true,
        generatedAt: cleanText(cacheSnapshot.data()?.generatedAt)
      },
      portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
    };
  }
  const jobId = await enqueueDtnQualificationJob({
    view: "listing",
    seasonYear,
    rules,
    sourceVersion,
    listingVersion,
    fingerprint
  });
  return {
    ...stalePayload,
    cache: {
      hit: false,
      pending: true,
      stale: cacheSnapshot.exists,
      generatedAt: cleanText(cacheSnapshot.data()?.generatedAt),
      jobId
    },
    portalReadStats: portalReadStats("getDtnListingOverview", startedAt, { baseDocuments: 2, cacheHit: false })
  };
});

/* extracted-function: functions/backend/server-dtn-service/normalize-performance-search-text.js#normalizePerformanceSearchText */
function normalizePerformanceSearchText(input0) {
  return $serverDtnService_normalizePerformanceSearchText().normalizePerformanceSearchText(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/performance-search-tokens.js#performanceSearchTokens */
function performanceSearchTokens(input0) {
  return $serverDtnService_performanceSearchTokens().performanceSearchTokens(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/performance-search-prefixes.js#performanceSearchPrefixes */
function performanceSearchPrefixes(input0) {
  return $serverDtnService_performanceSearchPrefixes().performanceSearchPrefixes(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/performance-swimmer-index-key.js#performanceSwimmerIndexKey */
function performanceSwimmerIndexKey() {
  return $serverDtnService_performanceSwimmerIndexKey().performanceSwimmerIndexKey(...arguments);
}

/* extracted-function: functions/backend/server-dtn-service/performance-swimmer-index-doc-id.js#performanceSwimmerIndexDocId */
function performanceSwimmerIndexDocId() {
  return $serverDtnService_performanceSwimmerIndexDocId().performanceSwimmerIndexDocId(...arguments);
}



/* extracted-function: functions/backend/server-legacy-service/aggregate-swimmer-index-rows.js#swimmerDisplayNameFromRow */
function swimmerDisplayNameFromRow() {
  return $serverLegacyService_aggregateSwimmerIndexRows().swimmerDisplayNameFromRow(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/aggregate-swimmer-index-rows.js#aggregateSwimmerIndexRows */
function aggregateSwimmerIndexRows() {
  return $serverLegacyService_aggregateSwimmerIndexRows().aggregateSwimmerIndexRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/aggregate-swimmer-index-rows.js#writePerformanceSwimmerIndexRows */
async function writePerformanceSwimmerIndexRows() {
  return $serverLegacyService_aggregateSwimmerIndexRows().writePerformanceSwimmerIndexRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/performance-swimmer-page-id.js#performanceSwimmerPageId */
function performanceSwimmerPageId(input0, input1) {
  return $serverLegacyService_performanceSwimmerPageId().performanceSwimmerPageId(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/aggregate-swimmer-index-rows.js#sortSwimmerPerformanceRows */
function sortSwimmerPerformanceRows() {
  return $serverLegacyService_aggregateSwimmerIndexRows().sortSwimmerPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/aggregate-swimmer-index-rows.js#writePerformanceSwimmerPageRows */
async function writePerformanceSwimmerPageRows() {
  return $serverLegacyService_aggregateSwimmerIndexRows().writePerformanceSwimmerPageRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/get-performance-base-rows-by-swimmer.js#hydratePerformanceBaseRows */
async function hydratePerformanceBaseRows() {
  return $serverLegacyService_getPerformanceBaseRowsBySwimmer().hydratePerformanceBaseRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/get-performance-base-rows-by-swimmer.js#getPerformanceBaseRowsBySwimmer */
async function getPerformanceBaseRowsBySwimmer() {
  return $serverLegacyService_getPerformanceBaseRowsBySwimmer().getPerformanceBaseRowsBySwimmer(...arguments);
}

exports.rebuildPerformanceSwimmerIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const stateRef = db.collection(PERFORMANCE_SWIMMER_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const includePages = request.data?.includePages !== false;
  const indexResult = await writePerformanceSwimmerIndexRows(rows, {
    now: new Date().toISOString(),
    action: reset ? "performanceSwimmerIndex.rebuild.reset" : "performanceSwimmerIndex.rebuild",
    mode: "incremental"
  });
  const pageResult = includePages
    ? await writePerformanceSwimmerPageRows(rows, {
      now: new Date().toISOString(),
      action: reset ? "performanceSwimmerPages.rebuild.reset" : "performanceSwimmerPages.rebuild"
    })
    : { writtenPages: 0 };
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const indexedSwimmerPageCount = (reset ? 0 : Number(state.indexedSwimmerPageCount || 0) || 0) + indexResult.written;
  await stateRef.set({
    startedAt,
    updatedAt: new Date().toISOString(),
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    indexedSwimmerPageCount,
    lastPagePerformanceCount: rows.length,
    lastPageSwimmerCount: indexResult.written,
    lastWrittenPerformancePages: pageResult.writtenPages || 0
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageSwimmerCount: indexResult.written,
    writtenPerformancePages: pageResult.writtenPages || 0,
    indexedPerformanceCount,
    indexedSwimmerPageCount
  };
});

exports.rebuildPerformanceTopIndexNextPage = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const stateRef = db.collection(PERFORMANCE_TOP_INDEX_STATE_COLLECTION).doc("default");
  const stateSnapshot = await stateRef.get();
  const state = stateSnapshot.exists ? stateSnapshot.data() || {} : {};
  const reset = request.data?.reset === true;
  const pageSize = Math.min(Math.max(Number(request.data?.pageSize || 500) || 500, 100), 500);
  const startedAt = reset || !state.startedAt ? new Date().toISOString() : cleanText(state.startedAt);
  const cursor = reset ? "" : cleanText(state.cursor);
  let query = db.collection(PERFORMANCE_BASE_COLLECTION)
    .orderBy(FieldPath.documentId())
    .limit(pageSize);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.get();
  const rows = snapshot.docs.map((doc) => ({ performanceBaseId: doc.id, ...(doc.data() || {}) }));
  const indexResult = await writePerformanceTopIndexRows(rows, {
    now: new Date().toISOString()
  });
  const nextCursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1].id : cursor;
  const done = snapshot.size < pageSize;
  const indexedPerformanceCount = (reset ? 0 : Number(state.indexedPerformanceCount || 0) || 0) + rows.length;
  const touchedBucketIds = Array.from(new Set([
    ...(!reset && Array.isArray(state.touchedBucketIds) ? state.touchedBucketIds.map(cleanText) : []),
    ...(indexResult.touchedBucketIds || [])
  ].filter(Boolean)));
  await stateRef.set({
    startedAt,
    cursor: nextCursor,
    done,
    indexedPerformanceCount,
    touchedBucketIds,
    touchedBucketCount: touchedBucketIds.length,
    lastPagePerformanceCount: rows.length,
    lastPageIndexedRows: indexResult.writtenRows || 0,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  return {
    ok: true,
    done,
    cursor: nextCursor,
    pagePerformanceCount: rows.length,
    pageIndexedRows: indexResult.writtenRows || 0,
    indexedPerformanceCount,
    touchedBucketCount: touchedBucketIds.length
  };
});

/* extracted-function: functions/backend/server-legacy-service/normalized-import-performances.js#normalizedImportPerformances */
async function normalizedImportPerformances(input0) {
  return $serverLegacyService_normalizedImportPerformances().normalizedImportPerformances(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/normalized-import-performances.js#syncImportToPerformanceBase */
async function syncImportToPerformanceBase(input0) {
  return $serverLegacyService_normalizedImportPerformances().syncImportToPerformanceBase(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-file.js#buildAdditionalPerformanceSwimmers */
function buildAdditionalPerformanceSwimmers() {
  return $serverLegacyService_additionalPerformanceFile().buildAdditionalPerformanceSwimmers(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-file.js#emptyAdditionalPerformanceDataSnapshot */
function emptyAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_additionalPerformanceFile().emptyAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-file.js#normalizeAdditionalPerformanceDataSnapshot */
function normalizeAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_additionalPerformanceFile().normalizeAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-file.js#additionalPerformanceFile */
function additionalPerformanceFile() {
  return $serverLegacyService_additionalPerformanceFile().additionalPerformanceFile(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-file.js#readPublishedAdditionalPerformanceDataSnapshot */
async function readPublishedAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_additionalPerformanceFile().readPublishedAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-row-key.js#additionalPerformanceRowKey */
function additionalPerformanceRowKey() {
  return $serverLegacyService_additionalPerformanceRowKey().additionalPerformanceRowKey(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/additional-performance-row-key.js#mergeAdditionalPerformanceRows */
function mergeAdditionalPerformanceRows() {
  return $serverLegacyService_additionalPerformanceRowKey().mergeAdditionalPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#upsertAdditionalCorrection */
function upsertAdditionalCorrection() {
  return $serverLegacyService_claimPerformancePublicationJob().upsertAdditionalCorrection(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/save-additional-performance-data-snapshot.js#saveAdditionalPerformanceDataSnapshot */
async function saveAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_saveAdditionalPerformanceDataSnapshot().saveAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/publish-incremental-performance-import.js#publishIncrementalPerformanceImport */
async function publishIncrementalPerformanceImport() {
  return $serverLegacyService_publishIncrementalPerformanceImport().publishIncrementalPerformanceImport(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#publishIncrementalPerformanceCorrection */
async function publishIncrementalPerformanceCorrection() {
  return $serverLegacyService_claimPerformancePublicationJob().publishIncrementalPerformanceCorrection(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/public-performance-files-bucket.js#publicPerformanceFilesBucket */
function publicPerformanceFilesBucket() {
  return $serverLegacyService_publicPerformanceFilesBucket().publicPerformanceFilesBucket(...arguments);
}



/* extracted-function: functions/backend/legacy-performance-publication/public-performance-file.js#publicPerformanceFilePath */
function publicPerformanceFilePath() {
  return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFilePath(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/public-performance-file.js#publicPerformanceFile */
function publicPerformanceFile() {
  return $legacyPerformancePublication_publicPerformanceFile().publicPerformanceFile(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/public-performance-file.js#readPublicPerformanceJson */
async function readPublicPerformanceJson(input0, input1) {
  return $legacyPerformancePublication_publicPerformanceFile().readPublicPerformanceJson(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#savePublicPerformanceJson */
async function savePublicPerformanceJson(input0, input1) {
  return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceJson(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#savePublicPerformanceText */
async function savePublicPerformanceText(input0, input1) {
  return $legacyPerformancePublication_buildPublicSearchRow().savePublicPerformanceText(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceCompactObject */
function publicPerformanceCompactObject() {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceCompactObject(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceSearchShard */
function publicPerformanceSearchShard(input0) {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceSearchShard(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceIdShard */
function publicPerformanceIdShard(input0) {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceIdShard(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/public-performance-top-file-name.js#publicPerformanceTopFileName */
function publicPerformanceTopFileName(input0, input1) {
  return $legacyPerformancePublication_publicPerformanceTopFileName().publicPerformanceTopFileName(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/public-performance-swimmer-file-path.js#publicPerformanceSwimmerFilePath */
function publicPerformanceSwimmerFilePath(input0) {
  return $legacyPerformancePublication_publicPerformanceSwimmerFilePath().publicPerformanceSwimmerFilePath(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceRowKey */
function publicPerformanceRowKey() {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceRowKey(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceTopCandidateKey */
function publicPerformanceTopCandidateKey() {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceTopCandidateKey(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceSwimmerRow */
function publicPerformanceSwimmerRow() {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceSwimmerRow(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publicPerformanceTopRow */
function publicPerformanceTopRow() {
  return $legacyPerformancePublication_buildPublicSearchRow().publicPerformanceTopRow(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#sortPublicPerformanceRows */
function sortPublicPerformanceRows() {
  return $legacyPerformancePublication_buildPublicSearchRow().sortPublicPerformanceRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#sortPublicTopRows */
function sortPublicTopRows() {
  return $legacyPerformancePublication_buildPublicSearchRow().sortPublicTopRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/merge-public-swimmer-rows.js#mergePublicSwimmerRows */
function mergePublicSwimmerRows() {
  return $legacyPerformancePublication_mergePublicSwimmerRows().mergePublicSwimmerRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#mergePublicTopRows */
function mergePublicTopRows() {
  return $legacyPerformancePublication_buildPublicSearchRow().mergePublicTopRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#buildPublicSwimmerPayload */
function buildPublicSwimmerPayload(input0) {
  return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSwimmerPayload(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#buildPublicSearchRow */
function buildPublicSearchRow() {
  return $legacyPerformancePublication_buildPublicSearchRow().buildPublicSearchRow(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/merge-public-swimmer-rows.js#publishPublicSwimmerFile */
async function publishPublicSwimmerFile(input0) {
  return $legacyPerformancePublication_mergePublicSwimmerRows().publishPublicSwimmerFile(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#publishPublicSearchIndexes */
async function publishPublicSearchIndexes(input0, input1) {
  return $legacyPerformancePublication_buildPublicSearchRow().publishPublicSearchIndexes(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#distinctPublicTopPreview */
function distinctPublicTopPreview(input0, input1, input2) {
  return $legacyPerformancePublication_buildPublicSearchRow().distinctPublicTopPreview(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/merge-public-swimmer-rows.js#publishPublicTopFiles */
async function publishPublicTopFiles(input0) {
  return $legacyPerformancePublication_mergePublicSwimmerRows().publishPublicTopFiles(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/build-public-search-row.js#mergePublicPerformanceManifest */
function mergePublicPerformanceManifest() {
  return $legacyPerformancePublication_buildPublicSearchRow().mergePublicPerformanceManifest(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/merge-public-swimmer-rows.js#publishIncrementalPublicPerformanceFiles */
async function publishIncrementalPublicPerformanceFiles() {
  return $legacyPerformancePublication_mergePublicSwimmerRows().publishIncrementalPublicPerformanceFiles(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#deletePublicPerformanceFile */
async function deletePublicPerformanceFile() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().deletePublicPerformanceFile(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#removePublicSearchIndexes */
async function removePublicSearchIndexes() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().removePublicSearchIndexes(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/assert-public-swimmer-identity-replaced.js#assertPublicSwimmerIdentityReplaced */
async function assertPublicSwimmerIdentityReplaced() {
  return $legacyPerformancePublication_assertPublicSwimmerIdentityReplaced().assertPublicSwimmerIdentityReplaced(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/assert-public-swimmer-identity-replaced.js#replacePublicSwimmerIdentity */
async function replacePublicSwimmerIdentity() {
  return $legacyPerformancePublication_assertPublicSwimmerIdentityReplaced().replacePublicSwimmerIdentity(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#publicPerformanceTopKey */
function publicPerformanceTopKey() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().publicPerformanceTopKey(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#publicPerformanceMatchesTopKey */
function publicPerformanceMatchesTopKey() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().publicPerformanceMatchesTopKey(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#publicPerformanceActiveRow */
function publicPerformanceActiveRow() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().publicPerformanceActiveRow(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#getActivePublicRowsForAffectedSwimmer */
async function getActivePublicRowsForAffectedSwimmer() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().getActivePublicRowsForAffectedSwimmer(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#rebuildPublicSwimmerFilesForAffectedRows */
async function rebuildPublicSwimmerFilesForAffectedRows() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().rebuildPublicSwimmerFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#rebuildPublicTopFilesForAffectedRows */
async function rebuildPublicTopFilesForAffectedRows() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().rebuildPublicTopFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/backend/legacy-performance-publication/delete-public-performance-file.js#rebuildPublicPerformanceFilesForAffectedRows */
async function rebuildPublicPerformanceFilesForAffectedRows() {
  return $legacyPerformancePublication_deletePublicPerformanceFile().rebuildPublicPerformanceFilesForAffectedRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/migration-chunk-statuses.js#performanceBaseMigrationManifest */
async function performanceBaseMigrationManifest() {
  return $serverLegacyService_migrationChunkStatuses().performanceBaseMigrationManifest(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/migration-chunk-statuses.js#migrationChunkStatuses */
async function migrationChunkStatuses() {
  return $serverLegacyService_migrationChunkStatuses().migrationChunkStatuses(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/historical-rows-from-chunk-payload.js#historicalRowsFromChunkPayload */
function historicalRowsFromChunkPayload() {
  return $serverLegacyService_historicalRowsFromChunkPayload().historicalRowsFromChunkPayload(...arguments);
}

exports.importHistoricalPerformanceRows = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const data = request.data || {};
  const source = cleanText(data.source || "intranap").slice(0, 80);
  const rawRows = Array.isArray(data.rows)
    ? data.rows
    : historicalRowsFromChunkPayload(data.payload && typeof data.payload === "object" ? data.payload : {});
  const rows = rawRows
    .slice(0, 2000)
    .map((row) => ({
      ...row,
      source: cleanText(row.source || source || "intranap")
    }))
    .filter((row) => POOL_COURSES.includes(normalizeCourseCode(row.course)) && Number(row.timeValue || 0) > 0);
  if (!rows.length) {
    throw new HttpsError("invalid-argument", "Aucune performance historique valide dans le lot.");
  }
  const now = new Date().toISOString();
  const result = await writePerformanceBaseRows(rows, {
    actorUid: request.auth.uid,
    actorEmail: request.auth.token?.email || "",
    now,
    action: "historicalImport.batch",
    changeSeed: cleanText(data.batchId || now),
    status: "active",
    logChanges: false
  });
  await db.collection(PERFORMANCE_BASE_MIGRATION_COLLECTION).doc(cleanText(data.batchId || stableHash(now).slice(0, 24))).set({
    source,
    status: "completed",
    importedCount: result.written,
    updatedAt: now,
    importedBy: request.auth.uid,
    importedByEmail: request.auth.token?.email || ""
  }, { merge: true });
  return {
    ok: true,
    written: result.written
  };
});

/* extracted-function: functions/backend/server-legacy-service/migrate-historical-performance-base-chunk.js#migrateHistoricalPerformanceBaseChunk */
async function migrateHistoricalPerformanceBaseChunk(input0, input1) {
  return $serverLegacyService_migrateHistoricalPerformanceBaseChunk().migrateHistoricalPerformanceBaseChunk(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/build-additional-performance-data-snapshot.js#buildAdditionalPerformanceDataSnapshot */
async function buildAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_buildAdditionalPerformanceDataSnapshot().buildAdditionalPerformanceDataSnapshot(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/publish-additional-performance-data-snapshot.js#publishAdditionalPerformanceDataSnapshot */
async function publishAdditionalPerformanceDataSnapshot() {
  return $serverLegacyService_publishAdditionalPerformanceDataSnapshot().publishAdditionalPerformanceDataSnapshot(...arguments);
}

exports.exportAdditionalPerformanceData = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  return buildAdditionalPerformanceDataSnapshot();
});

exports.publishPerformancePublicData = onCall(PUBLIC_PERFORMANCE_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  try {
    const publicSnapshot = await publishAdditionalPerformanceDataSnapshot();
    await writeAuditLog("performancePublicData.published", request.auth.uid, {
      path: publicSnapshot.path,
      importCount: publicSnapshot.importCount,
      performanceCount: publicSnapshot.performanceCount
    });
    return publicSnapshot;
  } catch (error) {
    console.error("Publication publique des performances impossible", {
      message: error?.message || String(error),
      code: error?.code || "",
      stack: error?.stack || ""
    });
    throw new HttpsError("failed-precondition", error?.message || "Publication publique impossible.");
  }
});

exports.getPerformanceBaseMigrationStatus = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const completed = chunks.filter((chunk) => chunk.status === "completed").length;
  return {
    ok: true,
    generatedAt: manifest.generatedAt || "",
    totalChunks: chunks.length,
    completedChunks: completed,
    pendingChunks: chunks.length - completed,
    totalPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0),
    migratedPerformances: chunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    chunks
  };
});

exports.migratePerformanceBaseNextChunk = onCall(MIGRATION_CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertAdmin(request);
  const manifest = await performanceBaseMigrationManifest();
  const chunks = await migrationChunkStatuses(manifest.chunks);
  const next = chunks.find((chunk) => chunk.status !== "completed");
  if (!next) {
    return {
      ok: true,
      done: true,
      message: "Tous les lots historiques sont deja migres."
    };
  }
  const result = await migrateHistoricalPerformanceBaseChunk(next.name, request);
  const updatedChunks = await migrationChunkStatuses(manifest.chunks);
  return {
    ...result,
    done: false,
    completedChunks: updatedChunks.filter((chunk) => chunk.status === "completed").length,
    totalChunks: updatedChunks.length,
    migratedPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.migratedCount || 0), 0),
    totalPerformances: updatedChunks.reduce((sum, chunk) => sum + Number(chunk.performanceCount || 0), 0)
  };
});

/* extracted-function: functions/backend/server-legacy-service/enqueue-performance-publication-job.js#enqueuePerformancePublicationJob */
async function enqueuePerformancePublicationJob() {
  return $serverLegacyService_enqueuePerformancePublicationJob().enqueuePerformancePublicationJob(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#claimPerformancePublicationJob */
async function claimPerformancePublicationJob(input0) {
  return $serverLegacyService_claimPerformancePublicationJob().claimPerformancePublicationJob(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#replacementImportRows */
async function replacementImportRows() {
  return $serverLegacyService_claimPerformancePublicationJob().replacementImportRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#deactivateReplacedPerformanceBaseRows */
async function deactivateReplacedPerformanceBaseRows() {
  return $serverLegacyService_claimPerformancePublicationJob().deactivateReplacedPerformanceBaseRows(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#processPerformanceImportReplacementJob */
async function processPerformanceImportReplacementJob(input0) {
  return $serverLegacyService_claimPerformancePublicationJob().processPerformanceImportReplacementJob(...arguments);
}

/* extracted-function: functions/backend/server-legacy-service/claim-performance-publication-job.js#processPerformancePublicationJob */
async function processPerformancePublicationJob(input0) {
  return $serverLegacyService_claimPerformancePublicationJob().processPerformancePublicationJob(...arguments);
}

exports.publishPerformanceCorrectionJob = onDocumentCreated(PERFORMANCE_PUBLICATION_JOB_OPTIONS, async (event) => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  if (!event.data?.exists) return;
  const result = await processPerformancePublicationJob(event.data.ref);
  if (result.retryable) throw result.error;
});

exports.resumePerformancePublicationJobs = onSchedule(PERFORMANCE_PUBLICATION_SCHEDULER_OPTIONS, async () => {
  if (ENVIRONMENT.sportingDataSource === "nap") return null;
  const [pendingSnapshot, processingSnapshot] = await Promise.all([
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "pending").limit(3).get(),
    db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).where("status", "==", "processing").limit(3).get()
  ]);
  const jobs = [...pendingSnapshot.docs, ...processingSnapshot.docs]
    .filter((snapshot, index, all) => all.findIndex((item) => item.id === snapshot.id) === index)
    .filter((snapshot) => canClaimPerformancePublicationJob(snapshot.data() || {}));
  for (const snapshot of jobs) await processPerformancePublicationJob(snapshot.ref);
  return null;
});

exports.getPerformancePublicationJobStatus = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  return { ok: true, publicationJob: publicPerformancePublicationJob(snapshot.data() || {}, snapshot.id) };
});

exports.retryPerformancePublicationJob = onCall(CALLABLE_OPTIONS, async (request) => {
  if (ENVIRONMENT.sportingDataSource === "nap") throw new HttpsError("failed-precondition", "Cette ancienne action Firebase est désactivée : les résultats sont gérés dans NAP.");
  assertCapability(request, "competitions.import");
  const jobId = cleanText(request.data?.jobId).slice(0, 80);
  if (!jobId) throw new HttpsError("invalid-argument", "Travail de publication manquant.");
  const snapshot = await db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(jobId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Travail de publication introuvable.");
  const job = snapshot.data() || {};
  if (job.status !== "failed") throw new HttpsError("failed-precondition", "Ce travail ne nécessite pas de reprise manuelle.");
  if (job.type === "performanceImportReplacement") {
    const now = new Date().toISOString();
    const newJobId = stableHash(`${snapshot.id}|retry|${now}`).slice(0, 40);
    const newJobRef = db.collection(PERFORMANCE_PUBLICATION_JOBS_COLLECTION).doc(newJobId);
    await newJobRef.create(cleanFirestoreValue({
      id: newJobId,
      type: "performanceImportReplacement",
      oldImportId: job.oldImportId,
      newImportId: job.newImportId,
      status: "pending",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      requestedBy: request.auth.uid,
      requestedByEmail: request.auth.token?.email || "",
      retryOf: snapshot.id
    }));
    await Promise.all([
      snapshot.ref.set({ replacedBy: newJobId, updatedAt: now }, { merge: true }),
      db.collection("performanceImports").doc(cleanText(job.oldImportId)).set({ replacementJobId: newJobId, updatedAt: now }, { merge: true }),
      db.collection("performanceImports").doc(cleanText(job.newImportId)).set({ replacementJobId: newJobId, publicationStatus: "pending", updatedAt: now }, { merge: true })
    ]);
    return {
      ok: true,
      publicationJob: publicPerformancePublicationJob({ status: "pending", attempts: 0, createdAt: now, updatedAt: now }, newJobId)
    };
  }
  const publicationJob = await enqueuePerformancePublicationJob(job.correction || {}, {
    uid: request.auth.uid,
    email: request.auth.token?.email || ""
  });
  await snapshot.ref.set({ replacedBy: publicationJob.id, updatedAt: new Date().toISOString() }, { merge: true });
  return { ok: true, publicationJob };
});

// RF/MPF: existing records capability, native versioned snapshot, no mail or TOP rebuild.
/* extracted-function: functions/backend/server-legacy-service/authorize-nap-records.js#authorizeNapRecords */
function authorizeNapRecords(input0) {
  return $serverLegacyService_authorizeNapRecords().authorizeNapRecords(...arguments);
}
/* extracted-function: functions/backend/server-legacy-service/read-nap-records-administration.js#readNapRecordsAdministration */
async function readNapRecordsAdministration(input0) {
  return $serverLegacyService_readNapRecordsAdministration().readNapRecordsAdministration(...arguments);
}
/* extracted-function: functions/backend/server-legacy-service/publish-native-records.js#publishNativeRecords */
async function publishNativeRecords(input0) {
  return $serverLegacyService_publishNativeRecords().publishNativeRecords(...arguments);
}

const NAP_PERFORMANCE_OPTIONS={...CALLABLE_OPTIONS,...(ENVIRONMENT.sportingDataSource === "nap"?{secrets:[defineSecret("LIVEPALMES_NAP_PASSWORD")],maxInstances:2,concurrency:4}: {})};
/* extracted-function: functions/backend/server-legacy-service/authorize-native-performance.js#authorizeNativePerformance */
function authorizeNativePerformance(input0) {
  return $serverLegacyService_authorizeNativePerformance().authorizeNativePerformance(...arguments);
}
/* extracted-function: functions/backend/server-legacy-service/native-performance-failure.js#nativePerformanceFailure */
function nativePerformanceFailure(input0) {
  return $serverLegacyService_nativePerformanceFailure().nativePerformanceFailure(...arguments);
}
exports.getNapPerformanceAdministration=onCall(NAP_PERFORMANCE_OPTIONS,/* extracted-handler: functions/backend/portal-performance-handlers/get-nap-performance-administration.js#getNapPerformanceAdministration#arrow */ async (request) => {
  return $portalPerformanceHandlers_getNapPerformanceAdministration().getNapPerformanceAdministration(request);
});
exports.savePerformanceCorrection = onCall(NAP_PERFORMANCE_OPTIONS, /* extracted-handler: functions/backend/portal-performance-handlers/save-performance-correction.js#savePerformanceCorrection#arrow */ async (request) => {
  return $portalPerformanceHandlers_savePerformanceCorrection().savePerformanceCorrection(request);
});
