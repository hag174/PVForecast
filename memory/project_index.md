---
title: project_index
type: note
permalink: solarforecast/project-index
---

# SolarForecast Project Index

## Purpose
This project implements a solar forecast adapter for ioBroker using the Open-Meteo forecast API.

## Canonical Memory Notes
- `project_index` is the preflight entry point for project memory.
- `core/codex_workflow` records persistent workflow rules for Codex sessions.
- `architecture/adapter_v1_plan` records the current v1 adapter implementation plan and design defaults.
- `history/2026_03_20_initial_implementation` records the first implemented adapter milestone and verification status.

## Current Status
- The checked-in project memory for this repository lives in `/home/hagen/Programming/SolarForecast/memory`.
- The adapter configuration uses `peakPowerKwp`, `morningDampingPct`, and `afternoonDampingPct`.
- The admin city-check path is restricted to admin-originated requests, uses a `10000 ms` timeout, and throttles repeated checks for `1000 ms`.
- Energy forecast states use the ioBroker role `value.power.consumption`.
- `forecast.json.hourly` and `forecast.json.daily` now publish Material Design JSON Chart payloads with `axisLabels` and `graphs`.
- The raw-array format of `forecast.json.hourly` and `forecast.json.daily` has been removed as a breaking change.
- The preferred full verification flow is `npm run verify`.
