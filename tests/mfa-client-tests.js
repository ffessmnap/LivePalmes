'use strict';
require('./helpers/offline-network');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),acorn=require('./firestore-rules/node_modules/acorn');
const {createMfaAuth,detectSdkVersion}=require('../assets/livepalmes-mfa-auth');
const documentFor=urls=>({baseURI:'https://livepalmes.web.app/portail.html',querySelectorAll:()=>urls.map(src=>({src}))});
for(const version of ['10.12.2','10.12.5'])assert.equal(detectSdkVersion(documentFor(['https://www.gstatic.com/firebasejs/'+version+'/firebase-auth-compat.js'])),version);
for(const urls of [[],['https://untrusted.invalid/firebasejs/10.12.5/firebase-auth-compat.js'],['https://www.gstatic.com/firebasejs/11.0.0/firebase-auth-compat.js'],['https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js','https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js']])assert.throws(()=>detectSdkVersion(documentFor(urls)));
const expected=new Map([
 ['assets/livepalmes-admin-auth.js','service'],['assets/livepalmes-portal-session.js','global.firebase.auth()'],
 ['assets/livepalmes-console-page-gate.js','auth'],['assets/portal/navigation.js','firebase.auth()'],
 ['assets/direct/admin.js','auth'],['assets/direct/console.js','auth']]);
const found=[];
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.name==='vendor'?[]:entry.isDirectory()?files(path.join(directory,entry.name)):entry.name.endsWith('.js')?[path.join(directory,entry.name)]:[]);}
for(const file of files('assets')){
 const source=fs.readFileSync(file,'utf8');if(!/signInWithEmailAndPassword|reauthenticateWithCredential/.test(source))continue;
 const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});
 function walk(node,ancestors=[]){
  if(!node||typeof node!=='object')return;
  if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'&&['signInWithEmailAndPassword','reauthenticateWithCredential'].includes(node.callee.property.name)){
   const relative=file.split(path.sep).join('/');assert(expected.has(relative),'Nouveau point de connexion a qualifier : '+relative);found.push(relative);
   const member=ancestors.at(-1),caught=ancestors.at(-2);assert.equal(member.type,'MemberExpression');assert.equal(member.property.name,'catch');assert.equal(caught.type,'CallExpression');
   const callback=caught.arguments[0];assert.equal(callback.type,'ArrowFunctionExpression');assert(callback.async);assert.equal(callback.body.body.length,3,'Aucun rejeu ou effet metier dans la reprise MFA');
   const [guard,load,returned]=callback.body.body;assert.equal(guard.type,'IfStatement');assert.equal(guard.test.operator,'!==');assert.equal(guard.test.right.value,'auth/multi-factor-auth-required');assert.equal(guard.consequent.type,'ThrowStatement');assert.equal(source.slice(guard.test.left.start,guard.test.left.end),'failure?.code');
   assert.equal(load.expression.type,'AwaitExpression');const loading=load.expression.argument;
   assert.equal(loading.type,'CallExpression');assert.equal(loading.callee.property.name,'catch');assert.equal(loading.callee.object.type,'ImportExpression');
   assert.equal(loading.arguments[0].body.body[0].type,'ThrowStatement');
   const imported=loading.callee.object.source.value;
   const url=new URL(imported,'https://livepalmes.web.app/'+relative);assert.equal(url.pathname,'/assets/livepalmes-mfa-auth.js');assert(/^\?v=[a-z0-9-]+$/.test(url.search));
   assert.equal(returned.type,'ReturnStatement');assert.equal(source.slice(returned.argument.callee.start,returned.argument.callee.end),'global.LivePalmesMfaAuth.resolve');assert.equal(source.slice(returned.argument.arguments[0].start,returned.argument.arguments[0].end),expected.get(relative));assert.equal(returned.argument.arguments[1].name,'failure');
  }
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(child=>walk(child,[...ancestors,node]));else if(value&&typeof value==='object')walk(value,[...ancestors,node]);
 }
 walk(ast);
}
assert.deepEqual(found.sort(),[...expected.keys()].sort(),'Tous les chemins existants sont couverts, sans appel supplementaire');
(async()=>{
 const original=Object.assign(Error('mot de passe refuse'),{code:'auth/invalid-credential'});
 await assert.rejects(createMfaAuth({document:null}).resolve({},original),error=>error===original);
 await assert.rejects(createMfaAuth({document:null}).resolve({},Object.assign(Error('MFA'),{code:'auth/multi-factor-auth-required'})),{code:'auth/mfa-unavailable'});
 console.log('MFA client : six vrais chemins de connexion/reauthentification, import relatif versionne, contexte Auth conserve, erreurs ordinaires inchangees, SDK inconnus et environnement indisponible refuses hors reseau.');
})().catch(error=>{console.error(error);process.exitCode=1;});
