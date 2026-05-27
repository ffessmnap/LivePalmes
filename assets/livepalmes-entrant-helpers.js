(function () {
  function init(context = {}) {
    const {
      formatPersonNameParts,
      isFemaleContext,
      isRelayEntrant,
      normalizePersonName,
      searchInput
    } = context;
    const getState = () => context.state || {};

    function formatName(swimmer = {}) {
      return formatPersonNameParts(swimmer.firstName, swimmer.lastName, swimmer.name)
        || (isFemaleContext(swimmer.sex) ? "Nageuse \u00e0 renseigner" : "Nageur \u00e0 renseigner");
    }

    function formatDisplayName(entrant = {}) {
      return isRelayEntrant(entrant) ? (entrant.club || entrant.lastName || "Relais") : formatName(entrant);
    }

    function formatSeriesDisplayName(entrant = {}) {
      if (isRelayEntrant(entrant)) return formatDisplayName(entrant);
      return formatName(entrant);
    }

    function clearSearch() {
      const state = getState();
      state.search = "";
      if (searchInput) searchInput.value = "";
    }

    function isSpeakerView() {
      const state = getState();
      return state.role === "speaker" || state.role === "live";
    }

    function shortClubName(entrant = {}) {
      if (entrant.clubCode) return String(entrant.clubCode).toUpperCase();
      const club = String(entrant.club || "").trim();
      if (!club) return "";
      const words = club
        .replace(/['\u2019]/g, " ")
        .split(/\s+/)
        .filter((word) => word && !["DE", "DU", "DES", "D", "LA", "LE", "LES", "L", "ET", "A", "AU", "AUX"].includes(word.toUpperCase()));
      const initials = words.map((word) => word[0]).join("").toUpperCase();
      return initials || club;
    }

    function entrantPersonKey(entrant = {}) {
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

  window.LivePalmesEntrantHelpers = { init };
}());
