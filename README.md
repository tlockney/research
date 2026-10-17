# research

A holding area for early ideas: design notes, reviews, prototypes, and experiments that aren't ready for a repository of their own. When a project needs a permanent home, it moves out to its own repo.

Each directory is one project. Its `README.md` says what it is, its status, and what to try next. Much of the writing and code is produced with LLM tools such as [Claude Code](https://claude.com/product/claude-code).

Modeled on Simon Willison's [simonw/research](https://github.com/simonw/research); see his post [Code research projects with async coding agents like Claude Code and Codex](https://simonwillison.net/2025/Nov/6/async-code-research/).

## Projects

- [ts-on-ipados](ts-on-ipados/): a TypeScript scripting and notebook environment for iPadOS. Design exploration; nothing built.
- [jupyter-core-rs](jupyter-core-rs/): a Jupyter server in Rust with no Python dependency, aimed at TypeScript kernels such as cdp-kernel. Code sketch: protocol, kernel host, nbformat, executor, contents, API, and server crates; `@jupyterlab/services` runs against the server with ipykernel.
