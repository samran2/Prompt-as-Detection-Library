# ATT&CK Navigator coverage

The workbench exports a local JSON layer for one pinned ATT&CK 19.2 domain:
Enterprise, Mobile or ICS/OT. Open the downloaded file with **Open Existing
Layer → Upload from local** in an ATT&CK Navigator instance that has the matching
ATT&CK dataset. The application never uploads the file automatically. Use a
locally hosted Navigator if an external service is not appropriate.

The export targets the official [Navigator layer format 4.5](https://github.com/mitre-attack/attack-navigator/blob/master/layers/spec/v4.5/layerformat.md),
with the documented 5.2.0 compatibility version. This identifies the format
target, not an assertion that the upstream application was executed by this
project's tests. Dataset availability is independent of layer format support.

## What blue means

Blue means **a generated detection prompt is present in the selected records**.
It does not mean telemetry exists, a rule is deployed, a human has reviewed the
prompt, or a detection has worked. Unannotated Navigator cells have no coverage
claim. No numeric effectiveness scores are exported.

The canonical library currently has 918 generated prompts and no completed
human review or lab/field validation. Navigator deliberately ignores arbitrary
`validation` properties on records. A regression test binds this conservative
behavior to the canonical review index; when genuine review evidence advances,
the module must be updated through a reviewed, evidence-bound projection rather
than trusting a user-supplied status field.

Each technique/subtechnique appears under exactly its source-listed tactics.
Parent coverage is never inherited by children. Domain totals count distinct
technique IDs; tactic totals overlap when a technique belongs to several
tactics and must not be summed as a count of unique prompts. ATLAS is a separate
framework and cannot be exported as an ATT&CK Navigator domain.

## Local module contract

`demo/navigator.js` exposes the same zero-dependency API as CommonJS exports and
the browser global `PAD_NAVIGATOR`:

```javascript
const layer = PAD_NAVIGATOR.createLayer(catalog, { domain: 'ICS' });
const summary = PAD_NAVIGATOR.summarize(catalog, { domain: 'ICS' });
const json = JSON.stringify(layer, null, 2);
```

Pass the checked-in project catalog, or a filtered subset of that catalog. A
mixed ATT&CK/ATLAS catalog is accepted: records outside the chosen domain are
excluded. This is an exporter, not a source authenticity verifier or general
catalog importer. The integration must not substitute an untrusted uploaded
catalog for the canonical records.

`createLayer` returns a fresh JSON-serializable layer, sorted by ID and the
pinned tactic order. It exports only identifiers, fixed links, generated-status
annotations and format metadata. Source descriptions, local context, model
responses and arbitrary input URLs are excluded.

`summarize` returns:

```text
{
  domain, attackVersion, notice,
  total, generated, reviewed, labValidated, fieldConfirmed,
  tactics: [{
    name, id, total, generated, reviewed, labValidated, fieldConfirmed,
    techniqueIds
  }]
}
```

The tactic order and short IDs match the pinned domain matrix, including the
ATT&CK 19.2 Enterprise Stealth and Defense Impairment tactics. All advanced
status counts are zero. Empty selections return zero counts and an empty layer.
No input objects are mutated and repeated calls produce identical output.

Both functions throw `Error` for unsupported domains, non-array inputs, more
than 5,000 records, non-object entries, duplicate selected IDs, invalid selected
technique IDs/tactics, and selected records not pinned to 19.2. The public shape
requires exact domain names: `Enterprise`, `Mobile`, `ICS`.

## Verification and security boundary

Run `node --test tests/navigator.test.cjs`. Tests verify all 918 IDs and their
tactic placements, tactic order against the pinned raw STIX matrices,
generated-only status, deterministic exports, input bounds and browser-global
loading. Browser integration and upstream interactive import are separate
checks; module tests alone do not prove an upstream import was exercised.

The module has no filesystem access, network calls, persistent storage, HTML
rendering or command execution. The integrating UI must render returned strings
literally. Format references are linked; no Navigator source code or new
third-party source dataset is embedded.
