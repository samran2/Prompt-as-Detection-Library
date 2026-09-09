#!/usr/bin/env node
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {loadAtlasResearchCatalog, loadResearchCatalog} from './catalog-adapter.mjs';
import {createResearchApiHandler} from './handler.mjs';

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);
const EXPLICIT_BIND = new Set([...LOOPBACK, '0.0.0.0', '::']);

function configuration(environment = process.env) {
  const host = environment.PAD_API_HOST || '127.0.0.1';
  const rawPort = environment.PORT || '8781';
  if (!EXPLICIT_BIND.has(host)) throw new Error('PAD_API_HOST must name an explicitly supported bind address');
  if (!/^[1-9]\d{0,4}$/.test(rawPort) || Number(rawPort) > 65_535) throw new Error('PORT must be an integer from 1 through 65535');
  return {host, port: Number(rawPort), isLoopback: LOOPBACK.has(host)};
}

export async function startReferenceServer({environment = process.env, root} = {}) {
  const config = configuration(environment);
  const catalog = loadResearchCatalog(root === undefined ? {} : {root});
  const atlasCatalog = loadAtlasResearchCatalog(root === undefined ? {} : {root});
  const server = createServer({maxHeaderSize: 16 * 1024, requestTimeout: 5_000, headersTimeout: 5_000},
    createResearchApiHandler({catalog, atlasCatalog}));
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 1_000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  return {server, catalog, atlasCatalog, config};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const {server, config} = await startReferenceServer();
    const printableHost = config.host.includes(':') ? `[${config.host}]` : config.host;
    process.stdout.write(`${JSON.stringify({event: 'research-api-listening', url: `http://${printableHost}:${config.port}/v1/techniques`, loopback: config.isLoopback})}\n`);
    const close = () => server.close(() => process.exit(0));
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
  } catch {
    process.stderr.write('Research API failed to start. Verify the local catalog and safe bind configuration.\n');
    process.exitCode = 1;
  }
}
