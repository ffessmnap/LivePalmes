"use strict";
// Private, fixed EXPLAIN diagnostic. Never execute the statements under test.
const native=require("./nap-portal-competitions");
const {SPECS,buildStatement}=require("./nap-portal-competition-change");
const schema=require("./nap-approved-portal-schema");
const {buildRemovalStatement}=require("./nap-course-removal");
const {buildLeaderUpdate,COLUMNS:LEADER_COLUMNS}=require("./nap-team-leader-change");
function indexedPlanRow(row,item,index) {
  // INSERT destination metadata is not a read of the destination table.
  if(index===0 && !item.before && row.table===item.table && row.selectType==="INSERT" && row.type==="ALL" && !row.key && (row.rows===null || row.rows===0)) return true;
  return !row.table || Boolean(row.key && (["const","eq_ref","ref","range"].includes(row.type) || (row.type==="index" && row.key==="PRIMARY" && row.rows!==null && row.rows<=2)));
}
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
    if(pack.courses.length) {
      const row=pack.courses[0];
      const before={id:row.id,compet:5140,pos:row.pos,id_course:row.id_course,opencourse:row.opencourse,cost:row.cost,limitnageur:row.limitnageur};
      for(const national of [false,true]) examples.push({table:"compet_courses",before,removal:true,national});
    }
    const leaderSql=`SELECT ${LEADER_COLUMNS.map(key=>`\`${key}\``).join(",")} FROM chefsdequipe FORCE INDEX (livepalmes_compet_id) WHERE compet=? ORDER BY id LIMIT 1`;
    const [leaderPlan]=await connection.execute({sql:`EXPLAIN ${leaderSql}`,timeout:10000},[5140]);
    if(!leaderPlan.length || leaderPlan.some(row=>row.type==="ALL" || !row.key)) throw new TypeError("Lecture chef d'equipe non indexee.");
    const [leaders]=await connection.execute({sql:leaderSql,timeout:10000},[5140]);
    if(leaders.length) examples.push({table:"chefsdequipe",before:leaders[0],after:{...leaders[0],nom:"EXPLAIN only"},leader:true});
    const plans=[],errors=[];
    for(const item of examples) {
      try {
        const statement=item.leader ? buildLeaderUpdate(item,authority,"2099-10-07T19:59:00.000Z") : item.removal ? buildRemovalStatement(item.before,authority,item.national) : buildStatement(item,authority);
        const [rows]=await connection.execute({sql:`EXPLAIN ${statement.sql}`,timeout:10000},statement.values);
        if(!rows.length || rows.length>20) throw new RangeError("Plan de controle invalide.");
        const plan=rows.map(row=>({table:row.table ?? null,selectType:row.select_type ?? null,type:row.type ?? null,key:row.key ?? null,rows:row.rows==null ? null : Number(row.rows),extra:row.Extra || ""}));
        plans.push({target:item.table,operation:item.removal ? "delete" : item.before ? "update" : "insert",plan});
        if(plan.some((row,index)=>!indexedPlanRow(row,item,index))) errors.push({target:item.table,operation:item.before ? "update" : "insert",reason:"non-indexed"});
      } catch(error) {
        errors.push({target:item.table,operation:item.before ? "update" : "insert",reason:({ER_PARSE_ERROR:"syntax",ER_BAD_FIELD_ERROR:"column",ER_NOT_SUPPORTED_YET:"unsupported"})[error.code] || (error instanceof RangeError ? "volume" : "unavailable")});
      }
    }
    return {source:"nap",mode:"portal-competition-write-plans-readonly",plans,errors,writesExecuted:false,complete:errors.length===0};
  } catch(error) {
    return {source:"nap",mode:"portal-competition-write-plans-readonly",plans:[],errors:[{target:"native-reader",reason:({ER_PARSE_ERROR:"syntax",ER_BAD_FIELD_ERROR:"column",ER_NO_SUCH_TABLE:"table"})[error.code] || "unavailable"}],writesExecuted:false,complete:false};
  } finally {connection.release();}
}
module.exports={inspectCompetitionWritePlans,indexedPlanRow};
