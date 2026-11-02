import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('register_features', ROOT / 'scripts/register_production_features.py')
register = importlib.util.module_from_spec(spec)
spec.loader.exec_module(register)


class WorkflowCatalogTests(unittest.TestCase):
    def test_registration_is_idempotent_and_preserves_existing_documentation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '_internal').mkdir()
            (root / 'tools').mkdir()
            for tool in (ROOT / 'tools').glob('*.py'):
                (root / 'tools' / tool.name).touch()
            target = root / '_internal/toolkit-registry.json'
            target.write_text(json.dumps({'tools': {'audio_mix': {'documentation': 'docs/audio-mix.md'}},
                'commands': {}, 'templates': {}, 'examples': {}}), encoding='utf-8')
            with patch.object(register, 'ROOT', root):
                register.main()
                first = target.read_bytes()
                register.main()
            self.assertEqual(target.read_bytes(), first)
            catalog = json.loads(first)
            self.assertIn('build-video', catalog['commands'])
            self.assertIn('review-video', catalog['commands'])
            self.assertEqual(catalog['tools']['audio_mix']['documentation'], 'docs/audio-mix.md')
            self.assertIn('storyboard', catalog['templates'])
