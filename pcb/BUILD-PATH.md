# picowallet v0.2 — can we simulate it, and where to build it (researched 2026-09-23)

## Simulation: what exists, what it proves

No tool takes a board and says "this works." Three layers exist, each covers a slice:

| Layer | Tool | Covers | Our status |
|---|---|---|---|
| Analog physics | SPICE (tscircuit `tsci simulate`, ngspice in WASM) | voltages, currents, RC, diodes | Ran the battery → Schottky → VSYS path: 3.4 V battery, 120 mA load → 2.6 V at VSYS with a generic diode model (real SS14 drops less). Pico needs ≥ 1.8 V. Fine. No SPICE model for TP4056, ATECC608B, or the Pico itself, so that's the limit. |
| Firmware | Wokwi (browser Pico emulator, MicroPython) | GPIO logic, display, buttons | Emulates the RP2040 Pico / Pico W only. RP2350 (Pico 2 W) is an open issue, community fork is RISC-V only. No ATECC608 model. Our firmware already runs on real hardware with these exact pins, so there's nothing new to prove here. |
| Design review | ERC/DRC (KiCad, JLCPCB DFM), AI reviewers | pin mapping, footprints, rules | tscircuit netlist + placement + shorts pass. tscircuit exports a KiCad project; KiCad's ERC/DRC is a free second opinion. AI reviewers in 2026: Diode Computers (a16z, $11.4M, NYC; schematics-as-code "Zener", Claude partnership Dec 2025, exports to KiCad), Quilter (physics-driven layout, $25M B), ProtoFlow (schematic review). All still keep a human reviewer. |

What actually kills first boards is pinout and footprint mistakes. Physics does not catch those; datasheets and eyes do. That's the check I did on the Pico and joystick. The industry answer to the rest is: order 5, bring one up.

Cheap extra check before ordering: export the KiCad project (`tsci export -f kicad_zip`), open it, run ERC and DRC, and have a second model review the netlist against the datasheets.

## Build paths, 5 boards

| Path | Price guess | Time | Notes |
|---|---|---|---|
| **JLCPCB** (China, assembled) | ~$190 + US tariff prepaid at checkout (DDP, roughly 35–50% of merchandise value in 2026, call it $40–60) → **~$240** | ~2 weeks | Individuals must ship DDP; DHL/FedEx now corporate-only, so slower carriers. Pico costs $14 there vs $7 at DigiKey. Cheapest assembly setup. |
| **Colorado PCB Assembly** (Centennial) | quote only, US proto assembly for 5 boards usually **$300–600** | 3/5/10-day turns | Turnkey, buys from DigiKey/Mouser/Arrow, no minimum, outsources bare boards. Email sales@coloradopcbassembly.com, 303-418-8468. |
| **SlingShot Assembly** (Denver, now "Acorn Assembly") | online instant quote, likely same **$300–600** band | 3–7 days | From 1 board. Turnkey incl. bare boards. 720-778-2400. |
| **AdvancedPCB / Advanced Circuits** (Aurora) | bare 2-layer **$33 each, min 3**, 5 days; assembly quote-based, "no setup fees, no minimum" | 5 days + assembly | The Colorado name in PCBs. Instant quote at my4pcb.com. |
| **Hybrid: US bare boards + we solder** | OSH Park ~$25 for 3 (12–21 days) or AdvancedPCB $99 for 3 (5 days) + DigiKey parts ~$25/board → **~$120 for 3** | 1–3 weeks | Every part is hand-solderable: castellated Pico, SOIC-8, 0603, SMA, SOT. TP4056 (ESOP-8, thermal pad) is the only fiddly one; a hot-air pen or an iron on the pad via works. No tariff, no setup fee, you know every joint. |

Rules of thumb: China wins on assembly setup, US wins on parts (Pico $7) and no tariff, and for 5 boards the US shops' fixed costs dominate. Nobody publishes 2026 prices for a job this small; every shop says "upload and see."

## What to do

Upload the same `pcb/v0/fab.zip` + `bom.csv` to three quoters and compare real numbers:
1. jlcpcb.com (tariff shows in cart)
2. slingshotassembly.com (instant quote)
3. my4pcb.com (AdvancedPCB, instant quote)

If US assembly is over ~$400, do the hybrid: AdvancedPCB bare boards, DigiKey cart, solder at the bench.

Sources: JLCPCB US tariff FAQ (Mar 2026 update), coloradopcbassembly.com/services, slingshotassembly.com, advancedpcb.com specials, Wokwi docs + wokwi/rp2040js issue #142, blog.diode.computer/anthropic-partnership, ProtoFlow 2026 tool comparison, Maskset tariff-math post.
