"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {fixture,people}=require('./fixtures/nap-import-review-fixture'),{previewNativeImport}=require('../functions/nap-import-preview'),{importPreviewResponse}=require('../functions/nap-import-response');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440,390,320]){
  const f=fixture(),calls=[],errors=[];let blocked=true,attempt=0,created=null;
  const execute=f.pool.execute;f.pool.execute=async(query,values)=>{const rows=await execute(query,values);if(created&&query.sql.includes('FROM nageurs')&&(values.includes(created.id)||values.includes(created.nom)))rows[0].push(created);return rows;};
  const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.abort());await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body><p id="summary"></p><div id="host"></div></body></html>'}));await page.goto('https://fixture.test/');
  await page.exposeFunction('readPreview',async payload=>{calls.push('refresh');const r=importPreviewResponse(await previewNativeImport(f.pool,payload));return {...r,previewOnly:true,reviewReady:r.canConfirm,canConfirm:false};});
  await page.exposeFunction('checkCreation',async data=>{calls.push('check');assert.equal(data.importReview,true);assert.equal(data.swimmer.lastName,'UNKNOWN');assert.equal(data.swimmer.licenseNumber,'A-12-34567');return {blocksCreation:blocked,alerts:blocked?[{type:'duplicate',swimmerId:'171',name:'EXISTANT',birthDate:'2000-02-01',clubName:'Club source',message:'Identité existante'}]:[]};});
  await page.exposeFunction('performCreation',async data=>{calls.push(structuredClone(data));assert.equal(data.confirmNewSwimmer,true);attempt++;if(attempt===1){blocked=false;throw Error('Réponse interrompue (simulation)');}created={id:174,nom:data.swimmer.lastName,prenom:data.swimmer.firstName,date:data.swimmer.birthDate,sexe:data.swimmer.sex,club:data.clubId};return {swimmer:{id:'174',lastName:created.nom,firstName:created.prenom,birthDate:created.date,sex:created.sexe,clubId:created.club}};});
  for(const file of ['styles.css','performances/public/import-competitions.css'])await page.addStyleTag({path:file});
  for(const file of ['performances/public/import-confirmation-message.js','performances/public/import-swimmer-creation.js','performances/public/import-swimmer-review.js'])await page.addScriptTag({path:file});
  await page.evaluate(async input=>{
   window.payload=input;window.result=await readPreview(input);window.searchCount=0;
   window.draw=()=>LivePalmesImportReview.render({result,payload,host:document.querySelector('#host'),summary:document.querySelector('#summary'),onChange:()=>{result.reviewStale=true;result.reviewReady=false;},onRefresh:async()=>{result=await readPreview(payload);LivePalmesImportReview.settled();draw();},onSearch:async()=>{searchCount++;return [];},onPreviewCreation:checkCreation,onCreateSwimmer:performCreation});draw();
  },f.input);
  const card=page.locator('details.import-swimmer').filter({has:page.locator('summary').filter({hasText:/^UNKNOWN /})});await card.locator(':scope > summary').click();
  await card.locator('[data-review-create]').click();assert.match(await card.locator('[data-review-creation]').innerText(),/Recherchez d’abord/);assert.deepEqual(calls,['refresh']);
  await card.getByText('Choisir ou rechercher un profil NAP',{exact:true}).click();await card.locator('[data-review-query]').fill('UNKNOWN');await card.locator('[data-review-search]').click();await card.getByText(/Aucun profil trouvé/).waitFor();
  await card.locator('[data-review-create]').click();assert.equal(await card.locator('[data-create-field="lastName"]').inputValue(),'UNKNOWN');assert.equal(await card.locator('[data-create-field="birthDate"]').inputValue(),'2000-02-01');assert.equal(await card.locator('[data-create-club]').inputValue(),'106');assert.equal(await card.locator('[data-create-save]').isDisabled(),true);
  await card.locator('[data-create-check]').click();assert.deepEqual(calls,['refresh'],'Missing licence does not call the server');
  await card.locator('[data-create-field="licenseNumber"]').fill('A-12-34567');await card.locator('[data-create-check]').click();await card.getByText(/Une fiche existe/).waitFor();await card.locator('[data-create-confirm]').check();assert.equal(await card.locator('[data-create-save]').isDisabled(),true,'Exact duplicate blocks creation');
  blocked=false;await card.locator('[data-create-check]').click();await card.getByText(/Aucun doublon détecté/).waitFor();assert.equal(await card.locator('[data-create-save]').isDisabled(),true);
  await card.locator('[data-create-confirm]').check();assert.equal(await card.locator('[data-create-save]').isDisabled(),false);
  await card.locator('[data-create-field="firstName"]').fill('Inconnu ');assert.equal(await card.locator('[data-create-save]').isDisabled(),true,'Editing invalidates duplicate verification');
  await card.locator('[data-create-check]').click();await card.getByText(/Aucun doublon détecté/).waitFor();await card.locator('[data-create-confirm]').check();
  if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){fs.mkdirSync('outputs/import-creation',{recursive:true});await card.locator('[data-create-save]').scrollIntoViewIfNeeded();await page.screenshot({path:`outputs/import-creation/creation-${width}.png`});}
  assert.equal(await page.locator('#host').evaluate(el=>el.scrollWidth>document.documentElement.clientWidth+1),false);
  await card.locator('[data-create-save]').click();await card.getByText(/même opération est conservée/).waitFor();assert.equal(await card.locator('[data-create-field="lastName"]').isDisabled(),true);
  await card.locator('[data-create-save]').click();await page.waitForFunction(()=>result.review.groups.find(g=>g.source.lastName==='UNKNOWN').profile?.id===174);
  const writes=calls.filter(c=>typeof c==='object');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1],'Retry preserves identical operation UUID and fields');assert.equal(writes[0].confirmAlerts,false);assert.equal(attempt,2);
  assert.equal(await page.locator('[data-review-create]').count(),0);assert.equal(await page.locator('[data-nap-save]').isDisabled(),true);
  const state=await page.evaluate(()=>({bindings:payload.swimmerBindings,relay:result.review.relays[0].members[1].profile.id}));assert.equal(state.relay,174,'Created swimmer is reused in the relay');assert.ok(state.bindings.some(b=>b.swimmerId===174));assert.deepEqual(errors,[]);await page.close();
 }console.log('Import creation UI: unknown-only, prior search, prefill/licence, duplicate block, recheck after edits, explicit confirmation, same-operation retry, automatic swimmer/relay refresh; offline 1440/390/320 px.');}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
