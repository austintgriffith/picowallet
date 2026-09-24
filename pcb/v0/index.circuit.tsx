import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"
import { TP4056 } from "./imports/TP4056"
import { MSK12C02 } from "./imports/MSK12C02"
import { SS14 } from "./imports/SS14"
import { B2B_PH_K_S_LF__SN_ } from "./imports/B2B_PH_K_S_LF__SN_"

// picowallet one-board v0.5, 68 x 44 mm. Zero soldering: every part but the LiPo and the screen module is an LCSC part.
// Screen = the common 7-pin 1.3" ST7789 240x240 module (27.8 x 39.2 mm, GND VCC SCL SDA RES DC BLK, no CS:
// those modules tie CS low internally; the firmware still toggles GP9, into nothing). An 8-pin module also fits, its BLK pin hangs off the end.
// FRONT: joystick | screen module on an 8.5 mm female header | A over B.
//        Under the screen (8 mm pocket): LiPo 502030 lying flat, ATECC608B, TP4056 charger,
//        diode. JST battery plug top right. Every part except the LiPo and the screen module is an LCSC part. Power slide switch pokes out the bottom edge.
// BACK:  Pico 2 W only, castellated, USB out the left edge.
// Pins match firmware/lcd.py + firmware/atecc.py.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 20: "pin26",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="68mm" height="44mm">
    {/* BACK: Pico 2 W */}
    <Raspberry_Pi_Pico_2W name="U1" layer="bottom" pcbX={-8} pcbY={3} pcbRotation={180} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />
    <trace from="U1.pin39" to="net.VSYS" />
    <trace from="U1.pin40" to="net.VBUS" />

    {/* FRONT: screen. 7-pin 8.5 mm female header (LCSC C124418, JLCPCB solders it). Module drawn as a 27.8x39.2 box. */}
    <pinheader name="J1" pinCount={7} pitch="2.54mm" gender="female" pcbX={1.6} pcbY={-17.5}
      supplierPartNumbers={{ jlcpcb: ["C124418"] }}
      pinLabels={["GND", "VCC", "SCL", "SDA", "RES", "DC", "BLK"]}
      cadModel={{ jscad: { type: "union", shapes: [
        { type: "cuboid", size: [17.8, 2.5, 8.5], center: [0, 0, 4.25] },
        { type: "cuboid", size: [27.8, 39.2, 3.5], center: [0, 17.6, 10.25] } ] } }} />
    <trace from="J1.GND" to="net.GND" />
    <trace from="J1.VCC" to="net.V3_3" />
    <trace from="J1.SCL" to={pico(10)} />
    <trace from="J1.SDA" to={pico(11)} />
    <trace from="J1.RES" to={pico(12)} />
    <trace from="J1.DC" to={pico(8)} />
    <trace from="J1.BLK" to={pico(13)} />

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

    {/* FRONT, under the screen: LiPo 402030 (20x30x4 mm, ~200 mAh) standing tall. Drawn only, no part number. */}
    <chip name="BT1" pcbX={1.6} pcbY={1} footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [20, 30, 4] }, positionOffset: { x: 0, y: 0, z: 2 } }} />
    {/* battery plug: JST-PH 2-pin, top entry (LCSC C131337, JLCPCB solders it). LiPo with a PH plug clicks in. */}
    <B2B_PH_K_S_LF__SN_ name="J2" pcbX={21} pcbY={18.5} />
    <trace from="J2.pin1" to="net.BAT" />
    <trace from="J2.pin2" to="net.GND" />

    {/* FRONT, top-left above the joystick: secure element */}
    <ATECC608B_SSHDA_T name="U2" pcbX={-24} pcbY={15} />
    <resistor name="R1" resistance="4.7k" footprint="0603" pcbX={-16.5} pcbY={17} />
    <resistor name="R2" resistance="4.7k" footprint="0603" pcbX={-16.5} pcbY={13} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" pcbX={-16.5} pcbY={20} pcbRotation={0} />
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

    {/* FRONT, bottom-right: LiPo charger off the Pico's USB -> BAT; BAT -> switch -> diode -> VSYS */}
    <capacitor name="C2" capacitance="10uF" footprint="0603" pcbX={19.5} pcbY={-16.5} pcbRotation={90} />
    <TP4056 name="U3" pcbX={25} pcbY={-16.5} />
    <resistor name="R3" resistance="5.1k" supplierPartNumbers={{ jlcpcb: ["C23186"] }} footprint="0603" pcbX={30.5} pcbY={-16.5} pcbRotation={90} />
    <capacitor name="C3" capacitance="10uF" footprint="0603" pcbX={19} pcbY={-20.5} pcbRotation={90} />
    <SS14 name="D1" pcbX={13.5} pcbY={-20.5} />
    <MSK12C02 name="SW6" pcbX={-18} pcbY={-18} pcbRotation={0} />  {/* pins inboard, knob side at the edge: knob hangs past the board */}
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

    {/* two lights by the power switch. PWR: on whenever the Pico has 3V3 (switch on, or USB in).
        CHG: the TP4056 pulls its CHRG pin low while charging, so this lights from VBUS with no GPIO. */}
    <led name="LED1" color="green" footprint="0603" pinLabels={{ pin1: "cathode", pin2: "anode" }} supplierPartNumbers={{ jlcpcb: ["C12624"] }} pcbX={-27} pcbY={-20} pcbRotation={180} />
    <resistor name="R4" resistance="1k" footprint="0603" pcbX={-27} pcbY={-17} />
    <trace from="R4.pin1" to="net.V3_3" />
    <trace from="R4.pin2" to="LED1.anode" />
    <trace from="LED1.cathode" to="net.GND" />
    <silkscreentext text="PWR" pcbX={-27} pcbY={-22.5} fontSize={0.8} />
    <led name="LED2" color="red" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C2286"] }} pcbX={-12} pcbY={-20} pcbRotation={180} />
    <resistor name="R5" resistance="1k" footprint="0603" pcbX={-12} pcbY={-17} />
    <trace from="R5.pin1" to="net.VBUS" />
    <trace from="R5.pin2" to="LED2.anode" />
    <trace from="LED2.cathode" to="U3.N_CHRG" />
    <silkscreentext text="CHG" pcbX={-12} pcbY={-22.5} fontSize={0.8} />

    <hole pcbX={-31} pcbY={20} diameter="2.7mm" />
    <hole pcbX={31} pcbY={20} diameter="2.7mm" />
    <hole pcbX={31} pcbY={-20} diameter="2.7mm" />
    <hole pcbX={-31} pcbY={-13} diameter="2.7mm" />
    <silkscreentext text="picowallet v0.5" pcbX={4} pcbY={-21} fontSize={1.2} />
  </board>
)
