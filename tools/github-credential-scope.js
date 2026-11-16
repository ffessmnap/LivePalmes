"use strict";
const fs = require("node:fs"), path = require("node:path");
const KEYS = ["FIREBASE_SERVICE_ACCOUNT_LIVEPALMES", "FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_BACKEND",
  "FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST", "FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_TEST_BACKEND"];
const READONLY = "FIREBASE_SERVICE_ACCOUNT_LIVEPALMES_PROD_READONLY";
const SCOPES = {
  production: [KEYS[0], KEYS[1], KEYS[3]],
  "firebase-test": [KEYS[2], KEYS[3]],
  "firebase-preview": [KEYS[2]]
};
const TRANSFER = "a3-github-secret-confinement.yml";
const TRANSFER_ENV = "${{ inputs.scope == 'firebase-test' && 'firebase-test' || 'production' }}";
// A closed check of this repository's literal job layout, not a general YAML parser.
// Dynamic environments and credentials outside jobs are refused, except this one-shot transfer.
function inspect(name, source) {
  const problems = [], jobs = [], lines = source.replace(/\r\n/g, "\n").split("\n");
  let inJobs = false, job;
  for (const line of lines) {
    if (line === "jobs:") { inJobs = true; continue; }
    if (inJobs && /^\S/.test(line)) { inJobs = false; job = null; }
    const start = inJobs && /^  ([\w-]+):\s*$/.exec(line);
    if (start) { job = { name: start[1], lines: [] }; jobs.push(job); }
    if (job) job.lines.push(line);
    if (!job && /\bsecrets\.FIREBASE_SERVICE_ACCOUNT_[A-Z_]+\b/.test(line)) problems.push("credential outside a job");
    if (!job && /\bsecrets\s*\[/.test(line)) problems.push("dynamic credential outside a job");
  }
  for (const item of jobs) {
    const body = item.lines.join("\n"), references = [...new Set([...body.matchAll(/\bsecrets\.(FIREBASE_SERVICE_ACCOUNT_[A-Z_]+)\b/g)].map(match => match[1]))];
    const dynamic = [...body.matchAll(/\bsecrets\s*\[([^\]]+)\]/g)].map(match => match[1].trim());
    if (!references.length && !dynamic.length) continue;
    const literal = /^    environment:[ \t]*([^\n]*)$/m.exec(body);
    const environment = literal?.[1]?.trim() || /^      name:\s*([\w-]+)\s*$/m.exec(body)?.[1] || "";
    if (name === TRANSFER && item.name === "transfer" && environment === TRANSFER_ENV) {
      if (!body.includes("github.ref == 'refs/heads/main'") || !body.includes("github.run_attempt == 1") ||
          !body.includes("vars.A3_SECRET_TRANSFER_ENABLED == 'true'")) problems.push("transfer gates missing");
      continue;
    }
    const rows = []; let row;
    const matrixStart = item.lines.findIndex(line => /^      matrix:\s*$/.test(line));
    const matrixLines = [];
    if (matrixStart >= 0) for (const line of item.lines.slice(matrixStart + 1)) {
      if (/\S/.test(line) && /^ {0,6}\S/.test(line)) break;
      matrixLines.push(line);
    }
    if (dynamic.length || environment === "${{ matrix.environment }}") {
      if (!matrixLines.includes("        include:") || matrixLines.some(line => line.trim() && !/^\s*#/.test(line) &&
          !/^        include:\s*$/.test(line) && !/^          - [a-z_]+: [\w.-]+$/.test(line) && !/^            [a-z_]+: [\w.-]+$/.test(line))) problems.push(item.name + ": unsupported credential matrix");
    }
    for (const line of matrixLines) {
      const first = /^          - ([a-z_]+): ([\w.-]+)$/.exec(line), next = /^            ([a-z_]+): ([\w.-]+)$/.exec(line);
      if (first) { row = { [first[1]]: first[2] }; rows.push(row); } else if (next && row) row[next[1]] = next[2];
    }
    const contexts = dynamic.length || environment === "${{ matrix.environment }}" ? rows : [{}];
    if (!contexts.length) problems.push(item.name + ": unresolved credential matrix");
    for (const context of contexts) {
      const target = environment === "${{ matrix.environment }}" ? context.environment : environment;
      const resolved = dynamic.map(expression => /^matrix\.([a-z_]+)$/.test(expression) ? context[expression.slice(7)] : undefined);
      if (resolved.some(key => !/^FIREBASE_SERVICE_ACCOUNT_[A-Z_]+$/.test(key || ""))) problems.push(item.name + ": unresolved dynamic credential");
      for (const key of [...references, ...resolved]) if (!SCOPES[target]?.includes(key) && !(key === READONLY && target === "production")) problems.push(item.name + ": credential outside authorized environment: " + key);
    }
  }
  return { name, jobs: jobs.length, problems };
}
function check(root = process.cwd()) {
  const directory = path.join(root, ".github/workflows");
  const results = fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name)).map(name => inspect(name, fs.readFileSync(path.join(directory, name), "utf8")));
  const problems = results.flatMap(result => result.problems.map(problem => result.name + ": " + problem));
  if (problems.length) throw new Error(problems.join("\n"));
  return { workflows: results.length, credentialScopes: SCOPES, valid: true };
}
module.exports = { KEYS, SCOPES, TRANSFER_ENV, inspect, check };
if (require.main === module) { try { console.log(JSON.stringify(check())); } catch (error) { console.error(error.message); process.exitCode = 1; } }
