# picowallet one-board v0.7c — full review dossier

Written 2026-09-24 for an independent reviewer. Goal of the review: find anything that makes board #1 dead or damages a part. Everything I know is here or linked. Nothing has been powered.

## 0. Where things are

| What | Path |
|---|---|
| Design source (tscircuit, React → PCB), 140 lines | `design/index.circuit.tsx` |
| Imported part definitions (pin labels, footprints, LCSC numbers) | `design/imports/*.tsx` |
| Compiled circuit (every pad, trace, net, as JSON) | `design/circuit.json` |
| Gerbers, drills, BOM, pick-and-place as uploaded to JLCPCB | `design/*.gbr`, `*.drl`, `bom.csv`, `pick_and_place.csv` |
| Same design as a KiCad project | `design/kicad-project.zip` |
| Firmware that must run unchanged (pin numbers) | `design/lcd.py`, `design/atecc.py` |
| Netlist dump: every part, every net, key pad coordinates | `NETLIST.md` |
| Copper render (red top, blue bottom) | `img/copper.png`, `img/copper-latch-region.png` |
| 3D renders | `img/3d.png`, `img/3d-top.png`; live: https://claude.ai/code/artifact/a0ec9350-81de-4732-973e-f489eca22eb0 |
| JLCPCB's own placement renders of THIS upload | `img/jlcpcb-placement-v07c-top.png`, `img/jlcpcb-placement-v07c-bottom.png` (bottom is a mirrored view, as seen from below) |
| JLCPCB parameters + BOM screenshots | `img/jlcpcb-pcba-parameters-v07c.png`, `img/jlcpcb-bom-v07c.png` |
| JLCPCB part photos for every matched part | `img/jlcpcb-part-photos/` |
| Screen panel datasheet (HS20HS072RX) + rasterized pages | `datasheets/HS20HS072RX-2in-panel.pdf`, `datasheets/panel-page-*.png` |
| Panel drawing crops used for the ribbon analysis | `img/panel-drawing-page10-upright.png`, `img/panel-drawing-front-crop.png`, `img/panel-drawing-back-crop.png`, `img/panel-drawing-pintable-crop.png` |
| LCSC photos of the panel | `img/panel-front-lcsc.jpg`, `img/panel-back-lcsc.jpg` |
| Earlier reports | `../REPORT.md`, `../ORDER.md`, `../CASE.md`, `../COST.md`, `../BUILD-PATH.md` |

## 1. Goal

One board that replaces the hand-wired stack (Pico 2 W + Waveshare 1.3" LCD hat + ATECC608 breakout). JLCPCB assembles every part. On arrival: slide the screen ribbon into a latch, click a LiPo into a plug, flash the existing MicroPython firmware. No soldering anywhere.

## 2. The circuit, block by block

Coordinates: mm, origin at board center, X right, Y up, as seen from the FRONT. Board 82 × 44 × 1.6, 2 layers, HASL.

### 2.1 Brain: Raspberry Pi Pico 2 W (U1)
- LCSC C42394205. Placed on the BACK, center (-13, 0), design rotation 180. Castellated pads soldered by JLCPCB.
- Pin 1 (GP0) pad at (-37.1, 9.7); pin 20 at (11.2, 9.7); pin 21 at (11.2, -9.7); pin 40 (VBUS) at (-37.1, -9.7). So the USB end is at the board's LEFT edge; the connector face sits ~1.2 mm inside the edge.
- JLCPCB bottom render (mirrored view): Pico at the right, USB at the outer edge, magenta pin-1 dot at the USB end. Matches.
- Pin map used (Pico physical pin → GP): 4→GP2, 5→GP3, 6→GP4, 7→GP5, 11→GP8, 12→GP9, 14→GP10, 15→GP11, 16→GP12, 17→GP13, 20→GP15, 21→GP16, 22→GP17, 24→GP18, 26→GP20, 36→3V3, 38→GND, 39→VSYS, 40→VBUS. Checked against the official Pico pinout.

### 2.2 Secure element: ATECC608B-SSHDA-T (U2)
- LCSC C1518769, SOIC-8, front, (-33, 15). Pins: 4 GND, 5 SDA, 6 SCL, 8 VCC, 1/2/3/7 NC.
- I2C0: SDA = GP4, SCL = GP5 (firmware `atecc.py` default). Pull-ups R1, R2 = 4.7 kΩ to 3V3. C1 = 100 nF at VCC.
- Same silicon as the Adafruit 4314 breakout the firmware runs on today.

### 2.3 Screen: bare 2.0" 320×240 IPS panel, ST7789 (DISP1) on a 12-pin 0.5 mm FPC latch (J3)
- Panel LCSC C5329582, HS20HS072RX, 51.8 × 36.2 × 2.05 mm, active area 40.8 × 30.6. Lies flat on the front, centered (2, 0). JLCPCB matched it and lists it as a placed part ($3.59 ea). How they attach a bare panel is unknown; the parts-placement-confirmation email is the check.
- Latch J3: LCSC C466532, AFC42-S12FMA-1H, 1.0 mm tall, double-sided contacts (ribbon works either face up), front insertion, back flip. Front, center (-4.27, 0.4), rotation 270. Solder pads at x ≈ -3; body/mouth extends toward -X. JLCPCB top render: pads on the right side of the body, mouth left. Matches.
- Ribbon pinout (datasheet §6, page 11): 1 GND, 2 CS, 3 RS (D/C), 4 SCL, 5 SDA, 6 RST, 7 NC, 8 IOVCC, 9 VCC, 10 LEDA, 11 LEDK, 12 GND.
- Wiring: J3.1 GND · J3.2 CS ← GP9 · J3.3 RS ← GP8 · J3.4 SCL ← GP10 · J3.5 SDA ← GP11 · J3.6 RST ← GP12 · J3.7 NC · J3.8 IOVCC = 3V3 · J3.9 VCC = 3V3 · J3.10 LEDA ← R6 ← VSYS · J3.11 LEDK → Q1 drain · J3.12 GND. C4 = 100 nF on 3V3 near J3.
- Panel supply spec: IOVCC 1.65–3.3 V, VCI 2.4–3.3 V, absolute max 4.6 V. 3.3 V is at the top of the range, inside spec, no margin.
- Firmware today: `lcd.py` drives a 240×240 ST7789 with DC=GP8, CS=GP9, SCK=GP10, MOSI=GP11, RST=GP12, BL=GP13 (PWM). Same pins here. The panel is 320×240 and a different ST7789 variant (T3), so expect MADCTL/column-row window and init changes. `lcd.py` lines 52–73 are the current init sequence.

### 2.4 Backlight driver
- 4 white LEDs in parallel inside the panel, Vf 2.8–3.2 V, 80 mA total rated (datasheet §3.2).
- VSYS → R6 27 Ω (1206) → LEDA; LEDK → Q1 2N7002K drain; source GND; gate ← GP13 with R7 10 kΩ pulldown.
- Current vs supply: 5.0 V USB → ~74 mA; 4.2 V full battery → ~44 mA; 3.7 V → ~26 mA. GP13 PWM sets brightness. Off at reset (pulldown).

### 2.5 Input
- Joystick SW5: ALPS SKRHABE010, LCSC C139794, front, (-33, 0), rotated 45° so the diagonal directions read as up/down/left/right. Datasheet: pin 2 = center push, pin 5 = common. Wired: COM → GND; A → GP2, B → GP18, C → GP16, D → GP20, CEN → GP3. Which of A–D is up/down/left/right is a firmware table (`keytest.py` finds it).
- Buttons SW1 (A) → GP15, SW2 (B) → GP17. 6×6 tactile KH-6X6X5H-STM, LCSC C2837531, front, (34, 8) and (34, -6). Other side of each to GND. Firmware uses internal pull-ups.

### 2.6 Power
- Battery: 402030 LiPo, 200 mAh, on the BACK at (28, 2), 20 × 30 × 4 mm, drawn only (not a JLCPCB part). Plug J2 = JST-PH 2-pin, LCSC C131337, BACK, (28, 20), rotation 90. J2.1 = BAT+, J2.2 = GND.
- BAT → SW6 (slide switch MSK12C02, LCSC C431540, front, (-30, -18), knob hangs past the bottom edge) → D1 SS14 Schottky (LCSC C2480, anode from switch, cathode to VSYS) → Pico VSYS. This is the Pico datasheet's recommended battery input.
- Charger U3: TP4056, LCSC C725790, front, (30, -17.5). VCC and CE ← VBUS (Pico pin 40, USB 5 V). BAT → net BAT (before the switch, so it charges with the switch off). PROG = R3 6.2 kΩ → ~195 mA (1C for 200 mAh). TEMP → GND (thermistor function disabled). GND + EP → GND. C2 10 µF on VBUS, C3 10 µF on BAT.
- USB always powers the Pico through its own internal path, switch or not.
- Known TP4056 behavior: with USB in and switch on, the load and the charger share the battery; charge may not terminate cleanly. Bench-OK, not product-OK.

### 2.7 Lights
- LED1 green PWR: 3V3 → R4 1 kΩ → LED1 anode; cathode → GND. LCSC C12624 (KT-0603G). Pin polarity for this part was corrected after the tool flagged it.
- LED2 red CHG: VBUS → R5 1 kΩ → LED2 anode; cathode → U3 CHRG (open-drain, low while charging). LCSC C2286.

### 2.8 Mechanical
- Corner holes Ø2.7 at (±38.5, ±19.5).
- Front stack: panel 2.05 mm on top of a 1 mm latch (panel rests on the latch lid over ~8 mm of its left side; the case should shim or hold the panel). Back: Pico 4 mm, battery 4 mm, JST plug 6 mm.
- Case notes in `../CASE.md`.

## 3. The ribbon fold, worked out (the thing I'm least sure of)

Facts from the datasheet drawing (page 10, `img/panel-drawing-front-crop.png` is the front/viewing-side drawing, upright):
- The tail leaves the panel from the middle of a SHORT (36.2 mm) edge. Tail edge is 15.28 mm from one long edge; contacts are 12 × 0.5 mm pitch; tail is about 6.5 mm wide. So the tail centerline is ~18.5 mm from that long edge, i.e. within 0.4 mm of the panel's centerline.
- Tail length from the panel edge to the contact end: 20.7 mm. Contact fingers 3.5 mm long. FPC 0.3 mm thick.
- In the front view with the tail pointing DOWN, the contact end is labeled "1 … 12" left to right: pin 1 on the LEFT. The back view shows "12 … 1", consistent.

Our board: panel face up, tail exits the panel's LEFT edge. Getting the drawing into that pose is a 90° clockwise rotation (tail down → tail left, face still up). Under that rotation, "left of the tail" becomes "+Y" (up). So on the unfolded tail, pin 1 is at +Y.

Fold: the tail is folded 180° under the panel around the panel's left edge (a line parallel to Y). A fold about a Y-parallel line mirrors X and flips which face is up; it does NOT change Y. So after the fold, pin 1 is still at +Y, and the ribbon runs +X under the panel.

Connector J3 at rotation 270: its 12 pads run along Y with pad 1 at +Y (computed from the footprint: pad 1 at (-2.75, 0) rotated 270° → (0, +2.75)). Mouth toward -X, i.e. toward the fold. So: ribbon pin 1 meets connector pad 1. Consistent.

What could still be wrong:
1. If the datasheet's "1 … 12" labels are drawn in the back view instead of the front (I read the view with the active-area rectangle and the "HSD" logo as the front), pin 1 is at -Y and the connector is reversed.
2. If JLCPCB's placement of J3 differs by 180° from the render (the render shows mouth left, pads right; that is what we want).
3. The ribbon is 20.7 mm long, the fold uses ~1.5 mm, the run to the mouth is ~13 mm, insertion ~4 mm. About 2 mm of slack. Adequate, not generous.

Consequence of a reversed ribbon (pin k ↔ pin 13-k): GND↔GND (1↔12) fine. CS↔LEDK (2↔11): CS gets Q1's drain, LEDK gets GP9: harmless. RS↔LEDA (3↔10): the panel's RS input gets VSYS through 27 Ω, and LEDA gets GP8. On battery VSYS ≤ 4.2 V < 4.6 V abs max: survivable. On USB VSYS ≈ 5 V: over abs max. SCL↔VCC and SDA↔IOVCC (4↔9, 5↔8): 3.3 V onto GP10/GP11 outputs through nothing — if the GPIO drives low against 3V3 that is a direct short of the 3V3 rail into the pin: bad for the Pico. **So a reversed ribbon is not harmless.** Mitigation before power: with the ribbon inserted and everything off, measure resistance between J3 pad 1 and board GND (should be ~0) and between J3 pad 8 and 3V3 (should be ~0). If pad 1 reads open and pad 12 reads ~0, the ribbon is reversed: flip it. This takes a multimeter and 30 seconds and removes the risk entirely.

## 4. What was verified, and how

| Check | Method | Result |
|---|---|---|
| Netlist matches intent | tscircuit `check netlist`, then manual read of every net (`NETLIST.md`) | 23 nets, all as designed |
| No shorts, no overlaps, edge clearance | tscircuit `check shorts`, `check placement`, autorouter DRC | clean |
| Pico pin labels | imported EasyEDA footprint vs pinout.xyz, all 40 | match |
| Pico physical orientation | JLCPCB bottom render (`img/jlcpcb-placement-v07c-bottom.png`) | USB at edge, pin 1 at USB end |
| ATECC608B pins | datasheet | match |
| TP4056 pins, PROG value, CE, TEMP | datasheet | match, 195 mA |
| SS14 direction, VSYS feed | Pico datasheet §"Powering" | match |
| LED polarities | tscircuit vs LCSC part data (caught one backwards) | fixed |
| Joystick COM / CENTER | ALPS SKRH datasheet | match |
| Panel pinout, supply range, backlight | HS20HS072RX datasheet §1.2, §3, §6 | as wired |
| Ribbon fold geometry | worked out in §3 | consistent, 1 open assumption |
| JLCPCB acceptance | upload: 25/25 parts matched, in stock | quote $221.37 |
| Bottom-side CPL rotation | first upload rendered the Pico USB-inward; patched rotation to 180 in `pick_and_place.csv`; re-rendered | correct now |

## 5. Not verified / open

1. Datasheet front-vs-back reading for the ribbon pin labels (§3, item 1). Multimeter check on arrival removes the risk.
2. JLCPCB's method of attaching a bare glass panel, and its orientation. Parts-placement confirmation is on; approve only if the ribbon exits toward the latch (left) and the panel sits centered at (2, 0).
3. Slide switch: middle pad assumed common (SPDT convention, matches the pad pattern). No datasheet drawing obtained. Wrong = no power from battery; USB still works.
4. Panel at 3.3 V: top of spec.
5. Firmware: resolution 320×240, ST7789T3 init. Expect a day.
6. WiFi: antenna end of the Pico is under button B and the battery plug. Expect some range loss.
7. Load sharing on TP4056 (§2.6).
8. The panel rests on a 1 mm latch at its left; case must support it.
9. Trimmed the imported Pico courtyard by 2 mm to pass placement checks; copper untouched.
10. Nothing has been powered. Only the diode path was SPICE-simulated.

## 6. Bring-up order

1. No panel, no battery. USB in, switch OFF. Expect green PWR. Measure 3.3 V at U2 pin 8. Flash firmware. Run `keytest.py`: joystick + buttons.
2. Battery in (check red lead = BAT+ at J2 pin 1 first), USB out, switch ON. Board runs? USB back in: red CHG on?
3. Everything off. Insert the ribbon, latch it. Multimeter: J3 pad 1 ↔ GND ≈ 0 Ω, J3 pad 8 ↔ 3V3 ≈ 0 Ω. If reversed, flip the ribbon.
4. Battery only, USB out. Init the panel. Backlight via GP13 PWM.
5. Only then USB + panel together.

## 7. Order state

JLCPCB cart, one item, "fab_Y6": PCB 5 pcs $4.00 + Standard PCBA both sides 5 pcs $217.37 = $221.37 before shipping and US tariff. PCBA id SMT026092560265. Parts-placement confirmation: Yes. Product description: DIY / HS 902300. Not paid. Batteries: Amazon B09WKBWKFC (402030, 200 mAh, protected, JST-PH 2.0), 5 pcs.

## 8. Version history (all in git, `~/picowallet/pcb/`)

v0.4 header screen, v0.5 switch overhang + LEDs, v0.6 Waveshare module on JST socket, v0.7 bare panel + battery to the back, v0.7b Pico to the edge + CPL rotation + placeholder removed, v0.7c resistors (27 Ω, 6.2 k) + 1 mm latch at the flat-ribbon position.
