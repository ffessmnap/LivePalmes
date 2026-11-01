// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_ageCategoryFromDates(backendContext) {
  function competitionYear(date) {
    const match = String(date || "").match(/^(\d{4})-/);
    return match ? Number(match[1]) : 0;
  }

  function birthYear(date) {
    const match = String(date || "").match(/^(\d{4})-/);
    const year = match ? Number(match[1]) : 0;
    return year >= 1900 && year <= 2100 ? year : 0;
  }

  function ageCategoryFromDates(competitionDate, birthDate) {
    const year = (0, backendContext.local$importSeasonYear)(competitionDate) || competitionYear(competitionDate);
    const born = birthYear(birthDate);
    const age = year && born ? year - born : null;
    if (!Number.isFinite(age) || age < 0 || age > 120) return "";
    if (age <= 9) return "P";
    if (age <= 11) return "B";
    if (age <= 13) return "M";
    if (age <= 15) return "C";
    if (age <= 17) return "J";
    if (age <= 29) return "S";
    if (age <= 39) return "M30+";
    if (age <= 49) return "M40+";
    if (age <= 59) return "M50+";
    if (age <= 69) return "M60+";
    if (age <= 79) return "M70+";
    return "M80+";
  }

  return { competitionYear, birthYear, ageCategoryFromDates };
}

module.exports = { createImportService_ageCategoryFromDates };
