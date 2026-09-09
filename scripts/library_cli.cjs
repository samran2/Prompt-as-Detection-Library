#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const core = require('../demo/core.js');
const records = require('../demo/catalog.js');

const FILTER_FLAGS = ['query', 'domain', 'tactic', 'platform', 'framework'];
const PROMPT_FLAGS = ['mode', 'target', 'context-file', 'output'];
const COMMAND_FLAGS = {
  list: [...FILTER_FLAGS, 'json'],
  prompt: PROMPT_FLAGS,
  export: [...FILTER_FLAGS, ...PROMPT_FLAGS],
};
const MAX_CONTEXT_BYTES = 16000;
const HELP = `Independently rebuilt ATT&CK 19.2 and MITRE ATLAS prompt library (Node.js 22+)

Usage:
  node scripts/library_cli.cjs list [filters] [--json]
  node scripts/library_cli.cjs prompt ID [prompt options] [--output NEW_FILE]
  node scripts/library_cli.cjs export [filters] [prompt options] --output NEW_FILE

Filters: --query TEXT --domain NAME --tactic NAME --platform NAME --framework NAME
  Domain: Enterprise, Mobile, ICS, ATLAS. OT is a supported alias for ICS.
  Framework: ATT&CK (default), ATLAS, all. Quote 'ATT&CK' in a shell.
  --domain ATLAS selects the AI catalog unless --framework is supplied.
  Default list/export contains only the 918 ATT&CK records.
  prompt AML.T#### or AML.T####.### selects an ATLAS technique directly.
  Tactics and platforms use catalog spelling.
  Use --platform __unspecified__ when the source lists no platform or None.
  Filters combine; list --json prints a metadata array, including an empty array.
  Query text is limited to 1,000 characters.

Prompt options:
  --mode ${Object.keys(core.MODES).join('|')} (default: detect)
  --target NAME (default: Platform-neutral)
  Targets: ${core.TARGETS.join(', ')}
  --context-file FILE (literal UTF-8, at most 4,000 JavaScript characters;
    at most 16,000 bytes read, no terminal controls, symbolic links or
    non-regular files)

Output:
  Prompt text goes to stdout unless --output names a new file.
  Export writes JSONL for all selected records, with prompt_sha256 metadata.
  File output prints JSON {records, sha256} on stdout after the write succeeds.
  SHA-256 uses exact UTF-8 prompt bytes; the file checksum covers exact file bytes.
  JSONL rows end in LF; an empty selection creates an empty file.
  The output parent must exist. Symbolic-link output paths are rejected;
  use a real path (for example /private/tmp instead of /tmp on macOS).
  File publication is atomic and exclusive: existing files are never replaced.
  Files use owner-only permissions. No checksum sidecar is created.

All prompts are unvalidated drafts. No model calls, network access or execution.
Use --help, -h, or COMMAND --help to show this text.
`;

class CLIError extends Error {}

function catalogFor(options) {
  const framework = options.framework || (options.domain === 'ATLAS' ? 'ATLAS' : 'ATT&CK');
  if (framework === 'ATT&CK') return records;
  const atlas = require('../demo/atlas-catalog.js');
  return framework === 'ATLAS' ? atlas : [...records, ...atlas];
}

function parseArguments(argv) {
  if (argv.length === 1 && ['--help', '-h', 'help'].includes(argv[0])) return { help: true };
  const [command, ...tokens] = argv;
  if (!Object.hasOwn(COMMAND_FLAGS, command)) throw new CLIError('Unknown or missing command; use --help.');
  if (tokens.length === 1 && ['--help', '-h'].includes(tokens[0])) return { help: true };
  const options = Object.create(null);
  const positional = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const separator = token.indexOf('=');
    const name = token.slice(2, separator === -1 ? undefined : separator);
    if (!COMMAND_FLAGS[command].includes(name)) throw new CLIError('Unknown option for this command; use --help.');
    if (Object.hasOwn(options, name)) throw new CLIError('Duplicate option; provide each option once.');
    if (name === 'json') {
      if (separator !== -1) throw new CLIError('The --json option does not take a value.');
      options.json = true;
      continue;
    }
    const value = separator === -1 ? tokens[++index] : token.slice(separator + 1);
    if (value === undefined || value.startsWith('--') || value === '-h') throw new CLIError('Missing option value; use --help.');
    if (value.includes('\0') || value.length > 4096) throw new CLIError('Invalid option value.');
    options[name] = value;
  }
  if (command === 'prompt') {
    if (positional.length !== 1 || !/^(?:T\d{4}|AML\.T\d{4})(?:\.\d{3})?$/.test(positional[0])) {
      throw new CLIError('Supply one valid technique ID, such as T1059.001 or AML.T0051.');
    }
  } else if (positional.length) throw new CLIError('Unexpected positional argument; use --help.');
  if (command === 'export' && !options.output) throw new CLIError('Export requires --output with a new file path.');
  for (const name of ['context-file', 'output']) {
    if (Object.hasOwn(options, name) && (!options[name].trim() || options[name] === '-')) {
      throw new CLIError('File options require a nonempty file path.');
    }
  }
  if (options.query?.length > 1000) throw new CLIError('Query exceeds the 1,000-character limit.');
  if (options.domain !== undefined) options.domain = core.normalizeDomain(options.domain);
  if (options.framework !== undefined && !['ATT&CK', 'ATLAS', 'all'].includes(options.framework)) {
    throw new CLIError('Unsupported framework; use ATT&CK, ATLAS or all.');
  }
  if (options.domain && ((options.framework === 'ATLAS' && options.domain !== 'ATLAS') ||
    (options.framework === 'ATT&CK' && options.domain === 'ATLAS'))) {
    throw new CLIError('Framework and domain filters must agree.');
  }
  const catalog = catalogFor(options);
  const canonicalDomains = ['Enterprise', 'Mobile', 'ICS', 'ATLAS'];
  for (const [name, values] of [
    ['domain', canonicalDomains],
    ['tactic', catalog.flatMap(record => record.tactics)],
    ['platform', ['__unspecified__', ...catalog.flatMap(record => record.platforms)]],
  ]) {
    if (Object.hasOwn(options, name) && !values.includes(options[name])) throw new CLIError('Unsupported filter value; use catalog spelling.');
  }
  if (options.mode !== undefined && !Object.hasOwn(core.MODES, options.mode)) throw new CLIError('Unsupported mode; use --help.');
  if (options.target !== undefined && !core.TARGETS.includes(options.target)) throw new CLIError('Unsupported target; use --help.');
  return { command, id: positional[0], options };
}

function readContext(filename) {
  if (filename === undefined) return '';
  let descriptor;
  try {
    if (!fs.lstatSync(filename).isFile()) throw new CLIError('Context must be a regular file, not a symbolic link.');
    descriptor = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile()) throw new CLIError('Context must be a regular file.');
    if (stat.size > MAX_CONTEXT_BYTES) throw new CLIError('Context exceeds the 16,000-byte limit.');
    // A bounded read also handles a file growing after its initial size check.
    const buffer = Buffer.alloc(MAX_CONTEXT_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = fs.readSync(descriptor, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > MAX_CONTEXT_BYTES) throw new CLIError('Context exceeds the 16,000-byte limit.');
    let context;
    try {
      context = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, length));
    } catch {
      throw new CLIError('Context must contain valid UTF-8 text.');
    }
    if (context.length > 4000) throw new CLIError('Context exceeds the 4,000-character limit.');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(context)) {
      throw new CLIError('Context contains terminal control characters.');
    }
    return context;
  } catch (error) {
    if (error instanceof CLIError) throw error;
    throw new CLIError('Context could not be read; use an accessible regular UTF-8 file.');
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function outputParent(filename) {
  const destination = path.resolve(filename);
  const parent = path.dirname(destination);
  let current = path.parse(parent).root;
  for (const part of parent.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new CLIError('Output parent must be an existing directory without symbolic links.');
  }
  return { destination, parent, stat: fs.statSync(parent) };
}

function writeNewFile(filename, content) {
  let temporary;
  let descriptor;
  let created = false;
  try {
    const { destination, parent, stat } = outputParent(filename);
    temporary = path.join(parent, `.pad-export-${randomUUID()}.tmp`);
    descriptor = fs.openSync(temporary, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    created = true;
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    const checked = outputParent(filename);
    if (checked.stat.dev !== stat.dev || checked.stat.ino !== stat.ino) throw new CLIError('Output directory changed during the write.');
    // link, unlike rename, atomically refuses any existing destination, including
    // a dangling symlink. The complete file becomes visible in one operation.
    fs.linkSync(temporary, destination);
  } catch (error) {
    if (error instanceof CLIError) throw error;
    if (error.code === 'EEXIST') throw new CLIError('Output already exists; choose a new file path.');
    throw new CLIError('Output could not be written; use an existing writable directory without symbolic links.');
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (created) fs.unlinkSync(temporary);
  }
}

function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function main(argv = process.argv.slice(2)) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new CLIError('Node.js 22 or later is required.');
  const parsed = parseArguments(argv);
  if (parsed.help) return HELP;
  const { command, id, options } = parsed;
  const selected = core.filterTechniques(catalogFor(options), options);
  if (command === 'list') {
    const metadata = selected.map(record => ({ id: record.id, name: record.name,
      domain: record.domain, tactics: record.tactics, platforms: record.platforms,
      ...(record.framework === 'ATLAS' ? { framework: 'ATLAS', atlas_version: record.atlasVersion } : {}) }));
    if (options.json) return JSON.stringify(metadata, null, 2) + '\n';
    return metadata.map(record => `${record.id}\t${record.name}\t${record.domain}`).join('\n') + (metadata.length ? '\n' : '');
  }
  const record = command === 'prompt'
    ? catalogFor({ framework: id.startsWith('AML.') ? 'ATLAS' : 'ATT&CK' }).find(item => item.id === id) : undefined;
  if (command === 'prompt' && !record) throw new CLIError('Unknown technique ID in this catalog.');
  const promptOptions = { mode: options.mode, target: options.target, context: readContext(options['context-file']) };
  let content;
  if (command === 'prompt') content = core.composePrompt(record, promptOptions);
  else {
    // Composition and provenance belong to the shared core. Node adds only hash
    // metadata, so browser and command-line prompts remain byte-identical.
    const jsonl = core.exportJSONL(selected, promptOptions);
    content = jsonl ? jsonl.trimEnd().split('\n').map(line => {
      const row = JSON.parse(line);
      return JSON.stringify({ ...row, prompt_sha256: sha256(row.prompt) });
    }).join('\n') + '\n' : '';
  }
  if (options.output === undefined) return content;
  writeNewFile(options.output, content);
  return JSON.stringify({ records: command === 'prompt' ? 1 : selected.length, sha256: sha256(content) }) + '\n';
}

if (require.main === module) {
  process.stdout.on('error', () => { process.exitCode = 1; });
  try {
    process.stdout.write(main());
  } catch (error) {
    const message = error instanceof CLIError ? error.message : 'Operation failed; verify the local catalog, input files and output directory.';
    process.stderr.write(`Error: ${message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { main };
