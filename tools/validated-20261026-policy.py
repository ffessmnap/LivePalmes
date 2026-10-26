"""Independent closed 31-source scope; active mail services stay untouched."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("validated_base",ROOT/"tools/bcc-publication-policy.py")
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
require=base.require
assert_config=base.assert_config
assert_worker=base.assert_worker
DIGEST="587cef9c2f9141ba424a246fc0d886878cfb436c33adcb77192cfdc53aaae922"

def contract():
    raw=(ROOT/".github/releases/evidence/20261026-validated-contract.json").read_bytes().replace(b"\r\n",b"\n")
    require(hashlib.sha256(raw).hexdigest()==DIGEST,"Contrat26octobre modifie")
    return json.loads(raw)

def approved(value):
    c=contract()
    require(all(value.get(k)==c[k] for k in ["candidate","productionCommit","productionHosting","testRun"])
        and value.get("additionalBccFunctions")==c["selected"] and value.get("initialAutomaticMailEnabled") is True,
        "Lot26octobre hors paire ou selection")
    require(value.get("activeMailPreservation")=={"scope":"all","revision":7,"documentSha256":c["mailSha256"],"approval":"Oui, préparer cette adaptation limitée"},"Conservation mails actifs hors contrat")
    require(not any(value.get(k) for k in ["additionalPdfFunctions","additionalDtnFunctions","additionalNotificationFunctions","additionalPublicNapFunctions","additionalAccessRequestFunctions","additionalClubDirectoryFunctions","additionalGroupedFunctions","bccMailTransition","bccInfrastructure","notificationMaintenancePlan","notificationPilotIdfApproval","testEquivalentCandidate","productionStaticCleanup","productionHomeRouting","nativeIdentityNapSecretApproval","groupedAllMailPreservation","groupedIdfPreservation","publicReaderIdfPreservation","clubDirectoryIdfPreservation"]),"Extension incompatible avec lot26octobre")
    index_spec=importlib.util.spec_from_file_location("validated_indexes",ROOT/"tools/production-account-history-indexes.py")
    indexes=importlib.util.module_from_spec(index_spec);index_spec.loader.exec_module(indexes);indexes.check_plan(value)
    return c["selected"]

def selection(value, selected):
    require(sorted(selected)==approved(value) and len(selected)==len(set(selected)),"Selection26octobre differente")

def verify_fingerprints(before,after,functions):
    c=contract()
    require(before==c["beforeHashes"] and after==c["afterHashes"] and len(functions)==113 and all(f.get("state")=="ACTIVE" for f in functions.values()),"Empreintes ou inventaire26octobre differents")
    require(set(functions)==set(c["selected"])|set(c["retained"]),"Inventaire nominatif26octobre different")
    return {"pair":[c["productionCommit"],c["candidate"]],"selected":c["selected"],"existingSelected":31,"retainedCount":82,"newFunctions":[],"sourceOnly":True,"configurationChangesToExistingFunctions":False,"mailActiveUnchanged":True,"networkCalls":0}

def source_patch(before,source,sha):
    c=contract();require(sha==c["candidate"] and before["name"].split("/")[-1] in c["selected"],"Source hors contrat26octobre")
    return {"name":before["name"],"buildConfig":{"source":{"storageSource":source}},"labels":{**before.get("labels",{}),"livepalmes-commit":sha}}
