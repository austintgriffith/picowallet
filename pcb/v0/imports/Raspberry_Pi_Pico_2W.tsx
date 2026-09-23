import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GP0_SPI0RX_I2C0SDA_UART0TX"],
  pin2: ["GP1"],
  pin3: ["GND0"],
  pin4: ["GP2"],
  pin5: ["GP3"],
  pin6: ["GP4"],
  pin7: ["GP5_SPI0CSn_I2C0SCL_UART1RX"],
  pin8: ["GND2"],
  pin9: ["GP6_SPI0SCK_I2C1SDA"],
  pin10: ["GP7_SPI0TX_I2C1SCL"],
  pin11: ["GP8_SPI1RX_I2C0SDA_UART1TX"],
  pin12: ["GP9_SPI1CSn_I2C0SCL_UART1RX"],
  pin13: ["GND3"],
  pin14: ["GP10_SPI1SCK_I2C1SDA"],
  pin15: ["GP11_SPI1TX_I2C1SCL"],
  pin16: ["GP12_SPI1RX_I2C0SDA_UART0TX"],
  pin17: ["GP13_SPI1CSn_I2C0SCL_UART0RX"],
  pin18: ["GND5"],
  pin19: ["GP14_SPI1SCK_I2C1SDA"],
  pin20: ["GP15_SPI1TX_I2C1SCL"],
  pin21: ["GP16_SPI0RX_UART0RX"],
  pin22: ["GP17_SPI0CSn_UART0TX"],
  pin23: ["GND6"],
  pin24: ["GP18_SPI0SCK_I2C1SDA"],
  pin25: ["GP19_SPI0TX_I2C1SCL"],
  pin26: ["GP20_I2C0SDA"],
  pin27: ["GP21_I2C0SCL"],
  pin28: ["GND4"],
  pin29: ["GP22"],
  pin30: ["RUN"],
  pin31: ["GP26_ADC0_I2C1SDA"],
  pin32: ["GP27_ADC1_I2C1SCL"],
  pin33: ["GND_AGND"],
  pin34: ["GP28_ADC2"],
  pin35: ["ADC_VREF"],
  pin36: ["3V3"],
  pin37: ["3V3_EN"],
  pin38: ["GND1"],
  pin39: ["VSYS"],
  pin40: ["VBUS"],
  pin41: ["TP61"],
  pin42: ["TP51"],
  pin43: ["TP41"],
  pin44: ["TP31"],
  pin45: ["TP21"],
  pin46: ["TP1"]
} as const

const pinAttributes = {
  pin8: {requiresGround: true},
  pin13: {requiresGround: true},
  pin18: {requiresGround: true},
  pin23: {requiresGround: true},
  pin28: {requiresGround: true},
  pin38: {requiresGround: true}
} as const

export const Raspberry_Pi_Pico_2W = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C42394205"
  ]
}}
      manufacturerPartNumber="Raspberry Pi Pico 2W"
      footprint={<footprint>
        <smtpad portHints={["pin41"]} pcbX="-10.94001495mm" pcbY="-2.499741mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin42"]} pcbX="-13.44013695mm" pcbY="-2.499741mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin43"]} pcbX="-15.94000495mm" pcbY="-2.499741mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin44"]} pcbX="-24.23996295mm" pcbY="-0.999871mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin45"]} pcbX="-24.23996295mm" pcbY="1.000125mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin46"]} pcbX="-20.93999495mm" pcbY="0.000127mm" width="1.499997mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin1"]} pcbX="-24.07003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin40"]} pcbX="-24.07003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin2"]} pcbX="-21.53003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin39"]} pcbX="-21.53003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin3"]} pcbX="-18.99003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin38"]} pcbX="-18.99003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin4"]} pcbX="-16.45003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin37"]} pcbX="-16.45003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin5"]} pcbX="-13.91003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin36"]} pcbX="-13.91003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin6"]} pcbX="-11.37003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin35"]} pcbX="-11.37003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin7"]} pcbX="-8.83003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin34"]} pcbX="-8.83003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin8"]} pcbX="-6.29003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin33"]} pcbX="-6.29003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin9"]} pcbX="-3.75003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin32"]} pcbX="-3.75003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin10"]} pcbX="-1.21003695mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin31"]} pcbX="-1.21003695mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin11"]} pcbX="1.32996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin30"]} pcbX="1.32996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin12"]} pcbX="3.86996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin29"]} pcbX="3.86996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin13"]} pcbX="6.40996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin28"]} pcbX="6.40996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin14"]} pcbX="8.94996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin27"]} pcbX="8.94996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin15"]} pcbX="11.48996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin26"]} pcbX="11.48996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin16"]} pcbX="14.02996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin25"]} pcbX="14.02996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin17"]} pcbX="16.56996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin24"]} pcbX="16.56996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin18"]} pcbX="19.10996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin23"]} pcbX="19.10996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin19"]} pcbX="21.64996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin22"]} pcbX="21.64996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin20"]} pcbX="24.18996305mm" pcbY="-9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<smtpad portHints={["pin21"]} pcbX="24.18996305mm" pcbY="9.689973mm" width="1.5999968mm" height="3.1999936mm" shape="rect" />
<silkscreenpath route={[{"x":17.601101449999874,"y":-10.499877399999946},{"x":18.078900849999968,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":25.55998825000006,"y":3.5711383999999953},{"x":25.55998825000006,"y":-3.5710622000000285}]} />
<silkscreenpath route={[{"x":25.22110144999988,"y":-10.499877399999946},{"x":25.55998825000006,"y":-10.499877399999946},{"x":25.55998825000006,"y":-3.5710622000000285}]} />
<silkscreenpath route={[{"x":25.55998825000006,"y":3.5711383999999953},{"x":25.55998825000006,"y":10.500080600000047},{"x":25.22110144999988,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-25.101048350000042,"y":10.499953600000026},{"x":-25.439808149999976,"y":10.499953600000026}]} />
<silkscreenpath route={[{"x":-25.439935149999997,"y":10.500080600000047},{"x":-25.439935149999997,"y":-10.499877399999946},{"x":-25.101099149999982,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-26.739830950000055,"y":3.9996363999999858},{"x":-26.339603149999903,"y":3.9996363999999858},{"x":-26.339603149999903,"y":-4.000245999999834},{"x":-26.739830950000055,"y":-4.000245999999834}]} />
<silkscreenpath route={[{"x":-26.339603149999903,"y":-3.8089332000000695},{"x":-25.465233549999994,"y":-3.8089332000000695},{"x":-25.439808149999976,"y":-3.834358599999973}]} />
<silkscreenpath route={[{"x":-26.339603149999903,"y":3.8025069999999914},{"x":-25.439808149999976,"y":3.8025069999999914}]} />
<silkscreenpath route={[{"x":-26.739830950000055,"y":3.9996363999999858},{"x":-26.739830950000055,"y":-4.000245999999834}]} />
<silkscreenpath route={[{"x":-22.561099150000132,"y":10.500080600000047},{"x":-23.03889855,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-20.021099150000055,"y":10.500080600000047},{"x":-20.498898550000035,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-17.48109915000009,"y":10.500080600000047},{"x":-17.95889855000007,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-14.941099150000014,"y":10.500080600000047},{"x":-15.418898550000108,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-12.40109915000005,"y":10.500080600000047},{"x":-12.87889855000003,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-9.861099150000086,"y":10.500080600000047},{"x":-10.338898550000067,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-7.321099150000123,"y":10.500080600000047},{"x":-7.79889854999999,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-4.7810991500000455,"y":10.500080600000047},{"x":-5.258898550000026,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":-2.241099150000082,"y":10.500080600000047},{"x":-2.7188985500000626,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":0.29890084999999544,"y":10.500080600000047},{"x":-0.17889855000009902,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":2.838900849999959,"y":10.500080600000047},{"x":2.3611014499998646,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":5.378900849999923,"y":10.500080600000047},{"x":4.901101449999942,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":7.918900849999886,"y":10.500080600000047},{"x":7.441101450000019,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":10.458900849999964,"y":10.500080600000047},{"x":9.98110144999987,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":12.998900849999927,"y":10.500080600000047},{"x":12.521101449999946,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":15.538900850000005,"y":10.500080600000047},{"x":15.06110144999991,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":18.078900849999968,"y":10.500080600000047},{"x":17.601101449999874,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":20.618900849999932,"y":10.500080600000047},{"x":20.14110144999995,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":23.158900849999895,"y":10.500080600000047},{"x":22.68110145000003,"y":10.500080600000047}]} />
<silkscreenpath route={[{"x":22.68110145000003,"y":-10.499877399999946},{"x":23.158900849999895,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":20.14110144999995,"y":-10.499877399999946},{"x":20.618900849999932,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":15.06110144999991,"y":-10.499877399999946},{"x":15.538900850000005,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":12.521101449999946,"y":-10.499877399999946},{"x":12.998900849999927,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":9.98110144999987,"y":-10.499877399999946},{"x":10.458900849999964,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":7.441101450000019,"y":-10.499877399999946},{"x":7.918900849999886,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":4.901101449999942,"y":-10.499877399999946},{"x":5.378900849999923,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":2.3611014499998646,"y":-10.499877399999946},{"x":2.838900849999959,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-0.17889855000009902,"y":-10.499877399999946},{"x":0.29890084999999544,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-2.7188985500000626,"y":-10.499877399999946},{"x":-2.241099150000082,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-5.258898550000026,"y":-10.499877399999946},{"x":-4.7810991500000455,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-7.79889854999999,"y":-10.499877399999946},{"x":-7.321099150000123,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-10.338898550000067,"y":-10.499877399999946},{"x":-9.861099150000086,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-12.87889855000003,"y":-10.499877399999946},{"x":-12.40109915000005,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-15.418898550000108,"y":-10.499877399999946},{"x":-14.941099150000014,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-17.95889855000007,"y":-10.499877399999946},{"x":-17.48109915000009,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-20.498898550000035,"y":-10.499877399999946},{"x":-20.021099150000055,"y":-10.499877399999946}]} />
<silkscreenpath route={[{"x":-23.03889855,"y":-10.499877399999946},{"x":-22.561099150000132,"y":-10.499877399999946}]} />
<silkscreencircle pcbX="-23.29000295mm" pcbY="-5.499989mm" radius="0.8001mm" />
<silkscreencircle pcbX="-23.29000295mm" pcbY="-5.499989mm" radius="1.400048mm" />
<silkscreencircle pcbX="-23.29000295mm" pcbY="5.499989mm" radius="0.8001mm" />
<silkscreencircle pcbX="-23.29000295mm" pcbY="5.499989mm" radius="1.400048mm" />
<silkscreencircle pcbX="23.40992905mm" pcbY="-5.499989mm" radius="1.400048mm" />
<silkscreencircle pcbX="23.40992905mm" pcbY="-5.499989mm" radius="0.8001mm" />
<silkscreencircle pcbX="23.40992905mm" pcbY="5.499989mm" radius="1.400048mm" />
<silkscreencircle pcbX="23.40992905mm" pcbY="5.499989mm" radius="0.8001mm" />
<silkscreencircle pcbX="-24.08984895mm" pcbY="-12.499975mm" radius="0.249936mm" />
<silkscreentext text="{NAME}" pcbX="-0.65580895mm" pcbY="12.278743mm" anchorAlignment="center" fontSize="1mm" />
<fabricationnotepath route={[{"x":-26.73995795000019,"y":4.127068200000053},{"x":-26.339958749999937,"y":4.127068200000053},{"x":-26.250156188789333,"y":4.089870761210705},{"x":-26.212958749999984,"y":4.000068200000101},{"x":-26.212958749999984,"y":-3.9999157999999397},{"x":-26.250156188789333,"y":-4.089718361210657},{"x":-26.339958749999937,"y":-4.126915799999892},{"x":-26.73995795000019,"y":-4.126915799999892},{"x":-26.612957950000123,"y":-3.9999157999999397},{"x":-26.73995795000019,"y":-3.8729157999998733},{"x":-26.466958750000003,"y":-3.8729157999998733},{"x":-26.466958750000003,"y":3.8730682000000343},{"x":-26.73995795000019,"y":3.8730682000000343},{"x":-26.612957950000123,"y":4.000068200000101},{"x":-26.73995795000019,"y":4.127068200000053}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-26.612957950000123,"y":4.000068200000101},{"x":-26.612957950000123,"y":-3.9999157999999397},{"x":-26.73995795000019,"y":-3.8729157999998733},{"x":-26.866957950000142,"y":-3.9999157999999397},{"x":-26.866957950000142,"y":4.000068200000101},{"x":-26.73995795000019,"y":3.8730682000000343},{"x":-26.612957950000123,"y":4.000068200000101}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-26.339958749999937,"y":3.9298625999999786},{"x":-25.439960550000023,"y":3.9298625999999786},{"x":-25.56696055000009,"y":3.802862600000026},{"x":-25.439960550000023,"y":3.6758625999999595},{"x":-26.339958749999937,"y":3.6758625999999595},{"x":-26.212958749999984,"y":3.802862600000026},{"x":-26.339958749999937,"y":3.9298625999999786}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-25.31278275000011,"y":10.499699599999985},{"x":-25.31278275000011,"y":-10.373334600000021},{"x":-25.100997549999988,"y":-10.373334600000021},{"x":-25.227997550000055,"y":-10.500334599999974},{"x":-25.100997549999988,"y":-10.627334599999926},{"x":-25.439782750000063,"y":-10.627334599999926},{"x":-25.52958531121078,"y":-10.590137161210691},{"x":-25.56678275000013,"y":-10.500334599999974},{"x":-25.56678275000013,"y":10.499699599999985},{"x":-25.439782750000063,"y":10.372699599999919},{"x":-25.31278275000011,"y":10.499699599999985}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-25.439960550000023,"y":-3.961003000000005},{"x":-25.48013680257759,"y":-3.954476834750494},{"x":-25.516185950000022,"y":-3.935577599999988},{"x":-26.339958749999937,"y":-3.935577599999988},{"x":-26.429761311210655,"y":-3.898380161210639},{"x":-26.466958750000003,"y":-3.808577600000035},{"x":-26.429761311210655,"y":-3.7187750387893175},{"x":-26.339958749999937,"y":-3.6815775999999687},{"x":-25.465335149999987,"y":-3.6815775999999687},{"x":-25.416743014671738,"y":-3.691242025078054},{"x":-25.375546150000105,"y":-3.718763200000012},{"x":-25.35014615,"y":-3.7441632000000027},{"x":-25.322607801969752,"y":-3.785369432136804},{"x":-25.31293514999993,"y":-3.8339776000000256},{"x":-25.350137796202034,"y":-3.923800353797901},{"x":-25.439960550000023,"y":-3.961003000000005}]} strokeWidth="0.254mm" />
<fabricationnotepath route={[{"x":-25.101149950000035,"y":10.373055200000067},{"x":-25.439960550000023,"y":10.373055200000067},{"x":-25.31296055000007,"y":10.50005520000002},{"x":-25.439960550000023,"y":10.627055200000086},{"x":-25.101149950000035,"y":10.627055200000086},{"x":-25.228149950000102,"y":10.50005520000002},{"x":-25.101149950000035,"y":10.373055200000067}]} strokeWidth="0.254mm" />
<courtyardoutline outline={[{"x":-27.118608950000066,"y":11.528743000000077},{"x":25.806991049999965,"y":11.528743000000077},{"x":25.806991049999965,"y":-12.999656999999843},{"x":-27.118608950000066,"y":-12.999656999999843},{"x":-27.118608950000066,"y":11.528743000000077}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C42394205.obj?uuid=07c2e528ec9a4008b33211831b7000e1",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C42394205.step?uuid=07c2e528ec9a4008b33211831b7000e1",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.05000704999994099, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}