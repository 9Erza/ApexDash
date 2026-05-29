# ApexDash Installation — EN

## Manual install

1. Close Stream Dock completely, including the tray icon.
2. Extract this ZIP.
3. Copy:

```txt
com.nineerza.apexdash.sdPlugin
```

to:

```txt
%APPDATA%\HotSpot\StreamDock\plugins
```

4. Start Stream Dock again.
5. Find the category:

```txt
ApexDash
```

6. Drag ApexDash actions onto your buttons.

## BAT installer

You can also run:

```txt
install_apexdash.bat
```

from the extracted ZIP folder.

## Forza settings

Set Forza Data Out to:

```txt
Data Out: On
Data Out IP Address: 127.0.0.1
Data Out IP Port: 23666
```

## Debug

Open:

```txt
http://127.0.0.1:28766/state
```

Self-test:

```txt
http://127.0.0.1:28766/simulate
```


## Background behavior

ApexDash v0.4.4 starts its UDP listener only when at least one ApexDash tile is visible on the active Stream Dock page. After removing/switching away from ApexDash tiles, port `23666` should be released after a few seconds.
