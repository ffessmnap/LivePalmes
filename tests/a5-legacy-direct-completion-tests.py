import copy,importlib.util,json,os,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch,Mock
ROOT=Path(__file__).resolve().parents[1]
def load(name):
 s=importlib.util.spec_from_file_location(name,ROOT/"tools"/name);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=load("a5-legacy-direct-production-completion.py");parent=m.parent
class Completion(unittest.TestCase):
 def test_five_receipts_and_all_119_identities_are_required(self):
  value=parent.expected_manifest();selected={parent.PREFIX+n for n in value["selected"]};rows=[{k:r[k] for k in ["name","revision","updateTime","state"]} for r in value["origins"]];receipts={}
  for r in rows:
   if r["name"] in selected:
    r["revision"]+="-new";r["updateTime"]="2026-11-19T15:31:00Z";receipts[r["name"]]=dict(identity=copy.deepcopy(r),storageSource=dict(bucket="gcf-v2-sources-718081132564-europe-west1",object=r["name"].split("/")[-1]+"/function-source.zip",generation="1"),archiveSha256="a"*64,allPathsAndFileBytesIdentical=True,generationReadAndReferencesRechecked=True)
  after=dict(candidate=value["candidate"],errors=[],a5RetirementContractSha256=parent.DIGEST,functions=rows);proof=dict(candidate=value["candidate"],manifestSha256=parent.digest(value),functions=receipts)
  self.assertEqual(len(m.verify_sources(after,proof,value)),119)
  for kind in ["missing","receipt","retained","generation","unverified","errors"]:
   changed=copy.deepcopy(after);r=copy.deepcopy(proof);name=next(iter(r["functions"]))
   if kind=="missing":changed["functions"].pop()
   if kind=="receipt":r["functions"].pop(name)
   if kind=="retained":next(x for x in changed["functions"] if x["name"] not in selected)["revision"]+="-bad"
   if kind=="generation":r["functions"][name]["storageSource"]["generation"]="invalid"
   if kind=="unverified":r["functions"][name]["allPathsAndFileBytesIdentical"]=False
   if kind=="errors":changed["errors"]=["drift"]
   with self.subTest(kind=kind),self.assertRaises(ValueError):m.verify_sources(changed,r,value)
 def test_only_sealed_failed_run_and_untouched_hosting_are_eligible(self):
  c=m.contract();info=dict(id=c["sourceRun"],head_sha=c["sourceHead"],event="workflow_dispatch",run_attempt=1,head_branch="main",path=m.WF,status="completed",conclusion="failure")
  artifacts=[dict(name=n,id=a["id"],digest=a["digest"],expired=False) for n,a in c["artifacts"].items()];selected=parent.contract()["selected"]
  m.verify_run(c,m.SOURCE_RUN,info,artifacts,list(reversed(selected)),False)
  for kind in ["run","head","success","attempt","artifact","expired","hosting","duplicate"]:
   i=copy.deepcopy(info);a=copy.deepcopy(artifacts);s=list(selected);resume=m.SOURCE_RUN;hosting=False
   if kind=="run":resume="1"
   if kind=="head":i["head_sha"]="a"*40
   if kind=="success":i["conclusion"]="success"
   if kind=="attempt":i["run_attempt"]=2
   if kind=="artifact":a[0]["digest"]="sha256:"+"a"*64
   if kind=="expired":a[0]["expired"]=True
   if kind=="hosting":hosting=True
   if kind=="duplicate":s.append(s[0])
   with self.subTest(kind=kind),self.assertRaises(ValueError):m.verify_run(c,resume,i,a,s,hosting)
 def test_all_five_archives_are_rechecked_and_one_mismatch_blocks(self):
  receipts={parent.PREFIX+n:{"sealed":n} for n in parent.contract()["selected"]}
  functions=[{"name":n,"labels":{"livepalmes-commit":m.contract()["candidate"]}} for n in receipts]
  for changed in [False,True]:
   def attest(function,expected,state):return {"drift":True} if changed else receipts[function["name"]]
   api=Mock(side_effect=attest);archive=Mock(return_value=b"candidate archive")
   modules={"publish-approved-pdf-functions.py":SimpleNamespace(archive=archive),"standard-source-publish.py":SimpleNamespace(attest=api)}
   original=m.load
   with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,CANDIDATE_DIRECTORY=d),patch.object(m,"load",side_effect=lambda name:modules[name] if name in modules else original(name)):
    root=Path(d);(root/"standard-source-receipts.json").write_text(json.dumps({"functions":receipts}));state=SimpleNamespace(inventory=lambda:functions)
    if changed:
     with self.assertRaisesRegex(ValueError,"A5_COMPLETION_FRESH_ARCHIVE"):m.verify_archives(root,state)
    else:m.verify_archives(root,state);self.assertEqual(api.call_count,5)
 def test_administrative_dispatcher_routes_a5_before_and_after(self):
  dispatcher=load("check-production-mail-disabled.py");value=parent.contract();request={**value["request"],parent.OPTION:{"contractSha256":parent.DIGEST}}
  for args,after in [([],False),(["--after"],True)]:
   guard=Mock();policy=SimpleNamespace(guard=guard);router=SimpleNamespace(for_request=Mock(return_value=policy));spec=SimpleNamespace(loader=SimpleNamespace(exec_module=lambda module:None))
   with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,PLAN=d),patch.object(dispatcher.sys,"argv",["check",*args]),patch.object(dispatcher.importlib.util,"spec_from_file_location",return_value=spec),patch.object(dispatcher.importlib.util,"module_from_spec",return_value=router):
    root=Path(d);(root/"request.json").write_text(json.dumps(request));dispatcher.main();router.for_request.assert_called_once_with(request);guard.assert_called_once_with(root,after)
 def test_marker_cannot_be_missing_or_from_another_attempt(self):
  with tempfile.TemporaryDirectory() as d,patch.dict(os.environ,RESUME=m.SOURCE_RUN):
   with self.assertRaises(ValueError):m.require_marker(d)
   p=Path(d)/"a5-rules-hosting-only.json";p.write_text(json.dumps(m.marker()));m.require_marker(d)
   p.write_text(json.dumps({**m.marker(),"sourceRun":1}))
   with self.assertRaises(ValueError):m.require_marker(d)
 def test_post_transport_selection_accepts_order_but_rejects_missing_or_duplicate(self):
  publisher=load("publish-approved-pdf-functions.py");value=parent.contract();request={**value["request"],parent.OPTION:{"contractSha256":parent.DIGEST}}
  for kind in ["native","duplicate","missing"]:
   selected=list(reversed(value["selected"]));guard=Mock()
   if kind=="duplicate":selected.append(selected[0])
   if kind=="missing":selected.pop()
   parent.approved(request)
   policy=SimpleNamespace(enabled=lambda r:True,approved=Mock(return_value=True),manifest=lambda root:{"selected":value["selected"]},guard=guard)
   cycle=SimpleNamespace(source_policy=lambda r:policy,read=lambda path:selected,require=parent.require)
   spec=SimpleNamespace(loader=SimpleNamespace(exec_module=lambda module:None))
   with tempfile.TemporaryDirectory() as d,patch.object(publisher.importlib.util,"spec_from_file_location",return_value=spec),patch.object(publisher.importlib.util,"module_from_spec",return_value=cycle):
    root=Path(d);(root/"request.json").write_text(json.dumps(request))
    if kind=="native":publisher.main(root,root,root);guard.assert_called_once_with(root)
    else:
     with self.assertRaises(ValueError):publisher.main(root,root,root)
     guard.assert_not_called()
if __name__=="__main__":unittest.main()
