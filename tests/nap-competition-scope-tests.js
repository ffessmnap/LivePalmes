"use strict";
const assert=require("node:assert/strict");
const native=require("../functions/nap-portal-competitions");
const change=require("../functions/nap-portal-competition-change");
const schema=require("../functions/nap-approved-portal-schema");
const view=require("../functions/nap-portal-workspaces");
function fixture(fail=false,race=false,open=false) {
 const competition={id:5220,libelle:"Test",lieu:"Paris",date:"2026-11-07",enddate:"2026-11-07",comite:3,description:"",bassin:null,chrono:null,ld:0};
 const parameters={id:4547,compet:5220,actif:0,dateactif:null,date_limit:null,officiel:0,nb_lignes:0,mailtxt:"",mailjuges:"",tps_d:null,tps_f:null,niveau:1,saisie:1,relais:0};
 const options=Object.fromEntries(schema.tables[0].columns.map(c=>[c.name,c.name==="competition_id"?5220:c.name==="version"?"1":c.name.endsWith("_at")?"2026-10-08 12:00:00.000000":c.name.endsWith("_by")?"admin":null]));options.entry_closed=null;
 const pack={event:{id:"legacy-nap-5220",date:"2026-11-07",level:"regional",competitionType:"pool"},nativeSnapshot:{competition,parameters},nativeParameters:{parameter_id:4547,...parameters},committees:[{id:11,comite:1},{id:12,comite:2}],options};
 if(open) pack.committees.push({id:19,comite:19});
 const input={competitionId:"legacy-nap-5220",actorUid:"admin",national:false,expectedFingerprint:view.fingerprint(pack),patch:{invitedRegionIds:["Nouvelle Aquitaine","Sud"]}};
 const state={rows:structuredClone(pack.committees),saved:null,calls:[],writes:0,completed:0,released:false,fail};
 const tables={competitions:structuredClone(competition),compet_parametres:structuredClone(parameters),livepalmes_competition_options:structuredClone(options)};
 state.pool={getConnection:async()=>({release:()=>state.released=true,query:async({sql})=>{state.calls.push(sql);if(sql.startsWith("LOCK TABLES")&&race)state.rows.push({id:13,comite:8});return [{}];},execute:async({sql},values=[])=>{
   state.calls.push(sql);
   if(sql.startsWith("LOCK TABLES")){if(race)state.rows.push({id:13,comite:8});return [{}];}
   if(sql==="UNLOCK TABLES")return [{}];
   if(sql.includes("information_schema.TRIGGERS"))return [[]];
   if(sql.startsWith("SELECT id,comite"))return [structuredClone(state.rows)];
   if(sql.startsWith("SELECT")){const table=sql.match(/FROM `([^`]+)`/)[1];return [[structuredClone(tables[table])]];}
   if(sql.startsWith("UPDATE")){const table=sql.match(/UPDATE `([^`]+)`/)[1];const columns=[...sql.split(" WHERE ")[0].matchAll(/`([^`]+)`=\?/g)].map(m=>m[1]);columns.forEach((k,i)=>tables[table][k]=values[i]);state.writes++;return [{affectedRows:1}];}
   if(sql.startsWith("DELETE")){assert.equal(values[0],5220);const ids=values.slice(1);state.rows=state.rows.filter(r=>!ids.includes(r.id));state.writes++;return [{affectedRows:ids.length}];}
   if(sql.startsWith("INSERT INTO compet_comites")){if(state.fail)throw new Error("Interrupted list insert");for(let i=0;i<values.length;i+=2){assert.equal(values[i],5220);state.rows.push({id:100+i,comite:values[i+1]});}state.rows.sort((a,b)=>a.comite-b.comite);state.writes++;return [{affectedRows:values.length/2}];}
   throw Error(sql);
 }})};
 state.audit={read:async()=>state.saved,prepare:async(_,saved)=>{state.saved=JSON.parse(JSON.stringify(saved));},complete:async()=>state.completed++};
 state.reader=async(_,id,authorize)=>{await authorize(pack.event);return {...pack,nativeSnapshot:structuredClone({competition:tables.competitions,parameters:tables.compet_parametres}),options:structuredClone(tables.livepalmes_competition_options),committees:structuredClone(state.rows)};};
 return {state,input};
}
(async()=>{const original=native.readNativeCompetition;try{
 let {state,input}=fixture();native.readNativeCompetition=state.reader;
 await change.applyCompetitionChange(state.pool,input,state.audit,()=>{});
 assert.deepEqual(state.rows,[{id:12,comite:2},{id:100,comite:16}],"Keep the id of an unchanged region");assert.equal(state.completed,1);assert.equal(state.calls.at(-1),"UNLOCK TABLES");assert.equal(state.released,true);
 const writes=state.writes;await change.applyCompetitionChange(state.pool,input,state.audit,()=>{});assert.equal(state.writes,writes,"Retry must not duplicate native rows");
 ({state,input}=fixture(false,false,true));native.readNativeCompetition=state.reader;
 await change.applyCompetitionChange(state.pool,input,state.audit,()=>{});
 assert.deepEqual(state.rows,[{id:12,comite:2},{id:100,comite:16},{id:19,comite:19}],"Preserve unused Open row and its id through real statement execution");
 const openWrites=state.writes;await change.applyCompetitionChange(state.pool,input,state.audit,()=>{});assert.equal(state.writes,openWrites);
 ({state,input}=fixture(true));native.readNativeCompetition=state.reader;
 await assert.rejects(change.applyCompetitionChange(state.pool,input,state.audit,()=>{}),/Interrupted/);assert.equal(state.completed,0);assert.deepEqual(state.saved.operations.at(-1).before,[{id:11,comite:1},{id:12,comite:2}]);assert.equal(state.calls.at(-1),"UNLOCK TABLES");
 state.fail=false;await assert.rejects(change.applyCompetitionChange(state.pool,input,state.audit,()=>{}),/liste des regions a change/);assert.equal(state.completed,0,"A partial MyISAM change requires verification, not a blind retry");
 ({state,input}=fixture(false,true));native.readNativeCompetition=state.reader;
 await assert.rejects(change.applyCompetitionChange(state.pool,input,state.audit,()=>{}),/liste des regions a change/);assert.ok(!state.calls.some(sql=>sql.startsWith("DELETE")),"A concurrent IntraNAP invitation is retained");assert.equal(state.calls.at(-1),"UNLOCK TABLES");
 console.log("NAP scopes: shared native invitations, backups, table locks, preserved ids, race and partial-failure refusal verified offline.");
}finally{native.readNativeCompetition=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
