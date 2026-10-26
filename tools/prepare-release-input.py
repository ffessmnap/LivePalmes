"""Accept one bounded manifest, then use the existing closed release validator."""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]


def manifest(file, inline):
    if bool(file) == bool(inline):
        raise ValueError('Fournir exactement request_file ou request_json')
    if file:
        if not re.fullmatch(r'\.github/releases/[A-Za-z0-9_-]+\.json', file):
            raise ValueError('Chemin de bilan interdit')
        content = (ROOT / file).read_text(encoding='utf-8')
    else:
        content = inline
    if len(content.encode('utf-8')) > 65536:
        raise ValueError('Bilan trop volumineux')
    def unique(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Cle JSON dupliquee')
            result[key] = value
        return result
    value = json.loads(content, object_pairs_hook=unique)
    if not isinstance(value, dict):
        raise ValueError('Objet JSON requis')
    return value


def main(destination):
    value = manifest(os.environ.get('REQUEST_FILE', ''), os.environ.get('REQUEST_JSON', ''))
    directory = Path(destination)
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / 'submitted-request.json'
    source.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
    spec = importlib.util.spec_from_file_location('input_cycle', ROOT / 'tools/release-cycle.py')
    cycle = importlib.util.module_from_spec(spec); spec.loader.exec_module(cycle)
    cycle.prepare_request(source, directory)


if __name__ == '__main__':
    main(sys.argv[1])
