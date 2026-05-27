(function attachLivePalmesAppFirestoreAccess(global) {
  function init(context = {}) {
    const {
      activeCompetitionId = "",
      currentClientId = () => "",
      getFirestoreDb = () => null,
      livePalmesFirebase = {},
      livePalmesFirestoreRefs = {}
    } = context;

    function firestoreDb() {
      return getFirestoreDb();
    }

    function collectionRef(collectionName) {
      return livePalmesFirestoreRefs.collectionRef(livePalmesFirebase, firestoreDb(), activeCompetitionId, collectionName);
    }

    function competitionDocument(competitionId = activeCompetitionId) {
      return livePalmesFirestoreRefs.competitionDocument(livePalmesFirebase, firestoreDb(), competitionId);
    }

    function activeCompetitionDocument() {
      return competitionDocument();
    }

    function liveDataDocument(competitionId = activeCompetitionId) {
      return livePalmesFirestoreRefs.liveDataDocument(livePalmesFirebase, firestoreDb(), competitionId);
    }

    function roleLockDocument(role) {
      return livePalmesFirestoreRefs.roleLockDocument(livePalmesFirebase, firestoreDb(), activeCompetitionId, role);
    }

    function publicResultsIndexDocument() {
      return livePalmesFirestoreRefs.publicResultsIndexDocument(livePalmesFirebase, firestoreDb(), activeCompetitionId);
    }

    function presenceDocument(id = `console-${currentClientId()}`) {
      return livePalmesFirestoreRefs.presenceDocument(livePalmesFirebase, firestoreDb(), activeCompetitionId, id);
    }

    return {
      activeCompetitionDocument,
      alertsCollection: () => collectionRef("alerts"),
      competitionDocument,
      historyArchivesCollection: () => collectionRef("historyArchives"),
      liveDataDocument,
      presenceCollection: () => collectionRef("presence"),
      presenceDocument,
      publicResultsIndexDocument,
      resultArchivesCollection: () => collectionRef("resultArchives"),
      resultPdfsCollection: () => collectionRef("resultPdfs"),
      resultsCollection: () => collectionRef("results"),
      roleLockDocument,
      seriesPdfsCollection: () => collectionRef("seriesPdfs"),
      sessionResultsPdfsCollection: () => collectionRef("sessionResultsPdfs")
    };
  }

  global.LivePalmesAppFirestoreAccess = { init };
})(window);
