# Crypto chips you can buy this week

Date: 2026-10-02. Four blind searches (three Claude agents, one Codex), none told what we use.
Goal: a chip that holds a key it won't give up, on a board you can get in about a week from
Amazon, Adafruit, SparkFun, M5Stack or in-stock DigiKey, ideally no solder.

Prices and stock are from search snapshots. Recheck before buying. Where searches disagreed on
stock, both are noted.

## Signs normal Ethereum keys (secp256k1)

| What | Price | Where, stock | How it connects | Notes |
|---|---|---|---|---|
| **Arduino Portenta C33** (NXP SE050C2 on board) | $42–57 | [DigiKey](https://www.digikey.com/en/products/detail/arduino/ABX00074/21219772) 188, [SparkFun](https://www.sparkfun.com/arduino-portenta-c33.html), Arduino store | It is the board. No solder. | Replaces the Pico. Arduino's library only does P-256; secp256k1 needs NXP's lower-level C library ([NXP thread](https://community.nxp.com/t5/Smart-Cards-and-Secure-Element/Modifying-SE05X-Library-on-Arduino-Portenta-C33-for-Custom/m-p/1798526)). |
| **YubiKey 5 NFC** | $58 | [Yubico](https://www.yubico.com/product/yubikey-5-nfc/), Amazon | NFC reader on the Pico: [M5Stack NFC unit](https://shop.m5stack.com/products/nfc-universal-unit-st25r3916) $7 or [Grove NFC](https://www.seeedstudio.com/Grove-NFC.html) $16.50. No solder. | secp256k1 is in the OpenPGP app (firmware 5.2.3+), not PIV ([Yubico](https://developers.yubico.com/PGP/YubiKey_5.2.3_Enhancements_to_OpenPGP_3.4.html)). Key made on the key, attestation cert. Closed firmware. Example project: [yketh](https://github.com/mab-xyz/yketh). |
| **Satochip card** | €25 | [satochip.io](https://satochip.io/product/satochip/) | Same NFC reader | Open applet, BIP32 on the card, EAL6+ chip. |
| **Keycard** | €24–29 | [keycard.tech](https://keycard.tech/products/keycard) (stock text conflicting) | Same NFC reader | Open (MIT). Needs a secure channel (secp256k1 ECDH) done in software on the Pico. |
| Blank J3R180 JavaCards | ~$5–15 | [Amazon](https://www.amazon.com/J3R180-Magnetic-Stripe-Interface-EEPROM/dp/B0HD7Z44HJ) | Same NFC reader | Load Satochip/Keycard yourself. Buy unfused cards. |
| NXP OM-SE050ARD-E | $60 NXP, $84 DigiKey | [DigiKey](https://www.digikey.com/en/products/detail/nxp-usa-inc/OM-SE050ARD-E/16366366) 10 | 4 jumper wires | No MicroPython driver. Curve must be created on the chip first. |
| Mikroe SE051 Click | $25 | [DigiKey](https://www.digikey.com/en/products/detail/mikroelektronika/MIKROE-5392/16910358) 0–2 | Jumper wires | Almost gone. |
| Infineon Blockchain Security 2Go (5 cards) | $80 | [DigiKey](https://www.digikey.com/en/products/detail/infineon-technologies/BLOCKCHAINSTARTKITTOBO1/10279163) 4 | NFC reader | Made for Ethereum. Discontinued. |
| Nitrokey 3 / HSM 2, Token2 PIN+ | €60–109 | Their shops | USB host needed | Pico can't be a USB host easily. |

Out: Microchip TA100/TA101 (NDA), Zymkey 5 (Pi only, sold out), YubiHSM 2 ($650).

## Signs P-256 only (works with a smart account via EIP-7951)

| What | Price | Where, stock | How it connects |
|---|---|---|---|
| **SparkFun ATECC608A Qwiic** | $5.05 | [SparkFun](https://www.sparkfun.com/sparkfun-cryptographic-co-processor-breakout-atecc608a-qwiic.html), in stock | Qwiic cable |
| **Adafruit ATECC608** | $4.95 | [Adafruit](https://www.adafruit.com/product/4314) (searches disagree on stock), DigiKey | STEMMA QT cable |
| **Adafruit Trust M** | $4.95 | [Adafruit](https://www.adafruit.com/product/4351) (stock unconfirmed) | STEMMA QT cable |
| **M5Stack Unit ID** (ATECC608B, pre-set) | $5.50 | [DigiKey](https://www.digikey.com/en/products/detail/m5stack-technology-co-ltd/U124/15277428) 54. M5Stack direct ships after Oct 8. | Grove cable, address 0x35 |
| ST X-NUCLEO-ESE01A1 (STSAFE-A120, also Ed25519) | $17–18 | [DigiKey](https://www.digikey.com/en/products/detail/stmicroelectronics/X-NUCLEO-ESE01A1/26795920) 35 | Jumper wires |
| Mikroe Secure Tropic Click (TROPIC01) | $19 | [DigiKey](https://www.digikey.com/en/products/detail/mikroelektronika/MIKROE-6559/26394718) 69 | SPI, jumper wires. MicroPython: [pytropicsquare](https://github.com/petrkr/pytropicsquare). 2026 laser attack disclosed. |
| Arduino Nano RP2040 Connect (ATECC608 on board) | $21 | [Arduino](https://store-usa.arduino.cc/products/arduino-nano-rp2040-connect) | It is the board. Runs MicroPython. |
| ESP32-H2 DevKitM (P-256 key in eFuse, no extra chip) | $10 | [Adafruit](https://www.adafruit.com/product/5715) | It is the board. Weaker than a secure chip. |

## Amazon

Mostly bad for this. Bare ATECC608 boards that need solder (~$23), the Adafruit listing is
unavailable, plus TPM modules for PCs. The good Amazon buys are the **YubiKey 5 NFC** and blank
JavaCards.

## What this means for the workshop

- **Smart account:** $5 Qwiic/STEMMA ATECC608 or Trust M, or the M5Stack unit. Plug in, done.
- **Normal Ethereum account, no solder, this week:** YubiKey 5 NFC or a Satochip card, plus a
  $7–16 plug-in NFC reader on the Pico. Or the Portenta C33 in place of the Pico.
- Every secp256k1 route needs driver work: NFC + smart-card commands for cards and YubiKeys, NXP
  C library for SE050. The host must also make `s` low and work out `v`.

## Not confirmed

- Live stock at Mouser, Mikroe, Tindie, Amazon search (blocked or timed out).
- M5Stack NFC unit range and smart-card support with a YubiKey or JavaCard.
- Raw-hash signing on YubiKey OpenPGP for Ethereum (yketh says yes; not reviewed).
- secp256k1 key storage in nRF54L15 KMU or Silicon Labs Secure Vault.
