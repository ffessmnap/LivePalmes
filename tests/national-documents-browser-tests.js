'use strict';
// Local fixtures only: all requests outside the synthetic origin are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const portal=fs.readFileSync('portail.html','utf8');
const portalCode=fs.readFileSync('assets/livepalmes-admin-portal.js','utf8');
const router=portalCode.slice(portalCode.indexOf('  function requestedNavigationView()'),portalCode.indexOf('  function loadScriptOnce('));
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 const out=path.resolve('outputs/national-library');fs.mkdirSync(out,{recursive:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   page.setDefaultTimeout(10000);
   await page.route('**/*',route=>route.abort());
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.route('https://fixture.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page" data-admin-auth="unlocked"></body></html>'}));
   await page.goto('https://fixture.test/portail.html#accueil');
   await page.evaluate(html=>{
    const source=new DOMParser().parseFromString(html,'text/html');
    const menu=source.querySelector('#adminPortalNationalSubmenu').parentElement;menu.hidden=false;
    document.body.innerHTML='<main class="admin-portal-dashboard"><div class="admin-portal-layout"><aside class="admin-portal-sidebar"><nav id="adminPortalNavigation" class="admin-portal-nav"></nav></aside><div class="admin-portal-workspace"><section data-admin-view="dashboard"><h2>Vue d’ensemble</h2><a id="documentsHome" href="#administration-documents">Documents</a></section><section data-admin-view="account" hidden>Mon compte</section><a id="accountTestLink" href="#mon-compte">Mon compte</a></div></div></main>';
    document.querySelector('#adminPortalNavigation').append(menu);
    document.querySelector('.admin-portal-workspace').append(source.querySelector('#adminNationalDocumentsView'));
   },portal);
   for(const file of ['styles.css','assets/livepalmes-admin-portal.css','assets/livepalmes-portal-appearance.css','assets/livepalmes-featured-documents.css','assets/livepalmes-national-documents.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
   await page.evaluate(()=>{
    window.testCalls=[];window.testNational=true;window.testUid='national';window.testConfirm=true;window.confirm=()=>window.testConfirm;
    const fixture={id:42,title:'Document national de démonstration',description:'Informations utiles',url:'https://example.org/document.pdf',typeLabel:'Divers',rubricLabel:'Actualités',typeId:3,rubricId:47,themeIds:[2],fingerprint:'current'};
    window.testDocument=fixture;
    window.LivePalmesPortalAuth={isAdminAuthenticated:()=>true,hasCapability:()=>window.testNational,onChange:fn=>window.testAuthChange=fn};
    window.LivePalmesEnvironment={napReaderUrl:'https://fixture.test/reader'};
    window.LivePalmesHomeModel={publicationLabel:()=>'',isNewDocument:()=>false};
    window.fetch=async()=>({ok:true,json:async()=>({source:'nap',documents:[fixture],hasMore:false})});
    window.firebase={auth:()=>({currentUser:{uid:window.testUid}}),app:()=>({functions:()=>({httpsCallable:name=>async input=>{
     window.testCalls.push({name,input});
     if(!input?.library)return {data:{documents:name==='getNationalFeaturedDocuments'?[fixture]:[],fingerprint:'a'.repeat(64)}};
     if(name==='notifyEngagementCompetitionDocuments')return {data:{disabled:true,test:true,recipientCount:10}};
     if(input.action==='list')return {data:{documents:window.testDeleted?[]:[fixture],nextAfterId:null,themes:[{id:2,label:'Comité'},{id:3,label:'Compétitions'},{id:4,label:'Entraîneurs'},{id:5,label:'Juges'},{id:6,label:'Haut niveau'}],types:[{id:3,label:'Divers'}],rubrics:[{id:47,label:'Actualités'}]}};
     if(input.action==='detail')return {data:{document:fixture}};
     if(input.action==='delete'){window.testDeleted=true;return {data:{ok:true,withdrawn:true}};}
     if(window.testHoldSave)await new Promise(resolve=>window.testReleaseSave=resolve);
     return {data:{ok:true,document:{...fixture,title:input.title}}};
    }})})};
   });
   await page.addScriptTag({content:fs.readFileSync('assets/livepalmes-featured-documents-model.js','utf8')});
   await page.addScriptTag({content:fs.readFileSync('assets/livepalmes-featured-documents.js','utf8')});
   await page.addScriptTag({content:fs.readFileSync('assets/livepalmes-national-documents.js','utf8')});
   await page.addScriptTag({content:`(function(global){
    const elements={nationalToggle:document.querySelector('#adminPortalNationalToggle')},ENGAGEMENT_ROUTE_BY_HASH={};
    let activeEngagementsNavEntry='',activeEngagementNationalTab='',activeEngagementsTab='';
    const canUse=()=>global.testNational;
    const canManageAccessDirectory=canUse,canManagePerformances=canUse,canCreateEngagementCompetition=canUse,canDeleteEngagementCompetitionDirectly=canUse,canViewActivityLog=canUse,canAccessEngagementsView=canUse;
    const syncEngagementRouteFromHash=()=>{},loadAccessUsers=()=>{},canDeleteAccessUserDirectly=()=>false;
    const setExclusivePortalMenu=name=>{document.querySelector('#adminPortalNationalSubmenu').hidden=name!=='national';};
    ${router}
    global.testUpdateNavigation=updateNavigationView;global.addEventListener('hashchange',updateNavigationView);updateNavigationView();
   })(window);`});
   assert.equal(await page.evaluate(()=>window.testCalls.length),0,'No initial reads before the document section opens');
   await page.locator('#documentsHome').click();
   await page.getByRole('button',{name:'Modifier',exact:true}).waitFor();
   assert.equal(await page.locator('dialog').count(),0);
   assert.equal(await page.locator('#adminPortalNationalSubmenu [data-admin-view-link="nationalDocuments"]').getAttribute('aria-current'),'page');
   assert.equal(await page.evaluate(()=>window.testCalls.length),1);
   await page.getByRole('button',{name:'Ajouter un document',exact:true}).click();
   await page.locator('#nationalLibraryFile').setInputFiles({name:'essai.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nSynthetic test')});
   await page.locator('#nationalLibraryName').fill('Nouveau document national');
   await page.getByLabel('Comité',{exact:true}).check();await page.getByLabel('Juges',{exact:true}).check();
   assert.equal(await page.locator('#nationalLibraryNotify').isChecked(),false);
   await page.screenshot({path:path.join(out,`form-${width}.png`),fullPage:true});
   const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,overflow:[...document.querySelectorAll('#nationalLibraryPanel input,#nationalLibraryPanel select,#nationalLibraryPanel textarea,#nationalLibraryPanel button')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth).length}));
   assert.ok(sizes.page<=sizes.viewport,JSON.stringify(sizes));assert.equal(sizes.overflow,0,JSON.stringify(sizes));
   await page.evaluate(()=>{window.testConfirm=false;location.hash='#mon-compte';});
   await page.waitForFunction(()=>location.hash==='#administration-documents');
   assert.equal(await page.locator('#nationalLibraryName').inputValue(),'Nouveau document national');
   await page.evaluate(()=>window.testHoldSave=true);
   await page.getByRole('button',{name:'Mettre en ligne',exact:true}).click();
   await page.waitForFunction(()=>Boolean(window.testReleaseSave));
   await page.evaluate(()=>location.hash='#administration-documents-accueil');
   await page.waitForFunction(()=>location.hash==='#administration-documents');
   await page.evaluate(()=>{window.testHoldSave=false;window.testReleaseSave();});
   await page.getByText('Document enregistré. Aucun mail demandé.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.testCalls.filter(x=>x.name==='notifyEngagementCompetitionDocuments'))).length,0);
   const uploaded=await page.evaluate(()=>window.testCalls.find(x=>x.input.action==='upload').input);assert.deepEqual(uploaded.themeIds,[2,5]);assert.ok(uploaded.fileDataUrl.startsWith('data:application/pdf;base64,'));
   await page.getByRole('button',{name:'Modifier',exact:true}).click();await page.locator('#nationalLibraryName').fill('Titre corrigé');await page.locator('#nationalLibraryNotify').check();
   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByText('Document enregistré. TEST : aucun mail envoyé.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.testCalls.filter(x=>x.name==='notifyEngagementCompetitionDocuments'&&x.input.action==='send'))).length,0);
   await page.evaluate(()=>window.testConfirm=true);
   await page.getByRole('button',{name:'Supprimer',exact:true}).click();await page.getByText('Document retiré de la publication. Aucun mail envoyé.',{exact:true}).waitFor();
   const reads=await page.evaluate(()=>window.testCalls.length);
   await page.getByRole('link',{name:'Documents mis en avant',exact:true}).click();
   await page.locator('#featuredDocumentsSelected [data-featured-action="remove"]').waitFor();
   assert.equal(await page.locator('dialog').count(),0);
   await page.screenshot({path:path.join(out,`featured-${width}.png`),fullPage:true});
   await page.locator('#featuredDocumentsSelected [data-featured-action="remove"]').click();
   await page.evaluate(()=>{window.testConfirm=false;location.hash='#administration-documents';});
   await page.waitForFunction(()=>location.hash==='#administration-documents-accueil');
   await page.getByRole('button',{name:'Annuler les changements',exact:true}).click();
   await page.getByRole('link',{name:'Bibliothèque documentaire',exact:true}).click();
   await page.locator('#nationalLibraryAdd').waitFor({state:'visible'});
   assert.equal(await page.evaluate(()=>window.testCalls.filter(x=>x.input?.library).length),reads,'Returning to the cached library adds no reads');
   await page.evaluate(()=>{window.testUid='other';window.testDeleted=false;window.testAuthChange();window.testUpdateNavigation();});
   await page.getByRole('button',{name:'Modifier',exact:true}).waitFor();
   await page.getByRole('button',{name:'Ajouter un document',exact:true}).click();
   await page.evaluate(()=>{window.testNational=false;window.testAuthChange();window.testUpdateNavigation();});
   assert.equal(await page.locator('#nationalLibraryPanel').isVisible(),false);
   assert.equal(await page.locator('#nationalLibraryName').count(),0,'Account changes discard the private form');
   const beforeDirect=await page.evaluate(()=>window.testCalls.filter(x=>x.input?.library).length);
   await page.evaluate(()=>{window.testNational=true;window.testAuthChange();location.hash='#administration-documents-accueil';});
   await page.locator('#featuredDocumentsSelected [data-featured-action="remove"]').waitFor();
   assert.equal(await page.evaluate(()=>window.testCalls.filter(x=>x.input?.library).length),beforeDirect,'Direct selection route does not load the library');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   assert.equal(overflow,false);
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('National documents page: native router, national navigation, inline library/featured selection, guarded departure, cached return, account changes; 1440/390/320 px, CRUD and TEST no-mail passed locally.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
