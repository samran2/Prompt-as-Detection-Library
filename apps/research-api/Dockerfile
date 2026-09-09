FROM node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf

LABEL org.opencontainers.image.title="Prompt-as-Detection Research API" \
      org.opencontainers.image.description="Read-only reference API for pinned public research data" \
      org.opencontainers.image.source="https://github.com/samran2/Prompt-as-Detection-Library" \
      org.opencontainers.image.licenses="MIT"

ENV NODE_ENV=production \
    PAD_API_HOST=0.0.0.0 \
    PORT=8781
WORKDIR /srv/prompt-as-detection

COPY --chown=node:node apps/research-api ./apps/research-api
COPY --chown=node:node packages/core ./packages/core
COPY --chown=node:node demo/catalog.js ./demo/catalog.js
COPY --chown=node:node library/prompts ./library/prompts
COPY --chown=node:node content/prompts/index.json ./content/prompts/index.json
COPY --chown=node:node sources/attack-19.2/manifest.json ./sources/attack-19.2/manifest.json
COPY --chown=node:node sources/attack-19.2/raw/LICENSE.txt ./licenses/ATTACK-DATA-LICENSE.txt
COPY --chown=node:node LICENSE ./licenses/PROJECT-LICENSE.txt
COPY --chown=node:node package.json ./package.json

USER node
EXPOSE 8781
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8781/v1/versions?pageSize=1').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/research-api/src/server.mjs"]
