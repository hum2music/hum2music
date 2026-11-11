# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only planning/spec documents (`PRD.md`, `./docs`) — no application code, package manifest, or test suite exists yet. Treat `PRD.md` as the authoritative product spec, and `./docs` (see below) as the implementation-level detail and roadmap. Implement in the phase order defined in `docs/ROADMAP.md` (Phase 0: audio→MIDI, Phase 1: harmony, Phase 2: arrangement = MVP, Phase 3: humanization, Phase 4: localhost UI, Phase 5: advanced arrangement).

No build/lint/test commands exist yet. Once the project is scaffolded (per PRD §5.1, a Bun workspace monorepo), add the actual commands here instead of guessing them.

## Repository split: public docs vs. private task tracking

This repo (`hum2music/hum2music`, org: `hum2music`) is **public** and holds product code plus `PRD.md`. Two other repos are mounted here as **git submodules**:

- `./docs` → [hum2music/docs](https://github.com/hum2music/docs) (public) — detailed engineering specs and `ROADMAP.md`, expanding on `PRD.md`.
- `./tasks` → [hum2music/tasks](https://github.com/hum2music/tasks) (**private**) — all task/progress management (issues, planning tickets, internal breakdowns).

Both are real git submodules (`.gitmodules` at repo root), not plain nested clones — when editing their content, commit and push from inside `./docs` or `./tasks` respectively, then stage the updated gitlink in the superproject.

- Code and anything meant to be publicly visible belongs in the main repo or `./docs`.
- When asked to create/manage issues or anything task-related, use `gh issue ... --repo hum2music/tasks` (or operate inside `./tasks/`), never the main repo.
- Internal-only content (roadmap *execution* detail, task breakdowns, non-public notes) belongs in `hum2music/tasks`, not `./docs` (which is public).

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
- Still no AI attribution footers (see the user-level rule) — Conventional Commits' free-form footers do not override that.

## Core design principles (binding constraints from PRD.md)

These constrain implementation choices once code exists — violating them contradicts the product's stated purpose:

- **Non-generative, deterministic by default**: no ML models; pitch/rhythm/harmony/arrangement/drum generation are signal-processing and rule-based. Given the same input audio, settings, seed, and engine version, output MIDI events must be identical (PRD §15.1).
- **Never collapse uncertainty into a false single answer**: pitch tracking, BPM, key, and chord estimation must retain multiple candidates with confidence scores rather than committing to one guess when the signal is ambiguous (PRD §6, §7, §8).
- **Preserve raw signal data**: original pitch curves/timing are kept separately from quantized/corrected representations — correction and quantization are non-destructive, additive layers, never in-place overwrites (PRD §6.4, §7.3).
- **Humanization is rule-driven, not random**: timing/velocity/groove deviations must derive from musical context (beat position, phrase, pattern) and any stochastic step must be seeded for reproducibility — unconditional random jitter is explicitly disallowed (PRD §10.5, §11.3).
- **Instrument-aware generation**: each arranger (piano/bass/guitar/drums) must respect that instrument's real playability constraints (voicing/range/hand span for piano, tuning/fret/fingering for guitar, etc.) — do not emit MIDI a human couldn't physically play (PRD §9).
- **Modular pipeline**: each stage (audio preprocessing → pitch/onset → melody → rhythm → key/harmony → chord search → arrangement → humanization → export) is independently testable and can emit intermediate JSON for debugging/verification (PRD §5.2, §15.4).
- Common `InstrumentArranger` interface (`generate(context): InstrumentTrack`) so instrument arrangers are swappable (PRD §9.1).
