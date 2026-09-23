import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GND"]
} as const

const pinAttributes = {
  pin1: {requiresGround: true}
} as const

export const HS20HS072RX = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C5329582"
  ]
}}
      manufacturerPartNumber="HS20HS072RX"
      footprint="solderjumper1_pw1.52mm_ph1.52mm"
      
      {...props}
    />
  )
}