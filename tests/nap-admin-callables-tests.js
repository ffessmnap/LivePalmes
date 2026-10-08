"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
let denied=false,scopeDenied=false,read=0,built=0,openWater=false;
const entry={clubId:"106",swimmers:[{id:"11",individualEntries:[{nativeTime:"599999",entryTime:"599999"}]}],relays:[],officials:[],teamLeaderComplete:true};
const context={exports:{},ENVIRONMENT:{projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:v=>v,onCall:(options,fn)=>Object.assign(fn,{options}),HttpsError,TypeError,RangeError,Buffer,process:{env:{}},Date,cleanText:v=>String(v||""),ageCategoryFromDates:()=>"S",engagementAccessContext:async()=>{if(denied)throw new HttpsError("permission-denied","Denied");return {};},assertCanManageEngagementCompetition:()=>{if(scopeDenied)throw new HttpsError("permission-denied","Scope denied");},nativePortalCompetition:async(id,authorize)=>{await authorize({});return {competitionType:openWater?"openWater":"pool",date:"2026-11-07"};},engagementClubEntryHasParticipants:e=>e.swimmers.length>0,engagementCompetitionEntrySummaryItem:e=>({clubId:e.clubId}),engagementPdfFeeTotal:()=>3,engagementCompetitionStatisticsItem:entries=>({counts:{clubCount:entries.length}}),buildEngagementClubRecapPdf:async()=>{built++;return {buffer:Buffer.from("%PDF"),fileName:"club.pdf",generatedAt:"now"};},buildEngagementCompetitionTxt:(comp,entries)=>{assert.equal(entries[0].swimmers[0].individualEntries[0].entryTimeMode,"default595999");return {buffer:Buffer.from("NAG;595999;"),fileName:"entries.txt"};},db:new Proxy({},{get(){throw Error("Old sports database forbidden");}}),require:name=>{
  if(name==="./nap-portal-swimmers")return {portalPool:()=>({})};
  if(name==="./nap-admin-entries")return {readAdminEntries:async(pool,input,authorize)=>{await authorize(input.competition);read++;return {entries:[entry],clubsById:new Map(),generatedAt:"now",sqlBudget:{queriesMax:9,rowsMax:39200,writesMax:0}};}};
  throw Error("Unexpected dependency");
}};
const chunks=[source.slice(source.indexOf("async function nativeAdminCompetitionEntries("),source.indexOf("function engagementCompetitionStatisticsItem("))];
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
  console.log("Admin callables: scoped native reads, no old sports/Storage fallback, PDF, missing-time export and water-format lock verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
