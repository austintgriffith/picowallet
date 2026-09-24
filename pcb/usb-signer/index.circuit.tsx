import { MCP2221A_I_ST } from "./imports/MCP2221A_I_ST"
import { ATECC608B_SSHDA_T } from "./imports/ATECC608B_SSHDA_T"
import { TYPE_C_24P_GTJB_040 } from "./imports/TYPE_C_24P_GTJB_040"

// usb-signer v0.1: ATECC608B on a USB-C stick. Host <-USB-> MCP2221A <-I2C-> ATECC608B.
// Board 40 x 14 x 0.8 mm: the left 13 mm IS the plug tongue, the shell clamps over it (0.8 mm board required). Everything runs on the 5 V from USB.
export default () => (
  <board width="40mm" height="14mm" thickness="0.8mm">
    {/* USB-C male plug, clamps the LEFT edge. This 24-pin plug has both rows; the receptacle shorts
        A and B for VBUS, GND, D+, D- and reads CC on either, so wiring the BOTTOM row alone works in
        both orientations. The top row is left open (the 0.5 mm pitch top pads would not autoroute). */}
    <TYPE_C_24P_GTJB_040 name="J1" pcbX={-18.95} pcbY={0} pcbRotation={270} />
    <trace from="J1.VBUS1" to="net.VBUS" />
    <trace from="J1.VBUS2" to="net.VBUS" />
    <trace from="J1.GND1" to="net.GND" />
    <trace from="J1.GND2" to="net.GND" />
    <trace from="J1.GND3" to="net.GND" />
    <trace from="J1.GND6" to="net.GND" />
    <trace from="J1.DP2" to="net.DP" />
    <trace from="J1.DN2" to="net.DN" />
    {/* 5.1k on CC tells the host we're a device that wants 5 V */}
    <resistor name="R1" resistance="5.1k" footprint="0603" pcbX={-9} pcbY={5.8} pcbRotation={0} />
    <trace from="J1.CC2" to="R1.pin1" />
    <trace from="R1.pin2" to="net.GND" />

    {/* USB to I2C bridge */}
    <MCP2221A_I_ST name="U1" pcbX={1} pcbY={0} pcbRotation={90} />
    <trace from="U1.VDD" to="net.VBUS" />
    <trace from="U1.VSS" to="net.GND" />
    <trace from="U1.D_POS" to="net.DP" />
    <trace from="U1.D_NEG" to="net.DN" />
    <trace from="U1.SDA" to="net.SDA" />
    <trace from="U1.SCL" to="net.SCL" />
    <capacitor name="C1" capacitance="470nF" footprint="0603" layer="bottom" pcbX={-1.8} pcbY={-1} pcbRotation={90} />
    <trace from="U1.VUSB" to="C1.pin1" maxLength="6mm" />
    <trace from="C1.pin2" to="net.GND" maxLength="6mm" />
    <capacitor name="C2" capacitance="100nF" footprint="0603" pcbX={6.2} pcbY={-3} pcbRotation={90} />
    <trace from="C2.pin1" to="net.VBUS" />
    <trace from="C2.pin2" to="net.GND" />
    <resistor name="R2" resistance="10k" footprint="0603" pcbX={6.2} pcbY={0.5} pcbRotation={90} />
    <trace from="U1.N_RST" to="R2.pin1" />
    <trace from="R2.pin2" to="net.VBUS" />

    {/* I2C pull-ups */}
    <resistor name="R3" resistance="4.7k" footprint="0603" pcbX={-4.5} pcbY={3.5} />
    <resistor name="R4" resistance="4.7k" footprint="0603" pcbX={-4.5} pcbY={5.8} />
    <trace from="R3.pin1" to="net.SDA" />
    <trace from="R3.pin2" to="net.VBUS" />
    <trace from="R4.pin1" to="net.SCL" />
    <trace from="R4.pin2" to="net.VBUS" />

    {/* the secure element */}
    <ATECC608B_SSHDA_T name="U2" pcbX={11.5} pcbY={0} pcbRotation={90} />
    <trace from="U2.VCC" to="net.VBUS" />
    <trace from="U2.GND" to="net.GND" />
    <trace from="U2.SDA" to="net.SDA" />
    <trace from="U2.SCL" to="net.SCL" />
    <capacitor name="C3" capacitance="100nF" footprint="0603" pcbX={11.5} pcbY={5.5} />
    <trace from="C3.pin1" to="net.VBUS" />
    <trace from="C3.pin2" to="net.GND" />

    {/* lights: green = powered, blue = I2C traffic (MCP2221A GP3 default is the I2C LED) */}
    <led name="LED1" color="green" footprint="0603" pinLabels={{ pin1: "cathode", pin2: "anode" }} supplierPartNumbers={{ jlcpcb: ["C12624"] }} pcbX={18} pcbY={4} pcbRotation={90} />
    <resistor name="R5" resistance="1k" footprint="0603" pcbX={15.5} pcbY={4} />
    <trace from="R5.pin1" to="net.VBUS" />
    <trace from="R5.pin2" to="LED1.anode" />
    <trace from="LED1.cathode" to="net.GND" />
    <led name="LED2" color="blue" footprint="0603" pinLabels={{ pin1: "cathode", pin2: "anode" }} pcbX={18} pcbY={-4} pcbRotation={90} />
    <resistor name="R6" resistance="1k" footprint="0603" pcbX={15.5} pcbY={-4} />
    <trace from="U1.GP3" to="R6.pin1" />
    <trace from="R6.pin2" to="LED2.anode" />
    <trace from="LED2.cathode" to="net.GND" />

    <silkscreentext text="usb-signer v0.1" pcbX={8} pcbY={-6.3} fontSize={0.8} />
  </board>
)
