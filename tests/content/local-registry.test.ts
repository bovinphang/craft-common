import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createHash } from "node:crypto";

test("loopback registry preserves each candidate's own manifest, integrity and archive bytes",async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"cc-local-registry-"));
  const state:{child?:ChildProcess}={};let base="";
  t.after(async()=>{
    const child=state.child;
    if(child){
      if(base)await fetch(base+"/__shutdown",{method:"POST",signal:AbortSignal.timeout(1000)}).then(response=>response.text()).catch(()=>undefined);
      if(child.exitCode===null){child.kill();await Promise.race([once(child,"exit"),new Promise(resolve=>setTimeout(resolve,1000))]);}
    }
    fs.rmSync(root,{recursive:true,force:true});
  });
  const versions=["2.0.0-dev.test.1","2.0.0-dev.test.2"],archives:string[]=[];
  fs.mkdirSync(path.join(root,"package"));
  for(const version of versions){fs.writeFileSync(path.join(root,"package/package.json"),JSON.stringify({name:"@bovinphang/craft-common",version}));const archive=path.join(root,version+".tgz");assert.equal(spawnSync("tar",["-czf",archive,"-C",root,"package"],{windowsHide:true}).status,0);archives.push(archive);}
  fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({name:"@bovinphang/craft-common",version:versions[1]}));
  const config=path.join(root,"local.npmrc"),env={...process.env};delete env.NODE_TEST_CONTEXT;
  const child=spawn(process.execPath,["--import",import.meta.resolve("tsx"),path.resolve(import.meta.dirname,"../../scripts/local-registry.ts"),archives[1],config,"--also",archives[0]],{cwd:root,env,windowsHide:true,stdio:["ignore","pipe","pipe"]});
  state.child=child;
  child.stdout!.resume();let errors="";child.stderr!.on("data",data=>{errors+=String(data);});
  for(let i=0;i<100&&!fs.existsSync(config)&&child.exitCode===null;i++)await new Promise(resolve=>setTimeout(resolve,25));
  assert.ok(fs.existsSync(config),errors);
  base=fs.readFileSync(config,"utf8").trim().split("=")[1].replace(/\/$/,"");
  const response=await fetch(base+"/@bovinphang%2fcraft-common"),manifest=await response.json() as {versions:Record<string,{version:string;dist:{tarball:string;integrity:string}}>};
  assert.deepEqual(Object.keys(manifest.versions).sort(),versions);
  for(let index=0;index<versions.length;index++){
    const entry=manifest.versions[versions[index]],body=fs.readFileSync(archives[index]);
    assert.equal(entry.version,versions[index]);assert.equal(entry.dist.integrity,"sha512-"+createHash("sha512").update(body).digest("base64"));
    const actual=await fetch(entry.dist.tarball);assert.deepEqual(Buffer.from(await actual.arrayBuffer()),body);
  }
  const missing=await fetch(base+"/@bovinphang/craft-common/-/craft-common-unknown.tgz");assert.equal(missing.status,404);await missing.text();
});
