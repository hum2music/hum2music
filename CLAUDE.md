# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repository currently contains only planning documents (`PRD.md`) — no application code, package manifest, or test suite exists yet. Treat `PRD.md` as the authoritative spec: it defines the product concept, scope (P0/P1 features), planned monorepo layout, data pipeline, algorithms, and the Phase 0–5 build order. Read it before proposing architecture or starting implementation, and implement in the phase order it defines (Phase 0: audio→MIDI, Phase 1: harmony, Phase 2: arrangement = MVP, Phase 3: humanization, Phase 4: localhost UI, Phase 5: advanced arrangement).

No build/lint/test commands exist yet. Once the project is scaffolded (per PRD §5.1, a Bun workspace monorepo), add the actual commands here instead of guessing them.

## Repository split: public vs. private task tracking

This repo (`hum2music/hum2music`, org: `hum2music`) is **public** and holds product code and docs only. All task/progress management (issues, planning tickets) happens in the separate **private** repo `hum2music/tasks`, which is checked out locally at `./tasks/` as an independent nested git repository (its own `.git`, own remote — not a git submodule).

- `./tasks/` is excluded via `.gitignore` in this repo specifically so it never gets tracked or accidentally committed as an embedded gitlink.
- Git operations for task tracking must be run with cwd inside `./tasks/`, not the top-level repo.
- When asked to create/manage issues, progress notes, or anything task-related, use `gh issue ... --repo hum2music/tasks` (or operate inside `./tasks/`), never the main repo.
- Code, architecture decisions, and anything meant to be publicly visible belongs in the main repo; anything internal (roadmap detail, task breakdowns, non-public notes) belongs in `hum2music/tasks`.

## Core design principles (binding constraints from PRD.md)

These constrain implementation choices once code exists — violating them contradicts the product's stated purpose:

- **Non-generative, deterministic by default**: no ML models; pitch/rhythm/harmony/arrangement/drum generation are signal-processing and rule-based. Given the same input audio, settings, seed, and engine version, output MIDI events must be identical (PRD §15.1).
- **Never collapse uncertainty into a false single answer**: pitch tracking, BPM, key, and chord estimation must retain multiple candidates with confidence scores rather than committing to one guess when the signal is ambiguous (PRD §6, §7, §8).
- **Preserve raw signal data**: original pitch curves/timing are kept separately from quantized/corrected representations — correction and quantization are non-destructive, additive layers, never in-place overwrites (PRD §6.4, §7.3).
- **Humanization is rule-driven, not random**: timing/velocity/groove deviations must derive from musical context (beat position, phrase, pattern) and any stochastic step must be seeded for reproducibility — unconditional random jitter is explicitly disallowed (PRD §10.5, §11.3).
- **Instrument-aware generation**: each arranger (piano/bass/guitar/drums) must respect that instrument's real playability constraints (voicing/range/hand span for piano, tuning/fret/fingering for guitar, etc.) — do not emit MIDI a human couldn't physically play (PRD §9).
- **Modular pipeline**: each stage (audio preprocessing → pitch/onset → melody → rhythm → key/harmony → chord search → arrangement → humanization → export) is independently testable and can emit intermediate JSON for debugging/verification (PRD §5.2, §15.4).
- Common `InstrumentArranger` interface (`generate(context): InstrumentTrack`) so instrument arrangers are swappable (PRD §9.1).
