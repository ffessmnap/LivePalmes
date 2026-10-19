"use strict";
const assert=require("node:assert/strict"),cp=require("node:child_process"),path=require("node:path");
const {ORIGINS}=require("./release-home-retained-compatibility");
const {loader}=require("./release-excluded-backend-compatibility-tests");
const root=path.resolve(__dirname,".."),base="ac78b50759ca209cddaa15d374eb5e01dd926268",candidate="25ac21b69c8fd09c44399f1f65b3bd4e6a0e58bd";
const rows=Object.entries(ORIGINS).map(([name,commit])=>({name,commit}));
function run(b,c,r){return cp.spawnSync(process.execPath,[path.join(__dirname,"release-excluded-backend-compatibility-tests.js"),root,b,c,JSON.stringify(r)],{encoding:"utf8",timeout:60000});}
const success=run(base,candidate,rows);assert.equal(success.status,0,success.stderr);
const receipt=JSON.parse(success.stdout);assert.equal(receipt.networkCalls,0);assert.equal(receipt.result,"success");
assert.deepEqual(receipt.passedFunctions,Object.keys(ORIGINS).sort());assert.match(receipt.homeProofSha256,/^[a-f0-9]{64}$/);
for(const [b,c,r] of [
 ["a".repeat(40),candidate,rows],[base,"a".repeat(40),rows],[base,candidate,rows.slice(1)],
 [base,candidate,[...rows,rows[0]]],[base,candidate,rows.map((r,i)=>i?r:{...r,commit:base})],
 [base,candidate,rows.map((r,i)=>i?r:{...r,name:"unknownHandler"})],
 [base,candidate,rows.map((r,i)=>i?r:{...r,revision:"untrusted-revision"})],
 [base,candidate,[null,...rows.slice(1)]],[base,candidate,null]
]){const result=run(b,c,r);assert.notEqual(result.status,0);assert.match(result.stderr,/AssertionError/);}
for(const denied of ["node:https","node:net","node:fs","node:child_process","mysql2/promise","firebase-admin","nodemailer"]){
 const load=loader(base,()=>`module.exports=require(${JSON.stringify(denied)});`);
 assert.throws(()=>load("functions/fixture.js"),/External import blocked/);
}
assert.throws(()=>loader(base,()=>"module.exports={};")("../outside.js"),/AssertionError/);
console.log("Home retained proof: 12 exact packages, origins and pair; authorization/preferences/access/identity fixtures; projection and mail replay; nine negative scopes and seven external clients blocked offline.");
