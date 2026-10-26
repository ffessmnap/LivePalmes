"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {fixture}=require('./fixtures/nap-import-review-fixture'),{previewNativeImport}=require('../functions/nap-import-preview'),{importPreviewResponse}=require('../functions/nap-import-response');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440,1280]){
  const f=fixture(),page=await browser.newPage({viewport:{width,height:900}}),errors=[];let reads=0;
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent('<!doctype html><html lang="fr"><body><p id="summary"></p><div id="host"></div></body></html>');
  await page.exposeFunction('readPreview',async payload=>{reads++;const r=importPreviewResponse(await previewNativeImport(f.pool,payload));return {...r,previewOnly:false,reviewReady:r.canConfirm};});
  for(const file of ['styles.css','performances/public/import-competitions.css'])await page.addStyleTag({path:file});
  for(const file of ['import-confirmation-message','import-swimmer-creation','import-swimmer-review'])await page.addScriptTag({path:`performances/public/${file}.js`});
  await page.evaluate(async input=>{window.payload=input;window.result=await readPreview(input);window.writes=0;window.draw=()=>LivePalmesImportReview.render({result,payload,host:document.querySelector('#host'),summary:document.querySelector('#summary'),onChange:()=>{result.reviewStale=true;result.canConfirm=false;},onRefresh:async()=>{result=await readPreview(payload);LivePalmesImportReview.settled();draw();},onSearch:async()=>[],onSave:()=>{throw Error('Real save forbidden in browser fixture');},onCreateSwimmer:()=>{writes++;throw Error('Creation forbidden');}});draw();},f.input);
  const nav=page.locator('.import-review-nav'),pane=page.locator('.import-review-pane');
  const person=async name=>{const b=nav.locator('[data-review-panel]').filter({hasText:new RegExp('^'+name+' ')});const group=b.locator('..');if(!await group.evaluate(el=>el.open))await group.locator(':scope > summary').click();await b.click();return pane.locator('.import-swimmer:visible');};
  const panel=async key=>{await nav.locator(`[data-review-panel="${key}"]`).click();};
  assert.equal(await pane.locator('.import-swimmer:visible').count(),1);assert.match(await pane.innerText(),/DUP Homonyme/);
  const initialReads=reads;let card=await person('DUP');await card.locator('[data-review-create]').click();assert.match(await card.locator('[data-review-creation]').innerText(),/Recherchez d’abord/);
  await card.locator('[data-review-query]').fill('DUP');await card.locator('[data-review-search]').click();await card.getByText(/Aucun profil trouvé/).waitFor();await card.locator('[data-review-create]').click();assert.equal(await card.locator('[data-create-field="lastName"]').inputValue(),'DUP');assert.equal(await card.locator('[data-create-save]').isDisabled(),true);assert.equal(reads,initialReads,'Navigation and creation form use no preview reads');
  await card.locator('[data-review-exclude-person]').check();assert.deepEqual(await page.evaluate(()=>payload.excludedSourceLines),[6]);assert.equal(await page.locator('[data-prepare-confirmation]').isDisabled(),true);
  card=await person('UNKNOWN');await card.locator('[data-review-exclude-person]').check();assert.deepEqual(await page.evaluate(()=>payload.excludedSourceLines),[6,7,10],'Unknown swimmer exclusion explicitly includes the linked relay');
  card=await person('TEST');await card.getByText(/Performances et passages/).click();await card.locator('[data-review-exclude="5"]').check();await card.locator('[data-review-ack]').check();await page.locator('[data-review-refresh]').click();
  await page.waitForFunction(()=>result.canConfirm);assert.equal(await page.locator('[data-nap-save]').isDisabled(),true);
  await panel('excluded');assert.equal(await pane.locator('[data-review-open="excluded"] [data-review-exclude]').count(),4);await pane.locator('[data-review-exclusions-confirm]').check();assert.equal(await page.locator('[data-nap-save]').isDisabled(),true,'Replacement still needs its own consent');
  await panel('bilan');assert.match(await pane.innerText(),/retraits/);await pane.locator('[data-review-replacement]').check();assert.equal(await page.locator('[data-nap-save]').isDisabled(),false);
  await page.locator('[data-prepare-confirmation]').click();assert.match(await page.locator('[data-confirmation-host]').innerText(),/Aucun cas/,'Ignored swimmers and relay no longer appear in the request');
  await panel('excluded');await pane.locator('[data-review-open="excluded"] [data-review-exclude="10"]').click();assert.equal(await page.locator('[data-nap-save]').isDisabled(),true);assert.equal(await page.locator('[data-prepare-confirmation]').isDisabled(),true);assert.equal(await page.locator('[data-review-exclusions-confirm]').isChecked(),false);
  await page.locator('[data-review-refresh]').click();await page.waitForFunction(()=>result.unresolvedMembers.length>0);await panel('relays');await pane.locator('[data-review-open="relay:10"] > summary').click();assert.equal(await pane.locator('[data-review-query]').count()>0,true,'Incomplete relay can search profiles for missing names');await pane.locator('[data-review-open="relay:10"] [data-review-exclude="10"]').check();await page.locator('[data-review-refresh]').click();await page.waitForFunction(()=>result.canConfirm);
  assert.equal(await page.evaluate(()=>writes),0);assert.deepEqual(errors,[]);assert.equal(await page.locator('#host').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){fs.mkdirSync('outputs/import-compact',{recursive:true});await person('TEST');await page.screenshot({path:`outputs/import-compact/review-${width}.png`,fullPage:true});}
  await page.close();
 }console.log('Compact desktop ZIP review: one dossier, orange creation after search, individual/swimmer/linked-relay exclusions, restore, independent consents, stale-message/save invalidation; offline 1440/1280, no writes.');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
