"use strict";

// Log only known categories. Driver messages can contain addresses or SQL values.
function failureCategory(error) {
  if (error instanceof RangeError) return "limit";
  if (error instanceof TypeError) return "invalid-data";
  if (["unavailable", "deadline-exceeded", "permission-denied", "resource-exhausted",
    "failed-precondition", "ETIMEDOUT", "ECONNRESET"].includes(error?.code)) return error.code;
  return "internal";
}

async function run({ queue, now, limit, enqueue, prepare, deliver, report = console.error }) {
  const due = await queue.where("source", "==", "nap").where("runAt", "<=", now)
    .orderBy("runAt").limit(limit).get();
  for (const event of due.docs) {
    const grouped = event.data().deliveryMode === "bcc-v1";
    try {
      if (grouped) await enqueue(event);
      else await prepare(event);
    } catch (error) {
      report("Notification NAP indisponible", { stage: grouped ? "enqueue" : "prepare", cause: failureCategory(error) });
    }
  }
  try {
    await deliver();
  } catch (error) {
    report("Notification NAP indisponible", { stage: "deliver", cause: failureCategory(error) });
    throw new Error("Distribution des notifications NAP indisponible.");
  }
}

module.exports = { run, failureCategory };
