"""Closed portal CSP delta for manual TEST Hosting; no PROD or backend change."""
import hashlib
import json
import subprocess
from pathlib import Path

BASELINE = '50acd7ab0860c4d0b716022e3ad7d373c5dac359'
BEFORE = '896854073c2eb582864a8083dc30fe62f2fc3b5f50c5bda4ffd5df67c3e32671'
AFTER = '99e19446b33090c0b797962c0c7c5a30b1ce33ed9915ae128f2771bc9a03b53d'
FUNCTIONS_TREE = '3734faac09c271875755523ede61e27877368bfa'
APPLICATION_PATHS = frozenset([
    'assets/livepalmes-app-config.js', 'assets/livepalmes-app-check.js', 'firebase.json',
    'portail.html', 'pilotage-livepalmes.html', 'medailles.html', 'resultats.html',
    'series-public.html', 'live.html', 'speaker.html', 'ja.html', 'video.html',
    'bureau-perf.html', 'secretariat.html',
])

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()

def validate_sources(before, after, project, hosting_only, automatic_candidate):
    if project != 'livepalmes-test' or hosting_only is not True or automatic_candidate:
        raise ValueError('App Check CSP reserve a Hosting TEST manuel, sans enforcement')
    if digest(before) != BEFORE or digest(after) != AFTER:
        raise ValueError('Configuration hors de la paire CSP portail App Check autorisee')

def validate_scope(functions_tree, application_paths):
    if functions_tree != FUNCTIONS_TREE or set(application_paths) - APPLICATION_PATHS:
        raise ValueError('App Check TEST: backend ou source applicative hors perimetre')

def validate_candidate(root):
    root = Path(root)
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, text=True).strip()
    paths = git('diff', '--name-only', '--no-renames', BASELINE, 'HEAD').splitlines()
    application = [p for p in paths if not p.startswith(('docs/', 'tools/', 'tests/', '.github/'))
                   and p not in {'AGENTS.md', 'AGENTS.MD', 'README.md', 'CHANGELOG.md'}]
    validate_scope(git('rev-parse', 'HEAD:functions'), application)
