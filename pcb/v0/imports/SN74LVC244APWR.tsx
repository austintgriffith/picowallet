import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["N_1OE"],
  pin2: ["1A1"],
  pin3: ["2Y4"],
  pin4: ["1A2"],
  pin5: ["2Y3"],
  pin6: ["1A3"],
  pin7: ["2Y2"],
  pin8: ["1A4"],
  pin9: ["2Y1"],
  pin10: ["GND"],
  pin11: ["2A1"],
  pin12: ["1Y4"],
  pin13: ["2A2"],
  pin14: ["1Y3"],
  pin15: ["2A3"],
  pin16: ["1Y2"],
  pin17: ["2A4"],
  pin18: ["1Y1"],
  pin19: ["N_2OE"],
  pin20: ["VCC"]
} as const

const pinAttributes = {
  pin10: {requiresGround: true},
  pin20: {requiresPower: true}
} as const

export const SN74LVC244APWR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C7668"
  ]
}}
      manufacturerPartNumber="SN74LVC244APWR"
      footprint={<footprint>
        <smtpad portHints={["pin1"]} pcbX="-2.925064mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin2"]} pcbX="-2.275078mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin3"]} pcbX="-1.625092mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin4"]} pcbX="-0.975106mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin5"]} pcbX="-0.324866mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin6"]} pcbX="0.32512mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin7"]} pcbX="0.975106mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin8"]} pcbX="1.625092mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin9"]} pcbX="2.275078mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin10"]} pcbX="2.925064mm" pcbY="-2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin20"]} pcbX="-2.925064mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin19"]} pcbX="-2.275078mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin18"]} pcbX="-1.625092mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin17"]} pcbX="-0.975106mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin16"]} pcbX="-0.324866mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin15"]} pcbX="0.32512mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin14"]} pcbX="0.975106mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin13"]} pcbX="1.625092mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin12"]} pcbX="2.275078mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<smtpad portHints={["pin11"]} pcbX="2.925064mm" pcbY="2.870962mm" width="0.3640074mm" height="1.7420082mm" radius="0.1820037mm" shape="pill" />
<silkscreenpath route={[{"x":-3.326206200000115,"y":-1.7713960000000952},{"x":-3.326206200000115,"y":1.7713959999999815},{"x":3.3262061999998878,"y":1.7713959999999815},{"x":3.3262061999998878,"y":-1.7713960000000952},{"x":-3.326206200000115,"y":-1.7713960000000952}]} />
<silkscreencircle pcbX="-2.925064mm" pcbY="-1.019048mm" radius="0.150114mm" />
<silkscreencircle pcbX="-3.559302mm" pcbY="-2.870962mm" radius="0.150114mm" />
<silkscreentext text="{NAME}" pcbX="-0.1905mm" pcbY="4.556mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-3.958400000000097,"y":3.80600000000004},{"x":3.5773999999998978,"y":3.80600000000004},{"x":3.5773999999998978,"y":-4.009199999999964},{"x":-3.958400000000097,"y":-4.009199999999964},{"x":-3.958400000000097,"y":3.80600000000004}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7668.obj?uuid=f8ba5b4174b9490d8c445fbe2ed40b80",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C7668.step?uuid=f8ba5b4174b9490d8c445fbe2ed40b80",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: 0, y: 0.000012700000070253736, z: -0.019205 },
      }}
      {...props}
    />
  )
}