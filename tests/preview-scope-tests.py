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
