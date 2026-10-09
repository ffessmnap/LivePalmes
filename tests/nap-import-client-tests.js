"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync("performances/public/import-competitions.js","utf8");
const section=source.slice(source.indexOf("  async function saveNativeImport()"),source.indexOf("  function renderPreview(result)"));
function fixture({replacement=false,checked=false,lost=false}={}) {
 const calls=[],button={disabled:false},messages=[];let ids=0;
 const context={nativeImportOperation:null,currentPreview:{canConfirm:true,expectedFingerprint:"before",previewFingerprint:"preview",diff:{requiresReplacementConfirmation:replacement}},currentPayload:{rawText:"TXT",competitionId:5162},currentFile:{name:"results.txt"},
 elements:{message:{},warnings:{querySelector:s=>s==='[data-nap-replacement]'?{checked}:button}},global:{confirm:()=>true,crypto:{randomUUID:()=>`id-${++ids}`}},
 setMessage:(_,message)=>messages.push(message),startImportProgress:()=>{},finishImportProgress:()=>{},loadImports:async()=>{},
 callFunction:async(name,input)=>{assert.equal(name,"createCompetitionImport");calls.push(JSON.parse(JSON.stringify(input)));if(lost){lost=false;throw Error("lost reply");}return {importId:"saved",source:"nap"};}};
 vm.runInNewContext(section,context);return {context,calls,button,messages};
}
(async()=>{
 let f=fixture({replacement:true});await f.context.saveNativeImport();assert.equal(f.calls.length,0);assert.match(f.messages[0],/retraits/);
 f=fixture({replacement:true,checked:true,lost:true});await f.context.saveNativeImport();assert.equal(f.button.disabled,false);await f.context.saveNativeImport();assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0],f.calls[1]);assert.equal(f.calls[1].confirmReplacement,true);assert.equal(f.context.currentPreview.canConfirm,false);
 f=fixture();await f.context.saveNativeImport();assert.equal(f.calls[0].expectedFingerprint,"before");assert.equal(f.calls[0].previewFingerprint,"preview");assert.equal(f.calls[0].fileName,"results.txt");assert.equal(f.calls.length,1,"no legacy publication worker request");
 console.log("NAP import client: explicit removal confirmation, stable retry payload and direct native receipt verified without live writes.");
})().catch(error=>{console.error(error);process.exitCode=1;});
