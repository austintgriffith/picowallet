import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
  pin3: ["pin3"],
  pin4: ["pin4"],
  pin5: ["pin5"],
  pin6: ["pin6"],
  pin7: ["pin7"],
  pin8: ["pin8"],
  pin9: ["pin9"],
  pin10: ["pin10"],
  pin11: ["pin11"],
  pin12: ["pin12"],
  pin13: ["pin13"]
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin13": [...pinLabels["pin13"], "pin14"],
} as const

export const AFC42_S12FMA_1H = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={footprinterPinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C466532"
  ]
}}
      manufacturerPartNumber="AFC42-S12FMA-1H"
      footprint="fpc12_p0.5mm_pw0.3mm_pl0.8mm_mpx7.5mm_mpy2.5mm_mpw0.4mm_mpl0.8mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C466532.obj?uuid=d6b530de5673497c95e0193749927dbb",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C466532.step?uuid=d6b530de5673497c95e0193749927dbb",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 2.75005079999994, y: -0.8999216000000341, z: -0.05 },
      }}
      {...props}
    />
  )
}