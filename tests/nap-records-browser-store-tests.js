"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{randomUUID}=require("node:crypto");
const calls=[],fetches=[],published=[];
let failPublish=true;
const data={id:"records",records:[],franceRecords:[],filters:{},recordHistory:[{adminEmail:"private"}],updatedAt:"old"};
const context={console,URL,crypto:{randomUUID},CustomEvent:function(name,init){this.detail=init.detail;},dispatchEvent:()=>{},LivePalmesEnvironment:{sportingDataSource:"nap",functionsRegion:"europe-west1",napReaderUrl:"https://example.test/reader",publicStorageUrl:p=>p},LIVEPALMES_RECORDS:{records:[{key:"obsolete"}]},LivePalmesRecordPlaceholders:{completeData:d=>d},fetch:async(url,options)=>{fetches.push({url,options});return {ok:true,json:async()=>({source:"nap",revision:1,data:{...data,recordHistory:undefined}})};},firebase:{apps:[{}],initializeApp(){},firestore(){throw Error("Firestore access forbidden in NAP mode");},functions:()=>({httpsCallable:name=>async input=>{calls.push(name);if(name==="getNapPerformanceAdministration")return {data:{source:"nap",revision:1,data}};published.push(input);if(failPublish){failPublish=false;throw Error("response lost");}return {data:{source:"nap",revision:2,data:input.data}};}})}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve("../performances/public/store.js"),"utf8"),context);
(async()=>{
 const store=context.LivePalmesPerformanceStore;
 const publicData=await store.loadData();assert.equal(publicData.records.length,0);assert.equal(publicData.recordHistory,undefined);assert.equal(fetches[0].options.cache,"no-store");assert.match(fetches[0].url,/action=records/);assert.equal(calls.length,0);
 await assert.rejects(()=>store.saveData(data),/Rechargez/);
 await store.loadData({administration:true});assert.equal(calls[0],"getNapPerformanceAdministration");
 await assert.rejects(()=>store.saveData({...data,updatedAt:"first"}),/response lost/);
 await store.saveData({...data,updatedAt:"retry",recordHistory:[{adminEmail:"private",publishedAt:"retry"}]});
 assert.equal(published.length,2);assert.equal(published[0].operationId,published[1].operationId);assert.equal(published[1].data.updatedAt,"first");assert.equal(published[1].expectedRevision,1);
 console.log("NAP browser Records: fresh read, no Firestore/static fallback, private administration and stable retry verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
