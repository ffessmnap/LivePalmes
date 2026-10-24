"use strict";
const historical=require("./nap-swimmer-recovery-clubs"),{createHash}=require("node:crypto"),{isDeepStrictEqual:equal}=require("node:util");
const digest=value=>createHash("sha256").update(JSON.stringify(value,(_,item)=>item&&typeof item==="object"&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)).digest("hex");
const {pending,sameRows}=require("./nap-swimmer-merge"),plans=require("./nap-swimmer-merge-plan");
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+"T00:00:00Z"))&&new Date(value+"T00:00:00Z").toISOString().slice(0,10)===value;
async function prepare(query,plan,club){
 const snapshots=await historical.readRows(query,plan.id),policy=await historical.prepare(query,plan.before,snapshots);
 const updates=policy.changes.flatMap(change=>change.updates),ids=[...new Set(updates.map(item=>Number(item.before.compet)).filter(id=>Number.isSafeInteger(id)&&id>0))];
 const dates=ids.length?await query(`SELECT id,date FROM competitions FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT 4001`,ids):[];
 const known=new Map(dates.map(row=>[Number(row.id),row.date]));
 const dated=updates.map(item=>known.get(Number(item.before.compet))).filter(validDate).sort();
 const oldId=String(plan.before.club??""),oldRecognized=policy.recognizedClubIds.includes(oldId);
 const old=oldRecognized?(await query("SELECT num_club,abre_club,nom_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club=? LIMIT 1",[Number(oldId)]))[0]:null;
 const summary={oldClubId:oldId,oldClubName:old?.abre_club||old?.nom_club||oldId||"Club inconnu",oldClubRecognized:oldRecognized,newClubId:plan.clubId,newClubName:club.clubCode||club.clubName||plan.clubId,count:updates.length,individualCount:policy.changes[0].updates.length,relayCount:policy.changes[1].updates.length,firstDate:dated[0]||null,lastDate:dated.at(-1)||null,unknownDateCount:updates.length-dated.length,unresolvedCount:Object.values(snapshots).flat().filter(row=>!policy.recognizedClubIds.includes(String(row.club))).length};
 const token=digest({beforeHash:plan.beforeHash,afterHash:plan.afterHash,performanceClubs:policy,summary});
 return {performanceClubs:policy,historicalClubPreview:{...summary,token}};
}
function validate(plan){
 historical.validate(plan);const preview=plan.historicalClubPreview,{token,...summary}=preview||{};
 if(token!==digest({beforeHash:plan.beforeHash,afterHash:plan.afterHash,performanceClubs:plan.performanceClubs,summary}))throw new TypeError("Alerte historique sauvegardee incompatible.");
}
async function check(query,plan,snapshots){
 validate(plan);const rows=snapshots||await historical.readRows(query,plan.id);
 if(!snapshots){const current=await historical.prepare(query,plan.before,plan.performanceClubs.snapshots);if(!equal(current.recognizedClubIds,plan.performanceClubs.recognizedClubIds))throw new TypeError("L'annuaire des clubs historiques a change. Verification nationale requise.");}
 return plan.performanceClubs.changes.map(change=>({...change,...pending(rows[change.table],plan.performanceClubs.snapshots[change.table],change)}));
}
async function apply(query,plan,work){
 for(const change of work){
  const statement=plans.statement(change.table,change.key,change.updates);if(!statement)continue;
  const proof=await query(`EXPLAIN ${statement.sql}`,statement.values);
  if(!proof.length||proof.some(row=>row.table&&!String(row.table).startsWith("<")&&(!row.key||row.type==="ALL")))throw new TypeError("Plan historique non indexe.");
  if((await query(statement.sql,statement.values)).affectedRows!==statement.count)throw new Error("Clubs historiques a verifier ; sauvegarde conservee.");
 }
 const verified=await historical.readRows(query,plan.id);
 if(work.some(change=>!sameRows(verified[change.table],change.expected)))throw new Error("Verification historique incomplete.");
}
module.exports={prepare,validate,check,apply};
