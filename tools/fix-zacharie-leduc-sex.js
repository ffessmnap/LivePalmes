const { execFileSync } = require("child_process");

const projectId = "livepalmes";
const database = "(default)";
const identityKey = "LEDUC|ZACHARIE|2009-04-07";
const target = {
  swimmerId: "16560",
  originalSwimmerId: "16560",
  sex: "M",
  birthDate: "2009-04-07",
  firstName: "Zacharie",
  lastName: "LEDUC",
  swimmer: "Zacharie LEDUC"
};

const categoryLabels = {
  M: "Minimes Hommes",
  C: "Cadets",
  J: "Juniors Hommes",
  P: "Poussins",
  B: "Benjamins",
  S: "Seniors Hommes"
};

const categorySuffixes = {
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

function readArgs(argv) {
  return {
    write: argv.includes("--write")
  };
}

function accessToken() {
  return execFileSync("cmd.exe", [
    "/c",
    `${process.env.LOCALAPPDATA}\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd`,
    "auth",
    "print-access-token"
  ], { encoding: "utf8" }).trim();
}

function decodeValue(value) {
  if (!value || typeof value !== "object") return value;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields || {});
  return value;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function encodeValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}

function encodeFields(object = {}) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, encodeValue(value)]));
}

function categoryCode(category) {
  return `H${categorySuffixes[category] || category}`;
}

function fixedPatch(row = {}) {
  const category = String(row.category || "").trim();
  return {
    swimmerId: target.swimmerId,
    originalSwimmerId: target.originalSwimmerId,
    swimmerIdentityKey: identityKey,
    swimmer: target.swimmer,
    firstName: target.firstName,
    lastName: target.lastName,
    birthDate: target.birthDate,
    sex: target.sex,
    category,
    categoryCode: categoryCode(category),
    categoryLabel: categoryLabels[category] || row.categoryLabel || category,
    updatedAt: new Date().toISOString(),
    sourceAction: "manualFix.zacharieLeducSex"
  };
}

async function firestoreRequest(path, token, options = {}) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/${encodeURIComponent(database)}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Firestore ${response.status}: ${payload?.error?.message || text}`);
  }
  return payload;
}

async function fetchRows(token) {
  const payload = await firestoreRequest("documents:runQuery", token, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "performances" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "swimmerIdentityKey" },
            op: "EQUAL",
            value: { stringValue: identityKey }
          }
        },
        limit: 1000
      }
    })
  });
  return payload
    .filter((item) => item.document)
    .map((item) => ({
      name: item.document.name,
      id: item.document.name.split("/").pop(),
      data: decodeFields(item.document.fields || {})
    }));
}

async function commitBatch(token, writes) {
  return firestoreRequest("documents:commit", token, {
    method: "POST",
    body: JSON.stringify({ writes })
  });
}

async function main() {
  const args = readArgs(process.argv.slice(2));
  const token = accessToken();
  const rows = await fetchRows(token);
  const activeRows = rows.filter((row) => row.data.active !== false && (row.data.status || "active") === "active");
  const wrongRows = rows.filter((row) =>
    row.data.sex !== target.sex ||
    row.data.swimmerId !== target.swimmerId ||
    row.data.originalSwimmerId !== target.originalSwimmerId ||
    !String(row.data.categoryCode || "").startsWith("H")
  );
  const byCategory = {};
  rows.forEach((row) => {
    const key = `${row.data.sex || "?"}|${row.data.category || "?"}|${row.data.categoryCode || "?"}|${row.data.swimmerId || "?"}|${row.data.originalSwimmerId || "?"}`;
    byCategory[key] = (byCategory[key] || 0) + 1;
  });

  console.log(JSON.stringify({
    ok: true,
    write: args.write,
    identityKey,
    totalRows: rows.length,
    activeRows: activeRows.length,
    rowsToUpdate: wrongRows.length,
    currentSummary: byCategory,
    samplePatch: wrongRows.slice(0, 5).map((row) => ({
      doc: row.id,
      before: {
        id: row.data.id,
        swimmerId: row.data.swimmerId,
        originalSwimmerId: row.data.originalSwimmerId,
        sex: row.data.sex,
        category: row.data.category,
        categoryCode: row.data.categoryCode,
        categoryLabel: row.data.categoryLabel
      },
      after: fixedPatch(row.data)
    }))
  }, null, 2));

  if (!args.write) return;

  for (let index = 0; index < wrongRows.length; index += 400) {
    const batch = wrongRows.slice(index, index + 400);
    await commitBatch(token, batch.map((row) => ({
      update: {
        name: row.name,
        fields: encodeFields({
          ...row.data,
          ...fixedPatch(row.data)
        })
      }
    })));
    console.log(`Firestore corrige : ${Math.min(index + batch.length, wrongRows.length)}/${wrongRows.length}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
