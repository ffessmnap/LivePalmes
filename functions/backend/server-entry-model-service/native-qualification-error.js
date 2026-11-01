// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_nativeQualificationError(backendContext) {
  function nativeQualificationError(error){
    if(error instanceof backendContext.HttpsError)return error;
    return new backendContext.HttpsError(error instanceof TypeError?"failed-precondition":error instanceof RangeError?"resource-exhausted":"unavailable",error instanceof TypeError||error instanceof RangeError?error.message:"Traitement NAP interrompu. Reprenez le meme controle ; sa sauvegarde est conservee.");
  }

  return { nativeQualificationError };
}

module.exports = { createEntryModelService_nativeQualificationError };
