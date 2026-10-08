"use strict";
// Serialize an ordinary parameter/course edit with qualification preview and
// application. IntraNAP is unchanged; native before-image guards still apply.
const {positiveId}=require('./nap-direct-calendar');
const {lockName}=require('./nap-qualification-control-start');
async function ordinaryEdit(pool,id,action,services){
  id=positiveId(id);if(typeof action!=='function'||typeof services?.authorize!=='function')throw new TypeError('Modification native autorisee requise.');
  const connection=await pool.getConnection();let locked=false,safe=true;
  const query=async(sql,values)=>(await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(Number((await query('SELECT GET_LOCK(?,0) AS acquired',[lockName(id)]))[0]?.acquired)!==1)throw new TypeError('Un controle des qualifications est en cours. Reessayez.');locked=true;
    if(!await (services.readCompetition||require('./nap-portal-competitions').readNativeCompetition)(connection,id,services.authorize))throw new TypeError('Competition NAP introuvable.');
    if((await query("SELECT id FROM livepalmes_qualification_jobs FORCE INDEX (competition_state) WHERE competition_id=? AND state IN ('preview','ready','apply') ORDER BY state,id LIMIT 1",[id])).length)throw new TypeError('Reprenez ou annulez le controle des qualifications avant de modifier la competition.');
    return await action();
  }finally{
    try{if(locked&&Number((await query('SELECT RELEASE_LOCK(?) AS released',[lockName(id)]))[0]?.released)!==1)safe=false;}catch{safe=false;}
    if(safe)connection.release();else connection.destroy();
  }
}
module.exports={ordinaryEdit};
