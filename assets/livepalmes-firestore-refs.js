(function () {
  function competitionDocument(firebaseApi, firestoreDb, competitionId) {
    return firebaseApi.competitionDocument(firestoreDb, competitionId);
  }

  function collectionRef(firebaseApi, firestoreDb, competitionId, name) {
    return firebaseApi.collectionRef(firestoreDb, competitionId, name);
  }

  function publicResultsIndexDocument(firebaseApi, firestoreDb, competitionId) {
    return firebaseApi.publicResultsIndexDocument(firestoreDb, competitionId);
  }

  function liveDataDocument(firebaseApi, firestoreDb, competitionId) {
    return firebaseApi.liveDataDocument(firestoreDb, competitionId);
  }

  function roleLockDocument(firebaseApi, firestoreDb, competitionId, role) {
    return firebaseApi.roleLockDocument(firestoreDb, competitionId, role);
  }

  function presenceDocument(firebaseApi, firestoreDb, competitionId, id) {
    return firebaseApi.presenceDocument(firestoreDb, competitionId, id);
  }

  window.LivePalmesFirestoreRefs = {
    collectionRef,
    competitionDocument,
    liveDataDocument,
    presenceDocument,
    publicResultsIndexDocument,
    roleLockDocument
  };
}());
