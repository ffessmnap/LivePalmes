"use strict";
// Shipped DOM, navigation factory and UX. No production endpoint or account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {startStaticServer} = require('../tools/capture-portal-design');
const events=fs.readFileSync('assets/portal/events.js','utf8');
const nationalEvents=events.slice(events.indexOf('        portalContext.elements.nationalToggle?.addEventListener'),events.indexOf('        portalContext.elements.accessToggle?.addEventListener'));
const mobileEvents=events.slice(events.indexOf('        portalContext.elements.navToggle?.addEventListener'),events.indexOf('        portalContext.elements.navPin?.addEventListener'));
const navigationEvents=events.slice(events.indexOf('        portalContext.elements.navigation?.addEventListener'),events.indexOf('        portalContext.elements.accountEmailForm?.addEventListener'));
(async () => {
  const {server, baseUrl} = await startStaticServer();
  const browser = await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE ? {executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE} : {})});
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({viewport:{width,height:1100}});
      page.setDefaultTimeout(7000);
      const errors=[]; page.on('pageerror',error=>{errors.push(error.message);console.error(error.stack);});
      await page.route('**/*',route=>route.request().url().startsWith(baseUrl) && !route.request().url().endsWith('portail.html') ? route.continue() : route.abort());
      const html=fs.readFileSync('portail.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      await page.route(baseUrl+'/portail.html',route=>route.fulfill({contentType:'text/html',body:html}));
      await page.goto(baseUrl+'/portail.html');
      await page.addScriptTag({path:path.resolve('assets/portal/navigation.js')});
      await page.evaluate(()=>{
        document.body.dataset.adminAuth='unlocked';
        document.querySelector('#adminPortalDashboard').hidden=false;
        document.querySelector('#adminPortalLoginPanel').hidden=true;
        document.querySelector('#adminPortalNavToggle').hidden=false;
        window.testCaps=['engagements.national.manage','admin.full'];
        window.testLoads=[];
        window.testState={adminAuth:{hasCapability:cap=>testCaps.includes(cap)}, currentAccessProfile:{},
          portalPendingOverviewLoaded:true,activeEngagementsNavEntry:'',activeEngagementsTab:'calendar',activeEngagementNationalTab:'deletions',activeEngagementsDetailTab:'general',
          dirtyEngagementDetailTabs:new Set(),engagementClubPersistedSwimmerIds:new Set(),engagementClubRecapEntries:[],
          engagementClubSelectionChanges:new Map(),engagementCompetitions:[],engagementOpenWaterCourses:[],
          selectedEngagementCompetitionId:'',selectedEngagementCompetition:null,selectedEngagementClubEntry:null};
        const actions = new Proxy({}, {get:(object,key)=>object[key] || (()=>{if(String(key).startsWith('load'))testLoads.push(key);})});
        const elements = {navigation:document.querySelector('#adminPortalNavigation'),sidebar:document.querySelector('.admin-portal-sidebar'),navToggle:document.querySelector('#adminPortalNavToggle'),
          nationalMenu:document.querySelector('[data-engagements-national-menu]'),nationalToggle:document.querySelector('#adminPortalNationalToggle'),nationalSubmenu:document.querySelector('#adminPortalNationalSubmenu'),
          engagementsView:document.querySelector('#adminEngagementsView'),engagementsViewTitle:document.querySelector('#adminEngagementsViewTitle'),
          engagementsTabPanels:document.querySelectorAll('[data-engagements-tab-panel]'),
          engagementsNationalPanels:document.querySelectorAll('[data-engagements-national-panel]')
        };
        const config={ENGAGEMENT_ROUTE_BY_HASH:{
          '#administration-suppressions':{entry:'adminDeletionRequests',tab:'deletionRequests',nationalTab:'deletions'},
          '#administration-clubs':{entry:'adminDeletionRequests',tab:'deletionRequests',nationalTab:'clubs'},
          '#administration-doublons-nageurs':{entry:'adminDeletionRequests',tab:'deletionRequests',nationalTab:'swimmers'},
          '#administration-officiels':{entry:'adminDeletionRequests',tab:'deletionRequests',nationalTab:'people'},
          '#administration-licences':{entry:'adminDeletionRequests',tab:'deletionRequests',nationalTab:'licenses'},
          '#administration-historique':{entry:'adminAudit',tab:'deletionRequests',nationalTab:'audit'}
        },ENGAGEMENT_DETAIL_TAB_GROUPS:{information:['general']},engagementClubSelectionChanges:new Map(),engagementClubEntriesAutosaveSwimmers:new Set()};
        window.testContext={state:testState,config,elements,actions};
        window.testNav=LivePalmesPortalNavigation.create(testContext);
        Object.assign(actions,testNav);
        window.LivePalmesNationalDocuments={beforeNavigate:()=>true,setActive:active=>{if(active)testLoads.push('documents');}};
        window.LivePalmesPortalAuth={hasCapability:cap=>testCaps.includes(cap)};
        testNav.updateCapabilityView();testNav.updateNavigationView();
        addEventListener('hashchange',()=>testNav.updateNavigationView());
      });
      await page.evaluate(source=>new Function('portalContext','portalActions','portalState','global',source)(testContext,testContext.actions,testState,window),nationalEvents+mobileEvents+navigationEvents);
      await page.addScriptTag({path:path.resolve('assets/livepalmes-portal-ux.js')});
      const openMenu=async()=>{if(width<=1080)await page.evaluate(()=>testNav.setMobilePortalNavigationOpen(true));};
      assert.equal(await page.locator('#adminPortalBreadcrumb').count(),0);
      await page.evaluate(()=>document.querySelector('#adminPortalNationalToggle').click());
      await page.locator('#adminNationalWorkspace').waitFor({state:'visible'});
      assert.equal(await page.locator('.admin-national-tabs').count(),0);
      assert.equal(await page.locator('#adminNationalWorkspace [data-national-module]:visible').count(),6);
      assert.equal(await page.locator('#adminPortalNationalDisclosure').getAttribute('aria-expanded'),'true');
      assert.equal(await page.evaluate(()=>testLoads.length),0,'Module home loads no lists');
      const protectedDeparture=await page.evaluate(()=>{
        const results=[];const originalConfirm=window.confirm;window.confirm=()=>false;
        testState.selectedEngagementCompetitionId='fixture-competition';testState.selectedEngagementCompetition={};
        testState.activeEngagementsDetailTab='courses';testState.dirtyEngagementDetailTabs.add('courses');
        testContext.elements.engagementsView.dataset.engagementsMode='admin';
        for(const hash of ['#administration-nationale','#administration-annuaires','#administration-notifications']){
          history.replaceState(null,'',hash);testNav.syncEngagementRouteFromHash();
          results.push(location.hash==='#competitions-calendrier'&&testState.selectedEngagementCompetitionId==='fixture-competition');
        }
        window.confirm=originalConfirm;testState.selectedEngagementCompetitionId='';testState.selectedEngagementCompetition=null;
        testState.activeEngagementsDetailTab='general';testState.dirtyEngagementDetailTabs.clear();
        history.replaceState(null,'','#administration-nationale');testNav.updateNavigationView();return results;
      });
      assert.deepEqual(protectedDeparture,[true,true,true],'New landing routes preserve a dossier when departure is cancelled');
      await openMenu();
      await page.locator('#adminPortalNationalDisclosure').click();
      assert.equal(await page.locator('#adminPortalNationalSubmenu').isVisible(),false);
      assert.equal(await page.locator('#adminNationalWorkspace').isVisible(),true,'Chevron keeps the current page');
      await page.locator('#adminPortalNationalDisclosure').click();
      assert.equal(await page.locator('#adminPortalNationalDisclosure').getAttribute('aria-expanded'),'true');
      assert.equal(await page.evaluate(()=>testLoads.length),0,'Disclosure makes no data calls');
      if(width<=1080)await page.locator('#adminPortalNavToggle').click();
      fs.mkdirSync('tmp/national-workspace',{recursive:true});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.dataset.portalTheme=theme,theme);
        if(theme==='dark')assert.notEqual(await page.locator('#adminNationalWorkspace .admin-national-module').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
        await page.screenshot({path:'tmp/national-workspace/modules-'+width+'-'+theme+'.png',fullPage:true});
      }
      await page.evaluate(()=>document.documentElement.dataset.portalTheme='light');
      await page.locator('#adminNationalWorkspace [data-national-module="requests"]').click();
      await page.locator('[data-engagements-national-panel="deletions"]').waitFor({state:'visible'});
      assert.equal(await page.locator('#adminNationalMailControlScope').count(),0);
      await page.evaluate(()=>{
        const list=document.querySelector('#adminEngagementsSwimmerChangeRequestsList');
        list.closest('details').hidden=false;
        list.innerHTML='<article class="admin-engagements-swimmer-change-request" data-engagement-swimmer-change-request="fixture"><strong>Identité de démonstration</strong><input aria-label="Commentaire national"><button id="decisionFixture">Valider</button></article><article class="admin-engagements-swimmer-change-request" data-engagement-swimmer-change-request="fixture2"><strong>Retrait NS de démonstration</strong><input aria-label="Second commentaire"></article>';
        document.querySelector('#adminNationalRequestsEmpty').hidden=true;
        window.decisionCount=0;
        list.addEventListener('click',event=>{if(event.target.id==='decisionFixture')window.decisionCount++;});
      });
      await page.locator('[data-request-select="0:fixture"]').waitFor();
      await page.locator('[data-request-select="0:fixture"]').click();
      if(width>760)assert.equal(await page.evaluate(()=>document.activeElement.dataset.requestSelect),'0:fixture','Keyboard focus stays on the selected request');
      await page.getByLabel('Commentaire national',{exact:true}).fill('Brouillon conservé');
      if(width<761)await page.locator('[data-engagement-swimmer-change-request="fixture"] .admin-national-request-back').click();
      await page.locator('[data-request-select="0:fixture2"]').click();
      assert.equal(await page.locator('[data-engagement-swimmer-change-request="fixture"]').isVisible(),false);
      if(width<761)await page.locator('[data-engagement-swimmer-change-request="fixture2"] .admin-national-request-back').click();
      await page.locator('[data-request-select="0:fixture"]').click();
      assert.equal(await page.getByLabel('Commentaire national',{exact:true}).inputValue(),'Brouillon conservé');
      await page.locator('#decisionFixture').click();
      assert.equal(await page.evaluate(()=>decisionCount),1,'Original delegated decision stays attached');
      if(width<761)assert(await page.locator('[data-engagement-swimmer-change-request="fixture"]').evaluate(el=>el.getBoundingClientRect().width>innerWidth*0.7),'Mobile detail uses the screen width');
      await openMenu();
      await page.locator('#adminPortalNationalDisclosure').click();
      assert.equal(await page.locator('#adminPortalNationalSubmenu').isVisible(),false);
      assert.equal(await page.locator('[data-engagements-national-panel="deletions"]').isVisible(),true,'Closing menu leaves the request open');
      await page.locator('#adminPortalNationalDisclosure').click();
      await page.locator('#adminPortalNationalSubmenu a[href="#administration-annuaires"]').click();
      await page.locator('#adminNationalDirectoriesView').waitFor({state:'visible'});
      assert.equal(await page.locator('#adminNationalDirectoriesView [data-national-module]:visible').count(),3);
      await openMenu();
      await page.locator('#adminPortalNationalDirectoriesDisclosure').click();
      assert.equal(await page.locator('#adminPortalNationalDirectoriesSubmenu').isVisible(),false);
      await page.locator('#adminPortalNationalDirectoriesDisclosure').click();
      for(const [hash,title] of [['administration-doublons-nageurs','Nageurs'],['administration-officiels','Officiels'],['administration-licences','Vérification des licences']]){
        await openMenu();
        await page.locator('#adminPortalNationalSubmenu a[href="#'+hash+'"]').click();
        await page.locator('#adminPortalNationalSubmenu a[href="#'+hash+'"][aria-current="page"]').waitFor({state:'attached'});
        if(width<=1080)assert.equal(await page.locator('.admin-portal-sidebar').evaluate(el=>el.classList.contains('is-open')),false,'Choosing a direct link closes the mobile menu');
        assert.equal(await page.locator('#adminNationalModulesReturn').isVisible(),true);
      }
      await page.locator('#adminNationalModulesReturn').click();
      await page.locator('#adminNationalWorkspace').waitFor({state:'visible'});
      await page.evaluate(()=>{testCaps=['engagements.national.manage'];testNav.updateCapabilityView();testNav.updateNavigationView();});
      assert.equal(await page.locator('#adminNationalWorkspace [data-national-module="audit"]').isVisible(),false);
      await page.evaluate(()=>{testCaps=['engagements.region.manage'];testNav.updateCapabilityView();testNav.updateNavigationView();});
      assert.equal(await page.locator('#adminNationalWorkspace').isVisible(),false,'Regional profile has no national home');
      await page.evaluate(()=>{testCaps=['admin.full'];history.replaceState(null,'','#administration-nationale');testNav.updateCapabilityView();testNav.updateNavigationView();});
      assert.equal(await page.locator('#adminNationalWorkspace [data-national-module="audit"]').isVisible(),true);
      assert.equal(await page.locator('#adminNationalWorkspace [data-national-module="requests"]').isVisible(),false);
      await page.evaluate(()=>{testCaps=['engagements.national.manage','admin.full'];testNav.updateCapabilityView();location.hash='administration-suppressions';});
      await page.locator('[data-engagements-national-panel="deletions"]').waitFor({state:'visible'});
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.dataset.portalTheme=theme,theme);
        if(theme==='dark')assert.notEqual(await page.locator('#adminEngagementsSwimmerChangeRequests').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)','Detail group follows dark appearance');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No page overflow at '+width+' '+theme);
        fs.mkdirSync('tmp/national-workspace',{recursive:true});
        await page.screenshot({path:'tmp/national-workspace/'+width+'-'+theme+'.png',fullPage:true});
      }
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('National workspace: routes, capabilities, list/detail, preserved comments/delegated decisions, responsive light/dark verified offline.');
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
