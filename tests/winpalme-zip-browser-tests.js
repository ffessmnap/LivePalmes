"use strict";
// Synthetic files and mocked callables only; every external request is aborted.
const assert=require("node:assert/strict"),fs=require("./helpers/source-files"),path=require("node:path");
const {chromium}=require("playwright"),{archive}=require("./winpalme-zip-tests");
const portal=fs.readFileSync("portail.html","utf8");
const row=["NAG","TEST","Personne","01/01/2000","F","ABC","","50SF","","FSE","NAG","00.00","00.00","00.00","00.00","32.45","","10","1","1","FSE","","123"].join(";");
const zip=archive([{name:"ExportTxt/27TEST_Export.txt",data:"REN;11/10/2026;Compétition;Ville\nBAS;25;M\nCLU;ABC;Club;01020304\n"+row},{name:"Protocoles/27TEST_ProtocoleComplet_20261014_06553360.pdf",data:"%PDF-1.4\nfixture\n%%EOF"}]);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 try {
  for(const width of [1440,390,320]) {
   const page=await browser.newPage({viewport:{width,height:1000},acceptDownloads:true});page.setDefaultTimeout(10000);
   const errors=[];page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/*",route=>route.abort());
   await page.route("https://fixture.test/**",route=>route.fulfill({contentType:"text/html",body:'<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body class="admin-portal-page"></body></html>'}));
   await page.goto("https://fixture.test/portail.html#import-competitions");
   await page.evaluate(html=>{
    const source=new DOMParser().parseFromString(html,"text/html");
    document.body.append(source.querySelector("#adminImportView"));
    document.querySelector("#adminImportView").hidden=false;
    window.LivePalmesEnvironment={sportingDataSource:"nap"};window.LivePalmesAppConfig={firebaseConfig:{}};
    window.LivePalmesPortalAuth={onChange:callback=>{window.authChange=callback;},status:()=>({signedIn:true,available:true,claims:{livepalmesCapabilities:{"admin.full":true}}}),isAdminAuthenticated:()=>true};
    window.testCalls=[];
    const service={httpsCallable:name=>async payload=>{
     window.testCalls.push({name,payload});
     if(name==="listCompetitionImports")return{data:{imports:[]}};
     if(name!=="previewCompetitionImport")throw Error("Unexpected write: "+name);
     if("zipSelection" in payload || "pdf" in payload)throw Error("Archive/PDF transmitted");
     const common={ok:true,source:"nap",previewOnly:true,canConfirm:false,metadata:{competitionName:"Compétition",date:"2026-10-11"},rows:[{sourceLine:4,kind:"NAG",lastName:"TEST",firstName:"Personne",course:"50SF",clubCode:"ABC",time:"32.45",status:"NAG"}],excludedSourceLines:[],summary:{rows:1},issues:[]};
     const clubReady=payload.clubBindings?.some(b=>b.code==="ABC"&&b.clubId==="106");
     return{data:payload.competitionId?{...common,competition:{id:5172,libelle:"Compétition"},unresolved:[],unresolvedClubs:clubReady?[]:[{code:"ABC"}],sourceClubs:[{code:"ABC",name:"Club source",federalNumber:"01020304"}],clubs:[{id:"106",code:"ABC",name:"Club NAP",federalNumber:"01020305"}],unresolvedMembers:[],reviewReady:!!clubReady}:{...common,requiresCompetitionChoice:true,competitions:[{id:5172,libelle:"Compétition",lieu:"Ville"}]}};
    }};
    window.firebase={apps:[{}],initializeApp:()=>{},app:()=>({functions:()=>service}),functions:()=>service};
   },portal);
   for(const file of ["styles.css","assets/livepalmes-admin-portal.css","performances/public/import-competitions.css"])await page.addStyleTag({content:fs.readFileSync(file,"utf8")});
   for(const file of ["performances/public/winpalme-zip.js","performances/public/import-competitions.js"])await page.addScriptTag({path:file});
   await page.locator("#competitionImportOpenButton").click();
   await page.locator("#competitionImportFile").setInputFiles({name:"fixture.zip",mimeType:"application/zip",buffer:zip});
   await page.locator('#competitionImportForm button[type="submit"]').click();
   await page.locator("[data-nap-competition]").waitFor();
   assert.equal(await page.locator("#competitionZipPreview").isVisible(),true,"Completing progress must preserve ZIP selection");
   assert.match(await page.locator("#competitionZipPreview").innerText(),/1 nageurs, 1 clubs, 1 résultats/);
   assert.equal(await page.locator("[data-nap-save]").isDisabled(),true);
   await page.locator("[data-nap-competition]").selectOption("5172");await page.locator("[data-nap-refresh]").click();
   await page.locator("[data-nap-club]").waitFor();
   assert.match(await page.locator("#competitionImportWarnings").innerText(),/01020304.*01020305/);
   await page.locator("[data-nap-club]").fill("106");await page.locator("[data-nap-club]").dispatchEvent("change");await page.locator("[data-nap-refresh]").click();
   await page.getByText("Rapprochements contrôlés pour cet aperçu.",{exact:false}).waitFor();
   assert.equal(await page.locator("[data-nap-save]").isDisabled(),true,"A reviewed ZIP can never be saved");
   assert.equal(await page.locator(".competition-import-preview-tools").isVisible(),false,"Legacy filters stay hidden in native preview");
   const [download]=await Promise.all([page.waitForEvent("download"),page.locator("[data-zip-report]").click()]);
   assert.equal(download.suggestedFilename(),"controle-import-winpalme.json");
   const calls=await page.evaluate(()=>testCalls);assert.equal(calls.filter(c=>c.name==="previewCompetitionImport").length,3);assert.ok(!calls.some(c=>c.name==="createCompetitionImport"));
   assert.equal(await page.locator("#competitionImportDialog").evaluate(e=>e.scrollWidth>e.clientWidth+1),false,"No horizontal dialog overflow");
   if(process.env.LIVEPALMES_ZIP_SCREENSHOTS){fs.mkdirSync("outputs/zip-import",{recursive:true});await page.screenshot({path:path.resolve(`outputs/zip-import/preview-${width}.png`)});}
   await page.locator("#competitionImportDialogClose").click();assert.equal(await page.locator("#competitionZipPreview").isVisible(),false);
   await page.locator("#competitionImportOpenButton").click();assert.equal(await page.locator("#competitionImportFile").inputValue(),"");
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log("ZIP portal: local PDF, grouped national preview, report, readonly after choices, close/reset, no upload/write and 1440/390/320px verified offline.");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
