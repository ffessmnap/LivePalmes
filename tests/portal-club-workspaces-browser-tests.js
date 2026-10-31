"use strict";
// Real portal markup, factories and dialog handlers; synthetic services only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {startStaticServer}=require('../tools/capture-portal-design');
const events=fs.readFileSync('assets/portal/events.js','utf8');
const dialogEvents=events.slice(events.indexOf('        portalContext.elements.engagementsClubNewSwimmerLicense?.addEventListener'),events.indexOf('        portalContext.elements.engagementsClubSwimmersForm?.addEventListener("click"'));
(async()=>{
 const {server,baseUrl}=await startStaticServer();
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try{
  for(const width of [1440,1024,390,320]){
   const page=await browser.newPage({viewport:{width,height:1050}});page.setDefaultTimeout(7000);
   const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
   await page.route('**/*',route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
   const html=fs.readFileSync('portail.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
   await page.route(baseUrl+'/portail.html',route=>route.fulfill({contentType:'text/html',body:html}));
   await page.goto(baseUrl+'/portail.html');
   for(const file of ['navigation','competition-actions','club-entry-views'])await page.addScriptTag({path:path.resolve('assets/portal/'+file+'.js')});
   await page.evaluate(()=>{
    document.body.dataset.adminAuth='unlocked';document.querySelector('#adminPortalDashboard').hidden=false;document.querySelector('#adminPortalLoginPanel').hidden=true;
    window.LivePalmesEnvironment={sportingDataSource:'nap'};window.clubCalls=[];window.clubRows=[];window.clubCapabilities=['engagements.club.manage'];
    const state={adminAuth:{hasCapability:cap=>clubCapabilities.includes(cap)},currentAccessProfile:{clubId:'106',clubCode:'DEMO',clubName:'Club de démonstration'},
     activeEngagementsNavEntry:'clubSwimmers',activeEngagementsTab:'clubSwimmers',activeEngagementsDetailTab:'general',activeEngagementNationalTab:'deletions',
     selectedEngagementCompetitionId:'',selectedEngagementCompetition:null,selectedEngagementClubEntry:null,
     dirtyEngagementDetailTabs:new Set(),engagementClubPersistedSwimmerIds:new Set(),engagementClubSwimmers:[],engagementClubSwimmersLoaded:false,
     engagementClubSwimmersDirectorySexFilter:'all',engagementClubSwimmerRecovery:null,engagementClubSwimmerCreationRetry:null,engagementOpenWaterCourses:[]};
    const config={ENGAGEMENT_SWIMMER_LICENSE_PATTERN:/^[A-Z]-\d{2}-\d+$/,ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS:30000,ENGAGEMENT_DETAIL_TAB_GROUPS:{information:['general']},
     ENGAGEMENT_ROUTE_BY_HASH:{'#club-nageurs':{entry:'clubSwimmers',tab:'clubSwimmers'},'#club-officiels':{entry:'clubPeople',tab:'clubPeople'},'#club-competitions':{entry:'club',tab:'calendar'}},
     engagementClubEntriesAutosaveSwimmers:new Set(),engagementClubSelectionChanges:new Map()};
    const elements={};
    for(const name of ['engagementsView','engagementsViewTitle','engagementsViewEyebrow','engagementsViewDescription','engagementsClubPeopleActions',
     'engagementsClubSwimmersDirectorySearch','engagementsClubSwimmersDirectorySearchClear','engagementsClubSwimmersDirectorySexFilter','engagementsClubSwimmersDirectoryStatus','engagementsClubSwimmersDirectoryList',
     'engagementsClubNewSwimmerDialog','engagementsClubNewSwimmerDialogOpen','engagementsClubNewSwimmerSaveButton','engagementsClubNewSwimmerResetButton','engagementsClubRecoverSwimmerButton',
     'engagementsClubNewSwimmerFirstName','engagementsClubNewSwimmerLastName','engagementsClubNewSwimmerBirthDate','engagementsClubNewSwimmerSex','engagementsClubNewSwimmerLicense','engagementsClubNewSwimmerAlerts','engagementsClubNewSwimmerMessage']){
     const id='admin'+name.charAt(0).toUpperCase()+name.slice(1);elements[name]=document.getElementById(id);
    }
    elements.engagementsTabPanels=document.querySelectorAll('[data-engagements-tab-panel]');
    const actions=new Proxy({}, {get:(target,key)=>target[key]||(()=>{})});
    const context={state,config,elements,actions};
    Object.assign(actions,LivePalmesPortalNavigation.create(context),LivePalmesPortalCompetitionActions.create(context),LivePalmesPortalClubEntryViews.create(context));
    const call=async(name,input)=>{
     clubCalls.push({name,input:JSON.parse(JSON.stringify(input||{}))});
     if(name==='listEngagementClubSwimmers')return {clubId:'106',swimmers:clubRows};
     if(name==='previewEngagementClubSwimmerRecovery')return {found:false,source:'nap'};
     if(name==='previewEngagementClubSwimmerCreation')return {alerts:[],source:'nap'};
     if(name==='createEngagementClubSwimmer'){
      const swimmer={...input.swimmer,id:'fixture-new',swimmerIndexId:'fixture-new',source:'reference',napSource:true,clubId:'106',clubActivityStatus:'active'};
      clubRows=[swimmer];return {source:'nap',swimmer};
     }
     throw Error('Unexpected synthetic service '+name);
    };
    Object.assign(actions,{callFunction:call,callFunctionWithTimeout:call,
     escapeHtml:value=>String(value??'').replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])),
     clubDisplayLabel:()=> 'Club de démonstration',normalizedEngagementClubSearch:value=>String(value||'').toLowerCase(),
     engagementClubSwimmerSearchText:swimmer=>[swimmer.lastName,swimmer.firstName,swimmer.licenseNumber].join(' ').toLowerCase(),
     engagementClubSwimmerIsActive:()=>true,engagementSwimmerDisplayName:swimmer=>[swimmer.lastName,swimmer.firstName].join(' '),
     engagementSwimmerCategory:()=> 'S',engagementCategoryLabel:()=> 'S',engagementPublicSwimmerProfileUrl:()=> '#',
     engagementSwimmerLicenseStatusIndicator:()=> '',formatShortDate:value=>String(value||''),writeEngagementClubSwimmersCache:()=>{},invalidateEngagementClubSwimmersCache:()=>{},
     loadEngagementCompetitions:()=>{},loadEngagementClubPeople:()=>{},renderEngagementClubPersonSwimmerOptions:()=>{}});
    window.clubContext=context;window.clubActions=actions;
    history.replaceState(null,'','#club-nageurs');actions.updateCapabilityView();actions.updateNavigationView();
    addEventListener('hashchange',()=>actions.updateNavigationView());
   });
   await page.evaluate(source=>new Function('portalContext','portalActions','portalState','global',source)(clubContext,clubActions,clubContext.state,window),dialogEvents);
   const button=page.locator('#adminEngagementsClubSwimmersDirectoryAddButton');await button.waitFor({state:'visible'});
   const before=await page.evaluate(()=>clubCalls.length);await button.click();
   const dialog=page.locator('#adminEngagementsClubNewSwimmerDialog');await dialog.waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>clubCalls.length),before,'Opening has no data access');
   assert.equal(await dialog.evaluate(el=>el.closest('[data-engagements-tab-panel]')),null,'Shared modal is outside hidden panels');
   await page.locator('#adminEngagementsClubNewSwimmerLastName').fill('Exemple');await page.locator('#adminEngagementsClubNewSwimmerFirstName').fill('Camille');
   await page.locator('#adminEngagementsClubNewSwimmerBirthDate').fill('2000-01-02');await page.locator('#adminEngagementsClubNewSwimmerSex').selectOption('F');await page.locator('#adminEngagementsClubNewSwimmerLicense').fill('A-26-000001');
   const size=await dialog.evaluate(el=>({width:innerWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));assert(size.left>=0&&size.right<=size.width+1,'Dialog fits mobile');
   fs.mkdirSync('tmp/club-workspaces',{recursive:true});await page.screenshot({path:'tmp/club-workspaces/add-'+width+'.png',fullPage:true});
   await page.locator('#adminEngagementsClubNewSwimmerSaveButton').click();await dialog.waitFor({state:'hidden'});
   assert.match(await page.locator('#adminEngagementsClubSwimmersDirectoryList').innerText(),/EXEMPLE Camille/);
   assert.equal(await page.locator('#adminEngagementsClubSwimmersDirectoryStatus').getAttribute('data-tone'),'ok');
   const calls=await page.evaluate(()=>clubCalls);const creation=calls.find(call=>call.name==='createEngagementClubSwimmer');assert(creation);assert.equal(creation.input.competitionId,'');assert.match(creation.input.creationId,/^[0-9a-f-]{36}$/);
   assert.equal(calls.filter(call=>call.name==='listEngagementClubSwimmers').length,2,'Only the existing initial read and one bounded refresh');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'adminEngagementsClubSwimmersDirectoryAddButton');
   const metrics=[];
   for(const hash of ['#club-competitions','#club-nageurs','#club-officiels']){
    await page.evaluate(hash=>{history.replaceState(null,'',hash);clubActions.updateNavigationView();},hash);
    metrics.push(await page.locator('#adminEngagementsViewTitle').evaluate(el=>({size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight})));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No overflow '+width+' '+hash);
   }
   assert(metrics.every(m=>m.size===metrics[0].size&&m.weight===metrics[0].weight),'Common title typography');
   await page.evaluate(()=>{history.replaceState(null,'','#club-nageurs');clubActions.updateNavigationView();});
   for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.portalTheme=theme,theme);await page.screenshot({path:'tmp/club-workspaces/swimmers-'+width+'-'+theme+'.png',fullPage:true});}
   await page.evaluate(()=>{clubCapabilities=[];clubActions.updateCapabilityView();clubActions.updateNavigationView();});assert.equal(await button.isVisible(),false,'No Add access without club capability');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Club workspaces: shared headings, real standalone modal, simulated creation and roster refresh without competition, permissions, desktop/mobile light/dark verified offline.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
