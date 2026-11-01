"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { startStaticServer, launchBrowser, evaluate, waitFor } = require("../tools/capture-portal-design");

async function main() {
  const source = fs.readFileSync("assets/livepalmes-admin-portal.js", "utf8");
  const config = {};
  for (const name of ["LIVEPALMES_REGION_DEFINITIONS", "LIVEPALMES_REFERENCE_REGION_LABELS"]) {
    const expression = source.match(new RegExp(`const ${name} = ([\\s\\S]*?);`))[1];
    config[name] = vm.runInNewContext(`(${expression})`);
  }
  const { server, baseUrl } = await startStaticServer();
  const browser = await launchBrowser();
  const client = browser.client;
  try {
    for (const width of [1280, 390, 320]) {
      await client.send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
      await client.send("Page.navigate", { url: baseUrl + "/portail.html" });
      assert.ok(await waitFor(client, "document.readyState === 'complete' && !!window.LivePalmesPortalModulesAndClubs", 12000));
      const result = await evaluate(client, `return (() => {
        try {
        const byId = id => document.getElementById(id);
        const elements = Object.fromEntries([
          ['publicAccessRequestRegionId','adminPublicAccessRequestRegionId'],
          ['publicAccessRequestLicenseNumber','adminPublicAccessRequestLicenseNumber'],
          ['publicAccessRequestClubSelect','adminPublicAccessRequestClubSelect'],
          ['publicAccessRequestClubId','adminPublicAccessRequestClubId'],
          ['publicAccessRequestClubName','adminPublicAccessRequestClubName'],
          ['engagementsAccessRequestEditRegionId','adminEngagementsAccessRequestEditRegionId'],
          ['engagementsAccessRequestEditLicenseNumber','adminEngagementsAccessRequestEditLicenseNumber'],
          ['engagementsAccessRequestEditClubSelect','adminEngagementsAccessRequestEditClubSelect']
        ].map(([key,id]) => [key,byId(id)]));
        const state = { accessClubReference: [
          {clubId:'10',clubName:'Club français',clubCode:'FR',regionId:'Ile de France'},
          {clubId:'20',clubName:'Club étranger',clubCode:'INT',regionId:'CMAS'}
        ] };
        const actions = {};
        const module = LivePalmesPortalModulesAndClubs.create({state,elements,actions,config:${JSON.stringify(config)}});
        Object.assign(actions,module);
        module.populateAccessRegionChoices();
        const region = elements.publicAccessRequestRegionId;
        const license = elements.publicAccessRequestLicenseNumber;
        const choices = [...region.options].filter(option => option.value === 'CMAS');
        region.value = 'CMAS';
        module.populatePublicAccessRequestClubSelect();
        const foreign = {required:license.required,valid:license.checkValidity(),hint:!license.closest('label').querySelector('[data-access-license-hint]').hidden,clubs:[...elements.publicAccessRequestClubSelect.options].map(o=>o.value)};
        elements.publicAccessRequestClubSelect.value='20';
        module.syncPublicAccessRequestClubFieldsFromSelect();
        foreign.clubId = elements.publicAccessRequestClubId.value;
        region.value = 'Ile de France';
        module.populatePublicAccessRequestClubSelect();
        const french = {required:license.required,valid:license.checkValidity(),hint:!license.closest('label').querySelector('[data-access-license-hint]').hidden,clubs:[...elements.publicAccessRequestClubSelect.options].map(o=>o.value)};
        elements.engagementsAccessRequestEditRegionId.value='CMAS';
        module.populateEngagementAccessRequestEditClubSelect('20');
        const reviewOptional = !elements.engagementsAccessRequestEditLicenseNumber.required;
        elements.engagementsAccessRequestEditRegionId.value='Ile de France';
        module.populateEngagementAccessRequestEditClubSelect();
        const reviewFrenchRequired = elements.engagementsAccessRequestEditLicenseNumber.required;
        byId('adminPublicAccessRequestForm').reset();
        module.populatePublicAccessRequestClubSelect();
        const resetRequired = license.required;
        region.value='CMAS';module.populatePublicAccessRequestClubSelect();
        byId('adminPortalLoginPanel').hidden=false;
        byId('adminPortalDashboard').hidden=true;
        document.body.dataset.adminAuth='locked';
        document.body.setAttribute('aria-busy','false');
        byId('adminPublicAccessRequestForm').closest('details').open=true;
        license.scrollIntoView({block:'center'});
        return {label:choices[0]?.textContent,count:choices.length,foreign,french,reviewOptional,reviewFrenchRequired,resetRequired,visible:license.getBoundingClientRect().height>0,overflow:document.documentElement.scrollWidth>innerWidth};
        } catch (error) { return { error: error.stack }; }
      })()`);
      assert.equal(result?.error, undefined, JSON.stringify(result));
      assert.equal(result.label, "Clubs étrangers (CMAS)");
      assert.equal(result.count, 1);
      assert.deepEqual(result.foreign, { required: false, valid: true, hint: true, clubs: ["", "20"], clubId: "20" });
      assert.deepEqual(result.french, { required: true, valid: false, hint: false, clubs: ["", "10"] });
      assert.ok(result.reviewOptional && result.reviewFrenchRequired && result.resetRequired);
      assert.ok(result.visible, "The tested form must be visible");
      assert.equal(result.overflow, false, `Overflow at ${width}px`);
      const screenshot = await client.send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(path.join(os.tmpdir(), `livepalmes-cmas-${width}.png`), Buffer.from(screenshot.data, "base64"));
      console.log(`Foreign club form: ${width}px, selection, licence, review, reset and overflow OK.`);
    }
  } finally { browser.cleanup(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
