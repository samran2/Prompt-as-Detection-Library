'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const cli = path.resolve(__dirname, '../scripts/library_cli.cjs');
const run = args => execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });

test('defenses command exposes real OT relationships with exact source identity', () => {
  const json = JSON.parse(run(['defenses', 'T0800', '--json']));
  assert.equal(json.status, 'mapped');
  assert.equal(json.techniqueId, 'T0800');
  assert.equal(json.mappingKind, 'inferred');
  assert.match(json.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(json.techniques.length > 0);
  assert.ok(json.techniques.every(item => item.paths.every(p => p.sourceRows.length > 0)));
  const text = run(['defenses', 'T0800']);
  assert.match(text, /DEFENSIVE RESEARCH BRIEF/);
  assert.match(text, /ICS\/OT/);
  assert.match(run(['--help']), /defenses ID/);
});

test('defenses respects missing AI and PowerShell mappings and rejects unknown IDs and options', () => {
  for (const id of ['AML.T0051', 'T1059.001']) {
    const json = JSON.parse(run(['defenses', id, '--json']));
    assert.equal(json.status, 'unmapped');
    assert.deepEqual(json.techniques, []);
  }
  for (const args of [['defenses','T9999'],['defenses','T0800','--context-file','PRIVATE_VALUE'],['defenses','T0800','--json','--json']]) {
    const result = spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
    assert.equal(result.status,1);
    assert.equal(result.stdout,'');
    assert.doesNotMatch(result.stderr,/PRIVATE_VALUE/);
  }
});

test('defensive export uses the existing private exclusive output contract', t => {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'pad-d3fend-cli-')));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const output = path.join(directory,'brief.txt');
  const result = JSON.parse(run(['defenses','T0800','--output',output]));
  const content = fs.readFileSync(output);
  assert.equal(result.records,1);
  assert.equal(result.sha256,createHash('sha256').update(content).digest('hex'));
  if(process.platform!=='win32') assert.equal(fs.statSync(output).mode & 0o777,0o600);
  assert.equal(spawnSync(process.execPath,[cli,'defenses','T0800','--output',output]).status,1);
  assert.deepEqual(fs.readFileSync(output),content);
});
