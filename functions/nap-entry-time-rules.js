"use strict";

// Existing LivePalmes time policy, applied to an already grouped native history.
// No database reads, sporting eligibility decision or native write in this module.
function resolveTime(entry, competition, services, preview = false) {
  if (typeof services?.automatic !== "function" || typeof services?.parse !== "function") {
    throw new TypeError("Calcul et validation des temps requis.");
  }
  const mode = competition.missingEntryTimeMode ?? "manual";
  if (!["", "manual", "forbidden", "default595999", "none"].includes(mode)) {
    throw new TypeError("Reglage de temps inconnu.");
  }
  if (competition.competitionType === "openWater") {
    return { eventCode: entry.eventCode, status: "selected", entryTimeMode: "notRequired" };
  }
  if (mode === "none") throw new TypeError("Reglage piscine a verifier.");
  if(competition.napSource===true && Number(competition.nativeParameters?.saisie)===0 && entry.entryTimeMode==="known" && entry.entryTime) {
    if(typeof services.known!=="function") throw new TypeError("Historique natif requis pour ce choix de temps.");
    return services.known(entry);
  }
  const manualRaw = entry.entryTimeMode === "manual"
    ? String(entry.manualEntryTime || entry.entryTime || "").trim()
    : String(entry.manualEntryTime || "").trim();
  if (manualRaw) {
    if (mode !== "manual" || competition.qualifications?.enabled) {
      throw new TypeError("Saisie manuelle non autorisee pour cette competition.");
    }
    const manual = services.parse(manualRaw);
    if (!manual) throw new TypeError(`Temps manuel invalide pour ${entry.eventCode}.`);
    return { eventCode: entry.eventCode, status: "selected", entryTimeMode: "manual",
      manualEntryTime: manualRaw, entryTime: manual.display, entryTimeValue: manual.value };
  }
  const result = services.automatic(entry);
  if (!result) throw new TypeError("Calcul du temps incomplet.");
  if (result.entryTimeMode === "default595999" && !mode) {
    if (!preview) throw new TypeError("Reglage sans temps connu a completer pour cette competition NAP.");
    return { eventCode: entry.eventCode, entryTimeMode: "unconfigured", entryTime: "", entryTimeValue: 0,
      entryTimeWarning: "Reglage sans temps connu a completer." };
  }
  if (result.entryTimeMode === "default595999" && mode === "forbidden") {
    if (!preview) throw new TypeError(`Aucun temps connu pour ${entry.eventCode} : engagement interdit par le reglage de la competition.`);
    return { eventCode: entry.eventCode, entryTimeMode: "forbidden", entryTime: "", entryTimeValue: 0,
      entryTimeWarning: "Aucun temps connu : engagement interdit." };
  }
  return competition.napSource===true && result.entryTimeMode==="default595999" ? {...result,nativeTime:"599999"} : result;
}

module.exports = { resolveTime };
