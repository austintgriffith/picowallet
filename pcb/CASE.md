# picowallet v0.7 — dimensions for a case (2026-09-23)

Coordinates: mm, origin = board center, X right, Y up, looking at the FRONT (screen side).
Board: 82 × 44 × 1.6 mm, square corners. 3D model of the whole thing: `v0/board.glb` (open in Blender, Fusion, or any glTF viewer). Source of truth: `v0/index.circuit.tsx`.

## Heights above the front face
| Part | Height | Note |
|---|---|---|
| Bare panel HS20HS072RX, 51.8 × 36.2 × 2.05 mm, lies flat | ~2.3 mm to glass (sits on the 2 mm latch at its left edge; the case should shim/hold it) | Center (2, 0). Active area 40.8 × 30.6, offset toward the right (ribbon side is left). Ribbon exits the LEFT edge at y ≈ +2.8 and folds under. The case must hold the panel down and cover its glass edges; no mounting holes on the panel. |
| Joystick SW5 | 5 mm body, stem to 7 mm | 7.5 × 7.5 body rotated 45°, so a 10.6 mm diamond |
| Buttons SW1, SW2 | 5 mm, plunger to 6 | 6 × 6 body, 3.5 mm round plunger |
| Power switch SW6 | 2.8 mm tall; knob hangs ~1 mm past the bottom edge, slides left-right | 8 × 2.8 body, center (-18, -18), pins inboard |
| LEDs PWR (-27, -20) green, CHG (-12, -20) red | 0.8 mm | 0603, light pipes or a clear window if the case covers them |
| Battery plug J2 | 6 mm | JST-PH, opening faces +Y (top edge) |
| Ribbon latch J3 | 1 mm, 8.1 × 3.3 | at (-4.3, 0.4) under the panel, mouth facing -X; the panel rests on its lid |

| Everything else | ≤ 1.5 mm | |

## Heights below the back face
| Part | Height |
|---|---|
| Pico 2 W module | 4 mm (1 mm board + 3 mm micro-USB and parts). 51 × 21, centered (-13, 0). USB connector face sits ~1.2 mm INSIDE the left board edge: the case needs a notch that reaches it |
| LiPo 402030 | 4 mm | 20 × 30 standing tall, centered (28, 2), on the BACK |
| Battery plug J2 | 6 mm on the BACK | JST-PH at (28, 20), opening toward the top edge |

Total stack ≈ 2.3 + 1.6 + 6 (battery plug) ≈ 10 mm; 8 mm if the plug is trimmed or moved.

## Cutouts the case needs
| What | Center | Size |
|---|---|---|
| Screen window | (7, 0) | 41 × 31 active area; the bezel must overlap the glass ~1 mm all round to hold it |
| Joystick | (-33, 0) | Ø 12 |
| Button A | (34, 8) | Ø 5 |
| Button B | (34, -6) | Ø 5 |
| Power switch | bottom edge, x = -30 | 6 wide × 3 tall notch in the wall; knob already sticks out of the board |
| PWR / CHG lights | (-20, -20), (-8, -20) | Ø 2 windows or leave the bottom edge open |
| Micro-USB | left edge, y ≈ 0 (from the back) | 8 × 3, sits 1.6–4.6 mm below the board |
| Battery plug | (28, 20) on the BACK | leave 6 mm clear, cable exits toward +Y |

## Mounting holes (Ø 2.7, M2.5)
Four corners: (±38.5, ±19.5).

## Notes
- Front cover must clear 14 mm; back cover 4 mm plus room for the USB plug body (~8 mm more if you want to charge with the case on).
- Joystick is a diamond, not a square: give it a round hole.
- The JST plug opening faces the top edge, so the battery lead loops from there back under the screen.
- Heights for switch, joystick, header are datasheet nominal, not measured. Add 0.5 mm.
