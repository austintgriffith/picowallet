# v0.9 routing checkpoint — NOT FOR ORDERING

The revised 82 × 54 mm layout builds. Independent exported-copper checks found no shorts, opens, missing port copper, copper outside the board, or via-hole clearance violations. Minimum board-edge clearance: 0.4448 mm; nonplated-hole clearance: 0.3230 mm; checked copper clearance: 0.1035 mm. These checks use the new notched outline, not the old rectangular boundary.

Screen wiring assertions pass for the TLV75528 regulator and SN74LVC245A buffer. Buffer DIR is tied high, OE low, and unused A inputs low. Pin mapping was checked against TI's SN74LVC245A Rev. X datasheet: https://www.ti.com/lit/ds/symlink/sn74lvc245a.pdf

Still required: final KiCad and assembly-export review, supplier rotations, mask/paste and mechanical review, exact screen/ribbon fit and orientation, battery qualification, and physical bring-up. A successful routing check does not establish hardware functionality. Previous ZIP and cart must not be ordered as the final design.

## KiCad export checkpoint

All 188 SMT pad centers and 1,003 routed segments match the source; track comparison allows 2 nm for exported coordinate rounding. Native KiCad 10.0.6 reports zero errors and zero unconnected items after restoring the source's placement permissions for three keepouts. Tracks, vias and pours remain prohibited in those zones. This correction is reproducible using `pcb/v0/scripts/normalize_kicad_rules.py`; it has not yet been integrated into final release packaging.

Remaining native warnings: 52 missing library references, 41 text-height warnings, 12 silkscreen overlaps, and two silkscreen/board-edge warnings. These remain open; this is not a clean final release.

The included pick-and-place CSV is explicitly UNVERIFIED. The old v0.8 Pico rotation correction cannot be reused after rotating the module in v0.9. Supplier preview confirmation is still required.
