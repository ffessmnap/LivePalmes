"""Bounded public NAP reads; no authentication, data writes or email calls."""
import json
import os
from pathlib import Path
import urllib.request


QUERIES = ['action=swimmer&id=7322', 'action=calendar-season&year=2027',
           'action=competition&id=5162', 'action=competition-results&id=5162',
           'action=top&course=100SF&sex=M&limit=5']


def check(fetch):
    for query in QUERIES:
        value = fetch('https://europe-west1-livepalmes.cloudfunctions.net/readNapPublicSwimmer?' + query)
        if value.get('source') != 'nap':
            raise ValueError('Lecture runtime PROD non NAP : ' + query.split('&')[0])
    return len(QUERIES)


def main():
    request = json.loads((Path(os.environ['PLAN']) / 'request.json').read_text())
    if not request.get('additionalPublicNapFunctions'):
        return
    def fetch(url):
        with urllib.request.urlopen(url, timeout=45) as response:
            if response.status != 200:
                raise ValueError('Lecture publique NAP indisponible')
            return json.load(response)
    count = check(fetch)
    print(f'Runtime PROD : {count} lectures NAP reussies (nageur, calendrier, competition, resultats et TOP). Aucune ecriture ni envoi.')


if __name__ == '__main__':
    main()
