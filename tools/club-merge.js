"use strict";
// One-off operator tool, never imported by a Cloud Function or a web page.
// No network without an explicit mode; no writes without --apply/--restore.
const fs = require("node:fs"), path = require("node:path");
const p = require("./club-merge-plan"), backup = require("./club-merge-backup"), engine = require("./club-merge-engine");
function localKey(file) {
  if (!file) p.fail("PRIVATE_KEY_FILE_REQUIRED");
  backup.privatePath(fs.realpathSync(file),{existing:true});
  const key = fs.readFileSync(file);
  if (key.length < 32 || key.length > 4096) p.fail("PRIVATE_KEY_SIZE");
  // Key is an existing operator-held recovery key, never generated implicitly.
  return key;
}
async function connect(env=process.env) {
  if (!env.NAP_DB_PASSWORD && env.CLUB_MERGE_LOAD_NAP_SECRET !== "1") p.fail("NAP_CREDENTIALS_REQUIRED");
  const auth=require("./club-merge-auth");
  const token=auth.tokenProvider({mode:env.CLUB_MERGE_AUTH_MODE || "adc",account:env.CLUB_MERGE_GCLOUD_ACCOUNT || ""});
  let password=env.NAP_DB_PASSWORD || await auth.existingNapPassword(token);
  const {napPoolOptions} = require("../functions/nap-mysql");
  const {connectionLimit,waitForConnections,queueLimit,...options} = napPoolOptions(password);
  const connection = await require("../functions/node_modules/mysql2/promise").createConnection(options);
  password="";
  const sql = require("./club-merge-sql").adapter(connection);
  const firestore = require("./club-merge-firestore").adapter(token);
  async function capture() {
    const meta = await sql.metadata(), rows = await sql.rows(meta), imports = await sql.imports(rows), firebase = await firestore.inventory(rows);
    const projectionRows = rows.livepalmes_club_account_emails;
    delete rows.livepalmes_club_account_emails;
    return {project:"livepalmes",database:"nage-palmes",complete:true,meta,sql:rows,docs:firebase.docs,projection:{sql:projectionRows,firestore:[]},safety:{...firebase.safety,imports,historical:await sql.historical()}};
  }
  return {sql,firestore,capture,close:() => connection.end()};
}
function summary(plan) {
  return {operation:plan.operation,planDigest:plan.digest,sourceClubs:14,targetClubs:12,sqlMutations:plan.changes.length,sourceDeletions:14,firestoreMutations:plan.firestore.length,accountDeletions:0,targetNamesChanged:0,executionApprovalRequired:true};
}
async function main(args=process.argv.slice(2)) {
  if (!args.length || args[0] === "--help") {
    console.log("Preparation: node tools/club-merge.js --prepare <operation> <archive-privee> <copie-durable>\nVerification hors reseau: --verify-backup <archive> <copie>\nSimulation fraiche sans ecriture: --check <archive> <copie>\nExecution future apres accord: --apply|--restore <archive> <copie> <preuves.json> <journal-prive>\nCLUB_MERGE_KEY_FILE: cle privee ; NAP_DB_PASSWORD + ADC pour les modes connectes. Option explicite : CLUB_MERGE_AUTH_MODE=gcloud avec CLUB_MERGE_GCLOUD_ACCOUNT ; CLUB_MERGE_LOAD_NAP_SECRET=1 autorise la lecture du seul secret NAP existant. Aucun mode par defaut ne contacte une base.");
    return;
  }
  const [mode,...values] = args;
  const arity = {"--prepare":3,"--verify-backup":2,"--check":2,"--apply":4,"--restore":4};
  if (!(mode in arity) || values.length !== arity[mode]) p.fail("INVALID_COMMAND");
  const secret = localKey(process.env.CLUB_MERGE_KEY_FILE);
  let plan;
  if (mode !== "--prepare") plan = backup.verify(values[0],values[1],secret);
  if (mode === "--verify-backup") { console.log(JSON.stringify({...summary(plan),backupVerified:true,databaseContacted:false})); return; }
  let evidence, persist;
  if (["--apply","--restore"].includes(mode)) {
    evidence = JSON.parse(fs.readFileSync(values[2],"utf8"));
    engine.gate(plan,evidence,mode === "--apply" ? "apply" : "restore");
    if (!(await require("./club-merge-projections").review()).readyForCorbie) p.fail("ADMIN_RECIPIENT_REPLAY_PROTECTION_MISSING");
    // Verify a private journal path before obtaining any write connection.
    backup.privatePath(path.join(values[3],"path-check-unused"));
    persist = backup.journal(fs.realpathSync(values[3]),secret);
    await persist({phase:"backup-reopened",planDigest:plan.digest,direction:mode});
  }
  const live = await connect();
  try {
    if (mode === "--prepare") {
      const current = await live.capture();
      let draft = p.prepare(current,values[0]);
      current.projection.firestore = await live.firestore.projections(draft,"518");
      plan = p.prepare(current,values[0]);
      engine.verifyProjection(plan,current,"518");
      // Stable re-read before saving: no stale multi-query capture accepted.
      const again = await live.capture(); engine.safety(plan,again);
      if (!p.equal(current.projection.sql,again.projection.sql)) p.fail("PROJECTION_CHANGED_DURING_BACKUP");
      backup.create(plan,secret,values[1],values[2]);
      const projectionReview=await require("./club-merge-projections").review();
      console.log(JSON.stringify({...summary(plan),backupVerified:true,databaseWrites:false,projectionReview}));
    } else if (mode === "--check") {
      const current = await live.capture(); engine.safety(plan,current);
      const states = engine.inspect(plan,current.sql);
      const projectionReview=await require("./club-merge-projections").review();
      console.log(JSON.stringify({...summary(plan),before:[...states.values()].filter(v => v === "before").length,after:[...states.values()].filter(v => v === "after").length,databaseWrites:false,projectionReview}));
    } else {
      const result = await engine.run({plan,...live,persist,evidence,direction:mode === "--apply" ? "apply" : "restore"});
      console.log(JSON.stringify(result));
    }
  } finally { await live.close().catch(() => {}); }
}
module.exports = {main,connect,summary,localKey};
if (require.main === module) main().catch(error => {
  // SQL/HTTP exceptions may contain values or credentials. Only known codes.
  console.error(/^[A-Z][A-Z0-9_]{3,100}$/.test(error.message || "") ? error.message : "CLUB_MERGE_STOPPED_REVIEW_PRIVATE_STATE");
  process.exitCode=1;
});
