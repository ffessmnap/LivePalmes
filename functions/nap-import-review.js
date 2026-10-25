"use strict";
const {createHash}=require("node:crypto");
const {identity}=require("./nap-import-swimmer-resolution");
const norm=value=>String(value||"").normalize("NFC").trim().replace(/\s+/g," ").toUpperCase();
const groupId=row=>createHash("sha256").update(identity(row)||`line:${row.sourceLine}`).digest("hex").slice(0,24);
async function prepareReview(pool,pack,input) {
  const ids=pack.candidates.map(p=>p.id);
  const counts=ids.length?(await pool.execute({sql:`SELECT nageur FROM perfs FORCE INDEX (perf) WHERE nageur IN (${ids.map(()=>"?").join(",")}) LIMIT 10001`,timeout:10000},ids))[0]:[];
  const capped=counts.length>10000,totals=new Map();
  for(const row of counts)totals.set(Number(row.nageur),(totals.get(Number(row.nageur))||0)+1);
  const profiles=pack.candidates.map(p=>{
    const club=pack.clubs.find(c=>String(c.num_club)===String(p.club));
    return {id:p.id,lastName:p.nom,firstName:p.prenom,birthDate:p.date,sex:p.sexe,clubId:String(p.club||""),clubCode:club?.abre_club||"",clubName:club?.nom_club||"",performanceCount:capped?null:totals.get(p.id)||0,countCapped:capped};
  });
  const byId=new Map(profiles.map(p=>[p.id,p]));
  const acknowledgements=input.clubAcknowledgements||[];
  if(!Array.isArray(acknowledgements)||acknowledgements.length>5000||acknowledgements.some(v=>typeof v!=="string"||!/^[a-f0-9]{64}$/.test(v)))throw new TypeError("Confirmations de clubs invalides.");
  const ack=new Set(acknowledgements),groups=new Map();
  for(const row of pack.decoded.rows.filter(r=>r.kind==="NAG")) {
    const id=groupId(row);
    if(!groups.has(id))groups.set(id,{id,source:{lastName:row.lastName,firstName:row.firstName,birthDate:row.birthDate,sex:row.sex},sourceLines:[],clubCodes:[],performances:[],profile:null,candidates:[],state:"unknown",clubAlerts:[]});
    const g=groups.get(id);g.sourceLines.push(row.sourceLine);if(!g.clubCodes.includes(row.clubCode))g.clubCodes.push(row.clubCode);
    g.performances.push({sourceLine:row.sourceLine,course:row.course,...(row.sourceCourse?{sourceCourse:row.sourceCourse}:{}),time:row.rawFinalTime,status:row.status,clubCode:row.clubCode,origin:"individual"});
  }
  const individual=pack.decoded.rows.filter(r=>r.kind==="NAG");
  for(const g of groups.values()) {
    const resolved=pack.resolution.resolved.filter(r=>g.sourceLines.includes(individual[r.rowIndex].sourceLine));
    const resolvedIds=[...new Set(resolved.map(r=>r.swimmerId))];
    const matches=profiles.filter(p=>norm(p.lastName)===norm(g.source.lastName));
    g.candidates=matches.slice(0,20);g.moreCandidates=matches.length>20;
    if(resolvedIds.length===1&&resolved.length===g.sourceLines.length) {
      g.profile=byId.get(resolvedIds[0]);g.state="matched";g.manual=resolved.some(r=>r.source==="explicit-choice");
      if(g.profile&&!g.candidates.some(p=>p.id===g.profile.id))g.candidates.unshift(g.profile);
    } else if(matches.length||resolvedIds.length)g.state="review";
    if(resolvedIds.length>1)pack.issues.push({sourceLine:g.sourceLines[0],code:"conflicting-swimmer-bindings"});
    if(g.profile)for(const item of pack.incoming.filter(i=>i.origin==="first-relay"&&i.row.nageur===g.profile.id)) {
      const code=pack.decoded.rows.find(r=>r.sourceLine===item.sourceLine)?.clubCode;
      if(code&&!g.clubCodes.includes(code))g.clubCodes.push(code);
    }
    g.clubs=g.clubCodes.map(code=>({code,id:pack.clubByCode.get(code)||"",name:pack.decoded.clubs.find(c=>c.cells[1]===code)?.cells[2]||""}));
    if(g.profile)for(const club of g.clubs)if(!club.id||club.id!==g.profile.clubId) {
      const key=createHash("sha256").update(JSON.stringify([g.id,g.profile.id,club.code,club.id,g.profile.clubId])).digest("hex");
      g.clubAlerts.push({...club,key,confirmed:Boolean(club.id&&ack.has(key))});
    }
    for(const alert of g.clubAlerts.filter(a=>!a.confirmed))pack.issues.push({sourceLine:g.sourceLines[0],code:alert.id?"club-difference-unconfirmed":"source-club-unresolved",groupId:g.id,
      context:{person:g.source,clubCode:alert.code,sourceClubName:alert.name,sourceClubId:alert.id,napClubId:g.profile.clubId,napClubCode:g.profile.clubCode,napClubName:g.profile.clubName}});
    for(const item of pack.incoming.filter(i=>g.sourceLines.includes(i.sourceLine)&&i.origin==="passage"))g.performances.push({sourceLine:item.sourceLine,course:item.row.course,time:item.row.tps,status:"NAG",clubCode:pack.decoded.rows.find(r=>r.sourceLine===item.sourceLine)?.clubCode||"",origin:"passage"});
    for(const item of pack.incoming.filter(i=>i.origin==="first-relay"&&i.row.nageur===g.profile?.id))g.performances.push({sourceLine:item.sourceLine,course:item.row.course,time:item.row.tps,status:"NAG",clubCode:pack.decoded.rows.find(r=>r.sourceLine===item.sourceLine)?.clubCode||"",origin:"first-relay"});
  }
  const relays=pack.decoded.rows.filter(r=>r.kind==="REL").map(r=>({sourceLine:r.sourceLine,course:r.course,clubCode:r.clubCode,status:r.status,time:r.rawFinalTime,members:(pack.relayMembers.get(r.sourceLine)||[]).map((id,index)=>{
    const sources=individual.filter(p=>r.memberHints[index]&&p.swimmerHint===r.memberHints[index]);
    const source=new Set(sources.map(p=>identity(p)||`line:${p.sourceLine}`)).size===1?sources[0]:null;
    return {position:index+1,profile:byId.get(id)||null,hint:r.memberHints[index]||"",sourceGroupId:source?groupId(source):null,source:source?{lastName:source.lastName,firstName:source.firstName,birthDate:source.birthDate,clubCode:source.clubCode}:null};
  })}));
  return {groups:[...groups.values()].map(({candidates,...group})=>({...group,candidateIds:candidates.map(p=>p.id)})),profiles,relays,countsCapped:capped};
}
module.exports={prepareReview,groupId};
