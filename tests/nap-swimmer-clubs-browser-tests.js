"use strict";
// Real renderer/dialog on synthetic data. Every external request is blocked.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),{chromium}=require("playwright");
const portal=fs.readFileSync("portail.html","utf8"),source=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
const render=source.slice(source.indexOf("  function renderEngagementNationalSwimmers()"),source.indexOf("  function updateEngagementNationalSwimmersStatus("));
const open=source.slice(source.indexOf("  function closeEngagementSwimmerCorrectionDialog()"),source.indexOf("  async function submitEngagementSwimmerCorrection()"));
const submit=source.slice(source.indexOf("  async function submitEngagementSwimmerCorrection()"),source.indexOf("  function normalizeEngagementNationalClub("));
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE||"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
 const out=path.resolve("outputs/nageurs-licence-20261024");fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(10000);console.log("Viewport",width);await page.route("**/*",route=>route.abort());
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body class="admin-portal-page" data-admin-auth="unlocked"><main class="admin-portal"><section class="admin-national-page-card"><h2>Nageurs</h2><div id="adminEngagementsNationalSwimmersList"></div></section></main></body></html>');
  for(const file of ["styles.css","assets/livepalmes-admin-portal.css","assets/livepalmes-portal-appearance.css"])await page.addStyleTag({content:fs.readFileSync(file,"utf8")});
  await page.evaluate(html=>document.body.append(new DOMParser().parseFromString(html,"text/html").querySelector("#adminEngagementsSwimmerCorrectionDialog")),portal);
  await page.evaluate(()=>{
   window.global=window;window.fixtureSwimmer={id:"42",source:"reference",napSource:true,napFingerprint:"a".repeat(64),firstName:"Test",lastName:"FICTIF",birthDate:"1980-01-01",sex:"F",clubId:"106",club:"Club fictif",licenseNumber:"A-00-123456"};
   window.engagementNationalSwimmers=[window.fixtureSwimmer];window.engagementNationalSwimmerMergeMode=true;window.engagementNationalSwimmerMergeSourceId="";window.engagementNationalSwimmerMergeTargets=[];
   window.canDeleteEngagementCompetitionDirectly=()=>true;window.updateEngagementNationalSwimmerSelectionState=()=>{};window.filteredEngagementNationalSwimmers=()=>window.engagementNationalSwimmers;window.updateEngagementNationalSwimmersStatus=()=>{};
   window.engagementSwimmerDisplayName=s=>[s.firstName,s.lastName].join(" ");window.engagementNationalSwimmerDuplicateAlertLabel=()=>({label:"Simple",score:0});window.clubDisplayLabel=s=>s.club||s.clubId;window.formatShortDate=s=>s;window.escapeHtml=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
   window.elements={};for(const el of document.querySelectorAll('[id^="adminEngagementsSwimmerCorrection"],#adminEngagementsNationalSwimmersList')){const key=el.id.replace(/^admin/,'');window.elements[key[0].toLowerCase()+key.slice(1)]=el;}
   window.setFormPending=()=>{};window.engagementSwimmerCorrectionOpener=null;window.engagementSwimmerCorrectionReview=null;
   window.testCalls=[];window.callFunction=async(name)=>{window.testCalls.push(name);if(name!=="listEngagementNationalClubs")throw Error("Business calls forbidden");return {source:"nap",clubs:[{clubId:"106",clubCode:"AAA",clubName:"Premier club fictif"},{clubId:"107",clubCode:"BBB",clubName:"Deuxième club fictif"},{clubId:"108",clubCode:"CCC",clubName:"Autre club fictif"}]};};
  });
  await page.addScriptTag({content:fs.readFileSync("assets/livepalmes-swimmer-clubs.js","utf8")});await page.addScriptTag({content:render+open+"\nrenderEngagementNationalSwimmers();"});
  await page.getByText("⋮",{exact:true}).click();
  const visible=await page.locator('.admin-national-row-menu button').evaluateAll(buttons=>{const wrap=document.querySelector('.admin-engagements-national-table-wrap').getBoundingClientRect();return buttons.map(b=>({text:b.textContent,bottom:b.getBoundingClientRect().bottom,limit:wrap.bottom,visible:b.getBoundingClientRect().height>0}));});
  assert.equal(visible.length,4);assert.ok(visible.every(b=>b.visible&&b.bottom<=b.limit),JSON.stringify(visible));
  await page.locator('.admin-engagements-national-table-wrap').evaluate(el=>el.scrollLeft=el.scrollWidth);
  await page.screenshot({path:path.join(out,`menu-${width}.png`)});
  console.log("Menu checked");await page.evaluate(()=>openEngagementSwimmerCorrectionDialog(window.fixtureSwimmer,"direct"));
  console.log("Editor opened");await page.getByRole("combobox",{name:"Club du nageur",exact:true}).selectOption("107");assert.equal(await page.getByRole("combobox",{name:"Club du nageur",exact:true}).inputValue(),"107");
  const licence=page.getByLabel("Numéro de licence",{exact:true});assert.equal(await licence.evaluate(el=>el.readOnly),false);await licence.fill("A-03-999999");await page.getByLabel("Motif de la correction",{exact:true}).fill("Correction fictive de licence");
  await page.addScriptTag({content:submit});
  await page.evaluate(()=>{window.confirm=()=>true;window.callFunction=async(name,payload)=>{window.submitted={name,payload};throw Error("Refus de doublon fictif");};});
  await page.evaluate(()=>submitEngagementSwimmerCorrection());assert.equal((await page.evaluate(()=>window.submitted)).payload.proposed.licenseNumber,"A-03-999999");assert.equal((await page.evaluate(()=>window.submitted)).payload.expectedLicenseNumber,"A-00-123456");assert.equal((await page.evaluate(()=>window.submitted)).name,"updateEngagementNationalSwimmerIdentity");await page.getByText("Correction impossible : Refus de doublon fictif",{exact:true}).waitFor();assert.equal(await licence.inputValue(),"A-03-999999");
  await page.screenshot({path:path.join(out,`edit-${width}.png`)});await page.keyboard.press("Escape");
  await page.evaluate(()=>openEngagementSwimmerCorrectionDialog(window.fixtureSwimmer,"request"));assert.equal(await licence.evaluate(el=>el.readOnly),true);await page.keyboard.press("Escape");
  await page.evaluate(()=>{window.choicePromise=LivePalmesSwimmerClubs.getTools(callFunction).chooseFinalClub({target:fixtureSwimmer,sources:[{...fixtureSwimmer,clubId:"107"}]});});
  const select=page.getByRole("combobox",{name:"Club du nageur",exact:true});assert.equal(await select.inputValue(),"");
  await page.getByText("Les clubs historiques reconnus sont conservés. Si le club d’une performance est inconnu, celui de sa fiche d’origine sera enregistré avant la fusion.",{exact:true}).waitFor();
  await select.selectOption("108");await page.screenshot({path:path.join(out,`merge-${width}.png`)});await page.getByRole("button",{name:"Continuer",exact:true}).click();
  assert.equal((await page.evaluate(()=>window.choicePromise)).clubId,"108");assert.deepEqual(await page.evaluate(()=>testCalls),["listEngagementNationalClubs"]);
  await page.evaluate(()=>{window.cancelChoice=LivePalmesSwimmerClubs.getTools(callFunction).chooseFinalClub({target:fixtureSwimmer,sources:[]});});await page.getByRole("button",{name:"Annuler",exact:true}).click();assert.equal(await page.evaluate(()=>window.cancelChoice),null);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }}finally{await browser.close();}
 console.log("National swimmer UI: one-row menu fully visible, editable club, explicit conflicting-club selection, third club and shared cache at 1440/390/320px; external requests/business calls blocked.");
})().catch(error=>{console.error(error);process.exitCode=1;});
