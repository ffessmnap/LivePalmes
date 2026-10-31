"use strict";
// Shipped DOM, navigation factory and UX. No production endpoint or account.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {startStaticServer} = require('../tools/capture-portal-design');
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
        window.testCaps=['engagements.national.manage','admin.full'];
        window.testLoads=[];
        window.testState={adminAuth:{hasCapability:cap=>testCaps.includes(cap)}, currentAccessProfile:{},
          activeEngagementsNavEntry:'',activeEngagementsTab:'calendar',activeEngagementNationalTab:'deletions',activeEngagementsDetailTab:'general',
          dirtyEngagementDetailTabs:new Set(),engagementClubPersistedSwimmerIds:new Set(),engagementClubRecapEntries:[],
          engagementClubSelectionChanges:new Map(),engagementCompetitions:[],engagementOpenWaterCourses:[],
          selectedEngagementCompetitionId:'',selectedEngagementCompetition:null,selectedEngagementClubEntry:null};
        const actions = new Proxy({}, {get:(object,key)=>object[key] || (()=>{if(String(key).startsWith('load'))testLoads.push(key);})});
        const elements = {
          nationalToggle:document.querySelector('#adminPortalNationalToggle'),nationalSubmenu:document.querySelector('#adminPortalNationalSubmenu'),
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
        window.testNav=LivePalmesPortalNavigation.create({state:testState,config,elements,actions});
        Object.assign(actions,testNav);
        window.LivePalmesNationalDocuments={beforeNavigate:()=>true,setActive:active=>{if(active)testLoads.push('documents');}};
        window.LivePalmesPortalAuth={hasCapability:cap=>testCaps.includes(cap)};
        testNav.updateNavigationView();
        document.querySelector('#adminPortalNationalToggle').addEventListener('click',()=>{location.hash='administration-nationale';});
        addEventListener('hashchange',()=>testNav.updateNavigationView());
      });
      await page.addScriptTag({path:path.resolve('assets/livepalmes-portal-ux.js')});
      assert.equal(await page.locator('#adminPortalBreadcrumb').count(),0);
      await page.evaluate(()=>document.querySelector('#adminPortalNationalToggle').click());
      await page.locator('#adminNationalWorkspace').waitFor({state:'visible'});
      assert.equal(await page.locator('[data-national-workspace-tab="deletions"]').getAttribute('aria-current'),'page');
      assert.equal(await page.locator('#adminPortalNationalSubmenu').isVisible(),false);
      assert.equal(await page.evaluate(()=>testLoads.some(key=>/Clubs|Swimmers$|People$|Audit|documents/.test(key))),false,'Opening national administration does not load other sections');
      assert.equal(await page.locator('#adminNationalMailControlScope').count(),0);
      assert.equal(await page.locator('.admin-national-request-browser > p').count(),0,'The list must not claim to be empty while the original loading/error status is active');
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
      for(const [tab,sub] of [['directories','swimmers'],['directories','people'],['licenses',null],['documents',null]]){
        await page.locator('[data-national-workspace-tab="'+tab+'"]').click();
        await page.locator('[data-national-workspace-tab="'+tab+'"][aria-current="page"]').waitFor();
        if(sub){
          await page.locator('[data-national-directory-tab="'+sub+'"]').click();
          await page.locator('[data-national-directory-tab="'+sub+'"][aria-current="page"]').waitFor();
        }
        assert.equal(await page.locator('#adminNationalWorkspace').isVisible(),true);
      }
      await page.locator('[data-national-workspace-tab="directories"]').click();
      await page.locator('[data-national-directory-tab="people"][aria-current="page"]').waitFor();
      assert.equal(await page.locator('[data-national-directory-tab="people"]').getAttribute('aria-current'),'page','Last directory stays selected');
      await page.evaluate(()=>{testCaps=['engagements.national.manage'];testNav.updateNavigationView();});
      assert.equal(await page.locator('[data-national-workspace-tab="audit"]').isVisible(),false);
      await page.evaluate(()=>{testCaps=['engagements.region.manage'];testNav.updateNavigationView();});
      assert.equal(await page.locator('#adminNationalWorkspace').isVisible(),false,'Regional profile has no national workspace');
      await page.evaluate(()=>{testCaps=['admin.full'];history.replaceState(null,'','#administration-nationale');testNav.updateNavigationView();});
      assert.equal(await page.locator('[data-national-workspace-tab="audit"]').getAttribute('aria-current'),'page');
      assert.equal(await page.locator('[data-national-workspace-tab="deletions"]').isVisible(),false);
      await page.evaluate(()=>{testCaps=['engagements.national.manage','admin.full'];location.hash='administration-suppressions';});
      await page.locator('[data-national-workspace-tab="deletions"][aria-current="page"]').waitFor();
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.dataset.portalTheme=theme,theme);
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
