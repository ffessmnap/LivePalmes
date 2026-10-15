"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const {createPerformanceAdministration}=require("../functions/nap-performance-administration");
const native={id:973,nageur:912,compet:2426,course:"100SF",cat:"HSE",tps:"14200",points:"0",newpoints:"0",passage:0,club:"2426",relais:0,pid:null,classement:1};
(async()=>{
 const queries=[];
 const metadata=[{course:"100SF",competitionId:2426,competition:"Meeting",date:"2026-01-01",location:"Paris"},{course:"50SF",competitionId:1,competition:"Meeting",date:"2010-01-01",location:"Lyon"}];
 const read=createPerformanceAdministration({authorize:async()=>({national:true}),getPool:()=>({execute:async(query,values)=>{
   queries.push({query,values});
   if(query.sql.startsWith("SELECT COUNT"))return [[{count:151}]];
   if(query.sql.includes("AS competitionId"))return [metadata];
   return [[{...native,nom:"FAUVEAU",prenom:"Antoine",date:"2026-01-01",libelle:"Meeting",lieu:"Paris",abre_club:null,nom_club:null}]];
 }})});
 const initial=await read({data:{action:"list",swimmerId:912,includeFilters:true}});
 assert.equal(queries.length,2);assert.equal(initial.filterOptions.length,2);assert.equal(initial.filterOptions[1].year,"2010");
 assert.match(initial.rows[0].club,/Club non résolu/);assert.equal(initial.rows[0].native.club,"2426");assert.equal(initial.rows[0].clubId,"2426");
 assert.deepEqual(initial.cursor,{date:"2026-01-01",id:973});
 await read({data:{action:"list",swimmerId:912,filters:{course:"100SF",year:"2010",competitionId:"2426"},cursor:initial.cursor}});
 const filtered=queries.at(-1);assert.match(filtered.query.sql,/p.course=\?.*c.date>=\?.*p.compet=\?.*c.date<\?/);
 assert.match(filtered.query.sql,/ORDER BY c.date DESC,p.id DESC LIMIT 101$/);
 assert.deepEqual(filtered.values,[912,"100SF","2010-01-01","2011-01-01",2426,"2026-01-01","2026-01-01",973]);
 for(const filters of [{course:"100SF' OR 1=1"},{year:"2010 OR 1=1"},{competitionId:-1},{unknown:"x"}])await assert.rejects(()=>read({data:{action:"list",swimmerId:912,filters}}),TypeError);
 const source=fs.readFileSync("performances/public/swimmer.js","utf8");let requested;
 const context={URL,AbortSignal,napReaderUrl:"https://example.test/",fetch:async url=>{requested=new URL(url);return {ok:true,json:async()=>({source:"nap"})};}};
 vm.runInNewContext(source.slice(source.indexOf("  async function readNap("),source.indexOf("  const usesLegacyPublicData")),context);
 await context.readNap({id:912});assert.equal(requested.searchParams.get("action"),"swimmer");
 await context.readNap({action:"search",q:"Antoine"});assert.equal(requested.searchParams.get("action"),"search");
 const client=fs.readFileSync("performances/public/import-competitions.js","utf8"),pending=[];
 const listContext={nativeCorrectionRequestId:0,correctionSelectedSwimmer:{id:"912"},nativeCorrectionCursor:0,nativeCorrectionMore:false,correctionRows:[],
   elements:{correctionCourse:{value:"100SF"},correctionYear:{value:""},correctionCompetition:{value:""},correctionResults:{}},document:{querySelector:()=>({})},
   callFunction:async(name,input)=>{assert.equal(name,"getNapPerformanceAdministration");return new Promise(resolve=>pending.push({input,resolve}));},renderCorrectionRows(){},setMessage(){}};
 vm.createContext(listContext);vm.runInContext(client.slice(client.indexOf("  function nativeCorrectionFilters"),client.indexOf("  let correctionPublicationMonitorToken")),listContext);
 const old=listContext.reloadNativeCorrectionRows();listContext.elements.correctionYear.value="2010";
 const recent=listContext.reloadNativeCorrectionRows();assert.equal(pending[1].input.filters.year,"2010");
 pending[1].resolve({rows:[{id:"new"}],cursor:{date:"2010-01-01",id:5},hasMore:true});await recent;
 pending[0].resolve({rows:[{id:"stale"}],cursor:0,hasMore:false});await old;assert.equal(listContext.correctionRows[0].id,"new");
 const next=listContext.reloadNativeCorrectionRows({append:true});assert.equal(pending[2].input.cursor.id,5);assert.equal(pending[2].input.filters.course,"100SF");
 pending[2].resolve({rows:[{id:"next"}],cursor:0,hasMore:false});await next;assert.equal(listContext.correctionRows.length,2);
 const diagnosticQueries=[];
 const proof=await require("../functions/nap-consultation-diagnostic").inspect({execute:async(query,values)=>{
   diagnosticQueries.push({query,values});assert.match(query.sql,/^(SELECT|EXPLAIN SELECT) /);
   if(query.sql.includes("information_schema.TABLES"))return [[{TABLE_NAME:"perfs"}]];
   if(query.sql.includes("VERSION()"))return [[{version:"8.0"}]];
   if(query.sql.includes("information_schema.COLUMNS"))return [[...['id','compet','club'].map(name=>({TABLE_NAME:'txt_clubs',COLUMN_NAME:name,COLUMN_KEY:name==='id'?'PRI':''})),...['clubID','clubAbr','clubNum','EnapId'].map(name=>({TABLE_NAME:'old_club',COLUMN_NAME:name,COLUMN_KEY:name==='clubID'?'PRI':''}))]];
   if(query.sql.includes("FROM txt_clubs"))return [[{id:598,compet:251,club:"106",abre_club:"CNHC"}]];
   if(query.sql.includes("FROM old_club"))return [[{clubID:598,clubAbr:"HISTORICAL",clubNum:"ABC",EnapId:106,num_club:106,abre_club:"CNHC"}]];
   if(query.sql.startsWith("EXPLAIN"))return [[{key:"perf",rows:10}]];
   if(query.sql.includes("WHERE p.compet=?")){assert.deepEqual(values,[275]);return [[{id:63719,nageur:680,club:"659",currentClub:"106",performanceClubLabel:"NDCAS",currentClubLabel:"CNHC"}]];}
   assert.deepEqual(values,[912]);assert.match(query.sql,/LIMIT 5001$/);
   return [[{id:1,course:"100SF",club:"598",compet:251,abre_club:"ROC",currentClub:"106"},{id:2,course:"100SF",club:"2426",compet:3000,abre_club:null,currentClub:"106"}]];
 }});
 assert.equal(diagnosticQueries.length,11);assert.equal(proof.competitionComparison.example.id,63719);assert.equal(proof.competitionComparison.groups[0].currentClubLabel,"CNHC");assert.equal(proof.writesExecuted,0);assert.deepEqual(proof.rowProvenance.screenshotRows,[]);assert.equal(proof.complete,true);assert.equal(proof.groups[1].label,null);assert.equal(proof.groups[0].rawClub,"598");assert.equal(proof.importClubMappings[0].matchingPerformances,1);assert.equal(proof.importClubMappings[0].label,"CNHC");assert.equal(proof.historicalClubReferences[0].nativeRows,1);assert.equal(proof.historicalClubReferences[0].resolvedLabel,"CNHC");
 const top=fs.readFileSync("performances/public/tops.js","utf8");
 const rendered=[];const topContext={napRequest:0,napLimit:25,napFiltersKey:"",elements:{status:{},loadMore:{},loadMoreButton:{}},readNap:async()=>({rows:Array.from({length:40},(_,id)=>({id})),total:40,hasMore:false}),renderRows:rows=>rendered.push(rows),birthYearFilterOpen:false};
 vm.runInNewContext(top.slice(top.indexOf("  async function renderNap("),top.indexOf("  const usesLegacyPublicData")),topContext);
 await topContext.renderNap({course:"100SF",sex:"M"});assert.equal(topContext.napLimit,5000);assert.equal(rendered.at(-1).length,40);assert.match(topContext.elements.status.textContent,/Tous les temps/);assert.equal(topContext.elements.loadMore.hidden,true);
 console.log("Consultation: full-history facets, parameterized server filters, dated keyset page, raw club preservation, explicit swimmer JSON action and complete TOP rendering verified offline.");
})().catch(error=>{console.error(error);process.exitCode=1;});
