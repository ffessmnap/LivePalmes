"use strict";
// Authorized technical snapshots in existing configuration/mail collections.
// Sporting identities and season validations remain in NAP. TEST never sends.
const {createHash}=require("node:crypto");
const {seasonInfo}=require("./nap-license-state");
const {positiveId}=require("./nap-direct-calendar");
const hash=value=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const id=value=>String(positiveId(value));
const summaryRef=(db,season)=>db.collection("engagementConfigurations").doc(`license-controls-${seasonInfo(season).label}`);
const reportRef=(db,season,competition)=>db.collection("engagementConfigurations").doc(`license-control-${seasonInfo(season).label}-${id(competition)}`);
const FINAL_STATUSES=new Set(["validable","licence_expiree","introuvable","anomalie_licence","anomalie_identite","ambigu"]);
const LABELS={valid:"Licence valide",licence_expiree:"Licence expirée",introuvable:"Licence non retrouvée dans la base fédérale",anomalie_licence:"Numéro de licence différent",anomalie_identite:"Identité à vérifier",ambigu:"Correspondance ambiguë"};
function participants(batch,competition){return batch.people.filter(p=>p.competitionIds.map(id).includes(id(competition)));}
function membership(batch,competition){return hash([batch.season.label,participants(batch,competition).map(p=>[p.livePalmesId,p.firstName,p.lastName,p.birthDate,p.clubId,p.licenseNumber]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);}
function fingerprint(batch,competition){return hash([membership(batch,competition),participants(batch,competition).map(p=>[p.livePalmesId,p.seasonStatus,p.validatedAt||""]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))]);}
function view(report){return report?{competitionId:report.competitionId,status:report.status,completedAt:report.completedAt,counts:report.counts,revision:report.revision,mail:report.mail||null}:null;}
async function summaries(db,season){return {reports:(await summaryRef(db,season).get()).data()?.reports||{},readStats:{firestoreDocuments:1}};}
async function attach(db,batch){
  const snapshots=await db.getAll(...batch.competitions.map(c=>reportRef(db,batch.season.label,c.id)));
  batch.controlReports={};batch.controlMemberships={};
  batch.competitions.forEach((c,i)=>{const report=snapshots[i].data();batch.controlMemberships[id(c.id)]=membership(batch,c.id);batch.controlReports[id(c.id)]=report?{...view(report),current:report.fingerprint===fingerprint(batch,c.id)}:null;});
  return batch;
}
function build(batch,input,actor,now=new Date().toISOString()){
  const competition=id(input.competitionId),source=batch.competitions.find(c=>id(c.id)===competition);
  if(!source||input.expectedMembership!==membership(batch,competition))throw new TypeError("Les engagés ou les fiches ont changé. Rechargez le lot avant de terminer le contrôle.");
  const people=participants(batch,competition);
  if(!people.length||people.length>800||!Array.isArray(input.results)||input.results.length>800)throw new TypeError("Résultats de contrôle absents ou trop volumineux.");
  const results=new Map();
  for(const r of input.results){if(!r||results.has(String(r.id)))throw new TypeError("Résultat de contrôle dupliqué.");results.set(String(r.id),r);}
  const nativeIds=new Set(people.map(p=>String(p.livePalmesId)));
  if([...results.keys()].some(key=>!nativeIds.has(key)))throw new TypeError("Un résultat n’appartient pas à cette compétition.");
  const checked=people.map(p=>{
    const r=results.get(String(p.livePalmesId));let status="valid";
    if(p.seasonStatus!=="valid"){
      if(!r||!FINAL_STATUSES.has(r.status)||String(r.licenseNumber||"").trim()!==String(p.licenseNumber||"").trim())throw new TypeError("Chaque licence doit avoir un résultat exploitable. Les erreurs techniques et délais dépassés restent à contrôler.");
      status=r.status==="validable"?"valid":r.status;
      if(status==="valid"&&(!require("./nap-license-control").validDate(r.validity)||r.validity<batch.season.requiredValidityDate))throw new TypeError("La validité fédérale ne couvre pas la saison.");
      if(status==="licence_expiree"&&(!require("./nap-license-control").validDate(r.validity)||r.validity>=batch.season.requiredValidityDate))throw new TypeError("Date d’expiration incohérente.");
    }
    return {id:String(p.livePalmesId),firstName:String(p.firstName||"").slice(0,80),lastName:String(p.lastName||"").slice(0,80),clubName:String(p.clubName||p.clubId||"").slice(0,140),licenseNumber:String(p.licenseNumber||"").slice(0,100),status,validity:String(p.federalValidityEndDate||r?.validity||"").slice(0,10)};
  });
  const counts={total:checked.length,valid:0,expired:0,notFound:0,other:0};
  checked.forEach(p=>counts[p.status==="valid"?"valid":p.status==="licence_expiree"?"expired":p.status==="introuvable"?"notFound":"other"]++);
  return {version:1,competitionId:competition,competitionName:String(source.name||"").slice(0,160),season:batch.season.label,status:counts.valid===counts.total?"ok":"issues",completedAt:now,completedBy:actor,fingerprint:fingerprint(batch,competition),counts,people:checked,revision:hash([now,actor,checked]),mail:null};
}
async function complete(db,batch,input,actor){
  const report=build(batch,input,actor);
  if(Buffer.byteLength(JSON.stringify(report))>700000)throw new RangeError("Bilan trop volumineux.");
  await db.runTransaction(async tx=>{
    const ref=summaryRef(db,report.season),record=reportRef(db,report.season,report.competitionId);
    const [index,previous]=await tx.getAll(ref,record),summary=index.data()||{reports:{}};
    if((previous.data()?.revision||"")!==(input.expectedRevision||""))throw new TypeError("Le bilan a été modifié par une autre personne. Rechargez avant de le remplacer.");
    const reports={...summary.reports,[report.competitionId]:view(report)};
    if(Object.keys(reports).length>250)throw new RangeError("Trop de bilans pour cette saison.");
    tx.set(record,report);tx.set(ref,{reports,updatedAt:report.completedAt});
  });
  return {ok:true,report:{...view(report),current:true}};
}
async function readCurrent(db,batch,competition){
  const report=(await reportRef(db,batch.season.label,competition).get()).data();
  if(!report||report.fingerprint!==fingerprint(batch,competition))throw new TypeError("Aucun bilan à jour. Contrôlez les engagés actuels et terminez le contrôle avant de notifier.");
  return report;
}
function recipients(competition,directory){
  if(!Array.isArray(directory)||directory.length>10000)throw new RangeError("Annuaire des destinataires trop volumineux.");
  const region=String(competition.regionId||"");const map=new Map();
  const add=r=>{const email=String(r.email||"").trim().toLowerCase();if(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)&&email.length<=180&&!map.has(email))map.set(email,{uid:String(r.uid||""),email,name:[r.firstName,r.lastName].filter(Boolean).join(" "),role:r.role||"Administration régionale"});};
  for(const r of directory){if(r.competitionNotificationsEnabled===false||!r.capabilities?.includes("engagements.region.manage"))continue;const regions=r.accessScopes?.["engagements.region.manage"]?.regionIds||[];if(region&&(r.regionId===region||regions.includes(region)))add(r);}
  if(competition.computerEmail)add({email:competition.computerEmail,role:"Informatique de la compétition"});
  const result=[...map.values()].sort((a,b)=>a.email.localeCompare(b.email));
  if(result.length>200)throw new RangeError("Plus de 200 destinataires : vérifiez le périmètre régional.");
  return result;
}
function message(report){
  const c=report.counts,date=new Intl.DateTimeFormat("fr-FR",{timeZone:"Europe/Paris",dateStyle:"short",timeStyle:"short"}).format(new Date(report.completedAt)),issues=report.people.filter(p=>p.status!=="valid");
  return {subject:`LivePalmes — Contrôle des licences — ${report.competitionName}`.slice(0,220),text:["Bonjour,","",`Le contrôle des licences de ${report.competitionName} a été effectué le ${date} (saison ${report.season}).`,"",`Compétiteurs contrôlés : ${c.total}`,`Licences valides : ${c.valid}`,`Licences expirées : ${c.expired}`,`Licences non retrouvées dans la base fédérale : ${c.notFound}`,`Autres incohérences : ${c.other}`,"",issues.length?"Points à vérifier avant la compétition :":"Aucune incohérence relevée au moment du contrôle.",...issues.map(p=>`${p.lastName} ${p.firstName} · ${p.clubName} · ${p.licenseNumber||"Licence non renseignée"} — ${LABELS[p.status]}${p.validity?` (${p.validity})`:""}`),"","Ce bilan correspond aux engagés et aux résultats connus à la date du contrôle. Un nouveau contrôle est nécessaire en cas de modification.","","Portail LivePalmes"].join("\n")};
}
async function notify(db,batch,input,services){
  const competition=await services.competition(id(input.competitionId));
  const report=await readCurrent(db,batch,input.competitionId),selected=recipients(competition,await services.directory());
  const setting=await services.setting(),mail=message(report),fingerprint=hash([report.revision,selected,setting]);
  const disabled=services.projectId==="livepalmes-test"||!setting.enabled;
  const result={ok:true,report:view(report),recipients:selected,missingComputer:!competition.computerEmail,missingRegion:!competition.regionId,...mail,fingerprint,disabled,previewOnly:services.projectId==="livepalmes-test",sentCount:0};
  if(input.action==="previewReport")return result;
  if(input.expectedFingerprint!==fingerprint)throw new TypeError("Le bilan, les destinataires ou le réglage des mails ont changé. Actualisez l’aperçu.");
  // This check precedes transporter creation, outbox writes and delayed messages.
  if(disabled)return {...result,done:true,reason:services.projectId==="livepalmes-test"?"test-emails-disabled":"mails-disabled"};
  if(!selected.length)throw new TypeError("Aucun destinataire configuré pour cette compétition.");
  const offset=input.offset??0;if(!Number.isInteger(offset)||offset<0||offset>selected.length||offset%20!==0)throw new TypeError("Avancement d’envoi invalide.");
  let sentCount=0;
  for(const r of selected.slice(offset,offset+20)){
    const gate=require("./engagement-mail-control").decision(await services.setting(),{source:"nap",type:"license_control_report",competitionRegionId:competition.regionId,toEmail:r.email,createdAt:new Date().toISOString()},services.projectId);
    if(!gate.allowed)throw new TypeError("Envoi bloqué par le réglage des notifications.");
    const key=hash(["license-control",report.revision,r.email]),ref=db.collection("engagementMailJobs").doc(key),now=new Date().toISOString();
    const job={source:"nap",type:"license_control_report",status:"sending",competitionId:report.competitionId,competitionRegionId:competition.regionId,recipientUid:r.uid,toEmail:r.email,subject:mail.subject,textBody:mail.text,createdAt:now,notificationDueAt:now};
    let claimed=false;
    await db.runTransaction(async tx=>{const current=(await tx.get(ref)).data();if(current){if(current.status!=="sent")throw new TypeError("Un envoi précédent reste à vérifier. Aucun renvoi automatique.");return;}tx.set(ref,job);claimed=true;});
    if(claimed){const sent=await services.send(ref,job);if(sent.status!=="sent")throw new TypeError("Envoi non confirmé. Vérifiez le journal avant de reprendre.");}sentCount++;
  }
  const done=offset+20>=selected.length;
  if(done)await db.runTransaction(async tx=>{
    const ref=reportRef(db,report.season,report.competitionId),summary=summaryRef(db,report.season),[snapshot,index]=await tx.getAll(ref,summary),current=snapshot.data();
    if(current?.revision!==report.revision)throw new TypeError("Le bilan a changé pendant l’envoi.");
    const mail=current.mail?.sentAt?current.mail:{sentAt:new Date().toISOString(),recipientCount:selected.length};tx.set(ref,{mail},{merge:true});tx.set(summary,{reports:{...(index.data()?.reports||{}),[report.competitionId]:view({...report,mail})}},{merge:true});
  });
  return {...result,sentCount,done,nextOffset:offset+20};
}
module.exports={membership,fingerprint,build,view,summaries,attach,complete,readCurrent,recipients,message,notify,reportRef,summaryRef};
