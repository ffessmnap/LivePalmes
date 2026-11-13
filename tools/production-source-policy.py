"""Select a trusted policy; standard eligibility and historical contracts stay unchanged."""
import importlib.util
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent


@lru_cache(maxsize=2)
def load(filename):
    spec = importlib.util.spec_from_file_location('source_'+filename.replace('-', '_'), ROOT/filename)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def for_request(value):
    if 'officialReviewRelease' in value:
        policy = load('official-review-production-policy.py')
        policy.approved(value)
        return policy
    return load('standard-source-policy.py')
