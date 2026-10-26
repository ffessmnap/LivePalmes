"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let denied=false,scopeDenied=false,read=0,built=0,openWater=false,waterError=false;
const entry={clubId:"106",swimmers:[{id:"11",individualEntries:[{eventCode:"OW6000SF",nativeTime:"599999",entryTime:"599999"}]}],relays:[],officials:[],teamLeaderComplete:true};
const context={exports:{},ENVIRONMENT:{sportingDataSource:"nap",projectId:"livepalmes"},CALLABLE_OPTIONS:{},defineSecret:v=>v,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Buffer,process:{env:{}},Date,cleanText:v=>String(v||""),ageCategoryFromDates:()=>"S",engagementTxtSwimmerCategory:()=>"S",engagementPdfFileName:String,engagementAccessContext:async()=>{if(denied)throw new HttpsError("permission-denied","Denied");return {};},assertCanManageEngagementCompetition:()=>{if(scopeDenied)throw new HttpsError("permission-denied","Scope denied");},nativePortalCompetition:async(id,authorize)=>{await authorize({});return {id:"legacy-nap-5162",competitionType:openWater?"openWater":"pool",date:"2026-11-07",events:[{code:"OW6000SF",type:"individual",nativeCourses:[{id_course:74,course:"6000",sexe:"M",relais:0}]}]};},engagementClubEntryHasParticipants:e=>e.swimmers.length>0,engagementCompetitionEntrySummaryItem:e=>({clubId:e.clubId}),engagementPdfFeeTotal:()=>3,engagementCompetitionStatisticsItem:entries=>({counts:{clubCount:entries.length}}),buildEngagementClubRecapPdf:async()=>{built++;return {buffer:Buffer.from("%PDF"),fileName:"club.pdf",generatedAt:"now"};},buildEngagementCompetitionTxt:(comp,entries)=>{assert.equal(entries[0].swimmers[0].individualEntries[0].entryTimeMode,"default595999");return {buffer:Buffer.from("NAG;595999;"),fileName:"entries.txt"};},db:new Proxy({},{get(){throw Error("Old sports database forbidden");}}),require:name=>{
  if(name==="./winpalme-open-water-manual")return require("../functions/winpalme-open-water-manual");
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({execute:async(query,args)=>{if(query.sql.includes("FROM competitions")){assert.match(query.sql,/SELECT id,date,comite.*FORCE INDEX.*LIMIT 2/);assert.equal(args[0],5162);return [[{id:5162,date:"2026-11-07",comite:4}]];}assert.match(query.sql,/FROM course_dispo FORCE INDEX/);return [[{id:74,course:"6000",sexe:"M",relais:0,ld:1,wplabel:waterError?"":"LD06KM",longueur:6000,style:"SF",type_:1,nbnageur:1,mixte:0,actif:1,validation:1}]];}})};
  if(name==="./nap-admin-entries")return {readAdminEntries:async(pool,input,authorize)=>{await authorize(input.competition);read++;return {entries:[entry],clubsById:new Map([["106",{federalNumber:"07780252"}]]),generatedAt:"now",sqlBudget:{queriesMax:9,rowsMax:39200,writesMax:0}};}};
  throw Error("Unexpected dependency");
}};
const chunks=[source.slice(source.indexOf("async function nativeAdminCompetitionEntries("),source.indexOf("async function nativeNotificationPreview(")),source.slice(source.indexOf("exports.listEngagementCompetitionClubRecaps ="),source.indexOf("function engagementCompetitionStatisticsItem("))];
context.clubRecapZip = require("../functions/club-recap-zip").clubRecapZip;
chunks.push(source.slice(source.indexOf("exports.generateEngagementCompetitionClubRecapPdfs ="), source.indexOf("exports.generateEngagementCompetitionTxtExport =")));
for(const [name,next] of [["getEngagementCompetitionStatistics","generateEngagementClubRecapPdfForAdmin"],["generateEngagementClubRecapPdfForAdmin","generateEngagementCompetitionClubRecapPdfs"],["generateEngagementCompetitionTxtExport","listEngagementCompetitionMailJobs"]]) chunks.push(source.slice(source.indexOf(`exports.${name} =`),source.indexOf(`exports.${next} =`)));
vm.createContext(context);vm.runInContext(chunks.join("\n"),context);
(async()=>{
  const request={data:{competitionId:"legacy-nap-5162",clubId:"106"}};
  for(const name of Object.keys(context.exports)) {const result=await context.exports[name](request);assert.equal(result.source,"nap");assert.equal(result.sqlBudget.queriesMax,24);assert.deepEqual(Array.from(context.exports[name].options.secrets),["LIVEPALMES_NAP_PASSWORD"]);}
  assert.equal(read,5);assert.equal(built,2);assert.equal(entry.swimmers[0].individualEntries[0].nativeTime,"599999","Export must not change native data");
  denied=true;await assert.rejects(context.exports.getEngagementCompetitionStatistics(request),/Denied/);assert.equal(read,5);denied=false;
  scopeDenied=true;await assert.rejects(context.exports.getEngagementCompetitionStatistics(request),/Scope denied/);assert.equal(read,5);scopeDenied=false;
  await assert.rejects(context.exports.generateEngagementClubRecapPdfForAdmin({data:{...request.data,clubId:"999"}}),e=>e.code==="not-found");assert.equal(built,2);
  openWater=true;await assert.rejects(context.exports.generateEngagementCompetitionTxtExport(request),/eau libre/);
  context.ENVIRONMENT.projectId="livepalmes-test";
  const waterResult=await context.exports.generateEngagementCompetitionTxtExport(request);
  assert.equal(waterResult.source,"nap");assert.equal(waterResult.sqlBudget.queriesMax,26);assert.equal(waterResult.sqlBudget.widRowsMax,1);
  assert.equal(waterResult.sqlBudget.catalogueRowsMax,300);
  assert.ok(Buffer.from(waterResult.txtBase64,"base64").toString().includes("DIS;LD06KM;6000;6000;SF;1;1;74;0"));
  waterError=true;
  await assert.rejects(context.exports.generateEngagementCompetitionTxtExport(request),e=>e.code==="failed-precondition" && /correspondance/.test(e.message));
  waterError=false;
  const portalSource=fs.readFileSync("assets/livepalmes-admin-portal.js","utf8");
  const uiCode=portalSource.match(/^  function canDownloadEngagementOpenWaterTxt\([^]*?^  \}/m)[0]+"\n"+portalSource.slice(portalSource.indexOf("  async function generateEngagementAdminTxtExport()"),portalSource.indexOf("  async function prepareEngagementOpeningEmails()"));
  for(const isTest of [true,false]) {
    let downloads=0,calls=0;
    const ui={global:{LivePalmesEnvironment:{isTest}},selectedEngagementCompetitionId:"4982",selectedEngagementCompetition:{id:"4982",napSource:true,competitionType:"openWater"},isEngagementAdminMode:()=>true,engagementCompetitionType:c=>c.competitionType,elements:{engagementsGenerateTxtExportButton:{disabled:false},engagementsDocumentsSummary:{}},callFunction:async()=>{calls++;return {txtBase64:"VEVTVA==",entryCount:1};},downloadBase64File:()=>downloads++,renderEngagementDocuments:()=>{}};
    vm.createContext(ui);vm.runInContext(uiCode,ui);await ui.generateEngagementAdminTxtExport();
    assert.equal(calls,isTest?1:0);assert.equal(downloads,isTest?1:0);assert.equal(ui.elements.engagementsGenerateTxtExportButton.disabled,false);
  }
  console.log("Admin callables: scoped native reads, no old sports/Storage fallback, PDF, missing-time export and water-format lock verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
