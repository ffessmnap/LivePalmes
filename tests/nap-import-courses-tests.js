"use strict";
const assert=require('node:assert/strict'),{catalog,waterFixture}=require('./fixtures/nap-import-courses-fixture'),{previewNativeImport}=require('../functions/nap-import-preview'),{importPreviewResponse}=require('../functions/nap-import-response');
const {prepareCourses}=require('../functions/nap-import-courses'),{reviewWinPalmeResults}=require('../functions/nap-winpalme-results');
(async()=>{
 let f=waterFixture(),pack=await previewNativeImport(f.pool,f.input),result=importPreviewResponse(pack);
 assert.equal(f.calls.filter(c=>c.sql.includes('FROM course_dispo')).length,1);assert.equal(f.calls.length,8);
 assert.equal(result.issues.filter(i=>i.code==='unmapped-course').length,1);assert.equal(result.courseReview.sources[0].count,2);
 assert.equal(result.courseReview.courses.filter(c=>c.code==='2000').length,1,'Male/female catalog rows form one selectable event');
 assert.ok(!result.courseReview.sources[0].candidateIds.includes('16'),'Relay cannot replace individual event');assert.ok(!result.courseReview.sources[0].candidateIds.includes('17'),'Female-only event cannot replace male source rows');
 const input={...f.input,courseBindings:[{sourceCode:'LD02KM',courseId:'10'}]};
 pack=await previewNativeImport(f.pool,input);result=importPreviewResponse(pack);
 assert.equal(result.issues.some(i=>['unmapped-course','unsupported-course'].includes(i.code)),false);
 const mapped=pack.incoming.filter(p=>p.origin==='individual'&&p.row.nageur===168);assert.equal(mapped.length,2);assert.ok(mapped.every(p=>p.row.course==='2000'));
 assert.equal(pack.incoming.some(p=>p.origin==='passage'&&p.row.nageur===168),false,'No pool passage inferred for LD');
 assert.ok(result.rows.filter(r=>r.lastName==='TEST').every(r=>r.sourceCourse==='LD02KM'&&r.course==='2000'));assert.equal(result.courseReview.sources[0].selectedId,'10');
 assert.ok(result.review.groups.find(g=>g.source.lastName==='TEST').performances.some(p=>p.sourceCourse==='LD02KM'));
 const completeInput={...input,swimmerBindings:result.rows.filter(r=>['DUP','UNKNOWN'].includes(r.lastName)).map(r=>({sourceLine:r.sourceLine,swimmerId:r.lastName==='DUP'?169:171})),clubAcknowledgements:pack.review.groups.find(g=>g.source.lastName==='TEST').clubAlerts.map(a=>a.key)};
 const complete=importPreviewResponse(await previewNativeImport(f.pool,completeInput));assert.equal(complete.canConfirm,true);assert.ok(complete.diff.additions.some(r=>r.course==='2000'),'A bare native water code reaches the complete replacement inventory once unrelated alerts are resolved');
 const other=await previewNativeImport(f.pool,{...input,courseBindings:[{sourceCode:'LD02KM',courseId:'12'}]});assert.notEqual(pack.previewFingerprint,other.previewFingerprint);
 const hours={...input,rawText:input.rawText.replace('2:15.00','1 03:20.00')};const timed=await previewNativeImport(f.pool,hours);assert.ok(timed.issues.some(i=>i.code==='native-duration-review-required'));assert.equal(timed.canConfirm,false);assert.equal(timed.statusRows.find(r=>r.rawFinalTime==='1 03:20.00').course,'2000');assert.equal(timed.statusRows.find(r=>r.rawFinalTime==='1 03:20.00').time,null);
 for(const bindings of [[{sourceCode:'ABSENT',courseId:'10'}],[{sourceCode:'LD02KM',courseId:'404'}],[{sourceCode:'LD02KM',courseId:'16'}],[{sourceCode:'LD02KM',courseId:'17'}],[{sourceCode:'LD02KM',courseId:'10'},{sourceCode:'LD02KM',courseId:'12'}]])await assert.rejects(previewNativeImport(f.pool,{...input,courseBindings:bindings}),TypeError);
 await assert.rejects(previewNativeImport(f.pool,{...input,sourceType:'winpalme'}),/reserve/);
 const longPool={execute:async()=>[Array.from({length:301},(_,i)=>({...catalog[0],id:i+1}))]};await assert.rejects(prepareCourses(longPool,reviewWinPalmeResults(input.rawText),input),/volumineux/);
 const incompatible=await prepareCourses({execute:async()=>[[...catalog,{...catalog[0],id:18,course:'100KMSUPPORT'}]]},reviewWinPalmeResults(input.rawText),input);assert.equal(incompatible.courses.some(c=>c.id==='18'),false,'Do not offer a catalog code that exceeds the existing native result-column limit');
 // Mapping A -> B must not apply B's choice twice when B is also a source code.
 const decoded=reviewWinPalmeResults(input.rawText);decoded.rows[1].course='2000';await prepareCourses({execute:async()=>[catalog]},decoded,{sourceType:'winpalme-zip-preview',courseBindings:[{sourceCode:'LD02KM',courseId:'10'},{sourceCode:'2000',courseId:'12'}]});assert.equal(decoded.rows[0].course,'2000');assert.equal(decoded.rows[1].course,'2000BI');
 console.log('ZIP course choice: one bounded catalog read, grouped source rows, native/sex/relay validation, no inferred equivalence or pool passages for LD, original times/codes retained, fingerprint and TXT isolation verified offline.');
})().catch(e=>{console.error(e);process.exitCode=1;});
