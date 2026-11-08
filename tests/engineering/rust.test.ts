import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { engineeringExample,execute } from "./fixtures.js";
import { assessExecution } from "../../scripts/lib/engineering-evidence.js";
test("EP-RS-01 Result failures retain cause and release acquired resources",t=>{
  const root=engineeringExample(t,"cc-rust-project-standard"),probe=execute("cargo",["--version"],root);
  if(probe.error?.message.includes("ENOENT")){t.skip("MISSING cargo; Rust evidence absent");return;}
  assert.equal(probe.status,0,probe.output);
  const args=["test","--offline","--locked"],env={CARGO_TARGET_DIR:path.join(root,"target")};
  const compile=execute("cargo",[...args,"--no-run"],root,env);assert.equal(compile.status,0,compile.output);
  const broken=execute("cargo",args,root,{...env,CRAFT_ENGINEERING_DEFECTIVE:"1"});
  assert.notEqual(broken.status,0);assert.match(broken.output,/failure_releases_and_preserves_cause.*FAILED/);
  const fixed=execute("cargo",args,root,{...env,CRAFT_ENGINEERING_DEFECTIVE:"0"});
  assert.equal(fixed.status,0,fixed.output);assert.match(fixed.output,/2 passed; 0 failed/);
  assessExecution(broken,"cargo","failure",["failure_releases_and_preserves_cause"],"captured-in-test");
  assessExecution(fixed,"cargo","success",["failure_releases_and_preserves_cause","success_releases_owned_lease"],"captured-in-test");
});
