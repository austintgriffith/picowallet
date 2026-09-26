#!/usr/bin/env python3
"""Build one checked, consistent PCB package. Requires review/requirements.txt."""
import csv
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT.parent / "dossier/review"
OUT = ROOT / "dist/release"


def run(args, log):
    result = subprocess.run(args, cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    (OUT / log).write_text(result.stdout)
    if result.returncode:
        print(result.stdout)
        raise SystemExit(result.returncode)


def write_csv(path, fields, rows):
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # A failed run must never retain a previous success marker.
    (OUT / "CHECKS-PASSED.json").unlink(missing_ok=True)
    run(["bun", "install", "--frozen-lockfile"], "install.log")
    run(["bun", "run", "typecheck"], "typecheck.log")
    run(["bun", "run", "build", "--", "--autorouter-timeout", "120s"], "build.log")
    circuit = ROOT / "dist/index/circuit.json"
    raw_zip = ROOT / "dist/raw-fab.zip"
    run(["bunx", "--no-install", "tsci", "export", str(circuit), "-f", "gerbers", "-o", str(raw_zip)], "export.log")
    run(["bunx", "--no-install", "tsci", "export", str(circuit), "-f", "kicad_zip", "-o", str(OUT / "kicad-project.zip")], "kicad-export.log")
    with zipfile.ZipFile(raw_zip) as z:
        for name in z.namelist():
            assert Path(name).name == name, name
            (OUT / name).write_bytes(z.read(name))
    shutil.copy(circuit, OUT / "circuit.json")
    data = json.loads(circuit.read_text())
    errors = [a for a in data if a["type"].endswith("_error")]
    assert not errors, errors
    board = next(a for a in data if a["type"] == "pcb_board")
    assert board["thickness"] == 1.6

    # The exporter maps Pico's bottom-side supplier rotation incorrectly.
    # Explicit, version-checked correction: saved supplier preview validated 180.
    # Other rotations (including J2=90 and LED2=0) are already exporter-corrected.
    cpl = list(csv.DictReader((OUT / "pick_and_place.csv").open()))
    pico = next(row for row in cpl if row["Designator"] == "U1")
    assert pico["Layer"] == "bottom" and float(pico["Rotation"]) == 0, pico
    pico["Rotation"] = "180"
    write_csv(OUT / "pick_and_place.csv", cpl[0].keys(), cpl)
    bom = list(csv.DictReader((OUT / "bom.csv").open()))
    refs = {row["Designator"] for row in cpl}
    assert refs == {row["Designator"] for row in bom}
    assert not refs & {"BT1", "DISP1", "SJ1"}
    expected_parts = {"Q1": "C20917", "Q2": "C15127", "R3": "C22790", "R6": "C25379", "J3": "C466532"}
    for row in bom:
        if row["Designator"] in expected_parts:
            assert row["JLCPCB Part #"] == expected_parts[row["Designator"]]

    run([sys.executable, str(REVIEW / "check_copper.py"), str(OUT)], "copper-check.txt")
    run([sys.executable, str(REVIEW / "check_kicad.py"), str(OUT)], "kicad-check.txt")
    run([sys.executable, str(ROOT / "scripts/check_design.py"), str(OUT / "circuit.json")], "design-check.txt")
    run(["bunx", "--no-install", "tsci", "export", str(circuit), "-f", "pcb-svg", "-o", str(OUT / "top.svg")], "render-top.log")
    run(["bunx", "--no-install", "tsci", "export", str(circuit), "-f", "pcb-svg", "--layer", "bottom", "-o", str(OUT / "bottom.svg")], "render-bottom.log")
    # Fabrication ZIP deliberately contains ONLY Gerbers/drills; assembly CSVs
    # have one authoritative copy each, adjacent to it.
    with zipfile.ZipFile(OUT / "fab.zip", "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.iterdir()):
            if p.suffix in {".gbr", ".drl"}:
                info = zipfile.ZipInfo(p.name, (2026, 9, 24, 0, 0, 0))
                z.writestr(info, p.read_bytes())
    shutil.copy(ROOT / "index.circuit.tsx", OUT / "index.circuit.tsx")
    shutil.copytree(ROOT / "imports", OUT / "imports", dirs_exist_ok=True)
    for name in ["package.json", "bun.lock", "tsconfig.json", "tscircuit.config.json"]:
        shutil.copy(ROOT / name, OUT / name)
    shutil.copytree(ROOT / "scripts", OUT / "scripts", dirs_exist_ok=True)
    shutil.copy(ROOT.parents[1] / "firmware/lcd.py", OUT / "lcd.py")
    shutil.copy(ROOT.parents[1] / "firmware/boards/picowallet_v08/lcd_config.py", OUT / "lcd_config.py")
    netlist(data)
    (OUT / "CHECKS-PASSED.json").write_text(json.dumps({
        "revision": "v0.8", "placed_parts": len(refs),
        "automated_checks": "passed", "approved_for_order": False,
        "remaining": ["physical panel fit and polarity", "battery specification", "assembler orientation confirmation", "bench and RF tests"]
    }, indent=2) + "\n")
    manifest = []
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p.name != "SHA256SUMS.txt":
            manifest.append(hashlib.sha256(p.read_bytes()).hexdigest() + "  " + str(p.relative_to(OUT)))
    (OUT / "SHA256SUMS.txt").write_text("\n".join(manifest) + "\n")
    print(f"Checked package: {OUT}. Physical/assembly checks remain; not approved for order.")


def netlist(data):
    parents = {}
    def root(a):
        parents.setdefault(a, a)
        if parents[a] != a:
            parents[a] = root(parents[a])
        return parents[a]
    for item in data:
        if item["type"] == "source_trace":
            ids = item["connected_source_port_ids"] + item["connected_source_net_ids"]
            for item_id in ids:
                parents[root(item_id)] = root(ids[0])
    sc = {a["source_component_id"]: a for a in data if a["type"] == "source_component"}
    ports = {a["source_port_id"]: a for a in data if a["type"] == "source_port"}
    lines = ["# Generated v0.8 netlist", "", "Positions are compiled footprint centers, in mm. PCB rotations are not supplier CPL rotations.", "", "| Part | X | Y | Side | PCB rotation |", "|---|---:|---:|---|---:|"]
    for a in data:
        if a["type"] == "pcb_component" and a["source_component_id"] in sc:
            lines.append(f'| {sc[a["source_component_id"]]["name"]} | {a["center"]["x"]:.4f} | {a["center"]["y"]:.4f} | {a["layer"]} | {a["rotation"]} |')
    groups = {}
    for sid, p in ports.items():
        if p["source_component_id"] in sc:
            groups.setdefault(root(sid), []).append(sc[p["source_component_id"]]["name"] + "." + str(p.get("pin_number", p["name"])))
    labels = {root(a["source_net_id"]): a["name"] for a in data if a["type"] == "source_net"}
    lines += ["", "## Connections", ""]
    for key, members in groups.items():
        lines.append(f'- {labels.get(key, "unnamed / unconnected")}: ' + ", ".join(members))
    lines += ["", "## J3 pads", "", "| Pin | X | Y |", "|---|---:|---:|"]
    for p in data:
        if p["type"] == "pcb_port":
            source = ports[p["source_port_id"]]
            if sc.get(source["source_component_id"], {}).get("name") == "J3":
                lines.append(f'| {source.get("pin_number",source["name"])} | {p["x"]:.4f} | {p["y"]:.4f} |')
    (OUT / "NETLIST.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
