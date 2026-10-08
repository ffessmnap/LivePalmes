"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const start=source.indexOf("const pendingNapQualificationWrite ="),end=source.indexOf("// Retired endpoints",start);
let legacyWrites=0;
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const context={exports:{},ENVIRONMENT:{projectId:"livepalmes-test"},CALLABLE_OPTIONS:{},onCall:(_,handler)=>handler,HttpsError,qualificationService:{process:()=>legacyWrites++,grantException:()=>legacyWrites++,acknowledgeAlert:()=>legacyWrites++}};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
for(const handler of Object.values(context.exports)) assert.throws(()=>handler({}),error=>error.code==="failed-precondition");
assert.equal(legacyWrites,0,"An unsupported TEST operation must never write old sporting Firebase collections");
context.ENVIRONMENT.projectId="livepalmes-production";for(const handler of Object.values(context.exports))handler({});assert.equal(legacyWrites,3);
console.log("Pending qualification operations: no old sporting Firebase write in TEST, production route unchanged; offline.");
