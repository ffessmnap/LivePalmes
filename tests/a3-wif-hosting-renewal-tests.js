"use strict";
const assert=require("node:assert/strict");
const {qualify}=require("../tools/a3-wif-hosting-renewal");
async function exercise(bad) {
  let time=2_000_000_000_000, mono=0, reads=0, tokens=0, sleeps=0;
  const credential={getAccessToken:async()=>{tokens++;return {token:bad==='same-token'||tokens===1?'PUBLIC-FAKE-FIRST':'PUBLIC-FAKE-SECOND',res:{data:{expireTime:new Date(time+(bad==='duration'?3_600_000:600_000)).toISOString()}}};}};
  const report=await qualify({credential,wall:()=>time,monotonic:()=>mono,
    readSite:async()=>{reads++;if(reads===2){assert(time>=2_000_000_610_000);if(bad==='second-read')throw Error('Denied');}return {name:bad==='site'?'projects/foreign/sites/other':'projects/livepalmes/sites/livepalmes',defaultUrl:'https://livepalmes.web.app',extra:'NEVER-EXPORTED'};},
    sleep:async ms=>{assert(ms>0&&ms<=30000);sleeps++;time+=ms;mono+=bad==='clock'?0:ms;}});
  assert.equal(reads,2);assert.equal(tokens,2);assert.equal(sleeps,21);
  assert.equal(report.waitedAfterFirstCliMs,610000);
  assert.equal(report.initialCliTokenExpiryObserved,false);
  assert.equal(report.longSinglePublicationCommandQualified,false);
  assert.equal(report.configurationWrites,0);
  assert(!JSON.stringify(report).includes('PUBLIC-FAKE')&&!JSON.stringify(report).includes('NEVER-EXPORTED'));
}
(async()=>{await exercise();for(const bad of ['site','duration','same-token','clock','second-read'])await assert.rejects(exercise(bad));console.log('WIF CLI renewal preparation: same public CLI module/process, two bounded site reads, real-expiry wait model, token change and safe refusals; credentials and clocks fictitious.');})().catch(error=>{console.error(error);process.exitCode=1;});
