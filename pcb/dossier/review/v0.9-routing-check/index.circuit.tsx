import { Fragment } from "react"
import { Raspberry_Pi_Pico_2W } from "./imports/Raspberry_Pi_Pico_2W"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { KH_6X6X5H_STM } from "./imports/KH_6X6X5H_STM"
import { SKRHABE010 } from "./imports/SKRHABE010"
import { TP4056 } from "./imports/TP4056"
import { MSK12C02 } from "./imports/MSK12C02"
import { SS14 } from "./imports/SS14"
import { B2B_PH_K_S_LF__SN_ } from "./imports/B2B_PH_K_S_LF__SN_"
import { AFC42_S12FMA_1H } from "./imports/AFC42_S12FMA_1H"
import { AO3400A, AO3401A } from "./imports/AOS_MOSFET"
import { SN74LVC245APWR } from "./imports/SN74LVC245APWR"
import { TLV75528PDBVR } from "./imports/TLV75528PDBVR"

// picowallet one-board v0.9, 82 x 54 mm. Bare 2" 320x240 ST7789 panel (LCSC C5329582, 51.8x36.2x2 mm)
// lies flat on the FRONT; its 12-pin ribbon folds under the panel into a 0.5 mm latch connector J3.
// FRONT: joystick | panel | A over B. Switch + PWR/CHG lights on the bottom edge, charger bottom-right.
// BACK: Pico 2 W (USB out the top edge), LiPo 402030 + its JST plug on the right.
// Pins match firmware/lcd.py + firmware/atecc.py.
const GP: Record<number, string> = {
  2: "pin4", 3: "pin5", 4: "pin6", 5: "pin7", 8: "pin11", 9: "pin12", 10: "pin14", 11: "pin15",
  12: "pin16", 13: "pin17", 15: "pin20", 16: "pin21", 17: "pin22", 18: "pin24", 20: "pin26",
}
const pico = (gp: number) => `U1.${GP[gp]}`

export default () => (
  <board width="82mm" height="54mm" thickness="1.6mm"
    outline={[{x:-41,y:-27},{x:-18,y:-27},{x:-18,y:-16.5},{x:-4,y:-16.5},
      {x:-4,y:-27},{x:41,y:-27},{x:41,y:27},{x:-41,y:27}]}
    fabricatorPreset="jlcpcb_standard_20260912"
    pcbStyle={{ viaPadDiameter: 0.6, viaHoleDiameter: 0.3 }}
    minTraceWidth={0.15} minTraceToPadEdgeClearance={0.1}
    minViaEdgeToPadEdgeClearance={0.15} minBoardEdgeClearance={0.3}
    autorouter={{ local: true, traceClearance: 0.15 }}>
    {/* Keep copper 0.3 mm away from the antenna cutout on both layers. */}
    <keepout shape="rect" pcbX={-11} pcbY={-21.75} width={14.6} height={11.1}
      layers={["top", "bottom"]} allowPlacements />
    {/* BACK: Pico 2 W */}
    <Raspberry_Pi_Pico_2W name="U1" allowOffBoard layer="bottom" pcbX={-11} pcbY={0} pcbRotation={90} />
    <trace from="U1.pin38" to="net.GND" />
    <trace from="U1.pin3" to="net.GND" />
    {[8,13,18,23,28,33].map(pin => <Fragment key={pin}><trace from={`U1.pin${pin}`} to="net.GND" /></Fragment>)}
    <trace from="U1.pin36" to="net.V3_3" />
    <trace from="U1.pin39" to="net.VSYS" />
    <trace from="U1.pin40" to="net.VBUS" />

    {/* FRONT: the panel itself. Drawn as a slab; the part number lets JLCPCB tell us if they'll supply it. */}
    <chip name="DISP1" doNotPlace pcbX={2} pcbY={3.5} supplierPartNumbers={{ jlcpcb: ["C5329582"] }}
      footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" pcbX={0} pcbY={0} portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [51.8, 36.2, 2.05] }, positionOffset: { x: 0, y: 0, z: 1.3 } }} />

    {/* FRONT, under the panel: 1 mm FPC latch (AFC42, double-sided contacts, front insertion), mouth toward the panel's left edge (-X).
        Ribbon center is panel-center Y minus 0.43 after clockwise rotation; nominal length 20.7 mm. Physical fit must be measured,
        folds 180° under the panel and runs +X into the latch. Pin 1 = +Y after the fold (datasheet front view, tail down: 1 on the left).
        Panel ribbon: 1 GND, 2 CS, 3 RS(DC), 4 SCL, 5 SDA, 6 RST, 7 NC, 8 IOVCC, 9 VCC, 10 LEDA, 11 LEDK, 12 GND */}
    <AFC42_S12FMA_1H name="J3" pcbX={-5} pcbY={3.07} pcbRotation={270} />
    <trace from="J3.pin1" to="net.GND" />
    {/* Buffer inputs tolerate Pico 3V3; outputs and panel share 2V8. */}
    <SN74LVC245APWR name="U4" layer="bottom" pcbX={7} pcbY={8} />
    <TLV75528PDBVR name="U5" layer="bottom" pcbX={9} pcbY={18} />
    <trace from="U5.IN" to="net.V3_3" />
    <trace from="U5.EN" to="net.V3_3" />
    <trace from="U5.GND" to="net.GND" />
    <trace from="U5.OUT" to="net.LCD_2V8" />
    <trace from="U4.pin20" to="net.LCD_2V8" />
    <trace from="U4.pin10" to="net.GND" />
    <trace from="U4.pin1" to="net.LCD_2V8" />
    {[19,7,8,9].map(pin => <Fragment key={pin}><trace from={`U4.pin${pin}`} to="net.GND" /></Fragment>)}
    {[
      {gp:9,input:2,output:18,panel:2,ref:"R11",x:1.7,y:13.7},
      {gp:8,input:3,output:17,panel:3,ref:"R12",x:4.9,y:13.7},
      {gp:10,input:4,output:16,panel:4,ref:"R13",x:8.1,y:13.7},
      {gp:11,input:5,output:15,panel:5,ref:"R14",x:11.3,y:13.7},
      {gp:12,input:6,output:14,panel:6,ref:"R15",x:14.5,y:13.7},
    ].map(c => <Fragment key={c.ref}>
      <resistor name={c.ref} resistance="33" footprint="0603" layer="bottom" pcbX={c.x} pcbY={c.y} />
      <trace from={pico(c.gp)} to={`U4.pin${c.input}`} />
      <trace from={`U4.pin${c.output}`} to={`${c.ref}.pin1`} />
      <trace from={`${c.ref}.pin2`} to={`J3.pin${c.panel}`} />
    </Fragment>)}
    {/* Known input states during boot: CS high, RESET/clock/data/DC low. */}
    {[
      {ref:"R16",gp:9,rail:"V3_3",x:7,y:-3},
      {ref:"R17",gp:12,rail:"GND",x:10,y:-3},
      {ref:"R18",gp:10,rail:"GND",x:7,y:-6},
      {ref:"R19",gp:11,rail:"GND",x:10,y:-6},
      {ref:"R20",gp:8,rail:"GND",x:13,y:-6},
    ].map(c => <Fragment key={c.ref}>
      <resistor name={c.ref} resistance="10k" footprint="0603" layer="bottom" pcbX={c.x} pcbY={c.y} />
      <trace from={`${c.ref}.pin1`} to={pico(c.gp)} />
      <trace from={`${c.ref}.pin2`} to={`net.${c.rail}`} />
    </Fragment>)}
    <capacitor name="C5" capacitance="100nF" footprint="0603" layer="bottom" pcbX={13.8} pcbY={10.8} />
    <trace from="C5.pin1" to="net.LCD_2V8" /><trace from="C5.pin2" to="net.GND" />
    <capacitor name="C6" capacitance="2.2uF" footprint="0805" layer="bottom" pcbX={4.5} pcbY={18} />
    <trace from="C6.pin1" to="net.V3_3" /><trace from="C6.pin2" to="net.GND" />
    <capacitor name="C7" capacitance="2.2uF" footprint="0805" layer="bottom" pcbX={13} pcbY={18} />
    <trace from="C7.pin1" to="net.LCD_2V8" /><trace from="C7.pin2" to="net.GND" />
    <trace from="J3.pin8" to="net.LCD_2V8" />
    <trace from="J3.pin9" to="net.LCD_2V8" />
    <trace from="J3.pin10" to="R6.pin2" />
    <trace from="J3.pin11" to="Q1.D" />
    <trace from="J3.pin12" to="net.GND" />
    <capacitor name="C4" capacitance="100nF" footprint="0603" pcbX={-10} pcbY={-4} />
    <trace from="C4.pin1" to="net.LCD_2V8" />
    <trace from="C4.pin2" to="net.GND" />

    {/* backlight: 4 white LEDs in parallel, 3 V @ 80 mA. VSYS -> 39R -> LEDA; LEDK -> AO3400A -> GND, gate = GP13 (PWM) */}
    <resistor name="R6" resistance="39" supplierPartNumbers={{ jlcpcb: ["C25379"] }} footprint="1206" pcbX={4} pcbY={-20.5} />
    <trace from="R6.pin1" to="net.VSYS" />
    <AO3400A name="Q1" pcbX={10} pcbY={-20.3} />
    <trace from="Q1.S" to="net.GND" />
    <trace from="Q1.G" to={pico(13)} />
    <resistor name="R7" resistance="10k" footprint="0603" pcbX={9} pcbY={-16.5} />
    <trace from="R7.pin1" to="Q1.G" />
    <trace from="R7.pin2" to="net.GND" />

    {/* FRONT: joystick left (ALPS SKRH, directions on the diagonals -> 45°), A over B right */}
    <SKRHABE010 name="SW5" pcbX={-33} pcbY={0} pcbRotation={45} />
    <trace from="SW5.COM" to="net.GND" />
    <trace from="SW5.A" to={pico(2)} />
    <trace from="SW5.D" to={pico(18)} />
    <trace from="SW5.C" to={pico(16)} />
    <trace from="SW5.B" to={pico(20)} />
    <trace from="SW5.CEN" to={pico(3)} />
    {[
      { ref: "SW1", lbl: "A", gp: 15, y: 10.5 },
      { ref: "SW2", lbl: "B", gp: 17, y: -3.5 },
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
    <chip name="BT1" doNotPlace layer="bottom" pcbX={28} pcbY={2} footprint={<footprint><smtpad shape="rect" width="0.6mm" height="0.6mm" portHints={["pin1"]} /></footprint>}
      cadModel={{ jscad: { type: "cuboid", size: [20, 30, 4] }, positionOffset: { x: 0, y: 0, z: 2 } }} />
    <B2B_PH_K_S_LF__SN_ name="J2" layer="bottom" pcbX={28} pcbY={20} />
    <trace from="J2.pin1" to="net.BAT" />
    <trace from="J2.pin2" to="net.GND" />

    {/* FRONT, bottom-right: LiPo charger off the Pico's USB -> BAT; BAT -> P-MOSFET -> diode -> VSYS. Switch carries gate current only. */}
    <capacitor name="C2" capacitance="10uF" footprint="0603" pcbX={24} pcbY={-16} />
    <TP4056 name="U3" pcbX={30} pcbY={-17.5} />
    <resistor name="R3" resistance="12k" supplierPartNumbers={{ jlcpcb: ["C22790"] }} footprint="0603" pcbX={35.5} pcbY={-17.5} pcbRotation={90} />
    <capacitor name="C3" capacitance="10uF" footprint="0603" pcbX={24} pcbY={-20.5} />
    <SS14 name="D1" pcbX={18} pcbY={-20.5} />
    <MSK12C02 name="SW6" pcbX={-30} pcbY={-22.8} pcbRotation={0} />  {/* pins inboard, knob hangs past the bottom edge */}
    <trace from="U3.VCC" to="net.VBUS" />
    {/* Charging is disabled until the cell is qualified and SJ1 is solder-bridged. */}
    <chip name="SJ1" doNotPlace pcbX={39} pcbY={-10}
      footprint={<footprint>
        <smtpad shape="rect" width={0.8} height={1} pcbX={-0.65} portHints={["pin1"]} />
        <smtpad shape="rect" width={0.8} height={1} pcbX={0.65} portHints={["pin2"]} />
      </footprint>} />
    <resistor name="R10" resistance="100k" footprint="0603" pcbX={37.5} pcbY={-14} />
    <trace from="SJ1.pin1" to="net.VBUS" />
    <trace from="SJ1.pin2" to="U3.CE" />
    <trace from="R10.pin1" to="U3.CE" />
    <trace from="R10.pin2" to="net.GND" />
    <silkscreentext text="CHG EN" pcbX={37.5} pcbY={-12} fontSize={0.8} />
    <trace from="U3.GND" to="net.GND" />
    <trace from="U3.EP" to="net.GND" />
    {(["top", "bottom"] as const).map(layer => <copperpour layer={layer}
      connectsTo="net.GND" clearance={0.25} useThermalReliefs={false}
      outline={[{x:26,y:-21.4},{x:34,y:-21.4},{x:34,y:-13.4},{x:26,y:-13.4}]} />)}
    {[27.7,32.3].map(x => <via pcbX={x} pcbY={-17.5} holeDiameter={0.3}
      outerDiameter={0.6} fromLayer="top" toLayer="bottom" connectsTo="net.GND" tented />)}
    <trace from="U3.TEMP" to="net.GND" />
    <trace from="U3.PROG" to="R3.pin1" />
    <trace from="R3.pin2" to="net.GND" />
    <trace from="U3.BAT" to="net.BAT" />
    <trace from="C2.pin1" to="net.VBUS" />
    <trace from="C2.pin2" to="net.GND" />
    <trace from="C3.pin1" to="net.BAT" />
    <trace from="C3.pin2" to="net.GND" />
    <AO3401A name="Q2" pcbX={18} pcbY={-16} />
    <resistor name="R8" resistance="100k" footprint="0603" pcbX={13} pcbY={-16} />
    <resistor name="R9" resistance="10k" footprint="0603" pcbX={-23} pcbY={-16} />
    <trace from="Q2.S" to="net.BAT" />
    <trace from="Q2.D" to="D1.anode" />
    <trace from="R8.pin1" to="Q2.S" />
    <trace from="R8.pin2" to="Q2.G" />
    <trace from="SW6.pin2" to="R9.pin1" />
    <trace from="R9.pin2" to="Q2.G" />
    <trace from="SW6.pin1" to="net.BAT" />
    <trace from="SW6.pin3" to="net.GND" />
    <trace from="D1.cathode" to="net.VSYS" />

    {/* lights by the switch: green PWR on 3V3, red CHG driven by the charger's CHRG pin */}
    <led name="LED1" color="green" footprint="0603" pinLabels={{ pin1: "cathode", pin2: "anode" }} supplierPartNumbers={{ jlcpcb: ["C12624"] }} pcbX={-36} pcbY={-16.5} pcbRotation={180} />
    <resistor name="R4" resistance="1k" footprint="0603" pcbX={-31} pcbY={-16.5} />
    <trace from="R4.pin1" to="net.V3_3" />
    <trace from="R4.pin2" to="LED1.anode" />
    <trace from="LED1.cathode" to="net.GND" />
    <silkscreentext text="PWR" pcbX={-36} pcbY={-18} fontSize={0.8} />
    <led name="LED2" color="red" footprint="0603" supplierPartNumbers={{ jlcpcb: ["C2286"] }} pcbX={-36} pcbY={-13} pcbRotation={180} />
    <resistor name="R5" resistance="1k" footprint="0603" pcbX={-31} pcbY={-13} />
    <trace from="R5.pin1" to="net.VBUS" />
    <trace from="R5.pin2" to="LED2.anode" />
    <trace from="LED2.cathode" to="U3.N_CHRG" />
    <silkscreentext text="CHG" pcbX={-36} pcbY={-14.5} fontSize={0.8} />

    {/* Expanded NPTH routing exclusions: radius 0.45 + 0.20 mm clearance. */}
    {[-31.5, -28.5].map(x => <keepout shape="circle" pcbX={x} pcbY={-25.0502}
      radius={0.65} layers={["top", "bottom"]} allowPlacements />)}
    <hole pcbX={-38.5} pcbY={24.5} diameter="2.7mm" />
    <hole pcbX={38.5} pcbY={24.5} diameter="2.7mm" />
    <hole pcbX={38.5} pcbY={-24.5} diameter="2.7mm" />
    <hole pcbX={-38.5} pcbY={-24.5} diameter="2.7mm" />
    <silkscreentext text="picowallet v0.9" pcbX={-30} pcbY={-9} fontSize={0.9} />
  </board>
)
