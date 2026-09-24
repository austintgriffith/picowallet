# picowallet one-board v0.7b — review report (2026-09-24)

**Ask for the reviewer:** find the thing that makes board #1 dead. Everything below is what was done, what was checked, and what was not. Files: `pcb/v0/index.circuit.tsx` (the design, 130 lines), `pcb/v0/fab.zip` (Gerbers), `pcb/v0/bom.csv`, `pcb/v0/pick_and_place.csv`, renders in `pcb/v0/render/`, live 3D at the link in ORDER.md.

## Goal

Turn the three-part picowallet (Pico 2 W + Waveshare LCD hat + ATECC608 breakout, hand-wired) into one board that JLCPCB assembles end to end. Zero soldering on arrival: plug in the screen ribbon, click in the battery, flash the same firmware.

## The circuit

| Block | Parts | Notes |
|---|---|---|
| Brain | Raspberry Pi Pico 2 W module, soldered on the back, USB at the left edge | Runs the existing MicroPython firmware unchanged. GPIOs identical to today. |
| Secure element | ATECC608B (SOIC-8) on I2C0: SDA GP4, SCL GP5, 4.7k pull-ups, 100 nF | Same chip as the Adafruit breakout. |
| Screen | Bare 2" 320×240 ST7789 panel (LCSC C5329582), 12-pin ribbon into a 0.5 mm double-contact latch (J3) | CS GP9, DC GP8, SCK GP10, MOSI GP11, RST GP12. VCC and IOVCC on 3V3. |
| Backlight | VSYS → 22 Ω → LEDA; LEDK → 2N7002 → GND; gate GP13 with 10k pulldown | 4 white LEDs in parallel, 3.0 V, 80 mA rated. |
| Input | ALPS 5-way joystick (up GP2, down GP18, left GP16, right GP20, press GP3), buttons A GP15, B GP17 | All switch to GND, internal pull-ups. |
| Power | LiPo (JST-PH J2 on the back) → slide switch → SS14 Schottky → VSYS. TP4056 charger fed from VBUS, PROG 5.1k (~235 mA), CE high, TEMP grounded, 10 µF in/out | USB powers the board through the Pico's own path whether the switch is on or off. |
| Lights | Green PWR on 3V3 via 1k. Red CHG from VBUS via 1k into the TP4056 CHRG pin | CHG lights only while charging. |
| Board | 82 × 44 mm, 2 layers, 4 corner holes Ø2.7 | Panel lies flat on the front, 2 mm. Pico and battery on the back, 4 mm. |

## What was done

1. Design in tscircuit (React → circuit). Autorouted. Passed netlist, placement, shorts, and trace-clearance checks.
2. Net-by-net review against datasheets: Pico pinout (all 40), ATECC608B, TP4056, SS14, ALPS joystick (center/common), panel ribbon table.
3. tscircuit's own checks caught two real bugs before upload: green LED pin polarity backwards vs the LCSC part, and a resistor whose value changed but part number didn't.
4. Uploaded to JLCPCB. All 25 parts matched to in-stock parts, including the bare panel, which JLCPCB will place. Standard assembly, both sides, 5 boards, parts-placement confirmation on. Quote $221.24 before shipping and tariff. Cart item fab_Y4.
5. JLCPCB's placement preview caught three more: Pico 6 mm inboard from the edge; Pico rotated 180° (tscircuit exports bottom rotation with a mirror convention JLCPCB reads differently); a placeholder battery row merged into a capacitor. All fixed and re-uploaded. Bottom preview re-checked: USB at the edge, pin 1 at the USB end.

## Sure (checked, evidence in hand)

- Pico footprint, mirror, rotation, all 40 labels. Seen in JLCPCB's own bottom preview.
- Every GPIO matches `firmware/lcd.py` and `firmware/atecc.py`.
- ATECC608B pinout and pull-ups.
- TP4056 pinout. CHG LED wiring matches the datasheet's status-pin behavior.
- Diode direction and the battery → VSYS scheme (Pico datasheet method).
- LED polarities (tool-checked against LCSC part data).
- Joystick common and center pins (ALPS drawing). Directions are a firmware table.
- No shorts, no overlaps, all traces ≥0.275 mm from the edge.
- All parts in stock; JLCPCB accepts the files.

## Not sure (ranked by how much it worries me)

1. **Ribbon pin order after the fold.** The panel's tail folds under the panel's left edge into J3. Which end is pin 1 once folded is a guess from the datasheet drawing. If reversed: the panel's RS input gets VSYS through 22 Ω. On battery (≤4.2 V) that's inside the panel's 4.6 V absolute max; on USB (5 V) it is not. So: **first power-up on battery only, screen dark → flip the ribbon**. Nothing else on the board is at risk.
2. **Latch mouth direction.** I assumed the connector's opening faces the panel edge (rotation 270). If it faces the other way the ribbon needs an extra fold. Awkward, not fatal.
3. **Panel orientation as JLCPCB places it.** Their preview shows only a marker for the panel. The parts-placement confirmation email is the check: the ribbon must exit toward J3 (left). Approve only if it does.
4. **Backlight resistor.** 22 Ω from VSYS: 91 mA at 5 V USB (rating 80), 55 mA at 4.2 V, 27 mA at 3.7 V. Firmware should cap the PWM at ~80% when on USB, or the reviewer may prefer 27 Ω. A resistor swap is a 10-minute re-upload.
5. **Charge current.** 235 mA into a 200 mAh cell is 1.2C. Spec is 1C. 6.2k on PROG gives 194 mA. Same 10-minute swap.
6. **Load sharing.** With USB in and the switch on, the charger and the load share the battery. Standard TP4056 hobby-board behavior: charge may never terminate. Fine for the bench, wrong for a product.
7. **Slide switch common pin.** Middle pad wired as common, by geometry and convention. Datasheet PDF wouldn't download. Wrong = switch dead, fix with a wire.
8. **Battery plug polarity.** Amazon LiPos ship with red on either side. Check red = BAT+ on the silkscreen before plugging in.
9. **Firmware.** The panel is 320×240, not 240×240, and it's a different ST7789 build. Expect init-sequence and layout work. Backlight is now GP13 → MOSFET, active high, same sense as before.
10. **Pico courtyard.** I trimmed the imported Pico courtyard by 2 mm so the placement check would pass. Copper is untouched. Pads are 1.2 mm from the board edge.
11. **Panel supply.** VCC/IOVCC at 3.3 V is the top of the panel's stated range (IOVCC 1.65–3.3, VCI 2.4–3.3). Legal, no margin.
12. **WiFi.** The Pico's antenna end sits under the battery plug and near button B. Expect some range loss.
13. **Nobody has powered one.** Only the diode path was SPICE-simulated.

## What I'd like extra eyes on

- Items 1–3 above, by someone who has hand-assembled an FPC LCD: look at `pcb/ref/lcsc-C5329582-*` photos and the datasheet drawing, tell me which end is pin 1 after a 180° fold under the panel.
- Backlight and charge-current values (items 4–5). Both are one-resistor changes; say the word and I re-upload.
- The Pico bottom preview screenshot vs the Pico 2 W pinout: pin 1 = GP0 at the USB end, left column when USB is up.
- The JLCPCB placement-confirmation email when it arrives: panel ribbon toward J3, D1 band toward VSYS, U2/U3 pin-1 dots where the silkscreen says.

## Bring-up order (raises the odds more than anything above)

1. No battery, no panel. USB in, switch off. PWR LED on? Measure 3V3 on the ATECC VCC pin. Flash firmware, run `keytest.py`: joystick and buttons.
2. Battery in, USB out, switch on. Board stays up? USB back in: CHG LED on?
3. Panel in, **battery only, USB out**. Screen shows anything? Dark → flip the ribbon end-for-end, retry.
4. Only then USB + panel together.

## Cost

$221.24 JLCPCB + shipping + US tariff (shown at checkout) + ~$25 batteries. About $50 a wallet.
