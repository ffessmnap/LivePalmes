"use strict";
// Local operator tool. Firebase is read-only and any source dependency blocks.
const fs=require("node:fs"),path=require("node:path"),zlib=require("node:zlib");
const p=require("./club-merge-plan"),existing=require("./club-merge-engine"),backup=require("./club-merge-backup"),crypto=require("./production-backup-crypto");
function scope(manifest){
  if(!Array.isArray(manifest?.pairs)||!manifest.pairs.length||manifest.pairs.length>14||manifest.pairs.some(pair=>!Array.isArray(pair)||pair.length!==2||pair.some(id=>!Number.isInteger(id)||id<=0||id>2147483647)))p.fail("INVALID_MANIFEST_PAIRS");
  const pairs=manifest.pairs.map(pair=>pair.map(String)),mapping=new Map(pairs),ids=[...new Set(pairs.flat())];
  if(mapping.size!==pairs.length||ids.length>26||pairs.some(([source,target])=>source===target||mapping.has(target)))p.fail("CHAIN_OR_DUPLICATE_SOURCE");
  if(!Array.isArray(manifest.clubs)||manifest.clubs.length!==ids.length||new Set(manifest.clubs.map(c=>String(c.num_club))).size!==ids.length||manifest.clubs.some(c=>!ids.includes(String(c.num_club))||["nom_club","abre_club","federal_club"].some(f=>typeof c[f]!=="string")))p.fail("INVALID_MANIFEST_IDENTITIES");
  return {pairs,mapping,ids};
}
function prepare(inventory,manifest,operation){
  const s=scope(manifest);
  if(!/^[a-z0-9-]{8,80}$/.test(operation||"")||inventory.project!=="livepalmes"||inventory.database!=="nage-palmes"||!inventory.complete||!inventory.meta||!inventory.safety||!inventory.projection||!Array.isArray(inventory.docs))p.fail("INCOMPLETE_SQL_ONLY_INVENTORY");
  if(Buffer.byteLength(JSON.stringify(p.encode(inventory)))>32000000)p.fail("INVENTORY_TOO_LARGE");
  if(inventory.sql.clubs?.length!==s.ids.length||new Set(inventory.sql.clubs.map(c=>String(c.num_club))).size!==s.ids.length)p.fail("CLUB_SET_CHANGED");
  for(const expected of manifest.clubs){const current=inventory.sql.clubs.find(c=>Number(c.num_club)===expected.num_club);if(!current||Object.keys(expected).some(f=>!p.equal(current[f],expected[f])))p.fail("APPROVED_CLUB_IDENTITY_CHANGED");}
  if(new Set(inventory.docs.map(d=>d.path)).size!==inventory.docs.length||inventory.docs.some(d=>!d.fields||!d.updateTime||!/^(users|accessGrants|engagementAccessRequests)\/[^/]+$/.test(d.path)))p.fail("INVALID_FIREBASE_GUARDS");
  if(inventory.docs.some(d=>[p.wire(d,"clubId"),p.wire(d,"scopeId"),p.scope(d)?.scopeId?.stringValue??p.scope(d)?.scopeId?.integerValue].some(id=>s.mapping.has(id)))||inventory.projection.sql?.some(r=>s.mapping.has(String(r.club_id))))p.fail("SOURCE_HAS_FIREBASE_DEPENDENCY");
  const sql={},changes=[],guards=[];
  for(const table of p.tables){const rows=inventory.sql[table],relation=p.relations.find(r=>r[0]===table),pk=relation?.[2]||["num_club"];if(!Array.isArray(rows)||rows.length>=10001)p.fail("ROW_LIMIT_OR_TABLE_MISSING");sql[table]=[...rows].sort((a,b)=>p.key(a,pk).localeCompare(p.key(b,pk)));const seen=new Set(),finalKeys=new Set();
    for(const row of sql[table]){const key=p.key(row,pk);if(seen.has(key))p.fail("DUPLICATE_PRIMARY_KEY");seen.add(key);let after=p.clone(row);
      if(table==="clubs"){if(!s.ids.includes(String(row.num_club)))p.fail("CLUB_SET_CHANGED");if(s.mapping.has(String(row.num_club)))after=null;}
      else for(const field of relation[1]){const target=s.mapping.get(String(row[field]));if(target)after[field]=typeof row[field]==="number"?Number(target):target;}
      if(after){const key=p.key(after,pk);if(finalKeys.has(key))p.fail("PRIMARY_KEY_COLLISION");finalKeys.add(key);}
      if(!p.equal(row,after)){if(["livepalmes_deleted_people_history","livepalmes_qualification_grants"].includes(table))p.fail("NEW_SENSITIVE_DEPENDENCY");changes.push({table,pk,before:p.clone(row),after});}else guards.push({table,pk,row:p.clone(row)});
    }
  }
  if(changes.length>5000)p.fail("MUTATION_LIMIT");
  const plan={kind:"club-merge-sql-only-v1",operation,project:inventory.project,database:inventory.database,manifest:p.clone(manifest),pairs:s.pairs,meta:p.clone(inventory.meta),sql,changes,guards,docs:p.clone(inventory.docs),firestore:[],projection:p.clone(inventory.projection),safety:p.clone(inventory.safety)};
  return {...plan,digest:p.digest(plan)};
}
function validate(plan){if(plan?.kind!=="club-merge-sql-only-v1")p.fail("INVALID_SQL_ONLY_BACKUP");const rebuilt=prepare({...plan,complete:true},plan.manifest,plan.operation);if(!p.equal(plan,rebuilt))p.fail("PLAN_TAMPERED");return plan;}
function safety(plan,current){if(!p.equal(plan.meta,current.meta)||!p.equal(plan.safety,current.safety)||!p.equal(plan.projection,current.projection))p.fail("SCHEMA_OR_SAFETY_OR_PROJECTION_DRIFT");existing.inspect(plan,current.sql);existing.documents(plan,current.docs);}
function gate(plan,evidence,direction,now=Date.now()){
  existing.gate(plan,evidence,direction,now);
  if(!evidence.sqlOnlySourceReview||evidence.manifestDigest!==p.digest(plan.manifest))p.fail("SQL_ONLY_SCOPE_REVIEW_REQUIRED");
}
async function run({plan,sql,capture,persist,evidence,direction="apply",checkGate=gate}){
  validate(plan);if(!["apply","restore"].includes(direction))p.fail("INVALID_DIRECTION");checkGate(plan,evidence,direction);safety(plan,await capture());await persist({phase:"start",planDigest:plan.digest,direction});
  const goal=direction==="restore"?"before":"after",deletes=plan.changes.filter(o=>!o.after),transfers=plan.changes.filter(o=>o.after);
  async function native(ops,phase){checkGate(plan,evidence,direction);await sql.locked(async()=>{
    const current=await sql.rows(plan.meta,{includeProjection:false});if(!p.equal(await sql.metadata(),plan.meta)||!p.equal(await sql.imports(current),plan.safety.imports)||!p.equal(await sql.historical(),plan.safety.historical))p.fail("LOCKED_SCHEMA_OR_SAFETY_DRIFT");
    const states=existing.inspect(plan,current);if(phase==="delete-sources"&&transfers.some(op=>states.get(op)!=="after"))p.fail("SOURCE_REFERENCES_REMAIN");
    for(const op of ops){checkGate(plan,evidence,direction);if(states.get(op)===goal)continue;await persist({phase:"intent",stage:phase,direction,opDigest:p.digest(op)});await sql.mutate(op,direction);await persist({phase:"receipt",stage:phase,direction,opDigest:p.digest(op)});}
    const checked=existing.inspect(plan,await sql.rows(plan.meta,{includeProjection:false}));if(ops.some(op=>checked.get(op)!==goal))p.fail("SQL_STAGE_NOT_VERIFIED");
  });}
  if(direction==="restore")await native(deletes,"recreate-sources");
  await native(transfers,"references");safety(plan,await capture());
  if(direction==="apply")await native(deletes,"delete-sources");
  const final=await capture();safety(plan,final);if([...existing.inspect(plan,final.sql).values()].some(s=>s!==goal))p.fail("FINAL_STATE_NOT_VERIFIED");checkGate(plan,evidence,direction);await persist({phase:"complete",planDigest:plan.digest,direction});
  return {verified:true,direction,sourceClubs:plan.pairs.length,targetClubs:new Set(plan.pairs.map(p=>p[1])).size,sqlMutations:plan.changes.length,firestoreWrites:0,targetFieldsUnchanged:true};
}
function readArchive(file,key){if(fs.statSync(file).size>64000000)p.fail("BACKUP_TOO_LARGE");const bytes=zlib.gunzipSync(crypto.open(fs.readFileSync(file),key),{maxOutputLength:64000000}),saved=p.decode(JSON.parse(bytes.toString("utf8")));if(saved.format!=="club-merge-sql-only-backup-v1")p.fail("BACKUP_FORMAT");return validate(saved.plan);}
function verifyBackup(a,b,key){if(fs.realpathSync(a)===fs.realpathSync(b))p.fail("TWO_BACKUP_LOCATIONS_REQUIRED");const plan=readArchive(a,key);if(!p.equal(plan,readArchive(b,key)))p.fail("BACKUP_COPIES_DIFFER");return plan;}
function createBackup(plan,key,a,b){validate(plan);if(!Buffer.isBuffer(key)||key.length<32)p.fail("BACKUP_KEY_REQUIRED");a=backup.privatePath(a);b=backup.privatePath(b);if(a===b)p.fail("TWO_BACKUP_LOCATIONS_REQUIRED");const bytes=crypto.seal(zlib.gzipSync(Buffer.from(JSON.stringify(p.encode({format:"club-merge-sql-only-backup-v1",plan})))),key);backup.writeOnce(a,bytes);backup.writeOnce(b,bytes);verifyBackup(a,b,key);return{planDigest:plan.digest,archiveDigest:p.digest(bytes)};}
async function connect(manifest,env=process.env){
  const s=scope(manifest),auth=require("./club-merge-auth");if(!env.NAP_DB_PASSWORD&&env.CLUB_MERGE_LOAD_NAP_SECRET!=="1")p.fail("NAP_CREDENTIALS_REQUIRED");const token=auth.tokenProvider({mode:env.CLUB_MERGE_AUTH_MODE||"adc",account:env.CLUB_MERGE_GCLOUD_ACCOUNT||""}),password=env.NAP_DB_PASSWORD||await auth.existingNapPassword(token);
  const {napPoolOptions}=require("../functions/nap-connection"),{connectionLimit,waitForConnections,queueLimit,...options}=napPoolOptions(password),connection=await require("../functions/node_modules/mysql2/promise").createConnection(options),sql=require("./club-merge-sql").adapter(connection,s),firestore=require("./club-merge-firestore").adapter(token,fetch,s);
  async function capture(){const meta=await sql.metadata(),rows=await sql.rows(meta),imports=await sql.imports(rows),firebase=await firestore.inventory(rows),projection={sql:rows.livepalmes_club_account_emails,firestore:[]};delete rows.livepalmes_club_account_emails;return{project:"livepalmes",database:"nage-palmes",complete:true,meta,sql:rows,projection,docs:firebase.docs,safety:{...firebase.safety,imports,historical:await sql.historical()}};}
  return{sql,capture,close:()=>connection.end()};
}
function summary(plan){return{operation:plan.operation,planDigest:plan.digest,manifestDigest:p.digest(plan.manifest),sourceClubs:plan.pairs.length,targetClubs:new Set(plan.pairs.map(p=>p[1])).size,sqlMutations:plan.changes.length,sourceDeletions:plan.pairs.length,firestoreWrites:0};}
async function main(args=process.argv.slice(2)){
  if(!args.length||args[0]==="--help"){console.log("Outil local SQL uniquement ; aucun acces sans mode explicite.\n--prepare <manifest.json> <operation> <archive> <copie>\n--verify-backup|--check <archive> <copie>\n--apply|--restore <archive> <copie> <preuves.json> <journal>\nCle privee CLUB_MERGE_KEY_FILE ; memes options operateur que club-merge.js. Les liens Firebase sources interdisent ce mode.");return;}
  const [mode,...values]=args,arity={"--prepare":4,"--verify-backup":2,"--check":2,"--apply":4,"--restore":4};if(!(mode in arity)||values.length!==arity[mode])p.fail("INVALID_COMMAND");const key=require("./club-merge").localKey(process.env.CLUB_MERGE_KEY_FILE);
  let plan,manifest;if(mode==="--prepare"){if(fs.statSync(values[0]).size>10000)p.fail("MANIFEST_TOO_LARGE");manifest=JSON.parse(fs.readFileSync(values[0],"utf8"));scope(manifest);}else{plan=verifyBackup(values[0],values[1],key);manifest=plan.manifest;}
  if(mode==="--verify-backup"){console.log(JSON.stringify({...summary(plan),backupVerified:true,databaseContacted:false}));return;}
  let evidence,persist;if(["--apply","--restore"].includes(mode)){evidence=JSON.parse(fs.readFileSync(values[2],"utf8"));gate(plan,evidence,mode==="--apply"?"apply":"restore");backup.privatePath(path.join(values[3],"unused"));persist=backup.journal(fs.realpathSync(values[3]),key);await persist({phase:"backup-reopened",planDigest:plan.digest,direction:mode});}
  const live=await connect(manifest);try{
    if(mode==="--prepare"){plan=prepare(await live.capture(),manifest,values[1]);const again=await live.capture();safety(plan,again);if(!p.equal(plan.docs,again.docs))p.fail("FIREBASE_GUARDS_CHANGED_DURING_BACKUP");const archive=createBackup(plan,key,values[2],values[3]);console.log(JSON.stringify({...summary(plan),...archive,backupVerified:true,databaseWrites:false}));}
    else if(mode==="--check"){const current=await live.capture();safety(plan,current);const states=[...existing.inspect(plan,current.sql).values()];console.log(JSON.stringify({...summary(plan),before:states.filter(s=>s==="before").length,after:states.filter(s=>s==="after").length,databaseWrites:false}));}
    else console.log(JSON.stringify(await run({plan,...live,persist,evidence,direction:mode==="--apply"?"apply":"restore"})));
  }finally{key.fill(0);await live.close().catch(()=>{});}
}
module.exports={scope,prepare,validate,safety,gate,run,createBackup,readArchive,verifyBackup,connect,summary,main};
if(require.main===module)main().catch(error=>{console.error(/^[A-Z][A-Z0-9_]{3,100}$/.test(error.message||"")?error.message:"SQL_ONLY_CLUB_MERGE_STOPPED");process.exitCode=1;});
