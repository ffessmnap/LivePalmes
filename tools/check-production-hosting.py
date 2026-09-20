"""Check static Hosting responses only, without executing application scripts."""
import hashlib
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
root = Path(sys.argv[1])
base = "https://livepalmes.web.app/"
for path in ["portail.html", "assets/livepalmes-admin-portal.js", "assets/livepalmes-header-view.js", "mentions-legales.html", "confidentialite.html"]:
    with urllib.request.urlopen(base + path + "?release=" + os.environ["GITHUB_RUN_ID"], timeout=30) as response:
        content = response.read()
        if response.status != 200 or hashlib.sha256(content).digest() != hashlib.sha256((root / path).read_bytes()).digest():
            raise ValueError("Version Hosting differente: " + path)
        if path == "portail.html" and ("no-store" not in response.headers.get("Cache-Control", "") or not response.headers.get("Content-Security-Policy")):
            raise ValueError("En-tetes portail absents")
for path in ["performances/public/data/admin-reference.js", "assets/public/livepalmes-public-analytics.js"]:
    try:
        urllib.request.urlopen(base + path, timeout=30)
    except urllib.error.HTTPError as error:
        if error.code != 404:
            raise
    else:
        raise ValueError("Fichier exclu accessible: " + path)
print("Hosting : cinq fichiers conformes au commit, CSP/cache presents, fichier interne et ancien analytics inaccessibles.")
