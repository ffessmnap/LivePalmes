'use strict';
// Execute the changed helpers with an in-memory database; never load Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../functions/index.js'), 'utf8');
function declaration(name) {
  const start = source.search(new RegExp('^(?:async )?function ' + name + '\\(', 'm'));
  assert(start >= 0, name + ' absent');
  const end = source.indexOf('\n}', start);
  assert(end > start);
  return source.slice(start, end + 2);
}
function calls(name, next) {
  assert.match(declaration(name), new RegExp('\\b' + next + '\\('));
}
for (const [entry, next] of [
  ['resumePerformancePublicationJobs', 'processPerformancePublicationJob'],
  ['resolveEngagementSwimmerChangeRequest', 'applyEngagementSwimmerIdentityCorrection']
]) {
  const start = source.indexOf('exports.' + entry + ' =');
  const end = source.indexOf('\n});', start);
  assert(start >= 0 && end > start);
  assert.match(source.slice(start, end), new RegExp('\\b' + next + '\\('));
}
calls('applyEngagementSwimmerIdentityCorrection', 'writePerformanceBaseRows');
calls('processPerformancePublicationJob', 'processPerformanceImportReplacementJob');
calls('processPerformancePublicationJob', 'writePerformanceBaseRows');
calls('processPerformanceImportReplacementJob', 'writePerformanceBaseRows');
calls('processPerformanceImportReplacementJob', 'deactivateReplacedPerformanceBaseRows');
calls('writePerformanceBaseRows', 'touchDtnQualificationCacheState');
calls('deactivateReplacedPerformanceBaseRows', 'touchDtnQualificationCacheState');
assert.match(declaration('writePerformanceBaseRows'), /context\.dtnInvalidationRows/);
assert.match(declaration('applyEngagementSwimmerIdentityCorrection'), /dtnInvalidationRows:\s*rows/);
let batches = 0, commits = 0;
const writes = [];
const context = vm.createContext({
  cleanText: value => String(value || '').trim(),
  db: { batch() { batches++; return { set(...args) { writes.push(args); }, async commit() { commits++; } }; } },
  FieldValue: { increment: n => ({ increment: n }) },
  dtnQualificationCacheStateRef: year => 'dtn/' + year
});
vm.runInContext(['importSeasonYear','dtnQualificationSeasonsForRows','touchDtnQualificationCacheState'].map(declaration).join('\n'), context);
const plain = v => JSON.parse(JSON.stringify(v));
(async () => {
  const rows = [ {seasonYear:2026}, {seasonYear:2027}, {seasonYear:2027},
    {date:'2027-08-31'}, {date:'2027-09-01'}, {seasonYear:2035},
    null, {}, {seasonYear:1999}, {seasonYear:2101}, {seasonYear:2026.5} ];
  const result = await context.touchDtnQualificationCacheState(rows, {now:'2026-09-30T00:00:00Z',action:'identity-or-replacement'});
  assert.deepEqual(plain(result.touchedSeasons), [2026,2027,2028,2035]);
  assert.equal(batches,1); assert.equal(commits,1); assert.equal(writes.length,4);
  assert.deepEqual(writes.map(w=>w[0]), ['dtn/2026','dtn/2027','dtn/2028','dtn/2035']);
  for (const [,data,options] of writes) {
    assert.deepEqual(plain(data), {version:{increment:1},updatedAt:'2026-09-30T00:00:00Z',reason:'identity-or-replacement'});
    assert.deepEqual(plain(options), {merge:true});
  }
  await context.touchDtnQualificationCacheState([]);
  assert.equal(batches,1); assert.equal(commits,1);
  console.log('DTN shared invalidation: dependency chains and seasonal cache writes verified offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
