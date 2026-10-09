"use strict";
const assert=require("node:assert/strict");
const clubs=require("../functions/nap-club-directory"),people=require("../functions/nap-club-people");
(async()=>{
 const native={num_club:106,federal_club:"001234",nom_club:"Club",abre_club:"CN",comite_club:3,actif_club:0,ville:"Paris",postalcode:"75001"};
 let queries=0,rows=[native];
 const pool={execute:async({sql,timeout})=>{queries++;assert.equal(timeout,10000);assert.match(sql,/FORCE INDEX \(PRIMARY\).*ORDER BY num_club LIMIT 1001/);return [rows];}};
 const result=await clubs.directory(pool);assert.equal(result.clubs[0].federalNumber,"001234");assert.equal(result.clubs[0].active,false);assert.equal(result.clubs[0].city,"Paris");assert.equal(result.clubs[0].regionId,"3");assert.equal(queries,1);
 for(const nativeId of Object.keys(clubs.CLUB_REGIONS)){const item=clubs.club({...native,comite_club:Number(nativeId)});assert.equal(clubs.region(item.regionId),Number(nativeId),"native committee must round-trip unchanged");}
 assert.equal(clubs.region("12"),23);assert.equal(clubs.club({...native,comite_club:12}).regionId,"nap-12");assert.equal(clubs.club({...native,comite_club:23}).regionId,"12");
 rows=Array.from({length:1001},()=>native);await assert.rejects(clubs.directory(pool),RangeError);
 let allowed=false,calls=0;
 const nativePeople={execute:async({sql},values)=>{
   assert.equal(allowed,true);calls++;assert.match(sql,/FORCE INDEX \(PRIMARY\)/);assert.match(sql,/WHERE n.id>\? ORDER BY n.id LIMIT 101/);
   if(values[0]==="chefsdequipe")return [Array.from({length:101},(_,i)=>({id:i+1,compet:10,nom:"A",prenom:"B",date:"1980-01-01",club:"106",pourclub:"106",nom_club:"Club"}))];
   return [[{id:4,nom:"C",prenom:"D",date:"1980-01-01",club:"106",option_person_id:null,nom_club:"Club"}]];
 }};
 const first=await people.readNationalPeople(nativePeople,{},()=>{allowed=true;});assert.equal(calls,2);assert.equal(first.people.length,101);assert.equal(first.hasMore,true);assert.deepEqual(first.nextCursor,{leaders:100,officials:null});assert.equal(first.people[0].nativeIdentityEditable,false);assert.equal(first.people.at(-1).nativeIdentityEditable,true);
 const before=calls;await assert.rejects(people.readNationalPeople(nativePeople,{},()=>{throw Error("denied");}));assert.equal(calls,before);
 await assert.rejects(people.readNationalPeople(nativePeople,{cursor:{leaders:-1,officials:null}},()=>{}),TypeError);
 console.log("National NAP directories: bounded indexed pages, authorization first, native IDs/status and overflow refusal passed.");
})().catch(e=>{console.error(e);process.exitCode=1;});
