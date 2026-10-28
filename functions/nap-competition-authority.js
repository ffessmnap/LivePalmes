"use strict";
// The exact native scope witness shared by competition and course writers.
const {nativeEqual}=require("./nap-native-compare");
const SCOPE_SPECS=Object.freeze({
competitions: { key: "id", columns: ["id","libelle","lieu","date","enddate","comite","description","comments","bassin","chrono","ld","type"] },
  compet_parametres: { key: "id", columns: ["id","compet","actif","dateactif","date_limit","officiel","nb_lignes","mailtxt","mailjuges","tps_d","tps_f","niveau","saisie","relais"] }
});
const SPECS=SCOPE_SPECS;

function selectRow(row, spec) {
  if (!row || spec.columns.some(key => !Object.hasOwn(row,key) && !["type","event_type"].includes(key))) throw new TypeError("Sauvegarde native incomplete.");
  return Object.fromEntries(spec.columns.map(key=>[key,row[key]??null]));
}

function authorityGuard(target, snapshot) {
  const clauses=[],values=[];
  for(const table of ["competitions","compet_parametres"]) {
    if(table===target) continue;
    const spec=SPECS[table], row=selectRow(snapshot[table],spec),alias=table==="competitions" ? "scope_c" : "scope_p";
    clauses.push(`EXISTS (SELECT 1 FROM \`${table}\` ${alias} WHERE ${alias}.\`${spec.key}\`=? AND ${spec.columns.map(key=>nativeEqual(`${alias}.\`${key}\``)).join(" AND ")})`);
    values.push(row[spec.key],...spec.columns.map(key=>row[key]));
  }
  return {sql:clauses.join(" AND "),values};
}

module.exports = { SCOPE_SPECS, selectRow, authorityGuard };
