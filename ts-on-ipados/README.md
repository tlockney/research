# ts-on-ipados

A TypeScript scripting and notebook environment for iPadOS, built on
cdp-kernel's kernel abstraction, with an on-device jitless V8 tier and
remote kernels on the homelab.

- Source design note: https://m4mini.ling-hydra.ts.net/docs/ts-on-ipados
  (tailnet only). Text copy: [`source/design-note.md`](source/design-note.md).
- [`review.md`](review.md): review of the 2026-10-15 note. Verdict, the
  claims that don't hold, and the changes to cdp-kernel that would de-risk
  the plan without committing to iOS.

## Status

Design exploration. Nothing built.

## Experiments

- [`experiments/sucrase-type-strip/`](experiments/sucrase-type-strip/):
  sucrase in place of esbuild for cell type stripping. Conformance suite
  passes on Node; decorators are the only gap; jitless cost is acceptable.

## Next

Make type stripping pluggable in cdp-kernel (the first of the review's four
changes), with sucrase as an option and `transpileModule` for cells that use
decorators. Then the transport seam in `Kernel`.
