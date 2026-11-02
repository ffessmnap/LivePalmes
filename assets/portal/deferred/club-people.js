(function registerDeferredPortalModule(global) {
  global.LivePalmesPortalDeferred.register("club-people", function create(portalContext, moduleActions) {
    const { state: portalState, actions: portalActions, config: portalConfig } = portalContext;
    async function confirmEngagementClubTeamLeaderCandidate(candidate = {}) {
        if (!candidate?.selectionId) return null;
        if (global.LivePalmesEnvironment?.sportingDataSource === "nap") return candidate;
        const conflict = moduleActions.engagementClubMemberRoleConflict(candidate, "teamLeader");
        if (conflict) {
          global.alert(conflict);
          throw new Error(conflict);
        }
        if (candidate.roles?.teamLeader === true) return candidate;
        const name = moduleActions.engagementClubPersonDisplayName(candidate);
        if (!global.confirm(`${name} n'est pas encore déclaré comme chef d'équipe. Voulez-vous lui attribuer ce rôle ?`)) {
          return null;
        }
        if (candidate.candidateType !== "swimmer") return candidate;
        const result = await portalActions.callFunction("saveEngagementClubPerson", {
          person: moduleActions.engagementClubPersonPayloadWithRole(candidate, "teamLeader")
        });
        const person = result.person || null;
        if (!person?.id) throw new Error("Membre non retourné après l'ajout du rôle chef d'équipe.");
        portalState.engagementClubPeople = [
          ...portalState.engagementClubPeople.filter((item) => item.id !== person.id),
          person
        ];
        return { ...person, selectionId: person.id, candidateType: "person" };
      }

    async function selectEngagementClubTeamRenunciation(event) {
        event?.preventDefault?.();
        if (portalState.engagementClubTeamRenunciationSaving) return;
        const context = portalState.engagementClubTeamRenunciationContext;
        if (!context || context.competitionId !== portalState.selectedEngagementCompetitionId || context.clubId !== String(portalActions.activeEngagementClubProfile().clubId || "")) return;
        if (context.fingerprint !== portalState.selectedEngagementClubEntry?.napFingerprint || context.leader !== JSON.stringify(portalState.selectedEngagementClubEntry?.teamLeader || {})) {
          moduleActions.closeEngagementClubTeamRenunciationDialog();
          if (portalContext.elements.engagementsClubTeamMessage) {
            portalContext.elements.engagementsClubTeamMessage.textContent = "Le dossier a changé. Rouvrez la confirmation après avoir vérifié le chef d’équipe actuel.";
            portalContext.elements.engagementsClubTeamMessage.dataset.tone = "warning";
          }
          return;
        }
        if (portalState.engagementClubTeamSaving || portalActions.engagementClubTeamLeaderLockReason() || !portalActions.canUse("engagements.club.manage")) return;
        portalState.engagementClubTeamRenunciationContext = null;
        if (portalContext.elements.engagementsClubTeamRenunciationDialog?.open) portalContext.elements.engagementsClubTeamRenunciationDialog.close();
        const radio = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"][value="renounced"]');
        if (radio) radio.checked = true;
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        portalState.engagementClubTeamRenunciationSaving = true;
        try {
          const saved = await portalActions.saveEngagementClubTeamLeader();
          if (!saved && context.competitionId === portalState.selectedEngagementCompetitionId && context.clubId === String(portalActions.activeEngagementClubProfile().clubId || "")) moduleActions.restoreEngagementClubTeamLeaderChoice();
        } finally {
          portalState.engagementClubTeamRenunciationSaving = false;
        }
      }

    async function saveEngagementClubExternalTeamLeader(event) {
        event?.preventDefault?.();
        if (portalContext.elements.engagementsClubTeamExternalDialogForm && !portalContext.elements.engagementsClubTeamExternalDialogForm.checkValidity()) {
          portalContext.elements.engagementsClubTeamExternalDialogForm.reportValidity?.();
          return;
        }
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = portalContext.elements.engagementsClubTeamExternalLastName?.value.trim().toLocaleUpperCase("fr-FR") || "";
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = portalContext.elements.engagementsClubTeamExternalFirstName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = portalContext.elements.engagementsClubTeamExternalDialogClubName?.value.trim() || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = true;
        portalActions.updateEngagementClubTeamFormMode();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = true;
        const saved = await portalActions.saveEngagementClubTeamLeader();
        if (portalContext.elements.engagementsClubTeamExternalDialogApply) portalContext.elements.engagementsClubTeamExternalDialogApply.disabled = false;
        if (saved) {
          moduleActions.closeEngagementClubExternalTeamDialog();
        } else if (portalContext.elements.engagementsClubTeamExternalDialogMessage) {
          portalContext.elements.engagementsClubTeamExternalDialogMessage.textContent = portalContext.elements.engagementsClubTeamMessage?.textContent || "Enregistrement impossible.";
          portalContext.elements.engagementsClubTeamExternalDialogMessage.dataset.tone = "error";
        }
      }

    async function handleEngagementClubOfficialSelection(event) {
        if(portalState.engagementClubNativeRelayRetry || portalState.engagementClubNativeOfficialRetry || portalState.engagementClubNativeSelectionRetry || portalState.engagementClubNativeIndividualRetry) {
          moduleActions.renderEngagementClubOfficials();
          if(portalContext.elements.engagementsClubOfficialsMessage) portalContext.elements.engagementsClubOfficialsMessage.textContent="Un enregistrement NAP reste à vérifier. Cliquez sur Enregistrer pour le reprendre.";
          return;
        }
        const checkbox = event.target.closest("[data-engagement-club-official-selection]");
        if (!checkbox) return;
        const selectionId = checkbox.dataset.engagementClubOfficialSelection || "";
        let candidate = moduleActions.engagementClubOfficialPeople().find((person) => (person.selectionId || person.id) === selectionId) || null;
        if (!candidate) return;
        const previousOfficials = portalActions.cloneEngagementClubEntry(portalState.selectedEngagementClubEntry?.officials || []);
        if (!checkbox.checked) {
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: (portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id)
          };
          moduleActions.renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            moduleActions.renderEngagementClubOfficials();
          }
          return;
        }
        const conflict = moduleActions.engagementClubMemberRoleConflict(candidate, "official");
        if (conflict) {
          checkbox.checked = false;
          global.alert(conflict);
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = conflict;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
          return;
        }
        try {
          if (candidate.roles?.official !== true) {
            const name = moduleActions.engagementClubPersonDisplayName(candidate);
            if (!global.confirm(`${name} n'est pas encore déclaré comme officiel. Voulez-vous lui attribuer ce rôle ?`)) {
              checkbox.checked = false;
              return;
            }
            const existingPerson = candidate.candidateType === "swimmer" ? moduleActions.engagementClubPersonForSwimmer(candidate) : candidate;
            const personResult = await portalActions.callFunction("saveEngagementClubPerson", {
              personId: existingPerson?.id || "",
              person: moduleActions.engagementClubPersonPayloadWithRole({ ...candidate, ...(existingPerson || {}) }, "official")
            });
            const person = personResult.person || null;
            if (!person?.id) throw new Error("Personne non retournée après l'ajout du rôle officiel.");
            portalState.engagementClubPeople = [...portalState.engagementClubPeople.filter((item) => item.id !== person.id), person];
            candidate = { ...person, candidateType: "person", selectionId: person.id };
          }
          portalState.selectedEngagementClubEntry = {
            ...(portalState.selectedEngagementClubEntry || {}),
            officials: [
              ...(portalState.selectedEngagementClubEntry?.officials || []).filter((official) => official.personId !== candidate.id),
              {
                personId: candidate.id,
                firstName: candidate.firstName || "",
                lastName: candidate.lastName || "",
                licenseNumber: candidate.licenseNumber || ""
              }
            ]
          };
          moduleActions.renderEngagementClubOfficials();
          const saved = await portalActions.saveEngagementClubOfficials();
          if (!saved) {
            portalState.selectedEngagementClubEntry = { ...(portalState.selectedEngagementClubEntry || {}), officials: previousOfficials };
            moduleActions.renderEngagementClubOfficials();
          }
        } catch (error) {
          checkbox.checked = false;
          if (portalContext.elements.engagementsClubOfficialsMessage) {
            portalContext.elements.engagementsClubOfficialsMessage.textContent = `Ajout impossible : ${error?.message || error}`;
            portalContext.elements.engagementsClubOfficialsMessage.dataset.tone = "error";
          }
        }
      }

    async function loadEngagementAdminPublicSwimmerSearchShard(shard = "") {
        const cleanShard = String(shard || "").trim();
        if (!cleanShard) return [];
        if (portalConfig.publicPerformanceSwimmerSearchShards.has(cleanShard)) {
          return portalConfig.publicPerformanceSwimmerSearchShards.get(cleanShard);
        }
        const promise = fetch(`${portalConfig.PERFORMANCE_PUBLIC_SEARCH_BASE}/search/${encodeURIComponent(cleanShard)}.json?v=${portalConfig.ENGAGEMENT_ADMIN_PUBLIC_SWIMMER_SEARCH_VERSION}`, {
          cache: "no-cache"
        })
          .then((response) => {
            if (response.status === 404) return [];
            if (!response.ok) throw new Error("Index public nageurs indisponible.");
            return response.json();
          })
          .then((rows) => Array.isArray(rows) ? rows : [])
          .catch(() => []);
        portalConfig.publicPerformanceSwimmerSearchShards.set(cleanShard, promise);
        return promise;
      }

    async function searchEngagementAdminPublicSwimmers(query = "", limit = 80) {
        const terms = moduleActions.engagementAdminPublicSwimmerSearchTokens(query).slice(0, 5);
        if (!terms.length) return [];
        const shard = moduleActions.engagementAdminPublicSwimmerSearchShard(query);
        const rows = await moduleActions.loadEngagementAdminPublicSwimmerSearchShard(shard);
        const results = rows
          .map(moduleActions.engagementAdminPublicSwimmerItem)
          .filter((swimmer) => {
            const haystack = moduleActions.normalizedEngagementClubSearch(swimmer.searchText || [
              swimmer.firstName,
              swimmer.lastName,
              swimmer.name,
              swimmer.birthDate,
              swimmer.sex,
              swimmer.clubId,
              swimmer.clubName,
              ...(Array.isArray(swimmer.sourceIds) ? swimmer.sourceIds : []),
              ...(Array.isArray(swimmer.aliases) ? swimmer.aliases : [])
            ].filter(Boolean).join(" "));
            return terms.every((term) => haystack.includes(term));
          })
          .sort((left, right) =>
            moduleActions.engagementAdminPublicSwimmerScore(left, terms) - moduleActions.engagementAdminPublicSwimmerScore(right, terms) ||
            String(right.latestDate || "").localeCompare(String(left.latestDate || "")) ||
            String(left.lastName || "").localeCompare(String(right.lastName || ""), "fr-FR") ||
            String(left.firstName || "").localeCompare(String(right.firstName || ""), "fr-FR")
          );
        return results.slice(0, limit);
      }
    function selectedEngagementTeamLeaderFromForm() {
        const mode = portalContext.elements.engagementsClubTeamForm?.querySelector('input[name="adminEngagementsClubTeamMode"]:checked')?.value || "person";
        if (mode === "renounced") {
          return {
            mode,
            renunciationAccepted: portalContext.elements.engagementsClubTeamRenunciation?.checked === true
          };
        }
        const externalClub = portalContext.elements.engagementsClubTeamExternal?.checked === true;
        const activeClubProfile = portalActions.activeEngagementClubProfile(portalState.currentAccessProfile || {});
        return {
          mode: "person",
          personId: externalClub ? "" : String(portalContext.elements.engagementsClubTeamPersonSelect?.value || "").trim(),
          firstName: String(portalContext.elements.engagementsClubTeamFirstName?.value || "").trim(),
          lastName: String(portalContext.elements.engagementsClubTeamLastName?.value || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: externalClub ? "" : String(portalContext.elements.engagementsClubTeamBirthDate?.value || "").trim(),
          sex: externalClub ? "" : String(portalContext.elements.engagementsClubTeamSex?.value || "").trim(),
          licenseNumber: portalActions.formatEngagementSwimmerLicense(portalContext.elements.engagementsClubTeamLicense?.value || ""),
          externalClub,
          clubId: externalClub ? String(portalContext.elements.engagementsClubTeamExternalClubId?.value || "").trim() : (activeClubProfile.clubId || ""),
          clubName: externalClub ? String(portalContext.elements.engagementsClubTeamExternalClubName?.value || "").trim() : (activeClubProfile.clubName || "")
        };
      }

    function engagementClubIdentityEditDistance(left = "", right = "") {
        const a = moduleActions.normalizedEngagementClubIdentityPart(left);
        const b = moduleActions.normalizedEngagementClubIdentityPart(right);
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
        for (let row = 1; row <= a.length; row += 1) {
          const current = [row];
          for (let column = 1; column <= b.length; column += 1) {
            current[column] = Math.min(
              current[column - 1] + 1,
              previous[column] + 1,
              previous[column - 1] + Number(a[row - 1] !== b[column - 1])
            );
          }
          previous = current;
        }
        return previous[b.length];
      }

    function engagementClubIdentityPartSimilar(left = "", right = "") {
        const a = moduleActions.normalizedEngagementClubIdentityPart(left);
        const b = moduleActions.normalizedEngagementClubIdentityPart(right);
        if (!a || !b) return false;
        if (a === b) return true;
        if (Math.min(a.length, b.length) >= 4 && (a.includes(b) || b.includes(a))) return true;
        const maximumDistance = Math.min(a.length, b.length) >= 7 ? 2 : 1;
        return moduleActions.engagementClubIdentityEditDistance(a, b) <= maximumDistance;
      }

    function engagementClubPersonIdentityMatch(person = {}, ignoredPersonId = "") {
        const candidates = portalState.engagementClubPeople.filter((candidate) => candidate.id && candidate.id !== ignoredPersonId);
        const licenseKey = moduleActions.engagementClubPersonLicenseKey(person.licenseNumber);
        const sameLicense = licenseKey && candidates.find((candidate) =>
          moduleActions.engagementClubPersonLicenseKey(candidate.licenseNumber) === licenseKey
        );
        if (sameLicense) return { type: "license", person: sameLicense };
        const identityKey = moduleActions.engagementClubPersonIdentityKey(person);
        const invertedIdentityKey = moduleActions.engagementClubPersonIdentityKey(person, true);
        const exact = identityKey && candidates.find((candidate) => moduleActions.engagementClubPersonIdentityKey(candidate) === identityKey);
        if (exact) return { type: "exact", person: exact };
        const inverted = invertedIdentityKey && invertedIdentityKey !== identityKey
          ? candidates.find((candidate) => moduleActions.engagementClubPersonIdentityKey(candidate) === invertedIdentityKey)
          : null;
        if (inverted) return { type: "inverted", person: inverted };
        const similar = person.birthDate ? candidates.find((candidate) => {
          if (candidate.birthDate !== person.birthDate) return false;
          const normalOrder = moduleActions.engagementClubIdentityPartSimilar(candidate.lastName, person.lastName) &&
            moduleActions.engagementClubIdentityPartSimilar(candidate.firstName, person.firstName);
          const invertedOrder = moduleActions.engagementClubIdentityPartSimilar(candidate.lastName, person.firstName) &&
            moduleActions.engagementClubIdentityPartSimilar(candidate.firstName, person.lastName);
          return normalOrder || invertedOrder;
        }) : null;
        return similar ? { type: "similar", person: similar } : null;
      }

    function engagementClubPersonDisplayName(person = {}) {
        return [person.lastName, person.firstName].filter(Boolean).join(" ") || person.licenseNumber || "ce membre";
      }

    function engagementClubPersonPayloadWithRole(person = {}, role = "") {
        return {
          firstName: String(person.firstName || "").trim(),
          lastName: String(person.lastName || "").trim().toLocaleUpperCase("fr-FR"),
          birthDate: String(person.birthDate || "").trim(),
          sex: String(person.sex || "").trim().toUpperCase(),
          licenseNumber: portalActions.formatEngagementSwimmerLicense(person.licenseNumber || ""),
          swimmerIndexId: String(person.swimmerIndexId || "").trim(),
          swimmerSource: String(person.swimmerSource || person.source || "").trim(),
          roles: {
            teamLeader: person.roles?.teamLeader === true || role === "teamLeader",
            official: person.roles?.official === true || role === "official"
          }
        };
      }

    function resolveEngagementClubPersonIdentity(person = {}, roleLabel = "membre", ignoredPersonId = "") {
        const match = moduleActions.engagementClubPersonIdentityMatch(person, ignoredPersonId);
        if (!match) return { person: null, cancelled: false };
        const name = moduleActions.engagementClubPersonDisplayName(match.person);
        if (match.type === "similar") {
          if (global.confirm(`Une personne similaire existe peut-être : ${name}. L'utiliser comme ${roleLabel} ?`)) {
            return { person: match.person, cancelled: false };
          }
          const createAnyway = global.confirm(`Créer une nouvelle personne malgré la ressemblance avec ${name} ?`);
          return { person: null, cancelled: !createAnyway };
        }
        const reason = match.type === "inverted"
          ? "avec le nom et le prénom inversés"
          : match.type === "license"
            ? "avec le même numéro de licence"
            : "avec la même identité";
        const reuse = global.confirm(`Cette création est impossible : ${name} existe déjà ${reason}. L'utiliser comme ${roleLabel} ?`);
        return { person: reuse ? match.person : null, cancelled: !reuse };
      }

    function engagementAdminPublicSwimmerSearchTokens(value) {
        return moduleActions.normalizedEngagementClubSearch(value)
          .replace(/[^a-z0-9]+/g, " ")
          .split(/\s+/)
          .filter((token) => token.length >= 2);
      }

    function engagementAdminPublicSwimmerSearchShard(value) {
        const token = moduleActions.engagementAdminPublicSwimmerSearchTokens(value)[0] || "";
        return token.slice(0, 2);
      }

    function engagementAdminPublicSwimmerScore(swimmer = {}, terms = []) {
        const name = moduleActions.normalizedEngagementClubSearch([swimmer.firstName, swimmer.lastName].filter(Boolean).join(" "));
        const reverseName = moduleActions.normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
        const searchText = moduleActions.normalizedEngagementClubSearch(swimmer.searchText || "");
        if (terms.length && (name === terms.join(" ") || reverseName === terms.join(" "))) return 0;
        if (terms.length && (name.startsWith(terms.join(" ")) || reverseName.startsWith(terms.join(" ")))) return 1;
        if (terms.some((term) => moduleActions.normalizedEngagementClubSearch(swimmer.lastName).startsWith(term))) return 2;
        if (terms.every((term) => searchText.includes(term))) return 3;
        return 4;
      }

    function engagementAdminPublicSwimmerItem(row = {}) {
        return {
          ...row,
          id: String(row.id || row.swimmerIndexId || "").trim(),
          swimmerIndexId: String(row.swimmerIndexId || row.id || "").trim(),
          source: row.source || "performances",
          active: row.active !== false,
          status: row.status || "active",
          clubName: row.clubName || row.club || "",
          updatedAt: row.updatedAt || row.latestDate || ""
        };
      }

    function mergeEngagementNationalSwimmerResults(rows = []) {
        const byKey = new Map();
        rows.forEach((raw) => {
          const swimmer = moduleActions.engagementAdminPublicSwimmerItem(raw);
          const source = swimmer.source || "performances";
          const stablePerformanceId = Array.isArray(swimmer.sourceIds)
            ? swimmer.sourceIds.find(Boolean)
            : "";
          const key = source === "performances"
            ? `${source}:${stablePerformanceId || swimmer.swimmerId || swimmer.identityKey || swimmer.id || swimmer.swimmerIndexId}`
            : `${source}:${swimmer.id || swimmer.swimmerIndexId}`;
          if (!key.endsWith(":")) {
            const existing = byKey.get(key) || {};
            const merged = { ...existing, ...swimmer };
            ["clubId", "club", "clubName", "latestDate"].forEach((field) => {
              if (!merged[field] && existing[field]) merged[field] = existing[field];
            });
            if (Number(existing.performanceCount || 0) > Number(swimmer.performanceCount || 0)) {
              merged.performanceCount = existing.performanceCount;
            }
            byKey.set(key, merged);
          }
        });
        return Array.from(byKey.values());
      }

    function applyEngagementClubTeamPerson(personId = "") {
        const person = portalState.engagementClubPeople.find((item) => item.id === personId);
        if (!person) {
          if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = "";
          if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = "";
          if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.value = "";
          if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.value = "";
          if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = "";
          if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
          if (portalContext.elements.engagementsClubTeamExternalClubId) portalContext.elements.engagementsClubTeamExternalClubId.value = "";
          if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = "";
          portalActions.updateEngagementClubTeamFormMode();
          return false;
        }
        if (portalContext.elements.engagementsClubTeamFirstName) portalContext.elements.engagementsClubTeamFirstName.value = person.firstName || "";
        if (portalContext.elements.engagementsClubTeamLastName) portalContext.elements.engagementsClubTeamLastName.value = person.lastName || "";
        if (portalContext.elements.engagementsClubTeamBirthDate) portalContext.elements.engagementsClubTeamBirthDate.value = person.birthDate || "";
        if (portalContext.elements.engagementsClubTeamSex) portalContext.elements.engagementsClubTeamSex.value = person.sex || "";
        if (portalContext.elements.engagementsClubTeamLicense) portalContext.elements.engagementsClubTeamLicense.value = person.licenseNumber || "";
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = false;
        if (portalContext.elements.engagementsClubTeamExternalClubId) portalContext.elements.engagementsClubTeamExternalClubId.value = "";
        if (portalContext.elements.engagementsClubTeamExternalClubName) portalContext.elements.engagementsClubTeamExternalClubName.value = "";
        portalActions.updateEngagementClubTeamFormMode();
        return true;
      }

    function restoreEngagementClubTeamLeaderChoice() {
        const teamLeader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        portalContext.elements.engagementsClubTeamForm?.querySelectorAll('input[name="adminEngagementsClubTeamMode"]')
          .forEach((radio) => {
            radio.checked = teamLeader.mode === "renounced"
              ? radio.value === "renounced"
              : teamLeader.mode === "person" && !teamLeader.externalClub && radio.value === "person";
          });
        if (portalContext.elements.engagementsClubTeamExternal) portalContext.elements.engagementsClubTeamExternal.checked = teamLeader.mode === "person" && teamLeader.externalClub === true;
        if (portalContext.elements.engagementsClubTeamRenunciation) portalContext.elements.engagementsClubTeamRenunciation.checked = teamLeader.renunciationAccepted === true;
        portalActions.updateEngagementClubTeamFormMode();
      }

    function cancelEngagementClubTeamEdit() {
        if (portalState.engagementClubTeamSaving) return;
        const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        for (const [key, property] of [["FirstName", "firstName"], ["LastName", "lastName"], ["BirthDate", "birthDate"], ["Sex", "sex"], ["License", "licenseNumber"]]) {
          if (portalContext.elements[`engagementsClubTeam${key}`]) portalContext.elements[`engagementsClubTeam${key}`].value = leader[property] || "";
        }
        portalState.engagementClubTeamEditing = false;
        if (portalContext.elements.engagementsClubTeamPersonFields) delete portalContext.elements.engagementsClubTeamPersonFields.dataset.manualEntry;
        if (portalContext.elements.engagementsClubTeamPersonSearch) portalContext.elements.engagementsClubTeamPersonSearch.value = "";
        moduleActions.renderEngagementClubTeamPersonOptions(moduleActions.findEngagementClubTeamPersonFromFields(leader)?.id || "");
        moduleActions.restoreEngagementClubTeamLeaderChoice();
        portalActions.updateEngagementClubTeamLeaderActions();
        portalContext.elements.engagementsClubTeamModifyButton?.focus();
      }

    function openEngagementClubTeamRenunciationDialog() {
        if (!portalState.selectedEngagementCompetitionId || !portalActions.canUse("engagements.club.manage") || portalState.engagementClubTeamSaving || portalState.engagementClubTeamRenunciationSaving || portalActions.engagementClubTeamLeaderLockReason()) return false;
        const leader = portalState.selectedEngagementClubEntry?.teamLeader || {};
        if (portalState.selectedEngagementCompetition?.nativeReadOnly === true && leader.externalClub) return false;
        portalState.engagementClubTeamRenunciationContext = {competitionId: portalState.selectedEngagementCompetitionId, clubId: String(portalActions.activeEngagementClubProfile().clubId || ""), fingerprint: portalState.selectedEngagementClubEntry?.napFingerprint, leader: JSON.stringify(leader)};
        if (portalContext.elements.engagementsClubTeamRenunciationDialogTitle) portalContext.elements.engagementsClubTeamRenunciationDialogTitle.textContent = leader.mode === "person" ? "Retirer le chef d’équipe ?" : "Ne déclarer aucun chef d’équipe ?";
        if (portalContext.elements.engagementsClubTeamRenunciationDialogSummary) portalContext.elements.engagementsClubTeamRenunciationDialogSummary.textContent = leader.mode === "person"
          ? `Vous allez retirer ${[leader.firstName, leader.lastName].filter(Boolean).join(" ")} et participer sans chef d’équipe.`
          : "Vous allez participer sans chef d’équipe.";
        if (!portalContext.elements.engagementsClubTeamRenunciationDialog?.open) {
          portalContext.elements.engagementsClubTeamRenunciationDialog?.showModal();
        }
        return true;
      }

    function closeEngagementClubTeamRenunciationDialog() {
        portalState.engagementClubTeamRenunciationContext = null;
        if (portalContext.elements.engagementsClubTeamRenunciationDialog?.open) portalContext.elements.engagementsClubTeamRenunciationDialog.close();
        moduleActions.restoreEngagementClubTeamLeaderChoice();
      }

    function closeEngagementClubExternalTeamDialog({ reset = false } = {}) {
        if (portalContext.elements.engagementsClubTeamExternalDialog?.open) portalContext.elements.engagementsClubTeamExternalDialog.close();
        if (reset) moduleActions.restoreEngagementClubTeamLeaderChoice();
      }

    function openEngagementClubExternalTeamDialog() {
        const dialog = portalContext.elements.engagementsClubTeamExternalDialog;
        if (!dialog) return;
        if (portalContext.elements.engagementsClubTeamExternalLastName) portalContext.elements.engagementsClubTeamExternalLastName.value = portalContext.elements.engagementsClubTeamLastName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalFirstName) portalContext.elements.engagementsClubTeamExternalFirstName.value = portalContext.elements.engagementsClubTeamFirstName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalDialogClubName) portalContext.elements.engagementsClubTeamExternalDialogClubName.value = portalContext.elements.engagementsClubTeamExternalClubName?.value || "";
        if (portalContext.elements.engagementsClubTeamExternalDialogMessage) portalContext.elements.engagementsClubTeamExternalDialogMessage.textContent = "";
        if (!dialog.open) dialog.showModal();
        portalContext.elements.engagementsClubTeamExternalLastName?.focus();
      }

    function engagementClubSwimmerFromReferenceValue(value = "") {
        const [rawSource = "", rawId = ""] = String(value || "").split(":");
        if (!rawSource || !rawId) return null;
        const source = decodeURIComponent(rawSource);
        const swimmerIndexId = decodeURIComponent(rawId);
        return portalState.engagementClubSwimmers.find((swimmer) =>
          String(swimmer.source || "performances") === source && String(swimmer.swimmerIndexId || swimmer.id || "") === swimmerIndexId
        ) || null;
      }

    function renderEngagementClubPersonSwimmerOptions() {
        const availableSwimmers = portalState.engagementClubSwimmers
          .filter((swimmer) => swimmer.active !== false)
          .sort((left, right) => `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "fr"));
        if (portalContext.elements.engagementsClubPersonSwimmerResults) {
          const query = moduleActions.normalizedEngagementClubSearch(portalContext.elements.engagementsClubPersonSwimmerSearch?.value || "");
          const terms = query.split(/\s+/).filter(Boolean);
          const matchingSwimmers = query
            ? availableSwimmers.filter((swimmer) => {
              const haystack = portalActions.engagementClubSwimmerSearchText(swimmer);
              return terms.every((term) => haystack.includes(term));
            })
            : [];
          if (!query) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = true;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = "";
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "false");
          } else if (!matchingSwimmers.length) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = false;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = '<p class="admin-engagements-club-person-swimmer-empty">Aucun nageur trouvé. Vous pouvez saisir la personne manuellement.</p>';
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
          } else {
            const visibleSwimmers = matchingSwimmers.slice(0, 8);
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = false;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = [
              ...visibleSwimmers.map((swimmer) => {
                const value = moduleActions.engagementClubSwimmerReferenceValue(swimmer);
                const name = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ") || swimmer.name || "Nageur sans nom";
                const license = swimmer.licenseNumber || "Licence à renseigner";
                return `<button type="button" data-engagement-club-person-swimmer-result="${portalActions.escapeHtml(value)}" ${swimmer.licenseNumber ? "" : "disabled"}>
              <strong>${portalActions.escapeHtml(name)}</strong>
              <small>${portalActions.escapeHtml(license)}</small>
            </button>`;
              }),
              matchingSwimmers.length > visibleSwimmers.length
                ? `<small class="admin-engagements-club-person-swimmer-more">${matchingSwimmers.length - visibleSwimmers.length} autre${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} résultat${matchingSwimmers.length - visibleSwimmers.length > 1 ? "s" : ""} · précisez la recherche</small>`
                : ""
            ].join("");
            portalContext.elements.engagementsClubPersonSwimmerSearch?.setAttribute("aria-expanded", "true");
          }
        }
      }

    function applyEngagementClubPersonSwimmer(value = "") {
        const swimmer = moduleActions.engagementClubSwimmerFromReferenceValue(value);
        if (value && !swimmer) return;
        const previouslyLinked = Boolean(portalContext.elements.engagementsClubPersonSwimmerId?.value);
        const linked = Boolean(swimmer);
        if (portalContext.elements.engagementsClubPersonSwimmerId) portalContext.elements.engagementsClubPersonSwimmerId.value = swimmer?.swimmerIndexId || swimmer?.id || "";
        if (portalContext.elements.engagementsClubPersonSwimmerSource) portalContext.elements.engagementsClubPersonSwimmerSource.value = swimmer?.source || "";
        if (linked) {
          if (portalContext.elements.engagementsClubPersonSwimmerSearch) {
            portalContext.elements.engagementsClubPersonSwimmerSearch.value = [swimmer.lastName, swimmer.firstName].filter(Boolean).join(" ");
            portalContext.elements.engagementsClubPersonSwimmerSearch.setAttribute("aria-expanded", "false");
          }
          if (portalContext.elements.engagementsClubPersonSwimmerResults) {
            portalContext.elements.engagementsClubPersonSwimmerResults.hidden = true;
            portalContext.elements.engagementsClubPersonSwimmerResults.innerHTML = "";
          }
          if (portalContext.elements.engagementsClubPersonFirstName) portalContext.elements.engagementsClubPersonFirstName.value = swimmer.firstName || "";
          if (portalContext.elements.engagementsClubPersonLastName) portalContext.elements.engagementsClubPersonLastName.value = swimmer.lastName || "";
          if (portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.value = swimmer.birthDate || "";
          if (portalContext.elements.engagementsClubPersonSex) portalContext.elements.engagementsClubPersonSex.value = swimmer.sex || "";
          if (portalContext.elements.engagementsClubPersonLicense) portalContext.elements.engagementsClubPersonLicense.value = swimmer.licenseNumber || "";
        } else if (previouslyLinked) {
          if (portalContext.elements.engagementsClubPersonFirstName) portalContext.elements.engagementsClubPersonFirstName.value = "";
          if (portalContext.elements.engagementsClubPersonLastName) portalContext.elements.engagementsClubPersonLastName.value = "";
          if (portalContext.elements.engagementsClubPersonBirthDate) portalContext.elements.engagementsClubPersonBirthDate.value = "";
          if (portalContext.elements.engagementsClubPersonSex) portalContext.elements.engagementsClubPersonSex.value = "";
          if (portalContext.elements.engagementsClubPersonLicense) portalContext.elements.engagementsClubPersonLicense.value = "";
        }
        [portalContext.elements.engagementsClubPersonFirstName, portalContext.elements.engagementsClubPersonLastName, portalContext.elements.engagementsClubPersonBirthDate, portalContext.elements.engagementsClubPersonSex, portalContext.elements.engagementsClubPersonLicense]
          .forEach((field) => {
            if (!field) return;
            if (field.matches("select")) field.disabled = linked;
            else field.readOnly = linked;
          });
      }

    function engagementClubMemberRoleConflict(person = {}, targetRole = "") {
        const entry = portalState.selectedEngagementClubEntry || {};
        const personId = String(person.id || "");
        const swimmerIndexId = String(person.swimmerIndexId || person.id || "");
        const licenseKey = moduleActions.engagementClubPersonLicenseKey(person.licenseNumber);
        const teamLeader = entry.teamLeader || {};
        const isTeamLeader = teamLeader.mode === "person" && (
          (personId && teamLeader.personId === personId) ||
          (licenseKey && moduleActions.engagementClubPersonLicenseKey(teamLeader.licenseNumber) === licenseKey)
        );
        const isOfficial = (entry.officials || []).some((official) =>
          (personId && official.personId === personId) ||
          (licenseKey && moduleActions.engagementClubPersonLicenseKey(official.licenseNumber) === licenseKey)
        );
        const isSwimmer = (entry.swimmers || []).some((swimmer) =>
          (swimmerIndexId && swimmer.swimmerIndexId === swimmerIndexId) ||
          (licenseKey && moduleActions.engagementClubPersonLicenseKey(swimmer.licenseNumber) === licenseKey)
        );
        if (targetRole === "official") {
          if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être ajoutée comme officiel.";
          if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être ajoutée comme officiel.";
        }
        if (targetRole === "swimmer") {
          if (isTeamLeader) return "Cette personne est déjà chef d'équipe sur cette compétition et ne peut pas être engagée comme nageur.";
          if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être engagée comme nageur.";
        }
        if (targetRole === "teamLeader") {
          if (isOfficial) return "Cette personne est déjà officielle sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
          if (isSwimmer) return "Cette personne est déjà engagée comme nageur sur cette compétition et ne peut pas être choisie comme chef d'équipe.";
        }
        return "";
      }

    function engagementNationalSwimmerKey(swimmer = {}) {
        return `${swimmer.source || "performances"}:${swimmer.id || swimmer.swimmerIndexId || ""}`;
      }

    function engagementNationalSwimmerByKey(key = "") {
        return portalState.engagementNationalSwimmers.find((swimmer) => moduleActions.engagementNationalSwimmerKey(swimmer) === key) || null;
      }

    function engagementNationalSwimmerIdentityKey(swimmer = {}) {
        return String(swimmer.identityKey || [
          moduleActions.normalizedEngagementClubSearch(swimmer.lastName || swimmer.name || ""),
          moduleActions.normalizedEngagementClubSearch(swimmer.firstName || ""),
          swimmer.birthDate || ""
        ].filter(Boolean).join("|")).trim();
      }

    function engagementNationalSwimmerDuplicateAlertLabel(swimmer = {}, swimmers = []) {
        const key = moduleActions.engagementNationalSwimmerKey(swimmer);
        const license = String(swimmer.licenseNumber || "").trim();
        const identity = moduleActions.engagementNationalSwimmerIdentityKey(swimmer);
        const normalizedName = moduleActions.normalizedEngagementClubSearch([swimmer.lastName, swimmer.firstName].filter(Boolean).join(" "));
        const sameLicense = license && swimmers.some((candidate) =>
          moduleActions.engagementNationalSwimmerKey(candidate) !== key &&
          String(candidate.licenseNumber || "").trim() === license
        );
        if (sameLicense) return { score: "high", label: "Même licence" };
        const sameIdentity = identity && swimmers.some((candidate) =>
          moduleActions.engagementNationalSwimmerKey(candidate) !== key &&
          moduleActions.engagementNationalSwimmerIdentityKey(candidate) === identity
        );
        if (sameIdentity) return { score: "high", label: "Même identité" };
        const sameBirthNearName = swimmer.birthDate && normalizedName && swimmers.some((candidate) => {
          if (moduleActions.engagementNationalSwimmerKey(candidate) === key || candidate.birthDate !== swimmer.birthDate) return false;
          const candidateName = moduleActions.normalizedEngagementClubSearch([candidate.lastName, candidate.firstName].filter(Boolean).join(" "));
          return candidateName && (candidateName.includes(normalizedName) || normalizedName.includes(candidateName) ||
            candidateName.split(/\s+/).some((part) => part.length >= 4 && normalizedName.includes(part)));
        });
        if (sameBirthNearName) return { score: "medium", label: "A verifier" };
        return { score: "low", label: "Simple" };
      }

    function selectedEngagementNationalSwimmerMergeKeys() {
        return Array.from(portalContext.elements.engagementsNationalSwimmersList?.querySelectorAll("[data-engagement-national-swimmer-merge-check]:checked") || [])
          .map((item) => item.value)
          .filter(Boolean);
      }

    function selectedEngagementNationalSwimmerKeepKey() {
        return portalContext.elements.engagementsNationalSwimmersList?.querySelector("[data-engagement-national-swimmer-keep]:checked")?.value || "";
      }

    function updateEngagementNationalSwimmerSelectionState() {
        if (portalContext.elements.engagementsNationalSwimmersBulk) portalContext.elements.engagementsNationalSwimmersBulk.hidden = !portalState.engagementNationalSwimmerMergeMode;
        if (portalContext.elements.engagementsNationalSwimmersMergeMode) {
          portalContext.elements.engagementsNationalSwimmersMergeMode.setAttribute("aria-pressed", portalState.engagementNationalSwimmerMergeMode ? "true" : "false");
          portalContext.elements.engagementsNationalSwimmersMergeMode.textContent = portalState.engagementNationalSwimmerMergeMode ? "Quitter le mode doublons" : "Gérer les doublons";
        }
        const keepKey = moduleActions.selectedEngagementNationalSwimmerKeepKey();
        const mergeKeys = moduleActions.selectedEngagementNationalSwimmerMergeKeys().filter((key) => key !== keepKey);
        if (portalContext.elements.engagementsNationalSwimmersBulkMerge) {
          portalContext.elements.engagementsNationalSwimmersBulkMerge.disabled = !keepKey || !mergeKeys.length || portalState.engagementNationalSwimmerMergeLoading;
        }
        if (portalContext.elements.engagementsNationalSwimmersSelectionSummary) {
          const keep = moduleActions.engagementNationalSwimmerByKey(keepKey);
          const keepName = keep ? ([keep.firstName, keep.lastName].filter(Boolean).join(" ") || keep.name || keepKey) : "";
          portalContext.elements.engagementsNationalSwimmersSelectionSummary.textContent = keepKey && mergeKeys.length
            ? `${mergeKeys.length} fiche${mergeKeys.length > 1 ? "s" : ""} à fusionner vers ${keepName}.`
            : "Choisissez une fiche à conserver et au moins une fiche à fusionner.";
        }
      }

    function setEngagementNationalSwimmerMergeMode(enabled) {
        portalState.engagementNationalSwimmerMergeMode = enabled === true;
        if (!portalState.engagementNationalSwimmerMergeMode) {
          portalState.engagementNationalSwimmerMergeSourceId = "";
          portalState.engagementNationalSwimmerMergeTargets = [];
          portalState.engagementNationalSwimmerMergeQuery = "";
        }
        portalActions.renderEngagementNationalSwimmers();
      }
    return { confirmEngagementClubTeamLeaderCandidate, selectEngagementClubTeamRenunciation, saveEngagementClubExternalTeamLeader, handleEngagementClubOfficialSelection, loadEngagementAdminPublicSwimmerSearchShard, searchEngagementAdminPublicSwimmers , selectedEngagementTeamLeaderFromForm, engagementClubIdentityEditDistance, engagementClubIdentityPartSimilar, engagementClubPersonIdentityMatch, engagementClubPersonDisplayName, engagementClubPersonPayloadWithRole, resolveEngagementClubPersonIdentity, engagementAdminPublicSwimmerSearchTokens, engagementAdminPublicSwimmerSearchShard, engagementAdminPublicSwimmerScore, engagementAdminPublicSwimmerItem, mergeEngagementNationalSwimmerResults , applyEngagementClubTeamPerson, restoreEngagementClubTeamLeaderChoice, cancelEngagementClubTeamEdit, openEngagementClubTeamRenunciationDialog, closeEngagementClubTeamRenunciationDialog, closeEngagementClubExternalTeamDialog, openEngagementClubExternalTeamDialog, engagementClubSwimmerFromReferenceValue, renderEngagementClubPersonSwimmerOptions, applyEngagementClubPersonSwimmer, engagementClubMemberRoleConflict, engagementNationalSwimmerKey, engagementNationalSwimmerByKey, engagementNationalSwimmerIdentityKey, engagementNationalSwimmerDuplicateAlertLabel, selectedEngagementNationalSwimmerMergeKeys, selectedEngagementNationalSwimmerKeepKey, updateEngagementNationalSwimmerSelectionState, setEngagementNationalSwimmerMergeMode };
  });
})(window);
