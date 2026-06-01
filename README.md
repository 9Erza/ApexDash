<h1 align="center">ApexDash</h1>

<p align="center">
  Stream Dock telemetry dashboard plugin for Forza Horizon Data Out.
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/9Erza/ApexDash/refs/heads/main/assets/apexdash.ico" alt="ApexDash Logo" width="160" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/9Erza/ApexDash?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/github/v/release/9Erza/ApexDash?style=for-the-badge" alt="Release" />
  <img src="https://img.shields.io/badge/platform-Windows%2010%20%2F%2011-0078D6?style=for-the-badge" alt="Platform Windows 10 / 11" />
  <img src="https://img.shields.io/badge/device-Stream%20Dock-2EA44F?style=for-the-badge" alt="Stream Dock" />
  <img src="https://img.shields.io/badge/telemetry-Forza%20Data%20Out-orange?style=for-the-badge" alt="Forza Data Out" />
  <img src="https://img.shields.io/badge/status-Experimental-yellow?style=for-the-badge" alt="Status Experimental" />
</p>

---

**ApexDash** is an unofficial Stream Dock telemetry dashboard plugin for **Forza Horizon Data Out**.

It turns a Stream Dock / Mirabox / AJAZZ device into a racing telemetry dashboard with readable live tiles for speed, RPM, gear, boost, tires, grip, inputs, session stats, and connection status.

> ApexDash is an unofficial plugin.  
> It is not affiliated with Microsoft, Turn 10 Studios, Playground Games, or the Forza franchise.

---

## What ApexDash does

ApexDash receives live telemetry from Forza Horizon through the built-in **Data Out** UDP feature and displays selected values on Stream Dock buttons.

The goal is to provide a clean, data-only telemetry dashboard without hotkeys, SimHub relay requirements, or unnecessary background activity.

Current core features:

- Live Forza telemetry over UDP Data Out
- Ready-to-use telemetry tiles
- Configurable metric tiles
- Gauge-style tiles for percentage-based values
- Shift light support
- Tire and grip monitoring
- Input monitoring
- Session statistics
- Telemetry connection status
- Lazy runtime behavior
- Built-in debug endpoint for troubleshooting

---

## Current tiles

ApexDash currently includes the following tile types:

- Speed
- RPM
- Gear
- Boost
- Universal Metric Tile
- Gauge Tile
- Shift Light
- Tire Monitor
- Grip Coach
- Input Monitor
- Session Stats
- Telemetry Status

The Universal Metric Tile can be configured to show different telemetry values depending on the selected metric.

Gauge Tile is designed for RPM, fuel, throttle, brake, and other percentage-style telemetry values.

---

## Runtime behavior

ApexDash is designed as a data-only plugin.

It does not provide:

- hotkeys
- SimHub relay functionality
- external overlay rendering
- game memory reading
- game process injection

The UDP listener starts only when ApexDash tiles are visible or active on the current Stream Dock page.

When no ApexDash tile is visible, the plugin should release the UDP port after a short delay.

---

## Requirements

- Windows 10 or Windows 11
- Stream Dock software `2.10.179.426` or newer
- Forza Horizon with Data Out enabled
- Stream Dock device supported by the Stream Dock app

Supported device families may include Stream Dock, Mirabox, and AJAZZ devices, depending on compatibility with the Stream Dock software.

---

## Quick install

1. Close Stream Dock completely, including the tray icon.
2. Extract the release ZIP.
3. Copy this folder:

   ```txt
   com.nineerza.apexdash.sdPlugin
   ```

   to:

   ```txt
   %APPDATA%\HotSpot\StreamDock\plugins
   ```

4. Start Stream Dock again.
5. Look for this category:

   ```txt
   ApexDash
   ```

6. Drag ApexDash actions onto your Stream Dock buttons.

You can also run:

```txt
install_apexdash.bat
```

from the extracted ZIP folder.

---

## Forza setup

In Forza, enable Data Out and use the following settings:

```txt
Data Out: On
Data Out IP Address: 127.0.0.1
Data Out IP Port: 23666
```

ApexDash listens on:

```txt
127.0.0.1:23666 UDP
```

For telemetry to update correctly, the game must be actively sending Data Out packets.

In most cases, this means you need to be driving in-game rather than sitting in a menu or pause screen.

---

## Debugging

ApexDash includes a local debug endpoint for troubleshooting.

The debug endpoint is active only when at least one ApexDash tile is visible or active on your Stream Dock page.

After Stream Dock starts and an ApexDash tile is visible, open:

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

If `/simulate` updates the tiles but Forza does not, the plugin is working and the issue is usually related to Forza Data Out IP/port configuration.

---

## Common problems

### Tiles show `NO DATA`

Check the following:

- Forza Data Out is enabled.
- Forza Data Out IP is set to `127.0.0.1`.
- Forza Data Out port is set to `23666`.
- You are actively driving in-game.
- You are not sitting in the menu or pause screen.
- No old version of the plugin is still installed.
- Stream Dock was fully restarted after installing or replacing the plugin.

---

### Port conflict

Only one process can listen on UDP port `23666`.

Run in PowerShell:

```powershell
Get-NetUDPEndpoint -LocalPort 23666 | Select-Object LocalAddress, LocalPort, OwningProcess
```

Then check the owning process:

```powershell
Get-Process -Id <PID> | Select-Object Id, ProcessName, Path
```

When an ApexDash tile is visible, the process should be Stream Dock's `node20.exe` running ApexDash.

When no ApexDash tile is visible, ApexDash should release the UDP port after a few seconds.

---

### Old plugin conflict

Remove old plugin folders such as:

```txt
com.erza.forzadash.sdPlugin
com.nineerza.apexdash.sdPlugin_old
```

from:

```txt
%APPDATA%\HotSpot\StreamDock\plugins
```

After removing old folders, restart Stream Dock completely.

---

## Important notes

ApexDash depends on Forza Horizon Data Out.

If the game is not sending telemetry packets, ApexDash cannot display live values.

ApexDash does not read game memory, inject code, or modify the game. It only listens for UDP telemetry packets sent by the game through its Data Out feature.

---

## Limitations

- ApexDash requires the Stream Dock software to run.
- The plugin works only while Stream Dock is active.
- Telemetry depends on Forza Data Out being correctly configured.
- Only one application can listen on UDP port `23666` at the same time.
- Device compatibility depends on Stream Dock software support.
- Some telemetry values may depend on the specific Forza Horizon title and Data Out packet behavior.

---

## Tech stack

- Stream Dock plugin format
- JavaScript / Node runtime used by Stream Dock
- UDP telemetry listener
- Forza Horizon Data Out
- Local debug HTTP endpoint

---

## Author

Developed by **[Eryk / 9Erza](https://github.com/9Erza)**.

---

## License

MIT License. See [LICENSE](LICENSE).
