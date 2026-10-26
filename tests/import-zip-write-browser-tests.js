"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),{chromium}=require("playwright"),{archive}=require("./winpalme-zip-tests");
const {clubFixture}=require("./fixtures/nap-import-clubs-fixture"),{previewNativeImport}=require("../functions/nap-import-preview"),{importPreviewResponse}=require("../functions/nap-import-response");
const portal=fs.readFileSync("portail.html","utf8");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440]){
  const f=clubFixture(),calls=[],errors=[],page=await browser.newPage({viewport:{width,height:1000}});let lost=true,accept=false;
  page.on("pageerror",e=>errors.push(e.message));page.on("dialog",dialog=>accept?dialog.accept():dialog.dismiss());
  await page.exposeFunction("fixtureCall",async(name,payload)=>{
   calls.push({name,payload:structuredClone(payload)});
   if(name==="listCompetitionImports")return {imports:[]};
   if(name==="previewCompetitionImport"){assert.equal(payload.protocolDataUrl,undefined,"Analysis never sends PDF bytes");assert.equal(payload.textArchive,undefined,"Analysis never sends duplicate original TXT bytes");const result=importPreviewResponse(await previewNativeImport(f.pool,payload));return {...result,previewOnly:false,reviewReady:result.canConfirm};}
   assert.equal(name,"createCompetitionImport");assert.match(payload.protocolDataUrl,/^data:application\/pdf;base64,/);assert.equal(payload.textArchive.fileName,'TEST_Export.txt');assert.equal(payload.textArchive.encoding,'utf-8');assert.equal(Buffer.from(payload.textArchive.dataBase64,'base64').toString('utf8'),raw);assert.equal(payload.zipSelection,undefined);assert.equal(payload.workbook,undefined);if(lost){lost=false;throw Error("Simulated lost response");}return {ok:true,source:"nap",importId:"synthetic-only"};
  });
  await page.route("**/*",r=>r.abort());await page.route("https://fixture.test/**",r=>r.fulfill({contentType:"text/html",body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page"></body></html>'}));await page.goto("https://fixture.test/portail.html#import-competitions");
  await page.evaluate(html=>{const doc=new DOMParser().parseFromString(html,"text/html");document.body.append(doc.querySelector("#adminImportView"));document.querySelector("#adminImportView").hidden=false;window.LivePalmesEnvironment={sportingDataSource:"nap"};window.LivePalmesAppConfig={firebaseConfig:{}};window.LivePalmesPortalAuth={onChange:()=>{},status:()=>({signedIn:true,available:true}),isAdminAuthenticated:()=>true};const service={httpsCallable:name=>async payload=>({data:await fixtureCall(name,payload)})};window.firebase={initializeApp:()=>{},apps:[{}],app:()=>({functions:()=>service}),functions:()=>service};},portal);
  for(const file of ["styles.css","assets/livepalmes-admin-portal.css","performances/public/import-competitions.css"])await page.addStyleTag({path:file});
  await page.addScriptTag({path:"assets/livepalmes-portal-ux.js"});
  for(const file of ["winpalme-zip","import-confirmation-message","import-swimmer-creation","import-swimmer-review","import-competitions"])await page.addScriptTag({path:`performances/public/${file}.js`});
  const raw=f.input.rawText.split("\n").filter(line=>!/^NAG;|^REL;/.test(line)||line.startsWith("NAG;TEST;")).join("\n");
  const zip=archive([{name:"ExportTxt/TEST_Export.txt",data:raw},{name:"Protocoles/TEST_ProtocoleComplet_20261014_06553360.pdf",data:"%PDF-1.4\nSynthetic only\n%%EOF"}]);
  await page.locator("#competitionImportOpenButton").click();await page.locator("#competitionImportFile").setInputFiles({name:"fixture.zip",mimeType:"application/zip",buffer:zip});await page.locator('#competitionImportForm button[type="submit"]').click();
  const save=page.locator("[data-nap-save]");await save.waitFor({timeout:10000}).catch(async error=>{console.error(errors,await page.locator('#competitionImportDialog').innerText());throw error;});assert.equal(await save.isDisabled(),true);
  await page.locator("[data-review-competition]").selectOption("5172");await page.locator("[data-review-refresh]").click();await page.locator("[data-review-ack]").waitFor({state:"attached"});
  await page.locator('[data-review-open="group:matched"] > summary').click();await page.locator('.import-review-nav [data-review-panel]').filter({hasText:/^TEST /}).click();await page.locator("[data-review-ack]").check();assert.equal(await save.isDisabled(),true);
  await page.locator("[data-review-refresh]").click();await page.locator('[data-review-panel="bilan"]').click();await page.locator("[data-review-replacement]").waitFor();assert.equal(await save.isDisabled(),true);assert.match(await page.locator("#competitionImportWarnings").innerText(),/Protocole PDF/);
  await page.locator("[data-review-replacement]").check();assert.equal(await save.isDisabled(),false);
  if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){fs.mkdirSync("outputs/import-write",{recursive:true});await save.scrollIntoViewIfNeeded();await page.screenshot({path:`outputs/import-write/ready-${width}.png`});}
  await save.click();assert.equal(calls.filter(c=>c.name==="createCompetitionImport").length,0,"Cancel never writes");
  accept=true;await save.click();await page.getByText("Enregistrement à vérifier",{exact:true}).waitFor({timeout:10000}).catch(async error=>{console.error(errors,calls.map(c=>c.name),await page.locator('#competitionImportDialog').innerText());throw error;});assert.equal(await save.isDisabled(),false);assert.equal(await page.locator("[data-review-refresh]").isDisabled(),true,"Uncertain result freezes reviewed choices");
  await save.click();await page.getByText("Résultats enregistrés dans NAP",{exact:true}).waitFor();
  const writes=calls.filter(c=>c.name==="createCompetitionImport");assert.equal(writes.length,2);assert.deepEqual(writes[0].payload,writes[1].payload,"Retry keeps UUID, choices, PDF and fingerprints");assert.equal(writes[0].payload.clubAcknowledgements.length,1);assert.equal(writes[0].payload.confirmReplacement,true);assert.equal(writes[0].payload.replacementReviewFingerprint,writes[0].payload.previewFingerprint);assert.equal(await save.isDisabled(),true);assert.equal(await page.locator("#competitionImportDialog").evaluate(el=>el.scrollWidth>el.clientWidth+1),false);assert.deepEqual(errors,[]);await page.close();
 }console.log("ZIP save UI: real grouped preview, acknowledgement/refresh/replacement gates, cancel, PDF only on final confirmation, frozen choices and identical retry; desktop 1440 px, all calls simulated and network blocked.");}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
