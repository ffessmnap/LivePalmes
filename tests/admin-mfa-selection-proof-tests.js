"use strict";
require("./helpers/offline-network");
const assert=require("node:assert/strict"),{validate}=require("../tools/admin-mfa-selection-proof");
const row={name:"fixtureRetained",commit:"a".repeat(40),legacyBefore:"b".repeat(64),legacyAfter:"c".repeat(64),optimizedBefore:"d".repeat(64),optimizedAfter:"d".repeat(64)},input={schema:1,project:"livepalmes-test",candidate:"e".repeat(40),rows:[row]};
validate(input);
for(const change of [{schema:2},{project:"other-project"},{candidate:"HEAD"},{rows:[row,row]},{rows:Array(151).fill(row)}])assert.throws(()=>validate({...input,...change}));
for(const change of [{name:"../other"},{commit:"HEAD"},{legacyBefore:row.legacyAfter},{optimizedAfter:"f".repeat(64)},{legacyAfter:"invalid"}])assert.throws(()=>validate({...input,rows:[{...row,...change}]}));
console.log("MFA source proof: exact context, bounded unique origins, true comparator disagreement and no exclusion of changed optimized code verified offline.");
