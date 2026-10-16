// Usage: node [--jitless] bench.mjs <esbuild|sucrase|typescript> <cdp-kernel dir>
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
const [which, dir] = process.argv.slice(2);
const require = createRequire(dir + "/package.json");
const small = `const x: number = 1;\ninterface P { a: string }\nconst p: P = { a: "hi" };\np.a + x`;
const medium = readFileSync(dir + "/src/sourcemap.ts", "utf8");
const large = readFileSync(dir + "/src/kernel.ts", "utf8");
let t0 = performance.now();
let fn;
if (which === "esbuild") {
  const { transformSync } = require("esbuild");
  fn = (c) => transformSync(c, { loader: "ts", target: "esnext" }).code;
} else if (which === "sucrase") {
  const { transform } = require("sucrase");
  fn = (c) => transform(c, { transforms: ["typescript"], disableESTransforms: true, keepUnusedImports: true }).code;
} else {
  const ts = require("typescript");
  fn = (c) => ts.transpileModule(c, { compilerOptions: { target: 99, module: 99, verbatimModuleSyntax: true } }).outputText;
}
const load = performance.now() - t0;
const out = { which, jitless: process.execArgv.includes("--jitless"), load_ms: +load.toFixed(1) };
for (const [name, c] of [["small", small], ["medium", medium], ["large", large]]) {
  t0 = performance.now(); fn(c); const first = performance.now() - t0;
  const runs = [];
  for (let i = 0; i < 15; i++) { t0 = performance.now(); fn(c); runs.push(performance.now() - t0); }
  runs.sort((a, b) => a - b);
  out[name] = { lines: c.split("\n").length, first_ms: +first.toFixed(2), median_ms: +runs[7].toFixed(2) };
}
console.log(JSON.stringify(out));
