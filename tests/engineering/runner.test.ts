import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
test("maintenance runner rejects unsupported cases and incomplete parameters before creating output",async()=>{
  const root=path.resolve(import.meta.dirname,"../..");
  assert.ok(fs.existsSync(path.join(root,"scripts/verify-engineering.ts")),"missing maintenance runner");
  const {parseEngineeringArgs,verifyEngineering}=await import("../../scripts/verify-engineering.js");
  for(const args of [["--case"],["--environment"],["--environment","unknown"],["--unknown"],["--case","EP-UI-01"],["--prepare","yes"]]) assert.throws(()=>parseEngineeringArgs(args));
  assert.deepEqual(parseEngineeringArgs(["--case","EP-GO-01,EP-JAVA-01","--environment","docker"]),{caseIds:["EP-GO-01","EP-JAVA-01"],environment:"docker",prepare:false});
  assert.throws(()=>verifyEngineering({root,caseIds:["EP-UI-01"],prepare:false,environment:"host"}));
});

test("the isolated TS sample capability does not raise the product Node22 floor",async()=>{
  const api=await import("../../scripts/verify-engineering.js");
  assert.equal(typeof api.supportsNativeTypeStripping,"function","missing sample capability check");
  for(const [version,expected]of [["20.19.0",false],["22.0.0",false],["22.17.0",false],["22.18.0",true],["23.0.0",true],["24.14.1",true],["unknown",false]]as const)
    assert.equal(api.supportsNativeTypeStripping(version),expected,version);
});

test("no preparation means no image download and a compile error never becomes business RED",async t=>{
  const original=path.resolve(import.meta.dirname,"../.."),root=fs.mkdtempSync(path.join(os.tmpdir(),"cc-engineering-runner-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dir=path.join(root,"skills/cc-typescript-project-standard/examples/engineering");
  fs.cpSync(path.join(original,"skills/cc-typescript-project-standard/examples/engineering"),dir,{recursive:true});
  fs.appendFileSync(path.join(dir,"README.md"),"\nIsolated image-probe fixture: "+path.basename(root));
  const {verifyEngineering}=await import("../../scripts/verify-engineering.js");
  const [missing]=verifyEngineering({root,caseIds:["EP-TS-01"],prepare:false,environment:"docker"});
  assert.equal(missing.status,"MISSING");assert.equal(missing.broken,undefined);
  assert.ok(!missing.commands.some(command=>/"(?:pull|build)"/.test(command)));
  const toolchain=path.join(root,"reports/engineering/toolchains/node-v24.14.1-linux-x64");fs.mkdirSync(toolchain,{recursive:true});
  fs.writeFileSync(path.join(toolchain,"node.tar.xz"),"corrupt archive");
  fs.writeFileSync(path.join(toolchain,"SHASUMS256.txt"),"0".repeat(64)+"  node-v24.14.1-linux-x64.tar.xz\n");
  const [corrupt]=verifyEngineering({root,caseIds:["EP-TS-01"],prepare:false,environment:"docker"});
  assert.notEqual(corrupt.status,"PASS");assert.equal(corrupt.broken,undefined);
  if(corrupt.status!=="MISSING")assert.match(corrupt.reason??"",/checksum mismatch/);
  else t.diagnostic("Checksum Docker branch NOT RUN: cached Linux image/tool unavailable");
  fs.symlinkSync(path.join(original,"node_modules"),path.join(root,"node_modules"),"junction");
  fs.writeFileSync(path.join(dir,"input.ts"),"this is not valid TypeScript;\n");
  const [invalid]=verifyEngineering({root,caseIds:["EP-TS-01"],prepare:false,environment:"host"});
  assert.equal(invalid.status,"FAIL");assert.equal(invalid.broken,undefined);assert.match(invalid.reason??"",/compile preparation/);
});
