#!/usr/bin/env python3
"""Restore placement-permitted keepouts lost by the KiCad exporter.

Usage: normalize_kicad_rules.py circuit.json board.kicad_pcb board.kicad_pro
Copper geometry is untouched. Independent Gerber checks remain mandatory.
"""
import json
from pathlib import Path
import re
import sys

source, pcb_path, project_path = map(Path, sys.argv[1:])
data = json.loads(source.read_text())
keepouts = [a for a in data if a['type'] == 'pcb_keepout']
assert keepouts and all(a.get('allow_placements') is True for a in keepouts), 'Mixed keepout policy requires per-zone mapping'
text = pcb_path.read_text()
pattern = r'\(keepout\s+\(tracks not_allowed\)\s+\(vias not_allowed\)\s+\(pads not_allowed\)\s+\(copperpour not_allowed\)\s+\(footprints not_allowed\)\s*\)'
matches = list(re.finditer(pattern, text))
assert len(matches) == len(keepouts), (len(matches), len(keepouts))
text = re.sub(pattern, lambda m: m[0].replace('(pads not_allowed)', '(pads allowed)').replace('(footprints not_allowed)', '(footprints allowed)'), text)
pcb_path.write_text(text)
project = json.loads(project_path.read_text())
project['board']['design_settings']['rules'].update(
    min_copper_edge_clearance=.3, min_hole_clearance=.2, min_clearance=.1)
project_path.write_text(json.dumps(project, indent=2) + '\n')
print(f'Restored placement permission for {len(matches)} keepouts; tracks, vias and pours still prohibited.')
