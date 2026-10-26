"""Closed scope, active mail and source-only drift regressions, entirely offline."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch, MagicMock
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/"tools"/file);value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
cycle=module("oct26_cycle","release-cycle.py")
request=json.loads((ROOT/".github/releases/20261026-validated.json").read_text(encoding="utf8"))
p=cycle.bcc.for_request(request);c=p.contract()
guard=module("oct26_guard","check-production-bcc.py")
indexes=module("oct26_indexes","production-account-history-indexes.py")

class PublicationTests(unittest.TestCase):
    def test_scopes_and_selection(self):
        self.assertEqual(len(p.approved(request)),31)
        self.assertEqual(len(c["retained"]),82)
        self.assertNotEqual(cycle.bcc.contract()["candidate"],c["candidate"])
        self.assertNotIn("processNapNotificationTask",c["selected"])
        self.assertNotIn("closeDueEngagementCompetitions",c["selected"])
        p.selection(request,c["selected"])
        for names in [c["selected"][:-1],c["selected"]+["processNapNotificationTask"],c["selected"]+[c["selected"][0]]]:
            with self.assertRaises(ValueError):p.selection(request,names)

    def test_request_mutations_refused(self):
        for key,value in [("candidate","0"*40),("productionCommit","0"*40),("testRun",1),("initialAutomaticMailEnabled",False),("additionalBccFunctions",[]),("additionalPublicNapFunctions",["readNapPublicSwimmer"]),("bccMailTransition",{"scope":"all"}),("productionAccountHistoryIndexes",{})]:
            changed=copy.deepcopy(request);changed[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):p.approved(changed)
        for key,value in [("scope","idf"),("revision",8),("documentSha256","0"*64)]:
            changed=copy.deepcopy(request);changed["activeMailPreservation"][key]=value
            with self.assertRaises(ValueError):p.approved(changed)

    def test_hash_inventory_and_source_only(self):
        functions={n:{"state":"ACTIVE"} for n in c["selected"]+c["retained"]}
        self.assertEqual(p.verify_fingerprints(c["beforeHashes"],c["afterHashes"],functions)["newFunctions"],[])
        changed=copy.deepcopy(c["afterHashes"]);changed[c["selected"][0]]="0"*64
        with self.assertRaises(ValueError):p.verify_fingerprints(c["beforeHashes"],changed,functions)
        functions.pop(c["retained"][0])
        with self.assertRaises(ValueError):p.verify_fingerprints(c["beforeHashes"],c["afterHashes"],functions)
        old={"name":"projects/livepalmes/locations/europe-west1/functions/"+c["selected"][0],"labels":{"old":"kept"},"serviceConfig":{"timeoutSeconds":300}}
        result=p.source_patch(old,{"bucket":"fixture"},c["candidate"])
        self.assertEqual(set(result),{"name","buildConfig","labels"});self.assertEqual(result["labels"]["old"],"kept")
        old["name"]="projects/livepalmes/locations/europe-west1/functions/processNapNotificationTask"
        with self.assertRaises(ValueError):p.source_patch(old,{},c["candidate"])

    def test_active_guard_has_no_cloud_writer_and_rejects_drift(self):
        document={"fields":{"enabled":{"booleanValue":True},"scope":{"stringValue":"all"},"revision":{"integerValue":"7"}}}
        current=copy.deepcopy(c);current["mailSha256"]=guard.digest(document)
        fake=SimpleNamespace(contract=lambda:current)
        selected=[{"name":indexes.PREFIX+"/"+str(i),"state":"READY",**d} for i,d in enumerate(indexes.DEFINITIONS)]
        response=MagicMock();response.__enter__.return_value.read.return_value=json.dumps({"indexes":selected}).encode()
        def get(url,token):
            return document if url==guard.MAIL_URL else {}
        with tempfile.TemporaryDirectory() as directory,patch.object(guard,"get",side_effect=get),patch.object(guard,"scheduler_digest",return_value=c["schedulerSha256"]),patch.object(guard,"check_queue",return_value=c["queueSha256"]),patch.object(guard.urllib.request,"urlopen",return_value=response) as network:
            current["workerIamSha256"]=guard.digest({})
            guard.check_active_oct26("paused",Path(directory),fake,"offline")
            guard.check_active_oct26("after",Path(directory),fake,"offline")
            self.assertTrue(all(call.args[0].get_method()=="GET" for call in network.call_args_list))
            document["fields"]["revision"]={"integerValue":"8"}
            with self.assertRaises(ValueError):guard.check_active_oct26("after",Path(directory),fake,"offline")
            document["fields"]["revision"]={"integerValue":"7"};selected[0]["state"]="CREATING"
            response.__enter__.return_value.read.return_value=json.dumps({"indexes":selected}).encode()
            with self.assertRaises(ValueError):guard.check_active_oct26("paused",Path(directory),fake,"offline")

    def test_existing_worker_not_created_or_allowed_to_drift(self):
        publisher=module("oct26_publish","publish-approved-bcc-functions.py")
        names=c["selected"];before={n:{"name":n,"state":"ACTIVE","revision":"before"} for n in names+c["retained"]}
        state=SimpleNamespace(PREFIX="",identity=lambda x:x)
        self.assertEqual(publisher.pending(names,before,copy.deepcopy(before),{},c["candidate"],state,p,{}),names)
        current=copy.deepcopy(before);current[c["worker"]]["revision"]="changed"
        with self.assertRaises(ValueError):publisher.pending(names,before,current,{},c["candidate"],state,p,{})

if __name__=="__main__":unittest.main()
