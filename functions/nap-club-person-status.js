"use strict";
const {nativeEqual}=require("./nap-native-compare");
// Only the LivePalmes active flag changes. Native identities and entries stay intact.
// Fixed budget: 12 SQL calls maximum, one options write; one audit read/two writes.
const {createHash}=require("node:crypto");
const {isDeepStrictEqual}=require("node:util");
const {SOURCES,OPTION_COLUMNS,normalizeOptions,person}=require("./nap-club-people");
const {inspectPeopleSchema,validate}=require("./nap-approved-people-schema");
const table="livepalmes_club_people_options";
function changedOptions(kind,native,previous,active,now,actorUid) {
  if(typeof now!=="string" || !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}$/.test(now)) throw new TypeError("Horodatage de statut invalide.");
  const after=previous?{...previous,active:active?1:0,version:Number(previous.version)+1,updated_at:now,updated_by:actorUid}:{source:SOURCES[kind].table,person_id:Number(native.id),club_id:String(native.club),role_team_leader:1,role_official:kind==="officials"?1:0,active:active?1:0,version:1,created_at:now,updated_at:now,created_by:actorUid,updated_by:actorUid};
  if(!Number.isSafeInteger(after.version)) throw new TypeError("Version de personne a verifier.");
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
    sql:`UPDATE ${table} o JOIN \`${spec.table}\` n ON n.id=? SET o.active=?,o.version=?,o.updated_at=?,o.updated_by=? WHERE o.source=? AND o.person_id=? AND ${OPTION_COLUMNS.map(key=>`BINARY o.\`${key}\` <=> BINARY ?`).join(" AND ")} AND ${nativeGuard}`,
    values:[before.id,after.active,after.version,after.updated_at,after.updated_by,spec.table,before.id,...OPTION_COLUMNS.map(key=>previous[key]),...nativeValues]
  };
  return {
    sql:`INSERT INTO ${table} (${OPTION_COLUMNS.map(key=>`\`${key}\``).join(",")}) SELECT ${OPTION_COLUMNS.map(()=>"?").join(",")} FROM \`${spec.table}\` n WHERE n.id=? AND ${nativeGuard}`,
    values:[...OPTION_COLUMNS.map(key=>after[key]),before.id,...nativeValues]
  };
}
async function changeNativePersonStatus(pool,input,audit,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId) || typeof input.actorUid!=="string" || !input.actorUid || input.actorUid.length>128 || typeof input.active!=="boolean" || !/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "")) throw new TypeError("Statut et perimetre de personne requis.");
  const {kind,id}=reference(input.personId),spec=SOURCES[kind];
  if(kind!=="officials") throw new TypeError("Les anciennes declarations de chef d'equipe sont conservees ; leur statut d'annuaire reste a raccorder.");
  await authorize({clubId:input.clubId});
  const operation=createHash("sha256").update(JSON.stringify([input.clubId,input.actorUid,input.personId,input.active,input.expectedFingerprint])).digest("hex");
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[]) => (await connection.execute({sql,timeout:10000},values))[0];
  const read=async()=>{
    const [native]=await query(`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM \`${spec.table}\` WHERE id=? LIMIT 1`,[id]);
    if(!native || String(native.club)!==input.clubId) throw new TypeError("Personne hors du club autorise.");
    const [options]=await query(`SELECT ${OPTION_COLUMNS.map(key=>`\`${key}\``).join(",")} FROM ${table} WHERE source=? AND person_id=? LIMIT 1`,[spec.table,id]);
    const normalized=normalizeOptions(options),item=person(native,kind,normalized);
    return {native,options:normalized,item};
  };
  try {
    // Same person lock, rather than operation lock, serializes competing edits.
    const personLock=`lp-person-${createHash("sha256").update(`${spec.table}:${id}`).digest("hex").slice(0,48)}`;
    if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[personLock]))[0]?.acquired)!==1) throw new TypeError("Personne en cours de modification. Reessayez.");
    locked=personLock;
    if(!validate(await inspectPeopleSchema(connection))) throw new TypeError("Complement NAP absent.");
    const current=await read();
    const saved=await audit.read(operation);
    let plan;
    if(saved) {
      if(saved.kind!=="native-person-status" || saved.operation!==operation || saved.actorUid!==input.actorUid || saved.clubId!==input.clubId || saved.personId!==input.personId || saved.expectedFingerprint!==input.expectedFingerprint || saved.after?.active!==(input.active?1:0) || !isDeepStrictEqual(saved.native,current.native)) throw new TypeError("Sauvegarde de personne incompatible.");
      if(person(saved.native,kind,saved.before).napFingerprint!==input.expectedFingerprint || !isDeepStrictEqual(changedOptions(kind,saved.native,saved.before,input.active,saved.after.updated_at,input.actorUid),saved.after)) throw new TypeError("Plan de statut sauvegarde incompatible.");
      plan=saved;
    } else {
      if(current.item.napFingerprint!==input.expectedFingerprint) throw new TypeError("La fiche NAP a change. Rechargez avant d'enregistrer.");
      if(current.item.active===input.active) return {ok:true,source:"nap",person:current.item,unchanged:true};
      const now=new Date().toISOString().replace("T"," ").replace("Z","000");
      const previous=current.options;
      const after=changedOptions(kind,current.native,previous,input.active,now,input.actorUid);
      plan={kind:"native-person-status",operation,actorUid:input.actorUid,clubId:input.clubId,personId:input.personId,expectedFingerprint:input.expectedFingerprint,native:current.native,before:previous,after};
    }
    if(!isDeepStrictEqual(current.options,plan.before) && !isDeepStrictEqual(current.options,plan.after)) throw new TypeError("Les options NAP ont change. Rechargez la fiche.");
    if(!isDeepStrictEqual(current.options,plan.after)) {
      const triggers=await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE=? LIMIT 1",[table]);
      if(triggers.length) throw new TypeError("Declencheur des options a verifier.");
      if(!saved) await audit.prepare(operation,plan);
      const statement=buildStatusStatement(kind,plan.native,plan.before,plan.after);
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("La personne a change. Rechargez la fiche ; sauvegarde conservee.");
    }
    const verified=await read();
    if(!isDeepStrictEqual(verified.options,plan.after)) throw new Error("Statut a verifier : sauvegarde conservee.");
    await audit.complete(operation,{personId:input.personId,clubId:input.clubId,active:input.active,verified:true,entriesPreserved:true});
    return {ok:true,source:"nap",person:verified.item,operation};
  } finally {
    try {if(locked) await query("SELECT RELEASE_LOCK(?)",[locked]);}
    finally {connection.release();}
  }
}
// Four EXPLAIN statements on one existing official, never an INSERT/UPDATE.
async function inspectStatusWritePlans(connection) {
  const plans=[];
  try {
    const [clubs]=await connection.execute({sql:"SELECT n.club FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) JOIN nageurs n ON n.id=e.nageur WHERE e.compet=? ORDER BY e.nageur,e.id LIMIT 1",timeout:10000},[5140]);
    if(!clubs.length || !/^\d{1,16}$/.test(String(clubs[0].club))) throw Error("scope");
    for(const [kind,spec] of [["officials",SOURCES.officials]]) {
      const [rows]=await connection.execute({sql:`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM \`${spec.table}\` FORCE INDEX (livepalmes_club_id) WHERE club=? ORDER BY id LIMIT 1`,timeout:10000},[String(clubs[0].club)]);
      if(rows.length!==1) throw Error("reference");
      const native=rows[0],timestamp="2026-10-07 00:00:00.000000";
      const previous=changedOptions(kind,native,null,true,timestamp,"private-plan"),after=changedOptions(kind,native,previous,false,timestamp,"private-plan");
      for(const before of [null,previous]) {
        const statement=buildStatusStatement(kind,native,before,before?after:{...previous,active:0});
        const [raw]=await connection.execute({sql:`EXPLAIN ${statement.sql}`,timeout:10000},statement.values);
        plans.push(raw.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra})));
        if(!raw.length || raw.some(row=>!(row.select_type==="INSERT" && row.table===table) && !["system","const"].includes(row.type) && !(row.table==null && /Impossible WHERE|no matching row/.test(row.Extra || "")) && (row.type==="ALL" || !row.key))) throw Error("plan");
      }
      const identityStatement=require("./nap-club-person-edit").statement(native,{...native,nom:String(native.nom)==="plan-test"?"plan-check":"plan-test"});
      const [raw]=await connection.execute({sql:`EXPLAIN ${identityStatement.sql}`,timeout:10000},identityStatement.values);
      plans.push(raw.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra})));
      if(!raw.length || raw.some(row=>!["system","const"].includes(row.type) && !(row.table==null && /Impossible WHERE|no matching row/.test(row.Extra || "")) && (row.type==="ALL" || !row.key))) throw Error("plan");
    }
    const createStatement=require("./nap-club-person-create").creationStatement({nom:"private-plan",prenom:"private-plan",date:"1980-01-01",club:String(clubs[0].club)});
    const [createRaw]=await connection.execute({sql:`EXPLAIN ${createStatement.sql}`,timeout:10000},createStatement.values);
    plans.push(createRaw.map(({select_type,table,type,key,rows,Extra})=>({select_type,table,type,key,rows,Extra})));
    if(!createRaw.length || createRaw.some(row=>!(row.select_type==="INSERT" && row.table==="officiels") && !["system","const"].includes(row.type) && !(row.table==null && /Impossible WHERE|no matching row/.test(row.Extra || "")) && (row.type==="ALL" || !row.key))) throw Error("plan");
    return {source:"nap",mode:"portal-person-status-plans-readonly",complete:true,plans,writesExecuted:false};
  } catch {
    return {source:"nap",mode:"portal-person-status-plans-readonly",complete:false,plans,writesExecuted:false};
  }
}
module.exports={reference,changedOptions,buildStatusStatement,changeNativePersonStatus,inspectStatusWritePlans};
