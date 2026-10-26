"use strict";
const {notMerged}=require("./nap-swimmer-merge-state");
const {createHash}=require("node:crypto");
const {reviewWinPalmeResults,compactTime}=require("./nap-winpalme-results");
const {parseCompactTime}=require("./nap-duration");
const {resolveSwimmers,identity}=require("./nap-import-swimmer-resolution");
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
  const courseReview=await require("./nap-import-courses").prepareCourses(pool,decoded,input);
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
  const clubs=await q(pool,"SELECT num_club,abre_club,nom_club,federal_club FROM clubs FORCE INDEX (PRIMARY) ORDER BY num_club LIMIT 1001");
  if(clubs.length>1000)throw new RangeError("Referentiel clubs trop volumineux : recherche ciblee requise.");
  const clubChoices=new Map();
  for(const b of clubBindings){if(typeof b.code!=="string"||!decoded.rows.some(r=>r.clubCode===b.code)||clubChoices.has(b.code)||!clubs.some(c=>String(c.num_club)===String(b.clubId)))throw new TypeError("Choix de club invalide.");clubChoices.set(b.code,String(b.clubId));}
  const clubByCode=new Map(),unresolvedClubs=[],clubMatches=[];
  const matchClub=input.sourceType==="winpalme-zip-preview"?require("./nap-import-clubs").createClubMatcher(clubs,decoded.clubs):null;
  for(const code of new Set(decoded.rows.map(r=>r.clubCode))) {
    const matches=matchClub?[]:clubs.filter(c=>String(c.abre_club||"").trim().toUpperCase()===code.toUpperCase());
    if(clubChoices.has(code)){clubByCode.set(code,clubChoices.get(code));clubMatches.push({code,id:clubChoices.get(code),method:"national-choice"});}
    else if(matchClub){const match=matchClub(code);if(match.id){clubByCode.set(code,match.id);clubMatches.push(match);}else unresolvedClubs.push(match);}
    else if(matches.length===1)clubByCode.set(code,String(matches[0].num_club));
    else unresolvedClubs.push({code,candidateIds:matches.map(c=>String(c.num_club))});
  }
  const memberChoices=new Map();
  for(const b of memberBindings){const key=`${b.sourceLine}:${b.position}`;if(!decoded.rows.some(r=>r.kind==="REL"&&r.sourceLine===b.sourceLine)||!Number.isInteger(b.position)||b.position<1||b.position>4||memberChoices.has(key)||!candidates.some(c=>c.id===b.swimmerId))throw new TypeError("Choix de relayeur invalide.");memberChoices.set(key,b.swimmerId);}
  const relayMembers=new Map(),unresolvedMembers=[],relayBindingIssues=[];
  for(const row of decoded.rows.filter(r=>r.kind==="REL")) {
    const members=[];
    for(let position=1;position<=4;position++) {
      const key=`${row.sourceLine}:${position}`,matches=hints.get(row.memberHints[position-1]);
      const autoId=matches?.size===1?[...matches][0]:null,chosen=memberChoices.get(key);
      if(input.sourceType==="winpalme-zip-preview"&&autoId&&chosen&&autoId!==chosen)relayBindingIssues.push({sourceLine:row.sourceLine,code:"relay-binding-conflict",context:{course:row.course,clubCode:row.clubCode,position,relatedSourceLines:individual.filter(r=>r.swimmerHint===row.memberHints[position-1]).map(r=>r.sourceLine)}});
      const id=chosen||autoId;
      members.push(id);if(!id)unresolvedMembers.push({sourceLine:row.sourceLine,position,hint:row.memberHints[position-1]||""});
    }
    relayMembers.set(row.sourceLine,members);
  }
  const existing=await q(pool,`SELECT ${COLUMNS.map(c=>`\`${c}\``).join(",")} FROM perfs FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 5001`,[competitionId]);
  const existingRelays=await q(pool,"SELECT id,club,distance,nageur1,nageur2,nageur3,nageur4,tps1,tps2,tps3,tps4,categorie,pts,compet FROM perfs_relais FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 1001",[competitionId]);
  if(existing.length>5000||existingRelays.length>1000)throw new RangeError("Resultats existants hors limite de remplacement.");
  const issues=[...decoded.issues,...relayBindingIssues];
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
    incoming.push({sourceLine:row.sourceLine,origin:"individual",row:native});
    const course=/^(\d+)(SF|BI|IS|AP)$/.exec(row.course);
    if(!course&&!courseReview)issues.push({sourceLine:row.sourceLine,code:"unsupported-course"});
    else if(course&&!row.courseMapping?.longDistance&&(!row.sourceCourse||/^(\d+)(SF|BI|IS|AP)$/.test(row.sourceCourse)))row.splits.forEach((value,index)=>{
      const time=compactTime(value),distance=[100,200,400,800][index];
      if(time&&distance<Number(course[1]))incoming.push({sourceLine:row.sourceLine,origin:"passage",row:{...native,course:`${distance}${course[2]}`,tps:time,points:0,passage:1,classement:0}});
    });
  }
  if(input.sourceType==="winpalme-zip-preview")for(const row of decoded.rows.filter(r=>r.kind==="REL"&&r.eligible)) {
    const match=/^4X(\d+)(SF|BI|IS|AP)$/.exec(row.course),time=compactTime(row.splits[0]),swimmerId=relayMembers.get(row.sourceLine)?.[0];
    const own=individual.filter(r=>swimmerByLine.get(r.sourceLine)===swimmerId),categories=[...new Set(own.map(r=>r.category))];
    if(!match||!time||parseCompactTime(time)>=parseCompactTime(row.time)||!swimmerId||categories.length!==1){
      const sourcePeople=individual.filter(r=>row.memberHints[0]&&r.swimmerHint===row.memberHints[0]);
      const reasons=[];
      if(!match)reasons.push("unsupported-relay-course");
      if(!time)reasons.push(!row.splits[0]||/^0+(?:[.:,]0+)*$/.test(row.splits[0])?"missing-first-leg-time":"invalid-first-leg-time");
      else if(parseCompactTime(time)>=parseCompactTime(row.time))reasons.push("first-leg-time-exceeds-final");
      if(!swimmerId)reasons.push(!row.memberHints[0]||/non pr[ée]cis[ée]/i.test(row.memberHints[0])?"first-member-not-specified":"first-member-unresolved");
      else if(categories.length!==1)reasons.push(categories.length?"first-member-category-ambiguous":"first-member-category-missing");
      const person=new Set(sourcePeople.map(r=>identity(r)||`line:${r.sourceLine}`)).size===1?sourcePeople[0]:null;
      issues.push({sourceLine:row.sourceLine,code:"first-relay-incomplete",reasons,context:{course:row.course,clubCode:row.clubCode,firstTime:row.splits[0]||"",finalTime:row.rawFinalTime,
        firstPerson:person?{lastName:person.lastName,firstName:person.firstName,birthDate:person.birthDate}:null,relatedSourceLines:sourcePeople.map(r=>r.sourceLine)}});continue;
    }
    incoming.push({sourceLine:row.sourceLine,origin:"first-relay",row:{nageur:swimmerId,compet:competitionId,course:`${match[1]}${match[2]}`,cat:categories[0],tps:time,points:0,newpoints:0,passage:0,club:clubByCode.get(row.clubCode),relais:0,pid:null,classement:0}});
  }
  if(incoming.length>5000)throw new RangeError("Plus de 5 000 performances avec passages et premiers relayeurs : reduisez le lot.");
  const canConfirm=decoded.confirmable&&issues.length===0&&resolution.canConfirm&&unresolvedClubs.length===0&&unresolvedMembers.length===0;
  const pack={source:"nap",competition,decoded,courseReview,resolution,candidates,clubs,clubByCode,clubMatches,relayMembers,unresolvedClubs,unresolvedMembers,incoming,incomingRelays,statusRows,existing,existingRelays,issues,canConfirm,
    expectedFingerprint:hash({competition,existing,existingRelays}),previewFingerprint:hash({fileHash:decoded.fileHash,excluded:decoded.excluded.map(r=>r.sourceLine),competition,existing,existingRelays,incoming,incomingRelays,statusRows})};
  if(input.sourceType==="winpalme-zip-preview") {
    pack.review=await require("./nap-import-review").prepareReview(pool,pack,input);
    pack.existingStatuses=await require("./nap-import-status-results").readImportStatusResults(pool,competitionId);
    pack.existingProtocol=input.protocolManifest?await require("./nap-import-protocol").current(pool,competitionId):null;
    pack.protocolManifest=input.protocolManifest?require("./nap-import-protocol").manifest(input.protocolManifest):null;
    pack.expectedFingerprint=hash({competition,existing,existingRelays,statuses:pack.existingStatuses});
    pack.previewFingerprint=hash([pack.previewFingerprint,pack.expectedFingerprint,pack.review.groups.map(g=>g.clubAlerts),courseReview?.sources,input.protocolManifest?require("./nap-import-protocol").manifest(input.protocolManifest):null,pack.existingProtocol]);
    pack.canConfirm=canConfirm&&issues.length===0;
  }
  return pack;
}
module.exports={previewNativeImport,hash};
