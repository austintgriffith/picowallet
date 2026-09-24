# usb-signer v0.1 — ATECC608B on a USB-C stick (2026-09-23)

Plug it into a laptop. The computer talks I2C to the secure element through an MCP2221A bridge. No
firmware on the stick; the host does everything. Same chip, same key handling as picowallet, minus the
screen and buttons.

```
laptop USB-C  ──►  MCP2221A (USB→I2C)  ──I2C──►  ATECC608B
```

## Board
- 40 × 14 mm, **0.8 mm thick** (the plug needs it), 2 layers. Left 13 mm is the plug's tongue.
- Everything runs on the 5 V from USB. MCP2221A and ATECC608B both take 3–5.5 V, so no regulator.
- Zero soldering: every part is an LCSC part JLCPCB places. Design: `index.circuit.tsx`, fab files: `fab.zip`.

| Ref | Part | LCSC | Note |
|---|---|---|---|
| J1 | USB-C male plug, clamping type, 24P | C3151751 | 36k stock, $0.14. "Standard PCBA only, assembly difficulty high" per JLCPCB → a fixture fee. Board must be 0.8 mm |
| U1 | MCP2221A-I/ST, TSSOP-14 | C130462 | USB→I2C bridge, appears as a HID device |
| U2 | ATECC608B-SSHDA-T, SOIC-8 | C1518769 | the secure element |
| R1 | 5.1k | | CC pulldown: tells the host we're a device |
| R2 | 10k | | MCP2221A reset pull-up |
| R3, R4 | 4.7k | | I2C pull-ups |
| C1 | 470 nF | | MCP2221A VUSB cap (datasheet), on the back under the chip |
| C2, C3 | 100 nF | | decoupling |
| LED1 green + R5 1k | | | power |
| LED2 blue + R6 1k | | | I2C activity, from MCP2221A GP3 (its default is the I2C LED function) |

Only the plug's **bottom row** is wired. This 24-pin plug carries both rows, and a USB-C receptacle
shorts A/B for VBUS, GND, D+, D− and reads CC on either side, so one row works in both orientations.
The top row's 0.5 mm-pitch pads would not autoroute.

## Talking to it
- macOS/Linux/Windows see the MCP2221A as USB HID, no driver.
- Python: `pip install EasyMCP2221` (or `PyMCP2221A`) gives `i2c_read/i2c_write`. ATECC608 address 0x60 (0xC0 8-bit).
- Microchip's cryptoauthlib has an MCP2221A HAL. Our own `firmware/atecc.py` wire protocol ports to the host in an afternoon.
- Ethereum: ATECC608B signs P-256, not secp256k1. Same story as picowallet: the on-chain side verifies P-256 (the ChipAccount contract already does).

## Cost, 5 sticks (guess)
Parts ~$3 per board (ATECC $1, MCP2221A $1.60, plug $0.14, rest pennies). PCBs $4. Standard assembly setup $50 + fixture for the plug ~$17 + feeders 5 types $15. **≈ $110 for 5** before shipping/tariff. Second batch far cheaper per unit.

## Risks
1. Plug orientation/fit: pads 0.95 mm from the edge on a 0.8 mm board, per the drawing. First board tells.
2. Top row unwired (see above). Should work; not spec-exact.
3. Blue LED depends on GP3's factory default being I2C-LED. If not, it just stays off. Configurable with Microchip's utility.
4. No ESD protection on D+/D−. Fine for a bench stick; add a USBLC6 in v1.
5. Not electrically tested. Passed netlist/placement/shorts.

Renders: `render/`. 3D: `board.glb`.
