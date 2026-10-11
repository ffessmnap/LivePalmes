"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../performances/public/tops.js'),'utf8');
const timers=new Map(),calls=[];let tick=0,scheduled=[];
const ctx={URL,AbortSignal,napLimit:25,birthYearFilterOpen:false,napLoads:new Map(),napRenderTimer:null,
 global:{LivePalmesEnvironment:{napReaderUrl:'https://example.test/nap'},setTimeout(fn,ms){assert.equal(ms,100);timers.set(++tick,fn);return tick;},clearTimeout(id){timers.delete(id);}},
 renderNap:filters=>scheduled.push(filters),fetch:(url,options)=>new Promise((resolve,reject)=>calls.push({url:String(url),options,resolve,reject}))};
vm.createContext(ctx);
for(const [start,end] of [['  function scheduleNapRender(', '  async function readNap('],['  async function readNap(', '  async function renderNap(']])vm.runInContext(source.slice(source.indexOf(start),source.indexOf(end)),ctx);
(async()=>{
 ctx.scheduleNapRender({course:'100SF'});ctx.scheduleNapRender({course:'200SF'});ctx.scheduleNapRender({course:'400SF'});
 assert.equal(timers.size,1);[...timers.values()][0]();assert.equal(scheduled.length,1);assert.equal(scheduled[0].course,'400SF');
 const f={course:'100SF',sex:'M'},a=ctx.readNap('top',f),b=ctx.readNap('top',f);
 assert.equal(calls.length,1,'Concurrent identical TOP needs one network request');
 assert.equal(calls[0].options.cache,'no-store');calls[0].resolve({ok:true,json:async()=>({source:'nap',rows:[{id:1}]})});
 assert.deepEqual(await a,await b);assert.equal(ctx.napLoads.size,0);
 const c=ctx.readNap('top',f);assert.equal(calls.length,2,'Settled response must never be reused');calls[1].reject(new Error('offline'));await assert.rejects(c,/offline/);assert.equal(ctx.napLoads.size,0);
 const d=ctx.readNap('top',f);ctx.napLimit=50;const e=ctx.readNap('top',f);ctx.birthYearFilterOpen=true;const g=ctx.readNap('top',f);
 assert.equal(calls.length,5,'Limit and facet must distinguish in-flight requests');
 for(const call of calls.slice(2))call.resolve({ok:true,json:async()=>({source:'nap',rows:[]})});await Promise.all([d,e,g]);assert.equal(ctx.napLoads.size,0);
 const h=ctx.readNap('top',f);calls.at(-1).resolve({ok:true,json:async()=>({source:'other'})});await assert.rejects(h,/invalide/);assert.equal(ctx.napLoads.size,0);
 assert.match(source,/if \(request !== napRequest\) return;/,'Old responses remain excluded');
 assert.match(source,/\+\+napRequest;\s*global.clearTimeout\(napRenderTimer\)/,'Invalid filters invalidate old response and queued request');
 console.log('NAP TOP requests: burst coalescing 3->1, in-flight sharing 2->1, fresh reread, retry, limit/facet isolation and stale-response protection passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
