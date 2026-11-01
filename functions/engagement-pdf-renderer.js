// Compatibility factory; operation modules hold the existing bodies.
function createEngagementPdfRenderer({
  ENGAGEMENT_EVENT_DEFINITION_BY_CODE,
  ENGAGEMENT_PDF_LOGO_PATH,
  PDFDocument,
  QRCode,
  ageCategoryFromDates,
  cleanEngagementCompetitionLevel,
  cleanEngagementCompetitionType,
  cleanEngagementTimingType,
  cleanIsoDate,
  cleanPublicCalendarWhatsAppUrl,
  cleanText,
  engagementClubCode,
  fs,
  normalizeCategoryCode,
  normalizeCourseCode
}) {
  const backendContext = { ENGAGEMENT_EVENT_DEFINITION_BY_CODE: ENGAGEMENT_EVENT_DEFINITION_BY_CODE, ENGAGEMENT_PDF_LOGO_PATH: ENGAGEMENT_PDF_LOGO_PATH, PDFDocument: PDFDocument, QRCode: QRCode, ageCategoryFromDates: ageCategoryFromDates, cleanEngagementCompetitionLevel: cleanEngagementCompetitionLevel, cleanEngagementCompetitionType: cleanEngagementCompetitionType, cleanEngagementTimingType: cleanEngagementTimingType, cleanIsoDate: cleanIsoDate, cleanPublicCalendarWhatsAppUrl: cleanPublicCalendarWhatsAppUrl, cleanText: cleanText, engagementClubCode: engagementClubCode, fs: fs, normalizeCategoryCode: normalizeCategoryCode, normalizeCourseCode: normalizeCourseCode };
  let cache0;
  function operation0() {
    if (!cache0) cache0 = require("./backend/engagement-pdf-renderer/build-engagement-club-recap-pdf").createEngagementPdfRenderer_buildEngagementClubRecapPdf({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get ENGAGEMENT_PDF_LOGO_PATH() { return backendContext.ENGAGEMENT_PDF_LOGO_PATH; },
      set ENGAGEMENT_PDF_LOGO_PATH(value) { backendContext.ENGAGEMENT_PDF_LOGO_PATH = value; },
      get PDFDocument() { return backendContext.PDFDocument; },
      set PDFDocument(value) { backendContext.PDFDocument = value; },
      get QRCode() { return backendContext.QRCode; },
      set QRCode(value) { backendContext.QRCode = value; },
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get cleanEngagementCompetitionLevel() { return backendContext.cleanEngagementCompetitionLevel; },
      set cleanEngagementCompetitionLevel(value) { backendContext.cleanEngagementCompetitionLevel = value; },
      get cleanEngagementCompetitionType() { return backendContext.cleanEngagementCompetitionType; },
      set cleanEngagementCompetitionType(value) { backendContext.cleanEngagementCompetitionType = value; },
      get cleanIsoDate() { return backendContext.cleanIsoDate; },
      set cleanIsoDate(value) { backendContext.cleanIsoDate = value; },
      get cleanPublicCalendarWhatsAppUrl() { return backendContext.cleanPublicCalendarWhatsAppUrl; },
      set cleanPublicCalendarWhatsAppUrl(value) { backendContext.cleanPublicCalendarWhatsAppUrl = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get engagementClubCode() { return backendContext.engagementClubCode; },
      set engagementClubCode(value) { backendContext.engagementClubCode = value; },
      get fs() { return backendContext.fs; },
      set fs(value) { backendContext.fs = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; },
      get local$engagementPdfEntryStats() { return operation4().engagementPdfEntryStats; },
      get local$engagementPdfEventLabel() { return operation3().engagementPdfEventLabel; },
      get local$engagementPdfFeeTotal() { return operation5().engagementPdfFeeTotal; },
      get local$engagementPdfFileName() { return operation2().engagementPdfFileName; }
    });
    return cache0;
  }

  let cache1;
  function operation1() {
    if (!cache1) cache1 = require("./backend/engagement-pdf-renderer/engagement-pdf-collect-individual-rows").createEngagementPdfRenderer_engagementPdfCollectIndividualRows({
      get ageCategoryFromDates() { return backendContext.ageCategoryFromDates; },
      set ageCategoryFromDates(value) { backendContext.ageCategoryFromDates = value; },
      get cleanEngagementTimingType() { return backendContext.cleanEngagementTimingType; },
      set cleanEngagementTimingType(value) { backendContext.cleanEngagementTimingType = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get normalizeCategoryCode() { return backendContext.normalizeCategoryCode; },
      set normalizeCategoryCode(value) { backendContext.normalizeCategoryCode = value; },
      get local$engagementPdfEnsureSpace() { return operation0().engagementPdfEnsureSpace; },
      get local$engagementPdfEventLabel() { return operation3().engagementPdfEventLabel; },
      get local$engagementPdfSwimmerName() { return operation0().engagementPdfSwimmerName; }
    });
    return cache1;
  }

  let cache2;
  function operation2() {
    if (!cache2) cache2 = require("./backend/engagement-pdf-renderer/engagement-pdf-file-name").createEngagementPdfRenderer_engagementPdfFileName({
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; }
    });
    return cache2;
  }

  let cache3;
  function operation3() {
    if (!cache3) cache3 = require("./backend/engagement-pdf-renderer/engagement-pdf-event-label").createEngagementPdfRenderer_engagementPdfEventLabel({
      get ENGAGEMENT_EVENT_DEFINITION_BY_CODE() { return backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE; },
      set ENGAGEMENT_EVENT_DEFINITION_BY_CODE(value) { backendContext.ENGAGEMENT_EVENT_DEFINITION_BY_CODE = value; },
      get normalizeCourseCode() { return backendContext.normalizeCourseCode; },
      set normalizeCourseCode(value) { backendContext.normalizeCourseCode = value; }
    });
    return cache3;
  }

  let cache4;
  function operation4() {
    if (!cache4) cache4 = require("./backend/engagement-pdf-renderer/engagement-pdf-entry-stats").createEngagementPdfRenderer_engagementPdfEntryStats({

    });
    return cache4;
  }

  let cache5;
  function operation5() {
    if (!cache5) cache5 = require("./backend/engagement-pdf-renderer/engagement-pdf-fee-total").createEngagementPdfRenderer_engagementPdfFeeTotal({
      get local$engagementPdfEntryStats() { return operation4().engagementPdfEntryStats; }
    });
    return cache5;
  }

  let cache6;
  function operation6() {
    if (!cache6) cache6 = require("./backend/engagement-pdf-renderer/build-engagement-officials-pdf").createEngagementPdfRenderer_buildEngagementOfficialsPdf({
      get ENGAGEMENT_PDF_LOGO_PATH() { return backendContext.ENGAGEMENT_PDF_LOGO_PATH; },
      set ENGAGEMENT_PDF_LOGO_PATH(value) { backendContext.ENGAGEMENT_PDF_LOGO_PATH = value; },
      get PDFDocument() { return backendContext.PDFDocument; },
      set PDFDocument(value) { backendContext.PDFDocument = value; },
      get cleanText() { return backendContext.cleanText; },
      set cleanText(value) { backendContext.cleanText = value; },
      get fs() { return backendContext.fs; },
      set fs(value) { backendContext.fs = value; },
      get local$engagementPdfDocToBuffer() { return operation0().engagementPdfDocToBuffer; },
      get local$engagementPdfEmptyState() { return operation0().engagementPdfEmptyState; },
      get local$engagementPdfFileName() { return operation2().engagementPdfFileName; },
      get local$engagementPdfFormatDate() { return operation0().engagementPdfFormatDate; },
      get local$engagementPdfFormatDateTime() { return operation0().engagementPdfFormatDateTime; },
      get local$engagementPdfTable() { return operation0().engagementPdfTable; }
    });
    return cache6;
  }
  return {
    engagementPdfFormatDate: operation0().engagementPdfFormatDate,
    engagementPdfFormatDateTime: operation0().engagementPdfFormatDateTime,
    engagementPdfLevelLabel: operation0().engagementPdfLevelLabel,
    engagementPdfStatusLabel: operation1().engagementPdfStatusLabel,
    engagementPdfTimingLabel: operation1().engagementPdfTimingLabel,
    engagementPdfMoney: operation0().engagementPdfMoney,
    engagementPdfFileName: operation2().engagementPdfFileName,
    engagementPdfEventLabel: operation3().engagementPdfEventLabel,
    engagementPdfSwimmerName: operation0().engagementPdfSwimmerName,
    engagementPdfPersonName: operation0().engagementPdfPersonName,
    engagementPdfGenderLabel: operation0().engagementPdfGenderLabel,
    engagementPdfRelayCategoryLabel: operation0().engagementPdfRelayCategoryLabel,
    engagementPdfEntryStats: operation4().engagementPdfEntryStats,
    engagementPdfFeeTotal: operation5().engagementPdfFeeTotal,
    engagementPdfCollectIndividualRows: operation1().engagementPdfCollectIndividualRows,
    engagementPdfIndividualProgramColumns: operation0().engagementPdfIndividualProgramColumns,
    engagementPdfIndividualMatrix: operation0().engagementPdfIndividualMatrix,
    engagementPdfSwimmersWithoutIndividualRows: operation0().engagementPdfSwimmersWithoutIndividualRows,
    engagementPdfCompactSummary: operation0().engagementPdfCompactSummary,
    engagementPdfDrawIndividualMatrix: operation0().engagementPdfDrawIndividualMatrix,
    engagementPdfCollectRelayRows: operation0().engagementPdfCollectRelayRows,
    engagementPdfDocToBuffer: operation0().engagementPdfDocToBuffer,
    engagementPdfAddFooter: operation0().engagementPdfAddFooter,
    engagementPdfEnsureSpace: operation0().engagementPdfEnsureSpace,
    engagementPdfSection: operation0().engagementPdfSection,
    engagementPdfEmptyState: operation0().engagementPdfEmptyState,
    engagementPdfWhatsAppBlock: operation0().engagementPdfWhatsAppBlock,
    engagementPdfKeyValues: operation1().engagementPdfKeyValues,
    engagementPdfFeesTable: operation0().engagementPdfFeesTable,
    engagementPdfTextHeight: operation0().engagementPdfTextHeight,
    engagementPdfTable: operation0().engagementPdfTable,
    buildEngagementClubRecapPdf: operation0().buildEngagementClubRecapPdf,
    buildEngagementOfficialsPdf: operation6().buildEngagementOfficialsPdf
  };
}

module.exports = { createEngagementPdfRenderer };
