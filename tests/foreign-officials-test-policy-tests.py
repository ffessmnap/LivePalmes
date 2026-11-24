"""Verify the foreign-officials exception is tied to one TEST source contract."""
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
publisher = runpy.run_path(str(ROOT / "tools/publish-test-standard-sources.py"))
closed = publisher["load"]("foreign-officials-test-policy.py")


def manifest():
    contract = closed.contract()
    return {key: contract[key] for key in ("baselineRun", "baselineHosting", "baselineCandidate", "approval")} | {
        "schema": 2, "functions": contract["allowedFunctions"], "candidate": contract["applicationCommit"],
        closed.OPTION: closed.CONTRACT_SHA256,
    }


class ContractTests(unittest.TestCase):
    def test_exact_request_and_refusals(self):
        request = manifest()
        original = publisher["load"]
        with patch.dict(publisher["validate"].__globals__, {"load": lambda name: closed if name == "foreign-officials-test-policy.py" else original(name)}), patch.object(closed, "git", return_value=""):
            self.assertEqual(publisher["validate"](request), request)
        for change in [{"schema": 1}, {closed.OPTION: "0" * 64}, {"functions": request["functions"][1:]},
                       {"functions": sorted(request["functions"] + ["createCompetitionImport"])},
                       {"approval": {}}, {"baselineRun": 1}, {"baselineHosting": "sites/livepalmes/versions/prod"},
                       {"importSbResults": "x"}]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                publisher["validate"](request | change)
        del request[closed.OPTION]
        with self.assertRaises(ValueError):
            publisher["validate"](request)
        self.assertEqual(set(request["functions"]) - publisher["policy"].eligible(),
                         {"exportNapPublicPage", "resolveEngagementSwimmerChangeRequest"})

    def test_changed_application_and_fingerprints(self):
        request = manifest()
        with self.assertRaises(ValueError):
            closed.manifest(request, lambda *args: "portail.html" if args[0] == "diff" else "")
        correct = closed.contract()["fingerprints"]
        with patch.object(closed, "git", return_value=""):
            closed.fingerprints(request, lambda _: correct)
            with self.assertRaises(ValueError):
                closed.fingerprints(request, lambda _: correct | {"saveEngagementClubPerson": "0" * 64})
            with self.assertRaises(ValueError):
                maps = iter([correct | {"other": "0" * 64}, correct | {"other": "1" * 64}])
                closed.fingerprints(request, lambda _: next(maps))


if __name__ == "__main__":
    unittest.main()
