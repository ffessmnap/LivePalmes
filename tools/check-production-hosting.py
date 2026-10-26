"""Bounded static reads; never executes scripts or republishes Hosting."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

FILES = ['portail.html', 'assets/livepalmes-admin-portal.js', 'assets/livepalmes-header-view.js',
         'mentions-legales.html', 'confidentialite.html']
EXCLUDED = ['performances/public/data/admin-reference.js', 'assets/public/livepalmes-public-analytics.js']
DELAYS = (0, 5, 15)


def fetch(url):
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            return response.status, response.read(), response.headers
    except urllib.error.HTTPError as error:
        return error.code, b'', {}


def check(root, release, read=fetch, sleep=time.sleep, receipt=None):
    base = 'https://livepalmes.web.app/'
    observations = []
    try:
        for path in FILES:
            expected = hashlib.sha256((Path(root) / path).read_bytes()).hexdigest()
            for attempt, delay in enumerate(DELAYS, 1):
                if delay:
                    sleep(delay)
                try:
                    status, content, headers = read(base + path + '?release=' + str(release))
                except (urllib.error.URLError, TimeoutError):
                    status, content, headers = 0, b'', {}
                actual = hashlib.sha256(content).hexdigest()
                observations.append({'path': path, 'attempt': attempt, 'status': status,
                                     'expectedSha256': expected, 'actualSha256': actual})
                if status == 200 and actual == expected:
                    if path == 'portail.html' and ('no-store' not in headers.get('Cache-Control', '')
                            or not headers.get('Content-Security-Policy')):
                        raise ValueError('En-tetes portail absents')
                    break
            else:
                raise ValueError('Version Hosting differente apres trois lectures : ' + path)
        for path in EXCLUDED:
            status, _, _ = read(base + path)
            observations.append({'path': path, 'status': status})
            if status != 404:
                raise ValueError('Fichier exclu accessible ou controle impossible : ' + path)
    finally:
        if receipt is not None:
            Path(receipt).write_text(json.dumps(observations, indent=2), encoding='utf-8')
    print('Hosting : cinq fichiers conformes au commit, CSP/cache presents, exclusions inaccessibles.')
    return observations


if __name__ == '__main__':
    check(sys.argv[1], os.environ['GITHUB_RUN_ID'], receipt=os.environ.get('HOSTING_CHECK_RECEIPT'))
