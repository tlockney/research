# Review: "A TypeScript Environment for iPadOS"

Reviewed: the design note dated 2026-10-15 (text copy in
[`source/design-note.md`](source/design-note.md)).
Checked against: cdp-kernel at commit `7140db5`, the rusty_v8 README, V8's
"JIT-less V8" post, and public reports on JavaScriptCore and the Files app.

## Verdict

The idea holds up. The thesis is right: rusty_v8 does build jitless for
`aarch64-apple-ios` and with JIT for the simulator, selected by its
`build.rs`, so the engine the remote tier runs on can run on the device. The
staging (prototype on JavaScriptCore behind the `KernelTarget` seam, swap
in V8 later) and the "Tier 0 with zero Swift" rule are the two best
decisions in the document. Keep both.

Three claims are wrong and one of them sits on the critical path:

1. **Acorn does not parse TypeScript**, so the v1 transform the note relies
   on does not exist as described. A pure-JS transpiler does; see below.
2. **The protocol half is not portable "unchanged".** It depends on Node's
   `net`, `crypto`, `buffer` and `process`. Portable with a thin shim, yes.
3. **Files does not cache SMB for offline use.** The note's sync story
   needs a different primitive, and the Mac mini already has one.

The rest of this review is ordered by how much it changes the plan.

## 1. The transform (§06): the critical path is misdescribed

The note says: "Acorn is already a cdp-kernel dependency and parses TS; an
acorn-based type-strip-only mode is the honest v1."

In cdp-kernel the pipeline is esbuild first, acorn second. `stripTypesMapped`
in `src/transform.ts` calls esbuild's `transformSync` to strip types and
compile JSX. Acorn then parses the resulting JavaScript to rewrite
`import`/`export` into `__cdpk.import` calls and, for the eval-style
targets, to hoist top-level declarations. Acorn has no TypeScript grammar.
The third-party `acorn-typescript` plugin exists but is not maintained and
is not what cdp-kernel uses. So the note's "load-bearing beam" for v1 is
missing, and its risk register names the wrong fallback.

What does exist, in pure JavaScript with no wasm and no binary:

| Option | Handles | Drops or passes through | Notes |
|---|---|---|---|
| sucrase | TS types, TSX, enums, `import type`, const enums as plain enums | value `namespace` blocks, decorators, `accessor` | ~8x faster than tsc, emits source maps, designed for isolated-module transforms |
| `typescript` `transpileModule` | Everything tsc emits, decorators included | nothing | ~9 MB of JS; slow to load on an interpreter, per-cell cost is fine for cell-sized input |
| ts-blank-space | Type erasure only, preserves positions | enums, namespaces, decorators | depends on the `typescript` package's parser, so it carries the same weight |

Recommendation: sucrase for cells in v1, with `transpileModule` as the
"full transform" pressure valve instead of the WKWebView sidecar. Both run
in the kernel isolate, so the sidecar is not needed for transforms at all.
Keep the sidecar idea for tsserver (§06 checking ladder, last rung), where
it is the only option.

The degradation list in the note changes accordingly: TSX and enums work
in v1; decorators are what degrade.

This is also the one experiment that can run today with no Swift and no
iOS: make the type-strip step in `src/transform.ts` pluggable, run
cdp-kernel's conformance suite on Node with sucrase in esbuild's place, and
read the diff. A weekend, and it measures the actual critical path.

## 2. Portability of the protocol half (§04)

The note says zmtp, wire, kernel, `bootstrap.mjs` and `display.mjs` are
"portable TS that runs unchanged inside a jitless isolate". Checked against
the imports:

| File | Node-only imports |
|---|---|
| `src/zmtp.ts` | `node:net` (`createServer`, `Socket`), `node:crypto` (`randomBytes`), `node:buffer` |
| `src/wire.ts` | `node:crypto` (`createHmac`, `randomUUID`, `timingSafeEqual`), `node:buffer` |
| `src/kernel.ts` | `node:process`, `node:crypto`, `node:buffer`, plus imports of every target class |
| `runtime/bootstrap.mjs` | `node:url`, and `node:util`/`node:fs` on demand |
| `runtime/display.mjs`, `runtime/evaluator.mjs` | none |

A bare deno_core isolate has none of the `node:` modules. The honest
statement is "portable behind a shim of about three ops: a TCP listener,
HMAC-SHA256, and a `Buffer`". `randomUUID`, `timingSafeEqual` and HMAC are
all available through WebCrypto if the isolate includes Deno's web
extensions, which deno_core users normally do. The TCP op is only needed if
the local kernel speaks ZMTP at all (next section).

Two structural points the note does not mention:

- `Kernel` constructs its four ZMTP sockets itself from a connection file
  (`src/kernel.ts`, constructor). There is no transport seam. An in-process
  client would have to talk ZMTP over loopback to its own kernel, or
  `Kernel` needs a channel interface with ZMTP as one implementation. The
  second is the right change, and it is small.
- `src/kernel.ts` imports `BunTarget`, `WorkerdTarget`, `launchCelld` and
  `Debugger` directly, and those pull in `node:child_process`. A kernel
  bundle for an isolate needs target construction factored out so those
  can be left behind. Also small.

## 3. Two protocols, not one (§04, §09 Tier 1)

Tier 1 says "Jupyter wire protocol in Swift (zmtp.ts as the port map),
remote kernels only". That is a port of about 400 lines, which is feasible,
but it is the wrong protocol for a remote client. JupyterLab, VS Code and
Juno Connect never speak ZMTP to a remote kernel. They speak Jupyter
Server's REST API plus one WebSocket per kernel
(`/api/kernels/{id}/channels`), which multiplexes the five channels as JSON.
ZMTP is only ever spoken between a kernel and the server on the same host.

So:

- **Tier 1** is an HTTP + WebSocket client. No ZMTP, no HMAC signing, no
  port map. Token auth is a header. This is simpler than the note budgets.
- **Tier 2's local kernel** does not need ZMTP for the app's own use at
  all. With the transport seam from section 2, the app's client can talk
  to the in-process kernel using the same channel-JSON shape the WebSocket
  carries. One client code path, local or remote. That is the "local is
  just a kernelspec" unification done at the protocol level, which is
  where it is cheapest.
- **ZMTP on the iPad** survives only as the development convenience the
  note describes: a loopback listener so JupyterLab on the Mac can drive
  the device kernel over the tailnet while the editor is immature. Worth
  having, but it is a dev flag, not architecture.

## 4. Storage (§05): SMB is the wrong primitive, and the Mac already has the right one

The note: "Files handles offline caching; sync happens when the tailnet
returns." The Files app's SMB provider does not keep offline copies. It
needs a live connection, and when the connection drops mid-session it has a
history of blocking file-coordination calls rather than failing. A notebook
library on SMB is unusable on a train.

m4mini is a Mac, so iCloud Drive is available on both ends with no custom
code: the Jupyter server's notebook root is a folder in iCloud Drive on the
Mac; the iPad sees the same folder in Files with real offline caching and
"Keep Downloaded". Two cautions: point Jupyter's checkpoint directory
outside the synced folder (`FileCheckpoints.checkpoint_dir`) or iCloud
syncs every autosave; and expect a few seconds of propagation, which the
"reattach to remote and re-run" gesture tolerates.

Alternatives if iCloud is unwanted: Working Copy (git, which notebooks want
anyway), or Syncthing via Möbius Sync. SMB over Tailscale stays useful as a
live mount for browsing the rack, not as the sync story.

## 5. Engine facts (§02, §03): mostly right, two to soften

- **rusty_v8 iOS support**: confirmed in the current README. Device target
  jitless, simulator target with JIT, WebAssembly disabled on device,
  `build.rs` picks the configuration. Cross-compile from an arm64 Mac.
- **V8 jitless numbers**: the 40% (Speedometer 2.0) and 6% (a YouTube
  living-room session) are from V8's 2019 post, at V8 7.4. The same post
  reports an 80% regression on the Web Tooling Benchmark, the one workload
  that resembles running a transpiler or type checker on device. That is
  the number §06 should budget against, not 6%. Cell code will be fine;
  the toolchain running inside the isolate is the slow path.
- **JavaScriptCore and WebAssembly**: the note states embedded JSC has no
  wasm, "blocked by OS execution policy". The public evidence is mixed: a
  failure report on iOS 12.4 and success reports on iOS 14 and 15 in the
  same Apple forum thread, and JSC has had an interpreter-only wasm tier
  since 2020 that needs no executable memory. Treat this as "test on the
  target iOS version", not settled. If wasm works in a `JSContext`, the
  JSC prototype can run esbuild-wasm in-process, which makes Option B a
  better prototype than the note gives it credit for. It does not change
  the final pick, which rests on engine parity.
- **WKWebView JIT "around iOS 14.5"**: WKWebView's JavaScript has always
  run in the out-of-process WebContent process, which has JIT and wasm.
  Not load-bearing; just say that.
- **Interrupts**: correct that `TerminateExecution` works jitless via the
  stack guard, and correct that this beats the Bun and workerd targets.
  One constraint to make explicit: it only works if the cell isolate is
  on its own thread and the terminate call comes from native code (Swift
  or Rust), not through the kernel isolate's event loop. If both isolates
  share one thread, a busy cell blocks the kernel and the interrupt is
  never seen. This is the same reason the Node and Deno targets start every
  cell with `await __cdpk.tick()`. The note's "interrupt must never
  deadlock the host isolate" is this point; it deserves to be a design rule
  with a conformance test.

## 6. Capability manifest (§05): yes, and there is precedent in the repo

`cdp-kernel install` already writes a `metadata` object into `kernel.json`
with `runtime`, `denoCompat`, `version` and `debugger` (`src/main.ts`), and
JupyterLab reads `metadata.debugger` to enable its debugger. A
`capabilities` object belongs in the same place, so a client can badge a
kernel before launch, and in `kernel_info_reply` for in-session use.
Jupyter's protocol tolerates extra fields in `kernel_info_reply`; generic
clients ignore them, which is fine for a bespoke one.

The open question "is there appetite upstream for a kernelspec schema that
carries capability manifests" answers itself: cdp-kernel is the upstream.

The runtime-honest availability linting (enumerate `globalThis` once after
boot) is good and cheap. One note: on eval-style targets `lexicalNames()`
returns nothing and completion comes from `globalThis` properties, as
`docs/known-gaps.md` records for Bun. The iOS target will be the same,
whichever evaluate strategy it uses, unless it goes through the inspector.

## 7. The product question (§09)

The note asks whether the local tier is a product or a feature and defers
to Tier 0 usage. Two things sharpen it:

- For notebooks alone, remote wins, and the note's own degradation ladder
  is a list of reasons why. The local tier earns its keep only with the
  automation register (§08): share sheet, widgets, Shortcuts. So Tier 2 and
  Tier 3 are coupled, not parallel. Decide whether the automation surface
  is wanted before paying for the rusty_v8 toolchain. If it is not, stop at
  Tier 1.
- Scriptable proves JSC carries the automation register fine. If
  automation is the reason for the local tier, the JSC prototype may be the
  shipping engine for scripts, with V8 parity mattering only for notebook
  cells. That is a legitimate end state the note does not list.

Tier 0 additions: try JupyterLab in Safari on the iPad alongside Juno
Connect. The hardware-keyboard shortcuts in Safari are the real test of
whether a bespoke client is needed. Tier 0 can also test "tsc --noEmit as a
remote kernel op" for free.

## 8. Small corrections

- "An iOS target is a ninth implementation": cdp-kernel has five runtimes
  and three channel implementations (CDP, Bun pipe, Worker session). Say
  "another".
- `transformCellForEval` and `runtime/evaluator.mjs` are shared by Bun,
  workerd and celld already, so the Bun-style wrapper the note recommends
  starting with reuses existing code on both sides of the seam. The note
  implies more new work there than exists.
- The 30-50 MB binary estimate is plausible for a V8 monolith on arm64
  with a snapshot. The snapshot must come from the same jitless build
  configuration it ships with; the note says this, keep it.

## Where cdp-kernel has a part

Not the iOS target itself. That belongs in the app's repository: Rust ops,
an `IosTarget` class, and a kernel bundle, consuming `@tlockney/cdp-kernel`
as a library. Four changes in cdp-kernel would make that consumption
possible and are worth doing on their own:

1. **Pluggable type-strip in `src/transform.ts`.** esbuild stays the
   default; a function-valued option takes sucrase or `transpileModule`.
   Benefits Deno hosts too, which currently carry esbuild's native binary.
   This is also the experiment from section 1.
2. **A transport seam in `Kernel`.** Shell, control, stdin and iopub as an
   interface; ZMTP as the default implementation; an in-memory
   implementation for tests and for embedding.
3. **Target construction out of `src/kernel.ts`.** A registry or factory
   so a bundle can omit the `child_process`-based targets.
4. **`capabilities` in kernelspec metadata and `kernel_info_reply`**, for
   all five existing targets first. The known-gaps page already lists what
   each lacks; this makes it machine-readable.

None of these commit cdp-kernel to iOS. All four are testable with the
existing conformance suite. Item 1 is the one to do first, because it
answers the question the note's risk register puts at the top.

## Sources

- rusty_v8 README, iOS section: https://github.com/denoland/rusty_v8
- V8, "JIT-less V8" (2019): https://v8.dev/blog/jitless
- Apple Developer Forums, WebAssembly in `JSContext`: https://developer.apple.com/forums/thread/121040
- KeePassium on Files + SMB offline behaviour: https://keepassium.com/articles/sync-ios-keepass-with-smb-share/
- Apple Developer Forums, Files SMB blocking on disconnect: https://developer.apple.com/forums/thread/133435
- sucrase README: https://github.com/alangpierce/sucrase
- cdp-kernel: `src/transform.ts`, `src/kernel.ts`, `src/target.ts`, `src/main.ts`, `docs/architecture.md`, `docs/integrations.md`, `docs/known-gaps.md`
