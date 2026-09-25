# Netlist and placement dump (from the compiled circuit.json, v0.7c)

Coordinates in mm, origin = board center, X right, Y up, viewed from the FRONT (top layer). Bottom-layer parts are placed with their X as seen from the front.

## Parts

| Ref | Type | Value / MPN | LCSC | Layer | Center X | Center Y | Rot | Size W×H |
|---|---|---|---|---|---|---|---|---|
| U1 | simple_chip | Raspberry Pi Pico 2W | C42394205 | bottom | -13.00 | 0.00 | 180 | 50.0×22.6 |
| DISP1 | simple_chip |  | C5329582 | top | 2.00 | 0.00 | 0 | 0.6×0.6 |
| J3 | simple_chip | FPC-05FB-12PH20 | C2856829 | top | -15.77 | 2.80 | 270 | 4.7×10.6 |
| C4 | simple_capacitor |  | C14663 | top | -14.00 | -6.00 | 0 | 2.4×0.9 |
| R6 | simple_resistor |  | C17946 | top | 4.00 | -20.50 | 0 | 4.1×1.8 |
| Q1 | simple_chip | 2N7002K | C414015 | top | 10.00 | -20.30 | 0 | 3.0×2.5 |
| R7 | simple_resistor |  | C25804 | top | 9.00 | -16.50 | 0 | 2.4×1.0 |
| SW5 | simple_switch | SKRHABE010 | C139794 | top | -33.00 | 0.00 | 45 | 8.8×8.8 |
| SW1 | simple_push_button | KH-6X6X5H-STM | C2837531 | top | 34.00 | 8.00 | 90 | 6.0×11.4 |
| SW2 | simple_push_button | KH-6X6X5H-STM | C2837531 | top | 34.00 | -6.00 | 90 | 6.0×11.4 |
| U2 | simple_chip | ATECC608B-SSHDA-T | C1518769 | top | -33.00 | 15.00 | 0 | 4.4×7.0 |
| R1 | simple_resistor |  | C23162 | top | -27.00 | 19.00 | 0 | 2.4×1.0 |
| R2 | simple_resistor |  | C23162 | top | -27.00 | 11.00 | 0 | 2.4×0.9 |
| C1 | simple_capacitor |  | C14663 | top | -27.00 | 15.00 | 0 | 2.4×0.9 |
| BT1 | simple_chip |  |  | bottom | 28.00 | 2.00 | 0 | 0.6×0.6 |
| J2 | simple_chip | B2B-PH-K-S(LF)(SN) | C131337 | bottom | 28.00 | 20.00 | 0 | 3.6×1.6 |
| C2 | simple_capacitor |  | C19702 | top | 24.00 | -16.00 | 0 | 2.4×1.0 |
| U3 | simple_chip | TP4056 | C725790 | top | 30.00 | -17.50 | 0 | 4.4×7.0 |
| R3 | simple_resistor |  | C4260 | top | 35.50 | -17.50 | 90 | 1.0×2.4 |
| C3 | simple_capacitor |  | C19702 | top | 24.00 | -20.50 | 0 | 2.4×1.0 |
| D1 | simple_diode | SS14 | C2480 | top | 18.00 | -20.50 | 0 | 5.4×1.7 |
| SW6 | simple_switch | MSK12C02 | C431540 | top | -30.00 | -19.49 | 0 | 8.4×4.5 |
| LED1 | simple_led |  | C12624 | top | -20.00 | -20.00 | 180 | 2.4×1.0 |
| R4 | simple_resistor |  | C21190 | top | -16.00 | -20.00 | 0 | 2.4×1.0 |
| LED2 | simple_led |  | C2286 | top | -8.00 | -20.00 | 180 | 2.5×1.0 |
| R5 | simple_resistor |  | C21190 | top | -4.00 | -20.00 | 0 | 2.5×1.0 |

## Every connection (source netlist)

- **BAT**: C3.pin1, J2.pin1, SW6.pin2, U3.BAT
- **GND**: C1.pin2, C2.pin2, C3.pin2, C4.pin2, J2.pin2, J3.pin1, LED1.cathode, Q1.pin2, R3.pin2, R7.pin2, SW1.pin2, SW2.pin2, SW5.COM, U1.GND0, U1.GND1, U2.GND, U3.EP, U3.GND, U3.TEMP
- **SCL**: R2.pin1, U1.GP5_SPI0CSn_I2C0SCL_UART1RX, U2.SCL
- **SDA**: R1.pin1, U1.GP4, U2.SDA
- **V3_3**: C1.pin1, C4.pin1, J3.pin4, J3.pin5, R1.pin2, R2.pin2, R4.pin1, U1.3V3, U1.GP10_SPI1SCK_I2C1SDA, U1.GP11_SPI1TX_I2C1SCL, U2.VCC
- **VBUS**: C2.pin1, R5.pin1, U1.VBUS, U3.CE, U3.VCC
- **VSYS**: D1.cathode, R6.pin1, U1.VSYS
- **(local)**: D1.anode, SW6.pin3
- **(local)**: J3.pin2, Q1.pin3, U1.GP9_SPI1CSn_I2C0SCL_UART1RX
- **(local)**: J3.pin3, R6.pin2, U1.GP8_SPI1RX_I2C0SDA_UART1TX
- **(local)**: J3.pin6, U1.GP12_SPI1RX_I2C0SDA_UART0TX
- **(local)**: LED1.anode, R4.pin2
- **(local)**: LED2.pin1, R5.pin2
- **(local)**: LED2.pin2, U3.N_CHRG
- **(local)**: Q1.pin1, R7.pin1, U1.GP13_SPI1CSn_I2C0SCL_UART0RX
- **(local)**: R3.pin1, U3.PROG
- **(local)**: SW1.pin1, U1.GP15_SPI1TX_I2C1SCL
- **(local)**: SW2.pin1, U1.GP17_SPI0CSn_UART0TX
- **(local)**: SW5.A, U1.GP2
- **(local)**: SW5.B, U1.GP18_SPI0SCK_I2C1SDA
- **(local)**: SW5.C, U1.GP16_SPI0RX_UART0RX
- **(local)**: SW5.CEN, U1.GP3
- **(local)**: SW5.D, U1.GP20_I2C0SDA

## Pad coordinates for the parts that matter (pin 1 and end pins)

| Ref | Pad | Layer | X | Y | W | H |
|---|---|---|---|---|---|---|
| U1 | pin1 | bottom | -37.07 | 9.69 | 1.5999968 | 3.1999936 |
| U1 | pin40 | bottom | -37.07 | -9.69 | 1.5999968 | 3.1999936 |
| U1 | pin39 | bottom | -34.53 | -9.69 | 1.5999968 | 3.1999936 |
| U1 | pin38 | bottom | -31.99 | -9.69 | 1.5999968 | 3.1999936 |
| U1 | pin36 | bottom | -26.91 | -9.69 | 1.5999968 | 3.1999936 |
| U1 | pin20 | bottom | 11.19 | 9.69 | 1.5999968 | 3.1999936 |
| U1 | pin21 | bottom | 11.19 | -9.69 | 1.5999968 | 3.1999936 |
| DISP1 | pin1 | top | 2.00 | 0.00 | 0.6 | 0.6 |
| J3 | 1 | top | -14.00 | 5.55 | 1.2 | 0.3 |
| J3 | 2 | top | -14.00 | 5.05 | 1.2 | 0.3 |
| J3 | 3 | top | -14.00 | 4.55 | 1.2 | 0.3 |
| J3 | 4 | top | -14.00 | 4.05 | 1.2 | 0.3 |
| J3 | 5 | top | -14.00 | 3.55 | 1.2 | 0.3 |
| J3 | 6 | top | -14.00 | 3.05 | 1.2 | 0.3 |
| J3 | 7 | top | -14.00 | 2.55 | 1.2 | 0.3 |
| J3 | 8 | top | -14.00 | 2.05 | 1.2 | 0.3 |
| J3 | 9 | top | -14.00 | 1.55 | 1.2 | 0.3 |
| J3 | 10 | top | -14.00 | 1.05 | 1.2 | 0.3 |
| J3 | 11 | top | -14.00 | 0.55 | 1.2 | 0.3 |
| J3 | 12 | top | -14.00 | 0.05 | 1.2 | 0.3 |
| J3 | 13 | top | -17.25 | -1.50 | 1.8 | 2 |
| J3 | 14 | top | -17.25 | 7.10 | 1.8 | 2 |
| J2 | unnamed_platedhole1/1 |  | 27.00 | 20.00 | 1.6 | 0.9 |
| J2 | unnamed_platedhole2/2 |  | 29.00 | 20.00 | 1.6 | 0.9 |
| SW6 | 1 | top | -32.25 | -18.00 | 0.6 | 1.524 |
| SW6 | 2 | top | -29.25 | -18.00 | 0.6 | 1.524 |
| SW6 | 3 | top | -27.75 | -18.00 | 0.6 | 1.524 |

## Holes

- (-31.7, -1.3) Ø1.199896
- (-34.3, 1.3) Ø0.9000236
- (-31.5, -20.3) Ø0.9
- (-28.5, -20.3) Ø0.9
- (-38.5, 19.5) Ø2.7
- (38.5, 19.5) Ø2.7
- (38.5, -19.5) Ø2.7
- (-38.5, -19.5) Ø2.7

Board: 82 × 44 mm, 1.4 mm thick, 2 layers.
