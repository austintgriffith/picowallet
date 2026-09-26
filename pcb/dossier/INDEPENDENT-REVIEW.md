# Independent review of picowallet v0.7c

Reviewed 2026-09-24. **Recommendation: hold fabrication/payment.** The current copper is electrically consistent with the current compiled netlist, but manufacturing clearances, the battery switch, display assembly, and the claimed ribbon safety test prevent sign-off. No design, firmware, or order was changed by this review.

This review covers the supplied dossier, current `pcb/v0` fabrication files, independently reconstructed Gerber connectivity, KiCad export geometry, saved JLCPCB previews, panel PDF and photos, firmware pin assignments, and manufacturer documents retrieved during review. It is not a powered prototype test or a complete signal-integrity/thermal certification. The live cart could not be inspected: the browser execution tool failed before connecting. Saved screenshots cannot establish the present cart contents, price, login state, or byte-for-byte identity of the server-side upload.

## Findings that must be resolved

### 1. The prescribed ribbon multimeter test cannot detect reversal

`DOSSIER.md` §§3 and 6 instruct measuring J3 pad 1 to GND and J3 pad 8 to 3V3. Those pads are permanently connected to those rails by the PCB. Both readings pass with the ribbon correct, reversed, absent, or not making contact. J3 pad 12 is also permanently grounded; pad 1 cannot become open merely because the ribbon is reversed.

Consequently, the statement that this test “removes the risk entirely” is false. This is a first-power blocker even if the intended orientation turns out correct.

A valid polarity check must identify **panel-side conductors independently of the PCB** and establish their correspondence to connector pins. Use a known, numbered breakout or documented accessible panel test points while everything is disconnected from power. Verify asymmetric pins, particularly panel supply pins 8/9 and LED pins 10/11; the two grounded end pins cannot distinguish reversal. Do not probe densely spaced live contacts or rely on an unspecified diode-mode reading through an unknown panel circuit. If panel-side points are inaccessible, obtain manufacturer confirmation and inspect a physical sample before committing this layout.

The geometric pin-order argument itself is reasonable: the drawing with the active rectangle is the front, its tail reads 1 to 12 left to right, clockwise rotation puts pin 1 at +Y, and a fold about a Y-parallel axis preserves Y. The supplied panel product photo also shows the numbered tail from the display side. Current J3 pad 1 is at (-3, +3.15). That supports the intended mapping; it does not validate the proposed meter test or establish the actual assembled orientation.

The dossier also misstates the reversed electrical connections. On the current board, reversal connects panel VCC/IOVCC to GP10/GP11, and panel SCL/SDA to board 3V3. It does not, by wiring alone, directly short board 3V3 to those GPIOs. Internal panel paths can still back-power or overload devices. Panel RS would receive VSYS through 27 ohms; the 4.6 V **supply** absolute maximum does not establish the RS signal-input limit or make battery operation safe. Treat reversal as unsafe on either supply. “Flip the ribbon” also needs a mechanical definition: changing contact face is not automatically a valid way to reverse conductor order while preserving the panel pose.

### 2. Exported copper violates a published JLCPCB drilling clearance

Independent parsing of the actual Gerbers found **17 via-hole-to-foreign-track pairs below 0.20 mm**. The worst is **0.152859 mm**, whereas JLCPCB's current capabilities table specifies 0.20 mm for via hole to track.

A hand-checkable example, in the dossier's front-view coordinates:

- LEDA via `pcb_via_56`: center (-3.964, -2.239), drill diameter 0.20 mm.
- Top GND track: (-3.723583, -1.911141) to (-4.159424, -1.911141), width 0.15 mm.
- Clearance: 0.327859 - 0.10 - 0.075 = **0.152859 mm**.

This is not contradicted by passing a 0.10 mm copper-spacing check. Drill-to-track clearance is a different rule. Move/reroute these features and recheck using the fabricator's rules, or obtain explicit fabrication engineering acceptance of the exact geometry before ordering. Do not assume a quote or placement preview constitutes DFM approval.

All 62 vias use 0.30 mm copper / 0.20 mm drill: a nominal 0.05 mm annular ring. That diameter difference meets the published minimum, but has little margin, and this size falls into JLCPCB's extra-cost small-via category. The selected fabrication option must match. The smallest via-hole-to-via-hole edge clearance is about 0.225 mm, which passes the published 0.20 mm value.

The joystick's small NPTH is only 0.1435 mm from an unused Pico underside pad, U1.46. This is a separate drill-to-copper clearance concern to review; it is a pad, not one of the 17 track violations.

Evidence: [reproducible copper checker](review/check_copper.py), [results](review/copper-results.txt), [JLCPCB capabilities](https://jlcpcb.com/capabilities/pcb-capabilities).

### 3. SW6 is not adequately rated for its assigned power-switch role

The exact SHOU HAN MSK12C02 document specifies **12 V DC, 50 mA**, both in its drawing and specification §2.5. The circuit routes the whole battery-powered system through it: Pico, wireless activity, display electronics, and backlight. No demonstrated worst-case current/inrush budget below 50 mA exists. The design's own backlight estimate already approaches that rating before the processor is counted.

Lower operating voltage does not justify inventing a higher allowed current. Select a switch rated for the complete load/inrush, or use this switch to control a suitable power-switching device. This is an unqualified component choice, not proof that every specimen immediately fails.

The manufacturer's drawing supports pin 2 as the moving/common contact, so that particular uncertainty can be closed. Its current rating is the more consequential issue.

Evidence: [saved manufacturer PDF](review/MSK12C02-manufacturer.pdf), [drawing](review/MSK12C02-drawing.png), [original manufacturer document via LCSC](https://datasheet.lcsc.com/datasheet/pdf/5162155576bfd231c35aa9a893d25c8c.pdf?productCode=C431540).

### 4. The flat-ribbon fit and display assembly remain unproved

The panel's left edge is x = 2 - 51.8/2 = **-23.9 mm**. J3's current footprint center is x = **-4.27 mm**, almost 19.63 mm inward. The cited “13 mm run to the mouth” does not match this placement. The manufacturer drawing shows a connector only about 3.8 mm deep overall; the assumed 4 mm insertion is not justified either. A realistic mouth location puts the straight approach around 17–18 mm before accounting for the bend and engagement. The claimed 2 mm slack cannot be accepted from the arithmetic supplied.

There is also a transverse sign error under the stated clockwise rotation: using the drawing's 15.28 mm edge offset and 6.5 mm tail width, the tail center is 15.28 + 3.25 - 18.1 = +0.43 mm in the original horizontal axis, which rotates to **y = -0.43 mm**, not +0.4 mm. J3 is at y = +0.4 mm, leaving about 0.83 mm nominal misalignment. The drawing tolerance and flexible routing must be included in the fit test; this is not by itself proof the assembly is impossible.

This does **not** establish that the tail definitely cannot reach. It establishes that the slack calculation is unreliable. Build a dimensioned side section with panel underside height, actual ribbon exit height, connector mouth/contact stop, permissible bend radius, stiffener, and the components on the ribbon. Then verify it with a physical panel and connector. The panel PDF gives 20.7 mm nominal tail length with a visible tolerance; do not spend nominal length twice or bend the stiffened end as though it were bare flex.

The exact connector document confirms 0.5 mm pitch, upper/lower contacts, 1.0 mm nominal height, and a 0.30 ±0.03 mm mating flex recommendation. Those are supported selections. However, the current imported land pattern is not literally identical to the manufacturer's recommended pattern: signal pads are 0.25 mm wide versus recommended 0.30 mm, and mounting-pad geometry differs slightly. Obtain footprint acceptance or use the manufacturer's pattern.

`DISP1` is modeled electrically as one dummy 0.6 mm pad, not a mechanically defined panel assembly. Its 51.8 × 36.2 mm body is only in the CAD model. Thus placement DRC does not prove glass support, ribbon routing, insulating clearance, or latch access. J3 is roughly 20 mm inboard of the panel edge, not a support confined to the leftmost 8 mm. Do not use the movable latch as the panel's structural support.

The saved JLCPCB top preview shows a `DISP1` label/placeholder, not a validated full display installation. The parameter screenshot says parts-placement confirmation **Yes**, but photo confirmation **No**. Explicitly resolve whether the panel is supplied loose or mounted, how it is retained, ribbon insertion, assembly sequence, and avoidance of unsuitable heat exposure. A matched BOM line does not settle these questions.

Evidence: panel PDF/drawing in `datasheets/` and `img/`; [connector manufacturer PDF](review/AFC42-manufacturer.pdf), [drawing](review/AFC42-drawing.png), [original document](https://datasheet.lcsc.com/datasheet/pdf/e5e1f8f6365008df35856df8386fd86b.pdf?productCode=C466532).

### 5. The review/manufacturing package has multiple conflicting versions

- `NETLIST.md` is stale. It names C2856829 at (-15.77, 2.8), puts C4 at -14, shows only 23 connected nets, and lists actual-looking GPIO-to-3V3 shorts. The current JSON instead has C466532 at (-4.27, 0.4), C4 at -10, 27 connected nets, and separate GP10/GP11 nets. The old importer assigns contradictory aliases to opposing connector pins; those aliases are a plausible explanation for the old merged nets, not an effect of physically reversing a ribbon.
- All **13 manufacturing Gerber/drill files** in `v0/fab.zip` are byte-identical to the corresponding dossier files. The standalone source/BOM/CPL in `v0` also match the dossier. This is useful provenance evidence.
- But the **CSV files inside `v0/fab.zip` are unpatched**: they retain BT1, and the embedded CPL gives U1 rotation 0 instead of 180. The standalone corrected CPL gives 180. The saved bottom preview supports the corrected outward USB orientation. Remove the conflicting embedded CSVs or regenerate the archive consistently; a later user could otherwise submit the wrong file.
- The JSON board thickness is 1.4 mm; KiCad and the requested board description say 1.6 mm. Choose one explicit manufacturing thickness and regenerate the mechanical model.
- `CASE.md` mixes old switch/LED positions, old ribbon exit, and old/new latch heights. A 2.05 mm panel resting above a 1.0 mm connector is about 3.05 mm above the PCB before support/adhesive allowances, not the stated 2.3 mm. The joystick body/stem dimensions also need correction from the ALPS drawing. Do not manufacture a case from that document.

Regenerate the netlist and release files from one frozen revision, include the intentional CPL corrections in a reproducible build step, and record checksums of the exact submitted files. The present review has not established a fresh source-to-JSON rebuild because the dossier does not include a pinned build environment.

### 6. Battery charging is not qualified for the specified cell

6.2 kΩ gives approximately **193.5 mA nominal** under the selected TP4056's 1200/R formula. Its stated ±10% formula accuracy already allows about **213 mA** before resistor tolerance. Describing this as “1C” does not establish that the chosen 200 mAh cell permits it.

No cell manufacturer's charging limits, verified protection specification, or connector-polarity drawing is included. The Amazon listing could not be retrieved in this review. Obtain the exact cell documentation and set current with tolerances below its allowed charge rate. The TP4056 is not a battery discharge-protection circuit. TEMP is grounded, so cell-temperature monitoring is disabled.

The charger exposed pad is electrically grounded, but only narrow tracks lead away from it; there is no substantial heat-spreading plane or thermal-via array. At 5 V input and roughly 3 V battery, dissipation is approximately 0.39 W at nominal current. A thermal check inside the intended enclosure is required; thermal regulation can reduce charge current.

The generic load-sharing warning in the dossier is too broad for this exact circuit. At normal USB voltage, the Pico's USB diode raises VSYS above BAT, reverse-biasing the added battery diode. The system then normally draws through the USB path rather than the battery charger output. USB droop and transitions still merit tests; “the load always shares BAT with USB connected” is not the correct normal-operation description.

Evidence: [selected UMW charger PDF](review/TP4056-manufacturer.pdf), [Raspberry Pi power-ORing documentation](https://datasheets.raspberrypi.com/picow/pico-2-w-datasheet.pdf), `index.circuit.tsx` power connections.

## Other material findings

**Backlight performance and component margin.** C414015 is MDD's 2N7002K. Its guaranteed on-resistance is specified at 4.5 V and 10 V gate drive, not 3.3 V. Threshold voltage is not a full-on specification. Use a MOSFET guaranteed at the actual gate voltage or characterize the selected part across tolerances and temperature. The current equation is approximately `(source voltage - diode drop - LED Vf)/(27Ω + MOSFET resistance + wiring resistance)`, not simply `(source voltage - 3 V)/27Ω`. Battery brightness will fall more than claimed, especially near discharge. Conversely, high USB voltage and low LED Vf must be checked against 80 mA. The panel supply's 3.3 V recommended maximum also leaves no allowance for regulator tolerance/ripple. [Exact MOSFET manufacturer datasheet](https://datasheet.lcsc.com/datasheet/pdf/e50936d6fe8d5a879fae807a32a949b7.pdf?productCode=C414015).

**RF and fast SPI layout.** The board has no antenna cutout and the antenna is inside the carrier-board/display area. Raspberry Pi calls for a 14 × 9 mm antenna keep-out/cutout and placement at the board edge; “some range loss” is unmeasured. The Gerbers also have no continuous ground plane, and the firmware requests 62.5 MHz SPI over routed traces and flex. Basic continuity cannot qualify signal integrity. Start display bring-up much slower and verify stable operation before increasing clock speed. [Pico 2 W manufacturer datasheet](https://datasheets.raspberrypi.com/picow/pico-2-w-datasheet.pdf).

**Firmware is not unchanged-compatible as a complete display driver.** The physical GP assignments match the board's intended SPI/I2C/key wiring. But `lcd.py` allocates 240×240, sets both address windows to 0…239, enables full backlight immediately, and uses the previous panel's init sequence. The new panel needs deliberate initialization/window/rotation validation, not an assumption it will use all 320×240 pixels. The panel's text calls the controller ST7789T3 while its mechanical drawing says ST7789V2+HSD; confirm the supplied revision and initialization. ALPS' diagram calls pin 4 B and pin 6 D, while the imported joystick labels exchange them; COM=5 and CENTER=2 are correct, so the direction table is remappable. X/Y keys on GP19/21 remain in firmware but are absent from this board. [ALPS manufacturer drawing, drawing No.2](https://tech.alpsalpine.com/assets/catalog/product-catalog-mu-all.en.pdf).

**Secure element bring-up.** U2's supply/GND/SDA/SCL pin mapping is consistent with Microchip's SOIC diagram, and GP4/GP5 match the supplied driver's defaults. That verifies interface wiring, not provisioning state, successful signing, or the security of the complete wallet. Check identity and lock state before any irreversible provisioning. [Microchip summary datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/ATECC608B-CryptoAuthentication-Device-Summary-Data-Sheet-DS40002239B.pdf).

## Checks that passed, with limits

| Check | Result |
|---|---|
| Current Gerbers vs compiled intended connections | 725 parsed copper objects, zero detected cross-net shorts, zero disconnected expected nets at PCB ports. This excludes internal component behavior and assembly errors. |
| J3 current mapping | GND on 1/12; CS/DC/SCK/MOSI/RST on 2–6; NC 7; 3V3 8/9; LEDA 10; switched LEDK 11. GP10/11 are not shorted to 3V3 in these Gerbers. |
| KiCad export spot/full geometry comparisons | All 448 JSON track segments match KiCad centerlines/widths/layers; 132 named SMT pad centers compared with no mismatch. This is not a KiCad DRC run or full pad-shape/netlist equivalence check. |
| Copper spacing and board outline | Minimum different-net copper spacing approximately 0.102859 mm; minimum rectangular board-edge copper clearance 0.2499 mm. Drill-clearance failures remain as above. |
| Part selection | Current standalone BOM/CPL contain 25 placed references and omit BT1. [C19702](https://www.lcsc.com/product-detail/C19702.html) is a 10 µF, 10 V X5R 0603. |
| Power intent | SS14 cathode goes to VSYS, anode to the battery switch; charger VCC/CE go to VBUS; BAT is before the switch; charger ground/EP/TEMP are grounded. |
| Buttons | Selected Kinghelm drawing shows internally common A–B and C–D pairs; the two routed contacts on each current footprint are from opposing switched groups. No always-pressed connection was identified. |
| Placement previews | Saved Pico preview supports USB outward; saved J3 preview is consistent with the intended placement. These are rendered previews, not measured assembled boards. |

The compiler JSON still contains supplier-footprint, inaccessible-connector, missing-pin, and other warnings. Some are intentional or heuristic, but “clean” must not be interpreted as “all physical assembly and electrical behavior verified.”

## Release and first-power conditions

1. Resolve the switch rating, charging current/cell specification, drilling clearances, and backlight operating margins.
2. Prove the display/connector fit and pin mapping on actual parts; document support, insulation, ribbon bend, and assembly method.
3. Regenerate one internally consistent release and netlist, with correct assembly CSVs and no misleading files inside the archive. Re-run the independent copper checks and a fabricator-configured DRC/DFM.
4. Obtain explicit assembler acceptance of the panel work and correct orientations. Compare that accepted job against the frozen release.
5. Bring up a board without panel or battery on a current-limited source, inspect supply rails and current, then test logic/interfaces. Check the battery plug polarity against the actual board before connecting the cell. Keep display backlight disabled initially and use a slow SPI clock. Test charging and temperature under supervision only after the cell/current qualification.

Physical ribbon fit, correct delivered parts, battery polarity, soldering quality, radio performance, charger temperature, and display initialization remain tests to perform. No resistance check can remove all of those risks.
