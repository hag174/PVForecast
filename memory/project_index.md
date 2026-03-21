---
title: project_index
type: note
permalink: pvforecast/project-index
---

# PVForecast Project Index

## Purpose
This project implements a solar forecast adapter for ioBroker using the Open-Meteo forecast API.

## Canonical Memory Notes
- `project_index` is the preflight entry point for project memory.
- `core/codex_workflow` records persistent workflow rules for Codex sessions.
- `architecture/adapter_v1_plan` records the current v1 adapter implementation plan and design defaults.
- `history/2026_03_20_initial_implementation` records the first implemented adapter milestone and verification status.

## Current Status
- Basic Memory project `PVForecast` is configured for this repository.
- Project storage path points to `/home/hagen/Programming/PVForecast/memory`.
- Codex MCP is configured to launch Basic Memory with `--project PVForecast`.
- The repository now contains the initial TypeScript ioBroker adapter scaffold and first functional PV forecast implementation.
- Current verification status: `npm run check`, `npm run lint`, `npm test`, `npm run coverage`, `npm run build`, and `npm run test:integration` are passing when the host JS-Controller is stopped before the integration run.
