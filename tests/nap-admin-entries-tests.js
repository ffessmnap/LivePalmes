"use strict";
const assert=require("node:assert/strict"),{readAdminEntries}=require("../functions/nap-admin-entries");
let queries,denied,orphan,overflow,missingClub;
const connection={execute:async(query,values)=>{
  const sql=query.sql;queries.push(sql);assert.match(sql,/^SELECT /);assert.match(sql,/LIMIT \d+/);assert.equal((sql.match(/\?/g)||[]).length,values.length);
  if(sql.startsWith("SELECT e.id AS")) return [overflow?Array(5001).fill({}):[{inscription_id:7,compet:5162,id:orphan?null:11,nom:"ÉTUDE",prenom:"Alice",date:"2000-01-01",sexe:"F",club:"106"}]];
  if(sql.startsWith("SELECT g.id")) return [[{id:9,engagement:7,course:"50SF",tps:"14200"}]];
  if(sql.startsWith("SELECT r.id")) return [[{id:8,compet:5162,categorie:3,club:"106",course:1,course_code:"4X50SF",tps:"031500",sexe:"F"}]];
  if(sql.startsWith("SELECT m.id")) return [[]];
  if(sql.startsWith("SELECT e.id,e.compet")) return [[]];
  if(sql.startsWith("SELECT id,compet")) return [[{id:10,compet:5162,nom:"Chef",prenom:"Alice",date:"1980-01-01",club:"106",pourclub:""}]];
  if(sql.startsWith("SELECT *")) return [[]];
  if(sql.startsWith("SELECT num_club")) return [missingClub?[]:[{num_club:106,abre_club:"CNHC",nom_club:"Club",federal_club:"031234",comite_club:3}]];
  if(sql.startsWith("SELECT id,abbr")) return [[{id:3,abbr:"FFF",sexe:"F"}]];
  throw Error("Unexpected query");
}};
const input={competitionId:5162,competition:{date:"2026-11-07",competitionType:"pool"}},services={category:()=>"S"},authorize=()=>{if(denied)throw new TypeError("Denied");};
function reset(){queries=[];denied=orphan=overflow=missingClub=false;}
(async()=>{
  reset();const result=await readAdminEntries(connection,input,authorize,services);
  assert.equal(queries.length,9);assert.equal(result.entries.length,1);const entry=result.entries[0];
  assert.equal(entry.swimmers[0].licenseNumber,"");assert.equal(entry.swimmers[0].lastName,"ÉTUDE");assert.equal(entry.swimmers[0].individualEntries[0].nativeTime,"14200");assert.equal(entry.relays[0].entryTime,"3:15.00");assert.equal(entry.relays[0].category,"S");assert.equal(entry.teamLeaderComplete,true);assert.equal(result.clubsById.get("106").federalNumber,"031234");assert.equal(result.sqlBudget.writesMax,0);
  reset();denied=true;await assert.rejects(readAdminEntries(connection,input,authorize,services),/Denied/);assert.equal(queries.length,0);
  reset();orphan=true;await assert.rejects(readAdminEntries(connection,input,authorize,services),/sans fiche/);assert.equal(queries.length,1);
  reset();overflow=true;await assert.rejects(readAdminEntries(connection,input,authorize,services),RangeError);
  reset();missingClub=true;await assert.rejects(readAdminEntries(connection,input,authorize,services),/incomplet/);
  console.log("Admin native entries: nine grouped bounded reads, authorization before identities, native times/licences, strict missing references verified.");
})().catch(error=>{console.error(error);process.exitCode=1;});
