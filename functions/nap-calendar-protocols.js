"use strict";
const { positiveId, publicUrl } = require("./nap-calendar-values");
const { item } = require("./nap-competition-documents");
const MAX_EVENTS = 500, MAX_DOCUMENTS = 100;

// Same public GED classification and URL validation as the competition detail.
// A PDF is a publication, but never creates a structured-results link.
function applyPublishedProtocol(event, documents) {
  const pdf = publicUrl(event.results?.pdfUrl) || documents.find(document =>
    document.category === "results" && /\.pdf(?:$|[?#])/i.test(document.url))?.url || "";
  event.results = { ...event.results, pdfUrl: pdf };
  if (pdf && !event.resultsPublishedAt) event.resultsPublishedAt = event.date;
  return event;
}

async function attachPublishedProtocols(connection, events) {
  if (!events.length) return events;
  const ids = [...new Set(events.map(event => positiveId(event.id)))];
  if (ids.length > MAX_EVENTS) throw new RangeError("Saison trop volumineuse.");
  // One grouped read, independent of displayed rows; same 100 public documents
  // per competition ceiling as readDocuments. No scan or per-event RPC fallback.
  const limit = ids.length * MAX_DOCUMENTS;
  const [rows] = await connection.execute({ sql: `SELECT d.id,d.competition,d.name,d.location,d.comment,t.label AS type_label,o.document_id,o.category FROM documents d FORCE INDEX (livepalmes_compet_public_id) LEFT JOIN documents_types t FORCE INDEX (PRIMARY) ON t.id=d.type LEFT JOIN livepalmes_document_options o FORCE INDEX (PRIMARY) ON o.document_id=d.id WHERE d.competition IN (${ids.map(() => "?").join(",")}) AND d.public='Y' ORDER BY d.competition,d.id LIMIT ${limit + 1}`, timeout: 10000 }, ids);
  if (rows.length > limit) throw new RangeError("Documents trop volumineux.");
  const byId = new Map(ids.map(id => [id, []]));
  for (const row of rows) {
    const documents = byId.get(Number(row.competition));
    if (!documents || documents.length >= MAX_DOCUMENTS) throw new RangeError("Documents de competition incoherents.");
    documents.push(item(row));
  }
  return events.map(event => applyPublishedProtocol(event, byId.get(positiveId(event.id))));
}

module.exports = { applyPublishedProtocol, attachPublishedProtocols };
