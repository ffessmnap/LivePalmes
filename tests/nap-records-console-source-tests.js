"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
let calls=0,failed=false,finish;
const data={records:[],franceRecords:[],sourceDate:"2026-10-12"};
const context={URL,Promise,LivePalmesEnvironment:{sportingDataSource:"nap",napReaderUrl:"https://example.test/reader"},LIVEPALMES_RECORDS:{records:[{time:"obsolete"}],franceRecords:[]},fetch:async(url,options)=>{calls++;assert.match(url,/action=records/);assert.equal(options.cache,"no-store");await new Promise(resolve=>{finish=resolve;});return {ok:!failed,json:async()=>({source:"nap",data})};}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve("../assets/public/livepalmes-public-records-source.js"),"utf8"),context);
(async()=>{
 const source=context.LivePalmesPublicRecordsSource;
 assert.equal(source.toConsoleRecords().length,0,"obsolete static source is not used before NAP load");
 const first=source.load(),second=source.load();assert.equal(first,second);assert.equal(calls,1);finish();await first;
 const original={records:[{time:"old"}],entrants:[{id:1}],results:[{time:"sporting"}],notes:{other:true}};
 const merged=source.mergeIntoLiveData(original);assert.equal(merged.records.length,0);assert.equal(merged.entrants,original.entrants);assert.equal(merged.results,original.results);assert.equal(merged.notes.other,true);assert.equal(original.records.length,1);
 failed=true;const retry=source.load();assert.equal(calls,2,"later action reads again");finish();await assert.rejects(()=>retry,/indisponible/);assert.equal(source.mergeIntoLiveData(original).records.length,0);
 console.log("Console Records: shared current NAP read, no obsolete fallback, local-only projection and sporting data preserved.");
})().catch(e=>{console.error(e);process.exitCode=1;});
