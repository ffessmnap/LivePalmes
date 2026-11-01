"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),review=require("./release-backend-isolation-compatibility");
const c=review.contract,rows=c.retained.map(({name,commit})=>({name,commit}));
assert.equal(rows.length,16);assert.equal(new Set(rows.map(r=>r.name)).size,16);
assert(review.matches(c.productionCommit,c.candidate));
review.validateScope(c.productionCommit,c.candidate,rows);
for(const [base,candidate,input]of [
 ["0".repeat(40),c.candidate,rows],[c.productionCommit,"0".repeat(40),rows],
 [c.productionCommit,c.candidate,rows.slice(1)],
 [c.productionCommit,c.candidate,[...rows,rows[0]]],
 [c.productionCommit,c.candidate,rows.map((r,i)=>i? r:{...r,name:"unreviewed"})],
 [c.productionCommit,c.candidate,rows.map((r,i)=>i? r:{...r,commit:"0".repeat(40)})],
 [c.productionCommit,c.candidate,rows.map((r,i)=>i? r:{...r,skip:true})]
])assert.throws(()=>review.validateScope(base,candidate,input));
assert.equal(c.runtimeSourceSha256,require("../docs/releases/backend-isolation-progress.json").nativeReview.runtimeSourceSha256);
assert.equal(c.nativeIsolationCommit,require("../docs/releases/backend-isolation-progress.json").nativeIsolationCommit);
assert.equal(c.capturedSourceSha256,require("../docs/releases/backend-isolation-progress.json").capturedReview.proof.runtimeSourceSha256);
console.log("Isolation retained contract: exact pair, 16 installed origins, missing/extra/duplicate/forged scope refused offline.");
