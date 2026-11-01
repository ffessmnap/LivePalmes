// Existing operation bodies; live services arrive through explicit accessors.
function createMailService_engagementCompetitionDocumentMailHtml(backendContext) {
  function engagementCompetitionDocumentMailHtml(competition = {}, documents = []) {
    const detailsHtml = backendContext.competitionMailLines(competition).map(backendContext.escapeMailHtml).join("<br>");
    const documentItems = documents.map((document) => {
      const label = backendContext.escapeMailHtml(document.title || document.fileName || "Document");
      const url = backendContext.escapeMailHtml(document.url || "");
      return `<li><a href="${url}">${label}</a></li>`;
    }).join("");
    return [
      "<p>Bonjour,</p>",
      `<p>${documents.length > 1 ? "Des documents ont été ajoutés ou mis à jour" : "Un document a été ajouté ou mis à jour"} pour la compétition suivante :</p>`,
      `<p>${detailsHtml}</p>`,
      `<ul>${documentItems}</ul>`,
      `<p><a href="${backendContext.ENVIRONMENT.hostingOrigin}/portail.html#club-competitions">Accéder à la compétition dans le portail LivePalmes</a></p>`,
      "<p>Sportivement,<br>Nage avec Palmes FFESSM</p>"
    ].join("");
  }

  return { engagementCompetitionDocumentMailHtml };
}

module.exports = { createMailService_engagementCompetitionDocumentMailHtml };
