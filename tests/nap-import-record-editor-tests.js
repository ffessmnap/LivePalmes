"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('performances/public/admin-records.js','utf8'),start=source.indexOf('function removeDraft('),end=source.indexOf('function draftHasChange(',start);
function fixture(rows){
 const state={selectedId:'a',drafts:new Map(rows.map(row=>[row.id,row]))},cleared=[];
 const context={state,clearQueuedRecordAlertDrafts:keys=>cleared.push(...keys),renderTable:()=>{}};
 vm.runInNewContext(source.slice(start,end)+'\nthis.remove=removeDraft;',context);return {state,cleared,remove:context.remove};
}
let f=fixture([{id:'a',status:'Brouillon'},{id:'b',status:'Brouillon'},{id:'c',status:'Brouillon'}]);f.remove('a');assert.deepEqual([...f.state.drafts.keys()],['b','c'],'Removing one manual draft preserves all unrelated manual drafts');assert.equal(f.state.selectedId,'');
f=fixture([{id:'a',recordAlertSourceKey:'candidate',status:'Brouillon'},{id:'peer',importReplacementFor:'candidate',status:'Supprimé'},{id:'b',status:'Brouillon'},{id:'other',importReplacementFor:'other-candidate',status:'Supprimé'}]);f.remove('a');assert.deepEqual([...f.state.drafts.keys()],['b','other'],'Cancelling an imported improvement restores only its own former tied holders');assert.deepEqual(f.cleared,['candidate']);
f=fixture([{id:'b',status:'Brouillon'}]);f.remove('missing');assert.equal(f.state.drafts.size,1,'A stale remove action cannot discard other work');
console.log('Actual Records editor: removing manual/imported/missing drafts preserves unrelated drafts and restores only linked tie removals.');
