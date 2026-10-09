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
    if(!Number.isSafeInteger(cursor)||cursor<0||cursor>2147483647)throw new TypeError("Page de resultats invalide.");
    const [budget]=await pool.execute({sql:"SELECT COUNT(*) AS count FROM (SELECT nageur FROM perfs FORCE INDEX (perf) WHERE nageur=? LIMIT 5001) bounded",timeout:10000},[id]);
    if(Number(budget[0]?.count)>5000)throw new RangeError("Plus de 5 000 resultats pour ce nageur : affinez la consultation avant correction.");
    const [rows]=await pool.execute({sql:`SELECT STRAIGHT_JOIN ${COLUMNS.map(c=>`p.\`${c}\``).join(",")},v.hidden,c.libelle,c.date,c.lieu,n.nom,n.prenom,cl.abre_club FROM perfs p FORCE INDEX (perf) LEFT JOIN livepalmes_performance_visibility v FORCE INDEX (PRIMARY) ON v.performance_id=p.id JOIN competitions c ON c.id=p.compet JOIN nageurs n ON n.id=p.nageur LEFT JOIN clubs cl ON cl.num_club=p.club AND CAST(cl.num_club AS CHAR)=p.club WHERE p.nageur=? AND p.id>? ORDER BY p.id LIMIT 101`,timeout:10000},[id,cursor]);
    const page=rows.slice(0,100);
    return {ok:true,source:"nap",national:actor?.national===true,hasMore:rows.length>100,cursor:page.at(-1)?.id||cursor,rows:page.map(row=>{
      const native=nativeRow(row),hidden=Number(row.hidden||0)===1,timeValue=parseCompactTime(row.tps);
      return {id:String(row.id),source:"nap",swimmerId:String(row.nageur),swimmer:[row.prenom,row.nom].filter(Boolean).join(" "),course:row.course,
        competitionId:String(row.compet),competition:row.libelle,date:row.date,location:row.lieu,club:row.abre_club||row.club,clubId:String(row.club),
        time:timeValue?formatTime(timeValue):String(row.tps||""),timeValue,hidden,native,expectedFingerprint:fingerprint(native,hidden)};
    })};
  };
}
module.exports={createPerformanceAdministration};
