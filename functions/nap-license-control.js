"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const {randomUUID}=require("node:crypto");
const license=require("./nap-license-state");
const {positiveId}=require("./nap-direct-calendar");
const {person}=require("./nap-portal-swimmers");
async function query(connection,sql,values,max) {
  const [rows]=await connection.execute({sql,timeout:10000},values);
  if(rows.length>max) throw new RangeError("Lot de licences trop volumineux. Reduisez la selection.");
  return rows;
}
async function prepareBatch(connection,input) {
  const season=license.seasonInfo(input?.season);
  if(!Array.isArray(input.competitionIds) || !input.competitionIds.length || input.competitionIds.length>5) throw new TypeError("Selectionnez une a cinq competitions.");
  const ids=[...new Set(input.competitionIds.map(positiveId))],marks=ids.map(()=>"?").join(",");
  const competitions=await query(connection,`SELECT id,libelle AS name,date FROM competitions FORCE INDEX (PRIMARY) WHERE id IN (${marks}) ORDER BY id LIMIT 6`,ids,5);
  if(competitions.length!==ids.length || competitions.some(row=>!row.date || row.date<season.startDate || row.date>season.endDate)) throw new TypeError("Competition absente ou hors saison.");
  const rows=await query(connection,`SELECT e.compet,n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,cl.abre_club,cl.nom_club,${license.projection()} FROM nageursengager e FORCE INDEX (livepalmes_compet_nageur_id) LEFT JOIN nageurs n ON n.id=e.nageur LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${license.join("n","v",season.label)} WHERE e.compet IN (${marks}) ORDER BY e.compet,e.nageur,e.id LIMIT 4001`,ids,4000);
  const relayRows=await query(connection,`SELECT r.compet,n.id,n.nom,n.prenom,n.date,n.sexe,n.number,n.club,cl.abre_club,cl.nom_club,${license.projection()} FROM engagements_relais r FORCE INDEX (livepalmes_compet_club_id) STRAIGHT_JOIN engagements_relayeurs m FORCE INDEX (livepalmes_relais_pos_id) ON m.relais=r.id LEFT JOIN nageurs n ON n.id=m.nageur LEFT JOIN clubs cl ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club ${license.join("n","v",season.label)} WHERE r.compet IN (${marks}) ORDER BY r.compet,r.id,m.pos,m.id LIMIT 4001`,ids,4000);
  const people=new Map();
  for(const row of [...rows,...relayRows]) {
    if(!row.id) throw new TypeError("Inscription sans fiche NAP.");
    const id=String(row.id),competition=competitions.find(item=>Number(item.id)===Number(row.compet));
    if(!people.has(id)) people.set(id,{...person(row),...license.state(row,season.label),livePalmesId:id,expectedLicenseNumber:license.number(row.number),seasonStatus:license.state(row,season.label).licenseSeasonStatus,validatedAt:row.license_validated_at||"",validationSource:row.license_validation_source||"",federalValidityEndDate:row.license_validity_end_date||"",competitionIds:[],competitions:[]});
    const target=people.get(id);
    if(!target.competitionIds.includes(String(row.compet))) {target.competitionIds.push(String(row.compet));target.competitions.push(competition.name);}
  }
  if(people.size>800) throw new RangeError("Le lot depasse 800 nageurs.");
  return {ok:true,source:"nap",batchId:`licences-${season.label}-${randomUUID()}`,season,competitions:competitions.map(item=>({...item,id:String(item.id)})),people:[...people.values()].sort((a,b)=>a.lastName.localeCompare(b.lastName,"fr")||a.firstName.localeCompare(b.firstName,"fr")),readStats:{nativeQueries:3,maxNativeRows:8005}};
}
function validDate(value) {
  return typeof value==="string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value+"T00:00:00Z")) && new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;
}
async function validateBatch(connection,input,actorUid,audit) {
  const season=license.seasonInfo(input?.season),source=input?.source;
  if(!["admin_import","national_manual"].includes(source) || !actorUid || actorUid.length>128 || !Array.isArray(input.items) || !input.items.length || input.items.length>100) throw new TypeError("Lot de validation invalide.");
  const ids=new Set(),numbers=new Set();
  const items=input.items.map(raw=>{
    const id=positiveId(raw.swimmerIndexId||raw.livePalmesId),number=license.number(raw.licenseNumber),expiry=raw.federalValidityEndDate||null;
    if(ids.has(id)||!number||number.length>100||/[\u0000-\u001f\u007f]/.test(number)||numbers.has(number.toUpperCase())||typeof raw.expectedLicenseNumber!=="string") throw new TypeError("Licence absente, invalide ou dupliquee.");
    if(source==="admin_import" && (!validDate(expiry)||expiry<season.requiredValidityDate)) throw new TypeError("La licence ne couvre pas la saison demandee.");
    ids.add(id);numbers.add(number.toUpperCase());return {id,number,expected:raw.expectedLicenseNumber,expiry:validDate(expiry)?expiry:null};
  });
  const marks=items.map(()=>"?").join(",");
  // Check every proposed owner before correcting anything. Uses the approved number index.
  const owners=await query(connection,`SELECT id,number FROM nageurs FORCE INDEX (livepalmes_license_number_id) WHERE number IN (${marks}) AND ${notMerged()} LIMIT 201`,items.map(item=>item.number),200);
  if(owners.some(owner=>!items.some(item=>item.id===Number(owner.id)&&item.number.toUpperCase()===license.number(owner.number).toUpperCase()))) throw new TypeError("Une licence appartient deja a une autre fiche NAP.");
  // Corrections have their own durable journal and are intentionally outside the
  // InnoDB transaction: native nageurs is MyISAM. A retry resumes verified writes.
  await require("./nap-license-correction").correctLicenses(connection,items,actorUid,audit);
  const verifiedOwners=await query(connection,`SELECT id,number FROM nageurs FORCE INDEX (livepalmes_license_number_id) WHERE number IN (${marks}) AND ${notMerged()} LIMIT 201`,items.map(item=>item.number),200);
  if(verifiedOwners.length!==items.length || verifiedOwners.some(owner=>!items.some(item=>item.id===Number(owner.id)&&item.number.toUpperCase()===license.number(owner.number).toUpperCase()))) throw new TypeError("Conflit de licence apres correction : rechargez le lot.");
  await connection.beginTransaction();
  try {
    const previous=await query(connection,`SELECT swimmer_id,license_number FROM livepalmes_swimmer_license_seasons FORCE INDEX (season_license) WHERE season=? AND license_number IN (${marks}) LIMIT 101 FOR UPDATE`,[season.label,...items.map(item=>item.number)],100);
    if(previous.some(row=>!items.some(item=>item.id===Number(row.swimmer_id)&&item.number.toUpperCase()===license.number(row.license_number).toUpperCase()))) throw new TypeError("Cette licence est deja validee pour une autre fiche pendant cette saison.");
    const tuples=items.map(()=>"SELECT ? AS swimmer_id,? AS season,? AS license_number,? AS status,? AS source,? AS expiry,? AS actor").join(" UNION ALL ");
    const values=items.flatMap(item=>[item.id,season.label,item.number,"valid",source,item.expiry,actorUid]);
    await connection.execute({sql:`INSERT INTO livepalmes_swimmer_license_seasons (swimmer_id,season,license_number,status,source,federal_validity_end_date,validated_at,validated_by,version) SELECT t.swimmer_id,t.season,t.license_number,t.status,t.source,t.expiry,UTC_TIMESTAMP(6),t.actor,1 FROM (${tuples}) t JOIN nageurs n ON n.id=t.swimmer_id WHERE ${notMerged("n")} AND BINARY CONVERT(n.number USING utf8mb4)=BINARY CONVERT(t.license_number USING utf8mb4) ON DUPLICATE KEY UPDATE license_number=VALUES(license_number),status=VALUES(status),source=VALUES(source),federal_validity_end_date=VALUES(federal_validity_end_date),validated_at=VALUES(validated_at),validated_by=VALUES(validated_by),version=version+1`,timeout:10000},values);
    const rows=await query(connection,`SELECT n.id,n.number,${license.projection()} FROM nageurs n FORCE INDEX (PRIMARY) ${license.join("n","v",season.label)} WHERE n.id IN (${marks}) AND ${notMerged("n")} LIMIT 101`,items.map(item=>item.id),100);
    if(rows.length!==items.length || rows.some(row=>license.state(row,season.label).licenseSeasonStatus!=="valid" || !items.some(item=>item.id===Number(row.id)&&item.number===license.number(row.number)))) throw new Error("Verification des validations incomplete.");
    await connection.commit();
    return {ok:true,source:"nap",season:season.label,validatedCount:items.length,validatedAt:new Date().toISOString()};
  } catch(error) {await connection.rollback();throw error;}
}
module.exports={prepareBatch,validateBatch,validDate};
