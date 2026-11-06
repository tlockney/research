# agent-notebook-workflow

A design for working with coding agents through a shared notebook: the agent does an exploratory analysis inside a live Jupyter notebook (TypeScript by default, via cdp-kernel), journaling each step as it runs, instead of writing a notebook up at the end. Written as an Amazon-style working-backwards press release and FAQ plus a Near Future Laboratory-style design fiction.

**Status:** design, now largely built in Ganymede 0.5.0 and 0.6.0 (reviewed 2026-11-06). Published as an Artifact: <https://claude.ai/artifact/TEzdfzYdn93Y2peJrjMy3J>. Source: [index.html](index.html).

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

## Since the design (reviewed 2026-11-06)

Ganymede 0.5.0 (2026-11-03) shipped document rooms, the execute endpoint, `ganymede mcp` and the Agents pages; [ganymede#239](https://github.com/tlockney/ganymede/issues/239) is closed. Ganymede 0.6.0 (2026-11-06) shipped every agent-side proposal above: the `ganymede-journal` plugin (`plugins/ganymede-journal`, marketplace in the Ganymede repo), SVG outputs as PNG, read marks for "what changed since my last read", and cell history. An eval harness is on main. Follow-ups are on [ganymede#311](https://github.com/tlockney/ganymede/issues/311).

Differences from the design: the skill is `/ganymede-journal:journal`, hooks are `.mjs`, the Bash hook records only commands ending in `# journal`, the Stop hook blocks once per round of edits, and images are off by default.

## What to try next

1. Run the eval baseline ([ganymede#316](https://github.com/tlockney/ganymede/issues/316)).
2. ganymede-ui on rooms ([ganymede-ui#183](https://github.com/tlockney/ganymede-ui/issues/183)), then the journal view and export ([ganymede-ui#184](https://github.com/tlockney/ganymede-ui/issues/184)).
3. Decide whether images should be on by default for a shared `serve --mcp`, since `--images` today means a private server nobody can watch.
4. nb-cli upstream fixes ([ganymede#296](https://github.com/tlockney/ganymede/issues/296), [#317](https://github.com/tlockney/ganymede/issues/317)), and testing nb-cli 0.0.11.

See [notes.md](notes.md) for how this was put together.
