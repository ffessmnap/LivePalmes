"use strict";
const assert=require("node:assert/strict");
const {nativeEqual}=require("../functions/nap-native-compare");
for(const column of ["nom","c.lieu","`prenom`","cp.`actif`"]) {
  const sql=nativeEqual(column);
  assert.equal(sql,`BINARY CONVERT(${column} USING utf8mb4) <=> BINARY CONVERT(? USING utf8mb4)`);
  assert.equal((sql.match(/\?/g)||[]).length,1);
}
assert.equal(nativeEqual("nom","="),"BINARY CONVERT(nom USING utf8mb4) = BINARY CONVERT(? USING utf8mb4)");
for(const column of ["nom OR 1=1","c.nom.extra","nom;DELETE","?","",null]) assert.throws(()=>nativeEqual(column),TypeError);
assert.throws(()=>nativeEqual("nom","LIKE"),TypeError);
console.log("Native comparisons preserve exact Unicode characters, NULL semantics and one bound parameter.");
