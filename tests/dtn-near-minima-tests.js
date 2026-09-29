const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const backend = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
function source(name) {
  const start = backend.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return backend.slice(start, backend.indexOf('\n}', start) + 2);
}
const server = { cleanText: value => String(value || '').trim(), cleanFirestoreValue: value => value,
  birthYear: value => Number(String(value || '').slice(0, 4)), DTN_NEAR_MINIMUM_MAX_PERCENT: 5,
  DTN_EDF_LIMOGES_COMPETITION_ID: 'limoges' };
vm.createContext(server);
vm.runInContext(['publicSwimmerKey', 'publicBetterPerformance', 'dtnQualificationRow', 'bestDtnQualificationRows', 'nearDtnQualificationRows', 'dtnQualificationRowsForStandard'].map(source).join('\n'), server);
const row = (id, time, extra = {}) => ({ swimmerId: id, swimmer: id, birthDate: '2006-01-01', timeValue: time, time: (time / 100).toFixed(2), course: '100SF', competitionId: 'allowed', ...extra });
const rows = [row('achieved', 4990), row('achieved', 5060), row('equal', 5000), row('equal', 5020),
  row('near', 5060), row('near', 5070), row('boundary', 5100), row('outside', 5300), row('max', 5250),
  row('older', 5020, { birthDate: '2004-01-01' }), row('wrongCompetition', 5010, { competitionId: 'other' })];
const standard = { id: 'TRP', birthMin: 2005 };
const eligible = server.dtnQualificationRowsForStandard(rows, 'TRP', ['allowed']);
const near = server.nearDtnQualificationRows(eligible, standard, 5000);
assert.deepEqual(Array.from(near, r => r.swimmerId), ['near', 'boundary']);
assert.equal(near[0].timeValue, 5060);
assert.equal(server.nearDtnQualificationRows(eligible, standard, 0).length, 0);
assert.equal(server.nearDtnQualificationRows(eligible, { id: 'TJP' }, 5000).length, 0);
assert.ok(server.nearDtnQualificationRows(eligible, { id: 'TSP' }, 5000).some(r => r.swimmerId === 'older'));
assert.deepEqual(Array.from(server.bestDtnQualificationRows(eligible, standard, 5000), r => r.swimmerId), ['achieved', 'equal']);
const client = { window: { LivePalmesEnvironment: { publicStorageUrl: x => x } }, document: { readyState: 'loading', addEventListener() {} } };
vm.createContext(client);
let frontend = fs.readFileSync(path.join(root, 'assets/livepalmes-dtn-qualifications.js'), 'utf8');
frontend = frontend.replace('global.LivePalmesDtnQualifications = { init };', 'global.testDtn = { state, nearMinimumRows, nearMinimumHtml, nearMinimumControlsHtml, athleteSummaryRows };');
vm.runInContext(frontend, client);
const api = client.window.testDtn;
const overview = { standards: [{ id: 'TRP', courses: [{ course: '100SF', threshold: 5000, qualifiers: [row('achieved', 4990)], nearMinimum: near }] }] };
assert.equal(api.state.nearMinimumEnabled, false);
assert.equal(api.state.nearMinimumPercent, 2);
assert.deepEqual(Array.from(api.nearMinimumRows(overview, 'TRP', 2), r => r.swimmerId), ['near']);
assert.equal(api.nearMinimumRows(overview, 'TRP', 1).length, 0);
assert.equal(api.nearMinimumRows(overview, 'TRP', 3).length, 2);
for (const invalid of [0, -1, NaN, 6]) assert.equal(api.nearMinimumRows(overview, 'TRP', invalid).length, 0);
assert.equal(api.nearMinimumRows(overview, 'TJP', 2).length, 0);
assert.equal(api.nearMinimumHtml(overview), '');
api.state.nearMinimumEnabled = true;
api.state.edfTab = 'TRP';
assert.match(api.nearMinimumHtml({}), /indisponibles/);
assert.match(api.nearMinimumHtml(overview), /1 performance à moins de/);
assert.match(api.nearMinimumHtml(overview), /\+0,60 s \/ \+1,20 %/);
assert.equal(api.athleteSummaryRows(overview, 'TRP').length, 1);
const many = { standards: [{ id: 'TRP', courses: [{ course: '100SF', threshold: 5000, nearMinimum: Array.from({ length: 51 }, (_, i) => row(`athlete-${i}`, 5010)) }] }] };
assert.match(api.nearMinimumHtml(many), /Page 1 \/ 2/);
api.state.nearMinimumPage = 1;
assert.match(api.nearMinimumHtml(many), /athlete-9/);
assert.doesNotMatch(api.nearMinimumHtml(many), />athlete-0</);
api.state.edfTab = 'TJP';
assert.equal(api.nearMinimumControlsHtml(), '');
console.log('DTN proximity: boundaries, deduplication, age, competition scope, qualified exclusion, UI states and pagination OK.');
