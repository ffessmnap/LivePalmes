"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("functions/index.js","utf8");
const start=source.indexOf("async function generateNativeClubRecapPdf("),end=source.indexOf("exports.listEngagementCompetitionClubRecaps",start);
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
const pack={clubId:"106",swimmers:[{id:"1"}],relays:[{id:2}],individual:[{tps:"14200"}]};
let read=0,built=0,denied=false,wrongClub=false,fail=false;
const context={exports:{},ENVIRONMENT:{projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:v=>v,onCall:(opts,fn)=>Object.assign(fn,{options:opts}),HttpsError,TypeError,RangeError,Buffer,process:{env:{}},cleanText:v=>String(v||""),ageCategoryFromDates:()=>"C",engagementClubEntryHasParticipants:entry=>entry.swimmers.length>0,engagementClubAccessContext:async()=>{if(denied)throw new HttpsError("permission-denied","Denied");return {clubId:"106"};},db:new Proxy({},{get(){throw Error("Legacy sports access forbidden");}}),nativePortalCompetition:async(id,auth)=>{assert.equal(id,"legacy-nap-5140");await auth({});read++;return {date:"2026-10-11"};},buildEngagementClubRecapPdf:async(comp,entry)=>{built++;assert.equal(entry.nativeData,pack);if(fail)throw Error("private database details");return {buffer:Buffer.from("%PDF-example"),fileName:"recap.pdf",generatedAt:"now"};},require:name=>{
 if(name==="./nap-portal-swimmers")return {portalPool:()=>({})};
 if(name==="./nap-portal-entries")return {readNativeClubEntry:async(pool,input,auth)=>{assert.equal(input.clubId,"106");await auth({clubId:wrongClub?"999":"106"});read++;return pack;}};
 if(name==="./nap-portal-workspaces")return {entryItem:(native,scope)=>({source:"nap",swimmers:native.swimmers,nativeData:native})};
 throw Error("Unexpected dependency");
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
 const request={data:{competitionId:"legacy-nap-5140"}};
 const response=await context.exports.generateEngagementClubRecapPdf(request);
 assert.equal(response.source,"nap");assert.equal(response.fromStorage,false);assert.equal(Buffer.from(response.pdfBase64,"base64").toString(),"%PDF-example");assert.equal(response.sqlBudget.queriesMax,23);assert.equal(read,2);assert.equal(built,1);
 assert.deepEqual(Array.from(context.exports.generateEngagementClubRecapPdf.options.secrets),["LIVEPALMES_NAP_PASSWORD"]);
 denied=true;await assert.rejects(()=>context.exports.generateEngagementClubRecapPdf(request),/Denied/);assert.equal(read,2);denied=false;
 wrongClub=true;await assert.rejects(()=>context.exports.generateEngagementClubRecapPdf(request),/hors du club/);assert.equal(built,1);wrongClub=false;
 fail=true;await assert.rejects(()=>context.exports.generateEngagementClubRecapPdf(request),error=>error.code==="unavailable"&&!error.message.includes("private"));
 console.log("Native recap: authenticated club, direct bounded NAP reads, no legacy sports/Storage, safe errors verified");
})().catch(error=>{console.error(error);process.exitCode=1;});
