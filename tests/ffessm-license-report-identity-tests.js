"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../tools/ffessm-license-control-extension/core.js");
const report = require("../tools/ffessm-license-control-extension/report.js");
const person = {batchId:"identites",season:"2026-2027",livePalmesId:"1",lastName:"DUPONT",firstName:"Camille",
  birthDate:"19/03/2004",requiredValidity:"31/12/2027",currentLicense:"A-12-345678",competitions:"Meeting A",clubName:"Club des Palmes"};
const federal = (changes = {}) => ({name:"DUPONT Camille",birthDate:"19/03/2004",license:"A-12-345678",validity:"31/12/2027",...changes});
const check = (raw, changes = {}) => {
  const p = {...person,...changes}, result = core.analyzeCandidates(p, raw);
  const row = report.buildReport({batchId:p.batchId,season:p.season,requiredValidity:p.requiredValidity,people:[p]},[result],"Meeting A").rows[0];
  return {p,result,row,note:row.values[9]};
};
const surname = check([federal({name:"DUPON Camille"})]);
assert.equal(surname.result.status,"anomalie_identite");
assert.match(surname.note,/Piste unique/);
assert.match(surname.note,/Nom : LivePalmes « DUPONT » ; Ma Commission « DUPON »/);
assert.match(surname.note,/Prénom et date de naissance concordent/);
assert.match(surname.note,/Rapprochement non validé/);
assert.equal(surname.row.values[2],person.clubName);
assert.equal(surname.row.values[5],"");
assert.equal(surname.row.values[6],"");
assert.equal(core.parseDelimited(core.exportResultsCsv([surname.result]))[1][8],"","Une piste ne devient pas une licence attribuée dans le CSV.");
const first = check([federal({name:"DUPONT Camile"})]);
assert.match(first.note,/Prénom : LivePalmes « Camille » ; Ma Commission « Camile »/);
const birthday = check([federal({birthDate:"18/03/2004"})]);
assert.match(birthday.note,/Date de naissance : LivePalmes « 19\/03\/2004 » ; Ma Commission « 18\/03\/2004 »/);
assert.match(birthday.note,/Nom et prénom concordent/);
assert.match(birthday.note,/déterminer la valeur correcte/);
const missing = check([federal({birthDate:""})]);
assert.match(missing.note,/Ma Commission « non renseignée »/);
const accent = check([federal({name:"DUPONT Elodie"})],{firstName:"Élodie"});
assert.equal(accent.result.status,"validable","Les accents restent déjà tolérés, sans changement du contrôle.");
assert.match(accent.note,/Prénom : LivePalmes « Élodie » ; Ma Commission « Elodie »/);
assert.match(accent.note,/déjà tolérée/);
assert.match(check([federal({name:"Camille DUPON"})]).note,/Piste unique/);
assert.match(check([federal({name:"LE GOF JEAN PIERRE"})],{lastName:"LE GOFF",firstName:"Jean-Pierre"}).note,/Nom : LivePalmes « LE GOFF » ; Ma Commission « LE GOF »/);
assert.match(check([federal({name:"DUOPNT Camille"})]).note,/Piste unique/,"Inversion de deux lettres.");
assert.equal(check([federal({name:"DUPON Camille",birthDate:"18/03/2004"})]).note,"","Deux différences ne constituent pas une piste.");
assert.equal(check([federal({name:"DURAND Camille"})]).note,"","Un nom trop éloigné ne constitue pas une piste.");
assert.equal(check([federal({name:"DUPONT Alexandre"})],{firstName:"Alex"}).note,"","Un prénom contenu dans un autre prénom ne devient pas une piste.");
assert.equal(check([federal({name:"AUTRE PERSONNE"})]).note,"");
const unrelated = federal({name:"AUTRE PERSONNE",license:"Z-00-999999"});
const uniqueAmongMany = check([unrelated,federal({name:"DUPON Camille"})]);
assert.match(uniqueAmongMany.note,/Piste unique/);
assert.equal(uniqueAmongMany.note.includes("AUTRE PERSONNE"),false);
const multiple = check([federal({birthDate:"18/03/2004"}),federal({birthDate:"17/03/2004",license:"B-00-999999"})]);
assert.match(multiple.note,/Aucune piste unique/);
assert.equal(multiple.note.includes("B-00-999999"),false,"Aucune identité arbitraire dans les observations.");
assert.equal(multiple.row.values[5],"");
assert.equal(check([federal(),federal({license:"B-00-999999"})]).note,"","Une ambiguïté exacte ne devient pas une suggestion.");
assert.match(check([federal({name:"DUPON Camille"}),federal({name:"DUPON Camille"})]).note,/Piste unique/,"Les résultats répétés entre les recherches restent dédupliqués.");
assert.equal(check([], {clubName:""}).row.values[2],"Non renseigné");
const old = core.parseLivePalmesBatch("lot_id;saison;livepalmes_id;nom;prenom;date_naissance\nlot;2026-2027;1;DUPONT;Camille;19/03/2004");
assert.equal(old.people[0].clubName,"","Les anciens lots restent compatibles.");

// Exécuter le véritable export du portail et relire son CSV avec l’extension.
const source = fs.readFileSync(path.join(__dirname,"../assets/livepalmes-license-administration.js"),"utf8");
const functions = [
 source.slice(source.indexOf("  function displayDate("),source.indexOf("  function setStatus(")),
 source.slice(source.indexOf("  function csvCell("),source.indexOf("  function download(")),
 source.slice(source.indexOf("  function exportBatch("),source.indexOf("  function chooseDelimiter("))
].join("\n");
let exported;
vm.runInNewContext(functions + "\nexportBatch();", {
 state: {batch:{batchId:"lot-clubs",season:{label:"2026-2027"},people:[
  {livePalmesId:"p1",lastName:"DUPONT",firstName:"Camille",birthDate:"2004-03-19",licenseNumber:"A-12-345678",competitions:["Meeting A","Meeting B"],clubName:'Club "Bleu"; Palmes',clubId:"33"},
  {livePalmesId:"p2",lastName:"MARTIN",firstName:"Alex",birthDate:"2005-04-20",licenseNumber:"",competitions:["Meeting A"],clubName:"",clubId:"44"},
  {livePalmesId:"p3",lastName:"DURAND",firstName:"Élodie",birthDate:"2006-05-21",licenseNumber:"",competitions:["Meeting A"],clubName:"",clubId:""}
 ]}},download:(csv)=>{exported=csv;}
});
const imported = core.parseLivePalmesBatch(exported);
assert.equal(imported.people.length,3);
assert.equal(imported.people[0].clubName,'Club "Bleu"; Palmes');
assert.equal(imported.people[1].clubName,"44","Identifiant connu en repli.");
const pending = report.buildReport(imported,[],"Meeting A");
assert.deepEqual(pending.rows.map(r=>r.values[2]).sort(),['44','Club "Bleu"; Palmes','Non renseigné'].sort());
assert.equal(pending.summary.pending,3);
assert.equal(pending.rows.every(r=>r.values[9]===""),true);
if(process.env.LIVEPALMES_REPORT_SAMPLE){
 const examples=[
  {...person,livePalmesId:"1"},
  {...person,livePalmesId:"2",lastName:"MARTIN"},
  {...person,livePalmesId:"3",firstName:"Élodie"},
  {...person,livePalmesId:"4",lastName:"LE GOFF",firstName:"Jean-Pierre"},
  {...person,livePalmesId:"5",lastName:"BERNARD"}
 ];
 const results=[
  core.analyzeCandidates(examples[0],[federal({name:"DUPON Camille"})]),
  core.analyzeCandidates(examples[1],[federal({name:"MARTIN Camille",birthDate:"18/03/2004"})]),
  core.analyzeCandidates(examples[2],[federal({name:"DUPONT Elodie"})]),
  core.analyzeCandidates(examples[3],[federal({name:"LE GOF JEAN PIERRE"})])
 ];
 const batch={batchId:person.batchId,season:person.season,requiredValidity:person.requiredValidity,people:examples};
 fs.writeFileSync(path.resolve(process.env.LIVEPALMES_REPORT_SAMPLE),Buffer.from(report.exportReportXlsx(batch,results,"Meeting A")));
}
console.log("Clubs et pistes uniques d’identité : OK");
