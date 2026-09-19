'use strict';
// Developer-only QA routing; never included in the public static bundle.
const path = require('node:path');
const { fileURLToPath } = require('node:url');

function parseUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 4096 || /[\u0000-\u0020\u007f\\]/.test(raw)) throw new Error('Invalid URL');
  const url = new URL(raw);
  if (url.username || url.password || /%2f|%5c/i.test(url.pathname)) throw new Error('Invalid URL');
  return url;
}

function createBrowserBoundary(raw, { fileRoot } = {}) {
  let base;
  try {
    base = parseUrl(raw);
    if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
      || raw.includes('?') || raw.includes('#') || !base.pathname.endsWith('/')) throw new Error('Invalid base');
  } catch {
    // Do not expose a malformed input's credentials or query via URL errors.
    throw new Error('QA requires a plain loopback HTTP directory URL.');
  }
  const localRoot = fileRoot ? path.resolve(fileRoot) : null;
  return Object.freeze({
    base: base.href,
    basePath: base.pathname,
    allowsRequest(rawUrl) {
      try {
        const url = parseUrl(rawUrl);
        if (url.protocol === 'blob:') return url.origin === base.origin || Boolean(localRoot && url.origin === 'null');
        if (url.protocol === 'file:' && localRoot) {
          const relative = path.relative(localRoot, fileURLToPath(url));
          return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
        }
        return url.origin === base.origin && url.pathname.startsWith(base.pathname);
      } catch { return false; }
    },
  });
}

// Reports are portable artifacts. Keep diagnostic occurrence counts, but leave
// arbitrary browser text and request URLs in the local runner's failure output.
function reportDiagnostics({ errors = [], externalRequests = [], failure = null } = {}) {
  return {
    errors: errors.map(() => 'Browser console or page error.'),
    externalRequests: externalRequests.map(() => 'Blocked out-of-scope browser request.'),
    failure: failure ? 'Browser QA failed; inspect local runner output.' : null,
  };
}

module.exports = { createBrowserBoundary, reportDiagnostics };
