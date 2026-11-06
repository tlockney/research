# Notes

## 2026-10-31

- Started from Thomas's description of the workflow: explore data with Claude Code, then ask for a notebook at the end. Goal: make the notebook the place the work happens, with Ganymede as the AI-native server and nb-cli as the agent CLI, TypeScript as the notebook language.
- Read the Agent-native Ganymede design memo (an Artifact from the Ganymede discussion) and ganymede issues #239 to #245. Most server-side decisions were already made there; this document sits on top as the meta-layer (workflow, conventions, packaging, the finished artifact).
- Read Ganymede's dev-log notes on the nb-cli validation and the server info file, and `docs/clients.md`. nb-cli works against `ganymede serve` on cdp-kernel; its caveats (auto-detect needs Python, `nb create` looks kernels up locally, gateway mode picks the first kernel) are listed there.
- nb-cli README and `skills/notebook-cli/SKILL.md`: output format `@@cell`/`@@output`, 4,000-character limit with overflow files, a Claude Code skill installed with `npx skills install`. Its docs only show Python kernels.
- Claude Code docs (skills, plugins, MCP, hooks, subagents, tools, headless) checked for what exists. Points that shaped the design: MCP image results reach the model (PNG/JPEG/GIF/WebP, not SVG); MCP prompts become slash commands; hooks can add context on UserPromptSubmit/PostToolUse and block on Stop; plugins bundle all of it and install at project scope.
- Chose a fictional session (cdp-kernel's interrupt test flaking in CI) because it is in Thomas's own world and shows a shell step that must be recorded, a human cell, and a revised finding. The CI numbers are made up and labelled as such.
- First render showed margin-note text breaking oddly because the note containers were grids; changed them to block layout.

## 2026-11-06

- Re-reviewed against Ganymede's main, CHANGELOG, docs (`mcp.md`, `rooms.md`, `agents.md`), dev-log notes, #239, #311, #316, ganymede-ui, and nb-cli on crates.io.
- Nearly every "Planned" and "Proposed here" item shipped in 0.5.0 or 0.6.0, so the status vocabulary changed to Shipped (with version), Tracked (open issue) and Open (undecided). Session notes, the kit, the diagram, the reality check, the FAQ and the order of work were rewritten to match.
- Details that differ from the first draft: `/ganymede-journal:journal` (plugin skills are `/plugin:skill`), `.mjs` hooks, `# journal` marking for recorded Bash steps, read marks (`@@read`, `notebook_read(since)`), history capped at 10 entries, images opt-in.
- New open question surfaced: images vs. live view. The plugin's default `ganymede mcp` joins a shared server, which sends images only with `mcp_images = true`; `--images` starts a private server.
