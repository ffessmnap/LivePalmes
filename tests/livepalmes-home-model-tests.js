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
assert.equal(home.eventGroups([event("malformed-source-year","0206-11-01","regional",{endDate:"2026-11-30"})],today).ongoing.length,0);
assert.equal(home.eventGroups([event("calendar-lower-bound","1900-01-01","regional",{endDate:today})],today).ongoing.length,1);
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
assert.equal(home.publicationLabel("","2026-10-25"),"Mis en ligne le 25/10/2026");
assert.equal(home.publicationLabel("","2026-02-30"),"");
console.log("Accueil: dates de Paris, chevauchements, niveaux, ex aequo, annulations, saisons, déduplication et Nouveau strictement <30 jours OK.");
assert.deepEqual(home.eventDateLabel('2026-12-12','2026-12-13'),{day:'12–13',month:'DÉC.',label:'Du 12 au 13 décembre 2026'});
assert.deepEqual(home.eventDateLabel('2026-10-17'),{day:'17',month:'OCT.',label:'17 octobre 2026'});
assert.equal(home.eventDateLabel('2026-10-30','2026-11-02').label,'Du 30 octobre au 2 novembre 2026');
assert.equal(home.eventDateLabel('2026-12-30','2027-01-02').label,'Du 30 décembre 2026 au 2 janvier 2027');
assert.equal(home.eventDateLabel('2026-10-30','2026-11-02').day,'30');
assert.equal(home.eventDateLabel('2026-02-30').label,'');
