import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"
import { TP4056 } from "./imports/TP4056"
import { MSK12C02 } from "./imports/MSK12C02"
import { SS14 } from "./imports/SS14"
import { B2B_PH_K_S_LF__SN_ } from "./imports/B2B_PH_K_S_LF__SN_"
import { FPC_05FB_12PH20 } from "./imports/FPC_05FB_12PH20"
import { A_2N7002K } from "./imports/A_2N7002K"

// picowallet one-board v0.7, 82 x 44 mm. Bare 2" 320x240 ST7789 panel (LCSC C5329582, 51.8x36.2x2 mm)
// lies flat on the FRONT; its 12-pin ribbon folds under the panel into a 0.5 mm latch connector J3.
// FRONT: joystick | panel | A over B. Switch + PWR/CHG lights on the bottom edge, charger bottom-right.
// BACK: Pico 2 W (USB out the left edge), LiPo 402030 + its JST plug on the right.
// Pins match firmware/lcd.py + firmware/atecc.py.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 20: "pin26",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="82mm" height="44mm">
    {/* BACK: Pico 2 W */}
    <Raspberry_Pi_Pico_2W name="U1" layer="bottom" pcbX={-8} pcbY={0} pcbRotation={180} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />
    <trace from="U1.pin39" to="net.VSYS" />
    <trace from="U1.pin40" to="net.VBUS" />

    {/* FRONT: the panel itself. Drawn as a slab; the part number lets JLCPCB tell us if they'll supply it. */}
    <chip name="DISP1" pcbX={2} pcbY={0} supplierPartNumbers={{ jlcpcb: ["C5329582"] }}
      footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" pcbX={0} pcbY={17} portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [51.8, 36.2, 2.05] }, positionOffset: { x: 0, y: 0, z: 2.3 } }} />

    {/* FRONT, under the panel's left edge: FPC latch, double-sided contacts, mouth toward the panel edge (-X).
        Panel ribbon: 1 GND, 2 CS, 3 RS(DC), 4 SCL, 5 SDA, 6 RST, 7 NC, 8 IOVCC, 9 VCC, 10 LEDA, 11 LEDK, 12 GND */}
    <FPC_05FB_12PH20 name="J3" pcbX={-14} pcbY={2.8} pcbRotation={270} />
    <trace from="J3.pin1" to="net.GND" />
    <trace from="J3.pin2" to={pico(9)} />
    <trace from="J3.pin3" to={pico(8)} />
    <trace from="J3.pin4" to={pico(10)} />
    <trace from="J3.pin5" to={pico(11)} />
    <trace from="J3.pin6" to={pico(12)} />
    <trace from="J3.pin8" to="net.V3_3" />
    <trace from="J3.pin9" to="net.V3_3" />
    <trace from="J3.pin10" to="R6.pin2" />
    <trace from="J3.pin11" to="Q1.D" />
    <trace from="J3.pin12" to="net.GND" />
    <capacitor name="C4" capacitance="100nF" footprint="0603" pcbX={-14} pcbY={-6} />
    <trace from="C4.pin1" to="net.V3_3" />
    <trace from="C4.pin2" to="net.GND" />

    {/* backlight: 4 white LEDs in parallel, 3 V @ 80 mA. VSYS -> 22R -> LEDA; LEDK -> 2N7002 -> GND, gate = GP13 (PWM) */}
    <resistor name="R6" resistance="22" footprint="1206" pcbX={4} pcbY={-20.5} />
    <trace from="R6.pin1" to="net.VSYS" />
    <A_2N7002K name="Q1" pcbX={10} pcbY={-20.3} />
    <trace from="Q1.S" to="net.GND" />
    <trace from="Q1.G" to={pico(13)} />
    <resistor name="R7" resistance="10k" footprint="0603" pcbX={9} pcbY={-16.5} />
    <trace from="R7.pin1" to="Q1.G" />
    <trace from="R7.pin2" to="net.GND" />

    {/* FRONT: joystick left (ALPS SKRH, directions on the diagonals -> 45°), A over B right */}
    <SKRHABE010 name="SW5" pcbX={-33} pcbY={0} pcbRotation={45} />
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
        <KH_6X6X5H_STM name={ref} pcbX={34} pcbY={y} pcbRotation={90} />
        <silkscreentext text={lbl} pcbX={34} pcbY={y + 7} fontSize={1} />
        <trace from={`${ref}.pin1`} to={pico(gp)} />
        <trace from={`${ref}.pin2`} to="net.GND" />
      </Fragment>
    ))}

    {/* FRONT, top-left above the joystick: secure element on I2C0 */}
    <ATECC608B_SSHDA_T name="U2" pcbX={-33} pcbY={15} />
    <resistor name="R1" resistance="4.7k" footprint="0603" pcbX={-27} pcbY={19} />
    <resistor name="R2" resistance="4.7k" footprint="0603" pcbX={-27} pcbY={11} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" pcbX={-27} pcbY={15} />
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

    {/* BACK, right: LiPo 402030 (20x30x4, drawn only) + its JST-PH plug */}
    <chip name="BT1" layer="bottom" pcbX={28} pcbY={2} footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [20, 30, 4] }, positionOffset: { x: 0, y: 0, z: 2 } }} />
    <B2B_PH_K_S_LF__SN_ name="J2" layer="bottom" pcbX={28} pcbY={20} />
    <trace from="J2.pin1" to="net.BAT" />
    <trace from="J2.pin2" to="net.GND" />

    {/* FRONT, bottom-right: LiPo charger off the Pico's USB -> BAT; BAT -> switch -> diode -> VSYS */}
    <capacitor name="C2" capacitance="10uF" footprint="0603" pcbX={24} pcbY={-16} />
    <TP4056 name="U3" pcbX={30} pcbY={-17.5} />
    <resistor name="R3" resistance="5.1k" supplierPartNumbers={{ jlcpcb: ["C23186"] }} footprint="0603" pcbX={35.5} pcbY={-17.5} pcbRotation={90} />
    <capacitor name="C3" capacitance="10uF" footprint="0603" pcbX={24} pcbY={-20.5} />
    <SS14 name="D1" pcbX={18} pcbY={-20.5} />
    <MSK12C02 name="SW6" pcbX={-30} pcbY={-18} pcbRotation={0} />  {/* pins inboard, knob hangs past the bottom edge */}
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

    {/* lights by the switch: green PWR on 3V3, red CHG driven by the charger's CHRG pin */}
    <led name="LED1" color="green" footprint="0603" pinLabels={{ pin1: "cathode", pin2: "anode" }} supplierPartNumbers={{ jlcpcb: ["C12624"] }} pcbX={-20} pcbY={-20} pcbRotation={180} />
    <resistor name="R4" resistance="1k" footprint="0603" pcbX={-16} pcbY={-20} />
    <trace from="R4.pin1" to="net.V3_3" />
    <trace from="R4.pin2" to="LED1.anode" />
    <trace from="LED1.cathode" to="net.GND" />
    <silkscreentext text="PWR" pcbX={-20} pcbY={-21.6} fontSize={0.7} />
    <led name="LED2" color="red" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C2286"] }} pcbX={-8} pcbY={-20} pcbRotation={180} />
    <resistor name="R5" resistance="1k" footprint="0603" pcbX={-4} pcbY={-20} />
    <trace from="R5.pin1" to="net.VBUS" />
    <trace from="R5.pin2" to="LED2.anode" />
    <trace from="LED2.cathode" to="U3.N_CHRG" />
    <silkscreentext text="CHG" pcbX={-8} pcbY={-21.6} fontSize={0.7} />

    <hole pcbX={-38.5} pcbY={19.5} diameter="2.7mm" />
    <hole pcbX={38.5} pcbY={19.5} diameter="2.7mm" />
    <hole pcbX={38.5} pcbY={-19.5} diameter="2.7mm" />
    <hole pcbX={-38.5} pcbY={-19.5} diameter="2.7mm" />
    <silkscreentext text="picowallet v0.7" pcbX={-30} pcbY={-9} fontSize={0.9} />
  </board>
)
