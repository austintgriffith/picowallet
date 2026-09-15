# The wallet over USB

The USB wallet has no radio. It is a passive device: it never asks for anything. The website
(in Chrome, with WebSerial) pushes one message at a time down the USB cable, the wallet shows
what it was asked, the person presses A or Y, and the wallet answers. The app server keeps its
one job, relaying signed transfers and paying gas. Nothing else reaches the wallet.

```
browser (Chrome) ── WebSerial ── USB ── picowallet
   │  POST /api/requests (makes the request + digest)
   │  POST /api/requests/:id/signature (r, s)  ──▶ app server ──▶ relay ──▶ ChipAccount
```

## Framing

- One JSON object per line, `\n` terminated, UTF-8, on the Pico's USB serial port (the same
  port MicroPython uses for its REPL).
- Every host message carries an `id`. The wallet answers with the same `id`.
- Lines from the wallet that do not start with `{` are logs. Hosts ignore them.
- Lines longer than 16 KB are dropped with an `error`.
- The wallet handles one message at a time. A second `sign` while one is on screen gets
  `{"type":"busy"}` immediately.

## Messages

### hello

Host: `{"id": 1, "type": "hello"}`

Wallet:
```json
{"id": 1, "type": "hello", "name": "picowallet-pink", "fw": "usb-1",
 "serial": "0123597b4f22a25eee", "backend": "atecc608",
 "configLocked": true, "dataLocked": false, "hasKey": true,
 "qx": "0x…", "qy": "0x…", "address": "0x…"}
```
`qx`, `qy`, `address` are absent until the chip has a key. `address` is the P-256 key's
Ethereum-style address (keccak of the 64-byte public key, last 20 bytes), the same value the
website shows next to the account's blockie.

### sign

Host: `{"id": 2, "type": "sign", "request": { …WalletRequest… }}`

`request` is the object the app stores for `POST /api/requests`: `kind`, `chainId`, `account`,
`nonce`, `deadline`, `digest`, plus the kind's raw fields (`token`, `to`, `amount` for a
transfer; `name` for setName; `target`, `value`, `data` for execute) and display hints
(`toName`, `tokenSymbol`, `tokenDecimals`, `amountFormatted`, `valueFormatted`).

The wallet:
1. Rebuilds the EIP-712 digest from the raw fields. If it differs from `request.digest`, it
   answers `error` and shows nothing to sign.
2. Draws the request: summary page (what, how much, to whom), details page (full address in
   chunks, chain, nonce, deadline, vault), and the digest's blockie with its first 8 hex.
   Display hints are drawn smaller and never hashed.
3. Waits. A signs on the chip and answers `signature`. Y answers `rejected`.

Wallet answers, one of:
```json
{"id": 2, "type": "signature", "r": "0x…", "s": "0x…", "digest": "0x…"}
{"id": 2, "type": "rejected"}
{"id": 2, "type": "error", "error": "digest mismatch"}
{"id": 2, "type": "busy"}
```

The host then posts `r` and `s` to `POST /api/requests/:id/signature`, or `/reject`.

### provision

Host: `{"id": 3, "type": "provision", "op": "lock-config"}` or `"op": "genkey"`.

Permanent operations. Allowed only when `secrets.py` sets `ALLOW_LOCK` / `ALLOW_GENKEY`, and
only after the wallet shows a red warning and the person presses A. Y cancels.

Wallet: `{"id": 3, "type": "result", "ok": true, "result": {…chip status…}}` or
`{"id": 3, "type": "result", "ok": false, "error": "…"}`.

### ping

Host: `{"id": 4, "type": "ping"}` → Wallet: `{"id": 4, "type": "pong"}`.

### Unsolicited

On boot the wallet prints `{"type": "ready", "name": "…"}` once.

## The comparison screen

The device exists so you can compare two screens before pressing A. Website and wallet draw
identical layouts from identical raw fields:

- the action and amount, large;
- the recipient: name hint (small, labelled) and the full address in 4 chunks of 10;
- the blockie of the digest (seed = `0x` + 64 lowercase hex), 8 cells, drawn big;
- the first 8 hex characters of the digest under it.

The website's blockie comes from the digest it got from the app. The wallet's blockie comes
from the digest it computed itself from the raw fields. If the two pictures match, the wallet is
signing what the website shows. `firmware/blockies.py` is a pixel-exact port of
`ethereum/blockies`; the website uses the same algorithm.

## What the wallet trusts

Nothing from the host. The chain id and vault address are pinned in `secrets.py`
(`EXPECTED_CHAIN_ID`, `EXPECTED_VAULT`, `EXPECTED_TOKEN`) when set. The digest is recomputed.
The key never leaves the chip. The host can only ask; the person decides.

## Development

- Emulator: `tools/emu send '{"id":1,"type":"hello"}'` writes a line to the virtual device's
  stdin; replies show in the console and `tools/emu log`.
- Real board: `mpremote` still works. Ctrl-C drops the wallet loop to the REPL; `tools/emu ship`
  soft-resets first, so it keeps working.
- The WiFi wallet (`wallet.py`) is unchanged. The USB wallet is `usbwallet.py`, sharing the
  screens, signer and EIP-712 code.
