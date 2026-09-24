import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["NC4"],
  pin2: ["NC3"],
  pin3: ["NC2"],
  pin4: ["GND"],
  pin5: ["SDA"],
  pin6: ["SCL"],
  pin7: ["NC1"],
  pin8: ["VCC"]
} as const

const pinAttributes = {
  pin1: {doNotConnect: true},
  pin2: {doNotConnect: true},
  pin3: {doNotConnect: true},
  pin4: {requiresGround: true},
  pin7: {doNotConnect: true},
  pin8: {requiresPower: true}
} as const

export const ATECC608B_SSHDA_T = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C1518769"
  ]
}}
      manufacturerPartNumber="ATECC608B-SSHDA-T"
      footprint="soic8_pillpads_w7mm_pw0.59mm_pl1.8mm_pin1location(leftside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C1518769.obj?uuid=ec3b9f9b31a74655be3e55848dbee9c1",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C1518769.step?uuid=ec3b9f9b31a74655be3e55848dbee9c1",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: -0.000012700000070253736, y: 0, z: 0 },
      }}
      {...props}
    />
  )
}