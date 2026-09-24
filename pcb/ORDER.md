# Test order — go through the motions (v0.6, 2026-09-23)

Goal: learn the process and the real clock. 5 boards, JLCPCB assembled, zero soldering: the board arrives with every part on it, you plug in the screen and the battery. Human does every click.

## Before you upload (10 min)

1. Open the 3D page and the copper image (`v0/render/pcb.png`). Look for anything dumb.
2. `v0/bom.csv`: one row has no part number on purpose: BT1 (the battery, drawn only). JLCPCB will flag it; skip it.
3. `v0/pick_and_place.csv`: same designator. Delete it if the uploader complains.
4. Buy separately: 5× 1.3" ST7789 240×240 **7-pin** module with pin header (Amazon B09QS544FX or MakerFocus B07P9X3L7M), 5× 402030 LiPo (20×30×4 mm, ~200 mAh) with protection board and JST-PH 2.0 plug.

## Upload

1. jlcpcb.com → Order now → drop `v0/fab.zip`. 2 layers, 1.6 mm, green, HASL is fine, qty 5.
2. Tick PCB Assembly. Both sides have parts, so it's "Standard" assembly. Assemble 5. Confirm the ~$50 setup line shows.
3. Upload `v0/bom.csv` and `v0/pick_and_place.csv`. Map columns if asked (Designator, Comment, Footprint, JLCPCB Part #).
4. Parts page: every row should match an LCSC number. Skip DISP1, BT1 and BP1. If the Pico 2 W (C42394205) is out of stock, stop and tell me: that's the one part with 68 in stock.
5. Placement preview: check the Pico is on the BOTTOM side with USB at the left edge, joystick is a diamond, switch pokes out the bottom.
6. Cart: note the tariff line (DDP, prepaid). Individuals can't pick DHL now; take the fastest option offered.
7. Screenshot the final quote before paying. Write the number and the promised dates below.

## Log

| Date | Step | Note |
|---|---|---|
| 2026-09-23 | quote | $190.83 for 5 assembled (PCB $4 + PCBA $186.83). PCB 24 h, assembly 4–5 days. Shipping + US tariff show after the address step. Cart saved on the JLCPCB account (Google sign-in, ethereum.org). Project "fab_Y2", PCBA SMT026092364372 |
| | paid | |
| | in production | |
| | shipped | tracking |
| | arrived | days total |
| | first power-on | |

## When it arrives

1. Screw the Waveshare screen onto the 4 standoffs, plug its cable into J1.
2. Power over USB with the switch OFF. Check 3V3 on the ATECC VCC pin. Flash firmware, run `keytest.py`, map joystick directions.
3. Click the LiPo into J2 (red to BAT+), switch ON, unplug USB. Does it stay up. Plug USB back in, does the TP4056 get warm (charging).

## What happened 2026-09-23 (driven by Claude in a cloned Chrome, stopped at the address form)

- JLCPCB account created via "Sign in with Google" (austin.griffith@ethereum.org). Nothing paid.
- Gerbers accepted: 2 layer, 44×68 mm, 5 pcs, $4. Standard PCBA, both sides, qty 5, parts placement confirmation on. JLCPCB adds edge rails (board becomes 78×70 panel for their line).
- BOM: 16/17 matched automatically. BT1 (drawn battery) marked "do not place". Caught one bug on their table: R3 said 5.1k but carried the 2k part number; fixed to C23186 on the site and in the design.
- Quote breakdown: setup $51.50, stencil $16.54, fixture $16.54, X-ray $8.25, feeders $17.05, components $70.51 (Pico 2 W = $58.21 of that, $11.64 each), hand-solder $3.61, SMT $1.10, misc $2. Total $190.83.
- Placement preview (top) looked right. The Bottom tab would not open in the headless browser, so the Pico-on-bottom preview is NOT visually confirmed. The Pico is in the priced parts and the assembly is "Both Sides", so it is in the job. Check the Bottom tab yourself before paying.
- Screenshots: `v0/render/jlcpcb-quote.png`, `v0/render/jlcpcb-checkout.png`.

## To finish (you, ~5 min)
1. jlcpcb.com → cart → Secure Checkout. Enter shipping address (Individual Customer).
2. Pick shipping. Read the tariff line (DDP prepaid). Expect ~$30–45 shipping + ~$50–90 tariff on top of $190.83.
3. Open the PCBA item → Component Placements → Bottom. Confirm U1 (Pico) sits USB-left.
4. Pay. Write the number and dates in the log above.

## v0.6 (after the quote): NOT yet re-uploaded
Switch overhangs the edge, PWR + CHG LEDs, and the screen header is now a JST-PH 8-pin socket for the Waveshare module (no loose-header module to solder). Board 72×44. The cart still holds v0.4. Re-upload `v0/fab.zip` + BOM + CPL before paying, or the boards come without the lights and with the switch inboard.

## Shopping list — everything the board does NOT come with
| Item | Qty | Where | ~USD |
|---|---|---|---|
| **Waveshare 1.3inch LCD Module** (45×31, ST7789, ships with its PH2.0 8-pin cable, plug already on it) | 5 | waveshare.com $9.49 or Amazon "Waveshare 1.3inch LCD Module" | 50 |
| M2 × 6 mm standoffs + M2 screws (screen mounts on 4) | 20 | Amazon | 8 |
| LiPo 402030, 200 mAh, 4 mm thick, protection board, JST-PH 2.0 plug | 5 | Amazon | 25 |
| Micro-USB cable, data not charge-only | 1 | you have these | 0 |
| M2.5 screws + standoffs for the case corners | a bag | Amazon | 8 |
That's it. Zero soldering, truly: the board arrives with every part on it. Screw the screen onto 4 standoffs, plug its cable into J1, click the battery into J2, flash the firmware over USB.
