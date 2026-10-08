"use strict";
// Native category reference is read once for the complete group, never per
// swimmer. Existing LivePalmes categories/apnoea rules are supplied by caller.
const {bounded}=require("./nap-portal-competitions");
const {selectionLockReason}=require("./nap-swimmer-entry-plan");
async function readCategories(connection) {
  return bounded(connection,"SELECT id,abbr,age_d,age_f,sexe,record_categorie FROM categories FORCE INDEX (PRIMARY) WHERE id>0 ORDER BY id LIMIT 201",[],200);
}
function courseLockReason(pack) {
  const reason=selectionLockReason(pack);
  if(reason) return reason;
  try { require("./nap-entry-time-policy").policy(pack.nativeParameters?.saisie); } catch { return "Mode natif de saisie des temps a verifier."; }
  const restrictions=pack.restrictions || pack.nativeRules?.restrictions;
  if(!Array.isArray(restrictions) || restrictions.length>3000 || restrictions.some(row=>!row || !/^[A-Z0-9]{1,32}$/.test(String(row.course)) || !Number.isSafeInteger(Number(row.categorie)) || Number(row.categorie)<=0 || ![0,1,"0","1"].includes(row.swim))) return "Les restrictions natives par course restent a verifier avant la modification des courses.";
  return "";
}
function allowedCourses(person,pack,competition,categories,services) {
  const reason=selectionLockReason(pack);
  if(reason) throw new TypeError(reason);
  require("./nap-entry-birth-policy").assertEligible(pack,person);
  if(!Array.isArray(categories) || categories.length>200 || typeof services?.age!=="function" || typeof services?.category!=="function" || typeof services?.forbidden!=="function") throw new TypeError("Correspondance native des categories requise.");
  const age=services.age(competition.date,person.birthDate),category=services.category(competition.date,person.birthDate);
  if(!Number.isInteger(age) || age<0 || age>120 || !category || !["F","M"].includes(person.sex)) throw new TypeError("Identite NAP a completer avant les courses.");
  const matches=categories.filter(row=>Number(row.record_categorie)===1 && row.sexe===person.sex && row.age_d!=null && row.age_f!=null && Number.isInteger(Number(row.age_d)) && Number.isInteger(Number(row.age_f)) && Number(row.age_d)<=age && age<=Number(row.age_f));
  if(matches.length!==1) throw new TypeError("Categorie native absente ou ambigue pour ce nageur.");
  if(!Array.isArray(pack.restrictions)) throw new TypeError("Restrictions natives incompletes.");
  const result=[];
  for(const event of competition.events || []) {
    if(event.type!=="individual" || !event.nativeRecognized || !event.nativeCourses.some(row=>String(row.sexe)===person.sex)) continue;
    if(services.forbidden(event.code,category)) continue;
    if(event.categoryRestrictions?.length && !event.categoryRestrictions.includes(category)) continue;
    const nativeCodes=event.nativeCourses.map(row=>String(row.course || event.code));
    const restrictions=pack.restrictions.filter(row=>nativeCodes.includes(String(row.course)) && Number(row.categorie)===Number(matches[0].id));
    if(restrictions.length>1 || restrictions.some(row=>![0,1].includes(Number(row.swim)))) throw new TypeError("Restriction native ambigue a verifier.");
    // Verified on IntraNAP Jumièges 5194 / 1000 M: native 0 rows are
    // unchecked; absent rows are checked and allowed by default.
    if(restrictions.length && Number(restrictions[0].swim)!==1) continue;
    result.push(event.code);
  }
  return result;
}
module.exports={readCategories,allowedCourses,courseLockReason};
