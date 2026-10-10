import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('pdf_publish', Path(__file__).parents[1] / 'tools/publish-approved-pdf-functions.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PdfSourceTests(unittest.TestCase):
    def test_patch_changes_only_source_and_commit_label(self):
        for name in m.ALLOWED:
            before = {'name': 'projects/livepalmes/locations/europe-west1/functions/' + name,
                      'labels': {'deployment-scheduled': 'true'},
                      'serviceConfig': {'secretEnvironmentVariables': [{'key': 'EXAMPLE'}]},
                      'eventTrigger': {'eventType': 'example'}}
            result = m.source_patch(before, {'bucket': 'example', 'object': 'source.zip'}, 'a' * 40)
            self.assertEqual(set(result), {'name', 'buildConfig', 'labels'})
            self.assertEqual(set(result['buildConfig']), {'source'})
            self.assertEqual(result['labels']['deployment-scheduled'], 'true')
            self.assertNotIn('livepalmes-commit', before['labels'])

    def test_native_identity_binding_is_exact_and_opt_in(self):
        before = {'name': 'projects/livepalmes/locations/europe-west1/functions/resolveEngagementSwimmerChangeRequest'}
        result = m.source_patch(before, {}, 'a' * 40, True)
        self.assertEqual(result['serviceConfig'], {'secretEnvironmentVariables': [
            {'key': 'LIVEPALMES_NAP_PASSWORD', 'secret': 'LIVEPALMES_NAP_PASSWORD',
             'projectId': 'livepalmes', 'version': 'latest'}]})
        self.assertNotIn('serviceConfig', before)
        for name in m.ALLOWED - {'resolveEngagementSwimmerChangeRequest'}:
            with self.assertRaises(ValueError):
                m.source_patch({'name': name}, {}, 'a' * 40, True)

    def test_other_function_is_rejected(self):
        with self.assertRaises(ValueError):
            m.source_patch({'name': 'projects/livepalmes/locations/europe-west1/functions/sendEmails'}, {}, 'a' * 40)


if __name__ == '__main__':
    unittest.main()
