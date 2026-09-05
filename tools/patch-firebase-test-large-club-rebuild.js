"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const functionsIndex = path.join(root, "functions", "index.js");
const source = fs.readFileSync(functionsIndex, "utf8");
const startMarker = "async function engagementLegacySwimmerLicensesByClub";
const endMarker = "async function rebuildEngagementClubRoster";
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start + startMarker.length);

if (start < 0 || end < 0) {
  throw new Error("Bloc de reconstruction des licences historiques introuvable.");
}

const originalBlock = source.slice(start, end);
let updatedBlock = originalBlock;

if (updatedBlock.includes(".limit(10001)") && updatedBlock.includes("snapshot.size > 10000")) {
  console.log("Patch gros historique déjà appliqué localement.");
  process.exit(0);
}

if (!updatedBlock.includes(".limit(201)")) {
  throw new Error("Limite historique attendue .limit(201) introuvable : arrêt de sécurité.");
}
if (!updatedBlock.includes("snapshot.size > 200")) {
  throw new Error("Garde-fou historique attendu > 200 introuvable : arrêt de sécurité.");
}

updatedBlock = updatedBlock
  .replace(".limit(201)", ".limit(10001)")
  .replace("snapshot.size > 200", "snapshot.size > 10000")
  .replace(
    "Trop de licences historiques pour une reconstruction directe de ce club.",
    "Plus de 10 000 licences historiques pour ce club : reconstruction directe refusée."
  );

if (updatedBlock === originalBlock) {
  throw new Error("Le patch gros historique n'a produit aucune modification.");
}

const output = `${source.slice(0, start)}${updatedBlock}${source.slice(end)}`;
fs.writeFileSync(functionsIndex, output, "utf8");
console.log("Patch local TEST appliqué : jusqu'à 10 000 licences historiques par club.");
