"use strict";
require("./helpers/offline-network");
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path"),{chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.LIVEPALMES_BROWSER_EXECUTABLE?{executablePath:process.env.LIVEPALMES_BROWSER_EXECUTABLE}:{})});
 const out=path.resolve("outputs/swimmer-merge-conflicts");fs.mkdirSync(out,{recursive:true});
 try{for(const width of [1440,390,320]){
  const page=await browser.newPage({viewport:{width,height:850}});await page.route("**/*",route=>route.abort());
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body class="admin-portal-page"><button id="start">Fusionner</button><p id="status"></p></body></html>');
  const entry=fs.readFileSync("assets/livepalmes-admin-portal.css","utf8");
  for(const file of ["styles.css",...[...entry.matchAll(/@import url\("([^"?]+)\?v=[^"]+"\);/g)].map(match=>"assets/"+match[1]),"assets/livepalmes-portal-appearance.css"])await page.addStyleTag({content:fs.readFileSync(file,"utf8")});
  await page.addScriptTag({content:fs.readFileSync("assets/portal/national-directories.js","utf8")});
  await page.evaluate(()=>{
   const source={id:"12",source:"reference",napSource:true,napFingerprint:"a".repeat(64),firstName:"Source",lastName:"FICTIF",clubId:"106"},target={...source,id:"13",firstName:"Cible",napFingerprint:"b".repeat(64)};
   window.calls=[];window.confirm=()=>true;window.LivePalmesSwimmerClubs={getTools:()=>({chooseFinalClub:async()=>({clubId:"106",label:"Club fictif"})})};
   const state={engagementNationalSwimmers:[source,target],engagementNationalSwimmerMergeTargets:[target]};
   const actions={canDeleteEngagementCompetitionDirectly:()=>true,clubDisplayLabel:()=>"Club fictif",invalidateEngagementClubSwimmersCache:()=>{},renderEngagementNationalSwimmers:()=>{},updateEngagementNationalSwimmerSelectionState:()=>{},selectedEngagementNationalSwimmerKeepKey:()=>"reference:13",selectedEngagementNationalSwimmerMergeKeys:()=>["reference:12"],engagementNationalSwimmerByKey:key=>key.endsWith(":13")?target:source,engagementNationalSwimmerKey:s=>`reference:${s.id}`,
    callFunction:async(name,payload)=>{if(name!=="mergeEngagementNationalClubSwimmer")throw Error("Unexpected RPC");calls.push(payload);if(!payload.entryConflictChoices)return {ok:false,mergeConflicts:{token:"c".repeat(64),conflicts:[{key:'[3,"50BI"]',competitionId:"100",course:"50BI",swimmerId:"13",choices:[{id:"5",fields:{course:"50BI",tps:"1250",note:"<img src=x onerror=alert(1)>"}},{id:"7",fields:{course:"50BI",tps:"1200",note:"Temps proposé par le club"}}]}]}};return {ok:true,sourceDeleted:true,target};}};
   window.module=LivePalmesPortalNationalDirectories.create({state,actions,config:{},elements:{engagementsNationalSwimmersStatus:document.querySelector("#status")}});
   window.begin=(group=false)=>{document.querySelector("#start").focus();window.done=group?module.mergeSelectedEngagementNationalSwimmers():module.mergeEngagementNationalSwimmer("12","reference","reference:13");};
  });
  const dialog=page.getByRole("dialog",{name:"Choisir les engagements conservés"});
  for(const group of [false,true]){
   await page.evaluate(group=>begin(group),group);await dialog.waitFor();const before=await page.evaluate(()=>calls.length);
   const radios=dialog.getByRole("radio");assert.equal(await radios.count(),2);assert.equal(await radios.evaluateAll(rows=>rows.some(row=>row.checked)),false);assert.equal(await page.locator("img").count(),0);
   await dialog.getByRole("button",{name:"Valider et fusionner"}).click();assert.equal(await page.evaluate(()=>calls.length),before,"No automatic selection");
   await page.keyboard.press("Escape");await page.evaluate(()=>done);assert.equal(await page.evaluate(()=>calls.length),before,"Cancellation never submits choices");
   await page.evaluate(group=>begin(group),group);await dialog.waitFor();await dialog.getByRole("radio",{name:/Engagement 7/}).check();
   assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),`Dialog overflow at ${width}`);
   await page.screenshot({path:path.join(out,`choice-${width}-${group?"group":"single"}.png`)});
   await dialog.getByRole("button",{name:"Valider et fusionner"}).click();await page.evaluate(()=>done);
   const sent=await page.evaluate(()=>calls.at(-1));assert.deepEqual(sent.entryConflictChoices,[{key:'[3,"50BI"]',id:"7"}]);assert.equal(sent.entryConflictToken,"c".repeat(64));
   assert.equal(sent.entryConflictProtocol,1);assert.ok(await page.evaluate(()=>calls.every(call=>call.entryConflictProtocol===1)),"Both calls explicitly support the choice protocol");
   assert.match(await page.locator("#status").textContent(),group?/1 fusion/:/Fusion terminée/);
   assert.equal(await page.evaluate(()=>document.activeElement.id),"start");
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();
 }}finally{await browser.close();}
 console.log("Merge conflict dialog: real module, single/group, mobile/desktop, no default, cancellation, exact choice/token, escaped content and focus passed offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
