"""Materialize only the existing, locked parser needed to verify A1 provenance."""
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
PARSER='tests/firestore-rules/node_modules/acorn/dist/acorn.js'


def parser_bytes(archive,integrity,expected):
    if len(archive)>1024**2 or integrity != 'sha512-'+base64.b64encode(hashlib.sha512(archive).digest()).decode():
        raise ValueError('Archive du parseur differente du verrouillage')
    with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as package:
        members=package.getmembers()
        if len(members)>30 or sum(m.size for m in members)>2*1024**2:
            raise ValueError('Archive du parseur hors limite')
        entries=[m for m in members if m.name=='package/dist/acorn.js']
        if len(entries)!=1 or not entries[0].isfile():raise ValueError('Source du parseur absente ou redirigee')
        data=package.extractfile(entries[0]).read()
    if hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Octets du parseur differents de la preuve scellee')
    return data


def prepare(automatic=False):
    spec=importlib.util.spec_from_file_location('parser_automatic',ROOT/'tools/automatic-test-publication.py')
    auto=importlib.util.module_from_spec(spec);spec.loader.exec_module(auto)
    if automatic:
        paths=subprocess.check_output(['git','diff','--name-only','--no-renames','HEAD^','HEAD'],cwd=ROOT,text=True).splitlines()
        if auto.metadata_only(paths):return 'Documentation/outillage : aucun parseur a preparer'
    history=auto.cycle.history_provenance
    raw=(ROOT/history.CATALOGUE).read_bytes().replace(b'\r\n',b'\n')
    if hashlib.sha256(raw).hexdigest()!=history.CATALOGUE_SHA256:raise ValueError('Catalogue de provenance altere')
    catalogue=json.loads(raw)
    if all(history.exists(ROOT,old) for old in catalogue['baselines']):return 'Origines Git presentes : preparation du parseur non requise'
    expected=catalogue['engines'][PARSER]
    target=ROOT/PARSER
    if target.exists():
        if hashlib.sha256(target.read_bytes()).hexdigest()!=expected:raise ValueError('Parseur existant different : refus')
        return 'Parseur existant conforme a la preuve scellee'
    package=json.loads((ROOT/'tests/firestore-rules/package-lock.json').read_text())['packages']['node_modules/acorn']
    url='https://registry.npmjs.org/acorn/-/acorn-8.15.0.tgz'
    if package['version']!='8.15.0' or package['resolved']!=url:raise ValueError('Version ou registre du parseur inattendu')
    # No package scripts or downloaded JavaScript are executed.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):raise ValueError('Redirection du registre refusee')
    with urllib.request.build_opener(NoRedirect()).open(url,timeout=30) as response:
        archive=response.read(1024**2+1)
    data=parser_bytes(archive,package['integrity'],expected)
    if not target.parent.resolve().is_relative_to(ROOT.resolve()):raise ValueError('Destination du parseur hors depot')
    target.parent.mkdir(parents=True,exist_ok=True)
    with target.open('xb') as output:output.write(data)
    return 'Parseur verrouille prepare ; integrite npm et empreinte de provenance verifiees'


if __name__=='__main__':
    if sys.argv[1:] not in ([],['--automatic']):raise SystemExit('Mode de preparation inconnu')
    print(prepare(bool(sys.argv[1:])))
