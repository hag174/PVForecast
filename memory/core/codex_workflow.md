---
title: codex_workflow
type: note
permalink: solarforecast/core/codex-workflow
tags:
- workflow
- codex
- memory
---

# Codex Workflow

## Required implementation workflow
- During adapter implementation, update `AGENTS.MD` so that the repository instructions stay aligned with the actual adapter stack and test setup.
- Persist important implementation decisions and progress notes in Basic Memory while working.
- Before any context compaction or handoff, write the current implementation state and open decisions to Basic Memory first.
- If Basic Memory is constrained to the wrong project, fix the checked-in notes in `memory/` and call out the MCP limitation explicitly.

## Memory handling
- Prefer updating existing notes over creating duplicates.
- Keep stable working rules in `memory/core/`.
- Keep major implementation decisions and design notes in `memory/architecture/` or `memory/history/`.

## VS Code support
- Keep `.vscode/settings.json`, `.vscode/extensions.json`, and optional `.vscode/launch.json` aligned with the project test stack so tests can be run comfortably from VS Code.
