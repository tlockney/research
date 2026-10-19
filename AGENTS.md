# Working in this repo

This repo is a holding area for early ideas. Each top-level directory is one project. When a project needs a permanent home, it moves to its own repo.

## Starting a project

Create a new top-level directory with a short, descriptive kebab-case name. If the work extends an existing project, use that directory instead; put a self-contained trial under its `experiments/<name>/`.

Create `notes.md` in that directory and append to it as you work: what you tried, what failed, and what you learned.

## Finishing

Write or update the project's `README.md`. It should say what the project is, its status, the findings, and what to try next. Link to supporting files rather than repeating them.

Add the project to the **Projects** list in the root `README.md` with a one-line description and status.

## What to commit

Commit only the project directory, containing:

- `notes.md` and `README.md`
- Code you wrote
- If you checked out and modified an existing repo, the `git diff` of your changes saved as a `.patch` file, not a copy of the repo
- Binary files you created, if needed and under 2MB

Do not commit copies of code you fetched, dependency directories such as `node_modules/`, or build output.

## Moving a project out

When a project moves to its own repo, replace its directory contents with a `README.md` that links to the new repo, and update its entry in the root `README.md`.

Keep a `migration.md` beside that `README.md`, and link to it from the `README.md`. The new repo carries the code and history; this note is the record of what the research phase was for and where it ended. It has three sections:

- **Premise**: the question or goal the project started with, as it was first stated, and any later restatements of scope.
- **Timeline**: dated entries for the notable steps, taken from `notes.md` and the commit log. Record what changed in the thinking at each step, not just what was built.
- **State at migration**: the date, the commit that moved it, what worked, what was unfinished, the open questions, and the next steps as understood then. Name the new repo and say what, if anything, was left behind.

Write it from `notes.md` and `README.md` before deleting them, since the git history here keeps the files but nobody reads it. Several paragraphs is enough; link to the new repo rather than restating its docs.
