"""Closed admin.full MFA Rules projection; TEST/PROD and public reads stay separate."""
import hashlib,re
BEFORE = {'livepalmes-test': '367fbf01bf3f2794727b19e6d5f5bd141bcf6baf31002500c9ffc8bb1ea98561', 'livepalmes': 'ef955e075af13b4de189401d3f148a807e99704fcf83651c85fe72598caf44f2'}
HEADER = '    // The current profile selects the obligation; only Firebase\'s reserved\n    // sign-in proof establishes that this session passed a TOTP challenge.\n    function hasVerifiedTotp() {\n      return request.auth != null\n        && request.auth.token.get("firebase", {}).get("sign_in_second_factor", "") == "totp";\n    }\n\n    function hasActiveAdminProfile() {\n      let profilePath = /databases/$(database)/documents/users/$(request.auth.uid);\n      return exists(profilePath)\n        && get(profilePath).data.get("status", "") == "active"\n        && get(profilePath).data.get("capabilities", {}).get("admin.full", false) == true;\n    }\n\n    function adminMfaAllowed() {\n      let currentAdmin = hasActiveAdminProfile();\n      return (!currentAdmin && !isAdmin()) || (currentAdmin && hasVerifiedTotp());\n    }\n\n'
def digest(text):return hashlib.sha256(text.replace('\r\n','\n').encode()).hexdigest()
def _optimize(source):
    # Same conjunctions: reject nonmatching sources before repeating role checks.
    for role,origin in [('referee','referee'),('secretary','secretary'),('video','delegate')]:
        old='hasConsoleRole(competitionId, "'+role+'")\n              && request.resource.data.roleSource == "'+origin+'"'
        new='request.resource.data.roleSource == "'+origin+'"\n              && hasConsoleRole(competitionId, "'+role+'")'
        if source.count(old)!=1:raise ValueError('Closed alert ordering drift')
        source=source.replace(old,new)
    # Firestore ORs duplicate allow update clauses. Preserve all four branches
    # under one identical public-environment check and one outer MFA guard.
    start=source.index('      match /results/{resultId} {');end=source.index('\n      }',start)
    block=source[start:end];pattern=r'(?m)^[ \t]*allow update: if ([^;]+);';matches=list(re.finditer(pattern,block))
    if len(matches)!=4:raise ValueError('Closed result update alternatives drift')
    branches=[]
    for match in matches:
        expression=match[1].strip();prefix='isLivePalmesCompetition(competitionId)'
        if not expression.startswith(prefix):raise ValueError('Result update environment differs')
        branch=expression[len(prefix):].strip()
        if not branch.startswith('&&'):raise ValueError('Result update conjunction differs')
        branches.append(branch[2:].strip())
    combined='        allow update: if isLivePalmesCompetition(competitionId)\n          && (\n            ('+')\n            || ('.join(branches)+')\n          );'
    first=True
    def replace(match):
        nonlocal first
        if not first:return ''
        first=False;return combined
    block=re.sub(pattern,replace,block)
    return source[:start]+block+source[end:]

def _project(before):
    marker='    function hasCapability(capability) {'
    if before.count(marker)!=1:raise ValueError('MFA Rules anchor drift')
    source=_optimize(before).replace(marker,HEADER+marker)
    def restrict(match):
        prefix,expr=match.groups();flat=' '.join(expr.split())
        # These are all unconditional public reads in the authenticated baseline.
        # Closed allow clauses are preserved; all other permissions are private.
        if flat=='false' or ('write' not in prefix and any(k in prefix for k in ['allow read:', 'allow get:', 'allow list:']) and flat in ['isLivePalmesCompetition(competitionId)','isLivePalmesActiveCompetition(competitionId)']):return match.group(0)
        return prefix+'request.auth != null && adminMfaAllowed() && ('+expr+');'
    return re.sub(r'(?m)^([ \t]*allow [^\n:]+: if )([^;]+);',restrict,source)
def project(before,target):
    if target not in BEFORE or digest(before)!=BEFORE[target]:raise ValueError('Exact authenticated MFA baseline required')
    after=_project(before.replace('\r\n','\n'))
    if digest(after)!=AFTER[target]:raise ValueError('MFA Rules result drift')
    return after
def validate(before,after,target):
    if project(before,target)!=after.replace('\r\n','\n'):raise ValueError('Unexpected Rules changes beyond MFA')
AFTER = {'livepalmes-test': 'db56d009ec9f34fa0a6bb895346fe576ad31a7e1b3223c454474024b09dbf589', 'livepalmes': '9c1b39d8546ae41d4a017b67563a440548e1e03eb816c4c56a4dfb7fc5902705'}
