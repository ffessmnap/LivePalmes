"""Assemble a frozen release dossier from authentic publications and human source records."""
from functools import lru_cache
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('draft_cycle', ROOT/'tools/release-cycle.py')
cycle = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cycle)
REPOSITORY = 'ffessmnap/LivePalmes'
PREFLIGHT = '.github/workflows/livepalmes-production-preflight.yml'
READINESS = '.github/workflows/livepalmes-production-readiness.yml'


def unique(items):
    value = {}
    for key, item in items:
        cycle.require(key not in value, 'Cle JSON dupliquee')
        value[key] = item
    return value


def bounded_json(raw):
    cycle.require(len(raw.encode('utf-8')) <= 65536, 'Entree du dossier trop volumineuse')
    return json.loads(raw, object_pairs_hook=unique)


@lru_cache(maxsize=128)
def changed_after(validated, candidate):
    if validated == candidate:
        return frozenset()
    # Compare committed objects once per validation, rather than one Git process per file.
    return frozenset(cycle.git('diff','--name-only','--no-renames','--no-ext-diff','--no-textconv',
                               validated,candidate).splitlines())


def changes_from_records(records, paths, production, candidate):
    cycle.require(isinstance(records, list) and len(records) <= 100, 'Liste de validations bornee requise')
    changes, covered = [], set()
    for row in records:
        required = {'title','commits','status','validation'}
        cycle.require(isinstance(row, dict) and required <= set(row)
                      and set(row) <= required|{'source','validatedCandidate'}, 'Champs de validation inconnus/manquants')
        cycle.require(isinstance(row['title'], str) and row['title'].strip(), 'Titre manquant')
        cycle.require(row['status'] == 'validated' and isinstance(row['validation'], str)
                      and row['validation'].strip(), 'Validation utilisateur absente : '+row['title'])
        cycle.require(isinstance(row['commits'], list) and 1 <= len(row['commits']) <= 50
                      and len(row['commits']) == len(set(row['commits'])), 'Commits de validation requis')
        validated = row.get('validatedCandidate', row['commits'][-1])
        cycle.require(cycle.SHA.fullmatch(str(validated)), 'Version de validation exacte requise')
        if 'source' in row:
            cycle.standard_sources.approval(row['source'])
            cycle.require(row['source']['text'] in row['validation'], 'Citation differente de la source humaine')
        affected = set()
        for commit in row['commits']:
            cycle.require(cycle.SHA.fullmatch(str(commit)) and commit != production, 'SHA devolution complet requis')
            subprocess.run(['git','merge-base','--is-ancestor',production,commit], cwd=ROOT, check=True)
            subprocess.run(['git','merge-base','--is-ancestor',commit,validated], cwd=ROOT, check=True)
            affected.update(cycle.git('diff','--name-only','--no-renames',commit+'^1',commit).splitlines())
        subprocess.run(['git','merge-base','--is-ancestor',validated,candidate], cwd=ROOT, check=True)
        # A previous approval cannot cover a later modification of the same file.
        selected = sorted(affected.intersection(paths)-changed_after(validated,candidate))
        if selected:
            change = {'title':row['title'],'paths':selected,'status':'validated','validation':row['validation']}
            if 'source' in row:
                change['validationSource'] = row['source']
            changes.append(change)
            covered.update(selected)
    return changes, sorted(set(paths)-covered)


def backend_selection(state, candidate):
    desired = cycle.production_selection_fingerprints(candidate)
    conservative = cycle.backend_fingerprints(candidate)
    selected, rows = [], []
    functions = state.get('functions', [])
    cycle.require(0 < len(functions) <= 500 and len({f['name'] for f in functions}) == len(functions),
                  'Inventaire PROD authentifie incomplet')
    for f in functions:
        name, commit = f['name'].split('/')[-1], f.get('commit', '')
        cycle.require(f.get('state') == 'ACTIVE' and f.get('revision') and cycle.SHA.fullmatch(str(commit)),
                      'Origine PROD inconnue : '+name)
        before, old = cycle.production_selection_fingerprints(commit), cycle.backend_fingerprints(commit)
        cycle.require(name in desired and name in before and name in old and name in conservative,
                      'Dependance backend inconnue : '+name)
        cycle.require((before[name] != desired[name]) == (old[name] != conservative[name]),
                      'Comparateurs incompatibles : '+name)
        if before[name] != desired[name]:
            selected.append(name)
        rows.append({'name':name,'commit':commit,'revision':f['revision'],'before':old[name],
                     'after':conservative[name],'reason':'Empreintes conservees depuis cette origine authentifiee'})
    return sorted(selected), rows


def controls_from_artifact(root, run):
    target = root/'production-controls'
    cycle.artifact(run,'production-idf-preservation',target,'.github/workflows/livepalmes-production-release.yml')
    pairs = []
    for before in sorted(target.glob('*-controls-before.json')):
        after = before.with_name(before.name.replace('-before.json','-after.json'))
        if not after.is_file():
            continue
        value = cycle.read(before)
        if (isinstance(value, dict) and set(value) == cycle.standard_sources.CONTROL_KEYS
                and cycle.read(after) == value):
            pairs.append(value)
    cycle.require(len(pairs) == 1, 'Temoins mails/automates authentifies absents ou ambigus')
    return pairs[0]


def standard_request(request, authorization, state, baseline, paths, test, root):
    cycle.require(isinstance(authorization, dict) and set(authorization) == {'candidate','functions','approval'}
                  and authorization['candidate'] == request['candidate'], 'Accord sources/labels ferme au candidat requis')
    names = authorization['functions']
    cycle.standard_sources.approval(authorization['approval'])
    selected, rows = backend_selection(state, request['candidate'])
    cycle.require(names == selected, 'Selection calculee differente du perimetre explicitement autorise')
    controls = controls_from_artifact(root,baseline['productionRun'])
    request['standardSources'] = {'schema':1,'productionRun':baseline['productionRun'],'functions':selected,
                                  'approval':authorization['approval'],'controls':controls}
    request['excludedBackendReview'] = 'Comparaison complete des origines authentifiees ; aucun changement conserve divergent.'
    # The existing validator requires precisely the retained divergent set, not all retained rows.
    retained = [r for r in rows if r['name'] not in selected and r['before'] != r['after']]
    cycle.require(not retained, 'Consommateur exclu divergent ; parcours specifique requis')
    request['excludedBackendEvidence'] = {'schema':1,'candidate':request['candidate'],
        'productionRun':baseline['productionRun'],'suite':'retained-calendar-consumers-v1','functions':[]}
    manifest = cycle.standard_sources.freeze(request,baseline,
        {f['name'].split('/')[-1]:f for f in state['functions']},selected,
        cycle.production_selection_fingerprints,cycle.backend_fingerprints,cycle.git,paths)
    test_names = {f['name'].split('/')[-1]:f for f in test['state']['functions']}
    cycle.require(all(not cycle.needs_function(test_names.get(n),n,request['candidate'],project='livepalmes-test')
                      for n in selected), 'Source TEST absente ou incompatible avec le candidat')
    cycle.write(root/'standard-source-manifest.json',manifest)
    return selected


def compatible_controllers(info, files):
    sha = info.get('head_sha', '')
    cycle.require(cycle.SHA.fullmatch(sha), 'Version du controleur absente')
    for file in files:
        cycle.require(cycle.git('rev-parse',sha+':'+file) == cycle.git('rev-parse','HEAD:'+file),
                      'Controleur de preuve modifie : '+file)


def reuse_checks(root, request, state, selected, runs):
    cycle.require(isinstance(runs, dict) and set(runs) <= {'preflightRun','prerequisitesRun'}
                  and all(type(n) is int and n > 0 for n in runs.values()), 'References de preuves invalides')
    checks = [{'check':'preflight','mode':'required','reason':'Aucun plan compatible authentifie fourni'},
              {'check':'prerequisites','mode':'required','reason':'Preconditions a verifier par le workflow officiel'},
              {'check':'fresh-drift','mode':'required','reason':'Etat distant toujours relu avant toute ecriture'},
              {'check':'encrypted-backup','mode':'required','reason':'Sauvegarde de la reference reelle, ouverte et comparee avant publication'},
              {'check':'production-approval','mode':'required','reason':'Aucun accord PROD deduit du dossier ou de la CI'}]
    if 'preflightRun' not in runs:
        return checks
    try:
        target = root/'reused-preflight'
        info = cycle.artifact(runs['preflightRun'],'release-plan',target,PREFLIGHT)
        compatible_controllers(info,['tools',PREFLIGHT])
        cycle.require(cycle.read(target/'request.json') == request
                      and cycle.read(target/'prod-before.json') == state
                      and cycle.read(target/'selection.json') == selected
                      and cycle.reusable_verification(cycle.read(target/'test-proof.json'),request['candidate']),
                      'Plan, candidat, TEST, selection ou reference PROD differents')
        checks[0] = {'check':'preflight','mode':'reused','run':runs['preflightRun'],
                     'reason':'Plan exact authentifie, memes controleurs et reference PROD'}
    except (ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:
        checks[0]['reason'] = 'Preflight a executer : '+str(error)
        return checks
    if 'prerequisitesRun' not in runs:
        return checks
    try:
        for kind in ['hosting','backend']:
            target = root/('reused-prerequisites-'+kind)
            info = cycle.artifact(runs['prerequisitesRun'],'production-prerequisites-'+kind,target,READINESS)
            compatible_controllers(info,['tools',READINESS])
            proof = cycle.read(target/('prerequisites-'+kind+'.json'))
            cycle.require(proof.get('schema') == 1 and proof.get('candidate') == request['candidate']
                          and proof.get('planRun') == runs['preflightRun'] and proof.get('kind') == kind
                          and proof.get('ready') is True and proof.get('readOnly') is True
                          and proof.get('missingPermissions') == [], 'Prerequis incomplets ou non compatibles')
        checks[1] = {'check':'prerequisites','mode':'reused','run':runs['prerequisitesRun'],
                     'reason':'Deux preuves authentifiees du meme plan ; controle frais maintenu avant publication'}
    except (ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:
        checks[1]['reason'] = 'Prerequis a executer : '+str(error)
    return checks


def build(directory, test_run, records, authorization=None, reuse=None):
    root = Path(directory); root.mkdir(parents=True,exist_ok=True)
    cycle.require(type(test_run) is int and test_run > 0, 'Run TEST explicite requis pour figer la version')
    info = cycle.artifact(test_run,'test-proof',root/'test','.github/workflows/livepalmes-test-common.yml')
    test = cycle.read(root/'test/test-proof.json')
    candidate = test.get('candidate','')
    cycle.require(candidate == info.get('head_sha') and cycle.reusable_verification(test,candidate),
                  'Preuve applicative TEST exacte requise')
    subprocess.run(['git','merge-base','--is-ancestor',candidate,'HEAD'],cwd=ROOT,check=True)
    state = cycle.production_evidence(root/'production')
    baseline = cycle.read(root/'production/baseline.json')
    production = baseline['productionCommit']
    subprocess.run(['git','merge-base','--is-ancestor',production,candidate],cwd=ROOT,check=True)
    paths = cycle.git('diff','--name-only','--no-renames',production,candidate).splitlines()
    cycle.require(len(paths) <= 10000 and len(paths) == len(set(paths)), 'Diff complet hors limite ou duplique')
    isolated = cycle.isolated_test_rules(paths,production,candidate)
    application, backend = cycle.classify([p for p in paths if p not in isolated])
    changes, missing = changes_from_records(records,application,production,candidate)
    value = {'schema':1,'candidate':candidate,'productionCommit':production,
             'productionHosting':state['hosting']['version'],'testRun':test_run,'changes':changes,
             'excludedBackendReview':'','freezeTestCandidate':True}
    blockers = ['Validation manquante ou modifiee ensuite : '+p for p in missing]
    if not changes:
        blockers.append('Aucune evolution validee incluse')
    for change in changes:
        if 'validationSource' not in change:
            blockers.append('Reference du message humain manquante : '+change['title'])
    selected = []
    if authorization is not None:
        try:
            selected = standard_request(value,authorization,state,baseline,paths,test,root)
        except (ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:
            blockers.append('Sources standard bloquees : '+str(error))
    elif backend:
        blockers.append('Accord cible et revue sources/labels a joindre pour le backend partage')
    if not blockers:
        try:
            cycle.validate_request(value,paths)
        except (ValueError,KeyError,TypeError,subprocess.CalledProcessError) as error:
            blockers.append('Preflight non preparable : '+str(error))
    covered = {p for c in changes for p in c['paths']}
    ledger = [{'path':p,'kind':'application' if p in application else 'test-isolation' if p in isolated else 'tooling-or-docs',
               'humanValidationCovered':p in covered} for p in paths]
    decisions = [{'check':'TEST','mode':'reused','run':test_run,'reason':'Publication main authentifiee du candidat exact ; aucun nouveau TEST'},
                 {'check':'application-tests','mode':'reused','reason':'Attestation applicative exacte contenue dans la preuve TEST authentifiee'},
                 {'check':'publication-tests','mode':'required','reason':'Le preflight existant authentifie la CI main compatible et la reutilise ; sinon seule cette suite est executee'},
                 {'check':'backend-selection','mode':'calculated' if authorization is not None else 'required' if backend else 'not-needed',
                  'functions':selected,'reason':'Aucune reduction manuelle ; divergence ou origine inconnue bloquante'}]
    if not blockers:
        decisions += reuse_checks(root,value,state,selected,reuse or {})
    else:
        decisions.append({'check':'preflight','mode':'blocked','reason':'Completer les validations ou preuves listees'})
    cycle.write(root/'request-draft.json',value)
    cycle.write(root/'full-diff.json',{'productionCommit':production,'candidate':candidate,'files':ledger})
    cycle.write(root/'proof-decisions.json',{'schema':1,'candidate':candidate,'checks':decisions})
    cycle.write(root/'draft-status.json',{'readyForPreflight':not blockers,'blockers':blockers,
                'candidate':candidate,'testRun':test_run,'productionApproval':False,'deploymentPerformed':False})
    summary = '# Bilan proposé — accord PROD toujours requis\n\n'
    summary += '\n'.join('- '+c['title'].replace('\n',' ') for c in changes)+'\n\n'
    summary += '\n'.join('- '+b for b in blockers) if blockers else 'Dossier prêt pour le circuit officiel ; publication non déclenchée.'
    summary += '\n\nPreuve TEST : https://github.com/'+REPOSITORY+'/actions/runs/'+str(test_run)+'\n'
    summary += '\nContrôles :\n'+''.join('- '+c['check']+' : '+c['mode']+' — '+c['reason']+'\n' for c in decisions)
    (root/'SUMMARY.md').write_text(summary+'\n',encoding='utf-8')
    return blockers


if __name__ == '__main__':
    records = bounded_json(os.environ.get('VALIDATIONS_JSON',''))
    authorization = bounded_json(os.environ['SOURCES_AUTHORIZATION_JSON']) if os.environ.get('SOURCES_AUTHORIZATION_JSON') else None
    reuse = bounded_json(os.environ.get('REUSE_EVIDENCE_JSON') or '{}')
    build(sys.argv[1],int(os.environ['TEST_RUN']),records,authorization,reuse)
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as stream:
        stream.write((Path(sys.argv[1])/'SUMMARY.md').read_text(encoding='utf-8'))
