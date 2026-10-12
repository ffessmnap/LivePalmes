"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),{randomUUID}=require("node:crypto");
const calls=[],fetches=[],published=[];
let failPublish=true;
const data={id:"records",records:[],franceRecords:[],filters:{},recordHistory:[{adminEmail:"private"}],updatedAt:"old"};
const context={console,URL,crypto:{randomUUID},CustomEvent:function(name,init){this.detail=init.detail;},dispatchEvent:()=>{},LivePalmesEnvironment:{sportingDataSource:"nap",functionsRegion:"europe-west1",napReaderUrl:"https://example.test/reader",publicStorageUrl:p=>p},LIVEPALMES_RECORDS:{records:[{key:"obsolete"}]},LivePalmesRecordPlaceholders:{completeData:d=>d},fetch:async(url,options)=>{fetches.push({url,options});return {ok:true,json:async()=>({source:"nap",revision:1,data:{...data,recordHistory:undefined}})};},firebase:{apps:[{}],initializeApp(){},firestore(){throw Error("Firestore access forbidden in NAP mode");},functions:()=>{throw Error("Use the Firebase App for regional Functions");},app:()=>({functions:region=>{assert.equal(region,"europe-west1");return {httpsCallable:name=>async input=>{calls.push(name);if(name==="getNapPerformanceAdministration")return {data:{source:"nap",revision:1,data}};published.push(input);if(failPublish){failPublish=false;throw Error("response lost");}return {data:{source:"nap",revision:2,data:input.data}};}};}})}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve("../performances/public/store.js"),"utf8"),context);
(async()=>{
 const store=context.LivePalmesPerformanceStore;
 const publicData=await store.loadData();assert.equal(publicData.records.length,0);assert.equal(publicData.recordHistory,undefined);assert.equal(fetches[0].options.cache,"no-store");assert.match(fetches[0].url,/action=records/);assert.equal(calls.length,0);
 await assert.rejects(()=>store.saveData(data),/Rechargez/);
 await store.loadData({administration:true});assert.equal(calls[0],"getNapPerformanceAdministration");
 await assert.rejects(()=>store.saveData({...data,updatedAt:"first"}),/response lost/);
 await store.saveData({...data,updatedAt:"retry",recordHistory:[{adminEmail:"private",publishedAt:"retry"}]});
 assert.equal(published.length,2);assert.equal(published[0].operationId,published[1].operationId);assert.equal(published[1].data.updatedAt,"first");assert.equal(published[1].expectedRevision,1);
 context.fetch=async()=>{throw Error("NAP unavailable");};
 await assert.rejects(()=>store.loadData(),/NAP unavailable/);
 assert.equal(fetches.length,1,"failed NAP read never fetches static/Storage fallback");
 context.LivePalmesEnvironment.sportingDataSource="legacy";
 await assert.rejects(()=>store.loadData(),/NAP requise/);
 await assert.rejects(()=>store.saveData(data),/NAP requise/);
 console.log("NAP browser Records: fresh read, no Firestore/static fallback, private administration and stable retry verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});

// Pages must bootstrap without loading an obsolete snapshot before their async NAP read.
for (const file of ["records.js", "app.js"]) {
 const script=fs.readFileSync(`performances/public/${file}`,"utf8");
 const bootstrap=script.slice(0,script.indexOf("const elements ="));
 const page={window:{},normalizeMixedRelayRecords:rows=>rows};vm.createContext(page);
 vm.runInContext(bootstrap+";globalThis.bootstrapped = data.records.length === 0 && data.franceRecords.length === 0;",page);
 assert.equal(page.bootstrapped,true,`${file} starts without static Records`);
}
for (const file of ["performances/records.html","performances/mpf.html","performances/nageur.html","pilotage-livepalmes.html","speaker.html","bureau-perf.html","series-public.html"]) {
 assert.equal(fs.readFileSync(file,"utf8").includes("data/records-data.js"),false,`${file} does not download the legacy snapshot`);
}
