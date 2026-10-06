"use strict";
const fs = require("node:fs");
const path = require("node:path");
const BUCKET = "livepalmes-test-public-data-206080168534";
const PREFIX = "performance-public-firestore/";

async function list(prefix) {
  const result = [];
  let pageToken = "";
  do {
    const url = new URL(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`);
    url.searchParams.set("prefix", PREFIX + prefix);
    url.searchParams.set("fields", "items(name,generation,size),nextPageToken");
    url.searchParams.set("maxResults", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Inventaire public TEST indisponible.");
    const data = await response.json();
    result.push(...(data.items || []));
    if (result.length > 100000) throw new Error("Inventaire public TEST trop volumineux.");
    pageToken = data.nextPageToken || "";
  } while (pageToken);
  return result;
}

async function download(object, directory) {
  const relative = object.name.slice(PREFIX.length);
  if (!object.name.startsWith(PREFIX) || !/^(?:manifest\.json|ids\/[a-z0-9]{2}\.json|swimmers\/[a-f0-9]{2}\/[a-f0-9]{40}\.json)$/.test(relative) ||
      !/^\d+$/.test(object.generation) || Number(object.size) > 8 * 1024 * 1024) throw new Error("Fichier public TEST invalide.");
  const url = new URL(`https://storage.googleapis.com/${BUCKET}/${object.name}`);
  url.searchParams.set("generation", object.generation);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("Version du fichier public TEST indisponible.");
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > 8 * 1024 * 1024) throw new Error("Fichier public TEST trop volumineux.");
    chunks.push(chunk);
  }
  const contents = Buffer.concat(chunks);
  JSON.parse(contents.toString("utf8"));
  const filename = path.join(directory, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, contents, { flag: "wx" });
  return JSON.parse(contents.toString("utf8"));
}

async function capture(directory) {
  const output = path.resolve(directory);
  const relative = path.relative(path.resolve("outputs"), output);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || fs.existsSync(output)) throw new Error("Dossier TEST de reference neuf requis sous outputs.");
  const manifestObject = (await list("manifest.json")).find(o => o.name === PREFIX + "manifest.json");
  if (!manifestObject) throw new Error("Manifeste TEST absent.");
  const manifest = await download(manifestObject, output);
  const ids = await list("ids/");
  if (ids.length !== manifest.idFiles) throw new Error("Index TEST incomplet.");
  const required = new Set();
  for (const object of ids) {
    const index = await download(object, output);
    for (const swimmer of Object.values(index)) {
      if (!/^swimmers\/[a-f0-9]{2}\/[a-f0-9]{40}\.json$/.test(swimmer.perfFile || "")) throw new Error("Lien de fiche TEST invalide.");
      required.add(PREFIX + swimmer.perfFile);
    }
  }
  if (required.size !== manifest.swimmerFiles) throw new Error("Inventaire de fiches TEST incoherent.");
  const available = new Map((await list("swimmers/")).map(o => [o.name, o]));
  const files = [...required].map(name => {
    if (!available.has(name)) throw new Error("Fiche TEST absente.");
    return available.get(name);
  });
  let offset = 0;
  let completed = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (offset < files.length) {
      const object = files[offset++];
      await download(object, output);
      completed++;
      if (completed % 1000 === 0 || completed === files.length) console.log(`Fiches TEST capturees : ${completed}/${files.length}.`);
    }
  }));
  const after = (await list("manifest.json")).find(o => o.name === manifestObject.name);
  if (after?.generation !== manifestObject.generation) throw new Error("Publication TEST modifiee pendant la capture.");
  const proof = { project: "livepalmes-test", bucket: BUCKET, prefix: PREFIX, manifestGeneration: manifestObject.generation,
    capturedAt: new Date().toISOString(), swimmerFiles: files.length, rowCount: manifest.rowCount };
  fs.writeFileSync(path.join(output, "reference-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  return proof;
}

if (require.main === module) capture(process.argv[2] || "outputs/nap-transition-reference")
  .then(proof => console.log(JSON.stringify(proof, null, 2)))
  .catch(() => { console.error("Capture de la reference TEST interrompue. Aucune publication."); process.exitCode = 1; });
module.exports = { capture };
