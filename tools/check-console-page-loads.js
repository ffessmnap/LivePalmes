const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");

const pages = [
  { file: "live.html", role: "live" },
  { file: "speaker.html", role: "speaker" },
  { file: "ja.html", role: "referee" },
  { file: "video.html", role: "video" },
  { file: "bureau-perf.html", role: "computer" },
  { file: "secretariat.html", role: "secretary" }
];

const speakerInfoScripts = [
  "assets/livepalmes-speaker-info.js",
  "assets/livepalmes-speaker-info-options.js",
  "assets/livepalmes-speaker-info-workflow.js"
];

const seriesImportScripts = [
  "assets/livepalmes-pdf-import.js",
  "assets/livepalmes-csv-parser.js",
  "assets/livepalmes-series-import.js",
  "assets/livepalmes-series-import-workflow.js"
];

const resultsAdminScripts = [
  "assets/livepalmes-admin-results.js",
  "assets/livepalmes-results-admin-options.js",
  "assets/livepalmes-results-admin-panel-view.js",
  "assets/livepalmes-results-upload-state.js",
  "assets/livepalmes-results-admin-workflow.js"
];

const finalWithdrawalsScripts = [
  "assets/livepalmes-final-withdrawals-options.js",
  "assets/livepalmes-final-withdrawals-view.js",
  "assets/livepalmes-final-withdrawals-workflow.js"
];

const resultMaintenanceScripts = [
  "assets/livepalmes-admin-maintenance.js",
  "assets/livepalmes-result-maintenance-options.js",
  "assets/livepalmes-result-maintenance-workflow.js"
];

const resultPublicationScripts = [
  "assets/livepalmes-result-publication-options.js",
  "assets/livepalmes-result-publication-workflow.js",
  "assets/livepalmes-result-parser.js"
];

const rolesWithoutSpeakerInfo = new Set(["live", "referee", "video", "secretary"]);
const rolesWithSpeakerInfo = new Set(["speaker", "computer"]);
const rolesWithoutSeriesImport = new Set(["live", "speaker", "referee", "video", "secretary"]);
const rolesWithoutResultsAdmin = new Set(["live", "speaker", "referee", "video", "secretary"]);
const rolesWithoutFinalWithdrawals = new Set(["live", "speaker", "referee", "video"]);
const rolesWithoutResultMaintenance = new Set(["live", "speaker", "referee", "video", "secretary"]);
const rolesWithoutResultPublication = new Set(["live", "referee", "video"]);

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\s+src="([^"]+)"><\/script>/g)].map((match) => match[1].split("?")[0]);
}

function fileSize(source) {
  const fullPath = path.join(rootDir, source);
  return fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0;
}

function formatKb(bytes) {
  return `${Math.round(bytes / 1024)} ko`;
}

function checkPage(page) {
  const html = readProjectFile(page.file);
  const sources = scriptSources(html);
  const scriptBytes = sources.reduce((sum, source) => sum + fileSize(source), 0);
  const hasDedicatedRole = html.includes(`window.LivePalmesDedicatedRole = "${page.role}"`);
  const loadedSpeakerInfo = speakerInfoScripts.filter((script) => sources.includes(script));
  const loadedSeriesImport = seriesImportScripts.filter((script) => sources.includes(script));
  const loadedResultsAdmin = resultsAdminScripts.filter((script) => sources.includes(script));
  const loadedFinalWithdrawals = finalWithdrawalsScripts.filter((script) => sources.includes(script));
  const loadedResultMaintenance = resultMaintenanceScripts.filter((script) => sources.includes(script));
  const loadedResultPublication = resultPublicationScripts.filter((script) => sources.includes(script));

  if (!hasDedicatedRole) {
    throw new Error(`${page.file} ne declare pas le role dedie ${page.role}.`);
  }

  if (rolesWithoutSpeakerInfo.has(page.role) && loadedSpeakerInfo.length) {
    throw new Error(`${page.file} charge encore les reperes speaker : ${loadedSpeakerInfo.join(", ")}`);
  }

  if (rolesWithSpeakerInfo.has(page.role) && loadedSpeakerInfo.length !== speakerInfoScripts.length) {
    throw new Error(`${page.file} doit charger les reperes speaker.`);
  }

  if (rolesWithoutSeriesImport.has(page.role) && loadedSeriesImport.length) {
    throw new Error(`${page.file} charge encore l'import series : ${loadedSeriesImport.join(", ")}`);
  }

  if (page.role === "computer" && loadedSeriesImport.length !== seriesImportScripts.length) {
    throw new Error(`${page.file} doit charger l'import series.`);
  }

  if (rolesWithoutResultsAdmin.has(page.role) && loadedResultsAdmin.length) {
    throw new Error(`${page.file} charge encore les resultats admin : ${loadedResultsAdmin.join(", ")}`);
  }

  if (page.role === "computer" && loadedResultsAdmin.length !== resultsAdminScripts.length) {
    throw new Error(`${page.file} doit charger les resultats admin.`);
  }

  if (rolesWithoutFinalWithdrawals.has(page.role) && loadedFinalWithdrawals.length) {
    throw new Error(`${page.file} charge encore la gestion des forfaits finales : ${loadedFinalWithdrawals.join(", ")}`);
  }

  if ((page.role === "computer" || page.role === "secretary") && loadedFinalWithdrawals.length !== finalWithdrawalsScripts.length) {
    throw new Error(`${page.file} doit charger la gestion des forfaits finales.`);
  }

  if (rolesWithoutResultMaintenance.has(page.role) && loadedResultMaintenance.length) {
    throw new Error(`${page.file} charge encore la maintenance resultats : ${loadedResultMaintenance.join(", ")}`);
  }

  if (page.role === "computer" && loadedResultMaintenance.length !== resultMaintenanceScripts.length) {
    throw new Error(`${page.file} doit charger la maintenance resultats.`);
  }

  if (rolesWithoutResultPublication.has(page.role) && loadedResultPublication.length) {
    throw new Error(`${page.file} charge encore la publication resultats : ${loadedResultPublication.join(", ")}`);
  }

  if ((page.role === "computer" || page.role === "speaker" || page.role === "secretary") && loadedResultPublication.length !== resultPublicationScripts.length) {
    throw new Error(`${page.file} doit charger la publication resultats.`);
  }

  return {
    ...page,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    scriptBytes,
    scriptCount: sources.length
  };
}

try {
  const reports = pages.map(checkPage);
  reports.forEach((report) => {
    console.log(
      `${report.file} : ${report.scriptCount} scripts, ${formatKb(report.scriptBytes)} JS, ${formatKb(report.htmlBytes)} HTML`
    );
  });
  console.log("Chargement des pages consoles OK.");
} catch (error) {
  console.error(`Chargement des pages consoles KO : ${error.message}`);
  process.exit(1);
}
