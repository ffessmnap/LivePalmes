"""A3.6a: exact ten header pairs, manual TEST Hosting only; no PROD exception."""
import hashlib
import json

BASELINE = '3e50c2aab3d79685f9b174387cd91f5b79dc005c'
BEFORE = 'a16526988a5877eb98d9c82012939c0a8d213bf9d3d95fe34c84b433747e0dc4'
AFTER = '84cebef85d58993554222995c04522219d2651a879fd33c5d3f95783f5bf5862'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def validate_sources(before, after, project, hosting_only, automatic_candidate):
    if project != 'livepalmes-test' or not hosting_only or automatic_candidate:
        raise ValueError('A3.6a reserve a un lancement manuel Hosting TEST')
    if digest(before) != BEFORE or digest(after) != AFTER:
        raise ValueError('Configuration hors des dix couples route/en-tete A3.6a approuves')
