# 2026-09-14: ATECC608 on the pink Pico, and four hours lost to wire colors

## What's true

The JST-SH cables in Austin's bag are wired in the standard STEMMA QT order with unusual colors:

| Wire   | Is     | Header hole (USB at top) | Pico pin |
|--------|--------|--------------------------|----------|
| White  | GND    | right side, 3rd down     | 38 GND   |
| Yellow | 3.3 V  | right side, 5th down     | 36 3V3   |
| Black  | SDA    | left side, 6th down      | 6 GP4    |
| Red    | SCL    | left side, 7th down      | 7 GP5    |

Wired that way the chip answered on the first try. Serial `0123597b4f22a25eee`, config unlocked,
no key yet. The Adafruit ATECC608 breakouts (two of them) were fine. The cable was fine. The pink
board was fine.

## How it actually works

The plug order on any STEMMA QT / Qwiic cable is GND, V+, SDA, SCL, starting from the GND end.
Adafruit's cables color that black, red, blue, yellow. This bag colors it white, yellow, black, red.
Trust the order, never the colors.

With red (really SCL) on the 3V3 pin, the chip's clock input sat at a hard 3.3 V. Every pin on the
ATECC608 has a clamp diode to its own power rail (the datasheet rates any pin to VCC + 0.5 V). That
diode let the 3V3 pin feed the chip's power rail through the SCL pin. Yellow, the real power wire,
was on GP5. Pulling GP5 low meant fighting the Pico's regulator through a diode, so it never moved.
That reads exactly like a short to 3.3 V, and the power LED lit from the same path.

```
3V3 pin --red--> SCL pin --clamp diode--> chip VCC --yellow--> GP5
GP5 reads 1 no matter what the Pico does. Not a short.
```

## Where the diagnosis went wrong

- Assumed Adafruit colors (red power, yellow clock) for a cable from a different bag.
- Took the lit power LED as proof that red was power. It lit through the diode path.
- Used "drive the pin low and read it back" as a short test. It cannot tell a diode-fed rail from
  a wire short. That led to "shorted cable", then "bad breakout", then "bad cable" in turn.
- Austin asked "what if yellow is 3.3 V". That was the answer, and was argued against.

Two moves from the first wiring would have fixed it. Every other wire move was unnecessary.

## Guide: attaching one of these cables

1. Look at the plug. The four contacts run GND, V+, SDA, SCL from one end. On this bag that is
   white, yellow, black, red. If a cable has other colors, find the GND end first and count.
2. Plug it into either STEMMA QT port on the breakout. Both ports are the same net.
3. Push the bare ends into the LCD board's header socket beside the Pico pins, USB at the top:
   - GND wire: right side, 3rd hole down
   - V+ wire: right side, 5th hole down
   - SDA wire: left side, 6th hole down
   - SCL wire: left side, 7th hole down
4. Tug each wire lightly. Jam the breakout flat in the gap under the LCD board.
5. Check from the Mac before trusting the screen: `tools/emu devices`, then with the board on USB
   run a wake probe on GP4/GP5. A data pin that cannot be driven low while another wire sits on
   3V3 means a data wire and the power wire are swapped, not a short.

Printable card: `buildlog/wiring-card.html` (open in a browser, print).

Fresh chip: it will not make a key until the config zone is locked, once, permanently. That is
the next chip step (`ALLOW_LOCK` / `ALLOW_GENKEY` in secrets.py, or over USB).

## State of the pink board

- "Raspberry Pi Pico (c) 2022" clone: plain RP2040, no WiFi chip. Pico W firmware runs but
  prints `[CYW43] Failed to start CYW43` on any network use.
- Has main.py, secrets.py (name picowallet-pink) and the wallet. Boots with the chip found, stops
  at "no wifi" because there is no radio.
- Firmware commits from this night: a185b41 (wallet fits in 264 KB: framebuffer first),
  d54a3ea (ATECC pins from secrets.py), 9efa2de (wallet survives no WiFi chip).

## Next

Wallet over USB, so this board can be a wallet with no radio: a `requests` replacement on the
Pico that sends one JSON line per request over USB serial, and a bridge on the Mac (emu server
already owns the serial port) that forwards to the app on :3001 and writes the reply back.
Wallet code unchanged. Then lock the config and make the key.
