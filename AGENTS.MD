# PV Forecast Adapter

## Purpose 
This project implements a solar forecast Adapter for iobroker. It is using the free https://api.open-meteo.com/v1/forecast? webservice. Please see the code example in Solarvorhersage.ipynb. 

## Adapter Settings
- the adapter should allow to set the following parameters by IOBroker users:
  - Seletion of City (automatic calculation of latitude and longitude) - Default is Berlin
  - Timezone (Default ist Berlin)
  - Solar array tilt - Default 0°
  - solar array azimuth - default 0°
  - Solar array: array size in m² - Default ist 10
  - Solar panels efficiency - Default ist 22%

## Data to retrieve by adapter
- Retrieval of `global_tilted_irradiance` from https://api.open-meteo.com/v1/forecast? with hourly resolution for the current month
- Retrieval of hourly `cloudcover` for today and the next day
- Calculation of solar power per hour from radiation, solar array size and efficiency
- Calculation of solar power today
- Calculation of solar power for the next 7 days
- Calculation of the solar power for the current week
- Calculation of the solar power for the current month

## Parameters returned to adapter users
- Hourly solar power today and tomorrow
- Hourly cloud cover today and tomorrow
- Total solar power today and for the following 6 days
- Total solar power for the current week
- Total solar power for the current month

## Documentation and support
- Use the Use $iobroker-rag skill to query the local RAG server to get further information, documentation and templates concerning iobroker adapter projects.
- Add comments to all codes. Comments must be in english.

## Core Implementation Rules

### 0) Project Memory Preflight (Codex-only)
- Before deep analysis or implementation, access the project memory via the external `basic-memory` MCP server, starting with the note `memory/project_index.md`.
- Do not open files under `memory/` directly via shell/file reads when `basic-memory` is available.
- If you do not have access to the `basic-memory` MCP server stop your work and inform the user.
- Direct filesystem access to `memory/` is fallback-only and must be called out explicitly if `basic-memory` is unavailable or broken.
- The `memory/` notes are the canonical project memory and are consumed via the external `basic-memory` MCP server.
- The `memory/` notes are for software-engineering context only and must not be exposed as MCP tools/resources by this repository.
- If memory conflicts with the current codebase state, the current code wins; update the relevant note so the memory stays aligned.
- If you need help to basic memory please see https://docs.basicmemory.com/integrations/codex?utm_source=chatgpt.com

### 0.1) Memory Maintenance Protocol
- Use only the versioned Markdown notes under `memory/` through `basic-memory`; do not reintroduce repo-local JSONL capture, rebuild, or watch scripts.
- Prefer updating an existing note over creating a near-duplicate note.
- Keep notes curated and durable:
  - stable architecture and workflow rules belong in `memory/core/` or `memory/architecture/`
  - recurring regression knowledge belongs in `memory/testing/`
  - major implementation waves belong in `memory/history/`
  - open future work belongs in `memory/backlog/`
- Keep `memory/project_index.md` as the single preflight entry point in `basic-memory` and ensure it links to the current canonical notes.

## 1) Testing
- Write pytest for all code.
- Test have to be located in the `Tests`folder.