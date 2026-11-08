import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
const root=path.resolve(import.meta.dirname,"../..");
const targets=["cc-typescript-project-standard","cc-rust-project-standard","cc-go-project-standard","cc-java-project-standard","cc-python-project-standard","cc-c-project-standard","cc-cpp-project-standard","cc-rust-async","cc-go-concurrency","cc-python-async","cc-java-runtime","cc-native-memory-safety","cc-tauri-project-standard","cc-electron-project-standard"];
test("fourteen explicit common targets deliver the three core resources without cross-entry dependencies",()=>{
  for(const prefix of ["","localized/zh-CN/"]) for(const id of targets) for(const suffix of [".md",".sources.json",".rules.json"]) {
    const file=path.join(root,prefix,"skills",id,"references/common/engineering-practices"+suffix);
    assert.ok(fs.existsSync(file),`missing generated core: ${prefix}${id}${suffix}`);
    assert.deepEqual(fs.readFileSync(file),fs.readFileSync(path.join(root,prefix,"methods/engineering-practices"+suffix)));
  }
});

test("local card namespace, evidence and body cannot silently drift",async()=>{
  const {parsePracticeCards}=await import("../../scripts/lib/engineering-content.js");
  const id="cc-typescript-project-standard",body=fs.readFileSync(path.join(root,"skills",id,"references/engineering-practices.md"),"utf8");
  const match=body.match(/^---\n([\s\S]*?)\n---\n/)!;
  const original=parse(match[1]) as {practiceCards:Array<Record<string,unknown>>};
  for(const change of [
    (v:typeof original)=>v.practiceCards[0].id="cc-other:input-validation",
    (v:typeof original)=>v.practiceCards.push({...v.practiceCards[0]}),
    (v:typeof original)=>v.practiceCards[0].level="mandatory",
    (v:typeof original)=>v.practiceCards[0].caseIds=["EP-UNDECLARED-01"],
    (v:typeof original)=>v.practiceCards[0].evidence="all-proven",
  ]){const bad=structuredClone(original);change(bad);assert.throws(()=>parsePracticeCards("---\n"+stringify(bad)+"---\n"+body.slice(match[0].length),id));}
  assert.throws(()=>parsePracticeCards(body.replace("### Verification","### Removed"),id));
  for(const prefix of ["","localized/zh-CN/"]) {
    const queries=JSON.parse(fs.readFileSync(path.join(root,prefix,"skills/eval_queries.json"),"utf8")) as Record<string,{should_trigger:string[];should_not_trigger:string[]}>;
    for(const target of targets){assert.ok(queries[target].should_trigger.length>=8);assert.ok(queries[target].should_not_trigger.length>=8);}
  }
});

test("all fourteen language and desktop decisions keep source identity and bilingual contract",async()=>{
  const {parsePracticeCards}=await import("../../scripts/lib/engineering-content.js");
  const sourceIds=new Set(JSON.parse(fs.readFileSync(path.join(root,"methods/engineering-practices.sources.json"),"utf8")).sources.map((s:{id:string})=>s.id));
  for(const [id,topics] of [
    ["cc-typescript-project-standard",["input-validation","async-errors","package-contract"]],
    ["cc-rust-project-standard",["ownership-api","result-boundaries","unsafe-ffi"]],
    ["cc-go-project-standard",["package-interfaces","error-boundaries","context-ownership"]],
    ["cc-java-project-standard",["module-contract","exception-causes","resource-lifecycle"]],
    ["cc-python-project-standard",["import-safety","external-data","context-cleanup"]],
    ["cc-c-project-standard",["allocation-size","partial-cleanup","c-abi"]],
    ["cc-cpp-project-standard",["raii-borrowing","exception-abi","teardown-lifetime"]],
    ["cc-rust-async",["cancellation","guard-lifetime"]],
    ["cc-go-concurrency",["shutdown-wait","channel-ownership"]],
    ["cc-python-async",["cancellation","blocking-io"]],
    ["cc-java-runtime",["executor-lifecycle","diagnostic-bounds"]],
    ["cc-native-memory-safety",["allocator-pairs","teardown-races"]],
    ["cc-tauri-project-standard",["ipc-validation","cancellation-cleanup"]],
    ["cc-electron-project-standard",["ipc-trust","cancellation-cleanup"]],
  ] as const) {
    const byLanguage=[];
    for(const prefix of ["","localized/zh-CN/"]) {
      const file=path.join(root,prefix,"skills",id,"references/engineering-practices.md");
      assert.ok(fs.existsSync(file),`missing local decisions: ${id}`);
      const cards=parsePracticeCards(fs.readFileSync(file,"utf8"),id);
      assert.deepEqual(cards.map(c=>c.id),topics.map(topic=>id+":"+topic));
      assert.ok(cards.every(c=>c.sourceIds.every(s=>sourceIds.has(s))));
      byLanguage.push(cards);
    }
    assert.deepEqual(byLanguage[0],byLanguage[1]);
  }
});
