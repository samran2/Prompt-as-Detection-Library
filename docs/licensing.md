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
accompany the static distribution.

MITRE ATLAS 2026.08 is separately sourced from `mitre-atlas/atlas-data` under
Apache-2.0, Copyright 2021–2026 MITRE. Its original
[upstream notice](../sources/atlas-2026.08/raw/LICENSE.txt) and the
[complete Apache-2.0 license](../sources/atlas-2026.08/raw/APACHE-2.0.txt) are
preserved. Generated catalogs and prompts transform the YAML into local research
formats; the unmodified versioned YAML remains authoritative. The
[public ATLAS notice](../demo/ATLAS_LICENSE.txt) accompanies every static build
with reproduced ATLAS material. The source manifest records exact hashes and
origins; see [ATLAS provenance](atlas.md). Linked case-study publications are
references, not imported third-party articles or an additional license grant.

Source descriptions, analytic guidance and procedure references remain
attributed to their sources. A reference URL does not by itself mean the project
has copied the referenced publication or acquired rights to that publication.
The MIT project-code license does not replace third-party terms or grant rights
to the unavailable original v0.2.0 application. If original files are later
recovered, inventory their rights and notices separately before including them.

MITRE D3FEND 1.6.0 data retain the explicit
[D3FEND terms](https://d3fend.mitre.org/tou/) and
[bundled notices](../sources/d3fend-1.6.0/NOTICE.txt), including ATT&CK, ATLAS and
SPARTA attribution in the unmodified source snapshot. The generated supplement
includes only exact active ATT&CK relationships from our library. Its
[public notice](../demo/D3FEND_LICENSE.txt) accompanies every static build.
Although the ontology license field says MIT, we retain the explicit upstream
terms rather than relabeling third-party content as project code. The
[D3FEND guide](d3fend.md) documents transformations and limits.

MITRE ATT&CK is a trademark of The MITRE Corporation. This project is independent
and is not endorsed by MITRE. The recorded license decision does not claim
publication, security approval or validation of generated detections.
