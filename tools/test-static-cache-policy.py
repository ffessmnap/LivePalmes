"""Exact static-cache exception approved on 9 November 2026, TEST Hosting only."""
import hashlib
import json

BASELINE = '6cad18a6ac94af481330fb362ea459fcc6c312a9'
BEFORE = '0c723a1ac54aed3afac0925c44355c29b7e523c0b1f00a16dbc204971751174e'
AFTER = 'a16526988a5877eb98d9c82012939c0a8d213bf9d3d95fe34c84b433747e0dc4'


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def validate_sources(before, after, project, hosting_only, automatic_candidate):
    if project != 'livepalmes-test' or not hosting_only or automatic_candidate:
        raise ValueError('Cache statique reserve a un lancement manuel Hosting TEST')
    if digest(before) != BEFORE or digest(after) != AFTER:
        raise ValueError('Configuration hors des huit changements de cache exacts approuves')
