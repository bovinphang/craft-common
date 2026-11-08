import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { example, execute } from "./fixtures.js";
test("Electron IPC boundary rejects untrusted sender and malformed arguments before side effects", (t) => {
  const root = example(t, "cc-electron-project-standard"),
    args = ["--test", "boundary.test.cjs"];
  const broken = execute(process.execPath, args, root, {
    CRAFT_EXAMPLE_DEFECTIVE: "1",
  });
  assert.notEqual(broken.status, 0);
  assert.match(broken.output, /untrusted sender/);
  assert.match(broken.output, /fail [1-9]/);
  const fixed = execute(process.execPath, args, root, {
    CRAFT_EXAMPLE_DEFECTIVE: "0",
  });
  assert.equal(fixed.status, 0, fixed.output);
  assert.match(fixed.output, /fail 0/);
  t.diagnostic(
    "Node IPC-handler unit behavior verified; Electron process/GUI, sandbox activation and signed packaging NOT RUN",
  );
});
test("Electron example wires the tested handler to a narrow preload and isolated renderer", (t) => {
  const root = example(t, "cc-electron-project-standard"),
    main = fs.readFileSync(path.join(root, "main.cjs"), "utf8"),
    preload = fs.readFileSync(path.join(root, "preload.cjs"), "utf8");
  assert.match(main, /ipcMain\.handle\('document:set-title',createSetTitle/);
  assert.match(
    main,
    /contextIsolation:true,nodeIntegration:false,sandbox:true/,
  );
  assert.match(
    preload,
    /ipcRenderer\.invoke\('document:set-title',\{title\}\)/,
  );
  assert.doesNotMatch(preload, /exposeInMainWorld\([^\n]*ipcRenderer\)/);
  t.diagnostic(
    "Static process contract only; Electron process/sandbox activation NOT RUN",
  );
});
