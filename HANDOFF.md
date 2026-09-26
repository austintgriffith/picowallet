# HANDOFF

For the next agent, or me after a context reset. State as of 2026-09-13 morning. Plain facts, then how to
run each piece, then gotchas, then what is open. Public repo, so no secrets here; they are named
by file and location only.

## What exists and works

- A hardware wallet: Pico 2 W + Waveshare Pico-LCD-1.3 + Adafruit ATECC608 breakout, no solder.
  The ATECC is the Adafruit STEMMA QT board from the ATECC608-demo Pi, serial
  `01235e6763cc8d97ee`. Its key owns the mainnet vault. Four STEMMA cable wires are wedged into
  the LCD board's header beside the Pico pins (3V3 pin 36, GND 38, GP4 SDA pin 6, GP5 SCL pin 7).
- Mainnet vault `ChipAccount` v5 at `0x4564fA634b073AcBcA814DCA5210835EC9376324` (legacy v1 at
  `0x0336aD6afc8bE414D6BD1f7A16caEb14BCCd16e9`, do not fund), token USDS
  `0xdC035D45d973E3EC169d2276DDab16f1e407384F`. Relay/admin `0x7FE7f508A267BF45D2D161F244DbB12743e2cf49`,
  a foundry keystore named `atecc-relay` in `~/.foundry/keystores` with its password in a file
  beside it. Vault ~$41.66, nonce 10, relay ~0.001 ETH (about 80 sends) on 2026-09-06.
- Transfers done from the wallet on mainnet: 5 USDS `0x0fbd390b…`, 69 USDS `0x87638ae1…`, more.
  Each is ~82k gas.
- The repo is public at https://github.com/austintgriffith/picowallet, MIT, branch `main`.
  Push as austintgriffith (`gh auth switch --user austintgriffith`, then back to clawdbotatg).

## The pieces and how to run them

### Wallet firmware (`firmware/`, MicroPython 1.26.1 on the Pico)
- `boot.py` joins WiFi and opens the console (`net.py`, TCP 2323, `os.dupterm`). `main.py` starts
  `wallet.py` on a 50 ms `machine.Timer` and returns to the REPL. Nothing may block the REPL.
- `wallet.py`: announce to the app every 30 s, fetch `/api/state` every 12 s, poll
  `/api/requests?status=pending`, rebuild the EIP-712 digest on device (`eip712.py`, `keccak.py`),
  refuse on mismatch, show SIGN (A) / REJECT (Y), details on joystick down, sign on the chip
  (`signer.py` → `atecc.py`, 150 ms), post the signature, or post `/reject`.
- `secrets.py` (gitignored, on the Pico and in `firmware/`): WIFI_SSID, WIFI_PASS, HOSTNAME,
  APP_URL (`http://192.168.68.63:3001`, the Mac's LAN IP), DEVICE_NAME, ALLOW_LOCK, ALLOW_GENKEY.
- Reach it from the Mac: `./tools/pico <mpremote args>` (WiFi console with retries), `./tools/push`
  (copy all firmware, reboot via a one-shot Timer), `./tools/qr` (build `qr.bin` of the vault
  address for the home screen; rerun when the vault changes). mpremote is at `~/.local/bin`.
- USB rescue: plug the Pico's USB into the omen laptop (`ssh omen`), device
  `/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_*-if00`, mpremote there with `resume`. Use
  only if the WiFi console is dead. `/tmp/usb.py` on omen is a raw serial helper.
  The Pico is not a USB drive: plugging it into any computer gives a serial port only
  (`/dev/tty.usbmodem*` on the Mac), no drag and drop, no SSH. Every mpremote command in
  `tools/pico` works the same over USB if you swap the `socket://` target for that port.
  BOOTSEL-while-plugging gives the RPI-RP2 drive, which is only for flashing `.uf2` firmware.
- Chip provisioning (lock config zone, generate key) is implemented in `atecc.py` and gated by
  ALLOW_LOCK / ALLOW_GENKEY. It has never run on a fresh chip. The config bytes are the ones the Pi
  signer used successfully. Do not enable those flags on the wallet holding the mainnet key.

### App (`app/`, Scaffold-ETH 2, Foundry + Next.js)
- Run: `cd app && yarn workspace @se-2/nextjs dev -p 3001`. Mainnet mode comes from
  `app/packages/nextjs/.env.local` (gitignored): NEXT_PUBLIC_TARGET_NETWORK, RELAYER_KEYSTORE,
  RELAYER_KEYSTORE_PASSWORD_FILE, USDS_ADDRESS, NEXT_PUBLIC_ALCHEMY_API_KEY.
- Routes: `api/device` (announce), `api/state` (one poll, 5 s chain-read cache), `api/requests`
  (queue, digest), `api/requests/[id]/signature` (verify + relay), `api/requests/[id]/reject`
  (added 2026-09-05), `api/commands` (setup jobs), `api/pair`, `api/fund` (local only).
- Store is a JSON file in `app/packages/nextjs/.chip/` (gitignored).
- Local play chain: `yarn chain`, `yarn deploy` (ChipAccount + MockUSDS, 1000 USDS), unset
  NEXT_PUBLIC_TARGET_NETWORK. An orphan `anvil --silent` from 2026-09-04 may still own :8545.
- Port 3000 on the Mac was yesterday's ATECC608-demo app in mainnet mode. If it is running, do
  not point the wallet or a browser at it by mistake.

### Case (`case/`)
- v0: `waveshare-13-pico-lcd-case-tomas-plass.stl` (CC BY-NC), both halves in one STL, printed
  and fits. Print inbox drop `20260905-193939-…`.
- `gen.py` (CadQuery, `uv run --python 3.11 --with cadquery python case/gen.py`): measurements at
  the top, `keycap()` press-fit caps (wrong idea, printed, rejected), `cap()` flanged caps for a
  future taller lid, and after `v05` arg: `straddle_cap()` + `grip_dome()`.
- `tools/lid` cuts the v0 lid mesh (trimesh + manifold): button slot 4.5 → 7.7 mm, joystick hole
  round 8.6 mm. Output `case/out/v0_lid_wide_slot.stl`.
- Untested lid + 4 straddle caps + dome: print drop `20260905-214230-v05_lid_caps_dome_plate`.
  That work is on local branch `case-v05`, NOT on main, by Austin's instruction until tested.
- Measured on the v0 lid STL: case 57×31×26 outer, lid plate 2.0 mm, screen window 30×27 at
  x +2.0 from board center, button column x +22.25 with 5.17 mm pitch, joystick x −19.5. Switch
  body 4.5 mm, plunger 2.04 mm dia, plungers sit flush with the lid face. Joystick stem ~4.2 mm
  above the lid face; its metal housing pokes through the lid.
- Printer: Bambu P2S via the print inbox at `http://GriffithRobots-Mac-mini.local:8800`
  (skill `send-to-printer`). A drop is a request; Austin tells the print Claude to go.

## Gotchas that cost hours

1. rp2 reads the socket console only while the REPL is idle. Any `while True` in main.py makes
   the board unreachable over WiFi, and Ctrl-C over the socket never lands.
2. The rp2 scheduler queue is 8 deep. A periodic Timer plus a blocking call over ~0.4 s fills it,
   the console's accept callback is dropped, and every later connect gets TCP RST until reboot.
   Fix in place: one timer, paused around HTTP; `net.poll_accept()` from the tick; app caches
   chain reads. On mainnet `/api/state` was 0.5–3 s before the cache.
3. mpremote soft-resets before the first command unless `resume`. `tools/pico` always passes it.
4. macOS has no `timeout`. Reboot the Pico with a one-shot `machine.Timer` so mpremote returns
   before the socket drops.
5. The wallet posting a signature while the relay has no ETH: chip signs, relay fails
   "insufficient funds". Fund the relay first. ~0.000012 ETH per send at Sept 2026 gas.
6. Two copies of the site (3000 and 3001) look identical. A request on the wrong one never
   reaches the wallet.
7. Rejecting on the wallet without telling the app kept the request pending and reserved its
   amount; the next proposal failed the balance check. Now `/reject` exists.
8. gitleaks pre-commit fires on 12 lowercase English words in a row (bip39 rule). Reword.
9. Photos: Austin does not want feet, legs or home clutter in the repo. History was purged once
   with git filter-repo before the first push. Check every photo (PIL contact sheet) before adding.
10. The Waveshare wiki and Printables block plain fetches; use the browser tool.

## Contract v5 (2026-09-06)

A second session hardened the contract and app: `ChipAccount` authorization v5, no admin, fixed
recovery address with a 14-day delay, arbitrary signed calls, ENS reverse name. Deployed to
mainnet at `0x4564fA634b073AcBcA814DCA5210835EC9376324` and audited (One Dollar Audit 850, see
README). The old vault `0x0336aD6a…` is legacy v1 with a mutable signer: the app refuses to relay
for it. Do not fund it. `api/pair` is gone; the chip key is fixed at deployment. `SECURITY.md`
has the threat model. All of that is committed on `main` now.

## Case: Zez0000 remix with caps (2026-09-09; current state in "Case: official set" below)

The v06 cap work stayed stopped. On 2026-09-08 Austin asked for a case with the buttons and joystick
covered, and one exists: Zez0000's remix of the v0 case on MakerWorld (model 3230142, CC BY-NC,
released 2026-08-28). Same base as v0, rounded corners, 4 button caps and a joystick cap already
modeled. Nothing else like it exists for the Pico-LCD-1.3 on Printables, Thingiverse, Thangs,
Cults or from Waveshare. The 7 STLs are in `case/zez0000/` (base, lid, 4 caps, joystick cap).

Austin printed the stock set. Caps looked right, but the lid and base would not snap together
even with force. Measured on the STLs: each base tab carries a full-length half-round ridge 0.44 mm
proud of the lid wall, zero end clearance, 106 mm of interference at once. `tools/zezbase` builds
`case/zez0000/base_v3.stl` from the stock base: ridge removed, tab shaved to 0.1 mm side and
0.25 mm end clearance, four 10 mm ridges (r 0.4, 0.25 mm proud) put back at x = +-16 so they land
in the stock lid groove, plus an 8 x 1 x 1 mm pry notch at the rim, middle of the +y long side.
Only the base changed; the stock lid and caps are used as is. v3 is unprinted.

Print inbox: full set requested in yellow PLA from AMS bay 2, one plate: drop
`20260909-173200-base_v3` plus lid, button_cap_1..4 and joystick_cap from drops
`20260908-224447-*` / `20260908-224448-*`. Skip `20260908-224451-lid` (duplicate) and
`20260909-155436-base_v2` (superseded). The print Claude was told all this and waits for Austin.

v3 was superseded the same week: v4 (0.25) loose, v5 (0.50) too tight, v6 (0.30) is official. The
ridge height is `RIDGE_PROUD` in `tools/zezbase`. Details in `case/README.md`.

## Emulator (2026-09-11, shipped, three commits 5d92a7e 9f6103e 8de83ed)

`emu/` is a virtual Pico wallet. `tools/emu` (npm installs on first run) starts a node server on
:4242 and opens the page. The official MicroPython 1.26 WebAssembly build (npm
`@micropython/micropython-webassembly-pyscript`, the board runs 1.26.1) runs the files from
`firmware/` unchanged (never `secrets.py`; a stub with `APP_URL = "/app"` is generated and the
server proxies `/app` to the wallet app, `--app URL`, default :3001) plus `emu/sketches/` on top.

How it is built:
- `emu/core/shims/*.py` replace `machine`, `network`, `requests`, `socket`, `rp2`;
  `_bootstrap.py` patches `os.urandom`, viper `ptr8/16/32`, and swaps a wrapper for the read-only
  `micropython` module. `emu/core/runtime.mjs` is the JS half: key GPIOs read a SharedArrayBuffer
  the page writes (a `while True` still sees keys; needs the COOP/COEP headers the server sends),
  the ST7789 SPI stream (0x2A/0x2B window + 0x2C data) is captured into a 240x240 RGB565 frame
  read from wasm memory with `getValue` (HEAPU8 is not exported in that build), SPI transfer time
  is busy-waited (24 MHz cap until `machine.freq(cpu, peri)`, so 26 fps full-frame, 68 with
  150 MHz peri, matching the board), Timer = JS timers, `Pin.irq` polled at 5 ms, heap 448 KB.
- `.py` files get one rewrite on load: `@micropython.viper|native` -> `@__emu_plain__` (the
  compiler rejects those decorators outright without a native emitter). Viper code runs as slow
  bytecode (demo.py plasma 9 fps).
- Page `emu/web/`: worker.js (the device), app.js (editor CodeMirror 5, REPL console, SSE control
  channel, keys), device3d.js (three.js 0.170, the case from `case/zez0000/` STLs: base_v5 black,
  lid_v4 white, joystick_cap_v3_2.00 grey, button_cap_1 x4 green/grey/grey/red; STL frames and
  the world transform are explained at the top of the file; yellow key-label sprites next to every
  cap). Keyboard: W A S D + space = joystick, numpad 9 6 3 . = A B X Y (top row 9 6 3 . too).
  `/skill` serves `emu/SKILL.md`; a link is in the top bar.
- CLI `tools/emu` -> `emu/cli.mjs`: `run MOD` (fresh boot + `import MOD`, files re-read from
  disk), `exec 'code'`, `key A[:ms]`, `keys a,b,c`, `shot [png]` (480x480), `log [n]`, `state`,
  `reset`, `main MOD`, `headless MOD --wait --key --shot --exec` (node only, no browser, 0.4 s boot).
  Commands go server -> page over SSE and wait for the reply; if no page is open the server opens
  the browser and waits up to 20 s.
- `emu/SKILL.md` (frontmatter, symlinked from `.claude/skills/pico-emu/SKILL.md`, so `/pico-emu`
  in Claude Code) is the bot guide: screen API, key names, timer vs loop pattern, memory,
  the run/key/shot loop, shipping with `tools/pico cp`. `emu/sketches/hello.py` is the template.

Verified tonight: mock, keytest, demo (`demo.run()` blocking loop takes keys), wallet (`main`,
software signer, shows "connecting" + net error without the app), hello; CLI run/key/shot/exec/log;
editor Run button; flat and 3D views; key labels; commit hooks clean.

Gotchas: Chrome on this Mac was under load (5x slower than node), so the page booted in 8-14 s;
the `[emu]`/`[worker]` console marks show where time goes. Passing a bytearray through the
jsffi crashes the wasm; always pass `uctypes.addressof`. `memoryview.cast` and `os.urandom` are
missing in the wasm build (shimmed). Timer callbacks cannot fire during a busy Python loop (JS is
single threaded in the worker); reset = terminate the worker, there is no Ctrl-C.

Next steps for the emulator, if wanted: a bot-written game (Tetris was the example) through the
skill to see what the guide is missing; persist sketch-written files across runs; trim the `[emu]` timing logs once boot time is known
on a quiet machine; the 3D joystick "W" label hides behind the cap from the default camera angle.

## Case: QR code in the bottom, AMS two-colour (2026-09-11, proved, parked)

Austin's idea: the base prints bottom-down in black PETG, so lay white PETG in the first layers as
a QR code on the underside. `tools/zezqr [TEXT] [base_vN]` (default the repo URL, base_v5) builds
`case/zez0000/base_v5_qr_black.stl` + `base_v5_qr_white.stl` (same frame, z=0 on the bed) and
`base_v5_qr.3mf` (one object, two parts, white part on extruder 2). 29 modules at 0.85 mm, 24.7 mm
square, centred x -3.5 to miss the floor hole at x 12..15, white 0.6 mm deep in the 2.0 mm floor,
mirrored so it reads from below. The script self-checks (module-for-module match, OpenCV decode).
Printed 2026-09-11 from inbox drop `20260911-142041-base_v5_qr`: it worked and scans. Austin: proof
done, parked; one day the vault address goes there, not now. Details in `case/README.md`.

Bambu Studio 2.7 CLI gotchas, if you ever slice a two-part 3MF headless: it segfaults without a
`Metadata/project_settings.config` (ours: `case/zez0000/p2s_petg_x2.project_settings.json`);
the plate block needs `filament_maps` "1 1"; presets passed to `--load-settings`/`--load-filaments`
must have `inherits` flattened or everything lands on filament 1; bed type must match the filament.

## Second Pico on the Mac USB: mock wallet screens (2026-09-11, shipped in c457f41)

A second bare Pico 2 W with only the LCD hat (no ATECC, no WiFi creds) is on the Mac's USB. Port
is `/dev/cu.usbmodem*` and the number changes on every re-enumeration (seen 101, 1101, 202201), so
glob it. Talk to it with `~/.local/bin/mpremote connect PORT resume ...`, never `./tools/pico`
(that is the WiFi wallet). Its flash: `lcd.py keytest.py demo.py vid.py earth.pv mock.py
mock_qr.bin main.py`. `main.py` is `import mock`.

`firmware/mock.py`: nine fake screens for photos, 40 ms Timer, REPL stays free. Joystick
left/right flips: home, chart, send, receive, activity, settings, swap, signing (animated,
loops), lock. On home A/B/X/Y jump to send/receive/activity/settings; up/down moves the cursor on
activity and settings; A on send/swap goes to signing; A on lock goes home; other keys go home.
Fake data: $247.13 USDS, `hard.atg.eth`, address `0x7a3F...a391` with a real QR of it in
`firmware/mock_qr.bin` (same format as `qr.bin`). `mock.stop()` stops the timer, `mock.show(i)`
picks a screen, `mock.snap()` writes the framebuffer to `shot.bin` on the flash.

`tools/shot all DIR` (or an index) pulls every screen as a 480x480 PNG: one mpremote process,
commands chained with `+` after each `cp`. Do not run many short mpremote sessions back to back:
that made the USB port drop and re-enumerate once. The same mock runs in the emulator
(`tools/emu run mock`). To get the key tester back: write `import keytest` to main.py and reset.

## Case: official set, pink Pico base, lid_v6 (2026-09-12, all pushed)

Where the Zez0000 rework landed after three days of prints. Every version and why is in
`case/README.md`; this is the short form.

Official parts (Austin confirmed 2026-09-12): lid_v5, stock button_cap_1..4 (or x/check),
joystick_cap_v3_2.00, and a base that depends on the board:
- Pico 2 W (green, micro-USB): `base_v6` (snap ridges 0.30 mm proud; v4 0.25 came apart by hand,
  v5 0.50 would not fit).
- Pink Pico with USB-C: `base_pink`. The USB-C jack is 8.89 wide x 3.15 tall and hit base_v6's
  USB-end posts (8.0 mm gap) and the wall slot. base_pink = v6 with those two posts out 0.75 mm
  each (9.5 gap), a 0.6 mm divot in the floor under the jack (9.1 x 7.4), and the slot widened to
  9.2 and dropped to the divot floor. Printed, "fits perfectly".
- `case/zez0000/picowallet_case.stl` is all seven parts on one plate in print orientation
  (base_v6 version), built by `tools/zezplate`. Black PETG, 0.20 mm, NO BRIM ever on these parts
  (`-F settings="brim_type=no_brim"` on the drop; the print Claude knows).
- Builders: `tools/zezbase v4|v5|v6|pink`, `tools/zezlid v3|v4|v5|v6`. Knobs at the top of each.

Lid history that matters: v3 holes 0.35 mm per side were too big, v4 is 0.20 and is the hole size
since. v5 = v4 plus a 0.4 mm deeper cap pocket (`CLEAR`), because pressing the case pushed the cap
flanges into the plate and clicked the buttons; that fixed it on the green Pico. With the pink Pico
it still clicked a little, so **lid_v6 = pocket 0.6 mm** (plate over the buttons 1.4 mm) went to
the printer as drop `20260912-213327-lid_v6` and is UNTRIED. If it works, make it official for
both boards (README table, `tools/zezplate` PARTS, memory `official-case-set.md`). If a lid_v7 is
ever needed, `CLEAR` in `tools/zezlid` is the knob; do not touch `GROW`.

Austin mentioned the v6 base ridge could go "a little bigger" later (0.35). Not asked for.

## Test Pico on the Mac USB (2026-09-12)

A third board: brand-new Pico 2 W + LCD hat, no ATECC, flashed from the Mac (blank RP2350 shows
up as a USB drive, copy `RPI_PICO2_W-20250911-v1.26.1.uf2`). Same rules as the mock Pico above:
`/dev/cu.usbmodem*`, `mpremote connect PORT resume`, one `cp` per invocation (two in one call
fails with "destination does not exist"). It has `keytest.py` (all nine keys on screen, committed),
`demo.py` (balls/cube/plasma/raw SPI speed test), `vid.py` + `earth.pv` (256-colour .pv video,
`tools/gif2pv in.gif out.pv`). `main.py` = `import keytest`. Committed 87c717c so the files are
not lost; they are test toys, not wallet code. Tetris was tried and removed on request.

Numbers measured on the board, for anyone sizing a game: ~305 KB RAM free with the 115 KB screen
buffer, 1.9 MB flash free, 320k Python loop iterations/s (viper 5.5M), full-frame SPI push 46 ms
at the default 24 MHz SPI, 16 ms after `machine.freq(150_000_000, 150_000_000)` + SPI at 75 MHz
(`vid.fast_spi()`); whether the panel is clean at 75 MHz was never confirmed by eye. One thread:
any `while True` kills the WiFi console and the wallet timer.

Wallet without the chip: `signer.load()` falls back to SoftSigner (P-256 key in `key.bin`), but
another session then changed the wallet to stop on a NO CHIP screen unless
`secrets.ALLOW_SOFT_KEY` (commit 28431b3). Not installed on the test Pico.

## Other sessions' commits since the last handoff (not mine, read the messages)

f9bcab2 ship copies every imported file, wallet runs without secrets.py; 261b373 ship soft-resets
before copying and `os.sync`s after (LittleFS lost writes); 28431b3 NO CHIP screen /
ALLOW_SOFT_KEY; 0e9a3fb emulator page flashes MicroPython onto any USB board, `tools/emu flash
--port`; e1bf7a6 `ship --boot` writes main.py so a module runs at power-up (refused on the wallet
Pico). Details in `emu/` and `git log`.

## Wallet without a chip, ship to any USB board (2026-09-12/13, shipped in f9bcab2..e1bf7a6)

- `firmware/wallet.py`: `secrets.py` is optional and `wallet.start()` joins WiFi itself if boot.py
  did not. No ATECC608 means no account: the wallet stops on a red NO CHIP screen (A re-probes the
  chip) unless `secrets.ALLOW_SOFT_KEY` is True, which runs a throwaway software key and shows "no
  chip: software key" in the status bar. The emulator sets that flag in its generated secrets stub.
  The home screen also says "no secrets.py" / "no wifi" / "connecting..." as appropriate.
- `tools/emu devices` lists every USB board (MicroPython with board name, other firmware as "not
  MicroPython" plus its banner, BOOTSEL drives). `tools/emu flash --port P [--wifi]` puts
  MicroPython 1.26.1 on any of them (`machine.bootloader()` or the 1200-baud touch, then the .uf2;
  `--wifi` picks the Pico W / Pico 2 W build, the bootloader cannot tell). Same from the page: device
  picker in the top bar, ⚡ flash button when a bootloader board is picked.
- `tools/emu ship MOD [--port P] [--boot] [--wifi]`: copies MOD.py and every file it imports
  (`core/ship.mjs dependencies()` walks import lines and "x.bin" names), soft-resets first (a reset
  right after a copy lost writes on LittleFS: atecc.py landed truncated at 3584 of 7021 bytes; now
  soft-reset before, `os.sync` after), imports fresh, follows output 4 s. `--boot` also writes a
  `main.py` that imports the module so it runs at power-up; refused on the wallet Pico. The "run at
  boot" box on the page is the same. Never change `main.py` on the wallet Pico unless asked.
- Whether `ship --boot` was run on a real board is not recorded; treat it as untested.

## Pink board research (2026-09-12 night, no code changed)

A pink USB-C RP2040 board arrived and Austin asked whether it is Adafruit. Findings:
- Adafruit's pink PCBs were a short run: Feather RP2040 pink Feb to Nov 2022, KB2040 first run
  pink until Apr 2022. Every current Adafruit RP2040/RP2350 board is black, and Adafruit never made a
  Pico-shaped board. A pink Pico-shaped board with 2x20 pins is a third-party clone, the same kind
  as the pink USB-C Pico that base_pink was cut for. A Feather has a 2-pin JST battery jack, a
  NeoPixel, a Stemma QT port, 16+12 pin rows, and the Waveshare LCD hat does not fit it.
- Austin wants to learn about built-in LiPo charging. Feather facts: MCP73831 linear charger,
  ~200 mA into one 3.7 V cell over the JST PH jack, CHG LED on while charging (flickers with no
  cell), USB powers the board and charges, unplug and a changeover diode hands over to the cell with
  no reset. BAT pin = cell, USB pin = 5 V. No battery ADC on the Feather RP2040 (only 4 ADCs), use a
  2x10k divider. Never alkaline, NiMH or 7.4 V packs. Check JST polarity on third-party cells.
- Options for the wallet, none started (PLAN.md step 4): LiPo into VSYS through a Schottky diode (no
  charge, no protection); Pimoroni LiPo SHIM for Pico (MCP73831 + protector + power button, solders
  flat on the back of the Pico, adds thickness the base was not cut for); Pimoroni Pico LiPo 2 XL W
  (RP2350, WiFi, charger built in, longer board, new case and pin check).
- Nothing was plugged into the Mac during that session, so the board was never identified. Next:
  plug it in, `tools/emu devices`, and read the chip and banner.

## Naming, add-ons, Pi 3B+ screen (2026-09-10/11 session, research only, no code changed)

- **Name.** Austin thinks "picowallet" may be wrong: the board may end up a Pico clone, and
  PicoWallet is taken twice on GitHub (plb500/PicoWallet, a Bitcoin HD wallet on a Pico; a
  PicoWallet org with a web wallet). Research found: the Pico's edge half-holes are "castellated"
  (castle battlements), the 0.1" header the ATECC wires are wedged into was the "Berg strip"
  (Berg Electronics, 1950s; DuPont bought them, hence "DuPont wires"), Spanish "pico" = "the
  change" ("quédese con el pico" = keep the change; "y pico" after a price = cents), PICO-8's
  "pico" is Japanese for low-fi bleeps, and the chip signs on secp256r1 where "r" = random
  (Bitcoin's k1 = Koblitz). Ledger's attack lab is the Donjon (castle keep), so castle words are
  native to the industry; Bastion and Citadel are taken, Castellan is free (0 wallet repos;
  castellan.xyz parked, castellanwallet.com no DNS; OpenStack has a key-manager lib of that name).
  Shortlist in order: Castellan, Berg, R1 (Austin liked it; Rabbit R1 gadget and a Ratio1 token
  share the name, no wallet does), Pico/"y pico", Bodge. Nothing decided, nothing renamed.
- **Gap under the LCD board.** ~8.5 mm tall, ~25 x 20 mm free beside the ATECC. Free GPIOs after
  the hat (2,3,8-13,15-21) and the chip (4,5): GP0, 1, 6, 7, 14, 22, 26, 27, 28. The Adafruit
  ATECC breakout has a second STEMMA QT port wired in parallel, so any I2C board daisy-chains
  with no new wires (chip is 0x60; make one `I2C(0)` and share it). Candidates Austin was given,
  Amazon-checked 2026-09-11: Useful Sensors Tiny Code Reader (QR text over I2C at 0x0C, 19x16 mm
  but 10.7 mm tall so the lens must poke out the case, $9.99 B0CHQSRMLP, 1 left), SparkFun Micro
  BMA400 accelerometer (Qwiic, 19x8 mm, $10.50 B0C6HDL3T5), SparkFun Qwiic Haptic DA7280 with
  motor on board ($13.95 B096YHK485). Adafruit LIS3DH was unavailable on Amazon; ST25DV NFC tag
  (32x25 mm, phone-tap mailbox) only from Adafruit direct. Wackier ideas noted: piezo disc as
  speaker + knock sensor on two pins, phototransistor on an ADC reading a flashing phone screen
  (Timex Datalink trick, ~50 bit/s, no camera), ggwave data over sound (official rp2040-rx
  example), Pimoroni Pico LiPo 2 (same footprint, charger + its own QT port, so a 150 mAh pouch
  fits in the gap and nothing is wedged). Austin already owns a STEMMA QT cable kit (Sept 2 order).
  Nothing ordered by me.
- **Waveshare 3.5" RPi LCD (A) on the Pi 3B+** (Austin owns a 3B+, a Zero 2 WH and old 3Bs, no
  Pi 4/5): SPI display, 26-pin socket on header pins 1-26, driver = `waveshare35a` dtbo or the
  prebuilt "RPi LCD_Bookworm_32bit_pi4&3B&2w" image; desktop mirroring needs X11 not Wayland;
  cannot stack with the 1.3" LCD HAT (both use CE0 and GPIO 24/25). Diagram published as an
  artifact: https://claude.ai/code/artifact/408e4e1d-a74e-45d0-a702-3a97ef491065 (source in the
  session scratchpad only, not in the repo). Unrelated to the wallet unless a Pi version happens.

## Sensitive things to know

- An Alchemy API key was in `.env.example` and `scaffold.config.ts` from the first push until this
  commit. It is in the public git history. Rotate it in the Alchemy dashboard.
- `firmware/secrets.py`, `app/packages/nextjs/.env.local`, `.chip/`, and the relay keystore are
  gitignored. Keep it that way.

## Open threads, in order

1. Identify the new pink USB-C board: plug it in, `tools/emu devices`. If it is a Pico clone it goes
   in base_pink; if a Feather, nothing here fits it.
2. Try lid_v6 on the pink Pico in base_pink. If it stops the clicks, make it official in
   `case/README.md`, `tools/zezplate` PARTS, and memory `official-case-set.md`; if not, lid_v5 stays.
3. Joystick push-down on the wallet board no longer registers; check the switch and `lcd.py` Keys.
4. Run the fresh-chip provisioning path on a real blank ATECC608 and fix what breaks.
5. Host the app somewhere with a persistent store so "go to a website" works off the LAN.
6. Battery (PLAN.md step 4); see "Pink board research" for the three options.
7. Case v1 (own design, battery pocket) only if Austin brings it up.
8. Emulator: have a bot build a game through `/pico-emu` and fix what the skill file lacks; confirm
   `ship --boot` on a real USB Pico.
9. Name: pick from the shortlist in "Naming, add-ons" above before the next public push of docs;
   if a rename happens, the GitHub repo, README, memory `repo-public.md` and the QR-in-base URL all change.
10. Add-ons: if Austin orders the Tiny Code Reader, wire nothing; plug it into the ATECC's spare
    QT port, share the wallet's I2C object, and cut a lens hole in the case side.

## Emulator run/ship audit (2026-09-12)

Austin: "pick a module top left, hit run, the screen does not change". Found and fixed in `emu/`:
- ▶ run imported the file open in the editor, not the menu pick. Now the menu is the one source:
  ▶ run, ↻ reset, ⇪ send to Pico act on it; Cmd/Ctrl+Enter runs the editor file (and picks it if
  runnable). Picking in the menu only selects and opens the file.
- The menu listed every `.py`, but `import lcd` / `keccak` / `eip712` draw nothing, and `demo`,
  `wallet` only define functions. `core/workspace.mjs` `isRunnable` (a `start()`/`run()`/`main()`
  call at column 0, or `main`) filters the menu; `ENTRY` gives `demo.run()` / `wallet.start()`,
  run after the import. `runtime.runCode(name, entry)` is the shared snippet (emulator and ship).
  `vid` needs a path argument, so it is not in the menu; use the REPL.
- `demo.run()` never returns, so the page's boot promise never resolved (status stuck on
  "booting", `tools/emu run demo` timed out). Worker now posts "started"; 2.5 s after that with
  no "done" the page reports "running demo (busy loop)" and returns the output so far.
- Data loss: opening a `.bin` tab put the placeholder "# x.bin: binary, 0 KB" in CodeMirror, the
  change event marked it dirty, and Run's save-all wrote that string over `firmware/mock_qr.bin`
  and `firmware/qr.bin` (both were 27/22 bytes on disk; mock crashed with IndexError). Fixed
  (binary tabs are never dirty, setValue is guarded). mock_qr.bin restored from git; qr.bin
  (gitignored) rebuilt for the v5 vault with the python from `tools/qr`, 159 bytes, 29 modules.
- New: `tools/emu ship MOD [--wifi]` and the page's ⇪ button -> `core/ship.mjs`: first
  `/dev/cu.usbmodem*`, `mpremote resume`, copies `lcd.py` if missing, `cp` + `exec` the runCode
  snippet, follows output 4 s, kills mpremote and reports "blocking loop" if the module never
  returns (the next mpremote `resume` connect Ctrl-Cs it). Server polls `/ctl/usb` every 3 s to
  grey the button. Untested on hardware: no Pico was on USB during the session; the no-board path
  and the argument chain were checked.
Verified through the page: mock, keytest, hello, wallet, main, demo (busy, X quits) all draw.

## Local state this checkout (2026-09-13 evening)

- `main` = `87c717c`, in sync with origin. Everything through the case set, the emulator flash/ship
  work, the NO CHIP wallet change and the test-Pico toys (demo.py, vid.py, tools/gif2pv) is pushed.
  Push mechanics in `~/.clawd-accounts/.../memory/push-as-austin.md`.
- Working tree: only `HANDOFF.md` (local, excluded) and `app/packages/nextjs/next-env.d.ts`
  (rewritten by `next dev`, `.next/types` -> `.next/dev/types`; harmless, leave it or discard it).
- Two sessions wrapped up at the same time on 2026-09-13 and both edited this file; the pink-board
  session merged them. If something reads twice, the later section is the one to trust.
- This HANDOFF.md is tracked in git but Austin wants it treated as local notes: it is in
  `.git/info/exclude`, do not stage or commit further edits to it.
- Bambu Studio 2.7 is installed on this Mac (`/Applications/BambuStudio.app`), CLI usable for slice checks.
- The wallet Pico is on WiFi (`./tools/pico`); the mock Pico, the test Pico and any new board go on
  the Mac's USB (`/dev/cu.usbmodem*`, number changes). Nothing was on USB at the end of 2026-09-12.

## Where the notes are

`README.md` (build guide), `buildlog/BUILDLOG.md` (dated, with mistakes), `PLAN.md`,
`SOLDERING.md`, `case/README.md` + `case/BUTTONS.md` (measurements, cap research, decisions, Zez0000 rework),
`reference/pi/README.md` (fresh-chip walkthrough on a Pi), `reference/ATECC608-demo-HANDOFF.md`.
