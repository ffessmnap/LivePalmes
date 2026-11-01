// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionModelService_cleanEngagementOpenWaterCourse(backendContext) {
  function cleanEngagementOpenWaterCourse(raw = {}, options = {}) {
    const strict = options.strict !== false;
    const distance = Math.trunc(Number(raw.distance));
    const discipline = backendContext.cleanText(raw.discipline).toUpperCase();
    if (!Number.isInteger(distance) || distance < 1 || distance > 100000) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "La distance eau libre doit etre comprise entre 1 et 100000 metres.");
      return null;
    }
    if (!backendContext.ENGAGEMENT_OPEN_WATER_COURSE_DISCIPLINES.has(discipline)) {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Choisissez la specialite : Surface, Bi-palmes ou Support.");
      return null;
    }
    if (distance === 150 && discipline === "SUP") {
      if (strict) throw new backendContext.HttpsError("invalid-argument", "Le 150 m elimination est disponible uniquement en Surface et Bi-palmes.");
      return null;
    }
    const format = distance === 150 ? "elimination" : "standard";
    const distanceLabel = format === "elimination" ? "150 m élimination" : `${distance} m`;
    const disciplineLabel = { SF: "Surface", BI: "Bi-palmes", SUP: "Support" }[discipline];
    const id = `${format === "elimination" ? "150-elimination" : distance}-${discipline}`;
    return {
      id,
      distance,
      discipline,
      label: `${distanceLabel} ${disciplineLabel}`,
      format,
      active: raw.active !== false
    };
  }

  return { cleanEngagementOpenWaterCourse };
}

module.exports = { createCompetitionModelService_cleanEngagementOpenWaterCourse };
