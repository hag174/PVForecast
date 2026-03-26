---
title: adapter_v1_plan
type: note
permalink: solarforecast/architecture/adapter-v1-plan
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
- Support `tiltDeg`, `azimuthDeg`, `peakPowerKwp`, `morningDampingPct`, and `afternoonDampingPct`.

## Forecast behavior
- Resolve location via Open-Meteo geocoding when geocode mode is used.
- Query Open-Meteo forecast data using `global_tilted_irradiance` and `cloud_cover`.
- Compute hourly PV energy in kWh from GTI, configured peak power, and time-of-day damping.
- Expose hourly values for today and tomorrow as states and as separate Material Design JSON Chart payloads under `forecast.json.hourlyToday` and `forecast.json.hourlyTomorrow`.
- Expose daily totals for today plus the next 6 days and as Material Design JSON Chart payloads under `forecast.json.daily`.
- Expose current calendar week and current calendar month totals.
- Mark week and month totals with completeness flags when the API does not cover the full range.
- Publish `*.energy_kwh` states with ioBroker role `value.power.consumption`.
- Use `axisLabels` plus `graphs` for chart JSON output instead of raw forecast arrays.
- Generate deterministic duplicate hourly labels with ` (1)`, ` (2)`, ... during DST fallback so chart labels stay unique.

## Reliability
- Keep the last successful forecast values when refresh fails.
- Update connection and error states on configuration, geocoding, or API failures.
- Restrict admin city validation to the admin adapter, apply a `10000 ms` timeout, and throttle repeated requests for `1000 ms`.

## Implementation status
- The TypeScript adapter scaffold and the Open-Meteo based forecast pipeline are implemented in the repository.
- Integration tests use a test-only fetch preload instead of product code hooks to mock Open-Meteo.
- The preferred full verification command is `npm run verify`.
