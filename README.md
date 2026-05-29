# ApexDash by 9Erza

ApexDash is an unofficial Stream Dock telemetry dashboard plugin for **Forza Horizon Data Out**.

It turns your Stream Dock / Mirabox / AJAZZ device into a racing telemetry dashboard with readable live tiles for speed, RPM, gear, boost, tires, grip, inputs, session stats and connection status.

> Unofficial plugin. ApexDash is not affiliated with Microsoft, Turn 10 Studios, Playground Games, or the Forza franchise.

## Features

- Live Forza telemetry over UDP Data Out.
- Ready-to-use tiles: Speed, RPM, Gear, Boost.
- Universal Metric Tile with configurable telemetry metric.
- Gauge Tile for RPM, fuel, throttle, brake and other percentage-style metrics.
- Shift Light tile.
- Tire Monitor tile.
- Grip Coach tile.
- Input Monitor tile.
- Session Stats tile.
- Telemetry Status tile.
- Data-only build: no hotkeys, no SimHub relay.
- Debug endpoint for troubleshooting.

## Requirements

- Windows 10/11.
- Stream Dock software `2.10.179.426` or newer.
- Forza Horizon with Data Out enabled.
- Stream Dock device supported by the Stream Dock app.

## Quick install

1. Close Stream Dock completely, including the tray icon.
2. Extract this ZIP.
3. Copy the folder:

   ```txt
   com.nineerza.apexdash.sdPlugin
   ```

   to:

   ```txt
   %APPDATA%\HotSpot\StreamDock\plugins
   ```

4. Start Stream Dock again.
5. Look for the category:

   ```txt
   ApexDash
   ```

6. Drag ApexDash actions onto your buttons.

You can also run:

```txt
install_apexdash.bat
```

from the extracted ZIP folder.

## Forza setup

In Forza, set:

```txt
Data Out: On
Data Out IP Address: 127.0.0.1
Data Out IP Port: 23666
```

ApexDash listens on:

```txt
127.0.0.1:23666 UDP
```

## Debugging

After Stream Dock starts, open:

```txt
http://127.0.0.1:28766/state
```

Useful fields:

```txt
udpBound: true
connected: true
packetRate: 60 / 120 / 140 etc.
lastPacketAgeMs: should update while telemetry is active
```

Self-test endpoint:

```txt
http://127.0.0.1:28766/simulate
```

If `/simulate` updates tiles but Forza does not, the plugin is working and the issue is usually the Forza Data Out IP/port.

## Common problems

### Tiles show `NO DATA`

Check:

- Forza Data Out is enabled.
- Forza Data Out IP is `127.0.0.1`.
- Forza Data Out port is `23666`.
- You are actually driving, not sitting in menu/pause.
- No old version of the plugin is still installed.

### Port conflict

Only one process can listen on UDP port `23666`.

Run in PowerShell:

```powershell
Get-NetUDPEndpoint -LocalPort 23666 | Select-Object LocalAddress, LocalPort, OwningProcess
```

Then:

```powershell
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path
```

The process should be Stream Dock's `node20.exe` running ApexDash.

### Old plugin conflict

Remove old folders such as:

```txt
com.erza.forzadash.sdPlugin
com.nineerza.apexdash.sdPlugin_old
```

from:

```txt
%APPDATA%\HotSpot\StreamDock\plugins
```

## License

MIT. See `LICENSE`.
