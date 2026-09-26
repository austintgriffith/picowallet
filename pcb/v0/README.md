# Revised picowallet v0.8 — engineering build, not order approval

The revised files are in pcb/v0/. Do not use the previous JLCPCB cart or previews for this revision.

Fixed: switch now controls an AO3401A power transistor; AO3400A backlight transistor and 39-ohm resistor; 0.6/0.3 mm vias; switch-hole clearance; corrected connector land pattern and y=-0.43 mm alignment; redundant Pico underside lands removed; explicit 1.6 mm board thickness; charger heat-spreading copper and two tented vias; corrected joystick labels; consistent assembly files with Pico rotation 180; pinned dependencies and reproducible build/check scripts.

Charging is DISABLED by default. SJ1 is an open solder jumper. R3=12k gives 100 mA nominal, up to about 111 mA with stated tolerances. Do not bridge SJ1 until the exact protected cell, charge limit and plug polarity are verified. The slide switch controls battery power only; USB still powers the board.

Checks passed: source build and TypeScript; independent Gerber connectivity and clearances; KiCad pad/track comparison; power and firmware pin-number assertions. See copper-check.txt, kicad-check.txt and design-check.txt. Firmware host tests passed for the existing display and the new 320x240 profile. These are not powered hardware tests.

Unresolved before ordering/powering:
- Physical ribbon reach, bend, contact numbering, panel support and insulation. Connector moved 2 mm toward the panel exit, but fit is not proven. Never use J3-to-board-rail continuity as a ribbon polarity test: it passes without a panel. Identify PANEL-side conductors independently with a numbered breakout and verify asymmetric supply/LED pins unpowered.
- Exact battery qualification; keep SJ1 open meanwhile.
- Assembler confirmation of all component orientations, including the corrected Pico rotation. Panel and battery are excluded from automated assembly; arrange separate supply and manual fitting. SJ1 is intentionally unpopulated.
- Actual display initialization/colors, charger temperature and radio performance. The Pico antenna remains under the panel/carrier; RF layout was not corrected. Panel 3.3 V supply tolerance margin remains unqualified. No full fabrication DFM or mask/paste sign-off is claimed.

Install firmware/boards/picowallet_v08/lcd_config.py beside lcd.py on the new Pico: 320x240, 8 MHz SPI, backlight initially off. The existing Waveshare profile stays the default without that file. Initialization and joystick directions still need a physical test.

Rebuild from pcb/v0 with Bun 1.3.14 and Python 3.12: create a Python environment, install pcb/dossier/review/requirements.txt, then run that environment's Python on scripts/build_release.py. It produces dist/release and stops on failed checks. The fabrication ZIP contains only Gerbers/drills; use the separate BOM and placement CSVs. SHA256SUMS.txt identifies the supplied files.
