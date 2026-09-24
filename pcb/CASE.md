# picowallet v0.6 — dimensions for a case (2026-09-23)

Coordinates: mm, origin = board center, X right, Y up, looking at the FRONT (screen side).
Board: 72 × 44 × 1.6 mm, square corners. 3D model of the whole thing: `v0/board.glb` (open in Blender, Fusion, or any glTF viewer). Source of truth: `v0/index.circuit.tsx`.

## Heights above the front face
| Part | Height | Note |
|---|---|---|
| Screen = Waveshare 1.3" LCD Module, 45 × 31 mm, on 4 standoffs | 6 mm standoffs + 1.6 module PCB + ~3.5 panel ≈ 11 mm to glass | Module center (1.6, 0). Its 4 holes are Ø3 on a 40 × 26 grid → board holes at (-18.4, ±13), (21.6, ±13). Active glass 23.4 × 23.4 centered about (5, 0). PH2.0 cable comes off the module's back-left, loops down to J1. |
| Joystick SW5 | 5 mm body, stem to 7 mm | 7.5 × 7.5 body rotated 45°, so a 10.6 mm diamond |
| Buttons SW1, SW2 | 5 mm, plunger to 6 | 6 × 6 body, 3.5 mm round plunger |
| Power switch SW6 | 2.8 mm tall; knob hangs ~1 mm past the bottom edge, slides left-right | 8 × 2.8 body, center (-18, -18), pins inboard |
| LEDs PWR (-27, -20) green, CHG (-12, -20) red | 0.8 mm | 0603, light pipes or a clear window if the case covers them |
| Battery plug J2 | 6 mm | JST-PH, opening faces +Y (top edge) |
| Screen plug J1 | 6 mm, 19.6 × 4.5 | JST-PH 8-pin at (1.6, -19.5), under the screen's bottom edge |
| LiPo 402030 | 4 mm, under the screen | 20 × 30, centered (1.6, 1) |
| Everything else | ≤ 1.5 mm | |

## Heights below the back face
| Part | Height |
|---|---|
| Pico 2 W module | 4 mm (1 mm board + 3 mm micro-USB and parts). 51 × 21, centered (-10, 0), USB connector pokes ~1.3 mm past the LEFT edge |

Total stack ≈ 1.6 + 11 + 4 ≈ 17 mm.

## Cutouts the case needs
| What | Center | Size |
|---|---|---|
| Screen window | (5, 0) | 45 × 31 (whole module) or 24 × 24 for the glass |
| Joystick | (-28, 2) | Ø 12 |
| Button A | (30, 8) | Ø 5 |
| Button B | (30, -6) | Ø 5 |
| Power switch | bottom edge, x = -18 | 6 wide × 3 tall notch in the wall; knob already sticks out of the board |
| PWR / CHG lights | (-27, -20), (-12, -20) | Ø 2 windows or leave the bottom edge open |
| Micro-USB | left edge, y ≈ 0 (from the back) | 8 × 3, sits 1.6–4.6 mm below the board |
| Battery plug | (21, 18.5) | leave 6 mm clear above, cable exits toward +Y |

## Mounting holes (Ø 2.7, M2.5)
Case: (-34, 20), (34, 20), (34, -20), (-34, -13). Screen standoffs: (-18.4, ±13), (21.6, ±13). The two left standoff holes sit 0.35 mm from the Pico's edge on the back: use M2 hardware (3.5 mm heads) or nylon, not M2.5, on the back side.

## Notes
- Front cover must clear 14 mm; back cover 4 mm plus room for the USB plug body (~8 mm more if you want to charge with the case on).
- Joystick is a diamond, not a square: give it a round hole.
- The JST plug opening faces the top edge, so the battery lead loops from there back under the screen.
- Heights for switch, joystick, header are datasheet nominal, not measured. Add 0.5 mm.
