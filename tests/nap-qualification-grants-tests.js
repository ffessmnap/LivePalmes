"use strict";
const assert=require('node:assert/strict');
const {readGrants,acceptStatement}=require('../functions/nap-qualification-grants');
const input={competitionId:'legacy-nap-5162',swimmerId:'912',clubId:'00106',national:true,confirmed:true,actorUid:'national',eventCode:'100BI',reason:'Minimum non atteint',now:'2026-10-08 18:00:00.000000'};
const row={competition_id:5162,swimmer_id:912,club_id:'00106',event_code:'100BI',status:'accepted',version:'9007199254740993'};
async function main(){
 let queries=0;
 const connection={execute:async(statement,values)=>{queries++;assert.match(statement.sql,/WHERE competition_id=\? AND swimmer_id=\? ORDER BY event_code LIMIT 65$/);assert.deepEqual(values,[5162,912]);return [[row]];}};
 assert.deepEqual(await readGrants(connection,input),[row]);assert.equal(queries,1);
 assert.equal(acceptStatement(input,row).unchanged,true,'An accepted grant retains its original approving administrator and timestamp');
 const insert=acceptStatement(input);assert.equal(insert.values[3],'00106');assert.doesNotMatch(insert.sql,/DUPLICATE|REPLACE/);
 const update=acceptStatement(input,{...row,status:'revoked'});assert.match(update.sql,/BINARY club_id=BINARY \?.*version=\? LIMIT 1/);assert.equal(update.values.at(-1),'9007199254740993','Versions never pass through a lossy Number conversion');
 for(const patch of [{national:false},{confirmed:false},{eventCode:'100BI;DELETE'},{reason:'x\n'},{actorUid:''}]) assert.throws(()=>acceptStatement({...input,...patch}));
 for(const patch of [{club_id:'106'},{competition_id:1},{swimmer_id:1},{event_code:'50BI'},{version:'0'}]) assert.throws(()=>acceptStatement(input,{...row,...patch}));
 await assert.rejects(readGrants({execute:async()=>[[{...row,club_id:'106'}]]},input));
 await assert.rejects(readGrants({execute:async()=>[[row,row]]},input));
 await assert.rejects(readGrants({execute:async()=>[Array(65).fill(row)]},input),RangeError);
 console.log('NAP exceptions: one bounded indexed read, exact club identity, national confirmation, unchanged accepted grant, versioned reapproval and concurrent insert protection; offline.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
