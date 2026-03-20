---
title: adapter_v1_plan
type: note
permalink: pvforecast/architecture/adapter-v1-plan
tags:
- architecture
- adapter
- plan
---

# Adapter V1 Plan

## Stack
- Implement the adapter as a standard ioBroker TypeScript adapter.
- Use JSON config, no React admin UI in v1.
- Refresh forecast data on startup and then hourly.

## Configuration
- Support `locationMode` with `geocode` and `manual`.
- Default city is Berlin.
- Support optional `countryCode` for geocoding.
- Support manual `latitude` and `longitude`.
- Support `timezoneMode` with automatic resolution and manual override.
- Default timezone is `Europe/Berlin`.
- Support `tiltDeg`, `azimuthDeg`, `arrayAreaM2`, and `panelEfficiencyPct`.

## Forecast behavior
- Resolve location via Open-Meteo geocoding when geocode mode is used.
- Query Open-Meteo forecast data using `global_tilted_irradiance` and `cloud_cover`.
- Compute hourly PV energy in kWh from GTI, array area, and panel efficiency.
- Expose hourly values for today and tomorrow as states and JSON.
- Expose daily totals for today plus the next 6 days.
- Expose current calendar week and current calendar month totals.
- Mark week and month totals with completeness flags when the API does not cover the full range.

## Reliability
## Implementation status
- The initial TypeScript adapter scaffold and the first functional Open-Meteo based forecast pipeline are now implemented in the repository.
- The current codebase passes `npm run check`, `npm run lint`, `npm test`, and `npm run build`.

- Keep the last successful forecast values when refresh fails.
- Update connection and error states on configuration, geocoding, or API failures.
