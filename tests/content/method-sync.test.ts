import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { methodFixture, runSync, bytesSnapshot, editJson } from "./method-sync-fixtures.js";

test("method synchronization preserves all 21 entries, unknown owned fields and non-owned applicability", (t) => {
  const root = methodFixture(t);
  for (const prefix of ["", "localized/zh-CN/"]) {
    editJson(path.join(root,prefix,"skills/metadata.json"), value => (value as Array<Record<string,unknown>>).map(item => ({...item, customField:"fixture-preserved"})));
    editJson(path.join(root,prefix,"skills/relations.json"), value => ({...(value as object), "cc-debug-methodology": {...(value as Record<string,object>)["cc-debug-methodology"], customRelation: "keep"}}));
  }
  editJson(path.join(root,"package.json"), value => ({...(value as object),version:"9.0.0-test.1"}));
  const before = bytesSnapshot(root);
  const metadataBefore = JSON.parse(fs.readFileSync(path.join(root,"skills/metadata.json"),"utf8"));
  const result = runSync(root);
  assert.equal(result.status,0,result.output);
  for (const prefix of ["", "localized/zh-CN/"]) {
    const metadata = JSON.parse(fs.readFileSync(path.join(root,prefix,"skills/metadata.json"),"utf8")) as Array<Record<string,unknown>>;
    assert.equal(metadata.length,21,"sync must not reduce the catalog to original seven");
    assert.ok(metadata.every(item => item.version === "9.0.0-test.1"));
    for (const id of ["cc-debug-methodology","cc-rust-project-standard"]) assert.equal(metadata.find(item => item.id === id)?.customField,"fixture-preserved");
    assert.deepEqual(metadata.find(item=>item.id==="cc-rust-project-standard")?.applicability,metadataBefore.find((item:{id:string})=>item.id==="cc-rust-project-standard").applicability);
    const relations = JSON.parse(fs.readFileSync(path.join(root,prefix,"skills/relations.json"),"utf8"));
    assert.equal(Object.keys(relations).length,21);
    assert.equal(relations["cc-debug-methodology"].customRelation,"keep");
    assert.equal(bytesSnapshot(root)[prefix+"skills/eval_queries.json"],before[prefix+"skills/eval_queries.json"]);
  }
});

for (const damage of ["missing-zh-method", "duplicate-id", "unknown-id", "invalid-relations", "input-link", "output-link"])
  test(`method preflight rejects ${damage} before any output mutation`, (t) => {
    const root = methodFixture(t);
    fs.appendFileSync(path.join(root,"methods/debug.md"),"\nChanged EN input for atomic preflight.\n");
    if (damage === "missing-zh-method") fs.unlinkSync(path.join(root,"localized/zh-CN/methods/tdd.md"));
    if (damage === "duplicate-id") editJson(path.join(root,"localized/zh-CN/skills/metadata.json"), value=>[...(value as unknown[]),(value as unknown[])[0]]);
    if (damage === "unknown-id") editJson(path.join(root,"localized/zh-CN/skills/metadata.json"),value=>(value as Array<Record<string,unknown>>).map((item,index)=>index===0?{...item,id:"cc-nonexistent"}:item));
    if (damage === "invalid-relations") editJson(path.join(root,"localized/zh-CN/skills/relations.json"),()=>[]);
    if (damage === "input-link") {
      const file=path.join(root,"localized/zh-CN/methods"); fs.renameSync(file,file+"-real"); fs.symlinkSync(file+"-real",file,"junction");
    }
    if (damage === "output-link") {
      const file=path.join(root,"localized/zh-CN/skills/cc-debug-methodology/references"); fs.renameSync(file,file+"-real"); fs.symlinkSync(file+"-real",file,"junction");
    }
    const before = bytesSnapshot(root), result=runSync(root);
    assert.notEqual(result.status,0,result.output);
    assert.deepEqual(bytesSnapshot(root),before,"invalid bilingual input must produce zero writes");
  });

test("check refuses drift without writing and synchronization is idempotent", (t) => {
  const root=methodFixture(t);
  fs.appendFileSync(path.join(root,"methods/debug.md"),"\nNew method contract.\n");
  const before=bytesSnapshot(root), check=runSync(root,["--check"]);
  assert.notEqual(check.status,0);
  assert.deepEqual(bytesSnapshot(root),before);
  const sync=runSync(root); assert.equal(sync.status,0,sync.output);
  const after=bytesSnapshot(root), second=runSync(root); assert.equal(second.status,0,second.output);
  assert.deepEqual(bytesSnapshot(root),after);
  const clean=runSync(root,["--check"]); assert.equal(clean.status,0,clean.output);
  const separated=runSync(root,["--","--check"]); assert.equal(separated.status,0,separated.output);
});

test("importing the maintenance API and planning changes never writes content", (t) => {
  const root=methodFixture(t);
  fs.appendFileSync(path.join(root,"methods/debug.md"),"\nUnapplied method input.\n");
  const before=bytesSnapshot(root), env={...process.env}; delete env.NODE_TEST_CONTEXT;
  const url=pathToFileURL(path.join(root,"scripts/sync-methods.ts")).href;
  const result=spawnSync(process.execPath,["--import",import.meta.resolve("tsx"),"--input-type=module","--eval",`import assert from 'node:assert/strict'; const api=await import(${JSON.stringify(url)}); assert.equal(typeof api.syncMethods,'function'); const changes=api.planMethodSync(${JSON.stringify(root)}); assert.ok(changes.some(item=>item.relativePath==='skills/cc-debug-methodology/references/method.md'));`],{cwd:root,env,encoding:"utf8",windowsHide:true});
  assert.equal(result.status,0,String(result.stderr));
  assert.deepEqual(bytesSnapshot(root),before);
});

test("linked method input files fail before output writes on platforms with file symlinks",{skip:process.platform==="win32"?"MISSING Windows file-symlink privilege; directory-junction cases execute here":false},t=>{
  const root=methodFixture(t),file=path.join(root,"localized/zh-CN/methods/debug.md");
  fs.renameSync(file,file+".real");fs.symlinkSync(file+".real",file,"file");
  fs.appendFileSync(path.join(root,"methods/debug.md"),"\nChanged input.\n");
  const before=bytesSnapshot(root),result=runSync(root);
  assert.notEqual(result.status,0);assert.deepEqual(bytesSnapshot(root),before);
});
