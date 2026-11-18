"""Read the exact current TEST rules policy; never deploy or infer a baseline."""
import importlib.util
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def load(filename):
    spec = importlib.util.spec_from_file_location(filename.replace('-','_'), ROOT/'tools'/filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def check(root, output):
    policy = load('test-a34-session-rules.py')
    current = (Path(root)/'firestore.rules').read_text(encoding='utf-8')
    mfa = load('test-admin-mfa-rules.py')
    if mfa.digest(current) == mfa.AFTER:
        return mfa.check(root, output)
    if policy.digest(current) == policy.AFTER:
        return policy.check(root, output)
    return load('test-portal-session-rules.py').check(root, output)


if __name__ == '__main__':
    check(*sys.argv[1:])
