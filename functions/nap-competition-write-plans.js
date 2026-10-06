"use strict";
// Private, fixed EXPLAIN diagnostic. Never execute the statements under test.
const native=require("./nap-portal-competitions");
const {SPECS,buildStatement}=require("./nap-portal-competition-change");
const schema=require("./nap-approved-portal-schema");
async function inspectCompetitionWritePlans(pool) {
  const connection=await pool.getConnection();
  try {
    const pack=await native.readNativeCompetition(connection,5140,()=>{});
    if(!pack) throw new TypeError("Dossier de controle absent.");
    const authority={competitions:pack.nativeSnapshot.competition,compet_parametres:pack.nativeSnapshot.parameters};
    const examples=[];
    for(const table of ["competitions","compet_parametres"]) {
      const before=authority[table],after={...before};
      after[table==="competitions" ? "description" : "mailtxt"]="EXPLAIN only";
      examples.push({table,key:SPECS[table].key,before,after});
    }
    for(const [table,definition,field] of [["livepalmes_competition_options",schema.tables[0],"address"],["livepalmes_competition_fees",schema.tables[2],"helloasso_url"]]) {
      const row=Object.fromEntries(definition.columns.map(column=>[column.name,column.name==="competition_id" ? 5140 : column.name==="version" ? "1" : column.name.endsWith("_at") ? "2026-10-06 12:00:00.000000" : column.name.endsWith("_by") ? "diagnostic" : null]));
      if(table.endsWith("options")) {row.entry_closed=null;row.invited_region_ids=["OPEN"];}
      examples.push({table,key:SPECS[table].key,before:null,after:row});
      examples.push({table,key:SPECS[table].key,before:row,after:{...row,[field]:"EXPLAIN only",version:"2"}});
    }
    const plans=[];
    for(const item of examples) {
      const statement=buildStatement(item,authority);
      const [rows]=await connection.execute({sql:`EXPLAIN ${statement.sql}`,timeout:10000},statement.values);
      if(!rows.length || rows.length>20) throw new RangeError("Plan de controle invalide.");
      const plan=rows.map(row=>({table:row.table ?? null,type:row.type ?? null,key:row.key ?? null,rows:Number(row.rows || 0),extra:row.Extra || ""}));
      if(plan.some(row=>row.table && !["const","eq_ref","ref","range"].includes(row.type) && !(row.type==="index" && row.key==="PRIMARY" && row.rows<=2) || row.table && !row.key)) throw new TypeError("Plan non indexe.");
      plans.push({target:item.table,operation:item.before ? "update" : "insert",plan});
    }
    return {source:"nap",mode:"portal-competition-write-plans-readonly",plans,writesExecuted:false,complete:true};
  } finally {connection.release();}
}
module.exports={inspectCompetitionWritePlans};
