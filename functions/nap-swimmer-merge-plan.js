"use strict";
const {createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const {COLUMNS}=require("./nap-approved-swimmer-correction"),{fingerprint}=require("./nap-portal-swimmer-change");
const {number}=require("./nap-license-state"),licenses=require("./nap-swimmer-merge-license-plan");
const {nativeEqual}=require("./nap-native-compare");
const TABLES=[
  ...["engagements_relayeurs","txt_nageurs"].map(table=>({table,fields:["nageur"],key:["id"],index:"livepalmes_nageur_id"})),
  {table:"perfs",fields:["nageur"],key:["id"],index:"nageur"},
  {table:"perfs_relais",fields:["nageur1","nageur2","nageur3","nageur4"],key:["id"],index:"livepalmes_nageur"},
  {table:"nageursengager",fields:["nageur"],key:["id"],index:"nageursengager_clef"},
  {table:"livepalmes_qualification_grants",fields:["swimmer_id"],key:["competition_id","swimmer_id","event_code"],index:"livepalmes_swimmer_compet_event"},
  {table:"livepalmes_swimmer_merges",fields:["target_id"],key:["swimmer_id"],index:"target_swimmer"},
  {table:"engagements",fields:["engagement"],key:["id"],index:"engagements_clef"}
];
const rowKey=(row,keys)=>JSON.stringify(keys.map(key=>String(row[key])));
function operation(input){return createHash("sha256").update(JSON.stringify(["swimmer-merge",input.actorUid,String(input.sourceSwimmerId),String(input.targetSwimmerId),input.sourceFingerprint,input.targetFingerprint,...(input.finalClubId!==undefined?[String(input.finalClubId)]:[])])).digest("hex");}
function planMerge(input,source,target,snapshots,seasonRows,performanceClubPolicy,forfeitPolicy){
  const a=Number(input.sourceSwimmerId),b=Number(input.targetSwimmerId);
  if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<=0||b<=0||a===b||a>2147483647||b>2147483647||input.confirmMerge!==true||!input.actorUid||input.actorUid.length>128||!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d\.\d{6}$/.test(input.timestamp||""))throw new TypeError("Deux fiches et confirmation nationale requises.");
  if(Number(source?.id)!==a||Number(target?.id)!==b||COLUMNS.some(key=>!Object.hasOwn(source,key)||!Object.hasOwn(target,key))||fingerprint(source)!==input.sourceFingerprint||fingerprint(target)!==input.targetFingerprint||number(source.number)!==input.sourceLicenseNumber||number(target.number)!==input.targetLicenseNumber)throw new TypeError("Une fiche ou licence a change. Rechargez avant de fusionner.");
  if(String(source.club)!==String(target.club)&&input.confirmClubMismatch!==true)throw new TypeError("Les clubs sont differents. Confirmation speciale requise.");
  if(number(source.number)&&number(target.number)&&number(source.number)!==number(target.number)&&input.confirmLicenseMismatch!==true)throw new TypeError("Les licences sont differentes. Confirmation speciale requise.");
  if(!snapshots||Object.keys(snapshots).length!==TABLES.length)throw new TypeError("Historique de fusion incomplet.");
  let total=0;
  for(const spec of TABLES){
    const rows=snapshots[spec.table],keys=new Set();
    if(!Array.isArray(rows)||rows.length>4000)throw new RangeError("Historique trop volumineux.");total+=rows.length;
    for(const row of rows){
      if(Object.keys(row).some(key=>!/^[a-z][a-z0-9_]*$/.test(key))||[...spec.key,...spec.fields].some(key=>!Object.hasOwn(row,key)))throw new TypeError("Ligne native incomplete.");
      const key=rowKey(row,spec.key);if(keys.has(key))throw new TypeError("Ligne native dupliquee.");keys.add(key);
      if(spec.table!=="engagements"&&!spec.fields.some(field=>[a,b].includes(Number(row[field]))))throw new TypeError("Lien natif hors fusion.");
    }
  }
  if(total>4000)throw new RangeError("Fusion superieure a 4000 lignes.");
  if(snapshots.livepalmes_swimmer_merges.some(row=>[a,b].includes(Number(row.swimmer_id))))throw new TypeError("Une fiche est deja fusionnee.");
  for(const table of ["engagements_relayeurs","perfs_relais"]){
    const rows=snapshots[table];
    if(table==="engagements_relayeurs"&&rows.some(row=>Number(row.nageur)===a&&rows.some(other=>Number(other.nageur)===b&&Number(other.relais)===Number(row.relais))))throw new TypeError("Les deux nageurs sont dans le meme relais. Corrigez ce relais avant de fusionner.");
    if(table==="perfs_relais"&&rows.some(row=>TABLES.find(spec=>spec.table===table).fields.some(field=>Number(row[field])===a)&&TABLES.find(spec=>spec.table===table).fields.some(field=>Number(row[field])===b)))throw new TypeError("Les deux nageurs sont dans le meme resultat relais. Verification nationale requise.");
  }
  const entries=require("./nap-swimmer-merge-entries").resolve(input,snapshots),parentRedirect=entries.redirect;
  const changes=TABLES.map(spec=>({table:spec.table,key:spec.key,updates:[],removals:[]}));
  for(const spec of TABLES){
    const change=changes.find(item=>item.table===spec.table);
    for(const row of snapshots[spec.table]){
      let after={...row},remove=false;
      if(spec.table==="nageursengager"&&parentRedirect.has(Number(row.id)))remove=true;
      else if(spec.table==="engagements"){
        const redirect=parentRedirect.get(Number(row.engagement));
        if(entries.removals.has(Number(row.id)))remove=true;else if(redirect)after.engagement=redirect;
      }else for(const field of spec.fields)if(Number(row[field])===a)after[field]=target.id;
      if(performanceClubPolicy&&["perfs","perfs_relais"].includes(spec.table))after.club=require("./nap-swimmer-merge-clubs").historicalClub(spec.table,row,source,target,performanceClubPolicy);
      if(spec.table==="livepalmes_qualification_grants"&&!equal(after,row)&&snapshots[spec.table].some(other=>other!==row&&rowKey(other,spec.key)===rowKey(after,spec.key)))throw new TypeError("Deux derogations concernent la meme course. Verification nationale requise avant fusion.");
      if(remove)change.removals.push({...row});else if(!equal(row,after))change.updates.push({before:{...row},after});
    }
  }
  const permanentDelete=input.permanentDelete!==false;
  const priorMarker=input.priorMarker;
  if(priorMarker&&(!permanentDelete||Object.keys(priorMarker).sort().join(",")!=="merged_at,merged_by,swimmer_id,target_id"||Number(priorMarker.swimmer_id)!==a||Number(priorMarker.target_id)!==b||Number(source.actif)!==0||!priorMarker.merged_at||!priorMarker.merged_by))throw new TypeError("Ancienne fusion incompatible avec cette finalisation.");
  if(input.finalClubId!==undefined&&(!/^[1-9]\d{0,15}$/.test(String(input.finalClubId))||!Number.isSafeInteger(Number(input.finalClubId))))throw new TypeError("Club final invalide.");
  if(String(source.club)!==String(target.club)&&input.finalClubId===undefined&&!input.allowLegacyClub)throw new TypeError("Choisissez explicitement le club final avant de fusionner.");
  const licensePlan=licenses.planLicenseTransfer(source,target,seasonRows,permanentDelete);
  const plan={kind:"native-swimmer-merge",operation:operation(input),actorUid:input.actorUid,sourceSwimmerId:String(a),targetSwimmerId:String(b),sourceFingerprint:input.sourceFingerprint,targetFingerprint:input.targetFingerprint,sourceLicenseNumber:input.sourceLicenseNumber,targetLicenseNumber:input.targetLicenseNumber,confirmClubMismatch:input.confirmClubMismatch===true,confirmLicenseMismatch:input.confirmLicenseMismatch===true,timestamp:input.timestamp,source:{...source},target:{...target},sourceAfter:{...source,actif:0},targetAfter:{...target,actif:1,number:licensePlan.licenseNumber},snapshots,licensePlan,changes,marker:{swimmer_id:a,target_id:b,merged_at:input.timestamp,merged_by:input.actorUid}};
  if(input.finalClubId!==undefined){plan.finalClubId=String(input.finalClubId);plan.targetAfter.club=plan.finalClubId;}
  if(performanceClubPolicy)plan.performanceClubPolicy=performanceClubPolicy;
  if(forfeitPolicy)plan.forfeitPolicy=require("./nap-swimmer-merge-forfeits").validate(forfeitPolicy,snapshots);
  if(permanentDelete)plan.permanentDelete=true;
  if(priorMarker){plan.priorMarker={...priorMarker};plan.marker={...priorMarker};}
  if(entries.resolution)plan.entryResolution=entries.resolution;
  require("./nap-swimmer-merge-backup").encode(plan);
  return plan;
}
function validateSaved(plan,input){
  if(!plan.snapshots||Object.keys(plan.snapshots).some(name=>!TABLES.some(spec=>spec.table===name)))throw new TypeError("Ancien plan de fusion hors perimetre courant. Reprise manuelle du journal requise avant toute ecriture.");
  if(plan.finalClubId!==undefined&&String(input.finalClubId)!==plan.finalClubId)throw new TypeError("Le club final differe de la fusion sauvegardee.");
  if(plan.entryResolution&&input.entryConflictChoices!==undefined&&(!Array.isArray(input.entryConflictChoices)||!equal(input.entryConflictChoices.map(row=>({key:row?.key,id:String(row?.id)})).sort((a,b)=>String(a.key).localeCompare(String(b.key))),plan.entryResolution.choices)||input.entryConflictToken!==plan.entryResolution.token))throw new TypeError("Les choix d'engagements different de la fusion sauvegardee.");
  if(!plan.entryResolution&&(input.entryConflictChoices!==undefined||input.entryConflictToken!==undefined))throw new TypeError("Choix d'engagements absents de la fusion sauvegardee.");
  if(![number(plan.source.number),number(plan.sourceAfter.number)].includes(input.sourceLicenseNumber)||![number(plan.target.number),number(plan.targetAfter.number)].includes(input.targetLicenseNumber))throw new TypeError("La licence differe de la fusion sauvegardee.");
  if(!equal(plan,planMerge({...input,...(plan.entryResolution?{entryConflictChoices:plan.entryResolution.choices,entryConflictToken:plan.entryResolution.token}:{}),allowLegacyClub:true,finalClubId:plan.finalClubId,priorMarker:plan.priorMarker,permanentDelete:plan.permanentDelete===true,sourceLicenseNumber:plan.sourceLicenseNumber,targetLicenseNumber:plan.targetLicenseNumber,confirmClubMismatch:plan.confirmClubMismatch,confirmLicenseMismatch:plan.confirmLicenseMismatch,timestamp:plan.timestamp},plan.source,plan.target,plan.snapshots,plan.licensePlan.before,plan.performanceClubPolicy,plan.forfeitPolicy)))throw new TypeError("Sauvegarde de fusion incompatible.");
}
function statement(table,key,rows,remove=false){
  if(!rows.length)return null;
  if(![...TABLES.map(item=>item.table),"nageurs","livepalmes_swimmer_license_seasons"].includes(table))throw new TypeError("Table de fusion invalide.");
  const keyEqual=column=>["id","swimmer_id","competition_id"].includes(column)?`\`${column}\`=?`:nativeEqual(`\`${column}\``);
  const values=[],before=rows.map(item=>item.before||item),guard=before.map(row=>{
    const columns=[...key,...Object.keys(row).filter(column=>!key.includes(column))];values.push(...columns.map(column=>row[column]));return `(${columns.map(column=>key.includes(column)?keyEqual(column):nativeEqual(`\`${column}\``)).join(" AND ")})`;
  }).join(" OR ");
  if(remove)return {sql:`DELETE FROM \`${table}\` WHERE ${guard}`,values,count:rows.length};
  const changed=[...new Set(rows.flatMap(item=>Object.keys(item.after).filter(column=>!equal(item.before[column],item.after[column]))))];
  if(!changed.length)return null;
  const setValues=[],set=changed.map(column=>{
    const cases=rows.filter(item=>!equal(item.before[column],item.after[column])).map(item=>{setValues.push(...key.map(k=>item.before[k]),item.after[column]);return `WHEN ${key.map(keyEqual).join(" AND ")} THEN ?`;});
    return `\`${column}\`=CASE ${cases.join(" ")} ELSE \`${column}\` END`;
  }).join(",");
  return {sql:`UPDATE \`${table}\` SET ${set} WHERE ${guard}`,values:[...setValues,...values],count:rows.length};
}
module.exports={TABLES,rowKey,operation,planMerge,validateSaved,statement};
