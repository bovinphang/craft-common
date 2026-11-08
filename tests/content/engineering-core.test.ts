import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readMethodResource, type MethodName } from "../../src/content/catalog.js";

const root = path.resolve(import.meta.dirname,"../..");
const ids=["ENG-CONTRACT","ENG-ERROR","ENG-RESOURCE","ENG-CONCURRENCY","ENG-BOUNDARY","ENG-DEPENDENCY","ENG-VERIFICATION","ENG-OPERABILITY"];
function resources(language="en") {
  const base=language==="en"?root:path.join(root,"localized",language);
  const file=(suffix:string)=>path.join(base,"methods/engineering-practices"+suffix);
  assert.ok(fs.existsSync(file(".md")),"engineering core source missing");
  return {markdown:fs.readFileSync(file(".md"),"utf8"),sources:JSON.parse(fs.readFileSync(file(".sources.json"),"utf8")),rules:JSON.parse(fs.readFileSync(file(".rules.json"),"utf8"))};
}
test("the sixth public method reads complete original bytes in both languages",()=>{
  for(const language of ["en","zh-CN"] as const) {
    const actual=readMethodResource(root,"engineering-practices" as MethodName,language);
    assert.equal(actual.toString(),resources(language).markdown);
  }
});
test("core resources have eight self-contained rules and a validated source registry",async()=>{
  const input=resources();
  const {validateCoreResources}=await import("../../scripts/lib/engineering-content.js");
  assert.equal(input.rules.schemaVersion,1);
  assert.deepEqual(input.rules.rules.map((x:{id:string})=>x.id),ids);
  for(const language of ["en","zh-CN"]) validateCoreResources(resources(language));
  assert.equal(JSON.stringify(resources("zh-CN").sources),JSON.stringify(input.sources));
  assert.equal(JSON.stringify(resources("zh-CN").rules),JSON.stringify(input.rules));
});
test("invalid core metadata, sources, external anchors and levels are rejected",async()=>{
  const input=resources();
  const {validateCoreResources}=await import("../../scripts/lib/engineering-content.js");
  for(const mutate of [
    (v:typeof input)=>v.rules.rules.push({...v.rules.rules[0]}),
    (v:typeof input)=>v.rules.rules[0].sourceIds.push("unknown-source"),
    (v:typeof input)=>v.rules.rules[0].anchor="../other/SKILL.md#foreign",
    (v:typeof input)=>v.rules.rules[0].kind="language",
    (v:typeof input)=>v.rules.rules[0].ownerSkill="cc-foreign",
    (v:typeof input)=>v.rules.rules[0].level="always",
    (v:typeof input)=>v.sources.sources[0].versionScope="",
    (v:typeof input)=>v.sources.sources[0].licenseStatus="guessed",
    (v:typeof input)=>v.sources.sources[0].url="https://user:secret@example.org/doc",
    (v:typeof input)=>v.sources.sources.push({...v.sources.sources[0]}),
  ]) {const bad=structuredClone(input); mutate(bad); assert.throws(()=>validateCoreResources(bad));}
  assert.throws(()=>validateCoreResources({...input,markdown:input.markdown.replace('<a id="ENG-CONTRACT"></a>',"")}));
});
