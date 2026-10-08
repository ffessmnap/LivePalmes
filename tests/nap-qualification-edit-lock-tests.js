"use strict";
const assert=require('node:assert/strict');
const {ordinaryEdit}=require('../functions/nap-qualification-edit-lock');
async function main(){
 for(const kind of ['ok','busy','active','failure','unsafe']){
  let calls=0,releases=0,destroyed=0;
  const connection={execute:async({sql},values)=>{
   if(sql.includes('GET_LOCK')){assert.deepEqual(values,['lp-qualification-5162']);return [[{acquired:kind==='busy'?0:1}]];}
   if(sql.includes('RELEASE_LOCK'))return [[{released:kind==='unsafe'?0:1}]];
   assert.match(sql,/FORCE INDEX \(competition_state\).*LIMIT 1$/);assert.deepEqual(values,[5162]);return [kind==='active'?[{id:'a'.repeat(64)}]:[]];
  },release:()=>releases++,destroy:()=>destroyed++};
  const run=()=>ordinaryEdit({getConnection:async()=>connection},'legacy-nap-5162',async()=>{calls++;if(kind==='failure')throw Error('Interrupted');return 'saved';},{authorize:()=>{},readCompetition:async(c,id,authorize)=>{await authorize({id});return {event:{id}};}});
  if(['busy','active','failure'].includes(kind))await assert.rejects(run());else assert.equal(await run(),'saved');
  assert.equal(calls,['busy','active'].includes(kind)?0:1);assert.equal(releases,kind==='unsafe'?0:1);assert.equal(destroyed,kind==='unsafe'?1:0);
 }
 console.log('Ordinary competition edits: shared qualification lock, active-control refusal, released connections and unsafe connection destruction; offline.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
