"use strict";
const assert = require("node:assert/strict");
const home = require("../assets/public/livepalmes-home-model");
const today="2026-10-13";
const event=(id,date,level="regional",extra={})=>({id,date,level,name:id,...extra});
const events=[
 event("regional-current","2026-10-12","regional",{endDate:today}),
 event("international-current",today,"international",{resultsPublishedAt:today}),
 event("national-future","2026-10-15","national"),
 ...Array.from({length:7},(_,i)=>event(`formation-${i}`,`2026-10-${15+i}`,"regional",{eventType:"training"})),
 event("canceled",today,"national",{canceled:true}),event("invalid","2026-02-30"),
 event("invalid-end",today,"national",{endDate:"2026-10-12"})
];
let groups=home.eventGroups(events,today);
assert.deepEqual(groups.ongoing.map(e=>e.id),["international-current","regional-current"]);
assert.deepEqual(groups.major,[]);
assert.equal(groups.upcoming.length,5);
groups=home.eventGroups(events.filter(e=>e.id!=="international-current"),today);
assert.deepEqual(groups.major.map(e=>e.id),["national-future"]);
assert.equal(groups.majorTitle,"National");
const tied=[event("national","2027-09-01","national"),event("international-abroad","2027-09-01","international",{location:"Italie"}),event("later","2027-09-02","international")];
groups=home.eventGroups(tied,today);
assert.equal(groups.majorTitle,"Prochains rendez-vous");assert.equal(groups.major.length,2);
assert.equal(home.eventGroups([tied[1]],today).majorTitle,"International");
assert.deepEqual(home.eventGroups([],today).ongoing,[]);
assert.equal(home.eventGroups([events[0],events[0]],today).ongoing.length,1);
assert.equal(home.eventGroups([event("跨-season","2026-08-31","regional",{endDate:"2026-10-14"})],today).ongoing.length,1);
assert.throws(()=>home.eventGroups([],"2026-02-30"),/invalide/);
assert.equal(home.validDate("2024-02-29"),true);assert.equal(home.validDate("2026-02-29"),false);
assert.equal(home.parisToday(Date.parse("2026-10-12T23:00:00Z")),today);
const now=Date.parse("2026-10-13T10:00:00Z");
for(const [age,expected] of [[0,true],[30*86400000-1,true],[30*86400000,false],[-1,false]]) {
 assert.equal(home.isNewDocument(new Date(now-age).toISOString(),now),expected);
}
for(const raw of [null,"","2026-02-30T12:00:00Z","2026-10-13 12:00:00","2026-10-13","2026-10-13T25:00:00Z","2026-10-13T24:00:00Z"])assert.equal(home.isNewDocument(raw,now),false);
assert.equal(home.publicationLabel("2026-10-12T23:00:00Z"),"Mis en ligne le 13/10/2026");
assert.equal(home.publicationLabel("invalid"),"");
console.log("Accueil: dates de Paris, chevauchements, niveaux, ex aequo, annulations, saisons, déduplication et Nouveau strictement <30 jours OK.");
