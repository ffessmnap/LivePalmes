"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const {createHash}=require("node:crypto");
const {reviewWinPalmeResults,compactTime}=require("./nap-winpalme-results");
const {resolveSwimmers}=require("./nap-import-swimmer-resolution");
const {COLUMNS,positiveId}=require("./nap-performance-change-plan");
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
const q=async(pool,sql,values=[])=>(await pool.execute({sql,timeout:10000},values))[0];
function choices(input,limit) {
  if(!Array.isArray(input)||input.length>limit)throw new TypeError("Choix de rattachement hors limite.");
  return input;
}
async function previewNativeImport(pool,input) {
  const decoded=reviewWinPalmeResults(input.rawText,input.excludedSourceLines||[]);
  if(input.competitionId===undefined || input.competitionId==="") {
    const competitions=await q(pool,"SELECT id,libelle,date,lieu,bassin,chrono FROM competitions FORCE INDEX (livepalmes_date_id) WHERE date=? ORDER BY id LIMIT 21",[decoded.metadata.date]);
    return {source:"nap",decoded,competitions,requiresCompetitionChoice:true,canConfirm:false};
  }
  const competitionId=positiveId(Number(input.competitionId));
  const competitions=await q(pool,"SELECT id,libelle,date,lieu,bassin,chrono FROM competitions WHERE id=? LIMIT 1",[competitionId]);
  if(competitions.length!==1)throw new TypeError("Competition NAP introuvable.");
  const competition=competitions[0];
  const individual=decoded.rows.filter(r=>r.kind==="NAG");
  const swimmerBindings=choices(input.swimmerBindings||[],5000),memberBindings=choices(input.memberBindings||[],2000),clubBindings=choices(input.clubBindings||[],1000);
  const selectedIds=[...new Set([...swimmerBindings,...memberBindings].map(b=>positiveId(b.swimmerId)))];
  const names=[...new Set(individual.map(r=>r.lastName))];
  const named=names.length?await q(pool,`SELECT id,nom,prenom,date,sexe,club FROM nageurs FORCE INDEX (nageurs_clef) WHERE nom IN (${names.map(()=>"?").join(",")}) AND ${notMerged()} ORDER BY nom,prenom,date LIMIT 10001`,names):[];
  if(named.length>10000)throw new RangeError("Trop de fiches candidates. Reduisez le lot avant import.");
  const selected=selectedIds.length?await q(pool,`SELECT id,nom,prenom,date,sexe,club FROM nageurs WHERE id IN (${selectedIds.map(()=>"?").join(",")}) AND ${notMerged()} LIMIT 7001`,selectedIds):[];
  const candidates=[...new Map([...named,...selected].map(r=>[r.id,r])).values()];
  if(candidates.length>10000)throw new RangeError("Trop de fiches candidates.");
  const seen=new Set();
  const bindings=swimmerBindings.map(b=>{
    const rowIndex=individual.findIndex(r=>r.sourceLine===b.sourceLine);
    if(rowIndex<0||seen.has(b.sourceLine))throw new TypeError("Ligne de nageur choisie invalide.");seen.add(b.sourceLine);
    return {rowIndex,swimmerId:b.swimmerId};
  });
  const resolution=individual.length?resolveSwimmers(individual,candidates,bindings):{canConfirm:true,resolved:[],unresolved:[]};
  const swimmerByLine=new Map(resolution.resolved.map(r=>[individual[r.rowIndex].sourceLine,r.swimmerId]));
  const hints=new Map();
  for(const row of individual)if(row.swimmerHint&&swimmerByLine.has(row.sourceLine)) {
    const ids=hints.get(row.swimmerHint)||new Set();ids.add(swimmerByLine.get(row.sourceLine));hints.set(row.swimmerHint,ids);
  }
  const clubs=await q(pool,"SELECT num_club,abre_club,nom_club FROM clubs FORCE INDEX (PRIMARY) ORDER BY num_club LIMIT 1001");
  if(clubs.length>1000)throw new RangeError("Referentiel clubs trop volumineux : recherche ciblee requise.");
  const clubChoices=new Map();
  for(const b of clubBindings){if(typeof b.code!=="string"||!decoded.rows.some(r=>r.clubCode===b.code)||clubChoices.has(b.code)||!clubs.some(c=>String(c.num_club)===String(b.clubId)))throw new TypeError("Choix de club invalide.");clubChoices.set(b.code,String(b.clubId));}
  const clubByCode=new Map(),unresolvedClubs=[];
  for(const code of new Set(decoded.rows.map(r=>r.clubCode))) {
    const matches=clubs.filter(c=>String(c.abre_club||"").trim().toUpperCase()===code.toUpperCase());
    if(clubChoices.has(code))clubByCode.set(code,clubChoices.get(code));
    else if(matches.length===1)clubByCode.set(code,String(matches[0].num_club));
    else unresolvedClubs.push({code,candidateIds:matches.map(c=>String(c.num_club))});
  }
  const memberChoices=new Map();
  for(const b of memberBindings){const key=`${b.sourceLine}:${b.position}`;if(!decoded.rows.some(r=>r.kind==="REL"&&r.sourceLine===b.sourceLine)||!Number.isInteger(b.position)||b.position<1||b.position>4||memberChoices.has(key)||!candidates.some(c=>c.id===b.swimmerId))throw new TypeError("Choix de relayeur invalide.");memberChoices.set(key,b.swimmerId);}
  const relayMembers=new Map(),unresolvedMembers=[];
  for(const row of decoded.rows.filter(r=>r.kind==="REL")) {
    const members=[];
    for(let position=1;position<=4;position++) {
      const key=`${row.sourceLine}:${position}`,matches=hints.get(row.memberHints[position-1]);
      const id=memberChoices.get(key)||(matches?.size===1?[...matches][0]:null);
      members.push(id);if(!id)unresolvedMembers.push({sourceLine:row.sourceLine,position,hint:row.memberHints[position-1]||""});
    }
    relayMembers.set(row.sourceLine,members);
  }
  const existing=await q(pool,`SELECT ${COLUMNS.map(c=>`\`${c}\``).join(",")} FROM perfs FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 5001`,[competitionId]);
  const existingRelays=await q(pool,"SELECT id,club,distance,nageur1,nageur2,nageur3,nageur4,tps1,tps2,tps3,tps4,categorie,pts,compet FROM perfs_relais FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 1001",[competitionId]);
  if(existing.length>5000||existingRelays.length>1000)throw new RangeError("Resultats existants hors limite de remplacement.");
  const issues=[...decoded.issues];
  if(competition.date!==decoded.metadata.date)issues.push({sourceLine:0,code:"competition-date-mismatch"});
  if(String(competition.bassin)!==decoded.metadata.pool)issues.push({sourceLine:0,code:"competition-pool-mismatch"});
  if(!["E","M"].includes(decoded.metadata.timing)||competition.chrono!==decoded.metadata.timing)issues.push({sourceLine:0,code:"competition-timing-mismatch"});
  const incoming=[],incomingRelays=[],statusRows=[];
  const integer=value=>{if(!/^\d{1,9}$/.test(String(value)))return null;return Number(value);};
  for(const row of decoded.rows) {
    if(!row.eligible){statusRows.push({...row,swimmerId:swimmerByLine.get(row.sourceLine)||null,clubId:clubByCode.get(row.clubCode)||null,members:row.kind==="REL"?relayMembers.get(row.sourceLine):undefined});continue;}
    const club=clubByCode.get(row.clubCode),points=integer(row.points),rank=integer(row.rank);
    if(points===null||rank===null)issues.push({sourceLine:row.sourceLine,code:"invalid-points-or-rank"});
    if(row.kind==="REL") {
      const members=relayMembers.get(row.sourceLine);
      if(members.every(Boolean)&&new Set(members).size!==4)issues.push({sourceLine:row.sourceLine,code:"duplicate-relay-member"});
      incomingRelays.push({sourceLine:row.sourceLine,row:{club,distance:row.course,nageur1:members[0],nageur2:members[1],nageur3:members[2],nageur4:members[3],tps1:compactTime(row.splits[0])||"000000",tps2:compactTime(row.splits[1])||"000000",tps3:compactTime(row.splits[2])||"000000",tps4:row.time,categorie:row.category,pts:points,compet:competitionId}});
      continue;
    }
    const native={nageur:swimmerByLine.get(row.sourceLine),compet:competitionId,course:row.course,cat:row.category,tps:row.time,points,newpoints:0,passage:0,club,relais:0,pid:null,classement:rank};
    incoming.push({sourceLine:row.sourceLine,row:native});
    const course=/^(\d+)(SF|BI|IS|AP)$/.exec(row.course);
    if(!course)issues.push({sourceLine:row.sourceLine,code:"unsupported-course"});
    else row.splits.forEach((value,index)=>{
      const time=compactTime(value),distance=[100,200,400,800][index];
      if(time&&distance<Number(course[1]))incoming.push({sourceLine:row.sourceLine,row:{...native,course:`${distance}${course[2]}`,tps:time,points:0,passage:1,classement:0}});
    });
  }
  if(incoming.length>5000)throw new RangeError("Plus de 5 000 performances avec passages : reduisez le lot.");
  const canConfirm=decoded.confirmable&&issues.length===0&&resolution.canConfirm&&unresolvedClubs.length===0&&unresolvedMembers.length===0;
  return {source:"nap",competition,decoded,resolution,candidates,clubs,unresolvedClubs,unresolvedMembers,incoming,incomingRelays,statusRows,existing,existingRelays,issues,canConfirm,
    expectedFingerprint:hash({competition,existing,existingRelays}),previewFingerprint:hash({fileHash:decoded.fileHash,excluded:decoded.excluded.map(r=>r.sourceLine),competition,existing,existingRelays,incoming,incomingRelays,statusRows})};
}
module.exports={previewNativeImport,hash};
