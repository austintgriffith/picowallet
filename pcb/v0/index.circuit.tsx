import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"

// picowallet one-board v0. Front: screen, joystick, A/B/X/Y. Back: Pico 2 W (USB at the
// left edge), ATECC608B. Pins match firmware/lcd.py + firmware/atecc.py.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 19: "pin25",
  20: "pin26", 21: "pin27",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="70mm" height="40mm">
    {/* BACK: Pico 2 W module, castellated pads, USB pokes out the left edge */}
    <Raspberry_Pi_Pico_2W name="U1" layer="bottom" pcbX={-9} pcbY={0} pcbRotation={180} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />

    {/* FRONT: 1.3" ST7789 240x240 module on an 8-pin header, glass drawn as a box */}
    <chip name="DISP1" footprint="pinrow8_p2.54mm" pcbX={-2} pcbY={-16}
      pinLabels={{ pin1: "GND", pin2: "VCC", pin3: "SCL", pin4: "SDA", pin5: "RES", pin6: "DC", pin7: "CS", pin8: "BLK" }}
      cadModel={{ jscad: { type: "cuboid", size: [36, 36, 3.5] }, positionOffset: { x: 0, y: 16, z: 8 } }} />
    <trace from="DISP1.GND" to="net.GND" />
    <trace from="DISP1.VCC" to="net.V3_3" />
    <trace from="DISP1.SCL" to={pico(10)} />
    <trace from="DISP1.SDA" to={pico(11)} />
    <trace from="DISP1.RES" to={pico(12)} />
    <trace from="DISP1.DC" to={pico(8)} />
    <trace from="DISP1.CS" to={pico(9)} />
    <trace from="DISP1.BLK" to={pico(13)} />

    {/* BACK: secure element, right end, clear of the Pico */}
    <ATECC608B_SSHDA_T name="U2" layer="bottom" pcbX={26} pcbY={4} />
    <resistor name="R1" resistance="4.7k" footprint="0603" layer="bottom" pcbX={22} pcbY={-6} />
    <resistor name="R2" resistance="4.7k" footprint="0603" layer="bottom" pcbX={28} pcbY={-6} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" layer="bottom" pcbX={26} pcbY={11} />
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

    {/* FRONT: joystick left of the screen */}
    <SKRHABE010 name="SW5" pcbX={-27} pcbY={4} />
    <trace from="SW5.COM" to="net.GND" />
    <trace from="SW5.A" to={pico(2)} />
    <trace from="SW5.B" to={pico(18)} />
    <trace from="SW5.C" to={pico(16)} />
    <trace from="SW5.D" to={pico(20)} />
    <trace from="SW5.CEN" to={pico(3)} />

    {/* FRONT: A/B/X/Y diamond right of the screen */}
    {[
      { ref: "SW1", lbl: "A", gp: 15, x: 22, y: 8 },
      { ref: "SW2", lbl: "B", gp: 17, x: 30, y: 8 },
      { ref: "SW3", lbl: "X", gp: 19, x: 22, y: -7 },
      { ref: "SW4", lbl: "Y", gp: 21, x: 30, y: -7 },
    ].map(({ ref, lbl, gp, x, y }) => (
      <Fragment key={ref}>
        <KH_6X6X5H_STM name={ref} pcbX={x} pcbY={y} pcbRotation={90} />
        <silkscreentext text={lbl} pcbX={x} pcbY={y + 7} fontSize={1} />
        <trace from={`${ref}.pin1`} to={pico(gp)} />
        <trace from={`${ref}.pin2`} to="net.GND" />
      </Fragment>
    ))}

    <hole pcbX={-33} pcbY={17.5} diameter="2.7mm" />
    <hole pcbX={33} pcbY={17.5} diameter="2.7mm" />
    <hole pcbX={33} pcbY={-17.5} diameter="2.7mm" />
    <hole pcbX={-33} pcbY={-17.5} diameter="2.7mm" />
    <silkscreentext text="picowallet v0" pcbX={0} pcbY={-18.5} fontSize={1.3} />
  </board>
)
