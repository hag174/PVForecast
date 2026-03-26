# SolarForecast Adapter

## Purpose

This project implements a TypeScript ioBroker adapter for PV forecast data based on the free Open-Meteo APIs.
`Solarvorhersage.ipynb` is a reference prototype only. The adapter runtime itself lives in `src/`.

## Implemented adapter scope

- JSON Config based admin UI
- Location mode `geocode` or `manual`
- Automatic timezone handling with optional manual override
- Retrieval of hourly `global_tilted_irradiance` and `cloud_cover`
- Hourly PV energy forecast for today and tomorrow
- Daily totals for today plus the next 6 days
- Calendar week and calendar month totals with completeness flags
- JSON mirror states for hourly, daily and summary data

## Adapter settings

- `locationMode`: `geocode` or `manual`
- `city`: default `Berlin`
- `countryCode`: optional ISO country code
- `latitude` and `longitude`: required in manual mode
- `timezoneMode`: `auto` or `manual`
- `timezone`: default `Europe/Berlin`
- `tiltDeg`: default `0`
- `azimuthDeg`: default `0`
- `peakPowerKwp`: default `2.2`
- `morningDampingPct`: default `100`
- `afternoonDampingPct`: default `100`

## Documentation and support

- Use the `$iobroker-rag` skill to query the local ioBroker RAG server for adapter-specific documentation and templates when the service is available.
- Code comments must be in English.
- Prefer concise comments that explain non-obvious logic instead of narrating every line.

## Core implementation rules

### 0) Project memory preflight (Codex-only)

- Before deep analysis or implementation, access the project memory via the external `basic-memory` MCP server, starting with the note `memory/project_index.md`.
- Do not open files under `memory/` directly via shell/file reads when `basic-memory` is available.
- If you do not have access to the `basic-memory` MCP server, stop and inform the user.
- Direct filesystem access to `memory/` is fallback-only and must be called out explicitly if `basic-memory` is unavailable, broken, or constrained to the wrong project.
- If memory conflicts with the current codebase state, the current code wins; update the relevant note so the memory stays aligned.

### 0.1) Memory maintenance protocol

- Use only the versioned Markdown notes under `memory/` through `basic-memory`.
- Prefer updating an existing note over creating a near-duplicate note.
- Keep stable workflow rules in `memory/core/`.
- Keep architecture and durable design decisions in `memory/architecture/`.
- Keep implementation progress and milestones in `memory/history/`.
- Before context compaction, summarization, or handoff, write the current implementation state, open issues and next steps to Basic Memory first.
- Keep `memory/project_index.md` as the preflight entry point and ensure it links to the current canonical notes.

### 1) Runtime and structure

- Keep the adapter runtime in TypeScript on top of the ioBroker `create-adapter` scaffold.
- Place reusable business logic in `src/lib/`.
- Keep the state tree and config names aligned with `README.md`, `io-package.json`, and the current implementation unless the user explicitly requests a breaking change.
- Preserve `Solarvorhersage.ipynb` as reference material, but do not treat it as production code.

### 2) Testing

- Use `Mocha` as the test runner.
- Use `Chai` for assertions.
- Use `Sinon` for mocks, stubs, and spies.
- Place project-specific tests in the `Tests/` folder.
- Keep the generated package and integration tests in the `test/` folder.
- Run `npm run check`, `npm run lint`, `npm test`, and `npm run build` after substantial changes when feasible.
- Run `npm run verify` when the full integration path is part of the change or before handoff when feasible.
