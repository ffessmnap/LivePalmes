"use strict";
const { swimmerId } = require("./nap-swimmer-values");
const { readDirectSwimmer } = require("./nap-direct-swimmer");
const {searchDirectSwimmers}=require("./nap-direct-search");

// One indexed technical lookup. The original identity may have been deleted;
// successive merges flatten these pointers to the remaining native swimmer.
async function resolveId(pool,input){
  const id=swimmerId(input);
  const [rows]=await pool.execute({sql:"SELECT target_id FROM livepalmes_swimmer_merges FORCE INDEX (PRIMARY) WHERE swimmer_id=? LIMIT 1",timeout:10000},[id]);
  return rows.length?swimmerId(rows[0].target_id):id;
}
async function readSwimmer(pool,input){
  return readDirectSwimmer(pool,await resolveId(pool,input));
}
async function searchSwimmers(pool,input){
  const query=typeof input==="string"&&/^\d+$/.test(input.trim())
    ? String(await resolveId(pool,input.trim())) : input;
  return searchDirectSwimmers(pool,query);
}
module.exports={readSwimmer,searchSwimmers};
