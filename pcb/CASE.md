# picowallet v0.5 — dimensions for a case (2026-09-23)

Coordinates: mm, origin = board center, X right, Y up, looking at the FRONT (screen side).
Board: 68 × 44 × 1.6 mm, square corners. 3D model of the whole thing: `v0/board.glb` (open in Blender, Fusion, or any glTF viewer). Source of truth: `v0/index.circuit.tsx`.

## Heights above the front face
| Part | Height | Note |
|---|---|---|
| Screen module (1.3" ST7789) on its header | 14 mm to glass | header 8.5 + module PCB 1.6 + panel ~3.5. Module 27.8 × 39.2 mm, its center at (1.6, 0). Only the top ~20 mm of that is active display. |
| Joystick SW5 | 5 mm body, stem to 7 mm | 7.5 × 7.5 body rotated 45°, so a 10.6 mm diamond |
| Buttons SW1, SW2 | 5 mm, plunger to 6 | 6 × 6 body, 3.5 mm round plunger |
| Power switch SW6 | 2.8 mm tall; body face at the edge, knob hangs ~1.5 mm past the bottom edge, slides left-right | 8 × 2.8 body, center (-18, -20.7) |
| LEDs PWR (-27, -20) green, CHG (-12, -20) red | 0.8 mm | 0603, light pipes or a clear window if the case covers them |
| Battery plug J2 | 6 mm | JST-PH, opening faces +Y (top edge) |
| LiPo 402030 | 4 mm, under the screen | 20 × 30, centered (1.6, 1) |
| Everything else | ≤ 1.5 mm | |

## Heights below the back face
| Part | Height |
|---|---|
| Pico 2 W module | 4 mm (1 mm board + 3 mm micro-USB and parts). 51 × 21, centered (-8, 3), USB connector pokes ~1.3 mm past the LEFT edge |

Total stack ≈ 1.6 + 14 + 4 = 19.6 mm.

## Cutouts the case needs
| What | Center | Size |
|---|---|---|
| Screen window | (1.6, 0) | 28 × 40 (whole module) or 24 × 24 for glass only, centered about (1.6, 6) |
| Joystick | (-25.7, 2) | Ø 12 |
| Button A | (27.6, 8) | Ø 5 |
| Button B | (27.6, -6) | Ø 5 |
| Power switch | bottom edge, x = -18 | 6 wide × 3 tall notch in the wall; knob already sticks out of the board |
| PWR / CHG lights | (-27, -20), (-12, -20) | Ø 2 windows or leave the bottom edge open |
| Micro-USB | left edge, y ≈ 3 (from the back) | 8 × 3, sits 1.6–4.6 mm below the board |
| Battery plug | (21, 18.5) | leave 6 mm clear above, cable exits toward +Y |

## Mounting holes (Ø 2.7, M2.5)
(-31, 20), (31, 20), (31, -20), (-31, -13). The fourth is inboard because the Pico's USB is in that corner.

## Notes
- Front cover must clear 14 mm; back cover 4 mm plus room for the USB plug body (~8 mm more if you want to charge with the case on).
- Joystick is a diamond, not a square: give it a round hole.
- The JST plug opening faces the top edge, so the battery lead loops from there back under the screen.
- Heights for switch, joystick, header are datasheet nominal, not measured. Add 0.5 mm.
