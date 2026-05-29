# Changelog

## v0.4.4 — Lazy runtime / data-only build

- Added lazy runtime: UDP listener starts only when an ApexDash tile is visible/active.
- Added auto-stop: UDP listener and debug HTTP server close after the last ApexDash tile disappears.
- Added cleanup on Stream Dock/WebSocket close, SIGINT and SIGTERM.
- Kept data-only scope: no hotkeys, no SimHub relay, no input worker.
- Kept debug endpoint while runtime is active: `http://127.0.0.1:28766/state`.
- Kept self-test endpoint while runtime is active: `http://127.0.0.1:28766/simulate`.

## v0.4.3 — Data-only fixed build

- Renamed plugin to ApexDash.
- Data-only build.
- Removed hotkey/control actions.
- Removed SimHub relay.
- Added debug endpoint: `http://127.0.0.1:28766/state`.
- Added self-test endpoint: `http://127.0.0.1:28766/simulate`.
- Fixed UDP listening for ApexDash on `127.0.0.1:23666`.
- Added clean action categories: Speed, RPM, Gear, Boost, Metric, Gauge, Shift Light, Tire Monitor, Grip Coach, Input Monitor, Session Stats, Telemetry Status.
