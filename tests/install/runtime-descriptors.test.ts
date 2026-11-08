import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import * as common from "../../src/index.js";

type Input = {
  runtime: string;
  cwd: string;
  home: string;
  scope: "local" | "global";
  env: NodeJS.ProcessEnv;
  compatibility: "frontend" | "backend";
  baseDir?: string;
};
type Targets = { baseDir: string; skillsDir?: string; resourceRoots: string[] };
const api = common as unknown as {
  resolveRuntimeTargets(input: Input): Targets;
};
const cwd = path.resolve("contract-project"),
  home = path.resolve("contract-home");
function resolve(runtime: string, options: Partial<Input> = {}): Targets {
  assert.equal(
    typeof api.resolveRuntimeTargets,
    "function",
    "common exports runtime target resolution",
  );
  return api.resolveRuntimeTargets({
    runtime,
    cwd,
    home,
    scope: "local",
    env: {},
    compatibility: "frontend",
    ...options,
  });
}

test("Codex keeps its skill target separate from CODEX_HOME", () => {
  for (const compatibility of ["frontend", "backend"] as const) {
    const config = path.join(home, "custom-codex");
    const target = resolve("codex", {
      scope: "global",
      compatibility,
      env: { CODEX_HOME: config },
    });
    assert.equal(target.baseDir, config);
    assert.equal(target.skillsDir, path.join(home, ".agents", "skills"));
    assert.ok(
      target.resourceRoots.includes(path.join(home, ".agents", "skills")),
    );
  }
});

test("OpenClaw local skills belong to the workspace rather than config directory", () => {
  assert.equal(resolve("openclaw").baseDir, path.join(cwd, ".openclaw"));
  assert.equal(resolve("openclaw").skillsDir, path.join(cwd, "skills"));
  const state = path.join(home, "state");
  assert.equal(
    resolve("openclaw", {
      scope: "global",
      env: {
        OPENCLAW_STATE_DIR: state,
        OPENCLAW_CONFIG_DIR: path.join(home, "ignored"),
      },
    }).skillsDir,
    path.join(state, "skills"),
  );
});

test("explicit configuration roots retain distinct host-specific skill targets", () => {
  const baseDir = path.join(cwd, "custom-config");
  assert.equal(
    resolve("claude", { baseDir }).skillsDir,
    path.join(baseDir, "skills"),
  );
  assert.equal(
    resolve("codex", { baseDir }).skillsDir,
    path.join(cwd, ".agents", "skills"),
  );
  assert.equal(
    resolve("openclaw", { baseDir }).skillsDir,
    path.join(cwd, "skills"),
  );
});

test("all fifteen local targets preserve the captured directory and skill contracts", () => {
  const cases = [
    ["claude", ".claude", true],
    ["codex", ".codex", true],
    ["cursor", ".cursor", true],
    ["windsurf", ".windsurf", true],
    ["opencode", ".opencode", true],
    ["kilo", ".kilo", true],
    ["gemini", ".gemini", true],
    ["copilot", ".github", false],
    ["antigravity", ".agent", true],
    ["augment", ".augment", true],
    ["trae", ".trae", false],
    ["codebuddy", ".codebuddy", true],
    ["cline", "", false],
    ["openclaw", ".openclaw", true],
    ["qoder", ".qoder", true],
  ] as const;
  for (const compatibility of ["frontend", "backend"] as const) {
    for (const [id, directory, skills] of cases) {
      const result = resolve(id, { compatibility });
      assert.equal(result.baseDir, path.join(cwd, directory));
      assert.equal(Boolean(result.skillsDir), skills, id);
    }
  }
});

test("global defaults and environment precedence retain existing product differences", () => {
  for (const compatibility of ["frontend", "backend"] as const) {
    assert.equal(
      resolve("cline", { scope: "global", compatibility }).baseDir,
      path.join(home, "Documents", "Cline"),
    );
    assert.equal(
      resolve("windsurf", { scope: "global", compatibility }).baseDir,
      path.join(home, ".codeium", "windsurf"),
    );
    assert.equal(
      resolve("antigravity", { scope: "global", compatibility }).baseDir,
      path.join(home, ".gemini", "config"),
    );
    assert.equal(
      resolve("opencode", {
        scope: "global",
        compatibility,
        env: { XDG_CONFIG_HOME: path.join(home, "xdg") },
      }).baseDir,
      path.join(home, "xdg", "opencode"),
    );
  }
  assert.equal(
    resolve("claude", { scope: "global", env: { CLAUDE_CONFIG_DIR: "" } })
      .baseDir,
    path.join(home, ".claude"),
  );
  assert.equal(
    resolve("claude", {
      scope: "global",
      compatibility: "backend",
      env: { CLAUDE_CONFIG_DIR: "" },
    }).baseDir,
    path.resolve(""),
  );
});

test("unknown runtime, scope and compatibility fail rather than falling back", () => {
  assert.throws(() => resolve("not-a-runtime"), /runtime/i);
  assert.throws(() => resolve("constructor"), /runtime/i);
  assert.throws(
    () => resolve("claude", { scope: "invalid" as Input["scope"] }),
    /scope/i,
  );
  assert.throws(
    () =>
      resolve("claude", { compatibility: "invalid" as Input["compatibility"] }),
    /compatibility/i,
  );
});
