"use strict";
const assert=require('node:assert/strict'),{createClubMatcher}=require('../functions/nap-import-clubs');
const {previewNativeImport}=require('../functions/nap-import-preview'),{importPreviewResponse}=require('../functions/nap-import-response');
const {clubs,header,clubFixture}=require('./fixtures/nap-import-clubs-fixture');
(async()=>{
 let match=createClubMatcher(clubs,[header()])('CSL');assert.equal(match.id,'110');assert.equal(match.method,'federal-number');assert.equal(match.candidateIds[0],'110');
 assert.equal(createClubMatcher(clubs.map(c=>c.num_club===110?{...c,abre_club:'CSLO'}:c),[header()])('CSL').id,'110','Federal number wins even when the abbreviation differs');
 assert.equal(createClubMatcher(clubs,[header('CLUB SUBAQUATIQUE LORIENTAIS!')])('CSL').id,'110');
 for(const [declarations,reference,reason] of [
  [[header('Club Subaquatique du Léman')],clubs,'federal-name-conflict'],
  [[header('Club Subaquatique Lorientais','03560009')],clubs,'unknown-federal-number'],
  [[header('Club Subaquatique Lorientais','3560008')],clubs,'invalid-federal-number'],
  [[header('Club Subaquatique Lorientais','')],clubs,'missing-federal-number'],
  [[header(),header()],clubs,'multiple-declarations'],
  [[],clubs,'missing-declaration'],
  [[header()],[...clubs,{...clubs[0],num_club:999,abre_club:'AUTRE'}],'duplicate-federal-number']
 ]){match=createClubMatcher(reference,declarations)('CSL');assert.equal(match.id,undefined);assert.equal(match.reason,reason);assert.ok(match.candidateIds.includes('110'),'Name/abbreviation remain suggestions, never override an inconsistent number');}
 const many=[...clubs,...Array.from({length:40},(_,i)=>({...clubs[1],num_club:1000+i}))];match=createClubMatcher(many,[header('', '03560009')])('CSL');assert.equal(match.candidateIds.length,20);assert.equal(match.moreCandidates,true);
 const f=clubFixture(),pack=await previewNativeImport(f.pool,f.input),result=importPreviewResponse(pack);assert.equal(pack.clubByCode.get('CSL'),'110');assert.equal(result.unresolvedClubs.length,0);assert.equal(result.clubMatches.find(c=>c.code==='CSL').method,'federal-number');assert.equal(f.calls.length,7,'Same bounded grouped reads as before');assert.ok(pack.incoming.every(p=>p.row.club==='110'));assert.ok(pack.incomingRelays.every(p=>p.row.club==='110'));assert.equal(pack.issues.some(i=>i.code==='source-club-unresolved'),false);assert.ok(pack.issues.some(i=>i.code==='club-difference-unconfirmed'),'Real differences from swimmer current club still need confirmation');
 const conflict={...f.input,rawText:f.input.rawText.replace('Club Subaquatique Lorientais;03560008','Club Subaquatique du Léman;03560008')};const pending=await previewNativeImport(f.pool,conflict);assert.equal(pending.unresolvedClubs[0].reason,'federal-name-conflict');assert.equal(pending.canConfirm,false);
 const manual=await previewNativeImport(f.pool,{...conflict,clubBindings:[{code:'CSL',clubId:'110'}]});assert.equal(manual.unresolvedClubs.length,0);assert.equal(manual.clubMatches[0].method,'national-choice');
 const legacy=await previewNativeImport(f.pool,{...f.input,sourceType:'winpalme'});assert.equal(legacy.unresolvedClubs.length,1,'Ordinary TXT write-path matching is unchanged');
 console.log('ZIP club matching: three CSL resolved by federal number/name, abbreviation independent, conflicts/duplicates/missing or malformed declarations retained, bounded suggestions, manual choice, same seven SELECTs and TXT isolation; no writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});

