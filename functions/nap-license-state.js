"use strict";
// Private NAP licence state. Possession of a number never implies validation.
const number = value => String(value ?? "").trim();
function seasonInfo(value) {
  const match = number(value).match(/^(20\d{2}|21\d{2})-(\d{4})$/);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) throw new TypeError("Saison invalide.");
  const startYear = Number(match[1]);
  if (startYear < 2020) throw new TypeError("Saison invalide.");
  return {label:value,startYear,endYear:startYear+1,startDate:`${startYear}-09-01`,endDate:`${startYear+1}-08-31`,requiredValidityDate:`${startYear+1}-12-31`};
}
function currentSeason(date = new Date()) {
  const civil = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit"}).formatToParts(date);
  const year = Number(civil.find(part=>part.type==="year").value), month = Number(civil.find(part=>part.type==="month").value);
  const start = year - (month < 9 ? 1 : 0);
  return `${start}-${start+1}`;
}
function state(row, season = currentSeason()) {
  const licenseNumber = number(row.number);
  const valid = Boolean(licenseNumber && row.license_validation_season === season &&
    number(row.license_validated_number) === licenseNumber && row.license_validation_status === "valid" &&
    ["admin_import","national_manual"].includes(row.license_validation_source) && row.license_validated_at && row.license_validated_by &&
    (row.license_validation_source !== "admin_import" || number(row.license_validity_end_date) >= seasonInfo(season).requiredValidityDate));
  return {licenseNumber,licenseVerificationStatus:valid?"verified":"pending",licenseSeasonLabel:season,licenseSeasonStatus:valid?"valid":"to_check"};
}
function projection(alias="v") {
  if(!/^[a-z]$/.test(alias)) throw new TypeError("Alias invalide.");
  return `${alias}.season AS license_validation_season,${alias}.license_number AS license_validated_number,${alias}.status AS license_validation_status,${alias}.source AS license_validation_source,${alias}.validated_at AS license_validated_at,${alias}.validated_by AS license_validated_by,${alias}.federal_validity_end_date AS license_validity_end_date`;
}
function join(swimmer="n", alias="v", season=currentSeason()) {
  if(!/^[a-z]$/.test(swimmer)||!/^[a-z]$/.test(alias)) throw new TypeError("Alias invalide.");
  const label=seasonInfo(season).label;
  return ` LEFT JOIN livepalmes_swimmer_license_seasons ${alias} FORCE INDEX (PRIMARY) ON ${alias}.swimmer_id=${swimmer}.id AND ${alias}.season='${label}' `;
}
module.exports={number,seasonInfo,currentSeason,state,projection,join};
