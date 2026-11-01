// Existing operation bodies; live services arrive through explicit accessors.
function createEntryModelService_assertEngagementRelayMembers(backendContext) {
  function engagementRelayAllowedCategories(event = {}) {
    const categories = backendContext.ENGAGEMENT_RELAY_CATEGORY_CODES.filter((category) =>
      !(backendContext.ENGAGEMENT_EVENT_FORBIDDEN_CATEGORIES[event.code] || new Set()).has(category)
    );
    const restrictions = Array.isArray(event.categoryRestrictions)
      ? event.categoryRestrictions.filter((category) => categories.includes(category))
      : [];
    return restrictions.length ? restrictions : categories;
  }

  function cleanEngagementRelayGenderMode(rawRelay = {}, event = {}) {
    const mode = backendContext.cleanText(rawRelay.genderMode || rawRelay.sexMode || rawRelay.relayGenderMode);
    if (event.relayMixedRule === "required") return "mixed";
    if (event.relayMixedRule === "mastersOnly" && event.relayMixedMode === "masters") {
      return backendContext.ENGAGEMENT_PROGRAM_GENDER_MODES.has(mode) ? mode : "mixed";
    }
    return mode === "male" ? "male" : "female";
  }

  function engagementRelayMemberCategory(member = {}, competitionDate = "") {
    return backendContext.ageCategoryFromDates(competitionDate, member.birthDate);
  }

  function engagementRelayMemberAge(member = {}, competitionDate = "") {
    const seasonYear = backendContext.importSeasonYear(competitionDate) || backendContext.competitionYear(competitionDate);
    const born = backendContext.birthYear(member.birthDate);
    const age = seasonYear && born ? seasonYear - born : 0;
    return Number.isFinite(age) && age > 0 ? age : 0;
  }

  function engagementRelayMemberAllowedForCategory(member = {}, relayCategory = "", competitionDate = "") {
    const category = engagementRelayMemberCategory(member, competitionDate);
    if (!category) return false;
    if (backendContext.cleanText(relayCategory).startsWith("R")) return /^M\d/.test(category);
    if (relayCategory === "S") return true;
    const swimmerRank = backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[category];
    const relayRank = backendContext.ENGAGEMENT_RELAY_AGE_CATEGORY_RANK[relayCategory];
    return Number.isFinite(swimmerRank) && Number.isFinite(relayRank) && swimmerRank <= relayRank;
  }

  function assertEngagementRelayMembers(relay = {}, event = {}, swimmerById = new Map(), competition = {}) {
    const memberIds = Array.from(new Set((Array.isArray(relay.memberIds) ? relay.memberIds : [])
      .map((id) => backendContext.cleanText(id).slice(0, 80))
      .filter(Boolean)))
      .slice(0, Number(event.relayLegs || 4) || 4);
    if (!memberIds.length) return [];
    const expectedLegs = Number(event.relayLegs || 4) || 4;
    if (memberIds.length !== expectedLegs) {
      throw new backendContext.HttpsError("failed-precondition", `Indiquez ${expectedLegs} relayeurs ou laissez le relais sans relayeurs.`);
    }
    const members = memberIds.map((memberId) => {
      const swimmer = swimmerById.get(memberId);
      if (!swimmer) throw new backendContext.HttpsError("failed-precondition", "Relayeur non selectionne dans les nageurs de la competition.");
      return {
        swimmerIndexId: swimmer.swimmerIndexId,
        swimmerId: swimmer.swimmerId,
        firstName: swimmer.firstName,
        lastName: swimmer.lastName,
        name: swimmer.name,
        birthDate: swimmer.birthDate,
        sex: backendContext.normalizeCategoryCode(swimmer.sex),
        licenseNumber: swimmer.licenseNumber
      };
    });
    if (relay.genderMode === "female" && members.some((member) => member.sex !== "F")) {
      throw new backendContext.HttpsError("failed-precondition", "Un relais Femmes ne peut contenir que des nageuses.");
    }
    if (relay.genderMode === "male" && members.some((member) => member.sex !== "M")) {
      throw new backendContext.HttpsError("failed-precondition", "Un relais Hommes ne peut contenir que des nageurs.");
    }
    if (relay.genderMode === "mixed") {
      const invalidOrderIndex = members.findIndex((member, index) => member.sex !== (index % 2 === 0 ? "M" : "F"));
      if (invalidOrderIndex >= 0) {
        throw new backendContext.HttpsError("failed-precondition", "Un relais mixte doit respecter l'ordre Homme - Femme - Homme - Femme.");
      }
    }
    if (relay.category.startsWith("R")) {
      if (members.some((member) => !/^M\d/.test(engagementRelayMemberCategory(member, competition.date)))) {
        throw new backendContext.HttpsError("failed-precondition", `Relais ${relay.category} reserve aux categories Master.`);
      }
      const minimumAge = Number(relay.category.replace(/\D/g, "")) || 0;
      const totalAge = members.reduce((sum, member) => sum + engagementRelayMemberAge(member, competition.date), 0);
      if (minimumAge && totalAge < minimumAge) {
        throw new backendContext.HttpsError("failed-precondition", `Relais ${relay.category} impossible : total d'age ${totalAge}, minimum ${minimumAge}.`);
      }
    } else {
      const invalidMember = members.find((member) => !engagementRelayMemberAllowedForCategory(member, relay.category, competition.date));
      if (invalidMember) {
        throw new backendContext.HttpsError("failed-precondition", `Relayeur non autorise en relais ${relay.category} pour ${event.shortLabel || event.code}.`);
      }
    }
    return members;
  }

  function cleanEngagementEntryRelays(rawRelays = [], competition = {}, swimmers = []) {
    if (!Array.isArray(rawRelays)) return [];
    const relayEvents = new Map((Array.isArray(competition.events) ? competition.events : [])
      .filter((event) => event.type === "relay")
      .map((event) => [event.code, event]));
    const swimmerById = new Map((Array.isArray(swimmers) ? swimmers : [])
      .map((swimmer) => [backendContext.cleanText(swimmer.swimmerIndexId), swimmer])
      .filter(([id]) => id));
    const seenRelays = new Set();
    const memberDistanceSlots = new Set();
    return rawRelays.slice(0, 80).map((rawRelay) => {
      const eventCode = backendContext.normalizeCourseCode(rawRelay?.eventCode || rawRelay?.code);
      const event = relayEvents.get(eventCode);
      if (!event) throw new backendContext.HttpsError("invalid-argument", "Relais non ouvert sur cette competition.");
      const allowedCategories = engagementRelayAllowedCategories(event);
      const category = backendContext.cleanText(rawRelay?.category).toUpperCase();
      if (!allowedCategories.includes(category)) {
        throw new backendContext.HttpsError("invalid-argument", `Categorie ${category || "-"} non ouverte pour ${event.shortLabel || event.code}.`);
      }
      const genderMode = cleanEngagementRelayGenderMode(rawRelay, event);
      const duplicateKey = [eventCode, category, genderMode].join("|");
      if (!event.multipleRelaysAllowed && seenRelays.has(duplicateKey)) {
        throw new backendContext.HttpsError("failed-precondition", "Un relais identique existe deja pour ce club.");
      }
      seenRelays.add(duplicateKey);
      const openWater = backendContext.cleanEngagementCompetitionType(competition.competitionType) === "openWater";
      const manual = openWater ? null : (0, backendContext.local$parseEngagementEntryTime)(rawRelay?.manualEntryTime || rawRelay?.entryTime);
      if (!openWater && !manual) {
        throw new backendContext.HttpsError("invalid-argument", `Temps d'engagement requis pour ${event.shortLabel || event.code}.`);
      }
      const relay = {
        relayId: backendContext.cleanText(rawRelay?.relayId).slice(0, 80) || backendContext.stableHash([eventCode, category, genderMode, manual?.display || "no-time"].join("|")).slice(0, 24),
        eventCode,
        category,
        genderMode,
        manualEntryTime: backendContext.cleanText(rawRelay?.manualEntryTime || rawRelay?.entryTime).slice(0, 20),
        entryTime: manual?.display || "",
        entryTimeValue: manual?.value || 0,
        memberIds: Array.isArray(rawRelay?.memberIds) ? rawRelay.memberIds : []
      };
      const members = assertEngagementRelayMembers(relay, event, swimmerById, competition);
      members.forEach((member) => {
        const slotKey = [member.swimmerIndexId, event.distance, event.discipline].join("|");
        if (memberDistanceSlots.has(slotKey)) {
          throw new backendContext.HttpsError("failed-precondition", "Un relayeur ne peut pas etre inscrit dans deux relais de meme distance et meme nature.");
        }
        memberDistanceSlots.add(slotKey);
      });
      return backendContext.cleanFirestoreValue({
        ...relay,
        members,
        memberIds: members.map((member) => member.swimmerIndexId)
      });
    }).filter(Boolean);
  }

  function engagementRelayReferencesForEntry(referenceMap, relay = {}, competition = {}) {
    const references = [];
    if ((0, backendContext.local$engagementCompetitionAppliesToFranceRecords)(competition)) {
      if (relay.category === "S") references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "RF", relay));
      if (relay.category === "J") references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "RFJ", relay));
    }
    if ((0, backendContext.local$engagementCompetitionAppliesToMpf)(competition)) {
      references.push(backendContext.engagementRelayReferenceForEntry(referenceMap, "MPF", relay));
    }
    return references.filter(Boolean);
  }

  function validateEngagementRelayEntryTimes(relays = [], competition = {}, recordsData = {}) {
    const referenceMap = backendContext.engagementRelayReferenceMap(recordsData);
    return relays.map((relay) => {
      const timeValue = Number(relay.entryTimeValue || 0) || 0;
      const references = engagementRelayReferencesForEntry(referenceMap, relay, competition);
      const blockingReference = references
        .filter((reference) => timeValue > 0 && timeValue < Number(reference.value || 0))
        .sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
      if (blockingReference) {
        const label = backendContext.cleanText(blockingReference.alertLabel || blockingReference.recordTypeLabel || blockingReference.alertType);
        const referenceTime = backendContext.cleanText(blockingReference.time) || backendContext.formatTimeValue(blockingReference.value);
        throw new backendContext.HttpsError(
          "failed-precondition",
          `Temps impossible pour ${relay.eventCode} ${relay.category} : ${backendContext.formatTimeValue(timeValue)} est sous ${label} (${referenceTime}).`
        );
      }
      return relay;
    });
  }

  return { engagementRelayAllowedCategories, cleanEngagementRelayGenderMode, engagementRelayMemberCategory, engagementRelayMemberAge, engagementRelayMemberAllowedForCategory, assertEngagementRelayMembers, cleanEngagementEntryRelays, engagementRelayReferencesForEntry, validateEngagementRelayEntryTimes };
}

module.exports = { createEntryModelService_assertEngagementRelayMembers };
