# Instalacja ApexDash — instrukcja PL

## Szybka instalacja

1. Zamknij Stream Dock całkowicie, także z ikonki obok zegarka.
2. Wypakuj ZIP.
3. Skopiuj folder:

```txt
com.nineerza.apexdash.sdPlugin
```

do:

```txt
%APPDATA%\HotSpot\StreamDock\plugins
```

Czyli najczęściej:

```txt
C:\Users\TWOJA_NAZWA\AppData\Roaming\HotSpot\StreamDock\plugins
```

4. Uruchom Stream Dock ponownie.
5. Po lewej stronie znajdź kategorię:

```txt
ApexDash
```

6. Przeciągnij wybrane akcje na przyciski.

## Instalator BAT

Możesz też uruchomić:

```txt
install_apexdash.bat
```

z wypakowanego folderu. Skrypt kopiuje plugin do właściwego folderu i robi backup starej wersji, jeżeli istnieje.

## Ustawienia w Forzie

W grze ustaw:

```txt
Data Out / Wyjście danych: Wł.
Adres IP wyjścia danych: 127.0.0.1
Port IP wyjścia danych: 23666
```

## Test działania

Po uruchomieniu Stream Docka otwórz:

```txt
http://127.0.0.1:28766/state
```

Jeżeli plugin działa, powinno być:

```txt
udpBound: true
```

Jeżeli Forza wysyła dane, powinno być też:

```txt
connected: true
packetRate: wartość większa niż 0
```

Test bez Forzy:

```txt
http://127.0.0.1:28766/simulate
```

Jeżeli po tym przyciski pokazują dane, plugin działa, a problem jest w ustawieniach Forzy.
