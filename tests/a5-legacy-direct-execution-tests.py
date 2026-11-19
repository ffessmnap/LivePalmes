import copy,importlib.util,json,os,sys,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
def load(path):
 s=importlib.util.spec_from_file_location(path,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
blocked=load("tools/a5-legacy-direct-no-write-attempt.py");policy=load("tools/a5-legacy-direct-production-policy.py")
class Execution(unittest.TestCase):
 @unittest.skipUnless(sys.platform.startswith("linux"),"Le script de publication utilise Bash sur Linux")
 def test_a5_uses_physical_ignored_dependencies_and_keeps_dirty_tree_refusal(self):
  fixture=load("tests/organizer-fees-production-tests.py")
  self.request={**policy.contract()["request"],policy.OPTION:{"contractSha256":policy.DIGEST}}
  fixture.OrganizerFeesProductionTests.test_runner_stages_dependencies_and_rejects_dirty_candidate(self)
 def test_no_write_state_requires_all_119_identities_and_exact_scope(self):
  record=blocked.contract();c=policy.contract();manifest=policy.expected_manifest()
  plan=dict(request={**c["request"],policy.OPTION:{"contractSha256":policy.DIGEST}},baseline={"productionRun":record["productionRun"],"productionCommit":c["productionCommit"],"source":"verified-publication-artifacts"},before={"functions":c["origins"]},selection=list(reversed(c["selected"])))
  after=dict(candidate=c["candidate"],a5RetirementContractSha256=policy.DIGEST,errors=["Nouvelle revision et horodatage non confirmes"],functions=[{k:f[k] for k in ["name","revision","updateTime","state"]} for f in c["origins"]])
  self.assertEqual(len(blocked.verify_states(record,plan,after,manifest,policy)),119)
  for kind in ["revision","missing","error","selection","baseline"]:
   changed=copy.deepcopy(after);inputs=copy.deepcopy(plan)
   if kind=="revision":changed["functions"][0]["revision"]+="-new"
   if kind=="missing":changed["functions"].pop()
   if kind=="error":changed["errors"]=[]
   if kind=="selection":inputs["selection"].pop()
   if kind=="baseline":inputs["baseline"]["productionRun"]=1
   with self.subTest(kind=kind),self.assertRaises(ValueError):blocked.verify_states(record,inputs,changed,manifest,policy)
 def test_log_controls_are_captured_unchanged_on_both_cli_versions(self):
  raw=b"\x1b[31mValueError: Candidat modifie\x1b[0m";record={"jobId":123,"jobLogSha256":blocked.sha(raw)}
  for help_text in [b"api --help",b"api --help --allow-escape-sequences"]:
   with patch.object(blocked.subprocess,"check_output",side_effect=[help_text,raw]) as call:
    self.assertEqual(blocked.job_log(record),raw)
    self.assertEqual("--allow-escape-sequences" in call.call_args.args[0],b"--allow-escape-sequences" in help_text)
  with patch.object(blocked.subprocess,"check_output",side_effect=[b"api --help",raw+b"changed"]),self.assertRaisesRegex(ValueError,"A5_NO_WRITE_LOG"):blocked.job_log(record)
 def test_a_later_attempt_is_not_silently_skipped(self):
  c=policy.contract();request={**c["request"],policy.OPTION:{"contractSha256":policy.DIGEST}}
  with tempfile.TemporaryDirectory() as d:
   folder=Path(d);(folder/"request.json").write_text(json.dumps(request));api=SimpleNamespace(read=lambda path:json.loads(Path(path).read_text()),gh=lambda path:{"workflow_runs":[{"id":1}]})
   with self.assertRaisesRegex(ValueError,"A5_NO_WRITE_NEW_ATTEMPT_REQUIRES_REVIEW"):blocked.review(folder,api)
if __name__=="__main__":unittest.main()
