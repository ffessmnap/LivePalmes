"use strict";
// Existing IntraNAP modes: presence, tps, presencetps. One indexed grouped
// read at most for 800 people; no read at all without a presence requirement.
const {positiveId}=require("./nap-direct-calendar");
function requirements(pack) {
  const rows=pack.participations || pack.nativeRules?.participations;
  if(!Array.isArray(rows) || rows.length>200) throw new TypeError("Conditions de participation NAP incompletes.");
  const presence=new Set(),times=new Set();
  for(const row of rows) {
    const id=String(positiveId(row?.participation));
    if(!["presence","tps","presencetps"].includes(row.modeengagement)) throw new TypeError("Mode de participation NAP a verifier.");
    if(row.modeengagement!=="tps") presence.add(id);
    if(row.modeengagement!=="presence") times.add(id);
  }
  return {presence,times};
}
async function readEvidence(connection,people,pack) {
  if(!Array.isArray(people) || people.length>800) throw new RangeError("De 0 a 800 nageurs NAP requis.");
  const ids=people.map(person=>positiveId(person.id));
  if(new Set(ids).size!==ids.length) throw new TypeError("Nageurs NAP dupliques.");
  const {presence}=requirements(pack),evidence=new Map(ids.map(id=>[String(id),new Set()]));
  if(!ids.length || !presence.size) return evidence;
  // The existing nageur index is (nageur,compet): this grouped, covering
  // query visits only the requested swimmers/competitions, never all results.
  const targets=[...presence];
  const [rows]=await connection.execute({sql:`SELECT nageur,MIN(compet) AS compet FROM perfs FORCE INDEX (nageur) WHERE nageur IN (${ids.map(()=>"?").join(",")}) AND compet IN (${targets.map(()=>"?").join(",")}) GROUP BY nageur ORDER BY nageur LIMIT 801`,timeout:10000},[...ids,...targets]);
  if(rows.length>ids.length) throw new RangeError("Resultats de participation trop volumineux.");
  const seen=new Set();
  for(const row of rows) {
    const id=String(positiveId(row.nageur)),competition=String(positiveId(row.compet));
    if(!evidence.has(id) || seen.has(id) || !presence.has(competition)) throw new TypeError("Resultat de participation hors selection ou duplique.");
    seen.add(id);evidence.get(id).add(competition);
  }
  return evidence;
}
function eligible(pack,personId,evidence) {
  const {presence}=requirements(pack);
  if(!presence.size) return true;
  const results=evidence instanceof Map ? evidence.get(String(positiveId(personId))) : null;
  if(!(results instanceof Set)) throw new TypeError("Resultats NAP requis pour verifier la participation.");
  return [...presence].some(id=>results.has(id));
}
function filterTimes(rows,pack) {
  const {times}=requirements(pack);
  if(!Array.isArray(rows)) throw new TypeError("Historique de temps NAP requis.");
  return times.size ? rows.filter(row=>times.has(String(row.competitionId))) : rows;
}
module.exports={requirements,readEvidence,eligible,filterTimes};
