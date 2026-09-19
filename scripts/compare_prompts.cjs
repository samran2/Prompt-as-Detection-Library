#!/usr/bin/env node
'use strict';
const comparison=require('../packages/core/prompt-comparison.cjs');
const HELP=`Prompt comparison — offline first; no model call by default.

  node scripts/compare_prompts.cjs [prepare] [--output NEW_DIRECTORY]
  node scripts/compare_prompts.cjs run --input PREPARED_DIRECTORY --model EXACT_ID
    --pricing-file SNAPSHOT.json --max-cost-usd POSITIVE [--max-output-tokens 2048] [--resume]
  node scripts/compare_prompts.cjs report --input PREPARED_DIRECTORY --output NEW_DIRECTORY

prepare without --output prints a summary only. All output parents must exist.
run is the only network command: explicit OpenAI API opt-in using OPENAI_API_KEY
from the operator environment. It accepts only the pinned public synthetic suite.
Pricing must contain operator-verified current rates and the model context bound.
No automatic retry. Uncertain requests retain reserved cost and stop resume.
report writes report.json, blind-review.json and a separate private blind-key.json.
No generated code is executed. No detection-validation status is promoted.
See docs/prompt-comparison.md. This release is tested with mocks, not paid runs.
`;

function parse(args) {
  if (args.length===1&&['--help','-h','help'].includes(args[0])) return {help:true};
  const command=args[0]&&!args[0].startsWith('--')?args.shift():'prepare';
  const allowed={prepare:['output'],run:['input','model','pricing-file','max-cost-usd','max-output-tokens','resume'],report:['input','output']}[command];
  if (!allowed) throw Error('usage');
  const values={};
  while(args.length) {
    const flag=args.shift(); if (!flag.startsWith('--')) throw Error('usage'); const name=flag.slice(2);
    if (!allowed.includes(name)||Object.hasOwn(values,name)) throw Error('usage');
    const value=name==='resume'?true:args.shift();
    if (value===undefined || (typeof value==='string'&&(!value || value.startsWith('--')))) throw Error('usage');
    values[name]=value;
  }
  if (command==='run'&&['input','model','pricing-file','max-cost-usd'].some(key=>!values[key])) throw Error('usage');
  if (command==='report'&&(!values.input||!values.output)) throw Error('usage');
  return {command,values};
}

async function main(args) {
  const options=parse([...args]); if(options.help){process.stdout.write(HELP);return;}
  const {command,values}=options; let result;
  if(command==='prepare') {
    const plan=values.output?comparison.writePreparation(values.output):comparison.prepare();
    result={schemaVersion:1,evidenceKind:'not-run',prepared:plan.items.length,cases:40,repeats:2,networkRequests:0,
      baseline:plan.baseline.version,candidate:plan.candidate.version,outputWritten:Boolean(values.output)};
  } else if(command==='run') {
    result=await comparison.run({input:values.input,model:values.model,
      pricing:comparison.readJson(values['pricing-file'],65536),maxCostUsd:Number(values['max-cost-usd']),
      maxOutputTokens:values['max-output-tokens']===undefined?2048:Number(values['max-output-tokens']),resume:Boolean(values.resume)});
  } else result=comparison.report({input:values.input,output:values.output}).summary;
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
}

if(require.main===module) main(process.argv.slice(2)).catch(error=>{
  // Do not echo parser/OS/provider errors: they can contain private input or response text.
  const safe=[
    'Run has uncertain requests. No retries or new requests until an operator resolves provider billing outside this tool.',
    'Request outcome unknown. Reservation retained; resume will not repeat this request.',
    'Run is active or interrupted. Inspect the journal before removing its stale active.lock.',
    'OPENAI_API_KEY is required in the operator environment.',
    'Resume requires unchanged model, settings, price snapshot and cost cap.',
    'Preparation must match the pinned synthetic cases and current source/composer bytes.',
    'Pricing requires current operator-verified positive USD rates and context bound for the exact model.',
    'An explicit model, positive cost cap (maximum USD 10,000) and valid output cap are required.',
  ];
  process.stderr.write((safe.includes(error.message)?error.message:'Comparison stopped: invalid input, unavailable file or existing output. Use --help; no provider details are logged.')+'\n');
  process.exitCode=1;
});
module.exports={main,parse};
