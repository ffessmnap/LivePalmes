"use strict";
// Actual renderer and dialog, synthetic identities only, no external requests.
const fs=require("./helpers/source-files"),path=require("node:path"),assert=require("node:assert/strict"),{chromium}=require("playwright");
const portal=fs.readFileSync("portail.html","utf8"),source=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
const renderer=source.slice(source.indexOf("  function renderEngagementClubPeople()"),source.indexOf("  async function loadEngagementClubPeople("));
const dialog=source.slice(source.indexOf("  function closeEngagementSwimmerCorrectionDialog()"),source.indexOf("  function normalizeEngagementNationalClub("));
const events=source.slice(source.indexOf('    elements.engagementsClubPeopleList?.addEventListener("click"'),source.indexOf('    elements.engagementsDetailClose?.addEventListener("click"'));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 const out=path.resolve("outputs/club-identites-licences/browser");fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:960}});page.setDefaultTimeout(10000);await page.route("**/*",route=>route.abort());
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body class="admin-portal-page" data-admin-auth="unlocked"><main class="admin-portal"><section id="adminEngagementsClubPeoplePanel"><div id="adminEngagementsClubPeopleList"></div><p id="adminEngagementsClubPeopleStatus"></p></section></main></body></html>');
  for(const f of ["styles.css","assets/livepalmes-admin-portal.css","assets/livepalmes-portal-appearance.css"])await page.addStyleTag({content:fs.readFileSync(f,"utf8")});
  await page.evaluate(html=>document.body.append(new DOMParser().parseFromString(html,"text/html").querySelector("#adminEngagementsSwimmerCorrectionDialog")),portal);
  await page.evaluate(()=>{
   window.global=window;window.LivePalmesEnvironment={sportingDataSource:"nap"};
   window.engagementClubPeople=[{id:"nap-official-7",nativePersonKind:"officials",nativeIdentityEditable:true,nativeStatusEditable:true,napSource:true,napFingerprint:"a".repeat(64),firstName:"Personne",lastName:"FICTIVE",birthDate:"1980-01-01",sex:"",licenseNumber:"",active:true,roles:{teamLeader:true,official:true}}];
   window.elements={};for(const el of document.querySelectorAll('[id^="adminEngagementsSwimmerCorrection"],#adminEngagementsClubPeopleList,#adminEngagementsClubPeopleStatus')){const key=el.id.replace(/^admin/,'');window.elements[key[0].toLowerCase()+key.slice(1)]=el;}
   window.engagementClubSwimmers=[];window.engagementClubPeopleRequestVersion=0;window.engagementClubPersonSaving=false;window.engagementSwimmerCorrectionOpener=null;window.engagementSwimmerCorrectionReview=null;window.engagementSwimmerChangeRequestsLoaded=false;
   window.updateNativeCompetitionPersonCreationButton=()=>{};window.engagementClubPersonRoleLabel=()=>"Chef d’équipe · Officiel";window.escapeHtml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
   window.engagementSwimmerDisplayName=s=>[s.firstName,s.lastName].join(" ");window.clubDisplayLabel=()=>"Club fictif";window.setFormPending=()=>{};window.renderEngagementClubSwimmersDirectory=()=>{};window.writeEngagementClubSwimmersCache=()=>{window.savedRoster=structuredClone(window.engagementClubSwimmers);};
   window.testCalls=[];window.callFunction=async(name,payload)=>{
    window.testCalls.push({name,payload});
    if(name==="saveEngagementClubPerson")return {source:"nap",person:{...window.engagementClubPeople[0],...payload.patch,napFingerprint:"b".repeat(64)}};
    if(payload.completeLicense)return {completedWithoutRequest:true,swimmer:{id:payload.swimmerId,licenseNumber:payload.proposed.licenseNumber,licenseVerificationStatus:"pending",club:"",clubName:"",performanceCount:0}};
    return {request:{id:"synthetic-request"}};
   };
  });
  await page.addScriptTag({content:fs.readFileSync("assets/livepalmes-club-identity.js","utf8")});
  await page.addScriptTag({content:renderer+dialog+events+'\nrenderEngagementClubPeople(); elements.engagementsSwimmerCorrectionForm.addEventListener("input",updateClubIdentityCorrectionAction);elements.engagementsSwimmerCorrectionForm.addEventListener("change",updateClubIdentityCorrectionAction);elements.engagementsSwimmerCorrectionForm.addEventListener("submit",e=>{e.preventDefault();void submitEngagementSwimmerCorrection();});elements.engagementsSwimmerCorrectionDialog.addEventListener("close",resetEngagementSwimmerCorrectionDialog);'});
  if(width<700)await page.locator('[data-engagement-club-person-directory-toggle]').click();
  await page.locator('[data-engagement-club-person-action="edit"]').click();
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionLicense').evaluate(e=>e.readOnly),false);
  await page.locator('#adminEngagementsSwimmerCorrectionLicense').fill('A-12-34567');
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionSubmit').innerText(),'Enregistrer les champs manquants');
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionReason').evaluate(e=>e.required),false);
  await page.screenshot({path:path.join(out,`officiel-completion-${width}.png`)});
  await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
  await page.waitForFunction(()=>window.testCalls.length===1&&!document.querySelector('#adminEngagementsSwimmerCorrectionDialog').open&&!document.querySelector('#adminEngagementsSwimmerCorrectionForm').dataset.initialIdentity);
  let calls=await page.evaluate(()=>window.testCalls);assert.equal(calls[0].name,'saveEngagementClubPerson');assert.deepEqual(calls[0].payload.patch,{licenseNumber:'A-12-34567'});
  if(width<700)await page.locator('[data-engagement-club-person-directory-toggle]').click();
  await page.locator('[data-engagement-club-person-action="edit"]').click();
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionLicense').evaluate(e=>e.readOnly),true);
  await page.locator('#adminEngagementsSwimmerCorrectionLastName').fill('CORRECTION');
  await page.locator('#adminEngagementsSwimmerCorrectionReason').fill('Erreur sur le nom');
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionSubmit').innerText(),'Envoyer la demande');
  await page.screenshot({path:path.join(out,`officiel-demande-${width}.png`)});
  await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
  await page.waitForFunction(()=>window.testCalls.length===2&&!document.querySelector('#adminEngagementsSwimmerCorrectionDialog').open&&!document.querySelector('#adminEngagementsSwimmerCorrectionForm').dataset.initialIdentity);
  calls=await page.evaluate(()=>window.testCalls);assert.equal(calls[1].name,'requestEngagementClubSwimmerChange');assert.equal(calls[1].payload.personId,'nap-official-7');assert.deepEqual(calls[1].payload.proposed,{lastName:'CORRECTION'});
  await page.evaluate(()=>{const swimmer={id:'42',napSource:true,napFingerprint:'c'.repeat(64),firstName:'Nageur',lastName:'FICTIF',birthDate:'',sex:'',licenseNumber:'',clubId:'106',clubName:'Club connu',performanceCount:13};window.engagementClubSwimmers=[swimmer];openEngagementSwimmerCorrectionDialog(swimmer,'request');});
  await page.locator('#adminEngagementsSwimmerCorrectionLicense').fill('A-12-76543');
  await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
  await page.waitForFunction(()=>window.testCalls.length===3&&!document.querySelector('#adminEngagementsSwimmerCorrectionDialog').open&&!document.querySelector('#adminEngagementsSwimmerCorrectionForm').dataset.initialIdentity);
  calls=await page.evaluate(()=>window.testCalls);assert.equal(calls[2].payload.completeLicense,true);assert.deepEqual(calls[2].payload.proposed,{licenseNumber:'A-12-76543'});
  const cached=await page.evaluate(()=>window.savedRoster[0]);assert.equal(cached.licenseNumber,'A-12-76543');assert.equal(cached.clubName,'Club connu');assert.equal(cached.performanceCount,13);
  if(width===1440){
   await page.evaluate(()=>{window.callFunction=async(name,payload)=>new Promise(resolve=>{window.lateReply=resolve;});openEngagementSwimmerCorrectionDialog({...window.engagementClubPeople[0],source:'officials'},'request');});
   await page.locator('#adminEngagementsSwimmerCorrectionSex').selectOption('F');
   await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
   await page.waitForFunction(()=>!!window.lateReply);
   await page.evaluate(()=>{window.engagementClubPeopleRequestVersion++;const old=window.engagementClubPeople[0];window.engagementClubPeople=[];window.lateReply({person:{...old,sex:'F'}});});
   await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
   assert.equal(await page.evaluate(()=>window.engagementClubPeople.length),0,'late completion cannot repopulate another club');
   await page.evaluate(()=>closeEngagementSwimmerCorrectionDialog());
  }
  // Exercise the actual deferred national module with synthetic services only.
  await page.evaluate(()=>{
   window.canDeleteEngagementCompetitionDirectly=()=>true;window.formatShortDate=value=>value;
   window.loadPortalPendingOverview=async()=>{};window.invalidateEngagementClubSwimmersCache=()=>{};window.renderEngagementClubPeople=()=>{};
   window.LivePalmesRequestDecision={collect:async()=>({resolutionNote:'',notifyRequester:false}),report:()=>{}};
   window.confirm=()=>true;window.testCalls=[];
   const current={...window.engagementClubPeople[0],id:'nap-official-7',firstName:'Personne',lastName:'FICTIVE',birthDate:'1980-01-01',sex:'M',licenseNumber:'A-12-34567',source:'officials',napSource:true,napFingerprint:'d'.repeat(64)};
   window.engagementSwimmerChangeRequests=[{id:'request',requestType:'person-change',requestedSwimmerId:current.id,requestedSource:'officials',clubId:'106',current:{...current,birthDate:'1979-01-01',licenseNumber:''},proposed:{...current,lastName:'CORRECTION',birthDate:'1979-01-01',licenseNumber:''}}];
   const status=document.createElement('p');document.body.append(status);window.elements.engagementsSwimmerChangeRequestsStatus=status;
   window.callFunction=async(name,payload)=>{
    window.testCalls.push({name,payload});
    if(payload.action==='reviewOfficial')return {ok:true,changed:true,current,proposed:{...current,lastName:'CORRECTION'},review:{expectedFingerprint:current.napFingerprint},resuming:false};
    if(window.rejectReview)throw Error('La fiche a changé. Réexaminez la fiche actuelle.');
    return {request:{id:'request'},result:{}};
   };
   window.LivePalmesPortalDeferred={register:(name,create)=>{const methods={};Object.assign(methods,create({state:window,actions:window,config:{},elements:window.elements},methods));window.nationalReview=methods;}};
  });
  await page.addScriptTag({content:fs.readFileSync('assets/portal/deferred/national-requests.js','utf8')});
  await page.evaluate(()=>{
   window.nationalReview.loadEngagementSwimmerChangeRequests=async()=>{};
   window.submitEngagementSwimmerCorrection=(...args)=>window.nationalReview.submitEngagementSwimmerCorrection(...args);
  });
  await page.evaluate(()=>window.nationalReview.openEngagementSwimmerChangeRequestReview('request'));
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionBirthDate').inputValue(),'1980-01-01');
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionLicense').inputValue(),'A-12-34567');
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionLicense').evaluate(e=>e.readOnly),true);
  assert.match(await page.locator('[data-official-review-summary]').innerText(),/Demande du club.*Depuis la demande/);
  await page.screenshot({path:path.join(out,`officiel-reexamen-${width}.png`)});
  const bounds=await page.locator('#adminEngagementsSwimmerCorrectionDialog').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.evaluate(()=>window.nationalReview.closeEngagementSwimmerCorrectionDialog());
  await page.waitForFunction(()=>!document.querySelector('#adminEngagementsSwimmerCorrectionForm').dataset.initialIdentity);
  assert.equal(await page.evaluate(()=>window.testCalls.filter(call=>!call.payload.action).length),0,'opening and cancelling never decide');
  await page.evaluate(()=>window.nationalReview.resolveEngagementSwimmerChangeRequest('request','approved'));
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionDialog').evaluate(e=>e.open),true,'validate as-is also opens the fresh review');
  await page.locator('#adminEngagementsSwimmerCorrectionLastName').fill('CORRECTION NATIONALE');
  await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
  await page.waitForFunction(()=>!document.querySelector('#adminEngagementsSwimmerCorrectionDialog').open);
  calls=await page.evaluate(()=>window.testCalls);const approved=calls.find(call=>call.payload.decision==='approved');
  assert.ok(approved);assert.equal(approved.payload.review.expectedFingerprint,'d'.repeat(64));
  assert.equal(approved.payload.proposed.lastName,'CORRECTION NATIONALE');assert.equal(approved.payload.proposed.birthDate,'1980-01-01');assert.ok(!Object.hasOwn(approved.payload.proposed,'licenseNumber'));
  await page.waitForFunction(()=>!document.querySelector('#adminEngagementsSwimmerCorrectionForm').dataset.initialIdentity);
  await page.evaluate(()=>{window.rejectReview=true;return window.nationalReview.openEngagementSwimmerChangeRequestReview('request');});
  await page.locator('#adminEngagementsSwimmerCorrectionSubmit').click();
  await page.waitForFunction(()=>document.querySelector('#adminEngagementsSwimmerCorrectionMessage').textContent.includes('Réexaminez'));
  assert.equal(await page.locator('#adminEngagementsSwimmerCorrectionDialog').evaluate(e=>e.open),true,'concurrent failure keeps review open');
  await page.evaluate(()=>window.nationalReview.closeEngagementSwimmerCorrectionDialog());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal page overflow');
  await page.close();console.log(`Club identity ${width}px: real pencil, missing licence completion without request, locked number, national request and swimmer licence-only passed offline.`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
