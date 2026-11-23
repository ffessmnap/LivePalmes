"use strict";

const { findClub } = require("./nap-club-read-by-id");
const { isForeignClubRegion } = require("./club-access-policy");

async function clubCreationInput(pool, context, data = {}) {
  const clubId = String(context.clubId);
  const input = { clubId, actorUid: context.uid, swimmer: data.swimmer,
    creationId: data.creationId, confirmAlerts: data.confirmAlerts };
  if (data.swimmer && (data.swimmer.licenseNumber ?? "") === "") {
    const club = await findClub(pool, clubId);
    if (!isForeignClubRegion(club?.regionId)) throw new TypeError("Une licence FFESSM est obligatoire pour créer un nageur dans ce club.");
    input.allowMissingLicense = true;
    input.requireForeignClub = true;
  }
  return input;
}

module.exports = { clubCreationInput };
