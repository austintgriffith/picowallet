import type { DiodeProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["cathode","neg"],
  pin2: ["anode","pos"]
} as const

export const SS14 = (props: DiodeProps) => {
  const { name = "D1", ...restProps } = props

  return (
    <diode
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C2480"
  ]
}}
      manufacturerPartNumber="SS14"
      footprint="smdpads2_p3.9299mm_pw1.52mm_ph1.68mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2480.obj?uuid=2ad98c37c5614ad18681cbd22e4725e1",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2480.step?uuid=2ad98c37c5614ad18681cbd22e4725e1",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: -0.000012699999956566899, z: -1.05 },
      }}
      {...restProps}
    />
  )
}