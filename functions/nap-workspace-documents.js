"use strict";
// Existing singleton, values or query bodies; no business change.
async function readDocuments(connection, competitionId, options={}) {
  return require("./nap-competition-documents").readDocuments(connection, competitionId, options);
}

module.exports = { readDocuments };
