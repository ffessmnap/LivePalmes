"""Skip preview deployments only for an entirely documentary PR diff."""
import re
import subprocess
import sys
from pathlib import PurePosixPath


C0_PREFLIGHT_PATHS = {
    '.github/releases/20261013-c0-document-compatibility.json',
    '.github/workflows/livepalmes-production-preflight.yml',
    '.github/workflows/livepalmes-production-release.yml',
    'tests/release-excluded-backend-compatibility-tests.js',
    'tests/release-c0-document-compatibility.js',
    'tests/release-c0-compatibility-tests.js',
    'tests/preview-scope-tests.py',
    'tests/release-cycle-tests.py',
    'tools/preview-scope.py',
    'tools/verify-livepalmes.js',
}


HOME_PREFLIGHT_PATHS = {
    '.github/releases/20261019-public-home-corrections.json',
    '.github/workflows/livepalmes-production-preflight.yml',
    '.github/workflows/livepalmes-production-release.yml',
    'tests/release-excluded-backend-compatibility-tests.js',
    'tests/release-home-retained-compatibility.js',
    'tests/release-home-compatibility-tests.js',
    'tests/preview-scope-tests.py',
    'tools/preview-scope.py',
    'tools/verify-livepalmes.js',
}


COURSE_PREFLIGHT_PATHS = {
    '.github/releases/20261019-course-selection.json',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}

IDF_PREFLIGHT_PATHS = {
    '.github/releases/20261020-idf-pilot.json',
    'tools/release-cycle.py',
    'tests/production-notification-release-tests.py',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}

GROUPED_MAILS_PREFLIGHT_PATHS = {
    '.github/releases/20261020-grouped-competition-mails.json',
    'tools/release-cycle.py',
    'tools/check-production-mail-disabled.py',
    'tests/production-notification-release-tests.py',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}


DTN_CALENDAR_PREFLIGHT_PATHS = {
    '.github/releases/20261020-dtn-calendar-reactivity.json',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}


SWIMMER_DIALOG_PREFLIGHT_PATHS = {
    '.github/releases/20261020-nap-swimmer-dialog.json',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}


def needs_preview(paths):
    def documentary(path):
        p = PurePosixPath(path)
        return (
            path in {"AGENTS.md", "README.md", "CHANGELOG.md"}
            or (path.startswith("docs/") and p.suffix.lower() in {".md", ".txt", ".rst"})
        )
    if '.github/releases/20261013-c0-document-compatibility.json' in paths and all(
            documentary(p) or p in C0_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261019-public-home-corrections.json' in paths and all(
            documentary(p) or p in HOME_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261019-course-selection.json' in paths and all(
            documentary(p) or p in COURSE_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261020-idf-pilot.json' in paths and all(
            documentary(p) or p in IDF_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261020-grouped-competition-mails.json' in paths and all(
            documentary(p) or p in GROUPED_MAILS_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261020-dtn-calendar-reactivity.json' in paths and all(
            documentary(p) or p in DTN_CALENDAR_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261020-nap-swimmer-dialog.json' in paths and all(
            documentary(p) or p in SWIMMER_DIALOG_PREFLIGHT_PATHS for p in paths):
        return False
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
