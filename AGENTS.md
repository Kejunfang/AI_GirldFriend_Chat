# Repository Guidelines

## Project Structure & Module Organization
This repository is currently a blank workspace, so contributors should keep the layout predictable as code is added. Put application code in `src/`, tests in `tests/`, reusable scripts in `scripts/`, static assets in `assets/`, and longer design or setup notes in `docs/`. Mirror source paths in tests when possible; for example, `src/chat/session.py` should have a corresponding test such as `tests/chat/test_session.py`.

## Build, Test, and Development Commands
No canonical build, test, or local run commands are defined yet in this directory. When adding a runtime or toolchain, expose a small, stable command set from the repository root and document it here. Preferred patterns are:

- `make dev` or equivalent: start the local development environment.
- `make test` or equivalent: run the full automated test suite.
- `make lint` or equivalent: run formatting and static checks.

If you use a language-specific tool instead of `make`, keep the entry points obvious, such as `pytest`, `npm test`, or `pnpm lint`.

## Coding Style & Naming Conventions
Use UTF-8 text files and keep formatting consistent. Prefer descriptive, feature-based module names and keep file names lowercase. Use the formatter and linter native to the language you introduce, and commit their configuration with the code. Follow standard defaults rather than custom style rules unless the project has a clear reason to diverge.

## Testing Guidelines
Every feature or bug fix should include automated tests once a test framework is in place. Keep tests under `tests/` and name them after the behavior they verify. Prefer fast, isolated unit tests first, then add integration tests only where component boundaries matter.

## Commit & Pull Request Guidelines
There is no Git history in this directory yet, so no local commit convention can be inferred. Use short, imperative commit subjects such as `Add message queue prototype` or `Fix prompt validation`. Pull requests should include a clear summary, linked issue or task when available, test evidence, and screenshots for UI changes.

## Security & Configuration Tips
Do not commit secrets, API keys, or personal data. Store local configuration in untracked environment files such as `.env`, and provide a sanitized `.env.example` when configuration becomes necessary.
