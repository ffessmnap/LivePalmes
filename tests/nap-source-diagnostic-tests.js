const assert = require("node:assert/strict");
const { main } = require("../tools/inspect-nap-source-inventory");

const secret = "PRIVATE_TOKEN_AND_RESPONSE";
function fixture() {
  const state = { calls: [], writes: [] };
  state.env = { TARGET_FIREBASE_PROJECT: "livepalmes-test", GOOGLE_APPLICATION_CREDENTIALS: "private-path" };
  state.files = {
    readFileSync: () => JSON.stringify({ project_id: "livepalmes-test", client_email: "github-livepalmes-test-backend@livepalmes-test.iam.gserviceaccount.com" }),
    mkdirSync() {}, writeFileSync: (...args) => state.writes.push(args)
  };
  state.exec = (...args) => { state.calls.push(args); return state.calls.length === 1 ? "https://private-endpoint.run.app" : secret; };
  state.request = async () => ({ ok: true, json: async () => ({ source: "nap", mode: "structure-only" }) });
  state.log = () => {};
  return state;
}
async function fails(state, expected) {
  await assert.rejects(main(state), error => {
    assert.match(error.message, expected);
    for (const privateText of [secret, "private-path", "private-endpoint.run.app", "Authorization", "stderr"])
      assert.ok(!error.message.includes(privateText), privateText);
    return true;
  });
  assert.equal(state.writes.length, 0);
}
(async () => {
  let state = fixture(); await main(state); assert.equal(state.writes.length, 1);
  assert.equal(state.calls.length, 2);
  assert.equal(state.calls[0][2].timeout, 60000);
  state = fixture(); state.env.TARGET_FIREBASE_PROJECT = "livepalmes";
  await fails(state, /cible-test/); assert.equal(state.calls.length, 0);
  state = fixture(); state.files.readFileSync = () => "{" + secret;
  await fails(state, /identifiants-test.*json-invalide/);
  for (const [raw, category] of [["PERMISSION_DENIED", "permission-refusee"], ["NOT_FOUND", "ressource-introuvable"], ["UNAUTHENTICATED", "authentification-refusee"]]) {
    state = fixture(); state.exec = () => { throw Object.assign(new Error(secret), { stderr: raw + secret }); };
    await fails(state, new RegExp("description-fonction.*" + category));
  }
  state = fixture(); state.exec = () => { if (state.calls.length++) throw new Error(secret); return "https://private-endpoint.run.app"; };
  await fails(state, /jeton-identite/);
  for (const status of [401, 403, 404, 500]) {
    state = fixture(); state.request = async () => ({ ok: false, status, text: async () => secret });
    await fails(state, new RegExp('appel-diagnostic.*"httpStatus":' + status));
  }
  state = fixture(); state.request = async () => { throw Object.assign(new Error(secret), { name: "TimeoutError" }); };
  await fails(state, /appel-diagnostic.*delai-depasse/);
  state = fixture(); state.request = async () => ({ ok: true, json: async () => { throw new SyntaxError(secret); } });
  await fails(state, /lecture-json.*json-invalide/);
  state = fixture(); state.request = async () => ({ ok: true, json: async () => ({ source: "other", mode: "structure-only", secret }) });
  await fails(state, /validation-contrat/);
  console.log("NAP diagnostic: TEST guard, stage/category/status, timeout, invalid contract and secret-free errors verified offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
