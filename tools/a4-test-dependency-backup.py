"""Verify retained, version-specific TEST source bytes and the source-only inverse."""
import hashlib
import json
import re
import subprocess
import urllib.parse
import urllib.request

BUCKET = "gcf-v2-sources-206080168534-europe-west1"
PREFIX = "projects/livepalmes-test/locations/europe-west1/functions/"
BUCKET_URL = "https://storage.googleapis.com/storage/v1/b/" + BUCKET
MAX_SOURCE = 64 * 1024**2
MASK = "build_config.source,labels"


def require(value, message):
    if not value:
        raise ValueError(message)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError("Redirection de lecture des sources interdite")


def reader():
    token = subprocess.check_output(["gcloud", "auth", "application-default", "print-access-token"],
                                    text=True, stderr=subprocess.DEVNULL).strip()
    opener = urllib.request.build_opener(NoRedirect())
    def read(url, maximum):
        require(url.startswith(BUCKET_URL + "?") or url.startswith(BUCKET_URL + "/o/"), "Cible de source TEST inconnue")
        with opener.open(urllib.request.Request(url, headers={"Authorization": "Bearer " + token}), timeout=90) as response:
            data = response.read(maximum + 1)
            require(len(data) <= maximum, "Lecture TEST trop volumineuse")
            return data, response.headers.get("x-goog-generation")
    return read


def check_versions(read):
    raw, _ = read(BUCKET_URL + "?fields=name,versioning,lifecycle", 16000)
    bucket = json.loads(raw)
    require(bucket.get("name") == BUCKET and bucket.get("versioning", {}).get("enabled") is True,
            "Versionnement du bucket de sources TEST absent")
    for rule in bucket.get("lifecycle", {}).get("rule", []):
        if rule.get("action", {}).get("type") == "Delete":
            condition = rule.get("condition", {})
            require(condition.get("isLive") is False and type(condition.get("numNewerVersions")) is int
                    and condition["numNewerVersions"] >= 2, "Ancienne génération non protégée pour ce lot")


def read_source(name, source, read, archive_identity):
    require(re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*", name) and source.get("bucket") == BUCKET
            and source.get("object") == name + "/function-source.zip"
            and re.fullmatch(r"[1-9][0-9]*", str(source.get("generation", ""))), "Génération de source TEST inconnue")
    url = BUCKET_URL + "/o/" + urllib.parse.quote(source["object"], safe="") + "?" + urllib.parse.urlencode(
        {"generation": source["generation"], "alt": "media"})
    data, generation = read(url, MAX_SOURCE)
    require(generation == str(source["generation"]) and data, "Génération TEST lue différente")
    return {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "contents": archive_identity(data)}


def labels_digest(labels):
    return hashlib.sha256(json.dumps(labels, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def inverse(function, row, candidate, revision, configuration):
    name = function["name"].removeprefix(PREFIX)
    require(function["name"] == PREFIX + name and name == row["name"] and function["state"] == "ACTIVE"
            and revision and revision == function["serviceConfig"]["revision"] and revision != row["revision"]
            and function["updateTime"] != row["updateTime"] and configuration(function) == row["configuration"],
            "Révision ou configuration de retour arrière TEST différente")
    labels = dict(function.get("labels", {}))
    require(labels.get("livepalmes-commit") == candidate and re.fullmatch(r"[0-9a-f]{40}", row["commit"]),
            "Fonction TEST absente du candidat")
    labels["livepalmes-commit"] = row["commit"]
    require(labels_digest(labels) == row["labels"], "Labels de retour arrière TEST différents")
    return {"name": function["name"], "buildConfig": {"source": {"storageSource": row["source"]}}, "labels": labels}, MASK


def check_inventory(rows, names):
    require(len(rows) == len(names) and {r["name"] for r in rows} == {PREFIX + n for n in names},
            "Inventaire de sauvegarde TEST différent")


def capture(functions, names, publisher, read):
    check_inventory(functions, names)
    check_versions(read)
    saved = {}
    for function in functions:
        name = function["name"].removeprefix(PREFIX)
        source = publisher.managed_source(function)
        labels = function["labels"]
        row = {"name": name, "source": source, "revision": function["serviceConfig"]["revision"],
               "updateTime": function["updateTime"], "commit": labels["livepalmes-commit"],
               "labels": labels_digest(labels), "configuration": publisher.configuration_identity(function)}
        require(re.fullmatch(r"[0-9a-f]{40}", row["commit"]), "Origine de sauvegarde TEST inconnue")
        row["archive"] = read_source(name, source, read, publisher.archive_identity)
        saved[name] = row
    return saved


def review(before, after, saved, candidate, publisher, read):
    check_inventory(before, saved)
    check_inventory(after, saved)
    check_versions(read)
    previous = {r["name"]: r for r in before}
    for function in after:
        name = function["name"].removeprefix(PREFIX)
        row = saved[name]
        archive = read_source(name, row["source"], read, publisher.archive_identity)
        require(archive == row["archive"], "Archive de retour arrière TEST altérée : " + name)
        patch, mask = inverse(function, row, candidate, function["serviceConfig"]["revision"], publisher.configuration_identity)
        require(mask == MASK and patch == {"name": function["name"], "labels": previous[function["name"]]["labels"],
                "buildConfig": {"source": {"storageSource": publisher.managed_source(previous[function["name"]])}}},
                "Retour au code et aux labels initiaux non démontré")
    return {"verifiedGenerations": len(saved), "allArchivesReopened": True, "inverseMask": MASK, "restoreWrites": 0}
