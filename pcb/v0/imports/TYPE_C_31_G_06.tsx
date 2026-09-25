import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin17: ["EH"],
  pin18: ["A1","GND1"],
  pin19: ["A4","VBUS1"],
  pin20: ["A5","CC1"],
  pin21: ["A6","DP1"],
  pin22: ["A7","DN1"],
  pin23: ["A8","SUB1"],
  pin24: ["A9","VBUS2"],
  pin25: ["A12","GND2"],
  pin26: ["B1","GND3"],
  pin27: ["B4","VBUS3"],
  pin28: ["B5","CC2"],
  pin29: ["B6","DP2"],
  pin30: ["B7","DN2"],
  pin31: ["B8","SUB2"],
  pin32: ["B9","VBUS4"],
  pin33: ["B12","GND4"]
} as const

export const TYPE_C_31_G_06 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C283539"
  ]
}}
      manufacturerPartNumber="TYPE-C-31-G-06"
      footprint={<footprint>
        <smtpad portHints={["pin18"]} pcbX="1.262888mm" pcbY="-2.7751024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin19"]} pcbX="1.262888mm" pcbY="-1.9750024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin20"]} pcbX="1.262888mm" pcbY="-1.1749024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin21"]} pcbX="1.262888mm" pcbY="-0.3750564mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin22"]} pcbX="1.262888mm" pcbY="0.4250436mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin23"]} pcbX="1.262888mm" pcbY="1.2248896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin24"]} pcbX="1.262888mm" pcbY="2.0249896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin25"]} pcbX="1.262888mm" pcbY="2.8250896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin26"]} pcbX="-1.262888mm" pcbY="2.8250896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin27"]} pcbX="-1.262888mm" pcbY="2.0249896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin28"]} pcbX="-1.262888mm" pcbY="1.2248896mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin29"]} pcbX="-1.262888mm" pcbY="0.4250436mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin30"]} pcbX="-1.262888mm" pcbY="-0.3750564mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin31"]} pcbX="-1.262888mm" pcbY="-1.1749024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin32"]} pcbX="-1.262888mm" pcbY="-1.9750024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin33"]} pcbX="-1.262888mm" pcbY="-2.7751024mm" width="0.7750048mm" height="0.3999992mm" shape="rect" />
<smtpad portHints={["pin17"]} pcbX="0mm" pcbY="3.9499794mm" width="1.5999968mm" height="0.6500114mm" shape="rect" />
<smtpad portHints={["pin17"]} pcbX="0mm" pcbY="-3.9499794mm" width="1.5999968mm" height="0.6500114mm" shape="rect" />
<silkscreenpath route={[{"x":1.1999975999999606,"y":-3.206140399999981},{"x":1.1999975999999606,"y":-4.100017200000025}]} />
<silkscreenpath route={[{"x":-1.1999976000000743,"y":-3.206140399999981},{"x":-1.1999976000000743,"y":-3.974998400000004}]} />
<silkscreenpath route={[{"x":-1.1999976000000743,"y":4.150004400000171},{"x":-1.1999976000000743,"y":3.256127600000127}]} />
<silkscreenpath route={[{"x":1.1999975999999606,"y":4.150004400000171},{"x":1.1999975999999606,"y":3.256127600000127}]} />
<silkscreentext text="{NAME}" pcbX="0mm" pcbY="5.2667936mm" anchorAlignment="center" fontSize="1mm" />
<courtyardoutline outline={[{"x":-1.9010000000000673,"y":4.516793600000028},{"x":1.90099999999984,"y":4.516793600000028},{"x":1.90099999999984,"y":-4.5430063999999675},{"x":-1.9010000000000673,"y":-4.5430063999999675},{"x":-1.9010000000000673,"y":4.516793600000028}]} />
      </footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C283539.obj?uuid=cf35b5c474554777b09ef649a3f55b30",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C283539.step?uuid=cf35b5c474554777b09ef649a3f55b30",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012699999956566899, y: -0.02499360000001616, z: -3.39 },
      }}
      {...props}
    />
  )
}