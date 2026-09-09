#!/usr/bin/env python3
"""Check repository scaffolding and selected text patterns, without dependencies.

This is not a comprehensive secret audit or an application/content validation.
Excluded directories, symlinks, binary files and non-UTF-8 files are not scanned.
The --tracked gate rejects excluded or non-regular paths in Git's file list.
"""

import argparse
import os
import re
import subprocess
from pathlib import Path

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
EXCLUDED = {
    ".git",
    ".venv",
    "venv",
    "env",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".tox",
    ".nox",
    "build",
    "dist",
    "work",
    "output",
    "outputs",
}
ARTIFACT_NAMES = {".DS_Store", ".coverage", "Thumbs.db", ".env"}
ARTIFACT_SUFFIXES = {".pyc", ".pyo", ".log", ".swp", ".swo"}
ENV_EXAMPLES = {".env.example", ".env.sample", ".env.template"}
LOCAL_CREDENTIAL_FILES = {
    "credentials.json",
    "auth.json",
    ".config/gcloud/application_default_credentials.json",
    ".kube/config",
    ".netrc",
    ".pypirc",
}
LOCAL_CREDENTIAL_DIRECTORIES = {".aws", ".azure"}
NUMBER = r"(?:0|[1-9][0-9]*)"
VERSION_PATTERN = re.compile(rf"{NUMBER}\.{NUMBER}\.{NUMBER}\.dev{NUMBER}")
PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\bghp_[A-Za-z0-9]{36}\b"),
    "OpenAI project key": re.compile(r"\bsk-proj-[A-Za-z0-9_-]{20,}\b"),
    "AWS access key ID": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "merge marker": re.compile(r"^(?:<{7}(?: |$)|={7}$|>{7}(?: |$)|\|{7}(?: |$))"),
}
SCOPE = "Foundation checks only; application and ATT&CK content are not verified."


def is_local_file(root, name):
    """Require a regular file without following symlinked path components."""
    path = root
    for component in Path(name).parts:
        path /= component
        if path.is_symlink():
            return False
    return path.is_file()


def check(root):
    """Return findings without including matched credential values."""
    findings = []
    for name in REQUIRED:
        if not is_local_file(root, name):
            findings.append(f"{name}: missing required regular file (symlinks disallowed)")

    if is_local_file(root, "VERSION"):
        try:
            version = (root / "VERSION").read_text(encoding="utf-8").strip()
            if not VERSION_PATTERN.fullmatch(version):
                findings.append("VERSION: expected MAJOR.MINOR.PATCH.devN")
        except (OSError, UnicodeError):
            findings.append("VERSION: cannot read UTF-8 version")

    def walk_error(error):
        name = Path(error.filename).relative_to(root)
        findings.append(f"{name}: cannot inspect directory")

    for directory, subdirectories, filenames in os.walk(
        root, followlinks=False, onerror=walk_error
    ):
        folder = Path(directory)
        subdirectories[:] = sorted(
            name
            for name in subdirectories
            if name not in EXCLUDED and not (folder / name).is_symlink()
        )
        for name in sorted(filenames):
            path = folder / name
            if path.is_symlink() or not path.is_file():
                continue
            relative = path.relative_to(root)
            if (
                name in ARTIFACT_NAMES
                or path.suffix.lower() in ARTIFACT_SUFFIXES
                or (name.startswith(".env.") and name not in ENV_EXAMPLES)
            ):
                findings.append(f"{relative}: unwanted local artifact")
            try:
                data = path.read_bytes()
                if b"\x00" in data:
                    continue
                content = data.decode("utf-8")
            except UnicodeError:
                continue
            except OSError:
                findings.append(f"{relative}: cannot read file")
                continue
            for line_number, line in enumerate(content.splitlines(), 1):
                for category, pattern in PATTERNS.items():
                    if pattern.search(line):
                        findings.append(f"{relative}:{line_number}: {category}")
    return findings


def check_tracked(root):
    """Reject excluded tracked paths without reading their contents."""
    try:
        result = subprocess.run(
            ["git", "ls-files", "-z"], cwd=root, capture_output=True, check=True
        )
    except (OSError, subprocess.CalledProcessError):
        return [".: cannot enumerate tracked files in Git repository"]
    findings = []
    for entry in result.stdout.split(b"\x00"):
        if not entry:
            continue
        name = os.fsdecode(entry)
        parts = Path(name).parts
        if name in LOCAL_CREDENTIAL_FILES or (parts and parts[0] in LOCAL_CREDENTIAL_DIRECTORIES):
            findings.append(f"{name}: tracked local credential path")
        if any(part in EXCLUDED for part in Path(name).parts[:-1]):
            findings.append(f"{name}: tracked excluded directory")
        if not is_local_file(root, name):
            findings.append(f"{name}: tracked symlink or missing regular file")
    return findings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (default: the parent of this script's directory)",
    )
    parser.add_argument("--tracked", action="store_true", help="also check Git's file list")
    arguments = parser.parse_args()
    root = arguments.root.resolve()
    print(SCOPE)
    findings = check(root)
    if arguments.tracked:
        findings.extend(check_tracked(root))
    for finding in findings:
        print(finding)
    print(f"Foundation checks {'failed' if findings else 'passed'}.")
    print("Selected text patterns only; this is not a comprehensive secret audit.")
    return 1 if findings else 0


if __name__ == "__main__":
    raise SystemExit(main())
