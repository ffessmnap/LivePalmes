"use strict";
const assert=require("node:assert/strict");
const {previewCreation}=require("../../functions/nap-swimmer-creation");

// Called only after the other tests in the disposable MySQL 5.7 database.
async function verify(pool){
  assert.equal(process.env.NAP_TEAM_FIXTURE_ALLOWED,"isolated-ci");
  const q=async(sql,values=[])=>(await pool.execute(sql,values))[0];
  await q("ALTER TABLE nageurs ADD number VARCHAR(100), ADD KEY nageurs_clef (nom,prenom,date), ADD KEY livepalmes_license_number_id (number,id)");
  const rows=[];
  for(let i=0;i<240;i++){
    rows.push([1000+i,"DENIS","Michel","1980-01-02"]);
    rows.push([2000+i,"DE FRANCO","Alex","1980-01-02"]);
    rows.push([3000+i,"DE FRANCO","Michele","1979-01-02"]);
    rows.push([4000+i,"MICHELET","Autre","1980-01-02"]);
  }
  await q(`INSERT INTO nageurs (id,nom,prenom,date,sexe,club,number) VALUES ${rows.map(()=>"(?,?,?,?,'M','1','')").join(",")}`,rows.flat());
  const input={clubId:"1",swimmer:{lastName:"DE FRANCO",firstName:"Michele",birthDate:"1980-01-02",sex:"M",licenseNumber:"A-05-9999999"}};
  const statements=[],reader={execute:async(query,values)=>{
    assert.ok(query.sql.startsWith("SELECT "),"The preview only reads the fixture");
    statements.push({sql:query.sql,values});return pool.execute(query,values);
  }};
  const preview=(swimmer={})=>previewCreation(reader,{...input,swimmer:{...input.swimmer,...swimmer}},()=>{},(match,type)=>({type:type||"duplicate",name:match.name}));
  let result=await preview();assert.equal(result.alerts.length,0,"960 unrelated or different-year people must not block creation");
  assert.equal(statements.length,4);assert.equal(result.sqlBudget.rowsMax,426);
  for(const query of statements.filter(s=>s.sql.includes("nom LIKE"))){
    const plan=await q("EXPLAIN "+query.sql,query.values);
    assert.ok(plan.some(row=>row.table==="nageurs"&&row.key==="nageurs_clef"&&row.type==="range"),"The real MySQL plan must retain its surname index range: "+JSON.stringify(plan));
    assert.ok(plan.filter(row=>row.table==="n"||row.table==="cl").every(row=>row.key==="PRIMARY"),"Candidate and club joins use primary keys");
  }
  for(const [index,nom]of ["DE-FRANCO","DE'FRANCO","DE’FRANCO"].entries()){
    await q("INSERT INTO nageurs VALUES (?,?,'Michele','1980-01-02','M','1','')",[5500+index,nom]);
    assert.equal((await preview()).alerts.length,index+1,"SQL retains separator variants of the same identity");
  }
  await q("DELETE FROM nageurs WHERE id>=5500");
  await q("INSERT INTO nageurs VALUES (5000,'DE FRANCON','Michel','1980-04-03','M','1','')");
  result=await preview();assert.equal(result.alerts.length,1);assert.equal(result.alerts[0].type,"possible-duplicate");
  await q("INSERT INTO nageurs VALUES (5001,'Michele','DE FRANCO','1980-01-02','M','1','')");
  assert.equal((await preview()).blocksCreation,true,"An exact inverted compound identity still blocks");
  await q("INSERT INTO nageurs VALUES (5002,'DE FRANCO','Michele','1980-01-02','M','1','A-05-9999999')");
  await assert.rejects(preview(),/licence existe deja/);
  await q("UPDATE nageurs SET number='' WHERE id=5002");
  await q("INSERT INTO livepalmes_swimmer_merges VALUES (5001,5002)");
  assert.equal((await preview()).blocksCreation,false,"A merged inverted identity is excluded");
  await q("DELETE FROM livepalmes_swimmer_merges WHERE swimmer_id=5001");
  for(const [index,lastName] of ["VAN DER BERG","D'ANGELO","LE-GRAND","ÉVRARD"].entries()){
    await q("INSERT INTO nageurs VALUES (?,?,'Michele','1980-01-02','M','1','')",[6000+index,lastName]);
    assert.equal((await preview({lastName})).alerts.length,1,"Compound names and accents retain their exact alert: "+lastName);
  }
  await q("DELETE FROM nageurs WHERE id>=5000");
  const ambiguous=Array.from({length:201},(_,i)=>[5000+i,"DE FRANCO","Michele","1980-04-03"]);
  await q(`INSERT INTO nageurs (id,nom,prenom,date,sexe,club,number) VALUES ${ambiguous.map(()=>"(?,?,?,?,'M','1','')").join(",")}`,ambiguous.flat());
  await assert.rejects(preview(),/Aucun nageur cree.*administrateur national/,"201 genuinely close identities still fail closed");
  console.log("Isolated MySQL 5.7: compound-name creation, 960 decoys, real indexed plans, nearby identity alert, licence/inversion/merge guards and true ambiguity verified.");
}
module.exports={verify};
