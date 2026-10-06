"use strict";
// Native club directory, two keyset pages at most. No identity merging, old
// LivePalmes directory, licence lookup, N+1 query or unbounded fallback.
const {createHash}=require("node:crypto");
const {date}=require("./nap-direct-calendar");
const PAGE_SIZE=100;
const OPTION_COLUMNS=require("./nap-approved-people-schema").columns.map(([name])=>name);
const SOURCES={
  leaders:{table:"chefsdequipe",columns:["id","compet","nom","prenom","date","club","pourclub"],prefix:"nap-leader"},
  officials:{table:"officiels",columns:["id","nom","prenom","date","club"],prefix:"nap-official"}
};
function normalizeOptions(row) {
  if(!row) return null;
  return Object.fromEntries(OPTION_COLUMNS.map(key=>[key,["person_id","role_team_leader","role_official","active","version"].includes(key)?Number(row[key]):row[key]]));
}
function cursors(value) {
  if(value===undefined || value===null) return {leaders:0,officials:0};
  if(typeof value!=="object" || Array.isArray(value) || Object.keys(value).length!==2 || Object.keys(value).some(key=>!Object.hasOwn(SOURCES,key))) throw new TypeError("Page de personnes invalide.");
  for(const id of Object.values(value)) if(id!==null && (!Number.isSafeInteger(id) || id<0 || id>2147483647)) throw new TypeError("Page de personnes invalide.");
  return {...value};
}
function person(row,kind,options=null) {
  options=normalizeOptions(options);
  const spec=SOURCES[kind];
  if(!spec || spec.columns.some(key=>!Object.hasOwn(row,key)) || !Number.isSafeInteger(Number(row.id)) || Number(row.id)<=0) throw new TypeError("Fiche NAP incomplete.");
  if(options && (options.source!==spec.table || Number(options.person_id)!==Number(row.id) || String(options.club_id)!==String(row.club) || ["active","role_team_leader","role_official"].some(key=>![0,1].includes(Number(options[key]))) || !Number.isSafeInteger(Number(options.version)) || Number(options.version)<1)) throw new TypeError("Options de personne incompatibles.");
  return {id:`${spec.prefix}-${row.id}`,nativePersonId:String(row.id),nativePersonKind:kind,napSource:true,nativeDirectoryReadOnly:true,nativeStatusEditable:kind==="officials",
    napFingerprint:createHash("sha256").update(JSON.stringify([spec.columns.map(key=>[key,row[key]]),options?OPTION_COLUMNS.map(key=>[key,options[key]]):null])).digest("hex"),
    firstName:String(row.prenom || "").trim(),lastName:String(row.nom || "").trim(),birthDate:date(row.date),clubId:String(row.club),
    licenseNumber:"",sex:"",active:options?Number(options.active)===1:true,roles:options?{teamLeader:Number(options.role_team_leader)===1,official:Number(options.role_official)===1}:{teamLeader:true,official:kind==="officials"},
    ...(kind==="leaders"?{nativeCompetitionId:String(row.compet),representedClubId:String(row.pourclub)}:{})};
}
async function readClubPeople(pool,input,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId)) throw new TypeError("Club autorise requis.");
  const cursor=cursors(input.cursor);
  await authorize({clubId:input.clubId});
  const people=[],nextCursor={leaders:null,officials:null};
  let queries=0;
  for(const [kind,spec] of Object.entries(SOURCES)) {
    if(cursor[kind]===null) continue;
    queries++;
    const [rows]=await pool.execute({sql:`SELECT ${spec.columns.map(key=>`n.\`${key}\``).join(",")},${OPTION_COLUMNS.map(key=>`o.\`${key}\` AS \`option_${key}\``).join(",")} FROM \`${spec.table}\` n FORCE INDEX (livepalmes_club_id) LEFT JOIN livepalmes_club_people_options o ON o.source=? AND o.person_id=n.id WHERE n.club=? AND n.id>? ORDER BY n.id LIMIT ${PAGE_SIZE+1}`,timeout:10000},[spec.table,input.clubId,cursor[kind]]);
    if(rows.length>PAGE_SIZE+1) throw new RangeError("Page NAP trop volumineuse.");
    let last=cursor[kind];
    for(const row of rows) {
      if(String(row.club)!==input.clubId || !Number.isSafeInteger(Number(row.id)) || Number(row.id)<=last) throw new TypeError("Page NAP hors club ou incoherente.");
      last=Number(row.id);
    }
    const page=rows.slice(0,PAGE_SIZE);
    people.push(...page.map(row=>person(row,kind,row.option_person_id==null?null:Object.fromEntries(OPTION_COLUMNS.map(key=>[key,row[`option_${key}`]])))));
    if(rows.length>PAGE_SIZE) nextCursor[kind]=Number(page.at(-1).id);
  }
  return {source:"nap",people,nextCursor,hasMore:Object.values(nextCursor).some(id=>id!==null),nativeDirectoryReadOnly:true,
    sqlBudget:{queriesMax:2,queriesExecuted:queries,rowsMax:2*(PAGE_SIZE+1)}};
}
module.exports={PAGE_SIZE,SOURCES,OPTION_COLUMNS,normalizeOptions,cursors,person,readClubPeople};
