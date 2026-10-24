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


SHARED_HEADER_PREFLIGHT_PATHS = {
    '.github/releases/20261021-shared-header-background.json',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}


PUBLIC_READER_IDF_PREFLIGHT_PATHS = {
    '.github/releases/20261022-mobile-navigation-idf.json',
    '.github/workflows/livepalmes-production-release.yml',
    'tools/release-cycle.py',
    'tools/check-production-mail-disabled.py',
    'tests/production-notification-release-tests.py',
    'tools/preview-scope.py',
    'tests/preview-scope-tests.py',
}


CLUB_DIRECTORY_PREFLIGHT_PATHS = {
    '.github/releases/20261022-club-directory-idf.json',
    'tools/release-cycle.py', 'tools/check-production-mail-disabled.py',
    'tools/preflight-production-release.py', 'tools/production-release-state.py',
    'tools/publish-approved-pdf-functions.py',
    'tests/production-notification-release-tests.py', 'tests/production-pdf-functions-tests.py',
    'tools/preview-scope.py', 'tests/preview-scope-tests.py',
}


LOGIN_MESSAGE_PREFLIGHT_PATHS = {
    '.github/releases/20261022-login-message.json',
    'tools/preview-scope.py', 'tests/preview-scope-tests.py',
}


GROUPED_DEPENDENCY_PATHS = {
    '.github/releases/evidence/20261024-grouped-test-approval.json',
    '.github/releases/evidence/20261024-grouped-backend-contract.json',
    '.github/releases/20261024-grouped-test.json',
    '.github/workflows/livepalmes-verification-preview.yml',
    '.github/workflows/livepalmes-production-preflight.yml',
    '.github/workflows/livepalmes-production-release.yml',
    'tools/release-function-fingerprints.js', 'tests/release-function-fingerprints-tests.js',
    'tools/grouped-publication-policy.py', 'tools/publish-approved-grouped-functions.py',
    'tools/release-cycle.py', 'tools/check-production-mail-disabled.py',
    'tools/preflight-production-release.py', 'tools/production-release-state.py',
    'tools/publish-approved-pdf-functions.py',
    'tests/production-grouped-release-tests.py',
    'tests/release-excluded-backend-compatibility-tests.js',
    'tests/release-grouped-retained-compatibility.js', 'tests/release-home-retained-compatibility.js',
    'tests/nap-national-documents-callable-tests.js',
    'tools/preview-scope.py', 'tests/preview-scope-tests.py',
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
    if '.github/releases/20261021-shared-header-background.json' in paths and all(
            documentary(p) or p in SHARED_HEADER_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261022-mobile-navigation-idf.json' in paths and all(
            documentary(p) or p in PUBLIC_READER_IDF_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261022-club-directory-idf.json' in paths and all(
            documentary(p) or p in CLUB_DIRECTORY_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/20261022-login-message.json' in paths and all(
            documentary(p) or p in LOGIN_MESSAGE_PREFLIGHT_PATHS for p in paths):
        return False
    if '.github/releases/evidence/20261024-grouped-test-approval.json' in paths and all(
            documentary(p) or p in GROUPED_DEPENDENCY_PATHS for p in paths):
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
