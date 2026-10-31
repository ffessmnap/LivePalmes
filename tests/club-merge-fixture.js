"use strict";
const p = require("../tools/club-merge-plan"), engine = require("../tools/club-merge-engine");
const s = stringValue => ({stringValue});
function fixture({large=false}={}) {
  const sql = Object.fromEntries(p.tables.map(t => [t,[]]));
  sql.clubs = require("../tools/club-merge-clubs.json").clubs.map(row => ({...row,hc_club:row.num_club === 220 ? "1" : "",actif_club:row.num_club === 698 ? 0 : 1,comite_club:19}));
  for (const [i,[source]] of p.pairs.entries()) {
    sql.nageurs.push({id:i+1,club:source,number:"000001",name:"Épreuve fictive 😀",nullable:null,bytes:Buffer.from([0,255])});
    sql.perfs.push({id:i+1,club:source,tps:"00:47.120",stamp:"2026-10-31 01:02:03.123456",big:"9007199254740999"});
  }
  sql.chefsdequipe.push({id:1,club:"518",pourclub:"698",compet:7});
  sql.livepalmes_club_people_options.push({source:"nap",person_id:1,club_id:"518",flag:0});
  sql.livepalmes_club_entry_options.push({competition_id:99,club_id:518,value:"unchanged"});
  sql.perfs.push({id:9000,club:"126",tps:"cible inchangée"});
  if (large) {
    for (let i=sql.nageurs.length;i<133;i++) sql.nageurs.push({id:i+1,club:p.pairs[i%14][0],number:"000001",name:"Fictif",nullable:null,bytes:Buffer.from([0,255])});
    for (let i=sql.perfs.length;i<456;i++) sql.perfs.push({id:i+1,club:p.pairs[i%14][0],tps:"00:47.120",stamp:"2026-10-31 01:02:03.123456",big:"9007199254740999"});
    // id 9000 is the unchanged target; 455 rows are transferred.
  }
  const docs = [];
  for (const [uid,club] of [["fiction-source","518"],["fiction-target-a","126"],["fiction-target-b","126"]]) {
    docs.push({path:"users/"+uid,updateTime:"2026-10-31T01:00:00.123456Z",fields:{
      clubId:s(club),clubName:s("Club fictif "+club),regionId:s("Hauts de France"),status:s("active"),
      capabilities:{mapValue:{fields:{"engagements.club.manage":{booleanValue:true},"admin.full":{booleanValue:false}}}},
      accessScopes:{mapValue:{fields:{"engagements.club.manage":{mapValue:{fields:{scopeType:s("club"),scopeId:s(club)}}}}}},
      emailPreferences:{mapValue:{fields:{competitionNotifications:{booleanValue:false}}}},
      lastLoginAt:s("same"),other:{integerValue:"9007199254740999"}
    }});
    docs.push({path:"accessGrants/"+uid,updateTime:"2026-10-31T01:00:00Z",fields:{uid:s(uid),scopeType:s("club"),scopeId:s(club),capability:s("engagements.club.manage"),status:s("active"),actor:s("preserved")}});
  }
  docs.push({path:"engagementAccessRequests/fiction-request",updateTime:"2026-10-31T01:00:00Z",fields:{clubId:s("518"),status:s("approved"),resolvedBy:s("preserved"),resolvedAt:s("same")}});
  const inventory = {project:"livepalmes",database:"nage-palmes",complete:true,sql,docs,meta:{fixture:true},safety:{imports:[],direct:[],reservations:[]},projection:{sql:docs.filter(d => d.path.startsWith("users/")).map(d => ({firebase_uid:d.path.slice(6),club_id:p.wire(d,"clubId"),email:"fiction@example.invalid",status:"active",competition_notifications:0,source_version:"1793408400123456",synchronized_at:"same"})),firestore:[]}};
  return {inventory,plan:p.prepare(inventory,"fiction-clubs-20261031")};
}
function memory(plan,{stopAt=Infinity,failPersistAt=Infinity,failConvergence=false}={}) {
  const state = {sql:p.clone(plan.sql),docs:p.clone(plan.docs),meta:p.clone(plan.meta),safety:p.clone(plan.safety),projection:p.clone(plan.projection)};
  let mutations=0,events=0,locked=false,failed=false;
  const crash = () => { mutations++; if (!failed && mutations === stopAt) { failed=true; throw Error("INJECTED_AFTER_MUTATION"); } };
  const capture = async () => p.clone(state);
  const sql = {
    rows:async () => p.clone(state.sql),metadata:async () => p.clone(state.meta),imports:async () => p.clone(state.safety.imports),
    locked:async fn => { if (locked) throw Error("NESTED_LOCK"); locked=true; try { return await fn(); } finally { locked=false; } },
    mutate:async (op,direction) => {
      if (!locked) throw Error("SQL_WRITE_WITHOUT_LOCK");
      const from = direction === "restore" ? op.after : op.before, to = direction === "restore" ? op.before : op.after;
      const rows = state.sql[op.table];
      if (from) {
        const at = rows.findIndex(r => p.equal(r,from));
        if (at < 0) throw Error("CAS_FAILED");
        if (to) rows[at] = p.clone(to); else rows.splice(at,1);
      } else rows.push(p.clone(to));
      crash();
    }
  };
  const firestore = {
    commit:async (_,direction) => {
      if (locked) throw Error("FIRESTORE_UNDER_SQL_LOCK");
      engine.documents(plan,state.docs);
      for (const op of plan.firestore) {
        const doc = state.docs.find(d => d.path === op.path);
        const fields = direction === "restore" ? op.before : op.after;
        if (!p.equal(doc.fields,fields)) { doc.fields=p.clone(fields); doc.updateTime="2026-10-31T02:00:00.654321Z"; }
      }
      crash();
    },
    projections:async (_,club) => {
      if (locked) throw Error("PROJECTION_WORKER_BLOCKED_BY_LOCK");
      if (failConvergence) throw Error("ADMIN_OR_RECIPIENT_NOT_CONVERGED");
      const row = state.projection.sql.find(r => r.firebase_uid === "fiction-source");
      row.club_id=club;
      const stamp = state.docs.find(d => d.path === "users/fiction-source").updateTime;
      row.source_version = String(BigInt(Date.parse(stamp.slice(0,19)+"Z"))*1000n+BigInt(stamp.slice(20,-1)));
    }
  };
  const persist = async () => { events++; if (events === failPersistAt) throw Error("JOURNAL_NOT_DURABLE"); };
  const run = direction => engine.run({plan,sql,firestore,capture,persist,direction,checkGate:()=>{}});
  return {state,run,arm:n=>{stopAt=mutations+n;failed=false;},counts:() => ({mutations,events}),sql,firestore,capture,persist};
}
module.exports = {fixture,memory,s};
