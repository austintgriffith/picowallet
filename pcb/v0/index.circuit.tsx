import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"
import { TP4056 } from "./imports/TP4056"
import { MSK12C02 } from "./imports/MSK12C02"
import { SS14 } from "./imports/SS14"

// picowallet one-board v0.3, 68 x 42 mm. Joystick and buttons each ~9 mm clear of the screen edge.
// FRONT: joystick | screen module on an 8.5 mm female header | A over B.
//        Under the screen (8 mm pocket): LiPo 502030 lying flat, ATECC608B, TP4056 charger,
//        diode, battery solder pads. Power slide switch pokes out the bottom edge.
// BACK:  Pico 2 W only, castellated, USB out the left edge.
// Pins match firmware/lcd.py + firmware/atecc.py.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 20: "pin26",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="68mm" height="42mm">
    {/* BACK: Pico 2 W */}
    <Raspberry_Pi_Pico_2W name="U1" layer="bottom" pcbX={-8} pcbY={3} pcbRotation={180} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />
    <trace from="U1.pin39" to="net.VSYS" />
    <trace from="U1.pin40" to="net.VBUS" />

    {/* FRONT: screen. Female header + 36x36 module drawn as a box 8.5 mm up. */}
    <chip name="DISP1" footprint="pinrow8_p2.54mm" pcbX={1.6} pcbY={-15}
      pinLabels={{ pin1: "GND", pin2: "VCC", pin3: "SCL", pin4: "SDA", pin5: "RES", pin6: "DC", pin7: "CS", pin8: "BLK" }}
      cadModel={{ jscad: { type: "union", shapes: [
        { type: "cuboid", size: [20.3, 2.5, 8.5], center: [0, 0, 4.25] },
        { type: "cuboid", size: [36, 36, 3.5], center: [0, 16, 10.25] } ] } }} />
    <trace from="DISP1.GND" to="net.GND" />
    <trace from="DISP1.VCC" to="net.V3_3" />
    <trace from="DISP1.SCL" to={pico(10)} />
    <trace from="DISP1.SDA" to={pico(11)} />
    <trace from="DISP1.RES" to={pico(12)} />
    <trace from="DISP1.DC" to={pico(8)} />
    <trace from="DISP1.CS" to={pico(9)} />
    <trace from="DISP1.BLK" to={pico(13)} />

    {/* FRONT: joystick (ALPS SKRH, directions on the diagonals -> 45°), A over B */}
    <SKRHABE010 name="SW5" pcbX={-25.7} pcbY={2} pcbRotation={45} />
    <trace from="SW5.COM" to="net.GND" />
    <trace from="SW5.A" to={pico(2)} />
    <trace from="SW5.B" to={pico(18)} />
    <trace from="SW5.C" to={pico(16)} />
    <trace from="SW5.D" to={pico(20)} />
    <trace from="SW5.CEN" to={pico(3)} />
    {[
      { ref: "SW1", lbl: "A", gp: 15, y: 8 },
      { ref: "SW2", lbl: "B", gp: 17, y: -6 },
    ].map(({ ref, lbl, gp, y }) => (
      <Fragment key={ref}>
        <KH_6X6X5H_STM name={ref} pcbX={27.6} pcbY={y} pcbRotation={90} />
        <silkscreentext text={lbl} pcbX={27.6} pcbY={y + 7} fontSize={1} />
        <trace from={`${ref}.pin1`} to={pico(gp)} />
        <trace from={`${ref}.pin2`} to="net.GND" />
      </Fragment>
    ))}

    {/* FRONT, under the screen: LiPo 502030 (30x20x5). Drawn only, no part number. */}
    <chip name="BT1" pcbX={1.6} pcbY={6} footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [30, 20, 5] }, positionOffset: { x: 0, y: 0, z: 2.5 } }} />
    {/* battery solder pads: flat SMD pads outside the screen outline, nothing to collide with */}
    <chip name="BP1" pcbX={24} pcbY={18.8} pinLabels={{ pin1: "BATP", pin2: "GND" }}
      footprint={<footprint>
        <smtpad shape="rect" width="2mm" height="2.4mm" pcbX={-1.5} pcbY={0} portHints={["pin1"]} />
        <smtpad shape="rect" width="2mm" height="2.4mm" pcbX={1.5} pcbY={0} portHints={["pin2"]} />
        <silkscreentext text="BAT+" pcbX={-1.5} pcbY={-2} fontSize={0.7} />
        <silkscreentext text="GND" pcbX={1.5} pcbY={-2} fontSize={0.7} />
      </footprint>} />
    <trace from="BP1.BATP" to="net.BAT" />
    <trace from="BP1.GND" to="net.GND" />

    {/* FRONT, under the screen, row between header and LiPo: secure element */}
    <ATECC608B_SSHDA_T name="U2" pcbX={-10.4} pcbY={-9} />
    <resistor name="R1" resistance="4.7k" footprint="0603" pcbX={-4.9} pcbY={-7} />
    <resistor name="R2" resistance="4.7k" footprint="0603" pcbX={-4.9} pcbY={-11} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" pcbX={-0.9} pcbY={-9} pcbRotation={90} />
    <trace from="U2.VCC" to="net.V3_3" />
    <trace from="U2.GND" to="net.GND" />
    <trace from="U2.SDA" to="net.SDA" />
    <trace from="U2.SCL" to="net.SCL" />
    <trace from="R1.pin1" to="net.SDA" />
    <trace from="R1.pin2" to="net.V3_3" />
    <trace from="R2.pin1" to="net.SCL" />
    <trace from="R2.pin2" to="net.V3_3" />
    <trace from="C1.pin1" to="net.V3_3" />
    <trace from="C1.pin2" to="net.GND" />
    <trace from={pico(4)} to="net.SDA" />
    <trace from={pico(5)} to="net.SCL" />

    {/* same row: LiPo charger off the Pico's USB -> BAT; BAT -> switch -> diode -> VSYS */}
    <capacitor name="C2" capacitance="10uF" footprint="0603" pcbX={2.6} pcbY={-9} pcbRotation={90} />
    <TP4056 name="U3" pcbX={7.6} pcbY={-9} />
    <resistor name="R3" resistance="2k" footprint="0603" pcbX={12.1} pcbY={-9} pcbRotation={90} />
    <capacitor name="C3" capacitance="10uF" footprint="0603" pcbX={15.1} pcbY={-9} pcbRotation={90} />
    <SS14 name="D1" pcbX={19.6} pcbY={-9} pcbRotation={90} />
    <MSK12C02 name="SW6" pcbX={-18} pcbY={-18} pcbRotation={180} />  {/* knob faces the bottom edge */}
    <trace from="U3.VCC" to="net.VBUS" />
    <trace from="U3.CE" to="net.VBUS" />
    <trace from="U3.GND" to="net.GND" />
    <trace from="U3.EP" to="net.GND" />
    <trace from="U3.TEMP" to="net.GND" />
    <trace from="U3.PROG" to="R3.pin1" />
    <trace from="R3.pin2" to="net.GND" />
    <trace from="U3.BAT" to="net.BAT" />
    <trace from="C2.pin1" to="net.VBUS" />
    <trace from="C2.pin2" to="net.GND" />
    <trace from="C3.pin1" to="net.BAT" />
    <trace from="C3.pin2" to="net.GND" />
    <trace from="SW6.pin2" to="net.BAT" />
    <trace from="SW6.pin3" to="D1.anode" />
    <trace from="D1.cathode" to="net.VSYS" />

    <hole pcbX={-31} pcbY={18} diameter="2.7mm" />
    <hole pcbX={31} pcbY={18} diameter="2.7mm" />
    <hole pcbX={31} pcbY={-18} diameter="2.7mm" />
    <hole pcbX={-31} pcbY={-14} diameter="2.7mm" />
    <silkscreentext text="picowallet v0.3" pcbX={14} pcbY={-19} fontSize={1.2} />
  </board>
)
