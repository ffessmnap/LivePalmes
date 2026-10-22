'use strict';
// Local fixtures only: all requests outside the synthetic origin are blocked.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 const out=path.resolve('outputs/national-library');fs.mkdirSync(out,{recursive:true});
 try{
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.route('**/*',route=>route.abort());
   await page.setContent('<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page" data-admin-auth="unlocked"><button data-national-library-open>Gérer la bibliothèque documentaire</button></body></html>');
   for(const file of ['styles.css','assets/livepalmes-admin-portal.css','assets/livepalmes-portal-appearance.css','assets/livepalmes-featured-documents.css','assets/livepalmes-national-documents.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
   await page.evaluate(()=>{
    window.testCalls=[];window.testNational=true;
    const fixture={id:42,title:'Document national de démonstration',description:'Informations utiles',url:'https://example.org/document.pdf',typeLabel:'Divers',rubricLabel:'Actualités',typeId:3,rubricId:47,themeIds:[2],fingerprint:'current'};
    window.testDocument=fixture;
    window.LivePalmesPortalAuth={isAdminAuthenticated:()=>true,hasCapability:()=>window.testNational,onChange:fn=>window.testAuthChange=fn};
    window.firebase={auth:()=>({currentUser:{uid:'national'}}),app:()=>({functions:()=>({httpsCallable:name=>async input=>{
     window.testCalls.push({name,input});
     if(name==='notifyEngagementCompetitionDocuments')return {data:{disabled:true,test:true,recipientCount:10}};
     if(input.action==='list')return {data:{documents:window.testDeleted?[]:[fixture],nextAfterId:null,themes:[{id:2,label:'Comité'},{id:3,label:'Compétitions'},{id:4,label:'Entraîneurs'},{id:5,label:'Juges'},{id:6,label:'Haut niveau'}],types:[{id:3,label:'Divers'}],rubrics:[{id:47,label:'Actualités'}]}};
     if(input.action==='detail')return {data:{document:fixture}};
     if(input.action==='delete'){window.testDeleted=true;return {data:{ok:true,withdrawn:true}};}
     return {data:{ok:true,document:{...fixture,title:input.title}}};
    }})})};
   });
   await page.addScriptTag({content:fs.readFileSync('assets/livepalmes-national-documents.js','utf8')});
   await page.getByRole('button',{name:'Gérer la bibliothèque documentaire',exact:true}).click();
   await page.getByRole('button',{name:'Modifier',exact:true}).waitFor();
   await page.getByRole('button',{name:'Ajouter un document',exact:true}).click();
   await page.locator('#nationalLibraryFile').setInputFiles({name:'essai.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nSynthetic test')});
   await page.locator('#nationalLibraryName').fill('Nouveau document national');
   await page.getByLabel('Comité',{exact:true}).check();await page.getByLabel('Juges',{exact:true}).check();
   assert.equal(await page.locator('#nationalLibraryNotify').isChecked(),false);
   await page.screenshot({path:path.join(out,`form-${width}.png`),fullPage:true});
   const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,dialog:document.querySelector('dialog').getBoundingClientRect().width,overflow:[...document.querySelectorAll('dialog input,dialog select,dialog textarea,dialog button')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth).length}));
   assert.ok(sizes.page<=sizes.viewport,JSON.stringify(sizes));assert.equal(sizes.overflow,0,JSON.stringify(sizes));
   await page.getByRole('button',{name:'Mettre en ligne',exact:true}).click();
   await page.getByText('Document enregistré. Aucun mail demandé.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.testCalls.filter(x=>x.name==='notifyEngagementCompetitionDocuments'))).length,0);
   const uploaded=await page.evaluate(()=>window.testCalls.find(x=>x.input.action==='upload').input);assert.deepEqual(uploaded.themeIds,[2,5]);assert.ok(uploaded.fileDataUrl.startsWith('data:application/pdf;base64,'));
   await page.getByRole('button',{name:'Modifier',exact:true}).click();await page.locator('#nationalLibraryName').fill('Titre corrigé');await page.locator('#nationalLibraryNotify').check();
   await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByText('Document enregistré. TEST : aucun mail envoyé.',{exact:true}).waitFor();
   assert.equal((await page.evaluate(()=>window.testCalls.filter(x=>x.name==='notifyEngagementCompetitionDocuments'&&x.input.action==='send'))).length,0);
   page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Supprimer',exact:true}).click();await page.getByText('Document retiré de la publication. Aucun mail envoyé.',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Fermer',exact:true}).click();
   await page.evaluate(()=>window.testNational=false);await page.getByRole('button',{name:'Gérer la bibliothèque documentaire',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);
   await page.close();
  }
  console.log('National library browser: 1440/390/320 px, upload, multi-theme, no-mail default, TEST preview only, editing, withdrawal, national UI gate and no overflow passed locally.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
