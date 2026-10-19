# jupyter-core-rs: migration record

Moved to [tlockney/ganymede](https://github.com/tlockney/ganymede) on
2026-10-17 (commit `8763c63` here). Reconstructed after the fact from the
project's `notes.md`, `README.md`, and commit log as they stood at that
point.

## Premise

The starting question was what a Rust reimplementation of the Jupyter core
(kernel host, protocol, web UI) would take, and which pieces are easy to
miss. Within the first day the goal narrowed: a Jupyter server with no
Python anywhere in the product, kernel-agnostic, with
[cdp-kernel](https://cdp-kernel.org) (TypeScript on Node or Deno) as the
first target kernel.

Two later restatements shaped the scope:

- The server is one use of the [ts-on-ipados](../ts-on-ipados/) plan, as its
  remote tier. That added requirements around REST fidelity, kernels that
  survive websocket drops, files as the source of truth, and a library-first
  crate layout so an iPad app could compile the protocol and nbformat crates
  for iOS.
- Only the core server is Rust. The UI was never meant to be, and is
  pluggable: any Jupyter frontend, a TypeScript web UI, or a native shell
  with a web view. Earlier drafts read as if a Rust UI was in scope; the
  final sketch treats the UI as a client of the core's API.

## Timeline

All of this happened on 2026-10-17.

1. **Design sketch** (`c0062b6`). Wrote `sketch.md`: components, what
   already exists in Rust, commonly missed pieces, an order of work. Found
   that the runtimed crates (`jupyter-protocol`, `runtimelib`, `nbformat`)
   cover protocol, kernel client, and file format, and that no Rust
   equivalent of `jupyter_server` exists. Open question whether the aim was
   a product or understanding.
2. **Python-free server targeting cdp-kernel** (`dc66258`). Goal clarified.
   Read cdp-kernel's docs and catalogued where Python enters the reference
   stack (kernelspec paths, the `python3` default, ipywidgets, trust,
   nbconvert, config, extensions) and the replacement for each. Main
   conclusion: the server alone, with VS Code's Jupyter extension as the
   frontend, is a complete Python-free setup before any UI work.
3. **ts-on-ipados as a use case** (`61e6baa`). Added section 6 of the
   sketch. Noted the tension between a server-side CRDT and iCloud file sync
   as two writers of one file; chose file-as-truth with an mtime check for
   v1.
4. **Modules and deployment profiles** (`66ed24c`). Section 7: the one rule
   (the host knows no language), the seams, three profiles (server, desktop,
   iPad), a crate layout. Matched two existing seams rather than inventing
   them: `jupyter_server`'s gateway client and `@jupyterlab/services`'
   `ServerConnection`. JupyterLite identified as the closest precedent for
   the iPad profile.
5. **Code sketch** (`03ef80e`). Cargo workspace with `jcore-protocol`,
   `jcore-nbformat`, `jcore-kernel-host`, `jcore-exec`, `jcore-cli`, plus a
   TypeScript `frontend/` package. Verified against ipykernel over real
   ZeroMQ: launch, execute, interrupt, attach, headless notebook execution
   with byte-identical nbformat output.
6. **Server crates** (`38af1b7`). Added `jcore-contents`, `jcore-api`, and
   the axum `jcore-server`. `@jupyterlab/services` 7.5 ran the full kernel,
   session, and contents flow against it from Node.
7. **Scope clarification** (`05f74cf`). The UI is not Rust and is pluggable;
   docs revised, no code changed.
8. **Moved out** (`8763c63`), renamed Ganymede.

## State at migration

Working: eight Rust crates and the TypeScript package built, passed their
tests (133 in total per the README's table), and drove ipykernel over ZMQ
through HTTP and websocket from both the in-house client and the real
JupyterLab client library. The CLI could list kernelspecs, run code, attach
to an existing kernel, and execute a notebook headlessly.

Unfinished: cookie login for browser frontends; serving JupyterLab's static
bundle (needs `/lab/api/*`); CurveZMQ; kernel autorestart on crash; a
document model; any app shell for the frontend package; Windows.

Open questions carried forward: whether to build on the runtimed crates or
keep the reimplementation; cdp-kernel conformance was never run because the
sandbox had Node 22 and cdp-kernel needs 24; which `interrupt_mode`
cdp-kernel declares; widgets strategy (anywidget-only manager versus relying
on JupyterLab's and VS Code's managers until a UI exists).

Next steps as understood then: point a real JupyterLab and VS Code at the
server, run the cdp-kernel checks, then a first UI outside the core. That UI
became [ganymede-ui](../ganymede-ui/) the next day.

Nothing was left behind in this repo except the pointer README and this
note. The sketch, notes, and code all moved with the history.
