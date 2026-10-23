"use strict";
// Freeze only unresolved club values, using the row's owner before the merge.
// One bounded primary-key lookup, never a query for every performance.
const TABLES=["perfs","perfs_relais"];
const clubId=value=>/^[1-9]\d{0,9}$/.test(String(value))&&Number(value)<=2147483647?String(value):null;
async function readClubs(connection,values){
 const ids=[...new Set(values.map(clubId).filter(Boolean))].sort((a,b)=>Number(a)-Number(b));
 if(ids.length>4002)throw new RangeError("Trop de clubs historiques.");
 if(!ids.length)return [];
 const [rows]=await connection.execute({sql:`SELECT num_club,abre_club,nom_club FROM clubs FORCE INDEX (PRIMARY) WHERE num_club IN (${ids.map(()=>"?").join(",")}) ORDER BY num_club LIMIT 4003`,timeout:10000},ids.map(Number));
 if(rows.length>ids.length)throw new TypeError("Annuaire des clubs incoherent.");
 return rows;
}
async function preparePolicy(connection,source,target,snapshots){
 const rows=await readClubs(connection,[source.club,target.club,...TABLES.flatMap(table=>snapshots[table].map(row=>row.club))]);
 return {version:1,recognizedClubIds:rows.map(row=>String(row.num_club)).sort((a,b)=>Number(a)-Number(b))};
}
function historicalClub(table,row,source,target,policy){
 if(!TABLES.includes(table)||!policy)return row.club;
 if(policy.version!==1||!Array.isArray(policy.recognizedClubIds)||policy.recognizedClubIds.some(id=>clubId(id)!==id)||new Set(policy.recognizedClubIds).size!==policy.recognizedClubIds.length)throw new TypeError("Politique de clubs historiques invalide.");
 if(policy.recognizedClubIds.includes(String(row.club)))return row.club;
 const fields=table==="perfs"?["nageur"]:["nageur1","nageur2","nageur3","nageur4"];
 const owners=[source,target].filter(person=>fields.some(field=>Number(row[field])===Number(person.id)));
 if(owners.length!==1)throw new TypeError("Provenance du club historique ambigue.");
 const ownerClub=String(owners[0].club??"");
 if(!policy.recognizedClubIds.includes(ownerClub))throw new TypeError("Club de la fiche d'origine inconnu ; fusion refusee sans historique certain.");
 return ownerClub;
}
module.exports={TABLES,clubId,readClubs,preparePolicy,historicalClub};
