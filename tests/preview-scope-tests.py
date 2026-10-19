import importlib.util
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("scope", root / "tools/preview-scope.py")
scope = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scope)
for paths, expected in [
    ([], False),
    (["docs/releases/EVOLUTIONS.md", "AGENTS.md"], False),
    (["README.md", "docs/guide avec espaces.md"], False),
    (["docs/releases/EVOLUTIONS.md", "portail.css"], True),
    (["portail.js"], True),
    (["functions/index.js"], True),
    (["firebase.json"], True),
    (["docs/example.js"], True),
    (["unknown-file"], True),
    (["old.html", "docs/new.md"], True),
]:
    assert scope.needs_preview(paths) == expected, paths
print("Preview scope: documentary, mixed, renamed and unknown paths OK")

# The explicitly authorized C0 preflight must never deploy a TEST preview.
c0 = sorted(scope.C0_PREFLIGHT_PATHS) + ['docs/releases/EVOLUTIONS.md']
assert scope.needs_preview(c0) is False
for application in ['index.html', 'functions/index.js', 'functions/nap-competition-documents.js', 'firebase.json', 'assets/new-home.js', 'unknown-file']:
    assert scope.needs_preview(c0 + [application]) is True
assert scope.needs_preview(['tools/preview-scope.py']) is True
print('C0 exact infrastructure scope skips preview; mixed, unknown and unanchored changes retain it')

# The 19 October proof-only PR is authorized without any TEST deployment.
home = sorted(scope.HOME_PREFLIGHT_PATHS) + ['docs/releases/EVOLUTIONS.md']
assert scope.needs_preview(home) is False
for extra in ['index.html', 'firebase.json', 'functions/index.js', 'tools/other-script.js', 'unknown-file']:
    assert scope.needs_preview(home + [extra]) is True
assert scope.needs_preview(['tests/release-home-retained-compatibility.js']) is True
print('Home proof-only scope skips preview; mixed application/configuration/unknown scope retains it')
