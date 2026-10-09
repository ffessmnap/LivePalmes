"use strict";
// Explicit patches only: untouched native fields, courses and entries stay intact.
// MyISAM operations are journaled separately; never claim a cross-table rollback.
const { createHash } = require("node:crypto");
const {nativeEqual}=require("./nap-native-compare");
const { isDeepStrictEqual } = require("node:util");
const native = require("./nap-portal-competitions");
const calendar = require("./nap-direct-calendar");
const { parisDeadline } = require("./nap-paris-time");
const { fingerprint } = require("./nap-portal-workspaces");
const schema = require("./nap-approved-portal-schema");
const SPECS = Object.freeze({
  competitions: { key: "id", columns: ["id","libelle","lieu","date","enddate","comite","description","bassin","chrono","ld"] },
  compet_parametres: { key: "id", columns: ["id","compet","actif","dateactif","date_limit","officiel","nb_lignes","mailtxt","mailjuges","tps_d","tps_f","niveau","saisie","relais"] },
  livepalmes_competition_options: { key: "competition_id", columns: [...schema.tables[0].columns.map(c => c.name), "entry_closed"] },
  livepalmes_competition_fees: { key: "competition_id", columns: schema.tables[2].columns.map(c => c.name) },
  livepalmes_competition_programs: { key: "competition_id", columns: schema.tables[7].columns.map(c=>c.name) }
});
const JSON_COLUMNS = new Set(["invited_region_ids","program_sessions"]);
const string = (value, max, required = false) => {
  if (typeof value !== "string" || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || required && !value.trim()) throw new TypeError("Valeur de champ invalide.");
  return value.trim();
};
const bool = value => { if (typeof value !== "boolean") throw new TypeError("Choix oui/non requis."); return value ? 1 : 0; };
const day = value => {
  if (typeof value !== "string" || !calendar.date(value) || new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) !== value) throw new TypeError("Date invalide.");
  return value;
};
function optionalEmail(value) {
  const email = string(value,255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TypeError("Email invalide.");
  return email;
}
const nativeFields = {
  name: ["competitions","libelle",v => string(v,255,true)], location: ["competitions","lieu",v => string(v,64,true)],
  date: ["competitions","date",day], endDate: ["competitions","enddate",day], publicDescription: ["competitions","description",v => string(v,3000)],
  poolLength: ["competitions","bassin",v => { if (!["", "25", "33", "50"].includes(String(v))) throw new TypeError("Bassin invalide."); return v === "" ? null : Number(v); }],
  timingType: ["competitions","chrono",v => { if (!["", "electronic", "manual"].includes(v)) throw new TypeError("Chronometrage invalide."); return ({electronic:"E",manual:"M"})[v] || null; }],
  poolLaneCount: ["compet_parametres","nb_lignes",v => { if (!Number.isInteger(v) || v !== 0 && (v < 4 || v > 10)) throw new TypeError("Nombre de lignes invalide."); return v; }],
  officialsRequired: ["compet_parametres","officiel",bool], computerEmail: ["compet_parametres","mailtxt",optionalEmail], officialsManagerEmail: ["compet_parametres","mailjuges",optionalEmail],
  qualificationStartDate: ["compet_parametres","tps_d",v => v === "" ? null : day(v)], qualificationEndDate: ["compet_parametres","tps_f",v => v === "" ? null : day(v)]
};
const extraFields = {
  missingEntryTimeMode:["missing_time_mode",v=>{if(!["manual","forbidden","default595999"].includes(v)) throw new TypeError("Choix sans temps connu invalide.");return v;}],
  address:["address",v=>string(v,300)], city:["city",v=>string(v,120)], organizer:["organizer_label",v=>string(v,160)],
  organizerEmail:["organizer_email",optionalEmail], canceled:["canceled",bool],
  waterBodyType:["water_body_type",v=>{if (!["","sea","lake","river","other"].includes(v)) throw new TypeError("Plan d'eau invalide.");return v;}],
  teamLeadersWhatsAppUrl:["whatsapp_url",v=>{const value=string(v,500);if(value&&!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+(?:\?[^\s]*)?$/.test(value)) throw new TypeError("Lien WhatsApp invalide.");return value;}],
  maxEventsPerSwimmer:["max_events_per_swimmer",v=>{if(!Number.isInteger(v)||v<0||v>5) throw new TypeError("Limite d'epreuves invalide.");return v;}]
};
function normalizedRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[key, JSON_COLUMNS.has(key) && typeof value === "string" ? JSON.parse(value) : value]));
}
function canonical(value) {
  if(Array.isArray(value)) return value.map(canonical);
  return value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
}
function rowHash(row) { return createHash("sha256").update(JSON.stringify(canonical(normalizedRow(row)))).digest("hex"); }
function selectRow(row, spec) {
  if (!row || spec.columns.some(key => !Object.hasOwn(row,key))) throw new TypeError("Sauvegarde native incomplete.");
  return Object.fromEntries(spec.columns.map(key=>[key,row[key]]));
}
function emptyRow(table, id, actorUid, now) {
  return Object.fromEntries(SPECS[table].columns.map(key => [key, key === "competition_id" ? id : key === "version" ? "0" : key === "created_by" ? actorUid : key === "created_at" ? now : null]));
}
function planCompetitionChange(pack, input, nowMs = Date.now()) {
  if (fingerprint(pack) !== input.expectedFingerprint) throw new TypeError("La competition a change. Rechargez avant d'enregistrer.");
  const patch = input.patch;
  if (!patch || typeof patch !== "object" || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).length > 25) throw new TypeError("Modification explicite requise.");
  const id = calendar.positiveId(input.competitionId);
  calendar.positiveId(pack.nativeSnapshot?.parameters?.id);
  if(Number(pack.nativeSnapshot?.competition?.id)!==id || Number(pack.nativeSnapshot.parameters.compet)!==id) throw new TypeError("Fiche native incompatible.");
  const now = new Date(nowMs).toISOString().replace("T"," ").replace("Z","000");
  const before = { competitions:selectRow(pack.nativeSnapshot.competition,SPECS.competitions), compet_parametres:selectRow(pack.nativeSnapshot.parameters,SPECS.compet_parametres) };
  const after = structuredClone(before);
  const scope=require("./nap-competition-scope");
  const effectiveLevel=Object.hasOwn(patch,"level") ? patch.level : pack.event.level;
  if(Object.hasOwn(patch,"level") || Object.hasOwn(patch,"regionId")) {
    if(!input.national || !pack.event.nativeLevelRecognized && pack.event.nativeLevelRecognized!==undefined) throw new TypeError("Changement de perimetre reserve au national ; ancien niveau non reconnu.");
    if(!["departemental","regional","national","international"].includes(effectiveLevel)) throw new TypeError("Niveau invalide.");
    if(effectiveLevel!==pack.event.level) after.compet_parametres.niveau=({departemental:0,regional:1,national:2,international:8})[effectiveLevel];
    if(["national","international"].includes(effectiveLevel)) {
      if(patch.regionId) throw new TypeError("Pas de region organisatrice pour ce niveau.");
      if(effectiveLevel!==pack.event.level) after.competitions.comite=effectiveLevel==="national"?4:5;
    } else after.competitions.comite=scope.region(patch.regionId || before.competitions.comite);
  }
  function supplemental(table, row) {
    if (!after[table]) { before[table] = row ? selectRow(row,SPECS[table]) : null; after[table] = row ? structuredClone(before[table]) : emptyRow(table,id,input.actorUid,now); }
    return after[table];
  }
  for (const [field,value] of Object.entries(patch)) {
    if(field === "level" || field === "regionId") continue;
    if(field === "invitedRegionIds") {
      if(!["departemental","regional"].includes(effectiveLevel)) throw new TypeError("Regions invitees reservees aux competitions regionales ou departementales.");
      if(pack.committees.some(row=>Number(row.comite)!==19 && !Object.hasOwn(scope.REGIONS,String(row.comite)))) throw new TypeError("Une admission ancienne doit etre verifiee avant de modifier les regions invitees.");
      if(new Set(pack.committees.map(row=>row.comite)).size!==pack.committees.length) throw new TypeError("Regions natives en doublon : verification requise.");
      const ids=scope.invitations(value,Number(after.competitions.comite));
      supplemental("livepalmes_competition_options",pack.options).invited_region_ids=null;
      after.nativeInvitations=[...ids,...(pack.committees.some(row=>Number(row.comite)===19)?[19]:[])].sort((a,b)=>a-b);
    }
    else if (field === "nativeNationalLevelCode") {
      const codes=[2,3,4,5,7];
      if (!input.national || effectiveLevel !== "national" || pack.event.level !== "national" || !["pool","openWater"].includes(pack.event.competitionType) ||
          !codes.includes(pack.nativeSnapshot.parameters.niveau)) throw new TypeError("Type de championnat reserve a l'administration nationale d'une competition nationale reconnue.");
      if (!Number.isInteger(value) || !codes.includes(value)) throw new TypeError("Type de championnat invalide.");
      after.compet_parametres.niveau=value;
    }
    else if (field === "missingEntryTimeMode") {
      if (!["manual", "forbidden", "default595999"].includes(value)) throw new TypeError("Mode natif de saisie invalide.");
      const nativeMode = {manual: 1, forbidden: -1, default595999: 0}[value];
      if (nativeMode === undefined) throw new TypeError("Mode natif de saisie invalide.");
      after.compet_parametres.saisie = nativeMode;
    }
    else if (nativeFields[field]) { const [table,column,validate]=nativeFields[field]; after[table][column]=validate(value); }
    else if (extraFields[field]) {
      if (field === "teamLeadersWhatsAppUrl" && (!input.national || !["national","international"].includes(pack.event.level))) throw new TypeError("Lien WhatsApp reserve aux competitions nationales.");
      const [column,validate]=extraFields[field]; supplemental("livepalmes_competition_options",pack.options)[column]=validate(value);
    } else if (field === "entryDeadlineLocal") {
      const raw=string(value,19); if(raw && !parisDeadline(raw).iso) throw new TypeError("Date limite de Paris invalide ou ambigue.");
      after.compet_parametres.date_limit=raw || null;
    } else if (field === "entryStatus") {
      if (!["open","upcoming","closed"].includes(value)) throw new TypeError("Statut des engagements invalide.");
      after.compet_parametres.actif=value === "open" ? 1 : 0;
      supplemental("livepalmes_competition_options",pack.options).entry_closed=value === "closed" ? 1 : 0;
    } else if(field === "programSessions") {
      const events=require("./nap-portal-workspaces").competitionItem(pack,input.eventDefinitions).events;
      const known=new Set(events.filter(event=>event.nativeRecognized).map(event=>event.code));
      const previous=typeof pack.detailedProgram?.program_sessions==="string" ? JSON.parse(pack.detailedProgram.program_sessions) : pack.detailedProgram?.program_sessions || [];
      if(previous.some(session=>session.items?.some(item=>!known.has(item.eventCode) && !input.eventDefinitions?.has(item.eventCode))) || Array.isArray(value) && value.some(session=>session.items?.some(item=>!known.has(item.eventCode)))) throw new TypeError("Une course ancienne doit etre raccordee avant de modifier le programme. Elle reste conservee.");
      supplemental("livepalmes_competition_programs",pack.detailedProgram).program_sessions=require("./nap-program-validation").validateProgram(value,events,input.normalizeProgram);
    } else if (field === "courseOptions") {
      const operation=require('./nap-course-options-change').plan(pack,value,input,now);
      before.courseOptions=operation.before;after.courseOptions=operation.after;
    } else if (field === "fees") {
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(k=>!["enabled","swimmerFee","individualEventFee","relayFee","helloAssoUrl"].includes(k))) throw new TypeError("Tarifs invalides.");
      const fees=supplemental("livepalmes_competition_fees",pack.fees); fees.enabled=bool(value.enabled);
      for (const [key,column] of [["swimmerFee","swimmer_fee"],["individualEventFee","individual_event_fee"],["relayFee","relay_fee"]]) {
        const amount=value[key]; if(typeof amount !== "number" || !Number.isFinite(amount) || amount<0 || amount>99999999.99 || Math.abs(amount*100-Math.round(amount*100))>0.000001) throw new TypeError("Tarif a deux decimales requis.");
        fees[column]=amount.toFixed(2);
      }
      const url=string(value.helloAssoUrl || "",300); if(url && (!/^https:\/\//i.test(url) || !calendar.publicUrl(url))) throw new TypeError("Lien de paiement invalide."); fees.helloasso_url=url;
    } else throw new TypeError("Ce champ n'est pas encore raccorde a NAP.");
  }
  const start=after.competitions.date,end=after.competitions.enddate || start;
  if ((Object.hasOwn(patch,"date") || Object.hasOwn(patch,"endDate")) && end<start) throw new TypeError("La date de fin doit suivre la date de debut.");
  if ((Object.hasOwn(patch,"qualificationStartDate") || Object.hasOwn(patch,"qualificationEndDate")) && after.compet_parametres.tps_d && after.compet_parametres.tps_f && after.compet_parametres.tps_d>after.compet_parametres.tps_f) throw new TypeError("Periode des temps invalide.");
  if (patch.entryStatus === "open") {
    const deadline=parisDeadline(after.compet_parametres.date_limit).iso;
    if (!deadline || Date.parse(deadline)<=nowMs) throw new TypeError("Date limite future requise avant ouverture.");
    if (Date.parse(`${start}T00:00:00Z`)-nowMs>30*86400000) throw new TypeError("Ouverture impossible plus de 30 jours avant la competition.");
    if (!pack.courses.length) throw new TypeError("Ajoutez au moins une course avant ouverture.");
    if (!after.competitions.chrono || pack.event.competitionType === "pool" && (!after.competitions.bassin || !after.compet_parametres.nb_lignes)) throw new TypeError("Renseignez le bassin et le chronometrage avant ouverture.");
  }
  const operations=[];
  if(after.courseOptions&&after.nativeInvitations)throw new TypeError('Enregistrez les regions et les reglages de courses separement.');
  for(const [table,row] of Object.entries(after)) {
    if(table==="nativeInvitations") continue;
    if(table==='courseOptions'){
      if(!isDeepStrictEqual(before[table],row))operations.push({table:'livepalmes_course_options',key:'competition_id',before:before[table],after:row});
      continue;
    }
    if (before[table] && isDeepStrictEqual(normalizedRow(before[table]),normalizedRow(row))) continue;
    if (table.startsWith("livepalmes_")) { row.updated_at=now; row.updated_by=input.actorUid; row.version=String(BigInt(before[table]?.version || "0")+1n); }
    operations.push({table,key:SPECS[table].key,before:before[table],after:row});
  }
  if(after.nativeInvitations && !isDeepStrictEqual([...new Set(pack.committees.map(row=>Number(row.comite)))].sort((a,b)=>a-b),after.nativeInvitations)) operations.push({table:"compet_comites",key:"compet",before:pack.committees,after:after.nativeInvitations});
  if (!operations.length) throw new TypeError("Aucune modification a enregistrer.");
  return {competitionId:id,operations};
}
function operationHash(input) {
  if (!/^[a-f0-9]{64}$/.test(input.expectedFingerprint || "") || !input.actorUid || typeof input.patch !== "object" || !input.patch || Array.isArray(input.patch)) throw new TypeError("Fiche actuelle requise.");
  return createHash("sha256").update(JSON.stringify(canonical([calendar.positiveId(input.competitionId), input.actorUid,input.expectedFingerprint,input.patch]))).digest("hex");
}
function authorityGuard(target, snapshot) {
  const clauses=[],values=[];
  for(const table of ["competitions","compet_parametres"]) {
    if(table===target) continue;
    const spec=SPECS[table], row=selectRow(snapshot[table],spec),alias=table==="competitions" ? "scope_c" : "scope_p";
    clauses.push(`EXISTS (SELECT 1 FROM \`${table}\` ${alias} WHERE ${alias}.\`${spec.key}\`=? AND ${spec.columns.map(key=>nativeEqual(`${alias}.\`${key}\``)).join(" AND ")})`);
    values.push(row[spec.key],...spec.columns.map(key=>row[key]));
  }
  return {sql:clauses.join(" AND "),values};
}
function buildStatement(item, authority) {
  const spec=SPECS[item.table];
  if(!spec || item.key!==spec.key) throw new TypeError("Table de correction invalide.");
  const after=selectRow(item.after,spec),before=item.before ? selectRow(item.before,spec) : null;
  const value=(key,row)=>JSON_COLUMNS.has(key) && row[key] != null ? JSON.stringify(normalizedRow(row)[key]) : row[key];
  const scope=authorityGuard(item.table,authority);
  if(before) {
    const columns=spec.columns.filter(key=>!isDeepStrictEqual(normalizedRow(before)[key],normalizedRow(after)[key]));
    if(!columns.length) throw new TypeError("Modification vide.");
    const guard=spec.columns.map(key=>JSON_COLUMNS.has(key) ? `\`${key}\` <=> CAST(? AS JSON)` : nativeEqual(`\`${key}\``)).join(" AND ");
    return {sql:`UPDATE \`${item.table}\` SET ${columns.map(key=>`\`${key}\`=?`).join(",")} WHERE \`${spec.key}\`=? AND ${guard} AND ${scope.sql} LIMIT 1`,values:[...columns.map(key=>value(key,after)),after[spec.key],...spec.columns.map(key=>value(key,before)),...scope.values]};
  }
  if(!item.table.startsWith("livepalmes_")) throw new TypeError("Insertion native interdite.");
  return {sql:`INSERT INTO \`${item.table}\` (${spec.columns.map(key=>`\`${key}\``).join(",")}) SELECT ${spec.columns.map(()=>"?").join(",")} FROM DUAL WHERE ${scope.sql}`,values:[...spec.columns.map(key=>value(key,after)),...scope.values]};
}
async function applyCompetitionChange(pool, input, audit, authorize) {
  if(typeof authorize !== "function") throw new TypeError("Controle du perimetre requis.");
  const operation=operationHash(input), connection=await pool.getConnection();let tablesLocked=false,released=false;
  // MySQL does not support preparing LOCK/UNLOCK TABLES. These are fixed
  // internal statements; every statement containing values stays prepared.
  const query=async(sql,values=[]) => (await (/^(LOCK TABLES|UNLOCK TABLES)/.test(sql) ? connection.query({sql,timeout:10000}) : connection.execute({sql,timeout:10000},values)))[0];
  try {
    let saved=await audit.read(operation);
    const pack=await native.readNativeCompetition(connection,input.competitionId,authorize);
    if (!pack) throw new TypeError("Competition introuvable.");
    if(!saved) {
      const plan=planCompetitionChange(pack,input);
      saved={...plan,actorUid:input.actorUid,expectedFingerprint:input.expectedFingerprint,operation,planHash:rowHash({operations:plan.operations})};
      if(Buffer.byteLength(JSON.stringify(saved))>500000) throw new RangeError("Sauvegarde trop volumineuse.");
      await audit.prepare(operation,saved);
    }
    if(saved.actorUid!==input.actorUid || saved.operation!==operation || saved.competitionId!==calendar.positiveId(input.competitionId) || saved.expectedFingerprint!==input.expectedFingerprint || saved.planHash!==rowHash({operations:saved.operations}) || !Array.isArray(saved.operations) || saved.operations.length>7) throw new TypeError("Sauvegarde incompatible.");
    if(saved.operations.some(item=>item.table==="compet_comites")) {
      if((await query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE='compet_comites' LIMIT 1")).length) throw new TypeError("Declencheur des regions a verifier.");
      // One short, bounded native list replacement. Table locks also serialize
      // IntraNAP writes; an advisory lock alone would not protect that interface.
      await query("LOCK TABLES competitions WRITE, competitions AS scope_c WRITE, compet_parametres WRITE, compet_parametres AS scope_p WRITE, compet_comites WRITE, livepalmes_competition_options WRITE, livepalmes_competition_fees WRITE, livepalmes_competition_programs WRITE");tablesLocked=true;
    }
    // Each statement checks the native rows used for authorization. A concurrent
    // region/date/level/status change cannot slip between authorization and write.
    const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
    let resumed=false;
    for(const item of saved.operations) {
      if(item.table==='livepalmes_course_options'){
        if(tablesLocked)throw new TypeError('Modifiez les regions et les reglages de courses separement.');
        const result=await require('./nap-course-options-change').apply(connection,item,saved.competitionId,authority);resumed=resumed||result.resumed;continue;
      }
      if(item.table==="compet_comites") {
        if(item.key!=="compet" || !Array.isArray(item.before) || item.before.length>50 || item.before.some(row=>!Number.isInteger(row.id)||!Number.isInteger(row.comite)) || !Array.isArray(item.after) || !isDeepStrictEqual([...require("./nap-competition-scope").invitations(item.after.filter(id=>id!==19),0),...(item.before.some(row=>row.comite===19)?[19]:[])].sort((a,b)=>a-b),item.after)) throw new TypeError("Sauvegarde des regions incompatible.");
        const rows=()=>query("SELECT id,comite FROM compet_comites FORCE INDEX(livepalmes_compet_comite_id) WHERE compet=? ORDER BY comite,id LIMIT 51",[saved.competitionId]);
        const current=await rows();
        if(isDeepStrictEqual(current.map(row=>row.comite),item.after)) {resumed=true;continue;}
        if(!isDeepStrictEqual(current,item.before)) throw new TypeError("La liste des regions a change : sauvegarde conservee, verification necessaire.");
        // Recheck both native authority rows under the table locks before a delete.
        for(const table of ["competitions","compet_parametres"]) {
          const spec=SPECS[table],expected=selectRow(authority[table],spec);
          const actual=await query(`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM \`${table}\` WHERE \`${spec.key}\`=? LIMIT 1`,[expected[spec.key]]);
          if(actual.length!==1 || !isDeepStrictEqual(actual[0],expected)) throw new TypeError("Perimetre modifie : regions conservees.");
        }
        const removed=current.filter(row=>!item.after.includes(row.comite));
        if(removed.length) {const result=await query(`DELETE FROM compet_comites WHERE compet=? AND id IN (${removed.map(()=>"?").join(",")})`,[saved.competitionId,...removed.map(row=>row.id)]);if(result.affectedRows!==removed.length) throw new Error("Retrait des regions a verifier.");}
        const added=item.after.filter(id=>!current.some(row=>row.comite===id));
        if(added.length) {const result=await query(`INSERT INTO compet_comites (compet,comite) VALUES ${added.map(()=>"(?,?)").join(",")}`,added.flatMap(id=>[saved.competitionId,id]));if(result.affectedRows!==added.length) throw new Error("Ajout des regions a verifier.");}
        if(!isDeepStrictEqual((await rows()).map(row=>row.comite),item.after)) throw new Error("Liste des regions a verifier : sauvegarde conservee.");
        continue;
      }
      const spec=SPECS[item.table]; if(!spec || item.key!==spec.key) throw new TypeError("Table de correction invalide.");
      const after=selectRow(item.after,spec), before=item.before ? selectRow(item.before,spec) : null;
      if(Number(after[spec.key])!==(spec.key === "competition_id" ? saved.competitionId : item.table === "competitions" ? saved.competitionId : Number(pack.nativeParameters.parameter_id)) || item.table === "compet_parametres" && Number(after.compet)!==saved.competitionId) throw new TypeError("Identifiant de correction incompatible.");
      const read=async()=>query(`SELECT ${spec.columns.map(key=>`\`${key}\``).join(",")} FROM \`${item.table}\` WHERE \`${spec.key}\`=? LIMIT 1`,[after[spec.key]]);
      const current=await read();
      if(current.length===1 && isDeepStrictEqual(normalizedRow(selectRow(current[0],spec)),normalizedRow(after))) { if(Object.hasOwn(authority,item.table)) authority[item.table]=after; resumed=true; continue; }
      if(before ? current.length!==1 || !isDeepStrictEqual(normalizedRow(selectRow(current[0],spec)),normalizedRow(before)) : current.length!==0) throw new TypeError("La competition a change. Rechargez avant de reprendre.");
      const statement=buildStatement(item,authority);
      const result=await query(statement.sql,statement.values);
      if(result.affectedRows!==1) throw new TypeError("Modification concurrente : rechargez la fiche.");
      const verified=await read();
      if(verified.length!==1 || !isDeepStrictEqual(normalizedRow(selectRow(verified[0],spec)),normalizedRow(after))) throw new Error("Verification NAP incomplete : sauvegarde conservee.");
      if(Object.hasOwn(authority,item.table)) authority[item.table]=after;
    }
    if(tablesLocked) {await query("UNLOCK TABLES");tablesLocked=false;}
    // Completion can reread NAP. Return this connection first: the ordinary
    // edit guard already holds the other connection of the bounded pool.
    connection.release();released=true;
    await audit.complete(operation,{competitionId:saved.competitionId,operation,actorUid:input.actorUid,changedTables:saved.operations.map(item=>item.table),verified:true,resumed});
    return {ok:true,source:"nap",operation,resumed};
  } finally { try {if(tablesLocked) await query("UNLOCK TABLES");} catch(error) {connection.destroy();throw error;} finally {if(!released)connection.release();} }
}
module.exports={SPECS,planCompetitionChange,operationHash,applyCompetitionChange,normalizedRow,authorityGuard,buildStatement};
