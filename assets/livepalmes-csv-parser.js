(function attachLivePalmesCsvParser(global) {
  function firstValue(row, keys = []) {
    return keys.map((key) => row[key]).find((value) => value) || "";
  }

  function parse(text, context = {}) {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return [];

    const separator = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = line.split(separator).map((cell) => cell.trim());
      const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
      const lastName = firstValue(row, ["nom", "lastname"]);
      const firstName = firstValue(row, ["prenom", "pr\u00e9nom", "prÃ©nom", "firstname"]);
      const birthDate = firstValue(row, ["naissance", "birthdate"]);
      return {
        eventId: context.eventId,
        sex: context.sex,
        lane: firstValue(row, ["ligne", "couloir", "lane"]),
        lastName,
        firstName,
        birthDate,
        swimmerId: [lastName, firstName, birthDate, context.sex].join("|").toLowerCase(),
        club: firstValue(row, ["club"]),
        category: firstValue(row, ["categorie", "cat\u00e9gorie", "catÃ©gorie", "category"]),
        seedTime: firstValue(row, ["temps", "time", "seedtime"]),
        note: firstValue(row, ["note"])
      };
    });
  }

  global.LivePalmesCsvParser = { parse };
})(window);
