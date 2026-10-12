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
