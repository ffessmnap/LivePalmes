"""Select a trusted policy; standard eligibility and historical contracts stay unchanged."""
import importlib.util
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent


@lru_cache(maxsize=4)
def load(filename):
    spec = importlib.util.spec_from_file_location('source_'+filename.replace('-', '_'), ROOT/filename)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def for_request(value):
    if 'optionalAccessObservationRelease' in value:
        policy = load('optional-access-production-policy.py')
        policy.approved(value)
        return policy
    if 'portalSessionEnforcementRelease' in value:
        policy = load('portal-session-enforcement-production-policy.py')
        policy.approved(value)
        return policy
    if 'portalSessionPrepareRelease' in value:
        policy = load('portal-session-prepare-production-policy.py')
        policy.approved(value)
        return policy
    if 'accessRevocationRelease' in value:
        policy = load('access-revocation-production-policy.py')
        policy.approved(value)
        return policy
    if 'publicAccessRelease' in value:
        policy = load('public-access-production-policy.py')
        policy.approved(value)
        return policy
    if 'publicPrivacyRelease' in value:
        policy = load('public-privacy-production-policy.py')
        policy.approved(value)
        return policy
    if 'organizerFeesRelease' in value:
        policy = load('organizer-fees-production-policy.py')
        policy.approved(value)
        return policy
    if 'officialReviewRelease' in value:
        policy = load('official-review-production-policy.py')
        policy.approved(value)
        return policy
    return load('standard-source-policy.py')
