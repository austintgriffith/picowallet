import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VDD"],
  pin2: ["GP0"],
  pin3: ["GP1"],
  pin4: ["N_RST"],
  pin5: ["URX"],
  pin6: ["UTX"],
  pin7: ["GP2"],
  pin8: ["GP3"],
  pin9: ["SDA"],
  pin10: ["SCL"],
  pin11: ["VUSB"],
  pin12: ["D_NEG"],
  pin13: ["D_POS"],
  pin14: ["VSS"]
} as const

const pinAttributes = {
  pin1: {requiresPower: true},
  pin14: {requiresGround: true}
} as const

export const MCP2221A_I_ST = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
  "jlcpcb": [
    "C130462"
  ]
}}
      manufacturerPartNumber="MCP2221A-I/ST"
      footprint="dfn14_p0.65mm_w7.3002mm_pw0.4mm_pl1.7mm_pin1location(leftside,bottom)"
      cadModel={{
        objUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C130462.obj?uuid=5377177da492449fa1a3111d646cac17",
        stepUrl: "https://modelcdn.tscircuit.com/easyeda_models/assets/C130462.step?uuid=5377177da492449fa1a3111d646cac17",
        pcbRotationOffset: 90,
        modelOriginPosition: { x: -0.000012700000013410317, y: 0, z: -0.069083 },
      }}
      {...props}
    />
  )
}