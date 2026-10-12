"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync("performances/public/reference.js","utf8"),context);
const reference=context.window.LivePalmesPerformanceReference;
assert.deepEqual(Object.keys(reference).sort(),["categories","courses"]);
assert.deepEqual(Array.from(reference.courses,c=>c.code),["50SF","100SF","200SF","400SF","800SF","1500SF","50AP","100IS","200IS","400IS","50BI","100BI","200BI","400BI"]);
assert.equal(reference.courses[0].label,"50 m Surface");assert.equal(reference.courses[6].shortLabel,"50 AP");
assert.equal(reference.categories.length,24);
for(const name of ["tops","nageur"]){const html=fs.readFileSync(`performances/${name}.html`,"utf8");assert.ok(html.includes("public/reference.js"));assert.equal(html.includes("intranap-summary.js"),false);assert.equal(html.includes("performance-public/version.js"),false);}
console.log("Public reference: course labels/order retained without historical performance snapshot.");

const {spawnSync}=require("node:child_process");
for(const name of ["upload-public-performance-files-to-storage","publish-consolidated-performance-data","build-public-performance-files-from-firestore"]){
 const result=spawnSync(process.execPath,[`tools/${name}.js`,"--write"],{encoding:"utf8",env:{...process.env,GOOGLE_APPLICATION_CREDENTIALS:"unavailable"}});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Circuit sportif statique archive/);
}
for(const name of ["livepalmes-test-publish-performance-public","livepalmes-production-rebuild-tops"]){assert.match(fs.readFileSync(`.github/workflows/${name}.yml`,"utf8"),/if: \$\{\{ false \}\}/);}

for(const name of ["build-public-performance-files","build-intranap-public-data"]){const env={...process.env};delete env.LIVEPALMES_NAP_OUT_DIR;const result=spawnSync(process.execPath,[`tools/${name}.js`],{encoding:"utf8",env});assert.notEqual(result.status,0);assert.match(result.stderr,/Generation statique archivee/);}

const topSource=fs.readFileSync("performances/public/tops.js","utf8");
const seasonContext={};vm.createContext(seasonContext);
vm.runInContext(topSource.slice(topSource.indexOf("  function seasonOptions("),topSource.indexOf("  function applyPublicManifest(")),seasonContext);
assert.deepEqual(Array.from(seasonContext.seasonOptions([207,2027,"2026",2027,"2025x",null,"0000","9999",2003])),["9999","2027","2026","2003"]);
assert.ok(topSource.includes("seasons: seasonOptions("));
assert.match(fs.readFileSync("performances/tops.html","utf8"),/id="topStatus" role="status"/);
