// Existing operation bodies; live services arrive through explicit accessors.
function createCompetitionService_nativeDocumentAuthors(backendContext) {
  async function nativeDocumentAuthors(documents) {
    const ids=[...new Set(documents.map(document=>document.uploadedBy?.uid).filter(Boolean))];
    if(!ids.length)return documents;
    // Auth identities only, one batch <=100; no former sporting collection read.
    const users=await backendContext.getAuth().getUsers(ids.map(uid=>({uid}))).catch(()=>({users:[]}));
    const byId=new Map(users.users.map(user=>[user.uid,user]));
    return documents.map(document=>{const user=byId.get(document.uploadedBy?.uid);return user?{...document,uploadedBy:{uid:user.uid,name:backendContext.cleanText(user.displayName),email:backendContext.cleanText(user.email)}}:document;});
  }

  return { nativeDocumentAuthors };
}

module.exports = { createCompetitionService_nativeDocumentAuthors };
