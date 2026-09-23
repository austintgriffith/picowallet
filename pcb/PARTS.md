# picowallet one-board v0 — parts + pin map (step 1, for approval)

Goal: the Pico 2 W + Waveshare Pico-LCD-1.3 + ATECC breakout sandwich on ONE board, built by
JLCPCB. Firmware unchanged: same GPIOs as `firmware/lcd.py` and `firmware/atecc.py`.

Every part below was found in JLCPCB's assembly catalog on 2026-09-23 via `tsci search --jlcpcb`.

## Parts

| Ref | Part | LCSC | Stock | Note |
|---|---|---|---|---|
| U1 | Raspberry Pi Pico 2 W module | C42394205 | 68 | Soldered flat on the board (castellated pads). No RF design. ~$7 each |
| U2 | ATECC608B-SSHDA-T, SOIC-8 | C1518769 | 1,146 | Same chip as the Adafruit breakout. + 2x 4.7k pull-ups, 100nF |
| SW1-4 | 6x6 tactile, A/B/X/Y | C2837531 | 720k | |
| SW5 | 5-way joystick SKRHABE010 | C139794 | 5,140 | Same ALPS part class Waveshare uses |
| J1 | 8-pin 2.54 header for a 1.3" ST7789 240x240 module | C2691448 type | many | You plug in a $3-4 Amazon module (GND VCC SCL SDA RES DC CS BLK). LCSC has no 1.3" 240x240 panel in stock; FPC version is a v1 job |
| **Battery, optional** | | | | |
| U3 | TP4056 LiPo charger | C725790 | 288k | Charges from the Pico's own USB (VBUS) |
| D1 | SS14 Schottky, battery → VSYS | C2480 | 2.8M | Standard Pico battery hookup |
| J2 | JST PH 2-pin, battery | C131337 | 298k | |
| SW6 | MSK12C02 slide power switch | C431540 | 147k | |

Not on this board: Infineon OPTIGA Trust M. LCSC has 1 in stock. Would need hand soldering.

## Pin map (unchanged from firmware)

| Function | GPIO |
|---|---|
| LCD DC / CS / SCK / MOSI / RST / BL | GP8 / GP9 / GP10 / GP11 / GP12 / GP13 |
| Buttons A / B / X / Y | GP15 / GP17 / GP19 / GP21 |
| Joystick up / down / left / right / press | GP2 / GP18 / GP16 / GP20 / GP3 |
| ATECC SDA / SCL | GP4 / GP5 (I2C0) |

Buttons and joystick switch to GND, internal pull-ups, as today.

## Board

- About 60 x 30 mm, 2 layers, all parts on the top side (keeps JLCPCB's cheap one-side assembly).
- Display module plugs into J1 and sits above the Pico, like the Waveshare sandwich does now.
- Two M2.5 mounting holes for a printed case.

## Cost guess, 5 boards assembled

Roughly $85-100 without battery, $100-120 with. Most of it is 5 Pico modules (~$35) and
JLCPCB's ~$3 per unique non-basic part (~8-9 of them). Real number comes from the quote you see
when you upload.

## Decide

1. Battery parts in v0: yes / no
2. Display as plug-in module on a header (recommended) vs FPC connector
3. Anything else on the board (USB-C instead of Pico's micro-USB? buzzer? LED?)

Then step 2: I write the tscircuit code and you review the schematic image.
