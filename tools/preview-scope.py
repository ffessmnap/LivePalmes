"""Skip preview deployments only for an entirely documentary PR diff."""
import re
import subprocess
import sys
from pathlib import PurePosixPath


def needs_preview(paths):
    def documentary(path):
        p = PurePosixPath(path)
        return (
            path in {"AGENTS.md", "README.md", "CHANGELOG.md"}
            or (path.startswith("docs/") and p.suffix.lower() in {".md", ".txt", ".rst"})
        )
    return any(not documentary(p) for p in paths)


if __name__ == "__main__":
    base, head = sys.argv[1:]
    if not all(re.fullmatch(r"[0-9a-f]{40}", sha) for sha in (base, head)):
        raise ValueError("Expected exact commit SHAs")
    # Include both sides of renames, deletions and all commits of the PR.
    paths = subprocess.check_output([
        "git", "diff", "--name-only", "--no-renames", "-z", f"{base}...{head}"
    ]).decode().split("\0")
    print("preview=" + str(needs_preview([p for p in paths if p])).lower())
