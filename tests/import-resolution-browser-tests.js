"use strict";
// Synthetic NAP responses only. The real portal modules/forms run with external
// network blocked; no Firebase initialization, import or native write is allowed.
require('./helpers/offline-network');
const assert=require('node:assert/strict'),fs=require('node:fs');
const {startStaticServer,launchBrowser}=require('../tools/capture-portal-design');
const {fixture}=require('./fixtures/nap-import-review-fixture');
const {previewNativeImport}=require('../functions/nap-import-preview');
const {importPreviewResponse}=require('../functions/nap-import-response');

async function exercise(){
  const assert=(condition,message)=>{if(!condition)throw Error(message);};
  const q=selector=>document.querySelector(selector);
  const click=async selector=>{const el=q(selector);assert(el,`Missing ${selector}`);el.scrollIntoView({block:'center'});const rect=el.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);assert(rect.width>0&&rect.height>0&&(hit===el||el.contains(hit)),`Action inaccessible: ${selector}`);el.click();await new Promise(r=>setTimeout(r,0));};
  const change=(selector,value)=>{const el=q(selector);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
  const until=async test=>{for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,20));}throw Error('Fixture did not settle: '+test.toString()+' / '+q('#adminEngagementsNationalClubMessage').textContent+' / '+q('[data-review-open="clubs"]').textContent);};
  const original=structuredClone(window.fixture.result),payload=structuredClone(window.fixture.payload);
  const importDialog=document.createElement('dialog');importDialog.className='competition-import-dialog competition-import-compact';importDialog.append(q('#summary'),q('#host'));document.body.append(importDialog);importDialog.showModal();
  let result=structuredClone(original),searchCalls=0,checkCalls=0,created=0,clubCreates=0,blocked=true,searchFails=false,refreshFails=false,createCalls=[];
  const actions={},state={engagementNationalClubs:[]},elements={};
  for(const key of ['Dialog','Form','Id','FederalNumber','Code','Name','Region','City','PostalCode','Active','Delete','DialogTitle','Message','Close','Cancel'])elements['engagementsNationalClub'+key]=q('#adminEngagementsNationalClub'+key);
  const context={state,elements,config:{},actions};
  const national=window.nationalFactory(context,actions);Object.assign(actions,national,{
    canDeleteEngagementCompetitionDirectly:()=>true,
    mergeNationalClubsIntoAccessReference:()=>{},renderEngagementNationalClubs:()=>{},
    callFunction:async(name,data)=>{assert(name==='saveEngagementNationalClub','Unexpected remote action');assert(data.creationId&&data.club.regionId==='2','Club operation is explicit and complete');clubCreates++;return {club:{...data.club,clubId:'180',napSource:true}};}
  });
  elements.engagementsNationalClubForm.addEventListener('submit',national.saveEngagementNationalClub);
  elements.engagementsNationalClubClose.onclick=national.closeEngagementNationalClubDialog;
  elements.engagementsNationalClubCancel.onclick=national.closeEngagementNationalClubDialog;
  await LivePalmesPortalModulesAndClubs.create(context).loadImportModule();
  const draw=()=>LivePalmesImportReview.render({result,payload,host:q('#host'),summary:q('#summary'),
    onChange:()=>{result.reviewStale=true;result.canConfirm=false;result.reviewReady=false;},
    onSearch:async()=>{searchCalls++;if(searchFails)throw Error('Recherche indisponible');return [];},
    onPreviewCreation:async data=>{checkCalls++;assert(data.swimmer.licenseNumber==='', 'Licence stays optional');return {blocksCreation:blocked,alerts:blocked?[{type:'duplicate',name:'EXISTANT',swimmerId:'171',message:'Identité existante'}]:[]};},
    onCreateSwimmer:async data=>{createCalls.push(structuredClone(data));if(createCalls.length===1){created++;throw Error('Réponse interrompue');}return {swimmer:{id:'174',clubId:'106',...data.swimmer}};},
    onCreateClub:LivePalmesImportClubCreation,
    onRefresh:async()=>{if(refreshFails)throw Error('Actualisation interrompue');result.reviewStale=false;draw();},
    onSave:()=>{throw Error('Real import forbidden');}
  });
  draw();
  const group=result.review.groups.find(g=>g.source.lastName==='UNKNOWN'),key=group.id;
  const nav=async panel=>{const button=q(`[data-review-panel="${panel}"]`);button.closest('details')?.setAttribute('open','');button.click();};
  await nav(key);searchFails=true;await click(`[data-review-create="${key}"]`);
  assert(q(`[data-review-creation="${key}"]`).textContent.includes('indisponible'),'Failed search must not open creation');
  assert(!q('[data-create-check]'),'No creation form after failed search');
  searchFails=false;await click(`[data-review-create="${key}"]`);await until(()=>q('[data-create-check]'));
  assert(searchCalls===2,'One explicit search per attempt');assert(q('[data-create-field="lastName"]').value==='UNKNOWN','Source prefill');
  assert(!q('[data-create-field="licenseNumber"]').required,'Import licence optional');
  assert(document.documentElement.scrollWidth<=innerWidth+1,'Creation form stays within viewport');
  assert(importDialog.scrollWidth<=importDialog.clientWidth+1,'Import modal does not hide creation controls horizontally');
  await click('[data-create-check]');q('[data-create-confirm]').click();assert(q('[data-create-save]').disabled,'Exact duplicate blocks creation');
  blocked=false;await click('[data-create-check]');q('[data-create-confirm]').click();assert(!q('[data-create-save]').disabled,'Unlicensed identity can be confirmed');
  const before=checkCalls;draw();assert(q('[data-create-confirm]').checked&&!q('[data-create-save]').disabled,'Unchanged form preserves successful check and confirmation');assert(checkCalls===before,'Redraw must not query NAP');
  change('[data-create-field="firstName"]','Inconnu modifié');assert(q('[data-create-save]').disabled&&!q('[data-create-confirm]').checked,'Identity edit invalidates duplicate check');
  await click('[data-create-check]');q('[data-create-confirm]').click();await click('[data-create-save]');
  assert(q('[data-create-status]').textContent.includes('même opération'),'Lost receipt keeps operation');draw();await click('[data-create-save]');
  assert(created===1&&createCalls.length===2,'One simulated insert with receipt retry');assert(JSON.stringify(createCalls[0])===JSON.stringify(createCalls[1]),'Retry preserves UUID and fields');
  assert(payload.swimmerBindings.some(b=>b.swimmerId===174),'Created identity selected for import');
  await nav('clubs');await click('[data-review-create-club="NEW"]');await until(()=>elements.engagementsNationalClubDialog.open);
  assert(elements.engagementsNationalClubName.value==='Nouveau club source','Existing national form receives source name');
  assert(elements.engagementsNationalClubDialog.getBoundingClientRect().width>0&&elements.engagementsNationalClubName.getBoundingClientRect().width>0,'Club form visible from hidden national section');
  assert(document.documentElement.scrollWidth<=innerWidth+1,'Club form stays within viewport');
  assert(elements.engagementsNationalClubRegion.value==='','Region is never invented');
  assert(clubCreates===0,'Opening the club form does not write');await click('#adminEngagementsNationalClubCancel');await until(()=>!elements.engagementsNationalClubDialog.open);
  await until(()=>!q('[data-review-create-club="NEW"]').disabled);
  assert(clubCreates===0&&!payload.clubBindings?.some(b=>b.code==='NEW'),'Cancellation neither creates nor binds');
  await click('[data-review-create-club="NEW"]');await until(()=>elements.engagementsNationalClubDialog.open);
  elements.engagementsNationalClubRegion.value='2';refreshFails=true;elements.engagementsNationalClubForm.requestSubmit();
  await until(()=>!elements.engagementsNationalClubDialog.open);await until(()=>q('[data-review-open="clubs"]').textContent.includes('déjà créé'));
  assert(clubCreates===1&&payload.clubBindings.some(b=>b.code==='NEW'&&b.clubId==='180'),'Created club explicitly bound');
  refreshFails=false;await click('[data-review-create-club="NEW"]');assert(clubCreates===1,'Refresh retry does not create a second club');
  await nav('issues');assert(q('[data-issue-page="1"]'),'More than 100 alerts remain accessible');await click('[data-issue-page="1"]');assert(q('[data-review-open="issues"]').textContent.includes('page 2/2'),'Alert pagination');
  result={metadata:original.metadata,competition:original.competition,rows:[{sourceLine:1}],canConfirm:true,reviewReady:true,previewFingerprint:'fresh',issues:[],unresolvedClubs:[],unresolvedMembers:[],review:{groups:[],profiles:[],relays:[]},diff:{requiresReplacementConfirmation:true,summary:{individual:{additions:1,removals:0,unchanged:0},relays:{additions:0,removals:0,unchanged:0}}}};
  delete payload.excludedSourceLines;draw();assert(q('[data-save-blockers]').textContent.includes('Confirmer le bilan'),'No alerts but replacement confirmation is explained');
  await nav('bilan');await click('[data-review-replacement]');assert(!q('[data-nap-save]').disabled,'Fresh replacement confirmation enables save');
  assert(q('[data-save-blockers]').textContent.includes('Tout est prêt'),'Ready state is explicit');
  payload.excludedSourceLines=[1];draw();assert(q('[data-nap-save]').disabled&&q('[data-save-blockers]').textContent.includes('exclusion'),'Exclusion confirmation separately explained');
  result.reviewStale=true;draw();assert(q('[data-save-blockers]').textContent.includes('actualiser'),'Stale preview explained');
  result.issues=[{code:'competition-date-mismatch',sourceLine:0}];draw();await nav('issues');
  assert(document.documentElement.scrollWidth<=innerWidth+1,'No document overflow on mobile/desktop');
  return {searchCalls,checkCalls,simulatedSwimmerInserts:created,simulatedClubInserts:clubCreates,viewport:innerWidth};
}

(async()=>{
  const f=fixture(),result=importPreviewResponse(await previewNativeImport(f.pool,f.input));
  result.unresolvedClubs=[{code:'NEW',reason:'unknown-federal-number',sourceName:'Nouveau club source',federalNumber:'01029999'}];result.sourceClubs.push({code:'NEW',name:'Nouveau club source',federalNumber:'01029999'});
  result.issues=Array.from({length:101},(_,i)=>({sourceLine:i,code:'competition-date-mismatch'}));
  const dialog=fs.readFileSync('portail.html','utf8').match(/<dialog id="adminEngagementsNationalClubDialog"[\s\S]*?<\/dialog>/)[0];
  const scripts=['performances/public/import-confirmation-message.js','performances/public/import-swimmer-creation.js','performances/public/import-swimmer-review.js','assets/portal/deferred/national-directories.js','assets/portal/modules-and-clubs.js'];
  const html=`<!doctype html><html lang="fr"><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/livepalmes-admin-portal.css"><link rel="stylesheet" href="/performances/public/import-competitions.css"></head><body><p id="summary"></p><div id="host"></div><section hidden>${dialog}</section><script>window.LivePalmesEnvironment={sportingDataSource:'nap'};window.LivePalmesPortalDeferred={register:(key,factory)=>window.nationalFactory=factory};window.fixture=${JSON.stringify({result,payload:f.input}).replace(/</g,'\\u003c')};</script>${scripts.map(s=>`<script src="/${s}"></script>`).join('')}<script>for(const id of ['adminImportZipScript','adminImportConfirmationScript','adminImportSwimmerCreationScript','adminImportReviewScript','adminImportRecordReviewScript','adminImportModuleScript']){const s=document.createElement('script');s.id=id;s.dataset.loaded='true';document.head.append(s);}window.ready=true;</script></body></html>`;
  const {server,baseUrl}=await startStaticServer(new Map([['/__import-resolution-fixture.html',html]]));let browser,edge;
  try{
    let chromium;try{({chromium}=require('playwright'));}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
    if(chromium)browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});else edge=await launchBrowser();
    for(const width of [1440,390,320]){
      let page,client=edge?.client;
      if(browser){page=await browser.newPage({viewport:{width,height:1000}});await page.route('**/*',route=>new URL(route.request().url()).origin===baseUrl?route.continue():route.abort());await page.goto(baseUrl+'/__import-resolution-fixture.html');}
      else{await client.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await client.send('Page.navigate',{url:baseUrl+'/__import-resolution-fixture.html'});}
      const evaluate=async expression=>{if(page)return page.evaluate(expression);const r=await client.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
      for(let i=0;i<100&&!await evaluate('Boolean(window.ready)');i++)await new Promise(r=>setTimeout(r,30));
      const outcome=await evaluate(`(${exercise.toString()})()`);assert.equal(outcome.viewport,width);console.log('Offline import resolution UI:',JSON.stringify(outcome));
      if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){const path=`outputs/import-resolution-${width}.png`;fs.mkdirSync('outputs',{recursive:true});if(page)await page.screenshot({path,fullPage:true});else{const shot=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path,Buffer.from(shot.data,'base64'));}}
      await page?.close();
    }
  }finally{await browser?.close();edge?.cleanup();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
