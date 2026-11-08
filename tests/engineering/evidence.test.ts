import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("evidence rejects compile errors, missing tools, zero tests, all-skipped and forged PASS text",async()=>{
  assert.ok(fs.existsSync(path.resolve(import.meta.dirname,"../../scripts/lib/engineering-evidence.ts")),"missing evidence classifier");
  const {assessExecution}=await import("../../scripts/lib/engineering-evidence.js");
  for(const result of [
    {status:0,output:"PASS EP-TS-01"},
    {status:0,output:"TAP version 13\n1..0\n# tests 0\n# pass 0\n# fail 0\n# skipped 0"},
    {status:0,output:"ok 1 - boundary # SKIP\n1..1\n# tests 1\n# pass 0\n# fail 0\n# skipped 1"},
    {status:null,output:"",error:new Error("ENOENT")},
    {status:1,output:"SyntaxError: unexpected token\nnot ok 1 - boundary.test.ts\n# tests 1\n# pass 0\n# fail 1\n# skipped 0"},
  ]) assert.throws(()=>assessExecution(result,"tap","success",["boundary"],"unused.log"));
  assert.throws(()=>assessExecution({status:1,output:"error: could not compile crate"},"cargo","failure",["boundary"],"unused.log"));
  assert.throws(()=>assessExecution({status:1,output:"SyntaxError: unexpected token\nnot ok 1 - boundary.test.ts\n# tests 1\n# pass 0\n# fail 1\n# skipped 0"},"tap","failure",["boundary"],"unused.log"));
  const good="ok 1 - boundary\n1..1\n# tests 1\n# pass 1\n# fail 0\n# skipped 0\n";
  assert.equal(assessExecution({status:0,output:good},"tap","success",["boundary"],"unused.log").tests.passed,1);
  assert.throws(()=>assessExecution({status:1,output:good},"tap","failure",["boundary"],"unused.log"));
});

test("native evidence requires named bodies and matching completed summaries",async()=>{
  const {assessExecution}=await import("../../scripts/lib/engineering-evidence.js");
  const native='CRAFT_TEST {"name":"boundary","status":"pass"}\nCRAFT_SUMMARY {"total":1,"passed":1,"failed":0,"skipped":0}\n';
  assert.equal(assessExecution({status:0,output:native},"native-json","success",["boundary"],"native.log").tests.total,1);
  assert.throws(()=>assessExecution({status:0,output:native.replace('"total":1','"total":0')},"native-json","success",["boundary"],"native.log"));
  const go='{"Action":"run","Test":"TestBoundary"}\n{"Action":"pass","Test":"TestBoundary"}\n';
  assert.equal(assessExecution({status:0,output:go},"go-json","success",["TestBoundary"],"go.log").tests.passed,1);
  assert.throws(()=>assessExecution({status:1,output:'{"Action":"fail"}\n'},"go-json","failure",["TestBoundary"],"go.log"));
});
