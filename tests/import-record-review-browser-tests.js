"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {fixture}=require('./fixtures/nap-import-record-review-fixture'),service=require('../functions/nap-import-record-review'),publication=require('../functions/nap-import-record-publication'),store=require('../functions/nap-records-store');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{for(const width of [1440,390,320]){
  const f=fixture(),calls=[],errors=[],page=await browser.newPage({viewport:{width,height:950}});let unavailable=false,lostPublication=true;
  f.state.official.data.franceRecords.push({...f.state.official.data.franceRecords[0],key:'rf-peer',swimmer:'Deuxième FICTIF'});
  page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.message);});page.on('dialog',dialog=>dialog.accept());
  await page.exposeFunction('fixtureCall',async(name,input)=>{
   calls.push({name,input:structuredClone(input)});
   if(name==='listCompetitionImports')return {source:'nap',national:true,imports:[{importId:f.importId,competitionId:5162,status:'completed',current:true,canDelete:true,fileName:'Fixture.txt',metadata:{competitionName:'Fixture',date:'2026-06-01'},metrics:{performances:3,swimmers:3,clubs:1},recordReview:{eligible:true,status:f.state.metadata.recordReview.status,count:f.state.metadata.recordReview.candidates.length}}]};
   if(name==='updateCompetitionImportRecordAlertDecision'){if(unavailable)throw Error('NAP indisponible simulé');return service.action(f.pool,input,f.actor);}
   if(name==='getNapPerformanceAdministration')return store.read(f.pool,{administration:true});
   if(name==='savePerformanceCorrection'){const result=await publication.publish(f.pool,input,f.actor);if(lostPublication){lostPublication=false;throw Error('Réponse de publication perdue simulée');}return result;}
   if(name==='getCurrentAccessUser')return {firstName:'Gestionnaire',lastName:'Fictif'};
   throw Error(name);
  });
  await page.route('**/*',route=>route.abort());await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page"></body></html>'}));await page.goto('https://fixture.test/portail.html#import-competitions');
  await page.evaluate(({html,fragment,importFragment})=>{
   const doc=new DOMParser().parseFromString(html,'text/html');for(const id of ['adminImportView','adminRecordsView']){const view=doc.getElementById(id);view.hidden=false;document.body.append(view);}document.querySelector('#adminRecordsView [data-portal-fragment-src]').innerHTML=fragment;
   document.querySelector('#importWorkbench').innerHTML=importFragment;
   window.LivePalmesEnvironment={sportingDataSource:'nap',functionsRegion:'europe-west1'};window.LivePalmesAppConfig={firebaseConfig:{}};
   window.LivePalmesPortalAuth={onChange:()=>{},status:()=>({signedIn:true,ready:true,available:true}),isAdminAuthenticated:()=>true,hasCapability:()=>true};
   const service={httpsCallable:name=>async input=>({data:await fixtureCall(name,input)})};window.firebase={initializeApp:()=>{},auth:()=>({}),apps:[{}],app:()=>({functions:()=>service}),functions:()=>service};
  },{html:fs.readFileSync('portail.html','utf8'),fragment:fs.readFileSync('assets/portal/views/records.html','utf8'),importFragment:fs.readFileSync('assets/portal/views/import.html','utf8')});
  for(const file of ['styles.css','performances/public/import-competitions.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  for(const match of fs.readFileSync('assets/livepalmes-admin-portal.css','utf8').matchAll(/@import url\("([^?]+)\?/g))await page.addStyleTag({content:fs.readFileSync('assets/'+match[1],'utf8')});
  for(const file of ['performances/public/store.js','performances/public/admin-records.js','performances/public/import-record-review.js','performances/public/import-competitions.js'])await page.addScriptTag({path:file});
  const section=page.locator('[data-native-record-review]');await section.waitFor({state:'attached'});const reads=calls.length;await page.locator('.competition-import-native summary').click();assert.equal(calls.length,reads,'Expanding history never detects or reads candidates');
  await section.locator('[data-import-record-command="detect"]').click();await section.locator('.competition-import-alert').first().waitFor();assert.equal(await section.locator('.competition-import-alert').count(),9);assert.match(await section.innerText(),/Passage individuel/);assert.match(await section.innerText(),/Premier relayeur/);assert.equal(f.state.official.revision,1);
  assert.equal(await section.evaluate(element=>element.scrollWidth>element.clientWidth+1),false,'No overflow at '+width);
  unavailable=true;await section.locator('[data-import-record-command="detect"]').click();await section.locator('[role="alert"]').waitFor();assert.match(await section.innerText(),/indisponible/);assert.doesNotMatch(await section.innerText(),/Aucune candidature détectée/);unavailable=false;
  await section.locator('[data-import-record-command="detect"]').click();await section.locator('.competition-import-alert').first().waitFor();
  const first=section.locator('.competition-import-alert').first();await first.locator('[data-candidate-state="accepted"]').click();await first.locator('[data-import-record-command="draft"]').waitFor();assert.match(await first.innerText(),/Contrôlée — non publiée/);assert.equal(f.state.official.revision,1);
  await first.locator('[data-import-record-command="draft"]').click();await page.waitForFunction(()=>location.hash==='#records-mpf');assert.ok(await page.locator('#adminDraftsPanel').isVisible());
  assert.equal(f.state.official.revision,1,'Preparing the native editor is never publication');await page.locator('#publishButton').click();await page.waitForFunction(()=>document.querySelector('#publishButton').textContent==='Publier les brouillons');await page.locator('#publishButton').click();await page.waitForFunction(()=>document.querySelector('#publishButton').textContent==='Publié');assert.equal(f.state.official.revision,2);assert.ok(f.state.metadata.recordReview.candidates.some(candidate=>candidate.state==='published'&&candidate.publishedRevision===2));
  const publications=calls.filter(call=>call.name==='savePerformanceCorrection');assert.equal(publications.length,2);assert.equal(publications[0].input.operationId,publications[1].input.operationId,'The native editor retains its operation and provenance after a lost publication response');
  assert.equal(f.state.official.data.franceRecords.filter(row=>row.recordType==='RF').length,1,'An improvement replaces the whole old tied reference');
  await section.locator('[data-import-record-command="read"]').click();await section.getByText(/Publiée · version 2/).waitFor();
  await section.locator('[data-import-record-command="detect"]').click();await section.locator('.competition-import-alert').filter({hasText:'égale'}).first().waitFor();
  const equal=section.locator('.competition-import-alert').filter({hasText:'égale'}).first();await equal.locator('[data-candidate-state="accepted"]').click();await equal.locator('[data-import-record-command="draft"]').waitFor();await equal.locator('[data-import-record-command="draft"]').click();await page.locator('#adminDraftsPanel').waitFor({state:'visible'});await page.locator('#publishButton').click();await page.waitForFunction(()=>document.querySelector('#publishButton').textContent==='Publié');assert.equal(f.state.official.revision,3);assert.equal(f.state.official.data.franceRecords.filter(row=>row.recordType==='RF').length,2,'An equal candidate adds a holder without replacing the existing holder');
  await page.evaluate(()=>{window.LivePalmesPortalAuth.hasCapability=()=>false;});await section.locator('[data-import-record-command="read"]').click();assert.equal(await section.locator('[data-import-record-command="decision"]').count(),0,'Import-only UI cannot offer human record decisions');
  if(process.env.LIVEPALMES_IMPORT_RECORD_SCREENSHOTS){fs.mkdirSync('outputs/import-record-review',{recursive:true});await page.screenshot({path:`outputs/import-record-review/review-${width}.png`,fullPage:true});}
  assert.deepEqual(errors,[]);await page.close();
 }console.log('Import Records browser: actual import/review/editor/store scripts and offline server services, no read on expand, origins, unavailable state, human decision, draft, explicit publication and 1440/390/320 px.');}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
