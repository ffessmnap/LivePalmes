"use strict";
// Lossless source decoding, before identity resolution or native write planning.
// A missing/unsupported line blocks confirmation; it is never silently dropped.
const { createHash } = require("node:crypto");
const MAX_ROWS = 5000, MAX_BYTES = 5 * 1024 * 1024;
const STATUSES = new Set(["NAG", "ABD", "DSQ", "FRT"]);
function compactTime(value) {
  if (typeof value !== "string") return null;
  const match = /^(?:(\d{1,2}):)?(\d{1,2})[.,](\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1] || 0), seconds = Number(match[2]), cc = Number(match[3]);
  if (seconds > 59 || minutes * 6000 + seconds * 100 + cc === 0) return null;
  return `${String(minutes).padStart(2,"0")}${String(seconds).padStart(2,"0")}${match[3]}`;
}
function date(value) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || "");
  if (!m) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === iso ? iso : "";
}
function decodeWinPalmeResults(raw) {
  if (typeof raw !== "string" || Buffer.byteLength(raw,"utf8") > MAX_BYTES || raw.includes("\0")) throw new TypeError("Fichier WinPalme invalide ou trop volumineux.");
  const text = raw.replace(/^\uFEFF/,""), lines = text.split(/\r?\n/);
  if (lines.length > 15000) throw new RangeError("Fichier WinPalme trop volumineux.");
  const rows = [], clubs = [], issues = [], metadata = {};
  const issue = (sourceLine, code) => issues.push({sourceLine,code});
  for (let index=0;index<lines.length;index++) {
    const rawLine=lines[index].trimEnd();
    if (!rawLine.trim()) continue;
    const cells=rawLine.split(";").map(s=>s.trim()), kind=cells[0], sourceLine=index+1;
    if (kind.startsWith("#") || !kind && /Format de fichier/i.test(cells[1] || "")) continue;
    if (kind === "REN") {
      if (metadata.competitionName) issue(sourceLine,"multiple-competitions");
      Object.assign(metadata,{date:date(cells[1]),competitionName:cells[2]||"",location:cells[3]||""}); continue;
    }
    if (kind === "BAS") {metadata.pool=cells[1]||"";metadata.timing=cells[2]||"";continue;}
    if (kind === "WID" || kind === "WPV") {metadata[kind.toLowerCase()]=cells[1]||"";continue;}
    if (kind === "CLU") {clubs.push({sourceLine,cells});continue;}
    // These are people attached to the source dossier, not result rows.
    if (kind === "CEQ" || kind === "OFF") continue;
    if (kind !== "NAG" && kind !== "REL") {issue(sourceLine,"unsupported-record");continue;}
    if (rows.length >= MAX_ROWS) throw new RangeError("Maximum 5 000 resultats par import.");
    const relay=kind === "REL", status=cells[relay?6:10]||"", rawFinalTime=cells[relay?11:15]||"";
    const time=status === "NAG" ? compactTime(rawFinalTime) : null;
    const row={sourceLine,kind,cells,status,rawFinalTime,time,eligible:status === "NAG" && time !== null,
      clubCode:cells[relay?1:5]||"",course:cells[relay?3:7]||"",category:cells[relay?2:9]||"",
      entryTime:cells[relay?4:8]||"",splits:cells.slice(relay?7:11,relay?11:15),
      points:cells[17]||"",rank:cells[18]||"",order:cells[19]||"",
      disqualificationReason:relay?"":cells[16]||""};
    if (!relay) Object.assign(row,{lastName:cells[1]||"",firstName:cells[2]||"",birthDate:date(cells[3]),sex:cells[4]||"",swimmerHint:cells[22]||""});
    else row.memberHints=cells.slice(12,16);
    rows.push(row);
    if (cells.length < (relay?20:21)) issue(sourceLine,"incomplete-result");
    if (!STATUSES.has(status)) issue(sourceLine,"unknown-status");
    if (status === "NAG" && !time) issue(sourceLine,"missing-or-invalid-final-time");
    if (!row.clubCode || !row.course || !row.category) issue(sourceLine,"missing-result-reference");
    if (!relay && (!row.lastName || !row.firstName || !row.birthDate || !["M","F"].includes(row.sex))) issue(sourceLine,"incomplete-swimmer-identity");
  }
  if (!rows.length) throw new TypeError("Aucun resultat WinPalme dans le fichier.");
  if (!metadata.date || !metadata.competitionName) issue(0,"missing-competition");
  return {sourceType:"winpalme",fileHash:createHash("sha256").update(text).digest("hex"),metadata,clubs,rows,issues,
    confirmable:issues.length===0,summary:{rows:rows.length,individual:rows.filter(r=>r.kind==="NAG").length,relays:rows.filter(r=>r.kind==="REL").length,
      eligible:rows.filter(r=>r.eligible).length,statusOnly:rows.filter(r=>STATUSES.has(r.status)&&r.status!=="NAG").length,issues:issues.length}};
}
function reviewWinPalmeResults(raw, excludedSourceLines=[]) {
  const decoded=decodeWinPalmeResults(raw);
  if (!Array.isArray(excludedSourceLines) || excludedSourceLines.length>MAX_ROWS || new Set(excludedSourceLines).size!==excludedSourceLines.length) throw new TypeError("Liste explicite de lignes ecartees invalide.");
  const selected=new Set(excludedSourceLines), excluded=[];
  for (const sourceLine of selected) {
    if (!Number.isSafeInteger(sourceLine)) throw new TypeError("Ligne ecartee invalide.");
    const row=decoded.rows.find(r=>r.sourceLine===sourceLine);
    // User-approved exception only: both status and final time are absent.
    // It cannot dismiss valid/DQ/withdrawn results or unknown non-empty statuses.
    if (!row || row.status || row.rawFinalTime) throw new TypeError("Seules les lignes sans statut ni temps final peuvent etre ecartees.");
    excluded.push(row);
  }
  const rows=decoded.rows.filter(r=>!selected.has(r.sourceLine)), issues=decoded.issues.filter(i=>!selected.has(i.sourceLine));
  return {...decoded,rows,issues,excluded,confirmable:rows.length>0&&issues.length===0,
    summary:{...decoded.summary,retained:rows.length,excluded:excluded.length,issues:issues.length}};
}
module.exports={compactTime,date,decodeWinPalmeResults,reviewWinPalmeResults,MAX_ROWS,MAX_BYTES};
