# Case

## v0: print this first

`waveshare-raspberry-pi-pico.stl`: both halves in one file, side by side, flat side down. PLA,
0.2 mm layers, no supports. Top = lid, bottom = base; they are also in
`waveshare-raspberry-pi-pico/` as `top.stl` and `bottom.stl` if you want them one at a time.

The design is [Waveshare Pico 1.3 LCD Case by Tomáš Plass](https://www.printables.com/model/1322102-waveshare-pico-13-lcd-case)
on Printables, CC BY-NC 4.0 (remix ok, attribution required, no commercial use). Plass published a
mesh; `waveshare-raspberry-pi-pico/waveshare-raspberry-pi-pico.step` is a parametric recreation of
it in Onshape (Jason McPheron, same license) so the case can be changed and the changes read. The mesh Plass published,
the one Austin printed on 2026-09-05, is kept in `reference/plass/` and is what the recreation is
checked against.

What it is: a two-piece snap-fit box for exactly our stack, Pico plugged into the Pico-LCD-1.3.
Closed box about 57 x 31 x 26 mm.

- Top: screen window, a slot the four bare A/B/X/Y buttons poke through, a diamond hole the
  joystick stem pokes through. No caps, you press the parts directly. That is the honest state of
  the art for this board: nobody has published floating caps for it.
- End: micro-USB slot (the Pico 2 W is micro-USB, not USB-C).
- Bottom: four M2 posts for the Pico, optional.
- Print: 0.2 mm layers, no supports (Plass says a small one under the USB cutout is optional).

Fit risk for us: the ATECC breakout and the four wedged wires live in the 11 mm gap between the
boards, inside the box footprint, so they should be fine. The wires leave the header at the USB end
and bend into the gap; keep them flat. Print it and see.

### How the case is tracked (2026-09-13)

The STEP is the source. The STL in `case/` and everything else in `waveshare-raspberry-pi-pico/`
is generated from it by `tools/step` and committed with it, so a change to the case is one commit
with the STEP, the per-part files, the print plate and the numbers all moving together:

```
case/waveshare-raspberry-pi-pico.stl          print plate: every part flat on the bed, side by side
case/waveshare-raspberry-pi-pico/
  waveshare-raspberry-pi-pico.step            Onshape export (AP242), the assembly: top + bottom
  top.step  bottom.step                       one part per file, in its own frame
  top.stl   bottom.stl                        one part per STL (binary, chord 0.01 mm), z = 0 on the bed
  parts.md                                    bbox, volume, face count per part
```

- Change the model in Onshape, export STEP (AP242, keep the part names `top` and `bottom`, they
  become the file names) over `waveshare-raspberry-pi-pico/waveshare-raspberry-pi-pico.step`, run
  `tools/step`, commit.
- Reading a change on GitHub: `parts.md` diffs as text (a tolerance tweak shows up as a volume or
  bbox change), and GitHub renders `.stl` files in a 3D viewer with a before/after diff on the pull
  request. The STEP itself is text too, but Onshape renumbers every entity on export, so its diff
  only says "changed".
- `tools/step` is deterministic: rerun it on an unchanged STEP and git stays quiet. The part STEP
  files carry the source export's timestamp, not the write time.
- `tools/step check` compares each generated part with the matching half of the Plass mesh
  (bbox, volume, surface distance, and where the far points are). Use it after a re-export to see
  what moved. Needs `uv` in `~/.local/bin` like the other tools.
- Two boards, two shapes: one folder per variant, `case/<variant>/<variant>.step` (e.g. a second
  Onshape configuration for a Pico with a different footprint). `tools/step case/<variant>/<variant>.step`
  writes the folder and `case/<variant>.stl` the same way, so the printable files for every variant
  sit together in `case/`. A part the variants share is one file in each folder, identical bytes,
  or the variant can be a second assembly that references the shared top. No flags, no central
  registry: a variant is a folder with a STEP in it and a plate STL next to it.

State 2026-09-14 (second export), `tools/step check` against the Plass mesh: bottom volume within
0.4 %, floor 2.0 mm, posts at x ±23.25 y ±5.75 like Plass and the Pico. Left: the post bore is
2.1 mm and runs the full 5.5 mm to the floor (Plass: 2.0 mm, blind, 2.7 mm deep from the top); the
3 x 2 mm floor hole at x +16 is centred on the case centreline (Plass has it 1.5 mm toward -y, the
side away from the button column); Plass's mesh has a 0.15 mm slit between the tab wall and the
outer wall on both long sides, z 2 to 11, which the recreation fills solid (the slicer would not
print a 0.15 mm gap anyway; if the tab needs to flex for the snap, that is where to put it back).
Top: within 0.1 mm except the joystick diamond, 0.7 mm toward the screen and 0.5 mm toward -y,
0.3 mm smaller across; the stem is 3.2 mm in a 10 mm hole, so it clears either way.

## v1: our own

Generate from Python (like the CELL parts) so it re-fits when parts change. Wants:
- floating caps for A/B/X/Y and a joystick hat, captured by the lid
- pocket for the ATECC breakout and a 502030 LiPo + charger
- USB cutout, maybe a lanyard hole

Board facts for that: Pico-LCD-1.3 is 52.0 x 26.5 mm, display 23.4 x 23.4 mm active. Waveshare
wiki: https://www.waveshare.com/wiki/Pico-LCD-1.3. A CAD model of the board exists on GrabCAD:
https://grabcad.com/library/waveshare-1-3-inch-lcd-for-pico-65k-240x240-1. Button and joystick
centers still need measuring with calipers.

Print inbox drop 2026-09-05: `20260905-193939-waveshare-13-pico-lcd-case-tomas-plass` (PLA, black, 0.20 mm).

## Buttons and joystick: research (2026-09-05)

Nobody has published caps for the Pico-LCD-1.3. But its Pi HAT twin (Waveshare 1.3inch LCD HAT,
same 240x240 panel, same 5-way joystick, same tact switches, 3 buttons instead of 4) is the
SeedSigner bitcoin wallet's screen, and that project has years of open enclosures with printed caps:

- SeedSigner enclosures, MIT: https://github.com/SeedSigner/seedsigner/tree/dev/enclosures
  Copies of the parts that matter are in `reference/seedsigner/`:
  - `orange_pill_button.stl` 11.7 x 4.7 x 4.8 mm, `orange_pill_joystick.stl` 13 x 13 x 10 mm.
    Author says the thumbstick is clumsy and wants resin.
  - `open_pill_mini_w_coverplate_Buttons.stl` (three caps on a sprue, 20 mm tall), `Thumbstick_PLA`
    and `Thumbstick_TPU` (11.8 x 11.8 x 5.6 mm). FDM-only, TPU for the controls, no hardware.
- revetuzo's Open Pill caps, CC BY-SA: https://www.printables.com/model/179924
  Sticks and pads in 12/14/15 mm with a 2.05 mm square socket, "fits the 2 mm stick on the
  Waveshare HAT". Plus a glue-on button.
- Crackedconsole's HAT case with 3 buttons + joystick cap v2, Sketchup source:
  https://www.thingiverse.com/thing:3334127. Note: 0.1 mm more clearance per button was too loose.
- Adafruit 4697 rubber nubbin cap, $0.50, fits the classic 5-way nav stem. Zero-effort option.
- The joystick family: ALPS SKQU (10 mm square, 4-way + center push). Datasheet: SMD center-push
  type is 8.6 mm tall overall, stem 3.2 mm square, 2.8 mm above the housing, travel 0.4 mm tilt /
  0.2 mm push, 1.57 N tilt / 3.14 N push. Waveshare's part is a clone; SeedSigner people measure
  the stem at 2 mm square, so measure ours.
- General cap design: https://www.printables.com/model/236991 (tact cap with assembly template),
  https://www.thingiverse.com/thing:1557650, Apple's button patents. Same idea every time.

## How we will do it

Caps are loose parts trapped between the lid and the board. Nothing glued, nothing on the board.

```
        cap top (visible, any color)          ___
   lid  ======|   |======   <- hole in lid   |   |  lid hole = cap body + 0.25 mm/side
   flange  ___|   |___      <- wider than    |___|  flange 1.0 mm out, 1.0 mm thick
   post       |___|         the hole         | | |  post lands on the tact plunger
   board  ----[tact]----
```

- A/B/X/Y caps: round or square top 6 mm, flange 8 mm, post the size of the plunger. Cap body
  height = lid thickness + stand-off so the flange sits 0.3 mm above the plunger at rest, and
  bottoms on the lid underside just after the click (over-travel stop).
- Joystick hat: a 12 mm dome with a square socket that press-fits the stem (start at stem + 0.05 mm,
  like revetuzo's 2.05 mm), flange under a 13 mm lid hole so it can tilt 0.4 mm each way. A ring on
  the lid underside keeps it from lifting off. TPU hat is the comfy version.
- Lid holes get a 0.5 mm skirt under them so caps can't rock.
- Print caps top-face down on a textured plate for a clean face. Any color per cap.
- Generator: Python (CadQuery or OpenSCAD), parameters = the caliper numbers below.

Numbers we need from calipers, with the stack assembled:
1. Tact switch: plunger diameter, plunger height above the LCD PCB, switch body size (6x6?).
2. Joystick: stem width (square?), stem height above the metal housing, housing size, housing height
   above the PCB.
3. Height from LCD PCB top to the top of the screen glass.
4. Centers (x, y in mm): joystick + 4 buttons, measured from the PCB corner at the USB end
   (or a straight-down photo with a ruler in it).
5. The v0 case lid thickness at the button slot, once printed.

## Measurements (2026-09-05, v0 case on the bench)

From the v0 lid STL (the author's cutouts fit the board, photo in the build log), so these are
positions we can trust. Case outer 57 x 31 x 26 mm, lid plate 2.0 mm thick. Board center = case
center. x runs along the long side, + toward the buttons, 0 at the board center; y across, 0 on
the centerline.

| feature | in the lid | relative to board center |
|---|---|---|
| screen window | 30 x 27 mm | center x +2.0 |
| button slot | 4.5 x 21 mm | column at x +22.25, buttons at y ≈ -7.75, -2.6, +2.6, +7.75 (pitch ≈ 5.17) |
| joystick hole | 10 x 10 mm diamond (7.1 mm square rotated 45°) | center x -19.5 |

Calipers (Austin): 30.94 = case base width; 4.55 = tact switch body (4.5 mm square); 5.15 and
4.18 and 2.04 = see BUTTONS.md, being confirmed.

## Zez0000 case with caps (2026-09-08)

`case/zez0000/`: [Raspberry Pi Pico 2 Case - Waveshare 1.3" LCD by Zez0000](https://makerworld.com/en/models/3230142-raspberry-pi-pico-2-case-waveshare-1-3-lcd),
CC BY-NC, released 2026-08-28. A remix of the v0 case with 4 button caps and a joystick cap
already modeled: same base, rounded corners, square lid holes. Found while looking for a case
with the buttons and joystick covered. Parts: base 57x31x13, lid 57x31x15.6, button caps
6.3x5.5x4.4 (x4), joystick cap 8.2 round x4.1. Author settings: PLA, 0.20 mm, 2 walls, 15%
infill, no supports, about 40 min, caps on their own plate for a second color.
Print inbox drops `20260908-224447-*` and `20260908-224448-*`. Untested by us.

### base_v2 (2026-09-09): the stock base would not snap in

Austin printed the set; lid and base would not click together even with force. Measured on the
STLs: each base tab (53 x 2 mm, 2 mm above the rim) carries a full-length half-round ridge, r 0.5,
0.44 mm proud of the lid's inner wall, with zero end clearance. The lid has a matching r 0.5
groove centred 1.5 mm inside its mouth. That is 0.44 mm of interference along 106 mm at once.
`tools/zezbase` builds `case/zez0000/base_v3.stl`: ridge removed, tab face shaved to 0.1 mm
clearance, tab ends 0.25 mm clearance, then four 10 mm ridges (r 0.4, 0.25 mm proud) at
x = +-16 on each side, same height as the stock ridge so they land in the lid groove. Base only;
the stock lid and caps stay. v3 adds an 8 x 1 x 1 mm pry notch in the outer wall at the rim, +y side, x centre. Print inbox drop `20260909-*-base_v3`; full set in yellow PLA requested.

### base_v4 (2026-09-10): shorter posts, shorter case

The four Pico posts were 5.5 mm tall (floor z 2 to 7.5); Austin wants 3 mm, just enough to keep
BOOTSEL and the underside parts off the floor. `tools/zezbase` now also removes a 2.5 mm slab of
wall and post right above the floor and drops everything above it, so the USB slot, tabs, ridges
and pry notch keep their positions relative to the Pico. Output `case/zez0000/base_v4.stl`,
57 x 31 x 10.5 mm (was 13). Lid and caps unchanged. Print inbox drop `20260910-163347-base_v4`,
PLA fit check, base only. Knobs: `POST_H` (3.0) in `tools/zezbase`; `DROP` follows from it.

### joystick_cap_v2 (2026-09-10): looser stem socket

The stock cap's square stem socket is 1.95 mm for the 1.87 mm stem (Austin's calipers) and would
not push on. `tools/zezcap` opens it to 2.05 mm (`SOCKET`), same 1.8 mm depth, nothing else
changed. Output `case/zez0000/joystick_cap_v2.stl`. Print inbox drop `20260910-181311-joystick_cap_v2`,
on the PLA fit-check plate with base_v4.

### joystick_cap_v3 (2026-09-10): the v2 socket printed shut

The v2 cap came off the printer with the socket mouth squished and a sagged line across the
hole. Cause: the flange prints face down, so the 2 mm hole is in the squished first layer, and
its flat ceiling is a 2 mm bridge. `tools/zezcap` now cuts a 0.4 mm 45 degree chamfer at the
mouth (2.85 mm at the face) and a pyramid roof instead of the flat ceiling, and builds two
sizes: `joystick_cap_v3_2.05.stl` and `joystick_cap_v3_2.15.stl`. Both dropped for a slow PLA
print; keep whichever grips the 1.87 mm stem.

### Smaller joystick sockets and an X button (2026-09-10, later)

The v3 caps printed clean but the socket was loose on the stem. `tools/zezcap 1.95 2.00` builds
`joystick_cap_v3_1.95.stl` and `joystick_cap_v3_2.00.stl`, same chamfer and roof. `tools/zezbtn`
builds `button_cap_x.stl`: the stock (solid) button cap with a raised X on top, 0.7 mm bars at
45 degrees, 0.6 mm above the dome, for a cancel button. All three dropped for PLA, flange down.
`tools/zezbtn check` builds `button_cap_check.stl`, the confirm button, same raised bars in a
check mark. Later plan: print the symbols in a second color (green check, red X) on the AMS.
Result 2026-09-10 evening: socket 2.00 mm is the winner on the 1.87 mm stem. 10 copies queued.

### lid_v2 (2026-09-10): button holes moved

On the printed lid the four button holes sit 0.6 mm too far from the screen (the switch plunger
is off-centre in each hole) and are a hair tight on the caps. `tools/zezlid` fills the stock
holes, then cuts them 0.6 mm toward the screen (`SHIFT_X`) and 0.05 mm bigger per side (`GROW`).
Inside recess untouched. Output `case/zez0000/lid_v2.stl`. Queued with a base_v4 reprint as a
full case.


### lid_v3 (2026-09-10): button holes 0.3 mm bigger per side

lid_v2 printed with the holes lined up but tight, with print bumps catching the caps. The print
Claude opened the holes 0.3 mm per side directly on its copy of the v2 mesh (`lid_v2_holes_p06.stl`
on the Mac mini) and printed it in PETG. `tools/zezlid v3` makes the same part from source:
GROW 0.35 instead of 0.05, holes 5.20 x 4.45 mm on the same centres, x -24.25..-19.05. Output
`case/zez0000/lid_v3.stl`. Cap body is 4.30 x 3.56, so about 0.45 mm clearance per side.

### lid_v4 (2026-09-11): button holes halfway between v2 and v3

v3 (0.3 mm extra per side) was too loose. `tools/zezlid v4` uses GROW 0.20, holes 4.90 x 4.15 mm,
same centres. About 0.30 mm clearance per side on the 4.30 x 3.56 cap. Output `case/zez0000/lid_v4.stl`. Print inbox drop `20260911-100848-lid_v4`, PETG, print Claude told to go.

### base_v5 (2026-09-11): stiffer snap

base_v4 snaps and holds but pries apart with a fingernail. `tools/zezbase v5` raises the four ridges
from 0.25 to 0.50 mm proud (Austin: a quarter mm more) and fattens them from r 0.4 to r 0.5 so the
neck on the tab stays about 1 mm wide. Everything else is v4. Output `case/zez0000/base_v5.stl`. Print inbox drop `20260911-181009-base_v5`, black PETG, print Claude told to go 2026-09-11.
Unprinted. Note 0.50 is above the stock 0.44 that would not snap at all, but stock had 106 mm of
ridge and this has 40 mm. If v5 will not close, try 0.40.

### base_v5_qr (2026-09-11): white QR code in the bottom, AMS two-colour test

Austin's idea: the base prints bottom-down in black PETG, so put white PETG in the first layers to
make a QR code on the underside. `tools/zezqr [TEXT] [base_vN]` (default the repo URL, base_v5)
builds the QR with `qrcode` (EC L, 29 modules for the URL; a 0x address at M is also 29), lays it
on the bottom at 0.85 mm a module (24.7 mm square, centred at x -3.5 to clear the 3 x 2.3 mm hole
in the floor at x 12..15), mirrored so it reads from below, and cuts it 0.6 mm (three 0.2 mm layers)
into the 2.0 mm floor. Dark modules are white PETG; the black base is the light modules and the
quiet zone (an inverted QR, phones read those). Outputs, all in the base frame with z=0 on the bed:
`base_v5_qr_black.stl`, `base_v5_qr_white.stl` (431 loose squares, never print alone), and
`base_v5_qr.3mf`, a Bambu Studio project with both as parts of one object, white part on
extruder 2. The script checks itself: it samples the white body from below and matches it module
for module against the QR matrix, then decodes it with OpenCV.

Bambu Studio 2.7 CLI notes, since the print Claude slices headless: the 3MF needs a
`Metadata/project_settings.config` or the CLI segfaults on load (ours is
`case/zez0000/p2s_petg_x2.project_settings.json`, a P2S 0.4 / 0.20 mm / PETG HF x2 export with
`filament_colour`, `filament_map`, 2x2 `flush_volumes_matrix`, textured PEI plate); the plate
block needs `filament_maps` "1 1"; and `--load-settings`/`--load-filaments` must be given presets
with `inherits` already resolved (flatten the JSON chain) or every part ends up on filament 1.
With that it sliced to 3 filament changes, white 0.2 g, and the white toolpaths in the gcode
decode as the URL. Print inbox drops `20260911-142041-base_v5_qr` (3MF), `-142042-…_black` and
`-142043-…_white` (STL fallback). Unprinted. Knobs: `MOD`, `QR_H`, `CX`, `EC` in `tools/zezqr`.
Result 2026-09-11: printed on the AMS, the QR came out and scans. Proof done; parked. One day the
vault address goes in the bottom (`tools/zezqr 0x... base_vN`), not now.

### base_v5 result (2026-09-12): too tight, v4 is the keeper

base_v5 printed but does not fit well. base_v4 (ridges 0.25 mm proud) is the winning base. Reprint
requested plain, no QR: print inbox drop `20260912-100725-base_v4`, black PETG.

## Official set (2026-09-12, evening)

The case as it stands. Print these, nothing else, unless Austin says otherwise. One-file version
with all seven parts laid out in print orientation: `case/zez0000/picowallet_case.stl`, built by
`tools/zezplate`. Black PETG, 0.20 mm, no brim. Base floor down, lid outer face down, caps flange down.

| Part | File | Why |
|---|---|---|
| Base, Pico 2 W (micro-USB) | `case/zez0000/base_v6.stl` | ridges 0.30 mm proud; v4 (0.25) pulled apart by hand, v5 (0.50) would not fit |
| Base, pink Pico (USB-C) | `case/zez0000/base_pink.stl` | base_v6 with the USB-end posts spread, a divot under the jack, wider slot. Fits perfectly (2026-09-12) |
| Lid | `case/zez0000/lid_v5.stl` | v4 holes plus a 0.4 mm deeper cap pocket, so pressing the case no longer clicks buttons |
| Button caps | `button_cap_1..4.stl` (or `button_cap_x` / `button_cap_check`) | stock |
| Joystick cap | `joystick_cap_v3_2.00.stl` | 2.00 socket fits the 1.87 stem |

There is no lid v6 or base v7. The QR-bottom base is a parked side experiment.

### base_v6 (2026-09-12): a fifth of the way from v4 to v5

v4 holds but can be pulled apart by hand; v5 (0.50 proud) would not fit. `tools/zezbase v6` is v4
with the ridges 0.30 mm proud instead of 0.25, same r 0.4, same notch. Output
`case/zez0000/base_v6.stl`. Print inbox drop `20260912-145004-base_v6`, black PETG, no brim (Austin: never brim these parts again). If it is still loose, 0.35 next; if tight, v4 stays official.

### lid_v5 (2026-09-12): 0.4 mm more cap clearance

Pressing on the button side of the case clicks one or two buttons: the cap flange sits against the
pocket ceiling with almost no gap to the switch plunger. `tools/zezlid v5` is lid_v4 with the
cap-flange pocket inside (x -26.5..-18, y +-12.5) cut 0.4 mm deeper, so the plate over the button
strip is 1.6 mm instead of 2.0 and the caps sit 0.4 mm further out. Outer face unchanged, still
prints face down. Holes unchanged from v4. Output `case/zez0000/lid_v5.stl`. Print inbox drop `20260912-175600-lid_v5`, black PETG, no brim.
Alternative if this is not enough: a 0.4 mm dimple in the cap underside where the plunger lands.

### base_pink (2026-09-12, night): base_v6 for the USB-C (pink) Pico

The pink Pico has a USB-C jack: 8.89 wide, 3.15 tall (micro-USB is ~7.5 x 2.7). On base_v6 the
two posts at the USB end are 8.0 mm apart face to face and the wall slot is 8 x 3 with its floor
0.5 above the case floor, so the jack hits both. base_pink is base_v6 plus:

- USB-end posts moved out 0.75 mm each: gap 8.0 -> 9.5 mm. Other end unchanged.
- 0.6 mm divot in the floor under the jack, 9.1 wide x 7.4 in from the wall. 1.4 mm floor left.
- Wall slot 9.2 wide, floor dropped to the divot floor (z 1.4..5.5).

`tools/zezbase pink`. Drop 20260912-204053-base_pink, black PETG, no brim. Lid and caps unchanged.
Printed and fits perfectly. Official: base_v6 for a Pico 2 W, base_pink for the pink USB-C Pico.

### lid_v6 (2026-09-12, night): pocket 0.6 mm

With the pink Pico in base_pink, pressing the case still clicked the buttons a little on lid_v5.
Same fix, more of it: cap pocket 0.6 mm deep instead of 0.4, so the plate over the buttons is
1.4 mm. Holes unchanged from v4/v5. `tools/zezlid v6`, drop `20260912-213327-lid_v6`, black PETG, no brim.
Not official until it is tried.
