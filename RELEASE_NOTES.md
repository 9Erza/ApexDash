# GitHub Release Notes — ApexDash v0.4.4

ApexDash by 9Erza is an unofficial Stream Dock telemetry dashboard plugin for Forza Horizon Data Out.

## What changed

- Added lazy runtime: ApexDash starts UDP telemetry only when an ApexDash tile is visible/active.
- Added auto-stop: ApexDash releases UDP port `23666` after all ApexDash tiles disappear.
- Added cleanup on Stream Dock/WebSocket close.
- Kept the plugin data-only: no hotkeys, no SimHub relay, no input worker.

## Install

Download `ApexDash_v0.4.4_Release.zip`, extract it and copy:

```txt
com.nineerza.apexdash.sdPlugin
```

to:

```txt
%APPDATA%\HotSpot\StreamDock\plugins
```

Then restart Stream Dock.

## Forza settings

```txt
Data Out: On
Data Out IP Address: 127.0.0.1
Data Out IP Port: 23666
```

## Debug

The debug endpoint is active only when an ApexDash tile is visible:

```txt
http://127.0.0.1:28766/state
http://127.0.0.1:28766/simulate
```

Unofficial plugin. Not affiliated with Microsoft, Turn 10 Studios, Playground Games, or the Forza franchise.
