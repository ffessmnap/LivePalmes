"use strict";
// Existing singleton, values or query bodies; no business change.
const { PAGE_SIZE, OPTION_COLUMNS, SOURCES, cursors, person } = require("./nap-club-people-values");
async function readClubPeople(pool,input,authorize) {
  if(typeof authorize!=="function" || typeof input?.clubId!=="string" || !/^\d{1,16}$/.test(input.clubId)) throw new TypeError("Club autorise requis.");
  const cursor=cursors(input.cursor);
  await authorize({clubId:input.clubId});
  const people=[],nextCursor={leaders:null,officials:null};
  let queries=0;
  for(const [kind,spec] of Object.entries(SOURCES)) {
    if(cursor[kind]===null) continue;
    queries++;
    const [rows]=await pool.execute({sql:`SELECT ${spec.columns.map(key=>`n.\`${key}\``).join(",")},${OPTION_COLUMNS.map(key=>`o.\`${key}\` AS \`option_${key}\``).join(",")} FROM \`${spec.table}\` n FORCE INDEX (livepalmes_club_id) LEFT JOIN livepalmes_club_people_options o ON o.source=? AND o.person_id=n.id WHERE n.club=? AND n.id>? ORDER BY n.id LIMIT ${PAGE_SIZE+1}`,timeout:10000},[spec.table,input.clubId,cursor[kind]]);
    if(rows.length>PAGE_SIZE+1) throw new RangeError("Page NAP trop volumineuse.");
    let last=cursor[kind];
    for(const row of rows) {
      if(String(row.club)!==input.clubId || !Number.isSafeInteger(Number(row.id)) || Number(row.id)<=last) throw new TypeError("Page NAP hors club ou incoherente.");
      last=Number(row.id);
    }
    const page=rows.slice(0,PAGE_SIZE);
    people.push(...page.filter(row=>kind!=="leaders" || row.nom!=="-1" && row.prenom!=="-1").map(row=>person(row,kind,row.option_person_id==null?null:Object.fromEntries(OPTION_COLUMNS.map(key=>[key,row[`option_${key}`]])))));
    if(rows.length>PAGE_SIZE) nextCursor[kind]=Number(page.at(-1).id);
  }
  return {source:"nap",people,nextCursor,hasMore:Object.values(nextCursor).some(id=>id!==null),nativeDirectoryReadOnly:true,
    sqlBudget:{queriesMax:2,queriesExecuted:queries,rowsMax:2*(PAGE_SIZE+1)}};
}

module.exports = { readClubPeople };
