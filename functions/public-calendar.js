const PUBLIC_CALENDAR_EVENT_TYPES = new Set([
  "pool",
  "openWater",
  "training",
  "stage",
  "meeting",
  "other"
]);

const PUBLIC_CALENDAR_GENERIC_EVENT_TYPES = new Set([
  "training",
  "stage",
  "meeting",
  "other"
]);

const PUBLIC_CALENDAR_LEVELS = new Set(["departemental", "regional", "national"]);
const PUBLIC_CALENDAR_PUBLICATION_STATUSES = new Set(["draft", "published", "unpublished"]);

function cleanText(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength ? text.slice(0, maxLength) : text;
}

function cleanIsoDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanTime(value) {
  const text = cleanText(value);
  return /^\d{2}:\d{2}$/.test(text) ? text : "";
}

function cleanPublicCalendarUrl(value, maxLength = 900) {
  const url = cleanText(value, maxLength);
  return /^https:\/\/[^\s]+$/i.test(url) ? url : "";
}

function cleanPublicCalendarEventType(value, fallback = "other") {
  const type = cleanText(value);
  return PUBLIC_CALENDAR_EVENT_TYPES.has(type) ? type : fallback;
}

function cleanPublicCalendarLevel(value) {
  const level = cleanText(value);
  return PUBLIC_CALENDAR_LEVELS.has(level) ? level : "regional";
}

function cleanPublicCalendarPublicationStatus(value) {
  const status = cleanText(value);
  return PUBLIC_CALENDAR_PUBLICATION_STATUSES.has(status) ? status : "draft";
}

function cleanPublicCalendarProgram(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).map((session, sessionIndex) => ({
    id: cleanText(session?.id, 40) || `session-${sessionIndex + 1}`,
    title: cleanText(session?.title || session?.label, 120) || `Programme ${sessionIndex + 1}`,
    date: cleanIsoDate(session?.date),
    startTime: cleanTime(session?.startTime),
    endTime: cleanTime(session?.endTime),
    summary: cleanText(session?.summary || session?.description, 240),
    items: (Array.isArray(session?.items) ? session.items : []).slice(0, 160).map((item, itemIndex) => ({
      id: cleanText(item?.id, 40) || `item-${itemIndex + 1}`,
      time: cleanTime(item?.time),
      label: cleanText(item?.label || item?.title, 180),
      detail: cleanText(item?.detail || item?.description, 300)
    })).filter((item) => item.label)
  })).filter((session) => session.title || session.items.length);
}

function cleanPublicCalendarDocuments(raw = []) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map((document) => ({
    id: cleanText(document?.id, 80),
    title: cleanText(document?.title || document?.fileName, 160),
    category: cleanText(document?.category, 40) || "other",
    description: cleanText(document?.description, 500),
    fileName: cleanText(document?.fileName, 180),
    contentType: cleanText(document?.contentType, 120),
    url: cleanText(document?.url, 900),
    size: Math.max(0, Math.trunc(Number(document?.size) || 0)),
    updatedAt: cleanText(document?.updatedAt || document?.uploadedAt, 40)
  })).filter((document) => document.id && document.title && /^https:\/\//i.test(document.url));
}

function publicCalendarEventTypeFromCompetition(data = {}) {
  return data.competitionType === "openWater" ? "openWater" : "pool";
}

function publicCalendarRegionLabel(regionId, labels = {}) {
  const value = cleanText(regionId, 80);
  return cleanText(labels[value] || value, 80);
}

function publicCalendarSummary(data = {}, options = {}) {
  const id = cleanText(options.id || data.id, 128);
  const sourceType = options.sourceType === "calendarEvent" ? "calendarEvent" : "competition";
  const eventType = sourceType === "competition"
    ? publicCalendarEventTypeFromCompetition(data)
    : cleanPublicCalendarEventType(data.eventType, "other");
  const date = cleanIsoDate(data.date);
  const endDate = cleanIsoDate(data.endDate) || date;
  return {
    id,
    sourceType,
    name: cleanText(data.name || data.title, 160),
    date,
    endDate,
    city: cleanText(data.city || data.location, 120),
    eventType,
    level: cleanPublicCalendarLevel(data.level),
    regionId: cleanText(data.regionId, 80),
    regionLabel: publicCalendarRegionLabel(data.regionId, options.regionLabels),
    canceled: data.canceled === true,
    publicationStatus: cleanPublicCalendarPublicationStatus(data.publicationStatus),
    resultsPublishedAt: cleanText(data.resultsPublishedAt, 40),
    documentCount: Math.max(0, Math.trunc(Number(data.documentCount) || cleanPublicCalendarDocuments(data.clubDocuments).length)),
    updatedAt: cleanText(data.updatedAt, 40)
  };
}

function publicCalendarCompetitionProgram(data = {}, eventLabelByCode = {}) {
  const sessions = Array.isArray(data.programSessions) ? data.programSessions : [];
  return sessions.slice(0, 12).map((session, sessionIndex) => ({
    id: cleanText(session?.id, 40) || `session-${sessionIndex + 1}`,
    title: `Réunion ${sessionIndex + 1}`,
    date: cleanIsoDate(session?.date),
    startTime: cleanTime(session?.startTime),
    endTime: "",
    items: (Array.isArray(session?.items) ? session.items : []).slice(0, 160).map((item, itemIndex) => {
      const eventCode = cleanText(item?.eventCode || item?.code, 40);
      const gender = cleanText(item?.genderMode, 20);
      const genderLabel = gender === "female" ? "Femmes" : gender === "male" ? "Hommes" : gender === "mixed" ? "Femmes et hommes" : "";
      return {
        id: `item-${itemIndex + 1}`,
        time: "",
        label: cleanText(eventLabelByCode[eventCode] || eventCode, 180),
        detail: genderLabel
      };
    }).filter((item) => item.label)
  })).filter((session) => session.items.length || session.date || session.startTime);
}

function publicCalendarDetail(data = {}, options = {}) {
  const summary = publicCalendarSummary(data, options);
  const isCompetition = summary.sourceType === "competition";
  const program = isCompetition
    ? publicCalendarCompetitionProgram(data, options.eventLabelByCode || {})
    : cleanPublicCalendarProgram(data.programSessions);
  return {
    ...summary,
    location: cleanText(data.location, 160),
    address: cleanText(data.address, 300),
    organizer: cleanText(data.organizer, 160),
    description: cleanText(data.publicDescription || data.description, 3000),
    entryDeadlineAt: cleanText(data.entryDeadlineAt, 40),
    entryStatus: isCompetition ? cleanText(data.entryStatus, 20) : "",
    registrationUrl: cleanPublicCalendarUrl(data.registrationUrl, 500),
    engagementCompetitionId: isCompetition ? summary.id : "",
    program,
    documents: cleanPublicCalendarDocuments(data.clubDocuments),
    results: data.resultsPublishedAt ? {
      publishedAt: cleanText(data.resultsPublishedAt, 40),
      url: cleanText(data.resultsUrl, 900),
      pdfUrl: cleanText(data.resultsPdfUrl, 900)
    } : null
  };
}

function publicCalendarDisplayStatus(event = {}, today = "") {
  const date = cleanIsoDate(today) || new Date().toISOString().slice(0, 10);
  if (event.canceled === true) return "canceled";
  if (cleanText(event.resultsPublishedAt)) return "resultsPublished";
  const startDate = cleanIsoDate(event.date);
  const endDate = cleanIsoDate(event.endDate) || startDate;
  if (startDate && date < startDate) return "upcoming";
  if (startDate && endDate && date <= endDate) return "ongoing";
  return "awaitingResults";
}

function comparePublicCalendarEvents(left = {}, right = {}, today = "") {
  const statusOrder = { ongoing: 0, upcoming: 1, canceled: 2, awaitingResults: 3, resultsPublished: 4 };
  const leftStatus = publicCalendarDisplayStatus(left, today);
  const rightStatus = publicCalendarDisplayStatus(right, today);
  return (statusOrder[leftStatus] ?? 9) - (statusOrder[rightStatus] ?? 9) ||
    cleanText(left.date).localeCompare(cleanText(right.date)) ||
    cleanText(left.name).localeCompare(cleanText(right.name), "fr");
}

module.exports = {
  PUBLIC_CALENDAR_EVENT_TYPES,
  PUBLIC_CALENDAR_GENERIC_EVENT_TYPES,
  PUBLIC_CALENDAR_LEVELS,
  PUBLIC_CALENDAR_PUBLICATION_STATUSES,
  cleanPublicCalendarDocuments,
  cleanPublicCalendarEventType,
  cleanPublicCalendarLevel,
  cleanPublicCalendarProgram,
  cleanPublicCalendarPublicationStatus,
  cleanPublicCalendarUrl,
  comparePublicCalendarEvents,
  publicCalendarDetail,
  publicCalendarDisplayStatus,
  publicCalendarSummary
};
