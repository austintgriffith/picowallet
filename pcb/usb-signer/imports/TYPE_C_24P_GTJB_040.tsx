import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin25: ["GND6"],
  pin26: ["GND3"],
  pin27: ["B12","GND1"],
  pin28: ["B11","SSRXp1"],
  pin29: ["B10","SSRXn1"],
  pin30: ["B9","VBUS1"],
  pin31: ["B8","SBU2"],
  pin32: ["B7","DN2"],
  pin33: ["B6","DP2"],
  pin34: ["B5","CC2"],
  pin35: ["B4","VBUS2"],
  pin36: ["B3","SSTXn2"],
  pin37: ["B2","SSTXp2"],
  pin38: ["B1","GND2"],
  pin39: ["A1","GND4"],
  pin40: ["A2","SSTXP1"],
  pin41: ["A3","SSTXn1"],
  pin42: ["A4","VBUS3"],
  pin43: ["A5","CC1"],
  pin44: ["A6","DP1"],
  pin45: ["A7","DN1"],
  pin46: ["A8","SBU1"],
  pin47: ["A9","VBUS4"],
  pin48: ["A10","SSRXn2"],
  pin49: ["A11","SSRXp2"],
  pin50: ["A12","GND5"]
} as const

const pinAttributes = {
  pin25: {requiresGround: true},
  pin26: {requiresGround: true}
} as const

export const TYPE_C_24P_GTJB_040 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C3151751"
  ]
}}
      manufacturerPartNumber="TYPE-C 24P-GTJB 040"
      footprint={<footprint>
        <smtpad layer="bottom" portHints={["pin27"]} pcbX="2.749931mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin28"]} pcbX="2.250059mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin29"]} pcbX="1.749933mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin30"]} pcbX="1.250061mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin31"]} pcbX="0.749935mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin32"]} pcbX="0.250063mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin33"]} pcbX="-0.250063mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin34"]} pcbX="-0.749935mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin35"]} pcbX="-1.250061mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin36"]} pcbX="-1.749933mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin37"]} pcbX="-2.250059mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin38"]} pcbX="-2.749931mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin26"]} pcbX="-3.600069mm" pcbY="0.05001895mm" width="0.6999986mm" height="1.3999972mm" shape="rect" />
<smtpad portHints={["pin39"]} pcbX="2.749931mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin40"]} pcbX="2.250059mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin41"]} pcbX="1.749933mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin42"]} pcbX="1.250061mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin43"]} pcbX="0.749935mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin44"]} pcbX="0.250063mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin45"]} pcbX="-0.250063mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin46"]} pcbX="-0.749935mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin47"]} pcbX="-1.250061mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin48"]} pcbX="-1.749933mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin49"]} pcbX="-2.250059mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad portHints={["pin50"]} pcbX="-2.749931mm" pcbY="-0.00001905mm" width="0.2999994mm" height="1.499997mm" shape="rect" />
<smtpad layer="bottom" portHints={["pin25"]} pcbX="3.600069mm" pcbY="0.05001895mm" width="0.6999986mm" height="1.3999972mm" shape="rect" />
<silkscreentext text="{NAME}" pcbX="0.006731mm" pcbY="1.76198095mm" anchorAlignment="center" fontSize="1mm" />
<fabricationnotepath route={[{"x":-4.059986800000047,"y":-6.619995649999964},{"x":-4.059986800000047,"y":-11.459965650000072},{"x":4.034993200000031,"y":-11.459965650000072},{"x":4.034993200000031,"y":-6.559975449999911},{"x":4.109999399999879,"y":-6.484969259878767},{"x":4.185005599999954,"y":-6.559975449999911},{"x":4.185005599999954,"y":-11.53497184999992},{"x":4.163036792651155,"y":-11.588009242650969},{"x":4.109999400000106,"y":-11.609978049999995},{"x":-4.134993000000122,"y":-11.609978049999995},{"x":-4.188030392651058,"y":-11.588009242650969},{"x":-4.20999919999997,"y":-11.53497184999992},{"x":-4.20999919999997,"y":-6.619995649999964},{"x":-4.134992999999895,"y":-6.544989459878707},{"x":-4.059986800000047,"y":-6.619995649999964}]} strokeWidth="0.254mm" />
</footprint>}
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C3151751.obj?uuid=22ed94417bfe4c4d9fc9f2819b446fde",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C3151751.step?uuid=22ed94417bfe4c4d9fc9f2819b446fde",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.00006349999989652133, y: 11.560003049999937, z: 0.3999959999999998 },
      }}
      {...props}
    />
  )
}