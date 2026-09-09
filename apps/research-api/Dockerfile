FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:774b7d020b24214835769e24c3544835526cd0288f0b094eae48e8b2c2429a79

LABEL org.opencontainers.image.title="Prompt-as-Detection Research API" \
      org.opencontainers.image.description="Read-only reference API for pinned public research data" \
      org.opencontainers.image.source="https://github.com/samran2/Prompt-as-Detection-Library" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    PAD_API_HOST=0.0.0.0 \
    PORT=8781
WORKDIR /srv/prompt-as-detection

COPY --chown=65532:65532 apps/research-api ./apps/research-api
COPY --chown=65532:65532 packages/core ./packages/core
COPY --chown=65532:65532 demo/catalog.js ./demo/catalog.js
COPY --chown=65532:65532 library/prompts ./library/prompts
COPY --chown=65532:65532 content/prompts/index.json ./content/prompts/index.json
COPY --chown=65532:65532 content/atlas/catalog.json ./content/atlas/catalog.json
COPY --chown=65532:65532 content/atlas/index.json ./content/atlas/index.json
COPY --chown=65532:65532 content/atlas/coverage.json ./content/atlas/coverage.json
COPY --chown=65532:65532 content/atlas/prompts ./content/atlas/prompts
COPY --chown=65532:65532 sources/attack-19.2/manifest.json ./sources/attack-19.2/manifest.json
COPY --chown=65532:65532 sources/attack-19.2/raw/LICENSE.txt ./licenses/ATTACK-DATA-LICENSE.txt
COPY --chown=65532:65532 sources/atlas-2026.08/manifest.json ./sources/atlas-2026.08/manifest.json
COPY --chown=65532:65532 sources/atlas-2026.08/raw/LICENSE.txt ./licenses/ATLAS-DATA-LICENSE.txt
COPY --chown=65532:65532 sources/atlas-2026.08/raw/APACHE-2.0.txt ./licenses/ATLAS-APACHE-2.0.txt
COPY --chown=65532:65532 LICENSE ./licenses/PROJECT-LICENSE.txt
COPY --chown=65532:65532 package.json ./package.json

USER 65532:65532
EXPOSE 8781
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:8781/v1/versions?pageSize=1').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["apps/research-api/src/server.mjs"]
