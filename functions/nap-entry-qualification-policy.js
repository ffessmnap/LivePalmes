"use strict";
// Native qualif_types id 29 is the existing "Grille - 595999".
// Antoine confirmed on 8 October 2026 that it imposes no sporting minimum.
// This does not disable independent LivePalmes qualification rules.
function qualificationPending(competition,{engineReady=false}={}) {
  const nativeType=Number(competition?.nativeParameters?.qualif || 0);
  return ![0,29].includes(nativeType) || !engineReady && (
    Number(competition?.options?.qualifications_enabled || 0)!==0 ||
    competition?.qualifications?.enabled===true);
}
module.exports={qualificationPending};
