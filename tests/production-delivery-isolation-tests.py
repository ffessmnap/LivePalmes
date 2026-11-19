"""Offline checks for the publication identity, plan selection and inert data transfer."""
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name, folder="tools"):
    path = ROOT / folder / (name + ".py")
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


identity = module("production-delivery-identity")
selection = module("select-production-candidate")
inputs = module("isolated-publication-inputs")
reader = module("check-release-prerequisites")
fixture = module("a3-production-wif-qualification-tests", "tests")


class DeliveryIsolation(unittest.TestCase):
    def test_ordinary_jobs_use_the_same_exact_external_account(self):
        for name in sorted(identity.WORKFLOWS):
            for kind in ("backend", "hosting"):
                with self.subTest(workflow=name, kind=kind), tempfile.TemporaryDirectory() as tmp:
                    directory=Path(tmp)
                    env,original,record=fixture.original(directory,kind)
                    env.update(RUNNER_TEMP=tmp,GITHUB_ENV=str(directory/"exports"),
                               GITHUB_WORKFLOW_REF="ffessmnap/LivePalmes/.github/workflows/"+name+"@refs/heads/main")
                    copy=identity.install(kind,env)
                    result=json.loads(copy.read_bytes())
                    self.assertEqual(result["type"],"external_account")
                    self.assertEqual(result["service_account_impersonation"],{"token_lifetime_seconds":3600})
                    self.assertEqual(json.loads(original.read_bytes()),record)
                    self.assertNotIn("FIXTURE-TOKEN",(directory/"exports").read_text())
                    with patch.dict(os.environ,env,clear=True):
                        public=reader.publication_identity(result,kind)
                        self.assertEqual(public["credentialType"],"external_account")
                        self.assertEqual(public["client_email"],result["client_email"])
                        self.assertNotIn("credential_source",public)
                        with self.assertRaises(ValueError):
                            reader.publication_identity(result,"backend" if kind=="hosting" else "hosting")

    def test_wrong_workflow_or_account_fails_before_projection(self):
        with tempfile.TemporaryDirectory() as tmp:
            env,_,_=fixture.original(Path(tmp))
            env.update(RUNNER_TEMP=tmp,GITHUB_ENV=str(Path(tmp)/"exports"))
            with self.assertRaises(ValueError):
                identity.install("hosting",env)
            env["GITHUB_WORKFLOW_REF"]="ffessmnap/LivePalmes/.github/workflows/livepalmes-production-release.yml@refs/heads/main"
            with self.assertRaises(ValueError):
                identity.install("backend",env)
            self.assertFalse(Path(env["GITHUB_ENV"]).exists())

    def test_candidate_requires_exact_test_proof_or_runs_checks(self):
        sha="a"*40
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp)
            (directory/"request.json").write_text(json.dumps({"candidate":sha}))
            with patch.object(selection.cycle,"artifact") as artifact, patch.object(selection.cycle,"git"):
                self.assertEqual(selection.select("7","0",directory),(sha,False,False))
                artifact.assert_called_with("7","release-plan",directory,".github/workflows/livepalmes-production-preflight.yml")
                (directory/"test-proof.json").write_text(json.dumps({"candidate":sha,"verification":{
                    "schema":1,"candidate":sha,"suite":"verify-livepalmes","result":"success"}}))
                self.assertEqual(selection.select("7","0",directory),(sha,True,False))
                artifact.return_value={"path":".github/workflows/foreign.yml"}
                with self.assertRaises(ValueError):
                    selection.select("0","14",directory)

    def test_isolated_jobs_have_no_production_rights_and_gate_the_publisher(self):
        parser = """const fs = require('node:fs');
            const yaml = require('./tests/firestore-rules/node_modules/js-yaml');
            const workflow = yaml.load(fs.readFileSync(process.argv[1], 'utf8'));
            process.stdout.write(JSON.stringify(workflow.jobs));"""
        workflow = ".github/workflows/livepalmes-production-release.yml"
        jobs = json.loads(subprocess.check_output(["node", "-e", parser, workflow], cwd=ROOT))
        checks = ["select_candidate", "verify_candidate", "prepare_inputs"]
        for name in checks:
            with self.subTest(job=name):
                job = jobs[name]
                self.assertNotIn("environment", job)
                self.assertEqual(job["runs-on"], "ubuntu-24.04")
                self.assertEqual(set(job["permissions"].values()), {"read"})
                self.assertNotIn("id-token", job["permissions"])
                self.assertNotIn("secrets.", json.dumps(job))
                self.assertNotIn("continue-on-error", job)
                for step in job["steps"]:
                    self.assertNotIn("continue-on-error", step)
                    if step.get("uses", "").startswith("actions/setup-node@"):
                        self.assertIs(step["with"]["package-manager-cache"], False)
                        self.assertNotIn("cache", step["with"])
        fallback = [s for s in jobs["select_candidate"]["steps"] if "publicationFallback" in s.get("run", "")]
        self.assertEqual(len(fallback), 1)
        self.assertEqual(fallback[0]["if"], "steps.tooling-ci.outputs.verified != 'true'")
        self.assertNotIn("publicationFallback", json.dumps(jobs["release"]))
        for action, names in [("readiness", ["prerequisites","discovery"]), ("rollback", ["rollback"])]:
            path = f".github/workflows/livepalmes-production-{action}.yml"
            graph = json.loads(subprocess.check_output(["node", "-e", parser, path], cwd=ROOT))
            gate = graph["verify_controller"]
            self.assertNotIn("environment", gate)
            self.assertEqual(set(gate["permissions"].values()), {"read"})
            self.assertIn('test "$VERIFIED" = true', [s.get("run") for s in gate["steps"]])
            for name in names:
                self.assertEqual(graph[name]["needs"], "verify_controller")
            if action == "rollback":
                steps = graph[action]["steps"]
                def index(fragment):
                    return next(i for i, step in enumerate(steps) if fragment in step.get("run",""))
                self.assertLess(index("validate-rollback"), index(" hosting-rollback "))
                self.assertLess(index("rollback-validate"), index(" hosting-rollback "))
                host = [step for step in steps if step.get("with", {}).get("kind") == "hosting"]
                self.assertEqual(len(host), 1)
                for limit in ["inputs.restore_hosting", "portal_session_enforcement != 'true'", "optional_access != 'true'"]:
                    self.assertIn(limit, host[0]["if"])
        publisher = jobs["release"]
        self.assertEqual(set(publisher["needs"]), set(checks))
        self.assertNotIn("always()", publisher.get("if", ""))
        self.assertEqual(publisher["environment"], "production")
        self.assertEqual(publisher["permissions"]["id-token"], "write")

    def test_artifact_is_bound_to_the_run_and_digest(self):
        candidate = "b" * 40
        head = "c" * 40
        value = {"candidate": candidate, "safe": ["example"], "manifests": {}}
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr(inputs.MEMBER, json.dumps(value))
        content = output.getvalue()
        item = {"id": 17, "name": inputs.ARTIFACT, "expired": False,
                "workflow_run": {"id": 33, "head_sha": head},
                "size_in_bytes": len(content), "digest": "sha256:" + hashlib.sha256(content).hexdigest()}
        env = {"GITHUB_REPOSITORY": "ffessmnap/LivePalmes", "GITHUB_RUN_ID": "33", "GITHUB_SHA": head}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, env, clear=True):
            target = Path(tmp) / "spec.json"
            for changes in [{"expired": True}, {"workflow_run": {"id": 30, "head_sha": head}},
                            {"workflow_run": {"id": 33, "head_sha": candidate}}, {"digest": "sha256:wrong"}]:
                listing = json.dumps({"artifacts": [{**item, **changes}]}).encode()
                with self.subTest(changes=changes), patch.object(
                        inputs.subprocess, "check_output", side_effect=[listing, content]):
                    with self.assertRaises(ValueError):
                        inputs.download(candidate, target)
                self.assertFalse(target.exists())
            listing = json.dumps({"artifacts": [item]}).encode()
            with patch.object(inputs.subprocess, "check_output", side_effect=[listing, content, json.dumps(value["safe"]).encode()]):
                inputs.download(candidate, target)
            self.assertEqual(json.loads(target.read_bytes()), value)

    def test_unavailable_history_blocks_transport_selection(self):
        request = {"candidate": "a" * 40, "optionalAccessObservationRelease": True}
        with patch.object(selection.subprocess, "run") as lookup:
            for code, expected in [(0, True), (1, False)]:
                lookup.return_value.returncode = code
                self.assertEqual(selection.historical(request), expected)
            lookup.return_value.returncode = 128
            with self.assertRaisesRegex(ValueError, "Historique"):
                selection.historical(request)
            lookup.reset_mock()
            self.assertFalse(selection.historical({"candidate": "a" * 40}))
            lookup.assert_not_called()

    def test_locked_sdk_manifest_is_readable_by_the_deployment_cli(self):
        sha = "d" * 40
        sdk = ROOT / "functions/node_modules/firebase-functions"
        cli = ROOT / "tests/firestore-rules/node_modules/firebase-tools/lib/deploy/functions/runtimes/discovery"
        with tempfile.TemporaryDirectory() as tmp:
            stage = Path(tmp)
            functions = stage / "functions"
            functions.mkdir()
            fixture = ("const {onCall} = require(" + json.dumps(str(sdk / "lib/v2/providers/https.js")) + ");"
                       "const fn = onCall({region:'europe-west1'}, () => 'fixture');"
                       "fn.__endpoint.labels = {'livepalmes-commit':" + json.dumps(sha) + "}; exports.example = fn;")
            (functions / "index.js").write_text(fixture)
            (functions / "package.json").write_text('{"name":"offline-fixture","main":"index.js"}')
            manifest_path = stage / "sdk.json"
            env = {**os.environ, "FUNCTIONS_MANIFEST_OUTPUT_PATH": str(manifest_path),
                   "GCLOUD_PROJECT": "demo-offline", "FIREBASE_CONFIG": '{"projectId":"demo-offline"}'}
            subprocess.run(["node", str(sdk / "lib/bin/firebase-functions.js")], cwd=functions,
                           env=env, check=True, capture_output=True, timeout=45)
            manifest = json.loads(manifest_path.read_bytes())
            raw = {"candidate": sha, "safe": ["example"], "manifests": {"true": manifest, "false": manifest}}
            source = stage / "input.json"
            source.write_text(json.dumps(raw))
            (stage/"selector.txt").write_text("functions:example")
            (stage/"firebase.json").write_text('{"functions":{"source":"functions","codebase":"default"}}')
            inputs.apply(stage, source, "false", sha)
            parse = """require(process.argv[1]).detectFromYaml(process.argv[2], 'demo-offline', 'nodejs22')
                .then(build => { if (!build.endpoints.example) process.exitCode = 1; });"""
            subprocess.run(["node", "-e", parse, str(cli), str(functions)], check=True,
                           cwd=stage, capture_output=True, timeout=45)

    def test_only_exact_candidate_metadata_reaches_firebase(self):
        sha="b"*40
        manifest={"specVersion":"v1alpha1","endpoints":{"example":{"entryPoint":"example","region":["europe-west1"],"platform":"gcfv2","labels":{"livepalmes-commit":sha}}}}
        value={"candidate":sha,"safe":["example"],"manifests":{"true":manifest,"false":manifest}}
        with tempfile.TemporaryDirectory() as tmp:
            stage=Path(tmp)
            (stage/"functions").mkdir()
            cfg=stage/"firebase.json"
            cfg.write_text(json.dumps({"functions":{"source":"functions","codebase":"default"}}))
            source=stage/"input.json"
            source.write_text(json.dumps(value))
            (stage/"selector.txt").write_text("functions:other")
            with self.assertRaisesRegex(ValueError, "exports"):
                inputs.apply(stage,source,"false",sha)
            (stage/"selector.txt").write_text("functions:example")
            inputs.apply(stage,source,"false",sha)
            self.assertEqual(json.loads((stage/"functions/functions.yaml").read_bytes()),manifest)
            self.assertIn("functions.yaml",json.loads(cfg.read_bytes())["functions"]["ignore"])
            with self.assertRaises(ValueError):
                inputs.validate(value,"0"*40)
            for changed in ({**value,"safe":["../../foreign"]},{**value,"manifests":{"true":manifest}}):
                with self.assertRaises(ValueError):
                    inputs.validate(changed,sha)
            manifest["extensions"]={"foreign":{}}
            with self.assertRaises(ValueError):
                inputs.validate(value,sha)


if __name__=="__main__":
    unittest.main()
