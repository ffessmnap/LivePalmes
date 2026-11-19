"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const PDFDocument = require("../../functions/node_modules/pdfkit");
const { evaluate, waitFor } = require("../../tools/capture-portal-design");

async function writeProgram(file) {
  const pdf = new PDFDocument({ font: "Helvetica" });
  const stream = fs.createWriteStream(file);
  const finished = require("node:stream/promises").pipeline(pdf, stream);
  pdf.text("Session 1");
  pdf.text("100 m Surface - Femmes");
  pdf.text("série : 1 / 1 Horaire indicatif : 09:00");
  pdf.text("4 EXEMPLE Béa 08 FJU CLUB 01:10.00");
  pdf.text("5 LIGNE INCOMPLETE");
  pdf.addPage();
  pdf.text("Session 2");
  pdf.text("4 x 100 m Surface - Mixte");
  pdf.text("série : 1 / 1 Horaire indicatif : 09:10");
  pdf.text("4 EQUIPE DEMO XSE CLUB 04:10.00");
  pdf.end();
  await finished;
}

async function checkPdfPreview(client) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "livepalmes-direct-pdf-"));
  const program = path.join(dir, "series-fictives.pdf");
  const invalid = path.join(dir, "illisible.pdf");
  try {
    await writeProgram(program);
    fs.writeFileSync(invalid, "%PDF-1.7\nDocument fictif incomplet.");
    await evaluate(client, `testApi.showTab('imports');
      window.pdfWorkers = [];
      window.pdfRefusals = [];
      document.addEventListener('securitypolicyviolation', e => pdfRefusals.push(e.blockedURI));
      window.Worker = new Proxy(window.Worker, {construct(Target, args) {
        const worker = new Target(...args);
        const record = {url: new URL(args[0], document.baseURI).href, responses: 0};
        pdfWorkers.push(record);
        worker.addEventListener('message', () => record.responses++);
        return worker;
      }});`);
    const {root} = await client.send("DOM.getDocument");
    const {nodeId} = await client.send("DOM.querySelector", {nodeId: root.nodeId, selector: "#importFiles"});
    assert.ok(nodeId, "Sélecteur de fichiers du bureau");
    await client.send("DOM.setFileInputFiles", {nodeId, files: [program, invalid]});
    assert.ok(await waitFor(client, "LivePalmesDirectAdmin.state.groups.some(g => g.source?.name==='series-fictives.pdf' || g.error?.includes('series-fictives.pdf'))", 15000), "Aperçu du PDF depuis le sélecteur de fichiers");
    const result = await evaluate(client, "return {groups: LivePalmesDirectAdmin.state.groups, workers: pdfWorkers, refusals: pdfRefusals, preview: document.getElementById('importPreviews').textContent};");
    const valid = result.groups.filter(group => group.source?.name === "series-fictives.pdf");
    assert.equal(valid.length, 2, JSON.stringify({errors: result.groups.map(g => g.error), refusals: result.refusals}));
    assert.equal(valid[0].rows[0].firstName, "Béa");
    assert.equal(valid[0].rows[0].lane, 4);
    assert.equal(valid[1].rows[0].relay, true);
    assert.deepEqual(valid.map(group => group.event.sessionKey), ['1', '2']);
    assert.ok(valid[0].rows.some(row => row.reviewRequired && row.lane === 5));
    assert.match(result.preview, /illisible\.pdf/);
    assert.ok(result.groups.some(g => g.error?.includes("illisible.pdf")));
    assert.ok(result.workers.some(w => new URL(w.url).pathname.endsWith("/pdf.worker.min.mjs") && w.responses > 0), "Réponse du véritable worker local");
    assert.deepEqual(result.refusals, []);
  } finally {
    for (const file of [program, invalid]) fs.rmSync(file, {force:true});
    fs.rmdirSync(dir);
  }
}

module.exports = { checkPdfPreview };
