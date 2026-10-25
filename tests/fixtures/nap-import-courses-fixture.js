"use strict";
const {fixture}=require('./nap-import-review-fixture');
const catalog=[
 {id:10,course:'2000',sexe:'M',relais:0,ld:1,actif:1},{id:11,course:'2000',sexe:'F',relais:0,ld:1,actif:1},
 {id:12,course:'2000BI',sexe:'M',relais:0,ld:1,actif:1},{id:13,course:'2000BI',sexe:'F',relais:0,ld:1,actif:1},
 {id:14,course:'50SF',sexe:'M',relais:0,ld:0,actif:1},{id:15,course:'50SF',sexe:'F',relais:0,ld:0,actif:1},
 {id:16,course:'4X200SF',sexe:'0',relais:1,ld:0,actif:1},{id:17,course:'9999BI',sexe:'F',relais:0,ld:1,actif:0}
];
function waterFixture(){
 const f=fixture(),execute=f.pool.execute;
 f.pool.execute=async(query,values)=>{if(query.sql.includes('FROM course_dispo')){f.calls.push({sql:query.sql,values});return [catalog.map(c=>({...c}))];}return execute(query,values);};
 f.input.rawText=f.input.rawText.split('\n').map(line=>{const cells=line.split(';');if(cells[0]==='NAG'&&cells[1]==='TEST')cells[7]='LD02KM';return cells.join(';');}).join('\n');
 return f;
}
module.exports={catalog,waterFixture};
