"""Behavior tests for the source-independent repository foundation checks."""

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "check_foundation.py"
PROJECT_GITIGNORE = SCRIPT.parents[1] / ".gitignore"
REQUIRED = """
README.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md LICENSE docs/licensing.md
AGENTS.md SPEC.md CHANGELOG.md ROADMAP.md GOVERNANCE.md MAINTAINERS.md SUPPORT.md
CITATION.cff VERSION .gitignore .editorconfig
.pre-commit-config.yaml ruff.toml .github/workflows/ci.yml
.github/workflows/release-preview.yml .github/CODEOWNERS .github/dependabot.yml
.github/allowed-actions.md docs/architecture.md docs/development.md
docs/publishing.md docs/ui-quality.md packages/schemas/manifest.json
content/prompts/index.json content/native-rules/support-matrix.json
validation/evals/static/summary.json apps/research-api/openapi.yaml
""".split()
SCOPE = "Foundation checks only; application and ATT&CK content are not verified."


class FoundationChecksTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "repository"
        self.root.mkdir()
        for name in REQUIRED:
            self.write(name, "Foundation fixture\n")
        self.write("VERSION", "0.3.0.dev0\n")

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def run_check(self, *arguments):
        return subprocess.run(
            [sys.executable, str(SCRIPT), "--root", str(self.root), *arguments],
            capture_output=True,
            text=True,
            check=False,
        )

    def git(self, *arguments):
        return subprocess.run(["git", *arguments], cwd=self.root, capture_output=True, check=True)

    def test_tracked_mode_passes_for_regular_repository_files(self):
        self.git("init", "--quiet")
        self.git("add", ".")
        result = self.run_check("--tracked")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_tracked_excluded_directory_is_rejected_without_reading_its_secret(self):
        credential = "ghp_" + "e" * 36
        self.write(".gitignore", "work/\n")
        self.write("work/secret.txt", credential)
        self.git("init", "--quiet")
        self.git("add", "--force", "work/secret.txt")
        result = self.run_check("--tracked")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("work/secret.txt: tracked excluded directory", result.stdout)
        self.assertNotIn(credential, result.stdout + result.stderr)

    def test_known_local_credential_paths_are_ignored_by_git(self):
        shutil.copy2(PROJECT_GITIGNORE, self.root / ".gitignore")
        paths = [
            "credentials.json",
            "auth.json",
            ".aws/credentials",
            ".azure/accessTokens.json",
            ".config/gcloud/application_default_credentials.json",
            ".kube/config",
            ".netrc",
            ".pypirc",
        ]
        for name in paths:
            self.write(name, "synthetic local credential state\n")
        self.git("init", "--quiet")
        self.git("add", ".")
        staged = self.git("ls-files").stdout.decode().splitlines()
        for name in paths:
            with self.subTest(path=name):
                self.assertNotIn(name, staged)

    def test_force_staged_local_credential_path_fails_without_reading_value(self):
        credential = "ghp_" + "f" * 36
        shutil.copy2(PROJECT_GITIGNORE, self.root / ".gitignore")
        self.write("auth.json", credential)
        self.git("init", "--quiet")
        self.git("add", "--force", "auth.json")
        result = self.run_check("--tracked")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("auth.json: tracked local credential path", result.stdout)
        self.assertNotIn(credential, result.stdout + result.stderr)

    def test_tracked_symlink_is_rejected(self):
        (self.root / "link.txt").symlink_to("README.md")
        self.git("init", "--quiet")
        self.git("add", "link.txt")
        result = self.run_check("--tracked")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("link.txt", result.stdout)
        self.assertIn("symlink", result.stdout)

    def test_tracked_missing_working_file_is_rejected(self):
        self.write("missing.txt", "Previously staged file\n")
        self.git("init", "--quiet")
        self.git("add", "missing.txt")
        (self.root / "missing.txt").unlink()
        result = self.run_check("--tracked")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("missing.txt", result.stdout)
        self.assertIn("missing", result.stdout)

    def test_tracked_mode_fails_cleanly_outside_git_repository(self):
        result = self.run_check("--tracked")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Git repository", result.stdout)
        self.assertNotIn("Traceback", result.stdout + result.stderr)

    def test_complete_foundation_passes_with_explicit_scope(self):
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(SCOPE, result.stdout)

    def test_missing_required_file_fails(self):
        (self.root / "SECURITY.md").unlink()
        result = self.run_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECURITY.md", result.stdout)
        self.assertIn("missing", result.stdout.lower())

    def test_invalid_development_versions_fail(self):
        for version in ["0.3.0", "v0.3.0.dev0", "0.3.dev0", "01.3.0.dev0", "0.3.0.devx"]:
            with self.subTest(version=version):
                self.write("VERSION", version + "\n")
                result = self.run_check()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("VERSION", result.stdout)

    def test_credentials_are_reported_without_echoing_the_value(self):
        examples = {
            "private key": "-----BEGIN " + "PRIVATE KEY-----",
            "GitHub token": "ghp_" + "a" * 36,
            "OpenAI project key": "sk-proj-" + "b" * 48,
            "AWS access key ID": "AKIA" + "C" * 16,
        }
        for category, credential in examples.items():
            with self.subTest(category=category):
                self.write("fixture.txt", "First line\n" + credential + "\n")
                result = self.run_check()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("fixture.txt:2", result.stdout)
                self.assertIn(category, result.stdout)
                self.assertNotIn(credential, result.stdout + result.stderr)

    def test_excluded_directories_and_symlinks_are_not_scanned(self):
        credential = "ghp_" + "d" * 36
        for directory in [".git", ".venv", "build", "dist", "work", "outputs", "__pycache__"]:
            self.write(f"{directory}/secret.txt", credential)
        outside = Path(self.temporary.name) / "outside.txt"
        outside.write_text(credential, encoding="utf-8")
        (self.root / "external.txt").symlink_to(outside)
        (self.root / "external-dir").symlink_to(outside.parent, target_is_directory=True)
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_required_file_may_not_be_a_symlink(self):
        target = self.root / "SECURITY.md"
        target.unlink()
        target.symlink_to(self.root / "README.md")
        result = self.run_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECURITY.md", result.stdout)

    def test_merge_markers_and_artifacts_fail(self):
        self.write("conflict.txt", "Normal text\n" + "<" * 7 + " HEAD\n")
        self.write(".DS_Store", "unwanted")
        result = self.run_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("conflict.txt:2", result.stdout)
        self.assertIn("merge marker", result.stdout)
        self.assertIn(".DS_Store", result.stdout)

    def test_binary_files_do_not_crash_the_scan(self):
        (self.root / "image.png").write_bytes(b"\x89PNG\x00\xff\xfe")
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_default_root_is_relative_to_script_not_working_directory(self):
        destination = self.root / "scripts" / SCRIPT.name
        destination.parent.mkdir()
        shutil.copy2(SCRIPT, destination)
        result = subprocess.run(
            [sys.executable, str(destination)],
            cwd=self.temporary.name,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(SCOPE, result.stdout)


if __name__ == "__main__":
    unittest.main()
