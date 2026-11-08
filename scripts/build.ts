import { build } from "esbuild";
await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  packages: "bundle",
  banner: {
    js: 'import { createRequire as __craftCreateRequire } from "node:module"; const require = __craftCreateRequire(import.meta.url);',
  },
});
