"""Apply the qualified A4 dependency profile to the original publication policy."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / ".github/releases/evidence"
PROFILE = "20261119-a4-publication-dependencies.json"
RECEIPT = "20261119-a4-publication-qualified.json"
RECEIPT_SHA = "19d93735bb83f20036d82656aefc2b233eb1d57482ae4ed788c9873a1264ce9d"
PROFILE_SHA = "01f762c1f7dd21511f2626e2bfe24f41e886aaeb7b378e10d9cc46cd3cf73167"
LOCKS = {"functions/package-lock.json", "tests/firestore-rules/package-lock.json"}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def verified(base, base_sha, root=ROOT):
    require(digest(EVIDENCE / PROFILE) == PROFILE_SHA and digest(EVIDENCE / RECEIPT) == RECEIPT_SHA,
            "Preuves de qualification A4 différentes")
    profile = json.loads((EVIDENCE / PROFILE).read_bytes())
    evidence = json.loads((EVIDENCE / RECEIPT).read_bytes())
    require(profile["publicationPlanSha256"] == base_sha and evidence["profileSha256"] == PROFILE_SHA
            and evidence["branch"] == "main" and evidence["conclusion"] == "success" and evidence["attempt"] == 1
            and evidence["event"] == "workflow_dispatch" and evidence["workflow"] == ".github/workflows/a3-production-wif-qualification.yml"
            and set(evidence["artifacts"]) == set(base["accounts"]) == {"hosting", "backend"}, "Origine des reçus A4 invalide")
    for path, expected in profile["files"].items():
        require(digest(root / path) == expected, "Dépendance active non qualifiée : " + path)
    for kind, item in evidence["artifacts"].items():
        r = item["report"]
        require(r["kind"] == kind and r["account"] == base["accounts"][kind] and r["run"] == evidence["run"]
                and r["candidate"] == evidence["controller"] and r["contractSha256"] == base_sha
                and r["dependencyAnchor"] == profile["anchor"] and r["dependencyContractSha256"] == PROFILE_SHA
                and r["dependencyFiles"] == profile["files"] and all(r[k] == v for k, v in profile["profile"].items())
                and r["renewedAfterRealExpiry"] is True and r["sdkCredentialsRenewed"] == 2
                and r["cliReads"] == r["technicalSdkReads"] == r["gcloudReads"] == 2
                and r["requestedTokenLifetimeSeconds"] == 600 and 610000 <= r["waitedMilliseconds"] <= 750000
                and all(r[k] == 0 for k in ("accountsRead", "iamWrites", "configurationWrites", "businessInvocations", "publicationInvocations"))
                and r["publicationIdentityChanged"] is False and r["tokensExported"] is False,
                "Qualification incomplète pour " + kind)
    return {**base, **profile["profile"], "readerPins": {**base["readerPins"], **{p: profile["files"][p] for p in LOCKS}},
            "effectiveContractSha256": RECEIPT_SHA, "dependencyQualificationRun": evidence["run"]}
