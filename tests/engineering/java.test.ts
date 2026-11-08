import test from "node:test";
import assert from "node:assert/strict";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-JAVA-01 partial failure closes once and keeps the cause",t=>{
  const root=engineeringExample(t,"cc-java-project-standard"),probe=execute("javac",["-version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING JDK; no Java evidence");return;}
  assert.equal(probe.status,0,probe.output);
  const compile=execute("javac",["--release","17","ResourceBoundary.java","ResourceBoundaryTest.java"],root);assert.equal(compile.status,0,compile.output);
  for(const mode of ["1","0"]) {
    const result=execute("java",["-ea","-cp",root,"ResourceBoundaryTest"],root,{CRAFT_ENGINEERING_DEFECTIVE:mode});
    assessExecution(result,"native-json",mode==="1"?"failure":"success",["failure_closes_and_preserves_cause"],"captured-in-test");
  }
});
