'use strict';
const {civilAt}=require('./nap-paris-time');
function validDay(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function lastDay(date,endDate){
  if(!validDay(date))return '';
  const missing=endDate==null||endDate===''||endDate==='0000-00-00';
  const end=missing?date:endDate;return validDay(end)&&end>=date?end:'';
}
function effective(configured,date,endDate,now=Date.now()){
  if(configured!=='active')return configured;
  const end=lastDay(date,endDate);return end&&civilAt(now).slice(0,10)>end?'archived':'active';
}
const fromRow=(row,now=Date.now())=>row?effective(row.state,row.direct_date,row.direct_enddate,now):null;
function closed(row,now=Date.now(),message='Les consoles de cette compétition sont fermées.'){
  return Object.assign(Error(message),{directCode:'failed-precondition',directDetails:{directState:fromRow(row,now),configuredState:row?.state||null}});
}
function writable(row,correction=false,now=Date.now()){
  const state=fromRow(row,now);
  if(correction?state!=='archived':state!=='active')throw closed(row,now,state==='archived'?'Le Direct est archivé. Utiliser « Mettre à jour l’archive » pour corriger les résultats.':correction&&state==='active'?'Le Direct n’est plus en archive. Actualiser avant de poursuivre.':'Les consoles de cette compétition sont fermées.');
}
module.exports={validDay,lastDay,effective,fromRow,closed,writable};
