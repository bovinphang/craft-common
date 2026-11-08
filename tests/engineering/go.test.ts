import test from "node:test";
import assert from "node:assert/strict";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-GO-01 cancellation unblocks both workers and confirms completion",t=>{
  const root=engineeringExample(t,"cc-go-project-standard"),probe=execute("go",["version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING go; no Go evidence");return;}
  assert.equal(probe.status,0,probe.output);
  const env={GOTOOLCHAIN:"local",GOPROXY:"off",GOSUMDB:"off"};
  const compile=execute("go",["test","-run=^$","./..."],root,env);assert.equal(compile.status,0,compile.output);
  for(const mode of ["1","0"]) {
    const result=execute("go",["test","-json","-count=1","-timeout=15s","./..."],root,{...env,CRAFT_ENGINEERING_DEFECTIVE:mode});
    assessExecution(result,"go-json",mode==="1"?"failure":"success",["TestCancellationWaitsForBoth"],"captured-in-test");
  }
});
