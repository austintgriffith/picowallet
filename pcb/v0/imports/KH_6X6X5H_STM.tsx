import type { PushButtonProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"]
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin3": [...pinLabels["pin3"], "pin2"],
  "pin4": [...pinLabels["pin4"], "pin3"],
  "pin2": [...pinLabels["pin2"], "pin4"],
} as const

export const KH_6X6X5H_STM = (props: PushButtonProps<typeof pinLabels>) => {
  const { name = "SW1", ...restProps } = props

  return (
    <pushbutton
      name={name}
      pinLabels={footprinterPinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C2837531"
  ]
}}
      manufacturerPartNumber="KH-6X6X5H-STM"
      footprint="dfn4_p4.5mm_w11.3998mm_pw1.5mm_pl2.3mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2837531.obj?uuid=0a2a6eed7e284a95867695201df5c190",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2837531.step?uuid=0a2a6eed7e284a95867695201df5c190",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0, y: 0.0004999999999999449, z: -0.5 },
      }}
      {...restProps}
    />
  )
}