"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const format=require("../functions/engagement-competition-mail-format");
const source=fs.readFileSync(require.resolve("../functions/index.js"),"utf8");
const context={...format,ENVIRONMENT:{hostingOrigin:"https://livepalmes-test.web.app"},engagementPdfFeeTotal:()=>12,engagementPdfMoney:x=>x+" €",escapeMailHtml:require("../functions/livepalmes-mail-html").escapeMailHtml};
vm.createContext(context);
for(const name of ["engagementOpeningMailText","engagementClubRecapMailText","engagementTxtMailText","engagementOfficialsMailText","engagementCompetitionDocumentMailText","engagementCompetitionDocumentMailHtml"]){const start=source.indexOf("function "+name+"(");const end=source.indexOf("\nfunction ",start+1);vm.runInContext(source.slice(start,end),context);}
const competition={name:"Compétition fictive",date:"2026-11-07",location:"Piscine fictive",address:"10 rue Exemple",city:"Paris",entryDeadlineAt:"2026-11-05T22:59:00Z",fees:{enabled:true,helloAssoUrl:"https://example.invalid/paiement"}};
const docs=[{title:"Programme",url:"https://example.invalid/programme"}];
for(const name of ["engagementOpeningMailText","engagementClubRecapMailText","engagementTxtMailText","engagementOfficialsMailText","engagementCompetitionDocumentMailText"]){const value=context[name](competition,name.includes("Document")?docs:{clubName:"Club fictif",fileName:"fixture.txt",officialCount:3});assert.match(value,/Date : samedi 7 novembre 2026/);assert.match(value,/Adresse : 10 rue Exemple, Paris/);assert.match(value,/Sportivement,\nNage avec Palmes FFESSM$/);assert.doesNotMatch(value,/Commission Nationale/);}
assert.match(context.engagementOpeningMailText(competition),/au plus tard le jeudi 5 novembre 2026 à 23h59/);
assert.equal(format.competitionMailDateTime("2026-07-01T21:59:00Z"),"mercredi 1 juillet 2026 à 23h59");
assert.equal(format.competitionMailDateTime("2026-12-31T23:30:00Z"),"vendredi 1 janvier 2027 à 00h30");
assert.equal(format.competitionMailDateTime("invalid"),"-");assert.equal(format.competitionMailDate("2026-02-30"),"-");
assert.match(format.competitionMailLines({...competition,endDate:"2026-11-08"}).join("\n"),/samedi 7 novembre 2026 au dimanche 8 novembre 2026/);
const full=format.competitionMailLines({...competition,address:"10 rue Exemple, 75019 Paris"}).join("\n");assert.match(full,/Adresse : 10 rue Exemple, 75019 Paris/);assert.doesNotMatch(full,/Paris, Paris/);
const cityOnly=format.competitionMailLines({...competition,address:""}).join("\n");assert.match(cityOnly,/Ville : Paris/);assert.doesNotMatch(cityOnly,/Adresse :/);
const missing=format.competitionMailLines({}).join("\n");assert.doesNotMatch(missing,/undefined|null|Adresse :/);
const recap=context.engagementClubRecapMailText(competition,{clubName:"Club fictif"});assert.match(recap,/Total indicatif des frais d'engagement : 12 €/);assert.match(recap,/Paiement HelloAsso : https:\/\/example.invalid\/paiement/);assert.match(recap,/Rappel : paiement attendu avant la fin de la premiere journee de competition. Surplus forfaitaire de 50 EUR ensuite./);
assert.match(context.engagementClubRecapMailText({...competition,fees:{enabled:false}},{}),/Aucun frais d'engagement/);
const html=context.engagementCompetitionDocumentMailHtml({...competition,address:'<script>bad</script>'},docs);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/samedi 7 novembre 2026/);assert.match(html,/Nage avec Palmes FFESSM/);
console.log("Competition mail contents: five real builders, French dates/Paris DST, full/missing address, HTML safety and unchanged payment text verified without network or send");
