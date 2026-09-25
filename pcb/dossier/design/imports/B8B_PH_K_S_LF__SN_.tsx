import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
  pin5: ["pin5"],
  pin6: ["pin6"],
  pin7: ["pin7"],
  pin8: ["pin8"]
} as const

export const B8B_PH_K_S_LF__SN_ = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C157974"
  ]
}}
      manufacturerPartNumber="B8B-PH-K-S(LF)(SN)"
      footprint="pinrow8_p2mm_od1.4mm_id0.9mm_pin1location(rightside,top)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C157974.obj?uuid=1ce88b9c4af0470793a219e97dc9d90b",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C157974.step?uuid=1ce88b9c4af0470793a219e97dc9d90b",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: -7.000000000000114, y: -0.0000011999999059986166, z: -0.000006999999999646178 },
      }}
      {...props}
    />
  )
}