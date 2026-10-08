"use strict";
// Native birth-date limits, inclusive at both ends, confirmed by Antoine.
// Pure checks: no identity lookup, cache or write.
function day(value) {
  if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new TypeError("Date de naissance NAP a verifier.");
  const parsed=new Date(value+"T00:00:00.000Z");
  if(!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value || value.startsWith("0000")) throw new TypeError("Date de naissance NAP a verifier.");
  return value;
}
function bounds(competition) {
  const parameters=competition?.nativeParameters;
  if(!parameters) throw new TypeError("Limites de naissance natives a verifier.");
  const start=parameters.cat_d==null || parameters.cat_d==="" ? "" : day(parameters.cat_d);
  const end=parameters.cat_f==null || parameters.cat_f==="" ? "" : day(parameters.cat_f);
  if(start && end && start>end) throw new TypeError("Limites de naissance natives inversees.");
  return {start,end};
}
function eligible(competition,person) {
  const {start,end}=bounds(competition);
  if(!start && !end) return true;
  const birth=day(person?.birthDate);
  return (!start || birth>=start) && (!end || birth<=end);
}
function assertEligible(competition,person) {
  if(!eligible(competition,person)) throw new TypeError("La date de naissance du nageur est hors des limites de cette competition.");
}
module.exports={bounds,eligible,assertEligible};
