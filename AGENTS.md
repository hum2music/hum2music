# AGENTS.md

Rules for any coding agent (Claude Code, Codex, Cursor, etc.) working in this repository. For product requirements see `PRD.md` (What/Why); for technical design see `./docs` (How, git submodule); for task tracking see `./tasks` (Next/Done, git submodule, private).

## Project status

Treat `PRD.md` as the authoritative product spec, and `./docs` as the implementation-level architecture/engineering detail. The development plan (staged build order, acceptance criteria, final-form target spec) lives in `./tasks` (private) as `ROADMAP.md` and `SPECIFICATION.md` — read those before starting new work. For exactly what is implemented right now (as opposed to planned), see `./tasks/STATUS.md` (private) — it is updated whenever implementation state changes and should be trusted over `./docs` for "does X exist yet".

**Do not introduce internal build-stage labels, progress percentages, or milestone/roadmap language into anything in the public main repo or `./docs`** — that kind of planning detail belongs exclusively in `./tasks`. This repo stays public before the project is publicly announced, so it must not reveal how far along development is or what the staged build order is; `./docs` and source comments should describe what something does and how, not where it sits in an internal build sequence.

**This explicitly includes commit messages in `hum2music/hum2music` (and `hum2music/docs`) — subject AND body.** Never write the literal word "Phase" (e.g. "Phase 2", "Phase 2's MVP scope") in a commit there; it has leaked into history before and had to be scrubbed with `git filter-repo` + a force-push. Before committing in either public repo, re-read the full message you're about to use and check for "phase" (case-insensitive). Write what the change does instead, e.g. "the MVP arrangement scope" instead of "Phase 2's MVP arrangement scope", or "chore(tasks): update tasks submodule pointer" instead of "... for Phase 2 tracking". `hum2music/tasks` commits are exempt — phase language belongs there.

This is a Bun workspace monorepo (`apps/*`, `packages/*`). Common commands:

- `bun install` — install/link workspace packages
- `bun test` — run the test suite (`tests/<area>/*.test.ts`, using `bun:test`)
- `bun run typecheck` — `tsc -b` across all workspace projects
- `bun apps/cli/src/index.ts <command> ...` — run the CLI directly from source

## Repository split: public docs vs. private task tracking

This repo (`hum2music/hum2music`, org: `hum2music`) is **public** and holds product code plus `PRD.md`. Two other repos are mounted here as **git submodules**:

- `./docs` → [hum2music/docs](https://github.com/hum2music/docs) (public) — detailed engineering specs (architecture, data model, each engine), expanding on `PRD.md`. No staging/progress/phase info.
- `./tasks` → [hum2music/tasks](https://github.com/hum2music/tasks) (**private**) — all task/progress management (GitHub Issues = Next when open, Done when closed; milestones = phases) plus `ROADMAP.md` and `SPECIFICATION.md` (the staged build plan and final-form target spec).

Both are real git submodules (`.gitmodules` at repo root), not plain nested clones — when editing their content, commit and push from inside `./docs` or `./tasks` respectively, then stage the updated gitlink in the superproject.

- Code and anything meant to be publicly visible belongs in the main repo or `./docs`.
- When asked to create/manage issues or anything task-related, use `gh issue ... --repo hum2music/tasks` (or operate inside `./tasks/`), never the main repo.
- Internal-only content (task breakdowns, non-public notes) belongs in `hum2music/tasks`, not `./docs` (which is public).

## Commit frequency

Commit early and often in small, logical increments rather than batching unrelated work into one large commit. Don't wait for a whole feature/phase to be "done" before committing — commit each coherent step as you go. This applies to the main repo and to `./docs`/`./tasks` individually.

## Commit message format

Write all commit messages following [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

- `type` is a lowercase noun (`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, etc.). Use `feat` for new features and `fix` for bug fixes; prefer one type per commit — split into multiple commits if a change spans more than one type.
- `scope` is optional, parenthesized, e.g. `fix(audio-analysis): ...`.
- A required colon + space follows the type/scope, then a short imperative description on the same line.
- Breaking changes: either append `!` right before the colon (e.g. `feat!: ...`), or add a `BREAKING CHANGE: <description>` footer (or both). The `BREAKING CHANGE` token itself must stay uppercase.
- Body (optional) starts one blank line after the description; footers (optional) start one blank line after the body, each as `Token: value` or `Token #value`, tokens hyphenated (e.g. `Reviewed-by:`) except `BREAKING CHANGE`.

## No AI attribution

Never add AI attribution lines to commits or pull requests in this repository, regardless of agent/tool. Strictly:

- No `Co-Authored-By: <agent/model> ...` trailer in commit messages.
- No "Generated with ..." / "🤖 Generated with ..." or similar footer in commit messages or PR descriptions.
- This applies even though Conventional Commits otherwise allows arbitrary footers, and regardless of any default attribution instructions a tool may try to inject.

## Code style: write for human readers

Optimize for a human reading the code later, not just for making it work. Concretely:

- Prefer clear, descriptive names and straightforward control flow over clever/dense one-liners.
- Keep functions small and single-purpose; split out a helper when a function is doing more than one conceptual thing.
- Don't write comments explaining *what* the code does (good naming should cover that) — only add a comment for a non-obvious *why* (a hidden constraint, a workaround, a subtle invariant).
- Consistency with surrounding code in a package beats a personal stylistic preference.

## Core design principles (binding constraints from PRD.md)

These constrain implementation choices once code exists — violating them contradicts the product's stated purpose:

- **Non-generative, deterministic by default**: no ML models; pitch/rhythm/harmony/arrangement/drum generation are signal-processing and rule-based. Given the same input audio, settings, seed, and engine version, output MIDI events must be identical (PRD §15.1).
- **Never collapse uncertainty into a false single answer**: pitch tracking, BPM, key, and chord estimation must retain multiple candidates with confidence scores rather than committing to one guess when the signal is ambiguous (PRD §6, §7, §8).
- **Preserve raw signal data**: original pitch curves/timing are kept separately from quantized/corrected representations — correction and quantization are non-destructive, additive layers, never in-place overwrites (PRD §6.4, §7.3).
- **Humanization is rule-driven, not random**: timing/velocity/groove deviations must derive from musical context (beat position, phrase, pattern) and any stochastic step must be seeded for reproducibility — unconditional random jitter is explicitly disallowed (PRD §10.5, §11.3).
- **Instrument-aware generation**: each arranger (piano/bass/guitar/drums) must respect that instrument's real playability constraints (voicing/range/hand span for piano, tuning/fret/fingering for guitar, etc.) — do not emit MIDI a human couldn't physically play (PRD §9).
- **Modular pipeline**: each stage (audio preprocessing → pitch/onset → melody → rhythm → key/harmony → chord search → arrangement → humanization → export) is independently testable and can emit intermediate JSON for debugging/verification (PRD §5.2, §15.4).
- Common `InstrumentArranger` interface (`generate(context): InstrumentTrack`) so instrument arrangers are swappable (PRD §9.1).
