# Notes

## 2026-10-31

- Started from Thomas's description of the workflow: explore data with Claude Code, then ask for a notebook at the end. Goal: make the notebook the place the work happens, with Ganymede as the AI-native server and nb-cli as the agent CLI, TypeScript as the notebook language.
- Read the Agent-native Ganymede design memo (an Artifact from the Ganymede discussion) and ganymede issues #239 to #245. Most server-side decisions were already made there; this document sits on top as the meta-layer (workflow, conventions, packaging, the finished artifact).
- Read Ganymede's dev-log notes on the nb-cli validation and the server info file, and `docs/clients.md`. nb-cli works against `ganymede serve` on cdp-kernel; its caveats (auto-detect needs Python, `nb create` looks kernels up locally, gateway mode picks the first kernel) are listed there.
- nb-cli README and `skills/notebook-cli/SKILL.md`: output format `@@cell`/`@@output`, 4,000-character limit with overflow files, a Claude Code skill installed with `npx skills install`. Its docs only show Python kernels.
- Claude Code docs (skills, plugins, MCP, hooks, subagents, tools, headless) checked for what exists. Points that shaped the design: MCP image results reach the model (PNG/JPEG/GIF/WebP, not SVG); MCP prompts become slash commands; hooks can add context on UserPromptSubmit/PostToolUse and block on Stop; plugins bundle all of it and install at project scope.
- Chose a fictional session (cdp-kernel's interrupt test flaking in CI) because it is in Thomas's own world and shows a shell step that must be recorded, a human cell, and a revised finding. The CI numbers are made up and labelled as such.
- First render showed margin-note text breaking oddly because the note containers were grids; changed them to block layout.
