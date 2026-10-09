"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("performances/public/import-competitions.js","utf8");
const section=source.slice(source.indexOf("  async function saveNativePerformanceCorrection("),source.indexOf("  async function savePerformanceCorrection("));
function fixture({lost=false,time="1:42.00",club="106"}={}) {
 const calls=[],row={id:"973",time:"1:42.00",clubId:"106",expectedFingerprint:"current"};let ids=0;
 const elements={correctionReason:{value:"Verified correction"},correctionTime:{value:time},correctionClub:{value:club},correctionDate:{},correctionLocation:{}};
 const context={correctionSelectedRow:row,correctionSelectedSwimmer:{id:"168"},correctionRows:[],elements,global:{crypto:{randomUUID:()=>`operation-${++ids}`}},document:{querySelector:()=>null},normalizeTimeField:()=>{},parseTimeValue:input=>input==="1:41.00"?10100:10200,
 setCorrectionControlsBusy:()=>{},startImportProgress:()=>{},finishImportProgress:()=>{},resetCorrectionEditor:()=>{},updateCorrectionFilters:()=>{},renderCorrectionRows:()=>{},loadCorrectionPerformanceBaseRows:async()=>[],
 callFunction:async(name,input)=>{assert.equal(name,"savePerformanceCorrection");calls.push(JSON.parse(JSON.stringify(input)));if(lost) {lost=false;throw Error("lost response");}return{source:"nap"};}};
 vm.runInNewContext(section,context);return{context,calls,row};
}
(async()=>{
 let f=fixture({club:"107"});await f.context.saveNativePerformanceCorrection("correct");assert.deepEqual(f.calls[0].patch,{club:107},"unchanged unpadded native time is not rewritten");
 f=fixture({time:"1:41.00",lost:true});await assert.rejects(()=>f.context.saveNativePerformanceCorrection("correct"),/lost/);await f.context.saveNativePerformanceCorrection("correct");assert.equal(f.calls[0].operationId,f.calls[1].operationId);assert.deepEqual(f.calls[1].patch,{tps:"014100"});
 for(const action of ["hide","restore","delete"]){f=fixture();await f.context.saveNativePerformanceCorrection(action);assert.equal(f.calls[0].action,action);assert.deepEqual(f.calls[0].patch,{});assert.equal(f.calls[0].confirmDeletion,action==="delete");}
 f=fixture();await assert.rejects(()=>f.context.saveNativePerformanceCorrection("correct"),/Aucune/);assert.equal(f.calls.length,0);
 console.log("NAP correction client: unchanged raw time, compact encoding, explicit visibility/deletion, no date/location patch and stable interrupted-operation retry verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
