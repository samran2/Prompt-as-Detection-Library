# Rösti local research enrichment

This optional integration relates a Rösti report to this library only when the
Rösti API returns an explicit active ATT&CK technique ID. It never infers an
ATT&CK mapping from an IOC, title, malware family, tag, or prose. Unsupported,
historical, tactic, group, software, and unknown IDs remain explicitly unmapped.

Rösti's public API documentation describes API v2, cursor pagination, report IOC
and MITRE-ID relationships, and an `X-API-Key` header. The published OpenAPI 3.1.1
document was version 2.8.1 and declared MIT on 2026-09-08. That API-level license
does not erase copyright or license obligations attached to each underlying
publisher report, YARA rule, or other third-party item. Review item-level rights
before redistribution.

## Safe local use

Use Node.js 22 or later. Inject the key into `ROSTI_API_KEY` with a trusted secret
manager; never type it into a command or add it to shell history, an `.env` file,
source, an issue, or a test fixture.

```sh
node scripts/rosti_sync.cjs \
  --report Ab12Cd34 \
  --output /absolute/private/path/rosti-enrichment.json
```

The command contacts only `https://api.rosti.dev/v2`, refuses redirects, limits
decoded JSON, pagination and IOC counts, and creates a mode-0600 output without
overwriting. By default it stores only IOC counts, types, categories, IDS
suitability and reported false-positive risk—not IOC values. The explicit
`--include-ioc-values` switch is for local research only.

Rösti mappings are labelled `external-corroboration` and `unvalidated`. They do
not satisfy either human-review slot, lab validation, field confirmation, or the
stable-release gate. Dynamic enrichment output belongs outside the repository.

Sources: [Rösti reports](https://rosti.dev/reports),
[Rösti IOCs](https://rosti.dev/iocs), and
[Rösti API v2 documentation](https://docs.rosti.dev/).
