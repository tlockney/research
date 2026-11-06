---
name: future-design-exploration
description: Explore a product, tool or workflow that doesn't exist yet by writing its future as a Claude artifact (working-backwards press release and FAQ, design fiction, the rendered end state, a reality check), then iterating through comments and chat before anything is committed elsewhere.
---

# Future design exploration

Use this when someone has an idea for something not yet built (a product, a developer tool, a workflow, a feature) and wants to see what it would be like to have it before writing code, opening issues or starting a repo. The output is one artifact page that shows the end state, says plainly which parts are fiction, and is shaped to be revised many times.

The method combines:

- **Working backwards** (Amazon's PR/FAQ): write the launch press release and the FAQ first, so the customer benefit has to be stated before the design.
- **Design fiction** (Bleecker, Near Future Laboratory): show the thing in use, through a scene or a made-up artifact from that future, so people react to the experience rather than to a feature list.
- **The rendered end state**: build a convincing mock of the thing itself (the screen, the file, the report, the CLI output), not a description of it.
- **A reality check**: tag every capability the story depends on as works today, planned, or proposed, with a source.

The fiction is there to provoke reactions. The reality check keeps it honest. Both live on the same page.

## Principles

1. **Stay in Claude until the shape holds.** The artifact is the working surface. Don't open issues, create repos, write code or send anything outside the conversation until the person says the design is ready to graduate (see the last section). Iterating on a page is cheap; undoing a repo, an issue tracker full of tickets or a public announcement is not.
2. **Show, then explain.** Lead with the press release and the fiction. Design detail comes after, and every detail should trace back to something the fiction showed.
3. **Never let fiction pass as fact.** Mark the page as a design fiction at the top. Label made-up numbers, names and quotes as illustrative. Every capability gets a status chip.
4. **Ground in what exists.** Before writing, find out what is real: the person's repos, issues, docs, and the current, documented capabilities of any platform the design relies on. Do not depend on a vendor feature that hasn't shipped; if the design needs one, it is a proposal and says so.
5. **Use the person's world.** Set the fiction in a situation from their actual work (their repo, their data, their team), so they can judge whether it would really help.
6. **Built for comments.** Stable section anchors, numbered claims and an explicit open-questions list make it easy to point at a part of the page and say "change this".

## Process

### 1. Frame

Get, or assume and state, these in a few lines before building:

- **Premise**: the idea in one or two sentences, in the person's words.
- **Who it's for**: the customer or user the press release addresses.
- **Horizon**: the fictional release date (usually 3 to 18 months out). Pick one; it sets how much can be "planned" versus "proposed".
- **Constraints**: what must stay true (for example, "no custom harness", "no Python", "works offline").
- **Lenses**: which sections below to include. Default to the core set.

If anything here is ambiguous, pick the most likely reading, say which one you picked in the reply, and build. A first draft gets better feedback than a question.

### 2. Ground

Research before writing. Read the relevant repos, issues, design docs and notes; check current documentation for any platform or API the design uses. Keep a list as you go: each capability, its status, and its source (a link, an issue number, a doc page). This list becomes the reality check. If something can be validated cheaply (run a command, call an API), do it and note that it was validated.

Status vocabulary (keep it to three):

| Status | Meaning | Needs |
|---|---|---|
| **Works today** | Shipped and documented, or validated in this session | Link or the check you ran |
| **Planned** | Tracked in the project's issues, roadmap or a vendor's announced plans | Link to the issue or announcement |
| **Proposed** | New in this document; not tracked anywhere yet | One line on how it would be built with things that exist |

### 3. Write the page

One artifact page, in this order. The core sections are marked; the rest are lenses to add when they help.

1. **Header** (core). Product name, "Working backwards · design fiction · <date>", draft number, and one sentence: "The release below describes a future state. The status chips say what exists."
2. **Press release** (core). Dated at the horizon. Headline (benefit, not feature); subhead (one sentence on who and what); opening paragraph (what launches today and why it matters); the problem as customers have it now; how it works from the customer's side; a quote from the team; a quote from a customer; how to get started. About one page. Plain words, no jargon the customer wouldn't use. See the PR/FAQ checklist below.
3. **Status legend** (core). The three chips and what they mean, plus a line on what the agent side or platform side depends on.
4. **Tenets** (optional). Four to six short promises the design keeps, each with a one-line gloss. Good for workflows and tools where behaviour matters more than features.
5. **Design fiction** (core). One concrete scene in the person's world: a timestamped session, a day in the life, or a diegetic artifact (see the formats below). Put margin notes beside each moment that say what it depends on, each with a status chip.
6. **The end state, rendered** (core). Build the thing the fiction produces, as it would look: the screen, the notebook, the report, the terminal output, the email. Make it convincing enough to react to. Reuse it, don't redescribe it, in later sections.
7. **Kit sketch** (core for anything installable). What someone installs or what the team builds, piece by piece, and what each piece does. Drafts of the important pieces (a config file, a skill, an API) go here as code blocks.
8. **Architecture or layers** (optional). One diagram of how the pieces connect. Only if it shows the real mechanism.
9. **Reality check** (core). A table: capability, status chip, source, notes. Every capability the fiction relied on appears here. Nothing is "works today" without a source.
10. **FAQ** (core). Two groups. *External*: questions a user would ask. *Internal*: smallest version worth shipping, biggest risk, how we'd know it works, what it costs, what stays open. Answer the hard ones honestly; "we don't know yet" is a fine answer if it says what would tell us.
11. **Alternatives and pre-mortem** (optional). Other designs considered and why not; "it's a year later and this failed: why?" with three to five plausible causes.
12. **Open questions** (core). Numbered. These are where the person's judgment is needed; ask them directly.
13. **Order of work** (core). Working forwards: the smallest first step that tests the riskiest assumption, then what follows. Each step names what it proves.
14. **Changelog** (core once revised). Draft number, date, and what changed in each round, newest first.

### 4. Make it iterate well

- **Stable anchors.** Give each section an id and a number (§1 to §n) that doesn't change between drafts. Number claims, tenets, questions and work steps (Q1, T3, W2) so a comment or chat message can cite them.
- **Edit in place.** Republish to the same artifact URL each round. Make targeted edits rather than rewrites so earlier comments still point at the right text. Bump the draft number and add a changelog line.
- **Revise, don't append.** When a decision changes, change the section it affects and record the old position in the changelog, not as a new section at the bottom.
- **Read comments first.** At the start of each round, read every open comment on the artifact and the latest chat messages. Address each one: change the page, or answer why not. Reply on the comment thread when the environment supports it.
- **Ask narrow questions.** End each reply with at most two specific questions that the page's open questions don't already cover, or with none. Point at the section: "Is the §5 scene the right one, or should it be a team setting?"
- **Keep the page readable.** One column for prose, wide elements (tables, the rendered end state) allowed to break out. Light and dark themes. Works on a phone. Status chips must be distinguishable without colour (text label in the chip).
- **Keep a working log.** If the work is happening in a repo or project folder, append to a notes file what was tried, what changed and why. It feeds the graduation record.

### 5. Graduate

Graduate only when the person says the design is ready, or asks for something concrete outside Claude. Then propose, and do on their go-ahead:

- Save the page source and notes where the person keeps design work (a research repo, a docs folder), with a README that states status and findings.
- Turn each **proposed** item into an issue or a work item, linking back to the page; link **planned** items to their existing issues.
- Turn the kit sketch's drafts (configs, skills, APIs) into real files only for the first step in the order of work.
- Keep the page published as the reference for why the work exists. Update its status chips as items ship, or mark it superseded.

## Formats

### PR/FAQ checklist

- Headline a customer would repeat to a friend.
- The problem paragraph describes today without the product, in the customer's terms.
- The "how it works" paragraph has no internal component names.
- The customer quote states a result, not a feature.
- The FAQ answers: who is it not for; what does it cost (money, time, setup); what happens when it goes wrong; why now; why us.
- If the press release can't be written without hedging, the idea isn't clear yet. Say so; that is a finding.

### Design fiction formats

Pick the one that shows the most important moment of use:

- **Session transcript**: timestamped conversation or terminal session with the product's state beside it. Good for tools and agent workflows.
- **Day in the life**: a short narrative through one person's day, with the product appearing where it matters.
- **Diegetic artifact**: something that would exist in that future: release notes, a user manual page, a support ticket, a changelog, a product catalog entry, a receipt, a review, an onboarding email, a conference talk abstract, a "how we use it" internal wiki page.
- **Before and after**: the same task, today and at the horizon, side by side.
- **Failure scene**: the product at the edge of what it does well (an outage, a wrong answer, a confused user). Use this as a second scene when trust or safety matters.

Make it mundane. Ordinary use is more convincing and more useful than a showcase.

### Other lenses

Add one when the default sections leave a gap:

- **Futures cone**: three short variants of the press release (probable, preferable, provocative) to test which future the person wants.
- **README-first**: for a library or CLI, write the README and the getting-started session as the rendered end state.
- **Shape Up pitch**: problem, appetite (how much time it's worth), solution sketch, rabbit holes, no-gos. Good when the question is scope.
- **Assumption map**: list assumptions by importance and evidence; the order of work starts with important, unproven ones.
- **Jobs to be done**: "When I ___, I want to ___, so I can ___", to check the press release addresses a real job.
- **Wardley-style evolution**: place each component from genesis to commodity; things near genesis are where the "proposed" risk is.

## Pitfalls

- Fiction so polished the person reads it as a plan. Keep the banner and the chips.
- Reality check written after the fiction from memory. Build the list during grounding, with sources.
- A press release that lists features. Rewrite around one benefit.
- Depending on an unannounced platform feature to make the story work. Redesign around what exists, or tag it proposed and say what it would take.
- Long replies in chat repeating the page. Reply with what changed and the open questions; the page holds the content.
- Graduating early because a step "can be undone". Opening issues and repos creates commitments; wait for the person.
