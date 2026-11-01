"use strict";
// Existing singleton, values or query bodies; no business change.
function listItem(event) {
  return { ...event, source: "nap", napSource: true, sourceType: "competition", publicationStatus: "published",
    publicDescription: event.description || "", resultsUrl: event.results?.url || "", resultsPdfUrl: event.results?.pdfUrl || "",
    nativeReadOnly: true, clubEntryExists: null };
}

module.exports = { listItem };
