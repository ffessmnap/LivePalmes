// Existing operation bodies; live services arrive through explicit accessors.
function createDocumentsService_engagementMailStatusLabel(backendContext) {
  function engagementMailStatusLabel(status) {
    return {
      draft: "Brouillon",
      blocked_missing_config: "Configuration mail manquante",
      ready: "Pret a envoyer",
      sending: "Envoi en cours — ne pas relancer",
      uncertain: "À vérifier — ne pas renvoyer",
      sent: "Envoye",
      failed: "Erreur",
      cancelled_no_participants: "Annule - aucun participant",
      cancelled_notifications_disabled: "Annule - notifications désactivées"
    }[backendContext.cleanText(status)] || "Brouillon";
  }

  return { engagementMailStatusLabel };
}

module.exports = { createDocumentsService_engagementMailStatusLabel };
