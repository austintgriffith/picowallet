#!/usr/bin/env python3
"""Independent pin-number assertions for power and firmware interfaces."""
import json
import sys

data = json.load(open(sys.argv[1]))
parents = {}


def root(a):
    parents.setdefault(a, a)
    if parents[a] != a:
        parents[a] = root(parents[a])
    return parents[a]


for a in data:
    if a["type"] == "source_trace":
        ids = a["connected_source_port_ids"] + a["connected_source_net_ids"]
        for i in ids:
            parents[root(i)] = root(ids[0])
sc = {a["source_component_id"]: a for a in data if a["type"] == "source_component"}
parts = {a["name"]: a for a in sc.values()}
pins = {}
for a in data:
    if a["type"] == "source_port" and a["source_component_id"] in sc:
        name = sc[a["source_component_id"]]["name"]
        pins[name + "." + str(a.get("pin_number", a["name"]))] = root(a["source_port_id"])
for a in data:
    if a["type"] == "source_net":
        pins[a["name"]] = root(a["source_net_id"])


def same(*names):
    assert len({pins[name] for name in names}) == 1, names


same("GND", "J3.1", "J3.12", "Q1.2", "U3.3", "U3.9", "J2.2", "SW6.3")
same("V3_3", "U1.36", "U5.1", "U5.3", "C6.1", "R16.2")
same("LCD_2V8", "J3.8", "J3.9", "U5.5", "U4.20", "U4.1", "C4.1", "C5.1", "C7.1")
same("GND", "U5.2", "U4.10", "U4.19", "U4.7", "U4.8", "U4.9", "C5.2", "C6.2", "C7.2")
assert pins["LCD_2V8"] != pins["V3_3"]
# TI SN74LVC245A: DIR=1 selects A to B; OE=0 enables outputs.
for panel, pico_pin, a, b, ref, pull in [(2,12,2,18,"R11","R16"), (3,11,3,17,"R12","R20"), (4,14,4,16,"R13","R18"), (5,15,5,15,"R14","R19"), (6,16,6,14,"R15","R17")]:
    same(f"U1.{pico_pin}", f"U4.{a}", f"{pull}.1")
    same(f"U4.{b}", f"{ref}.1")
    same(f"J3.{panel}", f"{ref}.2")
    assert len({pins[f"U1.{pico_pin}"], pins[f"U4.{b}"], pins[f"J3.{panel}"]}) == 3
    assert parts[ref]["resistance"] == 33
same("GND", "R17.2", "R18.2", "R19.2", "R20.2")
assert len({pins[f"J3.{i}"] for i in [1, 2, 3, 4, 5, 6, 7, 8, 10, 11]}) == 10
same("J3.10", "R6.2")
same("J3.11", "Q1.3")
same("Q1.1", "U1.17", "R7.1")
same("VSYS", "U1.39", "D1.1", "R6.1")
same("BAT", "J2.1", "U3.5", "Q2.2", "R8.1", "SW6.1")
same("Q2.3", "D1.2")
same("Q2.1", "R8.2", "R9.2")
same("SW6.2", "R9.1")
assert pins["SW6.2"] not in {pins["BAT"], pins["VSYS"], pins["Q2.3"]}
same("U3.8", "SJ1.2", "R10.1")
same("VBUS", "U1.40", "U3.4", "SJ1.1")
same("GND", "R10.2", "R3.2")
same("U3.2", "R3.1")
assert pins["U3.8"] != pins["VBUS"], "Charge enable must stay isolated across the open jumper"
for ref, value in [("R3", 12000), ("R6", 39), ("R8", 100000), ("R9", 10000), ("R10", 100000)]:
    assert parts[ref]["resistance"] == value, ref
same("U2.5", "U1.6")
same("U2.6", "U1.7")
for switch, pico_pin in [("SW1.1", 20), ("SW2.1", 22), ("SW5.1", 4), ("SW5.6", 24), ("SW5.3", 21), ("SW5.4", 26), ("SW5.2", 5)]:
    same(switch, f"U1.{pico_pin}")
# Conservative component arithmetic: no credit for supply-diode/FET drops.
max_backlight_a = (5.5 - 2.8) / (39 * .95)
max_r6_w = (5.5 - 2.8) ** 2 / (39 * .95)
max_charge_a = 1200 / (12000 * .99) * 1.1
assert max_backlight_a < .080 and max_r6_w < .250
assert max_charge_a < .112
assert 4.2 / (100000 + 10000) < .00004
print("Power, charge-disable jumper, display, I2C and button pin-number checks passed.")
print(f"Backlight bound: {max_backlight_a*1000:.2f} mA; resistor: {max_r6_w:.3f} W at the stated corner.")
print(f"Charge-current bound: {max_charge_a*1000:.2f} mA; battery approval still required.")
