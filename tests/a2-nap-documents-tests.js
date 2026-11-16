"use strict";
const assert=require("node:assert/strict"),check=require("../tools/a2-nap-documents");
(async()=>{
 const x=check.inventory([{id:1,location:"/documents/a.pdf"},{id:2,location:"https://nap.ffessm.fr/documents/a.pdf"},{id:3,location:""},{id:4,location:"https://firebasestorage.googleapis.com/v0/b/fixture/o/a"},{id:5,location:"https://other.invalid/a"}]);
 assert.equal(x.files.length,1);assert.equal(x.files[0].references.length,2);assert.equal(x.empty,1);assert.equal(x.firebase,1);assert.equal(x.other,1);assert.throws(()=>check.inventory(Array(4001).fill({})),/BUDGET_EXCEEDED/);
 const headers=values=>({get:key=>values[key]??null});let calls=0;
 const value=await check.header(x.files[0].url,async(url,options)=>{calls++;assert(url.startsWith("https://nap.ffessm.fr/"));assert.equal(options.method,"HEAD");assert.equal(options.redirect,"manual");assert.equal(options.body,undefined);return {status:200,headers:headers({"content-type":"application/pdf","content-length":"123"})};});assert.equal(calls,1);assert.equal(value.bytes,123);
 await assert.rejects(check.header("https://other.invalid/a",()=>assert.fail("outside target")),/URL_REFUSED/);
 let redirects=0;await assert.rejects(check.header(x.files[0].url,async()=>{redirects++;return {status:302,headers:headers({location:"https://other.invalid/a"})};}),/URL_REFUSED/);assert.equal(redirects,1);
 await assert.rejects(check.main({GITHUB_REF:"refs/heads/other"}),/MAIN_MANUAL_REQUIRED/);
 console.log("NAP documents: bounded deduplicated inventory, metadata-only HEAD and strict redirect scope verified offline.");
})().catch(e=>{console.error(e);process.exitCode=1;});