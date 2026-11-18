"""Two public CLI site reads across a real short-token expiry; never publication."""
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import time

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wif_hosting_consumer',ROOT/'tools/a3-wif-hosting-readonly.py')
consumer=importlib.util.module_from_spec(spec)
spec.loader.exec_module(consumer)
need=consumer.need

def context(env):
    return consumer.context(env, qualification='hosting-renewal')

def run_probe(command, env, directory):
    process=subprocess.Popen(command,cwd=directory,env=env,stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    deadline=time.monotonic()+900
    try:
        while True:
            remaining=deadline-time.monotonic()
            need(remaining>0)
            try:
                result=process.wait(timeout=min(30,remaining))
                if result!=0:
                    stage=directory/'consumer-stage.json'
                    if stage.is_file() and not stage.is_symlink() and stage.stat().st_size<=128:
                        value=json.loads(stage.read_text(encoding='utf-8'))
                        if isinstance(value,dict) and set(value)=={'stage'} and value['stage'] in {'cli-first','reference-first','wait-expiry','cli-second','reference-second','done'}:
                            print('Etape du controle interrompu : '+value['stage'],flush=True)
                need(result==0)
                return
            except subprocess.TimeoutExpired:
                print('Attente bornee du controle WIF ; aucun jeton affiche.',flush=True)
    finally:
        if process.poll() is None:
            process.kill()
            process.wait(timeout=10)

def report(value):
    fixed={'profile':{k:v for k,v in consumer.PROFILE.items() if k!='gcloud'},
           'sameCliModuleProcess':True,'cliSiteReads':2,'site':'livepalmes',
           'requestedTokenLifetimeSeconds':600,'referenceCredentialTokenCalls':2,
           'referenceTokenChanged':True,'initialCliTokenExpiryObserved':False,
           'cliInitialTokenLifetimeInferredFromPinnedAdc':True,
           'longSinglePublicationCommandQualified':False,'tokensExported':False,
           'configurationWrites':0,'publicationInvocations':0,'accountsRead':0}
    dynamic={'referenceFirstExpiresAt','referenceSecondExpiresAt','secondCliStartedAt','waitedAfterFirstCliMs'}
    need(isinstance(value,dict) and set(value)==set(fixed)|dynamic)
    need(all(value.get(k)==v and type(value.get(k)) is type(v) for k,v in fixed.items()))
    def stamp(name):
        raw=value[name]
        need(isinstance(raw,str) and len(raw)<=30 and raw.endswith('Z'))
        parsed=datetime.datetime.fromisoformat(raw.replace('Z','+00:00'))
        need(parsed.tzinfo is not None)
        return parsed.timestamp()
    first,second,started=[stamp(k) for k in ['referenceFirstExpiresAt','referenceSecondExpiresAt','secondCliStartedAt']]
    need(first<started<second and second-first>=500)
    need(type(value['waitedAfterFirstCliMs']) is int and 610000<=value['waitedAfterFirstCliMs']<=750000)
    return value

def exercise(env, directory, run=run_probe):
    context(env)
    original=consumer.credential(env,qualification='hosting-renewal')
    original_bytes=original.read_bytes()
    data=json.loads(original_bytes)
    data['service_account_impersonation']={'token_lifetime_seconds':600}
    adc=directory/'short-lived-adc.json'
    with adc.open('x',encoding='utf-8') as stream:
        json.dump(data,stream)
    adc.chmod(0o600)
    config=directory/'configstore';config.mkdir(mode=0o700)
    (config/'firebase-tools.json').write_text('{"usage":false}',encoding='utf-8')
    (config/'firebase-tools.json').chmod(0o600)
    clean={k:env[k] for k in ['PATH','LANG','LC_ALL','TMPDIR','SystemRoot'] if k in env}
    clean.update({'GOOGLE_APPLICATION_CREDENTIALS':str(adc),'GOOGLE_CLOUD_PROJECT':'livepalmes',
                  'GCLOUD_PROJECT':'livepalmes','XDG_CONFIG_HOME':str(directory),'CI':'true',
                  'NO_UPDATE_NOTIFIER':'1','WIF_QUALIFICATION':'hosting-renewal',
                  'LIVEPALMES_WIF_CONSUMER_GUARD':'validated-original-adc-and-versions'})
    destination=directory/'consumer-report.json'
    run(['node',str(ROOT/'tools/a3-wif-hosting-renewal.js'),str(destination)],clean,directory)
    info=destination.lstat()
    need(stat.S_ISREG(info.st_mode) and not destination.is_symlink() and info.st_size<=16384)
    result=report(json.loads(destination.read_bytes()))
    need(original.read_bytes()==original_bytes and json.loads(adc.read_bytes())==data)
    return result

def main(argv,env=os.environ):
    ctx=context(env)
    need(len(argv)==1 and argv[0] and not Path(argv[0]).exists())
    # Fixed local versions are checked before original credential access.
    modules=ROOT/'tests/firestore-rules/node_modules'
    need(consumer.command(['node','--version'],{k:env[k] for k in ['PATH','SystemRoot'] if k in env},ROOT)==consumer.PROFILE['node'])
    for file,expected in [('firebase-tools/package.json',consumer.PROFILE['firebaseCli']),('google-auth-library/package.json',consumer.PROFILE['googleAuth'])]:
        need(json.loads((modules/file).read_text(encoding='utf-8'))['version']==expected)
    with tempfile.TemporaryDirectory(prefix='lp-wif-renewal-',dir=env['RUNNER_TEMP']) as private:
        result=exercise(env,Path(private))
    hashes={name:hashlib.sha256((ROOT/name).read_bytes().replace(b'\r\n',b'\n')).hexdigest() for name in [
        'tools/a3-wif-hosting-renewal.py','tools/a3-wif-hosting-renewal.js',
        'tools/a3-wif-hosting-readonly.py','.github/workflows/a3-wif-readonly.yml',
        'tests/firestore-rules/package-lock.json']}
    destination=Path(argv[0]);destination.mkdir(mode=0o700)
    proof={'schema':1,'context':ctx,'provider':consumer.PROVIDER,'serviceAccount':consumer.ACCOUNT,
           'qualification':'hosting-renewal','sourceHashes':hashes,'credentialCopyEphemeral':True,
           'originalAdcUnchanged':True,'permissionsChanged':False,'publicationIdentityChanged':False,
           'referenceExpiryObserved':True,**result}
    with (destination/'wif-hosting-renewal-proof.json').open('x',encoding='utf-8') as stream:
        json.dump(proof,stream,indent=2);stream.write('\n')
    print('Deux lectures Hosting WIF et renouvellement verifies ; aucune publication ou cle modifiee.')

if __name__=='__main__':
    try:main(sys.argv[1:])
    except Exception:
        print('Controle de renouvellement Hosting WIF refuse ; aucun credential ou reponse privee affiche.',file=sys.stderr)
        sys.exit(1)
