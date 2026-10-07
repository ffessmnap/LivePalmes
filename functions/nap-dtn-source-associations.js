"use strict";
// Existing checked-in calendar/result links only. No guessed names or Firebase
// lookup. Keeps the old selected-source identifiers usable with native rows.
const associations=require("./config/calendar-result-associations.json");
function dtnNativeRow(row) {
  const ids=Object.entries(associations).filter(([,rules])=>rules.some(rule=>String(rule.calendarCompetitionId)===String(row.competitionId) && (!rule.categoryKind || rule.categoryKind==="master" && /^M\d+\+$/.test(row.category) || rule.categoryKind==="minime" && row.category==="M"))).map(([id])=>id);
  if(ids.length>2) throw new TypeError("Correspondances DTN natives multiples a verifier.");
  return {...row,...(ids[0]?{qualificationCompetitionId:ids[0]}:{}),...(ids[1]?{importId:ids[1]}:{})};
}
module.exports={dtnNativeRow};
