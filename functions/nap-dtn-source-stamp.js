"use strict";
const {createHash}=require("node:crypto");
const {visibilityStamp}=require("./nap-performance-visibility");
const TABLES=["clubs","competitions","nageurs","perfs"];
// Fixed budget: two metadata reads plus one indexed visibility revision row,
// and one session-only cache setting on MySQL 8.
// MyISAM timestamps are usable only on a supported server with settled writes.
async function sourceStamp(pool,{settled=false}={}) {
  const connection=await pool.getConnection();
  const execute=async(sql)=>(await connection.execute({sql,timeout:10000}))[0];
  try {
    const [server]=await execute("SELECT VERSION() AS version,@@version_compile_os AS os");
    if(!server || !/^Linux/i.test(server.os||"") || !/^[58]\./.test(server.version||"") || /MariaDB/i.test(server.version)) throw new TypeError("Suivi des modifications NAP a verifier avant calcul DTN.");
    if(/^8\./.test(server.version)) await execute("SET SESSION information_schema_stats_expiry=0");
    const rows=(await execute("SELECT TABLE_NAME,ENGINE,UNIX_TIMESTAMP(UPDATE_TIME) AS changed_at,UNIX_TIMESTAMP() AS server_now FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('clubs','competitions','nageurs','perfs') ORDER BY TABLE_NAME LIMIT 5"));
    if(rows.length!==4 || rows.some((r,i)=>r.TABLE_NAME!==TABLES[i] || r.ENGINE!=="MyISAM" || !Number.isSafeInteger(Number(r.changed_at)) || Number(r.changed_at)<=0 || !Number.isSafeInteger(Number(r.server_now)))) throw new TypeError("Suivi des modifications NAP indisponible.");
    if(settled && rows.some(r=>Number(r.server_now)-Number(r.changed_at)<2)) throw new TypeError("NAP vient d'etre modifiee. Reessayez le calcul dans quelques secondes.");
    const visibility=await visibilityStamp(connection,{settled});
    const fingerprint=createHash("sha256").update(JSON.stringify({native:rows.map(r=>[r.TABLE_NAME,Number(r.changed_at)]),visibility})).digest("hex");
    return {fingerprint,latestChange:Math.max(...rows.map(r=>Number(r.changed_at)))};
  }finally {connection.release();}
}
module.exports={TABLES,sourceStamp};
