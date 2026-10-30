"""Three technical GETs only; preserve active mail, scheduler and queue."""
import importlib.util
import json
from pathlib import Path


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(file))
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def guard(directory, after=False):
    directory = Path(directory)
    policy = load('portal_ns_guard_policy', 'portal-access-ns-release-policy.py')
    policy.require(policy.approved(json.loads((directory/'request.json').read_text())), 'Garde portail hors accord')
    observed = load('portal_ns_controls', 'nap-retained-sources.py').controls('livepalmes', policy.contract())
    before = directory/'portal-access-ns-before.json'
    if before.exists():
        policy.require(json.loads(before.read_text()) == observed, 'Derive mails/scheduler/file portail')
    else:
        policy.require(not after, 'Temoin initial portail absent')
        before.write_text(json.dumps(observed))
    if after:
        (directory/'portal-access-ns-after.json').write_text(json.dumps(observed))
