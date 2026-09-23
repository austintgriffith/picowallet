# picowallet one-board v0.2 — cost + risk (2026-09-23)

Design: `pcb/v0/index.circuit.tsx`. Fab files: `pcb/v0/fab.zip`. Live 3D: see the artifact link in the session.

## Cost, 5 boards (estimate, JLCPCB quote decides)

| Item | Note | USD |
|---|---|---|
| Parts from LCSC | Pico 2 W is $14.20 there (5× = $71). Everything else ~$2.50/board | 84 |
| Bare PCBs | 5 pcs, 2 layer, 64×46 mm | 5 |
| Assembly setup | Parts on both sides = "standard" assembly, $50 flat. One side = $0 | 50 |
| Feeder fees | 6 non-basic part types × $3 | 18 |
| Hand-soldered THT | JST plug + screen header | 6 |
| Shipping | DHL. Slow post ~$10 | 25 |
| **JLCPCB order** | 5 assembled boards | **≈190** |
| Screens | 5× 1.3" ST7789 240×240 module, Amazon | 20 |
| Batteries | 5× 500 mAh LiPo with protection, JST-PH | 30 |
| **Everything** | 5 wallets, ~$48 each | **≈240** |

Cuts: buy Picos at $7 retail and solder them ourselves (−$36). Put only joystick + 2 buttons on the front and hand-solder those (one-sided assembly, −$50). Both → order ≈ $100.

## Confidence: ~75% the first batch runs the firmware with no board fix (checks done 2026-09-23)

Ordered by how much it worries me:
1. ~~Pico footprint mirrored on the back~~ **Checked.** From the back, pin 1 is top-right with USB on the right, same as a real Pico. All 40 labels match the official pinout.
2. ~~Joystick~~ **Checked** (ALPS SKRH datasheet): pin 2 = center, pin 5 = common, both wired right. Directions are diagonal on the body, so SW5 is now at 45°. Up/down/left/right → A/B/C/D is a firmware table; `firmware/keytest.py` finds it.
3. **Screen header order** GND VCC SCL SDA RES DC CS BLK. Clones vary. Check the module you buy.
4. **Slide switch common pin** assumed middle, the standard for 3-pin SPDT. No drawing found. Wrong = a wire fix.
5. **WiFi**: switch + battery plug sit near the Pico antenna end. Expect range loss, not a dead radio.
6. **No battery protection on board.** Buy protected LiPos. Charge current ~580 mA (R3 = 2k).
7. **Thickness** ~17 mm with screen on the front and Pico on the back.
8. Nobody has powered one. Passed tscircuit netlist/placement/shorts only.

## Pins (unchanged from firmware)
LCD DC/CS/SCK/MOSI/RST/BL = GP8/9/10/11/12/13 · A/B = GP15/GP17 · joystick u/d/l/r/press = GP2/18/16/20/3 · ATECC SDA/SCL = GP4/5 · VSYS ← battery via switch + SS14 · TP4056 VCC ← VBUS.
