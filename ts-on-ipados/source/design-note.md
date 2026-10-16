<!-- Text extracted from https://m4mini.ling-hydra.ts.net/docs/ts-on-ipados (HTML snapshot dated 2026-10-15), kept here because the original is only reachable on the tailnet. Page navigation, diagrams and footer were dropped in extraction. -->

# A TypeScript Environment for iPadOS

_Design Note · Personal Projects_

A design record for a TypeScript-first scripting and notebook environment on iPadOS—one app with two runtimes, built on cdp-kernel's kernel abstraction. It covers the platform constraints, the runtime options considered in detail, the local/remote unification model, and a tiered path from "notebooks on the iPad this weekend" to a full editor and automation environment.

**Status:** Design exploration · **Owner:** Thomas Lockney · **Updated:** 2026-10-15

## Contents

- The premise — one app, two runtimes
- Ground truth — what iOS actually permits
- Runtime options — six ways to execute TypeScript on device
- cdp-kernel as the kernel layer
- The unified model — local is just a kernelspec
- TypeScript authoring on device
- The iPadOS canvas — layout for a large screen
- The automation surface
- Roadmap, risks, and open questions

## 01. The premise — one app, two runtimes

The goal is a TypeScript-based scripting and authoring environment for iOS/iPadOS in the spirit of Juno for Python or Scriptable for JavaScript—but with Deno-flavored semantics, and with a property none of the existing products have: a single app that can execute against an on-device runtime or against remote kernels on the homelab, without a hard split between the two experiences. The iPad is treated as a first-class canvas throughout; nothing in this design is a scaled-up iPhone app.

Three product shapes live inside this one envelope. A script editor for single-file automation—the Scriptable register: share-sheet actions, widgets, notifications, Shortcuts integration. A notebook interface for exploratory work—the Jupyter register: cells, outputs, rich display, a kernel picker. And a playground mode for scratch evaluation—the Swift Playgrounds register: immediate feedback, minimal chrome. They share one runtime, one permission model, and one file story. The differentiator is the last one: local/remote as a session property, not an app identity or a $9.99 upgrade.

The prior art establishes both the ceiling and the gap:

| Product | What it is | What it gets right | What's missing |
| --- | --- | --- | --- |
| Juno | Notebook UI with a local Python runtime | Proves notebooks work on iPadOS; deep Files integration | Local Python without numpy is weak; no TS |
| Juno Connect | Jupyter client for remote servers | Proves the remote-kernel client works on iPadOS | A separate app—exactly the split this design dissolves |
| Scriptable | JSC embed + iOS automation APIs | The automation register: share sheet, widgets, x-callback URLs | No TypeScript, no notebooks, no remote story |
| CodeApp | Monaco + embedded Node on iPad | Proves a full IDE with a V8 runtime ships on the App Store | IDE-first, not notebook-first; JSC-era editor weight |
| a-Shell | Unix-flavored terminal with interpreters | Package installs on device survived App Review | No kernel abstraction, no sync story |

One app, one notebook format, one kernel abstraction. "Local" is a kernelspec. Shared storage replaces transfer. Capability negotiation replaces silent breakage.

---

## 02. Ground truth — what iOS actually permits

Every design decision downstream follows from a small set of platform facts. These are not opinions, and two of them are permanent: third-party apps cannot allocate writable-and-executable memory, and the sandbox is the filesystem.

iOS denies the JIT entitlement to non-WebKit processes. A page can be writable or executable, never both, so a JIT compiler—which writes machine code at runtime and then executes it—cannot run. V8's answer is --jitless: interpreter-only execution (Ignition), no runtime allocation of executable memory, and no WebAssembly. V8's own cross-compile guide calls jitless "a hard requirement for iOS." The performance penalty is real but narrower than folklore suggests: roughly 40% slower on Speedometer-class synthetic benchmarks, but only around 6% on the V8 team's real-world embedder benchmarks. Glue code, JSON wrangling, and API orchestration—the actual workload of a scripting environment—sit on the benign end of that range.

The full constraint set, in one place:

| Capability | On-device verdict | Consequence |
| --- | --- | --- |
| JIT compilation | Prohibited (no W+X pages) | Every embedded engine runs interpreter-only |
| WebAssembly | Dead in an embedded jitless engine | No esbuild-wasm, no wasm libraries in the runtime tier |
| Subprocesses (fork/exec) | Prohibited | No spawning compilers, shells, or helper binaries |
| Listening sockets | Foreground only | Deno.serve is a foreground activity at best |
| Background execution | ~30s after suspend | Kernels die with the app; state must be a re-run away |
| Filesystem | Sandbox + TCC | Deno's permission model maps almost 1:1 onto iOS reality |
| Binary size | Soft constraint | jitless V8 + snapshot ≈ 30–50 MB added to the app |

> **Caveat · JIT exceptions exist, none apply**
>
> WKWebView embeds gained JIT access around iOS 14.5 under specific conditions, and the EU DMA permits alternative browser engines—which would get the entitlement—but only for qualifying browser apps in the EU. For a notebook or automation app, jitless is permanent. Design for it; don't hold out for it.

One enabler changed recently and it is the load-bearing fact of this whole design: rusty_v8 now supports iOS as a build target. The device target (aarch64-apple-ios) builds jitless; the simulator target (aarch64-apple-ios-sim) keeps the JIT; build.rs selects the configuration automatically. Building the "packaged Deno runtime" is now V8_FROM_SOURCE=1 cargo build --target aarch64-apple-ios plus an XCFramework wrapper—a Rust static library linked into a SwiftUI shell. That is why the timing on this project is now, where it wasn't two years ago.

Finally, App Store rule 2.5.2 forbids downloading executable code, with an established carve-out for code the user authors or that runs in a WebKit WebView. Scriptable, CodeApp, a-Shell, and Juno all ship embedded interpreters executing user-typed code. The gray zone is runtime fetch of executable code from the network—package installs—where the same products have set workable precedent, but it deserves deliberate treatment (§08).

---

## 03. Runtime options — six ways to execute TypeScript on device

There are six credible paths for the on-device execution tier. They differ on engine semantics, toolchain weight, WebAssembly availability, and how faithfully they reproduce the remote tier's behavior. The recommendation is V8-jitless via rusty_v8, but the trade space deserves a full accounting before committing, because the second choice (JavaScriptCore) is dramatically cheaper to prototype with and the decision can be staged.

### Option A — V8 jitless via rusty_v8 / deno_core (recommended)

What it is: embed V8 built from source with target_os = "ios", v8_monolithic = true, v8_enable_pointer_compression = false, the startup snapshot baked into the binary—and drive it from Rust through rusty_v8's bindings, optionally with deno_core's ops/extension machinery on top. rusty_v8 officially supports the iOS device target (jitless, wasm disabled) and the simulator target (JIT kept).

What you get: real V8 isolates—one isolate per concern, host logic and cell execution cleanly separated; deno_core's extension system as the bridge layer for iOS APIs, written in Rust; tokio-backed async ops; the V8 inspector for in-process CDP-style debugging; and the snapshot AOT pattern—run SnapshotCreator at build time against the exact binary you embed, let the JS initialize, and deserialize a warm heap at app launch instead of paying interpreter startup costs on device. Interrupt semantics are a genuine advantage: terminate_execution() works jitless via the stack-guard interrupt, so a busy cell dies without losing isolate state—better than cdp-kernel's Bun and workerd targets, which restart and lose state.

What it costs: 30–50 MB of binary; no wasm and no JIT forever; you own a V8 cross-compile toolchain (rusty_v8 makes this tractable but it is still the heaviest dependency in the app); and V8's platform initializes once per process, so the runtime is single-instance—restart semantics need the isolate/recreate pattern, not process respawn.

### Option B — JavaScriptCore via JavascriptCore.framework

What it is: Apple's own engine as a public framework. JSContext, JSVirtualMachine, and Objective-C bridging are first-class; a Swift closure can be exposed to JS in an afternoon. It is free, it is native, and Apple maintains it for exactly this use.

Strengths: by far the cheapest prototype path; no toolchain; no binary weight; JSC's interpreter is well-tuned for the interpreter-only regime iOS forces anyway; and it is the engine Scriptable already proved in production.

Weaknesses that matter for this design specifically: no wasm in an embedded JSC (blocked by OS execution policy, not by effort—the same constraint that killed wasm-in-V8); one JSVirtualMachine per thread rather than V8's isolate model, which weakens the host/target isolation story; no snapshot-AOT story comparable to V8's SnapshotCreator; and—decisively—it is a different engine from the remote tier. Deno runs V8: util.inspect formats differently, builtins differ, and subtle behavior drifts between what a cell does locally and what the same cell does on cdp-deno. For a product whose thesis is parity across kernels, engine divergence is a tax paid forever.

### Option C — Hermes

What it is: React Native's engine, designed from the start for no-JIT mobile: TypeScript still needs a transpile step, but then Hermes compiles JS ahead of time to bytecode, trading peak performance for fast startup and low memory—which is exactly the mobile trade. Battle-tested in production at the exact scale this app cares about.

Why it's not the pick: the bytecode toolchain is coupled to the RN ecosystem; the AOT compilation step complicates the notebook's edit-run loop (cells arrive as source, not prebuilt bytecode); and like JSC it is not the remote tier's engine, so the parity argument applies. Worth revisiting only if a future pivot makes this a pure automation app where startup cost dominates—Hermes' home turf.

### Option D — Bun and workerd (not targets, but load-bearing precedent)

Neither ships on iOS and neither is a candidate. Their relevance is architectural: cdp-kernel's Bun backend runs cells in-process with no inspector at all—the host and Bun exchange JSON lines over a pipe, each cell becomes an async function on globalThis, and top-level declarations become properties later cells can see. The workerd target runs every cell inside one driver Worker's request context. These two backends prove the kernel abstraction does not require CDP or child processes—which is precisely the shape an iOS target must take. They are the design template for Option A's in-process backend, not competitors to it.

### Option E — WKWebView as the runtime

What it is: execute user code inside a (possibly hidden) WebView, bridging iOS APIs over WKScriptMessageHandler. The non-obvious advantage: WebKit's entitlements give the WebView's JSC a JIT and full WebAssembly—so this tier can run esbuild-wasm, which the embedded-runtime tier never can. That makes a hidden WebView a legitimate compiler sidecar: the app's transpile and bundling service, even if cells execute elsewhere.

Costs: it's JSC again (same parity tax); module loading and long-lived sessions are contortions; putting user code in the same WebView as editor UI muddies the security story. Its role in this design is infrastructure—not the cell runtime, but the escape hatch that keeps the TS pipeline honest (§06).

### Option F — QuickJS

What it is: the small, complete, interpreter-only ES2023 engine (quickjs-ng is the maintained fork). Embeds in a day, adds under a megabyte, no toolchain drama, used widely in exactly this kind of embedded product.

Why it's the fallback and not the pick: not V8 semantics (the parity tax again), measurably slower than V8's interpreter on heavy code, and no path to the snapshot/inspector/isolate machinery that the kernel layer wants. If the rusty_v8 toolchain ever proves too costly to maintain, this is the pragmatic retreat—it keeps the entire product design intact minus engine parity.

| Option | Engine parity | Wasm | Toolchain weight | Verdict |
| --- | --- | --- | --- | --- |
| A · V8 jitless (rusty_v8) | Exact | No | Heavy | The pick — the remote tier's engine, isolates, snapshot AOT |
| B · JavaScriptCore | Diverges | No | None | Prototype tier; cheapest validation |
| C · Hermes | Diverges | No | Medium | Right only for a pure-automation pivot |
| D · Bun / workerd | — | — | — | Prior art for the in-process backend pattern |
| E · WKWebView | Diverges | Yes (JIT too) | None | Compiler sidecar, not the cell runtime |
| F · QuickJS | Diverges | Partial | Light | The retreat position if V8 maintenance bites |

> **Recommendation · Stage the decision**
>
> Prototype the shell against JavaScriptCore (days), but architect the kernel layer so the engine is behind cdp-kernel's KernelTarget seam. Then swap in rusty_v8 behind that seam without touching the UI or the protocol code. The staging costs nothing—the seam exists for exactly this—and it removes the risk that the toolchain investigation blocks the UX work.

---

## 04. cdp-kernel as the kernel layer

cdp-kernel—a Jupyter kernel extracted from Deno's (deno jupyter, v2.9.6) that drives any V8 runtime over CDP—is not adjacent to this design; it is the server half of it. The kernel host runs on Node or Deno; cells run in a separate target runtime (Node, Deno over CDP; Bun, workerd, celld in-process). The remote tier of the iPad app is a Jupyter Server with cdp-kernel kernelspecs installed—full-fat V8 with JIT, wasm, npm, and a real filesystem, running on hardware already in the rack.

The architectural fact that makes the on-device port tractable is the seam. Everything the kernel needs from a target runtime is behind one interface:

```ts
/** What the kernel needs from a target runtime. (abridged) */
export interface KernelTarget {
  readonly runtime: RuntimeName;
  /** Turns a cell into the script evaluate() takes. */
  transform(code: string, options: CellTransformOptions): string;
  /** Runs a transformed cell. Rejects with Interrupted after interrupt(). */
  evaluate(script: string): Promise<EvaluateResult>;
  interrupt(): Promise<void>;
  /** Resolves once all output and messages sent so far have been delivered. */
  flush(): Promise<void>;
  broadcastResult(n: number, result: RemoteObject): Promise<void>;
  describeError(e: RemoteObject): Promise<ErrorShape>;
  propertyNames(expr: string): Promise<string[]>;
  lexicalNames(): Promise<string[]>;
  inspect(path: string, detail: number): Promise<string | null>;
  replyInput(value: string | null): void;
  kill(): void;
}
```

Nothing in it requires a child process. The Bun backend proves this by running cells in-process over a JSON-lines pipe, and workerd/celld prove it again with a driver Worker over a session WebSocket. An iOS target is a ninth implementation, not a rewrite—and the whole protocol half (zmtp, wire, kernel) and the display shims (bootstrap.mjs, display.mjs) are portable TS that runs unchanged inside a jitless isolate.

System shape: the app process holds both isolates behind the IosTarget seam; remote kernels are ordinary cdp-kernel targets; the notebook file lives on a share both sides reach.

### The isolate/isolate symmetry

cdp-kernel's host/target process split maps 1:1 onto isolate/isolate within one iOS process: kernel logic in one jitless isolate, cells in another, a message channel instead of pipes, and the barrier-marker output ordering the kernel already uses translating directly (on-device stdout is just a callback, so the demux logic carries over intact). Two implementation strategies for evaluate() present themselves, and the Bun precedent points the way:

In-process inspector. rusty_v8/deno_core expose the V8 inspector—the same machinery behind deno --inspect—so CdpSession works nearly verbatim against a same-process session: Runtime.evaluate with replMode, getProperties, globalLexicalScopeNames, throwOnSideEffect. Maximum reuse; more moving parts.

Bun-style wrapper. Skip the inspector entirely; transform each cell into an async function on globalThis (the transformCellForEval technique) and run it via rusty_v8 directly. Fewer dependencies, first-run semantics identical to a proven backend—start here.

### The conformance suite is the acceptance criterion

cdp-kernel passes a conformance suite derived from Deno's own Jupyter integration tests on every target. The iOS target earns its kernelspec by going green on that suite. And because the local kernel speaks ZMTP like its siblings, the development loop never needs the app's editor to be good yet: run JupyterLab on the Mac, connect over the tailnet to the iPad's kernel listening in the foreground, and drive the ninth target from a real frontend while building. The suite plus a ZMTP listener converts "port a runtime to iOS" from a leap into a treadmill.

---

## 05. The unified model — local is just a kernelspec

The Juno/Juno Connect split is an artifact of product history and App Store SKU economics, not a technical necessity. In this design the app has one notebook model and one kernel picker; whether the executing isolate lives in-process on the device or in a celld process on m4mini is a session property, not an app identity.

### Capability negotiation, not silent breakage

The floor is honest runtime errors—Deno-style, capability-labeled, specific: Deno.Command is not available on device (subprocess requires a remote kernel), never a misleading ENOENT. Two layers above that:

Advertise capabilities in kernel metadata. kernel_info already carries version wiring; add a capability manifest so the client can badge kernels before a single cell runs, and surface it in-band via the existing first-cell notice channel:

```json
{
  "kernel": "cdp-ios",
  "engine": "v8-jitless",
  "capabilities": {
    "jit": false, "wasm": false, "subprocess": false,
    "fs": "sandboxed", "net": "foreground-only",
    "install": "registry-fetch"
  }
}
```

Availability linting from the runtime itself. After the local kernel boots, enumerate its globals once (one globalLexicalScopeNames plus a getProperties pass over globalThis). The editor now holds the authoritative list of what exists on this target and can flag Deno.Command, WebAssembly, and friends before the cell ever runs—no static analysis, the runtime simply being honest about itself, and the same enumeration doubles as the completion source.

### Shared storage instead of transfer

"One-way transfer off device" is the wrong primitive, and iOS hands over the right one: Files speaks SMB natively, and the tailnet already reaches the rack. Put the notebook library on an SMB share over Tailscale and put the remote kernels' working directory on the same share. The notebook becomes one file with two runtimes—created locally against the on-device kernel, reattached to cdp-deno from the same Files list, no migration step anywhere. Files handles offline caching; sync happens when the tailnet returns. Nothing custom to write, debug, or regret.

Because Jupyter semantics already keep state in cells rather than in the kernel, the recovery affordance composes: when a local cell hits a capability wall, the error and the fix are one gesture—reattach to remote and re-run—a button, not a migration.

### The degradation ladder

Explicitly legible, never hidden: the capability badge (before you run), capability-labeled errors (when you hit a wall), reattach-and-re-run (the exit). The one degradation that can't be badged away is iOS suspending the app and killing the local kernel—but that is the same mental model cdp-kernel already trains on Bun and workerd: restart, re-run, state is one execution pass away. Persist outputs to the notebook file continuously and the app behaves like every notebook already does.

Design for the split being visible and deliberate—a badge, not a veil. A local tier that is a different, honest thing beats a local tier that pretends to be the remote one.

---

## 06. TypeScript authoring on device

The runtime is the easy half. The hard product question is what writing TypeScript feels like—and on a jitless, no-wasm, no-subprocess device, every step in the conventional TS pipeline has to be re-derived.

### The transform problem

esbuild is a native binary: no subprocess to run it, and esbuild-wasm needs wasm that jitless V8 cannot execute. This constraint reaches further than it first appears—cdp-kernel's workerd target bundles imports host-side, but on iOS the host isolate is the same jitless, no-wasm environment, so there is no esbuild anywhere on device, in either half. The on-device transform must be pure JavaScript. Acorn is already a cdp-kernel dependency and parses TS; an acorn-based type-strip-only mode is the honest v1 (TSX, enums, and decorators degrade—the editor should say so at the paste, not at the run). The WKWebView sidecar (§03, Option E) is the pressure valve: esbuild-wasm runs fine in a hidden WebView, so a "full transform" pass can exist without contaminating the runtime tier's constraint profile.

### The checking ladder

Type checking is where on-device reality bites hardest—the TS compiler is pure JS and can run, but seconds-per-check on an interpreter is not an editing experience. The ladder, deliberately not gating v1:

Strip only, locally. The Vite philosophy: transpile eagerly, never block execution on the checker. Red squiggles come from syntax and the runtime-honest availability linting (§05).

Check on save, remotely. When a remote kernel is attached, tsc --noEmit against the shared notebook directory is a kernel op—free full checking with zero on-device cost.

Eventually, tsserver in a hidden WebView. The sidecar again—full LSP-grade diagnostics in a process that has wasm and JIT, long after v1 ships.

### Editor and types

CodeMirror 6 in a WKWebView is the editor substrate—Monaco is what CodeApp ships and it is simply too heavy for the iPadOS register; a native editor (Runestone-class) is the fallback if the WebView seam ever fights. cdp-kernel already ships global type declarations (@tlockney/cdp-kernel/globals declaring jupyter, prompt, confirm); the app extends the same pattern with a device namespace declaration for the automation surface, so editor types work in a plain .d.ts reference from any cell. On-device LSP is the long pole of the whole authoring story—treat it as a v2 problem with the ladder above as the bridge.

---

## 07. The iPadOS canvas — layout for a large screen

iPadOS is the primary target, not a compatibility afterthought. The design center is a landscape iPad with a hardware keyboard and trackpad—the machine Thomas actually computes on—and the layout earns that screen real estate the way a pro app should, with a three-pane structure rather than a stretched phone sheet.

Landscape layout: navigator for structure, notebook as the canvas, inspector for kernel state, docs, and the permission ledger. Portrait collapses to the notebook pane with the others as sheets.

### Structure

Navigator (left): notebooks from any Files provider, scripts, and a live cell outline—drag cells here or straight in the canvas. Notebook (center): the canvas, one cell focused at a time with full keyboard focus semantics; outputs render inline and collapse. Inspector (right): kernel status and capability badge, live variables (the same getProperties machinery the kernel already exposes for tooltips), hover docs, and the permission ledger. Portrait drops to the center pane with navigator and inspector as edge-swiped sheets; the canvas is never squeezed narrower than a comfortable measure.

### Keyboard-first, trackpad-native

Run cell (⌘↩), insert below/above, move, split, delete; a ⌘K command palette instead of buried menus; hardware-keyword completion accept/deny from the runtime-honest completion source. Trackpad text selection must be flawless in the CodeMirror WebView—this is the single most important interaction surface and worth early, sustained investment. Cell manipulation gets touch/Pencil gestures (drag to reorder, swipe for actions) but nothing requires touch.

### Multiprocessing and displays

Split View alongside Safari/Docs is the default working posture—design the inspector contents to be useful when only two panes are visible. Stage Manager windows should remember their pane configuration independently. An external display gets the notebook at full width with the inspector on the iPad's own screen. Undo/redo spans cell edits and runs; find-and-replace arrives in a sheet, not a pane swap.

> **Note · Accessibility bar**
>
> Interactive targets ≥ 60pt, Dynamic Type honored in all UI chrome (editor font scales separately, as editors must), VoiceOver labels on cell controls, and reduced-motion respected throughout—same bar the MedLog accessibility constraints set.

---

## 08. The automation surface

The second product register, and the reason "scripting environment" is the more accurate phrase over "notebook app": the same runtime, the same files, exposed to the system the way Scriptable proved viable—share sheet, widgets, Shortcuts, notifications, x-callback URLs.

A device namespace bridges iOS into the jitless isolate via the same Rust-op path the kernel uses, so automation scripts and notebook cells share one world:

```ts
// An automation script, running in the local jitless isolate
const loc = await device.location.current();
const forecast = await fetch(
  `https://api.weather.gov/points/${loc.lat},${loc.lon}/forecast`,
).then((r) => r.json());

await device.notify("Weather", {
  subtitle: forecast.properties.periods[0].shortForecast,
  interruption: "time-sensitive",
});
```

### The permission ledger — the product insight

Deno's permission model maps almost 1:1 onto iOS reality, and that mapping is the app's most differentiated UX surface:

| Deno concept | iOS reality | UX |
| --- | --- | --- |
| --allow-read / --allow-write | App sandbox + Files providers | Per-script directory scopes |
| --allow-net | Foreground networking; ATS | Domain grants, first-use prompt |
| --allow-env | Script-scoped key/value store | No ambient secrets by default |
| Location | CoreLocation + TCC prompt | System dialog, ledger records the grant |
| Notifications | UNUserNotificationCenter | Per-script interrupt level |
| Photos / Share | PhotoKit, share sheet extension | Per-script read-only grants |

Every grant lands in a first-class ledger screen; every script's header declares its permissions; prompts use Deno's first-use-request pattern rather than an install-time wall of dialogs. Noise discipline—learned the hard way on the homelab—applies: default notification levels are passive unless the script says otherwise, and repeat-prompt suppression is per (script, capability), not per app launch.

### System integration points

Share sheet: an Action Extension receives text/URLs/files and runs a chosen script against them. Widgets: WidgetKit extensions run precompiled, snapshot-bundled scripts on a timeline—memory budgets are tight (tens of MB) so widgets take pre-baked bundles, not live V8; Scriptable's JSC-in-extension precedent is the model, and snapshot-AOT artifacts from the V8 tier are the upgrade path. Shortcuts: App Intents wrapping script run/parameters/permissions, so scripts compose with the rest of the system. Background: BGTaskScheduler refreshes with strict time budgets; long fetches use background URLSession; nothing pretends the kernel survives suspension. Sockets: Deno.serve works while foregrounded—the "iPad as a LAN service" gimmick stays honest by being foreground-only.

> **Caution · App Review 2.5.2**
>
> User-authored code in an embedded interpreter is established-ground (Scriptable, CodeApp, a-Shell, Juno). The gray zone is runtime fetch of executable code—the npm:/jsr: registry path. Ship it as a deliberate, documented feature; keep the on-device story "user-authored scripts execute locally, package fetch is data until imported"; and keep the remote-kernel path's execution firmly on the remote side, where it stays unambiguous.

---

## 09. Roadmap, risks, and open questions

The sequencing principle: validate the workflow with zero Swift before writing any, then buy down risk in the order that protects the biggest investment—UX first, kernel second, toolchain third.

| Tier | Scope | Effort | Gate to pass before the next |
| --- | --- | --- | --- |
| 0 · Remote validation | Jupyter Server + cdp-kernel on the tailnet (m4mini or shanghai); Juno Connect on the iPad as the client; token auth on the server (the shanghai Lab's tokenless, allow-origin=* setup is the counter-example to copy from) | A weekend | Does notebook-on-iPad actually fit the daily workflow? |
| 1 · Bespoke client | SwiftUI shell, CodeMirror 6 editor, Jupyter wire protocol in Swift (zmtp.ts as the port map), remote kernels only, SMB notebook library via Files | Weeks–months | Is a bespoke client materially better than Juno Connect + Safari? |
| 2 · Embedded kernel | JSC behind the KernelTarget seam (prototype) → rusty_v8 jitless IosTarget; acorn-based pure-JS transform; conformance suite green; ZMTP listener for desktop-driven development | Months | Does the local tier earn its keep against the remote default? |
| 3 · Automation surface | device namespace, permission ledger, share sheet, widgets (pre-baked bundles), App Intents, notification discipline | Months, parallel to 2 | App Review treatment of registry fetch |

### Risk register

The transform is the critical path, not the runtime. There is no esbuild anywhere on device—not in the runtime isolate, not in the host isolate (both jitless, no wasm). The acorn-based strip mode is v1's load-bearing beam; if it wobbles, the WebView esbuild-wasm sidecar is the pressure valve.

V8 toolchain maintenance. rusty_v8's iOS target is officially supported but young; budget for tracking upstream, and keep QuickJS (§03, Option F) as the retreat that preserves the entire product design minus engine parity.

Single-instance platform init. V8 initializes once per process; kernel restarts mean isolate teardown/recreation, not process semantics. Interrupt must never deadlock the host isolate—cdp-kernel's existing interrupt-rejects-pending-evaluate contract is the invariant to enforce with a conformance test per backend.

Background death is a product decision, not a bug. State-is-a-re-run-away is the model; anything that fights suspension semantics (long-running servers, watch-style daemons) is out of scope by design.

Review risk. 2.5.2 on registry fetch is the one App Store exposure; the mitigation is honest framing plus the precedent set, not cleverness.

### Open questions

Does the workerd-style bundle-with-the-cell trick extend to the local tier for imports (bundle host-side in the editor WebView, ship plain JS to the runtime)? Is there any appetite upstream for a cdp-kernel kernelspec schema that carries capability manifests natively? And the honest product question from the beginning stands: if the remote kernel is the real experience, is the local tier a product—or a feature of one? The tiered roadmap answers it empirically: build Tier 0, and let usage say.

The thesis in one line: cdp-kernel already built the server half; rusty_v8's iOS target unlocked the client half; the only genuinely new engineering is the seam between them and the editor that deserves the screen.
