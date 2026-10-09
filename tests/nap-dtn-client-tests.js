"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function fixture() {
  const trace=[],status={dataset:{},textContent:""};let resolve;
  const service={httpsCallable:(name,options)=>data=>{trace.push({name,options,data});return name==="getDtnSeasonOverview"?new Promise(r=>{resolve=r;}):Promise.resolve({data:{}});}};
  const user={uid:"test"},global={LivePalmesEnvironment:{sportingDataSource:"nap",isTest:true},firebase:{auth:()=>({currentUser:user}),app:()=>({functions:()=>service})},LivePalmesAppConfig:{},confirm:()=>true};
  const source=fs.readFileSync("assets/livepalmes-dtn-seasons.js","utf8").replace("  global.LivePalmesDtnQualifications = { init };","  global.hooks={state,call,rebuild,sourceRowsForSelection,setup:()=>{el={status};}};");
  vm.runInNewContext(source,{window:global,document:{},status});global.hooks.setup();Object.assign(global.hooks.state,{id:"2025-2026",device:"settings",dirty:false});
  return {hooks:global.hooks,trace,status,finish:data=>resolve({data})};
}
(async()=>{
  const f=fixture(),pending=f.hooks.rebuild();assert.match(f.status.textContent,/Calcul en cours/);assert.equal(f.trace.length,1);assert.equal(f.trace[0].options.timeout,540000);assert.equal(f.trace[0].data.id,"2025-2026");
  await f.hooks.rebuild();assert.equal(f.trace.length,1,"No duplicate request during a native calculation");
  f.hooks.state.id="2026-2027";f.finish({source:"nap",hit:true,profiles:[],generatedAt:"2026-10-07T15:00:00.000Z"});await pending;
  assert.ok(f.hooks.state.views.has("2025-2026|france"));assert.ok(!f.hooks.state.views.has("2026-2027|france"));assert.equal(f.status.textContent,"Calcul terminé.");
  await f.hooks.call("getDtnSeasons");assert.equal(f.trace.at(-1).options,undefined,"Normal reads keep the normal timeout");
  const dirty=fixture();dirty.hooks.state.dirty=true;await assert.rejects(()=>dirty.hooks.rebuild(),/Enregistrez/);assert.equal(dirty.trace.length,0);
  const chosen=new Map([["old-import",{id:"old-import",name:"Chosen"}]]),native=[{id:"4980",name:"Native",aliases:["old-import"]},{id:"4981",name:"Other"}];
  const picker=f.hooks.sourceRowsForSelection(native,chosen);
  assert.equal(picker[0].id,"old-import");assert.equal(picker[1].id,"4981");assert.equal(native[0].id,"4980");assert.equal(chosen.get("old-import").name,"Chosen");
  assert.equal(f.hooks.sourceRowsForSelection(native,new Map())[0].id,"4980","An unselected old source does not replace the native calendar identifier");
  console.log("DTN client: explicit confirmation, long native calculation timeout only, duplicate guard, progress, correct season after navigation and unsaved configuration refusal verified.");
})().catch(e=>{console.error(e);process.exitCode=1;});
