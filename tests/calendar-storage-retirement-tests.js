const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "assets/public/livepalmes-public-calendar.js"), "utf8");

function reader({ host = "livepalmes-test.web.app", sourceName = "nap", fixtures = false, available = true, payload = { source: "nap", event: { id: "legacy-nap-2" } } } = {}) {
  const requests = [];
  const window = {
    location: { hostname: host, origin: `http://${host}:8080` },
    LIVEPALMES_PUBLIC_CALENDAR_FIXTURES: fixtures,
    LIVEPALMES_PUBLIC_CALENDAR_BASE: "https://old-storage.invalid/calendar",
    LivePalmesEnvironment: { sportingDataSource: sourceName, napReaderUrl: "https://nap-reader.invalid/read", publicStorageUrl() { throw new Error("Storage must never be accessed"); } }
  };
  vm.runInNewContext(source, { window, Date, URL, fetch: async (url, options) => {
    requests.push({ url: String(url), options });
    return { ok: available, json: async () => payload };
  } });
  return { api: window.LivePalmesPublicCalendar, requests };
}

(async () => {
  const nap = reader();
  for (const [file, action, key, value] of [
    ["manifest.json", "calendar-manifest"],
    ["seasons/2026.json", "calendar-season", "year", "2026"],
    ["events/legacy-nap-2.json", "competition", "id", "legacy-nap-2"],
    ["results/legacy-nap-2.json", "competition-results", "id", "legacy-nap-2"]
  ]) {
    await nap.api.json(file);
    const request = nap.requests.at(-1), url = new URL(request.url);
    assert.equal(url.origin, "https://nap-reader.invalid");
    assert.equal(url.searchParams.get("action"), action);
    if (key) assert.equal(url.searchParams.get(key), value);
    assert.equal(request.options.cache, "no-store");
  }
  assert.equal(nap.requests.length, 4, "One bounded request per action");
  await assert.rejects(nap.api.json("events/archive-demo.json"), /introuvable/);
  assert.equal(nap.requests.length, 4);
  for (const options of [{ available: false }, { payload: { source: "firestore" } }, { payload: { source: "nap" } }]) {
    const failed = reader(options);
    await assert.rejects(failed.api.json("events/legacy-nap-2.json"), /indisponible|introuvable/);
    assert.equal(failed.requests.length, 1, "No fallback after a failed NAP read");
  }
  const disabled = reader({ sourceName: "firestore" });
  await assert.rejects(disabled.api.json("manifest.json"), /indisponible/);
  assert.equal(disabled.requests.length, 0);
  const defaultLocal = reader({ host: "localhost" });
  await defaultLocal.api.json("manifest.json");
  assert.equal(new URL(defaultLocal.requests[0].url).origin, "https://nap-reader.invalid");
  for (const host of ["localhost", "127.0.0.1"]) {
    const local = reader({ host, fixtures: true, payload: { events: [] } });
    await local.api.json("events/archive-demo.json");
    assert.equal(local.requests[0].url, `http://${host}:8080/tests/fixtures/public-calendar/events/archive-demo.json`);
    for (const file of ["../secret.json", "events/../../secret.json", "https://other.invalid/data.json"]) await assert.rejects(local.api.json(file), /introuvable/);
    assert.equal(local.requests.length, 1);
    await assert.rejects(reader({ host, fixtures: true, available: false }).api.json("manifest.json"), /Fixture/);
  }
  for (const host of ["livepalmes-test.web.app", "livepalmes.web.app", "localhost.example.org"]) {
    const blocked = reader({ host, fixtures: true });
    await assert.rejects(blocked.api.json("manifest.json"), /localhost/);
    assert.equal(blocked.requests.length, 0);
  }
  for (const name of ["build-public-calendar-results.js", "publish-public-calendar-results.js", "repair-legacy-calendar-public-season.js", "repair-legacy-calendar-practical-public-data.js"]) {
    for (const file of [path.join(root, "tools", name), path.join(root, "tools/archives/calendar-storage", `${name}.txt`)]) {
      const result = spawnSync(process.execPath, [file, "--write", "--confirm", "1208"], { encoding: "utf8", timeout: 5000 });
      assert.equal(result.status, 1, file);
      assert.match(result.stderr, /archiv/i);
      assert.doesNotMatch(result.stderr, /ENOENT|Cannot find module|Connexion Firebase/);
    }
  }
  console.log("Calendar Storage retirement: NAP routes, failure without fallback, local fixtures and eight disabled entry points verified offline.");
})().catch(error => { console.error(error); process.exitCode = 1; });
