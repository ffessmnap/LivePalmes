"""Five exact home/Direct CSP headers; manual TEST Hosting only, no PROD exception."""
import hashlib,json

BASELINE='689d523b423615cb1faad9f564c1a6b2f44f1b96'
BEFORE='84cebef85d58993554222995c04522219d2651a879fd33c5d3f95783f5bf5862'
AFTER='896854073c2eb582864a8083dc30fe62f2fc3b5f50c5bda4ffd5df67c3e32671'

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def validate_sources(before,after,project,hosting_only,automatic_candidate,verification_only):
    if project!='livepalmes-test' or not hosting_only or automatic_candidate or verification_only:
        raise ValueError('CSP Direct reservee a un lancement manuel Hosting TEST exact')
    if digest(before)!=BEFORE or digest(after)!=AFTER:
        raise ValueError('Configuration hors des cinq CSP accueil/Direct approuvees')
