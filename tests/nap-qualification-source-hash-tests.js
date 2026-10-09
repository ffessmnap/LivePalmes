"use strict";
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {sourceHash,matches}=require('../functions/nap-qualification-source-hash');
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function reorder(value){
  if(Array.isArray(value))return value.map(reorder);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).reverse().map(key=>[key,reorder(value[key])]));
  return value;
}
const individual={swimmerId:'912',name:'Example',clubId:'106',birthDate:'2000-01-01',sex:'M',inscriptionId:100,entries:[{eventCode:'50SF',nativeId:44,nativeTime:'14200'}]};
const relay={relayId:10,clubId:'106',entry:{id:10,compet:5162,categorie:'M',club:'106',course:12,tps:'032000'},members:[{id:11,relais:10,pos:1,nageur:912},{id:12,relais:10,pos:2,nageur:913}]};
for(const [before,isRelay] of [[individual,false],[relay,true]]){
  const reordered=reorder(before);
  assert.equal(sourceHash(before),sourceHash(reordered));
  for(const hash of [digest(before),sourceHash(before)]){
    assert.equal(matches(reordered,hash,isRelay),true,'Persisted pending controls survive JSON key reordering');
    assert.equal(matches({...reordered,clubId:'107'},hash,isRelay),false);
    assert.equal(matches({...reordered,extra:'unexpected'},hash,isRelay),false);
    const changed=structuredClone(reordered);
    if(isRelay)changed.members.reverse();else changed.entries[0].nativeTime='014201';
    assert.equal(matches(changed,hash,isRelay),false,'Array order and sporting values remain protected');
  }
}
console.log('NAP qualification hashes: JSON ordering, legacy recovery, value and array tampering checked');
