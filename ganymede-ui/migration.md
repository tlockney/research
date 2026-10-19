# ganymede-ui: migration record

Moved to [tlockney/ganymede-ui](https://github.com/tlockney/ganymede-ui) on
2026-10-18 (commit `7bd62e5` here). Reconstructed after the fact from the
project's `notes.md`, `README.md`, and commit log as they stood at that
point.

## Premise

A standalone notebook UI for [Ganymede](https://github.com/tlockney/ganymede),
the Rust Jupyter server that had moved out of this repo the day before as
[jupyter-core-rs](../jupyter-core-rs/). The brief: start from
[datalayer/jupyter-ui](https://github.com/datalayer/jupyter-ui) as a Vite
project, style it like a macOS app, and head for an installable PWA.

A second requirement came from a separate browser-kernel thread: keep the
kernel connection pluggable, so a Web Worker cdp-kernel could be hosted by
the same UI without changes.

## Timeline

The whole research phase was one day, 2026-10-18, landing in a single commit
(`6179c50`) before the move (`7bd62e5`).

1. **Started from jupyter-ui's Vite example** (React 19, Vite 7,
   `@datalayer/jupyter-react` 2.0.20).
2. **Worked through what broke.** `require` and `__dirname` leaking from
   CommonJS builds; jupyter-react silently falling back to Datalayer's hosted
   server when PageConfig had no `baseUrl`; websocket 403s because Ganymede
   checks `Origin` against `Host` and the proxy only rewrote `Host`; a
   zero-height Lumino notebook panel; two sessions per notebook; a model
   marked dirty on load. Each got a fix recorded in the notes.
3. **Settled the design.** The seam is `ServiceManager.IManager`, built in
   `src/lib/backends.ts` from a config, with two backends: Ganymede over REST
   and websocket, and JupyterLite's in-page server with a JavaScript Web
   Worker kernel. `Notebook` in nbformat mode so saving is the same code for
   server and IndexedDB files. Own React shell with JupyterLab restyled
   through CSS variables. PWA via `vite-plugin-pwa` with
   `window-controls-overlay`.
4. **Verified end to end** with Playwright against `ganymede serve`: open,
   Run All, save, switch to the in-browser kernel, new notebook, run
   JavaScript in the Worker, light and dark. Screenshots captured.
5. **Moved out** to its own repo.

## State at migration

Working: a prototype that ran notebooks against a Ganymede server and
against an in-browser JavaScript kernel, with a macOS-styled shell and a PWA
build. Ganymede itself needed no changes.

Known gaps: the in-browser kernel failed under `npm run dev` (Vite
pre-bundling broke the Worker URL) but worked in the production build;
JupyterLite's service worker was not served and would compete with Workbox
for scope; ipywidgets untested; the bundle was heavy (3.5 MB main chunk,
8.3 MB precached) because jupyter-react drags in Pyodide, Plotly, and
Primer. No file rename or delete, no command palette, no menus.

Open question: stay on jupyter-react or move to `@jupyterlab/notebook`
directly, which would drop most of the bundle.

Next steps as understood then: wire in the Worker cdp-kernel as a JupyterLite
kernel plugin; decide the jupyter-react question; fix the dev-mode kernel
and the service worker clash; file operations and a palette; serve the built
app from Ganymede so the PWA and server share an origin.

Nothing was left behind except the pointer README and this note.
