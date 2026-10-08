"use strict";
const {positiveId}=require("./nap-direct-calendar");
const {selectionLockReason}=require("./nap-swimmer-entry-plan");
const {readCategories}=require("./nap-entry-course-rules");
const {nativeCourseCode}=require("./nap-portal-workspaces");
const {compact}=require("./nap-individual-entry-resolution");
const {detail}=require("./nap-relay-details");
const ABBR={P:"PO",B:"BE",M:"MI",C:"CA",J:"JE"};
function nativeCategory(category,mode,categories) {
  if(mode==="mixed") return 0;
  const prefix=mode==="female"?"F":"H";
  const abbr=category==="S"?(mode==="female"?"FFF":"HHH"):category.startsWith("R")?prefix+category.slice(1):prefix+ABBR[category];
  const rows=categories.filter(row=>row.abbr===abbr);
  if(rows.length!==1) throw new TypeError("Correspondance native de la categorie relais a verifier.");
  return positiveId(rows[0].id);
}
function storedCategory(row,categories,metadata) {
  const extra=detail(row,metadata);if(extra) return extra;
  const reference=categories.find(item=>Number(item.id)===Number(row.categorie));
  if(!reference) return null;
  const abbr=String(reference.abbr),suffix=abbr.slice(1);
  const category=["HHH","FFF","HSE","FSE"].includes(abbr)?"S":["JE","JU"].includes(suffix)?"J":Object.keys(ABBR).find(code=>ABBR[code]===suffix)||(/^\d{3}$/.test(suffix)?"R"+suffix:"");
  return category?{category,genderMode:reference.sexe==="F"?"female":"male"}:null;
}
async function resolveRelay(input,services) {
  const {connection,competition:pack,pack:dossier,change}=input;
  if(pack.event?.eventType!=="pool") throw new TypeError("Correspondance des relais eau libre NAP a verifier.");
  const reason=selectionLockReason(pack);if(reason) throw new TypeError(reason);
  if(typeof services?.view!=="function" || typeof services?.validate!=="function") throw new TypeError("Regles LivePalmes des relais requises.");
  const competition=services.view(pack),raw=change.relay;
  if(!raw || typeof raw!=="object" || Array.isArray(raw) || Object.keys(raw).some(key=>!["eventCode","category","genderMode","manualEntryTime","memberIds"].includes(key))) throw new TypeError("Un relais explicite requis.");
  const categories=await readCategories(connection);
  const relay=await services.validate(raw,competition,dossier);
  const event=competition.events.find(row=>row.code===relay.eventCode && row.type==="relay");
  if(!event?.nativeRecognized || !Array.isArray(event.nativeCourses)) throw new TypeError("Course relais native non reconnue.");
  const courses=event.nativeCourses.filter(row=>Number(row.relais)===1 && (relay.genderMode==="mixed"?["0","X"].includes(String(row.sexe)):String(row.sexe)===(relay.genderMode==="female"?"F":"M")));
  if(courses.length!==1) throw new TypeError("Course native du relais absente ou ambigue.");
  const relayId=change.action==="compose"?positiveId(change.relayId):null;
  for(const other of dossier.relays.filter(row=>Number(row.id)!==relayId)) {
    const otherEvent=competition.events.find(item=>item.code===nativeCourseCode(other.course_code));
    const otherCategory=storedCategory(other,categories,dossier.options?.submission_metadata);
    if(otherEvent?.code===event.code && !event.multipleRelaysAllowed) {
      if(!otherCategory) throw new TypeError("Precisez la categorie de l'ancien relais avant d'en ajouter un autre sur cette course.");
      if(otherCategory.category===relay.category && otherCategory.genderMode===relay.genderMode) throw new TypeError("Un relais identique existe deja pour ce club.");
    }
    const otherMembers=dossier.members.filter(row=>Number(row.relais)===Number(other.id));
    if(otherMembers.some(member=>relay.memberIds.includes(String(member.nageur)))) {
      if(!otherEvent) throw new TypeError("La course d'un ancien relais doit etre verifiee pour ce relayeur.");
      if(otherEvent.distance===event.distance && otherEvent.discipline===event.discipline) throw new TypeError("Un relayeur ne peut pas participer a deux relais de meme distance et meme nature.");
    }
  }
  const ids=relay.memberIds.map(positiveId);
  const participation=require("./nap-entry-participation-rules");
  const evidence=await participation.readEvidence(connection,ids.map(id=>({id})),pack);
  if(ids.some(id=>!participation.eligible(pack,id,evidence))) throw new TypeError("Chaque relayeur doit avoir un resultat NAP dans au moins une competition requise.");
  const people=ids.length?(await connection.execute({sql:`SELECT id,date,sexe,club FROM nageurs FORCE INDEX (PRIMARY) WHERE id IN (${ids.map(()=>"?").join(",")}) ORDER BY id LIMIT 4`,timeout:10000},ids))[0]:[];
  if(people.length!==ids.length || people.some(row=>{
    const source=dossier.swimmers.find(person=>Number(person.id)===Number(row.id));
    return !source || String(row.club)!==String(dossier.clubId) || row.date!==source.birthDate || row.sexe!==source.sex;
  })) throw new TypeError("Identite d'un relayeur modifiee. Rechargez le dossier.");
  return {action:change.action,...(relayId?{relayId}:{}),native:{compet:positiveId(dossier.competitionId),club:String(dossier.clubId),course:positiveId(courses[0].id_course),categorie:nativeCategory(relay.category,relay.genderMode,categories),tps:compact(relay.entryTimeValue)},members:ids.map((nageur,index)=>({nageur,pos:index+1})),people,course:courses[0],detail:{category:relay.category,genderMode:relay.genderMode}};
}
module.exports={resolveRelay,nativeCategory,storedCategory};
