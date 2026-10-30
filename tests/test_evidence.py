import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from evidence import check, lock_spec, selected_value


class EvidenceTests(unittest.TestCase):
    def fixture(self, root, claims, script):
        (root / 'source.md').write_text('The release includes three export formats.\n')
        (root / 'data.csv').write_text('period,value\nMay,120\n')
        (root / 'script.md').write_text(script)
        spec = {'version': 1, 'script': 'script.md', 'sources': {'doc': {'path': 'source.md'}, 'data': {'path': 'data.csv'}}, 'claims': claims}
        path = root / 'evidence.json'
        path.write_text(json.dumps(spec))
        locked = root / 'locked.json'
        locked.write_text(json.dumps(lock_spec(path, locked)))
        return locked

    def test_quotes_coverage_and_stale_sources(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            claim = {'id': 'formats', 'text': 'The release includes three export formats.', 'source': 'doc',
                     'quote': 'The release includes three export formats.'}
            path = self.fixture(root, [claim], claim['text'])
            self.assertTrue(check(path, strict=True)['success'])
            (root / 'source.md').write_text('The release includes two export formats.')
            result = check(path)
            self.assertFalse(result['success'])
            self.assertEqual({f['code'] for f in result['findings']}, {'stale-source', 'quote-not-found'})
            (root / 'script.md').write_text('Unsupported extra claim.')
            result = check(path)
            self.assertIn('uncited-text', {f['code'] for f in result['findings']})
            self.assertIn('stale-script', {f['code'] for f in result['findings']})

    def test_numeric_mismatches_and_paraphrases_require_review(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            claim = {'id': 'count', 'text': 'May had 120 users.', 'source': 'data', 'selector': {'row': 0, 'column': 'value'}, 'expected': 120}
            path = self.fixture(root, [claim], claim['text'])
            report = check(path)
            self.assertTrue(report['success'])
            self.assertEqual(report['claims'][0]['status'], 'value-matches')
            self.assertFalse(check(path, strict=True)['success'])
            value = json.loads(path.read_text())
            value['claims'][0]['expected'] = 121
            path.write_text(json.dumps(value))
            self.assertIn('value-mismatch', {f['code'] for f in check(path)['findings']})

    def test_json_pointers_and_moved_locks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.json'
            source.write_text('{"a/b":{"~values":[3,4]}}')
            self.assertEqual(selected_value(source, {'pointer': '/a~1b/~0values/1'}), 4)
            with self.assertRaises(ValueError):
                selected_value(source, {'pointer': '/a~2b'})
            claim = {'id': 'formats', 'text': 'The release includes three export formats.', 'source': 'doc',
                     'quote': 'The release includes three export formats.'}
            path = self.fixture(root, [claim], claim['text'])
            nested = root / 'nested'
            nested.mkdir()
            moved = nested / 'lock.json'
            moved.write_text(json.dumps(lock_spec(path, moved)))
            self.assertTrue(check(moved, strict=True)['success'])
