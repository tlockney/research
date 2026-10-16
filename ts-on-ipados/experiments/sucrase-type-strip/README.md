# Experiment: sucrase in place of esbuild for cell type stripping

Question from [`../../review.md`](../../review.md): can cdp-kernel's cell
transform use a pure-JS TypeScript stripper, so it can run inside a jitless
V8 isolate on iPadOS with no native esbuild binary?

Answer: yes, for everything except decorators. The conformance suite passes
unchanged on Node, and sucrase is fast enough under `--jitless`.

## Setup

- cdp-kernel at `ac6f478`, Node 24.22.0, Linux x86-64, sucrase 3.35.1.
- [`sucrase-type-strip.patch`](sucrase-type-strip.patch): with
  `CDPK_TYPE_STRIP=sucrase`, `stripTypesMapped` in `src/transform.ts` calls
  sucrase (`typescript` + `jsx` transforms, `disableESTransforms`,
  `keepUnusedImports` for `verbatimModuleSyntax`) instead of esbuild. Same
  TSX-then-TS fallback. acorn's module rewrite is untouched.
- Apply with `git apply` in a cdp-kernel checkout, then
  `npm install --no-save sucrase@3`.

## Results

| Suite | esbuild | sucrase |
| --- | --- | --- |
| e2e conformance (`test/e2e.py node`) | 48/48 | 48/48 |
| unit tests (`npm test`) | 384 pass, 0 fail | 377 pass, 7 fail |

The 7 unit failures:

- **3 cosmetic (JSX).** Tests match esbuild's exact output (double quotes,
  `/* @__PURE__ */`). sucrase emits `React.createElement('div', …)`. Same
  behavior.
- **3 real (decorators).** sucrase leaves standard and legacy decorators in
  the output, and acorn rejects `@`. esbuild lowers them today (#142). This
  is the degradation the review predicted.
- **1 debugger (source map).** sucrase keeps every line in place, blanking
  type-only lines. A breakpoint on an `interface` line maps to that blank
  line rather than the next statement. Fixable in `LineMap` by snapping
  forward to the next mapped line.

## Transform cost

[`bench.mjs`](bench.mjs), median of 15 runs after one warm-up, ms. Cells:
small (4 lines), medium (`src/sourcemap.ts`, 88 lines), large
(`src/kernel.ts`, 679 lines).

| Transformer | Mode | Load | Small | Medium | Large |
| --- | --- | --- | --- | --- | --- |
| esbuild (native, via IPC) | JIT | 16 | 1.8 | 2.1 | 6.4 |
| esbuild (native, via IPC) | jitless | 32 | 1.7 | 2.2 | 6.0 |
| sucrase | JIT | 55 | 0.3 | 1.4 | 5.1 |
| sucrase | jitless | 41 | 0.5 | 5.3 | 35.5 |
| TypeScript `transpileModule` | JIT | 273 | 2.8 | 5.1 | 20.9 |
| TypeScript `transpileModule` | jitless | 255 | 3.6 | 14.4 | 131.0 |

esbuild's first call also pays ~90–150 ms to start its service process.
sucrase's first jitless call on the large cell is 53 ms.

Size: sucrase bundles to ~200 KB minified (1.7 MB on disk with deps), against
23 MB for `typescript` and a 10 MB native binary for esbuild.

Reading: under jitless V8, sucrase is about 7x slower than with JIT but
still well under the threshold anyone would notice for a notebook cell.
`transpileModule` is 4x slower than sucrase jitless and costs 250 ms to
load, which rules it out as the default and keeps it as the fallback for
decorators. These are x86 desktop numbers; an iPad's jitless interpreter
will differ, so treat the ratios, not the absolute times, as the result.

## What this changes

- The type-strip seam is the right first cdp-kernel change: one function,
  `stripTypesMapped`, already isolates it.
- Decorators are the only gap. Options: route cells containing `@` to
  `transpileModule`, or reject them with a clear error in v1.
- The JSX unit tests should assert behavior, not esbuild's formatting, if
  the seam lands.
