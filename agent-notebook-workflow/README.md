# agent-notebook-workflow

A design for working with coding agents through a shared notebook: the agent does an exploratory analysis inside a live Jupyter notebook (TypeScript by default, via cdp-kernel), journaling each step as it runs, instead of writing a notebook up at the end. Written as an Amazon-style working-backwards press release and FAQ plus a Near Future Laboratory-style design fiction.

**Status:** design only; nothing built here. Published as an Artifact: <https://claude.ai/artifact/TEzdfzYdn93Y2peJrjMy3J>. Source: [index.html](index.html).

## Findings

- The workflow can be built from today's Claude Code features (skills, plugins, MCP, hooks, subagents) plus Ganymede's own work. It needs no custom harness and nothing a lab hasn't shipped.
- Ganymede already plans the server side in [ganymede#239](https://github.com/tlockney/ganymede/issues/239): nb-cli validation (done), `jpserver-<pid>.json` (done), `yrs` document rooms (#243), JSD's execute endpoint (#244), and `ganymede mcp` (#245).
- The core loop works today with `ganymede serve`, nb-cli and its skill: kernel state lasts across `nb execute` calls. Missing until #243 to #245: the live view, scratch runs, images to the model, and stable cell ids while a person edits.
- New in this document, beyond #239:
  - a `ganymede-journal` Claude Code plugin with a journaling skill, four hooks (SessionStart context, UserPromptSubmit "what a person changed", PostToolUse on Bash to record shell steps, Stop to require a clean run-all), and a reviewer subagent;
  - SVG outputs (Plot, Vega-Lite) rasterized to PNG in MCP replies, since Claude Code shows image content to the model but MCP images can't be SVG;
  - a "changes since my last read" query so the agent notices human edits;
  - revision history in `metadata.ganymede.agent.history`;
  - a journal view and static export in ganymede-ui for the lab-notebook look.

## What to try next

1. Write the journaling SKILL.md (draft in the document) and use it with nb-cli on two or three real explorations. This also drafts ganymede#241.
2. Raise the SVG rasterizing and "changes since" ideas on ganymede#245.
3. Build the plugin once `ganymede mcp` exists; then the ganymede-ui journal view.
4. A small eval set run headless with `claude -p` to measure the conventions.

See [notes.md](notes.md) for how this was put together.
