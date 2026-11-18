"use strict";

// This request is created by the callable SDK after Firebase token verification.
// Neither custom access claims, client data nor a stored enrollment prove MFA.
function hasVerifiedTotp(request) {
  const firebase = request.auth?.token?.firebase;
  return firebase?.sign_in_second_factor === "totp";
}

// Mandatory MFA was postponed by Antoine on 18 November 2026. Runtime exports
// remain optional. Only isolated fixtures opt into the prepared mandatory policy;
// no client field, custom claim or environment variable enables it.
function createAdminMfaPolicy({ required = false } = {}) {
  function adminMfaRequired(request, profile) {
    return required === true && profile?.capabilities?.["admin.full"] === true && !hasVerifiedTotp(request);
  }
  function assertAdminMfa(request, profile, HttpsError) {
    if (adminMfaRequired(request, profile)) {
      throw new HttpsError("unauthenticated", "La double vérification est requise pour cet accès administrateur. Reconnectez-vous avec Microsoft Authenticator.", {adminMfaRequired:true});
    }
  }
  return { adminMfaRequired, assertAdminMfa };
}
module.exports = { hasVerifiedTotp, createAdminMfaPolicy, ...createAdminMfaPolicy() };
