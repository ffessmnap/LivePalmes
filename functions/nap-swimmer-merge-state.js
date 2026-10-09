"use strict";
// An indexed predicate/join, never an additional query per swimmer.
function notMerged(alias="nageurs"){
  if(!/^[a-z][a-z0-9_]*$/.test(alias))throw new TypeError("Alias natif invalide.");
  return `NOT EXISTS (SELECT 1 FROM livepalmes_swimmer_merges WHERE swimmer_id=${alias}.id)`;
}
const projection="m.target_id AS merged_into_id";
const join=" LEFT JOIN livepalmes_swimmer_merges m FORCE INDEX (PRIMARY) ON m.swimmer_id=n.id ";
module.exports={notMerged,projection,join};
