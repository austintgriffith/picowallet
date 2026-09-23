import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"
import { TP4056 } from "./imports/TP4056"
import { B2B_PH_K_S_LF__SN_ } from "./imports/B2B_PH_K_S_LF__SN_"
import { MSK12C02 } from "./imports/MSK12C02"
import { SS14 } from "./imports/SS14"

// picowallet one-board v0.2. Front: screen, joystick, A/B. Back: Pico 2 W (USB out the
// left edge), ATECC608B, LiPo charger strip along the bottom. Pins match firmware/.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 20: "pin26",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="64mm" height="46mm">
    {/* BACK: Pico 2 W, castellated, USB pokes out the left edge */}
    <Raspberry_Pi_Pico_2W name="U1" layer="bottom" pcbX={-6} pcbY={3} pcbRotation={180} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />
    <trace from="U1.pin39" to="net.VSYS" />
    <trace from="U1.pin40" to="net.VBUS" />

    {/* FRONT: 1.3" ST7789 240x240 module on an 8-pin header (box = the module) */}
    <chip name="DISP1" footprint="pinrow8_p2.54mm" pcbX={-3} pcbY={-14}
      pinLabels={{ pin1: "GND", pin2: "VCC", pin3: "SCL", pin4: "SDA", pin5: "RES", pin6: "DC", pin7: "CS", pin8: "BLK" }}
      cadModel={{ jscad: { type: "union", shapes: [
        { type: "cuboid", size: [20.3, 2.5, 8.5], center: [0, 0, 4.25] },
        { type: "cuboid", size: [36, 36, 3.5], center: [0, 16, 10] } ] } }} />
    <trace from="DISP1.GND" to="net.GND" />
    <trace from="DISP1.VCC" to="net.V3_3" />
    <trace from="DISP1.SCL" to={pico(10)} />
    <trace from="DISP1.SDA" to={pico(11)} />
    <trace from="DISP1.RES" to={pico(12)} />
    <trace from="DISP1.DC" to={pico(8)} />
    <trace from="DISP1.CS" to={pico(9)} />
    <trace from="DISP1.BLK" to={pico(13)} />

    {/* FRONT: joystick left, A over B right */}
    <SKRHABE010 name="SW5" pcbX={-26} pcbY={2} pcbRotation={45} />  {/* ALPS SKRH: directions are on the diagonals, 45° makes them straight */}
    <trace from="SW5.COM" to="net.GND" />
    <trace from="SW5.A" to={pico(2)} />
    <trace from="SW5.B" to={pico(18)} />
    <trace from="SW5.C" to={pico(16)} />
    <trace from="SW5.D" to={pico(20)} />
    <trace from="SW5.CEN" to={pico(3)} />
    {[
      { ref: "SW1", lbl: "A", gp: 15, y: 9 },
      { ref: "SW2", lbl: "B", gp: 17, y: -5 },
    ].map(({ ref, lbl, gp, y }) => (
      <Fragment key={ref}>
        <KH_6X6X5H_STM name={ref} pcbX={25} pcbY={y} pcbRotation={90} />
        <silkscreentext text={lbl} pcbX={25} pcbY={y + 7} fontSize={1} />
        <trace from={`${ref}.pin1`} to={pico(gp)} />
        <trace from={`${ref}.pin2`} to="net.GND" />
      </Fragment>
    ))}

    {/* BACK, bottom strip, left: secure element on I2C0 */}
    <ATECC608B_SSHDA_T name="U2" layer="bottom" pcbX={-24} pcbY={-18.5} />
    <resistor name="R1" resistance="4.7k" footprint="0603" layer="bottom" pcbX={-17} pcbY={-16.5} />
    <resistor name="R2" resistance="4.7k" footprint="0603" layer="bottom" pcbX={-17} pcbY={-20.5} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" layer="bottom" pcbX={-12.5} pcbY={-18.5} pcbRotation={90} />
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

    {/* BACK, bottom strip, right: LiPo charger (from Pico USB) -> battery -> switch -> diode -> VSYS */}
    <capacitor name="C2" capacitance="10uF" footprint="0603" layer="bottom" pcbX={-7} pcbY={-18.5} pcbRotation={90} />
    <TP4056 name="U3" layer="bottom" pcbX={-1} pcbY={-19} />
    <resistor name="R3" resistance="2k" footprint="0603" layer="bottom" pcbX={5} pcbY={-18.5} pcbRotation={90} />
    <capacitor name="C3" capacitance="10uF" footprint="0603" layer="bottom" pcbX={9} pcbY={-18.5} pcbRotation={90} />
    <SS14 name="D1" layer="bottom" pcbX={15} pcbY={-18.5} />
    <MSK12C02 name="SW6" layer="bottom" pcbX={25} pcbY={-14} />
    <B2B_PH_K_S_LF__SN_ name="J2" layer="bottom" pcbX={25} pcbY={-20} />
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
    <trace from="J2.pin1" to="net.BAT" />
    <trace from="J2.pin2" to="net.GND" />
    <trace from="SW6.pin2" to="net.BAT" />
    <trace from="SW6.pin3" to="D1.anode" />
    <trace from="D1.cathode" to="net.VSYS" />

    {/* LiPo 502030 (30x20x5 mm, ~250 mAh) stuck on the back of the Pico. Drawn only, not a JLCPCB part. */}
    <chip name="BT1" doNotPlace layer="bottom" pcbX={-6} pcbY={3} footprint={<footprint></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [30, 20, 5] }, positionOffset: { x: 0, y: 0, z: 7.5 } }} />

    <hole pcbX={-29} pcbY={20.5} diameter="2.7mm" />
    <hole pcbX={29} pcbY={20.5} diameter="2.7mm" />
    <hole pcbX={-29} pcbY={-13} diameter="2.7mm" />
    <silkscreentext text="picowallet v0.2" pcbX={12} pcbY={-20} fontSize={1.2} />
  </board>
)
