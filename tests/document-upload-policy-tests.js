"use strict";
const assert = require("node:assert/strict");
const fs = require("./helpers/source-files");
const vm = require("node:vm");
const portal = fs.readFileSync(require.resolve("../assets/livepalmes-admin-portal.js"), "utf8");
const calendar = fs.readFileSync(require.resolve("../assets/livepalmes-admin-calendar-events.js"), "utf8");
const section = (source, start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const file = size => ({ name: "document.pdf", size });
const MiB = 1024 * 1024;
function fixture(national, files, confirmed = true, editing = false) {
  const state = { alerts: 0, reads: 0, calls: [] };
  const message = { textContent: "", dataset: {} };
  const context = {
    global: { confirm: () => { state.alerts++; return confirmed; }, dispatchEvent: () => {}, LivePalmesPortalAuth: { hasCapability: () => national } },
    CustomEvent: class {},
    elements: { engagementsDocumentFiles: { files, value: "" }, engagementsDocumentFormMessage: message },
    selectedEngagementCompetitionId: "legacy-nap-1",
    selectedEngagementCompetition: { clubDocuments: editing ? [{ id: "nap-42", size: 5 * MiB }] : [] },
    engagementCompetitionDocumentEditingId: editing ? "nap-42" : "",
    engagementCompetitionDocumentFiles: [], engagementCompetitionDocumentSaving: false,
    canUse: () => national, isEngagementAdminMode: () => true,
    renderEngagementCompetitionDocumentDrafts: () => {}, renderEngagementDocuments: () => {},
    closeEngagementCompetitionDocumentForm: () => {}, updateSelectedEngagementCompetitionDocuments: () => {},
    engagementCompetitionDocumentDraftValues: () => (editing ? [{}] : files).map(() => ({ title: "Titre" })),
    readEngagementCompetitionDocumentFile: async () => { state.reads++; return "synthetic"; },
    callFunction: async (name, input) => { state.calls.push({ name, input }); return { documents: [], documentId: "nap-42" }; },
    current: { id: "legacy-nap-1", clubDocuments: [] }, editingDocumentId: editing ? "nap-42" : "",
    cancelDocumentEdit: () => {}, ensureDialog: () => ({ querySelector: () => message }), renderDocuments: () => ""
  };
  context.call = context.callFunction;
  context.readFile = context.readEngagementCompetitionDocumentFile;
  vm.createContext(context);
  vm.runInContext([
    section(portal, "  const ENGAGEMENT_COMPETITION_DOCUMENT_MAX_BYTES", "  function engagementCompetitionDocumentCategoryLabel("),
    section(portal, "  function handleEngagementCompetitionDocumentFiles(", "  function updateSelectedEngagementCompetitionDocuments("),
    section(portal, "  async function saveEngagementCompetitionDocuments(", "  async function deleteEngagementCompetitionDocument("),
    section(calendar, "  async function uploadDocument(", "  async function deleteEventDocument(")
  ].join("\n"), context);
  return { state, context, message, event: { preventDefault() {}, target: { querySelector: () => message, elements: { file: { files }, title: { value: "Titre" }, category: { value: "other" }, description: { value: "" } } } } };
}
(async () => {
  for (const calendarMode of [false, true]) {
    async function run(national, files, confirmed = true, editing = false) {
      const f = fixture(national, files, confirmed, editing);
      if (calendarMode) await f.context.uploadDocument(f.event);
      else { f.context.handleEngagementCompetitionDocumentFiles(); if (f.context.engagementCompetitionDocumentFiles.length || editing) await f.context.saveEngagementCompetitionDocuments(f.event); }
      return f;
    }
    let f = await run(false, [file(2 * MiB)]);
    assert.equal(f.state.calls.length, 1); assert.equal(f.state.alerts, 0);
    f = await run(false, [file(2 * MiB + 1)]);
    assert.equal(f.state.calls.length, 0); assert.equal(f.state.reads, 0); assert.match(f.message.textContent, /2 Mo/);
    f = await run(true, [file(2 * MiB + 1)], false);
    assert.equal(f.state.calls.length, 0); assert.equal(f.state.reads, 0); assert.equal(f.state.alerts, 1);
    f = await run(true, [file(10 * MiB)]);
    assert.equal(f.state.calls.length, 1); assert.equal(f.state.alerts, 1);
    f = await run(true, [file(10 * MiB + 1)]);
    assert.equal(f.state.calls.length, 0); assert.equal(f.state.reads, 0); assert.equal(f.state.alerts, 0); assert.match(f.message.textContent, /10 Mo/);
    f = await run(false, [], false, true);
    assert.equal(f.state.calls[0].name, "updateEngagementCompetitionDocument"); assert.equal(f.state.alerts, 0);
  }
  const batch = fixture(true, [file(3 * MiB), file(4 * MiB)]);
  batch.context.handleEngagementCompetitionDocumentFiles();
  await batch.context.saveEngagementCompetitionDocuments(batch.event);
  assert.equal(batch.state.alerts, 1, "One confirmation covers a multi-file deposit");
  assert.equal(batch.state.calls.length, 2);
  const forged = fixture(false, [file(3 * MiB)]);
  forged.context.engagementCompetitionDocumentFiles = [file(3 * MiB)];
  await forged.context.saveEngagementCompetitionDocuments(forged.event);
  assert.equal(forged.state.calls.length, 0, "Save rechecks the role even if selection validation is skipped");
  const index = fs.readFileSync(require.resolve("../functions/index.js"), "utf8");
  const binding = section(index, "async function mutateNativeCompetitionDocument(", "exports.uploadEngagementCompetitionDocument");
  assert.ok(binding.includes("national:context.national === true"), "The upload policy uses trusted context, not request.data.national");
  console.log("Document upload policy: regional 2 MiB, trusted national 10 MiB, pre-transfer cancellation, replacements, metadata and batch confirmation passed offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
