"use strict";
const assert = require("node:assert/strict");
const { readPublicTop } = require("../../functions/nap-public-top");
const { readDirectTop } = require("../../functions/nap-direct-tops");

async function verify(pool) {
  // The enclosing suite owns a newly created, localhost-only MySQL 5.7 fixture.
  const tables = {
    clubs: "num_club INT PRIMARY KEY,comite_club INT,abre_club VARCHAR(16),nom_club VARCHAR(32)",
    nageurs: "id INT PRIMARY KEY,nom VARCHAR(32),prenom VARCHAR(32),date DATE,sexe CHAR(1),club VARCHAR(16), KEY livepalmes_club_id(club,id)",
    competitions: "id INT PRIMARY KEY,date DATE,bassin INT,ld INT,libelle VARCHAR(32),lieu VARCHAR(32),chrono CHAR(1)",
    perfs: "id INT PRIMARY KEY,nageur INT,compet INT,course VARCHAR(8),cat VARCHAR(8),relais INT,passage VARCHAR(8),club VARCHAR(16),tps VARCHAR(10),KEY livepalmes_course_relais_tps(course,relais,tps,id), KEY nageur(nageur), KEY livepalmes_club_id(club,id)",
    livepalmes_competition_options: "competition_id INT PRIMARY KEY,city VARCHAR(32)",
    livepalmes_performance_visibility: "performance_id INT PRIMARY KEY,hidden INT"
  };
  try {
    for (const [table, fields] of Object.entries(tables)) await pool.query("CREATE TABLE " + table + " (" + fields + ")");
    await pool.query("INSERT INTO clubs VALUES (1,13,'A','Club A'),(2,21,'B','Club B'),(3,6,'C','Club C')");
    await pool.query("INSERT INTO nageurs VALUES (1,'Une','Alice','2000-01-01','F','3'),(2,'Deux','Béa','2010-01-01','F','2'),(3,'Trois','Carl','2000-01-01','M','1')");
    await pool.query("INSERT INTO competitions VALUES (1,'2024-02-01',25,0,'Une','A','M'),(2,'2025-02-01',50,0,'Deux','B','E')");
    await pool.query(`INSERT INTO perfs VALUES
      (1,1,1,'100SF','FSE',0,'0','1','4250'),(2,2,2,'100SF','FCA',0,'0','999','004250'),
      (3,1,2,'100SF','FSE',0,'0','1','004250'),(4,2,1,'100SF','FMI',0,'0','3','003100'),
      (5,2,2,'100SF','FCA',0,'0','2','003200'),(6,1,1,'100SF','FSE',1,'0','1','3500'),
      (7,1,1,'50SF','FSE',0,'1','1','2000'),(8,3,1,'50SF','HSE',0,'0','1','1500')`);
    await pool.query("INSERT INTO livepalmes_competition_options VALUES (2,'Ville B')");
    await pool.query("INSERT INTO livepalmes_performance_visibility VALUES (5,1)");
    const plans = [];
    const checkedPool = {getConnection: async () => {
      const db = await pool.getConnection();
      return {
        query: sql => db.query(sql), rollback: () => db.rollback(), release: () => db.release(),
        execute: async (query, args) => {
          if (query.sql.includes("winners")) plans.push(...(await db.execute("EXPLAIN " + query.sql, args))[0]);
          return db.execute(query, args);
        }
      };
    }};
    const read = (sex, category, region = "13,21") => readPublicTop(checkedPool, {view:"regional-records", region, sex, category});
    const all = (await read("F","")).rows;
    assert.deepEqual(all.filter(row => row.course === "100SF").map(row => [row.swimmer,row.time,row.club,row.pool]),
      [["Alice Une","42.50","A","25"],["Béa Deux","42.50","B","50"]]);
    assert.deepEqual(all.filter(row => row.course === "100SF").map(row => [row.location,row.chrono,row.swimmerId,row.birthYear]),
      [["A","M","1","2000"],["Ville B","E","2","2010"]]);
    assert.equal(all.find(row => row.course === "50SF").time, "20.00");
    for (const [sex, category] of [["F",""],["F","C"],["M",""]]) {
      const rows = (await read(sex,category)).rows;
      for (const course of ["50SF","100SF"]) {
        const top = await readDirectTop(pool, {course,sex,category,region:"13,21",limit:5000});
        const expected = top.rows.filter(row => row.time === top.rows[0].time).map(row => row.swimmer);
        assert.deepEqual(rows.filter(row => row.course === course).map(row => row.swimmer),expected);
      }
    }
    assert.deepEqual((await read("F","","99")).rows, []);
    await assert.rejects(read("F","",""), TypeError);
    assert.ok(plans.some(row => row.key === "nageur"));
    assert.ok(plans.some(row => row.key === "livepalmes_club_id"));
  } finally {
    for (const table of Object.keys(tables).reverse()) await pool.query("DROP TABLE IF EXISTS " + table);
  }
}
module.exports = { verify };
