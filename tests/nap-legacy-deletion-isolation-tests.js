"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
(async()=>{
  for(const name of ["deleteEngagementNationalClub","requestEngagementClubSwimmerDeletion","deleteEngagementNationalClubSwimmer","listEngagementSwimmerDeletionRequests","resolveEngagementSwimmerDeletionRequest"]){
    const start=source.indexOf(`exports.${name} =`);assert.ok(start>=0);
    const end=source.indexOf("\n});",start)+4;assert.ok(end>start);
    let reads=0;const context={exports:{},CALLABLE_OPTIONS:{},ENVIRONMENT:{sportingDataSource:"nap"},onCall:(_,handler)=>handler,HttpsError:class extends Error{constructor(code,message){super(message);this.code=code;}},engagementAccessContext:async()=>{reads++;throw Error("legacy access");},engagementClubAccessContext:async()=>{reads++;throw Error("legacy access");},db:{collection(){reads++;throw Error("legacy collection");}}};
    vm.runInNewContext(source.slice(start,end),context);
    await assert.rejects(context.exports[name]({data:{confirmPermanent:true,swimmerId:"12",clubId:"106"}}),error=>error.code==="failed-precondition");
    assert.equal(reads,0,"NAP request must never reach legacy sporting collections");
  }
  console.log("Legacy deletion isolation: all five old club/swimmer actions refused before former sporting Firebase reads or writes in NAP mode.");
})().catch(error=>{console.error(error);process.exitCode=1;});
