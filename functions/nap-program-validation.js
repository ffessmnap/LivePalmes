"use strict";
// Validate bounds before calling the existing portal's sporting validator.
function validateProgram(raw, selectedEvents, normalize) {
  if(typeof normalize!=="function" || !Array.isArray(raw) || raw.length>12 || Buffer.byteLength(JSON.stringify(raw))>100000) throw new TypeError("Programme invalide ou trop volumineux.");
  for(const session of raw) {
    if(!session || typeof session!=="object" || !Array.isArray(session.items) || session.items.length>160 || typeof session.id!=="string" || session.id.length>40) throw new TypeError("Session de programme invalide.");
    if(session.date && (!/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !Number.isFinite(Date.parse(`${session.date}T12:00:00Z`)) || new Date(`${session.date}T12:00:00Z`).toISOString().slice(0,10)!==session.date)) throw new TypeError("Date de session invalide.");
    if(session.startTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(session.startTime)) throw new TypeError("Horaire de session invalide.");
    for(const item of session.items) {
      if(!item || typeof item.eventCode!=="string" || item.eventCode.length>32 || !["female","male","mixed"].includes(item.genderMode) || !["direct","heats","final","slowHeats","fastHeat"].includes(item.phase)) throw new TypeError("Passage de programme invalide.");
      const event=selectedEvents.find(candidate=>candidate.code===item.eventCode);
      if(Array.isArray(event?.nativeCourses)) {
        const nativeSex={female:"F",male:"M",mixed:"0"}[item.genderMode];
        if(!event.nativeCourses.some(course=>String(course.sexe).trim()===nativeSex)) throw new TypeError("Ce passage ne correspond pas aux courses femmes, hommes ou mixtes proposees dans NAP.");
      }
    }
  }
  const result=normalize(raw,selectedEvents,{strict:true});
  if(!Array.isArray(result) || result.length!==raw.length || result.reduce((sum,s)=>sum+s.items.length,0)!==raw.reduce((sum,s)=>sum+s.items.length,0)) throw new TypeError("Programme incomplet : aucun passage ne doit etre perdu.");
  return result;
}
module.exports={validateProgram};
