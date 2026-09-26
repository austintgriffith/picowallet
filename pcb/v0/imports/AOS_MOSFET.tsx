import type { ChipProps } from "@tscircuit/props"

// AOS AO3400A/AO3401A datasheets: SOT-23, 1=G, 2=S, 3=D.
// RDS(on) is guaranteed at |VGS|=2.5 V. Both use the same land pattern.
const pinLabels = { pin1: ["G"], pin2: ["S"], pin3: ["D"] } as const
const footprint = "sot23w_p1mm_pw0.65mm_pin1location(rightside,bottom)"

export const AO3400A = (props: ChipProps<typeof pinLabels>) => (
  <chip pinLabels={pinLabels} footprint={footprint}
    manufacturerPartNumber="AO3400A" supplierPartNumbers={{ jlcpcb: ["C20917"] }} {...props} />
)

export const AO3401A = (props: ChipProps<typeof pinLabels>) => (
  <chip pinLabels={pinLabels} footprint={footprint}
    manufacturerPartNumber="AO3401A" supplierPartNumbers={{ jlcpcb: ["C15127"] }} {...props} />
)
