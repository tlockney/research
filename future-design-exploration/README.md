# future-design-exploration

A draft Agent Skill for exploring something that doesn't exist yet by writing its future as a Claude artifact: a working-backwards press release and FAQ, a design fiction set in the person's own work, a rendered mock of the end state, a kit sketch, and a reality check that tags every capability as works today, planned or proposed. The artifact is iterated through comments and chat; nothing is committed outside Claude until the design is ready.

**Status:** draft skill, not yet used. Modeled on [agent-notebook-workflow](../agent-notebook-workflow/) (the "Ganymede Journal" document).

- [skill/SKILL.md](skill/SKILL.md): the skill.
- [resources.md](resources.md): related methods, books and examples, and ideas for extending the skill.
- [notes.md](notes.md): how it was put together.

## Installing

Skills can't be installed from a research repo. In claude.ai, open Settings, then Capabilities (Skills), and upload the skill: either save it from the proposal card in the thread that drafted it, or zip the `skill/` folder (the zip must contain a folder holding `SKILL.md`) and upload that. In Claude Code, copy `skill/` to `~/.claude/skills/future-design-exploration/`.

## Findings

- The Ganymede Journal document had five parts that did distinct jobs: the press release fixed the benefit, the timestamped session made it concrete, the rendered notebook gave something to react to, the kit sketch said what to build, and the status chips with a reality-check table kept the fiction honest. The skill keeps all five as the core set.
- What made it easy to iterate on was structural: stable section headings, numbered items, an explicit open-questions list and order of work. The skill makes these rules.
- The "stay in Claude until it holds" rule needs an explicit graduation step, or the agent starts opening issues as soon as the design looks plausible.

## What to try next

1. Use the skill on the next idea and compare the result with the Ganymede Journal page.
2. Extract the Ganymede Journal page's CSS (status chips, margin notes, theme tokens) into a reusable skeleton, as a reference file or a published artifact the skill copies from.
3. Try the futures-cone lens (three variants of the press release) on an idea where the direction is unclear.
4. Write a few evals: old ideas with known outcomes, checked for whether the reality check would have caught the problems.
