// Compatibility factory; operation modules hold the existing bodies.
function createLegacyPerformancePublication({
  PUBLIC_PERFORMANCE_FILES_PATH,
  PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION,
  PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT,
  cleanText,
  hydratePublicSwimmerRowsFromPayload,
  normalizePerformanceSearchText,
  performancePublicKey,
  performanceSearchPrefixes,
  publicBetterPerformance,
  publicPerformanceBaseRow,
  publicPerformanceFilesBucket,
  publicPerformanceSwimmerStorageRow,
  publicSwimmerKey,
  publicSwimmerPayloadSupportsTopRebuild,
  stableHash,
  uniquePublicPerformanceRows
}) {
  const backendContext = { PUBLIC_PERFORMANCE_FILES_PATH: PUBLIC_PERFORMANCE_FILES_PATH, PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION: PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION, PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT: PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT, cleanText: cleanText, hydratePublicSwimmerRowsFromPayload: hydratePublicSwimmerRowsFromPayload, normalizePerformanceSearchText: normalizePerformanceSearchText, performancePublicKey: performancePublicKey, performanceSearchPrefixes: performanceSearchPrefixes, publicBetterPerformance: publicBetterPerformance, publicPerformanceBaseRow: publicPerformanceBaseRow, publicPerformanceFilesBucket: publicPerformanceFilesBucket, publicPerformanceSwimmerStorageRow: publicPerformanceSwimmerStorageRow, publicSwimmerKey: publicSwimmerKey, publicSwimmerPayloadSupportsTopRebuild: publicSwimmerPayloadSupportsTopRebuild, stableHash: stableHash, uniquePublicPerformanceRows: uniquePublicPerformanceRows };
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/legacy-performance-publication/public-performance-file").createLegacyPerformancePublication_publicPerformanceFile({
      get PUBLIC_PERFORMANCE_FILES_PATH() { return backendContext.PUBLIC_PERFORMANCE_FILES_PATH; },
      set PUBLIC_PERFORMANCE_FILES_PATH(value) { backendContext.PUBLIC_PERFORMANCE_FILES_PATH = value; },
      get publicPerformanceFilesBucket() { return backendContext.publicPerformanceFilesBucket; },
      set publicPerformanceFilesBucket(value) { backendContext.publicPerformanceFilesBucket = value; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/legacy-performance-publication/build-public-search-row").createLegacyPerformancePublication_buildPublicSearchRow({
      get PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION() { return backendContext.PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION; },
      set PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION(value) { backendContext.PUBLIC_PERFORMANCE_SWIMMER_ROW_SCHEMA_VERSION = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizePerformanceSearchText() { return backendContext.normalizePerformanceSearchText; },
      set normalizePerformanceSearchText(value) { backendContext.normalizePerformanceSearchText = value; },
      get performancePublicKey() { return backendContext.performancePublicKey; },
      set performancePublicKey(value) { backendContext.performancePublicKey = value; },
      get performanceSearchPrefixes() { return backendContext.performanceSearchPrefixes; },
      set performanceSearchPrefixes(value) { backendContext.performanceSearchPrefixes = value; },
      get publicBetterPerformance() { return backendContext.publicBetterPerformance; },
      set publicBetterPerformance(value) { backendContext.publicBetterPerformance = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicPerformanceSwimmerStorageRow() { return backendContext.publicPerformanceSwimmerStorageRow; },
      set publicPerformanceSwimmerStorageRow(value) { backendContext.publicPerformanceSwimmerStorageRow = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; },
      get local$publicPerformanceFile() { return operation0().publicPerformanceFile; },
      get local$publicPerformanceFilePath() { return operation0().publicPerformanceFilePath; },
      get local$readPublicPerformanceJson() { return operation0().readPublicPerformanceJson; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/legacy-performance-publication/public-performance-top-file-name").createLegacyPerformancePublication_publicPerformanceTopFileName({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/legacy-performance-publication/public-performance-swimmer-file-path").createLegacyPerformancePublication_publicPerformanceSwimmerFilePath({
      get stableHash() { return backendContext.stableHash; },
      set stableHash(value) { backendContext.stableHash = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/legacy-performance-publication/merge-public-swimmer-rows").createLegacyPerformancePublication_mergePublicSwimmerRows({
      get PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT() { return backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT; },
      set PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT(value) { backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get local$buildPublicSwimmerPayload() { return operation1().buildPublicSwimmerPayload; },
      get local$distinctPublicTopPreview() { return operation1().distinctPublicTopPreview; },
      get local$mergePublicPerformanceManifest() { return operation1().mergePublicPerformanceManifest; },
      get local$mergePublicTopRows() { return operation1().mergePublicTopRows; },
      get local$publicPerformanceFilePath() { return operation0().publicPerformanceFilePath; },
      get local$publicPerformanceRowKey() { return operation1().publicPerformanceRowKey; },
      get local$publicPerformanceSwimmerFilePath() { return operation3().publicPerformanceSwimmerFilePath; },
      get local$publicPerformanceSwimmerRow() { return operation1().publicPerformanceSwimmerRow; },
      get local$publicPerformanceTopFileName() { return operation2().publicPerformanceTopFileName; },
      get local$publishPublicSearchIndexes() { return operation1().publishPublicSearchIndexes; },
      get local$readPublicPerformanceJson() { return operation0().readPublicPerformanceJson; },
      get local$savePublicPerformanceJson() { return operation1().savePublicPerformanceJson; },
      get local$savePublicPerformanceText() { return operation1().savePublicPerformanceText; },
      get local$sortPublicPerformanceRows() { return operation1().sortPublicPerformanceRows; }
    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/legacy-performance-publication/delete-public-performance-file").createLegacyPerformancePublication_deletePublicPerformanceFile({
      get PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT() { return backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT; },
      set PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT(value) { backendContext.PUBLIC_PERFORMANCE_TOP_PREVIEW_LIMIT = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get hydratePublicSwimmerRowsFromPayload() { return backendContext.hydratePublicSwimmerRowsFromPayload; },
      set hydratePublicSwimmerRowsFromPayload(value) { backendContext.hydratePublicSwimmerRowsFromPayload = value; },
      get publicPerformanceBaseRow() { return backendContext.publicPerformanceBaseRow; },
      set publicPerformanceBaseRow(value) { backendContext.publicPerformanceBaseRow = value; },
      get publicSwimmerKey() { return backendContext.publicSwimmerKey; },
      set publicSwimmerKey(value) { backendContext.publicSwimmerKey = value; },
      get publicSwimmerPayloadSupportsTopRebuild() { return backendContext.publicSwimmerPayloadSupportsTopRebuild; },
      set publicSwimmerPayloadSupportsTopRebuild(value) { backendContext.publicSwimmerPayloadSupportsTopRebuild = value; },
      get uniquePublicPerformanceRows() { return backendContext.uniquePublicPerformanceRows; },
      set uniquePublicPerformanceRows(value) { backendContext.uniquePublicPerformanceRows = value; },
      get local$buildPublicSearchRow() { return operation1().buildPublicSearchRow; },
      get local$buildPublicSwimmerPayload() { return operation1().buildPublicSwimmerPayload; },
      get local$distinctPublicTopPreview() { return operation1().distinctPublicTopPreview; },
      get local$mergePublicPerformanceManifest() { return operation1().mergePublicPerformanceManifest; },
      get local$mergePublicTopRows() { return operation1().mergePublicTopRows; },
      get local$publicPerformanceFile() { return operation0().publicPerformanceFile; },
      get local$publicPerformanceFilePath() { return operation0().publicPerformanceFilePath; },
      get local$publicPerformanceIdShard() { return operation1().publicPerformanceIdShard; },
      get local$publicPerformanceRowKey() { return operation1().publicPerformanceRowKey; },
      get local$publicPerformanceSearchShard() { return operation1().publicPerformanceSearchShard; },
      get local$publicPerformanceSwimmerFilePath() { return operation3().publicPerformanceSwimmerFilePath; },
      get local$publicPerformanceTopCandidateKey() { return operation1().publicPerformanceTopCandidateKey; },
      get local$publicPerformanceTopFileName() { return operation2().publicPerformanceTopFileName; },
      get local$publishPublicSearchIndexes() { return operation1().publishPublicSearchIndexes; },
      get local$readPublicPerformanceJson() { return operation0().readPublicPerformanceJson; },
      get local$savePublicPerformanceJson() { return operation1().savePublicPerformanceJson; },
      get local$savePublicPerformanceText() { return operation1().savePublicPerformanceText; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/legacy-performance-publication/assert-public-swimmer-identity-replaced").createLegacyPerformancePublication_assertPublicSwimmerIdentityReplaced({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get local$buildPublicSearchRow() { return operation1().buildPublicSearchRow; },
      get local$deletePublicPerformanceFile() { return operation5().deletePublicPerformanceFile; },
      get local$publicPerformanceIdShard() { return operation1().publicPerformanceIdShard; },
      get local$publicPerformanceSearchShard() { return operation1().publicPerformanceSearchShard; },
      get local$publicPerformanceSwimmerFilePath() { return operation3().publicPerformanceSwimmerFilePath; },
      get local$readPublicPerformanceJson() { return operation0().readPublicPerformanceJson; },
      get local$rebuildPublicPerformanceFilesForAffectedRows() { return operation5().rebuildPublicPerformanceFilesForAffectedRows; },
      get local$removePublicSearchIndexes() { return operation5().removePublicSearchIndexes; }
    });
    return cache6;
  }
  return {
    publicPerformanceFilePath: operation0().publicPerformanceFilePath,
    publicPerformanceFile: operation0().publicPerformanceFile,
    readPublicPerformanceJson: operation0().readPublicPerformanceJson,
    savePublicPerformanceJson: operation1().savePublicPerformanceJson,
    savePublicPerformanceText: operation1().savePublicPerformanceText,
    publicPerformanceCompactObject: operation1().publicPerformanceCompactObject,
    publicPerformanceSearchShard: operation1().publicPerformanceSearchShard,
    publicPerformanceIdShard: operation1().publicPerformanceIdShard,
    publicPerformanceTopFileName: operation2().publicPerformanceTopFileName,
    publicPerformanceSwimmerFilePath: operation3().publicPerformanceSwimmerFilePath,
    publicPerformanceRowKey: operation1().publicPerformanceRowKey,
    publicPerformanceTopCandidateKey: operation1().publicPerformanceTopCandidateKey,
    publicPerformanceSwimmerRow: operation1().publicPerformanceSwimmerRow,
    publicPerformanceTopRow: operation1().publicPerformanceTopRow,
    sortPublicPerformanceRows: operation1().sortPublicPerformanceRows,
    sortPublicTopRows: operation1().sortPublicTopRows,
    mergePublicSwimmerRows: operation4().mergePublicSwimmerRows,
    mergePublicTopRows: operation1().mergePublicTopRows,
    buildPublicSwimmerPayload: operation1().buildPublicSwimmerPayload,
    buildPublicSearchRow: operation1().buildPublicSearchRow,
    publishPublicSwimmerFile: operation4().publishPublicSwimmerFile,
    publishPublicSearchIndexes: operation1().publishPublicSearchIndexes,
    distinctPublicTopPreview: operation1().distinctPublicTopPreview,
    publishPublicTopFiles: operation4().publishPublicTopFiles,
    mergePublicPerformanceManifest: operation1().mergePublicPerformanceManifest,
    publishIncrementalPublicPerformanceFiles: operation4().publishIncrementalPublicPerformanceFiles,
    deletePublicPerformanceFile: operation5().deletePublicPerformanceFile,
    removePublicSearchIndexes: operation5().removePublicSearchIndexes,
    assertPublicSwimmerIdentityReplaced: operation6().assertPublicSwimmerIdentityReplaced,
    replacePublicSwimmerIdentity: operation6().replacePublicSwimmerIdentity,
    publicPerformanceTopKey: operation5().publicPerformanceTopKey,
    publicPerformanceMatchesTopKey: operation5().publicPerformanceMatchesTopKey,
    publicPerformanceActiveRow: operation5().publicPerformanceActiveRow,
    getActivePublicRowsForAffectedSwimmer: operation5().getActivePublicRowsForAffectedSwimmer,
    rebuildPublicSwimmerFilesForAffectedRows: operation5().rebuildPublicSwimmerFilesForAffectedRows,
    rebuildPublicTopFilesForAffectedRows: operation5().rebuildPublicTopFilesForAffectedRows,
    rebuildPublicPerformanceFilesForAffectedRows: operation5().rebuildPublicPerformanceFilesForAffectedRows
  };
}

module.exports = { createLegacyPerformancePublication };
