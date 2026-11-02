import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
from dubbing import diarize, separate


@unittest.skipUnless(shutil.which('ffmpeg'), 'FFmpeg required')
class OptionalAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.source = self.root / 'source.wav'
        subprocess.run(['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'sine=duration=1', str(self.source)], check=True)

    def test_diarization_requires_explicit_model_access(self):
        with patch.dict(os.environ, {'HF_TOKEN': ''}):
            with self.assertRaisesRegex(ValueError, 'HF_TOKEN'):
                diarize(self.source, self.root / 'speakers.json')
        self.assertFalse((self.root / 'speakers.json').exists())

    def test_stem_preview_never_runs_an_external_model(self):
        target = self.root / 'background.wav'
        with patch('dubbing.run', side_effect=AssertionError('preview must not run model commands')):
            result = separate(self.source, target)
        self.assertFalse(result['executed'])
        self.assertEqual(result['engine'], 'demucs/htdemucs')
        self.assertFalse(target.exists())
