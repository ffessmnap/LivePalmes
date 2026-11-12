"""Pinned CI runtime and read-only GitHub step timings; never a release gate."""
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def validate():
    config = json.loads((ROOT / '.github/ci-runtime.json').read_text(encoding='utf-8'))
    version = config['node']
    if not re.fullmatch(r'22\.\d+\.\d+', version):
        raise ValueError('Version corrective Node 22 exacte requise')
    if (ROOT / '.node-version').read_text().strip() != version:
        raise ValueError('Pin local et CI differents')
    for name in config['workflows']:
        text = (ROOT / '.github/workflows' / name).read_text(encoding='utf-8')
        pins = re.findall(r"(?m)^\s+node-version: ['\"]?([^'\s\"]+)['\"]?\s*$", text)
        if not pins or any(pin != version for pin in pins):
            raise ValueError('Pin Node divergent : ' + name)
        if re.search(r'check-latest: true', text):
            raise ValueError('Mise a jour Node implicite : ' + name)
        for key, expected in [('npm_config_fetch_retries', config['fetchRetries']),
                              ('npm_config_fetch_timeout', config['fetchTimeoutMs'])]:
            if not re.search(key + r": ['\"]?" + str(expected) + r"['\"]?\s*$", text, re.M):
                raise ValueError('Telechargement non borne : ' + name)
    print('Node ' + version + ' : chaine commune coherente, npm ci et caches conserves.')


def seconds(start, end):
    if not start or not end:
        return 0
    return max(0, int((dt.datetime.fromisoformat(end.replace('Z', '+00:00')) -
                       dt.datetime.fromisoformat(start.replace('Z', '+00:00'))).total_seconds()))


def category(step):
    name = step['name'].lower()
    if any(word in name for word in ['setup-node', 'setup-java', 'installer', 'install ', 'cache', 'node.js']):
        return 'installation'
    if any(word in name for word in ['tester', 'verifier', 'verify', 'test ', 'verification']):
        return 'verification'
    return 'autre'


def report(jobs):
    rows = ['### Durees CI observees (secondes)',
            '', '| Job | Installations | Verifications | Autres etapes | Etat |',
            '| --- | ---: | ---: | ---: | --- |']
    for job in jobs:
        totals = {key: 0 for key in ['installation', 'verification', 'autre']}
        for step in job.get('steps', []):
            totals[category(step)] += seconds(step.get('started_at'), step.get('completed_at'))
        name = re.sub(r'[|\r\n]', ' ', job.get('name', 'job'))
        state = job.get('conclusion') or job.get('status', 'inconnu')
        rows.append(f"| {name} | {totals['installation']} | {totals['verification']} | {totals['autre']} | {state} |")
        failures = [s for s in job.get('steps', []) if category(s) == 'installation'
                    and s.get('conclusion') in ['failure', 'timed_out', 'cancelled']]
        if failures:
            rows.append(f"\nEchec/expiration pendant une installation ({name}) : distinct d'un resultat de test.\n")
    rows.append('\nSommes des etapes terminees, jobs paralleles non additionnes en duree de livraison. '
                'Attente de runner et attente humaine hors de ces mesures.\n')
    return '\n'.join(rows)


def timings():
    try:
        repo, run = os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_RUN_ID']
        if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo) or not run.isdecimal():
            raise ValueError('Identite du run invalide')
        request = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/actions/runs/{run}/jobs?per_page=100",
            headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
                     'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.load(response)
        if data.get('total_count', 0) > 100:
            raise ValueError('Inventaire tronque')
        value = report(data['jobs'])
    except Exception:
        value = 'Mesure des etapes CI indisponible ; consulter les horodatages GitHub.\n'
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
            output.write(value)
    print(value)


if __name__ == '__main__':
    {'validate': validate, 'timings': timings}[sys.argv[1]]()
