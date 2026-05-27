(function () {
  function init(context = {}) {
    with (context) {
      function formatName(swimmer) {
        return formatPersonNameParts(swimmer.firstName, swimmer.lastName, swimmer.name)
          || (isFemaleContext(swimmer.sex) ? "Nageuse à renseigner" : "Nageur à renseigner");
      }
      
      function formatDisplayName(entrant) {
        return isRelayEntrant(entrant) ? (entrant.club || entrant.lastName || "Relais") : formatName(entrant);
      }
      
      function formatSeriesDisplayName(entrant) {
        if (isRelayEntrant(entrant)) return formatDisplayName(entrant);
        return formatName(entrant);
      }
      
      function clearSearch() {
        state.search = "";
        if (searchInput) searchInput.value = "";
      }
      
      const ROLE_LABELS = {
        speaker: "Speaker",
        live: "Live",
        referee: "Juge arbitre",
        video: "Juge vidéo",
        computer: "Bureau des performances",
        secretary: "Secrétariat"
      };
      
      function isSpeakerView() {
        return state.role === "speaker" || state.role === "live";
      }
      
      const DECISION_LABELS = {
        forfait: "Forfait",
        abandon: "Abandon",
        false_start: "DSQ - faux départ",
        relay_early_start: "DSQ - départ anticipé",
        underwater_15m: "DSQ - coulée supérieure à 15 m",
        immersion: "DSQ - passage en immersion",
        bottle_fault: "DSQ - faute de bouteille",
        interference: "DSQ - gêne d'un concurrent",
        other_dsq: "DSQ - autre motif"
      };
      
      const SPEAKER_DECISION_REASONS = {
        false_start: "faux départ",
        relay_early_start: "départ anticipé",
        underwater_15m: "coulée supérieure à 15 m",
        immersion: "passage en immersion",
        bottle_fault: "faute de bouteille",
        interference: "gêne d'un concurrent",
        other_dsq: "autre motif"
      };
      
      function shortClubName(entrant) {
        if (entrant.clubCode) return String(entrant.clubCode).toUpperCase();
        const club = String(entrant.club || "").trim();
        if (!club) return "";
        const words = club
          .replace(/['’]/g, " ")
          .split(/\s+/)
          .filter((word) => word && !["DE", "DU", "DES", "D", "LA", "LE", "LES", "L", "ET", "A", "AU", "AUX"].includes(word.toUpperCase()));
        const initials = words.map((word) => word[0]).join("").toUpperCase();
        return initials || club;
      }
      
      function entrantPersonKey(entrant) {
        return `${entrant.sex || ""}|${normalizePersonName(formatName(entrant))}`;
      }

      return {
        formatName,
        formatDisplayName,
        formatSeriesDisplayName,
        clearSearch,
        isSpeakerView,
        shortClubName,
        entrantPersonKey
      };
    }
  }

  window.LivePalmesEntrantHelpers = { init };
}());
