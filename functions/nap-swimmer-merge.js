"use strict";
// One explicit national action. Fixed table set, grouped indexed reads/writes,
// 4,000 captured links / 500 Ko journal, no production data used in tests.
const {isDeepStrictEqual:equal}=require("node:util");
const plans=require("./nap-swimmer-merge-plan"),schema=require("./nap-approved-swimmer-merge-schema");
const {COLUMNS}=require("./nap-approved-swimmer-correction"),licenses=require("./nap-swimmer-merge-license-plan");
const signature=row=>JSON.stringify(Object.keys(row).sort().map(key=>[key,row[key]]));
function pending(rows,before,change){
  const actual=new Set(rows.map(signature)),allowed=new Set(before.map(signature));
  for(const item of change.updates)allowed.add(signature(item.after));
  if(rows.some(row=>!allowed.has(signature(row))))throw new TypeError("Des liens ont change depuis la preparation de fusion.");
  const updates=change.updates.filter(item=>actual.has(signature(item.before))),removals=change.removals.filter(row=>actual.has(signature(row)));
  for(const row of before){
    const update=change.updates.find(item=>equal(item.before,row));
    if(update){if(!actual.has(signature(update.before))&&!actual.has(signature(update.after)))throw new TypeError("Lien fusionne manquant.");}
    else if(!change.removals.some(item=>equal(item,row))&&!actual.has(signature(row)))throw new TypeError("Lien historique manquant.");
  }
  const expected=before.filter(row=>!change.removals.some(item=>equal(item,row))).map(row=>change.updates.find(item=>equal(item.before,row))?.after||row);
  return {updates,removals,expected};
}
function sameRows(a,b){const left=a.map(signature).sort(),right=b.map(signature).sort();return left.length===right.length&&left.every((value,i)=>value===right[i]);}
async function mergeSwimmers(pool,input,audit,authorize){
  const a=Number(input?.sourceSwimmerId),b=Number(input?.targetSwimmerId);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<=0||b<=0||a===b||a>2147483647||b>2147483647||input.confirmMerge!==true||typeof input.actorUid!=="string"||!input.actorUid||input.actorUid.length>128||![input.sourceFingerprint,input.targetFingerprint].every(value=>/^[a-f0-9]{64}$/.test(value||""))||typeof input.sourceLicenseNumber!=="string"||typeof input.targetLicenseNumber!=="string"||typeof authorize!=="function")throw new TypeError("Confirmation nationale et fiches affichees requises.");
  await authorize();const operation=plans.operation(input),saved=await audit.read(operation);if(saved)plans.validateSaved(saved,input);
  const connection=await pool.getConnection(),locks=[];let locked=false,safe=true,queries=0;
  const query=async(sql,values=[])=>{if(++queries>160)throw new RangeError("Budget de fusion depasse.");return (await connection.execute({sql,timeout:10000},values))[0];};
  const apply=async(statement)=>{
    if(!statement)return;
    const proof=await query(`EXPLAIN ${statement.sql}`,statement.values);
    if(!proof.length||proof.some(row=>row.table&&!String(row.table).startsWith("<")&&!['const','system'].includes(row.type)&&row.select_type!=="INSERT"&&(row.type==="ALL"||!row.key)))throw new TypeError("Plan de fusion non indexe.");
    const result=await query(statement.sql,statement.values);if(result.affectedRows!==statement.count)throw new Error("Fusion interrompue : sauvegarde conservee.");
  };
  const readPeople=async()=>{
    const rows=await query(`SELECT ${COLUMNS.map(column=>`\`${column}\``).join(",")} FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (?,?) ORDER BY id`,[a,b]);
    if(rows.length!==2)throw new TypeError("Une fiche nageur est absente.");
    return {source:rows.find(row=>Number(row.id)===a),target:rows.find(row=>Number(row.id)===b)};
  };
  const readSeasons=()=>query(`SELECT ${licenses.COLUMNS.map(column=>`\`${column}\``).join(",")} FROM livepalmes_swimmer_license_seasons FORCE INDEX (PRIMARY) WHERE swimmer_id IN (?,?) ORDER BY swimmer_id,season LIMIT 101`,[a,b]);
  const readReferences=async(parentIds)=>{
    const result={};let total=0;
    for(const spec of plans.TABLES.filter(item=>item.table!=="engagements")){
      const rows=[];
      for(const field of spec.fields){
        const index=spec.table==="perfs_relais"?`livepalmes_${field}_id`:spec.index;
        const batch=await query(`SELECT * FROM \`${spec.table}\` FORCE INDEX (\`${index}\`) WHERE \`${field}\` IN (?,?)${spec.table==="livepalmes_swimmer_merges"?" AND swimmer_id NOT IN (?,?)":""} ORDER BY ${spec.key.map(key=>`\`${key}\``).join(",")} LIMIT 4001`,spec.table==="livepalmes_swimmer_merges"?[a,b,a,b]:[a,b]);
        if(batch.length>4000)throw new RangeError("Historique trop volumineux pour fusion directe.");
        rows.push(...batch);
      }
      const distinct=new Map(rows.map(row=>[plans.rowKey(row,spec.key),row]));result[spec.table]=[...distinct.values()];total+=distinct.size;
      if(total>4000)throw new RangeError("Fusion superieure a 4000 lignes.");
    }
    const ids=parentIds||result.nageursengager.map(row=>row.id);
    result.engagements=ids.length?await query(`SELECT * FROM engagements FORCE INDEX (engagements_clef) WHERE engagement IN (${ids.map(()=>"?").join(",")}) ORDER BY engagement,id LIMIT 4001`,ids):[];
    if(total+result.engagements.length>4000)throw new RangeError("Fusion superieure a 4000 lignes.");
    return result;
  };
  try{
    for(const id of [a,b].sort((l,r)=>l-r)){const lock=`livepalmes-swimmer-merge-${id}`;if(Number((await query("SELECT GET_LOCK(?,0) AS acquired",[lock]))[0]?.acquired)!==1)throw new TypeError("Nageur en cours de fusion.");locks.push(lock);}
    const structure=schema.validate(await schema.inspect(connection));if(!structure.table||structure.indexes.some(value=>!value))throw new TypeError("Complement de fusion incomplet.");
    const tables=["nageurs",...plans.TABLES.map(spec=>spec.table),"livepalmes_swimmer_license_seasons"];
    if((await query(`SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() AND EVENT_OBJECT_TABLE IN (${tables.map(()=>"?").join(",")}) LIMIT 1`,tables)).length)throw new TypeError("Declencheur natif a verifier avant fusion.");
    await connection.query({sql:`LOCK TABLES ${tables.map(name=>`\`${name}\` WRITE`).join(",")},forfait READ`,timeout:10000});locked=true;
    const people=await readPeople(),markers=await query("SELECT swimmer_id,target_id,merged_at,merged_by FROM livepalmes_swimmer_merges FORCE INDEX (PRIMARY) WHERE swimmer_id IN (?,?) ORDER BY swimmer_id",[a,b]);
    if(markers.length&&(!saved||markers.length!==1||!equal(markers[0],saved.marker)))throw new TypeError("Une fiche est deja fusionnee. Rechargez les listes.");
    const snapshots=await readReferences(saved?.snapshots.nageursengager.map(row=>row.id)),seasons=await readSeasons();
    if(seasons.length>100)throw new RangeError("Historique des licences trop volumineux.");
    const plan=saved||plans.planMerge({...input,timestamp:new Date().toISOString().replace("T"," ").replace("Z","000")},people.source,people.target,snapshots,seasons);
    if(![plan.source,plan.sourceAfter].some(row=>equal(row,people.source))||![plan.target,plan.targetAfter].some(row=>equal(row,people.target)))throw new TypeError("Une fiche a change depuis la preparation.");
    if(plan.licensePlan.adopted&&(await query("SELECT id FROM nageurs FORCE INDEX (livepalmes_license_number_id) WHERE number=? AND id NOT IN (?,?) AND NOT EXISTS (SELECT 1 FROM livepalmes_swimmer_merges WHERE swimmer_id=nageurs.id) LIMIT 1",[plan.licensePlan.licenseNumber,a,b])).length)throw new TypeError("Cette licence appartient aussi a une autre fiche NAP. Verification nationale requise.");
    const competitions=[...new Set(plan.snapshots.nageursengager.map(row=>row.compet))];
    if(competitions.length&&(await query(`SELECT id FROM forfait FORCE INDEX (livepalmes_compet_engagement_id) WHERE compet IN (${competitions.map(()=>"?").join(",")}) LIMIT 1`,competitions)).length)throw new TypeError("Un forfait historique doit etre verifie avant cette fusion.");
    const work=plan.changes.map(change=>({...change,...pending(snapshots[change.table],plan.snapshots[change.table],change)}));
    const licenseWork=pending(seasons,plan.licensePlan.before,{updates:plan.licensePlan.transfers,removals:plan.licensePlan.replacements});
    if(!saved)await audit.prepare(operation,plan);
    // Move courses before deleting an inscription that was present twice.
    for(const change of [...work.filter(item=>item.table==="engagements"),...work.filter(item=>item.table!=="engagements")]){
      await apply(plans.statement(change.table,change.key,change.updates));
      await apply(plans.statement(change.table,change.key,change.removals,true));
    }
    // Free a stale target season record before transferring its existing source
    // owner; the unique (season,license_number) rule is never bypassed.
    await apply(plans.statement("livepalmes_swimmer_license_seasons",["swimmer_id","season"],licenseWork.removals,true));
    await apply(plans.statement("livepalmes_swimmer_license_seasons",["swimmer_id","season"],licenseWork.updates));
    if(!equal(people.target,plan.targetAfter))await apply(plans.statement("nageurs",["id"],[{before:plan.target,after:plan.targetAfter}]));
    if(!equal(people.source,plan.sourceAfter))await apply(plans.statement("nageurs",["id"],[{before:plan.source,after:plan.sourceAfter}]));
    if(!markers.length)await apply({sql:"INSERT INTO livepalmes_swimmer_merges (swimmer_id,target_id,merged_at,merged_by) VALUES (?,?,?,?)",values:[a,b,plan.timestamp,input.actorUid],count:1});
    const verified=await readReferences(plan.snapshots.nageursengager.map(row=>row.id));
    if(work.some(change=>!sameRows(verified[change.table],change.expected))||!sameRows(await readSeasons(),plan.licensePlan.after))throw new Error("Liens fusionnes a verifier ; sauvegarde conservee.");
    const identities=await readPeople(),marker=await query("SELECT swimmer_id,target_id,merged_at,merged_by FROM livepalmes_swimmer_merges FORCE INDEX (PRIMARY) WHERE swimmer_id=? LIMIT 1",[a]);
    if(!equal(identities.source,plan.sourceAfter)||!equal(identities.target,plan.targetAfter)||marker.length!==1||!equal(marker[0],plan.marker))throw new Error("Fusion NAP a verifier.");
    await connection.query({sql:"UNLOCK TABLES",timeout:10000});locked=false;
    const result={ok:true,source:"nap",operation,sourceSwimmerId:String(a),targetSwimmerId:String(b),performanceUpdateCount:plan.changes.find(change=>change.table==="perfs").updates.length,entrySwimmerUpdateCount:plan.changes.find(change=>change.table==="nageursengager").updates.length+plan.changes.find(change=>change.table==="nageursengager").removals.length,relayUpdateCount:plan.changes.filter(change=>["engagements_relayeurs","perfs_relais"].includes(change.table)).reduce((sum,change)=>sum+change.updates.length,0),licenseSeasonTransferCount:plan.licensePlan.transfers.length,publicSnapshot:{ok:true,skipped:true,reason:"Lecture NAP directe"}};
    await audit.complete(operation,{...result,verified:true});
    const season=plan.licensePlan.after.find(row=>Number(row.swimmer_id)===b&&row.season===require("./nap-license-state").currentSeason());
    const validation=season?{license_validation_season:season.season,license_validated_number:season.license_number,license_validation_status:season.status,license_validation_source:season.source,license_validated_at:season.validated_at,license_validated_by:season.validated_by,license_validity_end_date:season.federal_validity_end_date}:{};
    return {...result,target:require("./nap-portal-swimmers").person({...plan.targetAfter,...validation})};
  }finally{
    try{if(locked)await connection.query({sql:"UNLOCK TABLES",timeout:10000});}catch{safe=false;}
    try{for(const lock of locks.reverse())if(Number((await query("SELECT RELEASE_LOCK(?) AS released",[lock]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={mergeSwimmers,pending,sameRows};
