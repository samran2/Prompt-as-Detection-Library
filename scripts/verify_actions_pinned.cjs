#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowDirectory = path.join(root, '.github', 'workflows');
const allowlistPath = path.join(root, '.github', 'allowed-actions.md');
const exactCommit = /^[0-9a-f]{40}$/;

function fail(message) {
  process.stderr.write(`GitHub Actions policy failed: ${message}\n`);
  process.exitCode = 1;
}

function loadAllowlist() {
  let source;
  try {
    source = fs.readFileSync(allowlistPath, 'utf8');
  } catch {
    fail('.github/allowed-actions.md is missing or unreadable');
    return new Map();
  }
  const allowed = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{40})`\s*\|/);
    if (!match) continue;
    const [, action, sha] = match;
    if (allowed.has(action)) fail(`duplicate allowlist entry for ${action}`);
    allowed.set(action, sha);
  }
  if (allowed.size === 0) fail('allowlist contains no machine-readable action entries');
  return allowed;
}

function workflowFiles() {
  try {
    return fs.readdirSync(workflowDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && /\.ya?ml$/.test(entry.name))
      .map(entry => path.join(workflowDirectory, entry.name))
      .sort();
  } catch {
    fail('.github/workflows is missing or unreadable');
    return [];
  }
}

const allowed = loadAllowlist();
const observed = new Set();
let references = 0;

for (const file of workflowFiles()) {
  const relative = path.relative(root, file);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = line.match(/^\s*(?:-\s*)?(?:uses|["']uses["'])\s*:\s*([^\s#]+)(?:\s+#\s*(.+))?\s*$/);
    const comment = /^\s*#/.test(line);
    const explicitMappingKey = !comment && /^\s*(?:-\s*)?\?\s/.test(line);
    const escapedScalar = !comment && /\\(?:u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|x[0-9a-fA-F]{2})/.test(line);
    if (explicitMappingKey || escapedScalar) {
      fail(`${relative}:${index + 1} has unsupported workflow YAML syntax; explicit mapping keys and escaped scalars are forbidden`);
      continue;
    }
    const containsUsesToken = !comment && /\buses\b/.test(line);
    const containsActionInvocation = !comment && /(?:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.\/-]+@[^\s#]+|\.\/\.github\/|docker:\/\/)/.test(line);
    if (!match) {
      if (containsUsesToken || containsActionInvocation) fail(`${relative}:${index + 1} has unsupported uses syntax; use one literal block-style uses key per line`);
      continue;
    }
    const reference = match[1];
    if (reference.startsWith('./')) {
      const reusable = /^\.\/\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(reference);
      const target = path.resolve(root, reference);
      let stat;
      try { stat = fs.lstatSync(target); } catch { stat = null; }
      if (!reusable || !stat?.isFile() || stat.isSymbolicLink() || !target.startsWith(`${workflowDirectory}${path.sep}`)) {
        fail(`${relative}:${index + 1} has a local action reference; only checked-in reusable workflows are allowed`);
      }
      continue;
    }
    references += 1;
    const separator = reference.lastIndexOf('@');
    if (separator <= 0) {
      fail(`${relative}:${index + 1} has an invalid remote action reference`);
      continue;
    }
    const invocation = reference.slice(0, separator);
    const sha = reference.slice(separator + 1);
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?$/.test(invocation) || !exactCommit.test(sha)) {
      fail(`${relative}:${index + 1} must pin ${invocation || 'the action'} to an exact lowercase 40-character commit SHA`);
      continue;
    }
    const action = invocation.split('/').slice(0, 2).join('/');
    if (!match[2]?.trim()) fail(`${relative}:${index + 1} must retain a readable release comment`);
    if (!allowed.has(action)) fail(`${relative}:${index + 1} uses non-allowlisted action ${action}`);
    else if (allowed.get(action) !== sha) fail(`${relative}:${index + 1} does not match the reviewed SHA for ${action}`);
    observed.add(action);
  }
}

for (const action of allowed.keys()) {
  if (!observed.has(action)) fail(`allowlisted action ${action} is not used by any workflow`);
}

if (!process.exitCode) {
  process.stdout.write(`GitHub Actions policy passed: ${references} verified remote action references across ${observed.size} allowlisted actions.\n`);
}
