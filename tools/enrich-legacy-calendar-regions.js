const fs = require("node:fs");
const path = require("node:path");

const CURRENT_REGION_IDS = new Set(["1", "2", "3", "6", "8", "9", "10", "11", "12", "13", "15", "16", "17", "18", "22"]);
const LIVEPALMES_REGION_BY_OFFICIAL_NAME = {
  "auvergne-rhone-alpes": "17",
  "bourgogne-franche-comte": "22",
  "bretagne": "6",
  "centre-val-de-loire": "8",
  "corse": "12",
  "grand est": "1",
  "guadeloupe": "9",
  "guyane": "11",
  "hauts-de-france": "13",
  "ile-de-france": "3",
  "martinique": "11",
  "normandie": "15",
  "nouvelle-aquitaine": "2",
  "occitanie": "10",
  "pays-de-la-loire": "6",
  "provence-alpes-cote-d-azur": "16",
  "la-reunion": "18"
};

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function normalize(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function officialRegionId(region = {}) {
  const key = normalize(region.nom).replace(/ /g, "-");
  return LIVEPALMES_REGION_BY_OFFICIAL_NAME[key] || "";
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function resolveCity(city) {
  const response = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(city)}&fields=nom,region&boost=population&limit=20`);
  if (!response.ok) throw new Error(`Référentiel géographique indisponible (${response.status}) pour ${city}.`);
  const matches = await response.json();
  const expected = normalize(city);
  const regionIds = new Set((Array.isArray(matches) ? matches : [])
    .filter((match) => normalize(match.nom) === expected)
    .map((match) => officialRegionId(match.region))
    .filter((regionId) => CURRENT_REGION_IDS.has(regionId)));
  return regionIds.size === 1 ? [...regionIds][0] : "";
}

async function main() {
  const input = path.resolve(valueAfter("--input"));
  const output = path.resolve(valueAfter("--output") || "outputs/legacy-calendar-region-resolutions.json");
  if (!input) throw new Error("Utilisation : node tools/enrich-legacy-calendar-regions.js --input <preview.json> [--output <résolutions.json>]");
  const preview = JSON.parse(fs.readFileSync(input, "utf8"));
  const cities = [...new Set((preview.competitions || [])
    .filter((competition) => competition.importEligible !== false)
    .filter((competition) => !competition.regionId && !["national", "international"].includes(competition.level))
    .map((competition) => String(competition.city || competition.location || "").trim())
    .filter(Boolean))];
  const resolutions = {};
  const unresolved = [];
  for (let index = 0; index < cities.length; index += 1) {
    const city = cities[index];
    try {
      const regionId = await resolveCity(city);
      if (regionId) resolutions[normalize(city)] = regionId;
      else unresolved.push(city);
    } catch (error) {
      unresolved.push(city);
      console.warn(error.message);
    }
    if (index + 1 < cities.length) await delay(100);
  }
  const payload = { generatedAt: new Date().toISOString(), source: "geo.api.gouv.fr", resolvedCities: resolutions, unresolvedCities: unresolved };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ cityCount: cities.length, resolvedCityCount: Object.keys(resolutions).length, unresolvedCityCount: unresolved.length, output }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
