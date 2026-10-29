"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const {startStaticServer,launchBrowser,evaluate,waitFor,presentationScript}=require("../tools/capture-portal-design");
(async()=>{
 const {server,baseUrl}=await startStaticServer(),browser=await launchBrowser(),client=browser.client;
 try{for(const width of [1280,390]){
 await client.send("Emulation.setDeviceMetricsOverride",{width,height:950,deviceScaleFactor:1,mobile:width===390});
 await client.send("Page.navigate",{url:baseUrl+"/portail.html"});
 assert.ok(await waitFor(client,"document.readyState === 'complete'",12000));
 await evaluate(client,presentationScript({authenticated:true,hash:"administration-utilisateurs",selector:'[data-admin-view="access"]',pinned:true}));
 const result=await evaluate(client, `
 const byId=id=>document.getElementById(id);
 window.regionalCaps=['engagements.region.manage'];
 const clubs=[{clubId:'10',clubName:'Club A',clubCode:'A',regionId:'Region A',referenceRegionId:'1',active:true},{clubId:'20',clubName:'Club B',clubCode:'B',regionId:'Region B',referenceRegionId:'2',active:true}];
 const state={currentAccessProfile:{capabilities:regionalCaps,regionId:'Region A',clubId:'10'},accessClubReference:clubs,accessClubReferenceById:new Map(clubs.map(c=>[c.clubId,c])),adminAuth:{hasCapability:cap=>regionalCaps.includes(cap)}};
 const elements={accessForm:byId('adminAccessForm'),accessRegionId:byId('adminAccessRegionId'),accessClubSelect:byId('adminAccessClubSelect'),accessClubId:byId('adminAccessClubId'),accessClubName:byId('adminAccessClubName'),accessPanel:byId('adminAccessPanel'),accessAdd:byId('adminAccessAddButton'),accessDialogTitle:byId('adminAccessDialogTitle'),clubSwitchResults:byId('adminPortalClubSwitchResults'),clubSwitchSearch:byId('adminPortalClubSwitchSearch')};
 // IDs of the shipped switcher are resolved from its existing data container.
 elements.clubSwitchResults ||= document.querySelector('.admin-portal-club-switch-results');
 const config={LIVEPALMES_REFERENCE_REGION_LABELS:{1:'Region A',2:'Region B'},LIVEPALMES_REGION_DEFINITIONS:['Region A','Region B']};
 const actions={ensureAdminAuth:()=>state.adminAuth,setAccessMessage:()=>{},escapeHtml:s=>String(s),normalizedAccessSearch:s=>String(s).toLowerCase()};
 const context={state,elements,config,actions};
 const nav=LivePalmesPortalNavigation.create(context);Object.assign(actions,nav);
 const modules=LivePalmesPortalModulesAndClubs.create(context);Object.assign(actions,modules);
 const account=LivePalmesPortalAccountAndAccess.create(context);Object.assign(actions,account);
 elements.accessRegionId.replaceChildren(new Option('Region A','Region A'),new Option('Region B','Region B'));
 account.resetAccessForm();account.openAccessDialog();
 const checks={region:elements.accessRegionId.value,locked:elements.accessRegionId.disabled,clubs:[...elements.accessClubSelect.options].map(o=>o.value),rights:[...elements.accessForm.querySelectorAll("input[name=capability]")].filter(i=>!i.closest('label').hidden).map(i=>({value:i.value,checked:i.checked,disabled:i.disabled}))};
 elements.accessClubSelect.value='10';modules.syncAccessClubFieldsFromSelect();
 checks.payload=account.accessPayloadFromForm();
 modules.renderClubSwitchResults();checks.switchClubs=[...elements.clubSwitchResults.querySelectorAll('[data-portal-active-club-id]')].map(b=>b.dataset.portalActiveClubId);
 state.activeEngagementClubId='20';checks.foreignRestored=nav.activeEngagementClubIdForProfile();
 state.activeEngagementClubId='10';checks.homeRestored=nav.activeEngagementClubIdForProfile();
 checks.canClub=nav.canUse('engagements.club.manage');
 regionalCaps=['engagements.region.manage','engagements.national.manage'];state.currentAccessProfile.capabilities=regionalCaps;
 account.resetAccessForm();modules.renderClubSwitchResults();
 checks.nationalRights=[...elements.accessForm.querySelectorAll('input[name=capability]')].every(i=>!i.disabled&&!i.closest('label').hidden);
 checks.nationalClubs=elements.clubSwitchResults.querySelectorAll('[data-portal-active-club-id]').length;
 regionalCaps=['engagements.region.manage'];state.currentAccessProfile.capabilities=regionalCaps;account.resetAccessForm();
 checks.overflow=document.documentElement.scrollWidth>innerWidth;
 return checks;
 `);
 assert.equal(result.region,'Region A');assert.ok(result.locked&&result.canClub);assert.deepEqual(result.clubs,['','10']);assert.deepEqual(result.rights,[{value:'engagements.club.manage',checked:true,disabled:true}]);assert.deepEqual(result.payload.capabilities,['engagements.club.manage']);assert.deepEqual(result.switchClubs,['10']);assert.equal(result.foreignRestored,'');assert.equal(result.homeRestored,'10');assert.equal(result.overflow,false);assert.equal(result.nationalRights,true);assert.equal(result.nationalClubs,2);
 fs.mkdirSync('tmp/regional-access',{recursive:true});const shot=await client.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('tmp/regional-access/'+width+'.png',Buffer.from(shot.data,'base64'));
 console.log(width+'px: locked region, single checked right, clubs/form payload, switch scope and restored session verified');
 }}finally{browser.cleanup();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
