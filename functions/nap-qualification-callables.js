"use strict";
// Route only an authenticated native competition scope. Dispatch adds no
// sporting source or unbounded lookup: the actual processor authorizes and
// reads the same bounded NAP competition again under its write lock.
async function process(pool,input,services){
  const scope=require('./nap-qualification-jobs').scope(input);
  input={...input,competitionId:scope.competitionId};
  let action=input.action;
  if(!action){
    const connection=await pool.getConnection();
    try{
      const job=await (services.readJob||require('./nap-qualification-jobs').readJob)(connection,input);
      if(!job)throw new TypeError('Controle NAP introuvable.');
      action=job.state==='apply'?'apply':'preview';
    }finally{connection.release();}
  }
  if(!['preview','cancel','details','confirm','apply'].includes(action))throw new TypeError('Action de qualification inconnue.');
  if(['details','confirm'].includes(action)){
    const connection=await pool.getConnection();
    try{return await (services.reviewControl||require('./nap-qualification-control-review').reviewControl)(connection,{...input,action,confirmed:action==='confirm'},services);}
    finally{connection.release();}
  }
  if(action==='apply')return (services.applyControl||require('./nap-qualification-application-process').applyControl)(pool,{...input,action},services);
  return (services.processPreview||require('./nap-qualification-preview-process').processPreview)(pool,{...input,action},services);
}
module.exports={process};
