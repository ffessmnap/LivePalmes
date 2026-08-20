(async function () {
  "use strict";
  const api = window.LivePalmesPublicCalendar;
  const nodes = { season: document.querySelector("#calendarSeason"), region: document.querySelector("#calendarRegion"), level: document.querySelector("#calendarLevel"), type: document.querySelector("#calendarType"), count: document.querySelector("#calendarCount"), updated: document.querySelector("#calendarUpdated"), historyLink: document.querySelector("#calendarHistoryLink"), list: document.querySelector("#calendarList") };
  let events = [];
  const currentSeasonEndYear = api.seasonEndYear();
  let selectedSeasonEndYear = currentSeasonEndYear;
  function dateShort(event) { const date = new Date(`${event.date}T12:00:00`); return `<span>${date.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" })}</span>`; }
  function regionFilterValue(event) { return String(event.regionLabel || event.regionId || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, " ").trim().toLocaleLowerCase("fr"); }
  function regionFilterLabel(event) { return regionFilterValue(event) === "ile de france" ? "Île-de-France" : String(event.regionLabel || event.regionId || "").trim(); }
  function isImportedHistoricalEvent(event) { return String(event.id || "").startsWith("legacy-nap-"); }
  function displayStatus(event) { const status = api.status(event); return isImportedHistoricalEvent(event) && status === "awaitingResults" ? "" : status; }
  function chronologicalCompare(left, right) { return String(left.date || "").localeCompare(String(right.date || "")) || String(left.name || "").localeCompare(String(right.name || ""), "fr"); }
  function isCurrentOrUpcoming(event) { const state = displayStatus(event); return ["ongoing","upcoming"].includes(state) || (state === "canceled" && (event.endDate || event.date) >= api.today()); }
  function filteredEvents() { return events.filter((event) => !nodes.region.value || regionFilterValue(event) === nodes.region.value).filter((event) => !nodes.level.value || event.level === nodes.level.value).filter((event) => !nodes.type.value || event.eventType === nodes.type.value); }
  function eventHtml(event) { const state=displayStatus(event); return `<a class="calendar-event" href="competition.html?id=${encodeURIComponent(event.id)}"><time class="calendar-event-date" datetime="${api.escapeHtml(event.date)}">${dateShort(event)}</time><div class="calendar-event-main"><strong>${api.escapeHtml(event.name)}</strong><small><span class="calendar-event-type">${api.escapeHtml(api.TYPE_LABELS[event.eventType])}</span> · ${api.escapeHtml(event.city)}</small></div><div class="calendar-event-scope">${api.escapeHtml(api.LEVEL_LABELS[event.level])}${event.regionLabel ? `<br><small>${api.escapeHtml(event.regionLabel)}</small>` : ""}</div>${state ? `<span class="calendar-status" data-status="${state}">${api.escapeHtml(api.STATUS_LABELS[state])}</span>` : ""}</a>`; }
  function groupedEventsHtml(items, headingLevel = 2) { const groups = new Map(); items.forEach((event) => { const label = new Date(`${event.date}T12:00:00`).toLocaleDateString("fr-FR", { month:"long", year:"numeric" }); if (!groups.has(label)) groups.set(label, []); groups.get(label).push(event); }); return Array.from(groups, ([label, group]) => `<section><h${headingLevel} class="calendar-month">${api.escapeHtml(label)}</h${headingLevel}><div class="calendar-list">${group.map(eventHtml).join("")}</div></section>`).join(""); }
  function render() {
    const chosen = filteredEvents();
    if (!chosen.length) { nodes.historyLink.hidden = true; nodes.count.textContent = "0 événement"; nodes.list.innerHTML = '<div class="calendar-empty">Aucun événement ne correspond à ces filtres.</div>'; return; }
    if (selectedSeasonEndYear !== currentSeasonEndYear) {
      nodes.historyLink.hidden = true;
      const sorted = chosen.sort(chronologicalCompare);
      nodes.count.textContent = `${sorted.length} événement${sorted.length > 1 ? "s" : ""}`;
      nodes.list.innerHTML = groupedEventsHtml(sorted);
      return;
    }
    const current = chosen.filter(isCurrentOrUpcoming).sort(api.compare);
    const past = chosen.filter((event) => !isCurrentOrUpcoming(event)).sort(chronologicalCompare);
    nodes.historyLink.hidden = !past.length;
    nodes.count.textContent = `${current.length} en cours ou à venir · ${past.length} passé${past.length > 1 ? "s" : ""}`;
    const currentHtml = `<section class="calendar-current-section"><h2 class="calendar-section-title">En cours et à venir</h2>${current.length ? groupedEventsHtml(current, 3) : '<div class="calendar-empty calendar-empty-compact">Aucun événement à venir avec ces filtres.</div>'}</section>`;
    const pastHtml = past.length ? `<section id="calendarSeasonHistory" class="calendar-past-section"><div class="calendar-past-heading"><h2 class="calendar-section-title">Depuis le début de la saison</h2><span class="calendar-past-count">${past.length}</span></div><div class="calendar-past-content">${groupedEventsHtml(past, 3)}</div></section>` : "";
    nodes.list.innerHTML = currentHtml + pastHtml;
  }
  async function load(endYear) { nodes.list.innerHTML='<div class="calendar-empty">Chargement du calendrier…</div>'; try { const data=await api.json(`seasons/${endYear}.json`); events=Array.isArray(data.events)?data.events:[]; const regions=[...new Map(events.filter(e=>e.regionId).map(e=>[regionFilterValue(e),regionFilterLabel(e)])).entries()].sort((a,b)=>a[1].localeCompare(b[1],"fr")); nodes.region.innerHTML='<option value="">Toutes</option>'+regions.map(([id,label])=>`<option value="${api.escapeHtml(id)}">${api.escapeHtml(label)}</option>`).join(""); nodes.updated.textContent=data.updatedAt?`Mis à jour le ${new Date(data.updatedAt).toLocaleDateString("fr-FR")}`:""; render(); } catch(error){ events=[]; nodes.count.textContent="Calendrier indisponible"; nodes.list.innerHTML=`<div class="calendar-error">${api.escapeHtml(error.message)}</div>`; } }
  [nodes.region,nodes.level,nodes.type].forEach(node=>node.addEventListener("change",render));
  try { const manifest=await api.json("manifest.json"); const seasons=Array.isArray(manifest.seasons)?manifest.seasons:[]; nodes.season.innerHTML=seasons.map(s=>`<option value="${s.endYear}" ${Number(s.endYear)===currentSeasonEndYear?"selected":""}>${api.seasonLabel(s.endYear)}</option>`).join(""); const selected=Number(nodes.season.value)||seasons[0]?.endYear||currentSeasonEndYear; selectedSeasonEndYear=Number(selected); nodes.season.addEventListener("change",()=>{ selectedSeasonEndYear=Number(nodes.season.value)||currentSeasonEndYear; load(selectedSeasonEndYear); }); await load(selected); } catch(error){ nodes.season.innerHTML=`<option>${api.seasonLabel(currentSeasonEndYear)}</option>`; const empty=!/impossible/i.test(error.message); nodes.count.textContent=empty?"Aucun événement publié":"Calendrier indisponible"; nodes.list.innerHTML=`<div class="${empty?"calendar-empty":"calendar-error"}">${empty?"Le calendrier de cette saison sera bientôt disponible.":api.escapeHtml(error.message)}</div>`; }
})();
