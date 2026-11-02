"use strict";
// Exactly three additive columns. No table/index creation, no sporting row write.
const {createHash}=require('node:crypto');
const definitions=[{table:'livepalmes_competition_options',name:'entry_format',type:'varchar(24)'},{table:'livepalmes_competition_options',name:'entry_rules_version',type:'varchar(32)'},{table:'livepalmes_competition_fees',name:'team_fee',type:'decimal(10,2)'}];
const sql=definitions.map(x=>`ALTER TABLE \`${x.table}\` ADD COLUMN \`${x.name}\` ${x.type} NULL DEFAULT NULL`);
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),planHash=digest(sql);
function validColumn(rows,spec){if(!rows.length)return false;const row=rows[0];if(rows.length!==1||row.Field!==spec.name||row.Type!==spec.type||row.Null!=='YES'||row.Default!==null||row.Extra||row.Key)throw new TypeError('Colonne du module équipes incompatible.');return true;}
async function approvedTeamEntrySchema(pool,input){
  if(input?.confirmation!=='nap-add-team-entry-columns'||!['prepare','apply'].includes(input.phase))throw new TypeError('Confirmation de structure invalide.');
  const connection=await pool.getConnection();let locked=false;
  const query=async(sql,values=[])=> (await connection.execute({sql,timeout:10000},values))[0];
  try{
    if(input.phase==='apply'){if(input.planHash!==planHash)throw new TypeError('Plan non confirmé.');if(Number((await query("SELECT GET_LOCK('livepalmes_portal_schema',0) AS acquired"))[0]?.acquired)!==1)throw new Error('Structure en cours de modification.');locked=true;}
    const tables=[...new Set(definitions.map(x=>x.table))],before=[];
    for(const table of tables){const row=await query(`SHOW CREATE TABLE \`${table}\``);if(row.length!==1||!/ENGINE=InnoDB\b/.test(row[0]['Create Table']||''))throw new TypeError('Table complémentaire incompatible.');before.push(row[0]);}
    const schemaHash=digest(before),present=[];
    for(const spec of definitions)present.push(validColumn(await query(`SHOW COLUMNS FROM \`${spec.table}\` LIKE '${spec.name}'`),spec));
    const result={source:'nap',mode:'approved-team-entry-schema',planHash,schemaHash,definitions,sql,alreadyPresent:present,dataRowsWritten:false};
    if(input.phase==='prepare')return {...result,definition:before};
    if(input.schemaHash!==schemaHash)throw new TypeError('Structure modifiée depuis la préparation.');
    if(present.some(x=>!x)&&(await query("SELECT ID FROM information_schema.PROCESSLIST WHERE COMMAND='Query' AND INFO REGEXP '^[[:space:]]*(INSERT|UPDATE|DELETE|REPLACE|LOAD|ALTER|DROP|CREATE|TRUNCATE)' LIMIT 101")).length)throw new Error('Écriture en cours : opération différée.');
    for(let i=0;i<definitions.length;i++)if(!present[i])await connection.query({sql:sql[i],timeout:120000});
    for(const spec of definitions)if(!validColumn(await query(`SHOW COLUMNS FROM \`${spec.table}\` LIKE '${spec.name}'`),spec))throw new Error('Vérification de colonne incomplète.');
    return {...result,verified:true};
  }finally{try{if(locked)await query("SELECT RELEASE_LOCK('livepalmes_portal_schema')");}finally{connection.release();}}
}
module.exports={definitions,sql,planHash,validColumn,approvedTeamEntrySchema};
