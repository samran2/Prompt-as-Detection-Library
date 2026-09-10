'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const api = require('../demo/workspace.js');
const core = require('../demo/core.js');
const catalog = require('../demo/catalog.js');
const sources = {attack:'19.2',atlas:'2026.08',d3fend:'1.6.0',car:'1b922fe1527d956e222a99473472e594f10f610b',attackFlow:'2.0.0'};
const create = () => api.create('Research workspace', sources);
async function draft(record = catalog[0]) {
  const mode = 'detect', target = core.TARGETS[0], context = 'Synthetic original context';
  const template = core.composePrompt(record, {mode,target,context});
  return {techniqueId:record.id,mode,target,context,template,templateSha256:await api.hash(template),text:template+'\nAnalyst edit'};
}

test('workspace defaults and round trips preserve literal text and isolate input objects', async () => {
  const w = create(); w.drafts.push(await draft());
  w.context = 'Applied ${HOME} <script>inert</script>'; w.contextInput = '  unapplied\ntext  ';
  const copied = api.validate(w);
  assert.deepEqual(api.parse(api.serialize(w)), w);
  assert.notEqual(copied, w); assert.notEqual(copied.drafts[0],w.drafts[0]);
  copied.drafts[0].text='changed'; assert.notEqual(copied.drafts[0].text,w.drafts[0].text);
  assert.equal(w.view.target,core.TARGETS[0]); assert.equal(w.view.domain,'');
  assert.equal(w.view.paneWidth,330); assert.equal(w.view.tab,'prompt');
  assert.notEqual(w.id,create().id);
});

test('workspace rejects unknown keys and claims at every contract boundary', async () => {
  const w=create(); w.drafts.push(await draft());
  w.collections.push({id:crypto.randomUUID(),name:'Collection',techniqueIds:[catalog[0].id]});
  for (const path of [[],['view'],['sources'],['flow'],['drafts',0],['collections',0]]) {
    const value=structuredClone(w); let target=value; for (const key of path) target=target[key];
    target.validation='field-confirmed'; assert.throws(()=>api.validate(value),/unsupported|field/i);
  }
  const duplicate=structuredClone(w); duplicate.drafts.push({...duplicate.drafts[0]});
  assert.throws(()=>api.validate(duplicate),/duplicate/i);
  assert.throws(()=>api.parse(api.serialize(w).replace('"schemaVersion":1','"schemaVersion":2')),/schemaVersion/);
});

test('IDs, allowlists, lengths and collection/flow limits are exact', () => {
  for (const bad of [null,[],{},'workspace']) assert.throws(()=>api.validate(bad));
  for (const patch of [{name:' '},{name:'x'.repeat(121)},{id:'not-uuid'},{context:'x'.repeat(4001)},{favorites:['T1001\n']},{favorites:['T1001','T1001']}]) assert.throws(()=>api.validate({...create(),...patch}));
  for (const patch of [{mode:'execute'},{target:'unknown'},{tab:'review'},{paneWidth:239},{paneWidth:481},{paneWidth:NaN},{listScroll:-1},{mobileView:'secret'},{compare:['T0001','T0002','T0003']}]) assert.throws(()=>api.validate({...create(),view:{...create().view,...patch}}));
  const unknown=create(); unknown.favorites=['T9999','AML.T9999.001']; assert.deepEqual(api.validate(unknown).favorites,unknown.favorites);
  const repeat=create(); repeat.flow.steps=Array(20).fill('T1001'); api.validate(repeat);
  repeat.flow.steps.push('T1001'); assert.throws(()=>api.validate(repeat));
  const collection=create(); collection.collections=Array.from({length:101},()=>({id:crypto.randomUUID(),name:'Collection',techniqueIds:[]}));
  assert.throws(()=>api.validate(collection));
});

test('JSON and programmatic boundaries enforce UTF-8 bytes, depth, plain data and no coercion', () => {
  const w=create(); let invoked=false;
  Object.defineProperty(w,'name',{get(){invoked=true;return'Executed';}});
  assert.throws(()=>api.validate(w)); assert.equal(invoked,false);
  assert.throws(()=>api.validate({...create(),name:{toString(){invoked=true;return'Executed';}}})); assert.equal(invoked,false);
  const cyclic=create(); cyclic.view.self=cyclic; assert.throws(()=>api.validate(cyclic));
  const custom=Object.assign(Object.create(Object.create(null)),create());
  assert.throws(()=>api.validate(custom),/plain JSON/);
  assert.throws(()=>api.parse('['.repeat(40)+'0'+']'.repeat(40)),/depth|structure/);
  assert.throws(()=>api.parse(' '.repeat(5*1024*1024+1)),/size|byte/i);
  assert.throws(()=>api.parse('"'+'😀'.repeat(1400000)+'"'),/size|byte/i);
  assert.throws(()=>api.validate({...create(),name:'x\u0000'}));
  const polluted=JSON.parse(api.serialize(create()).replace('"name":"Research workspace"','"name":"Research workspace","__proto__":{"polluted":true}'));
  assert.throws(()=>api.validate(polluted)); assert.equal({}.polluted,undefined);
});

test('duplicate JSON members, including escaped aliases, cannot silently replace saved values', () => {
  const serialized=api.serialize(create());
  for (const member of ['"name":"first","name":"Research workspace"','"na\\u006de":"first","name":"Research workspace"']) {
    assert.throws(()=>api.parse(serialized.replace('"name":"Research workspace"',member)),/duplicate/i);
  }
  const w=create(); w.context='Literal {"name":"a","name":"b"} stays data';
  assert.deepEqual(api.parse(api.serialize(w)),w);
});

test('aggregate draft bytes and all array caps reject oversized or ambiguous workspaces', () => {
  const makeDraft=n=>({techniqueId:`T${String(n).padStart(4,'0')}`,mode:'detect',target:core.TARGETS[0],text:'',template:'',templateSha256:'0'.repeat(64),context:''});
  const w=create(); w.drafts=Array.from({length:1000},(_,n)=>makeDraft(n)); api.validate(w);
  w.drafts.push(makeDraft(1000)); assert.throws(()=>api.validate(w),/array limit/i);
  w.drafts=Array.from({length:14},(_,n)=>({...makeDraft(n),text:'x'.repeat(200*1024),template:'x'.repeat(200*1024)}));
  assert.throws(()=>api.validate(w),/byte size/i);
  w.drafts=[{...makeDraft(1),text:'x'.repeat(200*1024+1)}]; assert.throws(()=>api.validate(w),/length/i);
  const c={id:crypto.randomUUID(),name:'Collection',techniqueIds:[]}; w.drafts=[];w.collections=[c,{...c}];
  assert.throws(()=>api.validate(w),/Duplicate.*collection/i);
});

test('inspection verifies original template hash and reports drift without rebasing drafts', async () => {
  const w=create(); w.drafts=[await draft()]; const original=api.serialize(w);
  const clean=await api.inspect(w,catalog,core,sources); assert.deepEqual(clean,{warnings:[],unresolved:[]});
  const tampered=api.parse(original); tampered.drafts[0].template+='change';
  await assert.rejects(()=>api.inspect(tampered,catalog,core,sources),/hash|integrity/i);
  const outdated=api.parse(original); outdated.drafts[0].template='Previous literal template'; outdated.drafts[0].templateSha256=await api.hash(outdated.drafts[0].template);
  const changed=await api.inspect(outdated,catalog,core,{...sources,car:'new-commit'});
  assert.ok(changed.warnings.some(x=>x.code==='template-changed'));
  assert.ok(changed.warnings.some(x=>x.code==='source-version-mismatch'&&x.source==='car'));
  assert.equal(outdated.drafts[0].template,'Previous literal template'); assert.equal(api.serialize(w),original);
});

test('unresolved references survive every surface and are never validation claims', async () => {
  const w=create(); const d=await draft(); d.techniqueId='T9999'; w.drafts=[d];
  w.favorites=['T9999']; w.collections=[{id:crypto.randomUUID(),name:'Unknown',techniqueIds:['AML.T9999']}];
  w.flow.steps=['T9998','T9999']; w.view.technique='T9997'; w.view.compare=['T9996'];
  const result=await api.inspect(w,catalog,core,sources);
  assert.deepEqual(result.unresolved,['AML.T9999','T9996','T9997','T9998','T9999']);
  assert.ok(result.warnings.some(x=>x.code==='unresolved-technique'));
  assert.equal(w.drafts[0].text,d.text); assert.equal(w.drafts[0].template,d.template);
  assert.equal(Object.hasOwn(result,'validation'),false);
});

test('warning text is capped without dropping unresolved references', async () => {
  const w=create(); w.favorites=Array.from({length:1115},(_,n)=>`T${String(n+8000).padStart(4,'0')}`);
  const result=await api.inspect(w,[],core,sources);
  assert.equal(result.unresolved.length,1115);
  assert.equal(result.warnings.length,201);
  assert.equal(result.warnings.at(-1).code,'additional-warnings');
  assert.equal(result.warnings.at(-1).count,915);
});

test('hash matches SHA-256 and UMD requires no DOM storage or network', async () => {
  assert.equal(await api.hash('å\n${context}'),crypto.createHash('sha256').update('å\n${context}').digest('hex'));
  const browser=vm.createContext({crypto:crypto.webcrypto,PAD:core,TextEncoder});
  vm.runInContext(fs.readFileSync(require.resolve('../demo/workspace.js'),'utf8'),browser);
  browser.sourceJSON=JSON.stringify(sources);
  const w=vm.runInContext('PAD_WORKSPACE.create("Browser",JSON.parse(sourceJSON))',browser);
  assert.equal(browser.PAD_WORKSPACE.parse(browser.PAD_WORKSPACE.serialize(w)).name,'Browser');
  assert.equal(await browser.PAD_WORKSPACE.hash('test'),await api.hash('test'));
  const schema=JSON.parse(fs.readFileSync(require.resolve('../packages/schemas/workspace.schema.json'),'utf8'));
  assert.deepEqual(api.SCHEMA,schema);
});
