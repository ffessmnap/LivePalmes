"""Offline historical rule bytes, checked against the sealed test input catalogue."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]


def rule_source(commit):
    return subprocess.check_output(['node', str(ROOT/'tests/helpers/history-git-fixture.js'),
                                    'read', commit, 'firestore.rules'], cwd=ROOT).decode('utf-8')
