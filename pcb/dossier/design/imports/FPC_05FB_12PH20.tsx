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
  pin13: ["pin13"],
  pin14: ["pin14"]
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin12": [...pinLabels["pin12"], "pin1"],
  "pin11": [...pinLabels["pin11"], "pin2"],
  "pin10": [...pinLabels["pin10"], "pin3"],
  "pin9": [...pinLabels["pin9"], "pin4"],
  "pin8": [...pinLabels["pin8"], "pin5"],
  "pin7": [...pinLabels["pin7"], "pin6"],
  "pin6": [...pinLabels["pin6"], "pin7"],
  "pin5": [...pinLabels["pin5"], "pin8"],
  "pin4": [...pinLabels["pin4"], "pin9"],
  "pin3": [...pinLabels["pin3"], "pin10"],
  "pin2": [...pinLabels["pin2"], "pin11"],
  "pin1": [...pinLabels["pin1"], "pin12"],
  "pin14": [...pinLabels["pin14"], "pin13"],
  "pin13": [...pinLabels["pin13"], "pin14"],
} as const

export const FPC_05FB_12PH20 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={footprinterPinLabels}
      supplierPartNumbers={{
  "jlcpcb": [
    "C2856829"
  ]
}}
      manufacturerPartNumber="FPC-05FB-12PH20"
      footprint="fpc12_p0.5mm_pw0.3mm_pl1.2mm_mpx8.6mm_mpy3.25mm_mpw2mm_mpl1.8mm"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2856829.obj?uuid=e80a5cc4340a43dba25f6042a59bf5d3",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C2856829.step?uuid=e80a5cc4340a43dba25f6042a59bf5d3",
        pcbRotationOffset: 0,
        modelOriginPosition: { x: 0.000012700000070253736, y: -1.8349897999999714, z: 0 },
      }}
      {...props}
    />
  )
}