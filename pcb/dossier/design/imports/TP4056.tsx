import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["TEMP"],
  pin2: ["PROG"],
  pin3: ["GND"],
  pin4: ["VCC"],
  pin5: ["BAT"],
  pin6: ["N_STDBY"],
  pin7: ["N_CHRG"],
  pin8: ["CE"],
  pin9: ["EP"]
} as const

const pinAttributes = {
  pin3: {requiresGround: true},
  pin4: {requiresPower: true}
} as const

const footprinterPinLabels = {
  ...pinLabels,
  "pin9": [...pinLabels["pin9"], "thermalpad"],
} as const

export const TP4056 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={footprinterPinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C725790"
  ]
}}
      manufacturerPartNumber="TP4056"
      footprint="dfn8_thermalpad2.4mmx3.3mm_w7.02mm_pl1.2mm_pin1location(leftside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C725790.obj?uuid=9e2b03dd4dce46a190ce3fa245369fb2",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C725790.step?uuid=9e2b03dd4dce46a190ce3fa245369fb2",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: 0.000012700000013410317, y: -0.000012699999984988608, z: -0.099425 },
      }}
      {...props}
    />
  )
}