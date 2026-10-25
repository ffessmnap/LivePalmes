"use strict";
const assert=require('node:assert/strict');
const acorn=require('./firestore-rules/node_modules/acorn');
const contract=require('../.github/releases/evidence/20261025-bcc-contract.json');
const {guardFixtures}=require('./release-home-retained-compatibility');
const clean=x=>JSON.parse(JSON.stringify(x));
const tree=x=>JSON.stringify(typeof x==='string'?acorn.parse(x,{ecmaVersion:'latest'}):x,(k,v)=>['start','end','raw'].includes(k)?undefined:v);
function documentTree(code,mutationModule=false){
 const ast=acorn.parse(code,{ecmaVersion:'latest'});
 ast.body=ast.body.filter(n=>!(n.type==='FunctionDeclaration'&&(mutationModule?n.id.name==='mutate':n.id.name==='decodeCompetitionDocumentDataUrl'))
  &&!(n.type==='VariableDeclaration'&&n.declarations.length===1&&n.declarations[0].id.name==='STANDARD_COMPETITION_DOCUMENT_BYTES'));
 for(const n of ast.body){const object=n.type==='ExpressionStatement'&&n.expression.type==='AssignmentExpression'&&n.expression.left.object?.name==='module'&&n.expression.right;
  if(object?.type==='ObjectExpression')object.properties=object.properties.filter(p=>p.key?.name!=='STANDARD_COMPETITION_DOCUMENT_BYTES');}
 return tree(ast);
}
async function prove({base,candidate,rows,source,definitions,loader,contract:review=contract}){
 assert.equal(base,review.productionCommit);assert.equal(candidate,review.candidate);
 const expected=review.retained.map(({name,commit})=>({name,commit}));
 assert.deepEqual(rows,expected,'Six retained services with exact actual provenance');
 const before=definitions(base),after=definitions(candidate);
 for(const row of rows){assert.ok(before.has(row.name)&&after.has(row.name));assert.equal(tree(before.get(row.name)),tree(after.get(row.name)),row.name);}
 for(const file of ['engagement-competition-documents.js','nap-competition-documents.js','nap-national-documents.js'])
  assert.equal(documentTree(source(base,'functions/'+file),file!=='engagement-competition-documents.js'),
   documentTree(source(candidate,'functions/'+file),file!=='engagement-competition-documents.js'),'Read/metadata contract changed '+file);
 for(const file of ['nap-swimmer-change-requests.js','nap-portal-swimmer-change.js','nap-club-access-request.js',
  'engagement-mail-control.js','nap-mysql.js','nap-portal-competitions.js'])
  assert.equal(source(base,'functions/'+file),source(candidate,'functions/'+file),'Retained dependency changed '+file);
 const old=loader(base),current=loader(candidate),oldDocs=old('functions/engagement-competition-documents.js'),newDocs=current('functions/engagement-competition-documents.js');
 // Existing files above2MiB remain visible and retain metadata. No decoding or
 // upload path is used by the retained public reader.
 for(const size of [1,2*1024*1024,6*1024*1024,10*1024*1024]){
  const row={id:'fixture',fileName:'notice.pdf',contentType:'application/pdf',size,title:'Fixture',downloadUrl:'https://example.invalid/notice.pdf'};
  assert.deepEqual(clean(newDocs.cleanCompetitionDocument(row)),clean(oldDocs.cleanCompetitionDocument(row)));
 }
 for(const [kind,name] of [['preferences','disableCompetitionEmailNotifications'],['access','submitEngagementAccessRequest'],['identity','resolveEngagementSwimmerChangeRequest']]){
  const origin=rows.find(r=>r.name===name).commit,results=[];
  for(const commit of [...new Set([base,candidate,origin])])results.push(await guardFixtures({commit,definitions,loader,source,kind}));
  for(const result of results)assert.deepEqual(result,results[0]);
 }
 return {suite:'retained-calendar-consumers-v1',productionCommit:base,candidate,result:'success',networkCalls:0,
  passedFunctions:rows.map(r=>r.name).sort(),checks:['pinned-pair-and-six-origins','unchanged-retained-handlers',
   'unchanged-read-and-metadata-paths','historical-large-documents','preferences-authority-and-replay-fixtures']};
}
module.exports={prove};
