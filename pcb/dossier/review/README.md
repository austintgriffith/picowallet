# Reproducing the review checks

From any working directory, in an isolated Python environment with `requirements.txt` installed:

```
python /Users/austingriffith/picowallet/pcb/dossier/review/check_copper.py
python /Users/austingriffith/picowallet/pcb/dossier/review/check_kicad.py
```

Scripts locate `../design` relative to their own location. They do not modify the design.

`check_copper.py` reads copper Gerbers with gerbonara, expands shapes through Shapely, handles Gerber LR flash rotations explicitly (gerbonara 1.6.3 ignores LR), joins touching copper per layer, and joins layers at plated drill centers. It derives intended net groups from JSON source traces, then maps PCB port centers to the physical copper. Curve approximation and a 0.000002 mm connectivity tolerance are used. Reported drilling-clearance examples are far larger than numerical approximation error; the worst example has an independent simple analytic calculation in the review.

Connectivity is checked against the supplied compiled netlist, not against electrical behavior inside real components. This is not a certified CAM tool, a complete fabrication DRC, a solder-mask/paste audit, or an independent fresh tscircuit rebuild. Component assembly orientation, pin-function correctness, hidden module copper, power budgets, and mechanical fit require separate review.

`check_kicad.py` reads the supplied ZIP and compares 132 named SMT pad centers and 448 trace segments against JSON. It does not run KiCad's native DRC. The thermal pad name is not included in that center comparison, and pad shapes/rotations and net assignments are not comprehensively compared.

`design-SHA256SUMS.txt` fingerprints the design inputs examined. It does not fingerprint JLCPCB's server-side job, which was unavailable to this review.

Retrieved supporting manufacturer PDFs are preserved here; their source URLs and conclusions are in `../INDEPENDENT-REVIEW.md`. No external messages or order changes were made.
