# Security

Picowallet is a proof of concept, not an audited production wallet. Its small contract is designed
to be understandable, but the complete system also includes firmware, a WiFi network, a relay,
browser routes, dependencies, deployment configuration, and physical hardware. Forking the code
without addressing those boundaries is unsafe.

## Contract authorization

`ChipAccount` authorization version 5 starts with one P-256 signer. The constructor validates the
key. There is no owner, admin, proxy, or upgrade. The relay has no special contract permission.

A fixed recovery address can propose a replacement P-256 key. It cannot finalize for 14 days and
cannot spend directly. Any successful current-chip action cancels the proposal. The chip can also
sign a dedicated no-op cancellation. An off-chain signature alone cannot change on-chain state; the
cancellation transaction must be submitted before the deadline.

If the recovery wallet is compromised, the current chip has 14 days to cancel. If nobody monitors
the wallet, an attacker can eventually replace the signer. If the recovery wallet is lost, the chip
still works but recovery is unavailable. Verify both addresses and monitor recovery events.

Legacy authorization-version-1 deployments had a mutable signer controlled by an admin. They must
not be funded. Updating this repository does not change already-deployed bytecode: deploy a new v5
contract, verify it, test a small transfer, move assets, and retire the legacy address. The app
checks `AUTHORIZATION_VERSION()` and refuses to relay for a legacy contract.

The repository's existing mainnet deployment at `0x0336aD6afc8bE414D6BD1f7A16caEb14BCCd16e9`
is legacy v1. It remains mutable on-chain; never present it as v5.

Authorization version 5 keeps a fixed ERC-20 for the simple transfer screen, but chip-signed general
execution can call any address. It can transfer any token, send ETH, grant approvals, trade assets,
or interact with hostile contracts. There is still no admin: only the chip can authorize a call.

The vault accepts ETH. ETH and accidental ERC-20 deposits can be recovered with a signed general call.

The dedicated ENS action remains safer and easier to review than raw calldata. Setting a reverse name
does not create that name or its forward record; first make the ENS name resolve to the vault.

General execution moves the security boundary to the hardware display. A production fork must decode
known calldata on-device, clearly mark unknown selectors, show target and ETH value, and require a
stronger confirmation for unknown calls. A data hash proves what was signed but does not explain it.

## Known PoC limitations

### Unauthenticated application API

The Next.js routes do not authenticate browsers or the device. Anyone who can reach the server can
queue or reject prompts, spoof device status and command results, consume relay RPC/gas resources,
and cause denial of service. Version 5 removes the former signer-takeover route, but authentication
is still required before exposing the app beyond a trusted development network.

A production fork should authenticate browser sessions and devices separately. Device messages
should be signed or MACed with replay protection, request IDs should use cryptographically random
values, sensitive actions should require re-authentication, and endpoints should have rate limits,
body-size limits, schemas, and an audit log. CORS is not authentication.

### Plain HTTP and unpinned requests

The Pico examples use HTTP. A network attacker can alter responses or impersonate the app. Although
the firmware recomputes EIP-712 digests, the example configuration does not pin the expected chain
ID, vault address, or token address. Human-readable fields such as `toName`, `tokenSymbol`, and
formatted amounts come from the server and are not themselves signed.

A production device should use authenticated TLS with a pinned server key or certificate and also
pin the expected chain, contract, and token in device-controlled storage. Display the full token
and recipient addresses from the fields used in the digest; treat names and symbols as untrusted
hints. `EXPECTED_CHAIN_ID`, `EXPECTED_VAULT`, and `EXPECTED_TOKEN` provide optional firmware pins;
production deployments must populate them. Verify response schemas and reject oversized, stale,
or unexpected messages.

### USB transport

`usbwallet.py` (see `USB.md`) removes the radio: the wallet is a passive device on a USB serial
port and the browser is the courier between the app and the wallet. The same rules apply as over
WiFi. The host is untrusted: the wallet rebuilds every digest from the raw fields, refuses a
mismatch, honours `EXPECTED_CHAIN_ID` / `EXPECTED_VAULT` / `EXPECTED_TOKEN`, and treats names and
formatted amounts as hints. What USB adds is a second, independent rendering of the digest: the
wallet draws a blockie of the digest it computed, the website draws a blockie of the digest it
got from the app, and the person compares them before pressing A. A tampered request therefore
fails twice, once in the wallet's digest check and once at the person's eyes.

What USB does not fix: the browser and the app server still see the request in plain text, the
serial port is available to any process on the host while the browser is not holding it, and the
wallet trusts nothing about time (the deadline is displayed, not checked). Permanent chip
operations over USB (lock, new key) still need `ALLOW_LOCK` / `ALLOW_GENKEY` on the device and a
physical A press after a red warning screen.

### Passwordless development console

The optional TCP/2323 MicroPython REPL grants arbitrary code execution. An attacker can ask the
ATECC608 to sign a digest directly, bypassing the button UI, and can read WiFi credentials or a
software fallback key. `ENABLE_NETWORK_CONSOLE` defaults to `False`; never enable it on an untrusted
network or while the vault holds value. Prefer USB for provisioning and firmware updates.

The ATECC608 prevents extraction of its private key, but the current slot permits the host MCU to
request signatures. It therefore does not protect against compromised firmware, a compromised
MCU, exposed debug interfaces, or an attacker with control of the REPL/I2C bus.

### Key lifecycle and firmware fallback

Key generation and irreversible chip configuration are gated by local flags, but those flags are
only application checks and do not constrain an attacker with code execution. Turn them off after
provisioning. Consider locking the data zone after confirming the final key and configuration.

The firmware currently falls back to an unencrypted software key on Pico flash if the ATECC608 is
unavailable. Production forks must fail closed instead. Never automatically pair or fund a vault
after a backend change, wiring failure, or unexpected public key.

### Relay and storage

The JSON queue is a single-process demo store without authentication, transactional locking, or
durable database semantics. Concurrent requests can receive conflicting nonces, serverless
instances can diverge, and local users may read queue data. Use a transactional database with
unique constraints and explicit state transitions. Limit outstanding requests and relay spend.

Keep the relayer minimally funded. Its key does not control v5 vault assets, but compromise can
still waste gas, censor transactions, manipulate the application, and expose infrastructure.

### Dependencies and secrets

Run JavaScript and Python dependency audits in CI and update pinned dependencies. Review generated
lockfile changes. Do not treat development-only advisories as harmless without verifying that the
affected package is absent from deployed bundles.

Never commit RPC, explorer, WalletConnect, deployment, WiFi, or relayer credentials. Public browser
keys are visible by design and must be origin-restricted and quota-limited. Server and deployment
keys belong in ignored environment files or a secret manager with least privilege. Run a full Git
history secret scan before publishing; rotate a credential rather than merely deleting it.

This repository's public history contains Alchemy and Etherscan keys that were formerly used as
defaults. They have been removed from the current files, but history is permanent for practical
purposes: treat those values as compromised and rotate or revoke them.

Use Alchemy endpoints with a project-specific restricted key for all chain calls. Do not fall back
to public RPC services.

At the 2026-09-05 review, compatible updates removed the critical `elliptic` finding and the
vulnerable `toml` parser from Foundry tooling. `yarn npm audit --all --recursive --severity high`
still reports a critical `tar` advisory through the development-only Vercel CLI plus high-severity
transitive findings in Vercel/Next build tooling and wallet connectors. Newer Next/Vercel releases
were quarantined by Yarn during this review, so they were not forced into the lockfile. Re-run the
audit and upgrade once compatible, non-quarantined releases are available; do not ship these tools
inside a production runtime image.

## Before holding real value

1. Provision the chip over USB and permanently disable the network console and key-generation flags.
2. Pin the chain, v5 vault address, and allowed token in independently controlled device storage.
3. Deploy with the final public key; verify source, constructor arguments, bytecode, and
   recovery address, `RECOVERY_DELAY()`, and `AUTHORIZATION_VERSION() == 5` on-chain.
4. Add authenticated TLS, device authentication, browser authorization, replay protection, rate
   limits, strict schemas, and a transactional queue.
5. Verify that the contract's immutable token is the intended asset.
6. Run contract tests, fuzzing/invariants, dependency audits, static analysis, and an independent
   security review. Test on a public testnet and then with a deliberately tiny mainnet balance.
7. Monitor `RecoveryStarted` events and rehearse both cancellation and finalization before funding.

If compromise is suspected, disconnect the Pico and relay, stop the app, and move assets using the
still-trusted chip before rotating infrastructure credentials. A legacy mutable-signer vault should
be migrated immediately; changing local source files does not secure it.
