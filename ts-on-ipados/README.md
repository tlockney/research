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

## Next experiment

Swap sucrase for esbuild in cdp-kernel's cell transform and run the
conformance suite on Node. Measures the critical path the note names
(a pure-JS TypeScript transform) with no Swift and no iOS.
