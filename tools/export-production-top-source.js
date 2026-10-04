// Read-only, paginated PROD source export. No Firestore writes.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const hash = crypto.createHash('sha256');
const verify = process.argv[2] === 'verify';
const { cert, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const credentials = JSON.parse(fs.readFileSync(process.env.PROD_CREDENTIAL_FILE, 'utf8'));
assert.equal(credentials.project_id,'livepalmes');
assert.equal(credentials.client_email,'github-actions-livepalmes-back@livepalmes.iam.gserviceaccount.com');
const app = initializeApp({ credential: cert(credentials), projectId: 'livepalmes' }, 'production-top-export');
const db = getFirestore(app);
const out = verify ? null : fs.createWriteStream('outputs/performance-base-firestore-active.ndjson', { encoding: 'utf8' });
const courses = new Set(['50SF','100SF','200SF','400SF','800SF','1500SF','50AP','100IS','200IS','400IS','50BI','100BI','200BI','400BI']);
let cursor = null;
let read = 0;
let written = 0;
let skipped = 0;
(async () => {
  while (true) {
    let query = db.collection('performances').orderBy('__name__').limit(1000);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      read += 1;
      if(read > 1000000) throw new Error('Budget de lecture dépassé');
      hash.update(JSON.stringify([doc.id,doc.updateTime.seconds,doc.updateTime.nanoseconds])+'\n');
      const data = doc.data();
      const row = { ...data, performanceBaseId: String(data.performanceBaseId || doc.id), source: String(data.source || 'livepalmes') };
      const status = String(row.status || 'active').trim();
      const sex = String(row.sex || '').trim();
      const category = String(row.category || '').trim();
      const course = String(row.course || '').trim();
      if (row.active === false || (status && status !== 'active') || !courses.has(course) || !['F','M'].includes(sex) || !category || Number(row.timeValue || 0) <= 0) {
        skipped += 1;
        continue;
      }
      if(out && !out.write(JSON.stringify(row) + '\n')) await new Promise(resolve=>out.once('drain',resolve));
      written += 1;
    }
    cursor = snap.docs.at(-1).id;
    console.log(`Export PROD : ${read} lues, ${written} publiables`);
    if (snap.size < 1000) break;
  }
  if(out) await new Promise((resolve, reject) => { out.end(resolve); out.on('error', reject); });
  const fingerprint=hash.digest('hex');
  const evidence='outputs/production-source-fingerprint.json';
  if(verify) assert.equal(fingerprint,JSON.parse(fs.readFileSync(evidence)).fingerprint,'Sources PROD modifiées pendant la préparation : arrêt');
  else fs.writeFileSync(evidence,JSON.stringify({fingerprint,read,written,skipped}));
  console.log(JSON.stringify({ read, written, skipped }, null, 2));
  if (!written) throw new Error('Aucune performance publiable exportée depuis PROD.');
})().catch((error) => { console.error(error.stack || error); process.exit(1); });
