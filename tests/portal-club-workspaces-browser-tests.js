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
  for(const width of [1920,1440,1024,768,390,320]){
   const page=await browser.newPage({viewport:{width,height:1050}});page.setDefaultTimeout(7000);
   const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.stack);});
   await page.route('**/*',route=>route.request().url().startsWith(baseUrl)?route.continue():route.abort());
   const html=fs.readFileSync('portail.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
   await page.route(baseUrl+'/portail.html',route=>route.fulfill({contentType:'text/html',body:html}));
   await page.goto(baseUrl+'/portail.html');
   for(const file of ['navigation','competition-actions','club-entry-views','club-and-competition'])await page.addScriptTag({path:path.resolve('assets/portal/'+file+'.js')});
   await page.evaluate(()=>{
    document.body.dataset.adminAuth='unlocked';document.querySelector('#adminPortalDashboard').hidden=false;document.querySelector('#adminPortalLoginPanel').hidden=true;
    window.LivePalmesEnvironment={sportingDataSource:'nap'};window.clubCalls=[];window.clubRows=[];window.clubCapabilities=['engagements.club.manage'];
    const state={adminAuth:{hasCapability:cap=>clubCapabilities.includes(cap)},currentAccessProfile:{clubId:'106',clubCode:'DEMO',clubName:'Club de démonstration'},
     activeEngagementsNavEntry:'clubSwimmers',activeEngagementsTab:'clubSwimmers',activeEngagementsDetailTab:'general',activeEngagementNationalTab:'deletions',
     selectedEngagementCompetitionId:'',selectedEngagementCompetition:null,selectedEngagementClubEntry:null,
     dirtyEngagementDetailTabs:new Set(),engagementClubPersistedSwimmerIds:new Set(),engagementClubSwimmers:[],engagementClubSwimmersLoaded:false,
     engagementClubPeople:[],engagementClubPeopleLoaded:true,engagementClubPeopleLoading:false,engagementClubPeopleRequestVersion:0,engagementClubInactiveSwimmersDirectoryExpanded:true,engagementClubSwimmersDirectorySexFilter:'all',engagementClubSwimmerRecovery:null,engagementClubSwimmerCreationRetry:null,engagementOpenWaterCourses:[]};
    const config={ENGAGEMENT_SWIMMER_LICENSE_PATTERN:/^[A-Z]-\d{2}-\d+$/,ENGAGEMENT_CLUB_SWIMMERS_CACHE_TTL_MS:30000,ENGAGEMENT_DETAIL_TAB_GROUPS:{information:['general']},
     ENGAGEMENT_ROUTE_BY_HASH:{'#club-nageurs':{entry:'clubSwimmers',tab:'clubSwimmers'},'#club-officiels':{entry:'clubPeople',tab:'clubPeople'},'#club-competitions':{entry:'club',tab:'calendar'}},
     engagementClubEntriesAutosaveSwimmers:new Set(),engagementClubSelectionChanges:new Map()};
    const elements={};
    for(const name of ['engagementsClubPeopleList','engagementsClubPeopleStatus','engagementsClubPeopleAddButton','engagementsClubPeopleLoadMore','engagementsView','engagementsViewTitle','engagementsViewEyebrow','engagementsViewDescription','engagementsClubPeopleActions',
     'engagementsClubSwimmersDirectorySearch','engagementsClubSwimmersDirectorySearchClear','engagementsClubSwimmersDirectorySexFilter','engagementsClubSwimmersDirectoryStatus','engagementsClubSwimmersDirectoryList',
     'engagementsClubNewSwimmerDialog','engagementsClubNewSwimmerDialogOpen','engagementsClubNewSwimmerSaveButton','engagementsClubNewSwimmerResetButton','engagementsClubRecoverSwimmerButton',
     'engagementsClubNewSwimmerFirstName','engagementsClubNewSwimmerLastName','engagementsClubNewSwimmerBirthDate','engagementsClubNewSwimmerSex','engagementsClubNewSwimmerLicense','engagementsClubNewSwimmerAlerts','engagementsClubNewSwimmerMessage']){
     const id='admin'+name.charAt(0).toUpperCase()+name.slice(1);elements[name]=document.getElementById(id);
    }
    elements.engagementsTabPanels=document.querySelectorAll('[data-engagements-tab-panel]');
    const actions=new Proxy({}, {get:(target,key)=>target[key]||(()=>{})});
    const context={state,config,elements,actions};
    Object.assign(actions,LivePalmesPortalNavigation.create(context),LivePalmesPortalCompetitionActions.create(context),LivePalmesPortalClubEntryViews.create(context),LivePalmesPortalClubAndCompetition.create(context));
    const call=async(name,input)=>{
     clubCalls.push({name,input:JSON.parse(JSON.stringify(input||{}))});
     if(name==='listEngagementClubSwimmers')return {clubId:'106',swimmers:clubRows};
     if(name==='previewEngagementClubSwimmerRecovery')return {found:false,source:'nap'};
     if(name==='previewEngagementClubSwimmerCreation')return {alerts:[],source:'nap'};
     if(name==='setEngagementClubPersonStatus'){const person=state.engagementClubPeople.find(p=>p.id===input.personId);return {source:'nap',person:{...person,active:input.active,napFingerprint:'next'}};}
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
     engagementClubSwimmerIsActive:swimmer=>swimmer.clubActivityStatus!=='inactive',engagementClubPersonRoleLabel:person=>person.roles?.teamLeader?"Chef d’équipe · Officiel":"Officiel",engagementSwimmerDisplayName:swimmer=>[swimmer.lastName,swimmer.firstName].join(' '),
     engagementSwimmerCategory:()=> 'M60+',engagementCategoryLabel:()=> 'Master 60+',engagementPublicSwimmerProfileUrl:()=> '#',
     engagementSwimmerLicenseStatusIndicator:()=> '<span class="admin-engagements-club-swimmer-license-status" aria-label="Saison à contrôler">!</span>',formatShortDate:value=>String(value||''),writeEngagementClubSwimmersCache:()=>{},invalidateEngagementClubSwimmersCache:()=>{},
     loadEngagementCompetitions:()=>{},loadEngagementClubPeople:()=>{},renderEngagementClubPersonSwimmerOptions:()=>{}});
    window.clubContext=context;window.clubActions=actions;
    history.replaceState(null,'','#club-nageurs');actions.updateCapabilityView();actions.updateNavigationView();
    addEventListener('hashchange',()=>actions.updateNavigationView());
   });
   await page.evaluate(source=>new Function('portalContext','portalActions','portalState','global',source)(clubContext,clubActions,clubContext.state,window),dialogEvents);
   await page.evaluate(source=>new Function('portalContext','portalActions','portalState','global',source)(clubContext,clubActions,clubContext.state,window),events.slice(events.indexOf('        portalContext.elements.engagementsClubPeopleList?.addEventListener(\"click\"'),events.indexOf('        portalContext.elements.engagementsDetailClose?.addEventListener')));
   const button=page.locator('#adminEngagementsClubSwimmersDirectoryAddButton');await button.waitFor({state:'visible'});
   const before=await page.evaluate(()=>clubCalls.length);await button.click();
   const dialog=page.locator('#adminEngagementsClubNewSwimmerDialog');await dialog.waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>clubCalls.length),before,'Opening has no data access');
   assert.equal(await dialog.evaluate(el=>el.closest('[data-engagements-tab-panel]')),null,'Shared modal is outside hidden panels');
   await page.locator('#adminEngagementsClubNewSwimmerLastName').fill('Exemple');await page.locator('#adminEngagementsClubNewSwimmerFirstName').fill('Camille');
   await page.locator('#adminEngagementsClubNewSwimmerBirthDate').fill('2000-01-02');await page.locator('#adminEngagementsClubNewSwimmerSex').selectOption('F');await page.locator('#adminEngagementsClubNewSwimmerLicense').fill('A-26-000001');
   const size=await dialog.evaluate(el=>({width:innerWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right}));assert(size.left>=0&&size.right<=size.width+1,'Dialog fits mobile');
   fs.mkdirSync('tmp/club-workspaces',{recursive:true});await page.screenshot({path:'tmp/club-workspaces/add-'+width+'.png',fullPage:true,animations:"disabled"});
   await page.locator('#adminEngagementsClubNewSwimmerSaveButton').click();await dialog.waitFor({state:'hidden'});
   assert.match(await page.locator('#adminEngagementsClubSwimmersDirectoryList').innerText(),/EXEMPLE Camille/);
   assert.equal(await page.locator('#adminEngagementsClubSwimmersDirectoryStatus').getAttribute('data-tone'),'ok');
   const calls=await page.evaluate(()=>clubCalls);const creation=calls.find(call=>call.name==='createEngagementClubSwimmer');assert(creation);assert.equal(creation.input.competitionId,'');assert.match(creation.input.creationId,/^[0-9a-f-]{36}$/);
   assert.equal(calls.filter(call=>call.name==='listEngagementClubSwimmers').length,2,'Only the existing initial read and one bounded refresh');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'adminEngagementsClubSwimmersDirectoryAddButton');
   await page.evaluate(()=>{
    const state=clubContext.state;document.querySelector('#adminEngagementsClubSwimmersDirectorySearch').value='';
    state.engagementClubSwimmers=Array.from({length:70},(_,i)=>({id:'swimmer-'+i,source:i===3?'engagement':'reference',napSource:true,lastName:i===2?'DE LA FONTAINE DE SAINT JEAN DES CHAMPS':'EXEMPLE '+i,firstName:i===2?'Marie Éléonore Caroline':'Camille',birthDate:'2000-01-02',sex:i%2?'F':'M',licenseNumber:i===4?'':'A-26-4301012',clubActivityStatus:i>59?'inactive':'active',changeRequestStatus:i===5?'pending':'',nonSelectable:i===2}));
    window.clubRows=state.engagementClubSwimmers;state.engagementClubSwimmersCachedAt=Date.now();
    state.engagementClubPeople=Array.from({length:70},(_,i)=>({id:'official-'+i,napSource:true,nativePersonKind:'officials',nativeIdentityEditable:true,nativeStatusEditable:i!==4,napFingerprint:'before',lastName:i===2?'DE LA FONTAINE DE SAINT JEAN DES CHAMPS':'EXEMPLE '+i,firstName:'Marie Éléonore',licenseNumber:i===3?'':'A-26-4301012',roles:{official:true,teamLeader:i%2===0},active:i<60}));
   });
   const metrics=[];
   for(const hash of ['#club-competitions','#club-nageurs','#club-officiels']){
    await page.evaluate(hash=>{history.replaceState(null,'',hash);clubActions.updateNavigationView();if(hash==='#club-nageurs')clubActions.renderEngagementClubSwimmersDirectory();if(hash==='#club-officiels')clubActions.renderEngagementClubPeople();},hash);
    metrics.push(await page.locator('#adminEngagementsViewTitle').evaluate(el=>({size:getComputedStyle(el).fontSize,weight:getComputedStyle(el).fontWeight,head:el.parentElement.getBoundingClientRect().height,border:getComputedStyle(el.parentElement).borderTopWidth,background:getComputedStyle(el.parentElement).backgroundColor})));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow '+width+' '+hash);
    if(hash!=='#club-competitions'){
     if(width>700){
      const rows=await page.locator('[role="table"][aria-label="'+(hash==='#club-nageurs'?'Mes nageurs':'Mes officiels')+'"] > [role="row"]:not(:has([role="columnheader"]))').evaluateAll(rows=>rows.filter(row=>row.querySelector('[role="cell"]')).map(row=>{const r=row.getBoundingClientRect();return {h:r.height,cells:[...row.querySelectorAll('[role="cell"]')].filter(c=>c.getBoundingClientRect().height>0).map(c=>{const b=c.getBoundingClientRect();return {top:b.top-r.top,bottom:b.bottom-r.bottom,actionsFit:[...c.querySelectorAll('button')].every(button=>{const a=button.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;})};})};}));
      assert.equal(rows.length,70);assert(rows.every(r=>r.h===42),'Same compact row height '+width+' '+hash+' '+JSON.stringify(rows.map(r=>r.h)));
      assert(rows.every(r=>r.cells.every(c=>c.top>=-1&&c.bottom<=1&&c.actionsFit)),'Every cell fits its row');
     }else{
      if(hash==='#club-officiels')await page.locator('[data-engagement-club-person-directory-toggle]').first().click();
      else await page.locator('[data-engagement-club-swimmer-directory-toggle]').first().click();
      const action=page.locator(hash==='#club-officiels'?'[data-engagement-club-person-action="disable"]':'[data-engagement-club-swimmer-activity]').filter({visible:true}).first();assert(await action.isVisible(),'Mobile status accessible');
     }
    }
    for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.portalTheme=theme,theme);await page.screenshot({path:'tmp/club-workspaces/compact-'+hash.slice(1)+'-'+width+'-'+theme+'.png',fullPage:true,animations:"disabled"});}
   }
   assert(metrics.every(m=>m.size===metrics[0].size&&m.weight===metrics[0].weight),'Common title typography');
   assert(metrics.every(m=>m.head<=44&&m.border==='0px'&&m.background==='rgba(0, 0, 0, 0)'),'Compact plain headings '+JSON.stringify(metrics));
   if(width<=700)await page.locator('.admin-engagements-club-person-row[data-engagement-club-person-id="official-0"] [data-engagement-club-person-directory-toggle]').click();
   const status=page.locator('[data-engagement-club-person-action="disable"][data-engagement-club-person-id="official-0"]');
   assert.equal(await status.innerText(),'Actif');
   page.once('dialog',dialog=>dialog.dismiss());await status.click();assert.equal((await page.evaluate(()=>clubCalls.filter(c=>c.name==='setEngagementClubPersonStatus'))).length,0,'Cancellation never writes');
   page.once('dialog',dialog=>dialog.accept());await status.click();await page.locator('[data-engagement-club-person-action="enable"][data-engagement-club-person-id="official-0"]').waitFor({state:'attached'});
   const statusCalls=await page.evaluate(()=>clubCalls.filter(c=>c.name==='setEngagementClubPersonStatus'));assert.deepEqual(statusCalls.map(c=>c.input),[{personId:'official-0',active:false,expectedFingerprint:'before'}]);
   assert.equal(await page.locator('[data-engagement-club-person-action="disable"][data-engagement-club-person-id="official-4"]').count(),0,'Read-only native status remains a badge');
   await page.evaluate(()=>{history.replaceState(null,'','#club-nageurs');clubActions.updateNavigationView();});
   await page.evaluate(()=>{clubCapabilities=[];clubActions.updateCapabilityView();clubActions.updateNavigationView();});assert.equal(await button.isVisible(),false,'No Add access without club capability');
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Club workspaces: 70 profiles per directory, 42px aligned rows and compact headings; confirmed official status toggles;  shared headings, real standalone modal, simulated creation and roster refresh without competition, permissions, desktop/mobile light/dark verified offline.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
