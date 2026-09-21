# Wire format, verifiable signing, clear signing, batching

Research notes, 2026-09-21. What the standards say, what the reference signers do, and what
that means for picowallet. Sources at the bottom.

## 1. github.com/ethereum/ethereum-app

Not the Ledger app. It is the "Universal Ethereum Signer": a Rust reference implementation for
hardware signers with a few hundred KB of RAM, built on alloy, targeting the Foundation Passport
Prime (KeyOS) and the Def Con 34 badge (Xous). Apache-2.0, 51 commits, written "fully by
automatic programming", not audited.

What it does:

- **Transport is ERC-4527 QR codes only** (airgapped). Requests come in as `eth-sign-request`,
  answers go out as `eth-signature`. No USB, no BLE. "Other bearers" are listed as future work.
- **Verifiable Signing (ERC-8213), no clear signing.** The device shows the raw fields it can
  parse plus standard digests. It depends on no token list, no descriptor registry, no oracle.
  Clear signing (ERC-7730) is "optional, later, with third-party dependencies".
- Supported payloads: legacy tx, EIP-1559 (type 2), EIP-7702 (type 4), EIP-712 JSON, EIP-191
  `personal_sign`. Screens: From, To, Amount, Chain id, Max fee (`gas * price`), and for
  calldata the raw hex plus the Calldata Digest as text and as a QR.
- Fail-closed checks worth copying: the envelope `chain-id` must equal the chain id inside the
  RLP body; the optional `address` in the request must equal the derived signing address; the
  legacy EIP-155 unsigned trailer must be `chain_id, 0, 0`; the check runs at decode and again
  right before signing.
- The DC34 badge has its own minimal UR decoder: bytewords, CRC-32, pure fountain parts only
  (`K-N` parts, no mixed parts), caps of 8 KB per message and 256 parts. A browser tool
  (`tools/ur-bridge.html`) re-cuts animated QRs into single frames because the badge camera is
  slow. Test vectors in `dc34-app-eth-signer/tools/test-vectors.json`.

Crate layout (`common-eth-signer/crates`): `core` (types + ERC-8213 digests), `decoding` (CBOR
request → typed request, RLP tx decode), `signing` (BIP-39 → key, signing hash, 65-byte `r‖s‖v`),
`displaying` (pure view model, headless/console/Slint backends), `device` (the flow).
`decode → derive key → verify address → build view model → confirm → sign → encode`.

## 2. The wire formats in play

### ERC-4527 (QR, Keystone/Passport style)

CBOR maps, wrapped in BC-UR for QR. Request `eth-sign-request`:

| key | field | notes |
|---|---|---|
| 1 | request-id | 16-byte UUID, echoed back |
| 2 | sign-data | bytes: unsigned RLP for a tx, UTF-8 JSON for EIP-712, raw bytes for 191 |
| 3 | data-type | 1 legacy tx, 2 EIP-712, 3 raw bytes (191), 4 typed tx (0x02/0x04) |
| 4 | chain-id | optional envelope hint, must match the body |
| 5 | derivation-path | crypto-keypath |
| 6 | address | optional, 20 bytes, signer must check it |
| 7 | origin | wallet name |

Answer `eth-signature`: `{1: request-id, 2: r‖s‖v (65 bytes), 3: origin}`. `v` conventions:
legacy EIP-155 full `chainId*2+35+parity`, typed txs bare parity, 191/712 `27/28`.

### Ledger APDU (USB HID / BLE)

`CLA E0`, one byte INS, P1/P2, up to 255-byte chunks with P1 `00` first / `80` next. Every
sign command starts with the BIP-32 path (count byte + 4-byte indexes). Answer is `v, r, s`.
INS worth knowing: `02` get address, `04` sign tx (RLP streamed), `08` personal message,
`0C` sign EIP-712 (V0 takes domain hash + message hash, V1 hashes on device after
`1A` send struct definition / `1C` send struct implementation / `1E` filtering), `26`
transaction info + `28` field description (generic clear signing), `34` sign EIP-7702
authorization (TLV, returns parity r s), `36` provide Safe account, `32` tx simulation.

### Ours (USB.md)

JSON lines over USB serial. `sign` carries the app's request object: `kind`, chain, account,
nonce, deadline, the kind's raw fields, and display hints. The wallet rebuilds the EIP-712
digest from the raw fields with a hard-coded schema (`firmware/eip712.py`, four typehashes),
refuses on mismatch, and shows a blockie of the digest plus its first 8 hex.

That is already a form of both things below: verifiable signing (we show the EIP-712 Digest)
and clear signing (the four kinds are rendered as words, not hex) with the descriptor baked
into firmware. The gaps are naming, completeness, generality and batching.

## 3. Verifiable signing: ERC-8213

Draft ERC by Patrick Collins, 2026-03-30. Five names, exact formulas, and display rules.

| term | value |
|---|---|
| ERC-191 Digest | `keccak("\x19Ethereum Signed Message:\n" ‖ len ‖ message)` |
| EIP-712 Digest | `keccak("\x19\x01" ‖ domainSeparator ‖ hashStruct(message))` (Safe calls this safeTxHash) |
| Domain Hash | `hashStruct(eip712Domain)` |
| Message Hash | `hashStruct(message)` |
| Calldata Digest | `keccak(uint256(len(calldata)) ‖ calldata)`, no chain id, no `to`, no value |

Rules: show the EIP-712 Digest alone (recommended) or Domain + Message together, never one of
the pair alone. Label them with exactly these names. Show as `0x` hex. For a tx with calldata,
show the Calldata Digest. The spec warns that comparing only a prefix or suffix is grindable
by an attacker, and that the Calldata Digest does not cover `to` or `value`, so those must be
shown too.

Test vectors: `"hello"` → ERC-191 Digest `0x50b2c43f…7750`; the 68-byte ERC-20 `transfer`
calldata in the spec → Calldata Digest `0x812cee5d…9985`.

Ledger Nano S made Domain Hash / Message Hash well known. Safe exposes safeTxHash. The idea is
that a second tool (script, other device) recomputes the digest and you compare.

## 4. Clear signing: ERC-7730 and how Ledger ships it

ERC-7730 is a JSON descriptor per contract or per EIP-712 domain: `context` (which chain +
address, or which domain it binds to), `metadata` (owner, token info, enums, constants), and
`display.formats` keyed by the ABI signature (`transfer(address to,uint256 value)`) or the
EIP-712 `encodeType`. Each format has an `intent`, an optional `interpolatedIntent` sentence
with `{path}` holes, and ordered `fields` with a `format`: `raw`, `amount`, `tokenAmount`,
`addressName`, `date`, `duration`, `enum`, `nftName`, `calldata` (nested call), and so on.
`visible: {mustMatch}` turns a field into a constraint the wallet enforces.

The public registry is github.com/ethereum/clear-signing-erc7730-registry. Every file has a
detached signature in `sigs/` from `0x3846…31f6`, so a wallet can trust a descriptor without
trusting the host that delivered it.

Ledger does not parse JSON on the device. The host (Ledger Live) turns the descriptor into
signed TLV structs and streams them before the sign command ("generic clear signing", GCS):

1. `SIGN, store only`: the device keeps the calldata compressed in RAM.
2. `TRANSACTION INFO`: chain id, contract, selector, intent, creator, and a `FIELDS_HASH`, all
   signed by Ledger's key.
3. One `TX FIELD DESCRIPTION` per field: name, param type, and where in the calldata the value
   lives. Plus token / NFT / enum / trusted-name metadata as needed, each also signed.
4. `SIGN, start flow`: the device hashes the fields it received, checks it against the signed
   `FIELDS_HASH`, renders every field, then signs.

So the trust anchor is a pinned public key on the device, and the host is only a courier. That
is the pattern to copy if we ever accept descriptors from the website.

Nested calldata: a field of param type `CALLDATA` names the callee, optional chain id,
selector, amount and spender; the device pushes a nested context and takes another
`TRANSACTION INFO` + fields for the inner call. Ledger documents "limitations" for recursive
formatters and a fallback to blind signing.

## 5. Batching

### EIP-5792 (the app-to-wallet API)

`wallet_sendCalls({version, chainId, from, atomicRequired, calls: [{to, data, value}], capabilities})`.
The wallet must send the calls in order, on that chain, from that account, and reject if it
cannot honour `atomicRequired`. Status via `wallet_getCallsStatus` (100 pending, 200 ok,
500 reverted). The atomic capability is `supported | ready | unsupported`; `ready` means "an
EOA that can upgrade via 7702 with user consent". Nothing says how the wallet executes.

### ERC-7821 (the on-chain shape)

The minimal batch executor that 7702 delegations and smart accounts converge on:

```
struct Call { address to; uint256 value; bytes data; }
function execute(bytes32 mode, bytes calldata executionData) external payable;
function supportsExecutionMode(bytes32 mode) external view returns (bool);
```

`mode` is the ERC-7579 layout: byte 0 `0x01` batch, byte 1 `0x00` revert on failure, bytes
6..9 `0x00000000` (no opData), `0x78210001` (`abi.encode(calls, opData)`), `0x78210002`
(batch of batches). `opData` is the slot for a signature, and the spec says: empty opData
means `msg.sender == address(this)`, non-empty means authorize by the signature inside.
`to == address(0)` may mean self. Frontends probe `supportsExecutionMode(0x01…00)`.

### EIP-7702

A signed authorization `(chain_id, address, nonce)` puts delegation code on an EOA. Ledger
signs it from a TLV over INS `34`, only for delegate contracts on a per-chain whitelist, only
when the setting is on, and treats `address(0)` as revocation. Not relevant to our key: 7702
needs a secp256k1 EOA signature and our signer is a P-256 key behind a contract account.
Our batching lives in ChipAccount, which is the smart-account case 5792 already covers.

### Clear-signed batching (ERC-7730 + Ledger)

The spec gives two ways to show a 5792 batch:

- Join each call's `interpolatedIntent` with `" and "`: "Approve Uniswap Router to spend 1000
  USDC and Swap 1000 USDC for at least 0.25 WETH". Fall back to per-call `intent` if any
  interpolation fails.
- Or show one screen group per call, using `intent` + required fields, "clearly separating
  individual transactions". The spec calls this the option for space-limited wallets.

On the wire it is just nested calldata over an array. The registry's Safe BatchExecutor
descriptor is the whole thing:

```json
"batchExecute((address to, uint256 value, bytes data)[] calls)": {
  "intent": "Batch transactions",
  "fields": [{ "path": "calls.[].data", "label": "Transaction", "format": "calldata",
               "params": { "calleePath": "calls.[].to", "amountPath": "calls.[].value" } }]
}
```

The wallet walks the array, and for each element resolves a descriptor by `(callee, selector)`
and renders that call with its own intent and fields. Ledger's `PARAM_CALLDATA` TLV allows the
callee / amount / spender to be a one-element array that gets broadcast across all calls.

## 6. What this means for picowallet

Where we stand: a hard-coded EIP-712 schema, digest recomputed on device, digest shown as a
blockie + 8 hex, four request kinds, no batch, hints never hashed. Good bones. Gaps, in the
order I would close them:

1. **Name and finish the digest screen (ERC-8213).** Label it "EIP-712 Digest". Put the full
   `0x` hex on the details page (four chunks like the address), keep the blockie as the quick
   check. Eight hex chars alone is exactly the prefix-grinding case the ERC warns about. For
   `execute`, also show the Calldata Digest of `data` (`keccak(len‖data)`, a few lines in
   `eip712.py`). The website shows the same values so they can be compared, and any script can
   recompute them. Cheap, no new trust.

2. **Send the typed data, not the kind.** Today the app sends `kind` + fields and the wallet
   has one hasher per kind. If the app sent the full EIP-712 JSON (ERC-4527 data-type 2) and
   the wallet had a small generic `hashStruct` (types, arrays of structs, `bytes`/`string`
   hashed), any new ChipAccount type works without a firmware change, and the four pretty
   screens become a display layer keyed by primary type. That is the split every reference
   signer uses: generic hashing under, descriptor-driven rendering over. Our typed data is
   tiny, so hashing from JSON fits in the ~52 KB the pink boards have spare. Unknown primary
   type → show domain + raw fields + the digests (verifiable signing fallback), never refuse.

3. **Batch in the contract, ERC-7821 shape.** Add to ChipAccount:
   `execute(bytes32 mode, bytes executionData)` with `executionData = abi.encode(Call[] calls, bytes opData)`
   and `opData = abi.encode(deadline, r, s)`, plus `supportsExecutionMode`. The signed struct:
   `ExecuteBatch(Call[] calls,uint256 nonce,uint256 deadline)Call(address target,uint256 value,bytes data)`
   (EIP-712 arrays of structs hash as `keccak(concat(hashStruct(each)))`). Standard shape means
   viem / 5792 tooling can build the calls, the relay just wraps them, and the 7730 Safe
   BatchExecutor descriptor above is our descriptor with the names changed. Keep the old
   `executeTransfer` for the single-transfer path. Cap calls on device (say 8 calls, 4 KB of
   calldata total) and hash `data` streaming, do not hold decoded copies.

4. **Clear-signed batching on the 240×240 screen: per-call pages, not the "and" sentence.**
   Page 0: "Batch of N calls", vault, chain, nonce, deadline. Pages 1..N: callee (name hint
   small, full address in chunks), value, and the call decoded if the selector is one we know
   (ERC-20 `transfer` / `approve`, the USDS we already pin), else "unknown call" with its
   Calldata Digest. Last page: the batch's EIP-712 Digest blockie + full hex. The website
   renders the same pages so the compare-two-screens habit still works. Joystick left/right
   walks the calls; A only on the last page.

5. **Descriptors: pin or sign, never trust the host.** Bake the ChipAccount + ERC-20
   descriptors into firmware for now. If we ever load ERC-7730 files from the website, do what
   Ledger and the registry do: a signature from a key pinned in `secrets.py`, checked on
   device, or the descriptor is treated as a hint and the raw fields plus digests are shown
   regardless. Our existing rule stands: hints are drawn small and never hashed.

6. **ERC-4527 as an optional envelope.** We have a QR renderer and no camera, so full QR
   transport is one-way. But accepting the `eth-sign-request` CBOR map inside our USB `sign`
   message (or as the whole payload) costs a small CBOR reader and buys compatibility with any
   Keystone / Passport-style host. Low priority. The EIP-712 JSON path in point 2 is the part
   that matters.

Not worth doing: 7702 (no secp256k1 EOA here), Ledger's struct-definition APDUs (our messages
are small enough to hash from JSON), tx simulation.

## Sources

- ethereum/ethereum-app: README, `verifiable_signing/README.md`, `common-eth-signer/crates/*`,
  `dc34-app-eth-signer/src/ur.rs`, `dc34-app-eth-signer/tools/test-vectors.json`
- ERC-8213 draft: https://github.com/ethereum/ERCs/pull/1639 and https://erc8213.eth.limo
- ERC-4527: https://eips.ethereum.org/EIPS/eip-4527
- ERC-7730: https://eips.ethereum.org/EIPS/eip-7730 and
  https://github.com/ethereum/clear-signing-erc7730-registry (`specs/erc-7730.md`,
  `registry/safe/calldata-BatchExecutor.json`)
- EIP-5792: https://eips.ethereum.org/EIPS/eip-5792
- ERC-7821: https://eips.ethereum.org/EIPS/eip-7821
- Ledger app-ethereum: `doc/apdu.md`, `doc/gcs.md`, `doc/tlv_structs.md`,
  `tests/functional/doc/details/test_eip7702.md` at https://github.com/LedgerHQ/app-ethereum
- Ledger clear signing docs: https://developers.ledger.com/docs/clear-signing/overview
