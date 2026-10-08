"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const start=source.indexOf("exports.listEngagementQualificationSources ="),end=source.indexOf("exports.processEngagementQualificationJob =",start);
assert.ok(start>=0&&end>start);
let national=true,nativeReads=0,legacyReads=0,poolCalls=0;
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const context={exports:{},ENVIRONMENT:{projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},defineSecret:name=>name,onCall:(options,handler)=>{assert.ok(context.ENVIRONMENT.projectId!=="livepalmes-test"||options.secrets.includes("LIVEPALMES_NAP_PASSWORD"));return handler;},HttpsError,engagementAccessContext:async()=>({national}),qualificationService:{listSources:async()=>{legacyReads++;return {source:"legacy"};}},process:{env:{LIVEPALMES_NAP_PASSWORD:"fake-unit-test-secret"}},require:name=>{
 if(name==="./nap-portal-swimmers")return {portalPool:password=>{assert.equal(password,"fake-unit-test-secret");poolCalls++;return "native-test-pool";}};
 if(name==="./nap-qualification-sources")return {listSources:async(pool,data)=>{assert.equal(pool,"native-test-pool");assert.equal(data.startDate,"2025-01-01");nativeReads++;return {source:"nap"};}};
 throw Error("Unexpected dependency "+name);
}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
(async()=>{
 const request={data:{startDate:"2025-01-01"}};
 assert.equal((await context.exports.listEngagementQualificationSources(request)).source,"nap");assert.equal(nativeReads,1);assert.equal(legacyReads,0);
 national=false;await assert.rejects(context.exports.listEngagementQualificationSources(request),error=>error.code==="permission-denied");assert.equal(poolCalls,1,"Check rights before native reads");assert.equal(legacyReads,0);
 context.ENVIRONMENT.projectId="livepalmes-production";assert.equal((await context.exports.listEngagementQualificationSources(request)).source,"legacy");assert.equal(legacyReads,1,"Production remains unchanged until approved migration");
 console.log("Qualification sources callable: TEST reads NAP only, national scope before reads and current production route preserved; offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
