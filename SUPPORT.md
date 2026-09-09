# Support

Community support for the Prompt-as-Detection Library is provided on a best
effort basis. There is no SLA and no response-time guarantee. This development
project has no declared stable or supported public release; answers describe the
current repository state unless a specific commit or version is named.

## Before opening a request

1. Read the [README](README.md), [development guide](docs/development.md) and
   [verification record](docs/verification.md).
2. Search existing
   [GitHub issues](https://github.com/samran2/Prompt-as-Detection-Library/issues)
   for the same behavior.
3. Reproduce the problem from a clean checkout with Node.js 22 or later. Record
   the exact version or commit and the smallest synthetic example that shows it.

## Where to ask

- Use a [GitHub issue](https://github.com/samran2/Prompt-as-Detection-Library/issues/new/choose)
  for reproducible bugs, focused feature proposals and prompt-quality problems.
  Choose the closest template and keep one problem per issue.
- Use a pull request for a concrete, reviewable fix. Follow
  [CONTRIBUTING.md](CONTRIBUTING.md), the [governance policy](GOVERNANCE.md) and
  the [evidence contribution guide](docs/evidence-contributions.md).
- Use GitHub's
  [private vulnerability reporting](https://github.com/samran2/Prompt-as-Detection-Library/security)
  for a suspected vulnerability. Do not put undisclosed vulnerability details,
  credentials, private logs or sensitive exploits in a public issue. See
  [SECURITY.md](SECURITY.md) for scope and reporting guidance.

No verified private conduct-reporting contact is currently configured. Follow
the current disclosure in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); do not post a
confidential conduct report publicly.

## Information that helps

Include only information you have the right to share:

- the repository version or full commit identifier;
- operating system, Node.js version and browser when relevant;
- exact command or minimal sequence that reproduces the behavior;
- expected and observed results, including complete non-sensitive error text;
- the smallest synthetic fixture or prompt needed to reproduce the problem; and
- checks already run, their actual results and anything not verified.

Redact secrets before submission. Do not upload customer telemetry, private
model responses, credentials or production logs. A maintainer may close a
request that cannot be investigated safely or reproducibly and invite a smaller,
sanitized reproduction.

## Scope of community support

Maintainers and contributors can help with repository usage, reproducible
defects, source/provenance corrections and reviewable improvements. They cannot
promise individual deployment design, incident response, product-specific rule
certification, or a deadline for a fix.

All generated detections remain unvalidated drafts until separately tested in
their target environment. Repository support, a merged pull request, structural
checks or ATT&CK coverage must not be interpreted as a guarantee of detection
effectiveness, product compatibility or security.
