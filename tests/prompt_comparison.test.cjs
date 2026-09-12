'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync}=require('node:child_process');
const comparison = require('../packages/core/prompt-comparison.cjs');

const pricing = () => ({ schemaVersion: 1, currency: 'USD', model: 'test-model-2026-01-01',
  inputUsdPerMillion: 2, outputUsdPerMillion: 8, maxInputTokens: 128000,
  verifiedAt: new Date().toISOString(), sourceUrl: 'https://openai.com/api/pricing/', operatorVerified: true });
const response = (overrides = {}) => ({ id: 'resp_test', model: 'test-model-2026-01-01', status: 'completed',
  created_at: 1800000000, output: [{type:'message',role:'assistant',content:[{type:'output_text',text:'Draft only.'}]}],
  usage:{input_tokens:50,output_tokens:10,total_tokens:60}, ...overrides });

test('pricing requires explicit verified positive current costs for the exact model', () => {
  assert.equal(comparison.validatePricing(pricing(), 'test-model-2026-01-01').currency, 'USD');
  for (const patch of [{inputUsdPerMillion:0},{operatorVerified:false},{model:'another'},
    {verifiedAt:'2001-01-01T00:00:00.000Z'},{sourceUrl:'https://attacker.invalid/pricing'}]) {
    assert.throws(() => comparison.validatePricing({...pricing(),...patch}, 'test-model-2026-01-01'));
  }
});

test('request is bounded, fixed-origin, non-storing, non-streaming and tool-free', async () => {
  let request;
  const result = await comparison.requestResponse({prompt:'Public synthetic example',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},
    async (url, options) => { request={url,options}; return new Response(JSON.stringify(response())); });
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.redirect, 'error');
  const body=JSON.parse(request.options.body);
  assert.equal(body.store,false); assert.equal(body.stream,false); assert.equal(body.background,false);
  assert.deepEqual(body.tools,[]); assert.equal(body.tool_choice,'none'); assert.equal(body.max_output_tokens,100);
  assert.equal(result.text,'Draft only.'); assert.equal(result.usage.input_tokens,50);
});

test('provider errors never expose arbitrary exception details or credential echoes', async () => {
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},
    async () => { throw new Error('unit-test-credential'); }), /Request outcome unknown/);
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},
    async () => new Response(JSON.stringify(response({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'unit-test-credential'}]}]})))), /Unsafe provider response/);
});

test('malformed, oversized, non-JSON, incomplete and mismatched model responses fail closed', async () => {
  for (const body of ['not json', JSON.stringify(response({usage:null})), JSON.stringify(response({model:'unexpected'})),
    JSON.stringify(response({status:'incomplete'})), 'x'.repeat(1024*1024+1)]) {
    await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},async()=>new Response(body)));
  }
});

function directory(t) {
  const dir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'pad-comparison-test-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true})); return dir;
}

test('prepare pins old composer and provides forty balanced cases with two repeats of both arms', () => {
  const plan = comparison.prepare();
  assert.equal(plan.evidenceKind,'not-run'); assert.equal(plan.items.length,160);
  assert.equal(plan.baseline.commit,comparison.BASELINE_COMMIT);
  assert.equal(plan.baseline.sha256,comparison.BASELINE_SHA256);
  for (const domain of ['Enterprise','Mobile','ICS','ATLAS']) assert.equal(new Set(plan.items.filter(item=>item.domain===domain).map(item=>item.caseId)).size,10);
  assert.equal(new Set(plan.items.map(item=>item.target)).size,6);
  assert.equal(new Set(plan.items.map(item=>item.mode)).size,4);
  assert.equal(plan.items.filter(item=>!item.expected.missingInput).length,32);
  assert.equal(new Set(plan.items.filter(item=>!item.expected.missingInput).map(item=>item.target)).size,6);
  for (const item of plan.items) assert.equal(item.promptSha256,comparison.sha256(item.prompt));
  assert.deepEqual(comparison.validatePlan(plan),plan);
  const tampered=structuredClone(plan); tampered.items[0].prompt+=' private log data';
  assert.throws(()=>comparison.validatePlan(tampered),/pinned synthetic/);
});

test('preparation writes private new files and refuses overwrite or symlink parent', t => {
  const dir=directory(t), output=path.join(dir,'prepared');
  comparison.writePreparation(output);
  assert.equal(fs.statSync(path.join(output,'prepared.json')).mode & 0o777,0o600);
  assert.throws(()=>comparison.writePreparation(output));
  fs.symlinkSync(output,path.join(dir,'link'));
  assert.throws(()=>comparison.writePreparation(path.join(dir,'link','bad')),/symbolic|symlink/i);
});

test('mock run reserves budget before network and resumes without repeating completed requests', async t => {
  const output=path.join(directory(t),'prepared'); comparison.writePreparation(output);
  let calls=0;
  const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:100,maxOutputTokens:100};
  const result=await comparison.run(options,{fetch:async()=>{calls++; return new Response(JSON.stringify(response()));}, key:'unit-test-credential'});
  assert.equal(calls,160); assert.equal(result.evidenceKind,'mock'); assert.equal(result.completed,160);
  const resumed=await comparison.run({...options,resume:true},{fetch:async()=>{calls++; throw Error('must not call');},key:'unit-test-credential'});
  assert.equal(resumed.completed,160); assert.equal(calls,160);
});

test('uncertain requests never retry and retain full reserved cost after resume', async t => {
  const output=path.join(directory(t),'prepared'); comparison.writePreparation(output);
  let calls=0; const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:100,maxOutputTokens:100};
  const transport={fetch:async()=>{calls++;throw Error('private transport detail');},key:'unit-test-credential'};
  await assert.rejects(comparison.run(options,transport),/unknown/i);
  await assert.rejects(comparison.run({...options,resume:true},transport),/uncertain|unknown/i);
  assert.equal(calls,1);
  const journal=comparison.inspectRun(output);
  assert.equal(journal.unknown,1); assert.ok(journal.reservedCostUsd>0);
});

test('budget too small prevents every API call and invalid costs do not create run state', async t => {
  const output=path.join(directory(t),'prepared'); comparison.writePreparation(output);
  let calls=0;
  const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:0.0001,maxOutputTokens:100};
  const result=await comparison.run(options,{fetch:async()=>{calls++;return new Response(JSON.stringify(response()));},key:'unit-test-credential'});
  assert.equal(calls,0); assert.equal(result.completed,0); assert.equal(result.stopReason,'budget');
});

test('offline report keeps lexical observations separate from semantic and human review', async t => {
  const dir=directory(t), input=path.join(dir,'prepared'); comparison.writePreparation(input);
  const report=comparison.report({input,output:path.join(dir,'report')});
  assert.equal(report.summary.evidenceKind,'not-run'); assert.equal(report.summary.completed,0);
  assert.equal(report.items[0].syntax.status,'not-assessed');
  assert.equal(report.items[0].humanReview.status,'not-assessed');
  const blind=JSON.parse(fs.readFileSync(path.join(dir,'report','blind-review.json'),'utf8'));
  assert.equal(blind.pairs.length,80);
  assert.ok(blind.pairs.every(pair=>!Object.hasOwn(pair.A,'arm')&&!Object.hasOwn(pair.B,'arm')));
  assert.doesNotMatch(JSON.stringify(blind),/PAD-v|baseline|candidate|\.old|\.new/);
});

async function recordedAnswer(t,text) {
  const dir=directory(t), input=path.join(dir,'prepared'); comparison.writePreparation(input);
  const options={input,model:pricing().model,pricing:pricing(),maxCostUsd:0.27,maxOutputTokens:100};
  const result=await comparison.run(options,{key:'unit-test-credential',fetch:async()=>new Response(JSON.stringify(
    response({output:[{type:'message',role:'assistant',content:[{type:'output_text',text}]}]})))});
  assert.equal(result.completed,1);
  return {input,output:path.join(dir,'report')};
}

test('recorded answers retain literal sections, fenced labels and prose observations',async t=>{
  const text='1. Summary\n## **2) Draft\n``` kql \n3. Code marker\n```\n4. Missing input\nBefore```inline```after';
  const report=comparison.report(await recordedAnswer(t,text));
  const observations=report.items.find(item=>item.response).observations;
  assert.deepEqual(observations.sectionMarkers,[true,true,true,true]);
  assert.equal(observations.codeBlockCount,1);
  assert.deepEqual(observations.codeBlockLabels,['kql']);
  assert.equal(observations.explanationWords,9);
  assert.equal(observations.missingInputLanguageObserved,true);
  assert.equal(observations.status,'observed-not-scored');
});

test('report preserves newline, inline-fence and unmatched-fence edge cases',async t=>{
  const examples=[
    {text:'1.\n2)\n3.\n4)',sections:[true,true,true,false],labels:[],words:4},
    {text:'alpha```inline```beta gamma',sections:[false,false,false,false],labels:[],words:2},
    {text:'alpha ```js\nbeta gamma',sections:[false,false,false,false],labels:[],words:4},
    {text:' ```text\n 1. example\n``` ',sections:[true,false,false,false],labels:['text'],words:0},
    {text:'```inline``` and ```js\nbody\n```',sections:[false,false,false,false],labels:['inline``` and ```js'],words:1},
    {text:'prefix\r2. title',sections:[false,false,false,false],labels:[],words:3},
  ];
  for(const example of examples) {
    const report=comparison.report(await recordedAnswer(t,example.text));
    const observations=report.items.find(item=>item.response).observations;
    assert.deepEqual(observations.sectionMarkers,example.sections);
    assert.deepEqual(observations.codeBlockLabels,example.labels);
    assert.equal(observations.explanationWords,example.words);
  }
});

for(const [kind,text] of [['blank-lines','\n'.repeat(150000)+'x'],['fence-markers','```'.repeat(60000)+'x']]) {
  test(`offline report bounds processing of large ${kind} responses`,async t=>{
    const paths=await recordedAnswer(t,text);
    // A subprocess deadline bounds the test even if synchronous parsing regresses.
    // Only the transport is mocked; the actual journal and report paths are used.
    const result=spawnSync(process.execPath,['-e',
      'const c=require(process.argv[1]); const r=c.report(JSON.parse(process.argv[2])); process.stdout.write(JSON.stringify(r.items.find(i=>i.response).observations));',
      require.resolve('../packages/core/prompt-comparison.cjs'),JSON.stringify(paths)],{encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
    assert.equal(result.error,undefined,'report must finish inside a generous five-second local deadline');
    assert.equal(result.status,0,result.stderr);
    const observations=JSON.parse(result.stdout);
    assert.deepEqual(observations.sectionMarkers,[false,false,false,false]);
    assert.equal(observations.codeBlockCount,0);
    assert.equal(observations.explanationWords,1);
  });
}

test('CLI defaults to offline summary and rejects invalid API settings without a request', () => {
  const script=path.resolve(__dirname,'../scripts/compare_prompts.cjs');
  const launch=args=>spawnSync(process.execPath,[script,...args],{encoding:'utf8',env:{PATH:process.env.PATH},timeout:10000});
  const result=launch([]); assert.equal(result.status,0,result.stderr);
  const summary=JSON.parse(result.stdout); assert.equal(summary.evidenceKind,'not-run'); assert.equal(summary.prepared,160);
  for (const args of [['run'],['run','--model','foo','--max-cost-usd','0'],['prepare','--model','foo'],['--output','one','--output','two']]) {
    const invalid=launch(args);assert.equal(invalid.status,1);assert.equal(invalid.stdout,'');
    assert.doesNotMatch(invalid.stderr,/\n\s+at /);
  }
});

test('request timeout aborts and does not retry', async () => {
  let calls=0;
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential',timeoutMs:5},
    async (_url,{signal})=>{calls++;await new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));}),/unknown/);
  assert.equal(calls,1);
});

test('comparison counterbalances old/new order within every case',()=>{
  const plan=comparison.prepare(); let oldFirst=0;
  for (let i=0;i<plan.items.length;i+=2) if(plan.items[i].arm==='old')oldFirst++;
  assert.equal(oldFirst,40);
  for(const caseId of new Set(plan.items.map(item=>item.caseId))) {
    const items=plan.items.filter(item=>item.caseId===caseId);
    assert.notEqual(items[0].arm,items[2].arm);
  }
});

test('completed safety refusal is evidence, not an uncertain retryable request',async()=>{
  const result=await comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},
    async()=>new Response(JSON.stringify(response({output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'I cannot help execute an attack.'}]}]}))));
  assert.equal(result.outputKind,'refusal');assert.match(result.text,/cannot help/);assert.equal(result.usage.total_tokens,60);
});

test('credential reflection is rejected after JSON escape decoding as well as in raw text',async()=>{
  const key='unit-test-credential';
  const payload=JSON.stringify(response({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:key}]}]}))
    .replace(key,[...key].map(char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0')).join(''));
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key},
    async()=>new Response(payload)),/Unsafe provider response/);
});

test('resume rejects orphan results, reduced reservations and unknown journal files before any call',async t=>{
  const output=path.join(directory(t),'prepared');comparison.writePreparation(output);
  let calls=0;const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:0.27,maxOutputTokens:100};
  const transport={fetch:async()=>{calls++;return new Response(JSON.stringify(response()));},key:'unit-test-credential'};
  const first=await comparison.run(options,transport);assert.equal(first.completed,1);assert.equal(calls,1);
  const item=comparison.prepare().items[0],file=path.join(output,'run',`${item.id}.reserve.json`);
  const reservation=fs.readFileSync(file,'utf8');fs.unlinkSync(file);
  await assert.rejects(comparison.run({...options,resume:true},transport),/orphan|reservation|journal/i);assert.equal(calls,1);
  fs.writeFileSync(file,reservation,{mode:0o600});const changed=JSON.parse(reservation);changed.reservedCostUsd=1e-9;fs.writeFileSync(file,JSON.stringify(changed));
  await assert.rejects(comparison.run({...options,resume:true},transport),/reservation|journal/i);assert.equal(calls,1);
  fs.writeFileSync(file,reservation);
  fs.writeFileSync(path.join(output,'run','unknown.reserve.json'),'{}',{mode:0o600});
  await assert.rejects(comparison.run({...options,resume:true},transport),/journal/i);assert.equal(calls,1);
});

test('result metadata cannot import validation claims or forged costs',async t=>{
  const output=path.join(directory(t),'prepared');comparison.writePreparation(output);
  const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:0.27,maxOutputTokens:100};
  await comparison.run(options,{fetch:async()=>new Response(JSON.stringify(response())),key:'unit-test-credential'});
  const item=comparison.prepare().items[0],file=path.join(output,'run',`${item.id}.result.json`);
  const saved=JSON.parse(fs.readFileSync(file,'utf8'));
  for(const changed of [{...saved,validationStatus:'field-confirmed'}, {...saved,costUsdUpperBoundAtRecordedRates:0},
    {...saved,usage:{input_tokens:0,output_tokens:0,total_tokens:0}}, {...saved,completedAt:'bad-date'}]) {
    fs.writeFileSync(file,JSON.stringify(changed));assert.throws(()=>comparison.inspectRun(output),/journal/);
  }
});

test('active or stale lock prevents a second runner without making a model call',async t=>{
  const output=path.join(directory(t),'prepared');comparison.writePreparation(output);
  const options={input:output,model:pricing().model,pricing:pricing(),maxCostUsd:0.0001,maxOutputTokens:100};
  let calls=0;const transport={fetch:async()=>{calls++;throw Error('must not call');},key:'unit-test-credential'};
  await comparison.run(options,transport);
  fs.writeFileSync(path.join(output,'run','active.lock'),'stale',{mode:0o600});
  await assert.rejects(comparison.run({...options,resume:true},transport),/active|interrupted/);assert.equal(calls,0);
});

test('response identifiers must be scalar strings rather than coercible arrays',async()=>{
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential'},
    async()=>new Response(JSON.stringify(response({id:['resp_test']})))),/Unsafe provider response/);
});

test('response body stall is bounded by the same total deadline',{timeout:500},async()=>{
  await assert.rejects(comparison.requestResponse({prompt:'Synthetic',model:pricing().model,maxOutputTokens:100,key:'unit-test-credential',timeoutMs:5},
    async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode('{'));}}))),/unknown/);
});
