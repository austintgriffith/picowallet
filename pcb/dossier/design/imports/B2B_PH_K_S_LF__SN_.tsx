import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"]
} as const

export const B2B_PH_K_S_LF__SN_ = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C131337"
  ]
}}
      manufacturerPartNumber="B2B-PH-K-S(LF)(SN)"
      footprint="pinrow2_nosquareplating_p2mm_od1.6mm_id0.9mm_pin1location(rightside,top)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C131337.obj?uuid=ee6b32b5c03144688a5663b32f9648c4",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C131337.step?uuid=ee6b32b5c03144688a5663b32f9648c4",
        pcbRotationOffset: 180,
        modelOriginPosition: { x: -0.9995, y: -0.5500381999999945, z: -0.000006999999999646178 },
      }}
      {...props}
    />
  )
}