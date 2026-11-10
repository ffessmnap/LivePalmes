"use strict";
const model=require('./nap-direct-model'),{execute}=require('./nap-query');
const QUERY=`SELECT event_id,series_number,COUNT(*) AS row_count,SUM(has_series=1) AS series_entries,SUM(has_result=1) AS result_entries,SUM(has_series=1 AND has_result=1) AS matched_results FROM (SELECT event_id,series_number,has_series,has_result FROM livepalmes_direct_entries WHERE environment=? AND competition_id=? LIMIT ${model.MAX_MEET_ENTRIES+1}) bounded_direct_progress GROUP BY event_id,series_number LIMIT ${model.MAX_MEET_ENTRIES+1}`;
const empty=()=>({entries:0,seriesEntries:0,resultEntries:0,matchedResults:0,seriesCount:0,resultSeriesCount:0,completeSeriesCount:0,unassignedResults:0});
function aggregate(rows){
  const result=new Map();let total=0;
  for(const row of rows){
    const stats=result.get(row.event_id)||{...empty(),rowCount:0},series=Number(row.series_entries)||0,results=Number(row.result_entries)||0,matched=Number(row.matched_results)||0;
    stats.rowCount+=Number(row.row_count)||0;total+=Number(row.row_count)||0;
    stats.seriesEntries+=series;stats.resultEntries+=results;stats.matchedResults+=matched;
    if(Number(row.series_number)>0){if(series)stats.seriesCount++;if(results)stats.resultSeriesCount++;if(series&&matched===series)stats.completeSeriesCount++;(stats.heats||(stats.heats=[])).push({number:Number(row.series_number),seriesEntries:series,resultEntries:results,matchedResults:matched});}
    stats.entries=stats.seriesEntries+stats.resultEntries-stats.matchedResults;stats.unassignedResults=stats.resultEntries-stats.matchedResults;
    if(total>model.MAX_MEET_ENTRIES||stats.rowCount>model.MAX_ENTRIES)throw Error('Volume maximal du Direct dépassé (15 000 participations, 1 000 par épreuve).');
    result.set(row.event_id,stats);
  }
  return new Map([...result].map(([id,{rowCount,...stats}])=>[id,stats]));
}
async function read(connection,scope){
  const rows=await execute(connection,QUERY,scope);
  return aggregate(rows);
}
function visible(stats,publication){
  if(!stats)return null;
  const series=publication.series?stats.seriesEntries:0,results=publication.results?stats.resultEntries:0,matched=publication.series&&publication.results?stats.matchedResults:0;
  return {...stats,...(stats.heats?{heats:stats.heats.map(heat=>({...heat,seriesEntries:publication.series?heat.seriesEntries:0,resultEntries:publication.results?heat.resultEntries:0,matchedResults:publication.series&&publication.results?heat.matchedResults:0}))}:{}),entries:series+results-matched,seriesEntries:series,resultEntries:results,matchedResults:matched,seriesCount:publication.series?stats.seriesCount:0,resultSeriesCount:publication.results?stats.resultSeriesCount:0,completeSeriesCount:publication.series&&publication.results?stats.completeSeriesCount:0,unassignedResults:publication.results?results-matched:0};
}
module.exports={read,aggregate,visible,empty,QUERY};
