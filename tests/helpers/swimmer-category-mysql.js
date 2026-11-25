"use strict";
const assert = require("node:assert/strict");
const {read} = require("../../functions/nap-category-benchmarks");

async function verify(pool) {
  const db = await pool.getConnection();
  const tables = {
    perfs:"id INT PRIMARY KEY,nageur INT,compet INT,course VARCHAR(8),cat VARCHAR(8),relais INT,passage VARCHAR(8),club VARCHAR(16),tps VARCHAR(10),KEY livepalmes_course_relais_tps(course,relais,tps,id)",
    competitions:"id INT PRIMARY KEY,date DATE,bassin INT,ld INT",
    nageurs:"id INT PRIMARY KEY,nom VARCHAR(32),prenom VARCHAR(32),date DATE,sexe CHAR(1)",
    clubs:"num_club INT PRIMARY KEY,comite_club INT",
    livepalmes_performance_visibility:"performance_id INT PRIMARY KEY,hidden INT"
  };
  try {
    for(const [name,columns] of Object.entries(tables)) await db.query("CREATE TEMPORARY TABLE "+name+" ("+columns+")");
    await db.query("INSERT INTO clubs VALUES (1,3),(2,5)");
    await db.query("INSERT INTO competitions VALUES (1,'2024-02-01',50,0),(2,'2025-02-01',50,0),(3,'2026-02-01',50,0)");
    for(let i=1;i<=23;i++) {
      await db.execute("INSERT INTO nageurs VALUES (?,'Test',?,'2000-01-01','F')",[i,"Fictive"+i]);
      await db.execute("INSERT INTO perfs VALUES (?,?,1,'100SF','FSE',0,?,?,?)",[i,i,i===22?"1":"0",i===21?"2":"1",String(4000+i)]);
    }
    await db.query("INSERT INTO livepalmes_performance_visibility VALUES (23,1)");
    await db.query("INSERT INTO perfs VALUES (90,1,2,'100SF','FSE',0,'0','1','003000'),(91,1,3,'100SF','FSE',0,'0','1','004150')");
    const plans=[];
    const checked={execute:async (query,args)=>{
      if(!query.sql.startsWith("SELECT COUNT")) plans.push(...(await db.execute("EXPLAIN "+query.sql,args))[0]);
      return db.execute(query,args);
    }};
    const result=await read(checked,{course:"100SF",sex:"F",pool:"50",groups:"S:2024,2026"});
    assert.deepEqual(result.groups,[{category:"S",pool:"50",count:20,lower:4006,median:4011,upper:4015}]);
    assert.ok(plans.some(p=>p.table==="p" && p.key==="livepalmes_course_relais_tps"),"Course index used");
  } finally {
    for(const name of Object.keys(tables)) await db.query("DROP TEMPORARY TABLE IF EXISTS "+name);
    db.release();
  }
}
module.exports={verify};
