# Project licensing record

## Owner decision

On 2026-09-08, the owner explicitly approved the MIT License for original project
code and associated documentation in this independent project.
The copyright notice is `Copyright (c) 2026 samran2`, using the verified GitHub
identity. The complete approved grant is in the root [LICENSE](../LICENSE), with the standard
text from [Choose a License](https://choosealicense.com/licenses/mit/).

The root package and lockfile identify the project-code license as `MIT`.
The root package remains `private: true`; changing the license does not publish
a package or create a release.

## MITRE data and other source material

The development-only `.agents/skills/` and `.agents/references/` snapshot comes
from Addy Osmani's agent-skills under its own
[MIT notice](../.agents/AGENT_SKILLS_LICENSE), Copyright (c) 2025 Addy Osmani.
Its [source lock](../.agents/agent-skills.lock.json) identifies the exact upstream
commit and each file's SHA-256. Include that notice in source distributions.
These files are excluded from the static workbench and OCI runtime; their
integration and update process are described in [agent skills](agent-skills.md).

MITRE ATT&CK source data and reproduced source text in the catalog, procedure
records and generated prompts retain their separate MITRE terms. Preserve the
complete [MITRE data license](../sources/attack-19.2/raw/LICENSE.txt) and the
[public notice](../demo/THIRD_PARTY_LICENSE.txt), including in distributions that
contain copied ATT&CK content. The raw MITRE license and the MITRE text at the
beginning of the public notice remain unchanged. The public notice also includes
the complete project MIT license under `Project code license`, so both licenses
accompany the eight-file static distribution.

Source descriptions, analytic guidance and procedure references remain
attributed to their sources. A reference URL does not by itself mean the project
has copied the referenced publication or acquired rights to that publication.
The MIT project-code license does not replace third-party terms or grant rights
to the unavailable original v0.2.0 application. If original files are later
recovered, inventory their rights and notices separately before including them.

MITRE ATT&CK is a trademark of The MITRE Corporation. This project is independent
and is not endorsed by MITRE. The recorded license decision does not claim
publication, security approval or validation of generated detections.
