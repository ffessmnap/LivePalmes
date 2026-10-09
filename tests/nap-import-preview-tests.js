"use strict";
const assert=require("node:assert/strict"),{previewNativeImport}=require("../functions/nap-import-preview");
const {importPreviewResponse}=require("../functions/nap-import-response");
const head="REN;05/06/2026;Competition;Ville\nBAS;50;E\nCLU;PAN;Club\n";
const individual=["NAG","TEST","PERSON","01/02/2000","M","PAN","","200SF","1:30.00","HSE","NAG","42.00","00.00","00.00","00.00","1:42.00","","123","1","1","HSE","","912"].join(";");
function fixture({date="2026-06-05",duplicate=false}={}){const calls=[];return{calls,pool:{execute:async({sql},values=[])=>{calls.push({sql,values});assert.match(sql,/^SELECT /);if(sql.includes("FROM competitions"))return [[{id:5162,libelle:"Competition",date,lieu:"Ville",bassin:50,chrono:"E"}]];
 if(sql.includes("FROM nageurs"))return [[{id:168,nom:"TEST",prenom:"PERSON",date:"2000-02-01",sexe:"M",club:"106"},...(duplicate?[{id:169,nom:"TEST",prenom:"PERSON",date:"2000-02-01",sexe:"M",club:"106"}]:[])]];
 if(sql.includes("FROM clubs"))return [[{num_club:106,abre_club:"PAN",nom_club:"Club"}]];
 if(sql.includes("FROM perfs"))return [[]];throw Error("Unexpected query");}}};}
(async()=>{
 let f=fixture(),result=await previewNativeImport(f.pool,{rawText:head+individual});assert.equal(result.requiresCompetitionChoice,true);assert.equal(importPreviewResponse(result).requiresCompetitionChoice,true);assert.equal(f.calls.length,1);
 f=fixture();result=await previewNativeImport(f.pool,{rawText:head+individual,competitionId:5162});assert.equal(result.canConfirm,true);assert.equal(f.calls.length,5);assert.equal(result.incoming.length,2);const response=importPreviewResponse(result);assert.equal(response.canConfirm,true);assert.equal(response.source,"nap");assert.equal(response.rows[0].sourceLine,4);assert.equal(response.resolved[0].sourceLine,4);assert.equal(JSON.stringify(response).includes("existingRelays"),false);assert.ok(response.diff.summary);assert.equal(result.incoming[0].row.nageur,168,"file hint 912 never overrides exact identity");assert.equal(result.incoming[0].row.tps,"014200");assert.equal(result.incoming[1].row.course,"100SF");assert.equal(result.incoming[1].row.passage,1);assert.match(result.previewFingerprint,/^[a-f0-9]{64}$/);
 f=fixture({duplicate:true});result=await previewNativeImport(f.pool,{rawText:head+individual,competitionId:5162});assert.equal(result.canConfirm,false);assert.equal(result.resolution.unresolved[0].reason,"ambiguous-identity");assert.equal(importPreviewResponse(result).unresolved[0].sourceLine,4);
 f=fixture({date:"2026-06-06"});result=await previewNativeImport(f.pool,{rawText:head+individual,competitionId:5162});assert.equal(result.canConfirm,false);assert.ok(result.issues.some(i=>i.code==="competition-date-mismatch"));
 const blank=individual.split(";");blank[10]="";blank[15]="";
 f=fixture();result=await previewNativeImport(f.pool,{rawText:head+individual+"\n"+blank.join(";"),competitionId:5162,excludedSourceLines:[5]});assert.equal(result.canConfirm,true);assert.equal(result.decoded.excluded.length,1);
 const dq=individual.split(";");dq[10]="DSQ";
 f=fixture();result=await previewNativeImport(f.pool,{rawText:head+dq.join(";"),competitionId:5162});assert.equal(result.canConfirm,true);assert.equal(result.incoming.length,0);assert.equal(result.statusRows.length,1);assert.equal(result.statusRows[0].eligible,false);
 console.log("NAP import preview: bounded grouped reads, explicit competition, exact identities, ambiguity refusal, source status retention and explicit exclusions verified without writes.");
})().catch(e=>{console.error(e);process.exitCode=1;});
