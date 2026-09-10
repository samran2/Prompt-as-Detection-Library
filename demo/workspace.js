(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('node:crypto').webcrypto, require('./core.js'));
  else root.PAD_WORKSPACE = factory(root.crypto, root.PAD);
})(typeof globalThis === 'object' ? globalThis : this, function (crypto, core) {
  'use strict';
  const LIMITS = Object.freeze({bytes:5*1024*1024,depth:12,nodes:150000,draftText:200*1024,warnings:200});
  const SOURCE_KEYS = ['attack','atlas','d3fend','car','attackFlow'];
  const ID = '^(?:T[0-9]{4}|AML\\.T[0-9]{4})(?:\\.[0-9]{3})?(?![\\s\\S])';
  const UUID = '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?![\\s\\S])';
  const SAFE = '^[^\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]*(?![\\s\\S])';
  const str = (maxLength, extra={}) => ({type:'string',maxLength,pattern:SAFE,...extra});
  const obj = properties => ({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
  const arr = (items,maxItems,uniqueItems=false) => ({type:'array',maxItems,items,...(uniqueItems?{uniqueItems:true}:{})});
  const enumeration = values => ({type:'string',enum:values});
  const technique = str(14,{pattern:ID});
  const identifier = str(36,{pattern:UUID});
  const name = str(120,{minLength:1,allOf:[{pattern:'\\S'}]});
  const mode = enumeration(Object.keys(core?.MODES || {}));
  const target = enumeration(core?.TARGETS ? [...core.TARGETS] : []);
  const sourcesSchema = obj(Object.fromEntries(SOURCE_KEYS.map(key=>[key,str(128,{minLength:1,allOf:[{pattern:'\\S'}]})])));
  function freeze(value) { if (value && typeof value==='object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  const SCHEMA = freeze({$schema:'https://json-schema.org/draft/2020-12/schema',title:'Prompt-as-Detection local workspace v1',
    description:'Private local drafts, never review or validation evidence. Runtime also enforces a 5 MiB UTF-8 document limit and unique draft keys and collection IDs.',
    ...obj({schemaVersion:{const:1},id:identifier,name,sources:sourcesSchema,
      drafts:arr(obj({techniqueId:technique,mode,target,text:str(LIMITS.draftText),template:str(LIMITS.draftText),
        templateSha256:str(64,{pattern:'^[a-f0-9]{64}(?![\\s\\S])'}),context:str(4000)}),1000),
      context:str(4000),contextInput:str(4000),
      collections:arr(obj({id:identifier,name,techniqueIds:arr(technique,1115,true)}),100),favorites:arr(technique,1115,true),
      flow:obj({title:name,steps:arr(technique,20)}),
      view:obj({query:str(200),domain:enumeration(['','All','Enterprise','Mobile','ICS','OT','ATLAS']),tactic:str(100),platform:str(100),
        mode,target,technique:str(14,{pattern:'^(?:(?:T[0-9]{4}|AML\\.T[0-9]{4})(?:\\.[0-9]{3})?)?(?![\\s\\S])'}),
        compare:arr(technique,2,true),theme:enumeration(core?.THEMES ? [...core.THEMES] : []),
        tab:enumeration(['prompt','evidence','defenses','flow']),paneWidth:{type:'integer',minimum:240,maximum:480},
        listScroll:{type:'number',minimum:0,maximum:10000000},mobileView:enumeration(['list','detail'])})})});
  function check(condition,message) { if (!condition) throw new Error(message); }
  function bytes(text) { return new TextEncoder().encode(text); }
  function boundedText(text) {
    check(typeof text==='string' && text.length<=LIMITS.bytes,'Workspace text exceeds the byte size limit.');
    check(bytes(text).length<=LIMITS.bytes,'Workspace text exceeds the UTF-8 byte size limit.');
  }
  function copy(value,depth,budget) {
    check(depth<=LIMITS.depth && ++budget.nodes<=LIMITS.nodes,'Workspace structure exceeds depth or node limits.');
    if (typeof value==='string') {
      check(value.length<=LIMITS.bytes,'Workspace string exceeds size limit.');
      budget.bytes+=bytes(value).length; check(budget.bytes<=LIMITS.bytes,'Workspace exceeds byte size limit.');
      check(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value),'Workspace text must contain well-formed Unicode.');
      return value;
    }
    if (value===null || typeof value==='boolean' || typeof value==='number' && Number.isFinite(value)) return value;
    check(value && typeof value==='object','Workspace fields must be plain JSON data.');
    const keys=Reflect.ownKeys(value);
    const array=Array.isArray(value);
    if (array) check(value.length<=1115 && keys.length===value.length+1,'Workspace array exceeds limits or contains sparse/custom entries.');
    else {
      const proto=Object.getPrototypeOf(value);
      check(proto===null || proto===Object.prototype,'Workspace objects must be plain JSON data.');
      check(keys.length<=32,'Workspace has too many fields.');
    }
    const output=array?[]:{};
    for (const key of keys) {
      if (array && key==='length') continue;
      check(typeof key==='string' && key.length<=40 && !['__proto__','prototype','constructor'].includes(key),'Unsupported workspace field.');
      if (array) check(/^(?:0|[1-9][0-9]*)$/.test(key) && Number(key)<value.length,'Unsupported workspace array field.');
      const descriptor=Object.getOwnPropertyDescriptor(value,key);
      check(descriptor && Object.hasOwn(descriptor,'value') && descriptor.enumerable,'Workspace accessors and hidden fields are unsupported.');
      output[key]=copy(descriptor.value,depth+1,budget);
    }
    return output;
  }
  function conform(value,schema,path) {
    if (Object.hasOwn(schema,'const')) check(value===schema.const,`Invalid ${path}.`);
    if (schema.enum) check(schema.enum.includes(value),`Invalid ${path}.`);
    if (schema.type==='object') {
      check(value && typeof value==='object' && !Array.isArray(value),`Invalid ${path} object.`);
      check(Object.keys(value).length===schema.required.length && Object.keys(value).every(key=>Object.hasOwn(schema.properties,key)),`Missing or unsupported ${path} field.`);
      for (const key of schema.required) { check(Object.hasOwn(value,key),`Missing ${path}.${key}.`); conform(value[key],schema.properties[key],`${path}.${key}`); }
    } else if (schema.type==='array') {
      check(Array.isArray(value) && value.length<=schema.maxItems,`Invalid ${path} array limit.`);
      if (schema.uniqueItems) check(new Set(value).size===value.length,`Duplicate ${path} item.`);
      value.forEach((item,index)=>conform(item,schema.items,`${path}[${index}]`));
    } else if (schema.type==='string') {
      check(typeof value==='string',`Invalid ${path} text.`);
      check(value.length<=(schema.maxLength??LIMITS.bytes) && value.length>=(schema.minLength??0),`Invalid ${path} length.`);
    } else if (schema.type==='number' || schema.type==='integer') {
      check(typeof value==='number' && Number.isFinite(value) && (schema.type!=='integer'||Number.isInteger(value)) && value>=schema.minimum && value<=schema.maximum,`Invalid ${path} range.`);
    }
    if (schema.pattern) check(typeof value==='string' && new RegExp(schema.pattern,'u').test(value),`Invalid ${path} text pattern.`);
    for (const part of schema.allOf || []) conform(value,part,path);
  }
  function validate(value) {
    check(mode.enum.length>0 && target.enum.length>0,'Workspace requires the core module.');
    const result=copy(value,0,{nodes:0,bytes:0}); conform(result,SCHEMA,'workspace');
    const draftKeys=result.drafts.map(d=>`${d.techniqueId}:${d.mode}:${d.target}`);
    check(new Set(draftKeys).size===draftKeys.length,'Duplicate workspace draft key.');
    check(new Set(result.collections.map(c=>c.id)).size===result.collections.length,'Duplicate workspace collection ID.');
    boundedText(JSON.stringify(result)); return result;
  }
  function create(name,sources) {
    check(crypto && typeof crypto.randomUUID==='function','Secure UUID support is required.');
    return validate({schemaVersion:1,id:crypto.randomUUID(),name,sources,drafts:[],context:'',contextInput:'',collections:[],favorites:[],
      flow:{title:'Research hypothesis',steps:[]},view:{query:'',domain:'',tactic:'',platform:'',mode:'detect',target:core.TARGETS[0],
        technique:'',compare:[],theme:'system',tab:'prompt',paneWidth:330,listScroll:0,mobileView:'list'}});
  }
  // Native JSON parsing discards duplicate members; reject ambiguity before it can replace a saved value.
  function uniqueMembers(text) {
    const stack=[];
    for (let index=0;index<text.length;index++) {
      const char=text[index],top=stack.at(-1);
      if (char==='"') {
        const start=index++;
        while (index<text.length && text[index]!=='"') { if (text[index]==='\\') index++; index++; }
        if (top?.keys && top.expectKey) {
          let key; try { key=JSON.parse(text.slice(start,index+1)); } catch { throw new Error('Invalid workspace JSON member.'); }
          check(!top.keys.has(key),'Duplicate workspace JSON member.');
          check(top.keys.size<32,'Workspace has too many fields.');
          top.keys.add(key); top.expectKey=false;
        }
      } else if (char==='{' || char==='[') {
        check(stack.length<LIMITS.depth,'Workspace structure exceeds depth limit.');
        stack.push(char==='{'?{keys:new Set(),expectKey:true}:{});
      } else if (char==='}' || char===']') stack.pop();
      else if (char===',' && top?.keys) top.expectKey=true;
    }
  }
  function parse(text) { boundedText(text); uniqueMembers(text); let value; try { value=JSON.parse(text); } catch { throw new Error('Invalid workspace JSON.'); } return validate(value); }
  function serialize(value) { return JSON.stringify(validate(value)); }
  async function hash(text) {
    boundedText(text); check(crypto?.subtle && typeof crypto.subtle.digest==='function','Secure SHA-256 support is required.');
    const digest=await crypto.subtle.digest('SHA-256',bytes(text)); return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function inspect(workspace,catalog,composer,currentSources) {
    const saved=validate(workspace);
    check(Array.isArray(catalog) && catalog.length<=5000 && composer && typeof composer.composePrompt==='function','Workspace inspection requires the current catalog and composer.');
    const known=new Map(catalog.map(record=>[record.id,record])); const warnings=[];
    let omittedWarnings=0;
    const warn=value=>{ if (warnings.length<LIMITS.warnings) warnings.push(value); else omittedWarnings++; };
    const referenced=new Set([...saved.favorites,...saved.collections.flatMap(c=>c.techniqueIds),...saved.flow.steps,...saved.view.compare,
      ...saved.drafts.map(d=>d.techniqueId),...(saved.view.technique?[saved.view.technique]:[])]);
    const unresolved=[...referenced].filter(id=>!known.has(id)).sort();
    for (const techniqueId of unresolved) warn({code:'unresolved-technique',techniqueId,message:'This technique is absent from the current catalog. Saved text and references are preserved.'});
    if (currentSources!==undefined) {
      const checked=copy(currentSources,0,{nodes:0,bytes:0}); conform(checked,sourcesSchema,'sources');
      for (const source of SOURCE_KEYS) if (saved.sources[source]!==checked[source]) warn({code:'source-version-mismatch',source,message:'Saved and current source versions differ. Saved templates are not replaced.'});
    } else for (const [source,field] of [['attack','attackVersion'],['atlas','atlasVersion']]) {
      const versions=new Set(catalog.map(record=>record[field]).filter(value=>typeof value==='string'));
      if (versions.size && !versions.has(saved.sources[source])) warn({code:'source-version-mismatch',source,message:'Saved and current catalog source versions differ. Saved templates are not replaced.'});
    }
    for (let draftIndex=0;draftIndex<saved.drafts.length;draftIndex++) {
      const draft=saved.drafts[draftIndex];
      check(await hash(draft.template)===draft.templateSha256,`Workspace template hash integrity mismatch at draft ${draftIndex+1}.`);
      const record=known.get(draft.techniqueId); if (!record) continue;
      let current;
      try { current=composer.composePrompt(record,{mode:draft.mode,target:draft.target,context:draft.context}); }
      catch { warn({code:'template-unavailable',draftIndex,techniqueId:draft.techniqueId,message:'Current template could not be compared. Saved text is preserved.'}); continue; }
      if (current!==draft.template) warn({code:'template-changed',draftIndex,techniqueId:draft.techniqueId,message:'The original template differs from the current composer. Saved template and draft text are preserved.'});
    }
    if (omittedWarnings) warnings.push({code:'additional-warnings',count:omittedWarnings,message:'Additional warning details were bounded. All unresolved IDs and saved workspace data remain available.'});
    return {warnings,unresolved};
  }
  return Object.freeze({create,validate,parse,serialize,hash,inspect,LIMITS,SCHEMA});
});
