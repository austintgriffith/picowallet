import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"

// picowallet one-board v0. Pins match firmware/lcd.py + firmware/atecc.py.
// Pico pin numbers: GPn -> see imports/Raspberry_Pi_Pico_2W.tsx (pin1=GP0 ... pin40=VBUS).
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 19: "pin25",
  20: "pin26", 21: "pin27",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="100mm" height="36mm">
    {/* Pico 2 W module, soldered flat. Header row pads face up/down. */}
    <Raspberry_Pi_Pico_2W name="U1" pcbX={-6} pcbY={0} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    <trace from="U1.pin36" to="net.V3_3" />

    {/* 1.3" ST7789 module plugs in here, sits above the Pico */}
    <pinheader name="J1" pinCount={8} pitch="2.54mm" pcbX={-6} pcbY={-15}
      pinLabels={["GND", "VCC", "SCL", "SDA", "RES", "DC", "CS", "BLK"]} />
    <trace from="J1.pin1" to="net.GND" />
    <trace from="J1.pin2" to="net.V3_3" />
    <trace from="J1.pin3" to={pico(10)} />
    <trace from="J1.pin4" to={pico(11)} />
    <trace from="J1.pin5" to={pico(12)} />
    <trace from="J1.pin6" to={pico(8)} />
    <trace from="J1.pin7" to={pico(9)} />
    <trace from="J1.pin8" to={pico(13)} />

    {/* secure element */}
    <ATECC608B_SSHDA_T name="U2" pcbX={-42} pcbY={9} pcbRotation={90} />
    <resistor name="R1" resistance="4.7k" footprint="0603" pcbX={-36} pcbY={12} pcbRotation={90} />
    <resistor name="R2" resistance="4.7k" footprint="0603" pcbX={-36} pcbY={6} pcbRotation={90} />
    <capacitor name="C1" capacitance="100nF" footprint="0603" pcbX={-46.5} pcbY={2} pcbRotation={90} />
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

    {/* joystick: up GP2, down GP18, left GP16, right GP20, press GP3 (A/B/C/D mapping to confirm on datasheet) */}
    <SKRHABE010 name="SW5" pcbX={-41} pcbY={-7} />
    <trace from="SW5.COM" to="net.GND" />
    <trace from="SW5.A" to={pico(2)} />
    <trace from="SW5.B" to={pico(18)} />
    <trace from="SW5.C" to={pico(16)} />
    <trace from="SW5.D" to={pico(20)} />
    <trace from="SW5.CEN" to={pico(3)} />

    {/* A/B/X/Y diamond on the right */}
    {[
      { ref: "SW1", lbl: "A", gp: 15, x: 28, y: 0 },
      { ref: "SW2", lbl: "B", gp: 17, x: 36, y: -8 },
      { ref: "SW3", lbl: "X", gp: 19, x: 36, y: 8 },
      { ref: "SW4", lbl: "Y", gp: 21, x: 44, y: 0 },
    ].map(({ ref, lbl, gp, x, y }) => (
      <Fragment key={ref}>
        <KH_6X6X5H_STM name={ref} pcbX={x} pcbY={y} />
        <silkscreentext text={lbl} pcbX={x} pcbY={y + 4.2} fontSize={1.2} />
        <trace from={`${ref}.pin1`} to={pico(gp)} />
        <trace from={`${ref}.pin2`} to="net.GND" />
      </Fragment>
    ))}

    <hole pcbX={-47} pcbY={-15} diameter="2.7mm" />
    <hole pcbX={-47} pcbY={15} diameter="2.7mm" />
    <hole pcbX={47} pcbY={15} diameter="2.7mm" />
    <hole pcbX={47} pcbY={-15} diameter="2.7mm" />
    <silkscreentext text="picowallet v0" pcbX={22} pcbY={-15} fontSize={1.5} />
  </board>
)
