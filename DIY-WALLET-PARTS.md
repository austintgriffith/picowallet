# Building a hardware wallet at home: which parts and why

Date: 2026-10-02. Goal: a crypto hardware wallet (Ethereum first) built from parts you can buy,
with no custom PCB and little or no soldering. Prices are approximate and need a recheck before
ordering.

Status: researched by three agents, then fact-checked by Codex. Its corrections are folded in;
section 5 lists the ones that change what we do.

## 1. Start from the job

A hardware wallet does five things. Every part choice below maps to one of them.

1. **Keep the key secret**, even from the computer it plugs into and from someone who steals it.
2. **Show what you are signing** on a screen the computer can't change.
3. **Need a physical press** to sign. Malware can't press a button.
4. **Make a good key.** Bad randomness has lost real money (Coldcard, below).
5. **Let you recover** when the device is lost or broken.

What it must survive, roughly in order of how likely each one is:

| Threat | What stops it |
|---|---|
| Malware or a hacked dapp UI on the computer (Bybit, Feb 2025: $1.4B, signers blind-signed a bad delegatecall) | Trusted screen big enough to show decoded calldata, plus a physical confirm |
| Bad randomness at key creation | Mix several entropy sources, including dice |
| Theft of the device | Key in a secure chip with a PIN and a retry limit |
| Hostile computer on USB driving the device directly (REPL, debug, unsigned app code) | No REPL in the shipped build, secure boot that covers the app, no fallback key |
| Remote attack on the device itself | Small attack surface: no radio, or radio off in "vault" mode |
| Swapped or tampered parts (supply chain, evil maid) | Buy from known resellers, flash your own firmware, tamper seals |
| Lab attacks (glitching, laser) | Only partly. Keep the key out of MCU flash. No DIY build fully stops a funded lab. |

## 2. The parts

### 2.1 Key storage (the most important choice)

The question is where the private key lives, and which curve it uses. Ethereum accounts (EOAs) use
secp256k1. Most cheap secure chips only do P-256. P-256 still works on Ethereum through a smart
contract account that checks signatures with the P-256 precompile (RIP-7212 / EIP-7951).

| Option | secp256k1 | P-256 | Key never leaves chip | Rating | Hobby board | Notes |
|---|---|---|---|---|---|---|
| **Microchip ATECC608** | No | Yes | Yes | "JIL High" (Microchip's claim, no CC cert found) | Adafruit #4314 STEMMA QT, $5 | Mature drivers. Full datasheet under NDA. Config lock is permanent; a wrong config bricks it (we did this once). 608A/B are "not for new designs"; use 608C. |
| **Infineon OPTIGA Trust M** | No | Yes | Yes | Hardware is CC EAL6+ | Adafruit #4351 STEMMA QT, $5 | Docs public, no NDA. Same chip as Trezor Safe 3/5. Needs retry-on-NACK (we hit this). |
| **NXP SE050 / SE051** | **Yes** | Yes | Yes | CC EAL6+ | OM-SE050ARD-E, ~$60 | Only breakout-form chip that signs secp256k1 inside the chip. Check the exact variant's curve table. No MicroPython driver. Host must fix low-s and work out `v`. One raw key per slot, no BIP32. |
| **Tropic Square TROPIC01** | No | Yes | Yes | No CC found; fully open design | €9.50 mini board, €20 shield | SPI, not I2C. In Trezor Safe 7. Tropic disclosed a laser bypass of its boot check on all production chips. |
| **ST STSAFE-A120** | No | Yes | Yes | Platform CC EAL5+ | X-NUCLEO-ESE01A1 eval board | Board exists; wallet fit not checked. |
| **JavaCard (Keycard / Satochip applet)** | **Yes** | Yes | Yes | Chip platform EAL6+ | Blank card ~$25 + reader | Signs secp256k1 with BIP32 inside the card. Needs a card or NFC reader. Open host code exists (Keycard Shell). |
| **No secure chip** (seed in MCU flash, PIN-encrypted) | Yes (software) | Yes | No | None | $0 | Glitch or laser the MCU, copy flash, brute-force the PIN offline. Shown on RP2350 and STM32F4. |
| **Stateless** (SeedSigner style: scan seed QR each boot) | Yes (software) | Yes | Nothing stored | n/a | $0 | Stolen device gives nothing. The seed backup becomes the thing to protect. |

What commercial wallets do: Ledger (ST33, closed) and Keycard (JavaCard) sign inside the secure
chip. Trezor Safe 3/5 keep the seed encrypted on the MCU; Trust M holds a secret needed to unlock
it, behind the PIN. Coldcard, BitBox02, Passport and Keystone use similar split designs and sign
secp256k1 on the MCU. Jade has no secure chip and uses an online
"blind oracle" for the PIN.

What a secure chip actually buys you: mainly a **hardware PIN retry limit** and a key that can't be
copied. It does not stop a user signing a bad transaction, and it will sign whatever the firmware
asks. If the chip has no PIN gate, a thief can make it sign too. Ratings like EAL6+ cover the chip,
not your firmware, your PIN design or the assembled wallet.

**Pick:**
- **Smart-account wallet (our path): ATECC608 (608C if you can get it).** $5, no solder, the key
  is born in the chip and never leaves. Recovery is done by the contract, not a seed phrase.
  Trust M is the same price ($5 Adafruit breakout), EAL6+ hardware, public docs, and we already
  have its driver started. Compare it before provisioning another ATECC.
- **Plain EOA wallet: try Keycard/Satochip first.** HD keys and secp256k1 signing stay on the
  card, and open host code exists. The other route is the Trezor pattern (seed encrypted on the
  MCU, Trust M holds the unlock secret behind a PIN, secp256k1 on the MCU). That is a real
  engineering job, not a parts swap. SE050 only if you need one raw secp256k1 key in the chip and
  can accept $60 and writing the driver.

### 2.2 Main board

| Board | Security | Radio | Price | Verdict |
|---|---|---|---|---|
| **Raspberry Pi Pico 2 (RP2350)** | Signed boot, OTP keys, TrustZone, TRNG, glitch detectors, permanent debug lock | None | ~$5 | **Pick.** Best documented security on a cheap board, tested in public. |
| Pico 2 W | Same | WiFi + BLE | ~$7 | Fine for an online wallet. Bigger attack surface. |
| Pico / RP2040 | No secure boot, no TRNG | Optional | ~$4 | Only for stateless designs. Our pink boards are RP2040 clones. |
| ESP32-S3 boards | Secure Boot v2, flash encryption | WiFi + BLE always | $10–50 | Good RAM, camera boards exist. Public glitch attacks; no power-glitch detector (AR2026-005, which hits the general AES block, not flash encryption). |
| ESP32-P4 boards | Secure boot, flash encryption, power-glitch detector | None on chip (most boards add a C6) | ~$11+ | Where SeedSigner, Krux, Specter and Kern are heading for camera/QR builds. |
| STM32F469 Disco (Specter DIY) | RDP level 2 | None | ~$60 | Risky for stored keys: the unpatchable RDP glitch (Kraken vs Trezor) was shown on STM32F205/F427, same family. |
| Pi Zero v1.3 (SeedSigner) | Linux, no secure boot | None | $5–15, scarce | Stateless only. |
| K210 boards (Krux) | None | None | ~$50 | Stateless only, getting hard to find. |

RP2350 attacks to know about: the 2024–25 hacking challenge was beaten four ways, all with physical
access (voltage glitch, laser, FIB readout of OTP). Ledger Donjon (2026-09-18) used a laser on the
A4 stepping to turn debug back on and read an OTP secret; about $250K of gear and a destructively
prepared package. It worked with glitch detectors at maximum. It read the secret before firmware
locked the OTP page, so lock pages hard at provisioning, not at runtime. So: **don't keep the seed
in RP2350 OTP or flash.** Keep it in the secure chip. Still turn on the glitch detectors and buy A4
chips.

Secure boot only helps if it covers the app. Signing the MicroPython interpreter while leaving
`.py`/`.mpy` files replaceable leaves the wallet replaceable.

**Radio:** an online wallet (ours, over WiFi) accepts the radio. An air-gapped build should use the
plain Pico 2, which has no radio at all. Same code, $2 cheaper.

### 2.3 Screen

The screen is the only thing you can trust when the computer is hacked. Decoded calldata or
EIP-712 needs 6–15 label/value lines plus full addresses. ERC-7730 (clear-signing descriptors, now
with the Ethereum Foundation) is the standard to follow for decoding.

| Screen | Size | Price | Notes |
|---|---|---|---|
| Waveshare Pico-LCD-1.14 | 240×135 | $8 | Too small for EIP-712. |
| **Waveshare Pico-LCD-1.3 (current)** | 240×240 | $8 | Joystick + 4 buttons, plugs on, same panel as SeedSigner. |
| **Waveshare Pico-LCD-2.0** | 320×240 | $13 | Wider lines (full address fits), same row count in landscape. 4 buttons, no joystick. |
| Pimoroni Display Pack 2.8 | 320×240 | ~$25 | Being retired. |
| Pico-ResTouch-LCD-2.8 | 320×240 touch | $15 | Touch can't be a trusted confirm. |
| Pico-ePaper-2.9 | 296×128 | $18 | Image stays when off (leaks last screen). Slow. Fine for "receive". |
| SSD1306 OLED | 128×64 | $5 | An address doesn't fit on a line. |

**Pick:** keep the 1.3" until the review flow decodes properly. A bigger screen does not fix
clear signing; decoding does. Then move to the 2.0" for full-width addresses.

### 2.4 Input

Buttons. The "sign" button must be a GPIO read by the signing MCU, never something the host can
send. This only holds if the firmware is trusted: hacked firmware ignores any button. Use a long press to sign. Joystick or buttons are fine for PIN entry with a scrambled digit
wheel. Skip touch for the confirm.

### 2.5 Link to the computer

| Link | Works with | Attack surface |
|---|---|---|
| **QR both ways (ERC-4527 / UR)** | MetaMask and Rabby, for compatible EOA accounts | Camera, image decode, QR, UR and tx parsers. No live wire. |
| **USB WebSerial** | Chrome, Edge, Firefox 151+. Not Safari. Your own web app only. | USB stack + your parser |
| USB WebHID/WebUSB | Ledger/Trezor in Rabby; a custom device would have to fake being one | Same as above |
| WiFi (current) | Your own web app only | Whole network stack + RF. Largest. |
| BLE, NFC, microSD | Niche for Ethereum | Varies |

QR is the only open way to plug a custom device into MetaMask or Rabby, but only for secp256k1
EOAs with the account and derivation data they expect. It will not carry our P-256 contract
account. ERC-4527 is marked Stagnant. A camera with QR decoding on an RP2350 is unproven; the
working DIY camera builds use ESP32-S3/P4 or K210.

**Pick:** USB WebSerial now (no radio needed). QR is the air-gap path later, probably on an
ESP32-P4. Showing a signed QR on the screen needs no camera and is a cheap first step.

### 2.6 Randomness

Coldcard (July 2026): firmware since 2021 used MicroPython's weak PRNG for seeds, and funds were
stolen. Seeds made with 50+ dice rolls were safe. We are on MicroPython too.

- RP2350 has a hardware TRNG. MicroPython 1.26's `os.urandom` on rp2 samples the ROSC, not the
  TRNG. Newer upstream calls the SDK's `get_rand_64()`, which can use the TRNG. Pin the version
  and check it. RP2040 has no TRNG.
- ATECC608 has a tested RNG (608C noise source is FIPS 140-3 certified).

**Pick:** seed = SHA-256(RP2350 TRNG ‖ secure-chip RNG ‖ dice). Ask for 50 rolls for 12 words,
99 for 24, rolled in private. Show the device share so it can be checked. Mixing does not save you
from hacked firmware that ignores the mix, and a firmware fix does not repair an old weak seed. (For the ATECC smart-account path the chip
makes its own key, so this applies to seed-based builds.)

### 2.7 Power

USB-only if the link is USB: no battery, no Li-ion risk. A battery only matters for an air-gapped
QR build. On a Pico, use the Waveshare Pico-UPS-B ($14, stacks on, no solder, has a fuel gauge).
It does not fit ESP32 boards; those need their own battery option.

### 2.8 Case and tamper evidence

3D-printed case. Glitter nail polish over screws and seams, photographed and compared before use
(glitter has been beaten; use dense multicolour glitter in recessed holes). Epoxy potting slows
probing but blocks reflashing; only for a finished build.

Supply chain: buy from Raspberry Pi approved resellers, Digi-Key or Mouser. Check chip markings and
the Pico's chip stepping. Read the ATECC serial and certificate. Flash your own firmware. That last
one is the big advantage of DIY: you know what code is running.

## 3. Recommended builds

**A. Smart-account wallet (what we have, tuned). Next prototype.** ~$30.
Pico 2 + Pico-LCD-1.3 + ATECC608 or Trust M STEMMA QT + 3D case. USB WebSerial. P-256 key made in
the chip; the vault contract handles recovery. Order of work: remove the REPL and software-key
fallback, secure boot that covers the app, decode approvals properly, tested PIN enforcement.
Then plain Pico 2 (no radio) and the 2.0" screen.

**B. Plain EOA wallet. Harder than it looks.** ~$35–60.
First choice: Pico 2 + screen + Keycard/Satochip card and reader, keys and signing on the card.
Second: Pico 2 + Trust M, Trezor-style (seed encrypted on the MCU, Trust M holds the unlock secret
behind a PIN), secp256k1 on the RP2350. Needs a reviewed PIN design, hardened secp256k1 code and
RAM clearing. Trust M and TROPIC01 are not drop-in swaps for each other.

**C. Air-gapped QR wallet. Research project.** ~$40–60, estimate.
ESP32-P4 camera board with no radio companion + Trust M + a battery that fits that board. secp256k1
EOA over ERC-4527 QR. Prove camera/UR speed, clear signing and real MetaMask/Rabby compatibility
before calling it a wallet.

For real money, use any of these as one signer in a multisig, not the only key.

## 4. Gaps in our current build

The biggest risk today is someone making the device sign, not someone pulling the key out.

1. **REPL is open over USB.** `firmware/usbwallet.py` keeps Ctrl-C to the REPL. A hostile computer
   can run code and skip the buttons.
2. **Software-key fallback.** `firmware/signer.py` `load()` uses a software key if the chip doesn't
   answer. Remove it from the wallet build.
3. **No PIN on the ATECC signing slot.** A thief can make the chip sign, and the 14-day recovery
   delay doesn't help: chip-signed spends go through right away. The slot config is locked, so
   adding a PIN means a new chip, a new key and moving the vault's signer. A PIN gate also needs a
   retry counter, protected PIN derivation and an authenticated bus, not just `ReqAuth`.
4. **Approvals aren't decoded.** USB mode labels transfer/approve selectors but doesn't show the
   recipient, spender or amount, and allows signing from the summary page.
5. **The blockie check proves consistency, not intent.** A hacked host can send a bad request with
   a matching digest and blockie.
6. **No secure boot, glitch detectors or debug lock** set on the RP2350.
7. **WiFi build** is the largest attack surface. USB mode exists.
8. **Pink RP2040 boards have no TRNG and no secure boot.** OK only because the key is made in the
   ATECC.

## 5. What Codex changed

- Ledger is not the only wallet that signs inside the secure chip; Keycard does too.
- Trezor stores the seed encrypted on the MCU, not inside Trust M.
- Trust M has a $5 Adafruit breakout; STSAFE-A120 has an eval board.
- TROPIC01 has a disclosed laser boot bypass.
- MetaMask/Rabby QR won't carry our P-256 account. ERC-4527 is Stagnant.
- MicroPython's RNG behaviour depends on the version.
- A bigger screen doesn't fix clear signing; our approve screen needs decoding first.
- Added the REPL, fallback-key and recovery-delay gaps.
- Builds B and C downgraded from "recommended" to "harder than it looks" and "research".

## 6. Not confirmed

- A real CC certificate for the ATECC608 ("JIL High" is Microchip's own claim).
- Whether SE050F's FIPS mode covers secp256k1 (NXP's table lists Koblitz curves for SE050F2).
- SE050 low-s / `v` handling (from the spec, not tested).
- MicroPython drivers for SE050, TROPIC01 or a JavaCard host.
- Camera + QR decode on an RP2350.
- Exact prices.

## 7. Sources

Secure chips: [Trust M](https://github.com/Infineon/optiga-trust-m-overview) ·
[SE050 APDU spec AN12413](https://www.nxp.com/docs/en/application-note/AN12413.pdf) ·
[NXP forum: SE050 secp256k1](https://community.nxp.com/t5/Secure-Authentication/ECDSA-secp256k1-curve-key-pair-can-be-stored-in-SE050/td-p/1814983) ·
[TROPIC01 datasheet](https://download.mikroe.com/documents/datasheets/TROPIC01_datasheet.pdf) ·
[Tropic devkits](https://www.tropicsquare.com/tropic01-samples) ·
[ATECC608C summary](https://ww1.microchip.com/downloads/aemDocuments/documents/SCBU/ProductDocuments/DataSheets/ATECC608C-CryptoAuthentication-Summary-Data-Sheet-DS40002513.pdf) ·
[Adafruit 4314](https://www.adafruit.com/product/4314) ·
[Trezor secure elements](https://trezor.io/learn/security-privacy/how-trezor-keeps-you-safe/secure-elements-in-trezor-safe-devices) ·
[Satochip DIY](https://satochip.io/build-your-own-satochip-hardware-wallet/) ·
[Keycard applet](https://github.com/keycard-tech/status-keycard) ·
[Coldcard FAQ](https://coldcard.com/docs/faq/) ·
[Passport security](https://github.com/Foundation-Devices/passport2/blob/main/SECURITY/SECURITY.md) ·
[Jade blind oracle](https://help.blockstream.com/hc/en-us/articles/9639949755673-How-does-Blockstream-Jade-s-oracle-enforced-PIN-protection-work)

Boards and attacks: [RP2350 security paper](https://pip-assets.raspberrypi.com/categories/1260-security/documents/RP-009377-WP-1-Understanding%20RP2350_s%20security%20features.pdf) ·
[RP2350 challenge results](https://www.raspberrypi.com/news/security-through-transparency-rp2350-hacking-challenge-results-are-in/) ·
[RP2350 A4](https://www.raspberrypi.com/news/rp2350-a4-rp2354-and-a-new-hacking-challenge/) ·
[Ledger Donjon on RP2350](https://donjon.ledger.com/blog/rp2350-secure-debug-laser-fault-injection/) ·
[Espressif AR2023-005](https://www.espressif.com/sites/default/files/advisory_downloads/AR2023-005%20Security%20Advisory%20Concerning%20Bypassing%20Secure%20Boot%20and%20Flash%20Encryption%20Using%20EMFI%20EN.pdf) ·
[Espressif AR2026-005](https://documentation.espressif.com/AR2026-005_Security_Advisory_Concerning_AES_Key_Recovery_Using_Voltage_Fault_Injection_on%20ESP32-S3_EN.html) ·
[Kraken vs Trezor](https://www.theblock.co/post/54631/kraken-security-labs-hackers-can-exploit-trezor-hardware-wallets-with-only-15-minutes-of-physical-access-to-the-device)

DIY projects: [SeedSigner](https://seedsigner.com/hardware/) ·
[Specter DIY](https://github.com/cryptoadvance/specter-diy) ·
[Krux](https://github.com/selfcustody/krux) ·
[Jade DIY](https://github.com/Blockstream/Jade/blob/master/diy/README.md) ·
[Kern](https://github.com/odudex/kern) ·
[Keycard Shell](https://keycard.tech/en/blog/keycard-shell-radically-open-uniquely-secure) ·
[Keycard Shell firmware](https://github.com/keycard-tech/keycard-shell/)

Added by Codex: [Trust M breakout (Adafruit 4351)](https://www.adafruit.com/product/4351) ·
[STSAFE-A120 eval board](https://estore.st.com/en/x-nucleo-ese01a1-cpn.html) ·
[TROPIC01 laser bypass](https://www.tropicsquare.com/blogs/potential-bypass-of-firmware-verification-by-laser-fault-injection) ·
[SE050F curves AN12436](https://www.nxp.com/docs/en/application-note/AN12436.pdf) ·
[Firefox WebSerial](https://hacks.mozilla.org/2026/05/web-serial-support-in-firefox/) ·
[Kraken on Trezor](https://blog.kraken.com/product/security/kraken-identifies-critical-flaw-in-trezor-hardware-wallets) ·
[Coldcard PIN code](https://raw.githubusercontent.com/Coldcard/firmware/master/stm32/bootloader/pins.c)

Screen, link, entropy, case: [Bybit analysis (NCC)](https://www.nccgroup.com/research/in-depth-technical-analysis-of-the-bybit-hack/) ·
[EIP-7730](https://eips.ethereum.org/EIPS/eip-7730) ·
[EIP-4527](https://eips.ethereum.org/EIPS/eip-4527) ·
[Keystone QR protocol](https://github.com/KeystoneHQ/Keystone-developer-hub/blob/main/research/ethereum-qr-data-protocol.md) ·
[Pico-LCD-2.0](https://www.waveshare.com/pico-lcd-2.htm) ·
[Pico-LCD-1.3](https://www.waveshare.com/pico-lcd-1.3.htm) ·
[Pico-UPS-B](https://www.waveshare.com/pico-ups-b.htm) ·
[Coldcard entropy write-up](https://blog.coinkite.com/entropy-technical-backgrounder/) ·
[MicroPython urandom on rp2](https://github.com/orgs/micropython/discussions/16420) ·
[Tamper evidence (dys2p)](https://dys2p.com/en/2021-12-tamper-evident-protection.html)
