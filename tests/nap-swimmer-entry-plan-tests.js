"use strict";
const assert=require("node:assert/strict");
const {planSelection}=require("../functions/nap-swimmer-entry-plan");
const pack={competitionId:"5140",clubId:"106",swimmers:[{id:"1",clubId:"106",licenseNumber:""},{id:"2",clubId:"106"}],
  inscriptions:[{id:9,nageur:1,compet:5140}],individual:[{id:20,engagement:9,course:"100SF",tps:"14200"}],
  relays:[{id:30,compet:5140,club:"106"}],members:[{id:40,relais:30,nageur:1,pos:1},{id:41,relais:30,nageur:2,pos:2}]};
const source=JSON.stringify(pack);
const add=planSelection(pack,[{swimmerId:2,selected:true}]);
assert.equal(add.additions.length,1); assert.equal(add.removals.length,0);
assert.equal(planSelection(pack,[{swimmerId:1,selected:true}]).additions.length,0);
assert.equal(planSelection(pack,[{swimmerId:2,selected:false}]).removals.length,0);
const remove=planSelection(pack,[{swimmerId:1,selected:false}]);
assert.equal(remove.removals[0].entries[0].tps,"14200");
assert.equal(remove.removals[0].members.length,1); assert.equal(remove.removals[0].members[0].id,40);
assert.equal(JSON.stringify(pack),source);
assert.throws(()=>planSelection(pack,[{swimmerId:3,selected:true}]),/hors/);
assert.throws(()=>planSelection(pack,[{swimmerId:1,selected:true},{swimmerId:1,selected:false}]),/dupliquee/);
assert.throws(()=>planSelection({...pack,inscriptions:[...pack.inscriptions,{id:10,nageur:1,compet:5140}]},[{swimmerId:1,selected:false}]),/ambigue/);
assert.throws(()=>planSelection({...pack,relays:[]},[{swimmerId:1,selected:false}]),/hors/);
console.log("Native selection plan keeps licences empty, no-ops and untouched relay members; ambiguous/native out-of-scope rows rejected");
