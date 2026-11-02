"use strict";
// Approved Clubs 2026/2027 profiles. Pure validation/presentation, no I/O.
const {positiveId}=require('./nap-calendar-values');
const {parseCompactTime,formatTime}=require('./nap-performance-time');
const {createHash}=require('node:crypto');
const KEY='club_teams_v1',VERSION='2026-2027-v1';
const PROFILES=Object.freeze({
  clubs:{size:6,reserve:true,individual:['50SF','100SF','200SF','400SF','800SF','50AP','100IS','200IS','50BI','100BI','200BI','400BI'],relays:{'6X100SBI':['BI','BI','SF','SF','SF','IS'],'6X50SF':['SF','SF','SF','SF','SF','SF'],'6X50SBA':['BI','BI','SF','SF','SF','AP']}},
  clubs_masters:{size:4,reserve:false,individual:['50SF','100SF','200SF','400SF','200IS','50BI','100BI','200BI'],relays:{'4X100SB':['SB','SB','SB','SB']}}
});
const code=x=>String(x||'').toUpperCase().replace(/\s+/g,'');
function format(value){const x=value?.options?.entry_format??value?.entryFormat??'classic';if(!['classic',...Object.keys(PROFILES)].includes(x))throw new TypeError('Format des engagements inconnu.');return x;}
function profile(value){const f=format(value);if(f==='classic')return null;const version=value?.options?.entry_rules_version??value?.entryRulesVersion;if(version!==VERSION)throw new TypeError('Version du règlement des équipes non prise en charge.');return {...PROFILES[f],format:f,version};}
function metadata(raw){const x=typeof raw==='string'?JSON.parse(raw):raw;if(x==null)return {};if(typeof x!=='object'||Array.isArray(x)||Buffer.byteLength(JSON.stringify(x))>250000)throw new TypeError('Complément du dossier invalide.');return x;}
function stored(pack){const value=metadata(pack.options?.submission_metadata)[KEY];if(value==null)return {teams:[],outside:[],individuals:[]};if(!value||typeof value!=='object'||!Array.isArray(value.teams)||!Array.isArray(value.outside)||!Array.isArray(value.individuals))throw new TypeError('Composition des équipes à vérifier.');return value;}
function witness(pack){const columns={inscriptions:['id','nageur','compet'],individual:['id','engagement','course','tps'],relays:['id','compet','categorie','club','course','tps'],members:['id','relais','pos','nageur']};return createHash('sha256').update(JSON.stringify(Object.entries(columns).map(([key,fields])=>(pack[key]||[]).slice().sort((a,b)=>Number(a.id)-Number(b.id)).map(row=>fields.map(f=>String(row[f]??'')))))).digest('hex');}
function consistency(pack){const value=stored(pack),hasRows=['inscriptions','individual','relays','members'].some(key=>pack[key]?.length);if(value.nativeWitness?value.nativeWitness!==witness(pack):hasRows)return ['Ce dossier a été modifié hors du parcours par équipes. Une vérification nationale est nécessaire avant un nouvel enregistrement ou export.'];return [];}
const id=x=>String(positiveId(x));
function normalize(raw,competition,pack,services={}){
  const p=profile(competition);if(!p)throw new TypeError('Profil par équipes requis.');
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['teams','outside','individuals'].includes(k)))throw new TypeError('Dossier par équipes explicite requis.');
  const people=new Map(pack.swimmers.map(x=>[String(x.id),x])),roles=new Map(),teamIds=new Set(),labels=new Set();
  if(!Array.isArray(raw.teams)||raw.teams.length>800||!Array.isArray(raw.outside)||raw.outside.length>800||!Array.isArray(raw.individuals)||raw.individuals.length>800)throw new RangeError('Dossier par équipes trop volumineux.');
  function assign(value,role,team){const key=id(value),person=people.get(key);if(!person||String(person.clubId)!==String(pack.clubId)||roles.has(key))throw new TypeError('Nageur hors du club ou affecté plusieurs fois.');if(!['F','M'].includes(person.sex)||!person.birthDate)throw new TypeError('Identité du nageur à compléter.');if(p.format==='clubs_masters'&&(!services.age||services.age(competition.event?.date||competition.date,person.birthDate)<30))throw new TypeError('Les Clubs Masters sont réservés aux nageurs de 30 ans et plus.');roles.set(key,{role,team});return key;}
  const teams=raw.teams.map(t=>{
    if(!t||typeof t!=='object'||Object.keys(t).some(k=>!['id','letter','sex','members','reserve','relays'].includes(k))||!/^[-a-zA-Z0-9_]{1,64}$/.test(t.id)||teamIds.has(t.id)||!/^([A-Z]{1,3})$/.test(t.letter)||!(p.format==='clubs' ? ['F','M']:['X']).includes(t.sex)||labels.has(t.sex+t.letter)||!Array.isArray(t.members)||t.members.length>p.size)throw new TypeError('Équipe invalide ou dupliquée.');
    teamIds.add(t.id);labels.add(t.sex+t.letter);
    const members=t.members.filter(Boolean).map(x=>assign(x,'titular',t.id));
    const sexes=members.map(x=>people.get(x).sex);
    if(p.format==='clubs'&&sexes.some(x=>x!==t.sex)||p.format==='clubs_masters'&&(sexes.filter(x=>x==='F').length>2||sexes.filter(x=>x==='M').length>2))throw new TypeError('Composition femmes/hommes de l’équipe invalide.');
    const reserve=t.reserve?assign(t.reserve,'reserve',t.id):'';
    if(reserve&&(!p.reserve||people.get(reserve).sex!==t.sex))throw new TypeError('Remplaçant non autorisé pour cette équipe.');
    if(!Array.isArray(t.relays)||t.relays.length>Object.keys(p.relays).length)throw new TypeError('Relais de l’équipe invalides.');
    const seen=new Set(),relays=t.relays.map(r=>{
      if(!r||typeof r!=='object'||Object.keys(r).some(k=>!['eventCode','members','entryTime','nativeRelayId'].includes(k)))throw new TypeError('Relais invalide.');
      const eventCode=code(r.eventCode),match=relayKey(eventCode,p),event=competition.events?.find(e=>e.code===eventCode&&e.type==='relay');
      if(!match||seen.has(eventCode)||!event)throw new TypeError('Relais absent du programme ou dupliqué.');seen.add(eventCode);
      if(members.length!==p.size)throw new TypeError('Une équipe incomplète ne peut pas engager de relais.');
      if(!Array.isArray(r.members)||![0,p.size].includes(r.members.length))throw new TypeError('Complétez tous les relayeurs ou laissez la composition vide.');
      const relayMembers=r.members.map(id);if(new Set(relayMembers).size!==relayMembers.length||relayMembers.some(x=>!members.includes(x)))throw new TypeError('Les relayeurs doivent être les titulaires de cette équipe.');
      const text=String(r.entryTime||'59:59.99').replace(/[:.]/g,'');if(!/^\d{1,6}$/.test(text)||!parseCompactTime(text))throw new TypeError('Temps de relais invalide.');
      return {eventCode,members:relayMembers,entryTime:text.padStart(6,'0'),...(r.nativeRelayId?{nativeRelayId:id(r.nativeRelayId)}:{})};
    });
    const roster=p.format==='clubs_masters'?[...members.filter(x=>people.get(x).sex==='F'),...Array(2-sexes.filter(x=>x==='F').length).fill(''),...members.filter(x=>people.get(x).sex==='M'),...Array(2-sexes.filter(x=>x==='M').length).fill('')]:members;
    return {id:t.id,letter:t.letter,sex:t.sex,members:roster,reserve,relays};
  });
  if(!p.reserve&&raw.outside.length)throw new TypeError('Aucun hors concours aux Clubs Masters.');
  const outside=raw.outside.map(x=>assign(x,'outside',''));
  if(roles.size>800)throw new RangeError('Dossier de plus de 800 nageurs : traitement par lots requis.');
  const seenPeople=new Set(),usedEvents=new Set();
  const individuals=raw.individuals.map(row=>{
    const swimmerId=id(row?.swimmerId),role=roles.get(swimmerId);if(!role||seenPeople.has(swimmerId)||!Array.isArray(row.eventCodes)||row.eventCodes.length>2)throw new TypeError('Deux courses maximum par nageur affecté au dossier.');seenPeople.add(swimmerId);
    const eventCodes=row.eventCodes.map(code);if(new Set(eventCodes).size!==eventCodes.length)throw new TypeError('Course individuelle dupliquée.');
    for(const eventCode of eventCodes){const event=competition.events?.find(e=>e.code===eventCode&&e.type==='individual');if(!event||!p.individual.includes(eventCode))throw new TypeError('Course individuelle absente du programme réglementaire.');if(role.role==='titular'){const key=role.team+'|'+eventCode;if(usedEvents.has(key))throw new TypeError('Un seul titulaire par équipe sur une épreuve.');usedEvents.add(key);}}
    return {swimmerId,eventCodes};
  });
  return {teams,outside,individuals};
}
function relayKey(event,p){const key=code(event).replace(/MIXTE$/,'');return Object.keys(p.relays).find(x=>key===x)||null;}
function roles(value){const result=new Map();for(const t of value.teams){for(const x of t.members.filter(Boolean))result.set(String(x),{role:'titular',teamId:t.id});if(t.reserve)result.set(String(t.reserve),{role:'reserve',teamId:t.id});}for(const x of value.outside)result.set(String(x),{role:'outside',teamId:''});return result;}
function supplement(pack,value){return {...metadata(pack.options?.submission_metadata),[KEY]:value};}
function fees(competition,entry){if(!profile(competition))return null;if(entry.teamConsistencyIssues?.length)throw new TypeError('Le dossier par équipes doit être vérifié avant export.');const value=entry.teamEntries||{teams:[],outside:[],individuals:[]},map=roles(value);const hc=value.individuals.filter(x=>map.get(String(x.swimmerId))?.role!=='titular');const hcPeople=new Set([...value.outside,...hc.filter(x=>x.eventCodes.length).map(x=>String(x.swimmerId))]);return {teamCount:value.teams.length,hcPeople:hcPeople.size,hcEvents:hc.reduce((n,x)=>n+x.eventCodes.length,0),total:value.teams.length*Number(competition.fees?.teamFee||0)+hcPeople.size*Number(competition.fees?.swimmerFee||0)+hc.reduce((n,x)=>n+x.eventCodes.length,0)*Number(competition.fees?.individualEventFee||0)};}
function decorate(entry,competition){const p=profile(competition);if(!p)return entry;const value=stored({options:entry.nativeOptions}),map=roles(value);return {...entry,teamEntries:{teams:value.teams,outside:value.outside,individuals:value.individuals},relays:entry.relays.map(r=>{const team=value.teams.find(t=>t.relays.some(link=>String(link.nativeRelayId)===String(r.relayId)));return {...r,relayLegs:p.size,...(team?{category:'S',genderMode:({F:'female',M:'male',X:'mixed'})[team.sex]}:{})};}),swimmers:entry.swimmers.map(person=>({...person,teamRole:map.get(String(person.swimmerIndexId))?.role||'unassigned',teamId:map.get(String(person.swimmerIndexId))?.teamId||'',individualEntries:person.individualEntries.map(e=>({...e,horsConcours:['reserve','outside'].includes(map.get(String(person.swimmerIndexId))?.role)}))}))};}
module.exports={KEY,VERSION,PROFILES,format,profile,metadata,stored,normalize,relayKey,roles,supplement,fees,decorate,formatTime,witness,consistency};
