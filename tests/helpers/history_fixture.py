"""Offline historical rule bytes, checked against the sealed test input catalogue."""
from pathlib import Path
from functools import lru_cache
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
CHECK_OUTPUT = subprocess.check_output


def owner():
    return Path(sys.argv[0]).resolve().relative_to(ROOT).as_posix()


def node_fixture(script, *args):
    prefix = 'require("./tests/helpers/history-git-fixture").install('+json.dumps(owner())+');\n'
    return CHECK_OUTPUT(['node','-e',prefix+script,*args],cwd=ROOT).decode('utf-8')


def fixture_git(*args):
    return CHECK_OUTPUT(['node',str(ROOT/'tests/helpers/history-git-fixture.js'),'git',*args],cwd=ROOT).decode('utf-8').strip()


@lru_cache(maxsize=100)
def source_fingerprints(commit, algorithm='test'):
    names={'test':'release-test-function-fingerprints','legacy':'release-function-fingerprints',
           'production':'release-production-function-fingerprints'}
    script='console.log(JSON.stringify(require("./tools/'+names[algorithm]+'").fromGit(process.cwd(),process.argv[1]).functions));'
    return json.loads(node_fixture(script,commit))


def historical_output(command, **options):
    """Explicit unittest dependency: real policy code, fixture-only source reads."""
    if command[:2] == ['git','show'] and command[2].endswith(':firestore.rules'):
        value=rule_source(command[2].split(':',1)[0])
    elif command[0] == 'node' and Path(command[1]).name in {'verify-direct-production-scope.js','verify-november-retained-scope.js'}:
        name=Path(command[1]).name[:-3]
        value=node_fixture('console.log(JSON.stringify(require("./tools/'+name+'").verify(...process.argv.slice(1))));',*command[2:])
    else:
        return CHECK_OUTPUT(command,**options)
    return value if options.get('text') or options.get('encoding') else value.encode('utf-8')


def rule_source(commit):
    return source_file(commit,'firestore.rules')


def source_file(commit,path):
    return CHECK_OUTPUT(['node', str(ROOT/'tests/helpers/history-git-fixture.js'),
                          'read', commit, path], cwd=ROOT).decode('utf-8')
