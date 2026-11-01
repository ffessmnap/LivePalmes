"use strict";
// Existing singleton, values or query bodies; no business change.
const { PAGE_SIZE, OPTION_COLUMNS, SOURCES, cursors, person } = require("./nap-club-people-values");
async function readNationalPeople(pool,input,authorize) {
  const cursor=cursors(input?.cursor);
  if(typeof authorize!=="function") throw new TypeError("Autorisation nationale requise.");
  await authorize();
  const people=[],nextCursor={leaders:null,officials:null};
  for(const [kind,spec] of Object.entries(SOURCES)) {
    if(cursor[kind]===null) continue;
    const [rows]=await pool.execute({sql:`SELECT ${spec.columns.map(key=>`n.\`${key}\``).join(",")},${OPTION_COLUMNS.map(key=>`o.\`${key}\` AS \`option_${key}\``).join(",")},cl.nom_club,cl.abre_club FROM \`${spec.table}\` n FORCE INDEX (PRIMARY) LEFT JOIN livepalmes_club_people_options o ON o.source=? AND o.person_id=n.id LEFT JOIN clubs cl FORCE INDEX (PRIMARY) ON cl.num_club=n.club AND CAST(cl.num_club AS CHAR)=n.club WHERE n.id>? ORDER BY n.id LIMIT ${PAGE_SIZE+1}`,timeout:10000},[spec.table,cursor[kind]]);
    if(rows.length>PAGE_SIZE+1) throw new RangeError("Page nationale trop volumineuse.");
    let last=cursor[kind];
    for(const row of rows) {if(!Number.isSafeInteger(Number(row.id)) || Number(row.id)<=last) throw new TypeError("Page nationale incoherente.");last=Number(row.id);}
    const page=rows.slice(0,PAGE_SIZE);
    people.push(...page.filter(row=>kind!=="leaders" || row.nom!=="-1" && row.prenom!=="-1").map(row=>({...person(row,kind,row.option_person_id==null?null:Object.fromEntries(OPTION_COLUMNS.map(key=>[key,row[`option_${key}`]]))),clubName:String(row.nom_club||""),club:String(row.abre_club||"")})));
    if(rows.length>PAGE_SIZE) nextCursor[kind]=Number(page.at(-1).id);
  }
  return {ok:true,source:"nap",people,nextCursor,hasMore:Object.values(nextCursor).some(id=>id!==null),sqlBudget:{queriesMax:2,rowsMax:202}};
}

module.exports = { readNationalPeople };
