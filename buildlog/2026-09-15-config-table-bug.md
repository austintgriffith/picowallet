# 2026-09-15: the first chip got locked with a wrong config table

Serial `0123597b4f22a25eee`, the ATECC608 wired to the pink Pico the night before.

`firmware/atecc.py` carried a copy of Microchip's reference config for the ATECC608. The copy had
one extra row of `0xFF` at byte 96. KeyConfig for slots 0-15 lives at bytes 96-127, two bytes per
slot, so every slot's key settings landed one block too far down: slot 0 read as "not an ECC key"
and slots 8-15 got the P-256 settings while their SlotConfig forbids GenKey. Nothing in the
firmware read the zone back before locking it. The table had never been run on real silicon.

Result: config zone locked, GenKey returns status 0x0F on every slot, forever. The chip cannot
be used for this wallet.

Fixed the same day (commit cba49a2): the correct rows, a `verify_config()` read-back that must
pass before `lock_config()` runs, and import-time asserts that slot 0 is a P-256 GenKey slot.
The wallet's setup flow now refuses to lock a chip whose config does not read back exactly.

Lesson: a permanent operation gets a read-back check, no exceptions. The WiFi wallet's chip was
provisioned by the Pi with cryptoauthlib and is fine.

Next chip: the second Adafruit breakout. Same wiring card, `USB.md` setup flow.
