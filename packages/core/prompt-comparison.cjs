'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID, randomInt } = require('node:crypto');
const ROOT = path.resolve(__dirname, '../..');
const FIXTURES = path.join(ROOT, 'validation/evals/comparison');
const ENDPOINT = 'https://api.openai.com/v1/responses';
const BASELINE_COMMIT = '2fb30a089ed54a6834f308724c327edc5fccdfa6';
const BASELINE_SHA256 = 'b182929412a7e94a85138e0930c3f25db111e207e58d230c5662decace4fa8fd';
const CASES_SHA256 = '41c0442afa9ac838a45d56696c26dc6bcdca33f267b0b1f95800dcf93ecf9fdd';
const RESPONSE_LIMIT = 1024 * 1024;
const JSON_LIMIT = 16 * 1024 * 1024;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error(message); };
const modelId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$/.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
const exactKeys=(value,keys)=>value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key));
const isoDate=value=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
const hash=value=>typeof value==='string' && /^[0-9a-f]{64}$/.test(value);
const REQUEST_SETTINGS=Object.freeze({store:false,stream:false,background:false,tools:[],tool_choice:'none',truncation:'disabled',service_tier:'default'});
const RESERVATION_POLICY='Full verified context bound plus maximum output; reservations are never released automatically.';

function validatePricing(value, model, now = Date.now()) {
  const keys = ['schemaVersion', 'currency', 'model', 'inputUsdPerMillion', 'outputUsdPerMillion', 'maxInputTokens', 'verifiedAt', 'sourceUrl', 'operatorVerified'];
  if (!value || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value,key)) ||
    value.schemaVersion !== 1 || value.currency !== 'USD' || !modelId(model) || value.model !== model || value.operatorVerified !== true ||
    ![value.inputUsdPerMillion,value.outputUsdPerMillion].every(rate => Number.isFinite(rate) && rate > 0 && rate <= 1000000) ||
    !integer(value.maxInputTokens,1024,10000000) ||
    !['https://openai.com/api/pricing/', 'https://developers.openai.com/api/docs/pricing'].includes(value.sourceUrl) ||
    typeof value.verifiedAt !== 'string' || !Number.isFinite(Date.parse(value.verifiedAt)) ||
    now - Date.parse(value.verifiedAt) > 30 * 86400000 || Date.parse(value.verifiedAt) > now + 300000) {
    fail('Pricing requires current operator-verified positive USD rates and context bound for the exact model.');
  }
  return structuredClone(value);
}

async function requestResponse({ prompt, model, maxOutputTokens, key, timeoutMs = 60000 }, fetchImpl = globalThis.fetch) {
  if (!modelId(model) || !integer(maxOutputTokens,16,32768) || typeof prompt !== 'string' || Buffer.byteLength(prompt) > 200000 ||
    typeof key !== 'string' || !key || /[\r\n]/.test(key) || !integer(timeoutMs,1,60000)) fail('Invalid request settings.');
  const controller = new AbortController();
  let timer;
  const deadline=new Promise((_resolve,reject)=>{
    timer=setTimeout(()=>{controller.abort();reject(new Error('deadline'));},timeoutMs);
  });
  try {
    const body = { model, input: prompt, max_output_tokens: maxOutputTokens, store: false,
      stream: false, background: false, tools: [], tool_choice: 'none', truncation: 'disabled', service_tier: 'default' };
    const response = await Promise.race([deadline,fetchImpl(ENDPOINT, { method: 'POST', redirect: 'error', signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })]);
    if (!response.ok || response.redirected || !response.body) fail('Request outcome unknown.');
    const reader = response.body.getReader();
    const chunks = []; let bytes = 0;
    try {
      while (true) {
        const item = await Promise.race([deadline,reader.read()]); if (item.done) break;
        bytes += item.value.byteLength; if (bytes > RESPONSE_LIMIT) fail('Unsafe provider response.');
        chunks.push(item.value);
      }
    } finally { await Promise.race([deadline.catch(()=>{}),reader.cancel().catch(() => {})]); }
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    if (raw.includes(key)) fail('Unsafe provider response.');
    let data; try { data = JSON.parse(raw); } catch { fail('Unsafe provider response.'); }
    if (!data || data.status !== 'completed' || data.model !== model || typeof data.id !== 'string' || !/^resp_[a-zA-Z0-9_]{1,190}$/.test(data.id) ||
      !integer(data.created_at,0,9999999999) || !Array.isArray(data.output) || data.output.length > 100 ||
      !data.usage || !['input_tokens','output_tokens','total_tokens'].every(key => integer(data.usage[key],0,10000000)) ||
      data.usage.total_tokens !== data.usage.input_tokens + data.usage.output_tokens || data.usage.output_tokens > maxOutputTokens) fail('Unsafe provider response.');
    const parts = []; let refused = false;
    for (const item of data.output) {
      if (item.type === 'reasoning') continue;
      if (item.type !== 'message' || item.role !== 'assistant' || !Array.isArray(item.content)) fail('Unsafe provider response.');
      for (const part of item.content) {
        if (part.type === 'refusal' && typeof part.refusal === 'string') { parts.push(part.refusal); refused=true; continue; }
        if (part.type !== 'output_text' || typeof part.text !== 'string') fail('Unsafe provider response.');
        parts.push(part.text);
      }
    }
    const text = parts.join('\n');
    // Check decoded output too: JSON Unicode escaping must not bypass credential redaction.
    if (!text.trim() || text.includes(key) || data.id.includes(key) || data.model.includes(key)) fail('Unsafe provider response.');
    return { responseId: data.id, model: data.model, providerCreatedAt: new Date(data.created_at * 1000).toISOString(),
      text, outputKind:refused?'refusal':'text', responseSha256: sha256(raw), textSha256: sha256(text), usage: {
        input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens, total_tokens: data.usage.total_tokens,
      } };
  } catch (error) {
    fail(error.message === 'Unsafe provider response.' ? error.message : 'Request outcome unknown. No automatic retry; inspect the run journal.');
  } finally { clearTimeout(timer); }
}

function directory(candidate, privateOnly = false) {
  const resolved = path.resolve(candidate); let current = path.parse(resolved).root;
  for (const part of resolved.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current,part); const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail('Output/input directories must not contain symbolic links.');
  }
  const stat = fs.statSync(resolved);
  if (privateOnly && ((stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()))) fail('Run directory must be private and owned by the current user.');
  return resolved;
}

function readJson(file, limit = JSON_LIMIT) {
  directory(path.dirname(file));
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd); if (!stat.isFile() || stat.size > limit) fail('JSON file is not regular or exceeds its size limit.');
    const buffer = Buffer.alloc(limit + 1); let length = 0;
    while (length <= limit) { const n = fs.readSync(fd,buffer,length,Math.min(65536,buffer.length-length),null); if (!n) break; length += n; }
    if (length > limit) fail('JSON file exceeds its size limit.');
    const text = new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,length));
    return JSON.parse(text);
  } finally { fs.closeSync(fd); }
}

function writeNew(file, value) {
  const parent = directory(path.dirname(file),true);
  const parentStat = fs.statSync(parent);
  const fd = fs.openSync(file,fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW,0o600);
  try { fs.writeFileSync(fd,json(value)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const after = fs.statSync(parent);
  if (after.dev !== parentStat.dev || after.ino !== parentStat.ino) fail('Output directory changed during writing.');
  const directoryFd=fs.openSync(parent,fs.constants.O_RDONLY);
  try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
}

function newDirectory(candidate) {
  const output = path.resolve(candidate); directory(path.dirname(output));
  fs.mkdirSync(output,{mode:0o700}); return directory(output,true);
}

function prepare({ createdAt = new Date().toISOString() } = {}) {
  if (typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) fail('Invalid preparation date.');
  const baselinePath = path.join(FIXTURES,'baseline-core-dev3.cjs');
  if (sha256(fs.readFileSync(baselinePath)) !== BASELINE_SHA256) fail('Pinned baseline integrity check failed.');
  const baseline = require(baselinePath), candidate = require(path.join(ROOT,'demo/core.js'));
  const environment = require(path.join(ROOT,'demo/environment.js'));
  if (sha256(fs.readFileSync(path.join(FIXTURES,'cases.json'))) !== CASES_SHA256) fail('Pinned synthetic case integrity check failed.');
  const cases = readJson(path.join(FIXTURES,'cases.json'));
  const records = [...require(path.join(ROOT,'demo/catalog.js')),...require(path.join(ROOT,'demo/atlas-catalog.js'))];
  if (cases.schemaVersion !== 1 || cases.dataClassification !== 'public-synthetic' || cases.cases.length !== 40) fail('Invalid pinned comparison cases.');
  const items = [];
  for (const [caseIndex,example] of cases.cases.entries()) {
    const record=records.find(value=>value.id===example.techniqueId && value.domain===example.domain);
    if (!record || !/^[a-z]+-\d{2}$/.test(example.id) || !candidate.TARGETS.includes(example.target) || !Object.hasOwn(candidate.MODES,example.mode)) fail('Invalid pinned comparison case.');
    const profileText=environment.render(example.environment);
    const legacyContext=[profileText,example.context].filter(Boolean).join('\n\n');
    const expectedProvenance=example.scenario==='ready'?'user':'example';
    if (legacyContext.length > 4000 || example.environment.provenance !== expectedProvenance) fail('Synthetic case exceeds fair legacy context or loses declared provenance.');
    for (let repeat=1;repeat<=2;repeat++) {
      // Counterbalance order across pairs so version is not confounded with time.
      const arms=(caseIndex + repeat) % 2 === 0 ? ['old','new'] : ['new','old'];
      for (const arm of arms) {
        const prompt = arm === 'old'
          ? baseline.composePrompt(record,{mode:example.mode,target:example.target,context:legacyContext})
          : candidate.composePrompt(record,{mode:example.mode,target:example.target,context:example.context,environment:example.environment});
        if (Buffer.byteLength(prompt)>200000) fail('Prepared prompt exceeds request limit.');
        items.push({id:`${example.id}.${repeat}.${arm}`,caseId:example.id,techniqueId:record.id,domain:record.domain,
          mode:example.mode,target:example.target,scenario:example.scenario,repeat,arm,
          factsSha256:sha256(legacyContext), environmentSha256:sha256(environment.serialize(example.environment)),
          prompt,promptSha256:sha256(prompt),expected:example.expected});
      }
    }
  }
  return {schemaVersion:1,kind:'pad-prompt-comparison',evidenceKind:'not-run',createdAt,repeats:2,
    dataClassification:'public-synthetic',baseline:{version:'0.4.0.dev3',commit:BASELINE_COMMIT,sha256:BASELINE_SHA256},
    candidate:{version:fs.readFileSync(path.join(ROOT,'VERSION'),'utf8').trim(),
      coreSha256:sha256(fs.readFileSync(path.join(ROOT,'demo/core.js'))),environmentSha256:sha256(fs.readFileSync(path.join(ROOT,'demo/environment.js')))},
    sources:{attack:'19.2',atlas:'2026.08',recordSha256:sha256(JSON.stringify(records))},
    casesSha256:sha256(json(cases)),items};
}

function validatePlan(value) {
  let expected;
  try { expected=prepare({createdAt:value.createdAt}); } catch { fail('Preparation must match the pinned synthetic cases and current source/composer bytes.'); }
  if (JSON.stringify(value)!==JSON.stringify(expected)) fail('Preparation must match the pinned synthetic cases and current source/composer bytes.');
  return expected;
}

function writePreparation(output) {
  const plan=prepare(); const location=newDirectory(output);
  writeNew(path.join(location,'prepared.json'),plan); return plan;
}

const rounded = value => Math.ceil(value * 1e9) / 1e9;
function settings(options,evidenceKind,now=Date.now()) {
  if (!modelId(options.model) || !Number.isFinite(options.maxCostUsd) || options.maxCostUsd<=0 || options.maxCostUsd>10000 ||
    !integer(options.maxOutputTokens ?? 2048,16,32768)) fail('An explicit model, positive cost cap (maximum USD 10,000) and valid output cap are required.');
  return {model:options.model,maxCostUsd:options.maxCostUsd,maxOutputTokens:options.maxOutputTokens ?? 2048,
    pricing:validatePricing(options.pricing,options.model,now),evidenceKind};
}

function reservationCost(config) {
  return rounded((config.pricing.maxInputTokens*config.pricing.inputUsdPerMillion + config.maxOutputTokens*config.pricing.outputUsdPerMillion)/1000000);
}

function usageCost(usage,config) {
  return rounded((usage.input_tokens*config.pricing.inputUsdPerMillion + usage.output_tokens*config.pricing.outputUsdPerMillion)/1000000);
}

function inspectRun(input) {
  const location=directory(input,true); const plan=validatePlan(readJson(path.join(location,'prepared.json')));
  const runPath=path.join(location,'run');
  if (!fs.existsSync(runPath)) return {plan,manifest:null,results:[],completed:0,unknown:0,reservedCostUsd:0};
  directory(runPath,true);
  const manifest=readJson(path.join(runPath,'manifest.json'),65536);
  if (!exactKeys(manifest,['schemaVersion','runId','createdAt','planSha256','endpoint','settings','requestSettings','reservationPolicy']) ||
    manifest.schemaVersion!==1 || manifest.planSha256!==sha256(json(plan)) || manifest.endpoint!==ENDPOINT ||
    typeof manifest.runId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(manifest.runId) || !isoDate(manifest.createdAt) ||
    JSON.stringify(manifest.requestSettings)!==JSON.stringify(REQUEST_SETTINGS) || manifest.reservationPolicy!==RESERVATION_POLICY ||
    !exactKeys(manifest.settings,['model','maxCostUsd','maxOutputTokens','pricing','evidenceKind']) || !['mock','api'].includes(manifest.settings.evidenceKind)) fail('Invalid run journal manifest.');
  const config=settings(manifest.settings,manifest.settings.evidenceKind,Date.parse(manifest.createdAt));
  const names=new Set(fs.readdirSync(runPath));
  const allowedNames=new Set(['manifest.json','active.lock',...plan.items.flatMap(item=>[`${item.id}.reserve.json`,`${item.id}.result.json`])]);
  for(const name of names) {
    if(!allowedNames.has(name)) fail('Unknown run journal file.');
    const stat=fs.lstatSync(path.join(runPath,name));
    if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0)fail('Run journal files must be private regular files.');
  }
  const results=[]; let reservedCostUsd=0,unknown=0;
  for (const item of plan.items) {
    const reservePath=path.join(runPath,`${item.id}.reserve.json`);
    if (!names.has(`${item.id}.reserve.json`)) {
      if(names.has(`${item.id}.result.json`))fail('Orphan result without request reservation in run journal.');
      continue;
    }
    const reserve=readJson(reservePath,65536);
    if (!exactKeys(reserve,['schemaVersion','itemId','promptSha256','reservedCostUsd','startedAt','evidenceKind']) || reserve.schemaVersion!==1 ||
      reserve.itemId!==item.id || reserve.promptSha256!==item.promptSha256 || reserve.reservedCostUsd!==reservationCost(config) ||
      !isoDate(reserve.startedAt) || reserve.evidenceKind!==config.evidenceKind) fail('Invalid request reservation.');
    reservedCostUsd=rounded(reservedCostUsd+reserve.reservedCostUsd);
    const resultPath=path.join(runPath,`${item.id}.result.json`);
    if (!fs.existsSync(resultPath)) {unknown++;continue;}
    const result=readJson(resultPath,RESPONSE_LIMIT+65536);
    if (!exactKeys(result,['schemaVersion','itemId','promptSha256','evidenceKind','startedAt','completedAt','responseId','model','providerCreatedAt',
      'text','outputKind','responseSha256','textSha256','usage','costUsdUpperBoundAtRecordedRates']) || result.schemaVersion!==1 ||
      result.itemId!==item.id || result.promptSha256!==item.promptSha256 || result.evidenceKind!==config.evidenceKind ||
      typeof result.text!=='string' || !result.text.trim() || result.textSha256!==sha256(result.text) || result.model!==config.model ||
      !['text','refusal'].includes(result.outputKind) || !hash(result.responseSha256) || typeof result.responseId!=='string' || !/^resp_[a-zA-Z0-9_]{1,190}$/.test(result.responseId) ||
      !isoDate(result.providerCreatedAt) || result.startedAt!==reserve.startedAt || !isoDate(result.completedAt) || Date.parse(result.completedAt)<Date.parse(result.startedAt) ||
      !exactKeys(result.usage,['input_tokens','output_tokens','total_tokens']) || !integer(result.usage.input_tokens,0,config.pricing.maxInputTokens) ||
      !integer(result.usage.output_tokens,0,config.maxOutputTokens) || result.usage.total_tokens!==result.usage.input_tokens+result.usage.output_tokens ||
      result.costUsdUpperBoundAtRecordedRates!==usageCost(result.usage,config)) fail('Invalid saved response evidence in run journal.');
    results.push(result);
  }
  if(reservedCostUsd>config.maxCostUsd)fail('Run journal reservations exceed the cost cap.');
  return {plan,manifest,results,completed:results.length,unknown,reservedCostUsd};
}

async function run(options, testTransport) {
  if (testTransport && typeof testTransport.fetch!=='function') fail('Tests must provide a mock transport.');
  const config=settings(options,testTransport?'mock':'api');
  const key=testTransport ? testTransport.key : process.env.OPENAI_API_KEY;
  if (typeof key!=='string' || !key || /[\r\n]/.test(key)) fail('OPENAI_API_KEY is required in the operator environment.');
  const location=directory(options.input,true), plan=validatePlan(readJson(path.join(location,'prepared.json')));
  for (const item of plan.items) if (Buffer.byteLength(item.prompt)+4096>config.pricing.maxInputTokens) fail('Pricing context bound is too small for a conservative input-token reservation.');
  const runPath=path.join(location,'run');
  if (!options.resume) {
    newDirectory(runPath);
    writeNew(path.join(runPath,'manifest.json'),{schemaVersion:1,runId:randomUUID(),createdAt:new Date().toISOString(),
      planSha256:sha256(json(plan)),endpoint:ENDPOINT,settings:config,
      requestSettings:REQUEST_SETTINGS,reservationPolicy:RESERVATION_POLICY});
  }
  const snapshot=inspectRun(location);
  if (!snapshot.manifest || JSON.stringify(snapshot.manifest.settings)!==JSON.stringify(config)) fail('Resume requires unchanged model, settings, price snapshot and cost cap.');
  if (snapshot.unknown) fail('Run has uncertain requests. No retries or new requests until an operator resolves provider billing outside this tool.');
  const lockPath=path.join(runPath,'active.lock');
  let lock;
  try { lock=fs.openSync(lockPath,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600); }
  catch { fail('Run is active or interrupted. Inspect the journal before removing its stale active.lock.'); }
  try {
    const current=inspectRun(location);
    if (current.unknown) fail('Run has uncertain requests; refusing duplicate calls.');
    let spent=current.reservedCostUsd;
    const reserveCost=reservationCost(config);
    const completed=new Set(current.results.map(result=>result.itemId));
    for (const item of plan.items) {
      if (completed.has(item.id)) continue;
      if (rounded(spent+reserveCost)>config.maxCostUsd) return {...summary(inspectRun(location)),stopReason:'budget'};
      const startedAt=new Date().toISOString();
      writeNew(path.join(runPath,`${item.id}.reserve.json`),{schemaVersion:1,itemId:item.id,promptSha256:item.promptSha256,
        reservedCostUsd:reserveCost,startedAt,evidenceKind:config.evidenceKind});
      spent=rounded(spent+reserveCost);
      let result;
      try { result=await requestResponse({prompt:item.prompt,model:config.model,maxOutputTokens:config.maxOutputTokens,key},testTransport?.fetch); }
      catch { fail('Request outcome unknown. Reservation retained; resume will not repeat this request.'); }
      if (result.usage.input_tokens>config.pricing.maxInputTokens) fail('Provider usage exceeded verified context bound. Outcome requires manual billing review.');
      writeNew(path.join(runPath,`${item.id}.result.json`),{schemaVersion:1,itemId:item.id,promptSha256:item.promptSha256,
        evidenceKind:config.evidenceKind,startedAt,completedAt:new Date().toISOString(),...result,
        costUsdUpperBoundAtRecordedRates:usageCost(result.usage,config)});
    }
    return {...summary(inspectRun(location)),stopReason:'complete'};
  } finally {fs.closeSync(lock);fs.unlinkSync(lockPath);}
}

function summary(run) {
  return {schemaVersion:1,evidenceKind:run.manifest?.settings.evidenceKind || 'not-run',
    prepared:run.plan.items.length,completed:run.completed,unknown:run.unknown,reservedCostUsd:run.reservedCostUsd,
    effectiveness:'not-assessed',humanReview:'not-assessed',validationStatus:'generated'};
}

function observe(item,result) {
  if (!result) return {status:'not-run',note:'No model response was recorded.'};
  const text=result.text;
  const sectionMarkers=[1,2,3,4].map(number=>new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${number}[.)]\\s`).test(text));
  const codeBlocks=[...text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)];
  const prose=text.replace(/```[\s\S]*?```/g,'');
  return {status:'observed-not-scored',sectionMarkers,explanationWords:prose.trim().split(/\s+/).filter(Boolean).length,
    codeBlockCount:codeBlocks.length,codeBlockLabels:codeBlocks.map(value=>value[1].trim().slice(0,80)),
    canonicalSourceMentioned:item.expected.sourceUrls.some(url=>text.includes(url)),
    providedFieldsMentioned:item.expected.allowedFields.filter(field=>text.includes(field)),
    providedTablesMentioned:item.expected.allowedTables.filter(table=>text.includes(table)),
    missingInputLanguageObserved:/needs? input|insufficient|unknown|missing|not supplied|not available|unconfirmed/i.test(text),
    note:'Lexical observations only. Mention does not prove correct use; absence does not prove fabrication. No syntax, semantic, safety or effectiveness score.'};
}

function report({input,output}) {
  const snapshot=inspectRun(input), destination=newDirectory(output);
  const results=new Map(snapshot.results.map(value=>[value.itemId,value]));
  const report={schemaVersion:1,kind:'pad-prompt-comparison-report',createdAt:new Date().toISOString(),
    summary:summary(snapshot),baseline:snapshot.plan.baseline,candidate:snapshot.plan.candidate,sources:snapshot.plan.sources,
    planSha256:sha256(json(snapshot.plan)),run:snapshot.manifest,
    rubric:{id:'pad-comparison-human-v1',dimensions:['factualAccuracy','techniqueAlignment','telemetryFeasibility','benignCases','safety','sourceAttribution','clarity']},
    items:snapshot.plan.items.map(item=>({itemId:item.id,techniqueId:item.techniqueId,mode:item.mode,target:item.target,
      arm:item.arm,repeat:item.repeat,promptSha256:item.promptSha256,response:results.get(item.id)||null,
      observations:observe(item,results.get(item.id)),
      syntax:{status:'not-assessed',reason:'No reliable native parser or target environment was executed.'},
      semanticChecks:{status:'not-assessed',dimensions:['sourceAccuracy','fieldUse','missingInputHandling','selectedTargetCompliance','safety']},
      humanReview:{status:'not-assessed',reviewer:null,scores:null}}))};
  const pairs=[], key=[];
  for (const item of snapshot.plan.items.filter(value=>value.arm==='old')) {
    const other=snapshot.plan.items.find(value=>value.caseId===item.caseId&&value.repeat===item.repeat&&value.arm==='new');
    const aIsOld=randomInt(2)===0, left=aIsOld?item:other, right=aIsOld?other:item;
    const pairId=randomUUID();
    const answer=value=>({text:results.get(value.id)?.text || null,status:results.has(value.id)?'response-recorded':'not-run'});
    pairs.push({pairId,caseId:item.caseId,techniqueId:item.techniqueId,domain:item.domain,mode:item.mode,target:item.target,scenario:item.scenario,
      A:answer(left),B:answer(right),review:{reviewer:null,date:null,preferred:null,rationale:null,
        A:Object.fromEntries(report.rubric.dimensions.map(dimension=>[dimension,null])),
        B:Object.fromEntries(report.rubric.dimensions.map(dimension=>[dimension,null]))}});
    key.push({pairId,A:left.id,B:right.id});
  }
  writeNew(path.join(destination,'report.json'),report);
  writeNew(path.join(destination,'blind-review.json'),{schemaVersion:1,rubric:report.rubric,evidenceKind:summary(snapshot).evidenceKind,
    instructions:'Fill scores 1–5 only after independent human review. Leave unknown dimensions null. Arm identity is withheld; response text is unchanged and may self-identify. Do not infer validation.',pairs});
  writeNew(path.join(destination,'blind-key.json'),{schemaVersion:1,note:'Keep this mapping away from reviewers until scoring is locked.',pairs:key});
  return report;
}

module.exports = { ENDPOINT, BASELINE_COMMIT, BASELINE_SHA256, CASES_SHA256, sha256, validatePricing, requestResponse,
  prepare, validatePlan, writePreparation, readJson, run, inspectRun, summary, report };
