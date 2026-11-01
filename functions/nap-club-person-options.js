"use strict";
// Shared identity references and guarded option statements; no mutation execution.
const {nativeEqual}=require("./nap-native-compare");
const { SOURCES, OPTION_COLUMNS } = require("./nap-club-people-values");
const table="livepalmes_club_people_options";

function changedOptions(kind,native,previous,active,now,actorUid,roles=null) {
  if(typeof now!=="string" || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}$/.test(now)) throw new TypeError("Horodatage de statut invalide.");
  const after=previous?{...previous,active:active?1:0,version:Number(previous.version)+1,updated_at:now,updated_by:actorUid}:{source:SOURCES[kind].table,person_id:Number(native.id),club_id:String(native.club),role_team_leader:1,role_official:kind==="officials"?1:0,active:active?1:0,version:1,created_at:now,updated_at:now,created_by:actorUid,updated_by:actorUid};
  if(!Number.isSafeInteger(after.version)) throw new TypeError("Version de personne a verifier.");
  if(roles) {
    if(Object.keys(roles).length!==2||typeof roles.teamLeader!=="boolean"||typeof roles.official!=="boolean"||!roles.teamLeader&&!roles.official) throw new TypeError("Conservez au moins un rôle, ou désactivez la fiche.");
    after.role_team_leader=Number(roles.teamLeader);after.role_official=Number(roles.official);
  }
  return after;
}

function reference(value) {
  const match=/^(nap-leader|nap-official)-([1-9]\d{0,9})$/.exec(value || "");
  if(!match || Number(match[2])>2147483647) throw new TypeError("Personne NAP requise.");
  return {kind:match[1]==="nap-leader"?"leaders":"officials",id:Number(match[2])};
}

function buildStatusStatement(kind,before,previous,after) {
  const spec=SOURCES[kind];
  const nativeGuard=spec.columns.map(key=>nativeEqual(`n.\`${key}\``)).join(" AND ");
  const nativeValues=spec.columns.map(key=>before[key]);
  if(previous) return {
    sql:`UPDATE ${table} o JOIN \`${spec.table}\` n ON n.id=? SET o.active=?,o.role_team_leader=?,o.role_official=?,o.version=?,o.updated_at=?,o.updated_by=? WHERE o.source=? AND o.person_id=? AND ${OPTION_COLUMNS.map(key=>`BINARY o.\`${key}\` <=> BINARY ?`).join(" AND ")} AND ${nativeGuard}`,
    values:[before.id,after.active,after.role_team_leader,after.role_official,after.version,after.updated_at,after.updated_by,spec.table,before.id,...OPTION_COLUMNS.map(key=>previous[key]),...nativeValues]
  };
  return {
    sql:`INSERT INTO ${table} (${OPTION_COLUMNS.map(key=>`\`${key}\``).join(",")}) SELECT ${OPTION_COLUMNS.map(()=>"?").join(",")} FROM \`${spec.table}\` n WHERE n.id=? AND ${nativeGuard}`,
    values:[...OPTION_COLUMNS.map(key=>after[key]),before.id,...nativeValues]
  };
}

module.exports = { reference, changedOptions, buildStatusStatement };
