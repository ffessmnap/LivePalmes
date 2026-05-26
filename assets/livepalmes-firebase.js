(function attachLivePalmesFirebase(global) {
  function competitionDocument(firestoreDb, competitionId) {
    if (!firestoreDb || !competitionId) return null;
    return firestoreDb.collection("competitions").doc(competitionId);
  }

  function collectionRef(firestoreDb, competitionId, name) {
    return competitionDocument(firestoreDb, competitionId)?.collection(name) || null;
  }

  function documentRef(firestoreDb, competitionId, collectionName, documentId) {
    return collectionRef(firestoreDb, competitionId, collectionName)?.doc(documentId) || null;
  }

  function liveDataDocument(firestoreDb, competitionId) {
    return documentRef(firestoreDb, competitionId, "liveData", "current");
  }

  function publicResultsIndexDocument(firestoreDb, competitionId) {
    return documentRef(firestoreDb, competitionId, "public", "resultsIndex");
  }

  function roleLockDocument(firestoreDb, competitionId, role) {
    return documentRef(firestoreDb, competitionId, "roleLocks", role);
  }

  function presenceDocument(firestoreDb, competitionId, id) {
    return collectionRef(firestoreDb, competitionId, "presence")?.doc(id) || null;
  }

  function sanitizeForFirestore(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  global.LivePalmesFirebase = {
    collectionRef,
    competitionDocument,
    documentRef,
    liveDataDocument,
    presenceDocument,
    publicResultsIndexDocument,
    roleLockDocument,
    sanitizeForFirestore
  };
})(window);
