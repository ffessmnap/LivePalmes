import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location("a5",Path(__file__).resolve().parents[1]/"tools/a5-legacy-direct-inventory.py")
a5=importlib.util.module_from_spec(spec);spec.loader.exec_module(a5)
class Inventory(unittest.TestCase):
    def test_fixed_scope_and_budget(self):
        targets=a5.targets();self.assertEqual(len(targets),24)
        self.assertEqual({row[0] for row in targets},set(a5.PROJECTS))
        for project,target,kind,url,body in targets:
            self.assertNotIn("nap.ffessm",url)
            if body:self.assertTrue(url.endswith(":runQuery") or url.endswith(":listCollectionIds"))
            if kind=="archives":self.assertEqual(body["structuredQuery"]["limit"],101)
            if kind.startswith("competition-pdfs/"):
                self.assertIn(target,a5.PROJECTS[project]);self.assertIn(kind,["competition-pdfs/"+cid+"/" for cid in a5.COMPETITIONS])
    def test_complete(self):
        result=a5.collect(lambda url,body:[] if url.endswith(":runQuery") else {})
        self.assertTrue(result["readOnly"]);self.assertEqual(len(result["rows"]),24)
    def test_refuses_truncated(self):
        with self.assertRaisesRegex(ValueError,"INCOMPLETE"):
            a5.collect(lambda url,body:{"nextPageToken":"more"})
    def test_refuses_archive_overflow(self):
        with self.assertRaisesRegex(ValueError,"ARCHIVE_BOUND"):
            a5.collect(lambda url,body:[{"document":{}}]*101 if url.endswith(":runQuery") else {})
    def test_refuses_foreign_objects(self):
        with self.assertRaisesRegex(ValueError,"FOREIGN_OBJECT"):
            a5.collect(lambda url,body:[] if url.endswith(":runQuery") else {"items":[{"name":"entry-documents/keep.pdf","generation":"1"}]} if "storage.googleapis" in url else {})
    def test_capabilities_remain_read_only_and_fixed(self):
        spec=importlib.util.spec_from_file_location("a5_caps",Path(__file__).resolve().parents[1]/"tools/a5-legacy-direct-capabilities.py")
        caps=importlib.util.module_from_spec(spec);spec.loader.exec_module(caps)
        for project in caps.PROJECTS:
            rows=list(caps.targets(project));self.assertEqual(len(rows),3)
            self.assertTrue(rows[0][1].endswith(":testIamPermissions"))
            self.assertTrue(all("testPermissions" in row[1] for row in rows[1:]))
            self.assertTrue(caps.collect(project,"backend",lambda url,body:{"permissions":[]})["readOnly"])
        with self.assertRaises(ValueError):list(caps.targets("other-project"))
if __name__=="__main__":unittest.main()
