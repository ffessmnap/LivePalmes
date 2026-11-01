// Existing operation bodies; live services arrive through explicit accessors.
function createImportService_categoryCodeFromCategory(backendContext) {
  function fallbackCategoryFromSource(sourceCategory) {
    const code = (0, backendContext.local$normalizeCategoryCode)(sourceCategory);
    if (code.endsWith("PO")) return "P";
    if (code.endsWith("BE")) return "B";
    if (code.endsWith("MI")) return "M";
    if (code.endsWith("CA")) return "C";
    if (code.endsWith("JU")) return "J";
    if (code.endsWith("SE") || code.endsWith("S1")) return "S";
    if (/^[FH](30|35)\+$/.test(code) || /^[FH][MV][01]$/.test(code) || code === "M30+") return "M30+";
    if (/^[FH](40|45)\+$/.test(code) || /^[FH][MV]2$/.test(code)) return "M40+";
    if (/^[FH](50|55)\+$/.test(code) || /^[FH][MV]3$/.test(code)) return "M50+";
    if (/^[FH](60|65)\+$/.test(code) || /^[FH][MV]4$/.test(code)) return "M60+";
    if (/^[FH](70|75)\+$/.test(code) || /^[FH][MV][5-9]$/.test(code)) return "M70+";
    if (/^[FH]80\+$/.test(code)) return "M80+";
    return "";
  }

  function categoryCodeFromCategory(category, sex) {
    const prefix = sex === "F" ? "F" : "H";
    const suffixes = {
      P: "PO",
      B: "BE",
      M: "MI",
      C: "CA",
      J: "JU",
      S: "SE",
      "M30+": "30+",
      "M40+": "40+",
      "M50+": "50+",
      "M60+": "60+",
      "M70+": "70+",
      "M80+": "80+"
    };
    return `${prefix}${suffixes[category] || category}`;
  }

  return { fallbackCategoryFromSource, categoryCodeFromCategory };
}

module.exports = { createImportService_categoryCodeFromCategory };
