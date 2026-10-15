"use strict";
const {COLUMNS,positiveId,fingerprint,nativeRow}=require("./nap-performance-change-plan");
const {formatTime,parseCompactTime}=require("./nap-performance-normalization");
// Search uses the existing indexed person search. A page reads 101 native rows,
// joined by primary keys (no network request per performance, hidden included).
function createPerformanceAdministration({getPool,authorize}) {
  return async function read(request) {
    const actor=await authorize(request);
    const input=request.data||{},pool=await getPool();
    if(input.action==="search") return {ok:true,source:"nap",...await require("./nap-portal-swimmers").searchPortalSwimmers(pool,input.query)};
    if(input.action!=="list")throw new TypeError("Action de consultation invalide.");
    const id=positiveId(Number(input.swimmerId)),cursor=input.cursor===undefined?0:input.cursor;
    const filters=input.filters||{};
    if(typeof filters!=="object"||Array.isArray(filters)||Object.keys(filters).some(key=>!["course","year","competitionId"].includes(key)))throw new TypeError("Filtres invalides.");
    if(filters.course&&!/^[A-Za-z0-9]{2,16}$/.test(filters.course)||filters.year&&!/^(19|20)\d{2}$/.test(String(filters.year)))throw new TypeError("Filtres invalides.");
    const legacyCursor=Number.isSafeInteger(cursor)&&cursor>0&&cursor<=2147483647;
    if(cursor!==0&&!legacyCursor&&(!cursor||typeof cursor!=="object"||!/^\d{4}-\d{2}-\d{2}$/.test(cursor.date)||!Number.isSafeInteger(cursor.id)||cursor.id<1||cursor.id>2147483647))throw new TypeError("Page de resultats invalide.");
    const where=["p.nageur=?"],values=[id];
    if(filters.course){where.push("p.course=?");values.push(filters.course);}
    if(filters.year){where.push("c.date>=? AND c.date<?");values.push(`${filters.year}-01-01`,`${Number(filters.year)+1}-01-01`);}
    if(filters.competitionId){where.push("p.compet=?");values.push(positiveId(Number(filters.competitionId)));}
    if(legacyCursor){where.push("p.id>?");values.push(cursor);}
    else if(cursor!==0){where.push("(c.date<? OR (c.date=? AND p.id<?))");values.push(cursor.date,cursor.date,cursor.id);}
    let filterOptions;
    if(input.includeFilters===true){
      const [metadata]=await pool.execute({sql:"SELECT STRAIGHT_JOIN p.course,p.compet AS competitionId,c.libelle AS competition,c.date,c.lieu AS location FROM perfs p FORCE INDEX (perf) LEFT JOIN competitions c ON c.id=p.compet WHERE p.nageur=? ORDER BY p.id LIMIT 5001",timeout:10000},[id]);
      if(metadata.length>5000)throw new RangeError("Plus de 5 000 resultats pour ce nageur : consultation refusee.");
      filterOptions=[...new Map(metadata.map(row=>{const item={...row,competitionId:String(row.competitionId),year:String(row.date||"").slice(0,4)};return [[item.course,item.competitionId,item.year].join("|"),item];})).values()];
    }else{
      const [budget]=await pool.execute({sql:"SELECT COUNT(*) AS count FROM (SELECT nageur FROM perfs FORCE INDEX (perf) WHERE nageur=? LIMIT 5001) bounded",timeout:10000},[id]);
      if(Number(budget[0]?.count)>5000)throw new RangeError("Plus de 5 000 resultats pour ce nageur : consultation refusee.");
    }
    const [rows]=await pool.execute({sql:`SELECT STRAIGHT_JOIN ${COLUMNS.map(c=>`p.\`${c}\``).join(",")},v.hidden,c.libelle,c.date,c.lieu,n.nom,n.prenom,cl.abre_club,cl.nom_club FROM perfs p FORCE INDEX (perf) LEFT JOIN livepalmes_performance_visibility v FORCE INDEX (PRIMARY) ON v.performance_id=p.id JOIN competitions c ON c.id=p.compet JOIN nageurs n ON n.id=p.nageur LEFT JOIN clubs cl ON cl.num_club=p.club AND CAST(cl.num_club AS CHAR)=p.club WHERE ${where.join(" AND ")} ORDER BY ${legacyCursor?"p.id":"c.date DESC,p.id DESC"} LIMIT 101`,timeout:10000},values);
    const page=rows.slice(0,100);
    return {ok:true,source:"nap",...(filterOptions?{filterOptions}:{}),national:actor?.national===true,hasMore:rows.length>100,cursor:page.length?(legacyCursor?page.at(-1).id:{date:String(page.at(-1).date).slice(0,10),id:page.at(-1).id}):cursor,rows:page.map(row=>{
      const native=nativeRow(row),hidden=Number(row.hidden||0)===1,timeValue=parseCompactTime(row.tps);
      return {id:String(row.id),source:"nap",swimmerId:String(row.nageur),swimmer:[row.prenom,row.nom].filter(Boolean).join(" "),course:row.course,
        competitionId:String(row.compet),competition:row.libelle,date:row.date,location:row.lieu,club:row.abre_club||row.nom_club||`Club non résolu (${row.club||"valeur vide"})`,clubId:String(row.club),
        time:timeValue?formatTime(timeValue):String(row.tps||""),timeValue,hidden,native,expectedFingerprint:fingerprint(native,hidden)};
    })};
  };
}
module.exports={createPerformanceAdministration};
